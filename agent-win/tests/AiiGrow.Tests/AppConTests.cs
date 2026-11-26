using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>App Con (bản 15/11): sổ sao tại máy (QuyTaiCho — 1 sao = 1 phút «Tính phút»), chữ sao / vay / kết quả (SoSao.cs), chữ màn Con (AppConView).</summary>
public class AppConTests
{
    private static Policy Goc(Action<Policy>? sua = null)
    {
        var p = PolicyParser.Parse("""
        {"mode":"hoc","locked":false,"allowedApps":["explorer.exe","scratch.exe","roblox.exe","minecraft.exe"],"learningApps":["scratch.exe"],
         "quyConPhut":18,"appTinhGio":["Roblox.exe","minecraft.exe"],"playChoices":["roblox.exe","minecraft.exe","youtube.com"],"sao":18,
         "gioNgu":{"tu":"00:00","den":"00:00"},"ngoaiLe":[]}
        """);
        sua?.Invoke(p);
        return p;
    }

    [Fact]
    public void PolicyParser_DocSaoVaTruongCu()
    {
        var p = Goc();
        Assert.Equal(18, p.QuyConPhut);
        Assert.Equal(18, p.Sao);
        Assert.Equal(new[] { "roblox.exe", "minecraft.exe" }, p.AppTinhGio);   // chữ thường như AllowedApps
        Assert.Null(p.SoSao);
        Assert.False(CheDoCon.La(p));
    }

    [Fact]
    public void PolicyParser_TuDongBo_DocSaoGocVaCheDo()
    {
        var p = PolicyParser.TuDongBo("""
        {"windows":{"mode":"tu_do","allowedApps":[],"sao":-15,"quyConPhut":0,"appTinhGio":[]},
         "sao":{"sao":-15,"no":15,"phutCon":0,"saoVayChuaTieu":0,"hetSao":true,"canhBaoNo":false,"cau":{"soDu":"−15 sao"}},"cheDo":"theo_danh_sach"}
        """);
        Assert.Equal(-15, p.Sao);
        Assert.Equal(15, p.SoSao!.No);
        Assert.True(p.SoSao.HetSao);
        Assert.Equal(CheDoCon.TheoDanhSach, p.CheDoCon);
        var mh = PolicyParser.TuDongBo("""{"windows":{"mode":"tu_do"},"cheDo":"mo_het"}""");
        Assert.True(CheDoCon.La(mh));
        Assert.True(CheDoCon.La(PolicyParser.TuDongBo("""{"windows":{"mode":"tu_do","moHet":true}}""")));   // máy chủ cũ: cờ windows.moHet
        Assert.True(PolicyParser.TryParse("""{"windows":{"mode":"hoc"},"sao":{"sao":3,"no":0,"phutCon":3}}""", out var t) && t!.SoSao!.PhutCon == 3);
    }

    [Fact]
    public void Sao_DemTaiMay_HetSaoThiBoAppTinhPhut_ConSaoGiuNguyen()
    {
        var p = Goc();
        Assert.Same(p, QuyTaiCho.ApDung(p, 17 * 60));   // còn 1 sao ⇒ không đổi gì
        Assert.Equal(1, QuyTaiCho.ConPhut(p, 17 * 60)!.Value, 3);
        var het = QuyTaiCho.ApDung(p, 18 * 60);
        Assert.Equal(new[] { "explorer.exe", "scratch.exe" }, het.AllowedApps);
        Assert.Empty(het.AppTinhGio);
        Assert.False(het.Locked);                                                 // hết sao KHÔNG khoá cả máy — app «Không tính phút» vẫn dùng
        Assert.Equal(4, p.AllowedApps.Count);                                     // Policy gốc không bị sửa
        Assert.True(QuyTaiCho.TinhGio(p, "ROBLOX.EXE"));
        Assert.False(QuyTaiCho.TinhGio(p, "scratch.exe"));
    }

    [Fact]
    public void Sao_ModeTuDo_HetSao_DongBangDanhSachChan()
    {
        var p = Goc(x => { x.Mode = Modes.TuDo; x.QuyConPhut = 0; });
        var q = QuyTaiCho.ApDung(p, 0);
        Assert.Contains(q.BlockedApps, b => b.Muc == "roblox.exe");
    }

    [Fact]
    public void MoHet_KhongDem_KhongDong()
    {
        var p = Goc(x => { x.MoHet = true; x.QuyConPhut = 0; x.Mode = Modes.TuDo; });
        Assert.Same(p, QuyTaiCho.ApDung(p, 9999));
        Assert.False(QuyTaiCho.TinhGio(p, "roblox.exe"));
    }

