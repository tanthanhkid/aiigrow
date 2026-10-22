using AiiGrow.Core;

namespace AiiGrow.Tests;

public class MoTamOfflineTests
{
    private const string BiMat = "bi-mat-may-con-thu";
    private static readonly DateTimeOffset Moc = DateTimeOffset.FromUnixTimeMilliseconds(1_700_000_000_000);

    private static string MaSai(DateTimeOffset now)
    {
        // một mã 6 số chắc chắn không khớp bước nào trong dung sai
        var dung = new[] { -1, 0, 1 }.Select(i => MaOffline.Ma(BiMat, now.AddSeconds(i * MaOffline.BuocGiay))).ToHashSet();
        for (int i = 0; ; i++) { var m = i.ToString("D6"); if (!dung.Contains(m)) return m; }
    }

    [Fact]
    public void MaDung_Mo60Phut()
    {
        var st = new MoTamOffline();
        Assert.Equal(KetQuaMoOffline.DaMo, st.TryUnlock(BiMat, MaOffline.Ma(BiMat, Moc), Moc));
        Assert.True(st.IsUnlocked(Moc.AddMinutes(59)));
        Assert.Equal(Moc.AddMinutes(60), st.UnlockUntil);
        Assert.StartsWith("Đã mở 60 phút", st.Cau(KetQuaMoOffline.DaMo, Moc));
    }

    [Fact]
    public void MaSai_KhongMo()
    {
        var st = new MoTamOffline();
        Assert.Equal(KetQuaMoOffline.Sai, st.TryUnlock(BiMat, MaSai(Moc), Moc));
        Assert.False(st.IsUnlocked(Moc));
        Assert.Equal(KetQuaMoOffline.Sai, st.TryUnlock(BiMat, "12", Moc.AddSeconds(1)));
        Assert.Equal("Mã chưa đúng. Con nhờ Ba Mẹ đọc lại nhé.", st.Cau(KetQuaMoOffline.Sai, Moc));
    }

    [Fact]
    public void ChuaCoBiMat_KhongTinhLaSai()
    {
        var st = new MoTamOffline();
        Assert.Equal(KetQuaMoOffline.ChuaCoBiMat, st.TryUnlock(null, "123456", Moc));
        Assert.Empty(st.WrongAt);
    }

    [Fact]
    public void Sai5Lan_PhaiCho_MaDungCungBiChan_Het10PhutThiDuoc()
    {
        var st = new MoTamOffline();
        for (int i = 0; i < MoTamOffline.SaiToiDa; i++)
            Assert.Equal(KetQuaMoOffline.Sai, st.TryUnlock(BiMat, MaSai(Moc), Moc.AddSeconds(i)));
        Assert.True(st.WaitSeconds(Moc.AddSeconds(5)) > 0);
        // đang bị chặn: kể cả mã đúng cũng không nhận (không dò được)
        var t = Moc.AddMinutes(2);
        Assert.Equal(KetQuaMoOffline.ChoThuLai, st.TryUnlock(BiMat, MaOffline.Ma(BiMat, t), t));
        Assert.Contains("Thử lại sau", st.Cau(KetQuaMoOffline.ChoThuLai, t));
        Assert.False(st.IsUnlocked(t));
        // hết cửa sổ 10 phút tính từ lần sai đầu ⇒ gõ lại được
        var sau = Moc.AddMinutes(MoTamOffline.CuaSoSaiPhut).AddSeconds(1);
        Assert.Equal(0, st.WaitSeconds(sau));
        Assert.Equal(KetQuaMoOffline.DaMo, st.TryUnlock(BiMat, MaOffline.Ma(BiMat, sau), sau));
    }

    [Fact]
    public void LuiDongHo_KhongXoaDuocLuotSai()
    {
        var st = new MoTamOffline();
        for (int i = 0; i < MoTamOffline.SaiToiDa; i++) st.TryUnlock(BiMat, MaSai(Moc), Moc);
        Assert.True(st.WaitSeconds(Moc.AddMinutes(-30)) > 0);
    }

