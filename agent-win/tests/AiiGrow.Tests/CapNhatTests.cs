using System.Security.Cryptography;
using AiiGrow.Core;

namespace AiiGrow.Tests;

// Cập nhật đè (phát hiện máy đã cài, sao lưu/khôi phục, giữ config), tự cập nhật (manifest, sha256).

public class PhatHienCaiTests
{
    private static AgentConfig DaGhep() => new() { Server = "https://aiigrow.aiilab.vn", Token = "t", DeviceId = "d" };

    [Theory]
    [InlineData("0.2.0", "0.2.0")]
    [InlineData("v0.2", "0.2.0")]
    [InlineData("0.2.0.0", "0.2.0")]
    [InlineData("0.2.0+abc123", "0.2.0")]
    [InlineData("1", "1.0.0")]
    public void DocBan(string vao, string ra) => Assert.Equal(Version.Parse(ra), CapNhat.DocBan(vao));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("abc")]
    public void DocBan_Hong(string? vao) => Assert.Null(CapNhat.DocBan(vao));

    [Fact]
    public void ChuaCoDichVu_CaiMoi() => Assert.Equal(CheDoBoCai.CaiMoi, CapNhat.PhatHien(false, DaGhep(), "0.1.0", "0.2.0").CheDo);

    [Fact]
    public void ChuaGhep_CaiMoi()
    {
        Assert.Equal(CheDoBoCai.CaiMoi, CapNhat.PhatHien(true, null, "0.1.0", "0.2.0").CheDo);
        Assert.Equal(CheDoBoCai.CaiMoi, CapNhat.PhatHien(true, new AgentConfig { Server = "https://x" }, "0.1.0", "0.2.0").CheDo);
    }

    [Theory]
    [InlineData("0.1.0", CheDoBoCai.CapNhat)]
    [InlineData(null, CheDoBoCai.CapNhat)]       // bản rất cũ không có số bản ⇒ vẫn cập nhật, không bắt ghép lại
    [InlineData("0.2.0", CheDoBoCai.DaMoiNhat)]
    [InlineData("0.3.0", CheDoBoCai.DaMoiNhat)]  // bản đang cài mới hơn bộ cài ⇒ không hạ bản
    public void DaCai(string? dangCai, CheDoBoCai ra) => Assert.Equal(ra, CapNhat.PhatHien(true, DaGhep(), dangCai, "0.2.0").CheDo);

    // So SỐ chứ không so chuỗi: 0.2.10 > 0.2.9 (chuỗi thì "0.2.10" < "0.2.9").
    [Theory]
    [InlineData("0.2.9", "0.2.10", CheDoBoCai.CapNhat)]
    [InlineData("0.2.10", "0.2.9", CheDoBoCai.DaMoiNhat)]
    public void BanHaiChuSo_SoTheoSo(string dangCai, string banMoi, CheDoBoCai ra) =>
        Assert.Equal(ra, CapNhat.PhatHien(true, DaGhep(), dangCai, banMoi).CheDo);
}

public class CapNhatMayTests : IDisposable
{
    private readonly string _goc = Path.Combine(Path.GetTempPath(), "aiigrow-cn-" + Guid.NewGuid().ToString("N"));
    private string Cai => Path.Combine(_goc, "Program Files", "AiiGrow");
    private string DuLieu => Path.Combine(_goc, "ProgramData", "AiiGrow");

    public CapNhatMayTests()
    {
        Directory.CreateDirectory(Cai);
        Directory.CreateDirectory(DuLieu);
        File.WriteAllText(Path.Combine(Cai, "AiiGrow.Service.exe"), "cu-service");
        File.WriteAllText(Path.Combine(Cai, "AiiGrow.Tray.exe"), "cu-tray");
        File.WriteAllText(Path.Combine(DuLieu, "config.json"), """{"token":"bi-mat","childUser":"be"}""");
    }

    public void Dispose() { try { Directory.Delete(_goc, true); } catch { } }

