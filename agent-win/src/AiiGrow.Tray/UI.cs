using System.Diagnostics;
using System.Runtime.InteropServices;
using AiiGrow.ClayUi;

namespace AiiGrow.Tray;

internal static class UI
{
    // Token màu «Clay gương» (docs/THIET-KE-CLAY.md §1, gốc mobile/src/lib/mau.ts) — lấy từ ClayUi.Clay; giữ tên cũ để chỗ gọi không đổi.
    // Tương phản: chữ trắng trên Green 6,4:1; Muted trên Paper 5,7:1; PointInk trên PointSoft 7,6:1; Error trên ErrorSoft 5,9:1.
    public static readonly Color Green = Clay.Ngoc;          // chinh
    public static readonly Color GreenDark = Clay.NgocInk;   // chinhInk
    public static readonly Color GreenSoft = Clay.NgocSoft;  // chinhSoft
    public static readonly Color Paper = Clay.Nen;           // nền trang
    public static readonly Color Card = Clay.The;            // thẻ / khối
    public static readonly Color Muted = Clay.Chu3;          // chu3
    public static readonly Color Ink = Clay.Chu;             // chu
    public static readonly Color Border = Color.FromArgb(0xe2, 0xd9, 0xca);      // vien2
    public static readonly Color PointInk = Clay.DiemInk;    // điểm: CHỈ dành cho điểm
    public static readonly Color PointSoft = Clay.DiemSoft;
    public static readonly Color Warn = Clay.Canh;           // canh
    public static readonly Color Error = Clay.Loi;           // loi
    public static readonly Color ErrorSoft = Clay.LoiSoft;

    public static Font F(float pt, FontStyle st = FontStyle.Regular) => new("Segoe UI", pt, st);

    /// <summary>Nút Clay (kẹo bọc đường khi <paramref name="primary"/>, đất sét sứ khi không). Cao 50 = thân 44 + lề bóng.</summary>
    public static Button Btn(string text, bool primary = true, int width = 260, string? icon = null)
    {
        var b = new ClayButton
        {
            Text = text,
            Width = width,
            Height = 50,
            Font = F(11.5f, FontStyle.Bold),
            BackColor = primary ? Green : Card,
            ForeColor = primary ? Color.White : Ink,
        };
        b.FlatAppearance.BorderColor = Green;
        if (icon != null) b.Image = Fluent(icon);
        return b;
    }

    public static Label Text(string text, float pt = 11f, bool bold = false, Color? color = null, int maxWidth = 380)
        => new()
        {
            Text = text,
            AutoSize = true,
            MaximumSize = new Size(maxWidth, 0),
            Font = F(pt, bold ? FontStyle.Bold : FontStyle.Regular),
            ForeColor = color ?? Ink,
            BackColor = Color.Transparent,   // thấy men của thẻ Clay phía sau
            Margin = new Padding(0, 0, 0, 8),
        };

    // ---- Biểu tượng + ảnh mascot nhúng trong exe (Assets/…, LogicalName ở .csproj) ----
    private static readonly Dictionary<string, Icon> IconCache = new();
    private static readonly Dictionary<string, Image?> ImgCache = new();

    private static Stream? Res(string name) => typeof(UI).Assembly.GetManifestResourceStream(name);

    /// <summary>Biểu tượng khay: mascot Rob màu khi đã kết nối; xám + chấm đỏ khi mất kết nối / dịch vụ không chạy / chưa ghép.</summary>
    public static Icon TrayIcon(bool ketNoi)
        => LoadIcon(ketNoi ? "aiigrow-khay.ico" : "aiigrow-khay-mat-ket-noi.ico", SystemInformation.SmallIconSize);

    /// <summary>Biểu tượng cửa sổ app to (thanh tiêu đề + taskbar).</summary>
    public static Icon AppIcon() => LoadIcon("aiigrow-khay.ico", SystemInformation.IconSize);

    private static Icon LoadIcon(string name, Size size)
    {
        var key = name + size.Width;
        if (IconCache.TryGetValue(key, out var c)) return c;
        try
        {
            using var st = Res(name);
            if (st != null) return IconCache[key] = new Icon(st, size);
        }
        catch (Exception e) { Debug.WriteLine(e); }
        return IconCache[key] = SystemIcons.Application;
    }

