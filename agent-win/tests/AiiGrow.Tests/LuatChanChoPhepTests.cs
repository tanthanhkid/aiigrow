using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>Nhóm «Luật Chặn / Cho phép» (đợt rà 26/11): #693 cho phép theo tên ở chỗ Con thả tệp, #690 bí danh app gộp cho Cho phép / Tính phút,
/// #698 không đóng được tiến trình thì phải báo.</summary>
public class LuatChanChoPhepTests
{
    private static readonly string[] Safe = { @"C:\Program Files\AiiGrow" };
    private const string Win = @"C:\Windows";
    private static readonly HashSet<string> NoDirs = new(StringComparer.OrdinalIgnoreCase);
    private static HashSet<string> Tap(params string[] a) => new(a, StringComparer.OrdinalIgnoreCase);

    // ------------------------------------------------------------------ #693

    [Theory]
    [InlineData(@"C:\Users\An\Desktop\discord.exe", true)]
    [InlineData(@"C:\Users\An\Downloads\Game\discord.exe", true)]
    [InlineData(@"C:\Users\An\Documents\discord.exe", true)]
    [InlineData(@"C:\Users\An\OneDrive\Desktop\discord.exe", true)]
    [InlineData(@"C:\Users\An\OneDrive - Truong\discord.exe", true)]
    [InlineData(@"C:\Users\An\AppData\Local\Temp\7z1\discord.exe", true)]
    [InlineData(@"C:\Users\An\discord.exe", true)]
    [InlineData(@"C:\Users\Public\Games\discord.exe", true)]
    [InlineData(@"C:\Windows\Temp\discord.exe", true)]
    [InlineData(@"C:\Windows\Tracing\discord.exe", true)]
    [InlineData(@"C:\Windows\System32\Tasks\discord.exe", true)]
    [InlineData(@"E:\discord.exe", true)]
    [InlineData(@"C:\$Recycle.Bin\S-1-5-21-1\discord.exe", true)]
    [InlineData(@"C:\Users\An\AppData\Local\Temp:discord.exe", true)]
    [InlineData(@"\\nas\chung\discord.exe", true)]
    // app đã cài thật: không phải chỗ thả tệp
    [InlineData(@"C:\Users\An\AppData\Local\Discord\app-1.0.9\Discord.exe", false)]
    [InlineData(@"C:\Users\An\AppData\Local\Roblox\Versions\v1\RobloxPlayerBeta.exe", false)]
    [InlineData(@"C:\Users\An\AppData\Local\Programs\Minecraft Launcher\MinecraftLauncher.exe", false)]
    [InlineData(@"C:\Program Files\Discord\Discord.exe", false)]
    [InlineData(@"C:\Windows\System32\notepad.exe", false)]
    [InlineData(@"D:\Games\Discord\Discord.exe", false)]
    public void LaChoConThaTep(string path, bool mong) => Assert.Equal(mong, ProcessGuard.LaChoConThaTep(path, Win));

    [Fact]
    public void ChoPhepTheoTen_KhongNhanGameDoiTenODesktopDownloads()   // #693 kịch bản 2
    {
        var al = Tap("discord.exe", "7zfm.exe");
        // trên origin/main hai dòng dưới trả false (không đóng): game đổi tên discord.exe ở Desktop / Downloads chạy được
        Assert.True(ProcessGuard.ShouldClose(@"C:\Users\Con\Desktop\discord.exe", al, NoDirs, Safe, Win));
        Assert.True(ProcessGuard.ShouldClose(@"C:\Users\Con\Downloads\discord.exe", al, NoDirs, Safe, Win));
        // bản cài thật vẫn được phép
        Assert.False(ProcessGuard.ShouldClose(@"C:\Users\Con\AppData\Local\Discord\app-1.0.9\Discord.exe", al, NoDirs, Safe, Win));
        Assert.False(ProcessGuard.ShouldClose(@"C:\Program Files\7-Zip\7zFM.exe", al, NoDirs, Safe, Win));
        // app Store được phép theo tên gói: không đổi
        Assert.False(ProcessGuard.ShouldClose(@"C:\Program Files\WindowsApps\Microsoft.MinecraftUWP_1.0_x64__8wekyb3d8bbwe\Minecraft.Windows.exe",
            Tap("microsoft.minecraftuwp"), NoDirs, Safe, Win));
    }

