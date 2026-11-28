using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>#822: khay chỉ báo bé khi trạng thái ĐỔI (khoá / hết giờ chơi / Ba Mẹ thêm web) — lớp thuần, không đồng hồ.</summary>
public class BaoBeDoiTrangThaiTests
{
    private static TrangThaiBaoBe T(bool khoa = false, string? lyDo = null, string? hetGio = null, string? gio = null, string[]? chan = null, string[]? cho = null, string? mo = null)
        => new(khoa, lyDo, hetGio, gio, chan ?? Array.Empty<string>(), cho ?? Array.Empty<string>(), mo);

    [Fact]
    public void LuotDau_KhongBao_ChiLayMoc()
        => Assert.Empty(BaoBeDoiTrangThai.Xet(null, T(khoa: true, lyDo: LockReasons.Khoa, chan: new[] { "a.com" })));

    [Fact]
    public void ChuyenSangKhoa_BaoMotLan_KhongBaoLap()
    {
        var truoc = T();
        var khoa = T(khoa: true, lyDo: LockReasons.Khoa);
        var b = Assert.Single(BaoBeDoiTrangThai.Xet(truoc, khoa));
        Assert.Equal("Ba Mẹ vừa khoá máy", b.Tieu);
        Assert.Empty(BaoBeDoiTrangThai.Xet(khoa, khoa));          // đồng bộ lại, vẫn khoá
        Assert.Empty(BaoBeDoiTrangThai.Xet(khoa, T()));           // mở khoá: không báo
    }

    [Fact]
    public void DoiLyDoKhoa_TuChonTenSangBaMeKhoa_Bao()
        => Assert.Single(BaoBeDoiTrangThai.Xet(T(khoa: true, lyDo: LockReasons.ChonTen), T(khoa: true, lyDo: LockReasons.Khoa)));

    [Theory]
    [InlineData(LockReasons.ChonTen)]
    [InlineData(LockReasons.CanMang)]
    [InlineData(LockReasons.HetDiem)]
    [InlineData(null)]
    public void KhoaKhongPhaiBeBiKhoa_KhongBao(string? lyDo)
        => Assert.Empty(BaoBeDoiTrangThai.Xet(T(), T(khoa: true, lyDo: lyDo)));

    [Fact]
    public void HetGioChoi_BaoKhiVaoGioiHan_KhongBaoLap()
    {
        var het = T(hetGio: GioiHanMay.HetGioNgay);
        var b = Assert.Single(BaoBeDoiTrangThai.Xet(T(), het));
        Assert.Equal("Hôm nay chơi đủ giờ rồi", b.Tieu);
        Assert.Empty(BaoBeDoiTrangThai.Xet(het, het));
        var nghi = Assert.Single(BaoBeDoiTrangThai.Xet(T(), T(hetGio: GioiHanMay.DangNghi, gio: "16:00")));
        Assert.Equal("Con chơi tiếp lúc 16:00.", nghi.Phu);
        Assert.Empty(BaoBeDoiTrangThai.Xet(het, T()));            // hết giới hạn: không báo
    }

    [Fact]
    public void DangKhoa_KhongBaoHetGio()
        => Assert.DoesNotContain(BaoBeDoiTrangThai.Xet(T(), T(khoa: true, lyDo: LockReasons.Khoa, hetGio: GioiHanMay.HetGioNgay)), b => b.Icon == "dong_ho_cat");

    [Fact]
    public void BaMeThemWebChan_Bao_TrangCu_KhongBao()
    {
        var truoc = T(chan: new[] { "a.com" });
        var nay = T(chan: new[] { "a.com", "b.com" });
        var b = Assert.Single(BaoBeDoiTrangThai.Xet(truoc, nay));
        Assert.Equal("Ba Mẹ vừa chặn thêm web", b.Tieu);
        Assert.StartsWith("b.com.", b.Phu);
        Assert.Empty(BaoBeDoiTrangThai.Xet(nay, nay));
        Assert.Empty(BaoBeDoiTrangThai.Xet(nay, truoc));          // gỡ web: không báo
    }

    [Fact]
    public void BaMeThemWebCho_Bao()
    {
        var b = Assert.Single(BaoBeDoiTrangThai.Xet(T(), T(cho: new[] { "hoc.vn" })));
        Assert.Equal("Ba Mẹ vừa cho phép thêm web", b.Tieu);
    }

    [Fact]
    public void ChoKhiMoHetHan_ChoSangChan_KhongPhaiBaMeThem()
        => Assert.Empty(BaoBeDoiTrangThai.Xet(T(cho: new[] { "game.com" }), T(chan: new[] { "game.com" })));

    [Fact]
    public void NhieuWeb_RutGon()
    {
        var b = Assert.Single(BaoBeDoiTrangThai.Xet(T(), T(chan: new[] { "a.com", "b.com", "c.com", "d.com", "e.com" })));
        Assert.Contains("và 2 trang khác", b.Phu);
    }

