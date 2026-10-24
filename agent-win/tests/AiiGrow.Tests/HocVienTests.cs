using System.Net;
using System.Text;
using AiiGrow.Core;

namespace AiiGrow.Tests;

public class HocVienTests
{
    private static readonly DateTimeOffset Now = new(2026, 10, 22, 9, 0, 0, TimeSpan.FromHours(7));

    // Đúng hình dạng máy chủ trả (server/lib/hoc-vien.ts tongQuan).
    private const string TongQuanJson = """
    {"con":{"id":"c1","ten":"Ken"},"soDu":20,"tongKiem":120,"capDo":{"cap":2,"diemCapSau":300,"conThieu":180},"diemChoDuyet":10,
     "nhiemVu":[
       {"id":"t1","ten":"Rửa chén","moTa":"","nhom":"viec_nha","diem":10,"bangChung":"anh","kieu":"thuong","han":null,"phutToiThieu":0,"trangThai":"san_sang","luot":null,"homNay":0,"dangCho":0,"giaoRieng":false,"lyDo":null},
       {"id":"t2","ten":"Dọn tủ sách","moTa":"Xếp theo cỡ","nhom":"viec_nha","diem":20,"bangChung":"van_ban","kieu":"mot_lan","han":"2026-10-23T02:00:00.000Z","phutToiThieu":0,"trangThai":"can_bo_sung","luot":"l9","homNay":1,"dangCho":0,"giaoRieng":true,"lyDo":"Viết thêm vài câu"},
       {"id":"t3","ten":"Đọc sách","moTa":"","nhom":"doc_sach","diem":10,"bangChung":"anh","kieu":"thuong","han":null,"phutToiThieu":20,"trangThai":"dang_lam","luot":"l1","homNay":1,"dangCho":0,"giaoRieng":false,"lyDo":null},
       {"id":"t4","ten":"Đổ rác","moTa":"","nhom":"viec_nha","diem":5,"bangChung":"anh","kieu":"thuong","han":null,"phutToiThieu":0,"trangThai":"du_hom_nay","luot":null,"homNay":1,"dangCho":1,"giaoRieng":false,"lyDo":null}],
     "gan":[{"id":"l5","ten":"Rửa chén","trangThai":"duoc_duyet","diem":10,"lyDo":null,"loiKhen":"Giỏi lắm!","luc":"2026-10-21T10:00:00.000Z"}],
     "loiKhen":[{"id":"m1","noiDung":"Giỏi lắm!","phanHoi":null,"luc":"2026-10-21T10:00:00.000Z"}],
     "phieuCho":[{"id":"p1","ten":"Chọn món bữa tối","diem":50,"luc":"2026-10-21T11:00:00.000Z"}]}
    """;

    [Fact]
    public void Parse_TongQuan_DocDungJsonMayChu()
    {
        var t = HocVienView.Parse<HvTongQuan>(TongQuanJson)!;
        Assert.Equal("Ken", t.Con.Ten);
        Assert.Equal(20, t.SoDu);
        Assert.Equal("Cấp 2 · còn 180 điểm lên cấp", HocVienView.CapText(t.CapDo));
        Assert.Equal(4, t.NhiemVu.Count);
        var bs = t.NhiemVu.Single(v => v.Id == "t2");
        Assert.Equal("Viết thêm vài câu", bs.LyDo);
        Assert.True(bs.GiaoRieng);
        Assert.Equal(DateTimeOffset.Parse("2026-10-23T02:00:00Z"), bs.Han);
        Assert.Equal("Giỏi lắm!", Assert.Single(t.LoiKhen).NoiDung);
        Assert.Equal(50, Assert.Single(t.PhieuCho).Diem);
        Assert.Equal(10, Assert.Single(t.Gan).Diem);
    }

    [Fact]
    public void Parse_JsonHong_TraNullKhongNem()
    {
        Assert.Null(HocVienView.Parse<HvTongQuan>("không phải json"));
        Assert.Null(HocVienView.Parse<HvTongQuan>(""));
        Assert.Null(HocVienView.Parse<HvTongQuan>(null));
    }

