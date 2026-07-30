# Koreki 1-Line Installer for Windows PowerShell
$ErrorActionPreference = "Stop"

# Allow script execution in current process
try { Set-ExecutionPolicy Bypass -Scope Process -Force -ErrorAction SilentlyContinue } catch {}

# Enforce TLS 1.2 (required for GitHub on older Windows/PowerShell)
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

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

# Auto-update existing Koreki repo if found (prevents stale code issues)
function Update-KorekiRepo {
    param([string]$RepoPath)
    if (Test-Path (Join-Path $RepoPath ".git")) {
        Write-Host "Updating existing Koreki installation..." -ForegroundColor Cyan
        try {
            & git -C $RepoPath fetch origin main 2>&1 | Out-Null
            & git -C $RepoPath reset --hard origin/main 2>&1 | Out-Null
            Write-Host "Updated to latest version." -ForegroundColor Green
        } catch {
            Write-Host "Could not auto-update (offline?). Continuing with existing files." -ForegroundColor DarkGray
        }
    }
}

# Check common locations for existing repos and update them
$candidates = @(
    (Join-Path $PWD "koreki"),
    (Join-Path ([Environment]::GetFolderPath("UserProfile")) "koreki-app"),
    (Join-Path ([Environment]::GetFolderPath("UserProfile")) "koreki-app\koreki")
)

foreach ($candidate in $candidates) {
    if (Test-Path (Join-Path $candidate "docker-compose.community-multi-full.yml")) {
        Update-KorekiRepo $candidate
    }
}

# Also update current directory if it IS the repo
if (Test-Path (Join-Path $PWD "docker-compose.community-multi-full.yml")) {
    Update-KorekiRepo $PWD
}

# Download and run the latest CLI wizard from GitHub
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