    [Fact]
    public void MoBangMa_ThaAppTinhPhut_KhongTruSao()
    {
        var p = Goc(x => { x.QuyConPhut = 0; x.AllowedApps = new() { "explorer.exe", "scratch.exe" }; x.AppTinhGio = new(); });
        var m = QuyTaiCho.ApDung(p, 0, moBangMa: true);
        Assert.Contains("roblox.exe", m.AllowedApps);
        Assert.Contains("minecraft.exe", m.AllowedApps);
        Assert.DoesNotContain("youtube.com", m.AllowedApps);   // tên miền không vào danh sách exe
    }

    [Fact]
    public void Sao_MayChuCu_KhongCoSao_KhongDoi()
    {
        var p = PolicyParser.Parse("""{"mode":"hoc","allowedApps":["a.exe"]}""");
        Assert.Null(QuyTaiCho.ConPhut(p, 9999));
        Assert.Same(p, QuyTaiCho.ApDung(p, 9999));
    }

    [Fact]
    public void ChuSao_TheoMauThongNhat()
    {
        Assert.Equal("18 sao", SaoView.SoDu(18));
        Assert.Equal("\u221215 sao", SaoView.SoDu(-15));
        Assert.Equal("còn 18 sao = 18 phút chơi", SaoView.ConPhut(18.9));
        Assert.Equal("hết sao · còn 0 phút chơi", SaoView.ConPhut(0));
        Assert.Equal("Đang nợ Ba Mẹ 15 sao · sao nhiệm vụ trả nợ trước", SaoView.No(15));
        Assert.Null(SaoView.No(0));
        Assert.Equal("Hôm nay đã chơi 42 phút · \u221242 sao", SaoView.DaChoi(42));
        Assert.EndsWith("· mất mạng vẫn trừ", SaoView.DaChoi(42, true));
        Assert.Equal("Duyệt xong +20 sao (đang nợ thì trả nợ trước)", SaoView.ChoDuyet(20, 0));
        Assert.Equal("Trả nợ 15 sao trước · con còn 5 sao", SaoView.ChoDuyet(20, 15));
        Assert.Equal("Hết sao để chơi · Roblox, Minecraft đang khoá", SaoView.HetSaoKhoa(new[] { "roblox.exe", "minecraft.exe", "youtube.com" }));
        Assert.Equal("Từ điển vẫn mở · không tính phút", SaoView.VanMo(new[] { "Từ điển" }));
        var dung = new List<DungApp>
        {
            new() { AppId = "roblox.exe", Ten = "Roblox", Phut = 30 }, new() { AppId = "youtubekids.exe", Ten = "YouTube Kids", Phut = 12 },
            new() { AppId = "tudien.exe", Ten = "Từ điển", Phut = 5 },
        };
        Assert.Equal("Roblox 30 phút · YouTube Kids 12 phút · Từ điển không tính phút", SaoView.DungTheoApp(dung, new[] { "tudien.exe" }));
        Assert.Equal(42, SaoView.PhutTinh(dung, new[] { "roblox.exe", "youtubekids.exe" }));
        Assert.Equal(30, SaoView.PhutTinh(dung, new[] { "roblox.exe" }));            // chỉ app «Tính phút», không đếm app lạ / Không tính phút
        Assert.Equal(32, SaoView.PhutTinh(dung, new[] { "roblox.exe", "youtubekids.exe" }, phutBoiMa: 10));   // bỏ phút mở bằng mã (không trừ sao)
        Assert.Equal("Chào Bảo Anh!", AppConView.Chao(" Bảo Anh "));
        Assert.Equal("Thứ Năm · 19:30", AppConView.NgayGio(new DateTime(2026, 11, 5, 19, 30, 0)));
    }

    [Fact]
    public void SoDuTaiMay_TruPhanDaChoi_DungLucHetSao()
    {
        Assert.Equal(15, SaoView.SoDuTaiMay(18, 18, 15.2));
        Assert.Equal(0, SaoView.SoDuTaiMay(18, 18, 0));
        Assert.Equal(-15, SaoView.SoDuTaiMay(-15, 0, 0));   // đang nợ, hết sao ⇒ không trừ thêm
        Assert.Null(SaoView.SoDuTaiMay(null, 5, 4));
    }

