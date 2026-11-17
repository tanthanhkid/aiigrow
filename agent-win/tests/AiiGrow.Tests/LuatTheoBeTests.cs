using System.Text.Json;
using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>#337 / #339 (17/11): máy chung — luật, khoá, sao đi theo từng bé khi mất mạng; Ba Mẹ đổi gán máy áp ngay; phút bù kèm đúng bé.</summary>
public class LuatTheoBeTests
{
    private static readonly DateTimeOffset T0 = new(2026, 11, 17, 9, 0, 0, TimeSpan.Zero);

    // bé A (Bảo Anh) bị Ba Mẹ khoá, 30 sao; bé B (Bảo Minh) không khoá, 10 sao, giới hạn ngày còn 20 phút, danh sách app riêng
    private const string DongBoA = """
        {"windows":{"mode":"khoa","locked":true,"lockReason":"khoa","childName":"Bảo Anh","allowedApps":["roblox.exe"],"quyConPhut":30,"appTinhGio":["roblox.exe"]},
         "sao":{"sao":30,"no":0,"phutCon":30,"saoTieuDuoc":30},"cheDo":"theo_danh_sach"}
        """;
    private const string GoiB = """
        {"con":{"id":"b"},"windows":{"mode":"hoc","locked":false,"childName":"Bảo Minh","allowedApps":["minecraft.exe"],"quyConPhut":10,"appTinhGio":["minecraft.exe"],
           "gioiHan":{"apDung":true,"conNgay":20,"phutToiDa":20,"cau":"Hôm nay còn 20 phút"}},
         "sao":{"sao":10,"no":0,"phutCon":10,"saoTieuDuoc":10},"cheDo":"theo_danh_sach"}
        """;

    private static HoSoMay HoSo(bool kemGoi = true, params string[] ids)
    {
        if (ids.Length == 0) ids = new[] { "a", "b" };
        var hs = new HoSoMay { OfflineLuc = T0 };
        foreach (var id in ids)
            hs.Con.Add(new HoSoBe
            {
                Id = id, Ten = id == "a" ? "Bảo Anh" : id == "b" ? "Bảo Minh" : "Bảo Châu", Sao = id == "b" ? 10 : 30,
                Offline = kemGoi && id == "b" ? JsonDocument.Parse(GoiB).RootElement.Clone() : null,
            });
        return hs;
    }

    [Fact]
    public void Gop_luu_goi_theo_be_bo_khoi_ho_so_va_bo_be_khong_con_gan()
    {
        var goi = new Dictionary<string, GoiLuatBe>();
        var hs = HoSo();
        Assert.True(LuatTheoBe.Gop(goi, hs, T0.AddSeconds(5)));
        Assert.Equal(new[] { "b" }, goi.Keys);
        Assert.Equal(T0, goi["b"].Luc);                                     // lúc máy chủ dựng (offlineLuc), không phải lúc máy nhận
        Assert.False(LuatTheoBe.Gop(goi, hs, T0.AddSeconds(5)));            // y nguyên ⇒ không ghi lại
        LuatTheoBe.BoGoi(hs);
        Assert.All(hs.Con, c => Assert.Null(c.Offline));
        Assert.DoesNotContain("offline", JsonSerializer.Serialize(hs, Json.Options), StringComparison.OrdinalIgnoreCase);
        // sống qua khởi động lại: lưu trong cấu hình (JSON) rồi đọc lại
        var cfg = new AgentConfig { GoiLuatBe = goi };
        var lai = JsonSerializer.Deserialize<AgentConfig>(JsonSerializer.Serialize(cfg, Json.Options), Json.Options)!;
        Assert.False(LuatTheoBe.Doc(lai.GoiLuatBe["b"])!.Locked);
        // Ba Mẹ bỏ B khỏi máy ⇒ ho-so mới không còn B ⇒ gói của B bị bỏ
        Assert.True(LuatTheoBe.Gop(goi, HoSo(true, "a"), T0.AddMinutes(1)));
        Assert.Empty(goi);
    }

