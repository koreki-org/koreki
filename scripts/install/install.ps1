# 🏮 Koreki 1-Line Installer for Windows PowerShell
# Usage: iwr -useb https://get.koreki.de/install.ps1 | iex

$ErrorActionPreference = "Stop"

Write-Host "---------------------------------------------------------" -ForegroundColor Cyan
Write-Host "  🏮 KOREKI ONE-LINE INSTALLER (Windows)" -ForegroundColor Cyan -NoNewline
Write-Host ""
Write-Host "---------------------------------------------------------" -ForegroundColor Cyan

# Check for Node.js
if (Get-Command "node" -ErrorAction SilentlyContinue) {
    Write-Host "✔ Node.js detected." -ForegroundColor Green
    npx --yes koreki-cli @args
} else {
    Write-Host "✖ Node.js is not installed." -ForegroundColor Red
    Write-Host "Please install Node.js (18+) or Docker Desktop to run Koreki."
    Write-Host "Visit https://nodejs.org or https://docs.docker.com/desktop/"
    exit 1
}
