using AiiGrow.Core;
using Microsoft.Data.Sqlite;
using Microsoft.Win32;

namespace AiiGrow.Service;

/// <summary>Đọc lịch sử duyệt web của trình duyệt họ Chromium (Chrome, Edge, Brave) trong hồ sơ Windows của Con.
/// Chép tệp «History» sang thư mục tạm rồi mở bản chép (trình duyệt đang chạy vẫn giữ tệp gốc) — không sửa, không xoá gì của Con.
/// Không đọc được: Firefox / Opera / Vivaldi, cửa sổ ẩn danh, lịch sử Con đã xoá (nên chế độ «Chặn thật» tắt ẩn danh + xoá lịch sử).</summary>
public sealed class ChromiumHistorySource
{
    private static readonly string[] ThuMucTrinhDuyet =
    {
        @"AppData\Local\Google\Chrome\User Data",
        @"AppData\Local\Microsoft\Edge\User Data",
        @"AppData\Local\BraveSoftware\Brave-Browser\User Data",
    };

    private static readonly HashSet<string> BoQua = new(StringComparer.OrdinalIgnoreCase)
        { "Public", "Default", "Default User", "All Users", "defaultuser0", "WDAGUtilityAccount" };

    /// <summary>Thư mục hồ sơ cần đọc: tài khoản Windows của Con (theo SID rồi theo tên) — chưa biết ⇒ mọi hồ sơ thật trong C:\Users.</summary>
    public static List<string> HoSoCanDoc(AgentConfig cfg)
    {
        var ds = new List<string>();
        if (!string.IsNullOrWhiteSpace(cfg.ChildSid))
        {
            try
            {
                using var hklm = RegistryKey.OpenBaseKey(RegistryHive.LocalMachine, RegistryView.Registry64);
                using var k = hklm.OpenSubKey(@"SOFTWARE\Microsoft\Windows NT\CurrentVersion\ProfileList\" + cfg.ChildSid);
                if (k?.GetValue("ProfileImagePath") is string p && Directory.Exists(Environment.ExpandEnvironmentVariables(p)))
                    ds.Add(Environment.ExpandEnvironmentVariables(p));
            }
            catch { /* thử cách theo tên */ }
        }
        var goc = Path.Combine(Path.GetPathRoot(Paths.DataDir) ?? @"C:\", "Users");
        if (ds.Count == 0 && !string.IsNullOrWhiteSpace(cfg.ChildUser))
        {
            var d = Path.Combine(goc, cfg.ChildUser.Trim());
            if (Directory.Exists(d)) ds.Add(d);
        }
        if (ds.Count == 0 && string.IsNullOrWhiteSpace(cfg.ChildUser) && string.IsNullOrWhiteSpace(cfg.ChildSid) && Directory.Exists(goc))
            ds.AddRange(Directory.EnumerateDirectories(goc).Where(d => !BoQua.Contains(Path.GetFileName(d))));
        return ds;
    }

    public List<WebVisit> Doc(IEnumerable<string> hoSo, DateTimeOffset tu)
    {
        var kq = new List<WebVisit>();
        foreach (var user in hoSo)
            foreach (var rel in ThuMucTrinhDuyet)
            {
                var goc = Path.Combine(user, rel);
                if (!Directory.Exists(goc)) continue;
                IEnumerable<string> cacHoSo;
                try { cacHoSo = Directory.EnumerateDirectories(goc).Where(d => { var n = Path.GetFileName(d); return n == "Default" || n.StartsWith("Profile ", StringComparison.Ordinal); }).ToList(); }
                catch { continue; }
                foreach (var hs in cacHoSo)
                {
                    var tep = Path.Combine(hs, "History");
                    if (!File.Exists(tep)) continue;
                    try { kq.AddRange(DocMot(tep, tu)); } catch { /* khoá / hỏng tệp: bỏ lượt này, lần sau thử lại */ }
                }
            }
        return kq;
    }

    private static List<WebVisit> DocMot(string tepGoc, DateTimeOffset tu)
    {
        var tam = Path.Combine(Path.GetTempPath(), "aiigrow-ls-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(tam);
        try
        {
            var dich = Path.Combine(tam, "History");
            Chep(tepGoc, dich);
            if (File.Exists(tepGoc + "-wal")) Chep(tepGoc + "-wal", dich + "-wal");   // dữ liệu mới nhất có thể còn nằm trong WAL
            var cs = new SqliteConnectionStringBuilder { DataSource = dich, Mode = SqliteOpenMode.ReadWriteCreate, Pooling = false }.ToString();
            var kq = new List<WebVisit>();
            using (var c = new SqliteConnection(cs))
            {
                c.Open();
                using var cmd = c.CreateCommand();
                // transition & 0xFF: 3 / 4 = khung con (quảng cáo, nhúng) — không phải Con chủ động mở trang
                cmd.CommandText = "select u.url, v.visit_time, v.visit_duration from visits v join urls u on u.id = v.url " +
                                  "where v.visit_time >= $tu and (v.transition & 255) not in (3, 4) order by v.visit_time";
                cmd.Parameters.AddWithValue("$tu", ChromeTime.FromDateTimeOffset(tu));
                using var r = cmd.ExecuteReader();
                while (r.Read())
                {
                    var url = r.IsDBNull(0) ? "" : r.GetString(0);
                    var luc = ChromeTime.ToDateTimeOffset(r.GetInt64(1)).ToLocalTime();
                    var giay = r.IsDBNull(2) ? 0 : r.GetInt64(2) / 1_000_000.0;
                    kq.Add(new WebVisit(url, luc, giay));
                }
            }
            SqliteConnection.ClearAllPools();
            return kq;
        }
        finally { try { Directory.Delete(tam, true); } catch { } }
    }

    private static void Chep(string nguon, string dich)
    {
        using var src = new FileStream(nguon, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
        using var dst = File.Create(dich);
        src.CopyTo(dst);
    }
}
