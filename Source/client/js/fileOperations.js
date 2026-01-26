// File operations using Node.js
// This module handles file system operations for the Data Base extension

var fs = require('fs');
var path = require('path');

// Platform detection
var IS_WINDOWS = process.platform === 'win32';
var IS_MAC = process.platform === 'darwin';

// Supported file extensions by type
var FILE_TYPES = {
    video: ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.mpeg', '.mpg', '.3gp', '.mxf', '.r3d', '.braw', '.prores'],
    audio: ['.mp3', '.wav', '.aiff', '.aif', '.m4a', '.aac', '.ogg', '.flac', '.wma', '.opus'],
    image: ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.tif', '.psd', '.ai', '.eps', '.bmp', '.webp', '.svg', '.raw', '.cr2', '.nef', '.arw']
};

// Normalize path for current platform
function normalizePathForPlatform(filePath) {
    if (!filePath) return '';
    return path.normalize(filePath);
}

// Convert path to use forward slashes (for cross-platform consistency)
function toForwardSlashes(filePath) {
    if (!filePath) return '';
    return filePath.replace(/\\/g, '/');
}

// Get file extension (lowercase)
function getExtension(filePath) {
    return path.extname(filePath).toLowerCase();
}

// Determine file type based on extension
function getFileType(filePath) {
    const ext = getExtension(filePath);

    if (FILE_TYPES.video.includes(ext)) return 'video';
    if (FILE_TYPES.audio.includes(ext)) return 'audio';
    if (FILE_TYPES.image.includes(ext)) return 'image';
    return 'other';
}

// Check if file exists
function fileExists(filePath) {
    try {
        return fs.existsSync(filePath);
    } catch (e) {
        return false;
    }
}

// Check if path is a directory
function isDirectory(filePath) {
    try {
        return fs.statSync(filePath).isDirectory();
    } catch (e) {
        return false;
    }
}

// Create directory recursively
function createDirectory(dirPath) {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        return { success: true };
    } catch (e) {
        console.error('Error creating directory:', e);
        return { success: false, error: e.message };
    }
}

// Delete file or folder
function deletePath(targetPath) {
    try {
        const stats = fs.statSync(targetPath);
        if (stats.isDirectory()) {
            fs.rmSync(targetPath, { recursive: true, force: true });
        } else {
            fs.unlinkSync(targetPath);
        }
        return { success: true };
    } catch (e) {
        console.error('Error deleting path:', e);
        return { success: false, error: e.message };
    }
}

// Move/rename file or folder
function movePath(sourcePath, destPath) {
    try {
        // Create destination directory if needed
        const destDir = path.dirname(destPath);
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }
        fs.renameSync(sourcePath, destPath);
        return { success: true };
    } catch (e) {
        console.error('Error moving path:', e);
        return { success: false, error: e.message };
    }
}

// Copy file
function copyFile(source, destination) {
    return new Promise((resolve, reject) => {
        try {
            const normalizedSource = normalizePathForPlatform(source);
            const normalizedDest = normalizePathForPlatform(destination);

            // Check if source exists
            if (!fileExists(normalizedSource)) {
                reject(new Error('Source file does not exist: ' + normalizedSource));
                return;
            }

            // Check if destination already exists
            if (fileExists(normalizedDest)) {
                resolve({ skipped: true, reason: 'File already exists' });
                return;
            }

            // Create destination directory
            const destDir = path.dirname(normalizedDest);
            const dirResult = createDirectory(destDir);
            if (!dirResult.success) {
                reject(new Error('Failed to create destination directory'));
                return;
            }

            // Copy file synchronously
            fs.copyFileSync(normalizedSource, normalizedDest);
            resolve({ success: true });

        } catch (e) {
            reject(e);
        }
    });
}

// Copy multiple files with progress callback
async function copyFiles(fileList, progressCallback) {
    const results = [];
    const total = fileList.length;

    for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];

        try {
            const result = await copyFile(file.source, file.destination);

            results.push({
                name: file.name,
                success: true,
                skipped: result.skipped || false,
                reason: result.reason || null
            });

        } catch (e) {
            results.push({
                name: file.name,
                success: false,
                error: e.message
            });
        }

        // Call progress callback
        if (progressCallback) {
            progressCallback({
                current: i + 1,
                total: total,
                percent: Math.round(((i + 1) / total) * 100)
            });
        }
    }

    return results;
}

// Scan database folder recursively
function scanDatabase(rootPath, options = {}) {
    const {
        bannedExtensions = [],
        excludedFolderNames = ['.git', 'node_modules', '__MACOSX', '.DS_Store'],
        currentPath = ''
    } = options;

    const results = {
        files: [],
        folders: []
    };

    try {
        const fullPath = currentPath ? path.join(rootPath, currentPath) : rootPath;

        if (!fs.existsSync(fullPath)) {
            return results;
        }

        const items = fs.readdirSync(fullPath);

        for (const item of items) {
            // Skip hidden files and excluded folder names
            if (item.startsWith('.') || excludedFolderNames.includes(item)) {
                continue;
            }

            const itemPath = path.join(fullPath, item);
            const relativePath = currentPath ? path.join(currentPath, item) : item;

            try {
                const stats = fs.statSync(itemPath);

                if (stats.isDirectory()) {
                    results.folders.push({
                        name: item,
                        path: toForwardSlashes(itemPath),
                        relativePath: toForwardSlashes(relativePath)
                    });

                    // Recursively scan subdirectory
                    const subResults = scanDatabase(rootPath, {
                        ...options,
                        currentPath: relativePath
                    });
                    results.files.push(...subResults.files);
                    results.folders.push(...subResults.folders);

                } else if (stats.isFile()) {
                    const ext = getExtension(item);

                    // Skip banned extensions
                    if (bannedExtensions.includes(ext)) {
                        continue;
                    }

                    const fileType = getFileType(item);

                    // Only include media files
                    if (fileType !== 'other') {
                        results.files.push({
                            name: item,
                            path: toForwardSlashes(itemPath),
                            relativePath: toForwardSlashes(relativePath),
                            folderPath: toForwardSlashes(currentPath),
                            type: fileType,
                            size: stats.size,
                            modified: stats.mtime.getTime()
                        });
                    }
                }
            } catch (itemError) {
                // Skip items that cause errors (permissions, etc.)
                console.warn('Error accessing item:', itemPath, itemError.message);
            }
        }
    } catch (e) {
        console.error('Error scanning database:', e);
    }

    return results;
}

// Get file size formatted
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Get file info
function getFileInfo(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return {
            exists: true,
            size: stats.size,
            formattedSize: formatFileSize(stats.size),
            modified: stats.mtime,
            isDirectory: stats.isDirectory()
        };
    } catch (e) {
        return { exists: false };
    }
}

// Open folder in system file explorer
function openInExplorer(folderPath) {
    const { exec } = require('child_process');

    const normalizedPath = path.normalize(folderPath); // Handles / vs \ for OS

    if (IS_MAC) {
        exec(`open "${normalizedPath}"`);
    } else if (IS_WINDOWS) {
        // Enforce double quotes and backslashes for Windows
        exec(`explorer "${normalizedPath}"`);
    }
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        IS_WINDOWS,
        IS_MAC,
        FILE_TYPES,
        normalizePathForPlatform,
        toForwardSlashes,
        getExtension,
        getFileType,
        fileExists,
        isDirectory,
        createDirectory,
        deletePath,
        movePath,
        copyFile,
        copyFiles,
        scanDatabase,
        formatFileSize,
        getFileInfo,
        openInExplorer
    };
}
