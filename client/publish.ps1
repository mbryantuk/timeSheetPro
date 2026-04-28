# TimeSheetPro Client Publisher
# This script packages the WPF application into a single, standalone .exe file.

Write-Host "🚀 Packaging TimeSheetPro Client..."
Write-Host "This will create a single-file executable that does not require the .NET runtime to be installed."

$projectPath = "TimeSheetPro.Client.csproj"
$outputPath = ".\publish"

# Clean previous publish
if (Test-Path $outputPath) {
    Remove-Item -Recurse -Force $outputPath
}

# Publish the application
# -c Release: Optimizes the code
# -r win-x64: Targets 64-bit Windows
# --self-contained true: Includes the .NET runtime inside the .exe
# -p:PublishSingleFile=true: Bundles everything into one file
# -p:IncludeNativeLibrariesForSelfExtract=true: Ensures native DLLs (like OCR/WebView) are bundled correctly
dotnet publish $projectPath -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o $outputPath

Write-Host ""
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Build Complete!" -ForegroundColor Green
    Write-Host "Your standalone app is located at: $(Resolve-Path $outputPath)\TimeSheetPro.Client.exe"
    Write-Host "You can move this .exe anywhere (like your Startup folder) and run it!"
} else {
    Write-Host "❌ Build Failed. Check the error output above." -ForegroundColor Red
}
