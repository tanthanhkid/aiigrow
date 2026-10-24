using System.IO.Pipes;
using System.Security.AccessControl;
using System.Security.Principal;
using System.Text;
using System.Text.Json;
using AiiGrow.Core;

namespace AiiGrow.Service;

/// <summary>Named pipe cho tray. ACL: SYSTEM + Administrators toàn quyền, người dùng đã đăng nhập đọc/ghi.</summary>
public sealed class PipeServer : BackgroundService
{
    private readonly ILogger<PipeServer> _log;
    private readonly AgentRuntime _rt;

    /// <summary>Khách của pipe có phải đúng exe khay đã cài không (review PR #59, P2-3a) — tiêm được cho dev/test.</summary>
    private readonly Func<IntPtr, bool> _laKhayThat;
    private readonly Dictionary<string, (DateTimeOffset Luc, PipeResponse Tra)> _playInfoNho = new(StringComparer.OrdinalIgnoreCase);

    public PipeServer(ILogger<PipeServer> log, AgentRuntime rt) : this(log, rt, KhayDaCai) { }
    public PipeServer(ILogger<PipeServer> log, AgentRuntime rt, Func<IntPtr, bool> laKhayThat) { _log = log; _rt = rt; _laKhayThat = laKhayThat; }

    /// <summary>Mặc định: exe của tiến trình khách (GetNamedPipeClientProcessId) = AiiGrow.Tray.exe (hoặc bản cũ «.cu-…» lúc cập nhật) cùng
    /// thư mục với dịch vụ. Dịch vụ chạy ngoài thư mục cài (bản dev) ⇒ không kiểm (<see cref="KhayThat.LaBanDev"/>).</summary>
    public static bool KhayDaCai(IntPtr pipeHandle)
        => KhayThat.LaBanDev(AppContext.BaseDirectory, Paths.InstallDir)
           || KhayThat.La(SessionHelper.PipeClientImage(pipeHandle), Path.Combine(AppContext.BaseDirectory, Paths.TrayExeName));

    private static NamedPipeServerStream Create()
    {
        var sec = new PipeSecurity();
        sec.AddAccessRule(new PipeAccessRule(new SecurityIdentifier(WellKnownSidType.LocalSystemSid, null), PipeAccessRights.FullControl, AccessControlType.Allow));
        sec.AddAccessRule(new PipeAccessRule(new SecurityIdentifier(WellKnownSidType.BuiltinAdministratorsSid, null), PipeAccessRights.FullControl, AccessControlType.Allow));
        sec.AddAccessRule(new PipeAccessRule(new SecurityIdentifier(WellKnownSidType.AuthenticatedUserSid, null), PipeAccessRights.ReadWrite, AccessControlType.Allow));
        return NamedPipeServerStreamAcl.Create(PipeNames.Tray, PipeDirection.InOut,
            NamedPipeServerStream.MaxAllowedServerInstances, PipeTransmissionMode.Byte, PipeOptions.Asynchronous, 0, 0, sec);
    }

    protected override async Task ExecuteAsync(CancellationToken ct)
    {
        while (!ct.IsCancellationRequested)
        {
            NamedPipeServerStream server;
            try { server = Create(); }
            catch (Exception e)
            {
                _log.LogError(e, "Không tạo được named pipe");
                await Task.Delay(5000, ct);
                continue;
            }
            try { await server.WaitForConnectionAsync(ct); }
            catch (OperationCanceledException) { server.Dispose(); break; }
            catch { server.Dispose(); continue; }
            _ = Task.Run(() => HandleAsync(server, ct), ct);
        }
    }