    private sealed class Gia : ICapNhatOps
    {
        public bool LoiChep, DichVuChay = true;
        public string? BanGhi;
        public List<string> Buoc = new();
        /// <summary>Thứ tự bật/tắt tự khởi động lại xen giữa các bước (tách khỏi Buoc để test cũ giữ nguyên).</summary>
        public List<string> Khoi = new();
        public void TatTuKhoiDong() => Khoi.Add("tat");
        public void BatTuKhoiDong() => Khoi.Add("bat:" + Buoc.Count);
        public void DungDichVuVaKhay() => Buoc.Add("dung");
        public void ChepTepMoi(string dir)
        {
            File.WriteAllText(Path.Combine(dir, "AiiGrow.Service.exe"), "moi-service");
            if (LoiChep) throw new IOException("đĩa đầy");
            File.WriteAllText(Path.Combine(dir, "AiiGrow.Tray.exe"), "moi-tray");
        }
        public void ChayDichVuVaKhay() => Buoc.Add("chay");
        public bool DichVuDangChay() => DichVuChay;
        public void GhiPhienBan(string dir, string ban) => BanGhi = ban;
    }

    [Fact]
    public void ThanhCong_ChepMoi_GiuConfig()
    {
        var cfg = File.ReadAllBytes(Path.Combine(DuLieu, "config.json"));
        var ops = new Gia();
        var kq = CapNhatMay.Chay(Cai, "0.2.0", ops);
        Assert.True(kq.Ok);
        Assert.Equal("moi-tray", File.ReadAllText(Path.Combine(Cai, "AiiGrow.Tray.exe")));
        Assert.Equal("0.2.0", ops.BanGhi);
        Assert.Equal(cfg, File.ReadAllBytes(Path.Combine(DuLieu, "config.json")));
        Assert.False(Directory.Exists(CapNhatMay.ThuMucSaoLuu(Cai)));
        Assert.Equal(new[] { "dung", "chay" }, ops.Buoc);
    }

    [Fact]
    public void LoiGiuaChung_KhoiPhucBanCu()
    {
        var ops = new Gia { LoiChep = true };
        var kq = CapNhatMay.Chay(Cai, "0.2.0", ops);
        Assert.False(kq.Ok);
        Assert.True(kq.DaKhoiPhuc);
        Assert.Equal("cu-service", File.ReadAllText(Path.Combine(Cai, "AiiGrow.Service.exe")));
        Assert.Null(ops.BanGhi);
        Assert.Equal("chay", ops.Buoc[^1]);   // dịch vụ cũ chạy lại ⇒ máy vẫn được bảo vệ
    }

    [Fact]
    public void DichVuMoiKhongChay_KhoiPhuc()
    {
        var kq = CapNhatMay.Chay(Cai, "0.2.0", new Gia { DichVuChay = false });
        Assert.True(kq.DaKhoiPhuc);
        Assert.Equal("cu-tray", File.ReadAllText(Path.Combine(Cai, "AiiGrow.Tray.exe")));
    }

    [Fact]
    public void TatTuKhoiDongTruoc_BatLaiSauCung_CaKhiLoi()
    {
        foreach (var ops in new[] { new Gia(), new Gia { LoiChep = true } })
        {
            CapNhatMay.Chay(Cai, "0.2.0", ops);
            Assert.Equal("tat", ops.Khoi[0]);                              // trước «dung» (Buoc còn rỗng lúc tắt)
            Assert.Equal("bat:" + ops.Buoc.Count, ops.Khoi[^1]);           // sau bước cuối cùng
            Assert.Equal(2, ops.Khoi.Count);
        }
    }

