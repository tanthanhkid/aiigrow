using System.Xml.Linq;
using AiiGrow.Core;

namespace AiiGrow.Tests;

/// <summary>Bản giả của cổng hệ thống: không đụng tiến trình thật, chỉ ghi lại Id đã "đóng".</summary>
internal sealed class FakeProcessControl : IProcessControl
{
    private readonly List<RunningProc> _procs;
    public List<int> Closed { get; } = new();
    public FakeProcessControl(params RunningProc[] procs) => _procs = procs.ToList();
    public IEnumerable<RunningProc> ListChildProcesses(int sessionId) => _procs;
    public bool Close(int processId) { Closed.Add(processId); return true; }
}

public class ProcessEnforcerTests
{
    private static readonly string[] Safe = { @"C:\Windows", @"C:\Program Files\AiiGrow" };

    [Fact]
    public void Enforce_DongGameNgoaiDanhSach_GiuAppHocVaHeThong()
    {
        var fake = new FakeProcessControl(
            new RunningProc(10, @"C:\Users\An\AppData\Local\game-thu\game-thu.exe"),
            new RunningProc(11, @"C:\Program Files\Microsoft Office\WINWORD.EXE"),
            new RunningProc(12, @"C:\Windows\System32\notepad.exe"));

        var closed = ProcessEnforcer.Enforce(fake, sessionId: 2, allowedApps: new[] { "winword.exe" }, safeDirs: Safe);

        Assert.Equal(new[] { 10 }, fake.Closed);
        Assert.Equal(new[] { "game-thu.exe" }, closed);
    }

    [Fact]
    public void Enforce_HelperCungThuMucAppDuocPhepThiGiu()
    {
        var fake = new FakeProcessControl(
            new RunningProc(20, @"C:\Program Files\Microsoft Office\WINWORD.EXE"),
            new RunningProc(21, @"C:\Program Files\Microsoft Office\OfficeClickToRun.exe"));

        ProcessEnforcer.Enforce(fake, 2, new[] { "winword.exe" }, Safe);

        Assert.Empty(fake.Closed);
    }

    [Fact]
    public void Enforce_BoQuaTienTrinhKhongCoDuongDan()
    {
        var fake = new FakeProcessControl(new RunningProc(30, ""));
        Assert.Empty(ProcessEnforcer.Enforce(fake, 2, Array.Empty<string>(), Safe));
    }
}

public class AppLockerBlockListTests
{
    private const string Sid = "S-1-5-21-1111111111-2222222222-3333333333-1001";

    private static XElement Exe(string xml)
        => XDocument.Parse(xml).Root!.Elements("RuleCollection").First(c => (string?)c.Attribute("Type") == "Exe");

    [Fact]
    public void BuildBlockList_ChanGameTheoDuongDanVaBam_ChoPhepWindowsVaProgramFiles()
    {
        // exe GIẢ, vô hại: file tạm đặt tên như game để lấy băm SHA256 thật (dry-run, không chạy gì).
        var tmp = Path.Combine(Path.GetTempPath(), "aii-m4-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tmp);
        var fake = Path.Combine(tmp, "game-thu.exe");
        File.WriteAllText(fake, "day la file vo hai gia lam game de thu nghiem");
        try
        {
            var (hex, size) = AppLockerXml.HashOf(fake);
            var xml = AppLockerXml.BuildBlockList(new AppLockerBlockOptions
            {
                ChildSid = Sid,
                BlockedApps = new[] { new BlockedApp("game-thu.exe", hex, size) },
            });
            var exe = Exe(xml);
            Assert.Equal("Enabled", (string?)exe.Attribute("EnforcementMode"));

            // Luật chặn theo ĐƯỜNG DẪN cho SID của con.
            var denyPath = exe.Elements("FilePathRule").Single(r =>
                (string?)r.Attribute("Action") == "Deny" && (string?)r.Attribute("UserOrGroupSid") == Sid);
            Assert.Equal(@"*\game-thu.exe", (string?)denyPath.Element("Conditions")!.Element("FilePathCondition")!.Attribute("Path"));

            // Luật chặn theo BĂM cho SID của con.
            var denyHash = exe.Elements("FileHashRule").Single(r => (string?)r.Attribute("Action") == "Deny");
            var fh = denyHash.Element("Conditions")!.Element("FileHashCondition")!.Element("FileHash")!;
            Assert.Equal("SHA256", (string?)fh.Attribute("Type"));
            Assert.Equal("0x" + hex.ToUpperInvariant(), (string?)fh.Attribute("Data"));
            Assert.Equal(size.ToString(), (string?)fh.Attribute("SourceFileLength"));

            // Luật CHO PHÉP Windows và Program Files.
            var allows = exe.Elements("FilePathRule").Where(r => (string?)r.Attribute("Action") == "Allow")
                .Select(r => (string?)r.Element("Conditions")!.Element("FilePathCondition")!.Attribute("Path")).ToList();
            Assert.Contains(@"%WINDIR%\*", allows);
            Assert.Contains(@"%PROGRAMFILES%\*", allows);

            // Mọi luật đều mang tiền tố AiiGrow: (gỡ sạch được).
            Assert.All(exe.Elements(), r => Assert.StartsWith(AppLockerXml.Prefix, (string?)r.Attribute("Name")));
        }
        finally { try { Directory.Delete(tmp, true); } catch { } }
    }

    [Fact]
    public void BuildBlockList_KhongCoBam_ChiChanTheoDuongDan()
    {
        var xml = AppLockerXml.BuildBlockList(new AppLockerBlockOptions
        {
            ChildSid = Sid, BlockedApps = new[] { new BlockedApp("game-thu.exe") },
        });
        Assert.Empty(Exe(xml).Elements("FileHashRule"));
        Assert.Contains(@"*\game-thu.exe", xml);
    }

    [Fact]
    public void BuildBlockList_SidSaiThiNemLoi()
        => Assert.Throws<ArgumentException>(() => AppLockerXml.BuildBlockList(new AppLockerBlockOptions { ChildSid = "abc" }));

    [Fact]
    public void BuildBlockList_GoSachDuocLuatAiiGrow()
    {
        var xml = AppLockerXml.BuildBlockList(new AppLockerBlockOptions { ChildSid = Sid, BlockedApps = new[] { new BlockedApp("game-thu.exe") } });
        Assert.True(AppLockerXml.ContainsOurs(xml));
        Assert.False(AppLockerXml.ContainsOurs(AppLockerXml.RemoveOurs(xml)));
    }
}

public class BlockScreenViewTests
{
    [Theory]
    [InlineData(LockReasons.HetGio, "Ngoài giờ dùng máy hôm nay")]
    [InlineData(LockReasons.HetDiem, "Hết điểm chơi hôm nay")]
    [InlineData(LockReasons.ChuaPhanLoai, "App này chưa được Ba Mẹ phân loại")]
    public void Reason_HienDungChuTheoLyDo(string reason, string expected)
        => Assert.Equal(expected, BlockScreenView.ReasonText(reason));