    private async Task HandleAsync(NamedPipeServerStream pipe, CancellationToken ct)
    {
        using (pipe)
        {
            try
            {
                using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
                cts.CancelAfter(TimeSpan.FromSeconds(25));
                var enc = new UTF8Encoding(false);
                using var r = new StreamReader(pipe, enc, false, 4096, leaveOpen: true);
                using var w = new StreamWriter(pipe, enc, 4096, leaveOpen: true) { AutoFlush = true };
                var line = await r.ReadLineAsync(cts.Token);
                PipeResponse resp;
                try
                {
                    var req = string.IsNullOrEmpty(line) ? null : JsonSerializer.Deserialize<PipeRequest>(line, Json.Options);
                    var h = pipe.SafePipeHandle.DangerousGetHandle();
                    var clientSession = SessionHelper.PipeClientSession(h);
                    bool khay = req?.Cmd is PipeCmd.Foreground or PipeCmd.Play or PipeCmd.PlayInfo && _laKhayThat(h);
                    resp = req == null ? new PipeResponse { Ok = false, Error = "Lệnh rỗng" } : await DispatchAsync(req, clientSession, khay, cts.Token);
                }
                catch (Exception e)
                {
                    resp = new PipeResponse { Ok = false, Error = e.Message };
                }
                await w.WriteLineAsync(JsonSerializer.Serialize(resp, Json.Options));
                try { pipe.WaitForPipeDrain(); } catch { }
            }
            catch (Exception e) when (e is not OperationCanceledException)
            {
                _log.LogDebug(e, "Pipe client lỗi");
            }
            catch (OperationCanceledException) { }
        }
    }

    /// <summary>Trạng thái cho khay của phiên <paramref name="phienGoi"/> + cờ «phiên này có phải của Con không» (khay phiên Ba Mẹ tự thoát — BUG-007).</summary>
    private TrayState TrangThaiChoPhien(DateTimeOffset now, int phienGoi)
    {
        var st = _rt.BuildState(now);
        st.PhienCon = QuyenPhien.KhayChayOPhien(SessionHelper.SessionUser(phienGoi), _rt.Config?.ChildUser, _rt.TaiKhoanMay);
        return st;
    }

