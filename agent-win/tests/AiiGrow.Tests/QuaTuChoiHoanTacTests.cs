using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>#757 (Ba Mẹ từ chối quà ⇒ hộp chờ trao tự đóng, lời «trừ sao ngay») · #759 (số trước/sau khớp web, hoàn tác sau khi popup đã hiện).</summary>
public class QuaTuChoiHoanTacTests
{
    private static readonly DateTimeOffset Now = new(2026, 11, 28, 9, 0, 0, TimeSpan.FromHours(7));

    [Fact]
    public void TruocSau_KhongAm_KhopWeb()
    {
        // chơi lố 9 phút (sổ −9, web kẹp 0) rồi được duyệt +60 ⇒ «0 → 51 sao», không «−9 → 51»
        Assert.Equal("0 → 51 sao", AppConView.TruocSau(51, 60));
        Assert.Equal("25 → 85 sao", AppConView.TruocSau(85, 60));
        Assert.Equal("0 → 0 sao", AppConView.TruocSau(0, 10));
        Assert.Equal("0 → 0 sao", AppConView.TruocSau(-40, 60));   // máy chủ cũ trả số âm khi nợ ⇒ vẫn không in âm
    }

    [Fact]
    public void LoiDoiQua_KhongGhiTraoMoiTru()
    {
        Assert.DoesNotContain("mới trừ", AppConView.LuatDoiQua);
        Assert.DoesNotContain("mới trừ", AppConView.DangGiu(50));
        Assert.DoesNotContain("mới trừ", AppConView.DangGiu(50, ngan: true));
        Assert.Equal("Đã trừ 50 sao · chờ Ba Mẹ trao", AppConView.DangGiu(50));
    }

    [Fact]
    public void XongQuaCho_TinTuChoiHoacTraoDungQua()
    {
        var tuChoi = new HvTin { Id = "e1", Loai = "huy_qua", Tieu = "Ba Mẹ đã từ chối · đã hoàn 50 sao", Noi = "«Bộ Lego»" };
        var trao = new HvTin { Id = "e2", Loai = "xac_nhan_qua", Tieu = "Ba Mẹ đã trao quà!", Noi = "Bộ Lego" };
        var khac = new HvTin { Id = "e3", Loai = "duyet_nhiem_vu", Tieu = "Ba Mẹ đã duyệt", Noi = "«Bộ Lego» · +5 sao" };
        Assert.True(HocVienView.XongQuaCho(new[] { tuChoi }, "Bộ Lego"));
        Assert.True(HocVienView.XongQuaCho(new[] { trao }, "bộ lego"));
        Assert.False(HocVienView.XongQuaCho(new[] { khac }, "Bộ Lego"));
        Assert.False(HocVienView.XongQuaCho(new[] { tuChoi }, "Gấu bông"));
        Assert.False(HocVienView.XongQuaCho(new[] { tuChoi }, "Lego"), "tên gần giống không đóng nhầm hộp");
        Assert.True(HocVienView.XongQuaCho(new[] { new HvTin { Id = "e4", Loai = "xac_nhan_qua", Noi = "Thêm 30 phút · +30 phút" } }, "Thêm 30 phút"));
        Assert.True(HocVienView.XongQuaCho(new[] { new HvTin { Id = "e5", Loai = "huy_qua", Noi = "«Kem · socola»" } }, "Kem · socola"));
        Assert.True(HocVienView.XongQuaCho(new[] { new HvTin { Id = "e6", Loai = "xac_nhan_qua", Noi = "Kem · socola" } }, "Kem · socola"));
    }

    [Fact]
    public void ThuHoi_ChiTinDaThay_MoiIdMotLan()
    {
        var tr = new TinTracker();
        tr.Nhan(new HvTinDs { Bay = Now });   // lần đầu
        var duyet = new HvTin { Id = "d1", Loai = "duyet_nhiem_vu", Tieu = "Ba Mẹ đã duyệt", Noi = "«Tưới cây» · +60 sao", Luc = Now.AddMinutes(1) };
        Assert.Single(tr.Nhan(new HvTinDs { Ds = { duyet }, Bay = Now.AddMinutes(2) }));
        // Ba Mẹ hoàn tác sau khi khay đã nhận (popup có thể đang hiện) ⇒ báo; tin chưa từng thấy ⇒ bỏ qua
        var r = new HvTinDs { Bay = Now.AddMinutes(3), ThuHoi = { new HvThuHoi { Id = "d1", Ten = "Tưới cây" }, new HvThuHoi { Id = "lạ", Ten = "Quét nhà" } } };
        tr.Nhan(r);
        var thu = tr.ThuHoi(r);
        Assert.Equal("d1", Assert.Single(thu).Id);
        Assert.Empty(tr.ThuHoi(r));   // máy chủ lùi mốc 5 phút ⇒ trả lại, không báo lần hai
        Assert.Equal(("Ba Mẹ đã hoàn tác", "«Tưới cây» · chưa cộng sao, việc về lại Chờ Ba Mẹ duyệt"), HocVienView.ThuHoiText(thu));
        Assert.True(tr.DaThuHoi("d1"));
        Assert.True(tr.DaThuHoi("lạ"), "popup đang tải dở của tin bị thu hồi thì không mở");
        Assert.False(tr.DaThuHoi("d2"));
    }

    [Fact]
    public void ThuHoi_TinNapImLanDau_KhongBao()
    {
        var tr = new TinTracker();
        var duyet = new HvTin { Id = "d1", Loai = "duyet_nhiem_vu", Tieu = "Ba Mẹ đã duyệt", Noi = "«Tưới cây» · +60 sao", Luc = Now };
        Assert.Empty(tr.Nhan(new HvTinDs { Ds = { duyet }, Bay = Now }));   // khay vừa mở: nạp im, Con không thấy popup
        var r = new HvTinDs { Bay = Now.AddMinutes(1), ThuHoi = { new HvThuHoi { Id = "d1", Ten = "Tưới cây" } } };
        tr.Nhan(r);
        Assert.Empty(tr.ThuHoi(r));
    }

    [Fact]
    public void ChonTinKetQua_TraIdTinGoc()
    {
        var cu = new HvTin { Id = "d0", Loai = "duyet_nhiem_vu", Noi = "«Quét nhà» · +10 sao", Luc = Now };
        var moi = new HvTin { Id = "d1", Loai = "duyet_nhiem_vu", Noi = "«Tưới cây» · +60 sao", Luc = Now.AddMinutes(1) };
        var tk = AppConView.ChonTinKetQua(new[] { cu, moi })!.Value;
        Assert.Equal("d1", tk.Tin.Id);
        Assert.Equal("Tưới cây", tk.Kq.Ten);
        Assert.Null(AppConView.ChonTinKetQua(new[] { new HvTin { Id = "x", Loai = "loi_khen", Noi = "Giỏi" } }));
    }

    [Fact]
    public void ThuHoi_DocJsonMayChu_MayChuCuKhongCoTruong()
    {
        var r = HocVienView.Parse<HvTinDs>("""{"ds":[],"thuHoi":[{"id":"d1","ten":"Tưới cây","luc":"2026-11-28T02:00:00.000Z"}],"bay":"2026-11-28T02:01:00.000Z"}""")!;
        Assert.Equal("Tưới cây", Assert.Single(r.ThuHoi).Ten);
        Assert.Empty(HocVienView.Parse<HvTinDs>("""{"ds":[],"bay":"2026-11-28T02:01:00.000Z"}""")!.ThuHoi);
    }
}
