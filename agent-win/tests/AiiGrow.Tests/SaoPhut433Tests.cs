using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>#433 phần A — bộ đếm phút chơi (trừ sao) của agent Windows.</summary>
public class SaoPhut433Tests
{
    private static readonly DateTimeOffset Luc = new(2026, 11, 19, 15, 0, 0, TimeSpan.FromHours(7));

    private static string TepTam() => Path.Combine(Path.GetTempPath(), "aiig-433-" + Guid.NewGuid().ToString("N") + ".json");

    /// <summary>A1: mất mạng giữa lượt đồng bộ ⇒ lần sau gửi đúng TỔNG đã chơi, không cộng đôi phần gửi lỗi (trước đây: Restore về bộ đếm mà tổng đã cộng).</summary>
    [Fact]
    public void A1_GuiLoi_ThuLai_KhongCongDoi()
    {
        var dem = new UsageTracker();
        var tong = new UsageTotals();
        dem.Add(Luc, "roblox.exe", "Roblox", 5 * 60, "be-a");
        tong.Add(dem.Drain());
        var lan1 = tong.CanGui("may-1");
        Assert.Equal(5, lan1.Single().Minutes);
        // gửi lỗi (mất mạng): không DaGui, không trả lại bộ đếm. 30 giây sau thử lại nhiều lần, bé chơi thêm 2 phút
        for (int i = 0; i < 4; i++) { tong.Add(dem.Drain()); Assert.Equal(5, tong.CanGui("may-1").Single().Minutes); }
        dem.Add(Luc.AddMinutes(5), "roblox.exe", "Roblox", 2 * 60, "be-a");
        tong.Add(dem.Drain());
        var lan2 = tong.CanGui("may-1");
        Assert.Equal(7, lan2.Single().Minutes);
        Assert.Equal("be-a", lan2.Single().Con);
        tong.DaGui(lan2);
        Assert.Empty(tong.CanGui("may-1"));   // máy chủ đã nhận ⇒ không gửi lại
        dem.Add(Luc.AddMinutes(8), "roblox.exe", "Roblox", 60, "be-a");
        tong.Add(dem.Drain());
        Assert.Equal(8, tong.CanGui("may-1").Single().Minutes);
    }

    /// <summary>A2: dịch vụ khởi động lại / cập nhật ⇒ đếm TIẾP từ tổng đã lưu, không về 0 (máy chủ greatest ⇒ về 0 là chơi miễn phí tới khi vượt số cũ).</summary>
    [Fact]
    public void A2_KhoiDongLai_DemTiepTuTongDaLuu()
    {
        var tep = TepTam();
        try
        {
            var t1 = new UsageTotals();
            t1.DungTep(tep);
            t1.CanGui("may-1");
            t1.Add(new[] { new UsageEntry("2026-11-19", "roblox.exe", "Roblox", 30, "be-a") });
            var gui = t1.CanGui("may-1");
            t1.DaGui(gui);

            var t2 = new UsageTotals();   // tiến trình mới
            t2.DungTep(tep);
            t2.Add(new[] { new UsageEntry("2026-11-19", "Roblox.exe", "Roblox", 1, "be-a") });
            Assert.Equal(31, t2.CanGui("may-1").Single().Minutes);
        }
        finally { try { File.Delete(tep); } catch (IOException) { } }
    }

    /// <summary>A2: tổng chưa gửi được (mất mạng) cũng giữ qua khởi động lại.</summary>
    [Fact]
    public void A2_ChuaGui_KhoiDongLai_VanGui()
    {
        var tep = TepTam();
        try
        {
            var t1 = new UsageTotals();
            t1.DungTep(tep);
            t1.Add(new[] { new UsageEntry("2026-11-19", "roblox.exe", "Roblox", 12) });
            var t2 = new UsageTotals();
            t2.DungTep(tep);
            Assert.Equal(12, t2.CanGui("may-1").Single().Minutes);
        }
        finally { try { File.Delete(tep); } catch (IOException) { } }
    }

    /// <summary>Ghép lại (id máy khác) ⇒ bỏ tổng của bản ghi máy cũ (máy chủ của bản ghi mới chưa có gì — gửi số cũ là trừ sao oan).</summary>
    [Fact]
    public void A2_GhepLai_MayKhac_BoTongCu()
    {
        var tep = TepTam();
        try
        {
            var t1 = new UsageTotals();
            t1.DungTep(tep);
            t1.CanGui("may-1");
            t1.Add(new[] { new UsageEntry("2026-11-19", "roblox.exe", "Roblox", 40) });
            var t2 = new UsageTotals();
            t2.DungTep(tep);
            // như AgentWorker: gắn máy TRƯỚC khi cộng phút mới ⇒ bỏ 40 cũ, giữ 2 phút vừa đếm
            t2.ChoMay("may-2");
            t2.Add(new[] { new UsageEntry("2026-11-19", "roblox.exe", "Roblox", 2) });
            Assert.Equal(2, t2.CanGui("may-2").Single().Minutes);
        }
        finally { try { File.Delete(tep); } catch (IOException) { } }
    }