    [Fact]
    public void Doi_be_luc_mat_mang_dung_dung_luat_khoa_sao_gioi_han_cua_be_do()
    {
        var a = PolicyParser.TuDongBo(DongBoA);
        a.CheDo = CheDoAgent.Chan;
        var goi = new Dictionary<string, GoiLuatBe>();
        var hs = HoSo();
        LuatTheoBe.Gop(goi, hs, T0);
        var hsB = hs.Con.First(c => c.Id == "b");

        var b = LuatTheoBe.ChoBe(a, "a", "b", mayRieng: false, LuatTheoBe.Doc(goi["b"]), goi["b"].Luc, hsB, T0)!;
        Assert.NotNull(b);
        var eff = PolicyEvaluator.Evaluate(b, T0, 0);
        Assert.False(eff.Locked);                                           // B không mang cờ khoá của A
        Assert.Equal(new[] { "minecraft.exe" }, b.AllowedApps);             // danh sách app của B
        Assert.Equal(10, b.SoSao!.Sao);                                     // sao của B
        Assert.Equal((double?)10, QuyTaiCho.ConPhut(b, 0));
        Assert.True(b.GioiHan!.ApDung);                                     // giới hạn ngày của B còn nguyên
        Assert.Equal(CheDoAgent.Chan, b.CheDo);                             // chế độ chặn của máy giữ nguyên

        // ngược lại: Policy cuối là của B (không khoá), A vào lúc mất mạng ⇒ A vẫn bị khoá theo luật của A
        var goiA = new GoiLuatBe { Raw = DongBoA, Luc = T0 };
        var pa = LuatTheoBe.ChoBe(b, "b", "a", false, LuatTheoBe.Doc(goiA), T0, hs.Con[0], T0)!;
        var effA = PolicyEvaluator.Evaluate(pa, T0, 0);
        Assert.True(effA.Locked);
        Assert.Equal(LockReasons.Khoa, effA.LockReason);
        Assert.Equal(30, pa.SoSao!.Sao);
    }

    [Fact]
    public void So_sao_ho_so_moi_hon_goi_thi_lay_ho_so()
    {
        var a = PolicyParser.TuDongBo(DongBoA);
        var goiB = new GoiLuatBe { Raw = GoiB, Luc = T0 };
        var hsB = new HoSoBe { Id = "b", Ten = "Bảo Minh", Sao = 4 };
        var cu = LuatTheoBe.ChoBe(a, "a", "b", false, LuatTheoBe.Doc(goiB), goiB.Luc, hsB, T0)!;
        Assert.Equal(10, cu.SoSao!.Sao);                                    // cùng lượt ho-so ⇒ số của gói
        var moi = LuatTheoBe.ChoBe(a, "a", "b", false, LuatTheoBe.Doc(goiB), goiB.Luc, hsB, T0.AddMinutes(10))!;
        Assert.Equal(4, moi.SoSao!.Sao);                                    // ho-so máy chủ dựng sau gói ⇒ số dư mới hơn
        Assert.Equal((double?)4, QuyTaiCho.ConPhut(moi, 0));
        Assert.Equal(0, moi.SoSao.No);                                      // nợ: số máy chủ tính (gói), không tự suy
        Assert.Equal((double?)4, moi.SoSao.SaoTieuDuoc);                             // sao tiêu được của máy chủ, không quá số dư mới
        // không biết giờ máy chủ của ho-so (null) ⇒ không so được ⇒ giữ số của gói
        Assert.Equal(10, LuatTheoBe.ChoBe(a, "a", "b", false, LuatTheoBe.Doc(goiB), goiB.Luc, hsB, null)!.SoSao!.Sao);
    }

