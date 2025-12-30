# TankStorage Setup Guide

## Prerequisites Installation

### Step 1: Install Node.js

**Option A: Using Windows Package Manager (Recommended)**
1. Open PowerShell
2. Run: `winget install OpenJS.NodeJS.LTS`
3. Accept the terms when prompted
4. Wait for installation to complete

**Option B: Manual Download**
1. Download Node.js from: https://nodejs.org/
2. Choose the **LTS version** (Long Term Support)
3. Run the installer
4. **Important**: Check the box that says "Automatically install the necessary tools"
5. Complete installation

**After Installation:**
- Restart your computer (recommended) or just restart PowerShell
- PowerShell may require execution policy update (see Step 1.5)

### Step 1.5: Enable PowerShell Script Execution (If Needed)

If you get "scripts is disabled on this system" error:
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```
This allows npm commands to run properly.

### Step 2: Verify Installation

Open PowerShell or Command Prompt and type:
```bash
node --version
npm --version
```

You should see version numbers. If not, restart your terminal.

## Application Setup

### Step 3: Install Dependencies

Open PowerShell in the project folder and run:
```bash
npm install
```

This will install:
- Express (web server)
- Multer (file upload handling)
- CORS (cross-origin support)

### Step 4: Start the Server

Run:
```bash
npm start
```

You should see:
```
╔════════════════════════════════════════════════════════╗
║         TankStorage Server Running!                    ║
╚════════════════════════════════════════════════════════╝

🌐 Access from this computer:  http://localhost:8008
🌐 Access from network:        http://TANK:8008
📁 Storage location:           E:\TankStorage
```

**To Stop the Server:**
- Press `Ctrl+C` in the terminal, or
- Run: `taskkill /F /IM node.exe` in a new PowerShell window

**To Restart After Code Changes:**
```powershell
taskkill /F /IM node.exe
npm start
```

## Network Access Setup

### Step 5: Configure Windows Firewall

1. Open **Windows Defender Firewall**
2. Click **Advanced Settings**
3. Click **Inbound Rules** → **New Rule**
4. Choose **Port** → Next
5. Choose **TCP**, enter port **8008** → Next
6. Choose **Allow the connection** → Next
7. Check all profiles (Domain, Private, Public) → Next
8. Name it "TankStorage Server" → Finish

### Step 6: Find Your Computer's IP Address

In PowerShell, type:
```bash
ipconfig
```

Look for "IPv4 Address" under your network adapter (usually starts with 192.168.x.x)

### Step 7: Set Computer Name (Optional)

If you want to use `TANK:8008` instead of IP address:

1. Open **Settings** → **System** → **About**
2. Click **Rename this PC**
3. Enter "TANK"
4. Restart your computer

## Accessing from Devices

### From Windows/Mac/Linux:
- Browser: `http://TANK:8008` or `http://192.168.x.x:8008`

### From iPhone/iPad:
1. Open Safari or Chrome
2. Go to: `http://TANK:8008` or `http://192.168.x.x:8008`
3. Tap "Upload Files" to access Photos or Files
4. **Tip**: Add to Home Screen for easy access

### From Android:
1. Open Chrome or any browser
2. Go to: `http://TANK:8008` or `http://192.168.x.x:8008`
3. Tap "Upload Files" to choose files
4. **Tip**: Use "Add to Home screen" for quick access

## Quick Start Commands

### Start the server:
```bash
npm start
```

### Stop the server:
Press `Ctrl+C` in the terminal

### Run in background (Windows):
```bash
Start-Process -NoNewWindow node server.js
```

## Folder Structure

```
SharedSeverWebapp/
├── server.js          # Backend server
├── package.json       # Dependencies
├── README.md          # Documentation
├── SETUP.md          # This file
└── public/           # Frontend files
    ├── index.html    # Main page
    └── app.js        # Frontend logic
```

## Storage Location

**E:\TankStorage** contains:
- Drone Footage/
- Jerry Work/
- SharedMedia/

All uploads go to these folders or new folders you create.

## Usage Examples

### Upload from iPhone Photos:
1. Open the webapp in Safari: `http://TANK:8008`
2. Tap "📤 Upload Files"
3. Choose "Photo Library"
4. Select photos/videos
5. Files upload to current folder
6. View thumbnails immediately

### Move Files Around:
1. Find the file you want to move (e.g., "Last Years.mpg")
2. Click and hold on the file
3. Drag it over a folder (folder will highlight blue)
4. Release to drop it in
5. File moves and UI refreshes automatically
6. Works with all file types including videos

### Use File Tree Sidebar:
1. Click the 🗂️ button in the header
2. See entire folder structure
3. Click ▶ to expand folders
4. Click folder name to navigate there
5. Click ⇔ to toggle half/full width
6. Click outside or ✕ to close

### Create and Navigate:
1. Create folder "Vacation 2025"
2. Click on it to enter
3. Upload photos there
4. Use breadcrumbs at top to go back
5. Or use file tree sidebar to jump anywhere

### Paste Files (Desktop):
1. Copy files from Explorer (Ctrl+C)
2. Go to webapp
3. Paste anywhere (Ctrl+V)
4. Files upload automatically

## Troubleshooting

### "Cannot access TANK:8008"
- Use IP address instead: `http://192.168.1.100:8008`
  - Find your IP: Run `ipconfig` in PowerShell, look for "IPv4 Address"
- Check firewall rules are created (see Step 5)
- Verify server is running (check terminal window)
- Make sure devices are on same WiFi network
- Disable VPN if connected

### "Upload failed"
- Check E:\TankStorage exists and is accessible
- Verify you have write permissions to the folder
- Check available disk space on E: drive
- Try uploading smaller files first
- Look at server terminal for error messages

### "npm is not recognized"
- Node.js not installed properly
- Restart PowerShell/terminal after Node.js installation
- Verify installation: `node --version` and `npm --version`
- If still fails, check Node.js is in PATH environment variable

### Drag and Drop Doesn't Work
- Refresh page with Ctrl+F5 (hard refresh)
- Make sure you're dragging onto a folder (not a file)
- Folders should highlight when you can drop
- Check browser console (F12) for errors
- Ensure JavaScript is enabled

### Files Don't Update After Moving
- Should be fixed in latest version (auto-refresh)
- Click 🔄 refresh button manually if needed
- Check destination folder - file should be there
- Server automatically syncs UI after moves

### Mobile Issues
- Ensure devices are on same WiFi network
- Try IP address instead of hostname
- Check that port 8008 is not blocked
- Use Chrome or Safari (best compatibility)
- For iOS: Add to Home Screen for app-like experience

### Server Won't Start
- Check if port 8008 is already in use:
  ```powershell
  netstat -ano | findstr :8008
  ```
- Kill existing process:
  ```powershell
  taskkill /F /IM node.exe
  ```
- Try changing port in server.js (line 8)
- Check E:\TankStorage path exists

## Advanced: Auto-Start on Windows

To make the server start automatically:

1. Create a batch file `start-tankstorage.bat`:
```batch
@echo off
cd /d "c:\Users\jerry\Desktop\SharedSeverWebapp"
node server.js
```

2. Create a shortcut to this file in:
   `C:\Users\jerry\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup`

The server will now start when you log in.

## Security Notes

⚠️ **Important**:
- This server has NO password protection
- Only use on trusted home/office networks
- Do NOT expose to the internet
- Consider adding authentication if needed

## Support

If you encounter issues:
1. Check the terminal for error messages
2. Verify Node.js is installed: `node --version`
3. Check firewall settings
4. Try accessing via IP address first
5. Ensure E:\TankStorage exists and is accessible
