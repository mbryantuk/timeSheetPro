using System;
using System.IO;
using System.Runtime.InteropServices.WindowsRuntime;
using System.Threading.Tasks;
using Windows.Graphics.Imaging;
using Windows.Media.Ocr;
using Windows.Storage.Streams;

namespace TimeSheetPro.Client.Services
{
    public class OcrService
    {
        private OcrEngine? _ocrEngine;

        public OcrService()
        {
            try {
                _ocrEngine = OcrEngine.TryCreateFromUserProfileLanguages();
            } catch {
                // Handle cases where WinRT might not be fully initialized or supported
            }
        }

        public async Task<string> ExtractTextFromImageAsync(byte[] imageBytes)
        {
            if (_ocrEngine == null) return "";

            using (var stream = new InMemoryRandomAccessStream())
            {
                await stream.WriteAsync(imageBytes.AsBuffer());
                stream.Seek(0);

                var decoder = await BitmapDecoder.CreateAsync(stream);
                var softwareBitmap = await decoder.GetSoftwareBitmapAsync();

                // SoftwareBitmap must be in specific formats for OCR
                if (softwareBitmap.BitmapPixelFormat != BitmapPixelFormat.Bgra8 ||
                    softwareBitmap.BitmapAlphaMode == BitmapAlphaMode.Premultiplied)
                {
                    softwareBitmap = SoftwareBitmap.Convert(softwareBitmap, BitmapPixelFormat.Bgra8, BitmapAlphaMode.Straight);
                }

                var result = await _ocrEngine.RecognizeAsync(softwareBitmap);
                return result.Text;
            }
        }
    }
}
