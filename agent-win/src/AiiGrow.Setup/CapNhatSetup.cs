using System.Diagnostics;
using AiiGrow.Core;
using Microsoft.Win32;

namespace AiiGrow.Setup;

/// <summary>Phát hiện máy đã cài + chạy cập nhật đè (giữ config/token/tài khoản Con/AppLocker, lỗi thì khôi phục bản cũ).</summary>
internal static class CapNhatSetup
{
    private const string DichVuKey = @"SYSTEM\CurrentControlSet\Services\" + Paths.ServiceName;
    /// <summary>Ghi vào mục Ứng dụng sau khi cập nhật xong ⇒ khay (chạy bằng tài khoản thường, đọc được HKLM) báo «đã cập nhật lên bản X» một lần.</summary>
    public const string GiaTriBanVuaCapNhat = "BanVuaCapNhat";

    public static string BanBoCai => typeof(CapNhatSetup).Assembly.GetName().Version?.ToString(3) ?? "0.1.0";

    public static PhatHienCai PhatHien()
    {
        bool coDichVu;
        try { using var k = Registry.LocalMachine.OpenSubKey(DichVuKey); coDichVu = k != null; } catch { coDichVu = false; }
        AgentConfig? cfg = null;
        try { cfg = new ConfigStore().Load(); } catch { }
        return CapNhat.PhatHien(coDichVu, cfg, BanDangCai(), BanBoCai);
    }

    private static string? BanDangCai()
    {
        try
        {
            var svc = Path.Combine(Paths.InstallDir, Paths.ServiceExeName);
            if (File.Exists(svc) && FileVersionInfo.GetVersionInfo(svc).ProductVersion is { Length: > 0 } v) return v;
        }
        catch { }
        try
        {
            using var k = Registry.LocalMachine.OpenSubKey(AppsEntry.Key);
            return k?.GetValue("DisplayVersion") as string;
        }
        catch { return null; }
    }

    /// <param name="imLang">Chạy từ dịch vụ (SYSTEM, không có màn hình): không đóng/mở khay của người đang dùng — tệp khay đang chạy được đổi tên rồi chép bản mới,
    /// lần đăng nhập sau khay bản mới tự chạy.</param>
    public static KetQuaCapNhat Chay(bool imLang) => CapNhatMay.Chay(Paths.InstallDir, BanBoCai, new WindowsCapNhatOps(imLang));

    private sealed class WindowsCapNhatOps : ICapNhatOps
    {
        private readonly bool _imLang;
        public WindowsCapNhatOps(bool imLang) { _imLang = imLang; }

        public void DungDichVuVaKhay()
        {
            Shell.PowerShell($"try {{ Stop-Service -Name {Paths.ServiceName} -Force -ErrorAction Stop }} catch {{}}", 60000);
            Giet(Paths.ServiceExeName, 10000);
            if (!_imLang) Giet(Paths.TrayExeName, 5000);
            DonTepCu();
        }

        public void ChepTepMoi(string thuMucCai)
        {
            if (!Goi.Co(Paths.ServiceExeName)) throw new FileNotFoundException("bộ cài thiếu " + Paths.ServiceExeName);
            Chep(Paths.ServiceExeName, thuMucCai);
            Chep(Paths.TrayExeName, thuMucCai);
            var self = Environment.ProcessPath;
            var setupDest = Path.Combine(thuMucCai, Paths.SetupExeName);
            if (!string.IsNullOrEmpty(self) && File.Exists(self) && !string.Equals(Path.GetFullPath(self), Path.GetFullPath(setupDest), StringComparison.OrdinalIgnoreCase))
                ChepDe(() => File.Copy(self, setupDest, true), setupDest);
        }

        public void ChayDichVuVaKhay()
        {
            var r = Shell.PowerShell($"Start-Service -Name {Paths.ServiceName}", 60000);
            if (!r.Ok) throw new InvalidOperationException("không chạy được dịch vụ: " + r.Error);
            Installer.SetTrayAndNotice();
            var tray = Path.Combine(Paths.InstallDir, Paths.TrayExeName);
            // explorer.exe mở khay bằng quyền thường của người đang đăng nhập (bộ cài đang chạy quyền quản trị).
            if (!_imLang && File.Exists(tray))
                try { Process.Start(new ProcessStartInfo("explorer.exe", "\"" + tray + "\"") { UseShellExecute = false })?.Dispose(); } catch { }
        }