    [Fact]
    public void DungDiem_ChiHienKhiChanGiaiTriVaDoiDiemDuoc()
    {
        Assert.True(BlockScreenView.CanUsePoints(LockReasons.HetDiem, canExchangePoints: true));
        Assert.True(BlockScreenView.CanUsePoints(LockReasons.ChuaPhanLoai, true));
        // Ngoài giờ: điểm không mua được giờ ⇒ chỉ còn xin Ba Mẹ.
        Assert.False(BlockScreenView.CanUsePoints(LockReasons.HetGio, true));
        // Không được đổi điểm ⇒ ẩn.
        Assert.False(BlockScreenView.CanUsePoints(LockReasons.HetDiem, false));
    }

    [Fact]
    public void For_LuonCoNutXinBaMe_VaNhanDungTen()
    {
        var v = BlockScreenView.For("game-thu.exe", null, LockReasons.ChuaPhanLoai, canExchangePoints: true);
        Assert.Equal("Game-thu", v.AppName);
        Assert.True(v.ShowAskParent);
        Assert.True(v.ShowUsePoints);
        Assert.Equal("Dùng điểm để chơi", v.UsePointsLabel);
        Assert.Equal("Xin phép Ba Mẹ", v.AskParentLabel);
    }
}

public class InstallPlanTests
{
    private const string Sid = "S-1-5-21-1111111111-2222222222-3333333333-1001";

    [Fact]
    public void Steps_XinAdminMotLan_RoiCaiDichVu_DatRecovery_Enroll_DungAppLocker()
    {
        var ids = InstallPlan.Steps().Select(s => s.Id).ToList();
        Assert.Equal(new[] { "admin", "enroll", "copy", "service", "recovery", "tray-notice", "applocker" }, ids);
        Assert.Contains("requireAdministrator", InstallPlan.Steps().First(s => s.Id == "admin").MoTa);
        Assert.Contains("LocalSystem", InstallPlan.Steps().First(s => s.Id == "service").MoTa);
    }

    [Fact]
    public void DryRun_SinhFileKeHoachVaXmlVaoThuMucTam_KhongChayThat()
    {
        var outDir = Path.Combine(Path.GetTempPath(), "aii-m4-plan-" + Guid.NewGuid().ToString("N"));
        try
        {
            var (planFile, xmlFile) = InstallPlan.DryRun(outDir, new AppLockerBlockOptions
            {
                ChildSid = Sid, BlockedApps = new[] { new BlockedApp("game-thu.exe") },
            });
            Assert.True(File.Exists(planFile));
            Assert.True(File.Exists(xmlFile));
            var plan = File.ReadAllText(planFile);
            Assert.Contains("DRY-RUN", plan);
            Assert.Contains("requireAdministrator", plan);
            var xml = File.ReadAllText(xmlFile);
            Assert.True(AppLockerXml.ContainsOurs(xml));
            Assert.Contains(@"*\game-thu.exe", xml);
        }
        finally { try { Directory.Delete(outDir, true); } catch { } }
    }
}

public class PlayPipeContractTests
{
    [Fact]
    public void PipeResponse_KhongLoSoDiem()
    {
        // Màn chặn chỉ nhận "được/không" + câu nhắc, không có trường điểm/số dư.
        var names = typeof(PipeResponse).GetProperties().Select(p => p.Name);
        Assert.DoesNotContain(names, n =>
            n.Contains("Diem", StringComparison.OrdinalIgnoreCase) ||
            n.Contains("Point", StringComparison.OrdinalIgnoreCase) ||
            n.Contains("Balance", StringComparison.OrdinalIgnoreCase) ||
            n.Contains("SoDu", StringComparison.OrdinalIgnoreCase));
    }
}
