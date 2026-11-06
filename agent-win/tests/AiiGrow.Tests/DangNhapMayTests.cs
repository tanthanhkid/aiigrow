using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>06/11 (L13 — docs/API.md mục «S3»): máy dùng chung — chọn tên + PIN, Ba Mẹ nhập mã, đổi bé; vân PIN / mã 60·30·15 phút khớp máy chủ.</summary>
public class DangNhapMayTests
{
    private const string BiMat = "bi-mat-may";
    // 2025-11-06T12:30:00Z — vectơ lấy từ chính máy chủ (server/lib/ma-offline.ts › maOfflinePhut, pin-be.ts › vanPin)
    private static readonly DateTimeOffset Moc = DateTimeOffset.FromUnixTimeSeconds(1762432200);
    private const string VanBaoAnh = "e47874f27518e18587f1c4a8ac7cbe3e997b61ad694da67e9eab4df8d2fe8c43";

    private static HoSoBe BaoAnh(bool coPin = true) => new() { Id = "c1", Ten = "Bảo Anh", CoPin = coPin, VanPin = coPin ? VanBaoAnh : null };

    private static EffectivePolicy Mo() => new(false, null, 18, null, true);

    [Fact]
    public void VanPin_khop_may_chu()
    {
        Assert.Equal(VanBaoAnh, DangNhapView.VanPin(BiMat, "c1", "4821"));
        Assert.NotEqual(VanBaoAnh, DangNhapView.VanPin(BiMat, "c2", "4821"));
    }

    [Fact]
    public void Ma_mo_may_thu_bien_the_60_30_15_khop_may_chu()
    {
        Assert.Equal("898540", MaOffline.MaPhut(BiMat, 60, Moc));
        Assert.Equal("638374", MaOffline.MaPhut(BiMat, 30, Moc));
        Assert.Equal("591760", MaOffline.MaPhut(BiMat, 15, Moc));
        Assert.Equal(60, MaOffline.KiemPhut(BiMat, "898540", Moc));
        Assert.Equal(30, MaOffline.KiemPhut(BiMat, "638 374", Moc.AddMinutes(4)));
        Assert.Equal(15, MaOffline.KiemPhut(BiMat, "591760", Moc));
        Assert.Null(MaOffline.KiemPhut(BiMat, "000000", Moc));
        Assert.Null(MaOffline.KiemPhut(null, "898540", Moc));
        Assert.Null(MaOffline.KiemPhut(BiMat, "898540", Moc.AddMinutes(20)));   // quá dung sai ±1 bước 5 phút
    }

    [Fact]
    public void Mo_tam_offline_mo_dung_so_phut_trong_ma()
    {
        var st = new MoTamOffline();
        Assert.Equal(KetQuaMoOffline.DaMo, st.TryUnlock(BiMat, "591760", Moc));
        Assert.Equal(Moc.AddMinutes(15), st.UnlockUntil);
        var st2 = new MoTamOffline();
        Assert.Equal(KetQuaMoOffline.DaMo, st2.TryUnlock(BiMat, "638374", Moc));
        Assert.Equal(Moc.AddMinutes(30), st2.UnlockUntil);
    }

    [Fact]
    public void PIN_offline_dung_sai_5_lan_cho_15_giay()
    {
        var d = new DangNhapMay();
        Assert.Equal(KetQuaPinOffline.Dung, DangNhapView.ThuPinOffline(d, BaoAnh(), BiMat, "4821", Moc, out _, out _));
        for (int i = 1; i <= 4; i++)
        {
            Assert.Equal(KetQuaPinOffline.Sai, DangNhapView.ThuPinOffline(d, BaoAnh(), BiMat, "1111", Moc.AddSeconds(i), out var con, out _));
            Assert.Equal(5 - i, con);
        }
        Assert.Equal(KetQuaPinOffline.TamKhoa, DangNhapView.ThuPinOffline(d, BaoAnh(), BiMat, "1111", Moc.AddSeconds(5), out _, out var cho));
        Assert.Equal(15, cho);
        // đang chờ: PIN đúng cũng chưa thử được
        Assert.Equal(KetQuaPinOffline.TamKhoa, DangNhapView.ThuPinOffline(d, BaoAnh(), BiMat, "4821", Moc.AddSeconds(10), out _, out cho));
        Assert.Equal(10, cho);
        // hết 15 giây ⇒ thử lại được, đúng thì xoá bộ đếm
        Assert.Equal(KetQuaPinOffline.Dung, DangNhapView.ThuPinOffline(d, BaoAnh(), BiMat, "4821", Moc.AddSeconds(21), out _, out _));
        Assert.False(d.SaiPin.ContainsKey("c1"));
    }

