# Windows Service Setup Guide

This guide explains how to set up TankStorage as a Windows service that starts automatically on boot.

## Features

✅ **Auto-start on boot** - Service starts automatically when Windows starts
✅ **Auto-restart on crash** - Automatically restarts with 5-second delay if it crashes
✅ **Logging** - All output logged to `logs/` directory
✅ **Local network only** - Firewall configured to accept only local network connections
✅ **Security** - Server blocks non-local IP addresses

## Installation

### Step 1: Run the Installer

1. **Right-click** on `install-service.ps1`
2. Select **"Run with PowerShell"**
3. If prompted, confirm you want to run the script as Administrator

The script will:
- Download NSSM (Non-Sucking Service Manager) if needed
- Install the TankStorage service
- Configure auto-start and auto-restart
- Set up logging
- Create Windows Firewall rule for local network access only
- Start the service

### Step 2: Verify Installation

After installation, the service should be running. You can verify by:

```powershell
Get-Service TankStorage
```

Or open Services (press `Win + R`, type `services.msc`)

### Step 3: Access the Application

- **From this computer:** http://localhost:8008
- **From network devices:** http://TANK:8008 (or use the computer's IP address)

## Service Management

### View Service Status
```powershell
Get-Service TankStorage
```

### Stop Service
```powershell
Stop-Service TankStorage
```

### Start Service
```powershell
Start-Service TankStorage
```

### Restart Service
```powershell
Restart-Service TankStorage
```

### View Logs
```powershell
# View output log (last 50 lines)
Get-Content logs\service-output.log -Tail 50

# View error log
Get-Content logs\service-error.log -Tail 50

# Monitor log in real-time
Get-Content logs\service-output.log -Wait -Tail 20
```

## Uninstallation

To remove the service:

1. **Right-click** on `uninstall-service.ps1`
2. Select **"Run with PowerShell"**
3. Confirm when prompted

This will:
- Stop the service
- Remove the service
- Remove the firewall rule
- Keep log files (you can delete them manually)

## Security Configuration

### Network Access
The service is configured to accept connections **only from your local network**:
- ✅ Localhost (127.0.0.1)
- ✅ Private networks (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
- ❌ Public internet (blocked at both firewall and application level)

### Firewall Rule
A Windows Firewall rule is created with these settings:
- **Name:** TankStorage Local Network
- **Direction:** Inbound
- **Protocol:** TCP
- **Port:** 8008
- **Action:** Allow
- **Profile:** Private networks only
- **Remote Address:** LocalSubnet only

### Application Security
The server code includes:
- IP address filtering (rejects non-local connections)
- Path traversal protection (prevents access outside storage folder)
- Security headers (XSS protection, frame options, etc.)
- Input validation for file/folder names

## Logs

All logs are stored in the `logs/` directory:
- `service-output.log` - Normal application output
- `service-error.log` - Error messages and stack traces

Logs automatically rotate:
- Daily rotation
- Maximum size: 10 MB per file
- Old logs are kept with timestamps

## Troubleshooting

### Service won't start
1. Check logs: `Get-Content logs\service-error.log -Tail 50`
2. Verify Node.js is installed at: `C:\Program Files\nodejs\node.exe`
3. Check if port 8008 is already in use: `netstat -ano | findstr :8008`

### Can't access from other devices
1. Ensure both devices are on the same network
2. Check Windows Firewall is not blocking: `Get-NetFirewallRule -DisplayName "TankStorage*"`
3. Verify the service is running: `Get-Service TankStorage`
4. Try accessing by IP address instead of computer name

### Connection refused from network device
1. Make sure your network profile is set to "Private" not "Public"
2. Check firewall rule: `Get-NetFirewallRule -DisplayName "TankStorage Local Network"`
3. Temporarily disable Windows Firewall to test (don't forget to re-enable!)

### Logs too large
Logs auto-rotate, but you can manually clear them:
```powershell
Stop-Service TankStorage
Remove-Item logs\*.log
Start-Service TankStorage
```

## Advanced Configuration

### Change Port
Edit `server.js` and change `PORT = 8008` to your desired port, then:
1. Update firewall rule: `Set-NetFirewallRule -DisplayName "TankStorage Local Network" -LocalPort YOUR_PORT`
2. Restart service: `Restart-Service TankStorage`

### Change Storage Path
Edit `server.js` and change `STORAGE_PATH = 'E:\\TankStorage'` to your desired path, then:
1. Restart service: `Restart-Service TankStorage`

### Adjust Restart Delay
The service waits 5 seconds before restarting after a crash. To change this:
1. Run: `nssm edit TankStorage`
2. Go to "Exit actions" tab
3. Adjust "Restart delay"

## Network Discovery

For devices to find the server by name (http://TANK:8008):
1. Ensure "Network Discovery" is enabled in Windows
2. Check Network & Internet settings → Advanced sharing settings
3. Make sure you're on a "Private" network profile

## Performance

- The service runs continuously in the background
- Memory usage: ~50-100 MB (depends on activity)
- CPU usage: Minimal when idle
- Storage: Logs in `logs/` directory (auto-rotated)

## Support

If you encounter issues:
1. Check the logs first
2. Verify firewall settings
3. Ensure network profile is "Private"
4. Test with `http://localhost:8008` first, then network access
