// Main JavaScript for Data Base Extension
// Premiere Pro Media Database Browser

const csInterface = new CSInterface();

// ============================================================================
// TRANSLATIONS (embedded to avoid async loading issues)
// ============================================================================
const translations = {
    en: {
        labels: {
            database: "Database:",
            notConfigured: "Not configured",
            files: "files",
            selected: "selected"
        },
        search: {
            placeholder: "Search files..."
        },
        filters: {
            all: "All",
            video: "Video",
            audio: "Audio",
            image: "Image"
        },
        buttons: {
            import: "Import",
            save: "Save",
            cancel: "Cancel",
            create: "Create"
        },
        settings: {
            title: "Settings",
            databasePath: "Database Path",
            databasePathPlaceholder: "Select database folder...",
            language: "Language",
            consolidateOnImport: "Copy files to project folder on import",
            consolidateDescription: "When enabled, files will be copied to the project folder before importing, preserving the folder structure.",
            bannedExtensions: "Excluded file extensions",
            bannedExtensionsPlaceholder: "e.g.: .txt, .pdf, .zip (one per line)",
            excludedFolders: "Excluded folder names",
            excludedFoldersPlaceholder: "e.g.: node_modules, .git (one per line)"
        },
        empty: {
            configureDatabase: "Configure your database path in settings",
            noFilesFound: "No files found",
            noFavorites: "No favorites yet"
        },
        modal: {
            newFolder: "New Folder",
            folderNamePlaceholder: "Folder name",
            deleteConfirm: "Are you sure you want to delete this?"
        },
        context: {
            addFavorite: "Add to favorites",
            removeFavorite: "Remove from favorites",
            openFolder: "Open in Finder",
            delete: "Delete"
        },
        status: {
            loading: "Loading...",
            scanning: "Scanning database...",
            importing: "Importing files...",
            importSuccess: "files imported successfully",
            importError: "Import failed",
            saved: "Settings saved",
            folderCreated: "Folder created",
            folderDeleted: "Folder deleted",
            copied: "Copied to clipboard"
        }
    },
    fr: {
        labels: {
            database: "Base de données :",
            notConfigured: "Non configuré",
            files: "fichiers",
            selected: "sélectionné(s)"
        },
        search: {
            placeholder: "Rechercher des fichiers..."
        },
        filters: {
            all: "Tous",
            video: "Vidéo",
            audio: "Audio",
            image: "Image"
        },
        buttons: {
            import: "Importer",
            save: "Enregistrer",
            cancel: "Annuler",
            create: "Créer"
        },
        settings: {
            title: "Paramètres",
            databasePath: "Chemin de la base de données",
            databasePathPlaceholder: "Sélectionner le dossier...",
            language: "Langue",
            consolidateOnImport: "Copier les fichiers dans le dossier projet lors de l'import",
            consolidateDescription: "Lorsque cette option est activée, les fichiers seront copiés dans le dossier du projet avant l'import, en préservant la structure des dossiers.",
            bannedExtensions: "Extensions de fichiers exclues",
            bannedExtensionsPlaceholder: "ex: .txt, .pdf, .zip (une par ligne)",
            excludedFolders: "Noms de dossiers exclus",
            excludedFoldersPlaceholder: "ex: node_modules, .git (une par ligne)"
        },
        empty: {
            configureDatabase: "Configurez le chemin de la base de données dans les paramètres",
            noFilesFound: "Aucun fichier trouvé",
            noFavorites: "Aucun favori"
        },
        modal: {
            newFolder: "Nouveau dossier",
            folderNamePlaceholder: "Nom du dossier",
            deleteConfirm: "Êtes-vous sûr de vouloir supprimer ceci ?"
        },
        context: {
            addFavorite: "Ajouter aux favoris",
            removeFavorite: "Retirer des favoris",
            openFolder: "Ouvrir dans le Finder",
            delete: "Supprimer"
        },
        status: {
            loading: "Chargement...",
            scanning: "Analyse de la base de données...",
            importing: "Import des fichiers...",
            importSuccess: "fichiers importés avec succès",
            importError: "Échec de l'import",
            saved: "Paramètres enregistrés",
            folderCreated: "Dossier créé",
            folderDeleted: "Dossier supprimé",
            copied: "Copié dans le presse-papiers"
        }
    }
};

// ============================================================================
// STATE
// ============================================================================
let currentLang = 'en';
let settings = {
    databasePath: '',
    language: 'en',
    consolidateOnImport: false,
    consolidationDepth: 0,  // 0 = next to project file, 1 = one folder up, etc.
    bannedExtensions: ['.txt', '.pdf', '.zip', '.rar', '.exe', '.doc', '.docx', '.prproj'],
    excludedFolderNames: ['.git', 'node_modules', '__MACOSX', 'Adobe Premiere Pro Auto-Save']
};

