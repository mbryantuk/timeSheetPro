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

        private System.Timers.Timer _timer;
        private WindowActivity? _lastActivity;

        public event Action<WindowActivity>? OnActivityChanged;

        public WatcherService(double intervalMs = 5000)
        {
            _timer = new System.Timers.Timer(intervalMs);
            _timer.Elapsed += (s, e) => CheckForegroundWindow();
        }

        public void Start() => _timer.Start();
        public void Stop() => _timer.Stop();

        public bool IsWorking { get; private set; } = false;

        private void CheckForegroundWindow()
        {
            IsWorking = true;
            // ... (rest of logic) ...
            
            OnActivityChanged?.Invoke(_lastActivity);
            IsWorking = false;
        }
    }
}
