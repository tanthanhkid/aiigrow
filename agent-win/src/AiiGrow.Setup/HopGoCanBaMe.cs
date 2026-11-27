using AiiGrow.ClayUi;
using AiiGrow.Core;

namespace AiiGrow.Setup;

/// <summary>#739: hộp «Gỡ AiiGrow cần Ba Mẹ» — mã mở máy HOẶC tài khoản + mật khẩu quản trị. Trả null nếu Ba Mẹ huỷ.</summary>
internal static class HopGoCanBaMe
{
    public sealed record DuLieu(string Ma, string TaiKhoan, string MatKhau);

    public static DuLieu? Hoi(string? loi)
    {
        using var f = new Form
        {
            Text = "Gỡ AiiGrow", FormBorderStyle = FormBorderStyle.FixedDialog, MaximizeBox = false, MinimizeBox = false,
            ShowInTaskbar = true, StartPosition = FormStartPosition.CenterScreen, BackColor = Clay.Nen, ForeColor = Clay.Chu, Font = PhongChu.Tao(11f),
        };
        int le = Clay.Si(28), rong = Clay.Si(420), y = Clay.Si(24);
        Label Nhan(string t, float pt, FontStyle st, Color mau, int cao)
        {
            var l = new Label { Text = t, AutoSize = false, UseMnemonic = false, BackColor = Color.Transparent, ForeColor = mau, Font = PhongChu.Tao(pt, st), Location = new Point(le, y), Size = new Size(rong, cao) };
            y += cao + Clay.Si(6);
            f.Controls.Add(l);
            return l;
        }
        TextBox O(bool matKhau)
        {
            var t = new TextBox { Location = new Point(le, y), Size = new Size(rong, Clay.Si(30)), Font = PhongChu.Tao(12f), UseSystemPasswordChar = matKhau };
            y += Clay.Si(40);
            f.Controls.Add(t);
            return t;
        }
        Nhan("Gỡ AiiGrow cần Ba Mẹ", 16f, FontStyle.Bold, Clay.Chu, Clay.Si(34));
        Nhan("Nhập mã mở máy trong app Ba Mẹ (6 số), hoặc tài khoản + mật khẩu quản trị Windows của Ba Mẹ.", 10.5f, FontStyle.Regular, Clay.Chu2, Clay.Si(48));
        if (!string.IsNullOrEmpty(loi)) Nhan(loi, 10.5f, FontStyle.Bold, Clay.Loi, Clay.Si(24));
        Nhan("Mã mở máy", 10f, FontStyle.Bold, Clay.Chu3, Clay.Si(20));
        var ma = O(false); ma.MaxLength = 12;
        Nhan("Hoặc: tài khoản quản trị của Ba Mẹ", 10f, FontStyle.Bold, Clay.Chu3, Clay.Si(20));
        var tk = O(false);
        Nhan("Mật khẩu", 10f, FontStyle.Bold, Clay.Chu3, Clay.Si(20));
        var mk = O(true);
        var vienLe = VeNut.LeBong;
        ClayButton Nut(string t, bool chinh, int x, DialogResult kq) => new()
        {
            Text = t, Size = new Size(Clay.Si(120) + vienLe.Horizontal, Clay.Si(44) + vienLe.Vertical), Font = PhongChu.Tao(11f, FontStyle.Bold),
            BackColor = chinh ? Clay.Ngoc : Clay.The, ForeColor = Clay.Chu, LaChinh = chinh, DialogResult = kq, Location = new Point(x - vienLe.Left, y + Clay.Si(8)),
        };
        var gui = Nut("Gỡ", true, le + rong - Clay.Si(120), DialogResult.OK);
        var huy = Nut("Không gỡ", false, le + rong - Clay.Si(120) * 2 - Clay.Si(12), DialogResult.Cancel);
        f.Controls.AddRange(new Control[] { gui, huy });
        f.AcceptButton = gui; f.CancelButton = huy;
        f.ClientSize = new Size(le * 2 + rong, gui.Bottom + Clay.Si(24));
        Clay.KhongMnemonic(f);
        return f.ShowDialog() == DialogResult.OK ? new DuLieu(ma.Text, tk.Text, mk.Text) : null;
    }
}
