using System;
using System.Net.Http;
using System.Text;
using System.Windows;
using System.Windows.Input;
using Newtonsoft.Json;
using TimeSheetPro.Client.Services;

namespace TimeSheetPro.Client
{
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
            _http = new HttpClient { BaseAddress = new Uri("http://10.10.2.1:3001") };

            _watcher.OnActivityChanged += Watcher_OnActivityChanged;
            _watcher.Start();

            // Minimal position at bottom right
            var workArea = SystemParameters.WorkArea;
            this.Left = workArea.Right - this.Width - 10;
            this.Top = workArea.Bottom - this.Height - 10;
        }

        private void Window_MouseLeftButtonDown(object sender, MouseButtonEventArgs e) => DragMove();
        
        private void Close_Click(object sender, RoutedEventArgs e) {
            _watcher.Stop();
            this.Close();
        }

        private async void Watcher_OnActivityChanged(WindowActivity activity)
        {
            Dispatcher.Invoke(async () =>
            {
                TxtStatus.Text = activity.ProcessName;

                // Capture and OCR
                byte[] screenshot = _capture.CaptureActiveWindow();
                string ocrText = await _ocr.ExtractTextFromImageAsync(screenshot);

                // Send to Server (Sensor-only mode)
                try
                {
                    var payload = new
                    {
                        process_name = activity.ProcessName,
                        window_title = activity.WindowTitle,
                        ocr_text = ocrText,
                        duration_ms = 5000,
                        task_id = (string?)null // Server will assign later or user will assign in Web UI
                    };

                    string json = JsonConvert.SerializeObject(payload);
                    await _http.PostAsync("/api/activities", new StringContent(json, Encoding.UTF8, "application/json"));
                }
                catch (Exception)
                {
                    TxtStatus.Text = "Sync Error";
                }
            });
        }
    }
}