    [Fact]
    public void PIN_offline_be_chua_co_PIN_vao_thang_khong_bi_mat_thi_khong_kiem()
    {
        var d = new DangNhapMay();
        Assert.Equal(KetQuaPinOffline.Dung, DangNhapView.ThuPinOffline(d, BaoAnh(coPin: false), null, null, Moc, out _, out _));
        Assert.Equal(KetQuaPinOffline.KhongKiemDuoc, DangNhapView.ThuPinOffline(d, BaoAnh(), null, "4821", Moc, out _, out _));
        Assert.Equal(KetQuaPinOffline.KhongKiemDuoc, DangNhapView.ThuPinOffline(d, new HoSoBe { Id = "c1", CoPin = true }, BiMat, "4821", Moc, out _, out _));
    }

    [Fact]
    public void Lua_sai_cu_hon_15_phut_khong_cong_don()
    {
        var d = new DangNhapMay();
        for (int i = 0; i < 4; i++) DangNhapView.ThuPinOffline(d, BaoAnh(), BiMat, "1111", Moc.AddSeconds(i), out _, out _);
        Assert.Equal(KetQuaPinOffline.Sai, DangNhapView.ThuPinOffline(d, BaoAnh(), BiMat, "1111", Moc.AddMinutes(16), out var con, out _));
        Assert.Equal(4, con);
    }

    [Fact]
    public void Chua_ai_dang_nhap_thi_khoa_chon_ten_khong_dem_gio()
    {
        var d = new DangNhapMay();
        var e = DangNhapView.ApDung(Mo(), d, Moc);
        Assert.True(e.Locked);
        Assert.Equal(LockReasons.ChonTen, e.LockReason);
        Assert.Null(e.MinutesLeft);
        Assert.True(e.AppLockerWanted);
        // cấu hình cũ (không có khối đăng nhập) ⇒ cũng chọn tên
        Assert.Equal(LockReasons.ChonTen, DangNhapView.ApDung(Mo(), null, Moc).LockReason);
    }

    [Fact]
    public void Be_dang_dung_giu_nguyen_Policy_cua_be()
    {
        var d = new DangNhapMay();
        DangNhapView.VaoCon(d, "c1", "Bảo Anh", null, Moc);
        var het = new EffectivePolicy(true, LockReasons.HetGio, 0, null, true);
        Assert.Equal(het, DangNhapView.ApDung(het, d, Moc));
        Assert.Equal(LoaiNguoiDung.Con, DangNhapView.HienTai(d, Moc));
    }

    [Fact]
    public void Ba_Me_dang_dung_mo_het_toi_han_roi_ve_chon_ten()
    {
        var d = new DangNhapMay();
        DangNhapView.VaoCon(d, "c1", "Bảo Anh", null, Moc);
        DangNhapView.VaoBaMe(d, Moc.AddMinutes(30), offline: false, Moc);
        Assert.Null(d.ConId);
        var e = DangNhapView.ApDung(new EffectivePolicy(true, LockReasons.Ngu, 0, null, true), d, Moc.AddMinutes(5));
        Assert.False(e.Locked);
        Assert.False(e.AppLockerWanted);
        Assert.Equal(Moc.AddMinutes(30), e.GrantEndsAt);
        Assert.True(DangNhapView.BaMeDangDung(d, Moc.AddMinutes(29)));
        // hết hạn ⇒ máy tự khoá về màn chọn tên (không chờ mạng)
        Assert.Equal(LockReasons.ChonTen, DangNhapView.ApDung(Mo(), d, Moc.AddMinutes(31)).LockReason);
    }

