using System.Text.Json;
using AiiGrow.Core;

namespace AiiGrow.Tests;

public class QuyenBaoVeTests
{
    [Fact]
    public void GiamSat_ChiBaoChanThatThieu()
    {
        var q = QuyenBaoVe.Tinh(CheDoAgent.GiamSat, false, Modes.Hoc, false, true, true);
        Assert.True(q["dichVu"]);
        Assert.True(q["khay"]);
        Assert.False(q["chanThat"]);
        Assert.False(q.ContainsKey("appLocker"));
    }

    [Fact]
    public void Chan_ModeHoc_CanAppLockerDaAp()
    {
        Assert.False(QuyenBaoVe.Tinh(CheDoAgent.Chan, false, Modes.Hoc, false, true, true)["appLocker"]);
        Assert.True(QuyenBaoVe.Tinh(CheDoAgent.Chan, false, Modes.Hoc, true, true, true)["appLocker"]);
    }

    [Fact]
    public void Chan_DangMoTuDo_KhongTinhAppLockerThieu_ConChuaDangNhap_KhongTinhKhayThieu()
    {
        var q = QuyenBaoVe.Tinh(CheDoAgent.Chan, false, Modes.TuDo, false, false, false);
        Assert.False(q.ContainsKey("appLocker"));
        Assert.True(q["khay"]);
    }

    [Fact]
    public void AgentStatus_GuiQuyenDangCamelCase()
    {
        var s = new AgentStatus { Quyen = QuyenBaoVe.Tinh(CheDoAgent.Chan, false, Modes.Hoc, true, true, true) };
        using var doc = JsonDocument.Parse(JsonSerializer.Serialize(s, Json.Options));
        Assert.True(doc.RootElement.GetProperty("quyen").GetProperty("chanThat").GetBoolean());
    }
}
