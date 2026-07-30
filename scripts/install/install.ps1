# 🏮 Koreki 1-Line Installer for Windows PowerShell
# Usage: iwr -useb https://raw.githubusercontent.com/koreki-org/koreki/main/scripts/install/install.ps1 | iex

$ErrorActionPreference = "Stop"

Write-Host "---------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  🏮 KOREKI ONE-LINE INSTALLER (Windows)" -ForegroundColor Cyan
Write-Host "---------------------------------------------------------" -ForegroundColor Cyan

if (-not (Get-Command "node" -ErrorAction SilentlyContinue)) {
    Write-Host "✖ Node.js is not installed." -ForegroundColor Red
    Write-Host "Please install Node.js (18+) or Docker Desktop to run Koreki."
    Write-Host "Visit https://nodejs.org or https://docs.docker.com/desktop/"
    exit 1
}

Write-Host "✔ Node.js detected." -ForegroundColor Green

# Fetch CLI wizard script directly from GitHub and execute with Node.js
$tempScript = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "koreki-cli-index.mjs")
try {
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/koreki-org/koreki/main/scripts/cli/index.mjs" -OutFile $tempScript -UseBasicParsing
    node $tempScript @args
} finally {
    if (Test-Path $tempScript) {
        Remove-Item -Force $tempScript -ErrorAction SilentlyContinue
    }
}