    [Theory]
    [InlineData("{hong")]
    [InlineData("{\"may\":\"x\",\"dong\":null}")]
    [InlineData("{\"dong\":[null]}")]
    public void A2_TepHong_KhongNem(string noiDung)
    {
        var tep = TepTam();
        try
        {
            File.WriteAllText(tep, noiDung);
            var t = new UsageTotals();
            t.DungTep(tep);
            t.ChoMay("may-1");
            t.Add(new[] { new UsageEntry("2026-11-19", "roblox.exe", "Roblox", 3) });
            Assert.Equal(3, t.CanGui("may-1").Single().Minutes);
        }
        finally { try { File.Delete(tep); } catch (IOException) { } }
    }

    /// <summary>Đồng hồ từng chạy nhanh (tệp có ngày «tương lai») rồi được chỉnh lại ⇒ không đẩy ngày hôm nay ra khỏi tổng.</summary>
    [Fact]
    public void A2_NgayTuongLaiTrongTep_KhongDayHomNayRa()
    {
        var t = new UsageTotals();
        foreach (var d in new[] { "2030-01-01", "2030-01-02", "2030-01-03" }) t.Add(new[] { new UsageEntry(d, "roblox.exe", "Roblox", 5) });
        t.Add(new[] { new UsageEntry("2026-11-19", "roblox.exe", "Roblox", 4) });
        t.Add(new[] { new UsageEntry("2026-11-19", "roblox.exe", "Roblox", 1) });
        var gui = t.CanGui("may-1");
        Assert.Equal(5, gui.Single(x => x.Day == "2026-11-19").Minutes);
        Assert.DoesNotContain(gui, x => x.Day.StartsWith("2030"));
    }

    /// <summary>A8: giây lẻ chưa gửi (dưới 1 phút) — agent đếm sẵn vào quỹ sau mỗi lần đồng bộ (số sao máy chủ trả về chưa trừ phần này).</summary>
    [Fact]
    public void A8_GiayChuaGui_ChiAppTinhPhut_DungBe()
    {
        var dem = new UsageTracker();
        dem.Add(Luc, "roblox.exe", "Roblox", 150, "be-a");     // 2 phút 30 giây
        dem.Add(Luc, "scratch.exe", "Scratch", 50, "be-a");    // app học
        dem.Add(Luc, "roblox.exe", "Roblox", 20, "be-b");
        dem.Add(Luc, "roblox.exe", "Roblox", 70);              // dòng không bé
        dem.Add(Luc.AddDays(-1), "roblox.exe", "Roblox", 40, "be-a");   // giây lẻ hôm qua: không bao giờ gửi nữa
        dem.Drain();
        bool tinh(string a) => a == "roblox.exe";
        Assert.Equal(30.0, dem.GiayChuaGui(Luc, tinh, "be-a"), 3);
        Assert.Equal(10.0, dem.GiayChuaGui(Luc, tinh), 3);
        Assert.Equal(0.0, dem.GiayChuaGui(Luc, a => false, "be-a"), 3);
        Assert.Equal(0.0, dem.GiayChuaGui(Luc.AddDays(1), tinh, "be-a"), 3);
    }

    /// <summary>A7: lùi đồng hồ về trước lúc dùng mã (mã TOTP vẫn hợp lệ ở bước cũ) ⇒ «mã đã dùng», không mở thêm lượt.</summary>
    [Fact]
    public void A7_LuiGio_DungLaiMaCu_KhongMo()
    {
        const string biMat = "bi-mat-may-con-thu";
        var moc = DateTimeOffset.FromUnixTimeSeconds(1_700_000_100);
        var ma = MaOffline.Ma(biMat, moc);
        var st = new MoTamOffline();
        Assert.Equal(KetQuaMoOffline.DaMo, st.TryUnlock(biMat, ma, moc));
        // mã còn hợp lệ ở mốc lùi (dung sai ±1 bước) — điều kiện để lỗi cũ xảy ra
        var lui = moc.AddMinutes(-4);
        Assert.NotNull(MaOffline.KiemPhut(biMat, ma, lui));
        Assert.Equal(KetQuaMoOffline.DaDung, st.TryUnlock(biMat, ma, lui));
        Assert.False(st.IsUnlocked(lui));
    }

    /// <summary>A7: mã cũ hơn mã cuối (A rồi B) — lùi giờ về lúc A còn hợp lệ vẫn không dùng lại được A.</summary>
    [Fact]
    public void A7_LuiGio_DungLaiMaTruocMaCuoi_KhongMo()
    {
        const string biMat = "bi-mat-may-con-thu";
        var mocA = DateTimeOffset.FromUnixTimeSeconds(1_700_000_100);
        var maA = MaOffline.Ma(biMat, mocA);
        var st = new MoTamOffline();
        Assert.Equal(KetQuaMoOffline.DaMo, st.TryUnlock(biMat, maA, mocA));
        var mocB = mocA.AddHours(2);
        Assert.Equal(KetQuaMoOffline.DaMo, st.TryUnlock(biMat, MaOffline.Ma(biMat, mocB), mocB));
        Assert.Equal(KetQuaMoOffline.DaDung, st.TryUnlock(biMat, maA, mocA.AddMinutes(1)));
    }
}
