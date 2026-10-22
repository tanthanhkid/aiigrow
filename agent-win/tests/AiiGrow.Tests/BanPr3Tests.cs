using System.Text.Json;
using AiiGrow.Core;

namespace AiiGrow.Tests;

// Rà soát 22/10 (PR-3): khởi động lại khi mất mạng, xin giờ, AppLocker đọc lỗi, tài khoản khác, lệnh ghi học viên, web hết hạn mở.

public class BanPr3Tests
{
    // G03: LastPolicyJson là CẢ phản hồi dong-bo ⇒ phải lấy khối windows, không thì nạp «tự do» rỗng.
    [Fact]
    public void LastPolicyJson_PhanHoiDongBo_GiuModeKhoa()
    {
        var raw = """{"serverTime":"2026-10-22T14:00:00Z","luat":[],"windows":{"mode":"khoa","locked":true,"lockReason":"ngu","allowedApps":["explorer.exe"]}}""";
        Assert.True(PolicyParser.TryParse(ApiClient.LayWindows(raw), out var p));
        Assert.Equal(Modes.Khoa, p!.Mode);
        Assert.True(p.Locked);
        // dạng phẳng cũ vẫn đọc được
        Assert.True(PolicyParser.TryParse(ApiClient.LayWindows("""{"mode":"hoc","allowedApps":[]}"""), out var cu));
        Assert.Equal(Modes.Hoc, cu!.Mode);
    }

    // G04: máy chủ mới trả «duoc», máy chủ/khay cũ «dong_y» — đều là được; hết hạn / huỷ có câu riêng.
    [Theory]
    [InlineData("duoc", TrayView.KetQuaXin.Duoc)]
    [InlineData("dong_y", TrayView.KetQuaXin.Duoc)]
    [InlineData("tu_duyet", TrayView.KetQuaXin.Duoc)]
    [InlineData("tu_choi", TrayView.KetQuaXin.TuChoi)]
    [InlineData("het_han", TrayView.KetQuaXin.HetHan)]
    [InlineData("huy", TrayView.KetQuaXin.HetHan)]
    [InlineData("cho", TrayView.KetQuaXin.Cho)]
    [InlineData("", TrayView.KetQuaXin.Cho)]
    public void XinGio(string st, TrayView.KetQuaXin ra) => Assert.Equal(ra, TrayView.XinGio(st));

    // G05: máy chủ cũ chỉ trả trang_thai.
    [Fact]
    public void RequestResult_DocTrangThaiMayChu()
    {
        var r = JsonSerializer.Deserialize<RequestResult>("""{"id":"x","trang_thai":"cho"}""", Json.Options)!;
        Assert.Equal("cho", r.KetQua);
        var m = JsonSerializer.Deserialize<RequestResult>("""{"id":"x","trang_thai":"dong_y","status":"tu_duyet"}""", Json.Options)!;
        Assert.Equal("tu_duyet", m.KetQua);
    }

    // G09: đọc chính sách lỗi KHÔNG phải «đã gỡ» (thử lại), trừ khi lỗi mãi (máy không có AppLocker).
    [Fact]
    public void AppLocker_Go_DocLoi_ThuLai()
    {
        Assert.Equal(AppLockerXml.BuocGo.ThuLai, AppLockerXml.XetGo(true, null, 1));
        Assert.Equal(AppLockerXml.BuocGo.Xong, AppLockerXml.XetGo(true, null, AppLockerXml.DocLoiToiDa));
        Assert.Equal(AppLockerXml.BuocGo.Xong, AppLockerXml.XetGo(false, "<AppLockerPolicy Version=\"1\" />", 0));
        Assert.Equal(AppLockerXml.BuocGo.Xong, AppLockerXml.XetGo(false, null, 0));
        var co = AppLockerXml.Merge(null, new AppLockerOptions { ChildSid = "S-1-5-21-1-2-3-1001", AllowedApps = new[] { "notepad.exe" } });
        Assert.Equal(AppLockerXml.BuocGo.CanGhi, AppLockerXml.XetGo(false, co, 0));
    }

    // G10: tài khoản khác trước màn hình ⇒ quyen.phienCon=false.
    [Theory]
    [InlineData("ADMIN", "phi", false, true)]
    [InlineData("Phi", "phi", false, false)]
    [InlineData("ADMIN", "phi", true, false)]    // Con đang dùng (phiên Active) ⇒ không báo
    [InlineData("", "phi", false, false)]        // màn đăng nhập trống
    [InlineData("ADMIN", "", false, false)]      // chưa biết tài khoản Con
    public void TaiKhoanKhac(string manHinh, string con, bool conDung, bool ra) => Assert.Equal(ra, QuyenPhien.LaTaiKhoanKhac(manHinh, con, conDung));

    [Fact]
    public void CoPhienKhac_BaoThieuPhienCon()
    {
        var q = QuyenBaoVe.Tinh(CheDoAgent.Chan, false, Modes.Hoc, true, false, false, phienKhac: true);
        Assert.False(q["phienCon"]);
        Assert.False(QuyenBaoVe.Tinh(CheDoAgent.Chan, false, Modes.Hoc, true, false, false).ContainsKey("phienCon"));
    }

    // Thanh 22/10 (câu 4): xem mọi phiên; lệnh ghi chỉ phiên Con hoặc phiên trước màn hình.
    [Theory]
    [InlineData("GET", 3, 2, 5, true)]
    [InlineData("POST", 2, 2, 5, true)]
    [InlineData("POST", 5, 2, 5, true)]
    [InlineData("POST", 3, 2, 5, false)]
    [InlineData("post", 3, 2, -1, false)]
    public void HocVien_LenhGhiTheoPhien(string m, int goi, int con, int man, bool ra) => Assert.Equal(ra, QuyenPhien.DuocHocVien(m, goi, con, man));

    // G18: hết hạn mở lúc mất mạng ⇒ trang Giải trí chỉ mở nhờ cửa sổ bị chặn lại.
    [Fact]
    public void WebHetMo_Offline_ChanLaiTrangGiaiTri()
    {
        var raw = """{"windows":{"grantEndsAt":"2026-10-22T14:30:00Z","web":{"cheDo":"mo","chan":["gamek.vn"],"cho":["khanacademy.org","youtube.com"],"choKhiMo":["youtube.com"]}}}""";
        var p = WebPolicy.Parse(raw)!;
        p.HetMo(DateTimeOffset.Parse("2026-10-22T14:29:00Z"));
        Assert.Contains("youtube.com", p.Cho);
        p.HetMo(DateTimeOffset.Parse("2026-10-22T14:31:00Z"));
        Assert.DoesNotContain("youtube.com", p.Cho);
        Assert.Contains("youtube.com", p.Chan);
        Assert.Contains("khanacademy.org", p.Cho);
        Assert.Contains("gamek.vn", p.Chan);
    }
}
