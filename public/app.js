// Global state
let currentPath = '';
let filesData = [];
let treeData = null;
let expandedFolders = new Set();
let viewMode = 'grid'; // 'grid' or 'list'

// Context menu state
let contextMenuTarget = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Load saved view mode preference
    const savedViewMode = localStorage.getItem('viewMode');
    if (savedViewMode && ['grid', 'list'].includes(savedViewMode)) {
        viewMode = savedViewMode;
        document.getElementById('viewModeGrid').classList.toggle('active', viewMode === 'grid');
        document.getElementById('viewModeList').classList.toggle('active', viewMode === 'list');
    }
    
    setupFileItemEventDelegation();
    setupModalClickOutside();
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

        // Handle both files and folders
        if (items) {
            const promises = [];
            for (let i = 0; i < items.length; i++) {
                const item = items[i].webkitGetAsEntry();
                if (item) {
                    promises.push(traverseFileTree(item));
                }
            }
            const results = await Promise.all(promises);
            results.forEach(result => files.push(...result));
        }

        if (files.length > 0) {
            await uploadFilesWithProgress(files);
        }
    });

    // Click to upload
    uploadZone.addEventListener('click', () => {
        triggerUpload();
    });

    // File input change
    fileInput.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            await uploadFilesWithProgress(Array.from(e.target.files));
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
            await uploadFilesWithProgress(files);
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
    
    breadcrumb.innerHTML = '';
    
    // Home breadcrumb
    const homeSpan = document.createElement('span');
    homeSpan.className = 'breadcrumb-item';
    homeSpan.textContent = '🏠 Home';
    homeSpan.addEventListener('click', () => loadFiles(''));
    breadcrumb.appendChild(homeSpan);
    
    let accumulatedPath = '';
    parts.forEach((part, index) => {
        accumulatedPath += (accumulatedPath ? '/' : '') + part;
        const pathToLoad = accumulatedPath;
        
        // Separator
        const separator = document.createElement('span');
        separator.className = 'breadcrumb-separator';
        separator.textContent = ' / ';
        breadcrumb.appendChild(separator);
        
        // Breadcrumb item
        const itemSpan = document.createElement('span');
        itemSpan.className = 'breadcrumb-item';
        itemSpan.textContent = part;
        itemSpan.addEventListener('click', () => loadFiles(pathToLoad));
        breadcrumb.appendChild(itemSpan);
    });
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

    const containerClass = viewMode === 'list' ? 'files-list' : 'files-grid';
    const html = `
        <div class="${containerClass}">
            ${items.map(item => renderFileItem(item)).join('')}
        </div>
    `;
    
    container.innerHTML = html;
    
    // Load video thumbnails after rendering
    loadVideoThumbnails();
}

// Render individual file item
function renderFileItem(item) {
    const icon = getFileIcon(item);
    const size = item.type === 'folder' ? '' : `<div class="file-size">${formatFileSize(item.size)}</div>`;
    
    // Escape HTML entities for display
    const displayName = escapeHtml(item.name);
    
    // Generate thumbnail or icon
    let iconContent;
    if (item.type === 'file') {
        const ext = item.name.split('.').pop().toLowerCase();
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
        const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'm4v', 'mpg', 'mpeg', 'wmv', '3gp', 'ogv', 'ts', 'mts'];
        
        if (imageExts.includes(ext)) {
            // Show image thumbnail
            iconContent = `
                <div class="file-thumbnail">
                    <img src="/media/${escapeHtml(item.path)}" 
                         alt="${displayName}"
                         onerror="this.parentElement.innerHTML='${icon}';"
                         loading="lazy">
                </div>
            `;
        } else if (videoExts.includes(ext)) {
            // Show video thumbnail using video element
            iconContent = `
                <div class="file-thumbnail video-thumbnail" data-video-path="${escapeHtml(item.path)}">
                    <div class="thumbnail-icon">${icon}</div>
                    <div class="video-play-overlay">▶</div>
                </div>
            `;
        } else {
            iconContent = `<div class="file-icon">${icon}</div>`;
        }
    } else {
        iconContent = `<div class="file-icon">${icon}</div>`;
    }
    
    return `
        <div class="file-item" 
             data-path="${escapeHtml(item.path)}" 
             data-name="${escapeHtml(item.name)}"
             data-type="${item.type}"
             draggable="true">
            <div class="file-actions">
                <button class="delete-btn" data-action="delete" title="Delete">
                    🗑️
                </button>
            </div>
            ${iconContent}
            <div class="file-name" title="${displayName}">${displayName}</div>
            ${size}
        </div>
    `;
}

