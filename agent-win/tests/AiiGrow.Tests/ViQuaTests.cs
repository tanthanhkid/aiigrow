using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>Mục «Ví quà & huy hiệu» (BANG-TINH-NANG-OS mục 15): đọc JSON máy chủ, chữ hiển thị, mã QR.</summary>
public class ViQuaTests
{
    [Fact]
    public void DocJsonMayChu_SnakeCase()
    {
        var vi = HocVienView.Parse<HvViQua>("""
            {"voucher":[{"ma":"AC-7K2P9Q","menh_gia":50000,"trang_thai":"da_phat_hanh","het_han":"2026-12-20T00:00:00Z","dung_luc":null},
                        {"ma":"AC-OLD","menh_gia":20000,"trang_thai":"da_dung","het_han":"2026-11-01T00:00:00Z","dung_luc":"2026-10-20T03:00:00Z"}],
             "phieu":[{"id":"p1","ten":"Đi xem phim","loai":"qua","diem":300,"trang_thai":"giu","created_at":"2026-10-24T03:00:00Z"}]}
            """)!;
        Assert.Equal(50000, vi.Voucher[0].MenhGia);
        var now = new DateTimeOffset(2026, 10, 25, 0, 0, 0, TimeSpan.Zero);
        Assert.Equal("AC-7K2P9Q", Assert.Single(ViQuaView.DungDuoc(vi, now)).Ma);
        Assert.StartsWith("Đã dùng", ViQuaView.TrangThaiCu(vi.Voucher[1]));
        Assert.Equal("Chờ Ba Mẹ trao", ViQuaView.PhieuCho(vi.Phieu[0]));
        Assert.Empty(ViQuaView.DungDuoc(vi, now.AddMonths(3)));   // quá hạn thì không hiện QR
    }

    [Fact]
    public void ThanhTich_QuyTac_Doc()
    {
        var tt = HocVienView.Parse<HvThanhTich>("""{"chuoiNgay":3,"soDu":40,"tongKiem":150,"capDo":{"cap":2,"diemCapSau":300,"conThieu":150},"huyHieu":[{"ma":"khoi_dau","ten":"Khởi đầu","mo_ta":"Nhiệm vụ đầu tiên","dat":true,"datLuc":"2026-10-01T00:00:00Z"},{"ma":"chuoi_7","ten":"7 ngày","mo_ta":"x","dat":false,"datLuc":null}]}""")!;
        Assert.Equal(0.25, ViQuaView.TienDo(tt), 3);   // cấp 2: mốc 100 → 300, đang 150
        Assert.Equal("Nhiệm vụ đầu tiên", tt.HuyHieu[0].MoTa);
        Assert.True(ViQuaView.SapXep(tt.HuyHieu)[0].Dat);
        var qt = HocVienView.Parse<HvQuyTac>("""{"lich":{"ngayThuong":[{"tu":"17:00","den":"20:00"}],"cuoiTuan":[],"ngu":{"tu":"21:30","den":"06:30"}},"tranNgay":120,"tranTuan":600,"phienToiDa":45,"nghiGiua":15,"giaPhut":{"game":1,"video_ngan":1.5,"mxh":2,"phim_gd":0},"nhiemVu":[],"qua":[]}""")!;
        Assert.Equal("17:00–20:00", ViQuaView.Khung(qt.Lich.NgayThuong));
        Assert.Equal("không có", ViQuaView.Khung(qt.Lich.CuoiTuan));
        Assert.Equal("1,5 điểm/phút", ViQuaView.Gia(qt.GiaPhut.VideoNgan));
        Assert.Equal("Không trừ điểm", ViQuaView.Gia(qt.GiaPhut.PhimGd));
    }

    [Theory]
    [InlineData(1, "Hạt giống")]
    [InlineData(10, "Rừng xanh")]
    [InlineData(99, "Rừng xanh")]
    public void TenCap(int cap, string ten) => Assert.Equal(ten, ViQuaView.TenCap(cap));

    [Fact]
    public void LenCap_TuCap10KhongHuaTenMoi()
    {
        Assert.Equal("Còn 60 điểm nữa lên cấp 4 «Mầm xanh»", ViQuaView.LenCap(new HvCapDo { Cap = 3, ConThieu = 60 }));
        Assert.Equal("Còn 500 điểm nữa lên cấp 11", ViQuaView.LenCap(new HvCapDo { Cap = 10, ConThieu = 500 }));
    }

    [Fact]
    public void Tien() => Assert.Equal("50.000đ", ViQuaView.Tien(50000));

    [Fact]
    public void MaQr_MaTranVuong_CoLe()
    {
        var m = MaQr.MaTran("AC-7K2P9Q");
        Assert.Equal(m.GetLength(0), m.GetLength(1));
        Assert.True(m.GetLength(0) >= 21);
        Assert.False(m[0, 0]);   // lề trắng quanh mã
    }

    [Theory]
    [InlineData("hoc-vien/vi-qua", true)]
    [InlineData("hoc-vien/thanh-tich", true)]
    [InlineData("hoc-vien/quy-tac", true)]
    public void DuongDuocPhep_ChiDoc(string p, bool ok)
    {
        Assert.Equal(ok, HocVienPaths.Allowed("GET", p));
        Assert.False(HocVienPaths.Allowed("POST", p));
    }
}
