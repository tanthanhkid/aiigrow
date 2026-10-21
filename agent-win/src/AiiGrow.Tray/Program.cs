namespace AiiGrow.Tray;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        using var mutex = new Mutex(true, @"Local\AiiGrow.Tray", out var first);
        if (!first) return;
        ApplicationConfiguration.Initialize();
        Application.Run(new TrayContext());
    }
}
