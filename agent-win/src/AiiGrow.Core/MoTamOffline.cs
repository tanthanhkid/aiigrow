namespace AiiGrow.Core;

/// <summary>Kết quả một lần Con gõ mã mở offline.</summary>
public enum KetQuaMoOffline
{
    /// <summary>Mã đúng ⇒ máy mở tới <see cref="MoTamOffline.UnlockUntil"/>.</summary>
    DaMo,
    /// <summary>Gõ lại đúng mã vừa dùng khi máy còn đang mở ⇒ không cộng thêm giờ.</summary>
    DangMo,
    /// <summary>Mã sai (hoặc không đủ 6 số).</summary>
    Sai,
    /// <summary>Mã đã dùng rồi (đã hết lượt mở của mã đó) ⇒ cần Ba Mẹ đọc mã mới.</summary>
    DaDung,
    /// <summary>Sai quá nhiều lần ⇒ tạm không nhận mã.</summary>
    ChoThuLai,
    /// <summary>Máy chưa từng nhận bí mật (chưa kết nối mạng lần nào sau khi cài/ghép).</summary>
    ChuaCoBiMat,
}

/// <summary>
/// Trạng thái «mở tạm bằng mã offline» (lớp THUẦN, lưu trong <see cref="AgentConfig.MoTamOffline"/> để dịch vụ khởi động lại vẫn giữ).
/// An toàn: mã TOTP 6 số do Ba Mẹ đọc (<see cref="MaOffline.Kiem"/>); sai tối đa <see cref="SaiToiDa"/> lần trong
/// <see cref="CuaSoSaiPhut"/> phút rồi phải chờ (Con không dò được 10⁶ mã); một mã chỉ mở được một lượt; có hạn giờ; mọi lần mở/khoá dò đều ghi sự kiện.
/// Chỉ nới phần khoá giải trí / hết giờ — «Khoá ngay» và giờ ngủ của Ba Mẹ vẫn giữ (giống «mở khẩn cấp», docs/API.md).
/// </summary>
public sealed class MoTamOffline
{
    public const int PhutMoMacDinh = 60;
    public const int SaiToiDa = 5;
    public const int CuaSoSaiPhut = 10;
    /// <summary>Một mã còn được chấp nhận tối đa (2·dung sai + 1) bước ⇒ nhớ mã đã dùng lâu hơn thế một bước cho chắc.</summary>
    public static readonly TimeSpan NhoMaDaDung = TimeSpan.FromSeconds(MaOffline.BuocGiay * (2 * MaOffline.DungSai + 2));

    public DateTimeOffset? UnlockFrom { get; set; }
    public DateTimeOffset? UnlockUntil { get; set; }
    public string? LastCode { get; set; }
    public DateTimeOffset? LastCodeAt { get; set; }
    public List<DateTimeOffset> WrongAt { get; set; } = new();

    /// <summary>Đang mở? Đồng hồ bị lùi về trước lúc mở ⇒ coi như không mở (không cho kéo dài bằng cách chỉnh giờ).</summary>
    public bool IsUnlocked(DateTimeOffset now)
        => UnlockUntil.HasValue && UnlockUntil.Value > now && (!UnlockFrom.HasValue || now >= UnlockFrom.Value.AddMinutes(-1));

    /// <summary>Số giây còn phải chờ trước khi được gõ mã tiếp (0 = gõ được).</summary>
    public int WaitSeconds(DateTimeOffset now)
    {
        Prune(now);
        if (WrongAt.Count < SaiToiDa) return 0;
        // mốc sai cũ nhất còn trong cửa sổ hết hạn thì được gõ lại
        var oldest = WrongAt.Where(t => t <= now).DefaultIfEmpty(now).Min();
        return (int)Math.Max(1, Math.Ceiling((oldest.AddMinutes(CuaSoSaiPhut) - now).TotalSeconds));
    }

