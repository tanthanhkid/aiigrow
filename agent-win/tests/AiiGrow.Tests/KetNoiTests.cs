using System.Text.Json;
using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>Chọn trạng thái kết nối của khay: dịch vụ không chạy / mất kết nối máy chủ / máy chưa ghép / bình thường, cộng chữ tooltip và mascot.</summary>
public class KetNoiTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 22, 14, 30, 0, TimeSpan.Zero);
    private static string Hm(DateTimeOffset t) => t.ToLocalTime().ToString("HH:mm");

    private static TrayState Ok() => new() { Paired = true, LastSyncAt = Now.AddMinutes(-1), MinutesLeft = 40 };

    [Fact]
    public void DichVuKhongTraLoi_LaDichVuKhongChay()
    {
        var k = KetNoiView.Chon(false, null);
        Assert.Equal(KetNoi.DichVuKhongChay, k.Loai);
        Assert.Equal("Dịch vụ AiiGrow không chạy", k.Dong);
        Assert.Equal("AiiGrow · Dịch vụ AiiGrow không chạy", k.Tooltip);
        Assert.False(k.DungIconKetNoi);
        Assert.True(k.Bao);
    }

    [Fact]
    public void DichVuKhongTraLoi_ThangMoiThu_KeCaTrangThaiCu()
        => Assert.Equal(KetNoi.DichVuKhongChay, KetNoiView.Chon(false, Ok()).Loai);

    [Fact]
    public void KhongToiMayChu_LaMatKetNoi_KemGioBatDau()
    {
        var s = Ok();
        s.Offline = true;
        s.OfflineSince = Now.AddMinutes(-12);
        var k = KetNoiView.Chon(true, s);
        Assert.Equal(KetNoi.MatKetNoi, k.Loai);
        Assert.Equal($"KHÔNG kết nối máy chủ từ {Hm(Now.AddMinutes(-12))} — kiểm tra Wi-Fi", k.Dong);
        Assert.Equal("AiiGrow · " + k.Dong, k.Tooltip);
        Assert.False(k.DungIconKetNoi);
    }

    [Fact]
    public void MatKetNoi_ChuaBietGio_BoCumTu()
    {
        var s = Ok();
        s.Offline = true;
        Assert.Equal("KHÔNG kết nối máy chủ — kiểm tra Wi-Fi", KetNoiView.Chon(true, s).Dong);
    }

    [Theory]
    [InlineData(false, false, false)]   // chưa ghép
    [InlineData(true, true, false)]     // mồ côi (token bị từ chối quá lâu)
    [InlineData(true, false, true)]     // máy chủ từ chối token (401)
    public void MayChuaGhep_BiGoHoacBi401(bool paired, bool moCoi, bool tokenRejected)
    {
        var s = new TrayState { Paired = paired, MoCoi = moCoi, TokenRejected = tokenRejected, Offline = true };
        var k = KetNoiView.Chon(true, s);
        Assert.Equal(KetNoi.ChuaGhep, k.Loai);
        Assert.Equal("Máy chưa ghép — mở AiiGrow-Setup để ghép lại", k.Dong);
        Assert.False(k.DungIconKetNoi);
    }

    [Fact]
    public void BinhThuong_DaKetNoi_TooltipCoGioDongBo()
    {
        var k = KetNoiView.Chon(true, Ok());
        Assert.Equal(KetNoi.DaKetNoi, k.Loai);
        Assert.Equal($"AiiGrow · Đã kết nối · đồng bộ lúc {Hm(Now.AddMinutes(-1))}", k.Tooltip);
        Assert.True(k.DungIconKetNoi);
        Assert.False(k.Bao);
    }

    [Fact]
    public void BinhThuong_ChuaDongBoLanNao_VanLaDaKetNoi()
    {
        var k = KetNoiView.Chon(true, new TrayState { Paired = true });
        Assert.Equal(KetNoi.DaKetNoi, k.Loai);
        Assert.Equal("AiiGrow · Đã kết nối", k.Tooltip);
    }

    [Fact]
    public void UuTien_DichVuHonChuaGhepHonMatKetNoi()
    {
        var s = new TrayState { Paired = true, Offline = true, TokenRejected = true };
        Assert.Equal(KetNoi.ChuaGhep, KetNoiView.Chon(true, s).Loai);          // 401 thắng «offline» (offline là hệ quả của 401)
        Assert.Equal(KetNoi.DichVuKhongChay, KetNoiView.Chon(false, s).Loai);  // không gọi được dịch vụ thì mọi cờ cũ đều không đáng tin
    }

    [Fact]
    public void Tooltip_ThemDongConLai_VaKhongQua127KyTu()
    {
        var s = Ok();
        var k = KetNoiView.Chon(true, s);
        var t = KetNoiView.Tooltip(k, s, Now, Now);
        Assert.EndsWith("\nCòn 40 phút", t);
        Assert.True(t.Length <= 127);
        var off = new TrayState { Paired = true, Offline = true, OfflineSince = Now, MinutesLeft = 5 };
        Assert.True(KetNoiView.Tooltip(KetNoiView.Chon(true, off), off, Now, Now).Length <= 127);
    }

    [Fact]
    public void Tooltip_MayKhoa_KhongNoiConLai()
    {
        var s = Ok();
        s.Locked = true;
        Assert.DoesNotContain("Còn", KetNoiView.Tooltip(KetNoiView.Chon(true, s), s, Now, Now));
    }

    [Fact]
    public void Tooltip_DichVuKhongChay_KhongDungTrangThaiCu()
    {
        var k = KetNoiView.Chon(false, null);
        Assert.Equal("AiiGrow · Dịch vụ AiiGrow không chạy", KetNoiView.Tooltip(k, null, Now, Now));
    }

    [Fact]
    public void TrayState_ChayQuaPipe_GiuTruongKetNoi()
    {
        var s = new TrayState { Paired = true, Offline = true, OfflineSince = Now, LastSyncAt = Now.AddHours(-1), TokenRejected = true };
        var back = JsonSerializer.Deserialize<TrayState>(JsonSerializer.Serialize(s, Json.Options), Json.Options)!;
        Assert.Equal(Now, back.OfflineSince);
        Assert.Equal(Now.AddHours(-1), back.LastSyncAt);
        Assert.True(back.TokenRejected);
        var req = JsonSerializer.Deserialize<PipeRequest>(JsonSerializer.Serialize(new PipeRequest { Cmd = PipeCmd.SyncNow }, Json.Options), Json.Options)!;
        Assert.Equal("sync-now", req.Cmd);
    }

    // ------------------------------------------------------------ mascot theo ngữ cảnh

    [Theory]
    [InlineData(MucApp.HomNay, KetNoi.DaKetNoi, false, "rob-goc")]
    [InlineData(MucApp.HomNay, KetNoi.DaKetNoi, true, "xong")]
    [InlineData(MucApp.HomNay, KetNoi.MatKetNoi, false, "trong-loi")]
    [InlineData(MucApp.HomNay, KetNoi.DichVuKhongChay, true, "trong-loi")]
    [InlineData(MucApp.NhiemVu, KetNoi.DaKetNoi, false, "so-tay")]
    [InlineData(MucApp.NhiemVu, KetNoi.DaKetNoi, true, "xong")]
    [InlineData(MucApp.PhanQua, KetNoi.DaKetNoi, false, "qua")]
    [InlineData(MucApp.TinNhan, KetNoi.DaKetNoi, false, "chi")]
    public void Mascot_DoiTheoMucVaTrangThai(MucApp muc, KetNoi kn, bool xong, string expected)
    {
        var name = MascotView.Chon(muc, kn, xong);
        Assert.Equal(expected, name);
        Assert.Contains(name, MascotView.TatCa);
    }

    // ------------------------------------------------------------ bấm toast ⇒ đúng mục

    private static HvTin Tin(string loai) => new() { Id = loai, Loai = loai };

    [Theory]
    [InlineData("nhiem_vu_moi", MucApp.NhiemVu)]
    [InlineData("giao_nhiem_vu", MucApp.NhiemVu)]
    [InlineData("duyet_nhiem_vu", MucApp.NhiemVu)]
    [InlineData("tu_choi_nhiem_vu", MucApp.NhiemVu)]
    [InlineData("can_bo_sung", MucApp.NhiemVu)]
    [InlineData("xac_nhan_qua", MucApp.ViQua)]
    [InlineData("huy_hieu", MucApp.ViQua)]
    [InlineData("loi_khen", MucApp.TinNhan)]
    [InlineData("loai_la", MucApp.TinNhan)]
    public void Toast_MoDungMuc(string loai, MucApp expected)
        => Assert.Equal(expected, HocVienView.MucChoTin(new[] { Tin(loai) }));

    [Fact]
    public void Toast_NhieuLoaiLan_MoTinNhan_CungLoai_MoMucDo()
    {
        Assert.Equal(MucApp.TinNhan, HocVienView.MucChoTin(new[] { Tin("duyet_nhiem_vu"), Tin("xac_nhan_qua") }));
        Assert.Equal(MucApp.NhiemVu, HocVienView.MucChoTin(new[] { Tin("giao_nhiem_vu"), Tin("nhiem_vu_moi") }));
    }
}
