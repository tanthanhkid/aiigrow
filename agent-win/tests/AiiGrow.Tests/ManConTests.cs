using AiiGrow.Core;
using Xunit;

namespace AiiGrow.Tests;

/// <summary>Màn Con Windows theo bàn thiết kế (bản 15/11 — con-bi-chan, con-het-gio, con-mat-mang).</summary>
public class ManConTests
{
    private static readonly DateTimeOffset Luc = new(2026, 11, 3, 19, 30, 0, TimeSpan.FromHours(7));

    [Fact]
    public void ManChan_KhongBaoGioTuGui_ChiCoNut()
    {
        Assert.False(ManChanView.TuGui("capcut.exe", boiBaMe: false, offline: false));       // #621: app lạ cũng không tự gửi — chỉ khi Con bấm nút
        Assert.False(ManChanView.TuGui("youtube.exe", boiBaMe: true, offline: false));     // Ba Mẹ đã đặt Chặn ⇒ Con tự bấm xin
        Assert.True(ManChanView.CoNutXin("youtube.exe"));
        Assert.False(ManChanView.TuGui("capcut.exe", false, offline: true));               // mất mạng ⇒ không tự gửi
        Assert.False(ManChanView.TuGui("capcut.exe", false, false, daXin: true));          // đã xin trong phiên khay ⇒ không gửi lặp
        Assert.False(ManChanView.TuGui("cmd.exe", false, false));                          // công cụ Windows
        Assert.False(ManChanView.CoNutXin("taskmgr"));
    }

    [Fact]
    public void GoiVaExeNenCuaWindows_KhongBiDong_Issue621()
    {
        var safe = new[] { @"C:\Program Files\AiiGrow" };
        var none = new HashSet<string>();
        Assert.False(ProcessGuard.ShouldClose(@"C:\Program Files\WindowsApps\microsoft.windowscommunicationsapps_16005.14326.21594.0_x64__8wekyb3d8bbwe\HxTsr.exe", none, new HashSet<string>(), safe, @"C:\Windows"));
        Assert.False(ProcessGuard.ShouldClose(@"C:\Program Files\WindowsApps\Microsoft.Windows.Photos_2024.11.0.0_x64__8wekyb3d8bbwe\Microsoft.Photos.exe", none, new HashSet<string>(), safe, @"C:\Windows"));
        Assert.True(ProcessGuard.TienTrinhHeThongPhien.Contains("hxtsr.exe"));
    }

    [Theory]
    [InlineData("gamebarftserver.exe", false)]
    [InlineData("GameBarFTServer", false)]
    [InlineData("hxtsr.exe", false)]
    [InlineData("capcut.exe", true)]
    [InlineData("taskmgr.exe", true)]
    [InlineData(null, true)]
    public void CoHienBang_TienTrinhNenKhongBatBang_Issue642(string? id, bool mong) => Assert.Equal(mong, ManChanView.CoHienBang(id));

    [Fact]
    public void KetQuaGui_LoiThiKhongNoiDaGui_Issue642()
    {
        Assert.Equal((true, (string?)null), ManChanView.KetQuaGui(true, null));
        Assert.Equal((false, (string?)ManChanView.ChuaGuiDuoc), ManChanView.KetQuaGui(false, null));
        Assert.Equal((false, (string?)ManChanView.ChuaGuiDuoc), ManChanView.KetQuaGui(false, "  "));
        Assert.Equal((false, (string?)"Máy chủ từ chối"), ManChanView.KetQuaGui(false, "Máy chủ từ chối"));
    }

    [Fact]
    public void GameBar_KhongBiDong_Issue642()
    {
        var safe = new[] { @"C:\Program Files\AiiGrow" };
        Assert.False(ProcessGuard.ShouldClose(@"C:\Program Files\WindowsApps\Microsoft.XboxGamingOverlay_7.0.0.0_x64__8wekyb3d8bbwe\GameBarFTServer.exe", new HashSet<string>(), new HashSet<string>(), safe, @"C:\Windows"));
    }

