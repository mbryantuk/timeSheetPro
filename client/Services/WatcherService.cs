using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using System.Timers;

namespace TimeSheetPro.Client.Services
{
    public class WindowActivity
    {
        public string ProcessName { get; set; } = "";
        public string WindowTitle { get; set; } = "";
        public DateTime Timestamp { get; set; }
    }

    public class WatcherService
    {
        [DllImport("user32.dll")]
        private static extern IntPtr GetForegroundWindow();

        [DllImport("user32.dll")]
        private static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

        [DllImport("user32.dll")]
        private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

        private Timer _timer;
        private WindowActivity? _lastActivity;

        public event Action<WindowActivity>? OnActivityChanged;

        public WatcherService(double intervalMs = 5000)
        {
            _timer = new Timer(intervalMs);
            _timer.Elapsed += (s, e) => CheckForegroundWindow();
        }

        public void Start() => _timer.Start();
        public void Stop() => _timer.Stop();

        private void CheckForegroundWindow()
        {
            IntPtr hWnd = GetForegroundWindow();
            if (hWnd == IntPtr.Zero) return;

            // Get Window Title
            StringBuilder titleBuilder = new StringBuilder(256);
            if (GetWindowText(hWnd, titleBuilder, 256) <= 0) return;
            string title = titleBuilder.ToString();

            // Get Process Name
            GetWindowThreadProcessId(hWnd, out uint processId);
            string processName = "Unknown";
            try
            {
                using (Process proc = Process.GetProcessById((int)processId))
                {
                    processName = proc.ProcessName;
                }
            }
            catch { }

            if (_lastActivity == null || _lastActivity.ProcessName != processName || _lastActivity.WindowTitle != title)
            {
                _lastActivity = new WindowActivity
                {
                    ProcessName = processName,
                    WindowTitle = title,
                    Timestamp = DateTime.Now
                };
                OnActivityChanged?.Invoke(_lastActivity);
            }
        }
    }
}
