# TankStorage Network File Manager

A modern, full-featured web application for managing files and folders on your network storage drive. Access your files from any device - desktop, mobile, or tablet - with an intuitive drag-and-drop interface.

**✅ Production Ready** - Runs as a Windows service with auto-start and auto-restart capabilities.

## 🌟 Features

### File Management
- **📂 Browse & Navigate** - Hierarchical folder structure with breadcrumb navigation
- **📤 Multi-File Upload** - Drag & drop, click to upload, or paste files directly
- **🗂️ File Tree Sidebar** - Collapsible sidebar with full directory tree view
- **➡️ Move Files & Folders** - Drag and drop files/folders to reorganize
- **✏️ Rename Folders** - Right-click any folder to rename it
- **📁 Create Folders** - Organize content with custom folders
- **🗑️ Delete Items** - Remove files and folders you no longer need

### Media & Viewing
- **🖼️ Image Viewer** - View images in full-screen modal
- **🎥 Video Player** - Play videos directly in the browser with controls
- **📄 File Icons** - Visual file type indicators for easy identification
- **💾 Download** - Download any file with one click

### Cross-Platform
- **📱 Mobile Friendly** - Responsive design for iOS and Android
- **🖥️ Desktop Support** - Works on Windows, Mac, and Linux
- **🌐 Network Access** - Access from any device on your local network
- **📋 Paste Support** - Copy files and paste directly into the webapp

### User Experience
- **🔄 Auto-Refresh** - Manual refresh button to sync external changes
- **🎨 Modern UI** - Clean, intuitive interface with smooth animations
- **⚡ Real-time Updates** - Instant feedback for all operations
- **🔔 Toast Notifications** - Success and error messages

### Security & Production
- **🔒 Local Network Only** - IP filtering blocks public internet access
- **🛡️ Firewall Protected** - Windows Firewall rule restricts to private networks
- **🔁 Auto-Restart** - Service automatically restarts if it crashes (5s delay)
- **📝 Logging** - All activity logged to files with automatic rotation
- **🚀 Boot on Startup** - Runs as Windows service, starts automatically

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (LTS recommended)
- Windows (for service installation)
- Network storage drive (configured at E:\TankStorage)

### Standard Installation (Development)

1. **Clone or download this repository**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the server:**
   ```bash
   npm start
   ```

4. **Access the application:**
   - Local: http://localhost:8008
   - Network: http://TANK:8008 (or your computer's IP address)

### Windows Service Installation (Production)

For production use with auto-start on boot:

1. **Complete standard installation first** (steps above)

2. **Install as Windows Service:**
   - Right-click `install-service.ps1`
   - Select "Run with PowerShell"
   - Confirm Administrator prompt

3. **Service is now running!**
   - Auto-starts on Windows boot
   - Auto-restarts if it crashes
   - Logs to `logs/` directory

**Service Management:**
```powershell
Get-Service TankStorage              # Check status
Start-Service TankStorage            # Start
Stop-Service TankStorage             # Stop
Restart-Service TankStorage          # Restart
```

**View Logs:**
```powershell
Get-Content logs\service-output.log -Tail 50
Get-Content logs\service-error.log -Tail 50
```

**Uninstall Service:**
- Right-click `uninstall-service.ps1`
- Select "Run with PowerShell"

📖 **Full service documentation:** See [SERVICE-SETUP.md](SERVICE-SETUP.md)

## 🔒 Security

### Network Protection
- **IP Filtering** - Application blocks non-local IP addresses at the code level
- **Firewall Rule** - Windows Firewall restricts access to local subnet only
- **Private Networks** - Only accepts connections from 192.168.x.x, 10.x.x.x, 172.16-31.x.x
- **No Internet Exposure** - Designed for local network use only (up to 20 devices)

### Safe for Local Network
✅ Perfect for home or small office networks  
✅ Protects against accidental internet exposure  
✅ All file operations validated and sanitized  
✅ Path traversal protection prevents unauthorized access  

⚠️ **Not designed for public internet hosting**

## 📖 Usage Guide

### Uploading Files

**Method 1: Drag & Drop**
- Drag files from your computer onto the upload zone or anywhere on the page
- Multiple files supported

**Method 2: Click to Upload**
- Click the "📤 Upload Files" button
- Select files from your file browser
- On mobile: Choose from Photos or Files app

**Method 3: Copy & Paste**
- Copy files (Ctrl+C / Cmd+C)
- Paste anywhere on the page (Ctrl+V / Cmd+V)
- Files upload automatically

### Navigating Folders

**Breadcrumb Navigation**
- Click any folder name in the breadcrumb at the top
- Instantly jump to that location

**File Grid**
- Click on any folder to open it
- Click on images/videos to view them
- Click on other files to download

**File Tree Sidebar**
- Click the 🗂️ button to open the sidebar
- Click folders to navigate
- Click ▶/▼ to expand/collapse folders
- Toggle width with ⇔ button (half/full screen)

### Renaming Folders

- **Right-click** on any folder
- Select "✏️ Rename"
- Enter new name
- Click "Save" or "Exit"

### Moving Files & Folders

**Drag & Drop to Reorganize**
- Click and hold any file or folder
- Drag it over a destination folder (folder will highlight)
- Release to move it there
- UI automatically refreshes to show the new location
- Works with all file types and special characters

