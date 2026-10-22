using AiiGrow.Core;

namespace AiiGrow.Tests;

// Thanh 22/10 (ảnh máy Phi, 0.2.0): khay mở ở phiên KHÁC tài khoản Con chọn lúc cài ⇒ «Chỉ tài khoản của con dùng được phần này» + «Đang tải nhiệm vụ…» treo.

public class QuyenPhienTests
{
    [Theory]
    [InlineData(2, 2, true)]
    [InlineData(3, 2, false)]
    [InlineData(3, -1, true)]   // Con chưa đăng nhập / chưa biết phiên ⇒ không chặn
    public void LaPhienCon(int goi, int con, bool ra) => Assert.Equal(ra, QuyenPhien.LaPhienCon(goi, con));

    [Theory]
    [InlineData(2, 2, 5, true)]    // đúng phiên Con
    [InlineData(5, 2, 5, true)]    // phiên khác ChildUser nhưng đang ngồi trước màn hình ⇒ được xin giờ / mở phiên chơi
    [InlineData(3, 2, 5, false)]   // phiên nền khác (không phải màn hình, không phải Con) ⇒ chặn
    [InlineData(3, 2, -1, false)]  // không có phiên màn hình
    [InlineData(3, -1, 5, true)]
    public void DuocXinHoacChoi(int goi, int con, int manHinh, bool ra) => Assert.Equal(ra, QuyenPhien.DuocXinHoacChoi(goi, con, manHinh));

    [Theory]
    [InlineData(false, false, null, TaiHocVien.ChuaGhep)]
    [InlineData(true, false, null, TaiHocVien.DangTai)]
    [InlineData(true, false, "Chưa có mạng, con thử lại sau nhé.", TaiHocVien.Loi)]   // lỗi ⇒ hiện lý do + Thử lại, không treo
    [InlineData(true, true, "lỗi cũ", TaiHocVien.Xong)]
    [InlineData(true, false, " ", TaiHocVien.DangTai)]
    public void TrangThaiTai(bool paired, bool coDuLieu, string? loi, TaiHocVien ra) => Assert.Equal(ra, HocVienView.TrangThaiTai(paired, coDuLieu, loi));
}
