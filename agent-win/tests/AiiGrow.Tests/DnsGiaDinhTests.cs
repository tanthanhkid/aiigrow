using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>DNS gia đình trên Windows (BANG-TINH-NANG-OS mục 10): đọc hồ sơ máy chủ, dựng kịch bản đặt / gỡ, gộp DNS cũ khi cài lại, gỡ cài trả DNS.</summary>
public class DnsGiaDinhTests
{
    private const string HoSo = """
        {"thietBi":{"id":"t1"},"nhaCungCap":"tu_host","windows":{"mauDoh":"https://dns.aiigrow.vn/dns-query/abc123","ipv4":["203.0.113.5","203.0.113.6"],
         "powerShell":["..."],"ghiChu":"x"}}
        """;

    [Fact]
    public void DocHoSo_LayPhanWindows()
    {
        var h = DnsGiaDinh.DocHoSo(HoSo)!;
        Assert.Equal("https://dns.aiigrow.vn/dns-query/abc123", h.MauDoh);
        Assert.Equal(new[] { "203.0.113.5", "203.0.113.6" }, h.Ipv4);
        Assert.Null(DnsGiaDinh.DocHoSo("không phải json"));
        Assert.Null(DnsGiaDinh.DocHoSo("""{"android":{}}"""));
    }

    [Fact]
    public void KiemHoSo_ChuaCoIp_ThiBoQua()   // NextDNS / tự host chưa đặt AIIGROW_DNS_IPV4 ⇒ ipv4 rỗng (e2e cũng vậy)
        => Assert.Null(DnsGiaDinh.KiemHoSo(new HoSoDnsWindows { MauDoh = "https://dns.nextdns.io/abc/aiigrow-x", Ipv4 = new() }));

    [Theory]
    [InlineData("http://dns.aiigrow.vn/dns-query/a")]           // không https
    [InlineData("https://dns.aiigrow.vn/q/a'; Remove-Item C:\\")] // ký tự lạ
    [InlineData("https://dns.aiigrow.vn/q/$(whoami)")]
    [InlineData("")]
    public void KiemHoSo_MauDohLa_ThiBoQua(string doh)
        => Assert.Null(DnsGiaDinh.KiemHoSo(new HoSoDnsWindows { MauDoh = doh, Ipv4 = new() { "203.0.113.5" } }));

    [Fact]
    public void KiemHoSo_ChiGiuIpv4HopLe_BoTrung()
    {
        var ok = DnsGiaDinh.KiemHoSo(new HoSoDnsWindows
        {
            MauDoh = "https://dns.aiigrow.vn/dns-query/a",
            Ipv4 = new() { "203.0.113.5", "203.0.113.5", "2001:db8::1", "1.2.3", "999.1.1.1", " 198.51.100.7 ", "x'y" },
        })!.Value;
        Assert.Equal(new[] { "203.0.113.5", "198.51.100.7" }, ok.Ipv4);
    }

    [Fact]
    public void KichBanDat_DangKyDoh_DatChoCardVatLy_GhiDnsCu()
    {
        var s = DnsGiaDinh.KichBanDat(new[] { "203.0.113.5" }, "https://dns.aiigrow.vn/dns-query/a");
        Assert.Contains("Add-DnsClientDohServerAddress -ServerAddress $ip -DohTemplate $doh -AllowFallbackToUdp $True -AutoUpgrade $True", s);
        Assert.Contains("try { Set-DnsClientServerAddress -InterfaceIndex $a.ifIndex -ServerAddresses $ips; $dat++ }", s);   // từng card, card lỗi không chặn card sau
        Assert.Contains("$ips = @('203.0.113.5')", s);
        Assert.Contains("KHONG_HO_TRO", s);
        // ghi DNS cũ TRƯỚC khi đổi
        Assert.True(s.IndexOf("DNSCU=", StringComparison.Ordinal) < s.IndexOf("Set-DnsClientServerAddress", StringComparison.Ordinal));
    }

    [Fact]
    public void DocDnsCu_CaiLai_KhongLuuIpCuaAiiGrowLamDnsCu()
    {
        var ips = new[] { "203.0.113.5" };
        var output = "abc\r\nDNSCU={\"{G1}\":\"\",\"{G2}\":\"8.8.8.8,1.1.1.1\",\"{G3}\":\"203.0.113.5\",\"{G4}\":\"203.0.113.5\"}\r\n";
        var truoc = new Dictionary<string, string> { ["{G3}"] = "9.9.9.9" };
        var cu = DnsGiaDinh.DocDnsCu(output, ips, truoc);
        Assert.Equal("", cu["{G1}"]);
        Assert.Equal("8.8.8.8,1.1.1.1", cu["{G2}"]);
        Assert.Equal("9.9.9.9", cu["{G3}"]);   // lần cài trước đã nhớ
        Assert.Equal("", cu["{G4}"]);          // không nhớ ⇒ DHCP, KHÔNG phải IP của AiiGrow
    }

    [Fact]
    public void DocDnsCu_GiuCardVangMat_VaNhanIpCuCuaAiiGrow()
    {
        // lần trước resolver là 203.0.113.5; nay máy chủ đổi sang .9. G1 đang mang IP cũ ⇒ vẫn là của AiiGrow; G9 (USB rút ra) giữ giá trị đã nhớ.
        var truoc = new Dictionary<string, string> { ["{G1}"] = "8.8.8.8", ["{G9}"] = "1.1.1.1" };
        var cu = DnsGiaDinh.DocDnsCu("DNSCU={\"{G1}\":\"203.0.113.5\"}", new[] { "203.0.113.9" }, truoc, new[] { "203.0.113.5" });
        Assert.Equal("8.8.8.8", cu["{G1}"]);
        Assert.Equal("1.1.1.1", cu["{G9}"]);
        // kịch bản hỏng trước dòng DNSCU ⇒ không mất bản đã nhớ
        Assert.Equal("8.8.8.8", DnsGiaDinh.DocDnsCu("lỗi", new[] { "203.0.113.9" }, truoc)["{G1}"]);
    }