    [Fact]
    public void SapXep_CanBoSungTruoc_RoiDangLam_RoiSanSang_DuLuotCuoi()
    {
        var t = HocVienView.Parse<HvTongQuan>(TongQuanJson)!;
        Assert.Equal(new[] { "t2", "t3", "t1", "t4" }, HocVienView.SapXep(t.NhiemVu).Select(v => v.Id));
        Assert.Equal(3, HocVienView.SoViecMo(t));
    }

    [Fact]
    public void NutText_TheoTrangThai()
    {
        var t = HocVienView.Parse<HvTongQuan>(TongQuanJson)!;
        string? Nut(string id) => HocVienView.NutText(t.NhiemVu.Single(v => v.Id == id));
        Assert.Equal("Nhận việc", Nut("t1"));
        Assert.Equal("Nộp lại", Nut("t2"));
        Assert.Equal("Nộp bài", Nut("t3"));
        Assert.Null(Nut("t4"));
        Assert.Null(HocVienView.NutText(new HvNhiemVu { BangChung = "tu_dong", TrangThai = "san_sang" }));
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData(-5, "Đã hết hạn")]
    [InlineData(30, "Còn 30 phút")]
    [InlineData(150, "Còn 2 giờ")]
    [InlineData(60 * 24 * 3 + 30, "Còn 3 ngày")]
    public void HanText(int? phutConLai, string? mong)
    {
        DateTimeOffset? han = phutConLai == null ? null : Now.AddMinutes(phutConLai.Value);
        Assert.Equal(mong, HocVienView.HanText(han, Now));
    }

    [Fact]
    public void ThongBao_NopVaDoiQua()
    {
        Assert.Equal("Xong rồi! Điểm đã được cộng.", HocVienView.NopThongBao(new HvNopKq { TrangThai = "duoc_duyet" }));
        Assert.Contains("Chờ Ba Mẹ duyệt", HocVienView.NopThongBao(new HvNopKq { TrangThai = "cho_duyet" }));
        Assert.Contains("giống ảnh", HocVienView.NopThongBao(new HvNopKq { TrangThai = "cho_duyet", NghiTrung = true }));
        Assert.Contains("trao quà", HocVienView.DoiThongBao(new HvDoiKq { TrangThai = "cho_trao" }, "Chọn món"));
        Assert.Contains("AG123", HocVienView.DoiThongBao(new HvDoiKq { TrangThai = "da_phat_hanh", Voucher = new HvVoucher { Ma = "AG123" } }, "Phiếu"));
        Assert.Equal("Đủ điểm", HocVienView.QuaTrangThai(new HvQua { Du = true }));
        Assert.Equal("Còn thiếu 380 điểm", HocVienView.QuaTrangThai(new HvQua { ConThieu = 380 }));
    }

    [Fact]
    public void TinTracker_LanDauKhongBaoToast_LanSauChiBaoTinMoi_LocTrungTheoId()
    {
        var tr = new TinTracker();
        var a = new HvTin { Id = "e1", Tieu = "Nhiệm vụ mới từ Ba Mẹ", Noi = "«Dọn tủ» · 20 điểm", Luc = Now.AddMinutes(-3) };
        Assert.Empty(tr.Nhan(new HvTinDs { Ds = { a }, Bay = Now }));
        Assert.Equal(Now, tr.Moc);

        // máy chủ lùi mốc 5 phút ⇒ tin cũ trả lại, chỉ tin mới được báo
        var b = new HvTin { Id = "e2", Tieu = "Ba Mẹ đã duyệt", Noi = "«Rửa chén» · +10 điểm", Luc = Now.AddMinutes(1) };
        var moi = tr.Nhan(new HvTinDs { Ds = { b, a }, Bay = Now.AddMinutes(2) });
        Assert.Equal("e2", Assert.Single(moi).Id);
        Assert.Equal(Now.AddMinutes(2), tr.Moc);
        Assert.Empty(tr.Nhan(new HvTinDs { Ds = { b, a }, Bay = Now.AddMinutes(3) }));
    }

