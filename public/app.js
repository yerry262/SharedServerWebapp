// Global state
let currentPath = '';
let filesData = [];
let treeData = null;
let expandedFolders = new Set();

// Context menu state
let contextMenuTarget = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadFiles('');
    setupEventListeners();
    loadFileTree();
    
    // Hide context menu on click anywhere
    document.addEventListener('click', hideContextMenu);
});

// Setup event listeners
function setupEventListeners() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    // Drag and drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', async (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        
        const items = e.dataTransfer.items;
        const files = [];

        // Handle both files and pasted content
        for (let item of items) {
            if (item.kind === 'file') {
                files.push(item.getAsFile());
            }
        }

        if (files.length > 0) {
            await uploadFiles(files);
        }
    });

    // Click to upload
    uploadZone.addEventListener('click', () => {
        triggerUpload();
    });

    // File input change
    fileInput.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            await uploadFiles(Array.from(e.target.files));
            fileInput.value = ''; // Reset input
        }
    });

    // Paste support
    document.addEventListener('paste', async (e) => {
        const items = e.clipboardData.items;
        const files = [];

        for (let item of items) {
            if (item.kind === 'file') {
                files.push(item.getAsFile());
            }
        }

        if (files.length > 0) {
            e.preventDefault();
            await uploadFiles(files);
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Escape to close modals
        if (e.key === 'Escape') {
            closeModal('createFolderModal');
            closeModal('mediaModal');
            closeModal('renameModal');
        }
    });

    // Enter key in folder name input
    document.getElementById('folderNameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            createFolder();
        }
    });
    
    // Enter key in rename input
    document.getElementById('renameInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveRename();
        }
    });
}

