using System;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Windows;
using Newtonsoft.Json;
using System.Drawing;
using System.Windows.Forms;
using TimeSheetPro.Client.Services;
using Application = System.Windows.Application;

namespace TimeSheetPro.Client
{
    public partial class App : Application
    {
        private NotifyIcon? _notifyIcon;
        private WatcherService? _watcher;
        private CaptureService? _capture;
        private OcrService? _ocr;
        private HttpClient? _http;
        public static string ServerUrl { get; set; } = "http://10.10.2.1:3001";
        
        private MainWindow? _statusWindow;

        protected override void OnStartup(StartupEventArgs e)
        {
            base.OnStartup(e);
            Application.Current.ShutdownMode = ShutdownMode.OnExplicitShutdown;

            // Load saved URL if exists
            if (File.Exists("settings.txt")) {
                ServerUrl = File.ReadAllText("settings.txt").Trim();
            }

            _http = new HttpClient { BaseAddress = new Uri(ServerUrl) };

            // Create tray icon
            _notifyIcon = new NotifyIcon
            {
                Visible = true,
                Text = "TimeSheetPro (Starting...)"
            };

            var menu = new ContextMenuStrip();
            menu.Items.Add("Status", null, (s, ev) => ShowStatusWindow());
            menu.Items.Add("-");
            menu.Items.Add("Exit", null, (s, ev) => ExitApplication());
            _notifyIcon.ContextMenuStrip = menu;

            _notifyIcon.DoubleClick += (s, ev) => ShowStatusWindow();

            _watcher = new WatcherService();
            _capture = new CaptureService();
            _ocr = new OcrService();

            _watcher.OnActivityChanged += Watcher_OnActivityChanged;
            _watcher.Start();

            UpdateTrayIcon(true, "TimeSheetPro (Running)");
        }

        private void UpdateTrayIcon(bool isOk, string tooltip)
        {
            if (_notifyIcon == null) return;
            Dispatcher.Invoke(() => {
                _notifyIcon.Text = tooltip.Length > 63 ? tooltip.Substring(0, 60) + "..." : tooltip;
                
                // Simple workaround to generate Green/Red icons in memory
                int size = 16;
                Bitmap bmp = new Bitmap(size, size);
                using (Graphics g = Graphics.FromImage(bmp))
                {
                    g.Clear(Color.Transparent);
                    g.FillEllipse(isOk ? Brushes.LimeGreen : Brushes.Red, 2, 2, size - 4, size - 4);
                    g.DrawEllipse(Pens.Black, 2, 2, size - 4, size - 4);
                }
                IntPtr hIcon = bmp.GetHicon();
                _notifyIcon.Icon = Icon.FromHandle(hIcon);
            });
        }

        private async void Watcher_OnActivityChanged(WindowActivity activity)
        {
            if (_capture == null || _ocr == null || _http == null || _notifyIcon == null) return;

            var now = DateTime.Now;
            var timeOfDay = now.TimeOfDay;
            bool isWeekday = now.DayOfWeek >= DayOfWeek.Monday && now.DayOfWeek <= DayOfWeek.Friday;
            bool isWorkingHours = timeOfDay >= new TimeSpan(9, 0, 0) && timeOfDay <= new TimeSpan(17, 30, 0);

            if (!isWeekday || !isWorkingHours)
            {
                UpdateTrayIcon(true, "TimeSheetPro (Outside Working Hours)");
                return;
            }

            if (activity == null) return;

            try
            {
                // Capture and OCR
                byte[] screenshot = _capture.CaptureActiveWindow();
                string ocrText = await _ocr.ExtractTextFromImageAsync(screenshot);
                string base64Image = screenshot != null ? Convert.ToBase64String(screenshot) : "";

                var payload = new
                {
                    process_name = activity.ProcessName ?? "Unknown",
                    window_title = activity.WindowTitle ?? "Unknown",
                    ocr_text = ocrText ?? "",
                    image_data = base64Image,
                    duration_ms = 5000,
                    task_id = (string?)null
                };

                // Local Logging
                string safeOcrText = (ocrText ?? "").Replace("\n", " ").Replace("\r", "");
                string logLine = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {activity.ProcessName} | {activity.WindowTitle} | OCR: {safeOcrText}";
                File.AppendAllLines("activity_log.txt", new[] { logLine });

                string json = JsonConvert.SerializeObject(payload);
                var response = await _http.PostAsync("/api/activities", new StringContent(json, Encoding.UTF8, "application/json"));
                
                if (response.IsSuccessStatusCode) {
                    UpdateTrayIcon(true, $"TimeSheetPro (Tracking: {activity.ProcessName})");
                } else {
                    string errorBody = await response.Content.ReadAsStringAsync();
                    File.AppendAllLines("error_log.txt", new[] { $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Server Error ({response.StatusCode}): {errorBody}" });
                    UpdateTrayIcon(false, "TimeSheetPro (Server Error)");
                }
            }
            catch (Exception ex)
            {
                File.AppendAllLines("error_log.txt", new[] { $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] Sync Exception: {ex.ToString()}" });
                UpdateTrayIcon(false, $"TimeSheetPro (Sync Error - check error_log.txt)");
            }
        }

        private void ShowStatusWindow()
        {
            if (_statusWindow == null)
            {
                _statusWindow = new MainWindow();
                _statusWindow.Closed += (s, e) => _statusWindow = null;
                _statusWindow.Show();
            }
            else
            {
                if (_statusWindow.WindowState == WindowState.Minimized)
                    _statusWindow.WindowState = WindowState.Normal;
                _statusWindow.Activate();
            }
        }

        public void UpdateServerUrl(string newUrl)
        {
            ServerUrl = newUrl;
            File.WriteAllText("settings.txt", newUrl);
            _http = new HttpClient { BaseAddress = new Uri(ServerUrl) };
            UpdateTrayIcon(true, "TimeSheetPro (URL Updated)");
        }

        private void ExitApplication()
        {
            _watcher?.Stop();
            if (_notifyIcon != null) _notifyIcon.Visible = false;
            Application.Current.Shutdown();
        }
    }
}