    [Fact]
    public void ToastText_GopNhieuTin()
    {
        var mot = HocVienView.ToastText(new[] { new HvTin { Id = "1", Tieu = "Ba Mẹ đã duyệt", Noi = "+10" } });
        Assert.Equal(("Ba Mẹ đã duyệt", "+10"), mot);
        var nhieu = HocVienView.ToastText(new[]
        {
            new HvTin { Id = "1", Tieu = "Ba Mẹ đã duyệt" }, new HvTin { Id = "2", Tieu = "Nhiệm vụ mới từ Ba Mẹ" }, new HvTin { Id = "3", Tieu = "Ba Mẹ đã duyệt" },
        });
        Assert.Equal("Có 3 tin mới", nhieu.Tieu);
        Assert.Equal("Ba Mẹ đã duyệt · Nhiệm vụ mới từ Ba Mẹ", nhieu.Noi);
    }

    [Fact]
    public void CoNhiemVuMoi_ChiKhiCoNhiemVuGiaoHoacChoCaNha()
    {
        Assert.True(HocVienView.CoNhiemVuMoi(new[] { new HvTin { Id = "1", Loai = "giao_nhiem_vu" } }));
        Assert.True(HocVienView.CoNhiemVuMoi(new[] { new HvTin { Id = "1", Loai = "loi_khen" }, new HvTin { Id = "nv:2", Loai = "nhiem_vu_moi" } }));
        Assert.False(HocVienView.CoNhiemVuMoi(new[] { new HvTin { Id = "1", Loai = "duyet_nhiem_vu" }, new HvTin { Id = "2", Loai = "xac_nhan_qua" } }));
        Assert.False(HocVienView.CoNhiemVuMoi(Array.Empty<HvTin>()));
    }

    [Fact]
    public void BatNhiemVu_KhongGiatKhiAppMo_KhongDeToanManHinh_Gian5Phut_GiuKhiKhoa()
    {
        var b = new BatNhiemVu();
        Assert.False(b.Nhan(false, false, false, false, Now), "không có nhiệm vụ mới");
        Assert.False(b.Nhan(true, false, true, false, Now), "app đang hiện ⇒ chỉ tải lại");
        Assert.False(b.Nhan(true, false, false, true, Now), "Con đang toàn màn hình");
        Assert.True(b.Nhan(true, false, false, false, Now));
        Assert.False(b.Nhan(true, false, false, false, Now.AddMinutes(4)), "vừa bật chưa đủ 5 phút");
        Assert.True(b.Nhan(true, false, false, false, Now.AddMinutes(5)));

        var k = new BatNhiemVu();
        Assert.False(k.Nhan(true, true, false, false, Now), "máy khoá ⇒ không bật ngay");
        Assert.True(k.ChoMoKhoa);
        Assert.True(k.MoKhoa(false, false, Now.AddMinutes(30)), "mở khoá ⇒ bật nhiệm vụ đã giao lúc khoá");
        Assert.False(k.MoKhoa(false, false, Now.AddMinutes(40)), "chỉ một lần");
        Assert.False(new BatNhiemVu().MoKhoa(false, false, Now), "mở khoá mà không có nhiệm vụ chờ");
    }

    [Theory]
    [InlineData("GET", "hoc-vien/tong-quan", true)]
    [InlineData("GET", "hoc-vien/tin?sau=2026-10-22T02%3A00%3A00.0000000%2B00%3A00", true)]
    [InlineData("GET", "hoc-vien/cua-hang", true)]
    [InlineData("POST", "hoc-vien/nhiem-vu/abc123/bat-dau", true)]
    [InlineData("POST", "hoc-vien/luot/abc123/nop", true)]
    [InlineData("POST", "hoc-vien/doi/q1", true)]
    [InlineData("POST", "hoc-vien/loi-khen/m1/phan-hoi", true)]
    [InlineData("POST", "hoc-vien/tong-quan", false)]
    [InlineData("GET", "hoc-vien/luot/abc/nop", false)]
    [InlineData("GET", "dong-bo", false)]
    [InlineData("POST", "lenh/1/xong", false)]
    [InlineData("POST", "hoc-vien/../da-go", false)]
    [InlineData("POST", "hoc-vien/doi/q1?x=1", false)]
    [InlineData("POST", "hoc-vien/doi/", false)]
    [InlineData("DELETE", "hoc-vien/tong-quan", false)]
    [InlineData("GET", "", false)]
    [InlineData("GET", null, false)]
    public void HocVienPaths_ChiChoDuongHocVien(string method, string? path, bool mong)
        => Assert.Equal(mong, HocVienPaths.Allowed(method, path));