    /// <summary>Con gõ mã Ba Mẹ đọc. Thành công ⇒ mở tới now + phut.</summary>
    public KetQuaMoOffline TryUnlock(string? secret, string? code, DateTimeOffset now, int phut = PhutMoMacDinh)
    {
        if (string.IsNullOrEmpty(secret)) return KetQuaMoOffline.ChuaCoBiMat;
        if (WaitSeconds(now) > 0) return KetQuaMoOffline.ChoThuLai;

        var sach = new string((code ?? "").Where(char.IsDigit).ToArray());
        bool trungMaCu = LastCode != null && LastCodeAt.HasValue && sach == LastCode
                         && now - LastCodeAt.Value < NhoMaDaDung && now >= LastCodeAt.Value.AddMinutes(-1);
        if (trungMaCu)
            return IsUnlocked(now) ? KetQuaMoOffline.DangMo : KetQuaMoOffline.DaDung;

        if (!MaOffline.Kiem(secret, sach, now))
        {
            WrongAt.Add(now);
            return KetQuaMoOffline.Sai;
        }

        phut = Math.Clamp(phut, 5, 120);
        UnlockFrom = now;
        UnlockUntil = now.AddMinutes(phut);
        LastCode = sach;
        LastCodeAt = now;
        WrongAt.Clear();
        return KetQuaMoOffline.DaMo;
    }

    private void Prune(DateTimeOffset now)
    {
        var tu = now.AddMinutes(-CuaSoSaiPhut);
        // mốc "ở tương lai" (đồng hồ bị lùi) vẫn giữ để không xoá được lượt sai bằng cách chỉnh giờ
        WrongAt.RemoveAll(t => t <= tu);
        if (WrongAt.Count > 50) WrongAt.RemoveRange(0, WrongAt.Count - 50);
    }

    /// <summary>Câu trả lời cho Con (không nhắc điểm/số dư).</summary>
    public string Cau(KetQuaMoOffline kq, DateTimeOffset now) => kq switch
    {
        KetQuaMoOffline.DaMo => $"Đã mở {Math.Max(1, (int)Math.Round((UnlockUntil!.Value - now).TotalMinutes))} phút (tới {UnlockUntil!.Value.ToLocalTime():HH:mm}). Chơi vui nhé!",
        KetQuaMoOffline.DangMo => $"Máy đang mở tới {UnlockUntil!.Value.ToLocalTime():HH:mm} rồi nhé.",
        KetQuaMoOffline.Sai => "Mã chưa đúng. Con nhờ Ba Mẹ đọc lại nhé.",
        KetQuaMoOffline.DaDung => "Mã này dùng rồi. Con nhờ Ba Mẹ đọc mã mới nhé.",
        KetQuaMoOffline.ChoThuLai => $"Con gõ sai nhiều lần quá. Thử lại sau {Math.Max(1, (WaitSeconds(now) + 59) / 60)} phút nhé.",
        KetQuaMoOffline.ChuaCoBiMat => "Máy chưa nhận được mã của Ba Mẹ. Cần nối mạng một lần đã nhé.",
        _ => "Chưa mở được.",
    };

    /// <summary>Áp «mở tạm» lên kết quả policy: bỏ danh sách chặn app và MỌI khoá (hết giờ, giờ ngủ, «Khoá ngay»).
    /// Mã do chính Ba Mẹ đọc cho Con, và khi mất mạng đây là đường DUY NHẤT để mở máy — không được để máy kẹt khoá (Thanh 22/10).</summary>
    public static EffectivePolicy ApDung(EffectivePolicy eff, bool moTam)
    {
        if (!moTam) return eff;
        bool conKhoa = eff.Locked && !MoDuocKhoa(eff.LockReason);
        return eff with { Locked = conKhoa, LockReason = conKhoa ? eff.LockReason : null, AppLockerWanted = false };
    }

    /// <summary>Lý do khoá nào mã offline gỡ được (để màn khoá biết có nên hiện ô nhập mã).</summary>
    public static bool MoDuocKhoa(string? reason) => reason is LockReasons.HetGio or LockReasons.Ngu or LockReasons.Khoa;
}