    [Fact]
    public void May_chu_bao_chua_ai_thi_be_het_phien_ve_chon_ten()
    {
        var d = new DangNhapMay();
        DangNhapView.VaoCon(d, "c1", "Bảo Anh", null, Moc);
        var (doi, viec) = DangNhapView.NhanTuMayChu(d, new NguoiDungMayChu { Loai = LoaiNguoiDung.Chua }, Moc.AddHours(12), mayRieng: false, Moc.AddHours(12));
        Assert.True(doi);
        Assert.Equal(ViecSauDongBo.KhongCo, viec);
        Assert.Equal(LoaiNguoiDung.Chua, DangNhapView.HienTai(d, Moc.AddHours(12)));
        Assert.False(d.CanBaoRoi);
    }

    [Fact]
    public void Phan_hoi_gui_truoc_luc_doi_nguoi_thi_bo_qua()
    {
        var d = new DangNhapMay();
        DangNhapView.VaoCon(d, "c1", "Bảo Anh", null, Moc.AddSeconds(3));
        var (doi, viec) = DangNhapView.NhanTuMayChu(d, new NguoiDungMayChu { Loai = LoaiNguoiDung.Chua }, Moc, false, Moc.AddSeconds(5));
        Assert.False(doi);
        Assert.Equal(ViecSauDongBo.KhongCo, viec);
        Assert.Equal("c1", d.ConId);
    }

    [Fact]
    public void Dang_xuat_bao_may_chu_o_luot_dong_bo_ke()
    {
        var d = new DangNhapMay();
        DangNhapView.VaoCon(d, "c1", "Bảo Anh", null, Moc);
        DangNhapView.Roi(d, Moc.AddMinutes(1), baoMayChu: true);
        Assert.True(d.CanBaoRoi);
        Assert.Equal(LoaiNguoiDung.Chua, DangNhapView.HienTai(d, Moc.AddMinutes(1)));
        var nd = new NguoiDungMayChu { Loai = LoaiNguoiDung.Con, Con = new() { Id = "c1", Ten = "Bảo Anh" } };
        Assert.Equal(ViecSauDongBo.BaoRoi, DangNhapView.NhanTuMayChu(d, nd, Moc.AddMinutes(2), false, Moc.AddMinutes(2)).Viec);
        // bé vào lúc mất mạng rồi đăng xuất khi chưa báo ai ⇒ máy chủ chưa biết, không cần báo
        var d2 = new DangNhapMay();
        DangNhapView.VaoCon(d2, "c1", "Bảo Anh", null, Moc, new DangNhapCho { ConId = "c1", Pin = "4821", Luc = Moc });
        DangNhapView.Roi(d2, Moc.AddMinutes(1), baoMayChu: true);
        Assert.False(d2.CanBaoRoi);
        Assert.Null(d2.ChoMang);
    }

    [Fact]
    public void May_chu_con_ghi_be_ma_may_da_dang_xuat_thi_bao_lai_tru_may_rieng()
    {
        var nd = new NguoiDungMayChu { Loai = LoaiNguoiDung.Con, Con = new() { Id = "c1", Ten = "Bảo Anh" } };
        Assert.Equal(ViecSauDongBo.BaoRoi, DangNhapView.NhanTuMayChu(new DangNhapMay(), nd, Moc, mayRieng: false, Moc).Viec);
        // máy riêng: máy chủ luôn ghi chủ máy, máy khoá chờ PIN là chuyện của máy
        Assert.Equal(ViecSauDongBo.KhongCo, DangNhapView.NhanTuMayChu(new DangNhapMay(), nd, Moc, mayRieng: true, Moc).Viec);
    }

