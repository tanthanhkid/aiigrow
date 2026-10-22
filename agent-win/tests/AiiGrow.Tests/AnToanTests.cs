using AiiGrow.Core;

namespace AiiGrow.Tests;

// An toàn & gỡ cài đặt: chế độ hiệu lực (máy chủ thắng cục bộ), fail-open khi mồ côi, thứ tự gỡ (báo trước — dọn sau, không tự dừng chính mình).

public class CheDoHieuLucTests
{
    [Theory]
    [InlineData("chan", "giam-sat", false, "chan")]       // máy chủ thắng cục bộ
    [InlineData("giam-sat", "chan", false, "giam-sat")]   // Ba Mẹ tắt chặn từ xa
    [InlineData(null, "chan", false, "chan")]             // Ba Mẹ chưa chọn ⇒ giữ chế độ đang chạy (máy cài sẵn «chặn»)
    [InlineData("la", "chan", false, "chan")]             // giá trị lạ bị bỏ qua
    [InlineData(null, null, false, "giam-sat")]
    [InlineData(null, "CHAN ", false, "chan")]
    [InlineData("chan", "chan", true, "giam-sat")]        // mồ côi ⇒ luôn giám sát
    public void Chon(string? mayChu, string? cucBo, bool moCoi, string ketQua)
        => Assert.Equal(ketQua, CheDoHieuLuc.Chon(mayChu, cucBo, moCoi));

    [Fact]
    public void Policy_DocCheDo()
    {
        Assert.Equal("chan", PolicyParser.Parse("""{"mode":"hoc","cheDo":"CHAN"}""").CheDo);
        Assert.Null(PolicyParser.Parse("""{"mode":"hoc","cheDo":"tat"}""").CheDo);
        Assert.Null(PolicyParser.Parse("""{"mode":"hoc"}""").CheDo);
        // dong-bo: Policy nằm trong `windows`
        var raw = """{"lenh":[],"windows":{"mode":"khoa","locked":true,"cheDo":"giam-sat"}}""";
        Assert.Equal("giam-sat", PolicyParser.Parse(ApiClient.LayWindows(raw)).CheDo);
    }

    [Fact]
    public void Khay_GiamSat_KhongHienManKhoa()
    {
        var s = new TrayState { Locked = true, LockReason = LockReasons.Ngu, LockGraceLeftSec = 5 };
        CheDoHieuLuc.ChoKhayGiamSat(s);
        Assert.False(s.Locked);
        Assert.Null(s.LockReason);
        Assert.Null(s.LockGraceLeftSec);
    }

    [Fact]
    public void Status_GuiCheDoThat()
    {
        var json = System.Text.Json.JsonSerializer.Serialize(new AgentStatus { CheDo = CheDoAgent.Chan }, Json.Options);
        Assert.Contains("\"cheDo\":\"chan\"", json);
    }

    // 🟡 CHỈ 401 token_sai (máy đã bị gỡ) mới tính vào mốc mồ côi 6 giờ — 403 lạ / 401 mã khác KHÔNG tính.
    [Theory]
    [InlineData(401, "token_sai", true)]
    [InlineData(401, "device_unknown", true)]
    [InlineData(403, "token_sai", false)]      // 403 (tường lửa/CDN) không tính dù mang mã
    [InlineData(401, "sai_mat_khau", false)]   // 401 vì lý do khác không tính
    [InlineData(401, null, false)]
    [InlineData(500, null, false)]
    public void ApiException_LaTokenSai(int ma, string? code, bool mong)
        => Assert.Equal(mong, new ApiException("x", ma, code: code).LaTokenSai);

    [Fact]
    public void Config_RoundTrip_DaHaQuyen_LienLacCuoi()
    {
        var c = new AgentConfig { LienLacCuoi = new DateTimeOffset(2026, 10, 22, 8, 0, 0, TimeSpan.Zero),
            DaHaQuyen = { new QuyenDaHa { Sid = "S-1-5-21-1-2-3-1001", Nhom = "S-1-5-32-544" } } };
        var lai = System.Text.Json.JsonSerializer.Deserialize<AgentConfig>(
            System.Text.Json.JsonSerializer.Serialize(c, Json.Options), Json.Options)!;
        Assert.Equal(c.LienLacCuoi, lai.LienLacCuoi);
        Assert.Equal("S-1-5-21-1-2-3-1001", lai.DaHaQuyen[0].Sid);
        Assert.Equal("S-1-5-32-544", lai.DaHaQuyen[0].Nhom);
    }
}

