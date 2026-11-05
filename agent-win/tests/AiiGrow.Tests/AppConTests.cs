using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>App Con theo thiết kế chốt 05/11 (W1): quỹ giờ chơi tại máy (QuyTaiCho), chữ màn Con (AppConView), đường khay mới.</summary>
public class AppConTests
{
    private static readonly TimeSpan VN = TimeSpan.FromHours(7);
    // QuyTaiCho đọc giờ ĐỊA PHƯƠNG của máy chạy test ⇒ dựng mốc theo giờ máy để test không phụ thuộc múi giờ của runner
    private static DateTimeOffset Luc(int h, int m, int ngay = 5) => new DateTimeOffset(new DateTime(2026, 11, ngay, h, m, 0, DateTimeKind.Local));

    private static Policy Goc(Action<Policy>? sua = null)
    {
        var p = PolicyParser.Parse("""
        {"mode":"hoc","locked":false,"allowedApps":["explorer.exe","scratch.exe","roblox.exe","minecraft.exe"],"learningApps":["scratch.exe"],
         "quyConPhut":18,"quyTongPhut":60,"quyDaDung":42,"appTinhGio":["Roblox.exe","minecraft.exe"],
         "gioNgu":{"tu":"21:30","den":"06:30"},"gioHoc":{"tu":"08:00","den":"11:00","thu":[1,2,3,4,5]}}
        """);
        sua?.Invoke(p);
        return p;
    }

    [Fact]
    public void PolicyParser_DocTruongQuyMoi()
    {
        var p = Goc();
        Assert.Equal(18, p.QuyConPhut);
        Assert.Equal(new[] { "roblox.exe", "minecraft.exe" }, p.AppTinhGio);   // chữ thường như AllowedApps
        Assert.Equal("21:30", p.GioNgu!.Tu);
        Assert.Equal(new[] { 1, 2, 3, 4, 5 }, p.GioHoc!.Thu);
        Assert.Empty(p.NgoaiLe);
        Assert.Null(p.KhoaKhiHetNgoaiLe);
    }

    [Fact]
    public void Quy_DemTaiMay_HetQuyThiBoAppChoi_ConQuyGiuNguyen()
    {
        var p = Goc();
        var now = Luc(19, 30);
        Assert.Same(p, QuyTaiCho.ApDung(p, 17 * 60, now, offline: false));   // còn 1 phút ⇒ không đổi gì
        Assert.Equal(1, QuyTaiCho.ConPhut(p, 17 * 60)!.Value, 3);
        var het = QuyTaiCho.ApDung(p, 18 * 60, now, offline: true);
        Assert.Equal(new[] { "explorer.exe", "scratch.exe" }, het.AllowedApps);
        Assert.Empty(het.AppTinhGio);
        Assert.False(het.Locked);                                                 // hết giờ chơi KHÔNG khoá cả máy — app học vẫn dùng
        Assert.Equal(4, p.AllowedApps.Count);                                     // Policy gốc không bị sửa
        Assert.True(QuyTaiCho.TinhGio(p, "ROBLOX.EXE"));
        Assert.False(QuyTaiCho.TinhGio(p, "scratch.exe"));
    }

    [Fact]
    public void Quy_MayChuCu_KhongCoQuy_KhongDoi()
    {
        var p = PolicyParser.Parse("""{"mode":"hoc","allowedApps":["a.exe"]}""");
        Assert.Null(QuyTaiCho.ConPhut(p, 9999));
        Assert.Same(p, QuyTaiCho.ApDung(p, 9999, Luc(22, 0), offline: true));
    }

