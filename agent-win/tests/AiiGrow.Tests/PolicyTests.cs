using System.Reflection;
using AiiGrow.Core;

namespace AiiGrow.Tests;

public class PolicyTests
{
    // Đúng mẫu trong docs/PLAN.md mục 3 (có cả chú thích //).
    private const string PlanSample = """
        {
          "serverTime": "2026-10-20T10:00:00Z",
          "childName": "An",
          "mode": "hoc",                    // khoa | hoc | tu_do
          "locked": false,                  // true = khoá cả máy
          "lockReason": null,               // "khoa" | "ngu" | "het_gio" | null
          "allowedApps": ["winword.exe"],   // chỉ dùng khi mode = hoc
          "learningApps": ["winword.exe"],
          "minutesLeft": 25,
          "grantEndsAt": null,
          "nextCheckSec": 30,
          "canExchangePoints": true
        }
        """;

    private static readonly DateTimeOffset Now = new(2026, 10, 20, 10, 0, 0, TimeSpan.Zero);

    [Fact]
    public void Parse_MauTrongPlan()
    {
        var p = PolicyParser.Parse(PlanSample);
        Assert.Equal("An", p.ChildName);
        Assert.Equal(Modes.Hoc, p.Mode);
        Assert.False(p.Locked);
        Assert.Null(p.LockReason);
        Assert.Equal(new[] { "winword.exe" }, p.AllowedApps);
        Assert.Equal(25, p.MinutesLeft);
        Assert.Null(p.GrantEndsAt);
        Assert.Equal(30, p.NextCheckSec);
        Assert.True(p.CanExchangePoints);
        Assert.Equal(Now, p.ServerTime);
    }

    [Fact]
    public void Parse_MinutesLeftNullLaKhongGioiHan()
    {
        var p = PolicyParser.Parse("""{"mode":"tu_do","minutesLeft":null}""");
        Assert.Null(p.MinutesLeft);
        Assert.Empty(p.AllowedApps);
    }

    [Fact]
    public void Parse_ChuanHoaDanhSachApp()
    {
        var p = PolicyParser.Parse("""{"mode":"hoc","allowedApps":[" WinWord.EXE ","winword.exe","","chrome.exe"]}""");
        Assert.Equal(new[] { "winword.exe", "chrome.exe" }, p.AllowedApps);
    }

    [Theory]
    [InlineData(0, 30)]
    [InlineData(-5, 30)]
    [InlineData(1, 10)]
    [InlineData(45, 45)]
    [InlineData(99999, 600)]
    public void Parse_KepNextCheckSec(int input, int expected)
    {
        var p = PolicyParser.Parse($"{{\"mode\":\"tu_do\",\"nextCheckSec\":{input}}}");
        Assert.Equal(expected, p.NextCheckSec);
    }

    [Theory]
    [InlineData("")]
    [InlineData("không phải json")]
    [InlineData("null")]
    [InlineData("""{"mode":"la"}""")]
    [InlineData("""{"mode":""}""")]
    public void Parse_SaiThiNemPolicyException(string json)
    {
        Assert.Throws<PolicyException>(() => PolicyParser.Parse(json));
    }

    [Fact]
    public void TryParse_KhongNemLoi()
    {
        Assert.False(PolicyParser.TryParse("{{{", out _));
        Assert.False(PolicyParser.TryParse(null, out _));
        Assert.True(PolicyParser.TryParse(PlanSample, out var p));
        Assert.Equal("An", p!.ChildName);
    }

    [Fact]
    public void Evaluate_BinhThuongChuaKhoa()
    {
        var e = PolicyEvaluator.Evaluate(PolicyParser.Parse(PlanSample), Now, 0);
        Assert.False(e.Locked);
        Assert.Equal(25, e.MinutesLeft);
        Assert.True(e.AppLockerWanted);
    }

    [Fact]
    public void Evaluate_MatMangTruDanPhutDaDung()
    {
        var e = PolicyEvaluator.Evaluate(PolicyParser.Parse(PlanSample), Now, 10 * 60);
        Assert.Equal(15, e.MinutesLeft!.Value, 3);
    }

    [Fact]
    public void Evaluate_HetGioThiKhoa()
    {
        var e = PolicyEvaluator.Evaluate(PolicyParser.Parse(PlanSample), Now, 25 * 60);
        Assert.True(e.Locked);
        Assert.Equal(LockReasons.HetGio, e.LockReason);
    }

    [Fact]
    public void Evaluate_DangDuocThemGioThiKhongKhoa()
    {
        var p = PolicyParser.Parse("""{"mode":"tu_do","minutesLeft":0,"grantEndsAt":"2026-10-20T10:30:00Z"}""");
        var e = PolicyEvaluator.Evaluate(p, Now, 0);
        Assert.False(e.Locked);
        Assert.NotNull(e.GrantEndsAt);
        var after = PolicyEvaluator.Evaluate(p, Now.AddMinutes(31), 0);
        Assert.True(after.Locked);
    }

    [Fact]
    public void Evaluate_MoCoHan_HetHanKhiMatMang_TroLaiChiAppHoc()
    {
        var p = PolicyParser.Parse("""{"mode":"tu_do","grantEndsAt":"2026-10-20T10:30:00Z","allowedApps":["explorer.exe"]}""");
        Assert.False(PolicyEvaluator.Evaluate(p, Now, 0).AppLockerWanted);
        Assert.True(PolicyEvaluator.Evaluate(p, Now.AddMinutes(31), 0).AppLockerWanted);
        Assert.False(PolicyEvaluator.Evaluate(PolicyParser.Parse("""{"mode":"tu_do"}"""), Now, 0).AppLockerWanted);
    }

    [Fact]
    public void Evaluate_ServerKhoaThiGiuLyDo()
    {
        var p = PolicyParser.Parse("""{"mode":"tu_do","locked":true,"lockReason":"ngu","minutesLeft":50}""");
        var e = PolicyEvaluator.Evaluate(p, Now, 0);
        Assert.True(e.Locked);
        Assert.Equal(LockReasons.Ngu, e.LockReason);
        Assert.False(e.AppLockerWanted);
    }

    [Fact]
    public void Evaluate_CheDoKhoaLaKhoa()
    {
        var e = PolicyEvaluator.Evaluate(PolicyParser.Parse("""{"mode":"khoa"}"""), Now, 0);
        Assert.True(e.Locked);
        Assert.Equal(LockReasons.Khoa, e.LockReason);
    }

    [Fact]
    public void TrayState_KhongLoSoDiem()
    {
        // Chỉ được có cờ CanExchangePoints; không có thuộc tính nào khác nhắc tới điểm/số dư.
        var names = typeof(TrayState).GetProperties(BindingFlags.Public | BindingFlags.Instance).Select(p => p.Name);
        Assert.DoesNotContain(names, n => n != "CanExchangePoints" &&
            (n.Contains("Point", StringComparison.OrdinalIgnoreCase) || n.Contains("Balance", StringComparison.OrdinalIgnoreCase)
             || n.Contains("Diem", StringComparison.OrdinalIgnoreCase)));
    }
}
