using System.Text.Json;
using System.Text.RegularExpressions;

namespace AiiGrow.Core;

/// <summary>Một bài nộp (ảnh / ghi âm / viết) Con bấm «Nộp» lúc MẤT MẠNG — lưu nguyên thân POST hoc-vien/luot/:id/nop để có mạng gửi lại.</summary>
public sealed class BaiCho
{
    public string Ma { get; set; } = Guid.NewGuid().ToString("N");
    /// <summary>Đường khay (hoc-vien/luot/&lt;id&gt;/nop).</summary>
    public string Path { get; set; } = "";
    public string Body { get; set; } = "{}";
    public DateTimeOffset Luc { get; set; }
    public int LanLoi { get; set; }
}

/// <summary>
/// Hàng bài nộp chờ có mạng (L11: «bài nộp lúc mất mạng tự gửi khi có mạng»). Cùng luật với hàng lời xin (<see cref="HangXinCho"/>): quá
/// <see cref="HangXinCho.HetHan"/> (12 giờ) thì bỏ, lỗi đường truyền <see cref="HangXinCho.ThuToiDa"/> lần thì bỏ, máy chủ từ chối (4xx: đã nộp,
/// lượt hết hạn…) thì bỏ. Bài có ảnh / ghi âm nặng (tới ~2 MB) ⇒ mỗi bài MỘT tệp trong <c>ProgramData\AiiGrow\bai-cho</c> (chỉ SYSTEM/Administrators),
/// không nhét vào config. Cùng lượt nộp lại ⇒ thay bản cũ. Tối đa <see cref="ToiDa"/> bài.
/// </summary>
public sealed class BaiChoMang
{
    public const int ToiDa = 10;
    private static readonly Regex DuongNop = new("^hoc-vien/luot/[A-Za-z0-9_-]+/nop$", RegexOptions.Compiled);
    private readonly string _dir;

    public BaiChoMang(string dir) { _dir = dir; }

    public static string ThuMucMacDinh => System.IO.Path.Combine(Paths.DataDir, "bai-cho");

    /// <summary>Đường này là nộp bài (được lưu chờ mạng).</summary>
    public static bool LaNop(string? method, string? path) => string.Equals(method, "POST", StringComparison.OrdinalIgnoreCase) && path != null && DuongNop.IsMatch(path);

    private string Tep(string ma) => System.IO.Path.Combine(_dir, ma + ".json");

    public List<BaiCho> DanhSach()
    {
        var ra = new List<BaiCho>();
        if (!Directory.Exists(_dir)) return ra;
        foreach (var f in Directory.GetFiles(_dir, "*.json"))
        {
            try { if (JsonSerializer.Deserialize<BaiCho>(File.ReadAllText(f), Json.Options) is { } b) ra.Add(b); else File.Delete(f); }
            catch (JsonException) { try { File.Delete(f); } catch { } }
            catch (IOException) { }
        }
        return ra.OrderBy(b => b.Luc).ToList();
    }

    public int Dem() => Directory.Exists(_dir) ? Directory.GetFiles(_dir, "*.json").Length : 0;

    /// <summary>Lưu một bài; trả số bài đang chờ.</summary>
    public int Them(string path, string body, DateTimeOffset now)
    {
        Directory.CreateDirectory(_dir);
        var ds = DanhSach();
        foreach (var cu in ds.Where(b => b.Path == path)) Xoa(cu.Ma);
        foreach (var cu in ds.Where(b => b.Path != path).Take(Math.Max(0, ds.Count(b => b.Path != path) - (ToiDa - 1)))) Xoa(cu.Ma);
        var x = new BaiCho { Path = path, Body = body, Luc = now };
        File.WriteAllText(Tep(x.Ma), JsonSerializer.Serialize(x, Json.Options));
        return Dem();
    }

    private void Xoa(string ma) { try { File.Delete(Tep(ma)); } catch (IOException) { } }

    /// <summary>Gửi lần lượt (cũ trước). Lỗi mạng ⇒ tăng lần lỗi, dừng, giữ phần còn lại. Trả số bài đã gửi được.</summary>
    public async Task<int> GuiAsync(Func<BaiCho, Task<KetQuaGuiXin>> gui, DateTimeOffset now)
    {
        var daGui = 0;
        foreach (var b in DanhSach())
        {
            if (b.Luc > now) b.Luc = now;
            if (now - b.Luc > HangXinCho.HetHan) { Xoa(b.Ma); continue; }
            var kq = await gui(b);
            if (kq == KetQuaGuiXin.LoiMang)
            {
                b.LanLoi++;
                if (b.LanLoi >= HangXinCho.ThuToiDa) { Xoa(b.Ma); continue; }
                try { File.WriteAllText(Tep(b.Ma), JsonSerializer.Serialize(b, Json.Options)); } catch (IOException) { }
                break;
            }
            if (kq == KetQuaGuiXin.DaGui) daGui++;
            Xoa(b.Ma);
        }
        return daGui;
    }
}
