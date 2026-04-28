using Xunit;
using TimeSheetPro.Client.Services;

namespace TimeSheetPro.Client.Tests
{
    public class ActivityTests
    {
        [Fact]
        public void WindowActivity_Initialization_ShouldHaveDefaultValues()
        {
            var activity = new WindowActivity();
            
            Assert.Equal("", activity.ProcessName);
            Assert.Equal("", activity.WindowTitle);
        }

        [Fact]
        public void WindowActivity_PropertyAssignment_ShouldWork()
        {
            var activity = new WindowActivity
            {
                ProcessName = "TestProcess",
                WindowTitle = "TestTitle"
            };
            
            Assert.Equal("TestProcess", activity.ProcessName);
            Assert.Equal("TestTitle", activity.WindowTitle);
        }
    }
}
