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
        public bool IsCall { get; set; } = false;
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
                        bool isCall = false;

                        try
                        {
                            GetWindowThreadProcessId(handle, out uint processId);
                            Process proc = Process.GetProcessById((int)processId);
                            processName = proc.ProcessName;
                            string procLower = processName.ToLower();
                            string titleLower = windowTitle.ToLower();

                            // Universal Call Detection
                            // 1. Teams
                            if (procLower.Contains("teams") && (windowTitle.Contains("| Microsoft Teams") || windowTitle.Contains("Meeting |")))
                            {
                                if (!windowTitle.StartsWith("Calendar") && !windowTitle.StartsWith("Activity"))
                                    isCall = true;
                            }
                            // 2. Zoom
                            else if (procLower.Contains("zoom"))
                            {
                                if (windowTitle.Contains("Zoom Meeting") || windowTitle.Contains("Zoom Webinar"))
                                    isCall = true;
                            }
                            // 3. Google Meet (usually in Chrome or Edge)
                            else if ((procLower.Contains("chrome") || procLower.Contains("msedge")) && 
                                     (windowTitle.Contains("Meet - ") || windowTitle.Contains("Google Meet")))
                            {
                                isCall = true;
                            }
                        }
                        catch
                        {
                            // Ignore access denied for elevated processes
                        }
                        
                        
                        // Always invoke activity update every 5 seconds for accurate duration tracking
                        _lastActivity = new WindowActivity
                        {
                            ProcessName = processName,
                            WindowTitle = windowTitle,
                            Timestamp = DateTime.Now,
                            IsCall = isCall
                        };
                        OnActivityChanged?.Invoke(_lastActivity);
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
