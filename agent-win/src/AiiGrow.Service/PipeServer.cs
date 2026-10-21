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

    public PipeServer(ILogger<PipeServer> log, AgentRuntime rt) { _log = log; _rt = rt; }

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
                    var clientSession = SessionHelper.PipeClientSession(pipe.SafePipeHandle.DangerousGetHandle());
                    resp = req == null ? new PipeResponse { Ok = false, Error = "Lệnh rỗng" } : await DispatchAsync(req, clientSession, cts.Token);
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

    private async Task<PipeResponse> DispatchAsync(PipeRequest req, int clientSession, CancellationToken ct)
    {
        var childSession = _rt.ChildSessionId;
        // Chỉ phiên của con mới được báo app tiền cảnh / gửi lời xin.
        bool fromChild = childSession < 0 || clientSession == childSession;
        var now = DateTimeOffset.Now;

        switch (req.Cmd)
        {
            case PipeCmd.State:
                return new PipeResponse { Ok = true, State = _rt.BuildState(now) };

            case PipeCmd.Foreground:
                if (fromChild) _rt.SetForeground(req.AppId, req.AppName);
                return new PipeResponse { Ok = true, State = _rt.BuildState(now) };

            case PipeCmd.Request:
            {
                if (!fromChild) return new PipeResponse { Ok = false, Error = "Chỉ tài khoản của con được gửi lời xin" };
                var cfg = _rt.Config;
                if (cfg is not { Paired: true }) return new PipeResponse { Ok = false, Error = "Máy chưa ghép với Ba Mẹ" };
                var kind = req.Kind == "doi_diem" ? "doi_diem" : "them_gio";
                int minutes = req.Minutes is 30 or 60 or 120 ? req.Minutes : 30;
                try
                {
                    using var api = new ApiClient(cfg.Server, cfg.Token);
                    var res = await api.CreateRequestAsync(kind, minutes, req.AppId, req.AppName, req.Note, ct);
                    if (res.Status != "cho") _rt.RequestSyncSoon();
                    return new PipeResponse { Ok = true, Id = res.Id, Status = res.Status };
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
                    if (st.Status != "cho") _rt.RequestSyncSoon();
                    return new PipeResponse { Ok = true, Id = req.Id, Status = st.Status, GrantEndsAt = st.GrantEndsAt };
                }
                catch (ApiException e) { return new PipeResponse { Ok = false, Error = e.Message }; }
            }

            default:
                return new PipeResponse { Ok = false, Error = "Lệnh không hỗ trợ" };
        }
    }
}