    [Fact]
    public void KhoiPhuc_TepBiKhoaLanDau_DoiTenRoiChepLai()
    {
        var khoaMotLan = true;
        void Chep(string tu, string dich)
        {
            // lúc khôi phục, exe dịch vụ trong thư mục cài đang bị khoá (SCM vừa bật lại bản mới) ⇒ lần chép đầu lỗi
            if (khoaMotLan && dich.StartsWith(Cai + Path.DirectorySeparatorChar) && dich.EndsWith("AiiGrow.Service.exe"))
            { khoaMotLan = false; throw new IOException("tệp đang được dùng"); }
            File.Copy(tu, dich, true);
        }
        var kq = CapNhatMay.Chay(Cai, "0.2.0", new Gia { LoiChep = true }, Chep);
        Assert.True(kq.DaKhoiPhuc, kq.Log);
        Assert.False(khoaMotLan);
        Assert.Equal("cu-service", File.ReadAllText(Path.Combine(Cai, "AiiGrow.Service.exe")));
        Assert.Single(Directory.GetFiles(Cai, "AiiGrow.Service.exe.cu-*"));  // bản bị khoá được đổi tên, dọn ở lần cập nhật sau
    }

    [Fact]
    public void KhoiPhuc_TepChuaBiDeDangBiGiu_BoQuaVaKhoiPhucDuoc()
    {
        // CI e2e KB8: khay bị giữ (diệt virus) ⇒ chép bản mới lỗi ở khay; khôi phục KHÔNG được chép lại khay (vẫn bị giữ) — nó còn là bản cũ
        void Chep(string tu, string dich)
        {
            if (dich.StartsWith(Cai + Path.DirectorySeparatorChar) && dich.Contains("AiiGrow.Tray.exe")) throw new IOException("tệp đang được dùng");
            File.Copy(tu, dich, true);
        }
        var ops = new Gia { LoiChep = true };
        var kq = CapNhatMay.Chay(Cai, "0.2.0", ops, Chep);
        Assert.True(kq.DaKhoiPhuc, kq.Log);
        Assert.Equal("cu-service", File.ReadAllText(Path.Combine(Cai, "AiiGrow.Service.exe")));
        Assert.Equal("cu-tray", File.ReadAllText(Path.Combine(Cai, "AiiGrow.Tray.exe")));
        Assert.Equal("chay", ops.Buoc[^1]);
    }

    [Fact]
    public void KhoiPhuc_Loi_VanChayLaiDichVu()
    {
        void Chep(string tu, string dich)
        {
            if (dich.StartsWith(Cai + Path.DirectorySeparatorChar) && dich.EndsWith("AiiGrow.Service.exe")) throw new IOException("tệp đang được dùng");
            File.Copy(tu, dich, true);
        }
        var ops = new Gia { LoiChep = true };
        var kq = CapNhatMay.Chay(Cai, "0.2.0", ops, Chep);
        Assert.False(kq.Ok); Assert.False(kq.DaKhoiPhuc);
        Assert.Contains("KHÔNG khôi phục", kq.Log);
        Assert.Equal("chay", ops.Buoc[^1]);   // dịch vụ không bị bỏ ở trạng thái dừng
    }

    [Fact]
    public void ChepDe_ChepLaiVanLoi_TraTenCu()
    {
        var thu = Path.Combine(_goc, "chep-de"); Directory.CreateDirectory(thu);
        var tu = Path.Combine(thu, "moi.exe"); var dich = Path.Combine(thu, "AiiGrow.Service.exe");
        File.WriteAllText(tu, "moi"); File.WriteAllText(dich, "cu");
        // lần 1: tệp đang dùng; lần 2 (sau khi đổi tên): đĩa đầy ⇒ exe cũ phải còn nguyên tên
        Assert.Throws<IOException>(() => CapNhatMay.ChepDe(tu, dich, (_, _) => throw new IOException("đĩa đầy")));
        Assert.Equal("cu", File.ReadAllText(dich));
        Assert.Empty(Directory.GetFiles(thu, "*.cu-*"));
    }

