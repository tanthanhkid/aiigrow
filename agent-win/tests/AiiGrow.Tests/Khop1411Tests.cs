using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>14/11 (docs/thiet-ke-chot/DOI-1411.md): «Thoát AiiGrow…» cần mã Ba Mẹ (con-ngay-thuong 24) + «Giỏi lắm! N ngày liền» (con-ngay-thuong 25).</summary>
public class Khop1411Tests
{
    [Fact]
    public void Thoat_chu_dung_thiet_ke()
    {
        Assert.Equal("Thoát AiiGrow…", ThoatView.Menu);
        Assert.Equal("Cần mã của Ba Mẹ", ThoatView.Tieu);
        Assert.Equal("Tắt hoặc gỡ AiiGrow phải có Ba Mẹ đồng ý", ThoatView.Phu);
        Assert.Equal("Mã 6 số trong app AiiGrow của Ba Mẹ", ThoatView.GhiMa);
        Assert.Equal("Thôi, quay lại", ThoatView.Quay);
    }

    [Fact]
    public void Thoat_vien_bao_Ba_Me_theo_ket_qua()
    {
        Assert.Equal("Đang báo Ba Mẹ…", ThoatView.ChipBao(null, null).Chu);
        Assert.Equal(("Ba Mẹ đã nhận thông báo", "chuong", true), ThoatView.ChipBao(true, "da_bao"));
        Assert.False(ThoatView.ChipBao(null, null).Cam);
        var cho = ThoatView.ChipBao(true, "cho_mang");
        Assert.True(cho.Cam);
        Assert.Contains("Có mạng", cho.Chu);
        Assert.True(ThoatView.ChipBao(false, null).Cam);
    }

    [Fact]
    public void Cau_loi_ma_dung_chung_Ba_Me_nhap_ma()
    {
        Assert.Equal("Mã chưa đúng · còn 4 lần thử", ManChonTenView.CauLoiMa("ma_sai", 4, null, null));
        Assert.Contains("10 phút", ManChonTenView.CauLoiMa("ma_tam_khoa", null, 600, null));
        Assert.Equal("Lỗi lạ", ManChonTenView.CauLoiMa("khac", null, null, "Lỗi lạ"));
        var st = new ManChonTenState { So = "123456" };
        ManChonTenView.KetQuaMa(st, false, "ma_da_dung", null, null, null);
        Assert.Equal(ManChonTenView.CauLoiMa("ma_da_dung", null, null, null), st.Loi);
        Assert.Equal("", st.So);
    }

    private static HvChuoi Chuoi(int soNgay, params bool[] co)
    {
        // 7 ô kết thúc ở Thứ Ba 2026-11-03 (như màn Hôm nay của thiết kế): T4 T5 T6 T7 CN T2 Nay
        var c = new HvChuoi { SoNgay = soNgay };
        for (int i = 0; i < 7; i++)
            c.Tuan.Add(new HvNgayChuoi { Ngay = new DateOnly(2026, 11, 3).AddDays(i - 6).ToString("yyyy-MM-dd"), Thu = (2 + 7 + i - 6) % 7, Co = co[i] });
        return c;
    }

    [Fact]
    public void Chuoi_chi_hien_khi_tu_2_ngay_hom_nay_co_viec_moi_ngay_mot_lan()
    {
        var c = Chuoi(5, false, false, true, true, true, true, true);
        Assert.True(ChuoiView.NenHien(c, null));
        Assert.False(ChuoiView.NenHien(c, "2026-11-03"), "đã hiện hôm nay");
        Assert.True(ChuoiView.NenHien(c, "2026-11-02"));
        Assert.False(ChuoiView.NenHien(Chuoi(1, false, false, false, false, false, false, true), null), "chuỗi 1 ngày: chưa chúc");
        Assert.False(ChuoiView.NenHien(Chuoi(4, false, false, true, true, true, true, false), null), "hôm nay chưa có việc được duyệt");
        Assert.False(ChuoiView.NenHien(null, null), "máy chủ cũ không gửi chuỗi");
    }

    [Fact]
    public void Chuoi_ten_thu_va_dong_phu()
    {
        var c = Chuoi(5, false, false, true, true, true, true, true);
        Assert.Equal(new[] { "T4", "T5", "T6", "T7", "CN", "T2", "Nay" }, c.Tuan.Select((d, i) => ChuoiView.Thu(d, i == 6)).ToArray());
        Assert.Equal("Làm đủ việc mỗi ngày · thêm 2 ngày nữa là tròn tuần", ChuoiView.Phu(5));
        Assert.Equal("Làm đủ việc mỗi ngày · tròn 1 tuần rồi!", ChuoiView.Phu(7));
        Assert.Equal("Làm đủ việc mỗi ngày · thêm 6 ngày nữa là tròn tuần", ChuoiView.Phu(8));
    }

