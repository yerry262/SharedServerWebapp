# TankStorage Service Uninstaller
# Run this script as Administrator

Write-Host "Uninstalling TankStorage Windows Service..." -ForegroundColor Cyan

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

$serviceName = "TankStorage"
$nssmPath = "$PSScriptRoot\nssm.exe"

# Check if service exists
$service = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if (-not $service) {
    Write-Host "Service '$serviceName' is not installed." -ForegroundColor Yellow
    pause
    exit 0
}

# Stop the service
Write-Host "Stopping service..." -ForegroundColor Yellow
if ($service.Status -eq "Running") {
    Stop-Service -Name $serviceName -Force
    Start-Sleep -Seconds 3
}

# Remove the service using nssm
if (Test-Path $nssmPath) {
    Write-Host "Removing service..." -ForegroundColor Yellow
    & $nssmPath remove $serviceName confirm
} else {
    # Fallback to sc.exe
    sc.exe delete $serviceName
}

Start-Sleep -Seconds 2

# Remove firewall rule
Write-Host "Removing firewall rule..." -ForegroundColor Yellow
$ruleName = "TankStorage Local Network"
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existingRule) {
    Remove-NetFirewallRule -DisplayName $ruleName
    Write-Host "Firewall rule removed" -ForegroundColor Green
}

Write-Host "`nService uninstalled successfully!" -ForegroundColor Green
Write-Host "Note: Log files in the 'logs' folder were not deleted." -ForegroundColor Cyan

pause