    [Fact]
    public void ChoThaTep_ChiChanBanGiaCuaAppDaCai_AppBaMeDuyetTuDownloadsVanChay()
    {
        var al = Tap("discord.exe", "tool.exe");
        var daCai = Tap("discord.exe");   // danh sách app quét được: Discord cài ở AppData\Local\Discord
        Assert.True(ProcessGuard.ShouldClose(@"C:\Users\Con\Desktop\discord.exe", al, NoDirs, Safe, Win, tenDaCai: daCai));
        // tool.exe không có bản cài trên máy (Con xin, Ba Mẹ duyệt khi nó nằm ở Downloads) ⇒ vẫn chạy được
        Assert.False(ProcessGuard.ShouldClose(@"C:\Users\Con\Downloads\tool.exe", al, NoDirs, Safe, Win, tenDaCai: daCai));
        Assert.False(ProcessGuard.ShouldClose(@"C:\Users\Con\AppData\Local\Discord\app-1.0.9\Discord.exe", al, NoDirs, Safe, Win, tenDaCai: daCai));

        var ds = new[]
        {
            new AppThat { Khoa = "a", Muc = "discord.exe", Ten = "Discord", DuongDan = @"C:\Users\Con\AppData\Local\Discord\app-1.0.9\Discord.exe" },
            new AppThat { Khoa = "b", Muc = "tool.exe", Ten = "Tool", DuongDan = @"C:\Users\Con\Downloads\tool.exe" },
            new AppThat { Khoa = "c", Muc = "launcher.exe", Ten = "X", DuongDan = @"C:\Program Files\X\launcher.exe" },
            new AppThat { Khoa = "d", Muc = "microsoft.minecraftuwp", Ten = "Minecraft" },
        };
        Assert.Equal(new[] { "discord.exe" }, DanhSachApp.TenExeDaCai(ds, Win));
    }

    [Fact]
    public void AppDuocPhepChayTuDesktop_KhongKeoDesktopThanhHelper()   // #693 kịch bản 3
    {
        var fake = new FakeProcessControl(
            new RunningProc(1, @"C:\Users\Con\Desktop\7zFM.exe"),
            new RunningProc(2, @"C:\Users\Con\Desktop\game.exe"),
            new RunningProc(3, @"C:\Program Files\7-Zip\7zFM.exe"),
            new RunningProc(4, @"C:\Program Files\7-Zip\7zG.exe"));
        ProcessEnforcer.Enforce(fake, 2, new[] { "7zfm.exe" }, Safe, winDir: Win);
        // trên origin/main: không đóng gì (7zFM.exe ở Desktop được phép theo tên ⇒ cả Desktop thành «helper cùng thư mục»)
        Assert.Equal(new[] { 1, 2 }, fake.Closed);   // helper cùng thư mục cài thật (7zG) vẫn giữ

        // như dịch vụ chạy thật: Ba Mẹ duyệt bản portable ở Desktop (không có bản cài) ⇒ nó chạy, nhưng Desktop vẫn không thành «helper»
        var that = new FakeProcessControl(
            new RunningProc(1, @"C:\Users\Con\Desktop\7zFM.exe"),
            new RunningProc(2, @"C:\Users\Con\Desktop\game.exe"));
        ProcessEnforcer.Enforce(that, 2, new[] { "7zfm.exe" }, Safe, winDir: Win, tenDaCai: Tap());
        Assert.Equal(new[] { 2 }, that.Closed);
    }

    // ------------------------------------------------------------------ #690

    private static List<AppThat> MinecraftHaiNguon() => DanhSachApp.ChuanHoa(new[]
    {
        new AppThat { Khoa = "appx:microsoft.4297127d64ec6_8wekyb3d8bbwe", Muc = "microsoft.4297127d64ec6", Ten = "Minecraft Launcher", Nguon = "store" },
        new AppThat { Khoa = @"exe:c:\program files (x86)\minecraft launcher\minecraftlauncher.exe", Muc = "minecraftlauncher.exe", Ten = "Minecraft Launcher", Nguon = "registry" },
    });

    [Fact]
    public void BiDanh_ApChoDanhSachChoPhep_BanStoreKhongBiDong()   // #690 kịch bản 1–3
    {
        var ds = MinecraftHaiNguon();
        var mc = Assert.Single(ds);
        Assert.Equal("minecraftlauncher.exe", mc.Muc);   // máy chủ chỉ biết muc này
        var nhom = DanhSachApp.NhomMuc(ds);
        var bd = DanhSachApp.BangBiDanh(nhom);
        const string store = @"C:\Program Files\WindowsApps\Microsoft.4297127D64EC6_1.0.0.0_x64__8wekyb3d8bbwe\Minecraft.exe";

        // trên origin/main: allowedApps chỉ có muc chính ⇒ bản Store bị đóng dù Ba Mẹ đã cho phép
        var cu = new FakeProcessControl(new RunningProc(1, store));
        ProcessEnforcer.Enforce(cu, 2, new[] { "minecraftlauncher.exe" }, Safe, winDir: Win);
        Assert.Equal(new[] { 1 }, cu.Closed);

        var moi = new FakeProcessControl(new RunningProc(1, store));
        ProcessEnforcer.Enforce(moi, 2, ChanAppThat.MoRongTen(new[] { "minecraftlauncher.exe" }, DanhSachApp.BangMucChinh(nhom)), Safe, winDir: Win);
        Assert.Empty(moi.Closed);
        Assert.Equal(new[] { "minecraftlauncher.exe", "microsoft.4297127d64ec6" }, bd["minecraftlauncher.exe"]);
    }