    [Fact]
    public void DaChoiTaiMay_SoMayChuCongPhanDemTaiMay_699()
    {
        // máy chủ: 42 phút đã trừ trên mọi máy (máy này 30 app + máy kia 12 web); tại máy vừa chơi thêm 3 phút chưa đồng bộ
        Assert.Equal(45, SaoView.DaChoiTaiMay(42, 58, 55.4));
        Assert.Equal(42, SaoView.DaChoiTaiMay(42, null, null));      // «Mở hết» / chưa có phút còn ⇒ đúng số máy chủ
        Assert.Equal(42, SaoView.DaChoiTaiMay(42, 58, 58));
        Assert.Null(SaoView.DaChoiTaiMay(null, 58, 55));             // máy chủ cũ ⇒ khay đếm tại máy như trước
        // số nằm ở máy chủ: không bị chặn 8 app, không về 0 khi dịch vụ khởi động lại
        var p = PolicyParser.TuDongBo("""{"windows":{"mode":"tu_do"},"sao":{"sao":58,"no":0,"phutCon":58,"hetSao":false,"phutChoiHomNay":42}}""");
        Assert.Equal(42, p.SoSao!.PhutChoiHomNay);
        Assert.Null(PolicyParser.TuDongBo("""{"windows":{"mode":"tu_do"},"sao":{"sao":58,"no":0,"phutCon":58}}""").SoSao!.PhutChoiHomNay);
    }

    [Fact]
    public void XinVay_ChuVaKep()
    {
        Assert.Equal(new[] { 10, 15, 30 }, XinVayView.Muc);
        Assert.Equal(15, XinVayView.MacDinh);
        Assert.Equal(1000, XinVayView.Kep(5000));
        Assert.Equal(1, XinVayView.Kep(0));
        Assert.Equal("Xin Ba Mẹ cho vay 15 sao", XinVayView.Nut(15));
        Assert.Equal("Con hết sao rồi · 1 sao = 1 phút chơi", XinVayView.Phu(0));
        Assert.Equal("Mẹ Lan cho vay rồi!", XinVayView.ChoVayTieu("Mẹ Lan"));
        Assert.Equal("Ba Mẹ cho vay rồi!", XinVayView.ChoVayTieu(null));
        Assert.Equal("Ba Mẹ cho vay 15 sao · Con đang nợ 15 sao", XinVayView.ChoVayDong(15, 15));
        Assert.Equal("Chơi tiếp 15 phút", XinVayView.ChoiTiep(15));
        Assert.Null(XinVayView.LyDo("  "));
    }

    [Fact]
    public void NhacSao_VaHetSao_TheoMoc()
    {
        Assert.True(NhacSaoView.NenNhac(5, true, false));
        Assert.False(NhacSaoView.NenNhac(5, false, false));   // không chơi app «Tính phút» thì không nhắc
        Assert.False(NhacSaoView.NenNhac(0.8, true, false));  // ≤ 1 ⇒ đếm ngược, không nhắc
        Assert.Equal("Còn 5 sao = 5 phút chơi", NhacSaoView.Tieu(5));
        Assert.Equal("Lưu bài nhé · hết sao là Roblox đóng", NhacSaoView.Phu("Roblox"));
        Assert.True(HetSaoView.DemNguoc(0.75, true));
        Assert.False(HetSaoView.DemNguoc(0, true));
        var dem = HetSaoView.For(45, "Roblox", null, doiBe: false);
        Assert.Equal("Sắp hết sao rồi", dem.Tieu);
        Assert.True(dem.DemNguoc);
        Assert.Equal(new[] { "Làm nhiệm vụ kiếm sao", "Xin Ba Mẹ cho vay sao", "Ba Mẹ dùng máy" }, dem.Nut.Select(n => n.Chu));
        var het = HetSaoView.For(null, null, new[] { "Từ điển" }, doiBe: true);
        Assert.Equal("Hết sao rồi", het.Tieu);
        Assert.Equal("App «Tính phút» tạm khoá nhé.", het.Phu);
        Assert.Equal("Con còn 0 sao · 1 sao = 1 phút chơi", het.SaoDong);
        Assert.Equal(new[] { "Làm nhiệm vụ", "Xin Ba Mẹ cho vay sao", "Nhắn Ba Mẹ", "Đổi người", "Ba Mẹ mở máy" }, het.Nut.Select(n => n.Chu));
    }

    [Theory]
    [InlineData("da_them", "duoc", KetQuaXinView.Loai.DaThem)]
    [InlineData("mo_tam", "duoc", KetQuaXinView.Loai.MoTam)]
    [InlineData("chua_them", "tu_choi", KetQuaXinView.Loai.ChuaThem)]
    [InlineData("cho", "cho", KetQuaXinView.Loai.Cho)]
    [InlineData(null, "duoc", KetQuaXinView.Loai.DaThem)]      // máy chủ cũ: chỉ status
    [InlineData(null, "tu_choi", KetQuaXinView.Loai.ChuaThem)]
    [InlineData("het_han", "tu_choi", KetQuaXinView.Loai.HetHan)]
    public void KetQuaXin_DocKetQuaVaStatusCu(string? ketQua, string status, KetQuaXinView.Loai mong)
        => Assert.Equal(mong, KetQuaXinView.Doc(ketQua, status));

