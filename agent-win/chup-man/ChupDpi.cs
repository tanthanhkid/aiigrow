namespace AiiGrow.ChupMan;

/// <summary>
/// Giả lập DPI cho công cụ chụp: runner Windows chạy 96 dpi và không đổi được DPI hệ thống khi chưa đăng xuất, nên ảnh «150%» dựng bằng cách
/// nhân (1) cỡ mọi phông chữ và (2) hệ số Clay.Scale (Px/Si) với <see cref="K"/>. Đó đúng là hai thứ đổi khi Windows đặt 150% cho app SystemAware
/// không dùng AutoScaleMode như khay/bộ cài. KHÔNG giả lập được: kích thước do hệ thống vẽ (thanh tiêu đề, ô tick, thanh cuộn, ProgressBar).
/// </summary>
internal static class ChupDpi
{
    public static float K = 1f;

    public static System.Drawing.Font Tao(string family, float emSize) => new(family, emSize * K);
    public static System.Drawing.Font Tao(string family, float emSize, FontStyle style) => new(family, emSize * K, style);
    public static System.Drawing.Font Tao(string family, float emSize, FontStyle style, GraphicsUnit unit) => new(family, emSize * K, style, unit);
    /// <summary>Phông dựng từ phông khác (đổi kiểu): phông gốc đã nhân hệ số ⇒ giữ nguyên cỡ.</summary>
    public static System.Drawing.Font Tao(System.Drawing.Font prototype, FontStyle style) => new(prototype, style);

    /// <summary>Hệ số DPI thật của màn × K (thay cho «g.DpiX / 96f» trong Clay.Scale).</summary>
    public static float Dpi(float that) => that * K;
}