// Escape HTML entities
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Load video thumbnails
function loadVideoThumbnails() {
    const videoThumbnails = document.querySelectorAll('.video-thumbnail');
    
    videoThumbnails.forEach((thumbnail, index) => {
        const videoPath = thumbnail.getAttribute('data-video-path');
        if (!videoPath) return;
        
        // Delay each video thumbnail generation to avoid overwhelming the browser
        setTimeout(() => {
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.preload = 'metadata';
            video.muted = true;
            
            video.addEventListener('loadeddata', () => {
                // Seek to 1 second or 10% of duration, whichever is less
                const seekTime = Math.min(1, video.duration * 0.1);
                video.currentTime = seekTime;
            });
            
            video.addEventListener('seeked', () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 160;
                    canvas.height = 90;
                    const ctx = canvas.getContext('2d');
                    
                    // Calculate aspect ratio
                    const aspectRatio = video.videoWidth / video.videoHeight;
                    let drawWidth = canvas.width;
                    let drawHeight = canvas.height;
                    let offsetX = 0;
                    let offsetY = 0;
                    
                    if (aspectRatio > canvas.width / canvas.height) {
                        drawHeight = canvas.width / aspectRatio;
                        offsetY = (canvas.height - drawHeight) / 2;
                    } else {
                        drawWidth = canvas.height * aspectRatio;
                        offsetX = (canvas.width - drawWidth) / 2;
                    }
                    
                    ctx.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
                    
                    const thumbnailImg = document.createElement('img');
                    thumbnailImg.src = canvas.toDataURL();
                    thumbnailImg.style.width = '100%';
                    thumbnailImg.style.height = '100%';
                    thumbnailImg.style.objectFit = 'cover';
                    
                    const iconEl = thumbnail.querySelector('.thumbnail-icon');
                    if (iconEl) {
                        iconEl.replaceWith(thumbnailImg);
                    }
                } catch (error) {
                    console.error('Error generating video thumbnail:', error);
                    // Keep the default icon on error
                }
            });
            
            video.addEventListener('error', () => {
                // Keep the default icon on error
                console.error('Error loading video for thumbnail');
            });
            
            video.src = '/media/' + videoPath;
        }, index * 100); // Stagger thumbnail generation
    });
}