let allFiles = [];           // All files from database
let allFolders = [];         // All folders from database
let filteredFiles = [];      // Files after applying filters
let selectedFiles = new Set(); // Selected file paths
let favorites = new Set();   // Favorite file paths
let currentPath = '';        // Current folder path being viewed
let currentViewMode = 'list'; // 'list' or 'grid'
let activeTypeFilters = ['all']; // Active type filters
let showFavoritesOnly = false;
let searchQuery = '';
let searchDebounceTimer = null;
let expandedFolders = new Set(); // Folders that are expanded in list view

// ============================================================================
// TRANSLATION FUNCTIONS
// ============================================================================
function t(key) {
    const keys = key.split('.');
    let value = translations[currentLang];

    for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
            value = value[k];
        } else {
            // Fallback to English
            value = translations['en'];
            for (const k2 of keys) {
                if (value && typeof value === 'object' && k2 in value) {
                    value = value[k2];
                } else {
                    return key;
                }
            }
            break;
        }
    }

    return value;
}

function updateUILanguage() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const text = t(key);
        if (el.tagName === 'INPUT' && el.type === 'button') {
            el.value = text;
        } else {
            el.textContent = text;
        }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        el.placeholder = t(key);
    });
}

function changeLanguage(lang) {
    if (translations[lang]) {
        currentLang = lang;
        settings.language = lang;
        updateUILanguage();
        saveSettings();
    }
}

function addToDatabase() {
    // Verify database path is set
    if (!settings.databasePath) {
        showStatus(t('empty.configureDatabase'), 'error');
        return;
    }

    showProgress(t('status.scanning')); // "Scanning..." or generic loading

    // Get selected items from Premiere
    csInterface.evalScript('getSelectedProjectItems()', async (result) => {
        try {
            const items = JSON.parse(result);

            if (!items || items.length === 0) {
                hideProgress();
                showStatus(t('empty.noFilesFound'), 'info'); // Or specific message "No selection"
                return;
            }

            showProgress(t('status.importing')); // Reuse importing message or add "Copying..."

            const filesToCopy = items.map(item => ({
                name: item.name,
                source: item.path,
                destination: settings.databasePath + '/' + (item.binPath ? item.binPath + '/' : '') + item.name
            }));

            // Execute copy
            await copyFiles(filesToCopy, (progress) => {
                updateProgress(progress.percent, `Copying ${progress.current}/${progress.total}...`);
            });

            hideProgress();
            showStatus(`${items.length} files added to database`, 'success');

            // Refresh database view
            scanDatabaseFiles();

        } catch (e) {
            hideProgress();
            showStatus('Error adding to database: ' + e.message, 'error');
            console.error(e);
        }
    });
}

// ============================================================================
// SETTINGS
// ============================================================================
function loadSettings() {
    const saved = localStorage.getItem('databaseSettings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            settings = { ...settings, ...parsed };
            currentLang = settings.language || 'en';
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }

    // Load favorites
    const savedFavorites = localStorage.getItem('databaseFavorites');
    if (savedFavorites) {
        try {
            favorites = new Set(JSON.parse(savedFavorites));
        } catch (e) {
            console.error('Error loading favorites:', e);
        }
    }

    // Update UI with settings
    document.getElementById('databasePathInput').value = settings.databasePath || '';
    document.getElementById('consolidateOnImport').checked = settings.consolidateOnImport || false;
    document.getElementById('consolidationDepth').value = settings.consolidationDepth || 0;
    document.getElementById('bannedExtensions').value = (settings.bannedExtensions || []).join('\n');
    document.getElementById('excludedFolders').value = (settings.excludedFolderNames || []).join('\n');

    // Language selectors
    document.getElementById('languageSelect').value = currentLang;
    document.getElementById('settingsLanguageSelect').value = currentLang;

    // Update database path display
    updateDatabasePathDisplay();

    // Update language
    updateUILanguage();
}

function saveSettings() {
    settings.databasePath = document.getElementById('databasePathInput').value.trim();
    settings.consolidateOnImport = document.getElementById('consolidateOnImport').checked;
    settings.consolidationDepth = parseInt(document.getElementById('consolidationDepth').value) || 0;

    const bannedText = document.getElementById('bannedExtensions').value;
    settings.bannedExtensions = bannedText
        .split('\n')
        .map(ext => ext.trim())
        .filter(ext => ext !== '')
        .map(ext => ext.startsWith('.') ? ext : '.' + ext);

    const excludedText = document.getElementById('excludedFolders').value;
    settings.excludedFolderNames = excludedText
        .split('\n')
        .map(f => f.trim())
        .filter(f => f !== '');

    settings.language = currentLang;

    localStorage.setItem('databaseSettings', JSON.stringify(settings));

    updateDatabasePathDisplay();
    showStatus(t('status.saved'), 'success');
}