    [Fact]
    public void ManChan_Chu_DungThietKe()
    {
        Assert.Equal("YouTube chưa được thêm", ManChanView.TieuDe("YouTube"));
        Assert.Equal("Chưa có trong danh sách của con", ManChanView.Phu);
        Assert.Equal("Xin Ba Mẹ thêm YouTube", ManChanView.NutXin("YouTube"));
        Assert.Equal("Danh sách · xanh: không tính phút · vàng: tính phút", ManChanView.ChuThichDs);
        Assert.Equal("Trang này chưa có trong danh sách", ManChanView.WebTieu);
        Assert.Equal(("Đã gửi Ba Mẹ duyệt CapCut", "App mới cài · gửi lúc 19:30"), ManChanView.DaGui("CapCut", false, true, Luc));
        Assert.Equal(("Đã gửi xin mở y8.com", "Trang mới · gửi lúc 19:30"), ManChanView.DaGui("y8.com", true, false, Luc));
        Assert.Equal("Ba Mẹ đã cho CapCut", ManChanView.Duoc("CapCut", false, Luc).Tieu);
        Assert.Equal("Ba Mẹ chưa mở y8.com", ManChanView.ChuaCho("y8.com", true, Luc).Tieu);
        Assert.Equal("Chờ có mạng (2)", ManChanView.ChoCoMang(2));
    }

    [Theory]
    [InlineData(LockReasons.Khoa)]
    [InlineData(LockReasons.Ngu)]       // máy chủ cũ còn gửi «ngu» / «het_gio» ⇒ hiện như Ba Mẹ khoá (không còn giờ ngủ)
    [InlineData(LockReasons.HetGio)]
    public void ManKhoa_ChiConBaMeKhoa_KhongNgoaiLe_KhongThemGio(string lyDo)
    {
        var m = ManKhoaView.For(lyDo, "Bảo Anh", offline: false);
        Assert.Equal("Ba Mẹ đang khoá máy", m.Tieu);
        Assert.Equal(new[] { ManKhoaView.NhanBaMe, ManKhoaView.BaMeDungMay }, m.Nut.Select(n => n.Ma));
        Assert.False(m.DemNguoc);
    }

    [Fact]
    public void ManKhoa_MatMang_HetSao_XinVayLuuLai()
    {
        var m = ManKhoaView.For(null, "Bảo Anh", offline: true, hetSao: true);
        Assert.True(m.MatMang);
        Assert.Equal("Hết sao rồi", m.Tieu);
        Assert.Equal("Con còn 0 sao · app «Tính phút» tạm khoá.", m.Phu);
        Assert.Equal(new[] { ManKhoaView.XinVay }, m.Nut.Select(n => n.Ma));
        Assert.Empty(ManKhoaView.For(LockReasons.Khoa, "Bảo Anh", offline: true).Nut);
    }

    [Fact]
    public void ChuCu_DaGo()
    {
        Assert.Equal("Mất mạng?", HoiAiiGrowView.The[0].Tieu);
        Assert.Equal("Máy vẫn trừ sao đúng luật", HoiAiiGrowView.The[0].Phu);
        Assert.DoesNotContain("giờ", CapNhatKhayView.GiuNguyen);
        Assert.DoesNotContain("giờ", CapNhatKhayView.NhuCu);
    }

