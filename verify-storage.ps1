#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Verify storage locations and audio quality for Sonetto V3
.DESCRIPTION
    Shows where files are stored on disk (inside Docker container)
    and allows you to copy files out for verification

.NOTES
    **Purpose**: Debug tool for manual verification of audio extraction quality
    **Retention Rationale**: 
    - Useful for inspecting Docker container storage when debugging FFmpeg issues
    - Helps verify 16kHz mono WAV conversion is working correctly
    - Provides ready-to-use docker cp commands for extracting files
    - Not referenced in CI/CD or production automation
    - Minimal maintenance burden (59 lines, pure PowerShell)
    
    **Usage**: Run `.\verify-storage.ps1` from project root when investigating
               audio quality issues or verifying FFmpeg configuration changes
#>

Write-Host "`n=== Sonetto V3 Storage Verification ===" -ForegroundColor Cyan

# Check if Docker is running
$dockerRunning = docker ps --filter "name=sonetto-backend" --format "{{.Names}}" 2>$null
if (-not $dockerRunning) {
    Write-Host "`nERROR: Backend container is not running!" -ForegroundColor Red
    Write-Host "   Start it with: docker compose -f infra/docker/docker-compose.yml up -d" -ForegroundColor Yellow
    exit 1
}

Write-Host "`nOK: Backend container is running" -ForegroundColor Green

# Show storage structure
Write-Host "`nStorage Structure (in Docker container):" -ForegroundColor Cyan
Write-Host "   Container path: /app/storage/" -ForegroundColor Gray
docker exec sonetto-backend ls -lah /app/storage/

# Show original files
Write-Host "`nOriginal Files (audio/video uploads):" -ForegroundColor Cyan
Write-Host "   Container path: /app/storage/original/" -ForegroundColor Gray
docker exec sonetto-backend ls -lh /app/storage/original/

# Show extracted audio files
Write-Host "`nExtracted Audio Files (16kHz mono WAV):" -ForegroundColor Cyan
Write-Host "   Container path: /app/storage/audio/" -ForegroundColor Gray
docker exec sonetto-backend ls -lh /app/storage/audio/

# Count files
$originalCount = (docker exec sonetto-backend ls /app/storage/original/ | Measure-Object -Line).Lines
$audioCount = (docker exec sonetto-backend ls /app/storage/audio/ | Measure-Object -Line).Lines

Write-Host "`nSummary:" -ForegroundColor Cyan
Write-Host "   Original files: $originalCount" -ForegroundColor White
Write-Host "   Audio files: $audioCount" -ForegroundColor White

# Offer to copy files for verification
Write-Host "`nTo verify audio quality:" -ForegroundColor Cyan
Write-Host "   1. Copy a file from container to your machine:" -ForegroundColor Gray
Write-Host "      docker cp sonetto-backend:/app/storage/audio/<filename>.wav ./" -ForegroundColor Yellow
Write-Host ""
Write-Host "   2. Example - copy latest audio file:" -ForegroundColor Gray
$latestFile = docker exec sonetto-backend sh -c "ls -t /app/storage/audio/ | head -1"
if ($latestFile) {
    Write-Host "      docker cp sonetto-backend:/app/storage/audio/$latestFile ./" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   3. Play with Windows Media Player or VLC to verify quality" -ForegroundColor Gray
}

Write-Host ""
