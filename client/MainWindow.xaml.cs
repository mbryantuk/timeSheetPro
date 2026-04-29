using System.IO;
using System.Windows;

namespace TimeSheetPro.Client
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
            TxtServerUrl.Text = App.ServerUrl;
            LoadLogs();
        }

        private void BtnSave_Click(object sender, RoutedEventArgs e)
        {
            ((App)System.Windows.Application.Current).UpdateServerUrl(TxtServerUrl.Text);
            System.Windows.MessageBox.Show("Server URL updated successfully.", "TimeSheetPro", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void BtnRefreshLogs_Click(object sender, RoutedEventArgs e)
        {
            LoadLogs();
        }

        private void LoadLogs()
        {
            try
            {
                if (File.Exists("activity_log.txt"))
                {
                    // Read file allowing other processes to write to it
                    using (var fs = new FileStream("activity_log.txt", FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                    using (var sr = new StreamReader(fs))
                    {
                        var allText = sr.ReadToEnd();
                        var lines = allText.Split(new[] { "\r\n", "\r", "\n" }, System.StringSplitOptions.RemoveEmptyEntries);
                        System.Array.Reverse(lines);
                        TxtLogs.Text = string.Join("\n\n", lines);
                    }
                    TxtLogs.ScrollToHome();
                }
                else
                {
                    TxtLogs.Text = "No activity logs found yet.";
                }
            }
            catch
            {
                TxtLogs.Text = "Failed to read activity log.";
            }
        }
    }
}