function saveFavorites() {
    localStorage.setItem('databaseFavorites', JSON.stringify([...favorites]));
}

function updateDatabasePathDisplay() {
    const pathEl = document.getElementById('databasePath');
    if (settings.databasePath) {
        // Show only the last part of the path
        const parts = settings.databasePath.split(/[\/\\]/);
        pathEl.textContent = '.../' + parts.slice(-2).join('/');
        pathEl.title = settings.databasePath;
    } else {
        pathEl.textContent = t('labels.notConfigured');
        pathEl.title = '';
    }
}

// ============================================================================
// UI FUNCTIONS
// ============================================================================
function showStatus(message, type = 'success') {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = 'status-message visible ' + type;

    setTimeout(() => {
        statusEl.classList.remove('visible');
    }, 4000);
}

function showProgress(message = '') {
    const progressSection = document.getElementById('progressSection');
    progressSection.classList.add('visible');
    if (message) {
        document.getElementById('progressText').textContent = message;
    }
}

function hideProgress() {
    document.getElementById('progressSection').classList.remove('visible');
}

function updateProgress(percent, message = '') {
    document.getElementById('progressBar').style.width = percent + '%';
    if (message) {
        document.getElementById('progressText').textContent = message;
    }
}

function openSettings() {
    document.getElementById('settingsPanel').classList.add('visible');
    document.getElementById('settingsOverlay').classList.add('visible');
}

function closeSettings() {
    document.getElementById('settingsPanel').classList.remove('visible');
    document.getElementById('settingsOverlay').classList.remove('visible');
}

function openNewFolderModal() {
    document.getElementById('newFolderModal').classList.add('visible');
    document.getElementById('newFolderName').value = '';
    document.getElementById('newFolderName').focus();
}

function closeNewFolderModal() {
    document.getElementById('newFolderModal').classList.remove('visible');
}

// ============================================================================
// DATABASE SCANNING
// ============================================================================
function scanDatabaseFiles() {
    if (!settings.databasePath) {
        showStatus(t('empty.configureDatabase'), 'warning');
        openSettings();
        return;
    }

    showProgress(t('status.scanning'));
    updateProgress(0);

    try {
        const result = performDatabaseScan(settings.databasePath, {
            bannedExtensions: settings.bannedExtensions,
            excludedFolderNames: settings.excludedFolderNames
        });

        allFiles = result.files || [];
        allFolders = result.folders || [];

        hideProgress();
        applyFilters();
        renderBreadcrumb();

        console.log(`Scanned: ${allFiles.length} files, ${allFolders.length} folders`);

    } catch (e) {
        hideProgress();
        console.error('Scan error:', e);
        showStatus('Error scanning database: ' + e.message, 'error');
    }
}

// Node.js file scanning - uses the scanDatabase function from fileOperations.js
function performDatabaseScan(rootPath, options) {
    // The scanDatabase function is defined in fileOperations.js
    // and is available in the global scope when loaded
    if (typeof scanDatabase === 'function') {
        return scanDatabase(rootPath, options);
    }

    // Fallback: direct implementation if module not loaded properly
    return scanDatabaseDirect(rootPath, options);
}

