# TankStorage Service Installer
# Run this script as Administrator

Write-Host "Installing TankStorage Windows Service..." -ForegroundColor Cyan

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

# Install nssm if not present
$nssmPath = "$PSScriptRoot\nssm.exe"
if (-not (Test-Path $nssmPath)) {
    Write-Host "Downloading NSSM (Non-Sucking Service Manager)..." -ForegroundColor Yellow
    
    $nssmUrl = "https://nssm.cc/ci/nssm-2.24-101-g897c7ad.zip"
    $zipPath = "$PSScriptRoot\nssm.zip"
    
    try {
        Invoke-WebRequest -Uri $nssmUrl -OutFile $zipPath -UseBasicParsing
        
        # Extract nssm.exe
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $zip = [System.IO.Compression.ZipFile]::OpenRead($zipPath)
        $entry = $zip.Entries | Where-Object { $_.Name -eq "nssm.exe" -and $_.FullName -like "*win64*" } | Select-Object -First 1
        
        if ($entry) {
            [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $nssmPath, $true)
            Write-Host "NSSM downloaded successfully!" -ForegroundColor Green
        }
        
        $zip.Dispose()
        Remove-Item $zipPath -Force
    } catch {
        Write-Host "ERROR: Failed to download NSSM: $_" -ForegroundColor Red
        exit 1
    }
}

# Service configuration
$serviceName = "TankStorage"
$displayName = "TankStorage File Manager"
$description = "Network file manager and sharing service"
$nodePath = "C:\Program Files\nodejs\node.exe"
$appPath = "$PSScriptRoot\server.js"
$logPath = "$PSScriptRoot\logs"

# Create logs directory
if (-not (Test-Path $logPath)) {
    New-Item -ItemType Directory -Path $logPath -Force | Out-Null
    Write-Host "Created logs directory: $logPath" -ForegroundColor Green
}

# Stop and remove existing service if present
$existingService = Get-Service -Name $serviceName -ErrorAction SilentlyContinue
if ($existingService) {
    Write-Host "Removing existing service..." -ForegroundColor Yellow
    & $nssmPath stop $serviceName
    Start-Sleep -Seconds 2
    & $nssmPath remove $serviceName confirm
    Start-Sleep -Seconds 2
}

# Install the service
Write-Host "Installing service..." -ForegroundColor Yellow
& $nssmPath install $serviceName $nodePath $appPath

# Configure service
& $nssmPath set $serviceName DisplayName $displayName
& $nssmPath set $serviceName Description $description
& $nssmPath set $serviceName AppDirectory $PSScriptRoot
& $nssmPath set $serviceName Start SERVICE_AUTO_START

# Configure logging
& $nssmPath set $serviceName AppStdout "$logPath\service-output.log"
& $nssmPath set $serviceName AppStderr "$logPath\service-error.log"
& $nssmPath set $serviceName AppRotateFiles 1
& $nssmPath set $serviceName AppRotateOnline 1
& $nssmPath set $serviceName AppRotateSeconds 86400
& $nssmPath set $serviceName AppRotateBytes 10485760

# Configure restart on failure
& $nssmPath set $serviceName AppExit Default Restart
& $nssmPath set $serviceName AppRestartDelay 5000
& $nssmPath set $serviceName AppThrottle 10000

Write-Host "`nService installed successfully!" -ForegroundColor Green
Write-Host "Service Name: $serviceName" -ForegroundColor Cyan
Write-Host "Log Location: $logPath" -ForegroundColor Cyan

# Configure Windows Firewall
Write-Host "`nConfiguring Windows Firewall..." -ForegroundColor Yellow

# Remove existing rules if present
$ruleName = "TankStorage Local Network"
$existingRule = Get-NetFirewallRule -DisplayName $ruleName -ErrorAction SilentlyContinue
if ($existingRule) {
    Remove-NetFirewallRule -DisplayName $ruleName
}

# Create new firewall rule for local network only
# This allows connections from private networks (192.168.x.x, 10.x.x.x, 172.16.x.x - 172.31.x.x)
New-NetFirewallRule -DisplayName $ruleName `
    -Direction Inbound `
    -Protocol TCP `
    -LocalPort 8008 `
    -Action Allow `
    -Profile Private `
    -RemoteAddress LocalSubnet `
    -Description "Allow TankStorage access from local network only"

Write-Host "Firewall rule created - Access restricted to local network only" -ForegroundColor Green

# Start the service
Write-Host "`nStarting service..." -ForegroundColor Yellow
Start-Service -Name $serviceName

Start-Sleep -Seconds 3

# Check service status
$service = Get-Service -Name $serviceName
if ($service.Status -eq "Running") {
    Write-Host "`n========================================" -ForegroundColor Green
    Write-Host "SUCCESS! Service is running!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "`nService will now:" -ForegroundColor Cyan
    Write-Host "  • Start automatically on boot" -ForegroundColor White
    Write-Host "  • Restart automatically if it crashes (5 second delay)" -ForegroundColor White
    Write-Host "  • Log to: $logPath" -ForegroundColor White
    Write-Host "  • Accept connections from local network only" -ForegroundColor White
    Write-Host "`nAccess the app at: http://localhost:8008" -ForegroundColor Yellow
    Write-Host "Or from other devices: http://TANK:8008" -ForegroundColor Yellow
} else {
    Write-Host "`nWARNING: Service installed but not running." -ForegroundColor Yellow
    Write-Host "Status: $($service.Status)" -ForegroundColor Yellow
    Write-Host "Check logs at: $logPath" -ForegroundColor Yellow
}

Write-Host "`nUseful commands:" -ForegroundColor Cyan
Write-Host "  View status:    Get-Service $serviceName" -ForegroundColor White
Write-Host "  Stop service:   Stop-Service $serviceName" -ForegroundColor White
Write-Host "  Start service:  Start-Service $serviceName" -ForegroundColor White
Write-Host "  Restart service: Restart-Service $serviceName" -ForegroundColor White
Write-Host "  View logs:      Get-Content '$logPath\service-output.log' -Tail 50" -ForegroundColor White

pause
