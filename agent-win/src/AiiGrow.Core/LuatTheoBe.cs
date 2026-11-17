using System.Text.Json;

namespace AiiGrow.Core;

// #337 (17/11): MÁY CHUNG — luật, sao, giới hạn đi theo TỪNG bé kể cả khi mất mạng.
// Máy chủ chỉ gửi luật của bé đang đăng nhập ở dong-bo; trước đây bé B vào lúc mất mạng dùng tạm Policy của bé A (cả cờ khoá, bỏ giới hạn ngày).
// Giờ agent xin `GET ho-so?offline=1` ⇒ mỗi `con[i].offline` = phản hồi dong-bo như thể bé đó đăng nhập; lưu theo bé ở AgentConfig.GoiLuatBe
// (sống qua khởi động lại). Bé đang dùng khác bé của Policy cuối ⇒ dùng gói của đúng bé; không có gói ⇒ khoá «Cần có mạng» (LockReasons.CanMang).
// Lớp THUẦN (test được); AgentRuntime / NguoiDungMay gọi vào.

/// <summary>Luật của một bé (phản hồi dong-bo thô) + mốc giờ MÁY CHỦ của luật đó + phần máy đã đếm trên luật này (chưa có trong số của máy chủ).</summary>
public sealed class GoiLuatBe
{
    public string Raw { get; set; } = "";
    /// <summary>Giờ máy chủ lúc dựng luật (ho-so.offlineLuc / serverTime của dong-bo) — cùng nguồn với mốc ho-so khi so số sao.</summary>
    public DateTimeOffset Luc { get; set; }
    /// <summary>Băm nội dung luật (bỏ serverTime) — ho-so tải lại mà luật y nguyên thì không ghi lại cấu hình.</summary>
    public string Bam { get; set; } = "";
    /// <summary>Giây «Tính phút» máy đã đếm trên luật này (bé rời máy lúc mất mạng / đồng bộ cho bé khác) — trừ tiếp khi bé quay lại.</summary>
    public double GiayDaDem { get; set; }
    /// <summary>Giây dùng máy (trừ app học) đã đếm trên luật này — MinutesLeft.</summary>
    public double DungGiay { get; set; }
}