    [Fact]
    public void Dang_nhap_luc_mat_mang_cho_bao_thi_khong_nghe_may_chu()
    {
        var d = new DangNhapMay();
        DangNhapView.VaoCon(d, "c1", "Bảo Anh", null, Moc, new DangNhapCho { ConId = "c1", Pin = "4821", Luc = Moc });
        var (doi, _) = DangNhapView.NhanTuMayChu(d, new NguoiDungMayChu { Loai = LoaiNguoiDung.Chua }, Moc.AddMinutes(1), false, Moc.AddMinutes(1));
        Assert.False(doi);
        Assert.Equal("c1", d.ConId);
    }

    [Fact]
    public void May_chu_bao_Ba_Me_dung_thi_nhan_han()
    {
        var d = new DangNhapMay();
        var (doi, _) = DangNhapView.NhanTuMayChu(d, new NguoiDungMayChu { Loai = LoaiNguoiDung.BaMe, Den = Moc.AddMinutes(60) }, Moc, false, Moc.AddSeconds(1));
        Assert.True(doi);
        Assert.Equal(LoaiNguoiDung.BaMe, DangNhapView.HienTai(d, Moc.AddMinutes(10)));
        Assert.False(d.BaMeOffline);
        // Ba Mẹ mở bằng mã lúc mất mạng (hạn dài hơn) ⇒ giữ hạn tại máy khi máy chủ chưa biết
        var d2 = new DangNhapMay();
        DangNhapView.VaoBaMe(d2, Moc.AddMinutes(30), offline: true, Moc);
        var (doi2, _) = DangNhapView.NhanTuMayChu(d2, new NguoiDungMayChu { Loai = LoaiNguoiDung.Chua }, Moc.AddMinutes(1), false, Moc.AddMinutes(1));
        Assert.False(doi2);
        Assert.True(DangNhapView.BaMeDangDung(d2, Moc.AddMinutes(2)));
    }

    [Fact]
    public void Doc_nguoiDung_tu_dong_bo()
    {
        var con = NguoiDungMayChu.Doc("""{"windows":{},"nguoiDung":{"loai":"con","con":{"id":"c1","ten":"Bảo Anh","coPin":true}}}""");
        Assert.Equal(LoaiNguoiDung.Con, con!.Loai);
        Assert.Equal("Bảo Anh", con.Con!.Ten);
        var bm = NguoiDungMayChu.Doc("""{"nguoiDung":{"loai":"ba_me","den":"2026-11-06T13:00:00.000Z"},"baMeDung":{"den":"2026-11-06T13:00:00.000Z"}}""");
        Assert.Equal(DateTimeOffset.Parse("2026-11-06T13:00:00Z"), bm!.Den);
        Assert.Equal(LoaiNguoiDung.Chua, NguoiDungMayChu.Doc("""{"nguoiDung":{"loai":"chua"}}""")!.Loai);
        Assert.Null(NguoiDungMayChu.Doc("""{"windows":{"mode":"hoc"}}"""));        // máy chủ cũ
        Assert.Null(NguoiDungMayChu.Doc("""{"nguoiDung":{"loai":"la"}}"""));
        Assert.Null(NguoiDungMayChu.Doc("không phải json"));
    }

    [Fact]
    public void Ho_so_gui_khay_khong_co_van_PIN()
    {
        var hs = new HoSoMay { Con = new() { BaoAnh() }, MayRieng = true };
        var k = hs.ChoKhay();
        Assert.Null(k.Con[0].VanPin);
        Assert.True(k.Con[0].CoPin);
        Assert.True(k.MayRieng);
        Assert.NotNull(hs.Con[0].VanPin);   // bản của dịch vụ giữ nguyên
    }

    [Fact]
    public void Chu_dau_khong_trung_giua_cac_be()
    {
        Assert.Equal(new[] { "B", "M" }, DangNhapView.ChuDauDs(new[] { "Bảo Anh", "Bảo Minh" }));
        Assert.Equal(new[] { "A", "B" }, DangNhapView.ChuDauDs(new[] { "An", "Bình" }));
        Assert.Equal("?", DangNhapView.ChuDau(""));
    }

