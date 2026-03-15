# Complete Automated Installer Builder for StemSplit
# This builds a fully self-contained installer that requires ZERO user setup

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  StemSplit Install Builder" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check for Inno Setup
$ISCC = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if (-not (Test-Path $ISCC)) {
    Write-Error "Inno Setup Compiler not found at: $ISCC`nPlease install from https://jrsoftware.org/isdl.php"
    exit 1
}

# Step 1: Setup Embedded Python Environment
Write-Host "[1/5] Setting up environment..." -ForegroundColor Yellow
if (-not (Test-Path "embedded_python\python.exe")) {
    Write-Host "Creating environment (this may take a few minutes)..." -ForegroundColor Yellow
    .\setup_embedded_python.ps1
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to setup environment"
        exit $LASTEXITCODE
    }
    Write-Host "✓ Environment Ready" -ForegroundColor Green
} else {
    Write-Host "✓ Environment already exists" -ForegroundColor Green
}

# Step 2: Build Next.js app
Write-Host "`n[2/5] Building application..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed!"
    exit $LASTEXITCODE
}
Write-Host "✓ Build complete" -ForegroundColor Green

# Step 3: Build Tauri executable
Write-Host "`n[3/5] Compiling executable application..." -ForegroundColor Yellow
cd src-tauri
cargo build --release
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed!"
    exit $LASTEXITCODE
}
cd ..
Write-Host "✓ Application Ready" -ForegroundColor Green

# Step 4: Download FFmpeg (required for MP3 encoding)
Write-Host "`n[4/6] Setting up FFmpeg..." -ForegroundColor Yellow
$FFMPEG_DIR = "ffmpeg"
$FFMPEG_EXE = "$FFMPEG_DIR\ffmpeg.exe"
if (-not (Test-Path $FFMPEG_EXE)) {
    Write-Host "Downloading FFmpeg..." -ForegroundColor Yellow
    $FFMPEG_URL = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
    $FFMPEG_ZIP = "ffmpeg_temp.zip"
    
    try {
        Invoke-WebRequest -Uri $FFMPEG_URL -OutFile $FFMPEG_ZIP -UseBasicParsing
        
        # Extract only ffmpeg.exe from the bin folder
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zip = [System.IO.Compression.ZipFile]::OpenRead($FFMPEG_ZIP)
        $ffmpegEntry = $zip.Entries | Where-Object { $_.Name -eq "ffmpeg.exe" } | Select-Object -First 1
        
        if ($ffmpegEntry) {
            if (-not (Test-Path $FFMPEG_DIR)) { New-Item -ItemType Directory -Path $FFMPEG_DIR | Out-Null }
            [System.IO.Compression.ZipFileExtensions]::ExtractToFile($ffmpegEntry, $FFMPEG_EXE, $true)
            Write-Host "✓ FFmpeg downloaded" -ForegroundColor Green
        } else {
            Write-Warning "Could not find ffmpeg.exe in archive"
        }
        $zip.Dispose()
        Remove-Item $FFMPEG_ZIP -ErrorAction SilentlyContinue
    } catch {
        Write-Warning "Failed to download FFmpeg: $_"
        Write-Warning "MP3 encoding may not work without FFmpeg"
    }
} else {
    Write-Host "✓ FFmpeg already exists" -ForegroundColor Green
}

# Step 5: Download/verify models (optional - comment out if models are too large)
Write-Host "`n[5/6] Verifying model files..." -ForegroundColor Yellow
if (Test-Path "Stem Split Models") {
    $modelCount = (Get-ChildItem "Stem Split Models" -Recurse -File).Count
    Write-Host "✓ Found $modelCount model files" -ForegroundColor Green
} else {
    Write-Warning "Stem Split Models folder not found. Models will need to be downloaded by user."
}

# Step 6: Create Installer
Write-Host "`n[6/6] Creating installer..." -ForegroundColor Yellow
& $ISCC "setup.iss"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "  ✓ INSTALLER CREATED SUCCESSFULLY!" -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Green
    
    $installer = Get-Item "installers\StemSplit_Setup_x64.exe"
    Write-Host "Installer Details:" -ForegroundColor Cyan
    Write-Host "  Location: $($installer.FullName)" -ForegroundColor White
    Write-Host "  Size: $([math]::Round($installer.Length/1MB,2)) MB" -ForegroundColor White
    Write-Host "  Created: $($installer.LastWriteTime)" -ForegroundColor White
    Write-Host "`nOpening installer folder..." -ForegroundColor Cyan
    explorer "installers"
} else {
    Write-Error "Setup failed!"
    exit $LASTEXITCODE
}
