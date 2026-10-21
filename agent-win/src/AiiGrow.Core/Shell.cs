using System.Diagnostics;
using System.Text;

namespace AiiGrow.Core;

public sealed record ShellResult(int ExitCode, string Output, string Error)
{
    public bool Ok => ExitCode == 0;
}

public static class Shell
{
    public static ShellResult Run(string file, IEnumerable<string> args, int timeoutMs = 120000,
        IDictionary<string, string>? env = null)
    {
        var psi = new ProcessStartInfo(file)
        {
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
            StandardOutputEncoding = Encoding.UTF8,
            StandardErrorEncoding = Encoding.UTF8,
        };
        foreach (var a in args) psi.ArgumentList.Add(a);
        if (env != null) foreach (var kv in env) psi.Environment[kv.Key] = kv.Value;

        try
        {
            using var p = Process.Start(psi);
            if (p == null) return new ShellResult(-1, "", "không chạy được " + file);
            var o = p.StandardOutput.ReadToEndAsync();
            var e = p.StandardError.ReadToEndAsync();
            if (!p.WaitForExit(timeoutMs))
            {
                try { p.Kill(true); } catch { }
                return new ShellResult(-1, "", "hết thời gian chờ");
            }
            p.WaitForExit();
            return new ShellResult(p.ExitCode, o.Result, e.Result);
        }
        catch (Exception ex)
        {
            return new ShellResult(-1, "", ex.Message);
        }
    }

    /// <summary>Chạy PowerShell 5.1 (có module AppLocker) bằng -EncodedCommand để khỏi lo ngoặc kép.</summary>
    public static ShellResult PowerShell(string script, int timeoutMs = 120000, IDictionary<string, string>? env = null)
    {
        var full = "$ErrorActionPreference='Stop'; $ProgressPreference='SilentlyContinue'; " +
                   "[Console]::OutputEncoding=[System.Text.Encoding]::UTF8; " + script;
        var b64 = Convert.ToBase64String(Encoding.Unicode.GetBytes(full));
        return Run("powershell.exe",
            new[] { "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-OutputFormat", "Text", "-EncodedCommand", b64 },
            timeoutMs, env);
    }

    /// <summary>Đặt chuỗi vào dấu nháy đơn của PowerShell.</summary>
    public static string PsQuote(string s) => "'" + s.Replace("'", "''") + "'";
}