    /// <summary>Ảnh mascot theo tên (rob-goc, so-tay, xong, qua, chi, trong-loi, sao); null nếu thiếu tài nguyên.</summary>
    public static Image? Mascot(string name)
    {
        if (ImgCache.TryGetValue(name, out var c)) return c;
        Image? img = null;
        try
        {
            using var st = Res("mascot." + name + ".png");
            if (st != null) { using var raw = Image.FromStream(st); img = new Bitmap(raw); }
        }
        catch (Exception e) { Debug.WriteLine(e); }
        return ImgCache[name] = img;
    }

    /// <summary>Icon Fluent Emoji 3D (MIT, Assets/fluent/) theo tên tệp không đuôi (locked, alarm_clock…); null nếu thiếu.</summary>
    public static Image? Fluent(string name)
    {
        var key = "fluent:" + name;
        if (ImgCache.TryGetValue(key, out var c)) return c;
        Image? img = null;
        try
        {
            using var st = Res("fluent." + name + ".png");
            if (st != null) { using var raw = Image.FromStream(st); img = new Bitmap(raw); }
        }
        catch (Exception e) { Debug.WriteLine(e); }
        return ImgCache[key] = img;
    }

    private static float? _scale;
    /// <summary>Hệ số DPI của hệ thống (96 dpi = 1,0). Dùng cho kích thước tính bằng pixel trong code (app to).</summary>
    public static float Scale
    {
        get
        {
            if (_scale is { } v) return v;
            try { using var g = Graphics.FromHwnd(IntPtr.Zero); _scale = g.DpiX / 96f; }
            catch { _scale = 1f; }
            return _scale.Value;
        }
    }

    public static int Px(int v) => (int)Math.Round(v * Scale);

    [DllImport("user32.dll")] private static extern bool DestroyIcon(IntPtr h);
    [DllImport("user32.dll")] public static extern bool LockWorkStation();

    /// <summary>Báo trình duyệt đang mở (Chrome / Edge / Brave / Cốc Cốc) đọc lại chính sách của NGƯỜI DÙNG này ngay. Luật web nay nằm trong hive của Con (HKCU) —
    /// dịch vụ SYSTEM không làm mới được chính sách của người dùng khác, nên khay (chạy trong phiên Con) tự gọi RefreshPolicyEx(user, force).
    /// Chạy nền (có thể mất vài giây); lỗi thì thôi — khay vẫn nhắc Con «mở lại trình duyệt».</summary>
    public static void LamMoiChinhSachNguoiDung()
        => Task.Run(() => { try { AiiGrow.Core.WindowsWebPolicyRegistry.LamMoiChinhSach(may: false); } catch (Exception e) { Debug.WriteLine(e); } });

    /// <summary>«Ba Mẹ dùng máy» (#70 §1): chuyển người dùng — khoá phiên (Win+L), KHÔNG đăng xuất, phiên của Con giữ nguyên. Phiên chơi đang chạy tạm dừng,
    /// không trừ điểm: dịch vụ chỉ đếm khi phiên Con mở khoá và app chơi ở nền trước (TienCanhChoi).</summary>
    public static void NhuongMayChoBaMe() => LockWorkStation();
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("shell32.dll")] private static extern int SHQueryUserNotificationState(out int state);

    /// <summary>Con đang toàn màn hình / game D3D / trình chiếu / app đặt chế độ không làm phiền (Zoom, Teams…) ⇒ đừng bật cửa sổ đè lên.
    /// QUNS: 1 không có người, 2 bận (toàn màn hình), 3 D3D, 4 trình chiếu, 5 nhận thông báo, 6 giờ yên lặng sau cài, 7 app Store toàn màn hình.</summary>
    public static bool DangBanToanManHinh()
    {
        try { return SHQueryUserNotificationState(out var st) == 0 && st is 1 or 2 or 3 or 4 or 7; }
        catch { return false; }
    }
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);

    /// <summary>App đang ở tiền cảnh của phiên này: (tên exe, tên hiển thị). Rỗng nếu không có cửa sổ (vd màn hình khoá).</summary>
    public static (string Id, string Name) Foreground()
    {
        try
        {
            var h = GetForegroundWindow();
            if (h == IntPtr.Zero) return ("", "");
            GetWindowThreadProcessId(h, out var pid);
            if (pid == 0) return ("", "");
            using var p = Process.GetProcessById((int)pid);
            var id = p.ProcessName.ToLowerInvariant() + ".exe";
            var name = p.ProcessName;
            try
            {
                var d = p.MainModule?.FileVersionInfo.FileDescription;
                if (!string.IsNullOrWhiteSpace(d)) name = d!;
            }
            catch { }
            return (id, name);
        }
        catch
        {
            return ("", "");
        }
    }
}
