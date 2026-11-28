using System.Text.Json;
using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>#863: thẻ nhắc tài khoản quản trị chưa có mật khẩu ở khay (phiên Ba Mẹ) — đọc trả lời pipe + hiện / ẩn / hoãn.</summary>
public class NhacQuanTriTests
{
    private static readonly DateTimeOffset T0 = new(2026, 11, 28, 8, 0, 0, TimeSpan.Zero);

    private static PipeResponse Tra(params string[] ten) => new() { Ok = true, Status = "ok", Data = JsonSerializer.Serialize(ten, Json.Options) };

    [Fact]
    public void Doc_DanhSach()
    {
        Assert.Equal(new[] { "Ba Mẹ", "Administrator" }, NhacQuanTriView.Doc(Tra("Ba Mẹ", " Administrator ", "")));
        Assert.Empty(NhacQuanTriView.Doc(Tra())!);
    }

    [Fact]
    public void Doc_ChuaBiet_LaNull()
    {
        Assert.Null(NhacQuanTriView.Doc(new PipeResponse { Ok = true, Status = "chua_kiem", Data = "[]" }));   // dịch vụ chưa kiểm xong lượt đầu
        Assert.Null(NhacQuanTriView.Doc(new PipeResponse { Ok = false, Error = CauLoi.DichVuChuaSan }));       // dịch vụ không trả lời
        Assert.Null(NhacQuanTriView.Doc(new PipeResponse { Ok = false, Error = "Lệnh không rõ" }));             // dịch vụ bản cũ
        Assert.Null(NhacQuanTriView.Doc(new PipeResponse { Ok = true, Status = "ok", Data = "{hỏng" }));
    }

    [Fact]
    public void Doc_KhongPhaiQuanTri_LaRong()
        => Assert.Empty(NhacQuanTriView.Doc(new PipeResponse { Ok = false, Status = NhacQuanTriView.KhongQuanTri })!);

    [Fact]
    public void CoTrong_Hien_HetTrong_An()
    {
        var n = new NhacQuanTri();
        Assert.False(n.Xet(null, T0));                 // chưa biết gì ⇒ không hiện
        Assert.True(n.Xet(new[] { "Ba Mẹ" }, T0));
        Assert.True(n.Xet(null, T0.AddMinutes(1)));    // lượt hỏi lỗi ⇒ giữ như cũ
        Assert.False(n.Xet(Array.Empty<string>(), T0.AddMinutes(2)));   // dịch vụ báo mảng rỗng ⇒ ẩn
        Assert.False(n.Xet(null, T0.AddMinutes(3)));
    }

    [Fact]
    public void DeSau_HoanBonGio()
    {
        var n = new NhacQuanTri();
        Assert.True(n.Xet(new[] { "Ba Mẹ" }, T0));
        n.Hoan(T0, NhacQuanTriView.HoanDeSau);
        Assert.False(n.Xet(new[] { "Ba Mẹ" }, T0.AddHours(1)));
        Assert.False(n.Xet(new[] { "BA MẸ" }, T0.AddHours(2)));   // cùng tài khoản (khác hoa thường)
        Assert.True(n.Xet(new[] { "Ba Mẹ" }, T0.AddHours(4)));
    }

    [Fact]
    public void DeSau_DanhSachDoi_NhacNgay()
    {
        var n = new NhacQuanTri();
        n.Xet(new[] { "Ba Mẹ" }, T0);
        n.Hoan(T0, NhacQuanTriView.HoanDeSau);
        Assert.True(n.Xet(new[] { "Ba Mẹ", "Administrator" }, T0.AddMinutes(5)));
    }

    [Fact]
    public void DaMoCaiDat_ConTrong_HienLaiSauMuoiPhut()
    {
        var n = new NhacQuanTri();
        n.Xet(new[] { "Ba Mẹ" }, T0);
        n.Hoan(T0, NhacQuanTriView.HoanDaMo);
        Assert.False(n.Xet(new[] { "Ba Mẹ" }, T0.AddMinutes(9)));
        Assert.True(n.Xet(new[] { "Ba Mẹ" }, T0.AddMinutes(10)));
    }

    [Fact]
    public void HetTrongRoiTrongLai_NhacNgay()
    {
        var n = new NhacQuanTri();
        n.Xet(new[] { "Ba Mẹ" }, T0);
        n.Hoan(T0, NhacQuanTriView.HoanDeSau);
        Assert.False(n.Xet(Array.Empty<string>(), T0.AddMinutes(5)));
        Assert.True(n.Xet(new[] { "Ba Mẹ" }, T0.AddMinutes(10)));   // xoá mật khẩu lại ⇒ nhắc ngay, không giữ lần hoãn cũ
    }

    [Fact]
    public void DongHoLui_KhongKetHoan()
    {
        var n = new NhacQuanTri();
        n.Xet(new[] { "Ba Mẹ" }, T0);
        n.Hoan(T0, NhacQuanTriView.HoanDeSau);
        Assert.True(n.Xet(new[] { "Ba Mẹ" }, T0.AddDays(-1)));
    }

    [Fact]
    public void DongTen()
    {
        Assert.Equal("Tài khoản: Ba Mẹ", NhacQuanTriView.DongTen(new[] { "Ba Mẹ" }));
        Assert.Equal("Các tài khoản: Ba Mẹ, Administrator", NhacQuanTriView.DongTen(new[] { "Ba Mẹ", "Administrator" }));
        Assert.Equal("ms-settings:signinoptions", NhacQuanTriView.CaiDat);
    }
}