// Direct scanning implementation using Node.js fs
function scanDatabaseDirect(rootPath, options = {}) {
    const fs = require('fs');
    const path = require('path');

    const {
        bannedExtensions = [],
        excludedFolderNames = ['.git', 'node_modules', '__MACOSX', '.DS_Store']
    } = options;

    const FILE_TYPES = {
        video: ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.mpeg', '.mpg', '.3gp', '.mxf', '.r3d', '.braw', '.prores'],
        audio: ['.mp3', '.wav', '.aiff', '.aif', '.m4a', '.aac', '.ogg', '.flac', '.wma', '.opus'],
        image: ['.jpg', '.jpeg', '.png', '.gif', '.tiff', '.tif', '.psd', '.ai', '.eps', '.bmp', '.webp', '.svg', '.raw', '.cr2', '.nef', '.arw']
    };

    function getFileType(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        if (FILE_TYPES.video.includes(ext)) return 'video';
        if (FILE_TYPES.audio.includes(ext)) return 'audio';
        if (FILE_TYPES.image.includes(ext)) return 'image';
        return 'other';
    }

    function toForwardSlashes(p) {
        return p ? p.replace(/\\/g, '/') : '';
    }

    const results = { files: [], folders: [] };

    function scan(currentPath, relativePath) {
        try {
            const fullPath = currentPath;
            if (!fs.existsSync(fullPath)) return;

            const items = fs.readdirSync(fullPath);

            for (const item of items) {
                if (item.startsWith('.') || excludedFolderNames.includes(item)) continue;

                const itemPath = path.join(fullPath, item);
                const itemRelative = relativePath ? path.join(relativePath, item) : item;

                try {
                    const stats = fs.statSync(itemPath);

                    if (stats.isDirectory()) {
                        results.folders.push({
                            name: item,
                            path: toForwardSlashes(itemPath),
                            relativePath: toForwardSlashes(itemRelative)
                        });
                        scan(itemPath, itemRelative);
                    } else if (stats.isFile()) {
                        const ext = path.extname(item).toLowerCase();
                        if (bannedExtensions.includes(ext)) continue;

                        const fileType = getFileType(item);
                        if (fileType !== 'other') {
                            results.files.push({
                                name: item,
                                path: toForwardSlashes(itemPath),
                                relativePath: toForwardSlashes(itemRelative),
                                folderPath: toForwardSlashes(relativePath || ''),
                                type: fileType,
                                size: stats.size,
                                modified: stats.mtime.getTime()
                            });
                        }
                    }
                } catch (itemError) {
                    console.warn('Error accessing:', itemPath);
                }
            }
        } catch (e) {
            console.error('Scan error at:', currentPath, e);
        }
    }

    scan(rootPath, '');
    return results;
}

// ============================================================================
// FILTERING
// ============================================================================
function applyFilters() {
    let result = [...allFiles];

    // Filter by current path
    if (currentPath) {
        result = result.filter(file => {
            return file.folderPath === currentPath ||
                file.folderPath.startsWith(currentPath + '/');
        });
    }

    // Filter by search query
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        result = result.filter(file =>
            file.name.toLowerCase().includes(query) ||
            file.folderPath.toLowerCase().includes(query)
        );
    }

    // Filter by type
    if (!activeTypeFilters.includes('all')) {
        result = result.filter(file => activeTypeFilters.includes(file.type));
    }

    // Filter by favorites
    if (showFavoritesOnly) {
        result = result.filter(file => favorites.has(file.path));
    }

    filteredFiles = result;

    // Update file count
    document.getElementById('fileCount').textContent = filteredFiles.length;

    // Render files
    renderFiles();
}

function setTypeFilter(type) {
    if (type === 'all') {
        activeTypeFilters = ['all'];
    } else {
        // Toggle the type
        if (activeTypeFilters.includes('all')) {
            activeTypeFilters = [type];
        } else if (activeTypeFilters.includes(type)) {
            activeTypeFilters = activeTypeFilters.filter(t => t !== type);
            if (activeTypeFilters.length === 0) {
                activeTypeFilters = ['all'];
            }
        } else {
            activeTypeFilters.push(type);
        }
    }

    // Update button states
    document.querySelectorAll('.type-filter-btn').forEach(btn => {
        const btnType = btn.getAttribute('data-type');
        btn.classList.toggle('active', activeTypeFilters.includes(btnType));
    });

    applyFilters();
}

function toggleFavorites() {
    showFavoritesOnly = !showFavoritesOnly;
    document.getElementById('favoritesBtn').classList.toggle('active', showFavoritesOnly);
    applyFilters();
}

function onSearch(query) {
    searchQuery = query;

    // Debounce search
    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
    }

    searchDebounceTimer = setTimeout(() => {
        applyFilters();
    }, 300);
}

function clearSearch() {
    document.getElementById('searchInput').value = '';
    searchQuery = '';
    applyFilters();
}