    [Theory]
    [InlineData(true, true, false)]    // bộ cài một tệp + exe cũ của gói zip nằm cạnh trong Downloads ⇒ vẫn dùng nhúng
    [InlineData(true, false, false)]
    [InlineData(false, true, true)]    // bộ cài dạng zip (không nhúng) ⇒ tệp cạnh
    [InlineData(false, false, false)]
    public void ChonNguonGoi(bool coNhung, bool coCanh, bool dungCanh) => Assert.Equal(dungCanh, CapNhatMay.DungTepCanh(coNhung, coCanh));
}

public class TuCapNhatTests
{
    private const string May = "https://aiigrow.aiilab.vn";
    private static readonly string Sha = new('a', 64);
    private static readonly Version Dang = new(0, 2, 0);
    private static BanMoi M(string ver, string url, string? sha = null) => new() { Version = ver, Url = url, Sha256 = sha ?? Sha };

    [Fact]
    public void HopLe()
    {
        Assert.Null(TuCapNhat.KiemManifest(M("0.3.0", May + "/tai/AiiGrow-Setup.exe"), May, Dang));
        Assert.Null(TuCapNhat.KiemManifest(M("0.3.0", "https://abc123.public.blob.vercel-storage.com/tai/AiiGrow-Setup.exe"), May, Dang));
    }

    [Theory]
    [InlineData("0.2.0", "https://aiigrow.aiilab.vn/a.exe")]                 // cùng bản
    [InlineData("0.1.9", "https://aiigrow.aiilab.vn/a.exe")]                 // bản cũ hơn
    [InlineData("xyz", "https://aiigrow.aiilab.vn/a.exe")]
    [InlineData("0.3.0", "http://aiigrow.aiilab.vn/a.exe")]                  // không https
    [InlineData("0.3.0", "https://ke-xau.example.com/a.exe")]                // host lạ
    [InlineData("0.3.0", "https://aiigrow.aiilab.vn.ke-xau.com/a.exe")]      // giả đuôi tên miền
    [InlineData("0.3.0", "https://public.blob.vercel-storage.com.ke-xau.com/a.exe")]
    [InlineData("0.3.0", "file:///C:/a.exe")]
    public void TuChoi(string ver, string url) => Assert.NotNull(TuCapNhat.KiemManifest(M(ver, url), May, Dang));

    // Agent 0.2.9 đang chạy phải nhận 0.2.10 là MỚI HƠN (so số, không so chuỗi); 0.2.10 đang chạy thì bỏ qua 0.2.9.
    [Fact]
    public void BanHaiChuSo_TuCapNhat()
    {
        Assert.Null(TuCapNhat.KiemManifest(M("0.2.10", May + "/tai/AiiGrow-Setup-0.2.10.exe"), May, new Version(0, 2, 9)));
        Assert.NotNull(TuCapNhat.KiemManifest(M("0.2.9", May + "/tai/AiiGrow-Setup-0.2.9.exe"), May, new Version(0, 2, 10)));
    }

    [Theory]
    [InlineData("")]
    [InlineData("abc")]
    [InlineData("zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz")]
    public void TuChoi_ShaHong(string sha) => Assert.NotNull(TuCapNhat.KiemManifest(M("0.3.0", May + "/a.exe", sha), May, Dang));

    [Fact]
    public void TuChoi_KhongCoManifest() => Assert.NotNull(TuCapNhat.KiemManifest(null, May, Dang));

