# Koreki 1-Line Installer for Windows PowerShell
$ErrorActionPreference = "Stop"

# Allow script execution in current process
try { Set-ExecutionPolicy Bypass -Scope Process -Force -ErrorAction SilentlyContinue } catch {}

Write-Host "---------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  KOREKI ONE-LINE INSTALLER (Windows)" -ForegroundColor Cyan
Write-Host "---------------------------------------------------------" -ForegroundColor Cyan

$nodeCmd = Get-Command "node" -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "X Node.js is not installed." -ForegroundColor Red
    Write-Host "Please install Node.js (18+) or Docker Desktop to run Koreki."
    Write-Host "Visit https://nodejs.org or https://docs.docker.com/desktop/"
    exit 1
}

Write-Host "OK Node.js detected." -ForegroundColor Green

$tempDir = [System.IO.Path]::GetTempPath()
$tempScript = [System.IO.Path]::Combine($tempDir, "koreki-cli-index.mjs")

try {
    $url = "https://raw.githubusercontent.com/koreki-org/koreki/main/scripts/cli/index.mjs"
    Invoke-WebRequest -Uri $url -OutFile $tempScript -UseBasicParsing
    & node $tempScript $args
} finally {
    if (Test-Path $tempScript) {
        Remove-Item -Force $tempScript -ErrorAction SilentlyContinue
    }
}