    [Fact]
    public void WebKhongBiet_GiuMoc_BaMeMoMayXongQuayLai_KhongBaoCaDanhSach()
    {
        var moc = T(chan: new[] { "a.com" });
        var khongBiet = new TrangThaiBaoBe(false, null, null, null, null, null);
        Assert.Empty(BaoBeDoiTrangThai.Xet(moc, khongBiet));
        var giu = BaoBeDoiTrangThai.GiuMoc(moc, khongBiet);
        Assert.Equal(new[] { "a.com" }, giu.WebChan);
        Assert.Empty(BaoBeDoiTrangThai.Xet(giu, T(chan: new[] { "a.com" })));
    }

    [Fact]
    public void MoKhanCap_BatVaHetHan_BaoMoiLanMot()
    {
        var mo = T(mo: "17:30");
        var b = Assert.Single(BaoBeDoiTrangThai.Xet(T(), mo));
        Assert.Equal("Ba Mẹ vừa mở máy cho con", b.Tieu);
        Assert.Contains("17:30", b.Phu);
        Assert.Empty(BaoBeDoiTrangThai.Xet(mo, mo));                         // đồng bộ lại: không báo lặp
        Assert.Empty(BaoBeDoiTrangThai.Xet(mo, T(mo: "18:00")));             // Ba Mẹ kéo dài: không báo lại
        var het = Assert.Single(BaoBeDoiTrangThai.Xet(mo, T()));
        Assert.Equal("Hết giờ Ba Mẹ mở rồi", het.Tieu);
        Assert.Empty(BaoBeDoiTrangThai.Xet(null, mo));                       // lượt đầu chỉ lấy mốc
    }

    [Fact]
    public void HetHanMo_DongThoiKhoaMay_ChiBaoKhoa()
    {
        var b = Assert.Single(BaoBeDoiTrangThai.Xet(T(mo: "17:30"), T(khoa: true, lyDo: LockReasons.Khoa)));
        Assert.Equal("Ba Mẹ vừa khoá máy", b.Tieu);
    }

    [Fact]
    public void Tu_ModeHocCoHan_KhongTinhLaMo()
    {
        var het = DateTimeOffset.Now.AddMinutes(30);
        Assert.Null(TrangThaiBaoBe.Tu(new TrayState { Mode = Modes.Hoc, GrantEndsAt = het }).MoDenGio);
        Assert.NotNull(TrangThaiBaoBe.Tu(new TrayState { Mode = Modes.TuDo, GrantEndsAt = het }).MoDenGio);
        Assert.False(MoCoHan.Dang(new TrayState { Mode = Modes.Hoc, GrantEndsAt = het }, DateTimeOffset.Now));
    }

    [Fact]
    public void MoCoHan_GioHetVaDang_TheoMocGio()
    {
        var now = new DateTimeOffset(2026, 11, 27, 10, 0, 0, TimeSpan.Zero);
        Assert.Null(MoCoHan.GioHet(null, now));
        Assert.Null(MoCoHan.GioHet(now.AddMinutes(-1), now));                // hết hạn rồi
        Assert.Equal(now.AddMinutes(30).ToLocalTime().ToString("HH:mm"), MoCoHan.GioHet(now.AddMinutes(30), now));
        Assert.True(MoCoHan.Dang(now.AddSeconds(1), now));
        Assert.False(MoCoHan.Dang(now, now));
        Assert.Equal("Ba Mẹ đang mở máy · chơi thoải mái tới 17:30", MoCoHan.DongDangMo("17:30"));
        Assert.DoesNotContain("khoá", MoCoHan.DongDangMo("17:30"));
    }

    // ---- #822 / #823: tin máy chủ khoá / mở khẩn cấp ⇒ hộp, báo một lần dù tới từ hai đường

    private static HvTin Tin(string loai, string tieu, int phut = 0)
        => new() { Id = loai + phut, Loai = loai, Tieu = tieu, Noi = "…", Luc = new DateTimeOffset(2026, 11, 28, 2, 25, 0, TimeSpan.Zero).AddMinutes(phut) };

    [Fact]
    public void TinMoKhanCap_RaHopMoKhoa_TinThuongVanBongBao()
    {
        var moi = new List<HvTin> { Tin("duyet_nhiem_vu", "Ba Mẹ đã duyệt"), Tin("mo_khan_cap", "Ba Mẹ mở máy cho con đến 09:40", 1) };
        var b = BaoTuTin.MoiNhat(moi);
        Assert.NotNull(b);
        Assert.Equal(("mo_khoa", "Ba Mẹ mở máy cho con đến 09:40"), (b!.Icon, b.Tieu));
        Assert.Equal("duyet_nhiem_vu", Assert.Single(BaoTuTin.ConLai(moi)).Loai);
        Assert.Equal("khoa", BaoTuTin.Tu(Tin("khoa_ngay", "Ba Mẹ đã khoá máy"))!.Icon);
        Assert.Equal("khoa", BaoTuTin.Tu(Tin("khoa_may", "Ba Mẹ đã khoá máy AIIGROW-CON"))!.Icon);
        Assert.Null(BaoTuTin.MoiNhat(new[] { Tin("cho_vay", "Mẹ cho vay 5 sao") }));
    }