    [Fact]
    public void Ho_so_tai_lai_luat_y_nguyen_thi_khong_ghi_lai_luat_doi_thi_thay()
    {
        var goi = new Dictionary<string, GoiLuatBe>();
        LuatTheoBe.Gop(goi, HoSo(), T0);
        goi["b"].GiayDaDem = 120;
        // lượt sau: chỉ serverTime / offlineLuc đổi ⇒ không ghi cấu hình, giữ phần đã đếm
        var hs2 = HoSo();
        hs2.OfflineLuc = T0.AddMinutes(2);
        hs2.Con[1].Offline = JsonDocument.Parse(GoiB.Replace("\"con\":{", "\"serverTime\":\"2026-11-17T09:02:00Z\",\"con\":{")).RootElement.Clone();
        Assert.False(LuatTheoBe.Gop(goi, hs2, T0.AddMinutes(2)));
        Assert.Equal(120, goi["b"].GiayDaDem);
        // luật đổi (sao mới) ⇒ thay, phần đã đếm về 0 (số máy chủ đã gồm phút gửi lên)
        var hs3 = HoSo();
        hs3.OfflineLuc = T0.AddMinutes(5);
        hs3.Con[1].Offline = JsonDocument.Parse(GoiB.Replace("\"sao\":10", "\"sao\":8")).RootElement.Clone();
        Assert.False(LuatTheoBe.Gop(goi, hs3, T0.AddMinutes(5), thay: false));   // ho-so ngoài lượt đồng bộ: không thay gói đang có
        Assert.Equal(120, goi["b"].GiayDaDem);
        Assert.True(LuatTheoBe.Gop(goi, hs3, T0.AddMinutes(5)));
        Assert.Equal(0, goi["b"].GiayDaDem);
        Assert.Equal(T0.AddMinutes(5), goi["b"].Luc);
        Assert.Equal(8, LuatTheoBe.Doc(goi["b"])!.SoSao!.Sao);
    }

    [Fact]
    public void Be_roi_may_cat_luat_va_phan_da_dem_moi_nhat_vao_goi()
    {
        var goi = new Dictionary<string, GoiLuatBe>();
        LuatTheoBe.Gop(goi, HoSo(), T0);                                    // gói ho-so cũ của B: 10 sao
        // B là chủ Policy cuối (đồng bộ lúc 9:30, còn 7 sao), đã đếm 120 giây «Tính phút» + 300 giây dùng máy ⇒ đổi người
        var dongBoB = GoiB.Replace("\"sao\":10", "\"sao\":7").Replace("\"quyConPhut\":10", "\"quyConPhut\":7");
        Assert.True(LuatTheoBe.CatBeRoi(goi, "b", "b", dongBoB, T0.AddMinutes(30), 120, 300, 0, 0));
        Assert.Equal(7, LuatTheoBe.Doc(goi["b"])!.SoSao!.Sao);              // luật mới nhất, không phải gói ho-so cũ
        Assert.Equal(120, goi["b"].GiayDaDem);
        Assert.Equal(300, goi["b"].DungGiay);
        // máy đã có gói máy chủ dựng SAU Policy đó ⇒ không đè
        Assert.False(LuatTheoBe.CatBeRoi(goi, "b", "b", GoiB, T0.AddMinutes(10), 0, 0, 0, 0));
        // A đang theo gói (không phải chủ Policy) rời máy ⇒ cộng giây đếm riêng vào gói của A
        goi["a"] = new GoiLuatBe { Raw = DongBoA, Luc = T0, GiayDaDem = 60 };
        Assert.True(LuatTheoBe.CatBeRoi(goi, "a", "b", dongBoB, T0.AddMinutes(30), 999, 999, 90, 30));
        Assert.Equal(150, goi["a"].GiayDaDem);
        Assert.Equal(30, goi["a"].DungGiay);
        Assert.False(LuatTheoBe.CatBeRoi(goi, "c", "b", dongBoB, T0, 0, 0, 10, 0));   // bé chưa có gói ⇒ không bịa
    }