    [Fact]
    public async Task HangXinCho_ThemTrung_Thay_GuiDungKhiMatMang()
    {
        var h = new HangXinCho();
        h.Them(new LoiXinCho { Loai = LoaiXin.XinDuyet, Muc = "capcut.exe", Luc = DateTimeOffset.Now });
        h.Them(new LoiXinCho { Loai = LoaiXin.XinDuyet, Muc = "CAPCUT.EXE", Luc = DateTimeOffset.Now });   // Con bấm lại ⇒ không thành hai lời xin
        h.Them(new LoiXinCho { Loai = LoaiXin.VaySao, Phut = 15 });
        h.Them(new LoiXinCho { Loai = LoaiXin.VaySao, Muc = "qua-1", Phut = 20 });
        Assert.Equal(3, h.Items.Count);

        foreach (var x in h.Items) x.Luc = DateTimeOffset.Now;
        int goi = 0;
        var (xong, loi) = await h.GuiAsync(x => Task.FromResult(++goi switch { 1 => KetQuaGuiXin.DaGui, 2 => KetQuaGuiXin.LoiMang, _ => KetQuaGuiXin.DaGui }), DateTimeOffset.Now);
        Assert.Single(xong);                    // lời xin thứ 2 lỗi mạng ⇒ dừng, giữ lại 2 lời xin sau
        Assert.Equal(2, h.Items.Count);
        Assert.Equal(LoaiXin.VaySao, h.Items[0].Loai);
        Assert.Equal(h.Items[0].Ma, loi);
        Assert.Equal(1, h.Items[0].LanLoi);

        (xong, _) = await h.GuiAsync(x => Task.FromResult(KetQuaGuiXin.Bo), DateTimeOffset.Now);   // máy chủ từ chối ⇒ bỏ hết, không gửi lại
        Assert.Equal(2, xong.Count);
        Assert.Empty(h.Items);
    }

    [Fact]
    public async Task HangXinCho_QuaHan_Bo_LoiMangQuaBaLan_Bo()
    {
        var h = new HangXinCho();
        var now = DateTimeOffset.Now;
        h.Them(new LoiXinCho { Loai = LoaiXin.VaySao, Phut = 15, Luc = now.AddDays(-3) });   // mất mạng 3 ngày ⇒ không gửi nữa
        h.Them(new LoiXinCho { Loai = LoaiXin.XinDuyet, Muc = "capcut.exe", Luc = now, LanLoi = HangXinCho.ThuToiDa - 1 });
        int goi = 0;
        var (xong, loi) = await h.GuiAsync(x => { goi++; return Task.FromResult(KetQuaGuiXin.LoiMang); }, now);
        Assert.Equal(1, goi);                    // lời xin quá hạn không gửi
        Assert.Equal(2, xong.Count);             // quá hạn + lỗi lần thứ 3 ⇒ bỏ
        Assert.Null(loi);
        Assert.Empty(h.Items);
    }

    [Fact]
    public void HangXinCho_GioiHan_VaPhanLoaiLoi()
    {
        var h = new HangXinCho();
        for (int i = 0; i < HangXinCho.ToiDa + 5; i++) h.Them(new LoiXinCho { Loai = LoaiXin.XinDuyet, Muc = $"app{i}.exe" });
        Assert.Equal(HangXinCho.ToiDa, h.Items.Count);
        Assert.Equal("app5.exe", h.Items[0].Muc);
        Assert.Equal(KetQuaGuiXin.LoiMang, HangXinCho.PhanLoai(new ApiException("mạng", null, new HttpRequestException("x"))));
        Assert.Equal(KetQuaGuiXin.LoiMang, HangXinCho.PhanLoai(new ApiException("hết giờ", null, new TimeoutException())));
        Assert.Equal(KetQuaGuiXin.Bo, HangXinCho.PhanLoai(new ApiException("Máy chủ trả dữ liệu rỗng")));          // lỗi của client: gửi lại cũng hỏng
        Assert.Equal(KetQuaGuiXin.LoiMang, HangXinCho.PhanLoai(new ApiException("5xx", 503)));
        Assert.Equal(KetQuaGuiXin.Bo, HangXinCho.PhanLoai(new ApiException("nhiều", 429, code: "qua_nhieu_cho")));
        Assert.Equal(KetQuaGuiXin.LoiMang, HangXinCho.PhanLoai(new TaskCanceledException()));
    }
}
