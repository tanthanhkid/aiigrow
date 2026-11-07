using AiiGrow.Core;
using Xunit;

namespace AiiGrow.Tests;

// GET api/device/vi-qua (V1) — mẫu JSON lấy từ docs/API.md.
public class ViQuaMayTests
{
    private const string Mau = """
    {"con":{"id":"c1","ten":"Bảo Anh","avatar":"rob"},"sao":450,"saoGiu":50,
     "qua":[{"id":"q3","ten":"Đi xem phim","loai":"dac_quyen","sao":300,"hinh":"phim","moTa":"Chỉ cuối tuần","menhGia":null,"laVoucher":false,"du":true,"conThieu":0,"choTraoTu":null,
             "dieuKien":{"chiCuoiTuan":true,"toiDaThang":null,"daDoiThang":0,"tonKho":null},"conHopLe":false,"lyDoKhong":"chi_cuoi_tuan","doiDuoc":false}],
     "phieuCho":[{"id":"p1","ten":"Chọn món bữa tối","loai":"dac_quyen","sao":50,"doiLuc":"2026-11-07T03:00:00.000Z"}],
     "daTrao":[{"id":"p2","ten":"AiiCafe 20k","loai":"voucher","sao":200,"traoLuc":"2026-11-07T03:05:00.000Z",
                "voucher":{"ma":"AGK3M9X2PQ7R","qr":"AGK3M9X2PQ7R","menhGia":20000,"trangThai":"da_phat_hanh","hetHan":"2027-01-06T03:05:00.000Z","conNgay":60}}],
     "voucher":[{"ten":"AiiCafe 20k","ma":"AGK3M9X2PQ7R","qr":"AGK3M9X2PQ7R","menhGia":20000,"trangThai":"da_phat_hanh","hetHan":"2027-01-06T03:05:00.000Z","conNgay":60,"dungLuc":null},
              {"ten":"AiiCafe 50k","ma":"AGOLD","menhGia":50000,"trangThai":"da_dung","hetHan":"2026-12-01T00:00:00.000Z","conNgay":0,"dungLuc":"2026-11-01T00:00:00.000Z"}],
     "huyHieu":[{"ma":"khoi_dau","ten":"Khởi đầu","moTa":"Nhiệm vụ đầu tiên được Ba Mẹ duyệt","datLuc":"2026-11-07T03:00:00.000Z"}]}
    """;

    private static ViQuaMay Doc() => HocVienView.Parse<ViQuaMay>(Mau)!;
    private static readonly DateTimeOffset Nay = DateTimeOffset.Parse("2026-11-07T04:00:00Z");

    [Fact]
    public void DocDuocMauMayChu()
    {
        var v = Doc();
        Assert.Equal("Bảo Anh", v.Con.Ten);
        Assert.Equal(450, v.Sao);
        Assert.Equal(50, v.SaoGiu);
        Assert.Single(v.PhieuCho);
        Assert.Equal("AGK3M9X2PQ7R", v.DaTrao[0].Voucher!.Qr);
        Assert.Equal("Khởi đầu", v.HuyHieu[0].Ten);
        Assert.True(v.Qua[0].DieuKien.ChiCuoiTuan);
    }

    [Fact]
    public void QuaBiDieuKienChan_NoiRoLyDo()
    {
        var q = Doc().Qua[0];
        Assert.False(q.DoiDuoc);
        var (chu, du) = ViQuaMayView.TrangThaiDoi(q);
        Assert.Equal("Quà này chỉ đổi vào cuối tuần", chu);
        Assert.False(du);
        q.LyDoKhong = "du_thang"; q.DieuKien.ToiDaThang = 2;
        Assert.Equal("Tháng này con đổi đủ 2 lần rồi", ViQuaMayView.LyDoKhong(q));
    }

    [Fact]
    public void TrangThaiDoi_DuSao_ThieuSao_ChoTrao()
    {
        Assert.Equal(("Đủ sao rồi!", true), ViQuaMayView.TrangThaiDoi(new ViQuaQua { Du = true, ConHopLe = true, DoiDuoc = true }));
        Assert.Equal(("Còn thiếu 20 sao", false), ViQuaMayView.TrangThaiDoi(new ViQuaQua { Du = false, ConThieu = 20 }));
        Assert.False(ViQuaMayView.TrangThaiDoi(new ViQuaQua { Du = true, ChoTraoTu = Nay, DoiDuoc = false }).Du);
    }

    [Fact]
    public void Voucher_QrChiKhiConDung_SapXepDungTruoc()
    {
        var v = Doc();
        Assert.True(ViQuaMayView.DungDuoc(v.Voucher[0], Nay));
        Assert.False(ViQuaMayView.DungDuoc(v.Voucher[1], Nay));
        Assert.False(ViQuaMayView.DungDuoc(v.Voucher[0], DateTimeOffset.Parse("2027-02-01T00:00:00Z")));   // quá hạn giữa hai lượt tải
        Assert.Equal("Còn 60 ngày", ViQuaMayView.ConNgay(v.Voucher[0], Nay));
        Assert.Equal("Voucher AiiCafe 20k", ViQuaMayView.TenVoucher(v.Voucher[0]));
        Assert.Equal("Đã dùng", ViQuaMayView.TrangThaiCu(v.Voucher[1]));
        Assert.Equal(new[] { "AGK3M9X2PQ7R", "AGOLD" }, ViQuaMayView.SapXepVoucher(v.Voucher.AsEnumerable().Reverse(), Nay).Select(x => x.Ma));
    }

    [Fact]
    public void MaQr_MaTranVuong_ChuaNoiDung()
    {
        var m = MaQr.MaTran("AGK3M9X2PQ7R");
        Assert.Equal(m.GetLength(0), m.GetLength(1));
        Assert.True(m.GetLength(0) >= 21);
        Assert.False(m[0, 0]);                          // lề trắng 4 ô
        Assert.True(m[4, 4] && m[4, 10] && m[10, 4]);   // góc định vị (finder pattern) trên trái
    }

    [Theory]
    [InlineData("GET", "vi-qua", true)]
    [InlineData("POST", "vi-qua", false)]
    [InlineData("GET", "vi-qua?x=1", false)]
    [InlineData("GET", "hoc-vien/vi-qua", true)]
    [InlineData("GET", "ho-so", false)]
    public void DuongViQuaMay(string m, string p, bool ok) => Assert.Equal(ok, HocVienPaths.Allowed(m, p));
}