    [Fact]
    public void KichBanGo_ChiTraCardConDungIpAiiGrow_BoMauDohCuaMinh()
    {
        var s = DnsGiaDinh.KichBanGo(new DnsGiaDinhDaDat
        {
            Ipv4 = new() { "203.0.113.5" }, MauDoh = "https://dns.aiigrow.vn/dns-query/a", DnsCu = new() { ["{G2}"] = "8.8.8.8" },
        });
        Assert.Contains("if (($ns -join ',') -eq ($ips -join ','))", s);
        Assert.Contains("catch { $loi++", s);   // card lỗi không chặn các card sau
        Assert.Contains("-ResetServerAddresses", s);
        Assert.Contains("$x.DohTemplate -eq $doh", s);
        Assert.Contains("8.8.8.8", s);
    }

    private static ConfigStore Store(string dir, AgentConfig? c = null)
    {
        var st = new ConfigStore(Path.Combine(dir, "config.json"), b => b, b => b);
        if (c != null) st.Save(c);
        return st;
    }

    [Fact]
    public async Task DatKhiCai_DatXong_LuuVaoCauHinh()
    {
        var dir = Directory.CreateTempSubdirectory().FullName;
        try
        {
            var st = Store(dir, new AgentConfig { Server = "https://x", Token = "t" });
            string? chay = null;
            var (kq, _) = await DnsGiaDinh.DatKhiCaiAsync(st, () => Task.FromResult(HoSo), s => { chay = s; return new ShellResult(0, "DNSCU={\"{G1}\":\"\"}\n", ""); });
            Assert.Equal(KetQuaDns.DaDat, kq);
            Assert.Contains("203.0.113.6", chay);
            var d = st.Load()!.DnsGiaDinh!;
            Assert.Equal(new[] { "203.0.113.5", "203.0.113.6" }, d.Ipv4);
            Assert.Equal("", d.DnsCu["{G1}"]);
        }
        finally { Directory.Delete(dir, true); }
    }

    [Fact]
    public async Task DatKhiCai_KhongIp_HoacWin10_KhongDoiGi()
    {
        var dir = Directory.CreateTempSubdirectory().FullName;
        try
        {
            var st = Store(dir, new AgentConfig { Server = "https://x", Token = "t" });
            bool daChay = false;
            var (kq, _) = await DnsGiaDinh.DatKhiCaiAsync(st, () => Task.FromResult("""{"windows":{"mauDoh":"https://a/b","ipv4":[]}}"""), _ => { daChay = true; return new ShellResult(0, "", ""); });
            Assert.Equal(KetQuaDns.KhongCoHoSo, kq);
            Assert.False(daChay);
            var (kq2, _) = await DnsGiaDinh.DatKhiCaiAsync(st, () => Task.FromResult(HoSo), _ => new ShellResult(3, "KHONG_HO_TRO", ""));
            Assert.Equal(KetQuaDns.KhongHoTro, kq2);
            Assert.Null(st.Load()!.DnsGiaDinh);
            var (kq3, _) = await DnsGiaDinh.DatKhiCaiAsync(st, () => throw new HttpRequestException("mất mạng"), _ => new ShellResult(0, "", ""));
            Assert.Equal(KetQuaDns.Loi, kq3);
        }
        finally { Directory.Delete(dir, true); }
    }

    [Fact]
    public void CaiLai_GiuDnsGiaDinhCu()
    {
        var cu = new AgentConfig { DnsGiaDinh = new DnsGiaDinhDaDat { Ipv4 = new() { "203.0.113.5" } } };
        Assert.Equal("203.0.113.5", CaiLai.GopDaHaQuyen(cu, new AgentConfig()).DnsGiaDinh!.Ipv4[0]);
    }

    private sealed class OpsDns : ICleanupOps, IDnsCleanup
    {
        private readonly SoGhi _g;
        public OpsDns(SoGhi g) { _g = g; }
        public void GoDnsGiaDinh() => _g.Ghi("dns");
        public void TatKhoiPhucDichVu() => _g.Ghi("tat_khoi_phuc");
        public void DungVaXoaDichVu() => _g.Ghi("dung_xoa_dich_vu");
        public void HenDonTachRoi() => _g.Ghi("hen_don");
        public void GoAppLocker() => _g.Ghi("applocker");
        public void TraQuyenQuanTri() => _g.Ghi("tra_quyen");
        public void GoKhay() => _g.Ghi("khay");
        public void GoThongBaoDangNhap() => _g.Ghi("thong_bao");
        public void GoMucUngDung() => _g.Ghi("muc_ung_dung");
        public void XoaCauHinh() => _g.Ghi("xoa_cau_hinh");
        public bool XoaThuMuc() { _g.Ghi("xoa_thu_muc"); return true; }
    }

    [Fact]
    public void GoCai_TraDnsTruocKhiXoaCauHinh_CaTaiMayLanTuXa()
    {
        var g = new SoGhi();
        SystemCleanup.Run(new OpsDns(g), tuDichVu: false);
        Assert.True(g.Vi("dns") >= 0 && g.Vi("dns") < g.Vi("xoa_cau_hinh"));
        var g2 = new SoGhi();
        SystemCleanup.DonPhanConLai(new OpsDns(g2));
        Assert.True(g2.Vi("dns") >= 0 && g2.Vi("dns") < g2.Vi("xoa_cau_hinh"));
    }
}