    [Fact]
    public void KetQuaXin_Chu()
    {
        Assert.Equal("Ba Mẹ đã thêm CapCut", KetQuaXinView.DaThemTieu("CapCut"));
        Assert.Equal("Nhóm «Tính phút»", KetQuaXinView.Nhom(false, false));
        Assert.Equal("Nhóm «Không tính phút»", KetQuaXinView.Nhom(true, true));
        Assert.Equal("Không trừ sao", KetQuaXinView.NhomPhu(true, 18));
        Assert.Equal("Còn 18 sao = 18 phút", KetQuaXinView.NhomPhu(false, 18));
        Assert.Equal("Con vào y8.com thoải mái nhé!", KetQuaXinView.DaThemVui("y8.com", true, true));
        Assert.Equal("Ba Mẹ cho mở 30 phút", KetQuaXinView.MoTamTieu(30));
        Assert.Equal("Ba Mẹ chưa thêm CapCut lúc này.", KetQuaXinView.ChuaThemCau("CapCut"));
    }

    private const string TongQuanMoi = """
    {"con":{"id":"c1","ten":"Bảo Anh"},"soDu":30,"sao":30,"saoChoDuyet":20,"diemChoDuyet":20,
     "soSao":{"sao":30,"no":0,"phutCon":30,"hetSao":false},"cheDo":"theo_danh_sach",
     "nhiemVu":[
       {"id":"t1","ten":"Dọn phòng","diem":10,"sao":10,"bangChung":"anh","trangThai":"du_hom_nay","luot":null,"dangCho":1,"hinh":"choi","bo":"tu_lap"},
       {"id":"t2","ten":"Đọc sách 20 phút","diem":10,"sao":10,"bangChung":"ghi_am","trangThai":"can_bo_sung","luot":"l2","lamLai":true,"loiNhan":"Con đọc to hơn chút nhé","bo":"tu_lap"},
       {"id":"t3","ten":"Tự đánh răng","diem":10,"sao":10,"bangChung":"xong","trangThai":"san_sang","luot":null,"lapLai":"hang_ngay","bo":"tu_lap"},
       {"id":"t4","ten":"Tự xếp cặp","diem":10,"sao":10,"bangChung":"anh","trangThai":"dang_lam","luot":"l4","gioNhac":"21:00","hinh":"cap","bo":"tu_lap"}],
     "gan":[{"id":"l1","ten":"Dọn phòng","trangThai":"cho_duyet","diem":null,"luc":"2026-11-05T11:40:00.000Z"}],
     "loiKhen":[{"id":"m1","noiDung":"Phòng con gọn ghê!","phanHoi":null,"luc":"2026-11-05T11:45:00.000Z"},
                {"id":"m0","noiDung":"Ngủ sớm nha","phanHoi":"Dạ","luc":"2026-11-04T11:45:00.000Z"}],
     "phieuCho":[]}
    """;

    [Fact]
    public void NhiemVu_ChiaNhom_TheoThietKe()
    {
        var tq = HocVienView.Parse<HvTongQuan>(TongQuanMoi)!;
        Assert.Equal(30, tq.SoSao);
        Assert.Equal(20, tq.SoSaoChoDuyet);
        Assert.Equal(30, tq.SoSaoCt!.PhutCon);
        Assert.Equal(CheDoCon.TheoDanhSach, tq.CheDo);
        var tuCham = HocVienView.Parse<HvNvDs>("""{"ds":[{"id":"t9","ten":"Học 1 bài với AiiRob","diem":20,"sao":20,"tu_cham":true,"trang_thai_con":"san_sang","bo":"tu_lap"},{"id":"t3","ten":"Tự đánh răng","diem":10,"tu_cham":false,"trang_thai_con":"san_sang"}]}""")!;
        var ds = AppConView.DanhSach(tq, tuCham.Ds);
        Assert.Equal(new[] { "lam_lai", "cho_duyet", "chua_lam", "chua_lam", "tu_cham" }, ds.Select(x => x.Nhom));
        Assert.Equal("Con đọc to hơn chút nhé", ds[0].LoiNhan);
        Assert.Equal("Ghi âm lại", ds[0].Nut);
        Assert.StartsWith("Ảnh · nộp ", ds[1].Phu);
        Assert.Null(ds[1].Nut);
        Assert.Equal("Xong rồi", ds[2].Nut);
        Assert.Equal("Mỗi ngày · làm xong bấm Xong", ds[2].Phu);
        Assert.Equal("Nộp ảnh", ds[3].Nut);
        Assert.Equal("Trước 21:00 · chụp 1 ảnh", ds[3].Phu);
        Assert.Equal("Mở Học với AiiRob", ds[4].Nut);
        Assert.Equal(20, ds[4].Sao);
        Assert.Equal("1 làm lại · 1 chờ Ba Mẹ duyệt · 3 chưa làm", AppConView.TomTatViec(ds));
        Assert.Equal("Bộ Tự lập · 5 việc", AppConView.BoViec(tq.NhiemVu.Select(v => v.Bo).Concat(tuCham.Ds.Select(t => t.Bo)), ds.Count));
        Assert.Equal("4 việc hôm nay", AppConView.BoViec(new string?[] { null }, 4));
        Assert.Equal("Đang có 30 sao · chờ thêm 20 sao", AppConView.ChanNhiemVu(30, 20));
        Assert.Equal("m1", AppConView.TinChoTraLoi(tq.LoiKhen)!.Id);
    }

