namespace AiiGrow.Setup;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();
        if (args.Any(a => a.Equals("--uninstall", StringComparison.OrdinalIgnoreCase)))
        {
            if (MessageBox.Show("Gỡ AiiGrow khỏi máy này?", "AiiGrow", MessageBoxButtons.YesNo) == DialogResult.Yes)
                MessageBox.Show(Installer.Uninstall(), "AiiGrow");
            return;
        }
        Application.Run(new SetupForm());
    }
}
