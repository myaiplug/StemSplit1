param(
    [string]$Config = "Release",
    [string]$InnoCompiler = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
)

$ErrorActionPreference = "Stop"

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptRoot
$buildRoot = Join-Path $projectRoot "build"
$artefacts = Join-Path $buildRoot "TemporalPortal_artefacts"
$vst3Root = Join-Path $artefacts "$Config\VST3"
$stageRoot = Join-Path $scriptRoot "stage"
$stagePlugin = Join-Path $stageRoot "Temporal Portal.vst3"
$stageResources = Join-Path $stagePlugin "Contents\Resources"

function Invoke-WithRetry {
    param(
        [Parameter(Mandatory = $true)]
        [scriptblock]$Action,
        [string]$OperationName = "Operation",
        [int]$MaxAttempts = 8,
        [int]$InitialDelayMs = 250
    )

    $attempt = 0
    $delayMs = $InitialDelayMs

    while ($attempt -lt $MaxAttempts) {
        $attempt++
        try {
            & $Action
            return
        } catch {
            if ($attempt -ge $MaxAttempts) {
                throw "${OperationName} failed after ${MaxAttempts} attempts. Last error: $($_.Exception.Message)"
            }

            Write-Warning "${OperationName} failed (attempt ${attempt}/${MaxAttempts}). Retrying in ${delayMs} ms..."
            [System.Threading.Thread]::Sleep($delayMs)
            $delayMs = [Math]::Min($delayMs * 2, 2500)
        }
    }
}

if (!(Test-Path $vst3Root)) {
    throw "VST3 output folder not found: $vst3Root. Run build.ps1 first."
}

if (Test-Path $stageRoot) {
    Remove-Item $stageRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $stageResources -Force | Out-Null

$pluginCandidates = Get-ChildItem -Path $vst3Root -Filter *.vst3 -Directory
if ($pluginCandidates.Count -lt 1) {
    throw "No .vst3 plugin bundle found in $vst3Root"
}

$pluginSource = $pluginCandidates[0].FullName
Invoke-WithRetry -OperationName "Copy plugin bundle to stage" -Action {
    Copy-Item -Path $pluginSource -Destination $stageRoot -Recurse -Force
}

Invoke-WithRetry -OperationName "Copy temporal.html" -Action {
    Copy-Item -Path (Join-Path $projectRoot "assets\temporal.html") -Destination $stageResources -Force
}

Invoke-WithRetry -OperationName "Copy rubberband-worker.js" -Action {
    Copy-Item -Path (Join-Path $projectRoot "assets\rubberband-worker.js") -Destination $stageResources -Force
}

Invoke-WithRetry -OperationName "Copy soundtouch-worklet.js" -Action {
    Copy-Item -Path (Join-Path $projectRoot "assets\soundtouch-worklet.js") -Destination $stageResources -Force
}

if (Test-Path $InnoCompiler) {
    Push-Location $scriptRoot
    & "$InnoCompiler" "TemporalPortalPlugin.iss"
    Pop-Location
    Write-Host "Installer created in $scriptRoot" -ForegroundColor Green
} else {
    Write-Warning "Inno Setup compiler not found at $InnoCompiler"
    Write-Host "Staged plugin is ready in: $stageRoot" -ForegroundColor Yellow
}