// Setup event delegation for file items (runs once on page load)
function setupFileItemEventDelegation() {
    const container = document.getElementById('filesContainer');
    
    // Use event delegation for all file item interactions
    container.addEventListener('click', (e) => {
        const fileItem = e.target.closest('.file-item');
        if (!fileItem) return;
        
        const deleteBtn = e.target.closest('.delete-btn');
        if (deleteBtn) {
            e.stopPropagation();
            const path = fileItem.getAttribute('data-path');
            const name = fileItem.getAttribute('data-name');
            deleteItem(path, name);
            return;
        }
        
        const path = fileItem.getAttribute('data-path');
        const name = fileItem.getAttribute('data-name');
        const type = fileItem.getAttribute('data-type');
        
        if (type === 'folder') {
            loadFiles(path);
        } else {
            handleFileClick(path, name);
        }
    });
    
    // Drag and drop event delegation
    container.addEventListener('dragstart', (e) => {
        const fileItem = e.target.closest('.file-item');
        if (!fileItem) return;
        
        const path = fileItem.getAttribute('data-path');
        const name = fileItem.getAttribute('data-name');
        const type = fileItem.getAttribute('data-type');
        handleDragStart(e, path, name, type);
    });
    
    container.addEventListener('dragend', (e) => {
        const fileItem = e.target.closest('.file-item');
        if (fileItem) handleDragEnd(e);
    });
    
    container.addEventListener('dragover', (e) => {
        const fileItem = e.target.closest('.file-item');
        if (!fileItem) return;
        const type = fileItem.getAttribute('data-type');
        handleDragOver(e, type);
    });
    
    container.addEventListener('dragleave', (e) => {
        const fileItem = e.target.closest('.file-item');
        if (fileItem) handleDragLeave(e);
    });
    
    container.addEventListener('drop', (e) => {
        const fileItem = e.target.closest('.file-item');
        if (!fileItem) return;
        const path = fileItem.getAttribute('data-path');
        const type = fileItem.getAttribute('data-type');
        handleDrop(e, path, type);
    });
    
    // Context menu for folders
    container.addEventListener('contextmenu', (e) => {
        const fileItem = e.target.closest('.file-item');
        if (!fileItem) return;
        
        const type = fileItem.getAttribute('data-type');
        if (type === 'folder') {
            const path = fileItem.getAttribute('data-path');
            const name = fileItem.getAttribute('data-name');
            handleContextMenu(e, path, name);
        }
    });
}