// Load files from server
async function loadFiles(path) {
    currentPath = path;
    const container = document.getElementById('filesContainer');
    
    container.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            Loading files...
        </div>
    `;

    try {
        const response = await fetch(`/api/browse/${path}`);
        
        if (!response.ok) {
            throw new Error('Failed to load files');
        }

        const data = await response.json();
        filesData = data.items;
        
        renderBreadcrumb(path);
        renderFiles(filesData);
        
        // Update tree active state
        if (treeData) {
            const treeContainer = document.getElementById('treeContent');
            renderTree(treeData, treeContainer);
        }
    } catch (error) {
        console.error('Error loading files:', error);
        showToast('Error loading files: ' + error.message, 'error');
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Error Loading Files</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// Render breadcrumb navigation
function renderBreadcrumb(path) {
    const breadcrumb = document.getElementById('breadcrumb');
    const parts = path ? path.split('/').filter(p => p) : [];
    
    let html = '<span class="breadcrumb-item" onclick="loadFiles(\'\')">🏠 Home</span>';
    
    let accumulatedPath = '';
    parts.forEach((part, index) => {
        accumulatedPath += (accumulatedPath ? '/' : '') + part;
        const displayPath = accumulatedPath;
        html += ` <span class="breadcrumb-separator">/</span> `;
        html += `<span class="breadcrumb-item" onclick="loadFiles('${displayPath}')">${part}</span>`;
    });
    
    breadcrumb.innerHTML = html;
}

// Render files and folders
function renderFiles(items) {
    const container = document.getElementById('filesContainer');
    
    if (items.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <h3>No files or folders</h3>
                <p>Upload some files or create a folder to get started</p>
            </div>
        `;
        return;
    }

    const html = `
        <div class="files-grid">
            ${items.map(item => renderFileItem(item)).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

// Render individual file item
function renderFileItem(item) {
    const icon = getFileIcon(item);
    const size = item.type === 'folder' ? '' : `<div class="file-size">${formatFileSize(item.size)}</div>`;
    
    // Escape special characters for HTML attributes
    const escapedPath = item.path.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    const escapedName = item.name.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
    
    const clickHandler = item.type === 'folder' 
        ? `onclick="loadFiles('${escapedPath}')"` 
        : `onclick="handleFileClick('${escapedPath}', '${escapedName}')"`;
    
    // Make items draggable and folders droppable
    const draggable = `draggable="true"`;
    const dragHandlers = `
        ondragstart="handleDragStart(event, '${escapedPath}', '${escapedName}', '${item.type}')"
        ondragend="handleDragEnd(event)"
        ondragover="handleDragOver(event, '${item.type}')"
        ondragleave="handleDragLeave(event)"
        ondrop="handleDrop(event, '${escapedPath}', '${item.type}')"
    `;
    
    // Add context menu handler for folders
    const contextMenuHandler = item.type === 'folder' ? `
        oncontextmenu="handleContextMenu(event, '${escapedPath}', '${escapedName}')"
    ` : '';

    return `
        <div class="file-item" ${clickHandler} ${draggable} ${dragHandlers} ${contextMenuHandler} data-path="${escapedPath}" data-type="${item.type}" data-name="${escapedName}">
            <div class="file-actions">
                <button class="delete-btn" onclick="event.stopPropagation(); deleteItem('${escapedPath}', '${escapedName}')" title="Delete">
                    🗑️
                </button>
            </div>
            <div class="file-icon">${icon}</div>
            <div class="file-name" title="${escapedName}">${item.name}</div>
            ${size}
        </div>
    `;
}

// Get icon for file type
function getFileIcon(item) {
    if (item.type === 'folder') return '📁';
    
    const ext = item.name.split('.').pop().toLowerCase();
    
    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return '🖼️';
    
    // Videos
    if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'm4v'].includes(ext)) return '🎥';
    
    // Audio
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac'].includes(ext)) return '🎵';
    
    // Documents
    if (['pdf'].includes(ext)) return '📄';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['xls', 'xlsx'].includes(ext)) return '📊';
    if (['ppt', 'pptx'].includes(ext)) return '📽️';
    
    // Archives
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '📦';
    
    // Code
    if (['js', 'py', 'java', 'cpp', 'html', 'css', 'php'].includes(ext)) return '💻';
    
    return '📄';
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Handle file click
async function handleFileClick(path, name) {
    const ext = name.split('.').pop().toLowerCase();
    const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'm4v'];
    
    if (imageExts.includes(ext)) {
        showMedia('image', path, name);
    } else if (videoExts.includes(ext)) {
        showMedia('video', path, name);
    } else {
        // Download the file
        window.open(`/api/download/${path}`, '_blank');
    }
}

// Show media in modal
function showMedia(type, path, name) {
    const modal = document.getElementById('mediaModal');
    const content = document.getElementById('mediaContent');
    
    if (type === 'image') {
        content.innerHTML = `
            <h3 style="margin-bottom: 1rem;">${name}</h3>
            <img src="/media/${path}" alt="${name}" />
            <div style="margin-top: 1rem; text-align: center;">
                <a href="/api/download/${path}" class="btn btn-primary" download>Download</a>
            </div>
        `;
    } else if (type === 'video') {
        content.innerHTML = `
            <h3 style="margin-bottom: 1rem;">${name}</h3>
            <video controls autoplay style="max-width: 100%; max-height: 70vh;">
                <source src="/media/${path}" type="video/${path.split('.').pop()}">
                Your browser doesn't support video playback.
            </video>
            <div style="margin-top: 1rem; text-align: center;">
                <a href="/api/download/${path}" class="btn btn-primary" download>Download</a>
            </div>
        `;
    }
    
    modal.classList.add('active');
}

// Refresh current directory
function refreshFiles() {
    showToast('Refreshing...', 'success');
    loadFiles(currentPath);
}

// Trigger file upload
function triggerUpload() {
    document.getElementById('fileInput').click();
}

// Upload files
async function uploadFiles(files) {
    if (files.length === 0) return;

    const formData = new FormData();
    formData.append('path', currentPath);
    
    for (let file of files) {
        formData.append('files', file);
    }

    showToast(`Uploading ${files.length} file(s)...`, 'success');

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Upload failed');
        }

        const result = await response.json();
        showToast(result.message, 'success');
        
        // Reload current directory and tree
        await Promise.all([
            loadFiles(currentPath),
            loadFileTree()
        ]);
    } catch (error) {
        console.error('Upload error:', error);
        showToast('Upload failed: ' + error.message, 'error');
    }
}

// Show create folder modal
function showCreateFolder() {
    const modal = document.getElementById('createFolderModal');
    const input = document.getElementById('folderNameInput');
    input.value = '';
    modal.classList.add('active');
    setTimeout(() => input.focus(), 100);
}

// Create folder
async function createFolder() {
    const name = document.getElementById('folderNameInput').value.trim();
    
    if (!name) {
        showToast('Please enter a folder name', 'error');
        return;
    }

    if (/[<>:"|?*\\\/]/.test(name)) {
        showToast('Folder name contains invalid characters', 'error');
        return;
    }

    try {
        const response = await fetch('/api/create-folder', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                path: currentPath,
                name: name
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create folder');
        }

        const result = await response.json();
        showToast(result.message, 'success');
        closeModal('createFolderModal');
        
        // Reload current directory and tree
        await Promise.all([
            loadFiles(currentPath),
            loadFileTree()
        ]);
    } catch (error) {
        console.error('Create folder error:', error);
        showToast('Failed to create folder: ' + error.message, 'error');
    }
}

// Delete file or folder
async function deleteItem(path, name) {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) {
        return;
    }

    try {
        const response = await fetch('/api/delete', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ path })
        });

        if (!response.ok) {
            throw new Error('Failed to delete');
        }

        const result = await response.json();
        showToast(result.message, 'success');
        
        // Reload current directory and tree
        await Promise.all([
            loadFiles(currentPath),
            loadFileTree()
        ]);
    } catch (error) {
        console.error('Delete error:', error);
        showToast('Failed to delete: ' + error.message, 'error');
    }
}

// Close modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('active');
}

// Drag and drop handlers
let draggedItem = null;

function handleDragStart(event, itemPath, itemName, itemType) {
    // Unescape HTML entities back to normal characters
    const unescapePath = itemPath.replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    const unescapeName = itemName.replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    
    draggedItem = { path: unescapePath, name: unescapeName, type: itemType };
    event.target.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', unescapePath);
}

function handleDragEnd(event) {
    event.target.classList.remove('dragging');
    draggedItem = null;
}

function handleDragOver(event, itemType) {
    // Only allow dropping on folders
    if (itemType === 'folder' && draggedItem) {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'move';
        event.currentTarget.classList.add('drag-over');
    }
}

function handleDragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
}

async function handleDrop(event, destinationPath, itemType) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('drag-over');
    
    // Unescape the destination path
    const unescapeDestPath = destinationPath.replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    
    // Only allow dropping on folders
    if (itemType !== 'folder' || !draggedItem) {
        return;
    }

    // Store the dragged item info before it might get cleared
    const movedItem = {
        path: draggedItem.path,
        name: draggedItem.name,
        type: draggedItem.type
    };

    // Don't allow dropping on itself
    if (movedItem.path === unescapeDestPath) {
        showToast('Cannot move item into itself', 'error');
        return;
    }

    try {
        const response = await fetch('/api/move', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sourcePath: movedItem.path,
                destinationPath: unescapeDestPath
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to move item');
        }

        const result = await response.json();
        showToast(`Moved "${movedItem.name}" successfully`, 'success');
        
        // Reload current directory and tree
        await Promise.all([
            loadFiles(currentPath),
            loadFileTree()
        ]);
    } catch (error) {
        console.error('Move error:', error);
        showToast('Failed to move: ' + error.message, 'error');
        // Reload anyway to sync UI with actual state
        await loadFiles(currentPath);
    }
}

// Sidebar functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const isOpen = sidebar.classList.contains('open');
    
    if (isOpen) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
    } else {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        if (!treeData) {
            loadFileTree();
        }
    }
}

function toggleSidebarWidth() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('fullwidth');
}

async function loadFileTree() {
    const container = document.getElementById('treeContent');
    
    try {
        const response = await fetch('/api/tree');
        
        if (!response.ok) {
            throw new Error('Failed to load tree');
        }

        const data = await response.json();
        treeData = data.tree;
        
        renderTree(treeData, container);
    } catch (error) {
        console.error('Error loading tree:', error);
        container.innerHTML = `
            <div style="padding: 1rem; color: var(--danger);">
                Error loading file tree
            </div>
        `;
    }
}

function renderTree(items, container, isRoot = true) {
    if (isRoot) {
        let html = `
            <div class="tree-item ${currentPath === '' ? 'active' : ''}" onclick="navigateToPath('')">
                <span class="tree-item-icon">🏠</span>
                <span class="tree-item-name">Home</span>
            </div>
        `;
        
        items.forEach(item => {
            html += renderTreeItem(item);
        });
        
        container.innerHTML = html;
    } else {
        let html = '';
        items.forEach(item => {
            html += renderTreeItem(item);
        });
        return html;
    }
}

function renderTreeItem(item) {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedFolders.has(item.path);
    const isActive = currentPath === item.path;
    const toggle = hasChildren ? (isExpanded ? '▼' : '▶') : '';
    
    let html = `
        <div>
            <div class="tree-item ${isActive ? 'active' : ''}" onclick="navigateToPath('${item.path}')">
                <span class="tree-toggle" onclick="event.stopPropagation(); toggleFolder('${item.path}')">${toggle}</span>
                <span class="tree-item-icon">📁</span>
                <span class="tree-item-name">${item.name}</span>
            </div>
    `;
    
    if (hasChildren && isExpanded) {
        html += `<div class="tree-children">`;
        item.children.forEach(child => {
            html += renderTreeItem(child);
        });
        html += `</div>`;
    }
    
    html += `</div>`;
    return html;
}

function toggleFolder(path) {
    if (expandedFolders.has(path)) {
        expandedFolders.delete(path);
    } else {
        expandedFolders.add(path);
    }
    
    const container = document.getElementById('treeContent');
    renderTree(treeData, container);
}

function navigateToPath(path) {
    loadFiles(path);
}

// Context menu handling
function handleContextMenu(event, itemPath, itemName) {
    event.preventDefault();
    event.stopPropagation();
    
    // Unescape HTML entities
    const unescapePath = itemPath.replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    const unescapeName = itemName.replace(/&#39;/g, "'").replace(/&quot;/g, '"');
    
    contextMenuTarget = { path: unescapePath, name: unescapeName };
    
    showContextMenu(event.pageX, event.pageY);
}

function showContextMenu(x, y) {
    // Remove existing context menu
    hideContextMenu();
    
    const menu = document.createElement('div');
    menu.id = 'contextMenu';
    menu.className = 'context-menu';
    menu.innerHTML = `
        <div class="context-menu-item" onclick="renameFromContextMenu()">
            <span>✏️ Rename</span>
        </div>
    `;
    
    document.body.appendChild(menu);
    
    // Position the menu
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    
    // Adjust if menu goes off screen
    const menuRect = menu.getBoundingClientRect();
    if (menuRect.right > window.innerWidth) {
        menu.style.left = (x - menuRect.width) + 'px';
    }
    if (menuRect.bottom > window.innerHeight) {
        menu.style.top = (y - menuRect.height) + 'px';
    }
}

function hideContextMenu() {
    const menu = document.getElementById('contextMenu');
    if (menu) {
        menu.remove();
    }
    contextMenuTarget = null;
}

function renameFromContextMenu() {
    if (contextMenuTarget) {
        showRenameModal(contextMenuTarget.path, contextMenuTarget.name);
    }
    hideContextMenu();
}

// Show rename modal
function showRenameModal(itemPath, itemName) {
    const modal = document.getElementById('renameModal');
    const input = document.getElementById('renameInput');
    
    // Store the item info in modal data attributes
    modal.dataset.itemPath = itemPath;
    modal.dataset.itemName = itemName;
    
    // Set the input value to current name
    input.value = itemName;
    
    // Show the modal
    modal.classList.add('active');
    
    // Focus and select the input
    setTimeout(() => {
        input.focus();
        input.select();
    }, 100);
}

// Save rename
async function saveRename() {
    const modal = document.getElementById('renameModal');
    const input = document.getElementById('renameInput');
    const newName = input.value.trim();
    const oldPath = modal.dataset.itemPath;
    const oldName = modal.dataset.itemName;
    
    if (!newName) {
        showToast('Please enter a valid name', 'error');
        return;
    }
    
    if (newName === oldName) {
        closeModal('renameModal');
        return;
    }
    
    // Validate name
    if (/[<>:"|?*]/.test(newName)) {
        showToast('Invalid characters in name', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/rename', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                oldPath: oldPath,
                newName: newName
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to rename');
        }
        
        const result = await response.json();
        showToast(`Renamed to "${newName}" successfully`, 'success');
        
        closeModal('renameModal');
        
        // Reload current directory and tree
        await Promise.all([
            loadFiles(currentPath),
            loadFileTree()
        ]);
    } catch (error) {
        console.error('Rename error:', error);
        showToast('Failed to rename: ' + error.message, 'error');
    }
}

// Show toast notification
function showToast(message, type = 'success') {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