    [Fact]
    public void Qua_TrangThai()
    {
        var now = new DateTimeOffset(2026, 11, 5, 19, 30, 0, TimeSpan.FromHours(7));
        var cho = new HvQua { Ten = "Đi ăn kem", Diem = 50, ChoTraoTu = now.AddDays(-1) };
        Assert.Equal(("Đã đổi hôm qua · chờ Ba Mẹ trao", false, true), AppConView.TrangThaiQua(cho, 30, now));
        Assert.Equal(("Đủ sao rồi!", true, false), AppConView.TrangThaiQua(new HvQua { Diem = 30, Sao = 30 }, 30, now));
        Assert.Equal(("Còn thiếu 10 sao", false, false), AppConView.TrangThaiQua(new HvQua { Diem = 40 }, 30, now));
        Assert.Equal("dongho", AppConView.IconQua(new HvQua { Ten = "Thêm 30 phút chơi", Loai = "phut", Phut = 30 }));
        Assert.Equal("coc", AppConView.IconQua(new HvQua { Ten = "Đi ăn kem" }));
        Assert.Equal("Con cảm ơn", AppConView.CatTraLoi("  Con cảm ơn "));
        Assert.Equal(AppConView.TraLoiToiDa, AppConView.CatTraLoi(new string('a', 90)).Length);
    }

    [Fact]
    public void Tin_DocKetQua()
    {
        var duyet = AppConView.DocTin(new HvTin { Loai = "duyet_nhiem_vu", Noi = "«Dọn phòng» · +10 sao" })!;
        Assert.Equal(new KetQuaTin("duyet", "Dọn phòng", 10, null, null), duyet);
        var lai = AppConView.DocTin(new HvTin { Loai = "lam_lai_nhiem_vu", Noi = "«Đọc sách 20 phút» · Con đọc to hơn chút nhé" })!;
        Assert.Equal("lam_lai", lai.Loai);
        Assert.Equal("Con đọc to hơn chút nhé", lai.LoiNhan);
        Assert.Null(AppConView.DocTin(new HvTin { Loai = "lam_lai_nhiem_vu", Noi = "«Đọc sách»" })!.LoiNhan);
        Assert.Equal(new KetQuaTin("trao_qua", "Thêm 30 phút chơi", null, 30, null), AppConView.DocTin(new HvTin { Loai = "xac_nhan_qua", Noi = "Thêm 30 phút chơi · +30 phút" }));
        Assert.Null(AppConView.DocTin(new HvTin { Loai = "them_gio", Noi = "+20 phút chơi hôm nay" }));   // 15/11: không còn «cho thêm giờ»
        Assert.Equal(new KetQuaTin("da_them", "Roblox", null, null, "Chơi vừa thôi nhé", "tinh_phut", "Mẹ Lan"),
            AppConView.DocTin(new HvTin { Loai = "dong_y_yeu_cau", Tieu = "Mẹ Lan đã thêm Roblox", Noi = "Nhóm «Tính phút» · 1 sao = 1 phút · «Chơi vừa thôi nhé»" }));
        Assert.Equal("khong_tinh_phut", AppConView.DocTin(new HvTin { Loai = "dong_y_yeu_cau", Tieu = "Ba Mẹ đã thêm y8.com", Noi = "Nhóm «Không tính phút» · không trừ sao" })!.Nhom);
        Assert.Equal(new KetQuaTin("chua_them", "tiktok.com", null, null, null, null, "Lan"),
            AppConView.DocTin(new HvTin { Loai = "bo_qua_yeu_cau", Tieu = "Lan chưa thêm tiktok.com lúc này", Noi = "Con xin lại sau được nhé" }));
        Assert.Null(AppConView.DocTin(new HvTin { Loai = "loi_khen", Noi = "Giỏi lắm" }));
        Assert.Equal(new KetQuaTin("cho_vay", "", 15, null, null, null, "Mẹ Lan"), AppConView.DocTin(new HvTin { Loai = "cho_vay", Tieu = "Mẹ Lan cho vay 15 sao", Noi = "+15 sao · con đang nợ 15 sao" }));
        Assert.Equal(new KetQuaTin("chua_vay", "", null, null, "Mai chơi tiếp nhé", null, "Mẹ Lan"), AppConView.DocTin(new HvTin { Loai = "tu_choi_yeu_cau", Tieu = "Mẹ Lan chưa cho vay sao", Noi = "«Mai chơi tiếp nhé»" }));
        var moi = new List<HvTin>
        {
            new() { Loai = "duyet_nhiem_vu", Noi = "«A» · +10 sao", Luc = new DateTimeOffset(2026, 11, 5, 10, 0, 0, TimeSpan.Zero) },
            new() { Loai = "bo_qua_yeu_cau", Tieu = "Mẹ chưa thêm CapCut lúc này", Luc = new DateTimeOffset(2026, 11, 5, 11, 0, 0, TimeSpan.Zero) },
            new() { Loai = "loi_khen", Noi = "x", Luc = new DateTimeOffset(2026, 11, 5, 12, 0, 0, TimeSpan.Zero) },
        };
        Assert.Equal("chua_them", AppConView.ChonKetQua(moi)!.Loai);
    }