    [Fact]
    public void Chan_trang_theo_be_hoac_ca_nha()
    {
        Assert.Equal("AiiGrow · Bảo Anh · máy do Ba Mẹ quản lý", ManKhoaView.ChanTrang("Bảo Anh"));
        Assert.Equal("AiiGrow · Máy tính của cả nhà · máy do Ba Mẹ quản lý", DangNhapView.ChanTrang(null));
    }

    [Fact]
    public void Can_hoi_ho_so_khi_chua_co_hoac_cu()
    {
        var d = new DangNhapMay();
        Assert.True(DangNhapView.CanHoiHoSo(d, Moc));
        d.HoSo = new HoSoMay(); d.HoSoLuc = Moc;
        Assert.False(DangNhapView.CanHoiHoSo(d, Moc.AddMinutes(1)));
        Assert.True(DangNhapView.CanHoiHoSo(d, Moc.AddMinutes(3)));          // đang ở màn chọn tên: 2 phút
        DangNhapView.VaoCon(d, "c1", "Bảo Anh", null, Moc);
        Assert.False(DangNhapView.CanHoiHoSo(d, Moc.AddMinutes(10)));        // bé đang dùng: 30 phút
        Assert.True(DangNhapView.CanHoiHoSo(d, Moc.AddMinutes(31)));
    }

    [Fact]
    public void Loi_may_chu_doc_truong_phu()
    {
        var e = new ApiException("Chưa đúng · còn 3 lần thử", 401, code: "pin_sai", body: """{"error":"pin_sai","message":"Chưa đúng","conLan":3}""");
        Assert.Equal(3, e.SoPhu("conLan"));
        Assert.Null(e.SoPhu("choGiay"));
        Assert.Null(new ApiException("x").SoPhu("conLan"));
    }

    [Fact]
    public void Ba_Me_mo_offline_go_luat_web()
    {
        var cfg = new AgentConfig { Server = "https://a", Token = "t", CheDo = CheDoAgent.Chan, LastPolicyJson = """{"windows":{"mode":"hoc","web":{"cheDo":"chan","chan":["y8.com"]}}}""" };
        DangNhapView.VaoBaMe(cfg.DangNhap, DateTimeOffset.Now.AddMinutes(15), offline: true, DateTimeOffset.Now);
        Assert.Null(WebGuard.CanAp(cfg, false, DateTimeOffset.Now));
    }
}

/// <summary>06/11 (L13): các bước màn «Ai đang dùng máy?» (con-ngay-thuong 01–06).</summary>
public class ManChonTenTests
{
    private static readonly DateTimeOffset Moc = DateTimeOffset.FromUnixTimeSeconds(1762432200);

    [Fact]
    public void Chon_be_co_PIN_sang_o_PIN_chua_co_PIN_vao_thang()
    {
        var st = new ManChonTenState();
        Assert.False(ManChonTenView.ChonBe(st, new HoSoBe { Id = "c1", Ten = "Bảo Anh", CoPin = true }, Moc));
        Assert.Equal(BuocChonTen.NhapPin, st.Buoc);
        Assert.True(ManChonTenView.ChonBe(st, new HoSoBe { Id = "c2", Ten = "Bảo Minh", CoPin = false }, Moc));
        // bé đang bị chờ (máy chủ báo khoaDen) ⇒ thẳng màn đếm
        ManChonTenView.ChonBe(st, new HoSoBe { Id = "c1", CoPin = true, KhoaDen = Moc.AddSeconds(9) }, Moc);
        Assert.Equal(BuocChonTen.TamKhoa, st.Buoc);
        Assert.Equal(9, ManChonTenView.ConGiay(st, Moc));
    }