public class MoCoiTests
{
    private static readonly DateTimeOffset T0 = new(2026, 10, 22, 8, 0, 0, TimeSpan.Zero);

    [Fact]
    public void TuChoi_DuoiNguong_ChuaMoCoi_QuaNguong_GiamSatVaBoPolicyCuoi()
    {
        var c = new AgentConfig { Server = "s", Token = "t", CheDo = CheDoAgent.Chan, LastPolicyJson = """{"mode":"khoa"}""", LastPolicyAt = T0 };
        Assert.True(MoCoi.GhiTuChoi(c, T0));
        Assert.False(MoCoi.GhiTuChoi(c, T0.AddHours(1)), "lần từ chối sau không dời mốc");
        Assert.Equal(T0, c.TuChoiTu);
        Assert.False(MoCoi.La(c, T0.AddHours(MoCoi.GioNguong).AddMinutes(-1)));
        Assert.Equal(CheDoAgent.Chan, c.CheDo);
        Assert.NotNull(c.LastPolicyJson);

        Assert.True(MoCoi.GhiTuChoi(c, T0.AddHours(MoCoi.GioNguong)));   // tới ngưỡng ⇒ áp fail-open ngay
        Assert.True(MoCoi.La(c, T0.AddHours(MoCoi.GioNguong)));
        Assert.Equal(CheDoAgent.GiamSat, c.CheDo);
        Assert.Null(c.LastPolicyJson);
        Assert.Null(c.LastPolicyAt);
        Assert.Equal(CheDoAgent.GiamSat, CheDoHieuLuc.Chon("chan", c.CheDo, MoCoi.La(c, T0.AddHours(7))));
    }

    [Fact]
    public void DongBoDuoc_HetMoCoi()
    {
        var c = new AgentConfig { TuChoiTu = T0 };
        Assert.True(MoCoi.La(c, T0.AddHours(8)));
        Assert.True(MoCoi.GhiThanhCong(c, T0.AddHours(8)));
        Assert.False(MoCoi.La(c, T0.AddHours(8)));
        Assert.False(MoCoi.GhiThanhCong(c, T0.AddHours(8)));
    }

    [Fact]
    public void DongHoLui_DemLai()
    {
        var c = new AgentConfig { TuChoiTu = T0.AddDays(3) };   // mốc ở tương lai (giờ máy bị chỉnh lùi)
        Assert.False(MoCoi.La(c, T0));
        Assert.True(MoCoi.GhiTuChoi(c, T0));
        Assert.Equal(T0, c.TuChoiTu);
    }

    // Ngưỡng chạy 72 giờ: đủ 14 ngày lịch + 72 giờ máy bật ⇒ thả; 71 giờ ⇒ chưa (chỉnh lịch BIOS không đủ).
    [Fact]
    public void MatLienLac_Can72GioMayBat_VaDu14NgayLich()
    {
        var du = T0.AddDays(MoCoi.NgayMatLienLac);
        var it = new AgentConfig { LienLacCuoi = T0, MatLienLacChayGiay = TimeSpan.FromHours(71).TotalSeconds };
        Assert.False(MoCoi.MatLienLacLau(it, du));
        var vua = new AgentConfig { LienLacCuoi = T0, MatLienLacChayGiay = MoCoi.NguongChayLienLac.TotalSeconds };
        Assert.True(MoCoi.MatLienLacLau(vua, du));
        Assert.False(MoCoi.MatLienLacLau(vua, du.AddHours(-1)));   // giờ chạy đủ mà lịch chưa đủ 14 ngày ⇒ chưa
        Assert.Equal(TimeSpan.FromHours(72), MoCoi.NguongChayLienLac);
    }