    [Fact]
    public void KhopSha256_DungSai()
    {
        var f = Path.GetTempFileName();
        try
        {
            File.WriteAllText(f, "bo-cai-that");
            var dung = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(f)));
            Assert.True(TuCapNhat.KhopSha256(f, dung.ToLowerInvariant()));
            Assert.True(TuCapNhat.KhopSha256(f, dung));
            File.WriteAllText(f, "bo-cai-bi-sua");   // tệp bị tráo ⇒ từ chối
            Assert.False(TuCapNhat.KhopSha256(f, dung));
            Assert.False(TuCapNhat.KhopSha256(f, "abc"));
            Assert.False(TuCapNhat.KhopSha256(f + ".khong-co", dung));
        }
        finally { File.Delete(f); }
    }

    // 0.2.12: chu kỳ hỏi bản mới do máy chủ đặt (chuKyKiemPhut), kẹp [5, 1440]; không có trường ⇒ 6 giờ như cũ.
    [Theory]
    [InlineData(null, 360)]
    [InlineData(15.0, 15)]
    [InlineData(360.0, 360)]
    [InlineData(0.0, 5)]
    [InlineData(-3.0, 5)]
    [InlineData(4.0, 5)]
    [InlineData(7.6, 8)]
    [InlineData(6.5, 7)]
    [InlineData(1440.0, 1440)]
    [InlineData(100000.0, 1440)]
    [InlineData(double.NaN, 360)]
    public void ChuKyKiem_KepTrongKhoang(double? phut, int mongDoi) => Assert.Equal(TimeSpan.FromMinutes(mongDoi), TuCapNhat.ChuKyKiem(phut));

    [Fact]
    public void Manifest_DocChuKyKiemPhut()
    {
        var co = System.Text.Json.JsonSerializer.Deserialize<BanMoi>("""{"version":"0.2.12","url":"https://aiigrow.aiilab.vn/a.exe","sha256":"x","chuKyKiemPhut":15}""")!;
        Assert.Equal(15, co.ChuKyKiemPhut);
        var khong = System.Text.Json.JsonSerializer.Deserialize<BanMoi>("""{"version":"0.2.12","url":"https://aiigrow.aiilab.vn/a.exe","sha256":"x"}""")!;
        Assert.Null(khong.ChuKyKiemPhut);
        Assert.Equal(TimeSpan.FromHours(6), TuCapNhat.ChuKyKiem(khong.ChuKyKiemPhut));
    }

    // Máy chủ ghi sai kiểu (thập phân, chuỗi, rác) không được làm hỏng cả manifest — hỏng là agent không bao giờ thấy bản sửa.
    [Theory]
    [InlineData("7.5", 8)]
    [InlineData("\"15\"", 15)]
    [InlineData("\"abc\"", 360)]
    [InlineData("null", 360)]
    [InlineData("{}", 360)]
    [InlineData("true", 360)]
    public void Manifest_ChuKySaiKieu_VanDocDuoc(string giaTri, int mongDoi)
    {
        var m = System.Text.Json.JsonSerializer.Deserialize<BanMoi>("{\"version\":\"0.2.12\",\"url\":\"https://aiigrow.aiilab.vn/a.exe\",\"sha256\":\"x\",\"chuKyKiemPhut\":" + giaTri + "}")!;
        Assert.Equal("0.2.12", m.Version);
        Assert.Equal(TimeSpan.FromMinutes(mongDoi), TuCapNhat.ChuKyKiem(m.ChuKyKiemPhut));
    }

    // Hẹn theo giờ thật: máy ngủ qua giờ hẹn thì thức dậy là kiểm ngay; đồng hồ lùi (Con chỉnh giờ) không đẩy hẹn xa quá một chu kỳ.
    [Fact]
    public void KeTiep_GioThat()
    {
        var bayGio = new DateTimeOffset(2026, 10, 28, 8, 0, 0, TimeSpan.Zero);
        var chuKy = TimeSpan.FromMinutes(15);
        var henCu = bayGio.AddHours(-5);                                   // ngủ 5 giờ, đã quá hẹn
        Assert.True(bayGio >= TuCapNhat.KeTiep(henCu, bayGio, chuKy));
        var henGan = bayGio.AddMinutes(10);
        Assert.Equal(henGan, TuCapNhat.KeTiep(henGan, bayGio, chuKy));
        var henXa = bayGio.AddDays(3);                                     // đồng hồ bị lùi 3 ngày sau khi hẹn
        Assert.Equal(bayGio + chuKy, TuCapNhat.KeTiep(henXa, bayGio, chuKy));
    }
}
