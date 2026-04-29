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
            
            try
            {
                IntPtr handle = GetForegroundWindow();
                if (handle != IntPtr.Zero)
                {
                    const int nChars = 256;
                    StringBuilder buff = new StringBuilder(nChars);
                    if (GetWindowText(handle, buff, nChars) > 0)
                    {
                        string windowTitle = buff.ToString();
                        string processName = "Unknown";
                        try
                        {
                            GetWindowThreadProcessId(handle, out uint processId);
                            Process proc = Process.GetProcessById((int)processId);
                            processName = proc.ProcessName;
                        }
                        catch
                        {
                            // Ignore access denied for elevated processes
                        }
                        
                        
                        // Check if window changed or it's been more than 5 minutes since last sync
                        if (_lastActivity == null || _lastActivity.ProcessName != processName || _lastActivity.WindowTitle != windowTitle || (DateTime.Now - _lastActivity.Timestamp).TotalMinutes >= 5)
                        {
                            _lastActivity = new WindowActivity
                            {
                                ProcessName = processName,
                                WindowTitle = windowTitle,
                                Timestamp = DateTime.Now
                            };
                            OnActivityChanged?.Invoke(_lastActivity);
                        }
                    }
                }
            }
            catch (Exception)
            {
                // Ignore process access denied errors
            }

            IsWorking = false;
        }
    }
}