**Features:**
- Move files between any folders
- Move entire folders into other folders
- Visual feedback during drag (semi-transparent item)
- Destination folder highlights when hovering
- Automatic UI sync after moving
- Error prevention (can't move item into itself)

### Creating Folders

1. Click "📁 New Folder" button
2. Enter folder name
3. Press Enter or click "Create Folder"

### Deleting Items

1. Hover over any file or folder
2. Click the 🗑️ trash icon
3. Confirm deletion

### Refreshing

- Click the 🔄 button in the header to reload the current view
- Useful when files are added directly to the storage drive outside the webapp
- Also refreshes the file tree sidebar
- UI automatically refreshes after: uploads, moves, creates, and deletes

### Advanced Features

**File Tree Sidebar**
- Click 🗂️ button to open collapsible directory tree
- Shows entire folder structure at a glance
- Click any folder to navigate instantly
- Expand/collapse folders with ▶/▼ arrows
- Toggle between half-width and full-width with ⇔ button
- Click outside or ✕ button to close
- Active folder is highlighted
- Auto-syncs when files are moved or created

**Special Character Support**
- Handles files with apostrophes, quotes, and special characters
- Properly escapes/unescapes during drag and drop
- Works with international characters and spaces in names

## 🖥️ Network Access

### From Windows/Mac/Linux
```
http://TANK:8008
```
or use your computer's IP address:
```
http://192.168.1.100:8008
```

### From iPhone/iPad
1. Connect to the same WiFi network
2. Open Safari or Chrome
3. Navigate to `http://TANK:8008`
4. Add to Home Screen for quick access

### From Android
1. Connect to the same WiFi network  
2. Open Chrome or any browser
3. Navigate to `http://TANK:8008`
4. Use "Add to home screen" for quick access

## 🔧 Configuration

### Changing Storage Path

Edit [server.js](server.js) line 9:
```javascript
const STORAGE_PATH = 'E:\\TankStorage';  // Change this path
```

### Changing Port

Edit [server.js](server.js) line 8:
```javascript
const PORT = 8008;  // Change this port
```

### File Size Limits

Default: 5GB per file. Edit [server.js](server.js) line 22:
```javascript
limits: { fileSize: 5000 * 1024 * 1024 }  // 5GB in bytes
```

## 🛡️ Security Notes

⚠️ **Important Security Information:**
- This application has **NO authentication** by default
- Designed for **trusted local networks only**
- **Do NOT expose to the public internet** without adding authentication
- Anyone on your network can access, upload, and delete files
- Consider adding authentication if using on shared networks

## 🔥 Firewall Configuration

### Windows Firewall

1. Open **Windows Defender Firewall**
2. Click **Advanced Settings** → **Inbound Rules** → **New Rule**
3. Choose **Port** → **TCP** → Enter **8008**
4. Select **Allow the connection**
5. Check all profiles → Name it "TankStorage Server"

### Mac Firewall

1. System Preferences → Security & Privacy → Firewall
2. Click "Firewall Options"
3. Add Node.js and allow incoming connections

## 🗂️ Project Structure

```
SharedSeverWebapp/
├── server.js              # Express backend server
├── package.json           # Node.js dependencies
├── README.md             # This file
├── SETUP.md              # Detailed setup instructions
├── LICENSE               # Apache 2.0 License
├── .gitignore            # Git ignore rules
└── public/               # Frontend static files
    ├── index.html        # Main HTML page
    └── app.js            # Frontend JavaScript
```

## 🎯 Supported File Types

### Images
JPG, JPEG, PNG, GIF, WebP, SVG, BMP

### Videos
MP4, MOV, AVI, MKV, WebM, FLV, M4V

### Documents
PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX

### Archives
ZIP, RAR, 7Z, TAR, GZ

### And More
All file types can be uploaded and downloaded. Only images and videos have in-browser preview.

## 🐛 Troubleshooting

### Can't access from network
- Verify server is running (check terminal output)
- Use IP address instead of hostname: `http://192.168.x.x:8008`
- Check Windows Firewall allows port 8008 (see Firewall Configuration section)
- Ensure all devices are on the same network
- Try disabling VPN if connected

### Upload fails
- Check available disk space on storage drive (E:\TankStorage)
- Verify folder write permissions
- Try smaller files first (under 100MB to test)
- Check server logs in terminal for specific errors
- Ensure path doesn't have permission restrictions

### Drag and drop not working
- Make sure you're dragging onto a folder (not a file)
- Folders highlight when you can drop
- Refresh the page (Ctrl+F5 or Cmd+Shift+R)
- Check browser console (F12) for JavaScript errors
- Ensure JavaScript is enabled in browser

### Videos won't play
- Check browser codec support (Chrome recommended)
- Try different browser
- Download and play locally if needed
- Check file isn't corrupted

### File tree not loading
- Check server is running
- Refresh the page
- Check browser console for errors
- Verify E:\TankStorage path exists and is accessible

### Files disappear after moving
- This was fixed - UI now auto-refreshes after moves
- If issue persists, click 🔄 refresh button
- Check the destination folder - file should be there

## 🛠️ Development

### Running in Development Mode
```bash
npm start
```
Server runs on http://localhost:8008

### Stopping the Server
**Windows PowerShell:**
```powershell
taskkill /F /IM node.exe
```

**Mac/Linux:**
```bash
pkill node
```

Or press `Ctrl+C` in the terminal where server is running

### Restarting After Code Changes
```powershell
# Stop server
taskkill /F /IM node.exe

# Start server
npm start
```

### Auto-restart on Changes (optional)
Install nodemon globally:
```bash
npm install -g nodemon
nodemon server.js
```

### Project Technology Stack
- **Backend:** Node.js + Express.js
- **File Upload:** Multer (multi-part form data)
- **Frontend:** Vanilla JavaScript (no frameworks)
- **Styling:** CSS3 with CSS Variables
- **Storage:** File system (E:\TankStorage)

## 📝 License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

## 📧 Support

For issues and questions, please open an issue on the project repository.

---

**Made with ❤️ for easy network file management**
