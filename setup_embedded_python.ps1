
# Usage: .\setup_embedded_python.ps1

$ErrorActionPreference = "Stop"

$PYTHON_VERSION = "3.10.11"
$PYTHON_URL = "https://www.python.org/ftp/python/$PYTHON_VERSION/python-$PYTHON_VERSION-embed-amd64.zip"
$PIP_URL = "https://bootstrap.pypa.io/get-pip.py"
$EMBED_DIR = "python_embed"

Write-Host "Setting up Embedded Python Environment..." -ForegroundColor Cyan

# 1. Download and Extract Python Embed
if (-not (Test-Path $EMBED_DIR)) {
    Write-Host "Downloading Python $PYTHON_VERSION Embed..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $PYTHON_URL -OutFile "python_embed.zip"
    
    Write-Host "Extracting..." -ForegroundColor Yellow
    Expand-Archive -Path "python_embed.zip" -DestinationPath $EMBED_DIR -Force
    Remove-Item "python_embed.zip"
} else {
    Write-Host "Python embed folder already exists. Skipping download." -ForegroundColor Green
}

# 2. Configure python._pth to allow importing site-packages
# This is CRITICAL for pip and installed packages to work
$pthFile = Get-ChildItem "$EMBED_DIR\*._pth" | Select-Object -First 1
if ($pthFile) {
    $content = Get-Content $pthFile.FullName
    if ($content -notcontains "import site") {
        Write-Host "Enabling 'import site' in $($pthFile.Name)..." -ForegroundColor Yellow
        # Uncomment 'import site' line
        $content = $content -replace "#import site", "import site"
        $content | Set-Content $pthFile.FullName
    }
}

# 3. Install Pip
if (-not (Test-Path "$EMBED_DIR\Scripts\pip.exe")) {
    Write-Host "Installing pip..." -ForegroundColor Yellow
    Invoke-WebRequest -Uri $PIP_URL -OutFile "$EMBED_DIR\get-pip.py"
    
    # Run get-pip with the embedded python
    & "$EMBED_DIR\python.exe" "$EMBED_DIR\get-pip.py" --no-warn-script-location
    
    Remove-Item "$EMBED_DIR\get-pip.py"
}

# 4. Install Requirements
if (Test-Path "requirements.txt") {
    Write-Host "Installing requirements from requirements.txt..." -ForegroundColor Yellow
    # Install specific versions compatible with AI/ML if needed, but requirements.txt is source of truth
    # Note: We install into the embedded environment
    & "$EMBED_DIR\python.exe" -m pip install -r "requirements.txt" --no-warn-script-location --no-cache-dir
    
    # Prune pip cache again just in case
    & "$EMBED_DIR\python.exe" -m pip cache purge
} else {
    Write-Warning "requirements.txt not found!"
}

# 5. Cleanup
# Remove unneeded files from embed (like tcl/tk if present, though embed usually doesn't have them)
# Remove __pycache__
Write-Host "Cleaning up..." -ForegroundColor Yellow
Get-ChildItem -Path $EMBED_DIR -Include "__pycache__" -Recurse | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Embedded Python Environment Ready!" -ForegroundColor Green