// ============================================================================
// RENDERING
// ============================================================================
function renderFiles() {
    const browser = document.getElementById('fileBrowser');

    // Get folders in current path (direct children only for navigation)
    const currentFolders = allFolders.filter(folder => {
        if (!currentPath) {
            // Root level: show folders without path separator in relativePath
            return !folder.relativePath.includes('/');
        }
        // Show direct children of current path
        const parentPath = folder.relativePath.substring(0, folder.relativePath.lastIndexOf('/'));
        return parentPath === currentPath;
    });

    // When searching, show all matching files from all subfolders
    // When not searching, show only files in current folder OR expanded folders
    let filesToShow;
    if (searchQuery) {
        // Show all filtered files when searching
        filesToShow = filteredFiles;
    } else {
        // Show files in current folder + files in expanded folders
        filesToShow = filteredFiles.filter(file => {
            // In current folder
            if (file.folderPath === currentPath) return true;

            // In an expanded folder
            for (const expandedPath of expandedFolders) {
                if (file.folderPath === expandedPath) return true;
            }
            return false;
        });
    }

    if (filesToShow.length === 0 && currentFolders.length === 0) {
        // Show empty state
        let emptyMessage = t('empty.noFilesFound');
        if (!settings.databasePath) {
            emptyMessage = t('empty.configureDatabase');
        } else if (showFavoritesOnly) {
            emptyMessage = t('empty.noFavorites');
        } else if (searchQuery) {
            emptyMessage = t('empty.noFilesFound');
        }

        browser.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <p>${emptyMessage}</p>
            </div>
        `;
        return;
    }

    // Build file list HTML
    let html = '<div class="file-list">';

    if (searchQuery) {
        // When searching, show flat list of all results with folder path
        for (const file of filesToShow) {
            html += renderFileItem(file, true); // true = show full path
        }
    } else {
        // Normal navigation: show folders then files
        for (const folder of currentFolders) {
            html += renderFolderItem(folder);

            // If folder is expanded, show its contents
            if (expandedFolders.has(folder.relativePath)) {
                html += renderExpandedFolderContents(folder.relativePath);
            }
        }

        // Render files in current folder
        const currentFiles = filesToShow.filter(file => file.folderPath === currentPath);
        for (const file of currentFiles) {
            html += renderFileItem(file, false);
        }
    }

    html += '</div>';
    browser.innerHTML = html;

    // Attach event listeners
    attachFileEventListeners();
}

// Render contents of an expanded folder (recursive)
function renderExpandedFolderContents(folderPath) {
    let html = '';
    const depth = folderPath.split('/').length - (currentPath ? currentPath.split('/').length : 0);
    const indent = depth * 20; // 20px per level

    // Get subfolders of this folder
    const subFolders = allFolders.filter(f => {
        const parentPath = f.relativePath.substring(0, f.relativePath.lastIndexOf('/'));
        return parentPath === folderPath;
    });

    // Render subfolders
    for (const subfolder of subFolders) {
        html += renderFolderItem(subfolder, indent);
        if (expandedFolders.has(subfolder.relativePath)) {
            html += renderExpandedFolderContents(subfolder.relativePath);
        }
    }

    // Render files in this folder
    const files = filteredFiles.filter(f => f.folderPath === folderPath);
    for (const file of files) {
        html += renderFileItem(file, false, indent);
    }

    return html;
}

function renderFolderItem(folder, indent = 0) {
    const isExpanded = expandedFolders.has(folder.relativePath);
    const expandIcon = isExpanded ? '▼' : '▶';
    const indentStyle = indent > 0 ? `style="margin-left: ${indent}px"` : '';

    return `
        <div class="file-item folder" data-path="${escapeHtml(folder.relativePath)}" data-type="folder" ${indentStyle}>
            <span class="folder-expand" data-folder="${escapeHtml(folder.relativePath)}">${expandIcon}</span>
            <div class="file-icon">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="rgba(0,120,212,0.2)" />
                </svg>
            </div>
            <div class="file-info">
                <div class="file-name">${escapeHtml(folder.name)}</div>
            </div>
        </div>
    `;
}

function renderFileItem(file, showFullPath = false, indent = 0) {
    const isFavorite = favorites.has(file.path);
    const isSelected = selectedFiles.has(file.path);
    const iconHtml = getFileIcon(file.type, file.path);

    // Get folder display
    let folderDisplay = file.folderPath || 'Root';
    if (showFullPath) {
        // Show full path when searching
        folderDisplay = file.folderPath || 'Root';
    }

    const indentStyle = indent > 0 ? `style="margin-left: ${indent}px"` : '';

    return `
        <div class="file-item ${isSelected ? 'selected' : ''}" data-path="${escapeHtml(file.path)}" data-type="file" ${indentStyle}>
            <input type="checkbox" class="file-checkbox" ${isSelected ? 'checked' : ''}>
            <div class="file-icon ${file.type}">
                ${iconHtml}
            </div>
            <div class="file-info">
                <div class="file-name">${escapeHtml(file.name)}</div>
                <div class="file-path">📁 ${escapeHtml(folderDisplay)}</div>
            </div>
            <button class="file-favorite ${isFavorite ? 'active' : ''}" data-path="${escapeHtml(file.path)}">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
            </button>
        </div>
    `;
}

function getFileIcon(type, filePath = null) {
    if (filePath) {
        if (type === 'image') {
            // Use the actual image as thumbnail if available
            const safePath = filePath.replace(/'/g, "\\'");
            return `<div class="thumbnail-image" style="background-image: url('${safePath}')"></div>`;
        } else if (type === 'video') {
            // Try to show video thumbnail/preview for supported browser formats
            // Common web-supported formats: mp4, webm, mov (h.264)
            const ext = filePath.split('.').pop().toLowerCase();
            const supportedVideoExts = ['mp4', 'webm', 'mov', 'm4v'];

            if (supportedVideoExts.includes(ext)) {
                // Use video tag with preload metadata to show first frame
                // Muted is required for autoplay (though we don't autoplay)
                return `<video class="thumbnail-video" src="${filePath}" preload="metadata" muted onmouseover="this.play()" onmouseout="this.pause();this.currentTime=0;"></video>`;
            }
        }
    }

    switch (type) {
        case 'video':
            return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="4" width="20" height="16" rx="2" stroke="currentColor" stroke-width="2" />
                <polygon points="10 9 16 12 10 15" fill="currentColor" />
            </svg>`;
        case 'audio':
            return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18V5l12-2v13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                <circle cx="6" cy="18" r="3" stroke="currentColor" stroke-width="2" />
                <circle cx="18" cy="16" r="3" stroke="currentColor" stroke-width="2" />
            </svg>`;
        case 'image':
            // Fallback icon if no path provided
            return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2" />
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                <path d="M21 15l-5-5L5 21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>`;
        default:
            return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" />
                <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" />
            </svg>`;
    }
}

function attachFileEventListeners() {
    // Folder expand/collapse icons
    document.querySelectorAll('.folder-expand').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const folderPath = el.getAttribute('data-folder');
            toggleFolderExpand(folderPath);
        });
    });

    // Folder clicks - single click to expand, double click to navigate
    document.querySelectorAll('.file-item.folder').forEach(el => {
        // Single click - toggle expand
        el.addEventListener('click', (e) => {
            // Ignore if clicking on expand icon (handled above)
            if (e.target.closest('.folder-expand')) return;

            const path = el.getAttribute('data-path');
            toggleFolderExpand(path);
        });

        // Double click - navigate into folder
        el.addEventListener('dblclick', () => {
            const path = el.getAttribute('data-path');
            navigateToFolder(path);
        });
    });

    // File clicks (selection)
    document.querySelectorAll('.file-item[data-type="file"]').forEach(el => {
        el.addEventListener('click', (e) => {
            // Ignore if clicking on checkbox or favorite button
            if (e.target.closest('.file-checkbox') || e.target.closest('.file-favorite')) {
                return;
            }
            const path = el.getAttribute('data-path');
            toggleFileSelection(path);
        });
    });

    // Checkbox changes
    document.querySelectorAll('.file-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            e.stopPropagation();
            const path = checkbox.closest('.file-item').getAttribute('data-path');
            if (checkbox.checked) {
                selectedFiles.add(path);
            } else {
                selectedFiles.delete(path);
            }
            updateSelectionUI();
        });
    });

    // Favorite buttons
    document.querySelectorAll('.file-favorite').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const path = btn.getAttribute('data-path');
            toggleFavorite(path);
        });
    });

    // Context menu
    document.querySelectorAll('.file-item[data-type="file"]').forEach(el => {
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e, el.getAttribute('data-path'));
        });
    });
}

function toggleFileSelection(path) {
    if (selectedFiles.has(path)) {
        selectedFiles.delete(path);
    } else {
        selectedFiles.add(path);
    }
    updateSelectionUI();
    renderFiles();
}

function updateSelectionUI() {
    document.getElementById('selectedCount').textContent = selectedFiles.size;
    document.getElementById('importBtn').disabled = selectedFiles.size === 0;
}

function selectAll() {
    filteredFiles.forEach(file => selectedFiles.add(file.path));
    updateSelectionUI();
    renderFiles();
}

function deselectAll() {
    selectedFiles.clear();
    updateSelectionUI();
    renderFiles();
}

function toggleFavorite(path) {
    if (favorites.has(path)) {
        favorites.delete(path);
    } else {
        favorites.add(path);
    }
    saveFavorites();
    renderFiles();
}

// ============================================================================
// NAVIGATION
// ============================================================================
function navigateToFolder(path) {
    currentPath = path;
    selectedFiles.clear();
    expandedFolders.clear(); // Clear expanded state when navigating
    updateSelectionUI();
    applyFilters();
    renderBreadcrumb();
}

function navigateBack() {
    if (!currentPath) return; // Already at root

    const lastSlash = currentPath.lastIndexOf('/');
    if (lastSlash > 0) {
        currentPath = currentPath.substring(0, lastSlash);
    } else {
        currentPath = '';
    }

    selectedFiles.clear();
    updateSelectionUI();
    applyFilters();
    renderBreadcrumb();
}

function toggleFolderExpand(folderPath) {
    if (expandedFolders.has(folderPath)) {
        expandedFolders.delete(folderPath);
    } else {
        expandedFolders.add(folderPath);
    }
    renderFiles();
}

function renderBreadcrumb() {
    // The home button is now in toolbar-center, attach click handler by ID
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
        homeBtn.onclick = () => navigateToFolder('');
    }

    // Back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.onclick = () => navigateBack();
        backBtn.disabled = !currentPath;
        backBtn.classList.toggle('disabled', !currentPath);
    }
}

// ============================================================================
// VIEW MODE
// ============================================================================
function setViewMode(mode) {
    currentViewMode = mode;
    const browser = document.getElementById('fileBrowser');

    if (mode === 'grid') {
        browser.classList.add('grid-view');
    } else {
        browser.classList.remove('grid-view');
    }

    document.getElementById('listViewBtn').classList.toggle('active', mode === 'list');
    document.getElementById('gridViewBtn').classList.toggle('active', mode === 'grid');

    renderFiles();
}

// ============================================================================
// FOLDER MANAGEMENT
// ============================================================================
function createFolder() {
    const name = document.getElementById('newFolderName').value.trim();
    if (!name) return;

    const basePath = currentPath
        ? settings.databasePath + '/' + currentPath
        : settings.databasePath;
    const newPath = basePath + '/' + name;

    const result = createDirectory(newPath);

    if (result.success) {
        closeNewFolderModal();
        showStatus(t('status.folderCreated'), 'success');
        scanDatabaseFiles(); // Refresh
    } else {
        showStatus(result.error, 'error');
    }
}

// ============================================================================
// IMPORT TO PREMIERE
// ============================================================================
async function importSelectedFiles() {
    if (selectedFiles.size === 0) return;

    const files = allFiles.filter(f => selectedFiles.has(f.path));

    showProgress(t('status.importing'));
    updateProgress(0);

    try {
        // Prepare files for import
        const filesToImport = files.map(file => {
            // Calculate bin path (excluding database root folder name)
            let binPath = file.folderPath || '';

            return {
                name: file.name,
                path: file.path,
                binPath: binPath
            };
        });

        // If consolidate is enabled, copy files to project folder first
        if (settings.consolidateOnImport) {
            // Get project path from Premiere
            const projectPath = await getProjectPath();

            if (projectPath) {
                // Determine target folder based on depth
                let targetRoot = projectPath.substring(0, projectPath.lastIndexOf('/'));

                // Climb up folders based on depth settings
                for (let i = 0; i < (settings.consolidationDepth || 0); i++) {
                    const lastSlash = targetRoot.lastIndexOf('/');
                    if (lastSlash > 0) {
                        targetRoot = targetRoot.substring(0, lastSlash);
                    } else {
                        break; // Reached root, can't go up further
                    }
                }

                // Copy files preserving structure relative to that target root
                const filesToCopy = filesToImport.map(file => ({
                    name: file.name,
                    source: file.path,
                    destination: targetRoot + '/' + (file.binPath ? file.binPath + '/' : '') + file.name
                }));

                await copyFiles(filesToCopy, (progress) => {
                    updateProgress(progress.percent * 0.5, `Copying ${progress.current}/${progress.total}...`);
                });

                // Update paths to point to copied files
                filesToImport.forEach((file, i) => {
                    file.path = filesToCopy[i].destination;
                });
            }
        }

        // Import to Premiere Pro
        updateProgress(50, t('status.importing'));

        const filesJson = JSON.stringify(filesToImport);
        const base64Json = btoa(unescape(encodeURIComponent(filesJson)));

        csInterface.evalScript(`importFilesToProjectBase64('${base64Json}')`, (result) => {
            hideProgress();

            try {
                const response = JSON.parse(result);

                if (response.error) {
                    showStatus(t('status.importError') + ': ' + response.error, 'error');
                } else {
                    const count = response.totalImported || 0;
                    showStatus(`${count} ${t('status.importSuccess')}`, 'success');
                    selectedFiles.clear();
                    updateSelectionUI();
                    renderFiles();
                }
            } catch (e) {
                showStatus(t('status.importError'), 'error');
                console.error('Import error:', e);
            }
        });

    } catch (e) {
        hideProgress();
        showStatus(t('status.importError') + ': ' + e.message, 'error');
        console.error('Import error:', e);
    }
}

function getProjectPath() {
    return new Promise((resolve) => {
        csInterface.evalScript('getProjectPath()', (result) => {
            resolve(result === 'null' ? null : result);
        });
    });
}

// ============================================================================
// CONTEXT MENU
// ============================================================================
function showContextMenu(event, filePath) {
    const menu = document.getElementById('contextMenu');
    const isFavorite = favorites.has(filePath);

    // Show/hide appropriate favorite option
    document.getElementById('contextAddFavorite').classList.toggle('hidden', isFavorite);
    document.getElementById('contextRemoveFavorite').classList.toggle('hidden', !isFavorite);

    // Position menu
    menu.style.left = event.clientX + 'px';
    menu.style.top = event.clientY + 'px';
    menu.classList.add('visible');
    menu.dataset.filePath = filePath;
}

function hideContextMenu() {
    document.getElementById('contextMenu').classList.remove('visible');
}

// ============================================================================
// UTILITIES
// ============================================================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================================================
// BROWSE FOR FOLDER
// ============================================================================
function browseForDatabase() {
    csInterface.evalScript('selectFolder()', (result) => {
        if (result && result !== 'null') {
            document.getElementById('databasePathInput').value = result;
        }
    });
}

// ============================================================================
// INITIALIZATION
// ============================================================================
function init() {
    // Load settings
    loadSettings();

    // Event listeners - Settings
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('closeSettingsBtn').addEventListener('click', closeSettings);
    document.getElementById('settingsOverlay').addEventListener('click', closeSettings);
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
        saveSettings();
        closeSettings();
        scanDatabaseFiles();
    });
    document.getElementById('browseDatabaseBtn').addEventListener('click', browseForDatabase);

    // Language selectors
    document.getElementById('languageSelect').addEventListener('change', (e) => {
        changeLanguage(e.target.value);
        document.getElementById('settingsLanguageSelect').value = e.target.value;
    });
    document.getElementById('settingsLanguageSelect').addEventListener('change', (e) => {
        changeLanguage(e.target.value);
        document.getElementById('languageSelect').value = e.target.value;
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', (e) => {
        onSearch(e.target.value);
    });
    document.getElementById('clearSearch').addEventListener('click', clearSearch);

    // Filters
    document.getElementById('favoritesBtn').addEventListener('click', toggleFavorites);
    document.querySelectorAll('.type-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            setTypeFilter(btn.getAttribute('data-type'));
        });
    });

    // View toggle
    document.getElementById('listViewBtn').addEventListener('click', () => setViewMode('list'));
    document.getElementById('gridViewBtn').addEventListener('click', () => setViewMode('grid'));

    // Selection buttons
    document.getElementById('selectAllBtn').addEventListener('click', selectAll);
    document.getElementById('deselectAllBtn').addEventListener('click', deselectAll);
    document.getElementById('importBtn').addEventListener('click', importSelectedFiles);
    document.getElementById('addToDbBtn').addEventListener('click', addToDatabase);

    // Folder actions
    document.getElementById('newFolderBtn').addEventListener('click', openNewFolderModal);
    document.getElementById('refreshBtn').addEventListener('click', scanDatabaseFiles);
    document.getElementById('closeNewFolderModal').addEventListener('click', closeNewFolderModal);
    document.getElementById('cancelNewFolder').addEventListener('click', closeNewFolderModal);
    document.getElementById('confirmNewFolder').addEventListener('click', createFolder);

    // Enter key for new folder
    document.getElementById('newFolderName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createFolder();
    });

    // Context menu
    document.getElementById('contextAddFavorite').addEventListener('click', () => {
        const path = document.getElementById('contextMenu').dataset.filePath;
        favorites.add(path);
        saveFavorites();
        renderFiles();
        hideContextMenu();
    });
    document.getElementById('contextRemoveFavorite').addEventListener('click', () => {
        const path = document.getElementById('contextMenu').dataset.filePath;
        favorites.delete(path);
        saveFavorites();
        renderFiles();
        hideContextMenu();
    });
    document.getElementById('contextOpenFolder').addEventListener('click', () => {
        const path = document.getElementById('contextMenu').dataset.filePath;
        const folderPath = path.substring(0, path.lastIndexOf('/'));
        openInExplorer(folderPath);
        hideContextMenu();
    });
    document.getElementById('contextDelete').addEventListener('click', () => {
        const path = document.getElementById('contextMenu').dataset.filePath;
        if (confirm(t('modal.deleteConfirm'))) {
            const result = deletePath(path);
            if (result.success) {
                showStatus(t('status.folderDeleted'), 'success');
                scanDatabaseFiles();
            } else {
                showStatus(result.error, 'error');
            }
        }
        hideContextMenu();
    });

    // Close context menu on click outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu')) {
            hideContextMenu();
        }
    });

    // Initial scan if database path is set
    if (settings.databasePath) {
        setTimeout(scanDatabaseFiles, 100);
    }

    console.log('Data Base extension initialized');
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