    [Fact]
    public void MatMang_DenGioNgu_TuKhoa_GioHoc_ChiAppHoc()
    {
        var p = Goc();
        var ngu = QuyTaiCho.ApDung(p, 0, Luc(22, 0), offline: true);
        Assert.True(ngu.Locked);
        Assert.Equal(LockReasons.Ngu, ngu.LockReason);
        Assert.True(QuyTaiCho.ApDung(p, 0, Luc(5, 0), offline: true).Locked);   // qua nửa đêm vẫn là giờ ngủ
        Assert.False(QuyTaiCho.ApDung(p, 0, Luc(22, 0), offline: false).Locked, "có mạng: máy chủ xét giờ ngủ, không theo đồng hồ máy");
        // 05/11/2026 là thứ Năm ⇒ trong giờ học
        var hoc = QuyTaiCho.ApDung(p, 0, Luc(9, 0), offline: true);
        Assert.False(hoc.Locked);
        Assert.DoesNotContain("roblox.exe", hoc.AllowedApps);
        Assert.Contains("scratch.exe", hoc.AllowedApps);
        // Chủ nhật 08/11 không có giờ học
        Assert.Contains("roblox.exe", QuyTaiCho.ApDung(p, 0, Luc(9, 0, ngay: 8), offline: true).AllowedApps);
    }

    [Fact]
    public void NgoaiLe_HetHan_TuKhoaLai_ConHan_Thang()
    {
        var now = Luc(19, 0);
        // Ba Mẹ đang khoá, mở ngoại lệ cả máy tới 19:20 (máy chủ: mode tu_do + grantEndsAt + khoaKhiHetNgoaiLe)
        var p = Goc(x =>
        {
            x.Mode = Modes.TuDo; x.GrantEndsAt = now.AddMinutes(20); x.KhoaKhiHetNgoaiLe = "khoa";
            x.NgoaiLe = new() { new NgoaiLeMay { Den = now.AddMinutes(20), App = null } };
        });
        Assert.False(QuyTaiCho.ApDung(p, 0, now, offline: true).Locked);
        var het = QuyTaiCho.ApDung(p, 0, now.AddMinutes(21), offline: true);
        Assert.True(het.Locked);
        Assert.Equal(LockReasons.Khoa, het.LockReason);
        Assert.True(PolicyEvaluator.Evaluate(het, now.AddMinutes(21), 0).Locked);

        // ngoại lệ một app trong giờ ngủ: còn hạn ⇒ app đó chạy, không khoá; hết hạn ⇒ bỏ app + khoá «ngu»
        var app = Goc(x =>
        {
            x.KhoaKhiHetNgoaiLe = "ngu"; x.AllowedApps = new() { "explorer.exe", "scratch.exe" }; x.AppTinhGio = new();
            x.NgoaiLe = new() { new NgoaiLeMay { Den = Luc(22, 30), App = "scratch.exe" } };
        });
        var con = QuyTaiCho.ApDung(app, 0, Luc(22, 0), offline: true);
        Assert.False(con.Locked);
        Assert.Contains("scratch.exe", con.AllowedApps);
        var hetApp = QuyTaiCho.ApDung(app, 0, Luc(22, 31), offline: false);
        Assert.True(hetApp.Locked);
        Assert.Equal(LockReasons.Ngu, hetApp.LockReason);
        Assert.DoesNotContain("scratch.exe", hetApp.AllowedApps);

        // ngoại lệ một app lúc không khoá: hết hạn chỉ bỏ app đó
        var thuong = Goc(x => x.NgoaiLe = new() { new NgoaiLeMay { Den = now.AddMinutes(-1), App = "minecraft.exe" } });
        var t = QuyTaiCho.ApDung(thuong, 0, now, offline: false);
        Assert.False(t.Locked);
        Assert.DoesNotContain("minecraft.exe", t.AllowedApps);
    }

    [Theory]
    [InlineData("21:30", "06:30", 21, 29, false)]
    [InlineData("21:30", "06:30", 21, 30, true)]
    [InlineData("21:30", "06:30", 6, 29, true)]
    [InlineData("21:30", "06:30", 6, 30, false)]
    [InlineData("08:00", "11:00", 10, 59, true)]
    [InlineData("08:00", "08:00", 8, 0, false)]
    [InlineData("xx", "11:00", 9, 0, false)]
    public void TrongKhung_NhuMayChu(string tu, string den, int h, int m, bool mong)
        => Assert.Equal(mong, QuyTaiCho.TrongKhung(new KhungGio { Tu = tu, Den = den }, new DateTime(2026, 11, 5, h, m, 0)));

