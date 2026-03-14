# Setup for GitHub Actions Mac Builds
# Run this on Windows to prepare your repo for automated Mac builds

$ErrorActionPreference = "Stop"

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  GitHub Actions Mac Build Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if git is installed
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "Git is not installed. Please install Git from https://git-scm.com/"
    exit 1
}

# Check if we're in a git repo
if (-not (Test-Path ".git")) {
    Write-Host "[1/5] Initializing Git repository..." -ForegroundColor Yellow
    git init
    
    # Configure line endings for cross-platform compatibility
    git config core.autocrlf false
    git config core.eol lf
    
    Write-Host "✓ Git initialized" -ForegroundColor Green
} else {
    Write-Host "[1/5] Git repository already exists" -ForegroundColor Green
    
    # Configure line endings
    git config core.autocrlf false
    git config core.eol lf
}

# Create/update .gitattributes for proper line endings
Write-Host "`n[2/5] Configuring line endings..." -ForegroundColor Yellow
@"
# Auto detect text files and normalize line endings to LF
* text=auto eol=lf

# Shell scripts must use LF
*.sh text eol=lf

# Windows scripts use CRLF
*.ps1 text eol=crlf
*.bat text eol=crlf
*.cmd text eol=crlf

# Binary files
*.png binary
*.jpg binary
*.ico binary
*.dmg binary
*.exe binary
*.dll binary
*.so binary
*.dylib binary
*.whl binary
"@ | Out-File -FilePath ".gitattributes" -Encoding UTF8 -NoNewline
Write-Host "✓ Line endings configured" -ForegroundColor Green

# Mark shell scripts as executable in git
Write-Host "`n[3/5] Preparing shell scripts..." -ForegroundColor Yellow
$scripts = @(
    "build_complete_installer_mac.sh",
    "setup_python_env_mac.sh", 
    "create_mac_dmg.sh",
    "src-tauri/generate_icons.sh"
)

$scriptsToMark = @()
foreach ($script in $scripts) {
    if (Test-Path $script) {
        $scriptsToMark += $script
        Write-Host "  ✓ Found $script" -ForegroundColor Gray
    } else {
        Write-Warning "  ⚠ $script not found (skipping)"
    }
}
Write-Host "✓ Scripts will be marked executable after first commit" -ForegroundColor Green

# Verify workflow file exists
Write-Host "`n[4/5] Verifying GitHub Actions workflow..." -ForegroundColor Yellow
if (Test-Path ".github/workflows/build-macos.yml") {
    Write-Host "✓ build-macos.yml found" -ForegroundColor Green
} else {
    Write-Error "Workflow file missing! Expected: .github/workflows/build-macos.yml"
    exit 1
}

# Create .gitignore if it doesn't exist
Write-Host "`n[5/5] Creating .gitignore..." -ForegroundColor Yellow
$gitignoreContent = @"
# Dependencies
node_modules/
python_env/
python_embed/
embedded_python/
.venv/
venv/
env/

# Next.js build outputs
.next/
out/
build/

# Build outputs
dist/
installers/
src-tauri/target/
*.dmg
*.exe
*.app

# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
pip-log.txt
pip-delete-this-directory.txt

# OS files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# Temporary
temp.dmg
*.zip

# Model files (too large for git)
Stem Split Models/
models/
*.ckpt
*.pth
*.pt

# Test files
test_audio/
output/
temp_audio/
"@

$gitignoreContent | Out-File -FilePath ".gitignore" -Encoding UTF8
Write-Host "✓ .gitignore updated" -ForegroundColor Green

# Add files and set executable permissions
Write-Host "`n[6/6] Setting up initial commit..." -ForegroundColor Yellow

# Add key files first
Write-Host "Adding files to git..." -ForegroundColor Gray
git add .gitignore 2>&1 | Out-Null
git add .gitattributes 2>&1 | Out-Null
git add .github/ 2>&1 | Out-Null
git add *.sh 2>&1 | Out-Null
git add src-tauri/*.sh 2>&1 | Out-Null
git add *.md 2>&1 | Out-Null

# Now mark shell scripts as executable
foreach ($script in $scriptsToMark) {
    git update-index --chmod=+x $script 2>&1 | Out-Null
}

Write-Host "✓ Key files staged" -ForegroundColor Green

# Check if remote is configured
$remote = git remote -v 2>&1
$hasRemote = $LASTEXITCODE -eq 0 -and -not [string]::IsNullOrWhiteSpace($remote)

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  ✓ Setup Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

if (-not $hasRemote) {
    Write-Host "📋 Next Steps:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Create a GitHub repository:" -ForegroundColor White
    Write-Host "   https://github.com/new" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Connect your repo:" -ForegroundColor White
    Write-Host "   git remote add origin https://github.com/YOUR_USERNAME/stemsplit.git" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Complete the staging:" -ForegroundColor White
    Write-Host "   git add ." -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Make initial commit:" -ForegroundColor White
    Write-Host "   git commit -m 'Initial commit with Mac installer'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "5. Push to GitHub:" -ForegroundColor White
    Write-Host "   git branch -M main" -ForegroundColor Gray
    Write-Host "   git push -u origin main" -ForegroundColor Gray
} else {
    Write-Host "✓ Remote configured:" -ForegroundColor Green
    Write-Host $remote -ForegroundColor Gray
    Write-Host ""
    Write-Host "📋 Next Steps:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Complete the staging:" -ForegroundColor White
    Write-Host "   git add ." -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Commit changes:" -ForegroundColor White
    Write-Host "   git commit -m 'Add Mac installer support'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Push to GitHub:" -ForegroundColor White
    Write-Host "   git push" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🚀 To Build Mac Installer:" -ForegroundColor Cyan
Write-Host ""
Write-Host "After pushing, create a release tag:" -ForegroundColor White
Write-Host "  git tag -a v0.1.0 -m 'Release v0.1.0'" -ForegroundColor Gray
Write-Host "  git push origin v0.1.0" -ForegroundColor Gray
Write-Host ""
Write-Host "Wait ~25 minutes, then download from:" -ForegroundColor White
Write-Host "  https://github.com/YOUR_USERNAME/stemsplit/releases" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 Full Guide: BUILD_MAC_WITHOUT_MAC.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "  2. OR create a release tag:" -ForegroundColor White
Write-Host "     git tag -a v0.1.0 -m 'Release v0.1.0'" -ForegroundColor Gray
Write-Host "     git push origin v0.1.0" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Wait ~20-30 minutes" -ForegroundColor White
Write-Host ""
Write-Host "  4. Download DMG from:" -ForegroundColor White
Write-Host "     GitHub → Actions → Latest run → Artifacts" -ForegroundColor Gray
Write-Host "     OR" -ForegroundColor Gray
Write-Host "     GitHub → Releases (if tagged)" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 For detailed instructions, see:" -ForegroundColor Cyan
Write-Host "   BUILD_MAC_WITHOUT_MAC.md" -ForegroundColor White
Write-Host ""
