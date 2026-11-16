using AiiGrow.Core;
using Xunit;

namespace AiiGrow.Tests;

/// <summary>#307 — khớp Bàn thiết kế phía Con Windows: tên app theo danh sách app máy, «Ba Mẹ khoá lúc», chân trang máy chung, nút chính màn khoá.</summary>
public class KhopBan307Tests
{
    private static readonly Dictionary<string, string> Bang = TrayView.TaoBang(new Dictionary<string, string>
    {
        ["tudien.exe"] = "Từ điển", ["youtubekids"] = "YouTube Kids", [" "] = "rác", ["trong.exe"] = " ",
    });

    [Fact]
    public void TenApp_TraBangCoHoacKhongDuoiExe()
    {
        Assert.Equal("Từ điển", TrayView.TenTheoDanhSach("tudien.exe", Bang));
        Assert.Equal("Từ điển", TrayView.TenTheoDanhSach("TUDIEN", Bang));
        Assert.Equal("YouTube Kids", TrayView.TenTheoDanhSach("youtubekids.exe", Bang));
        Assert.Null(TrayView.TenTheoDanhSach("trong.exe", Bang));   // tên trống bị bỏ khi tạo bảng
        Assert.Null(TrayView.TenTheoDanhSach("khong.exe", Bang));
        Assert.Null(TrayView.TenTheoDanhSach("tudien.exe", new Dictionary<string, string>()));
    }

    [Fact]
    public void TenApp_UuTienBang_BoTenTienTrinhTran()
    {
        // tên tiến trình trần (RecordBlocked / tiền cảnh) không thắng bảng tên
        Assert.Equal("Từ điển", TrayView.FriendlyAppName("tudien.exe", "tudien", Bang));
        Assert.Equal("Từ điển", TrayView.FriendlyAppName("tudien.exe", "Tên khác", Bang));
        // không có trong bảng: tên hiển thị thật dùng được, tên tiến trình trần thì không
        Assert.Equal("Trò chơi", TrayView.FriendlyAppName("x.exe", "Trò chơi", Bang));
        Assert.Equal("Roblox", TrayView.FriendlyAppName("roblox.exe", "roblox", Bang));
        // tên miền không phải tên tiến trình
        Assert.Equal("y8.com", TrayView.FriendlyAppName("y8.com", "y8.com", Bang));
        Assert.True(TrayView.LaTenTienTrinh("tudien.exe", "TUDIEN"));
        Assert.False(TrayView.LaTenTienTrinh("y8.com", "y8.com"));
    }

    [Fact]
    public void TenDaGiai_DiQuaNguyenVen_VaDanhSachTenTheoMuc()
    {
        Assert.Equal("Học với AiiRob", TrayView.FriendlyAppName("Học với AiiRob", null));
        Assert.Equal("YouTube Kids", TrayView.FriendlyAppName("YouTube Kids", null));
        Assert.Equal("Tudien", TrayView.FriendlyAppName("tudien.exe", null));   // không bảng ⇒ đoán từ mục (dịch vụ đã giải sẵn trước khi gửi)
        var s = new TrayState { AppDuocPhep = new() { "tudien.exe" }, TenAppDuocPhep = new() { "Từ điển" }, AppTinhPhut = new() { "roblox.exe" } };
        Assert.Equal(new[] { "Từ điển" }, TrayView.TenKhongTinh(s));
        Assert.Equal(new[] { "roblox.exe" }, TrayView.TenTinh(s));   // dịch vụ cũ không gửi tên ⇒ dùng mục
        Assert.Equal("Từ điển vẫn mở · không tính phút", SaoView.VanMo(TrayView.TenKhongTinh(s)));
    }

    [Fact]
    public void KhoaLuc_GiuMocCu_BoKhiMo()
    {
        var t0 = new DateTimeOffset(2026, 11, 16, 19, 30, 0, TimeSpan.FromHours(7));
        var t1 = t0.AddMinutes(5);
        Assert.Equal(t0, KhoaLucMay.Cap(null, true, t0));
        Assert.Equal(t0, KhoaLucMay.Cap(t0, true, t1));   // không đổi giữa các lượt
        Assert.Null(KhoaLucMay.Cap(t0, false, t1));
        Assert.Equal($"Ba Mẹ khoá lúc {t0.ToLocalTime():HH:mm}.", ManKhoaView.KhoaLucCau(t0));
        Assert.Null(ManKhoaView.KhoaLucCau(null));
    }

    [Fact]
    public void ChanTrang_MayChungDangDung()
    {
        Assert.Equal("AiiGrow · Bảo Anh đang dùng · máy do Ba Mẹ quản lý", ManKhoaView.ChanTrang("Bảo Anh", true));
        Assert.Equal("AiiGrow · Bảo Anh · máy do Ba Mẹ quản lý", ManKhoaView.ChanTrang("Bảo Anh", false));
        Assert.Equal(ManKhoaView.ChanTrang("", false), ManKhoaView.ChanTrang("", true));
    }

    [Theory]
    [InlineData(LockReasons.Khoa, true)]
    [InlineData(LockReasons.Ngu, false)]
    [InlineData(LockReasons.HetGio, false)]
    public void ManKhoa_NhanBaMeLaNutChinhChiKhiBaMeKhoa(string lyDo, bool chinh)
    {
        var m = ManKhoaView.For(lyDo, "Bảo Anh", offline: false, khoaLuc: "Ba Mẹ khoá lúc 19:30.");
        Assert.Equal(chinh, m.Nut.Single(n => n.Ma == ManKhoaView.NhanBaMe).Chinh);
        Assert.False(m.Nut.Single(n => n.Ma == ManKhoaView.BaMeDungMay).Chinh);
        Assert.DoesNotContain(HetSaoView.For(null, null, null, true).Nut, n => n.Chinh);
    }
}
