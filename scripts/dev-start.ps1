# Jarvis 开发环境一键启动脚本 (Windows PowerShell)
# 用法: .\scripts\dev-start.ps1 [-Port 3456]
param(
    [int]$Port = 3456
)

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$HEALTH_URL = "http://127.0.0.1:${Port}/health"
$MAX_WAIT = 60

Write-Host "=== Jarvis Dev Startup ===" -ForegroundColor Cyan
Write-Host "  Project: $ROOT"
Write-Host "  Port:    $Port"

# ---- 1. Build Web Panel ----
if (-not (Test-Path "$ROOT\dist\web\index.html")) {
    Write-Host ""
    Write-Host "[1/3] Building Web Panel..." -ForegroundColor Yellow
    Push-Location $ROOT
    npm run build:web
    Pop-Location
    Write-Host "  ✓ Web panel built" -ForegroundColor Green
} else {
    Write-Host "[1/3] Web panel exists, skipping build"
}

# ---- 2. Start Engine ----
Write-Host ""
Write-Host "[2/3] Starting Jarvis Engine..." -ForegroundColor Yellow

$pidFile = "$ROOT\.jarvis\engine.pid"
$alreadyRunning = $false
if (Test-Path $pidFile) {
    try {
        $data = Get-Content $pidFile -Raw | ConvertFrom-Json
        $existingPid = $data.pid
        $proc = Get-Process -Id $existingPid -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "  ✓ Engine already running (PID $existingPid)" -ForegroundColor Green
            $alreadyRunning = $true
        }
    } catch {
        Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    }
}

if (-not $alreadyRunning) {
    Push-Location $ROOT
    $proc = Start-Process -FilePath "npx" -ArgumentList "tsx","src/cli/index.ts","engine","start","--port=$Port","$ROOT" -NoNewWindow -PassThru
    Pop-Location
    Write-Host "  ✓ Engine started (PID $($proc.Id))" -ForegroundColor Green
}

# ---- 3. Wait for health check ----
Write-Host ""
Write-Host "[3/3] Waiting for engine to be ready..." -ForegroundColor Yellow

$waited = 0
while ($waited -lt $MAX_WAIT) {
    try {
        $response = Invoke-WebRequest -Uri $HEALTH_URL -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            Write-Host "  ✓ Engine is ready!" -ForegroundColor Green
            Write-Host ""
            Write-Host "=== Jarvis Started ===" -ForegroundColor Cyan
            Write-Host "  Web:  http://localhost:${Port}"
            Write-Host "  API:  http://localhost:${Port}/api/pipeline"
            Write-Host "  Health: http://localhost:${Port}/health"
            exit 0
        }
    } catch {
        # Not ready yet
    }
    Start-Sleep -Seconds 1
    $waited++
    if ($waited % 10 -eq 0) {
        Write-Host "  Waiting... (${waited}s/${MAX_WAIT}s)"
    }
}

Write-Host "  ✗ Engine startup timed out (${MAX_WAIT}s)" -ForegroundColor Red
Write-Host "  Check: npx tsx src/cli/index.ts engine start --port=$Port $ROOT"
exit 1
