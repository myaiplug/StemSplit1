# PowerShell helper to create Python venv and install requirements
# Usage: .\setup_python_env.ps1 -Python python3
param(
    [string]$Python = "python"
)

$venvDir = "./.venv"

Write-Host "Creating virtual environment in $venvDir using $Python"
if (!(Test-Path $venvDir)) {
    & $Python -m venv $venvDir
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to create virtualenv. Ensure Python is installed and accessible as $Python"
        exit 1
    }
} else {
    Write-Host "Virtual environment already exists."
}

$pip = "$venvDir\Scripts\pip.exe"
if (!(Test-Path $pip)) {
    # Try non-Windows structure just in case
    $pip = "$venvDir\bin\pip"
}

Write-Host "Upgrading pip..."
if (Test-Path $pip) {
    & $pip install --upgrade pip setuptools wheel
} else {
    Write-Error "Could not find pip executable in venv."
    exit 1
}

Write-Host "Installing requirements from requirements.txt"
if (Test-Path "requirements.txt") {
    & $pip install -r requirements.txt
} else {
    Write-Warning "requirements.txt not found. Skipping dependency installation."
}

Write-Host "Done. Activate with: .\.venv\Scripts\Activate.ps1"