        public bool DichVuDangChay()
        {
            for (int i = 0; i < 20; i++)
            {
                var r = Shell.PowerShell($"(Get-Service -Name {Paths.ServiceName}).Status", 15000);
                if (r.Ok && r.Output.Trim().Equals("Running", StringComparison.OrdinalIgnoreCase)) return true;
                Thread.Sleep(1000);
            }
            return false;
        }

        public void GhiPhienBan(string thuMucCai, string ban)
        {
            AppsEntry.Register(thuMucCai, ban);
            using var k = Registry.LocalMachine.CreateSubKey(AppsEntry.Key);
            k.SetValue(GiaTriBanVuaCapNhat, ban);
        }

        private static void Giet(string exe, int cho)
        {
            foreach (var p in Process.GetProcessesByName(Path.GetFileNameWithoutExtension(exe)))
            {
                try { p.Kill(); p.WaitForExit(cho); } catch { }
                p.Dispose();
            }
        }

        private static void Chep(string tep, string thuMucCai)
        {
            var dich = Path.Combine(thuMucCai, tep);
            ChepDe(() => { if (!Goi.ChepRa(tep, dich)) throw new FileNotFoundException("bộ cài thiếu " + tep); }, dich);
        }

        /// <summary>Tệp đích đang chạy (khay của người đang dùng máy) ⇒ Windows cho ĐỔI TÊN tệp đang chạy: đổi sang «.cu-…» rồi chép bản mới.</summary>
        private static void ChepDe(Action chep, string dich)
        {
            try { chep(); }
            catch (Exception e) when (e is IOException or UnauthorizedAccessException)
            {
                if (!File.Exists(dich)) throw;
                File.Move(dich, dich + ".cu-" + Guid.NewGuid().ToString("N")[..8]);
                chep();
            }
        }

        /// <summary>Xoá các tệp «.cu-…» của lần cập nhật trước (khay cũ đã thoát).</summary>
        private static void DonTepCu()
        {
            try
            {
                foreach (var f in Directory.GetFiles(Paths.InstallDir, "*.cu-*"))
                    try { File.Delete(f); } catch { }
            }
            catch { }
        }
    }
}

/// <summary>Màn cập nhật: «Cập nhật AiiGrow lên bản X» (bản đang cài → bản mới), hoặc «Đã là bản mới nhất» + Mở lại / Sửa cài đặt.</summary>
internal sealed class CapNhatForm : Form
{
    private readonly PhatHienCai _ph;
    private readonly Label _tieuDe = new() { AutoSize = true, MaximumSize = new Size(520, 0), Font = new Font("Segoe UI", 16f, FontStyle.Bold), ForeColor = SetupForm.Chu, Location = new Point(32, 28) };
    private readonly Label _loi = new() { AutoSize = true, MaximumSize = new Size(520, 0), Font = new Font("Segoe UI", 11f), ForeColor = SetupForm.Chu2, Location = new Point(32, 80) };
    private readonly ProgressBar _thanh = new() { Location = new Point(32, 220), Size = new Size(520, 6), Style = ProgressBarStyle.Marquee, Visible = false };
    private readonly FlowLayoutPanel _nut = new() { Location = new Point(32, 250), Size = new Size(540, 56), FlowDirection = FlowDirection.LeftToRight };
    private bool _dangChay;

    /// <summary>Ba Mẹ chọn «Sửa cài đặt» ⇒ Program mở trình cài đầy đủ (ghép lại / đổi tài khoản Con).</summary>
    public bool MuonSua { get; private set; }

    public CapNhatForm(PhatHienCai ph)
    {
        _ph = ph;
        Text = "AiiGrow";
        Font = new Font("Segoe UI", 11f);
        ClientSize = new Size(600, 330);
        FormBorderStyle = FormBorderStyle.FixedDialog;
        MaximizeBox = false;
        StartPosition = FormStartPosition.CenterScreen;
        BackColor = SetupForm.Nen;
        Controls.AddRange(new Control[] { _tieuDe, _loi, _thanh, _nut });
        FormClosing += (_, e) => { if (_dangChay) e.Cancel = true; };
        if (ph.CheDo == CheDoBoCai.CapNhat) ManCapNhat(); else ManMoiNhat();
    }