    [Fact]
    public void Be_khong_co_goi_thi_khoa_toi_khi_co_mang()
    {
        var a = PolicyParser.TuDongBo("""{"windows":{"mode":"hoc","locked":false,"allowedApps":["roblox.exe"],"quyConPhut":30,"appTinhGio":["roblox.exe"],"playSessionId":"p1","playApp":"roblox.exe"},"sao":{"sao":30,"no":0,"phutCon":30}}""");
        var hsC = new HoSoBe { Id = "c", Ten = "Bảo Châu", Sao = 5 };
        Assert.Null(LuatTheoBe.ChoBe(a, "a", "c", false, null, null, hsC, T0, offline: false));   // có mạng, chờ dong-bo ⇒ luật hiện có
        var k = LuatTheoBe.ChoBe(a, "a", "c", false, null, null, hsC, T0)!;
        var eff = PolicyEvaluator.Evaluate(k, T0, 0);
        Assert.True(eff.Locked);
        Assert.Equal(LockReasons.CanMang, eff.LockReason);
        Assert.Equal((double?)0, QuyTaiCho.ConPhut(k, 0));                           // không mượn 30 sao của A
        Assert.Null(k.PlaySessionId);                                       // không đếm vào phiên chơi của A
        Assert.Equal(5, k.SoSao!.Sao);
        // Policy lấy lúc chưa ai đăng nhập (máy chung) cũng vậy
        Assert.True(LuatTheoBe.ChoBe(a, null, "c", false, null, null, hsC, T0)!.Locked);
        // Ba Mẹ nhập mã gỡ được; màn khoá nói đúng lý do + «Đổi người»
        Assert.True(MoTamOffline.MoDuocKhoa(LockReasons.CanMang));
        var m = ManKhoaView.For(LockReasons.CanMang, "Bảo Châu", offline: true);
        Assert.Equal("Cần có mạng để mở máy cho Bảo Châu", m.Tieu);
        Assert.Contains("nhờ Ba Mẹ nhập mã", m.Phu);
        Assert.True(m.MatMang);
        Assert.Contains(m.Nut, n => n.Ma == ManKhoaView.DoiBe);
    }

    [Fact]
    public void Cung_be_may_rieng_hoac_chua_ai_thi_giu_Policy_cuoi()
    {
        var a = PolicyParser.TuDongBo(DongBoA);
        Assert.Null(LuatTheoBe.ChoBe(a, "a", "a", false, null, null, null, null));
        Assert.Null(LuatTheoBe.ChoBe(a, "a", null, false, null, null, null, null));
        Assert.Null(LuatTheoBe.ChoBe(a, null, "a", mayRieng: true, null, null, null, null));
    }

    // ------------------------------------------------------------------ #339

    [Fact]
    public void DsCon_lech_thi_tai_lai_be_bi_bo_gan_thi_day_ra()
    {
        var d = new DangNhapMay { HoSo = HoSo(false) };
        DangNhapView.VaoCon(d, "b", "Bảo Minh", null, T0);
        Assert.Equal(new[] { "a", "b" }, DangNhapView.DocDsCon("""{"dsCon":["a","b"],"windows":{}}"""));
        Assert.Null(DangNhapView.DocDsCon("""{"windows":{}}"""));                       // máy chủ cũ

        Assert.Equal((false, false), DangNhapView.SoDsCon(d, new[] { "b", "a" }, T0));   // khớp (không kể thứ tự)
        Assert.Equal((false, false), DangNhapView.SoDsCon(d, null, T0));                 // máy chủ cũ ⇒ không làm gì
        Assert.Equal((true, false), DangNhapView.SoDsCon(d, new[] { "a", "b", "c" }, T0)); // Ba Mẹ thêm bé ⇒ tải lại ngay
        var (taiLai, dayRa) = DangNhapView.SoDsCon(d, new[] { "a" }, T0);                // Ba Mẹ bỏ B (đang dùng)
        Assert.True(taiLai);
        Assert.True(dayRa);
        DangNhapView.Roi(d, T0, baoMayChu: false);
        Assert.Equal(LoaiNguoiDung.Chua, DangNhapView.HienTai(d, T0));
        Assert.False(DangNhapView.SoDsCon(d, new[] { "a" }, T0).DayRa);
        Assert.True(DangNhapView.SoDsCon(new DangNhapMay(), new[] { "a" }, T0).TaiLai);  // chưa có danh sách
        // dsCon rỗng (như Mac / Android) ⇒ bỏ qua, không đá bé ra
        var d2 = new DangNhapMay { HoSo = HoSo(false) };
        DangNhapView.VaoCon(d2, "a", "Bảo Anh", null, T0);
        Assert.Equal((false, false), DangNhapView.SoDsCon(d2, Array.Empty<string>(), T0));
    }

