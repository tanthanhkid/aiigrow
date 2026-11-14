using AiiGrow.Core;

namespace AiiGrow.Tray;

internal static class Program
{
    /// <summary>Khay cũ tự chạy lại bằng bản mới sau cập nhật (TheoDoiExe): «--chay-lai [Mục]» ⇒ chờ khay cũ thoát rồi mới bật; có Mục ⇒ mở lại app ở mục đó.</summary>
    internal const string ThamSoChayLai = "--chay-lai";

    [STAThread]
    private static void Main(string[] args)
    {
        var chayLai = args.Length > 0 && args[0] == ThamSoChayLai;
        MucApp? moLai = chayLai && args.Length > 1 && Enum.TryParse<MucApp>(args[1], out var m) ? m : null;
        using var mutex = new Mutex(true, @"Local\AiiGrow.Tray", out var first);
        if (!first)
        {
            if (!chayLai) return;
            // khay cũ đang thoát (vừa gọi bản này lên) ⇒ chờ nó nhả khoá, tối đa 30 giây
            try { if (!mutex.WaitOne(TimeSpan.FromSeconds(30))) return; }
            catch (AbandonedMutexException) { /* khay cũ thoát không nhả khoá ⇒ coi như đã giành được */ }
        }
        try
        {
            ApplicationConfiguration.Initialize();
            Application.Run(new TrayContext(moLai));
        }
        finally
        {
            try { mutex.ReleaseMutex(); } catch { }
        }
    }
}