    /// <param name="khayThat">Khách là đúng exe khay đã cài — chỉ tính cho Foreground / Play (lệnh khác: false, không dùng).</param>
    private async Task<PipeResponse> DispatchAsync(PipeRequest req, int clientSession, bool khayThat, CancellationToken ct)
    {
        var childSession = _rt.ChildSessionId;
        // Báo app tiền cảnh: chỉ phiên của Con. Xin giờ / mở phiên chơi / lệnh ghi học viên: thêm phiên đang ngồi trước màn hình. Học viên đọc: mọi phiên.
        bool fromChild = QuyenPhien.LaPhienCon(clientSession, childSession);
        var manHinh = SessionHelper.ActiveConsoleSession();
        bool duocXin = QuyenPhien.DuocXinHoacChoi(clientSession, childSession, manHinh);
        var now = DateTimeOffset.Now;

        switch (req.Cmd)
        {
            case PipeCmd.State:
                return new PipeResponse { Ok = true, State = TrangThaiChoPhien(now, clientSession) };

            case PipeCmd.Foreground:
                // Chỉ khay thật: app khác trong phiên Con giả lời báo («không có cửa sổ») sẽ ngừng được đồng hồ phiên chơi.
                if (fromChild && khayThat) _rt.SetForeground(req.AppId, req.AppName);
                return new PipeResponse { Ok = true, State = TrangThaiChoPhien(now, clientSession) };

            case PipeCmd.PlayInfo:
            {
                // Rob hiện «≈ X phút chơi»: phien/xet cho mục Giải trí đầu tiên (hoặc AppId nếu có). Chỉ trả số phút, không trả điểm.
                if (!duocXin) return new PipeResponse { Ok = false, Error = "Chỉ tài khoản của con xem được" };
                // như Play: chỉ khay đã cài, chỉ mục trong PlayChoices (không cho tiến trình lạ dùng token máy hỏi phien/xet tuỳ ý — review #75)
                if (!khayThat) return new PipeResponse { Ok = false, Error = "Chỉ ứng dụng AiiGrow đã cài trên máy được hỏi" };
                var cfg = _rt.Config;
                if (cfg is not { Paired: true }) return new PipeResponse { Ok = false, Error = "Máy chưa ghép với bố mẹ" };
                var choices = _rt.BuildState(now).PlayChoices;
                var muc = !string.IsNullOrWhiteSpace(req.AppId) ? req.AppId!.Trim() : choices.FirstOrDefault() ?? "";
                if (muc.Length == 0) return new PipeResponse { Ok = true, Status = "khong_co_muc" };
                if (!choices.Contains(muc, StringComparer.OrdinalIgnoreCase)) return new PipeResponse { Ok = false, Error = "Mục này Ba Mẹ chưa cho đổi điểm" };
                // nhớ: «được» 60 giây, «từ chối» 15 giây (hết điểm thì mỗi lần mở hộp / làm mới không bắn thêm phien/xet; Ba Mẹ thêm điểm thì hiện sau ≤15 giây)
                lock (_playInfoNho)
                    if (_playInfoNho.TryGetValue(muc, out var nho) && now - nho.Luc < (nho.Tra.Status == "duoc" ? TimeSpan.FromSeconds(60) : TimeSpan.FromSeconds(15))) return nho.Tra;
                try
                {
                    using var api = new ApiClient(cfg.Server, cfg.Token);
                    var xet = await api.CheckPlayAsync(muc, ct);
                    var tra = new PipeResponse { Ok = true, Status = xet.Duoc ? "duoc" : "tu_choi", Message = xet.Duoc ? null : (xet.Cau ?? xet.LyDo), PlayMinutes = xet.Duoc ? xet.PhutHienThi : 0 };
                    lock (_playInfoNho) _playInfoNho[muc] = (now, tra);
                    return tra;
                }
                catch (Exception e) when (e is not OperationCanceledException) { return new PipeResponse { Ok = false, Error = e.Message }; }   // cả lỗi đọc JSON (phutToiDa lẻ…)
            }

            case PipeCmd.Request:
            {
                if (!duocXin) return new PipeResponse { Ok = false, Error = "Chỉ tài khoản của con được gửi lời xin" };
                var cfg = _rt.Config;
                if (cfg is not { Paired: true }) return new PipeResponse { Ok = false, Error = "Máy chưa ghép với bố mẹ" };
                var kind = req.Kind == "doi_diem" ? "doi_diem" : "them_gio";
                int minutes = req.Minutes is 30 or 60 or 120 ? req.Minutes : 30;
                try
                {
                    using var api = new ApiClient(cfg.Server, cfg.Token);
                    var res = await api.CreateRequestAsync(kind, minutes, req.AppId, req.AppName, req.Note, ct);
                    if (res.KetQua != "cho") _rt.RequestSyncSoon();
                    return new PipeResponse { Ok = true, Id = res.Id, Status = res.KetQua };
                }
                catch (ApiException e) { return new PipeResponse { Ok = false, Error = e.Message }; }
            }

            case PipeCmd.Play:
            {
                // «Dùng điểm để chơi»: xét trước (phien/xet) rồi mở (phien/mo). Máy chủ quyết định; khay không thấy số điểm.
                if (!duocXin) return new PipeResponse { Ok = false, Error = "Chỉ tài khoản của con được mở phiên chơi" };
                if (!khayThat) return new PipeResponse { Ok = false, Error = "Chỉ ứng dụng AiiGrow đã cài trên máy được mở phiên chơi" };
                lock (_playInfoNho) _playInfoNho.Clear();   // điểm sắp đổi ⇒ số phút nhớ không còn đúng (xoá SAU khi kiểm quyền)
                var cfg = _rt.Config;
                if (cfg is not { Paired: true }) return new PipeResponse { Ok = false, Error = "Máy chưa ghép với bố mẹ" };
                var muc = string.IsNullOrWhiteSpace(req.AppId) ? "" : req.AppId!;
                try
                {
                    using var api = new ApiClient(cfg.Server, cfg.Token);
                    var xet = await api.CheckPlayAsync(muc, ct);
                    if (!xet.Duoc)
                        return new PipeResponse { Ok = true, Status = "tu_choi", Message = xet.Cau ?? xet.LyDo };
                    var mo = await api.OpenPlayAsync(muc, ct);
                    _rt.RequestSyncSoon();
                    return new PipeResponse { Ok = true, Status = string.IsNullOrEmpty(mo.TrangThai) ? "mo" : mo.TrangThai, Id = mo.Id, Message = xet.Cau };
                }
                catch (ApiException e) { return new PipeResponse { Ok = false, Error = e.Message }; }
            }

            case PipeCmd.Status:
            {
                var cfg = _rt.Config;
                if (cfg is not { Paired: true } || string.IsNullOrEmpty(req.Id))
                    return new PipeResponse { Ok = false, Error = "Thiếu thông tin" };
                try
                {
                    using var api = new ApiClient(cfg.Server, cfg.Token);
                    var st = await api.GetRequestAsync(req.Id!, ct);
                    // chỉ ép đồng bộ khi vừa được duyệt (để thả chặn ngay) — không ép mỗi lần khay hỏi lại
                    if (TrayView.XinGio(st.Status) == TrayView.KetQuaXin.Duoc) _rt.RequestSyncSoon();
                    return new PipeResponse { Ok = true, Id = req.Id, Status = st.Status, GrantEndsAt = st.GrantEndsAt };
                }
                catch (ApiException e) { return new PipeResponse { Ok = false, Error = e.Message }; }
            }

            case PipeCmd.SyncNow:
                // «Thử kết nối lại»: đồng bộ ngay ở vòng kế (≤5 giây); khay hỏi lại trạng thái sau đó.
                _rt.RequestSyncSoon();
                return new PipeResponse { Ok = true, State = TrangThaiChoPhien(now, clientSession) };

            case PipeCmd.HocVien:
            {
                // Khay học viên: nhiệm vụ / nộp bài / điểm / phần quà / thông báo. Xem: mọi phiên; ghi: phiên Con/console (QuyenPhien); chỉ các đường trong HocVienPaths.
                var cfg = _rt.Config;
                if (cfg is not { Paired: true }) return new PipeResponse { Ok = false, Error = "Máy chưa ghép với bố mẹ" };
                if (!HocVienPaths.Allowed(req.Method, req.Path)) return new PipeResponse { Ok = false, Error = "Đường không hỗ trợ" };
                if (!QuyenPhien.DuocHocVien(req.Method, clientSession, childSession, manHinh))
                    return new PipeResponse { Ok = false, Error = "Nhận việc, nộp bài, đổi quà chỉ làm được ở tài khoản Windows của con." };
                try
                {
                    using var api = new ApiClient(cfg.Server, cfg.Token);
                    var method = string.Equals(req.Method, "POST", StringComparison.OrdinalIgnoreCase) ? HttpMethod.Post : HttpMethod.Get;
                    var data = await api.RawAsync(method, "api/device/" + req.Path, req.Body, ct);
                    return new PipeResponse { Ok = true, Data = data };
                }
                catch (ApiException e)
                {
                    var cau = e.IsNetwork ? "Chưa có mạng, con thử lại sau nhé." : e.Message;
                    return new PipeResponse { Ok = false, Error = cau };
                }
            }

            case PipeCmd.MaOffline:
            {
                // Mã mở offline: máy tự kiểm (TOTP), có giới hạn lượt sai, mỗi mã một lượt, có hạn giờ, ghi sự kiện. Không cần mạng.
                var (ok, cau) = _rt.TryMaOffline(req.Code ?? req.Note, now);
                _log.LogInformation("Mã mở offline: {kq}", ok ? "mở" : cau);
                return new PipeResponse { Ok = ok, Message = cau, Error = ok ? null : cau, State = _rt.BuildState(now) };
            }

            default:
                return new PipeResponse { Ok = false, Error = "Lệnh không hỗ trợ" };
        }
    }
}