    [Fact]
    public void ChuHomNay()
    {
        Assert.Equal("Chào Bảo Anh!", AppConView.Chao(" Bảo Anh "));
        Assert.Equal("Thứ Năm · 19:30", AppConView.NgayGio(new DateTime(2026, 11, 5, 19, 30, 0)));
        Assert.Equal("18 phút", AppConView.Phut(18.9));
        Assert.Equal("0 phút", AppConView.Phut(-3));
        Assert.Equal("Đã chơi 42 / 60 phút", AppConView.DaChoi(42.2, 60));
        Assert.Equal(0.7, AppConView.TiLe(42, 60), 3);
        Assert.Equal("10 sao = 10 phút chơi", AppConView.TyLe(null));
        Assert.Equal("Đổi 10 sao lấy 15 phút", AppConView.NutDoiSao(new HvTyLe { Sao = 10, Phut = 15 }));
        var dung = new List<DungApp>
        {
            new() { AppId = "roblox.exe", Ten = "Roblox", Phut = 30 }, new() { AppId = "youtubekids.exe", Ten = "YouTube Kids", Phut = 12 },
            new() { AppId = "tudien.exe", Ten = "Từ điển", Phut = 5 },
        };
        Assert.Equal("Roblox 30 phút · YouTube Kids 12 phút · Từ điển không tính giờ", AppConView.DungTheoApp(dung, new[] { "tudien.exe" }));
    }

    [Fact]
    public void DoiSao_TinhSaoVaToiDa()
    {
        Assert.Equal(10, AppConView.SaoChoPhut(10, null));
        Assert.Equal(40, AppConView.SaoChoPhut(40, new HvTyLe()));
        Assert.Equal(7, AppConView.SaoChoPhut(10, new HvTyLe { Sao = 10, Phut = 15 }));   // làm tròn lên
        var q = new HvQuy { DoiSao = new HvDoiSaoCau { Bat = true, ToiDaNgay = 30, ConDoiDuoc = 20 } };
        Assert.Equal(20, AppConView.PhutDoiToiDa(30, q));   // còn đổi được 20 phút hôm nay
        Assert.Equal(15, AppConView.PhutDoiToiDa(15, q));   // 15 sao
        Assert.Equal("Còn 20 sao · giờ chơi thành 28 phút", AppConView.SauKhiDoi(30, 10, 18, null));
        Assert.True(AppConView.KhongThemGio(new HvQuy { DangNgu = true }));
        Assert.False(AppConView.KhongThemGio(new HvQuy()));
    }

