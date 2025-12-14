#!/usr/bin/env pwsh

# =============================================================================
# IPTV Playlist Manager - Build Script (Windows PowerShell)
# =============================================================================

$ErrorActionPreference = "Stop"

# Colors for output
function Write-Info { param($Message) Write-Host "[INFO] $Message" -ForegroundColor Cyan }
function Write-Success { param($Message) Write-Host "[SUCCESS] $Message" -ForegroundColor Green }
function Write-Error { param($Message) Write-Host "[ERROR] $Message" -ForegroundColor Red }
function Write-Warning { param($Message) Write-Host "[WARNING] $Message" -ForegroundColor Yellow }

# Header
Write-Host ""
Write-Host "=============================================" -ForegroundColor Magenta
Write-Host "  IPTV Playlist Manager - Build Script" -ForegroundColor Magenta
Write-Host "=============================================" -ForegroundColor Magenta
Write-Host ""

# Navigate to script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir
Write-Info "Working directory: $scriptDir"

# Check if Node.js is installed
Write-Info "Checking Node.js installation..."
try {
    $nodeVersion = node --version
    Write-Success "Node.js found: $nodeVersion"
} catch {
    Write-Error "Node.js is not installed or not in PATH!"
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Check if npm is installed
Write-Info "Checking npm installation..."
try {
    $npmVersion = npm --version
    Write-Success "npm found: $npmVersion"
} catch {
    Write-Error "npm is not installed or not in PATH!"
    exit 1
}

# Check if node_modules exists, if not install dependencies
if (-Not (Test-Path "node_modules")) {
    Write-Warning "node_modules not found. Installing dependencies..."
    Write-Info "Running: npm install"
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to install dependencies!"
        exit 1
    }
    Write-Success "Dependencies installed successfully!"
} else {
    Write-Info "node_modules found. Skipping npm install."
    Write-Info "Run 'npm install' manually if you need to update dependencies."
}

# Clean previous build
if (Test-Path "dist") {
    Write-Info "Cleaning previous build..."
    Remove-Item -Recurse -Force "dist"
    Write-Success "Previous build cleaned."
}

# Run TypeScript check (optional, Vite does this during build)
Write-Info "Running TypeScript type check..."
npx tsc --noEmit
if ($LASTEXITCODE -ne 0) {
    Write-Warning "TypeScript found some issues, but continuing with build..."
}

# Build the project
Write-Info "Building project with Vite..."
Write-Host ""
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Error "Build failed!"
    exit 1
}

Write-Host ""
Write-Success "Build completed successfully!"
Write-Host ""

# Show output info
if (Test-Path "dist") {
    Write-Info "Build output is in the 'dist' folder:"
    Get-ChildItem -Path "dist" -Recurse | ForEach-Object {
        $relativePath = $_.FullName.Substring($scriptDir.Length + 1)
        if ($_.PSIsContainer) {
            Write-Host "  [DIR]  $relativePath" -ForegroundColor Blue
        } else {
            $size = [math]::Round($_.Length / 1KB, 2)
            Write-Host "  [FILE] $relativePath ($size KB)" -ForegroundColor White
        }
    }
    Write-Host ""
}

Write-Host "=============================================" -ForegroundColor Magenta
Write-Host "  To preview the build, run: npm run preview" -ForegroundColor Yellow
Write-Host "=============================================" -ForegroundColor Magenta
Write-Host ""

exit 0
