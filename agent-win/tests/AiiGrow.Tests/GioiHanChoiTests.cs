using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>16/11 (#302): giới hạn tối đa mỗi ngày + mỗi lượt rồi nghỉ — máy chủ kẹp quyConPhut / sao.phutCon, khay chỉ đổi chữ.</summary>
public class GioiHanChoiTests
{
    [Fact]
    public void TuDongBo_DocKhoiGioiHan_VaSaoThat()
    {
        var p = PolicyParser.TuDongBo("""
        {"windows":{"mode":"hoc","allowedApps":[],"quyConPhut":0,"appTinhGio":[],
           "gioiHan":{"apDung":true,"lyDoKhoa":"dang_nghi","nghiDen":"2026-11-16T09:00:00.000Z","nghiDenGio":"16:00","conNgay":90,"luotPhut":30,"phutToiDa":0,
                      "cau":"Nghỉ một chút · chơi tiếp lúc 16:00"}},
         "sao":{"sao":170,"no":0,"phutCon":0,"saoTieuDuoc":170,"hetSao":true,"canhBaoNo":false},"cheDo":"theo_danh_sach"}
        """);
        Assert.Equal(GioiHanMay.DangNghi, p.GioiHan!.LyDoKhoa);
        Assert.Equal("16:00", p.GioiHan.NghiDenGio);
        Assert.Equal(170, p.SoSao!.SaoTieuDuoc);
        Assert.Equal(0, p.QuyConPhut);
        // máy chủ cũ: không có khối ⇒ null, như trước
        var cu = PolicyParser.TuDongBo("""{"windows":{"mode":"hoc"},"sao":{"sao":3,"no":0,"phutCon":3}}""");
        Assert.Null(cu.GioiHan);
        Assert.Null(cu.SoSao!.SaoTieuDuoc);
    }

    [Fact]
    public void ManKhoa_DangNghi_HetGioNgay_KhongNoiHetSao()
    {
        var nghi = HetSaoView.ForGioiHan(GioiHanMay.DangNghi, "16:00", null, new[] { "tudien.exe" }, doiBe: false)!;
        Assert.Equal("Nghỉ một chút", nghi.Tieu);
        Assert.Equal("Nghỉ một chút · chơi tiếp lúc 16:00", nghi.Phu);
        Assert.DoesNotContain(nghi.Nut, n => n.Ma == HetSaoView.LamNhiemVu);
        Assert.Contains(nghi.Nut, n => n.Ma == HetSaoView.XinVay);
        var het = HetSaoView.ForGioiHan(GioiHanMay.HetGioNgay, null, "Hôm nay đã chơi đủ 60 phút — mai chơi tiếp nhé", null, doiBe: true)!;
        Assert.Equal("Hôm nay chơi đủ rồi", het.Tieu);
        Assert.Equal("Hôm nay đã chơi đủ 60 phút — mai chơi tiếp nhé", het.Phu);
        Assert.Contains(het.Nut, n => n.Ma == HetSaoView.DoiBe);
        Assert.Null(HetSaoView.ForGioiHan(null, null, null, null, false));
        var sapLuot = HetSaoView.ForSapHetGio(45, "Roblox", luot: true, new[] { "tudien.exe" }, doiBe: true);
        Assert.Equal("Sắp hết giờ chơi", sapLuot.Tieu);
        Assert.Equal("Hết lượt thì nghỉ một chút nhé", sapLuot.SaoDong);
        Assert.Contains(sapLuot.Nut, n => n.Ma == HetSaoView.DoiBe);
        Assert.Equal("Hôm nay chơi đủ giờ rồi · mai chơi tiếp nhé", HetSaoView.ForSapHetGio(45, "Roblox", luot: false, null, doiBe: false).SaoDong);
        Assert.Equal(("Nghỉ một chút", "Roblox tạm đóng · chơi tiếp lúc 16:00", "Lúc nghỉ không trừ sao"), HetSaoView.PopGioiHan(GioiHanMay.DangNghi, "16:00", null, "Roblox")!.Value);
        Assert.Null(HetSaoView.PopGioiHan(null, null, null, "Roblox"));
    }

    [Fact]
    public void DoanKhiHet_LuotChanTruoc_NghiDungPhutLuot_NgayChanTruoc_HetHomNay()
    {
        var luc = new DateTimeOffset(new DateTime(2026, 11, 16, 15, 30, 0, DateTimeKind.Local));
        var luot = new GioiHanMay { ApDung = true, NgayPhut = 120, ConNgay = 90, LuotPhut = 30, ConLuot = 0 };
        Assert.Equal((GioiHanMay.DangNghi, "16:00", (string?)null), luot.DoanKhiHet(luc)!.Value);
        var ngay = new GioiHanMay { ApDung = true, NgayPhut = 60, ConNgay = 0, LuotPhut = 30, ConLuot = 10 };
        Assert.Equal(GioiHanMay.HetGioNgay, ngay.DoanKhiHet(luc)!.Value.LyDo);
        Assert.Equal("Hôm nay đã chơi đủ 60 phút — mai chơi tiếp nhé", ngay.DoanKhiHet(luc)!.Value.Cau);
        Assert.Null(new GioiHanMay { ApDung = false }.DoanKhiHet(luc));
    }
}