    private void ManCapNhat()
    {
        _tieuDe.Text = "Cập nhật AiiGrow lên bản " + CapNhat.Hien(_ph.BanMoi);
        _loi.Text = $"Máy này đang chạy AiiGrow bản {CapNhat.Hien(_ph.BanDangCai)} → bản mới {CapNhat.Hien(_ph.BanMoi)}.\n\n" +
                    "Cập nhật giữ nguyên ghép máy, tài khoản của Con và các luật Ba Mẹ đã đặt — không phải ghép lại. " +
                    "Mất khoảng một phút; nếu có lỗi, AiiGrow tự quay về bản cũ để máy vẫn được bảo vệ.";
        _nut.Controls.Clear();
        _nut.Controls.Add(Nut("Cập nhật", true, CapNhatNgay));
        _nut.Controls.Add(Nut("Để sau", false, Close));
    }

    private void ManMoiNhat()
    {
        _tieuDe.Text = "AiiGrow đã là bản mới nhất";
        _loi.Text = $"Máy này đang chạy AiiGrow bản {CapNhat.Hien(_ph.BanDangCai)} (bộ cài này: {CapNhat.Hien(_ph.BanMoi)}). Không cần cập nhật.\n\n" +
                    "«Mở lại AiiGrow» chạy lại dịch vụ và biểu tượng ở khay. «Sửa cài đặt» mở trình cài đầy đủ (ghép lại, đổi tài khoản của Con).";
        _nut.Controls.Clear();
        _nut.Controls.Add(Nut("Mở lại AiiGrow", true, MoLai));
        _nut.Controls.Add(Nut("Sửa cài đặt", false, () => { MuonSua = true; Close(); }));
        _nut.Controls.Add(Nut("Đóng", false, Close));
    }

    private async void CapNhatNgay()
    {
        _dangChay = true;
        _nut.Enabled = false;
        _thanh.Visible = true;
        _loi.Text = "Đang cập nhật… (dừng AiiGrow, sao lưu bản cũ, chép bản mới, chạy lại)";
        var kq = await Task.Run(() => CapNhatSetup.Chay(imLang: false));
        Program.WriteLog("Cập nhật (có giao diện): " + kq.Log);
        _dangChay = false;
        _thanh.Visible = false;
        _nut.Enabled = true;
        _tieuDe.Text = kq.Ok ? "Đã cập nhật lên bản " + CapNhat.Hien(_ph.BanMoi) : "Chưa cập nhật được";
        _tieuDe.ForeColor = kq.Ok ? SetupForm.Chinh : SetupForm.Loi;
        _loi.Text = kq.Ok ? "AiiGrow đang chạy bản mới. Ghép máy và luật của Ba Mẹ giữ nguyên." : kq.Log;
        _nut.Controls.Clear();
        _nut.Controls.Add(Nut("Đóng", true, Close));
    }

    private async void MoLai()
    {
        _nut.Enabled = false;
        var r = await Task.Run(() => Shell.PowerShell($"Start-Service -Name {Paths.ServiceName}", 60000));
        var tray = Path.Combine(Paths.InstallDir, Paths.TrayExeName);
        if (File.Exists(tray) && Process.GetProcessesByName(Path.GetFileNameWithoutExtension(Paths.TrayExeName)).Length == 0)
            try { Process.Start(new ProcessStartInfo("explorer.exe", "\"" + tray + "\"") { UseShellExecute = false })?.Dispose(); } catch { }
        _nut.Enabled = true;
        _loi.Text = r.Ok ? "Đã chạy lại AiiGrow." : "Chưa chạy lại được dịch vụ: " + r.Error;
    }

    private static Button Nut(string chu, bool chinh, Action bam)
    {
        var b = new Button
        {
            Text = chu, AutoSize = false, Size = new Size(chinh ? 180 : 150, 44), FlatStyle = FlatStyle.Flat,
            BackColor = chinh ? SetupForm.Chinh : Color.White, ForeColor = chinh ? Color.White : SetupForm.Chu,
            Font = new Font("Segoe UI", 11f, FontStyle.Bold), Margin = new Padding(0, 0, 12, 0), Cursor = Cursors.Hand,
        };
        b.FlatAppearance.BorderColor = chinh ? SetupForm.Chinh : SetupForm.Vien;
        b.Click += (_, _) => bam();
        return b;
    }
}
