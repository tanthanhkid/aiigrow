namespace AiiGrow.Core;

/// <summary>
/// #739: cổng gỡ TẠI MÁY (AiiGrow.Setup --uninstall). Trước đây bé mở Start › AiiGrow › Uninstall là gỡ sạch; giờ phải có Ba Mẹ:
/// • mã mở máy Ba Mẹ xem trong app (cùng bí mật <see cref="AgentConfig.MaOfflineBiMat"/>, máy tự kiểm, không cần mạng), hoặc
/// • tài khoản + mật khẩu quản trị của Ba Mẹ (tài khoản của bé là Standard nên không có mật khẩu này).
/// Máy chưa ghép (không có gì để bảo vệ) thì không hỏi.
/// </summary>
public static class CongGo
{
    public enum KetQua { Duoc, ThieuThongTin, Sai }

    public const string CauYeuCau = "Gỡ AiiGrow cần Ba Mẹ. Nhập mã mở máy trong app Ba Mẹ, hoặc tài khoản + mật khẩu quản trị Windows của Ba Mẹ.";
    public const string CauSai = "Mã hoặc mật khẩu chưa đúng. Ba Mẹ kiểm tra lại rồi thử lại.";

    /// <summary>Máy có cần hỏi Ba Mẹ không: đã ghép (có token) thì hỏi.</summary>
    public static bool CanHoi(AgentConfig? cfg) => cfg is { Paired: true };

    /// <param name="kiemMatKhau">(tài khoản, mật khẩu) ⇒ đúng là quản trị viên của máy (không phải tài khoản của bé).</param>
    public static KetQua Kiem(AgentConfig? cfg, string? ma, string? taiKhoan, string? matKhau, DateTimeOffset now, Func<string, string, bool> kiemMatKhau)
    {
        if (!CanHoi(cfg)) return KetQua.Duoc;
        var coMa = !string.IsNullOrWhiteSpace(ma);
        if (coMa && MaOffline.KiemPhut(cfg!.MaOfflineBiMat, ma, now) != null) return KetQua.Duoc;
        var coMatKhau = !string.IsNullOrWhiteSpace(taiKhoan) && !string.IsNullOrEmpty(matKhau);
        if (coMa && !coMatKhau) return KetQua.Sai;
        if (coMatKhau)
        {
            bool ok;
            try { ok = kiemMatKhau(taiKhoan!.Trim(), matKhau!); } catch { ok = false; }
            return ok ? KetQua.Duoc : KetQua.Sai;
        }
        return KetQua.ThieuThongTin;
    }
}