    // 🟡 fail-open DÀI HẠN: KHÔNG đồng bộ được lần nào quá 14 ngày (mọi loại lỗi — không chỉ token_sai) ⇒ về giám sát, bỏ Policy cuối.
    [Fact]
    public void MatLienLac14Ngay_MoiLoai_VeGiamSat_BoPolicy()
    {
        var c = new AgentConfig { CheDo = CheDoAgent.Chan, LastPolicyJson = """{"mode":"khoa"}""", LastPolicyAt = T0, LienLacCuoi = T0,
            MatLienLacChayGiay = MoCoi.NguongLienLac.TotalSeconds };   // đồng hồ đơn điệu cũng đã đủ 14 ngày chạy
        Assert.False(MoCoi.La(c, T0.AddDays(MoCoi.NgayMatLienLac).AddHours(-1)));   // chưa đủ 14 ngày
        Assert.True(MoCoi.MatLienLacLau(c, T0.AddDays(MoCoi.NgayMatLienLac)));
        Assert.True(MoCoi.La(c, T0.AddDays(MoCoi.NgayMatLienLac)));
        Assert.True(MoCoi.ApDung(c, T0.AddDays(MoCoi.NgayMatLienLac)));
        Assert.Equal(CheDoAgent.GiamSat, c.CheDo);
        Assert.Null(c.LastPolicyJson);
        // liên lạc lại ⇒ ghi mốc mới, hết mồ côi (chạy bình thường trở lại)
        Assert.True(MoCoi.GhiThanhCong(c, T0.AddDays(MoCoi.NgayMatLienLac + 1)));
        Assert.False(MoCoi.La(c, T0.AddDays(MoCoi.NgayMatLienLac + 1)));
        Assert.Equal(0, c.MatLienLacChayGiay);   // cả hai đồng hồ về 0
    }

    // 🟠1 vòng 3: Con chỉnh giờ máy (BIOS/UEFI) tới +15 ngày rồi bật chế độ máy bay ⇒ KHÔNG được fail-open (đồng hồ đơn điệu chưa đủ).
    [Fact]
    public void ChiChinhDongHoToi_KhongFailOpen_CaHaiDongHoDu_ThiFailOpen()
    {
        var c = new AgentConfig { CheDo = CheDoAgent.Chan, LastPolicyJson = """{"mode":"khoa"}""", LastPolicyAt = T0, LienLacCuoi = T0 };
        var gia = T0.AddDays(15);   // đồng hồ thật bị đẩy tới
        // máy chạy thật 1 giờ (vòng 5 giây) ⇒ đồng hồ đơn điệu ~1 giờ
        for (int i = 0; i < 720; i++) MoCoi.CongChay(c, 5);
        Assert.False(MoCoi.MatLienLacLau(c, gia));
        Assert.False(MoCoi.La(c, gia));
        Assert.False(MoCoi.ApDung(c, gia));
        Assert.Equal(CheDoAgent.Chan, c.CheDo);
        Assert.NotNull(c.LastPolicyJson);
        // một bước nhảy lớn giữa hai vòng (ngủ đông / treo) bị cắt ở trần
        Assert.True(MoCoi.CongChay(c, 15 * 86400));
        Assert.Equal(3600 + MoCoi.TranMoiVongGiay, c.MatLienLacChayGiay);
        Assert.False(MoCoi.CongChay(c, -100));   // TickCount lùi / 0 ⇒ bỏ qua
        Assert.False(MoCoi.CongChay(c, 0));
        Assert.False(MoCoi.La(c, gia));

        // chỉ đồng hồ đơn điệu đủ mà đồng hồ thật chưa ⇒ cũng chưa
        var d = new AgentConfig { LienLacCuoi = T0, MatLienLacChayGiay = MoCoi.NguongLienLac.TotalSeconds };
        Assert.False(MoCoi.La(d, T0.AddDays(13)));
        // CẢ HAI ≥ 14 ngày ⇒ fail-open
        Assert.True(MoCoi.La(d, T0.AddDays(14)));
        // cộng dồn đủ 14 ngày chạy thật bằng các vòng có trần ⇒ fail-open
        var e = new AgentConfig { CheDo = CheDoAgent.Chan, LastPolicyJson = "{}", LienLacCuoi = T0 };
        var vong = (int)(MoCoi.NguongLienLac.TotalSeconds / MoCoi.TranMoiVongGiay);
        for (int i = 0; i < vong; i++) MoCoi.CongChay(e, 3600);   // mỗi vòng chỉ được cộng tối đa trần
        Assert.True(MoCoi.ApDung(e, T0.AddDays(14)));
        Assert.Equal(CheDoAgent.GiamSat, e.CheDo);
        // liên lạc lại ⇒ cả hai về 0
        Assert.True(MoCoi.GhiThanhCong(e, T0.AddDays(14)));
        Assert.Equal(0, e.MatLienLacChayGiay);
        Assert.False(MoCoi.La(e, T0.AddDays(14)));
    }