    [Theory]
    [InlineData(4000, 3000, 1280, 1280, 960)]
    [InlineData(800, 600, 1280, 800, 600)]
    [InlineData(1000, 3000, 1280, 427, 1280)]
    public void AnhBangChung_Fit_GiuTiLe_KhongPhongTo(int w, int h, int max, int mongW, int mongH)
        => Assert.Equal((mongW, mongH), AnhBangChung.Fit(w, h, max));

    [Fact]
    public void PipeRequest_HocVien_RoiRaJsonDungTen()
    {
        var json = System.Text.Json.JsonSerializer.Serialize(
            new PipeRequest { Cmd = PipeCmd.HocVien, Method = "POST", Path = "hoc-vien/doi/q1", Body = "{}" }, Json.Options);
        Assert.Contains("\"cmd\":\"hoc-vien\"", json);
        Assert.Contains("\"path\":\"hoc-vien/doi/q1\"", json);
        var res = System.Text.Json.JsonSerializer.Deserialize<PipeResponse>("{\"ok\":true,\"data\":\"{\\\"a\\\":1}\"}", Json.Options)!;
        Assert.True(res.Ok);
        Assert.Equal("{\"a\":1}", res.Data);
    }

    private sealed class Fake : HttpMessageHandler
    {
        public HttpMethod? Method; public string? PathQuery, Body, Auth;
        public HttpStatusCode Status = HttpStatusCode.OK;
        public string Reply = "{}";
        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage req, CancellationToken ct)
        {
            Method = req.Method; PathQuery = req.RequestUri!.PathAndQuery; Auth = req.Headers.Authorization?.ToString();
            Body = req.Content == null ? null : await req.Content.ReadAsStringAsync(ct);
            return new HttpResponseMessage(Status) { Content = new StringContent(Reply, Encoding.UTF8, "application/json") };
        }
    }

    [Fact]
    public async Task ApiClient_Raw_GuiBearerDungDuongVaThanJson()
    {
        var h = new Fake { Reply = "{\"luot\":\"l1\"}" };
        using var api = new ApiClient("https://aiigrow.vn", "tok-may", h);
        var raw = await api.RawAsync(HttpMethod.Post, "api/device/hoc-vien/luot/l1/nop", "{\"ghiChu\":\"Xong\",\"anh\":[{\"mime\":\"image/jpeg\",\"base64\":\"QQ==\"}]}");
        Assert.Equal("{\"luot\":\"l1\"}", raw);
        Assert.Equal(HttpMethod.Post, h.Method);
        Assert.Equal("/api/device/hoc-vien/luot/l1/nop", h.PathQuery);
        Assert.Equal("Bearer tok-may", h.Auth);
        Assert.Contains("\"ghiChu\":\"Xong\"", h.Body);
        Assert.Contains("\"base64\":\"QQ==\"", h.Body);

        await api.RawAsync(HttpMethod.Get, "api/device/hoc-vien/tin?sau=2026-10-22", null);
        Assert.Equal(HttpMethod.Get, h.Method);
        Assert.Equal("/api/device/hoc-vien/tin?sau=2026-10-22", h.PathQuery);
        Assert.Null(h.Body);
    }

    [Fact]
    public async Task ApiClient_Raw_LoiMayChuLayCauTiengViet()
    {
        var h = new Fake { Status = HttpStatusCode.Conflict, Reply = "{\"error\":\"du_hom_nay\",\"message\":\"Hôm nay đã đủ, mai làm tiếp nhé\"}" };
        using var api = new ApiClient("https://aiigrow.vn", "tok-may", h);
        var e = await Assert.ThrowsAsync<ApiException>(() => api.RawAsync(HttpMethod.Post, "api/device/hoc-vien/nhiem-vu/t1/bat-dau", null));
        Assert.Equal("Hôm nay đã đủ, mai làm tiếp nhé", e.Message);
        Assert.Equal("{}", h.Body);
        Assert.False(e.IsNetwork);
    }
}
