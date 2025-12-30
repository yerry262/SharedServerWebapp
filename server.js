const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');

const app = express();
const PORT = 8008;
const STORAGE_PATH = 'E:\\TankStorage';

// Trust proxy to get real IP addresses
app.set('trust proxy', true);

// Security middleware - restrict to local network only
app.use((req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    // Allow localhost and private IP ranges
    const isLocalhost = clientIP === '::1' || 
                       clientIP === '127.0.0.1' || 
                       clientIP === '::ffff:127.0.0.1' ||
                       clientIP === 'localhost';
    
    const isPrivateIP = /^(::ffff:)?(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/.test(clientIP);
    
    // Log the connection for debugging
    console.log(`Connection from: ${clientIP}`);
    
    if (!isLocalhost && !isPrivateIP && clientIP !== 'unknown') {
        console.log(`⚠️  Blocked request from non-local IP: ${clientIP}`);
        return res.status(403).send('Access denied: Local network only');
    }
    
    next();
});

// Security headers
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: async (req, file, cb) => {
        const uploadPath = req.body.path || '/';
        const fullPath = path.join(STORAGE_PATH, uploadPath);
        
        try {
            await fs.mkdir(fullPath, { recursive: true });
            cb(null, fullPath);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // Decode the filename to handle special characters
        const filename = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, filename);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5000 * 1024 * 1024 } // 5GB limit
});

// Helper function to check if path is safe
function isSafePath(requestedPath) {
    const fullPath = path.resolve(path.join(STORAGE_PATH, requestedPath));
    const basePath = path.resolve(STORAGE_PATH);
    return fullPath.startsWith(basePath);
}