public static class LuatTheoBe
{
    /// <summary>Băm nội dung luật, bỏ các khoá `serverTime` (đổi mỗi lần hỏi) — so «luật có đổi không».</summary>
    public static string BamNoiDung(string raw)
    {
        string chuan;
        try { using var doc = JsonDocument.Parse(raw); var sb = new System.Text.StringBuilder(); Viet(doc.RootElement, sb); chuan = sb.ToString(); }
        catch (JsonException) { chuan = raw; }
        return Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(chuan)));

        static void Viet(JsonElement e, System.Text.StringBuilder sb)
        {
            switch (e.ValueKind)
            {
                case JsonValueKind.Object:
                    sb.Append('{');
                    foreach (var pr in e.EnumerateObject())
                    {
                        if (pr.NameEquals("serverTime")) continue;
                        sb.Append(JsonSerializer.Serialize(pr.Name)).Append(':');
                        Viet(pr.Value, sb);
                        sb.Append(',');
                    }
                    sb.Append('}');
                    break;
                case JsonValueKind.Array:
                    sb.Append('[');
                    foreach (var x in e.EnumerateArray()) { Viet(x, sb); sb.Append(','); }
                    sb.Append(']');
                    break;
                default: sb.Append(e.GetRawText()); break;
            }
        }
    }

    /// <summary>Gộp gói luật của <paramref name="hs"/> vào <paramref name="goi"/>: bé có luật KHÁC (băm nội dung) ⇒ thay (phần đã đếm về 0 — số của máy chủ
    /// đã gồm phút gửi lên); luật y nguyên ⇒ giữ (không ghi lại cấu hình mỗi lần hỏi); bé không còn được gán máy ⇒ bỏ gói.
    /// Không đổi <paramref name="hs"/> (gọi <see cref="BoGoi"/> sau). → true nếu <paramref name="goi"/> đổi.</summary>
    /// <param name="thay">false = chỉ thêm gói cho bé chưa có (ho-so hỏi ngoài lượt đồng bộ: phút đã đếm có thể chưa gửi lên — giữ phần đã đếm của gói cũ).</param>
    public static bool Gop(Dictionary<string, GoiLuatBe> goi, HoSoMay hs, DateTimeOffset luc, bool thay = true)
    {
        var doi = false;
        var luc0 = hs.OfflineLuc ?? luc;
        foreach (var c in hs.Con)
        {
            if (c.Offline is { ValueKind: JsonValueKind.Object } o && !string.IsNullOrEmpty(c.Id))
            {
                var raw = o.GetRawText();
                var bam = BamNoiDung(raw);
                if (!goi.TryGetValue(c.Id, out var cu) || thay && cu.Bam != bam) { goi[c.Id] = new GoiLuatBe { Raw = raw, Luc = luc0, Bam = bam }; doi = true; }
            }
        }
        var con = hs.Con.Select(c => c.Id).ToHashSet();
        foreach (var k in goi.Keys.Where(k => !con.Contains(k)).ToList()) { goi.Remove(k); doi = true; }
        return doi;
    }

    /// <summary>Bé <paramref name="be"/> rời máy (đổi người / đăng xuất): cất luật + phần đã đếm MỚI NHẤT của bé vào gói của bé đó, để lúc quay lại (mất mạng,
    /// kể cả sau khi máy đồng bộ cho bé khác) không dùng gói ho-so cũ với số sao chưa trừ.
    /// <list type="bullet">
    /// <item>Bé là chủ Policy cuối ⇒ gói = Policy cuối (dong-bo thô, mốc serverTime) + giây đã đếm trên Policy đó.</item>
    /// <item>Bé đang theo gói ⇒ cộng giây đếm riêng của bé vào gói.</item>
    /// </list> → true nếu gói đổi.</summary>
    public static bool CatBeRoi(Dictionary<string, GoiLuatBe> goi, string be, string? policyBe, string? policyRaw, DateTimeOffset? policyLuc,
        double quyGiay, double dungGiay, double giayBe, double dungBe)
    {
        if (string.IsNullOrEmpty(be)) return false;
        if (be == policyBe)
        {
            if (string.IsNullOrWhiteSpace(policyRaw) || policyLuc is not { } l) return false;
            if (goi.TryGetValue(be, out var cu) && cu.Luc > l) return false;   // đã có gói máy chủ dựng sau Policy này
            goi[be] = new GoiLuatBe { Raw = policyRaw, Luc = l, Bam = BamNoiDung(policyRaw), GiayDaDem = quyGiay, DungGiay = dungGiay };
            return true;
        }
        if (!goi.TryGetValue(be, out var g) || giayBe <= 0 && dungBe <= 0) return false;
        g.GiayDaDem += Math.Max(0, giayBe);
        g.DungGiay += Math.Max(0, dungBe);
        return true;
    }

    /// <summary>Bỏ gói khỏi danh sách bé (lưu gọn ở DangNhap.HoSo, so đổi được; gửi sang khay không kèm luật).</summary>
    public static void BoGoi(HoSoMay hs)
    {
        foreach (var c in hs.Con) c.Offline = null;
        hs.OfflineLuc = null;
    }

    /// <summary>Đọc gói (như Policy dong-bo). Hỏng ⇒ null (coi như không có gói ⇒ khoá).</summary>
    public static Policy? Doc(GoiLuatBe? g) => g != null && PolicyParser.TryParse(g.Raw, out var p) ? p : null;

    /// <summary>Policy cho bé đang dùng khi bé đó KHÁC bé của Policy cuối. null ⇒ dùng Policy cuối như cũ (cùng bé / máy riêng / chưa ai /
    /// có mạng mà chưa có gói — lượt dong-bo sắp tới mang luật của bé).
    /// <list type="bullet">
    /// <item>Có gói ⇒ luật của đúng bé (khoá, danh sách, giới hạn, phiên chơi); chế độ chặn của máy giữ theo Policy cuối. Số sao: ho-so (`con[].sao`)
    /// dựng SAU gói (cùng đồng hồ máy chủ) ⇒ lấy ho-so; nợ / sao tiêu được giữ số máy chủ tính.</item>
    /// <item>Mất mạng thật + không có gói (máy chung) ⇒ khoá «Cần có mạng để mở máy cho &lt;tên&gt;» — không mượn luật / sao của bé khác.</item>
    /// </list></summary>
    /// <param name="policyBe">Bé của Policy cuối (null = Policy lấy lúc chưa ai đăng nhập).</param>
    /// <param name="goi">Gói đã đọc của bé <paramref name="be"/> (<see cref="Doc"/>), <paramref name="goiLuc"/> giờ máy chủ dựng gói.</param>
    /// <param name="hoSoLuc">Giờ MÁY CHỦ của lượt ho-so có <paramref name="hoSoBe"/> (ho-so.offlineLuc); null = không biết ⇒ không lấy sao ho-so.</param>
    public static Policy? ChoBe(Policy policy, string? policyBe, string? be, bool mayRieng, Policy? goi, DateTimeOffset? goiLuc,
        HoSoBe? hoSoBe, DateTimeOffset? hoSoLuc, bool offline = true)
    {
        if (be == null || be == policyBe || mayRieng) return null;
        if (goi != null)
        {
            var p = goi.SaoNong();
            p.CheDo = policy.CheDo;
            if (string.IsNullOrWhiteSpace(p.ChildName) && hoSoBe?.Ten is { Length: > 0 } ten) p.ChildName = ten;
            if (hoSoBe?.Sao is int s && hoSoLuc is { } hl && goiLuc is { } gl && hl > gl)
            {
                var cu = goi.SoSao;
                p.Sao = s;
                p.SoSao = new SoSaoMay
                {
                    Sao = s, PhutCon = Math.Max(0, s), HetSao = s <= 0, No = cu?.No ?? 0, CanhBaoNo = cu?.CanhBaoNo ?? false,
                    SaoTieuDuoc = cu?.SaoTieuDuoc is double st ? Math.Min(st, Math.Max(0, s)) : null,
                };
                if (p.QuyConPhut != null) p.QuyConPhut = Math.Max(0, s);
            }
            return p;
        }
        if (!offline) return null;
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