    [Fact]
    public void HetHan_SauGioMo()
    {
        var st = new MoTamOffline();
        st.TryUnlock(BiMat, MaOffline.Ma(BiMat, Moc), Moc);
        Assert.False(st.IsUnlocked(Moc.AddMinutes(60)));
        Assert.False(st.IsUnlocked(Moc.AddMinutes(61)));
        // lùi đồng hồ về trước lúc mở cũng không còn mở
        Assert.False(st.IsUnlocked(Moc.AddMinutes(-10)));
    }

    [Fact]
    public void MotMaMotLuot_GoLaiKhongCongGio_HetMoThiKhongDungLai()
    {
        var st = new MoTamOffline();
        var ma = MaOffline.Ma(BiMat, Moc);
        Assert.Equal(KetQuaMoOffline.DaMo, st.TryUnlock(BiMat, ma, Moc, phut: 5));
        // gõ lại khi còn mở: không cộng thêm
        Assert.Equal(KetQuaMoOffline.DangMo, st.TryUnlock(BiMat, ma, Moc.AddMinutes(2), phut: 5));
        Assert.Equal(Moc.AddMinutes(5), st.UnlockUntil);
        // hết giờ mở, mã vẫn còn trong dung sai TOTP ⇒ không mở lại được
        var t = Moc.AddMinutes(6);
        Assert.True(MaOffline.Kiem(BiMat, ma, t)); // TOTP vẫn nhận ⇒ chính MoTamOffline phải chặn dùng lại
        Assert.Equal(KetQuaMoOffline.DaDung, st.TryUnlock(BiMat, ma, t, phut: 5));
        Assert.False(st.IsUnlocked(t));
        // mã mới của Ba Mẹ thì mở được
        var t2 = Moc.AddMinutes(11);
        var maMoi = MaOffline.Ma(BiMat, t2);
        if (maMoi != ma) Assert.Equal(KetQuaMoOffline.DaMo, st.TryUnlock(BiMat, maMoi, t2, phut: 5));
    }

    [Fact]
    public void ApDung_GoChanApp_HetGio_NhungGiuKhoaNgayVaGioNgu()
    {
        var hoc = new EffectivePolicy(false, null, null, null, true);
        Assert.False(MoTamOffline.ApDung(hoc, true).AppLockerWanted);
        Assert.True(MoTamOffline.ApDung(hoc, false).AppLockerWanted);

        var hetGio = new EffectivePolicy(true, LockReasons.HetGio, 0, null, true);
        Assert.False(MoTamOffline.ApDung(hetGio, true).Locked);

        foreach (var r in new[] { LockReasons.Khoa, LockReasons.Ngu })
        {
            var e = MoTamOffline.ApDung(new EffectivePolicy(true, r, null, null, false), true);
            Assert.True(e.Locked);
            Assert.Equal(r, e.LockReason);
        }
    }

    [Fact]
    public void OHienMa_ChiKhiMatMang_VaManKhoaChiKhiHetGio()
    {
        Assert.True(BlockScreenView.ShowOfflineCode(true));
        Assert.False(BlockScreenView.ShowOfflineCode(false));
        Assert.True(BlockScreenView.ShowOfflineCode(true, lockScreen: true, LockReasons.HetGio));
        Assert.False(BlockScreenView.ShowOfflineCode(true, lockScreen: true, LockReasons.Khoa));
        Assert.False(BlockScreenView.ShowOfflineCode(true, lockScreen: true, LockReasons.Ngu));
    }

    [Fact]
    public void TrangThai_LuuVaNapLai_QuaJson()
    {
        var cfg = new AgentConfig { Server = "s", Token = "t" };
        cfg.MoTamOffline.TryUnlock(BiMat, MaOffline.Ma(BiMat, Moc), Moc);
        var json = System.Text.Json.JsonSerializer.Serialize(cfg, Json.Options);
        var lai = System.Text.Json.JsonSerializer.Deserialize<AgentConfig>(json, Json.Options)!;
        Assert.True(lai.MoTamOffline.IsUnlocked(Moc.AddMinutes(30)));
        Assert.Equal(cfg.MoTamOffline.LastCode, lai.MoTamOffline.LastCode);
    }
}