    [Fact]
    public void Go_du_4_so_thi_gui_sai_thi_con_lan_sai_5_thi_dem_15_giay()
    {
        var st = new ManChonTenState();
        ManChonTenView.ChonBe(st, new HoSoBe { Id = "c1", CoPin = true }, Moc);
        Assert.False(ManChonTenView.GoSo(st, '4'));
        Assert.False(ManChonTenView.GoSo(st, 'x'));
        Assert.False(ManChonTenView.GoSo(st, '8'));
        ManChonTenView.Xoa(st);
        Assert.Equal("4", st.So);
        Assert.False(ManChonTenView.GoSo(st, '8'));
        Assert.False(ManChonTenView.GoSo(st, '2'));
        Assert.True(ManChonTenView.GoSo(st, '1'));
        Assert.False(ManChonTenView.GoSo(st, '9'));    // đủ 4 số
        ManChonTenView.KetQuaPin(st, false, "pin_sai", 3, null, "Chưa đúng · còn 3 lần thử", Moc);
        Assert.Equal(3, st.ConLan);
        Assert.Equal("", st.So);
        Assert.Equal("Chưa đúng · còn 3 lần thử", ManChonTenView.ChuaDung(st.ConLan!.Value));
        ManChonTenView.KetQuaPin(st, false, "pin_tam_khoa", null, 15, null, Moc);
        Assert.Equal(BuocChonTen.TamKhoa, st.Buoc);
        Assert.False(ManChonTenView.Tick(st, Moc.AddSeconds(14)));
        Assert.True(ManChonTenView.Tick(st, Moc.AddSeconds(15)));
        Assert.Equal(BuocChonTen.NhapPin, st.Buoc);
        Assert.Null(st.ConLan);
    }

    [Fact]
    public void Vao_duoc_thi_man_ve_dau()
    {
        var st = new ManChonTenState();
        ManChonTenView.ChonBe(st, new HoSoBe { Id = "c1", CoPin = true }, Moc);
        st.So = "4821";
        ManChonTenView.KetQuaPin(st, true, "ok", null, null, null, Moc);
        Assert.Equal(BuocChonTen.ChonTen, st.Buoc);
        Assert.Equal("", st.So);
    }

    [Fact]
    public void Quen_PIN_lui_ve_o_PIN_chon_be_khac_ve_luoi()
    {
        var st = new ManChonTenState();
        ManChonTenView.ChonBe(st, new HoSoBe { Id = "c1", CoPin = true }, Moc);
        ManChonTenView.MoQuen(st);
        Assert.Equal(BuocChonTen.QuenPin, st.Buoc);
        Assert.True(ManChonTenView.Lui(st));
        Assert.Equal(BuocChonTen.NhapPin, st.Buoc);
        Assert.True(ManChonTenView.Lui(st));
        Assert.Equal(BuocChonTen.ChonTen, st.Buoc);
        Assert.Null(st.Be);
    }

    [Fact]
    public void Ba_Me_nhap_ma_6_so_khong_tu_gui_tu_man_khoa_thuong_thi_lui_ve_do()
    {
        var st = new ManChonTenState();
        ManChonTenView.MoBaMe(st, tuManKhoa: true);
        foreach (var c in "73159") Assert.False(ManChonTenView.GoSo(st, c));
        Assert.False(ManChonTenView.GoSo(st, '4'));          // mã: bấm «Mở máy cho Ba Mẹ», không tự gửi
        Assert.Equal("731594", st.So);
        Assert.False(ManChonTenView.GoSo(st, '0'));
        Assert.Equal("731594", st.So);
        ManChonTenView.KetQuaMa(st, false, "ma_sai", 4, null, null);
        Assert.Equal("Mã chưa đúng · còn 4 lần thử", st.Loi);
        ManChonTenView.KetQuaMa(st, false, "ma_tam_khoa", null, 600, null);
        Assert.Equal("Nhập sai nhiều lần — đợi 10 phút rồi thử lại.", st.Loi);
        ManChonTenView.KetQuaMa(st, false, "ma_da_dung", null, null, null);
        Assert.StartsWith("Mã này đã dùng rồi", st.Loi);
        Assert.False(ManChonTenView.Lui(st));                 // false ⇒ khay về thẻ màn khoá thường
        Assert.Equal(BuocChonTen.ChonTen, st.Buoc);
    }

