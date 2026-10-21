using System.Diagnostics;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;

namespace AiiGrow.Tray;

internal static class UI
{
    public static readonly Color Green = Color.FromArgb(0x15, 0x80, 0x3d);
    public static readonly Color GreenDark = Color.FromArgb(0x0f, 0x2a, 0x1f);
    public static readonly Color Paper = Color.FromArgb(0xfb, 0xfb, 0xfa);
    public static readonly Color Muted = Color.FromArgb(0x5f, 0x66, 0x60);

    public static Font F(float pt, FontStyle st = FontStyle.Regular) => new("Segoe UI", pt, st);

    public static Button Btn(string text, bool primary = true, int width = 260)
    {
        var b = new Button
        {
            Text = text,
            Width = width,
            Height = 46,
            FlatStyle = FlatStyle.Flat,
            Font = F(11.5f, FontStyle.Bold),
            Cursor = Cursors.Hand,
            BackColor = primary ? Green : Color.White,
            ForeColor = primary ? Color.White : Green,
            UseVisualStyleBackColor = false,
        };
        b.FlatAppearance.BorderColor = Green;
        b.FlatAppearance.BorderSize = 1;
        return b;
    }

    public static Label Text(string text, float pt = 11f, bool bold = false, Color? color = null, int maxWidth = 380)
        => new()
        {
            Text = text,
            AutoSize = true,
            MaximumSize = new Size(maxWidth, 0),
            Font = F(pt, bold ? FontStyle.Bold : FontStyle.Regular),
            ForeColor = color ?? Color.FromArgb(0x1f, 0x29, 0x24),
            Margin = new Padding(0, 0, 0, 8),
        };

    /// <summary>Biểu tượng khay: hình tròn xanh lá có chữ A (vẽ lúc chạy, không cần file ảnh).</summary>
    public static Icon MakeIcon()
    {
        using var bmp = new Bitmap(32, 32);
        using (var g = Graphics.FromImage(bmp))
        {
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = System.Drawing.Text.TextRenderingHint.AntiAliasGridFit;
            using var br = new SolidBrush(Green);
            g.FillEllipse(br, 1, 1, 30, 30);
            using var f = new Font("Segoe UI", 15f, FontStyle.Bold, GraphicsUnit.Pixel);
            var sz = g.MeasureString("A", f);
            g.DrawString("A", f, Brushes.White, (32 - sz.Width) / 2, (32 - sz.Height) / 2 + 1);
        }
        var h = bmp.GetHicon();
        var icon = (Icon)Icon.FromHandle(h).Clone();
        DestroyIcon(h);
        return icon;
    }

    [DllImport("user32.dll")] private static extern bool DestroyIcon(IntPtr h);
    [DllImport("user32.dll")] public static extern bool LockWorkStation();
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
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
