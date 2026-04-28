using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Windows;
using System.Windows.Input;
using Newtonsoft.Json;
using TimeSheetPro.Client.Services;

namespace TimeSheetPro.Client
{
    public class KlientTask
    {
        public string Id { get; set; } = "";
        public string Name { get; set; } = "";
    }

    public partial class MainWindow : Window
    {
        private WatcherService _watcher;
        private CaptureService _capture;
        private OcrService _ocr;
        private HttpClient _http;

        public MainWindow()
        {
            InitializeComponent();
            
            _watcher = new WatcherService();
            _capture = new CaptureService();
            _ocr = new OcrService();
            _http = new HttpClient { BaseAddress = new Uri("http://10.10.1.168:3001") };

            _watcher.OnActivityChanged += Watcher_OnActivityChanged;
            _watcher.Start();

            // Position at bottom right (Portrait monitor optimized)
            var workArea = SystemParameters.WorkArea;
            this.Left = workArea.Right - this.Width - 20;
            this.Top = workArea.Bottom - this.Height - 20;

            LoadTasks();
            RefreshDailyTotal();
        }

        private async void LoadTasks()
        {
            try {
                var json = await _http.GetStringAsync("/api/tasks");
                var tasks = JsonConvert.DeserializeObject<List<KlientTask>>(json);
                Dispatcher.Invoke(() => {
                    ComboTasks.ItemsSource = tasks;
                    if (tasks?.Count > 0) ComboTasks.SelectedIndex = 0;
                });
            } catch {
                TxtDetails.Text = "Failed to load tasks from server.";
            }
        }

        private async void RefreshDailyTotal()
        {
            try {
                string today = DateTime.Now.ToString("yyyy-MM-dd");
                var json = await _http.GetStringAsync($"/api/reports/daily?date={today}");
                var report = JsonConvert.DeserializeObject<List<dynamic>>(json);
                double totalHours = report?.Sum(item => (double)item.hours) ?? 0;
                
                Dispatcher.Invoke(() => {
                    TxtTodayTime.Text = $"Today: {totalHours:F2}h";
                });
            } catch { }
        }

        private void Window_MouseLeftButtonDown(object sender, MouseButtonEventArgs e)
        {
            DragMove();
        }

        private void BtnRefresh_Click(object sender, RoutedEventArgs e)
        {
            LoadTasks();
            RefreshDailyTotal();
        }

        private void Close_Click(object sender, RoutedEventArgs e)
        {
            _watcher.Stop();
            this.Close();
        }

        private async void Watcher_OnActivityChanged(WindowActivity activity)
        {
            Dispatcher.Invoke(async () =>
            {
                TxtStatus.Text = $"Active: {activity.ProcessName}";
                TxtDetails.Text = activity.WindowTitle;

                var selectedTask = ComboTasks.SelectedItem as KlientTask;

                // Capture and OCR
                byte[] screenshot = _capture.CaptureActiveWindow();
                string ocrText = await _ocr.ExtractTextFromImageAsync(screenshot);

                // Send to Server
                try
                {
                    var payload = new
                    {
                        process_name = activity.ProcessName,
                        window_title = activity.WindowTitle,
                        ocr_text = ocrText,
                        duration_ms = 5000, // Sync heartbeat interval
                        task_id = selectedTask?.Id
                    };

                    // Local Logging
                    string logLine = $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss}] {activity.ProcessName} | {activity.WindowTitle} | OCR: {ocrText.Replace("\n", " ").Replace("\r", "")}";
                    System.IO.File.AppendAllLines("activity_log.txt", new[] { logLine });

                    string json = JsonConvert.SerializeObject(payload);
                    await _http.PostAsync("/api/activities", new StringContent(json, Encoding.UTF8, "application/json"));
                    
                    // Periodically refresh the total (e.g., every heartbeat)
                    RefreshDailyTotal();
                }
                catch (Exception ex)
                {
                    TxtDetails.Text = $"Sync Error: {ex.Message}";
                }
            });
        }
    }
}