    [Fact]
    public void BiDanh_TinhPhut_QuyVeMucChinh()   // #690 kịch bản 4
    {
        var nhom = DanhSachApp.NhomMuc(MinecraftHaiNguon());
        var chinh = DanhSachApp.BangMucChinh(nhom);
        Assert.Equal("minecraftlauncher.exe", chinh["microsoft.4297127d64ec6"]);
        Assert.False(chinh.ContainsKey("minecraftlauncher.exe"));   // muc chính giữ nguyên

        var p = new Policy { AppTinhGio = new List<string> { "minecraftlauncher.exe" } };
        Assert.False(QuyTaiCho.TinhGio(p, "microsoft.4297127d64ec6"));                      // phút ghi dưới muc bí danh: không trừ sao
        Assert.True(QuyTaiCho.TinhGio(p, chinh["microsoft.4297127d64ec6"]));                // quy về muc chính: trừ sao
    }

    [Fact]
    public void BiDanh_KhongMoRongTenChung_KhongTrung_GiuThuTu()
    {
        var bd = DanhSachApp.BangBiDanh(new List<List<string>>
        {
            new() { "a.exe", "launcher.exe", "a-store" },
            new() { "b.exe", "b-store" },
        });
        Assert.Equal(new[] { "a.exe", "launcher.exe", "a-store" }, bd["a-store"]);
        var chinh = DanhSachApp.BangMucChinh(new List<List<string>>
        {
            new() { "a.exe", "launcher.exe", "a-store" },
            new() { "b.exe", "b-store" },
        });
        Assert.False(chinh.ContainsKey("launcher.exe"));   // tên chung chung không quy về app nào
        Assert.Equal("a.exe", chinh["A-STORE"]);
        Assert.Equal(new[] { "a.exe", "x.exe", "a-store" }, ChanAppThat.MoRongTen(new[] { "a.exe", "x.exe", "A.EXE" }, chinh));
        Assert.Equal(new[] { "x.exe" }, ChanAppThat.MoRongTen(new[] { "x.exe" }, null));
        // một chiều: muc bí danh còn sót trong danh sách (hết sao đã bỏ muc chính) không kéo muc chính vào lại
        Assert.Equal(new[] { "b-store" }, ChanAppThat.MoRongTen(new[] { "b-store" }, chinh));
        Assert.Empty(DanhSachApp.BangBiDanh((IEnumerable<IReadOnlyList<string>>?)null));
    }

    [Fact]
    public void NhomMuc_LuuCauHinh_DocLaiDuocBiDanh()   // #690 kịch bản 5: khởi động lại không chờ lượt quét
    {
        var cfg = new AgentConfig { NhomMucApp = DanhSachApp.NhomMuc(MinecraftHaiNguon()) };
        var json = System.Text.Json.JsonSerializer.Serialize(cfg, Json.Options);
        var doc = System.Text.Json.JsonSerializer.Deserialize<AgentConfig>(json, Json.Options)!;
        var bd = DanhSachApp.BangBiDanh(doc.NhomMucApp);
        Assert.Equal(new[] { "minecraftlauncher.exe", "microsoft.4297127d64ec6" }, bd["minecraftlauncher.exe"]);
        Assert.Equal(2, ChanAppThat.MoRongBiDanh(new[] { new AppBiChan { Muc = "minecraftlauncher.exe" } }, bd).Count);
    }

    // ------------------------------------------------------------------ #698

    private sealed class KhongDongDuoc : IProcessControl
    {
        private readonly RunningProc[] _ds;
        public KhongDongDuoc(params RunningProc[] ds) => _ds = ds;
        public IEnumerable<RunningProc> ListChildProcesses(int sessionId) => _ds;
        public bool Close(int processId) => false;   // Windows từ chối (tiến trình nâng quyền / được bảo vệ)
    }

    [Fact]
    public void KhongDongDuoc_BaoRaNgoai_KhongImLang()
    {
        var c = new KhongDongDuoc(new RunningProc(1, @"C:\Users\Con\AppData\Local\Roblox\Versions\v1\RobloxPlayerBeta.exe"));
        var baoChan = new List<(string, string)>();
        var kq = ChanAppThat.Enforce(c, 2, new[] { new AppBiChan { Muc = "robloxplayerbeta.exe" } }, dryRun: false, winDir: Win, safeDirs: Safe,
            khongDong: (exe, muc) => baoChan.Add((exe, muc)));
        Assert.Empty(kq);   // không đóng được ⇒ không coi là đã chặn
        Assert.Equal(new[] { ("robloxplayerbeta.exe", "robloxplayerbeta.exe") }, baoChan);

        var baoNgoai = new List<string>();
        var dong = ProcessEnforcer.Enforce(c, 2, Array.Empty<string>(), Safe, winDir: Win, khongDong: baoNgoai.Add);
        Assert.Empty(dong);
        Assert.Equal(new[] { "robloxplayerbeta.exe" }, baoNgoai);

        // giám sát (dryRun) không gọi Close ⇒ không có gì để báo
        var giamSat = new List<string>();
        ProcessEnforcer.Enforce(c, 2, Array.Empty<string>(), Safe, dryRun: true, winDir: Win, khongDong: giamSat.Add);
        Assert.Empty(giamSat);
    }
}
