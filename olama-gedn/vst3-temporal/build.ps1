param(
    [string]$Config = "Release"
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$buildDir = Join-Path $root "build"

if (-not (Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir | Out-Null
}

Push-Location $buildDir

cmake -G "Visual Studio 17 2022" -A x64 ..
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    throw "CMake configure failed with exit code $LASTEXITCODE"
}

cmake --build . --config $Config --target TemporalPortal_VST3
if ($LASTEXITCODE -ne 0) {
    Pop-Location
    throw "Build failed with exit code $LASTEXITCODE"
}

Pop-Location

Write-Host "Build complete. Locate plugin at vst3-temporal/build/TemporalPortal_artefacts/$Config/VST3" -ForegroundColor Green
