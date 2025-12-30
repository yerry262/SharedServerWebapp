# Fix DNS and Network Discovery
# Run this as Administrator

Write-Host "Fixing DNS and Network Discovery..." -ForegroundColor Cyan

# Check if running as Administrator
$currentPrincipal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    pause
    exit 1
}

# Restart Network Discovery services
Write-Host "`nRestarting Network Discovery services..." -ForegroundColor Yellow
try {
    Restart-Service -Name "FDResPub" -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Function Discovery Resource Publication restarted" -ForegroundColor Green
} catch {
    Write-Host "⚠ Could not restart FDResPub: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Restart DNS Client
Write-Host "`nRestarting DNS Client..." -ForegroundColor Yellow
try {
    Restart-Service -Name "Dnscache" -Force
    Write-Host "✓ DNS Client restarted" -ForegroundColor Green
} catch {
    Write-Host "⚠ Could not restart DNS Client: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Register DNS
Write-Host "`nRegistering DNS..." -ForegroundColor Yellow
ipconfig /registerdns | Out-Null
Write-Host "✓ DNS registration initiated" -ForegroundColor Green

# Flush DNS cache
Write-Host "`nFlushing DNS cache..." -ForegroundColor Yellow
ipconfig /flushdns | Out-Null
Write-Host "✓ DNS cache flushed" -ForegroundColor Green

# Release and renew DHCP
Write-Host "`nRenewing network configuration..." -ForegroundColor Yellow
try {
    ipconfig /release "Wi-Fi" 2>$null | Out-Null
    Start-Sleep -Seconds 2
    ipconfig /renew "Wi-Fi" 2>$null | Out-Null
    Write-Host "✓ Network configuration renewed" -ForegroundColor Green
} catch {
    Write-Host "⚠ Network renewal skipped" -ForegroundColor Yellow
}

# Restart NetBIOS and related services
Write-Host "`nRestarting NetBIOS services..." -ForegroundColor Yellow
$services = @("lmhosts", "NetBT")
foreach ($svc in $services) {
    try {
        $service = Get-Service -Name $svc -ErrorAction SilentlyContinue
        if ($service) {
            Restart-Service -Name $svc -Force -ErrorAction SilentlyContinue
            Write-Host "✓ $svc restarted" -ForegroundColor Green
        }
    } catch {
        Write-Host "⚠ Could not restart $svc" -ForegroundColor Yellow
    }
}

# Restart TankStorage service
Write-Host "`nRestarting TankStorage service..." -ForegroundColor Yellow
try {
    Restart-Service -Name "TankStorage" -Force
    Start-Sleep -Seconds 3
    $service = Get-Service -Name "TankStorage"
    if ($service.Status -eq "Running") {
        Write-Host "✓ TankStorage service restarted successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠ TankStorage service status: $($service.Status)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠ Could not restart TankStorage: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Get network info
Write-Host "`n" + ("="*60) -ForegroundColor Cyan
Write-Host "Network Information:" -ForegroundColor Cyan
Write-Host ("="*60) -ForegroundColor Cyan

$computerName = $env:COMPUTERNAME
$ip = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Wi-Fi" -ErrorAction SilentlyContinue).IPAddress

Write-Host "`nComputer Name: $computerName" -ForegroundColor White
Write-Host "IP Address: $ip" -ForegroundColor White

Write-Host "`nTry accessing from other devices using:" -ForegroundColor Yellow
Write-Host "  http://${computerName}:8008" -ForegroundColor Green
Write-Host "  http://${computerName}.local:8008" -ForegroundColor Green
Write-Host "  http://${ip}:8008" -ForegroundColor Green

Write-Host "`nTest from other device:" -ForegroundColor Yellow
Write-Host "  ping $computerName" -ForegroundColor White
Write-Host "  ping $ip" -ForegroundColor White

Write-Host "`nIf hostname still doesn't work, use the IP address." -ForegroundColor Cyan
Write-Host ("="*60) -ForegroundColor Cyan

pause