    [Fact]
    public void TinKhoaMoiNhatThang()
    {
        var b = BaoTuTin.MoiNhat(new[] { Tin("mo_khan_cap", "Ba Mẹ mở máy cho con đến 09:40", 0), Tin("khoa_ngay", "Ba Mẹ đã khoá máy", 2) });
        Assert.Equal("khoa", b!.Icon);
    }

    [Fact]
    public void ChongLap_TinToiTruoc_DuongTrangThaiThoi()
    {
        var now = new DateTimeOffset(2026, 11, 28, 2, 25, 0, TimeSpan.Zero);
        var cl = new ChongLapBao();
        var tin = BaoTuTin.Tu(Tin("mo_khan_cap", "Ba Mẹ mở máy cho con đến 09:40"))!;
        Assert.True(cl.NenHien(tin, now, tuTin: true));
        Assert.False(cl.NenHien(MoCoHan.BaoMo("09:40"), now.AddSeconds(40)));                            // cùng việc qua trạng thái dịch vụ
        Assert.True(cl.NenHien(BaoBeDoiTrangThai.KhoaMay(LockReasons.Khoa), now.AddSeconds(50)));         // việc khác (Ba Mẹ khoá) vẫn báo
        Assert.True(cl.NenHien(MoCoHan.BaoMo("10:30"), now + ChongLapBao.Cua));                           // lần mở sau (hết cửa) báo lại
        Assert.True(cl.NenHien(MoCoHan.BaoHet(), now.AddSeconds(5)));                                      // hộp không nhóm không bị chặn
    }

    [Fact]
    public void ChongLap_TrangThaiToiTruoc_TinCoGioVanThayHop()
    {
        var now = new DateTimeOffset(2026, 11, 28, 1, 23, 0, TimeSpan.Zero);
        var cl = new ChongLapBao();
        Assert.True(cl.NenHien(BaoBeDoiTrangThai.KhoaMay(LockReasons.Khoa), now));
        Assert.True(cl.NenHien(BaoTuTin.Tu(Tin("khoa_ngay", "Ba Mẹ đã khoá máy"))!, now.AddSeconds(30), tuTin: true));   // tin có «mở lại lúc» thay hộp chung
    }

    [Fact]
    public void TinKhoaMo_ChiHienKhiMayDungTrangThai_HopSaiThiDong()
    {
        var khoa = BaoTuTin.Tu(Tin("khoa_ngay", "Ba Mẹ đã khoá máy"))!;
        var mo = BaoTuTin.Tu(Tin("mo_khan_cap", "Ba Mẹ mở máy cho con đến 09:40"))!;
        var now = new DateTimeOffset(2026, 11, 28, 2, 25, 0, TimeSpan.Zero);
        var khoaSt = new TrayState { Locked = true, Mode = Modes.Khoa };
        var hoc = new TrayState { Locked = false, Mode = Modes.Hoc };
        var moSt = new TrayState { Locked = false, Mode = Modes.TuDo, GrantEndsAt = now.AddMinutes(15) };
        Assert.True(BaoTuTin.KhopTrangThai(khoa.Nhom, khoaSt, now));
        Assert.False(BaoTuTin.KhopTrangThai(khoa.Nhom, hoc, now));     // Ba Mẹ đang dùng máy ⇒ khoá chưa áp, chưa báo
        Assert.False(BaoTuTin.KhopTrangThai(mo.Nhom, khoaSt, now));    // mở khẩn cấp trong giờ ngủ / khoá ngay ⇒ máy vẫn khoá, không báo «mở»
        Assert.False(BaoTuTin.KhopTrangThai(mo.Nhom, hoc, now));       // dịch vụ chưa áp mở (mode hoc vẫn chặn) ⇒ chưa báo
        Assert.True(BaoTuTin.KhopTrangThai(mo.Nhom, moSt, now));
        Assert.True(BaoTuTin.HopDaSai(ChongLapBao.BaMeKhoa, hoc, now));   // Ba Mẹ «Mở lại» ⇒ đóng hộp «đã khoá»
        Assert.True(BaoTuTin.HopDaSai(ChongLapBao.BaMeMo, hoc, now));     // Ba Mẹ «Khoá lại ngay» ⇒ đóng hộp «mở máy»
        Assert.False(BaoTuTin.HopDaSai(null, hoc, now));
    }

    [Fact]
    public void ChongLap_GioNguKhongChanBaMeKhoa()
    {
        var now = new DateTimeOffset(2026, 11, 28, 14, 0, 0, TimeSpan.Zero);
        var cl = new ChongLapBao();
        Assert.True(cl.NenHien(BaoBeDoiTrangThai.KhoaMay(LockReasons.Ngu), now));
        Assert.True(cl.NenHien(BaoBeDoiTrangThai.KhoaMay(LockReasons.Khoa), now.AddMinutes(2)));
    }
}