    [Fact]
    public void Man_het_gio_may_dung_chung_co_Doi_be_va_Ba_Me_mo_may()
    {
        var m = ManKhoaView.For(LockReasons.HetGio, 0, "Bảo Anh", 30, 60, null, true, false, doiBe: true);
        Assert.Equal("Bảo Anh đã chơi đủ 60 / 60 phút. Giỏi lắm!", m.Phu);
        Assert.Contains(m.Nut, n => n.Ma == ManKhoaView.DoiBe && n.Chu == "Đổi bé");
        Assert.Contains(m.Nut, n => n.Ma == ManKhoaView.BaMeDungMay && n.Chu == "Ba Mẹ mở máy");
        var rieng = ManKhoaView.For(LockReasons.HetGio, 0, "Bảo Anh", 30, 60, null, true, false);
        Assert.DoesNotContain(rieng.Nut, n => n.Ma == ManKhoaView.DoiBe);
        Assert.Equal("Con đã chơi đủ 60 / 60 phút. Giỏi lắm!", rieng.Phu);
    }
}

/// <summary>06/11 (L14): quà = bảng giá sao, giữ sao chờ trao, voucher AiiCafe có mã + hạn.</summary>
public class QuaBangGiaTests
{
    [Fact]
    public void Nhan_qua_theo_dieu_kien()
    {
        Assert.Equal("Mã QR", AppConView.NhanQua(new HvQua { Ten = "AiiCafe 20k", Loai = "voucher", MenhGia = 20000 }));
        Assert.Equal("Chỉ cuối tuần", AppConView.NhanQua(new HvQua { Ten = "Đi xem phim", ChiCuoiTuan = true }));
        Assert.Equal("Còn 1 bộ", AppConView.NhanQua(new HvQua { Ten = "Bộ Lego", TonKho = 1 }));
        Assert.Null(AppConView.NhanQua(new HvQua { Ten = "Đồ chơi nhỏ", TonKho = 20 }));
    }

    [Fact]
    public void Doi_qua_du_hay_thieu_sao()
    {
        var bua = new HvQua { Ten = "Chọn món bữa tối", Diem = 50 };
        Assert.Equal(("Còn thiếu 20 sao", false), AppConView.TrangThaiDoi(bua, 30));
        Assert.Equal(("Đủ sao rồi!", true), AppConView.TrangThaiDoi(bua, 50));
        Assert.Equal("Con có 30 sao · còn thiếu 20 sao", AppConView.ThieuSao(bua, 30));
        Assert.Null(AppConView.ThieuSao(bua, 80));
        Assert.Equal("Đang giữ 50 sao · chờ Ba Mẹ trao", AppConView.DangGiu(50));
        Assert.Equal("Đang giữ 50 sao · Ba Mẹ trao mới trừ", AppConView.DangGiu(50, ngan: true));
    }

    [Fact]
    public void Voucher_da_trao_co_ma_va_han()
    {
        var v = System.Text.Json.JsonSerializer.Deserialize<HvViQua>(
            """{"daTrao":[],"voucher":[{"ma":"AG7K3M9PQR2X","menh_gia":50000,"trang_thai":"da_phat_hanh","het_han":"2026-12-25T05:00:00.000Z","ten":"AiiCafe 50k","qr":"AG7K3M9PQR2X","conNgay":49}]}""",
            Json.Options)!;
        var x = v.Voucher.Single();
        Assert.True(x.DungDuoc);
        Assert.Equal("Voucher AiiCafe 50k", AppConView.TenVoucher(x));
        Assert.StartsWith("Mã AG7K3M9PQR2X · đưa mã QR ở quầy · hạn ", AppConView.PhuVoucher(x));
        Assert.False(new HvVoucherVi { TrangThai = "da_dung", ConNgay = 3 }.DungDuoc);
    }
}