// Get file/folder listing
app.get('/api/browse/*', async (req, res) => {
    try {
        const requestedPath = req.params[0] || '';
        
        if (!isSafePath(requestedPath)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const fullPath = path.join(STORAGE_PATH, requestedPath);
        
        // Check if path exists
        try {
            await fs.access(fullPath);
        } catch {
            return res.status(404).json({ error: 'Path not found' });
        }

        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
            const items = await fs.readdir(fullPath);
            const itemDetails = await Promise.all(
                items.map(async (item) => {
                    const itemPath = path.join(fullPath, item);
                    const itemStats = await fs.stat(itemPath);
                    return {
                        name: item,
                        type: itemStats.isDirectory() ? 'folder' : 'file',
                        size: itemStats.size,
                        modified: itemStats.mtime,
                        path: path.join(requestedPath, item).replace(/\\/g, '/')
                    };
                })
            );

            // Sort: folders first, then alphabetically
            itemDetails.sort((a, b) => {
                if (a.type !== b.type) {
                    return a.type === 'folder' ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });

            res.json({
                currentPath: requestedPath.replace(/\\/g, '/'),
                items: itemDetails
            });
        } else {
            // It's a file - send it
            res.sendFile(fullPath);
        }
    } catch (error) {
        console.error('Browse error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get full directory tree
app.get('/api/tree', async (req, res) => {
    try {
        async function buildTree(dirPath, relativePath = '') {
            const items = await fs.readdir(dirPath);
            const tree = [];

            for (const item of items) {
                const itemPath = path.join(dirPath, item);
                const itemRelativePath = relativePath ? `${relativePath}/${item}` : item;
                const stats = await fs.stat(itemPath);

                if (stats.isDirectory()) {
                    tree.push({
                        name: item,
                        type: 'folder',
                        path: itemRelativePath,
                        children: await buildTree(itemPath, itemRelativePath)
                    });
                }
            }

            // Sort folders alphabetically
            tree.sort((a, b) => a.name.localeCompare(b.name));
            return tree;
        }

        const tree = await buildTree(STORAGE_PATH);
        res.json({ tree });
    } catch (error) {
        console.error('Tree error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Upload files
app.post('/api/upload', upload.array('files', 50), async (req, res) => {
    try {
        const uploadedFiles = req.files.map(file => ({
            name: file.filename,
            size: file.size,
            path: path.relative(STORAGE_PATH, file.path).replace(/\\/g, '/')
        }));

        res.json({ 
            success: true, 
            files: uploadedFiles,
            message: `${uploadedFiles.length} file(s) uploaded successfully`
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create folder
app.post('/api/create-folder', async (req, res) => {
    try {
        const { path: requestedPath, name } = req.body;

        if (!name || name.includes('..') || /[<>:"|?*]/.test(name)) {
            return res.status(400).json({ error: 'Invalid folder name' });
        }

        if (!isSafePath(requestedPath)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const fullPath = path.join(STORAGE_PATH, requestedPath, name);
        await fs.mkdir(fullPath, { recursive: true });

        res.json({ 
            success: true, 
            message: `Folder "${name}" created successfully`,
            path: path.relative(STORAGE_PATH, fullPath).replace(/\\/g, '/')
        });
    } catch (error) {
        console.error('Create folder error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Rename file or folder
app.post('/api/rename', async (req, res) => {
    try {
        const { oldPath, newName } = req.body;

        if (!oldPath || !newName) {
            return res.status(400).json({ error: 'Old path and new name required' });
        }

        if (newName.includes('..') || /[<>:"|?*]/.test(newName)) {
            return res.status(400).json({ error: 'Invalid name' });
        }

        if (!isSafePath(oldPath)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const fullOldPath = path.join(STORAGE_PATH, oldPath);
        const parentDir = path.dirname(fullOldPath);
        const fullNewPath = path.join(parentDir, newName);

        // Check if source exists
        try {
            await fs.access(fullOldPath);
        } catch {
            return res.status(404).json({ error: 'Item not found' });
        }

        // Check if destination already exists
        try {
            await fs.access(fullNewPath);
            return res.status(400).json({ error: 'An item with that name already exists' });
        } catch {
            // Good, destination doesn't exist
        }

        // Rename the file/folder
        await fs.rename(fullOldPath, fullNewPath);

        res.json({ 
            success: true, 
            message: `Renamed successfully`,
            newPath: path.relative(STORAGE_PATH, fullNewPath).replace(/\\/g, '/')
        });
    } catch (error) {
        console.error('Rename error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Move file or folder
app.post('/api/move', async (req, res) => {
    try {
        const { sourcePath, destinationPath } = req.body;

        if (!sourcePath || !destinationPath) {
            return res.status(400).json({ error: 'Source and destination paths required' });
        }

        if (!isSafePath(sourcePath) || !isSafePath(destinationPath)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const fullSourcePath = path.join(STORAGE_PATH, sourcePath);
        const sourceFileName = path.basename(fullSourcePath);
        const fullDestPath = path.join(STORAGE_PATH, destinationPath, sourceFileName);

        // Check if source exists
        try {
            await fs.access(fullSourcePath);
        } catch {
            return res.status(404).json({ error: 'Source not found' });
        }

        // Check if destination exists
        try {
            await fs.access(fullDestPath);
            return res.status(400).json({ error: 'A file or folder with that name already exists in the destination' });
        } catch {
            // Good, destination doesn't exist
        }

        // Move the file/folder
        await fs.rename(fullSourcePath, fullDestPath);

        res.json({ 
            success: true, 
            message: `Moved successfully`,
            newPath: path.relative(STORAGE_PATH, fullDestPath).replace(/\\/g, '/')
        });
    } catch (error) {
        console.error('Move error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete file or folder
app.delete('/api/delete', async (req, res) => {
    try {
        const { path: requestedPath } = req.body;

        if (!requestedPath || requestedPath === '/' || requestedPath === '') {
            return res.status(400).json({ error: 'Cannot delete root folder' });
        }

        if (!isSafePath(requestedPath)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const fullPath = path.join(STORAGE_PATH, requestedPath);
        const stats = await fs.stat(fullPath);

        if (stats.isDirectory()) {
            await fs.rm(fullPath, { recursive: true, force: true });
        } else {
            await fs.unlink(fullPath);
        }

        res.json({ 
            success: true, 
            message: `Deleted successfully`
        });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Serve media files directly
app.get('/media/*', (req, res) => {
    try {
        const requestedPath = req.params[0];
        
        if (!isSafePath(requestedPath)) {
            return res.status(403).send('Access denied');
        }

        const fullPath = path.join(STORAGE_PATH, requestedPath);
        
        if (!fsSync.existsSync(fullPath)) {
            return res.status(404).send('File not found');
        }

        res.sendFile(fullPath);
    } catch (error) {
        console.error('Media serve error:', error);
        res.status(500).send('Error serving file');
    }
});

// Download file
app.get('/api/download/*', (req, res) => {
    try {
        const requestedPath = req.params[0];
        
        if (!isSafePath(requestedPath)) {
            return res.status(403).send('Access denied');
        }

        const fullPath = path.join(STORAGE_PATH, requestedPath);
        
        if (!fsSync.existsSync(fullPath)) {
            return res.status(404).send('File not found');
        }

        res.download(fullPath);
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).send('Error downloading file');
    }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════════════╗
║         TankStorage Server Running!                    ║
╚════════════════════════════════════════════════════════╝

🌐 Access from this computer:  http://localhost:${PORT}
🌐 Access from network:        http://TANK:${PORT}
📁 Storage location:           ${STORAGE_PATH}

Available from any device on your network!
Press Ctrl+C to stop the server.
    `);
});
