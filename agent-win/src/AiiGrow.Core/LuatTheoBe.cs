using System.Text.Json;

namespace AiiGrow.Core;

// #337 (17/11): MÁY CHUNG — luật, sao, giới hạn đi theo TỪNG bé kể cả khi mất mạng.
// Máy chủ chỉ gửi luật của bé đang đăng nhập ở dong-bo; trước đây bé B vào lúc mất mạng dùng tạm Policy của bé A (cả cờ khoá, bỏ giới hạn ngày).
// Giờ agent xin `GET ho-so?offline=1` ⇒ mỗi `con[i].offline` = phản hồi dong-bo như thể bé đó đăng nhập; lưu theo bé ở AgentConfig.GoiLuatBe
// (sống qua khởi động lại). Bé đang dùng khác bé của Policy cuối ⇒ dùng gói của đúng bé; không có gói ⇒ khoá «Cần có mạng» (LockReasons.CanMang).
// Lớp THUẦN (test được); AgentRuntime / NguoiDungMay gọi vào.

/// <summary>Luật của một bé (phản hồi dong-bo thô) + lúc máy chủ dựng.</summary>
public sealed class GoiLuatBe
{
    public string Raw { get; set; } = "";
    public DateTimeOffset Luc { get; set; }
}

public static class LuatTheoBe
{
    /// <summary>Gộp gói luật của <paramref name="hs"/> vào <paramref name="goi"/>: bé có gói mới ⇒ thay; bé không còn được gán máy ⇒ bỏ gói.
    /// Không đổi <paramref name="hs"/> (gọi <see cref="BoGoi"/> sau). → true nếu <paramref name="goi"/> đổi.</summary>
    public static bool Gop(Dictionary<string, GoiLuatBe> goi, HoSoMay hs, DateTimeOffset luc)
    {
        var doi = false;
        var luc0 = hs.OfflineLuc ?? luc;
        foreach (var c in hs.Con)
        {
            if (c.Offline is { ValueKind: JsonValueKind.Object } o && !string.IsNullOrEmpty(c.Id))
            {
                var raw = o.GetRawText();
                if (!goi.TryGetValue(c.Id, out var cu) || cu.Raw != raw || cu.Luc != luc0) { goi[c.Id] = new GoiLuatBe { Raw = raw, Luc = luc0 }; doi = true; }
            }
        }
        var con = hs.Con.Select(c => c.Id).ToHashSet();
        foreach (var k in goi.Keys.Where(k => !con.Contains(k)).ToList()) { goi.Remove(k); doi = true; }
        return doi;
    }

    /// <summary>Bỏ gói khỏi danh sách bé (lưu gọn ở DangNhap.HoSo, so đổi được; gửi sang khay không kèm luật).</summary>
    public static void BoGoi(HoSoMay hs)
    {
        foreach (var c in hs.Con) c.Offline = null;
        hs.OfflineLuc = null;
    }

    /// <summary>Đọc gói (như Policy dong-bo). Hỏng ⇒ null (coi như không có gói ⇒ khoá).</summary>
    public static Policy? Doc(GoiLuatBe? g) => g != null && PolicyParser.TryParse(g.Raw, out var p) ? p : null;

    /// <summary>Policy cho bé đang dùng khi bé đó KHÁC bé của Policy cuối. null ⇒ dùng Policy cuối như cũ (cùng bé / máy riêng / chưa ai).
    /// <list type="bullet">
    /// <item>Có gói ⇒ luật của đúng bé (khoá, danh sách, giới hạn, phiên chơi); chế độ chặn của máy giữ theo Policy cuối. Số sao: ho-so (`con[].sao`)
    /// mới hơn gói ⇒ lấy ho-so.</item>
    /// <item>Không có gói (máy chung) ⇒ khoá «Cần có mạng để mở máy cho &lt;tên&gt;» — không mượn luật / sao của bé khác.</item>
    /// </list></summary>
    /// <param name="policyBe">Bé của Policy cuối (null = Policy lấy lúc chưa ai đăng nhập).</param>
    /// <param name="goi">Gói đã đọc của bé <paramref name="be"/> (<see cref="Doc"/>), <paramref name="goiLuc"/> lúc máy chủ dựng.</param>
    public static Policy? ChoBe(Policy policy, string? policyBe, string? be, bool mayRieng, Policy? goi, DateTimeOffset? goiLuc,
        HoSoBe? hoSoBe, DateTimeOffset? hoSoLuc)
    {
        if (be == null || be == policyBe || mayRieng) return null;
        if (goi != null)
        {
            var p = goi.SaoNong();
            p.CheDo = policy.CheDo;
            if (string.IsNullOrWhiteSpace(p.ChildName) && hoSoBe?.Ten is { Length: > 0 } ten) p.ChildName = ten;
            if (hoSoBe?.Sao is int s && hoSoLuc is { } hl && (goiLuc is not { } gl || hl > gl))
            {
                p.Sao = s;
                p.SoSao = new SoSaoMay { Sao = s, No = Math.Max(0, -s), PhutCon = Math.Max(0, s), HetSao = s <= 0, SaoTieuDuoc = Math.Max(0, s) };
                if (p.QuyConPhut != null) p.QuyConPhut = Math.Max(0, s);
            }
            return p;
        }
        var k = policy.SaoNong();
        k.Locked = true;
        k.LockReason = LockReasons.CanMang;
        k.ChildName = hoSoBe?.Ten ?? "";
        k.Sao = hoSoBe?.Sao;
        k.SoSao = hoSoBe?.Sao is int s2 ? new SoSaoMay { Sao = s2, No = Math.Max(0, -s2), PhutCon = Math.Max(0, s2), HetSao = s2 <= 0 } : null;
        k.QuyConPhut = 0;
        k.GioiHan = null;
        k.MinutesLeft = null;
        k.GrantEndsAt = null;
        k.MoHet = false;
        k.CheDoCon = null;
        k.CanExchangePoints = false;
        k.PlayChoices = new();
        k.PlaySessionId = null; k.PlayApp = null; k.PlayWeb = false; k.PlayOfflineMinutes = null;
        return k;
    }
}