    [Fact]
    public void Moi_len_cap_theo_nguong_may_chu()
    {
        // server/lib/vi.ts › capDo: cấp 2 từ 100, cấp 3 từ 300, cấp 4 từ 600 sao kiếm được
        Assert.True(ChuoiView.MoiLenCap(new HvCapDo { Cap = 3 }, 305, 10));
        Assert.True(ChuoiView.MoiLenCap(new HvCapDo { Cap = 3 }, 300, 10));
        Assert.False(ChuoiView.MoiLenCap(new HvCapDo { Cap = 3 }, 320, 10), "đã ở cấp 3 từ trước");
        Assert.False(ChuoiView.MoiLenCap(new HvCapDo { Cap = 1 }, 50, 10));
        Assert.False(ChuoiView.MoiLenCap(new HvCapDo { Cap = 2 }, 105, 0));
    }

    [Fact]
    public void Tong_quan_doc_chuoi_tu_may_chu()
    {
        var t = HocVienView.Parse<HvTongQuan>("""
            {"con":{"id":"c1","ten":"Bảo Anh"},"soDu":40,"tongKiem":305,"capDo":{"cap":3,"diemCapSau":600,"conThieu":295},
             "chuoi":{"soNgay":5,"tuan":[{"ngay":"2026-10-28","thu":3,"co":false,"bang":false},{"ngay":"2026-11-03","thu":2,"co":true,"bang":false}]}}
            """)!;
        Assert.Equal(5, t.Chuoi!.SoNgay);
        Assert.Equal(2, t.Chuoi.Tuan.Count);
        Assert.True(t.Chuoi.Tuan[1].Co);
        Assert.Equal(2, t.Chuoi.Tuan[1].Thu);
        Assert.Null(HocVienView.Parse<HvTongQuan>("""{"soDu":1}""")!.Chuoi);
    }

    [Fact]
    public void Thoat_menu_chi_hien_o_phien_con_da_ghep_co_be_dung()
    {
        Assert.True(ThoatView.HienMenu(new TrayState { Paired = true, PhienCon = true, NguoiDung = LoaiNguoiDung.Con }));
        Assert.False(ThoatView.HienMenu(new TrayState { Paired = false, PhienCon = true, NguoiDung = LoaiNguoiDung.Con }));
        Assert.False(ThoatView.HienMenu(new TrayState { Paired = true, PhienCon = false, NguoiDung = LoaiNguoiDung.Con }), "tài khoản Ba Mẹ");
        Assert.False(ThoatView.HienMenu(new TrayState { Paired = true, PhienCon = true, NguoiDung = LoaiNguoiDung.BaMe }), "Ba Mẹ đang dùng máy");
        Assert.False(ThoatView.HienMenu(new TrayState { Paired = true, PhienCon = true, NguoiDung = LoaiNguoiDung.Chua }), "chưa ai vào");
        Assert.False(ThoatView.HienMenu(null), "dịch vụ không trả lời");
    }

    [Fact]
    public void Thoat_bao_Ba_Me_mot_lan_moi_be_moi_10_phut()
    {
        var c = new ChanBaoLap();
        var t = new DateTimeOffset(2026, 11, 3, 19, 41, 0, TimeSpan.FromHours(7));
        Assert.Null(c.DaBao("c1", t));
        c.Ghi("c1", t, "da_bao");
        Assert.Equal("da_bao", c.DaBao("c1", t.AddMinutes(9)));
        Assert.Null(c.DaBao("c2", t.AddMinutes(1)), "bé khác vẫn được báo");
        Assert.Null(c.DaBao("c1", t.AddMinutes(10)), "quá 10 phút báo lại");
    }

    [Fact]
    public void Gioi_lam_moi_ngay_mot_lan_theo_be()
    {
        var m = new MungChuoi();
        var c = Chuoi(5, false, false, true, true, true, true, true);
        m.Ghi("c1", "2026-11-03");
        Assert.False(ChuoiView.NenHien(c, m.DaMung("c1")));
        Assert.True(ChuoiView.NenHien(c, m.DaMung("c2")), "bé thứ hai trên máy dùng chung vẫn được mừng");
    }
}