    // ------------------------------------------------------------------ phien/bu kèm bé

    [Fact]
    public void Phien_bu_kem_dung_be_da_choi_va_doi_be_khong_mat_phut_be_truoc()
    {
        var pa = new Policy { PlaySessionId = "pA", PlayApp = "roblox.exe", PlayOfflineMinutes = 30 };
        var (d, _) = PhienOffline.Dem(null, pa, true, true, 60, 0, T0, con: "a");
        Assert.Equal("a", d!.Con);
        var bu = JsonSerializer.Serialize(d.TaoBu(), Json.Options);
        Assert.Contains("\"con\":\"a\"", bu);
        Assert.Contains("\"id\":\"pA\"", bu);

        // A «Đổi người» sang B lúc mất mạng, B có phiên chơi khác ⇒ đoạn của A cất chờ gửi, B đếm đoạn riêng (không bị chặn)
        var cho = new List<PhienOffline>();
        var pb = new Policy { PlaySessionId = "pB", PlayApp = "minecraft.exe", PlayOfflineMinutes = 30 };
        var (cur, doi) = PhienOffline.DoiBe(d, cho, pb, "b");
        Assert.True(doi);
        Assert.Null(cur);
        Assert.Same(d, Assert.Single(cho));
        var (db, _) = PhienOffline.Dem(cur, pb, true, true, 60, 0, T0.AddMinutes(1), con: "b");
        (db, _) = PhienOffline.Dem(db, pb, true, true, 30, 0, T0.AddMinutes(2), con: "b");
        Assert.Equal("pB", db!.PhienId);
        Assert.Equal("b", db.Con);
        Assert.Equal(90, db.GiayChoi);
        Assert.Equal(60, cho[0].GiayChoi);                                   // phút của A còn nguyên
        // A quay lại đúng phiên ⇒ lấy lại đoạn của A (ngưỡng, phút giữ), đoạn của B vào hàng chờ
        var pa2 = new Policy { PlaySessionId = "pA", PlayApp = "roblox.exe", PlayOfflineMinutes = 30 };
        (cur, doi) = PhienOffline.DoiBe(db, cho, pa2, "a");
        Assert.Same(d, cur);
        Assert.Equal("pB", Assert.Single(cho).PhienId);
        Assert.Contains("\"con\":\"b\"", JsonSerializer.Serialize(cho[0].TaoBu(), Json.Options));
        // cùng phiên ⇒ không đổi gì
        Assert.False(PhienOffline.DoiBe(cur, cho, pa2, "a").Doi);

        // máy riêng (không rõ bé) như cũ: đoạn phiên mới thay đoạn cũ
        var (d3, _) = PhienOffline.Dem(new PhienOffline { PhienId = "x", Muc = "a.exe", GiayChoi = 5 }, pb, true, true, 10, 0, T0);
        Assert.Equal("pB", d3!.PhienId);
        Assert.Null(d3.Con);
    }
}
