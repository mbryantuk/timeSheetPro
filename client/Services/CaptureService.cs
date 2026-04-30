using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Windows;

namespace TimeSheetPro.Client.Services
{
    public class CaptureService
    {
        public byte[] CaptureAllScreens()
        {
            int left = System.Windows.Forms.Screen.AllScreens.Min(s => s.Bounds.Left);
            int top = System.Windows.Forms.Screen.AllScreens.Min(s => s.Bounds.Top);
            int right = System.Windows.Forms.Screen.AllScreens.Max(s => s.Bounds.Right);
            int bottom = System.Windows.Forms.Screen.AllScreens.Max(s => s.Bounds.Bottom);
            int width = right - left;
            int height = bottom - top;

            using (Bitmap bmp = new Bitmap(width, height))
            {
                using (Graphics g = Graphics.FromImage(bmp))
                {
                    g.CopyFromScreen(left, top, 0, 0, bmp.Size);
                }

                using (MemoryStream ms = new MemoryStream())
                {
                    // Use a lower quality to keep the payload size manageable for OCR/AI
                    var encoderParameters = new EncoderParameters(1);
                    encoderParameters.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, 50L);
                    var codecInfo = GetEncoder(ImageFormat.Jpeg);
                    bmp.Save(ms, codecInfo, encoderParameters);
                    return ms.ToArray();
                }
            }
        }

        private ImageCodecInfo GetEncoder(ImageFormat format)
        {
            ImageCodecInfo[] codecs = ImageCodecInfo.GetImageDecoders();
            foreach (ImageCodecInfo codec in codecs)
            {
                if (codec.FormatID == format.Guid) return codec;
            }
            return null;
        }
    }
}