    [Fact]
    public void BoDemChay_LuuQuaKhoiDongLai()
    {
        var dir = Path.Combine(Path.GetTempPath(), "aii-chay-" + Guid.NewGuid().ToString("N"));
        try
        {
            var store = new ConfigStore(Path.Combine(dir, "config.json"), b => b, b => b);
            store.Save(new AgentConfig { Server = "s", Token = "t", LienLacCuoi = T0 });
            store.Update(c => c.MatLienLacChayGiay += 300);
            Assert.Equal(300, new ConfigStore(store.FilePath, b => b, b => b).Load()!.MatLienLacChayGiay);
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public void GhiThanhCong_GhiMocLienLac_TietKiemGhiDia()
    {
        var c = new AgentConfig { LienLacCuoi = T0 };
        Assert.False(MoCoi.GhiThanhCong(c, T0.AddMinutes(30)), "cùng giờ ⇒ không ghi lại (đỡ mòn đĩa)");
        Assert.True(MoCoi.GhiThanhCong(c, T0.AddHours(2)));
        Assert.Equal(T0.AddHours(2), c.LienLacCuoi);
    }

    [Fact]
    public void MocTuChoi_LuuQuaKhoiDongLai()
    {
        var dir = Path.Combine(Path.GetTempPath(), "aii-mocoi-" + Guid.NewGuid().ToString("N"));
        try
        {
            var store = new ConfigStore(Path.Combine(dir, "config.json"), b => b, b => b);
            store.Save(new AgentConfig { Server = "s", Token = "t", CheDo = CheDoAgent.Chan, LastPolicyJson = "{}" });
            store.UpdateIf(c => MoCoi.GhiTuChoi(c, T0));
            var lai = new ConfigStore(store.FilePath, b => b, b => b);
            Assert.Equal(T0, lai.Load()!.TuChoiTu);
            lai.UpdateIf(c => MoCoi.ApDung(c, T0.AddHours(6.5)));
            var cfg = lai.Load()!;
            Assert.Equal(CheDoAgent.GiamSat, cfg.CheDo);
            Assert.Null(cfg.LastPolicyJson);
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }
}

/// <summary>Ghi lại thứ tự mọi lời gọi hệ thống / mạng để kiểm thứ tự gỡ.</summary>
internal sealed class SoGhi
{
    public readonly List<string> Ds = new();
    public void Ghi(string s) { lock (Ds) Ds.Add(s); }
    public int Vi(string s) => Ds.IndexOf(s);
}

internal sealed class FakeOps : ICleanupOps
{
    private readonly SoGhi _g;
    public bool XoaHet = true;
    public string? NemLoiO;
    /// <summary>B: nếu đặt, TraQuyenQuanTri đọc DaHaQuyen từ đây (và XoaCauHinh xoá nó) ⇒ kiểm «trả quyền TRƯỚC khi xoá cấu hình».</summary>
    public ConfigStore? Store;
    public readonly List<string> QuyenTra = new();
    public FakeOps(SoGhi g) { _g = g; }
    private void B(string s) { _g.Ghi(s); if (s == NemLoiO) throw new InvalidOperationException("hỏng " + s); }
    public void TatKhoiPhucDichVu() => B("tat_khoi_phuc");
    public void DungVaXoaDichVu() => B("dung_xoa_dich_vu");
    public void HenDonTachRoi() => B("hen_don");
    public void GoAppLocker() => B("applocker");
    public void TraQuyenQuanTri()
    {
        // Đọc cấu hình (DaHaQuyen) giống WindowsCleanupOps thật — phải đọc ĐƯỢC ⇒ chạy trước XoaCauHinh.
        if (Store != null) foreach (var q in Store.Load()?.DaHaQuyen ?? new()) QuyenTra.Add(q.Sid);
        B("tra_quyen");
    }
    public void GoKhay() => B("khay");
    public void GoThongBaoDangNhap() => B("thong_bao");
    public void GoMucUngDung() => B("muc_ung_dung");
    public void XoaCauHinh() { Store?.Delete(); B("xoa_cau_hinh"); }
    public bool XoaThuMuc() { B("xoa_thu_muc"); return XoaHet; }
}

public class GoCaiDatTests
{
    // Gỡ TỪ XA (dịch vụ tự dọn phần còn lại sau khi đã gỡ AppLocker + trả quyền + ack — CommandProcessor điều phối, test ở SyncAndUninstallTests).
    [Fact]
    public void DonPhanConLai_KhongTuDungChinhMinh_TatKhoiPhuc_HenDon_KhongDungApplockerHayTraQuyen()
    {
        var g = new SoGhi();
        SystemCleanup.DonPhanConLai(new FakeOps(g));
        Assert.True(g.Vi("tat_khoi_phuc") < g.Vi("hen_don"));
        Assert.DoesNotContain("dung_xoa_dich_vu", g.Ds);   // không tự Stop/delete chính mình (tác vụ tách rời làm)
        Assert.DoesNotContain("xoa_thu_muc", g.Ds);
        Assert.DoesNotContain("applocker", g.Ds);          // đã gỡ ở cổng riêng
        Assert.DoesNotContain("tra_quyen", g.Ds);          // đã trả ở bước riêng
        foreach (var b in new[] { "khay", "thong_bao", "muc_ung_dung", "xoa_cau_hinh" }) Assert.Contains(b, g.Ds);
    }

    [Fact]
    public void TuSetup_DungDichVu_GoAppLockerCong_TraQuyenTruocXoaCauHinh_XoaHetThiKhongHen()
    {
        var g = new SoGhi();
        var kq = SystemCleanup.Run(new FakeOps(g), tuDichVu: false);
        Assert.True(kq.AppLockerGo && kq.QuyenAdminTra && kq.Xong);
        Assert.Equal(0, g.Vi("tat_khoi_phuc"));
        Assert.True(g.Vi("dung_xoa_dich_vu") < g.Vi("applocker"), "dừng dịch vụ trước ⇒ không áp lại luật ngay sau khi gỡ");
        Assert.True(g.Vi("tra_quyen") < g.Vi("xoa_cau_hinh"), "trả quyền admin phải TRƯỚC khi xoá cấu hình (cần đọc DaHaQuyen)");
        Assert.True(g.Vi("xoa_cau_hinh") < g.Vi("xoa_thu_muc"));
        Assert.DoesNotContain("hen_don", g.Ds);

        var g2 = new SoGhi();
        SystemCleanup.Run(new FakeOps(g2) { XoaHet = false }, tuDichVu: false);
        Assert.Equal("hen_don", g2.Ds[^1]);   // còn tệp (Setup đang chạy từ thư mục cài) ⇒ hẹn xoá nốt
    }

    // A (gỡ tại máy): gỡ luật AppLocker HỎNG ⇒ CỔNG chặn: KHÔNG trả quyền / xoá cấu hình / xoá tệp; hẹn tác vụ tách rời (gỡ luật) làm lưới đỡ; báo lỗi rõ.
    [Fact]
    public void TuSetup_GoAppLockerLoi_ChanLaiKhongXoaCauHinh_HenTacVuDoPhong()
    {
        var g = new SoGhi();
        var kq = SystemCleanup.Run(new FakeOps(g) { NemLoiO = "applocker" }, tuDichVu: false);
        Assert.False(kq.AppLockerGo);
        Assert.Contains("✗ Gỡ luật AppLocker", kq.Log);
        Assert.Contains(SystemCleanup.CanhBaoAppLocker.Split('\n')[0], kq.Log);
        // 🟠2 vòng 3: trả quyền admin TRƯỚC cổng AppLocker ⇒ gỡ luật hỏng vẫn không để Con bị hạ quyền
        Assert.True(kq.QuyenAdminTra);
        Assert.True(g.Vi("dung_xoa_dich_vu") < g.Vi("tra_quyen") && g.Vi("tra_quyen") < g.Vi("applocker"));
        Assert.DoesNotContain("xoa_cau_hinh", g.Ds);
        Assert.DoesNotContain("xoa_thu_muc", g.Ds);
        Assert.Contains("hen_don", g.Ds);   // lưới đỡ: tác vụ tách rời cũng gỡ luật + dọn
        // chạy lại khi AppLocker gỡ được ⇒ đi tới cùng
        var lan2 = new SoGhi();
        Assert.True(SystemCleanup.Run(new FakeOps(lan2), tuDichVu: false).AppLockerGo);
        Assert.Contains("xoa_cau_hinh", lan2.Ds);
    }

    private static ConfigStore Store(string dir, AgentConfig? cfg)
    {
        var s = new ConfigStore(Path.Combine(dir, "config.json"), b => b, b => b);
        if (cfg != null) s.Save(cfg);
        return s;
    }

    [Fact]
    public async Task GoTaiMay_BaoMayChuTruocKhiXoaToken()
    {
        var dir = Path.Combine(Path.GetTempPath(), "aii-go-" + Guid.NewGuid().ToString("N"));
        try
        {
            var g = new SoGhi();
            var store = Store(dir, new AgentConfig { Server = "https://x", Token = "tok" });
            string? tokenDaGui = null;
            var kq = await LocalUninstall.RunAsync(store, (c, ct) => { tokenDaGui = c.Token; g.Ghi("da_go"); return Task.CompletedTask; }, new FakeOps(g));
            Assert.Equal("tok", tokenDaGui);
            Assert.True(kq.AppLockerGo && kq.Xong);
            Assert.Equal(0, g.Vi("da_go"));
            Assert.True(g.Vi("da_go") < g.Vi("xoa_cau_hinh"));
            Assert.Contains("Đã báo máy chủ", kq.Log);
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    // B: cài hạ quyền ⇒ lưu DaHaQuyen; gỡ ⇒ TRẢ LẠI quyền (đọc DaHaQuyen) TRƯỚC khi xoá cấu hình. Trả lỗi ⇒ báo rõ (QuyenAdminTra=false).
    [Fact]
    public async Task GoTaiMay_TraQuyenAdminTheoCauHinh_TruocKhiXoaCauHinh()
    {
        var dir = Path.Combine(Path.GetTempPath(), "aii-go-" + Guid.NewGuid().ToString("N"));
        try
        {
            const string sid = "S-1-5-21-1-2-3-1001";
            var store = Store(dir, new AgentConfig { Server = "https://x", Token = "tok",
                DaHaQuyen = { new QuyenDaHa { Sid = sid, Nhom = "S-1-5-32-544" } } });
            var ops = new FakeOps(new SoGhi()) { Store = store };
            var kq = await LocalUninstall.RunAsync(store, (c, ct) => Task.CompletedTask, ops);
            Assert.True(kq.QuyenAdminTra);
            Assert.Equal(new[] { sid }, ops.QuyenTra);          // đã trả đúng SID đã hạ (đọc được DaHaQuyen ⇒ trước XoaCauHinh)
            Assert.Null(store.Load());                          // cấu hình đã xoá sau cùng

            // trả quyền hỏng ⇒ vẫn gỡ nhưng BÁO RÕ (QuyenAdminTra=false) để người gỡ biết
            var store2 = Store(dir + "-2", new AgentConfig { Server = "https://x", Token = "tok",
                DaHaQuyen = { new QuyenDaHa { Sid = sid } } });
            var ops2 = new FakeOps(new SoGhi()) { Store = store2, NemLoiO = "tra_quyen" };
            var kq2 = await LocalUninstall.RunAsync(store2, (c, ct) => Task.CompletedTask, ops2);
            Assert.False(kq2.QuyenAdminTra);
            Assert.True(kq2.AppLockerGo && kq2.Xong);
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    // 🟠2 vòng 3: gỡ tại máy, AppLocker HỎNG ⇒ vẫn đã trả quyền admin (đọc DaHaQuyen), cấu hình còn nguyên (để thử lại / tác vụ dọn).
    [Fact]
    public async Task GoTaiMay_AppLockerLoi_VanTraQuyenAdmin()
    {
        var dir = Path.Combine(Path.GetTempPath(), "aii-go-" + Guid.NewGuid().ToString("N"));
        try
        {
            const string sid = "S-1-5-21-1-2-3-1001";
            var store = Store(dir, new AgentConfig { Server = "https://x", Token = "tok",
                DaHaQuyen = { new QuyenDaHa { Sid = sid, Nhom = "S-1-5-32-544" } } });
            var g = new SoGhi();
            var ops = new FakeOps(g) { Store = store, NemLoiO = "applocker" };
            var kq = await LocalUninstall.RunAsync(store, (c, ct) => Task.CompletedTask, ops);
            Assert.False(kq.AppLockerGo);
            Assert.False(kq.Xong);
            Assert.True(kq.QuyenAdminTra);
            Assert.Equal(new[] { sid }, ops.QuyenTra);
            Assert.True(g.Vi("tra_quyen") < g.Vi("applocker"));
            Assert.NotNull(store.Load());                  // chưa xoá cấu hình
            Assert.Contains("hen_don", g.Ds);
            Assert.DoesNotContain("Setup.exe", kq.Log);     // không trỏ tới tệp mà tác vụ dọn sẽ xoá
            Assert.Contains(SystemCleanup.LenhGoTayAppLocker, kq.Log);
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    [Fact]
    public void CanhBaoAppLocker_LenhPowerShellChiGoLuatAiiGrow()
    {
        Assert.DoesNotContain("Setup.exe", SystemCleanup.CanhBaoAppLocker);
        Assert.Contains("quyền quản trị", SystemCleanup.CanhBaoAppLocker);
        var l = SystemCleanup.LenhGoTayAppLocker;
        Assert.Contains("Get-AppLockerPolicy -Local -Xml -ErrorAction Stop", l);
        Assert.Contains("'AiiGrow: *'", l);
        Assert.Contains("Set-AppLockerPolicy -XmlPolicy $f -ErrorAction Stop", l);
        Assert.DoesNotContain("-Merge", l);
    }

    // 🟡 vòng 3: cài lại đè lên máy đã hạ quyền ⇒ GỘP DaHaQuyen, không ghi đè mất.
    [Fact]
    public void CaiLai_GopDaHaQuyen_KhongGhiDe()
    {
        var dir = Path.Combine(Path.GetTempPath(), "aii-cailai-" + Guid.NewGuid().ToString("N"));
        try
        {
            const string sid = "S-1-5-21-1-2-3-1001";
            var store = Store(dir, new AgentConfig { Server = "https://x", Token = "cu", DaHaQuyen = { new QuyenDaHa { Sid = sid } } });
            CaiLai.GhiGiuQuyen(store, new AgentConfig { Server = "https://x", Token = "moi" });   // Con lúc này IsAdmin=false ⇒ bộ cài không thêm gì
            var c = store.Load()!;
            Assert.Equal("moi", c.Token);
            Assert.Single(c.DaHaQuyen);
            Assert.Equal(sid, c.DaHaQuyen[0].Sid);
            // cài lại lần nữa + hạ thêm đúng tài khoản đó ⇒ không trùng; tài khoản khác ⇒ thêm
            CaiLai.GhiGiuQuyen(store, new AgentConfig { Server = "https://x", Token = "moi2", DaHaQuyen = { new QuyenDaHa { Sid = sid } } });
            Assert.False(CaiLai.ThemDaHa(store.Load()!, sid));
            store.UpdateIf(x => CaiLai.ThemDaHa(x, "S-1-5-21-1-2-3-1002"));
            Assert.Equal(new[] { sid, "S-1-5-21-1-2-3-1002" }, store.Load()!.DaHaQuyen.Select(q => q.Sid));
            // máy mới (chưa có cấu hình) ⇒ chỉ có danh sách mới
            var moi = Store(dir + "-moi", null);
            CaiLai.GhiGiuQuyen(moi, new AgentConfig { Server = "https://x", Token = "t" });
            Assert.Empty(moi.Load()!.DaHaQuyen);
        }
        finally { try { Directory.Delete(dir, true); } catch { } try { Directory.Delete(dir + "-moi", true); } catch { } }
    }

    [Fact]
    public async Task GoTaiMay_KhongBaoDuoc_VanGoSach()
    {
        var dir = Path.Combine(Path.GetTempPath(), "aii-go-" + Guid.NewGuid().ToString("N"));
        try
        {
            var g = new SoGhi();
            var store = Store(dir, new AgentConfig { Server = "https://x", Token = "tok" });
            var kq = await LocalUninstall.RunAsync(store, (c, ct) => throw new ApiException("mất mạng"), new FakeOps(g));
            Assert.Contains("Chưa báo được máy chủ", kq.Log);
            Assert.Contains("xoa_cau_hinh", g.Ds);
            // token đã bị thu hồi (máy đã rời gia đình) ⇒ coi như đã báo
            var g2 = new SoGhi();
            var kq2 = await LocalUninstall.RunAsync(store, (c, ct) => throw new ApiException("token_sai", 401), new FakeOps(g2));
            Assert.Contains("không còn trong gia đình", kq2.Log);
            // chưa ghép / đã gỡ rồi ⇒ không gọi máy chủ, vẫn dọn
            var g3 = new SoGhi();
            await LocalUninstall.RunAsync(Store(dir + "-trong", null), (c, ct) => { g3.Ghi("da_go"); return Task.CompletedTask; }, new FakeOps(g3));
            Assert.DoesNotContain("da_go", g3.Ds);
            Assert.Contains("xoa_cau_hinh", g3.Ds);
        }
        finally { try { Directory.Delete(dir, true); } catch { } }
    }

    // A: tác vụ dọn tách rời (SYSTEM) cũng GỠ LUẬT APPLOCKER của mình, và CHỈ tự huỷ khi hết luật + hết tệp.
    [Fact]
    public void KichBanDon_GoAppLocker_ChoDichVuDung_ChiTuXoaKhiSachLuatVaTep()
    {
        var k = SystemCleanup.KichBanDonTachRoi("AiiGrowService", @"C:\Program Files\AiiGrow", @"C:\ProgramData\Ai'iGrow", AppsEntry.Key);
        Assert.Contains("Status -eq 'Stopped'", k);
        Assert.Contains("start= disabled", k);
        Assert.Contains("sc.exe delete $n", k);
        Assert.Contains(@"'C:\ProgramData\Ai''iGrow'", k);   // nháy đơn được thoát
        Assert.Contains(@"HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\AiiGrow", k);
        Assert.True(k.IndexOf("Stop-Service") < k.IndexOf("sc.exe delete"));
        // gỡ luật AppLocker của AiiGrow (theo tiền tố) + chỉ tự huỷ khi sạch luật VÀ sạch tệp
        Assert.Contains("Get-AppLockerPolicy -Local -Xml", k);
        Assert.Contains("Set-AppLockerPolicy", k);
        Assert.Contains("'AiiGrow: '", k);
        Assert.Contains("if($luatSach -and $tepSach){ Unregister-ScheduledTask -TaskName 'AiiGrow-Dontay'", k);
        // 🟡 vòng 3: lỗi Get-AppLockerPolicy (kể cả lỗi không dừng) / chính sách $null ⇒ CHƯA sạch (không tự huỷ nhầm)
        Assert.Contains("Get-AppLockerPolicy -Local -Xml -ErrorAction Stop", k);
        Assert.Contains("Set-AppLockerPolicy -XmlPolicy $f -ErrorAction Stop", k);
        Assert.Contains("if ($null -eq $p -or", k);
        Assert.Contains("if ($null -eq $c -or", k);
        Assert.Contains("# không có tài khoản nào bị hạ quyền", k);
    }

    // 🟠2 vòng 3: tác vụ dọn mang SID để TRẢ QUYỀN làm lưới đỡ (trước khi xoá thư mục dữ liệu chứa DaHaQuyen); SID lạ không nhúng.
    [Fact]
    public void KichBanDon_NhungSidTraQuyenAdmin()
    {
        var k = SystemCleanup.KichBanDonTachRoi("AiiGrowService", @"C:\P", @"C:\D", AppsEntry.Key, new[]
        {
            new QuyenDaHa { Sid = "S-1-5-21-1-2-3-1001", Nhom = "S-1-5-32-544" },
            new QuyenDaHa { Sid = "S-1-5-21-1-2-3-1001", Nhom = "S-1-5-32-544" },   // trùng ⇒ một lần
            new QuyenDaHa { Sid = "x'; Remove-Item C:\\ -Recurse; '", Nhom = "S-1-5-32-544" },   // không phải SID ⇒ bỏ
        });
        const string dong = "try { Add-LocalGroupMember -SID 'S-1-5-32-544' -Member 'S-1-5-21-1-2-3-1001' -ErrorAction Stop } catch {}";
        Assert.Contains(dong, k);
        Assert.Equal(k.IndexOf(dong), k.LastIndexOf(dong));   // trùng ⇒ một lần
        var k2 = SystemCleanup.KichBanDonTachRoi("s", @"C:\P", @"C:\D", AppsEntry.Key, new[]
            { new QuyenDaHa { Sid = "S-1-5-21-1-2-3-1001" }, new QuyenDaHa { Sid = "S-1-5-21-1-2-3-1002" } });
        Assert.Contains("-Member 'S-1-5-21-1-2-3-1002'", k2);
        Assert.Contains("-Member 'S-1-5-21-1-2-3-1001'", k2);
        Assert.DoesNotContain("Remove-Item C:", k);
        Assert.True(k.IndexOf("Add-LocalGroupMember") < k.IndexOf("Remove-Item -LiteralPath 'C:\\D'"), "trả quyền trước khi xoá dữ liệu");
    }
}