    [Theory]
    [InlineData("GET", "hoc-vien/sao", true)]
    [InlineData("GET", "hoc-vien/nhiem-vu?tuCham=1", true)]
    [InlineData("GET", "hoc-vien/vi-qua", false)]
    [InlineData("GET", "hoc-vien/quy", false)]          // 15/11: bỏ quỹ ngày
    [InlineData("POST", "hoc-vien/doi-sao", false)]     // 15/11: bỏ đổi sao lấy giờ
    [InlineData("POST", "hoc-vien/sao", false)]
    public void HocVienPaths_DuongMoi(string method, string path, bool mong) => Assert.Equal(mong, HocVienPaths.Allowed(method, path));

    [Fact]
    public async Task BaiChoMang_LuuGuiBo()
    {
        var dir = Path.Combine(Path.GetTempPath(), "aiigrow-bai-cho-" + Guid.NewGuid().ToString("N"));
        try
        {
            var h = new BaiChoMang(dir);
            var now = new DateTimeOffset(2026, 11, 5, 19, 0, 0, TimeSpan.FromHours(7));
            Assert.True(BaiChoMang.LaNop("POST", "hoc-vien/luot/l1/nop"));
            Assert.False(BaiChoMang.LaNop("GET", "hoc-vien/luot/l1/nop"));
            Assert.False(BaiChoMang.LaNop("POST", "hoc-vien/doi/q1"));
            Assert.Equal(1, h.Them("hoc-vien/luot/l1/nop", "{\"ghiChu\":\"a\"}", now));
            Assert.Equal(1, h.Them("hoc-vien/luot/l1/nop", "{\"ghiChu\":\"b\"}", now.AddMinutes(1)));   // cùng lượt ⇒ thay bài cũ
            Assert.Equal(2, h.Them("hoc-vien/luot/l2/nop", "{}", now.AddMinutes(2)));
            Assert.Contains("\"b\"", h.DanhSach()[0].Body);
            // lỗi mạng ⇒ dừng, giữ cả hai; lần thứ 3 thì bỏ bài đó
            for (var i = 0; i < 2; i++) Assert.Equal(0, await h.GuiAsync(_ => Task.FromResult(KetQuaGuiXin.LoiMang), now.AddMinutes(5)));
            Assert.Equal(2, h.Dem());
            Assert.Equal(1, await h.GuiAsync(b => Task.FromResult(b.Path.Contains("l1") ? KetQuaGuiXin.LoiMang : KetQuaGuiXin.DaGui), now.AddMinutes(6)));
            Assert.Equal(0, h.Dem());
            // #684: 429 / 408 ⇒ giữ nguyên bài (không xoá, không tính lần lỗi), gửi lượt sau
            h.Them("hoc-vien/luot/l4/nop", "{}", now.AddMinutes(7));
            Assert.Equal(0, await h.GuiAsync(_ => Task.FromResult(HangXinCho.PhanLoai(new ApiException("nhanh", 429, code: "bam_don"))), now.AddMinutes(8)));
            Assert.Equal(1, h.Dem());
            Assert.Equal(0, h.DanhSach()[0].LanLoi);
            Assert.Equal(1, await h.GuiAsync(_ => Task.FromResult(KetQuaGuiXin.DaGui), now.AddMinutes(9)));
            // quá 12 giờ ⇒ bỏ không gửi
            h.Them("hoc-vien/luot/l3/nop", "{}", now);
            var goi = 0;
            await h.GuiAsync(_ => { goi++; return Task.FromResult(KetQuaGuiXin.DaGui); }, now.AddHours(13));
            Assert.Equal(0, goi);
            Assert.Equal(0, h.Dem());
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public void Sao_QuaNuaDem_KhongTuDayLai()
    {
        // 15/11: sao dồn nhiều ngày, không có quỹ ngày ⇒ mất mạng qua đêm không được thêm phút
        var p = Goc(x => x.ServerTime = new DateTimeOffset(2026, 11, 4, 20, 0, 0, TimeSpan.FromHours(7)));
        Assert.Equal(8, QuyTaiCho.ConPhut(p, 600)!.Value, 3);
    }

    [Fact]
    public void WavCat_GiuPhanDau()
    {
        byte[] Wav(int data)
        {
            var b = new byte[44 + data];
            System.Text.Encoding.ASCII.GetBytes("RIFF").CopyTo(b, 0); BitConverter.GetBytes(b.Length - 8).CopyTo(b, 4);
            System.Text.Encoding.ASCII.GetBytes("WAVEfmt ").CopyTo(b, 8); BitConverter.GetBytes(16).CopyTo(b, 16);
            BitConverter.GetBytes((ushort)1).CopyTo(b, 20); BitConverter.GetBytes((ushort)1).CopyTo(b, 22);
            BitConverter.GetBytes(11025).CopyTo(b, 24); BitConverter.GetBytes(22050).CopyTo(b, 28); BitConverter.GetBytes((ushort)2).CopyTo(b, 32);
            System.Text.Encoding.ASCII.GetBytes("data").CopyTo(b, 36); BitConverter.GetBytes(data).CopyTo(b, 40);
            return b;
        }
        var nho = Wav(100);
        Assert.Same(nho, WavCat.CatToi(nho, 1000));
        var cat = WavCat.CatToi(Wav(5000), 1001)!;
        Assert.Equal(44 + 956, cat.Length);   // căn theo khối 2 byte
        Assert.Equal(956, BitConverter.ToInt32(cat, 40));
        Assert.Equal(cat.Length - 8, BitConverter.ToInt32(cat, 4));
        Assert.Null(WavCat.CatToi(new byte[5000], 1000));
    }

    [Fact]
    public void KhayChet_VanTruSao()
    {
        var p = Goc();
        Assert.True(QuyTaiCho.TinhGio(p, UsageTracker.KhongRo));
        Assert.False(QuyTaiCho.TinhGio(Goc(x => x.AppTinhGio = new()), UsageTracker.KhongRo));
    }

    [Fact]
    public void Usage_TheoBe_GuiCon()
    {
        var t = new UsageTracker();
        var now = new DateTimeOffset(2026, 11, 15, 19, 0, 0, TimeSpan.FromHours(7));
        t.Add(now, "roblox.exe", "Roblox", 120, "be-a");
        t.Add(now, "roblox.exe", "Roblox", 60, "be-b");
        t.Add(now, "roblox.exe", "Roblox", 60);
        var ds = t.Drain();
        Assert.Contains(ds, u => u.Con == "be-a" && u.Minutes == 2);
        Assert.Contains(ds, u => u.Con == "be-b" && u.Minutes == 1);
        Assert.Contains(ds, u => u.Con == null && u.Minutes == 1);
        Assert.Equal(2, t.DungHomNay(now, con: "be-a").Single().Phut);
        Assert.Equal(4, t.DungHomNay(now).Single().Phut);
        var tong = new UsageTotals().Add(new[] { new UsageEntry("2026-11-15", "roblox.exe", "Roblox", 2, "be-a"), new UsageEntry("2026-11-15", "roblox.exe", "Roblox", 1, "be-b") });
        Assert.Equal(2, tong.Count);
    }

    [Fact]
    public void TuDongBo_PhangCu_VaLoiJson()
    {
        var p = PolicyParser.TuDongBo("""{"mode":"hoc","allowedApps":["a.exe"],"sao":5}""");   // phản hồi phẳng (máy chủ cũ / test): `sao` là số ⇒ không có khối sổ sao
        Assert.Equal(5, p.Sao);
        Assert.Null(p.SoSao);
        Assert.Throws<PolicyException>(() => PolicyParser.TuDongBo("{khong"));
        Assert.False(PolicyParser.TryParse("", out _));
    }

    [Fact]
    public void PhienOffline_MoBangMa_DemRieng_GuiBoiMa()
    {
        var p = PolicyParser.Parse("""{"mode":"hoc","playSessionId":"p1","playApp":"roblox.exe","playOfflineMinutes":10}""");
        var now = DateTimeOffset.UtcNow;
        var (d, _) = PhienOffline.Dem(null, p, offline: true, dangChoi: true, giayDonDieu: 60, daChoiGiay: 0, now, boiMa: true);
        Assert.Equal(0, d!.GiayChoi);
        Assert.Equal(60, d.GiayBoiMa);
        Assert.True(d.CanGui);
        Assert.Contains("boiMa = True", d.TaoBu().ToString());
        (d, _) = PhienOffline.Dem(d, p, true, true, 60, 0, now);
        Assert.Equal(60, d!.GiayChoi);
        Assert.Contains("boiMa = False", d.TaoBu().ToString());   // lẫn lộn ⇒ chỉ gửi phần thường (phút mở bằng mã đi boiMaCon)
        Assert.False(d.HetHan);
    }

    [Fact]
    public void DoiQua_ChanTheoSaoTieuDuoc_GomSaoVay_KhongTheoSoDu()
    {
        // #315: 0 sao, Ba Mẹ cho vay 30 để đổi quà 30 ⇒ tong-quan: sao (số dư) = 0, soDu (tiêu được) = 30
        var tq = System.Text.Json.JsonSerializer.Deserialize<HvTongQuan>("""{"soDu":30,"sao":0,"soSao":{"sao":0,"no":30,"phutCon":30}}""",
            new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true })!;
        Assert.Equal(0, tq.SoSao);                                  // thẻ Sao giữ số dư như thiết kế
        var dung = AppConView.SaoDungDuoc(tq);
        Assert.Equal(30, dung);
        var qua = new HvQua { Id = "q", Ten = "Chọn món bữa tối", Diem = 30 };
        Assert.Null(AppConView.ThieuSao(qua, dung));                // đổi được
        Assert.True(AppConView.TrangThaiDoi(qua, dung).Du);
        Assert.Equal("Con dùng được 30 sao", AppConView.DungDuoc(dung));
        // 30 sao riêng + vay 20, quà 50 ⇒ dùng được 50 (số dư vẫn 30)
        Assert.Null(AppConView.ThieuSao(new HvQua { Diem = 50 }, 50));
        // chưa đủ ⇒ câu theo sao tiêu được
        Assert.Equal("Con dùng được 10 sao · còn thiếu 20 sao", AppConView.ThieuSao(qua, 10));
        Assert.Equal(0, AppConView.SaoDungDuoc(new HvTongQuan { SoDu = -5 }));
    }

    [Fact]
    public void NgayDung_TheoMuiGioGiaDinh_703()
    {
        // 22:20 UTC ngày 17 = 05:20 sáng ngày 18 giờ VN: máy đặt múi UTC vẫn ghi phút vào ngày 18 (ngày máy chủ đang trừ sao)
        var luc = new DateTimeOffset(2026, 11, 17, 22, 20, 0, TimeSpan.Zero);
        Assert.Equal("2026-11-18", NgayGiaDinh.Cua(luc, "Asia/Ho_Chi_Minh"));
        Assert.Equal("2026-11-17", NgayGiaDinh.Cua(luc, null));
        Assert.Equal("2026-11-17", NgayGiaDinh.Cua(luc, "Khong/Co"));
        var u = new UsageTracker { Tz = "Asia/Ho_Chi_Minh" };
        u.Add(luc, "roblox.exe", "Roblox", 120);
        Assert.Equal("2026-11-18", Assert.Single(u.Drain()).Day);
        Assert.Single(u.DungHomNay(luc));
        Assert.Equal(0, u.GiayChuaGui(luc.AddMinutes(1), _ => true));
        var web = WebHistory.TongHop(new[] { new WebVisit("https://youtube.com/watch", luc, 90) }, null, "Asia/Ho_Chi_Minh");
        Assert.Equal("2026-11-18", Assert.Single(web).Ngay);
        var parsed = PolicyParser.TuDongBo("{\"windows\":{\"mode\":\"tu_do\",\"tz\":\"Asia/Ho_Chi_Minh\"}}");
        Assert.Equal("Asia/Ho_Chi_Minh", parsed.Tz);
    }
}