    private const string TongQuanMoi = """
    {"con":{"id":"c1","ten":"Bảo Anh"},"soDu":30,"sao":30,"saoChoDuyet":20,"diemChoDuyet":20,
     "quy":{"conPhut":18,"daDung":42,"tongPhut":60,"quyNgayPhut":60,"themPhut":0,"dangNgu":false,"dangHoc":false,"khoa":false,
            "gioNgu":{"tu":"21:30","den":"06:30"},"gioHoc":null,"tyLe":{"sao":10,"phut":10},"doiSao":{"bat":true,"toiDaNgay":30,"conDoiDuoc":30},"choXinThem":true},
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
        Assert.Equal(18, tq.Quy!.ConPhut);
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
        var now = new DateTimeOffset(2026, 11, 5, 19, 30, 0, VN);
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
        Assert.Equal(new KetQuaTin("them_gio", "", null, 20, null), AppConView.DocTin(new HvTin { Loai = "them_gio", Noi = "+20 phút chơi hôm nay" }));
        Assert.Null(AppConView.DocTin(new HvTin { Loai = "loi_khen", Noi = "Giỏi lắm" }));
        var moi = new List<HvTin>
        {
            new() { Loai = "duyet_nhiem_vu", Noi = "«A» · +10 sao", Luc = new DateTimeOffset(2026, 11, 5, 10, 0, 0, TimeSpan.Zero) },
            new() { Loai = "them_gio", Noi = "+15 phút chơi hôm nay", Luc = new DateTimeOffset(2026, 11, 5, 11, 0, 0, TimeSpan.Zero) },
            new() { Loai = "loi_khen", Noi = "x", Luc = new DateTimeOffset(2026, 11, 5, 12, 0, 0, TimeSpan.Zero) },
        };
        Assert.Equal("them_gio", AppConView.ChonKetQua(moi)!.Loai);
    }

    [Theory]
    [InlineData("GET", "hoc-vien/quy", true)]
    [InlineData("GET", "hoc-vien/nhiem-vu?tuCham=1", true)]
    [InlineData("GET", "hoc-vien/vi-qua", true)]
    [InlineData("POST", "hoc-vien/doi-sao", true)]
    [InlineData("GET", "hoc-vien/doi-sao", false)]
    [InlineData("POST", "hoc-vien/quy", false)]
    [InlineData("POST", "hoc-vien/doi-sao?phut=10", false)]
    public void HocVienPaths_DuongMoi(string method, string path, bool mong) => Assert.Equal(mong, HocVienPaths.Allowed(method, path));

    [Fact]
    public async Task BaiChoMang_LuuGuiBo()
    {
        var dir = Path.Combine(Path.GetTempPath(), "aiigrow-bai-cho-" + Guid.NewGuid().ToString("N"));
        try
        {
            var h = new BaiChoMang(dir);
            var now = new DateTimeOffset(2026, 11, 5, 19, 0, 0, VN);
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
    public void Quy_QuaNuaDem_MoHet_KhoaNguCu()
    {
        // Policy đồng bộ 20:00 hôm qua (còn 5 phút) — mất mạng qua đêm ⇒ hôm nay quỹ lại 60 phút trừ phần chơi từ nửa đêm
        var p = Goc(x => x.ServerTime = Luc(20, 0, ngay: 4));
        Assert.Equal(18, QuyTaiCho.ConPhut(p, 0)!.Value, 3);
        Assert.Equal(50, QuyTaiCho.ConPhut(p, 99999, Luc(9, 0), giayHomNay: 600)!.Value, 3);
        Assert.True(QuyTaiCho.NgayMoi(p, Luc(0, 1)));
        // «Mở hết» (tu_do không hạn) hết quỹ ⇒ app chơi vào danh sách chặn
        var mh = Goc(x => { x.Mode = Modes.TuDo; x.ServerTime = Luc(19, 0); });
        var het = QuyTaiCho.ApDung(mh, 18 * 60, Luc(19, 30), offline: false);
        Assert.Contains(het.BlockedApps, a => a.Muc == "roblox.exe");
        Assert.Empty(mh.BlockedApps);
        // khoá «ngu» lúc đồng bộ đêm qua, mất mạng tới 7:00 sáng ⇒ mở lại (chỉ app được phép), không khoá cả buổi sáng
        var ngu = Goc(x => { x.Locked = true; x.LockReason = LockReasons.Ngu; x.Mode = Modes.Khoa; });
        var sang = QuyTaiCho.ApDung(ngu, 0, Luc(7, 0), offline: true);
        Assert.False(sang.Locked);
        Assert.Equal(Modes.Hoc, sang.Mode);
        Assert.True(QuyTaiCho.ApDung(ngu, 0, Luc(7, 0), offline: false).Locked, "có mạng: máy chủ quyết");
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
    public void NgoaiLeHetHan_AppVonDuocPhep_GiuNguyen_KhayChetVanTruQuy()
    {
        var now = Luc(19, 0);
        var p = Goc(x => { x.Mode = Modes.TuDo; x.NgoaiLe = new() { new NgoaiLeMay { Den = now.AddMinutes(-1), App = "scratch.exe" } }; });
        var q = QuyTaiCho.ApDung(p, 0, now, offline: true);
        Assert.Contains("scratch.exe", q.AllowedApps);
        Assert.Empty(q.BlockedApps);
        Assert.True(QuyTaiCho.TinhGio(p, UsageTracker.KhongRo));
        Assert.False(QuyTaiCho.TinhGio(Goc(x => x.AppTinhGio = new()), UsageTracker.KhongRo));
    }
}