// Get icon for file type
function getFileIcon(item) {
    if (item.type === 'folder') return '📁';
    
    const ext = item.name.split('.').pop().toLowerCase();
    
    // Images
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext)) return '🖼️';
    
    // Videos
    if (['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'm4v', 'mpg', 'mpeg', 'wmv', '3gp', 'ogv', 'ts', 'mts'].includes(ext)) return '🎥';
    
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
    const videoExts = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'flv', 'm4v', 'mpg', 'mpeg', 'wmv', '3gp', 'ogv', 'ts', 'mts'];
    
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
// Set view mode
function setViewMode(mode) {
    viewMode = mode;
    
    // Update button states
    document.getElementById('viewModeGrid').classList.toggle('active', mode === 'grid');
    document.getElementById('viewModeList').classList.toggle('active', mode === 'list');
    
    // Re-render files with new view mode
    renderFiles(filesData);
    
    // Save preference
    localStorage.setItem('viewMode', mode);
}

// Store current video player instance
let currentVideoPlayer = null;

function showMedia(type, path, name) {
    const modal = document.getElementById('mediaModal');
    const content = document.getElementById('mediaContent');
    
    // Dispose of previous video player if exists
    if (currentVideoPlayer) {
        currentVideoPlayer.dispose();
        currentVideoPlayer = null;
    }
    
    if (type === 'image') {
        content.innerHTML = `
            <h3 style="margin-bottom: 1rem;">${name}</h3>
            <img src="/media/${path}" alt="${name}" />
            <div style="margin-top: 1rem; text-align: center;">
                <a href="/api/download/${path}" class="btn btn-primary" download>Download</a>
            </div>
        `;
    } else if (type === 'video') {
        const ext = path.split('.').pop().toLowerCase();
        const videoId = 'video-player-' + Date.now();
        
        // Get proper MIME type
        const mimeTypes = {
            'mp4': 'video/mp4',
            'm4v': 'video/mp4',
            'mov': 'video/quicktime',
            'avi': 'video/x-msvideo',
            'mkv': 'video/x-matroska',
            'webm': 'video/webm',
            'flv': 'video/x-flv',
            'mpg': 'video/mpeg',
            'mpeg': 'video/mpeg',
            'wmv': 'video/x-ms-wmv',
            '3gp': 'video/3gpp',
            'ogv': 'video/ogg',
            'ts': 'video/mp2t',
            'mts': 'video/mp2t'
        };
        
        const mimeType = mimeTypes[ext] || 'video/mp4';
        
        content.innerHTML = `
            <h3 style="margin-bottom: 1rem;">${escapeHtml(name)}</h3>
            <video id="${videoId}" class="video-js vjs-big-play-centered" controls preload="auto">
                <source src="/media/${path}" type="${mimeType}">
                <p class="vjs-no-js">
                    To view this video please enable JavaScript, and consider upgrading to a
                    web browser that supports HTML5 video
                </p>
            </video>
            <div style="margin-top: 1rem; text-align: center;">
                <a href="/api/download/${path}" class="btn btn-primary" download>Download</a>
            </div>
        `;
        
        // Show modal first
        modal.classList.add('active');
        
        // Initialize Video.js player after modal is visible
        setTimeout(() => {
            if (document.getElementById(videoId)) {
                currentVideoPlayer = videojs(videoId, {
                    controls: true,
                    autoplay: false,
                    preload: 'auto',
                    fluid: true,
                    aspectRatio: '16:9',
                    playbackRates: [0.5, 1, 1.5, 2],
                    fill: false,
                    controlBar: {
                        volumePanel: { inline: false }
                    }
                });
                
                // Error handling
                currentVideoPlayer.on('error', function() {
                    const error = currentVideoPlayer.error();
                    console.error('Video player error:', error);
                    
                    // Show more helpful error message
                    let errorMsg = 'Error loading video.';
                    if (error && error.code === 4) {
                        errorMsg = `This video format (.${ext}) may not be supported by your browser. Try downloading it instead.`;
                    }
                    showToast(errorMsg, 'error');
                });
                
                // Ready event
                currentVideoPlayer.ready(function() {
                    console.log('Video player ready');
                });
            }
        }, 150);
        
        return; // Exit early since we already showed the modal
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
// Recursively traverse file tree for folders
async function traverseFileTree(item, path = '') {
    const files = [];
    
    if (item.isFile) {
        return new Promise((resolve) => {
            item.file((file) => {
                // Preserve folder structure
                if (path) {
                    file.relativePath = path + file.name;
                }
                resolve([file]);
            });
        });
    } else if (item.isDirectory) {
        const dirReader = item.createReader();
        const entries = await new Promise((resolve) => {
            dirReader.readEntries(resolve);
        });
        
        for (let entry of entries) {
            const subFiles = await traverseFileTree(entry, path + item.name + '/');
            files.push(...subFiles);
        }
    }
    
    return files;
}

// Upload files with progress notification
async function uploadFilesWithProgress(files) {
    if (files.length === 0) return;

    const progressNotification = showProgressNotification(files.length);
    
    try {
        // Upload in batches to avoid overwhelming the server
        const batchSize = 10;
        let uploadedCount = 0;
        
        for (let i = 0; i < files.length; i += batchSize) {
            const batch = files.slice(i, i + batchSize);
            
            const formData = new FormData();
            formData.append('path', currentPath);
            
            for (let file of batch) {
                formData.append('files', file);
                // Include relative path if it exists (for folder uploads)
                if (file.relativePath) {
                    formData.append('relativePaths', file.relativePath);
                }
            }

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            uploadedCount += batch.length;
            updateProgressNotification(progressNotification, uploadedCount, files.length);
        }

        completeProgressNotification(progressNotification, files.length);
        
        // Reload current directory and tree
        await Promise.all([
            loadFiles(currentPath),
            loadFileTree()
        ]);
    } catch (error) {
        console.error('Upload error:', error);
        errorProgressNotification(progressNotification, error.message);
    }
}

async function uploadFiles(files) {
    // Keep old function for backward compatibility
    return uploadFilesWithProgress(files);
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
    
    // Dispose video player when closing media modal
    if (modalId === 'mediaModal' && currentVideoPlayer) {
        currentVideoPlayer.dispose();
        currentVideoPlayer = null;
    }
}

// Setup click outside modal to close
function setupModalClickOutside() {
    // Media modal
    const mediaModal = document.getElementById('mediaModal');
    mediaModal.addEventListener('click', (e) => {
        // Close if clicking directly on the modal backdrop (not the content)
        if (e.target === mediaModal) {
            closeModal('mediaModal');
        }
    });
    
    // Rename modal
    const renameModal = document.getElementById('renameModal');
    renameModal.addEventListener('click', (e) => {
        if (e.target === renameModal) {
            closeModal('renameModal');
        }
    });
    
    // Create folder modal
    const createFolderModal = document.getElementById('createFolderModal');
    createFolderModal.addEventListener('click', (e) => {
        if (e.target === createFolderModal) {
            closeModal('createFolderModal');
        }
    });
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
            <div class="tree-item ${currentPath === '' ? 'active' : ''}" data-path="" data-action="navigate">
                <span class="tree-item-icon">🏠</span>
                <span class="tree-item-name">Home</span>
            </div>
        `;
        
        items.forEach(item => {
            html += renderTreeItem(item);
        });
        
        container.innerHTML = html;
        
        // Add event delegation for tree items
        container.addEventListener('click', (e) => {
            const treeItem = e.target.closest('[data-action="navigate"]');
            const toggleItem = e.target.closest('[data-action="toggle"]');
            
            if (toggleItem) {
                e.stopPropagation();
                const path = toggleItem.getAttribute('data-path');
                toggleFolder(path);
            } else if (treeItem) {
                const path = treeItem.getAttribute('data-path');
                navigateToPath(path);
            }
        });
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
    
    // Escape path for use in data attribute
    const escapedPath = escapeHtml(item.path);
    const escapedName = escapeHtml(item.name);
    
    let html = `
        <div>
            <div class="tree-item ${isActive ? 'active' : ''}" data-path="${escapedPath}" data-action="navigate">
                <span class="tree-toggle" data-path="${escapedPath}" data-action="toggle">${toggle}</span>
                <span class="tree-item-icon">📁</span>
                <span class="tree-item-name">${escapedName}</span>
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

// Progress notification functions
function showProgressNotification(totalFiles) {
    const notification = document.createElement('div');
    notification.className = 'progress-notification';
    notification.innerHTML = `
        <div class="progress-content">
            <div class="progress-icon">📤</div>
            <div class="progress-info">
                <div class="progress-text">Uploading files...</div>
                <div class="progress-count">0 / ${totalFiles}</div>
            </div>
        </div>
        <div class="progress-bar">
            <div class="progress-fill" style="width: 0%"></div>
        </div>
    `;
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 10);
    
    return notification;
}

function updateProgressNotification(notification, uploaded, total) {
    const percentage = Math.round((uploaded / total) * 100);
    const countElement = notification.querySelector('.progress-count');
    const fillElement = notification.querySelector('.progress-fill');
    
    if (countElement) countElement.textContent = `${uploaded} / ${total}`;
    if (fillElement) fillElement.style.width = `${percentage}%`;
}

function completeProgressNotification(notification, total) {
    const textElement = notification.querySelector('.progress-text');
    const iconElement = notification.querySelector('.progress-icon');
    
    if (textElement) textElement.textContent = 'Upload complete!';
    if (iconElement) iconElement.textContent = '✓';
    
    notification.classList.add('complete');
    
    // Remove after 2 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

function errorProgressNotification(notification, errorMessage) {
    const textElement = notification.querySelector('.progress-text');
    const iconElement = notification.querySelector('.progress-icon');
    
    if (textElement) textElement.textContent = 'Upload failed!';
    if (iconElement) iconElement.textContent = '✗';
    
    notification.classList.add('error');
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 3000);
    
    showToast('Upload failed: ' + errorMessage, 'error');
}
