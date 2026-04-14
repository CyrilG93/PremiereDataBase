// Main JavaScript for Data Base Extension
// Premiere Pro Media Database Browser

// ============================================================================
// DEBUG LOGGING SYSTEM (must be first to capture all logs)
// ============================================================================
// Backup original console methods for our debug panel
if (!window._originalConsole) {
    window._originalConsole = {
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console)
    };
}
var _originalConsole = window._originalConsole;

function debugLog(message, type = 'info') {
    // Process early buffer if this is the first real call
    if (window._debugBuffer && window._debugBuffer.length > 0) {
        const buffer = window._debugBuffer;
        window._debugBuffer = [];
        buffer.forEach(log => debugLog(log.m, log.t));
    }

    // Always log to original console
    const consoleMethod = type === 'error' ? _originalConsole.error :
        type === 'warn' ? _originalConsole.warn : _originalConsole.log;
    consoleMethod(`[DataBase] ${message}`);

    // Add to debug panel if it exists
    const debugContent = document.getElementById('debugContent');
    if (debugContent) {
        const timestamp = new Date().toLocaleTimeString();
        const logEntry = document.createElement('div');
        logEntry.className = `debug-log ${type}`;
        logEntry.innerHTML = `<span class="timestamp">${timestamp}</span>${escapeHtml(String(message))}`;
        debugContent.appendChild(logEntry);
        debugContent.scrollTop = debugContent.scrollHeight;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Override console methods to capture logs
console.log = function (...args) {
    debugLog(args.join(' '), 'info');
};
console.warn = function (...args) {
    debugLog(args.join(' '), 'warn');
};
console.error = function (...args) {
    debugLog(args.join(' '), 'error');
};

// Global error handler
window.onerror = function (message, source, lineno, colno, error) {
    debugLog(`ERROR: ${message} (line ${lineno})`, 'error');
    return false;
};

let csInterface;
try {
    if (typeof CSInterface !== 'undefined') {
        csInterface = new CSInterface();
    } else {
        console.error('CSInterface class is not defined! CSInterface.js might have failed to load.');
        // Create a dummy to prevent crashes in main.js
        csInterface = {
            addEventListener: () => { },
            requestOpenExtension: () => { },
            evalScript: () => { },
            // Add minimal mocks
        };
        debugLog('CRITICAL ERROR: CSInterface not found', 'error');
    }
} catch (e) {
    console.error('Error initializing CSInterface:', e);
}

// Listen for custom event to open the panel (useful for Excalibur/shortcuts)
csInterface.addEventListener("com.database.premiere.open", function (event) {
    csInterface.requestOpenExtension("com.database.premiere.panel", "");
});

// ============================================================================
// SPELL BOOK INTEGRATION (Shortcut support via Excalibur)
// ============================================================================
// Feature flag: keep Spellbook code for later reactivation without shipping it by default.
var SPELLBOOK_ENABLED = false;

if (SPELLBOOK_ENABLED) {
    try {
        // Use esm package to load ES Module compatible npm packages (LEGACY/BACKUP)
        var esmRequire = require('esm')(module);
        var Spellbook = esmRequire('@knights-of-the-editing-table/spell-book').default;

        // NATIVE ESM (CEP 12 Test)
        // import Spellbook from '@knights-of-the-editing-table/spell-book';
        var commands = [
            {
                commandID: 'com.database.premiere.refresh',
                name: 'Refresh Database',
                group: 'Actions',
                action: () => {
                    scanDatabaseFiles();
                    showStatus(t('status.scanning'), 'info');
                }
            },
            {
                commandID: 'com.database.premiere.addToDb',
                name: 'Add Selection to Database',
                group: 'Actions',
                action: () => {
                    addToDatabase();
                }
            }
        ];

        var spellbook = new Spellbook('Data Base', 'com.database.premiere.panel', commands);
        debugLog('Spellbook integration enabled.');
    } catch (e) {
        debugLog('Spellbook initialization failed: ' + e.message, 'warn');
    }
} else {
    debugLog('Spellbook integration disabled (feature flag).');
}

// ============================================================================
// TRANSLATIONS (embedded to avoid async loading issues)
// ============================================================================
var translations = {
    en: {
        labels: {
            database: "Database:",
            notConfigured: "Not configured",
            root: "Root",
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
            create: "Create",
            addToDb: "Add to DB"
        },
        settings: {
            title: "Settings",
            databaseRoots: "Database folders",
            databaseRootsDescription: "Add one or more database folders and choose the name shown in the plugin.",
            databaseName: "Display name",
            databaseNamePlaceholder: "e.g. SOUND FX",
            databasePath: "Folder path",
            databasePathPlaceholder: "Select database folder...",
            addDatabaseRoot: "Add database",
            removeDatabaseRoot: "Remove",
            language: "Language",
            consolidateOnImport: "Copy files to project folder on import",
            consolidateDescription: "When enabled, files will be copied to the project folder before importing, preserving the folder structure.",
            bannedExtensions: "Excluded file extensions",
            bannedExtensionsPlaceholder: "e.g.: .txt, .pdf, .zip (one per line)",
            excludedFolders: "Excluded folder names",
            excludedFoldersPlaceholder: "e.g.: node_modules, .git (one per line)",
            consolidationDepth: "Consolidation folder depth",
            consolidationDepthHint: "0 = project file folder, 1 = one folder up, etc.",
            flattenImportPath: "Import to root folder only",
            flattenImportPathDescription: "When enabled, files are imported into the first-level folder only (e.g., ELEMENTS/IMAGES/file.png → ELEMENTS bin).",
            debugMode: "Enable Debug Mode",
            debugModeDescription: "Shows a log panel at the bottom of the extension with debug information.",
            showWaveforms: "Show audio waveforms",
            showWaveformsDescription: "Display interactive waveforms for audio files in list view.",
            showVideoWaveforms: "Show video waveforms",
            showVideoWaveformsDescription: "Display interactive audio waveforms and play button for video files in list view.",
            hoverPreview: "Preview on hover",
            hoverPreviewDescription: "Automatically play video/audio when hovering over the thumbnail."
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
            importFolder: "Import Folder",
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
            copied: "Copied to clipboard",
            moveSuccess: "file(s) moved successfully",
            moveFailed: "Failed to move files",
            movePartial: "moved, failed",
            fileExists: "file already exists",
            sameFolder: "already in this folder",
            selectDatabaseFirst: "Open a database before creating folders here",
            selectDatabaseForAdd: "Open a database before adding Premiere items to it",
            crossDatabaseMove: "Moving files between different databases is not supported yet"
        }
    },
    fr: {
        labels: {
            database: "Base de données :",
            notConfigured: "Non configuré",
            root: "Racine",
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
            create: "Créer",
            addToDb: "Ajouter à la base"
        },
        settings: {
            title: "Paramètres",
            databaseRoots: "Dossiers de base de données",
            databaseRootsDescription: "Ajoutez un ou plusieurs dossiers de base de données et choisissez le nom affiché dans le plugin.",
            databaseName: "Nom affiché",
            databaseNamePlaceholder: "ex : SOUND FX",
            databasePath: "Chemin du dossier",
            databasePathPlaceholder: "Sélectionner le dossier...",
            addDatabaseRoot: "Ajouter une base",
            removeDatabaseRoot: "Retirer",
            language: "Langue",
            consolidateOnImport: "Copier les fichiers dans le dossier projet lors de l'import",
            consolidateDescription: "Lorsque cette option est activée, les fichiers seront copiés dans le dossier du projet avant l'import, en préservant la structure des dossiers.",
            bannedExtensions: "Extensions de fichiers exclues",
            bannedExtensionsPlaceholder: "ex: .txt, .pdf, .zip (une par ligne)",
            excludedFolders: "Noms de dossiers exclus",
            excludedFoldersPlaceholder: "ex: node_modules, .git (un par ligne)",
            consolidationDepth: "Profondeur du dossier de consolidation",
            consolidationDepthHint: "0 = dossier du projet, 1 = un dossier au-dessus, etc.",
            flattenImportPath: "Importer dans le dossier racine uniquement",
            flattenImportPathDescription: "Lorsque cette option est activée, les fichiers sont importés uniquement dans le dossier de premier niveau (ex: ELEMENTS/IMAGES/fichier.png → bin ELEMENTS).",
            debugMode: "Activer le mode Debug",
            debugModeDescription: "Affiche un panneau de log en bas de l'extension avec des informations de débogage.",
            showWaveforms: "Afficher les formes d'onde audio",
            showWaveformsDescription: "Afficher les formes d'onde interactives pour les fichiers audio en vue liste.",
            showVideoWaveforms: "Afficher les formes d'onde vidéo",
            showVideoWaveformsDescription: "Afficher les formes d'onde audio et le bouton de lecture pour les fichiers vidéo en vue liste.",
            hoverPreview: "Aperçu au survol",
            hoverPreviewDescription: "Lance automatiquement la lecture vidéo/audio au survol de la vignette."
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
            importFolder: "Importer le dossier",
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
            copied: "Copié dans le presse-papiers",
            moveSuccess: "fichier(s) déplacé(s) avec succès",
            moveFailed: "Échec du déplacement",
            movePartial: "déplacé(s), échoué(s)",
            fileExists: "fichier déjà existant",
            sameFolder: "déjà dans ce dossier",
            selectDatabaseFirst: "Ouvrez une base avant de créer un dossier ici",
            selectDatabaseForAdd: "Ouvrez une base avant d'y ajouter des éléments depuis Premiere",
            crossDatabaseMove: "Le déplacement entre deux bases différentes n'est pas encore pris en charge"
        }
    }
};

// Keep all supported UI languages in one native-name ordered list for both selectors.
var LANGUAGE_OPTIONS = [
    { value: 'de', label: 'Deutsch' },
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Español' },
    { value: 'fr', label: 'Français' },
    { value: 'it', label: 'Italiano' },
    { value: 'pt-BR', label: 'Português (Brasil)' },
    { value: 'ru', label: 'Русский' },
    { value: 'ja', label: '日本語' },
    { value: 'zh-CN', label: '简体中文' }
];

Object.assign(translations, {
    de: {
        labels: {
            database: "Datenbank:",
            notConfigured: "Nicht konfiguriert",
            root: "Stamm",
            files: "Dateien",
            selected: "ausgewählt"
        },
        search: {
            placeholder: "Dateien suchen..."
        },
        filters: {
            all: "Alle",
            video: "Video",
            audio: "Audio",
            image: "Bild"
        },
        buttons: {
            import: "Importieren",
            save: "Speichern",
            cancel: "Abbrechen",
            create: "Erstellen",
            addToDb: "Zur Datenbank"
        },
        settings: {
            title: "Einstellungen",
            databaseRoots: "Datenbankordner",
            databaseRootsDescription: "Fuge einen oder mehrere Datenbankordner hinzu und wähle den im Plugin angezeigten Namen.",
            databaseName: "Anzeigename",
            databaseNamePlaceholder: "z. B. SOUND FX",
            databasePath: "Ordnerpfad",
            databasePathPlaceholder: "Datenbankordner auswählen...",
            addDatabaseRoot: "Datenbank hinzufügen",
            removeDatabaseRoot: "Entfernen",
            language: "Sprache",
            consolidateOnImport: "Dateien beim Import in den Projektordner kopieren",
            consolidateDescription: "Wenn aktiviert, werden Dateien vor dem Import in den Projektordner kopiert und die Ordnerstruktur bleibt erhalten.",
            bannedExtensions: "Ausgeschlossene Dateiendungen",
            bannedExtensionsPlaceholder: "z. B.: .txt, .pdf, .zip (eine pro Zeile)",
            excludedFolders: "Ausgeschlossene Ordnernamen",
            excludedFoldersPlaceholder: "z. B.: node_modules, .git (einer pro Zeile)",
            consolidationDepth: "Tiefe des Zielordners",
            consolidationDepthHint: "0 = Projektordner, 1 = ein Ordner höher usw.",
            flattenImportPath: "Nur in den Stammordner importieren",
            flattenImportPathDescription: "Wenn aktiviert, werden Dateien nur in den Ordner der ersten Ebene importiert (z. B. ELEMENTS/IMAGES/file.png -> Bin ELEMENTS).",
            debugMode: "Debug-Modus aktivieren",
            debugModeDescription: "Zeigt unten im Plugin ein Log-Panel mit Debug-Informationen an.",
            showWaveforms: "Audio-Wellenformen anzeigen",
            showWaveformsDescription: "Zeigt in der Listenansicht interaktive Wellenformen für Audiodateien an.",
            showVideoWaveforms: "Video-Wellenformen anzeigen",
            showVideoWaveformsDescription: "Zeigt in der Listenansicht Audio-Wellenformen und einen Abspielknopf für Videodateien an.",
            hoverPreview: "Vorschau bei Mauszeiger",
            hoverPreviewDescription: "Spielt Video oder Audio automatisch ab, wenn der Mauszeiger auf der Vorschau liegt."
        },
        empty: {
            configureDatabase: "Konfiguriere den Datenbankpfad in den Einstellungen",
            noFilesFound: "Keine Dateien gefunden",
            noFavorites: "Noch keine Favoriten"
        },
        modal: {
            newFolder: "Neuer Ordner",
            folderNamePlaceholder: "Ordnername",
            deleteConfirm: "Möchtest du das wirklich löschen?"
        },
        context: {
            addFavorite: "Zu Favoriten hinzufügen",
            removeFavorite: "Aus Favoriten entfernen",
            openFolder: "Im Finder/Explorer öffnen",
            importFolder: "Ordner importieren",
            delete: "Löschen"
        },
        status: {
            loading: "Wird geladen...",
            scanning: "Datenbank wird gescannt...",
            importing: "Dateien werden importiert...",
            importSuccess: "Dateien erfolgreich importiert",
            importError: "Import fehlgeschlagen",
            saved: "Einstellungen gespeichert",
            folderCreated: "Ordner erstellt",
            folderDeleted: "Ordner gelöscht",
            copied: "In die Zwischenablage kopiert",
            moveSuccess: "Datei(en) erfolgreich verschoben",
            moveFailed: "Verschieben fehlgeschlagen",
            movePartial: "verschoben, fehlgeschlagen",
            fileExists: "Datei existiert bereits",
            sameFolder: "bereits in diesem Ordner",
            selectDatabaseFirst: "Öffne zuerst eine Datenbank, bevor du hier Ordner erstellst",
            selectDatabaseForAdd: "Öffne zuerst eine Datenbank, bevor du Elemente aus Premiere hinzufügst",
            crossDatabaseMove: "Das Verschieben zwischen verschiedenen Datenbanken wird noch nicht unterstützt"
        }
    },
    es: {
        labels: {
            database: "Base de datos:",
            notConfigured: "No configurada",
            root: "Raíz",
            files: "archivos",
            selected: "seleccionado(s)"
        },
        search: {
            placeholder: "Buscar archivos..."
        },
        filters: {
            all: "Todos",
            video: "Vídeo",
            audio: "Audio",
            image: "Imagen"
        },
        buttons: {
            import: "Importar",
            save: "Guardar",
            cancel: "Cancelar",
            create: "Crear",
            addToDb: "Añadir a la base"
        },
        settings: {
            title: "Ajustes",
            databaseRoots: "Carpetas de base de datos",
            databaseRootsDescription: "Añade una o más carpetas de base de datos y elige el nombre que se mostrará en el plugin.",
            databaseName: "Nombre mostrado",
            databaseNamePlaceholder: "p. ej. SOUND FX",
            databasePath: "Ruta de la carpeta",
            databasePathPlaceholder: "Seleccionar carpeta de base de datos...",
            addDatabaseRoot: "Añadir base",
            removeDatabaseRoot: "Quitar",
            language: "Idioma",
            consolidateOnImport: "Copiar archivos a la carpeta del proyecto al importar",
            consolidateDescription: "Cuando esta opción está activada, los archivos se copiarán a la carpeta del proyecto antes de importarse, conservando la estructura de carpetas.",
            bannedExtensions: "Extensiones excluidas",
            bannedExtensionsPlaceholder: "p. ej.: .txt, .pdf, .zip (una por línea)",
            excludedFolders: "Nombres de carpetas excluidas",
            excludedFoldersPlaceholder: "p. ej.: node_modules, .git (una por línea)",
            consolidationDepth: "Profundidad de consolidación",
            consolidationDepthHint: "0 = carpeta del proyecto, 1 = una carpeta arriba, etc.",
            flattenImportPath: "Importar solo a la carpeta raíz",
            flattenImportPathDescription: "Cuando está activado, los archivos se importan solo a la carpeta del primer nivel (p. ej. ELEMENTS/IMAGES/file.png -> bin ELEMENTS).",
            debugMode: "Activar modo debug",
            debugModeDescription: "Muestra un panel de logs en la parte inferior del plugin con información de depuración.",
            showWaveforms: "Mostrar formas de onda de audio",
            showWaveformsDescription: "Muestra formas de onda interactivas para archivos de audio en la vista de lista.",
            showVideoWaveforms: "Mostrar formas de onda de vídeo",
            showVideoWaveformsDescription: "Muestra formas de onda de audio y un botón de reproducción para archivos de vídeo en la vista de lista.",
            hoverPreview: "Vista previa al pasar el cursor",
            hoverPreviewDescription: "Reproduce automáticamente el vídeo o audio al pasar el cursor sobre la miniatura."
        },
        empty: {
            configureDatabase: "Configura la ruta de la base de datos en los ajustes",
            noFilesFound: "No se encontraron archivos",
            noFavorites: "Todavía no hay favoritos"
        },
        modal: {
            newFolder: "Nueva carpeta",
            folderNamePlaceholder: "Nombre de la carpeta",
            deleteConfirm: "¿Seguro que quieres eliminar esto?"
        },
        context: {
            addFavorite: "Añadir a favoritos",
            removeFavorite: "Quitar de favoritos",
            openFolder: "Abrir en Finder/Explorer",
            importFolder: "Importar carpeta",
            delete: "Eliminar"
        },
        status: {
            loading: "Cargando...",
            scanning: "Analizando la base de datos...",
            importing: "Importando archivos...",
            importSuccess: "archivos importados correctamente",
            importError: "Error de importación",
            saved: "Ajustes guardados",
            folderCreated: "Carpeta creada",
            folderDeleted: "Carpeta eliminada",
            copied: "Copiado al portapapeles",
            moveSuccess: "archivo(s) movido(s) correctamente",
            moveFailed: "Error al mover archivos",
            movePartial: "movido(s), fallido(s)",
            fileExists: "el archivo ya existe",
            sameFolder: "ya está en esta carpeta",
            selectDatabaseFirst: "Abre una base antes de crear carpetas aquí",
            selectDatabaseForAdd: "Abre una base antes de añadir elementos desde Premiere",
            crossDatabaseMove: "Mover archivos entre distintas bases de datos todavía no es compatible"
        }
    },
    it: {
        labels: {
            database: "Database:",
            notConfigured: "Non configurato",
            root: "Radice",
            files: "file",
            selected: "selezionato/i"
        },
        search: {
            placeholder: "Cerca file..."
        },
        filters: {
            all: "Tutti",
            video: "Video",
            audio: "Audio",
            image: "Immagine"
        },
        buttons: {
            import: "Importa",
            save: "Salva",
            cancel: "Annulla",
            create: "Crea",
            addToDb: "Aggiungi al DB"
        },
        settings: {
            title: "Impostazioni",
            databaseRoots: "Cartelle del database",
            databaseRootsDescription: "Aggiungi una o più cartelle del database e scegli il nome mostrato nel plugin.",
            databaseName: "Nome visualizzato",
            databaseNamePlaceholder: "es. SOUND FX",
            databasePath: "Percorso cartella",
            databasePathPlaceholder: "Seleziona la cartella del database...",
            addDatabaseRoot: "Aggiungi database",
            removeDatabaseRoot: "Rimuovi",
            language: "Lingua",
            consolidateOnImport: "Copia i file nella cartella del progetto durante l'importazione",
            consolidateDescription: "Se attivato, i file verranno copiati nella cartella del progetto prima dell'importazione, mantenendo la struttura delle cartelle.",
            bannedExtensions: "Estensioni escluse",
            bannedExtensionsPlaceholder: "es.: .txt, .pdf, .zip (una per riga)",
            excludedFolders: "Nomi cartelle escluse",
            excludedFoldersPlaceholder: "es.: node_modules, .git (uno per riga)",
            consolidationDepth: "Profondità della cartella di consolidamento",
            consolidationDepthHint: "0 = cartella del progetto, 1 = una cartella sopra, ecc.",
            flattenImportPath: "Importa solo nella cartella radice",
            flattenImportPathDescription: "Se attivato, i file vengono importati solo nella cartella di primo livello (es. ELEMENTS/IMAGES/file.png -> bin ELEMENTS).",
            debugMode: "Attiva modalità debug",
            debugModeDescription: "Mostra un pannello log nella parte inferiore del plugin con informazioni di debug.",
            showWaveforms: "Mostra forme d'onda audio",
            showWaveformsDescription: "Mostra forme d'onda interattive per i file audio nella vista elenco.",
            showVideoWaveforms: "Mostra forme d'onda video",
            showVideoWaveformsDescription: "Mostra forme d'onda audio e il pulsante di riproduzione per i file video nella vista elenco.",
            hoverPreview: "Anteprima al passaggio",
            hoverPreviewDescription: "Riproduce automaticamente video o audio quando il cursore passa sulla miniatura."
        },
        empty: {
            configureDatabase: "Configura il percorso del database nelle impostazioni",
            noFilesFound: "Nessun file trovato",
            noFavorites: "Nessun preferito"
        },
        modal: {
            newFolder: "Nuova cartella",
            folderNamePlaceholder: "Nome cartella",
            deleteConfirm: "Sei sicuro di voler eliminare questo elemento?"
        },
        context: {
            addFavorite: "Aggiungi ai preferiti",
            removeFavorite: "Rimuovi dai preferiti",
            openFolder: "Apri in Finder/Explorer",
            importFolder: "Importa cartella",
            delete: "Elimina"
        },
        status: {
            loading: "Caricamento...",
            scanning: "Analisi del database...",
            importing: "Importazione dei file...",
            importSuccess: "file importati con successo",
            importError: "Importazione non riuscita",
            saved: "Impostazioni salvate",
            folderCreated: "Cartella creata",
            folderDeleted: "Cartella eliminata",
            copied: "Copiato negli appunti",
            moveSuccess: "file spostato/i con successo",
            moveFailed: "Spostamento non riuscito",
            movePartial: "spostato/i, fallito/i",
            fileExists: "il file esiste già",
            sameFolder: "già in questa cartella",
            selectDatabaseFirst: "Apri prima un database prima di creare cartelle qui",
            selectDatabaseForAdd: "Apri prima un database prima di aggiungere elementi da Premiere",
            crossDatabaseMove: "Lo spostamento tra database diversi non è ancora supportato"
        }
    },
    'pt-BR': {
        labels: {
            database: "Banco de dados:",
            notConfigured: "Não configurado",
            root: "Raiz",
            files: "arquivos",
            selected: "selecionado(s)"
        },
        search: {
            placeholder: "Buscar arquivos..."
        },
        filters: {
            all: "Todos",
            video: "Vídeo",
            audio: "Áudio",
            image: "Imagem"
        },
        buttons: {
            import: "Importar",
            save: "Salvar",
            cancel: "Cancelar",
            create: "Criar",
            addToDb: "Adicionar ao banco"
        },
        settings: {
            title: "Configurações",
            databaseRoots: "Pastas do banco de dados",
            databaseRootsDescription: "Adicione uma ou mais pastas do banco de dados e escolha o nome exibido no plugin.",
            databaseName: "Nome exibido",
            databaseNamePlaceholder: "ex.: SOUND FX",
            databasePath: "Caminho da pasta",
            databasePathPlaceholder: "Selecionar pasta do banco de dados...",
            addDatabaseRoot: "Adicionar banco",
            removeDatabaseRoot: "Remover",
            language: "Idioma",
            consolidateOnImport: "Copiar arquivos para a pasta do projeto ao importar",
            consolidateDescription: "Quando ativado, os arquivos serão copiados para a pasta do projeto antes da importação, preservando a estrutura de pastas.",
            bannedExtensions: "Extensões excluídas",
            bannedExtensionsPlaceholder: "ex.: .txt, .pdf, .zip (uma por linha)",
            excludedFolders: "Nomes de pastas excluídas",
            excludedFoldersPlaceholder: "ex.: node_modules, .git (uma por linha)",
            consolidationDepth: "Profundidade da consolidação",
            consolidationDepthHint: "0 = pasta do projeto, 1 = uma pasta acima, etc.",
            flattenImportPath: "Importar apenas para a pasta raiz",
            flattenImportPathDescription: "Quando ativado, os arquivos são importados apenas para a pasta do primeiro nível (ex.: ELEMENTS/IMAGES/file.png -> bin ELEMENTS).",
            debugMode: "Ativar modo debug",
            debugModeDescription: "Mostra um painel de logs na parte inferior do plugin com informações de depuração.",
            showWaveforms: "Mostrar formas de onda de áudio",
            showWaveformsDescription: "Exibe formas de onda interativas para arquivos de áudio na visualização em lista.",
            showVideoWaveforms: "Mostrar formas de onda de vídeo",
            showVideoWaveformsDescription: "Exibe formas de onda de áudio e um botão de reprodução para arquivos de vídeo na visualização em lista.",
            hoverPreview: "Pré-visualização ao passar o mouse",
            hoverPreviewDescription: "Reproduz automaticamente vídeo ou áudio ao passar o mouse sobre a miniatura."
        },
        empty: {
            configureDatabase: "Configure o caminho do banco de dados nas configurações",
            noFilesFound: "Nenhum arquivo encontrado",
            noFavorites: "Ainda não há favoritos"
        },
        modal: {
            newFolder: "Nova pasta",
            folderNamePlaceholder: "Nome da pasta",
            deleteConfirm: "Tem certeza de que deseja excluir isto?"
        },
        context: {
            addFavorite: "Adicionar aos favoritos",
            removeFavorite: "Remover dos favoritos",
            openFolder: "Abrir no Finder/Explorer",
            importFolder: "Importar pasta",
            delete: "Excluir"
        },
        status: {
            loading: "Carregando...",
            scanning: "Analisando o banco de dados...",
            importing: "Importando arquivos...",
            importSuccess: "arquivos importados com sucesso",
            importError: "Falha na importação",
            saved: "Configurações salvas",
            folderCreated: "Pasta criada",
            folderDeleted: "Pasta excluída",
            copied: "Copiado para a área de transferência",
            moveSuccess: "arquivo(s) movido(s) com sucesso",
            moveFailed: "Falha ao mover arquivos",
            movePartial: "movido(s), falhou/falharam",
            fileExists: "o arquivo já existe",
            sameFolder: "já está nesta pasta",
            selectDatabaseFirst: "Abra um banco antes de criar pastas aqui",
            selectDatabaseForAdd: "Abra um banco antes de adicionar itens do Premiere",
            crossDatabaseMove: "Mover arquivos entre bancos de dados diferentes ainda não é suportado"
        }
    },
    ja: {
        labels: {
            database: "データベース:",
            notConfigured: "未設定",
            root: "ルート",
            files: "ファイル",
            selected: "選択中"
        },
        search: {
            placeholder: "ファイルを検索..."
        },
        filters: {
            all: "すべて",
            video: "動画",
            audio: "音声",
            image: "画像"
        },
        buttons: {
            import: "読み込み",
            save: "保存",
            cancel: "キャンセル",
            create: "作成",
            addToDb: "DBに追加"
        },
        settings: {
            title: "設定",
            databaseRoots: "データベースフォルダー",
            databaseRootsDescription: "1つ以上のデータベースフォルダーを追加し、プラグインに表示する名前を設定します。",
            databaseName: "表示名",
            databaseNamePlaceholder: "例: SOUND FX",
            databasePath: "フォルダーパス",
            databasePathPlaceholder: "データベースフォルダーを選択...",
            addDatabaseRoot: "データベースを追加",
            removeDatabaseRoot: "削除",
            language: "言語",
            consolidateOnImport: "読み込み時にファイルをプロジェクトフォルダーへコピー",
            consolidateDescription: "有効にすると、読み込み前にファイルがプロジェクトフォルダーへコピーされ、フォルダー構成も保持されます。",
            bannedExtensions: "除外する拡張子",
            bannedExtensionsPlaceholder: "例: .txt, .pdf, .zip（1行に1つ）",
            excludedFolders: "除外するフォルダー名",
            excludedFoldersPlaceholder: "例: node_modules, .git（1行に1つ）",
            consolidationDepth: "統合フォルダーの深さ",
            consolidationDepthHint: "0 = プロジェクトファイルのフォルダー、1 = 1つ上のフォルダー など",
            flattenImportPath: "ルートフォルダーにのみ読み込む",
            flattenImportPathDescription: "有効にすると、ファイルは最上位フォルダーのみに読み込まれます（例: ELEMENTS/IMAGES/file.png -> ELEMENTS ビン）。",
            debugMode: "デバッグモードを有効化",
            debugModeDescription: "プラグイン下部にデバッグログパネルを表示します。",
            showWaveforms: "音声波形を表示",
            showWaveformsDescription: "リスト表示で音声ファイルの波形を表示します。",
            showVideoWaveforms: "動画波形を表示",
            showVideoWaveformsDescription: "リスト表示で動画ファイルの音声波形と再生ボタンを表示します。",
            hoverPreview: "ホバーでプレビュー",
            hoverPreviewDescription: "サムネイルにマウスを乗せると動画や音声を自動再生します。"
        },
        empty: {
            configureDatabase: "設定でデータベースパスを指定してください",
            noFilesFound: "ファイルが見つかりません",
            noFavorites: "お気に入りはまだありません"
        },
        modal: {
            newFolder: "新しいフォルダー",
            folderNamePlaceholder: "フォルダー名",
            deleteConfirm: "本当に削除しますか？"
        },
        context: {
            addFavorite: "お気に入りに追加",
            removeFavorite: "お気に入りから削除",
            openFolder: "Finder/Explorerで開く",
            importFolder: "フォルダーを読み込む",
            delete: "削除"
        },
        status: {
            loading: "読み込み中...",
            scanning: "データベースをスキャン中...",
            importing: "ファイルを読み込み中...",
            importSuccess: "ファイルを正常に読み込みました",
            importError: "読み込みに失敗しました",
            saved: "設定を保存しました",
            folderCreated: "フォルダーを作成しました",
            folderDeleted: "フォルダーを削除しました",
            copied: "クリップボードにコピーしました",
            moveSuccess: "ファイルを移動しました",
            moveFailed: "ファイルの移動に失敗しました",
            movePartial: "移動済み、失敗あり",
            fileExists: "同名ファイルが既に存在します",
            sameFolder: "このフォルダーに既にあります",
            selectDatabaseFirst: "ここにフォルダーを作成する前にデータベースを開いてください",
            selectDatabaseForAdd: "Premiereから追加する前にデータベースを開いてください",
            crossDatabaseMove: "異なるデータベース間の移動はまだサポートされていません"
        }
    },
    ru: {
        labels: {
            database: "База данных:",
            notConfigured: "Не настроено",
            root: "Корень",
            files: "файлов",
            selected: "выбрано"
        },
        search: {
            placeholder: "Поиск файлов..."
        },
        filters: {
            all: "Все",
            video: "Видео",
            audio: "Аудио",
            image: "Изображение"
        },
        buttons: {
            import: "Импорт",
            save: "Сохранить",
            cancel: "Отмена",
            create: "Создать",
            addToDb: "Добавить в базу"
        },
        settings: {
            title: "Настройки",
            databaseRoots: "Папки базы данных",
            databaseRootsDescription: "Добавьте одну или несколько папок базы данных и задайте имя, которое будет отображаться в панели.",
            databaseName: "Отображаемое имя",
            databaseNamePlaceholder: "например: SOUND FX",
            databasePath: "Путь к папке",
            databasePathPlaceholder: "Выберите папку базы данных...",
            addDatabaseRoot: "Добавить базу",
            removeDatabaseRoot: "Убрать",
            language: "Язык",
            consolidateOnImport: "Копировать файлы в папку проекта при импорте",
            consolidateDescription: "Если включено, файлы будут скопированы в папку проекта перед импортом с сохранением структуры папок.",
            bannedExtensions: "Исключённые расширения файлов",
            bannedExtensionsPlaceholder: "например: .txt, .pdf, .zip (по одному на строку)",
            excludedFolders: "Исключённые имена папок",
            excludedFoldersPlaceholder: "например: node_modules, .git (по одному на строку)",
            consolidationDepth: "Глубина консолидации",
            consolidationDepthHint: "0 = папка проекта, 1 = на одну папку выше и т. д.",
            flattenImportPath: "Импортировать только в корневую папку",
            flattenImportPathDescription: "Если включено, файлы импортируются только в папку первого уровня (например: ELEMENTS/IMAGES/file.png -> bin ELEMENTS).",
            debugMode: "Включить режим отладки",
            debugModeDescription: "Показывает панель логов внизу плагина с отладочной информацией.",
            showWaveforms: "Показывать аудиоволны",
            showWaveformsDescription: "Показывает интерактивные волны для аудиофайлов в режиме списка.",
            showVideoWaveforms: "Показывать видеоволны",
            showVideoWaveformsDescription: "Показывает аудиоволны и кнопку воспроизведения для видеофайлов в режиме списка.",
            hoverPreview: "Предпросмотр при наведении",
            hoverPreviewDescription: "Автоматически воспроизводит видео или аудио при наведении на миниатюру."
        },
        empty: {
            configureDatabase: "Укажите путь к базе данных в настройках",
            noFilesFound: "Файлы не найдены",
            noFavorites: "Избранного пока нет"
        },
        modal: {
            newFolder: "Новая папка",
            folderNamePlaceholder: "Имя папки",
            deleteConfirm: "Вы уверены, что хотите это удалить?"
        },
        context: {
            addFavorite: "Добавить в избранное",
            removeFavorite: "Убрать из избранного",
            openFolder: "Открыть в Finder/Explorer",
            importFolder: "Импортировать папку",
            delete: "Удалить"
        },
        status: {
            loading: "Загрузка...",
            scanning: "Сканирование базы данных...",
            importing: "Импорт файлов...",
            importSuccess: "файлов успешно импортировано",
            importError: "Ошибка импорта",
            saved: "Настройки сохранены",
            folderCreated: "Папка создана",
            folderDeleted: "Папка удалена",
            copied: "Скопировано в буфер обмена",
            moveSuccess: "файл(ы) успешно перемещены",
            moveFailed: "Не удалось переместить файлы",
            movePartial: "перемещено, есть ошибки",
            fileExists: "файл уже существует",
            sameFolder: "уже в этой папке",
            selectDatabaseFirst: "Откройте базу данных, прежде чем создавать здесь папки",
            selectDatabaseForAdd: "Откройте базу данных, прежде чем добавлять элементы из Premiere",
            crossDatabaseMove: "Перемещение между разными базами данных пока не поддерживается"
        }
    },
    'zh-CN': {
        labels: {
            database: "数据库：",
            notConfigured: "未配置",
            root: "根目录",
            files: "文件",
            selected: "已选择"
        },
        search: {
            placeholder: "搜索文件..."
        },
        filters: {
            all: "全部",
            video: "视频",
            audio: "音频",
            image: "图像"
        },
        buttons: {
            import: "导入",
            save: "保存",
            cancel: "取消",
            create: "创建",
            addToDb: "添加到数据库"
        },
        settings: {
            title: "设置",
            databaseRoots: "数据库文件夹",
            databaseRootsDescription: "添加一个或多个数据库文件夹，并选择插件中显示的名称。",
            databaseName: "显示名称",
            databaseNamePlaceholder: "例如：SOUND FX",
            databasePath: "文件夹路径",
            databasePathPlaceholder: "选择数据库文件夹...",
            addDatabaseRoot: "添加数据库",
            removeDatabaseRoot: "移除",
            language: "语言",
            consolidateOnImport: "导入时将文件复制到项目文件夹",
            consolidateDescription: "启用后，文件会在导入前复制到项目文件夹，并保留文件夹结构。",
            bannedExtensions: "排除的文件扩展名",
            bannedExtensionsPlaceholder: "例如：.txt、.pdf、.zip（每行一个）",
            excludedFolders: "排除的文件夹名称",
            excludedFoldersPlaceholder: "例如：node_modules、.git（每行一个）",
            consolidationDepth: "合并深度",
            consolidationDepthHint: "0 = 项目文件夹，1 = 上一级文件夹，依此类推。",
            flattenImportPath: "仅导入到根文件夹",
            flattenImportPathDescription: "启用后，文件只会导入到第一级文件夹（例如：ELEMENTS/IMAGES/file.png -> ELEMENTS bin）。",
            debugMode: "启用调试模式",
            debugModeDescription: "在插件底部显示一个带有调试信息的日志面板。",
            showWaveforms: "显示音频波形",
            showWaveformsDescription: "在列表视图中显示音频文件的交互式波形。",
            showVideoWaveforms: "显示视频波形",
            showVideoWaveformsDescription: "在列表视图中显示视频文件的音频波形和播放按钮。",
            hoverPreview: "悬停预览",
            hoverPreviewDescription: "将鼠标悬停在缩略图上时自动播放视频或音频。"
        },
        empty: {
            configureDatabase: "请在设置中配置数据库路径",
            noFilesFound: "未找到文件",
            noFavorites: "还没有收藏"
        },
        modal: {
            newFolder: "新建文件夹",
            folderNamePlaceholder: "文件夹名称",
            deleteConfirm: "确定要删除吗？"
        },
        context: {
            addFavorite: "添加到收藏",
            removeFavorite: "从收藏中移除",
            openFolder: "在 Finder/Explorer 中打开",
            importFolder: "导入文件夹",
            delete: "删除"
        },
        status: {
            loading: "加载中...",
            scanning: "正在扫描数据库...",
            importing: "正在导入文件...",
            importSuccess: "个文件已成功导入",
            importError: "导入失败",
            saved: "设置已保存",
            folderCreated: "文件夹已创建",
            folderDeleted: "文件夹已删除",
            copied: "已复制到剪贴板",
            moveSuccess: "文件已成功移动",
            moveFailed: "移动文件失败",
            movePartial: "已移动，部分失败",
            fileExists: "文件已存在",
            sameFolder: "已在此文件夹中",
            selectDatabaseFirst: "请先打开一个数据库，再在这里创建文件夹",
            selectDatabaseForAdd: "请先打开一个数据库，再从 Premiere 添加项目",
            crossDatabaseMove: "暂不支持在不同数据库之间移动文件"
        }
    }
});

// ============================================================================
// STATE
// ============================================================================
var currentLang = 'en';
var defaultSettings = {
    databaseRoots: [],
    databasePath: '',
    language: 'en',
    itemSize: 0, // 0-100 slider value
    consolidateOnImport: false,
    consolidationDepth: 0,  // 0 = next to project file, 1 = one folder up, etc.
    flattenImportPath: false, // Only use first-level folder for bin path
    bannedExtensions: ['.txt', '.pdf', '.zip', '.rar', '.exe', '.doc', '.docx', '.prproj'],
    excludedFolderNames: ['.git', 'node_modules', '__MACOSX', 'Adobe Premiere Pro Auto-Save'],
    debugMode: true, // Show debug log panel
    showWaveforms: true, // Show audio waveforms
    showVideoWaveforms: true, // Show video waveforms
    hoverPreview: false // Preview on hover
};
var settings = { ...defaultSettings };

var allFiles = [];           // All files from database
var allFolders = [];         // All folders from database
var filteredFiles = [];      // Files after applying filters
var selectedFiles = new Set(); // Selected file paths
var favorites = new Set();   // Favorite file paths
var currentDatabaseId = '';  // Current database root being viewed
var currentPath = '';        // Current folder path being viewed
var currentViewMode = 'list'; // 'list' or 'grid'
var activeTypeFilters = ['all']; // Active type filters
var showFavoritesOnly = false;
var searchQuery = '';
var searchDebounceTimer = null;
var saveSettingsTimer = null;
var contextMenuFile = '';     // Track the currently opened context menu target
var currentlyPlayingAudio = null; // Path of currently playing audio file
var expandedFolders = new Set(); // Folders that are expanded in list view
var wavesurferInstances = new Map(); // Map of audioPath -> Wavesurfer instance

// ============================================================================
// FILE-BASED SETTINGS STORAGE (persists across Premiere versions)
// ============================================================================
var pdb_fs = require('fs');
var pdb_path = require('path');
var pdb_os = require('os');
var pdb_https = require('https');

// UPDATE SYSTEM CONSTANTS
var GITHUB_REPO = 'CyrilG93/PremiereDataBase';
var CURRENT_VERSION = '1.0.0'; // Will be updated from manifest

// Build a stable unique key for a folder inside one database root.
function pdb_buildFolderKey(rootId, relativePath) {
    return (rootId || '') + '::' + (relativePath || '');
}

// Split a folder key back into its database id and folder path.
function pdb_parseFolderKey(folderKey) {
    const separatorIndex = folderKey.indexOf('::');
    if (separatorIndex === -1) {
        return {
            rootId: '',
            relativePath: folderKey || ''
        };
    }

    return {
        rootId: folderKey.substring(0, separatorIndex),
        relativePath: folderKey.substring(separatorIndex + 2)
    };
}

// Create a lightweight id for stored database roots.
function pdb_generateDatabaseId() {
    return 'pdb-root-' + Math.random().toString(36).slice(2, 10);
}

// Derive a readable default label from a folder path.
function pdb_getDefaultDatabaseName(databasePath) {
    if (!databasePath) {
        return 'Database';
    }

    const normalizedPath = databasePath.replace(/[\\\/]+$/, '');
    const pathParts = normalizedPath.split(/[\\\/]/).filter(Boolean);
    return pathParts[pathParts.length - 1] || normalizedPath || 'Database';
}

// Clean user-provided database names before using them in UI or bin paths.
function pdb_getSafeDatabaseName(name, databasePath) {
    const trimmedName = (name || '').trim();
    return trimmedName || pdb_getDefaultDatabaseName(databasePath);
}

// Ensure all saved roots have ids, names, and normalized forward-slash paths.
function pdb_normalizeDatabaseRoots(rawSettings) {
    let rawRoots = [];
    const seenPaths = new Set();

    if (Array.isArray(rawSettings.databaseRoots)) {
        rawRoots = rawSettings.databaseRoots;
    } else if (rawSettings.databasePath) {
        rawRoots = [{
            id: pdb_generateDatabaseId(),
            name: pdb_getDefaultDatabaseName(rawSettings.databasePath),
            path: rawSettings.databasePath
        }];
    }

    return rawRoots
        .map((root) => {
            const normalizedPath = (root.path || '').trim().replace(/\\/g, '/').replace(/\/+$/, '');
            if (!normalizedPath) {
                return null;
            }

            if (seenPaths.has(normalizedPath)) {
                return null;
            }

            seenPaths.add(normalizedPath);

            return {
                id: root.id || pdb_generateDatabaseId(),
                name: pdb_getSafeDatabaseName(root.name, normalizedPath),
                path: normalizedPath
            };
        })
        .filter(Boolean);
}

// Normalize legacy settings so the extension always works with the new multi-root shape.
function pdb_normalizeSettings(rawSettings) {
    const mergedSettings = { ...defaultSettings, ...rawSettings };
    mergedSettings.databaseRoots = pdb_normalizeDatabaseRoots(mergedSettings);
    mergedSettings.databasePath = mergedSettings.databaseRoots[0] ? mergedSettings.databaseRoots[0].path : '';
    return mergedSettings;
}

// Return true when at least one database root is configured.
function pdb_hasConfiguredDatabases() {
    return Array.isArray(settings.databaseRoots) && settings.databaseRoots.length > 0;
}

// Find a configured database root by id.
function pdb_getDatabaseRootById(rootId) {
    if (!rootId) {
        return null;
    }

    return settings.databaseRoots.find((root) => root.id === rootId) || null;
}

// With several roots configured, the top-level view should always show every root together.
function pdb_isGroupedHomeView() {
    return settings.databaseRoots.length > 1 && !searchQuery && !currentPath;
}

// Return the root currently targeted by create/add operations.
function pdb_getActiveDatabaseRoot() {
    if (pdb_isGroupedHomeView()) {
        return null;
    }

    if (currentDatabaseId) {
        return pdb_getDatabaseRootById(currentDatabaseId);
    }

    if (settings.databaseRoots.length === 1) {
        return settings.databaseRoots[0];
    }

    return null;
}

// Sanitize custom root labels before reusing them as Premiere bin segments.
function pdb_getSafeBinSegment(name) {
    return (name || '').replace(/[\\\/]+/g, '-').trim();
}

// Keep navigation stable after settings changes or database rescans.
function pdb_ensureNavigationIsValid() {
    if (currentDatabaseId && !pdb_getDatabaseRootById(currentDatabaseId)) {
        currentDatabaseId = '';
        currentPath = '';
        expandedFolders.clear();
    }
}

// Resolve a folder record from its compound key.
function pdb_getFolderByKey(folderKey) {
    const parsedKey = pdb_parseFolderKey(folderKey);
    return allFolders.find((folder) => folder.rootId === parsedKey.rootId && folder.relativePath === parsedKey.relativePath) || null;
}

// Build a visible folder label for search results and mixed-database selections.
function pdb_getFileLocationLabel(file) {
    const labelParts = [];

    if (file.rootName) {
        labelParts.push(file.rootName);
    }

    if (file.folderPath) {
        labelParts.push(file.folderPath);
    }

    return labelParts.join(' / ') || t('labels.root');
}

/**
 * Get the path to the settings file (cross-platform)
 * macOS: ~/Library/Application Support/PremiereDataBase/settings.json
 * Windows: %APPDATA%/PremiereDataBase/settings.json
 */
function pdb_getSettingsDir() {
    const platform = pdb_os.platform();
    if (platform === 'darwin') {
        return pdb_path.join(pdb_os.homedir(), 'Library', 'Application Support', 'PremiereDataBase');
    } else {
        // Windows
        return pdb_path.join(process.env.APPDATA || pdb_os.homedir(), 'PremiereDataBase');
    }
}

function pdb_getSettingsFilePath() {
    return pdb_path.join(pdb_getSettingsDir(), 'settings.json');
}

function pdb_getFavoritesFilePath() {
    return pdb_path.join(pdb_getSettingsDir(), 'favorites.json');
}

/**
 * Read settings from JSON file
 * Returns null if file doesn't exist or is invalid
 */
function pdb_readSettingsFromFile() {
    try {
        const filePath = pdb_getSettingsFilePath();
        if (pdb_fs.existsSync(filePath)) {
            const data = pdb_fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Error reading settings file:', e);
    }
    return null;
}

/**
 * Write settings to JSON file
 */
function pdb_writeSettingsToFile(settingsData) {
    try {
        const dir = pdb_getSettingsDir();
        if (!pdb_fs.existsSync(dir)) {
            pdb_fs.mkdirSync(dir, { recursive: true });
        }
        const filePath = pdb_getSettingsFilePath();
        pdb_fs.writeFileSync(filePath, JSON.stringify(settingsData, null, 2), 'utf8');
        console.log('Settings saved to file:', filePath);
        return true;
    } catch (e) {
        console.error('Error writing settings file:', e);
        return false;
    }
}

/**
 * Read favorites from JSON file
 */
function pdb_readFavoritesFromFile() {
    try {
        const filePath = pdb_getFavoritesFilePath();
        if (pdb_fs.existsSync(filePath)) {
            const data = pdb_fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {
        console.error('Error reading favorites file:', e);
    }
    return null;
}

/**
 * Write favorites to JSON file
 */
function pdb_writeFavoritesToFile(favoritesArray) {
    try {
        const dir = pdb_getSettingsDir();
        if (!pdb_fs.existsSync(dir)) {
            pdb_fs.mkdirSync(dir, { recursive: true });
        }
        const filePath = pdb_getFavoritesFilePath();
        pdb_fs.writeFileSync(filePath, JSON.stringify(favoritesArray, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Error writing favorites file:', e);
        return false;
    }
}

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

function pdb_renderLanguageSelectOptions() {
    const languageSelect = document.getElementById('languageSelect');
    const settingsLanguageSelect = document.getElementById('settingsLanguageSelect');
    const selects = [languageSelect, settingsLanguageSelect].filter(Boolean);

    // Keep both selectors perfectly aligned with the same native-name ordered options.
    selects.forEach((select) => {
        select.innerHTML = LANGUAGE_OPTIONS.map((option) => {
            return `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`;
        }).join('');
    });
}

function changeLanguage(lang) {
    if (translations[lang]) {
        // Preserve unsaved database root edits before re-rendering translated controls.
        settings.databaseRoots = pdb_collectDatabaseRootsFromSettingsUI();
        currentLang = lang;
        settings.language = lang;
        settings = pdb_normalizeSettings(settings);
        updateUILanguage();
        pdb_renderDatabaseRootsSettings();
        saveSettings();
    }
}

function addToDatabase() {
    const activeDatabaseRoot = pdb_getActiveDatabaseRoot();

    // Force the user to choose the target database when several roots exist.
    if (!activeDatabaseRoot) {
        showStatus(pdb_hasConfiguredDatabases() ? t('status.selectDatabaseForAdd') : t('empty.configureDatabase'), 'error');
        return;
    }

    showProgress(t('status.scanning')); // "Scanning..." or generic loading

    // Get selected items from Premiere
    csInterface.evalScript('getSelectedProjectItems()', async (result) => {
        // Debug logging
        console.log('Selected items result:', result);

        let items;
        try {
            items = JSON.parse(result);
        } catch (e) {
            hideProgress();
            // Show the raw result if it's not JSON (likely an error message)
            showStatus('Premiere Error: ' + result, 'error');
            console.error('Parse error:', e, result);
            return;
        }

        if (items && items.error) {
            hideProgress();
            showStatus('Premiere Error: ' + items.error, 'error');
            return;
        }

        try {
            if (!items || !Array.isArray(items) || items.length === 0) {
                hideProgress();
                showStatus(t('empty.noFilesFound'), 'info'); // Or specific message "No selection"
                return;
            }

            showProgress(t('status.importing')); // Reuse importing message or add "Copying..."

            const filesToCopy = items.map(item => ({
                name: item.name,
                source: item.path,
                destination: activeDatabaseRoot.path + '/' + (item.binPath ? item.binPath + '/' : '') + item.name
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
// Render the editable list of named database roots in the settings panel.
function pdb_renderDatabaseRootsSettings() {
    const databaseRootsList = document.getElementById('databaseRootsList');
    if (!databaseRootsList) {
        return;
    }

    const rootRows = (settings.databaseRoots || []).map((root) => `
        <div class="database-root-row" data-root-id="${escapeHtml(root.id)}">
            <div class="database-root-row-header">
                <span class="database-root-caption">${escapeHtml(root.name || pdb_getDefaultDatabaseName(root.path))}</span>
                <button class="database-root-remove-btn" type="button" data-root-id="${escapeHtml(root.id)}">
                    ${escapeHtml(t('settings.removeDatabaseRoot'))}
                </button>
            </div>
            <input type="text" class="database-root-name-input" value="${escapeHtml(root.name)}" placeholder="${escapeHtml(t('settings.databaseNamePlaceholder'))}">
            <div class="folder-input-group">
                <input type="text" class="database-root-path-input" value="${escapeHtml(root.path)}" placeholder="${escapeHtml(t('settings.databasePathPlaceholder'))}">
                <button class="browse-btn database-root-browse-btn" type="button" data-root-id="${escapeHtml(root.id)}" title="${escapeHtml(t('settings.databasePath'))}">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </button>
            </div>
        </div>
    `).join('');

    databaseRootsList.innerHTML = rootRows || `<p class="setting-description">${escapeHtml(t('empty.configureDatabase'))}</p>`;
}

// Read the database root rows from the settings UI and normalize their values.
function pdb_collectDatabaseRootsFromSettingsUI() {
    const rootRows = document.querySelectorAll('#databaseRootsList .database-root-row');
    const databaseRoots = [];

    rootRows.forEach((row) => {
        const nameInput = row.querySelector('.database-root-name-input');
        const pathInput = row.querySelector('.database-root-path-input');
        const rawPath = pathInput ? pathInput.value.trim() : '';

        if (!rawPath) {
            return;
        }

        const normalizedPath = rawPath.replace(/\\/g, '/').replace(/\/+$/, '');
        databaseRoots.push({
            id: row.getAttribute('data-root-id') || pdb_generateDatabaseId(),
            name: pdb_getSafeDatabaseName(nameInput ? nameInput.value : '', normalizedPath),
            path: normalizedPath
        });
    });

    return databaseRoots;
}

// Add a new editable database root row with a generated id.
function pdb_addDatabaseRootRow() {
    settings.databaseRoots = [...pdb_normalizeDatabaseRoots({
        databaseRoots: pdb_collectDatabaseRootsFromSettingsUI()
    }), {
        id: pdb_generateDatabaseId(),
        name: '',
        path: ''
    }];
    pdb_renderDatabaseRootsSettings();
}

// Remove one configured root from the settings list.
function pdb_removeDatabaseRoot(rootId) {
    settings.databaseRoots = pdb_normalizeDatabaseRoots({
        databaseRoots: pdb_collectDatabaseRootsFromSettingsUI().filter((root) => root.id !== rootId)
    });
    pdb_ensureNavigationIsValid();
    pdb_renderDatabaseRootsSettings();
}

// Ask Premiere for a folder and assign it to the targeted database row.
function pdb_browseForDatabaseRoot(rootId) {
    csInterface.evalScript('DataBase_selectFolder()', (result) => {
        if (!result || result === 'null') {
            return;
        }

        const targetRow = document.querySelector(`#databaseRootsList .database-root-row[data-root-id="${CSS.escape(rootId)}"]`);
        if (!targetRow) {
            return;
        }

        const pathInput = targetRow.querySelector('.database-root-path-input');
        const nameInput = targetRow.querySelector('.database-root-name-input');

        if (pathInput) {
            pathInput.value = result;
        }

        if (nameInput && !nameInput.value.trim()) {
            nameInput.value = pdb_getDefaultDatabaseName(result);
        }
    });
}

function loadSettings() {
    let migratedFromLocalStorage = false;

    // First, try to load from JSON file (persistent across Premiere versions)
    const fileSettings = pdb_readSettingsFromFile();
    if (fileSettings) {
        settings = pdb_normalizeSettings(fileSettings);
        currentLang = translations[settings.language] ? settings.language : 'en';
        console.log('Settings loaded from file:', pdb_getSettingsFilePath());
    } else {
        // Fallback: migrate from localStorage (one-time migration)
        const saved = localStorage.getItem('databaseSettings');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                settings = pdb_normalizeSettings(parsed);
                currentLang = translations[settings.language] ? settings.language : 'en';
                migratedFromLocalStorage = true;
                console.log('Settings migrated from localStorage');
            } catch (e) {
                console.error('Error loading settings from localStorage:', e);
            }
        } else {
            settings = pdb_normalizeSettings({});
        }
    }

    // Load favorites from file or localStorage
    const fileFavorites = pdb_readFavoritesFromFile();
    if (fileFavorites) {
        favorites = new Set(fileFavorites);
        console.log('Favorites loaded from file');
    } else {
        // Fallback: migrate from localStorage
        const savedFavorites = localStorage.getItem('databaseFavorites');
        if (savedFavorites) {
            try {
                favorites = new Set(JSON.parse(savedFavorites));
                migratedFromLocalStorage = true;
                console.log('Favorites migrated from localStorage');
            } catch (e) {
                console.error('Error loading favorites from localStorage:', e);
            }
        }
    }

    // If we migrated from localStorage, save to file for future use
    if (migratedFromLocalStorage) {
        pdb_writeSettingsToFile(settings);
        pdb_writeFavoritesToFile([...favorites]);
        console.log('Migration complete: settings saved to persistent file storage');
    }

    // Update UI with settings
    pdb_renderDatabaseRootsSettings();
    document.getElementById('consolidateOnImport').checked = settings.consolidateOnImport || false;
    document.getElementById('consolidationDepth').value = settings.consolidationDepth || 0;
    document.getElementById('flattenImportPath').checked = settings.flattenImportPath || false;
    document.getElementById('bannedExtensions').value = (settings.bannedExtensions || []).join('\n');
    document.getElementById('excludedFolders').value = (settings.excludedFolderNames || []).join('\n');

    // Language selectors
    document.getElementById('languageSelect').value = currentLang;
    document.getElementById('settingsLanguageSelect').value = currentLang;

    // Update database path display
    updateDatabasePathDisplay();

    // Update language
    updateUILanguage();

    // Update item size
    if (settings.itemSize !== undefined) {
        document.getElementById('sizeSlider').value = settings.itemSize;
        updateItemSize(settings.itemSize);
    }

    // Debug mode
    document.getElementById('debugMode').checked = settings.debugMode || false;
    updateDebugPanelVisibility();

    // Show Waveforms toggle
    const showWaveformsCheckbox = document.getElementById('showWaveformsCheckbox');
    if (showWaveformsCheckbox) {
        showWaveformsCheckbox.checked = settings.showWaveforms !== false;
    }

    // Show Video Waveforms toggle
    const showVideoWaveformsCheckbox = document.getElementById('showVideoWaveformsCheckbox');
    if (showVideoWaveformsCheckbox) {
        showVideoWaveformsCheckbox.checked = settings.showVideoWaveforms !== false;
    }

    // Hover Preview toggle
    const hoverPreviewCheckbox = document.getElementById('hoverPreviewCheckbox');
    if (hoverPreviewCheckbox) {
        hoverPreviewCheckbox.checked = settings.hoverPreview === true;
    }

    // Update waveform toggle button state
    pdb_updateWaveformToggleButton();

    console.log('Settings loaded successfully');
}

function updateItemSize(percent) {
    percent = parseInt(percent) || 0;

    // Grid View Limits
    const gridMin = 100;
    const gridMax = 300;
    const gridSize = gridMin + ((gridMax - gridMin) * (percent / 100));

    // List View Limits (Icon size)
    const listMin = 32;
    const listMax = 64;
    const listSize = listMin + ((listMax - listMin) * (percent / 100));

    document.documentElement.style.setProperty('--grid-item-size', Math.round(gridSize) + 'px');
    document.documentElement.style.setProperty('--list-icon-size', Math.round(listSize) + 'px');
}

function saveSettings() {
    settings.databaseRoots = pdb_collectDatabaseRootsFromSettingsUI();
    settings.databasePath = settings.databaseRoots[0] ? settings.databaseRoots[0].path : '';
    settings.consolidateOnImport = document.getElementById('consolidateOnImport').checked;
    settings.consolidationDepth = parseInt(document.getElementById('consolidationDepth').value) || 0;
    settings.flattenImportPath = document.getElementById('flattenImportPath').checked;

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
    settings = pdb_normalizeSettings(settings);
    pdb_ensureNavigationIsValid();

    // Debug mode
    settings.debugMode = document.getElementById('debugMode').checked;
    updateDebugPanelVisibility();

    // Show Waveforms
    const showWaveformsCheckbox = document.getElementById('showWaveformsCheckbox');
    if (showWaveformsCheckbox) {
        settings.showWaveforms = showWaveformsCheckbox.checked;
    }

    // Show Video Waveforms
    const showVideoWaveformsCheckbox = document.getElementById('showVideoWaveformsCheckbox');
    if (showVideoWaveformsCheckbox) {
        settings.showVideoWaveforms = showVideoWaveformsCheckbox.checked;
    }

    // Hover Preview
    const hoverPreviewCheckbox = document.getElementById('hoverPreviewCheckbox');
    if (hoverPreviewCheckbox) {
        settings.hoverPreview = hoverPreviewCheckbox.checked;
    }

    // Save to persistent file storage (survives Premiere version upgrades)
    pdb_writeSettingsToFile(settings);

    // Also keep localStorage as backup for legacy support
    localStorage.setItem('databaseSettings', JSON.stringify(settings));

    updateDatabasePathDisplay();
    showStatus(t('status.saved'), 'success');
}

function saveFavorites() {
    // Save to persistent file storage
    pdb_writeFavoritesToFile([...favorites]);

    // Also keep localStorage as backup
    localStorage.setItem('databaseFavorites', JSON.stringify([...favorites]));
}

function updateDebugPanelVisibility() {
    const debugPanel = document.getElementById('debugPanel');
    if (debugPanel) {
        if (settings.debugMode) {
            debugPanel.classList.add('visible');
            console.log('Debug panel enabled');
        } else {
            debugPanel.classList.remove('visible');
        }
    }
}

// Toggle waveforms visibility from toolbar button
function pdb_toggleWaveforms() {
    const waveformsEnabled = settings.showWaveforms !== false;

    // Toggle both audio and video waveforms together
    settings.showWaveforms = !waveformsEnabled;
    settings.showVideoWaveforms = !waveformsEnabled;

    // Update button state
    pdb_updateWaveformToggleButton();

    // Update settings checkboxes in panel
    const showWaveformsCheckbox = document.getElementById('showWaveformsCheckbox');
    if (showWaveformsCheckbox) {
        showWaveformsCheckbox.checked = settings.showWaveforms;
    }
    const showVideoWaveformsCheckbox = document.getElementById('showVideoWaveformsCheckbox');
    if (showVideoWaveformsCheckbox) {
        showVideoWaveformsCheckbox.checked = settings.showVideoWaveforms;
    }

    // Save to persistent file storage
    pdb_writeSettingsToFile(settings);
    localStorage.setItem('databaseSettings', JSON.stringify(settings));

    // Re-render files to show/hide waveforms
    renderFiles();
}

// Update waveform toggle button active state
function pdb_updateWaveformToggleButton() {
    const btn = document.getElementById('waveformToggleBtn');
    if (btn) {
        const waveformsEnabled = settings.showWaveforms !== false;
        btn.classList.toggle('active', waveformsEnabled);
    }
}

function clearDebugLogs() {
    const debugContent = document.getElementById('debugContent');
    if (debugContent) {
        debugContent.innerHTML = '';
        console.log('Debug logs cleared');
    }
}

function updateDatabasePathDisplay() {
    const pathEl = document.getElementById('databasePath');
    if (pdb_hasConfiguredDatabases()) {
        const databaseCount = settings.databaseRoots.length;
        const summaryLabel = databaseCount === 1
            ? settings.databaseRoots[0].name
            : databaseCount + ' databases';

        pathEl.textContent = summaryLabel;
        pathEl.title = settings.databaseRoots.map((root) => `${root.name}: ${root.path}`).join('\n');
    } else {
        pathEl.textContent = t('labels.notConfigured');
        pathEl.title = '';
    }
}

// ============================================================================
// UPDATE SYSTEM
// ============================================================================
function getAppVersion() {
    try {
        var extensionPath = csInterface.getSystemPath(SystemPath.EXTENSION);
        var manifestPath = pdb_path.join(extensionPath, 'CSXS', 'manifest.xml');

        if (pdb_fs.existsSync(manifestPath)) {
            var content = pdb_fs.readFileSync(manifestPath, 'utf8');
            var match = content.match(/ExtensionBundleVersion="([^"]+)"/);
            if (match && match[1]) {
                CURRENT_VERSION = match[1];
                console.log('Detected version:', CURRENT_VERSION);
            }
        }
    } catch (e) {
        console.error('Error reading manifest:', e);
    }

    // Update settings UI
    var versionEl = document.getElementById('versionInfo');
    if (versionEl) {
        versionEl.textContent = 'v' + CURRENT_VERSION;
    }
}

function checkForUpdates() {
    var url = 'https://api.github.com/repos/' + GITHUB_REPO + '/releases/latest';

    var options = {
        headers: {
            'User-Agent': 'Premiere-Database-Extension'
        }
    };

    pdb_https.get(url, options, function (res) {
        var body = '';

        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            try {
                if (res.statusCode === 200) {
                    var data = JSON.parse(body);
                    var latestVersion = data.tag_name;

                    // Remove 'v' prefix if present
                    if (latestVersion && latestVersion.charAt(0) === 'v') {
                        latestVersion = latestVersion.substring(1);
                    }

                    console.log('Latest Github version:', latestVersion);

                    if (compareVersions(latestVersion, CURRENT_VERSION) > 0) {
                        showUpdateBanner(data.html_url);
                        console.log('Update available:', latestVersion);
                    } else {
                        console.log('App is up to date');
                    }
                } else {
                    console.log('Github API returned:', res.statusCode);
                }
            } catch (e) {
                console.error('Error parsing Github response:', e);
            }
        });
    }).on('error', function (e) {
        console.error('Error checking updates:', e);
    });
}

function compareVersions(v1, v2) {
    if (!v1 || !v2) return 0;

    var parts1 = v1.split('.').map(Number);
    var parts2 = v2.split('.').map(Number);

    for (var i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        var p1 = parts1[i] || 0;
        var p2 = parts2[i] || 0;

        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }

    return 0;
}

function showUpdateBanner(downloadUrl) {
    var banner = document.getElementById('updateBanner');
    if (banner) {
        banner.style.display = 'block';
        banner.onclick = function () {
            csInterface.openURLInDefaultBrowser(downloadUrl);
        };
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
    if (!pdb_getActiveDatabaseRoot()) {
        showStatus(t('status.selectDatabaseFirst'), 'warning');
        return;
    }

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
    if (!pdb_hasConfiguredDatabases()) {
        showStatus(t('empty.configureDatabase'), 'warning');
        openSettings();
        return;
    }

    showProgress(t('status.scanning'));
    updateProgress(0);

    try {
        const combinedResults = {
            files: [],
            folders: []
        };

        settings.databaseRoots.forEach((root, index) => {
            const result = performDatabaseScan(root.path, {
                bannedExtensions: settings.bannedExtensions,
                excludedFolderNames: settings.excludedFolderNames,
                rootId: root.id,
                rootName: root.name
            });

            combinedResults.files.push(...(result.files || []));
            combinedResults.folders.push(...(result.folders || []));
            updateProgress(Math.round(((index + 1) / settings.databaseRoots.length) * 100));
        });

        allFiles = combinedResults.files;
        allFolders = combinedResults.folders;
        pdb_ensureNavigationIsValid();

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
    if (typeof scanDatabase === 'function') {
        return scanDatabase(rootPath, options);
    }

    console.error("scanDatabase function not found in imported fileOperations");
    return { files: [], folders: [] };
}

// Direct scanning implementation using Node.js fs
function scanDatabaseDirect(rootPath, options = {}) {
    const fs = require('fs');
    const path = require('path');

    const {
        bannedExtensions = [],
        excludedFolderNames = ['.git', 'node_modules', '__MACOSX', '.DS_Store'],
        rootId = '',
        rootName = ''
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

    const normalizedRootPath = toForwardSlashes(rootPath);
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
                            relativePath: toForwardSlashes(itemRelative),
                            rootId: rootId,
                            rootName: rootName,
                            rootPath: normalizedRootPath
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
                                rootId: rootId,
                                rootName: rootName,
                                rootPath: normalizedRootPath,
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

    // Filter by active database root when browsing inside one database.
    if (currentDatabaseId && !pdb_isGroupedHomeView()) {
        result = result.filter((file) => file.rootId === currentDatabaseId);
    }

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
            file.folderPath.toLowerCase().includes(query) ||
            (file.rootName || '').toLowerCase().includes(query)
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
// Return only the folders directly inside the requested parent path for one database root.
function pdb_getDirectFolders(rootId, parentPath) {
    return allFolders.filter((folder) => {
        if (folder.rootId !== rootId) {
            return false;
        }

        if (!parentPath) {
            return !folder.relativePath.includes('/');
        }

        const folderParentPath = folder.relativePath.substring(0, folder.relativePath.lastIndexOf('/'));
        return folderParentPath === parentPath;
    });
}

// Return the folders currently visible on the grouped home screen.
function pdb_getHomeFolders() {
    return allFolders.filter((folder) => !folder.relativePath.includes('/'));
}

// Recreate the inline expanded folder blocks after a full re-render.
function pdb_restoreExpandedFolderState(visibleFolders) {
    if (searchQuery || currentViewMode !== 'list') {
        return;
    }

    visibleFolders.forEach((folder) => {
        const folderKey = pdb_buildFolderKey(folder.rootId, folder.relativePath);
        if (!expandedFolders.has(folderKey)) {
            return;
        }

        const folderEl = document.querySelector(`.file-item.folder[data-path="${CSS.escape(folderKey)}"]`);
        if (!folderEl) {
            return;
        }

        const expandIcon = folderEl.querySelector('.folder-expand');
        if (expandIcon) {
            expandIcon.textContent = '▼';
        }

        const contentHtml = renderExpandedFolderContents(folderKey);
        if (!contentHtml) {
            return;
        }

        const contentContainer = document.createElement('div');
        contentContainer.className = 'expanded-folder-content';
        contentContainer.setAttribute('data-parent-folder', folderKey);
        contentContainer.innerHTML = contentHtml;

        folderEl.insertAdjacentElement('afterend', contentContainer);
        attachEventListenersToElement(contentContainer);
        restoreNestedExpandedFolders(folderKey);
    });
}

// Render the grouped root view where each configured database keeps its own visual section.
function pdb_renderDatabaseSections(browser) {
    const sectionHtml = settings.databaseRoots.map((root) => {
        const topFolders = pdb_getDirectFolders(root.id, '');
        const topFiles = filteredFiles.filter((file) => file.rootId === root.id && file.folderPath === '');
        const contentPieces = [];

        topFolders.forEach((folder) => {
            contentPieces.push(renderFolderItem(folder));
        });

        topFiles.forEach((file) => {
            contentPieces.push(renderFileItem(file, false));
        });

        if (contentPieces.length === 0) {
            contentPieces.push(`<div class="database-section-empty">${escapeHtml(showFavoritesOnly ? t('empty.noFavorites') : t('empty.noFilesFound'))}</div>`);
        }

        const contentClassName = currentViewMode === 'grid'
            ? 'database-section-content database-section-grid'
            : 'database-section-content file-list';

        return `
            <section class="database-section" data-root-id="${escapeHtml(root.id)}">
                <div class="database-section-header" title="${escapeHtml(root.path)}">
                    <span class="database-section-name">${escapeHtml(root.name)}</span>
                </div>
                <div class="${contentClassName}">
                    ${contentPieces.join('')}
                </div>
            </section>
        `;
    }).join('');

    browser.innerHTML = `<div class="database-sections">${sectionHtml}</div>`;

    attachFileEventListeners();
    pdb_restoreExpandedFolderState(pdb_getHomeFolders());
}

function renderFiles() {
    const browser = document.getElementById('fileBrowser');
    const hasConfiguredDatabases = pdb_hasConfiguredDatabases();

    if (!hasConfiguredDatabases) {
        browser.innerHTML = `
            <div class="empty-state">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
                <p>${escapeHtml(t('empty.configureDatabase'))}</p>
            </div>
        `;
        return;
    }

    // Show the grouped home screen only when we are not inside a specific database or a search result view.
    if (pdb_isGroupedHomeView()) {
        pdb_renderDatabaseSections(browser);

        if (settings.showWaveforms !== false) {
            if (typeof debugLog === 'function') debugLog('Scheduling waveform initialization (50ms delay)...', 'info');
            setTimeout(initWaveforms, 50);
        }
        return;
    }

    const currentFolders = pdb_getDirectFolders(currentDatabaseId, currentPath);

    // When searching, show all matching files from all subfolders
    // When not searching, show only files in current folder OR expanded folders
    let filesToShow;
    if (searchQuery) {
        // Show all filtered files when searching
        filesToShow = filteredFiles;
    } else {
        // Show files in current folder + files in expanded folders
        filesToShow = filteredFiles.filter(file => {
            if (file.rootId !== currentDatabaseId) {
                return false;
            }

            // In current folder
            if (file.folderPath === currentPath) return true;

            // In an expanded folder
            for (const expandedKey of expandedFolders) {
                const expandedFolder = pdb_getFolderByKey(expandedKey);
                if (expandedFolder && expandedFolder.rootId === currentDatabaseId && file.folderPath === expandedFolder.relativePath) {
                    return true;
                }
            }
            return false;
        });
    }

    if (filesToShow.length === 0 && currentFolders.length === 0) {
        // Show empty state
        let emptyMessage = t('empty.noFilesFound');
        if (!hasConfiguredDatabases) {
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
            // Note: expanded content is now inserted after initial render (see below)
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
    pdb_restoreExpandedFolderState(currentFolders);

    // Initialize waveforms for audio files
    // List view: uses regular waveform-wrapper
    // Grid view: uses gallery-waveform-wrapper (if enabled)
    if (settings.showWaveforms !== false) {
        if (typeof debugLog === 'function') debugLog('Scheduling waveform initialization (50ms delay)...', 'info');
        setTimeout(initWaveforms, 50);
    }
}

// Render contents of an expanded folder (non-recursive for inline content)
// Nested expanded folders are handled separately by expandFolder calls
function renderExpandedFolderContents(folderKey) {
    const folder = pdb_getFolderByKey(folderKey);
    if (!folder) {
        return '';
    }

    let html = '';
    const depth = folder.relativePath.split('/').length - (currentPath ? currentPath.split('/').length : 0);
    const indent = depth * 20; // 20px per level

    // Get subfolders of this folder
    const subFolders = allFolders.filter(f => {
        if (f.rootId !== folder.rootId) {
            return false;
        }

        const parentPath = f.relativePath.substring(0, f.relativePath.lastIndexOf('/'));
        return parentPath === folder.relativePath;
    });

    // Render subfolders (but NOT their nested content - that's handled by expandFolder)
    for (const subfolder of subFolders) {
        html += renderFolderItem(subfolder, indent);
        // Note: nested expanded content is handled separately, not inline
    }

    // Render files in this folder
    const files = filteredFiles.filter(f => f.rootId === folder.rootId && f.folderPath === folder.relativePath);
    for (const file of files) {
        html += renderFileItem(file, false, indent);
    }

    return html;
}

// After inserting expanded content, also expand any nested folders that were previously expanded
function restoreNestedExpandedFolders(parentFolderKey) {
    const parentFolder = pdb_getFolderByKey(parentFolderKey);
    if (!parentFolder) {
        return;
    }

    // Find all expanded folders that are direct children of this parent
    for (const folderKey of expandedFolders) {
        const folder = pdb_getFolderByKey(folderKey);
        if (!folder || folder.rootId !== parentFolder.rootId) {
            continue;
        }

        // Check if this is a direct child of the parent
        if (folder.relativePath.startsWith(parentFolder.relativePath + '/')) {
            const remainingPath = folder.relativePath.substring(parentFolder.relativePath.length + 1);
            // If there's no more slashes, it's a direct child
            if (!remainingPath.includes('/')) {
                const folderEl = document.querySelector(`.file-item.folder[data-path="${CSS.escape(folderKey)}"]`);
                if (folderEl) {
                    // Update the expand icon
                    const expandIcon = folderEl.querySelector('.folder-expand');
                    if (expandIcon) {
                        expandIcon.textContent = '▼';
                    }

                    // Get the content HTML for this subfolder
                    const contentHtml = renderExpandedFolderContents(folderKey);
                    if (contentHtml) {
                        const contentContainer = document.createElement('div');
                        contentContainer.className = 'expanded-folder-content';
                        contentContainer.setAttribute('data-parent-folder', folderKey);
                        contentContainer.innerHTML = contentHtml;

                        folderEl.insertAdjacentElement('afterend', contentContainer);
                        attachEventListenersToElement(contentContainer);

                        // Initialize waveforms for this container
                        if (currentViewMode === 'list' && settings.showWaveforms !== false) {
                            setTimeout(() => initWaveformsInElement(contentContainer), 50);
                        }

                        // Recursively restore nested expanded folders
                        restoreNestedExpandedFolders(folderKey);
                    }
                }
            }
        }
    }
}

function renderFolderItem(folder, indent = 0) {
    const folderKey = pdb_buildFolderKey(folder.rootId, folder.relativePath);
    const isExpanded = expandedFolders.has(folderKey);
    const expandIcon = isExpanded ? '▼' : '▶';
    // Hide expand icon in Grid view
    const expandIconHtml = currentViewMode === 'list'
        ? `<span class="folder-expand" data-folder="${escapeHtml(folderKey)}">${expandIcon}</span>`
        : '';

    const indentStyle = indent > 0 ? `style="margin-left: ${indent}px"` : '';

    return `
        <div class="file-item folder" data-path="${escapeHtml(folderKey)}" data-type="folder" data-root-id="${escapeHtml(folder.rootId)}" data-relative-path="${escapeHtml(folder.relativePath)}" data-absolute-path="${escapeHtml(folder.path)}" ${indentStyle}>
            ${expandIconHtml}
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
    let folderDisplay = file.folderPath || t('labels.root');
    if (showFullPath) {
        // Show full path when searching
        folderDisplay = pdb_getFileLocationLabel(file);
    }

    const indentStyle = indent > 0 ? `style="margin-left: ${indent}px"` : '';

    // Add play button and waveform for audio AND video files
    const isAudio = file.type === 'audio';
    const isVideo = file.type === 'video';
    const showAudioWaveforms = settings.showWaveforms !== false;
    const showVideoWaveforms = settings.showVideoWaveforms !== false;

    // Determine if we should show waveform for this file
    const shouldShowWaveform = (isAudio && showAudioWaveforms) || (isVideo && showVideoWaveforms);
    const hasPlayableAudio = isAudio || isVideo;

    const playBtnHtml = hasPlayableAudio ? `
        <button class="audio-play-btn" data-audio-path="${escapeHtml(file.path)}" data-file-type="${file.type}" title="Play/Pause">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <polygon points="5 3 19 12 5 21" fill="currentColor" />
            </svg>
        </button>
    ` : '';

    // List view waveform (wider, full-featured)
    const waveformHtml = (shouldShowWaveform && currentViewMode === 'list') ? `
        <div class="waveform-wrapper ${file.type}-waveform" data-audio-path="${escapeHtml(file.path)}" data-file-type="${file.type}">
            <div class="waveform-container" id="waveform-${generateSafeId(file.path)}"></div>
        </div>
    ` : '';

    // Gallery view waveform (compact, under filename, for audio and video files)
    const galleryWaveformHtml = (shouldShowWaveform && currentViewMode === 'grid') ? `
        <div class="gallery-waveform-wrapper" data-audio-path="${escapeHtml(file.path)}" data-file-type="${file.type}">
            <div class="waveform-container gallery-waveform" id="gallery-waveform-${generateSafeId(file.path)}"></div>
            <button class="gallery-play-btn" data-audio-path="${escapeHtml(file.path)}" title="Play/Pause">
                <svg class="play-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <polygon points="5 3 19 12 5 21" fill="currentColor" />
                </svg>
                <svg class="pause-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:none;">
                    <rect x="6" y="4" width="4" height="16" fill="currentColor" />
                    <rect x="14" y="4" width="4" height="16" fill="currentColor" />
                </svg>
            </button>
        </div>
    ` : '';

    return `
        <div class="file-item ${file.type} ${isSelected ? 'selected' : ''}" data-path="${escapeHtml(file.path)}" data-type="file" data-root-id="${escapeHtml(file.rootId || '')}" ${indentStyle}>
            <input type="checkbox" class="file-checkbox" ${isSelected ? 'checked' : ''}>
            <div class="file-icon ${file.type}">
                ${iconHtml}
            </div>
            <div class="file-info">
                <div class="file-name" title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</div>
                <div class="file-path">📁 ${escapeHtml(folderDisplay)}</div>
                ${galleryWaveformHtml}
            </div>
            ${waveformHtml}
            ${playBtnHtml}
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
            // Fix path for CSS url() usage
            let safePath = filePath.replace(/\\/g, '/'); // Normalize slashes
            safePath = safePath.replace(/'/g, "\\'");   // Escape quotes

            // Add protocol if not present
            if (!safePath.startsWith('file://')) {
                // Ensure Windows drive letters (C:/) get 3 slashes (file:///C:/)
                // and Mac paths (/) get 2 slashes (file:///)
                if (safePath.startsWith('/')) {
                    safePath = 'file://' + safePath;
                } else {
                    safePath = 'file:///' + safePath;
                }
            }

            return `<div class="thumbnail-image" style="background-image: url('${safePath}')"></div>`;
        } else if (type === 'video') {
            // Try to show video thumbnail/preview for supported browser formats
            // Common web-supported formats: mp4, webm, mov (h.264)
            const ext = filePath.split('.').pop().toLowerCase();
            const supportedVideoExts = ['mp4', 'webm', 'mov', 'm4v'];

            if (supportedVideoExts.includes(ext)) {
                // Use video tag with preload metadata to show first frame
                // Muted is required, will be synced with waveform playback
                return `<video class="thumbnail-video" src="${filePath}" data-video-path="${escapeHtml(filePath)}" preload="metadata" muted></video>`;
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
        // Single click behavior
        el.addEventListener('click', (e) => {
            // Ignore if clicking on expand icon (handled above)
            if (e.target.closest('.folder-expand')) return;

            const relativePath = el.getAttribute('data-relative-path') || '';
            const rootId = el.getAttribute('data-root-id') || '';
            const folderKey = el.getAttribute('data-path');

            if (currentViewMode === 'grid') {
                // In Grid View, single click navigates into folder
                navigateToFolder(relativePath, rootId);
            } else {
                // In List View, single click toggles expand
                toggleFolderExpand(folderKey);
            }
        });

        // Double click - navigate into folder
        el.addEventListener('dblclick', () => {
            const relativePath = el.getAttribute('data-relative-path') || '';
            const rootId = el.getAttribute('data-root-id') || '';
            navigateToFolder(relativePath, rootId);
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



    // Waveform container clicks - stop propagation to prevent file selection
    document.querySelectorAll('.waveform-wrapper, .gallery-waveform-wrapper').forEach(wrapper => {
        wrapper.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    // Gallery play/pause buttons
    document.querySelectorAll('.gallery-play-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const audioPath = btn.getAttribute('data-audio-path');
            const ws = wavesurferInstances.get(audioPath);
            if (ws) {
                if (ws.isPlaying()) {
                    ws.pause();
                    btn.classList.remove('playing');
                } else {
                    ws.play();
                    btn.classList.add('playing');
                }
            }
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

    // Audio play buttons
    document.querySelectorAll('.audio-play-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const audioPath = btn.getAttribute('data-audio-path');
            toggleAudioPlayback(audioPath, btn);
        });
    });

    // Context menu
    document.querySelectorAll('.file-item').forEach(el => {
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e, {
                itemPath: el.getAttribute('data-path') || '',
                type: el.getAttribute('data-type') || '',
                rootId: el.getAttribute('data-root-id') || '',
                relativePath: el.getAttribute('data-relative-path') || '',
                absolutePath: el.getAttribute('data-type') === 'folder'
                    ? (el.getAttribute('data-absolute-path') || '')
                    : (el.getAttribute('data-path') || '')
            });
        });
    });

    // =========================================================================
    // DRAG AND DROP - Files can be dragged to folders
    // =========================================================================

    // Make files draggable
    document.querySelectorAll('.file-item[data-type="file"]').forEach(el => {
        el.setAttribute('draggable', 'true');

        el.addEventListener('dragstart', (e) => {
            const filePath = el.getAttribute('data-path');

            // If this file is not selected, select it (and only it)
            if (!selectedFiles.has(filePath)) {
                selectedFiles.clear();
                selectedFiles.add(filePath);
                updateSelectionUI();
                renderFiles();
            }

            // Store all selected files for multi-drag
            const filesToDrag = Array.from(selectedFiles);
            e.dataTransfer.setData('application/json', JSON.stringify(filesToDrag));
            e.dataTransfer.effectAllowed = 'move';

            // Add dragging class to all selected files
            selectedFiles.forEach(path => {
                const fileEl = document.querySelector(`.file-item[data-path="${CSS.escape(path)}"]`);
                if (fileEl) fileEl.classList.add('dragging');
            });

            // Create custom drag image showing count
            pdb_createDragGhost(filesToDrag.length, e);
        });

        el.addEventListener('dragend', () => {
            // Remove dragging class from all files
            document.querySelectorAll('.file-item.dragging').forEach(item => {
                item.classList.remove('dragging');
            });
            // Remove any drop target highlights
            document.querySelectorAll('.file-item.drop-target').forEach(item => {
                item.classList.remove('drop-target');
            });
            // Remove drag ghost
            pdb_removeDragGhost();
        });
    });

    // Make folders drop targets
    document.querySelectorAll('.file-item.folder').forEach(el => {
        el.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            el.classList.add('drop-target');
        });

        el.addEventListener('dragleave', (e) => {
            // Only remove if we're actually leaving this element
            if (!el.contains(e.relatedTarget)) {
                el.classList.remove('drop-target');
            }
        });

        el.addEventListener('drop', (e) => {
            e.preventDefault();
            el.classList.remove('drop-target');

            try {
                const data = e.dataTransfer.getData('application/json');
                if (!data) return;

                const filesToMove = JSON.parse(data);
                const destFolderPath = el.getAttribute('data-path');

                pdb_moveFilesToFolder(filesToMove, destFolderPath);
            } catch (err) {
                console.error('Drop error:', err);
                showStatus('Error processing drop: ' + err.message, 'error');
            }
        });
    });

    // =========================================================================
    // HOVER PREVIEW (Video & Audio)
    // =========================================================================
    // Video Hover
    document.querySelectorAll('.file-item.video').forEach(el => {
        el.addEventListener('mouseenter', () => {
            // double check dynamic setting
            if (!settings.hoverPreview) return;

            const videoEl = el.querySelector('video.thumbnail-video');
            if (videoEl) {
                // Stop any other playing audio/video
                const audioPlayer = document.getElementById('audioPlayer');
                if (audioPlayer && !audioPlayer.paused) audioPlayer.pause();

                // Pause all wavesurfers
                if (typeof wavesurferInstances !== 'undefined') {
                    for (const ws of wavesurferInstances.values()) {
                        if (ws.isPlaying()) ws.pause();
                    }
                }

                videoEl.currentTime = 0;
                videoEl.muted = false; // Unmute for hover preview
                videoEl.play().catch(e => { /* ignore play errors */ });
                el.classList.add('hover-playing');
            }
        });

        el.addEventListener('mouseleave', () => {
            const videoEl = el.querySelector('video.thumbnail-video');
            if (videoEl) {
                videoEl.pause();
                videoEl.currentTime = 0;
                videoEl.muted = true; // Reset mute
                el.classList.remove('hover-playing');
            }
        });
    });

    // Audio Hover
    document.querySelectorAll('.file-item.audio').forEach(el => {
        let hoverTimeout;

        el.addEventListener('mouseenter', () => {
            if (!settings.hoverPreview) return;

            // Small delay to avoid playing when just sweeping over files
            hoverTimeout = setTimeout(() => {
                const audioPath = el.getAttribute('data-path');

                // Check if we have a wavesurfer instance
                if (typeof wavesurferInstances !== 'undefined' && wavesurferInstances.has(audioPath)) {
                    const ws = wavesurferInstances.get(audioPath);
                    ws.seekTo(0); // Seek to start
                    ws.play();
                } else {
                    // Use global audio player
                    const audioPlayer = document.getElementById('audioPlayer');

                    // Stop any other playing
                    if (currentlyPlayingAudio && currentlyPlayingAudio !== audioPath) {
                        if (wavesurferInstances.has(currentlyPlayingAudio)) {
                            wavesurferInstances.get(currentlyPlayingAudio).pause();
                        } else {
                            audioPlayer.pause();
                        }
                    }

                    // Helper to get file URL or raw path
                    const src = (typeof toFileUrl === 'function') ? toFileUrl(audioPath) : audioPath;
                    audioPlayer.src = src;
                    audioPlayer.currentTime = 0;

                    audioPlayer.play().then(() => {
                        currentlyPlayingAudio = audioPath;
                        updatePlayButtonState(audioPath, true);
                    }).catch(e => console.error('Hover audio error:', e));
                }
                el.classList.add('hover-playing');
            }, 100); // 100ms delay
        });

        el.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimeout);

            const audioPath = el.getAttribute('data-path');

            if (typeof wavesurferInstances !== 'undefined' && wavesurferInstances.has(audioPath)) {
                const ws = wavesurferInstances.get(audioPath);
                if (ws.isPlaying()) {
                    ws.pause();
                    ws.seekTo(0);
                }
            } else {
                const audioPlayer = document.getElementById('audioPlayer');
                if (currentlyPlayingAudio === audioPath) {
                    audioPlayer.pause();
                    audioPlayer.currentTime = 0;
                    currentlyPlayingAudio = null;
                    updatePlayButtonState(audioPath, false);
                }
            }
            el.classList.remove('hover-playing');
        });
    });
}

// ============================================================================
// DRAG AND DROP HELPER FUNCTIONS
// ============================================================================

var pdb_dragGhostElement = null;

function pdb_createDragGhost(count, event) {
    pdb_removeDragGhost(); // Clean up any existing ghost

    pdb_dragGhostElement = document.createElement('div');
    pdb_dragGhostElement.className = 'drag-ghost';
    pdb_dragGhostElement.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="2" />
            <polyline points="14 2 14 8 20 8" stroke="currentColor" stroke-width="2" />
        </svg>
        <span>${count} ${count === 1 ? t('labels.files').replace(/s$/, '') : t('labels.files')}</span>
    `;

    document.body.appendChild(pdb_dragGhostElement);

    // Position ghost off-screen initially (browser will use it)
    pdb_dragGhostElement.style.left = '-9999px';
    pdb_dragGhostElement.style.top = '-9999px';

    // Set as drag image
    event.dataTransfer.setDragImage(pdb_dragGhostElement, 20, 20);
}

function pdb_removeDragGhost() {
    if (pdb_dragGhostElement && pdb_dragGhostElement.parentNode) {
        pdb_dragGhostElement.parentNode.removeChild(pdb_dragGhostElement);
    }
    pdb_dragGhostElement = null;
}

function pdb_moveFilesToFolder(filePaths, destFolderKey) {
    if (!filePaths || filePaths.length === 0) {
        console.warn('No files to move');
        return;
    }

    const path = require('path');
    const destinationFolder = pdb_getFolderByKey(destFolderKey);
    if (!destinationFolder) {
        showStatus(t('status.moveFailed'), 'error');
        return;
    }

    // Use the resolved folder record so moving files always targets the correct database root.
    const destFolderAbsolute = destinationFolder.path;
    const destinationRootId = destinationFolder.rootId;

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Stop any audio playback for files being moved
    filePaths.forEach(filePath => {
        if (wavesurferInstances.has(filePath)) {
            const ws = wavesurferInstances.get(filePath);
            ws.pause();
            ws.destroy();
            wavesurferInstances.delete(filePath);
        }
    });

    // Move each file
    for (const sourcePath of filePaths) {
        const sourceFile = allFiles.find((file) => file.path === sourcePath);
        if (!sourceFile) {
            errors.push(`${path.basename(sourcePath)}: ${t('status.moveFailed')}`);
            errorCount++;
            continue;
        }

        if (sourceFile.rootId !== destinationRootId) {
            errors.push(`${sourceFile.name}: ${t('status.crossDatabaseMove')}`);
            errorCount++;
            continue;
        }

        const fileName = path.basename(sourcePath);
        const destPath = path.join(destFolderAbsolute, fileName);

        // Check if destination already has a file with this name
        if (typeof fileExists === 'function' && fileExists(destPath)) {
            errors.push(`${fileName}: file already exists in destination`);
            errorCount++;
            continue;
        }

        // Check we're not moving to the same folder
        const sourceDir = path.dirname(sourcePath);
        if (sourceDir === destFolderAbsolute) {
            errors.push(`${fileName}: already in this folder`);
            errorCount++;
            continue;
        }

        // Perform the move
        const result = movePath(sourcePath, destPath);
        if (result.success) {
            successCount++;
        } else {
            errors.push(`${fileName}: ${result.error}`);
            errorCount++;
        }
    }

    // Clear selection
    selectedFiles.clear();
    updateSelectionUI();

    // Refresh the database view
    scanDatabaseFiles();

    // Show result
    if (errorCount === 0) {
        showStatus(`${successCount} ${successCount === 1 ? 'file' : 'files'} moved successfully`, 'success');
    } else if (successCount === 0) {
        showStatus(`Failed to move files: ${errors[0]}`, 'error');
    } else {
        showStatus(`${successCount} moved, ${errorCount} failed`, 'warning');
    }

    console.log('Move results:', { successCount, errorCount, errors });
}

function initWaveforms() {
    if (typeof debugLog === 'function') debugLog('Starting waveform initialization...', 'info');

    if (typeof WaveSurfer === 'undefined') {
        console.error('WaveSurfer library not loaded!');
        if (typeof debugLog === 'function') debugLog('WaveSurfer library not loaded! Check index.html isolation fix.', 'error');
        return;
    }

    const wrappers = document.querySelectorAll('.waveform-wrapper');
    if (typeof debugLog === 'function') debugLog(`Found ${wrappers.length} waveform wrappers.`, 'info');

    // Determine which instances to keep and which to destroy
    for (const [path, ws] of wavesurferInstances.entries()) {
        // Check both list and gallery wrapper types
        const wrapper = document.querySelector(`.waveform-wrapper[data-audio-path="${CSS.escape(path)}"], .gallery-waveform-wrapper[data-audio-path="${CSS.escape(path)}"]`);

        if (!wrapper) {
            // File no longer visible, destroy instance
            ws.destroy();
            wavesurferInstances.delete(path);
        } else {
            // File still visible, check if we need to re-attach or if it's already okay
            const container = wrapper.querySelector('.waveform-container');
            const currentWrapper = ws.getWrapper();

            if (currentWrapper && !container.contains(currentWrapper.parentNode)) {
                // DOM was replaced but file is still here. 
                // If it's playing, we HAVE to keep it and move it? 
                // Wavesurfer doesn't like moving between shadow roots easily.
                // Simpler: if not playing, destroy and recreate. If playing, try to keep.
                if (!ws.isPlaying()) {
                    ws.destroy();
                    wavesurferInstances.delete(path);
                } else {
                    // Try to re-append the wavesurfer element to the new container
                    container.innerHTML = '';
                    container.appendChild(ws.getWrapper().parentNode.parentNode); // This is tricky with Shadow DOM
                    // Re-creating is safer if we can sync the time.
                }
            }
        }
    }

    // Initialize new instances for both list and gallery waveforms
    const allWrappers = document.querySelectorAll('.waveform-wrapper, .gallery-waveform-wrapper');
    allWrappers.forEach(wrapper => {
        const audioPath = wrapper.getAttribute('data-audio-path');
        const container = wrapper.querySelector('.waveform-container');
        const fileType = wrapper.getAttribute('data-file-type');
        const isGallery = wrapper.classList.contains('gallery-waveform-wrapper');

        if (wavesurferInstances.has(audioPath)) {
            // Check if it's actually in the container
            if (container.children.length === 0) {
                // It was kept but the container is empty (newly rendered)
                // We need to either move the instance or recreate it.
                // For now, let's just recreate everything to be safe, except maybe the playing one.
                const oldWs = wavesurferInstances.get(audioPath);
                const currentTime = oldWs.getCurrentTime();
                const isPlaying = oldWs.isPlaying();

                oldWs.destroy();
                wavesurferInstances.delete(audioPath);

                // Recreate below
            } else {
                return; // Already exists and attached
            }
        }

        try {
            // Gallery waveforms use smaller height (12px) than list view (24px)
            const waveformHeight = isGallery ? 12 : 24;

            const ws = WaveSurfer.create({
                container: container,
                waveColor: '#6d6d6d',
                progressColor: '#0078d4',
                cursorColor: '#0078d4',
                height: waveformHeight,
                barWidth: isGallery ? 1 : 2,
                barGap: 1,
                barRadius: isGallery ? 1 : 2,
                normalize: true,
                interact: true, // Enable clicking to seek
                autoplay: false,
                cursorWidth: isGallery ? 1 : 2,
                url: toFileUrl(audioPath)
            });

            wavesurferInstances.set(audioPath, ws);

            ws.on('ready', () => {
                if (typeof debugLog === 'function') debugLog(`Waveform ready: ${audioPath.split('/').pop()}`, 'success');
            });

            // Sync UI when WaveSurfer plays/pauses
            ws.on('play', () => {
                currentlyPlayingAudio = audioPath;
                updatePlayButtonState(audioPath, true);

                // Pause other WaveSurfers
                for (const [otherPath, otherWs] of wavesurferInstances.entries()) {
                    if (otherPath !== audioPath) otherWs.pause();
                }
                // Pause global player
                const audioPlayer = document.getElementById('audioPlayer');
                if (audioPlayer && !audioPlayer.paused) audioPlayer.pause();

                // Sync video thumbnail if this is a video file
                if (fileType === 'video') {
                    syncVideoThumbnail(audioPath, 'play', ws.getCurrentTime());
                }
                // Update gallery play button state
                const galleryBtn = document.querySelector(`.gallery-play-btn[data-audio-path="${CSS.escape(audioPath)}"]`);
                if (galleryBtn) galleryBtn.classList.add('playing');
            });

            ws.on('pause', () => {
                updatePlayButtonState(audioPath, false);
                // Sync video thumbnail if this is a video file
                if (fileType === 'video') {
                    syncVideoThumbnail(audioPath, 'pause');
                }
                // Update gallery play button state
                const galleryBtn = document.querySelector(`.gallery-play-btn[data-audio-path="${CSS.escape(audioPath)}"]`);
                if (galleryBtn) galleryBtn.classList.remove('playing');
            });

            ws.on('finish', () => {
                updatePlayButtonState(audioPath, false);
                // Reset video thumbnail if this is a video file
                if (fileType === 'video') {
                    syncVideoThumbnail(audioPath, 'stop');
                }
                // Update gallery play button state
                const galleryBtn = document.querySelector(`.gallery-play-btn[data-audio-path="${CSS.escape(audioPath)}"]`);
                if (galleryBtn) galleryBtn.classList.remove('playing');
            });

            // Sync on seek/interaction
            ws.on('seeking', (time) => {
                if (fileType === 'video') {
                    syncVideoThumbnail(audioPath, 'seek', time);
                }
            });

            // Continuous time sync for smooth video playback
            ws.on('timeupdate', (time) => {
                if (fileType === 'video' && ws.isPlaying()) {
                    syncVideoThumbnail(audioPath, 'timeupdate', time);
                }
            });

            // "Play on Click": Seek and Play
            ws.on('interaction', () => {
                ws.play();
            });

            ws.on('error', (err) => {
                console.error('Wavesurfer error:', err, 'for path:', audioPath);
                if (typeof debugLog === 'function') debugLog(`Wavesurfer ERROR for ${audioPath.split('/').pop()}: ${err}`, 'error');
            });

            // If we were recreating a playing instance, resume it
            // (Note: this is a bit complex for a first pass, let's just do standard init first)

        } catch (e) {
            console.error('Wavesurfer init error for:', audioPath, e);
        }
    });
}

// Sync video thumbnail with waveform playback
function syncVideoThumbnail(videoPath, action, time = 0) {
    // Find the video thumbnail element
    const videoEl = document.querySelector(`video.thumbnail-video[data-video-path="${CSS.escape(videoPath)}"]`);
    if (!videoEl) return;

    try {
        switch (action) {
            case 'play':
                videoEl.currentTime = time;
                videoEl.play().catch(() => { }); // Ignore autoplay errors
                break;
            case 'pause':
                videoEl.pause();
                break;
            case 'stop':
                videoEl.pause();
                videoEl.currentTime = 0;
                break;
            case 'seek':
            case 'timeupdate':
                // Only sync if difference is significant (>0.5s) to avoid jitter
                if (Math.abs(videoEl.currentTime - time) > 0.5) {
                    videoEl.currentTime = time;
                }
                break;
        }
    } catch (e) {
        // Video element may not be ready, ignore errors
    }
}

function toggleFileSelection(path) {
    const isSelected = !selectedFiles.has(path);
    if (isSelected) {
        selectedFiles.add(path);
    } else {
        selectedFiles.delete(path);
    }

    // Update DOM directly instead of re-rendering everything
    const el = document.querySelector(`.file-item[data-path="${CSS.escape(path)}"]`);
    if (el) {
        el.classList.toggle('selected', isSelected);
        const checkbox = el.querySelector('.file-checkbox');
        if (checkbox) checkbox.checked = isSelected;
    }

    updateSelectionUI();
}

function updateSelectionUI() {
    document.getElementById('selectedCount').textContent = selectedFiles.size;
    document.getElementById('importBtn').disabled = selectedFiles.size === 0;
}

// Audio playback toggle
function toggleAudioPlayback(audioPath, buttonElement) {
    const ws = wavesurferInstances.get(audioPath);

    if (ws) {
        // If we have a Wavesurfer instance, use it
        if (ws.isPlaying()) {
            ws.pause();
        } else {
            ws.play();
        }
        return;
    }

    // Fallback to basic audio player for grid view or if script failed
    const audioPlayer = document.getElementById('audioPlayer');

    // If clicking on currently playing audio, stop it
    if (currentlyPlayingAudio === audioPath && !audioPlayer.paused) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        currentlyPlayingAudio = null;
        updatePlayButtonState(audioPath, false);
        return;
    }

    // Stop any currently playing audio
    if (currentlyPlayingAudio) {
        audioPlayer.pause();
        updatePlayButtonState(currentlyPlayingAudio, false);
    }

    // Stop any Wavesurfer instances
    for (const ws of wavesurferInstances.values()) {
        ws.pause();
    }

    // Play new audio
    audioPlayer.src = audioPath;
    audioPlayer.play().then(() => {
        currentlyPlayingAudio = audioPath;
        updatePlayButtonState(audioPath, true);
    }).catch(e => {
        console.error('Audio playback error:', e);
        showStatus('Cannot play this audio format', 'error');
    });

    // When audio ends, reset button
    audioPlayer.onended = () => {
        currentlyPlayingAudio = null;
        updatePlayButtonState(audioPath, false);
    };
}

function updatePlayButtonState(audioPath, isPlaying) {
    const btn = document.querySelector(`.audio-play-btn[data-audio-path="${CSS.escape(audioPath)}"]`);
    if (!btn) return;

    if (isPlaying) {
        btn.classList.add('playing');
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="6" y="4" width="4" height="16" fill="currentColor" />
            <rect x="14" y="4" width="4" height="16" fill="currentColor" />
        </svg>`;
    } else {
        btn.classList.remove('playing');
        btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="5 3 19 12 5 21" fill="currentColor" />
        </svg>`;
    }
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
    const isFavorite = !favorites.has(path);
    if (isFavorite) {
        favorites.add(path);
    } else {
        favorites.delete(path);
    }

    // Update DOM directly instead of re-rendering everything
    const el = document.querySelector(`.file-item[data-path="${CSS.escape(path)}"]`);
    if (el) {
        const favoriteBtn = el.querySelector('.file-favorite');
        if (favoriteBtn) {
            favoriteBtn.classList.toggle('active', isFavorite);
        }
    }

    saveFavorites();
}

// ============================================================================
// NAVIGATION
// ============================================================================
function navigateToFolder(path, rootId = '') {
    currentDatabaseId = rootId || '';
    currentPath = path;
    selectedFiles.clear();
    expandedFolders.clear(); // Clear expanded state when navigating
    updateSelectionUI();
    applyFilters();
    renderBreadcrumb();
}

function navigateBack() {
    if (!currentPath) {
        if (!currentDatabaseId) {
            return; // Already at grouped home
        }

        currentDatabaseId = '';
        selectedFiles.clear();
        updateSelectionUI();
        applyFilters();
        renderBreadcrumb();
        return;
    }

    const lastSlash = currentPath.lastIndexOf('/');
    if (lastSlash > 0) {
        currentPath = currentPath.substring(0, lastSlash);
    } else {
        currentPath = '';
        if (settings.databaseRoots.length > 1) {
            currentDatabaseId = '';
        }
    }

    selectedFiles.clear();
    updateSelectionUI();
    applyFilters();
    renderBreadcrumb();
}

function toggleFolderExpand(folderPath) {
    const wasExpanded = expandedFolders.has(folderPath);

    if (wasExpanded) {
        expandedFolders.delete(folderPath);
        // Remove expanded content from DOM without full re-render
        collapseFolder(folderPath);
    } else {
        expandedFolders.add(folderPath);
        // Insert expanded content into DOM without full re-render
        expandFolder(folderPath);
    }
}

// Expand a folder by inserting its contents after the folder element
function expandFolder(folderPath) {
    const folderEl = document.querySelector(`.file-item.folder[data-path="${CSS.escape(folderPath)}"]`);
    if (!folderEl) {
        // Fallback to full re-render if element not found
        renderFiles();
        return;
    }

    // Update the expand icon
    const expandIcon = folderEl.querySelector('.folder-expand');
    if (expandIcon) {
        expandIcon.textContent = '▼';
    }

    // Get the content HTML for this folder
    const contentHtml = renderExpandedFolderContents(folderPath);
    if (!contentHtml) return;

    // Create a container for the expanded content
    const contentContainer = document.createElement('div');
    contentContainer.className = 'expanded-folder-content';
    contentContainer.setAttribute('data-parent-folder', folderPath);
    contentContainer.innerHTML = contentHtml;

    // Insert after the folder element
    folderEl.insertAdjacentElement('afterend', contentContainer);

    // Attach event listeners to the new content
    attachEventListenersToElement(contentContainer);

    // Initialize waveforms only for the new content (LIST VIEW ONLY)
    if (currentViewMode === 'list' && settings.showWaveforms !== false) {
        setTimeout(() => initWaveformsInElement(contentContainer), 50);
    }
}

// Collapse a folder by removing its expanded content from DOM
function collapseFolder(folderPath) {
    const parentFolder = pdb_getFolderByKey(folderPath);
    const folderEl = document.querySelector(`.file-item.folder[data-path="${CSS.escape(folderPath)}"]`);
    if (folderEl) {
        // Update the expand icon
        const expandIcon = folderEl.querySelector('.folder-expand');
        if (expandIcon) {
            expandIcon.textContent = '▶';
        }
    }

    // Remove the expanded content container
    const contentContainer = document.querySelector(`.expanded-folder-content[data-parent-folder="${CSS.escape(folderPath)}"]`);
    if (contentContainer) {
        // Destroy any wavesurfer instances in this container first
        contentContainer.querySelectorAll('.waveform-wrapper').forEach(wrapper => {
            const audioPath = wrapper.getAttribute('data-audio-path');
            if (wavesurferInstances.has(audioPath)) {
                wavesurferInstances.get(audioPath).destroy();
                wavesurferInstances.delete(audioPath);
            }
        });

        // Also collapse any nested expanded folders recursively
        contentContainer.querySelectorAll('.expanded-folder-content').forEach(nestedContainer => {
            const nestedPath = nestedContainer.getAttribute('data-parent-folder');
            if (nestedPath) {
                expandedFolders.delete(nestedPath);
            }
        });

        contentContainer.remove();
    }

    // Remove this and all nested paths from expandedFolders
    const pathsToRemove = [];
    for (const expandedKey of expandedFolders) {
        const expandedFolder = pdb_getFolderByKey(expandedKey);
        if (parentFolder && expandedFolder && expandedFolder.rootId === parentFolder.rootId && expandedFolder.relativePath.startsWith(parentFolder.relativePath + '/')) {
            pathsToRemove.push(expandedKey);
        }
    }
    pathsToRemove.forEach(p => expandedFolders.delete(p));
}

// Attach event listeners to elements within a specific container
function attachEventListenersToElement(container) {
    // Folder expand/collapse icons
    container.querySelectorAll('.folder-expand').forEach(el => {
        el.addEventListener('click', (e) => {
            e.stopPropagation();
            const folderPath = el.getAttribute('data-folder');
            toggleFolderExpand(folderPath);
        });
    });

    // Folder clicks - single click to expand, double click to navigate
    container.querySelectorAll('.file-item.folder').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.folder-expand')) return;
            const relativePath = el.getAttribute('data-relative-path') || '';
            const rootId = el.getAttribute('data-root-id') || '';
            const folderKey = el.getAttribute('data-path');
            if (currentViewMode === 'grid') {
                navigateToFolder(relativePath, rootId);
            } else {
                toggleFolderExpand(folderKey);
            }
        });

        el.addEventListener('dblclick', () => {
            const relativePath = el.getAttribute('data-relative-path') || '';
            const rootId = el.getAttribute('data-root-id') || '';
            navigateToFolder(relativePath, rootId);
        });
    });

    // File clicks (selection)
    container.querySelectorAll('.file-item[data-type="file"]').forEach(el => {
        el.addEventListener('click', (e) => {
            if (e.target.closest('.file-checkbox') || e.target.closest('.file-favorite')) {
                return;
            }
            const path = el.getAttribute('data-path');
            toggleFileSelection(path);
        });
    });

    // Waveform container clicks
    container.querySelectorAll('.waveform-wrapper').forEach(wrapper => {
        wrapper.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    // Checkbox changes
    container.querySelectorAll('.file-checkbox').forEach(checkbox => {
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
    container.querySelectorAll('.file-favorite').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const path = btn.getAttribute('data-path');
            toggleFavorite(path);
        });
    });

    // Audio play buttons
    container.querySelectorAll('.audio-play-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const audioPath = btn.getAttribute('data-audio-path');
            toggleAudioPlayback(audioPath, btn);
        });
    });

    // Context menu
    container.querySelectorAll('.file-item').forEach(el => {
        el.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e, {
                itemPath: el.getAttribute('data-path') || '',
                type: el.getAttribute('data-type') || '',
                rootId: el.getAttribute('data-root-id') || '',
                relativePath: el.getAttribute('data-relative-path') || '',
                absolutePath: el.getAttribute('data-type') === 'folder'
                    ? (el.getAttribute('data-absolute-path') || '')
                    : (el.getAttribute('data-path') || '')
            });
        });
    });

    // Make files draggable
    container.querySelectorAll('.file-item[data-type="file"]').forEach(el => {
        el.setAttribute('draggable', 'true');

        el.addEventListener('dragstart', (e) => {
            const filePath = el.getAttribute('data-path');
            if (!selectedFiles.has(filePath)) {
                selectedFiles.clear();
                selectedFiles.add(filePath);
                updateSelectionUI();
                // Update the visual state directly instead of re-rendering
                document.querySelectorAll('.file-item.selected').forEach(item => item.classList.remove('selected'));
                el.classList.add('selected');
                const checkbox = el.querySelector('.file-checkbox');
                if (checkbox) checkbox.checked = true;
            }

            const filesToDrag = Array.from(selectedFiles);
            e.dataTransfer.setData('application/json', JSON.stringify(filesToDrag));
            e.dataTransfer.effectAllowed = 'move';

            selectedFiles.forEach(path => {
                const fileEl = document.querySelector(`.file-item[data-path="${CSS.escape(path)}"]`);
                if (fileEl) fileEl.classList.add('dragging');
            });

            pdb_createDragGhost(filesToDrag.length, e);
        });

        el.addEventListener('dragend', () => {
            document.querySelectorAll('.file-item.dragging').forEach(item => {
                item.classList.remove('dragging');
            });
            document.querySelectorAll('.file-item.drop-target').forEach(item => {
                item.classList.remove('drop-target');
            });
            pdb_removeDragGhost();
        });
    });

    // Make folders drop targets
    container.querySelectorAll('.file-item.folder').forEach(el => {
        el.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            el.classList.add('drop-target');
        });

        el.addEventListener('dragleave', (e) => {
            if (!el.contains(e.relatedTarget)) {
                el.classList.remove('drop-target');
            }
        });

        el.addEventListener('drop', (e) => {
            e.preventDefault();
            el.classList.remove('drop-target');

            try {
                const data = e.dataTransfer.getData('application/json');
                if (!data) return;

                const filesToMove = JSON.parse(data);
                const destFolderPath = el.getAttribute('data-path');

                pdb_moveFilesToFolder(filesToMove, destFolderPath);
            } catch (err) {
                console.error('Drop error:', err);
                showStatus('Error processing drop: ' + err.message, 'error');
            }
        });
    });

    // =========================================================================
    // HOVER PREVIEW (Video & Audio)
    // =========================================================================
    // We attach listeners regardless of setting state now, checking setting at runtime
    // to allow toggling without re-rendering.

    // Video Hover
    container.querySelectorAll('.file-item.video').forEach(el => {
        el.addEventListener('mouseenter', () => {
            // double check dynamic setting
            if (!settings.hoverPreview) return;

            const videoEl = el.querySelector('video.thumbnail-video');
            if (videoEl) {
                // Stop any other playing audio/video
                const audioPlayer = document.getElementById('audioPlayer');
                if (audioPlayer && !audioPlayer.paused) audioPlayer.pause();

                // Pause all wavesurfers
                if (typeof wavesurferInstances !== 'undefined') {
                    for (const ws of wavesurferInstances.values()) {
                        if (ws.isPlaying()) ws.pause();
                    }
                }

                videoEl.currentTime = 0;
                videoEl.muted = false; // Unmute for hover preview
                videoEl.play().catch(e => { /* ignore play errors */ });
                el.classList.add('hover-playing');
            }
        });

        el.addEventListener('mouseleave', () => {
            const videoEl = el.querySelector('video.thumbnail-video');
            if (videoEl) {
                videoEl.pause();
                videoEl.currentTime = 0;
                videoEl.muted = true; // Reset mute
                el.classList.remove('hover-playing');
            }
        });
    });

    // Audio Hover
    container.querySelectorAll('.file-item.audio').forEach(el => {
        let hoverTimeout;

        el.addEventListener('mouseenter', () => {
            if (!settings.hoverPreview) return;

            // Small delay to avoid playing when just sweeping over files
            hoverTimeout = setTimeout(() => {
                const audioPath = el.getAttribute('data-path');

                // Check if we have a wavesurfer instance
                if (typeof wavesurferInstances !== 'undefined' && wavesurferInstances.has(audioPath)) {
                    const ws = wavesurferInstances.get(audioPath);
                    ws.seekTo(0); // Seek to start
                    ws.play();
                } else {
                    // Use global audio player
                    const audioPlayer = document.getElementById('audioPlayer');

                    // Stop any other playing
                    if (currentlyPlayingAudio && currentlyPlayingAudio !== audioPath) {
                        if (wavesurferInstances.has(currentlyPlayingAudio)) {
                            wavesurferInstances.get(currentlyPlayingAudio).pause();
                        } else {
                            audioPlayer.pause();
                        }
                    }

                    // Helper to get file URL or raw path
                    const src = (typeof toFileUrl === 'function') ? toFileUrl(audioPath) : audioPath;
                    audioPlayer.src = src;
                    audioPlayer.currentTime = 0;

                    audioPlayer.play().then(() => {
                        currentlyPlayingAudio = audioPath;
                        updatePlayButtonState(audioPath, true);
                    }).catch(e => console.error('Hover audio error:', e));
                }
                el.classList.add('hover-playing');
            }, 100); // 100ms delay
        });

        el.addEventListener('mouseleave', () => {
            clearTimeout(hoverTimeout);
            // Even if setting is off, we ensure we stop if we started playing
            // but strict check: if (!settings.hoverPreview) return; 
            // Better to always attempt stop if we added the class or are playing

            const audioPath = el.getAttribute('data-path');

            if (typeof wavesurferInstances !== 'undefined' && wavesurferInstances.has(audioPath)) {
                const ws = wavesurferInstances.get(audioPath);
                if (ws.isPlaying()) {
                    ws.pause();
                    ws.seekTo(0);
                }
            } else {
                const audioPlayer = document.getElementById('audioPlayer');
                // Only stop only if it's THIS file playing?
                // Or simplistic approach: if hover-playing, stop whatever.
                // Better: check if currentlyPlayingAudio matches.
                if (currentlyPlayingAudio === audioPath) {
                    audioPlayer.pause();
                    audioPlayer.currentTime = 0;
                    currentlyPlayingAudio = null;
                    updatePlayButtonState(audioPath, false);
                }
            }
            el.classList.remove('hover-playing');
        });
    });
}


// Initialize waveforms only within a specific container element
function initWaveformsInElement(container) {
    if (typeof WaveSurfer === 'undefined') {
        console.error('WaveSurfer library not loaded!');
        return;
    }

    container.querySelectorAll('.waveform-wrapper').forEach(wrapper => {
        const audioPath = wrapper.getAttribute('data-audio-path');
        const waveformContainer = wrapper.querySelector('.waveform-container');
        const fileType = wrapper.getAttribute('data-file-type');

        // Skip if already initialized
        if (wavesurferInstances.has(audioPath)) {
            return;
        }

        try {
            const ws = WaveSurfer.create({
                container: waveformContainer,
                waveColor: '#6d6d6d',
                progressColor: '#0078d4',
                cursorColor: '#0078d4',
                height: 24,
                barWidth: 2,
                barGap: 1,
                barRadius: 2,
                normalize: true,
                interact: true,
                autoplay: false,
                cursorWidth: 2,
                url: toFileUrl(audioPath)
            });

            wavesurferInstances.set(audioPath, ws);

            ws.on('ready', () => {
                if (typeof debugLog === 'function') debugLog(`Waveform ready: ${audioPath.split('/').pop()}`, 'success');
            });

            ws.on('play', () => {
                currentlyPlayingAudio = audioPath;
                updatePlayButtonState(audioPath, true);
                for (const [otherPath, otherWs] of wavesurferInstances.entries()) {
                    if (otherPath !== audioPath) otherWs.pause();
                }
                const audioPlayer = document.getElementById('audioPlayer');
                if (audioPlayer && !audioPlayer.paused) audioPlayer.pause();

                // Sync video thumbnail if this is a video file
                if (fileType === 'video') {
                    syncVideoThumbnail(audioPath, 'play', ws.getCurrentTime());
                }
            });

            ws.on('pause', () => {
                updatePlayButtonState(audioPath, false);
                if (fileType === 'video') {
                    syncVideoThumbnail(audioPath, 'pause');
                }
            });

            ws.on('finish', () => {
                updatePlayButtonState(audioPath, false);
                if (fileType === 'video') {
                    syncVideoThumbnail(audioPath, 'stop');
                }
            });

            // Sync on seek
            ws.on('seeking', (time) => {
                if (fileType === 'video') {
                    syncVideoThumbnail(audioPath, 'seek', time);
                }
            });

            // Continuous time sync for smooth video playback
            ws.on('timeupdate', (time) => {
                if (fileType === 'video' && ws.isPlaying()) {
                    syncVideoThumbnail(audioPath, 'timeupdate', time);
                }
            });

            ws.on('interaction', () => {
                ws.play();
            });

            ws.on('error', (err) => {
                console.error('Wavesurfer error:', err, 'for path:', audioPath);
            });

        } catch (e) {
            console.error('Wavesurfer init error for:', audioPath, e);
        }
    });
}

function renderBreadcrumb() {
    // The home button is now in toolbar-center, attach click handler by ID
    const homeBtn = document.getElementById('homeBtn');
    if (homeBtn) {
        homeBtn.onclick = () => navigateToFolder('', '');
    }

    // Back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.onclick = () => navigateBack();
        const canGoBack = Boolean(currentPath) || (Boolean(currentDatabaseId) && settings.databaseRoots.length === 1);
        backBtn.disabled = !canGoBack;
        backBtn.classList.toggle('disabled', !canGoBack);
    }

    // Enable write actions only when a target database is clearly selected.
    const activeDatabaseRoot = pdb_getActiveDatabaseRoot();
    const newFolderBtn = document.getElementById('newFolderBtn');
    const addToDbBtn = document.getElementById('addToDbBtn');

    if (newFolderBtn) {
        newFolderBtn.disabled = !activeDatabaseRoot;
        newFolderBtn.classList.toggle('disabled', !activeDatabaseRoot);
    }

    if (addToDbBtn) {
        addToDbBtn.disabled = !activeDatabaseRoot;
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
        browser.classList.remove('list-view');
    } else {
        browser.classList.add('list-view');
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

    const activeDatabaseRoot = pdb_getActiveDatabaseRoot();
    if (!activeDatabaseRoot) {
        showStatus(t('status.selectDatabaseFirst'), 'warning');
        return;
    }

    const basePath = currentPath
        ? activeDatabaseRoot.path + '/' + currentPath
        : activeDatabaseRoot.path;
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
    const count = await performImport(files);

    if (count > 0) {
        selectedFiles.clear();
        updateSelectionUI();
        renderFiles();
    }
}

async function importFolder(folderKey) {
    const folder = pdb_getFolderByKey(folderKey);
    if (!folder) {
        showStatus(t('empty.noFilesFound'), 'warning');
        return;
    }

    // Determine target files (recursive)
    // Match exact folder path or subfolders
    const files = allFiles.filter(f =>
        f.rootId === folder.rootId && (
            f.folderPath === folder.relativePath ||
            (f.folderPath && f.folderPath.startsWith(folder.relativePath + '/'))
        )
    );

    if (files.length === 0) {
        showStatus(t('empty.noFilesFound'), 'warning');
        return;
    }

    await performImport(files);
}

async function performImport(files) {
    showProgress(t('status.importing'));
    updateProgress(0);

    try {
        const multipleRootsSelected = new Set(files.map((file) => file.rootId)).size > 1;
        const shouldPrefixRootBin = multipleRootsSelected && !settings.flattenImportPath;

        // Prepare files for import
        const filesToImport = files.map(file => {
            // Calculate bin path (excluding database root folder name)
            let folderBinPath = file.folderPath || '';

            // If flatten option is enabled, only keep first folder segment
            if (settings.flattenImportPath && folderBinPath) {
                const parts = folderBinPath.split('/');
                folderBinPath = parts[0] || '';
            }

            const binParts = [];
            // Keep the legacy "root folder only" behavior even when files come from several databases.
            if (shouldPrefixRootBin) {
                const rootBinName = pdb_getSafeBinSegment(file.rootName || pdb_getDefaultDatabaseName(file.rootPath));
                if (rootBinName) {
                    binParts.push(rootBinName);
                }
            }

            if (folderBinPath) {
                binParts.push(folderBinPath);
            }

            return {
                name: file.name,
                path: file.path,
                binPath: binParts.join('/')
            };
        });

        // If consolidate is enabled, copy files to project folder first
        if (settings.consolidateOnImport) {
            // Get project path from Premiere
            let projectPath = null;

            // Wrap getProjectPath in promise just in case, though it's likely async or instant
            try {
                // Assuming getProjectPath is available, check implementation
                // Wait, getProjectPath is in host script usually?
                // No, previous code called `await getProjectPath()`. 
                // Let's assume it's a helper function in main.js or available.
                // In Step 672 view, getProjectPath was called.
                projectPath = await getProjectPath();
            } catch (e) {
                console.error("Error getting project path", e);
            }

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

        return new Promise((resolve) => {
            csInterface.evalScript(`DataBase_importFilesToProjectBase64('${base64Json}')`, (result) => {
                hideProgress();

                try {
                    const response = JSON.parse(result);

                    if (response.error) {
                        showStatus(t('status.importError') + ': ' + response.error, 'error');
                        resolve(0);
                    } else {
                        const count = response.totalImported || 0;
                        showStatus(`${count} ${t('status.importSuccess')}`, 'success');
                        resolve(count);
                    }
                } catch (e) {
                    showStatus(t('status.importError'), 'error');
                    console.error('Import error:', e);
                    resolve(0);
                }
            });
        });
    } catch (e) {
        hideProgress();
        showStatus(t('status.importError'), 'error');
        console.error('Import failed:', e);
        return 0;
    }
}

function getProjectPath() {
    return new Promise((resolve) => {
        csInterface.evalScript('DataBase_getProjectPath()', (result) => {
            resolve(result === 'null' ? null : result);
        });
    });
}

// ============================================================================
// CONTEXT MENU
// ============================================================================
// ============================================================================
function showContextMenu(event, filePath, type) {
    const contextData = typeof filePath === 'object'
        ? filePath
        : {
            itemPath: filePath,
            type: type
        };
    const menu = document.getElementById('contextMenu');

    // Manage Favorites options
    const addFavBtn = document.getElementById('contextAddFavorite');
    const removeFavBtn = document.getElementById('contextRemoveFavorite');
    const importFolderBtn = document.getElementById('contextImportFolder');

    if (contextData.type === 'folder') {
        // Folders cannot be favorited currently
        addFavBtn.classList.add('hidden');
        removeFavBtn.classList.add('hidden');
        importFolderBtn.classList.remove('hidden');
    } else {
        const isFavorite = favorites.has(contextData.itemPath);
        addFavBtn.classList.toggle('hidden', isFavorite);
        removeFavBtn.classList.toggle('hidden', !isFavorite);
        importFolderBtn.classList.add('hidden');
    }

    // Position menu
    menu.style.left = event.clientX + 'px';
    menu.style.top = event.clientY + 'px';
    menu.classList.add('visible');

    // Store current file path for actions
    contextMenuFile = contextData.itemPath || '';
    menu.dataset.filePath = contextData.itemPath || '';
    menu.dataset.type = contextData.type || '';
    menu.dataset.rootId = contextData.rootId || '';
    menu.dataset.relativePath = contextData.relativePath || '';
    menu.dataset.absolutePath = contextData.absolutePath || '';
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

function toFileUrl(filePath) {
    if (!filePath) return '';
    let safePath = filePath.replace(/\\/g, '/');

    // Normalize path and ensure it's a file:// URL
    if (!safePath.startsWith('file://')) {
        if (safePath.startsWith('/')) {
            safePath = 'file://' + safePath;
        } else {
            safePath = 'file:///' + safePath;
        }
    }

    // Encode spaces and other special characters that fetch/Wavesurfer might struggle with
    const protocolMatch = safePath.match(/^file:\/\/\/?/);
    if (!protocolMatch) {
        if (typeof debugLog === 'function') debugLog(`Could not determine protocol for path: ${safePath}`, 'error');
        return safePath;
    }
    const protocol = protocolMatch[0];
    const rest = safePath.substring(protocol.length);
    const encodedPath = protocol + rest.split('/').map(segment => encodeURIComponent(segment)).join('/');

    if (typeof debugLog === 'function') debugLog(`Path normalized: ${encodedPath}`, 'info');
    return encodedPath;
}

function generateSafeId(text) {
    if (!text) return 'id-' + Math.random().toString(36).substr(2, 9);
    // Simple fast hash to generate a numeric-leaning safe ID
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
        const char = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return 'ws-' + Math.abs(hash).toString(16);
}

// ============================================================================
// INITIALIZATION
// ============================================================================
function init() {
    // Build both language selectors from the same ordered source before applying saved settings.
    pdb_renderLanguageSelectOptions();

    // Load settings
    loadSettings();
    renderBreadcrumb();

    // SpellBook is now initialized at module load time (top of file)

    // Event listeners - Settings
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('closeSettingsBtn').addEventListener('click', closeSettings);
    document.getElementById('settingsOverlay').addEventListener('click', closeSettings);
    document.getElementById('saveSettingsBtn').addEventListener('click', () => {
        saveSettings();
        if (settings.databaseRoots.length > 1) {
            navigateToFolder('', '');
        }
        closeSettings();
        scanDatabaseFiles();
    });
    document.getElementById('addDatabaseRootBtn').addEventListener('click', pdb_addDatabaseRootRow);
    document.getElementById('databaseRootsList').addEventListener('click', (event) => {
        const browseButton = event.target.closest('.database-root-browse-btn');
        if (browseButton) {
            pdb_browseForDatabaseRoot(browseButton.getAttribute('data-root-id') || '');
            return;
        }

        const removeButton = event.target.closest('.database-root-remove-btn');
        if (removeButton) {
            pdb_removeDatabaseRoot(removeButton.getAttribute('data-root-id') || '');
            return;
        }
    });

    // Language selectors
    document.getElementById('languageSelect').addEventListener('change', (e) => {
        changeLanguage(e.target.value);
        document.getElementById('settingsLanguageSelect').value = e.target.value;
    });
    document.getElementById('settingsLanguageSelect').addEventListener('change', (e) => {
        changeLanguage(e.target.value);
        document.getElementById('languageSelect').value = e.target.value;
    });

    // Show Waveforms toggle
    document.getElementById('showWaveformsCheckbox')?.addEventListener('change', (e) => {
        settings.showWaveforms = e.target.checked;
        saveSettings();
        renderFiles(); // Refresh UI
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

    // Size Slider
    document.getElementById('sizeSlider').addEventListener('input', (e) => {
        const val = e.target.value;
        settings.itemSize = val;
        updateItemSize(val);
        // Debounce saving settings
        clearTimeout(saveSettingsTimer);
        saveSettingsTimer = setTimeout(() => {
            pdb_writeSettingsToFile(settings);
            localStorage.setItem('databaseSettings', JSON.stringify(settings));
        }, 500);
    });

    // Selection buttons
    document.getElementById('selectAllBtn').addEventListener('click', selectAll);
    document.getElementById('deselectAllBtn').addEventListener('click', deselectAll);
    document.getElementById('importBtn').addEventListener('click', importSelectedFiles);
    document.getElementById('addToDbBtn').addEventListener('click', addToDatabase);

    // Folder actions
    document.getElementById('newFolderBtn').addEventListener('click', openNewFolderModal);
    document.getElementById('refreshBtn').addEventListener('click', scanDatabaseFiles);
    document.getElementById('waveformToggleBtn').addEventListener('click', pdb_toggleWaveforms);
    document.getElementById('closeNewFolderModal').addEventListener('click', closeNewFolderModal);
    document.getElementById('cancelNewFolder').addEventListener('click', closeNewFolderModal);
    document.getElementById('confirmNewFolder').addEventListener('click', createFolder);

    // Debug panel clear button
    document.getElementById('debugClearBtn').addEventListener('click', clearDebugLogs);

    // Enter key for new folder
    document.getElementById('newFolderName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createFolder();
    });

    // Context menu
    document.getElementById('contextAddFavorite').addEventListener('click', () => {
        const path = document.getElementById('contextMenu').dataset.filePath;
        favorites.add(path);
        saveFavorites();

        // Direct DOM update
        const el = document.querySelector(`.file-item[data-path="${CSS.escape(path)}"]`);
        if (el) {
            const favoriteBtn = el.querySelector('.file-favorite');
            if (favoriteBtn) favoriteBtn.classList.add('active');
        }

        hideContextMenu();
    });
    document.getElementById('contextRemoveFavorite').addEventListener('click', () => {
        const path = document.getElementById('contextMenu').dataset.filePath;
        favorites.delete(path);
        saveFavorites();

        // Direct DOM update
        const el = document.querySelector(`.file-item[data-path="${CSS.escape(path)}"]`);
        if (el) {
            const favoriteBtn = el.querySelector('.file-favorite');
            if (favoriteBtn) favoriteBtn.classList.remove('active');
        }

        hideContextMenu();
    });
    document.getElementById('contextOpenFolder').addEventListener('click', () => {
        const menu = document.getElementById('contextMenu');
        let path = menu.dataset.absolutePath;
        const type = document.getElementById('contextMenu').dataset.type;

        if (type !== 'folder') {
            // If file, get parent folder
            path = path.substring(0, path.lastIndexOf('/'));
        }

        openInExplorer(path);
        hideContextMenu();
    });

    document.getElementById('contextImportFolder').addEventListener('click', () => {
        const folderKey = document.getElementById('contextMenu').dataset.filePath;
        importFolder(folderKey);
        hideContextMenu();
    });
    document.getElementById('contextDelete').addEventListener('click', () => {
        const path = document.getElementById('contextMenu').dataset.absolutePath;

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

    // Initial scan if at least one database root is configured
    if (pdb_hasConfiguredDatabases()) {
        setTimeout(scanDatabaseFiles, 100);
    }

    // Check for updates
    setTimeout(() => {
        getAppVersion();
        checkForUpdates();
    }, 1500);

    console.log('Data Base extension initialized');
}

// Start when DOM is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
} else {
    document.addEventListener('DOMContentLoaded', init);
}

// ============================================================================
// UPDATE SYSTEM
// ============================================================================
function getAppVersion() {
    try {
        var extensionPath = csInterface.getSystemPath(SystemPath.EXTENSION);
        var manifestPath = pdb_path.join(extensionPath, 'CSXS', 'manifest.xml');

        if (pdb_fs.existsSync(manifestPath)) {
            var content = pdb_fs.readFileSync(manifestPath, 'utf8');
            var match = content.match(/ExtensionBundleVersion="([^"]+)"/);
            if (match && match[1]) {
                CURRENT_VERSION = match[1];
                console.log('Detected version:', CURRENT_VERSION);
            }
        }
    } catch (e) {
        console.error('Error reading manifest:', e);
    }

    // Update settings UI
    var versionEl = document.getElementById('versionInfo');
    if (versionEl) {
        versionEl.textContent = 'v' + CURRENT_VERSION;
    }
}

function checkForUpdates() {
    var url = 'https://api.github.com/repos/' + GITHUB_REPO + '/releases/latest';

    var options = {
        headers: {
            'User-Agent': 'Premiere-Database-Extension'
        }
    };

    pdb_https.get(url, options, function (res) {
        var body = '';

        res.on('data', function (chunk) {
            body += chunk;
        });

        res.on('end', function () {
            try {
                if (res.statusCode === 200) {
                    var data = JSON.parse(body);
                    var latestVersion = data.tag_name;

                    // Remove 'v' prefix if present
                    if (latestVersion && latestVersion.charAt(0) === 'v') {
                        latestVersion = latestVersion.substring(1);
                    }

                    console.log('Latest Github version:', latestVersion);

                    if (compareVersions(latestVersion, CURRENT_VERSION) > 0) {
                        var downloadUrl = data.html_url; // Default to release page

                        // Try to find a zip asset
                        if (data.assets && data.assets.length > 0) {
                            for (var i = 0; i < data.assets.length; i++) {
                                if (data.assets[i].name.endsWith('.zip')) {
                                    downloadUrl = data.assets[i].browser_download_url;
                                    break;
                                }
                            }
                        }

                        showUpdateBanner(downloadUrl);
                        console.log('Update available:', latestVersion, 'Download:', downloadUrl);
                    } else {
                        console.log('App is up to date');
                    }
                } else {
                    console.log('Github API returned:', res.statusCode);
                }
            } catch (e) {
                console.error('Error parsing Github response:', e);
            }
        });
    }).on('error', function (e) {
        console.error('Error checking updates:', e);
    });
}

function compareVersions(v1, v2) {
    if (!v1 || !v2) return 0;

    var parts1 = v1.split('.').map(Number);
    var parts2 = v2.split('.').map(Number);

    for (var i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        var p1 = parts1[i] || 0;
        var p2 = parts2[i] || 0;

        if (p1 > p2) return 1;
        if (p1 < p2) return -1;
    }

    return 0;
}

function showUpdateBanner(downloadUrl) {
    var banner = document.getElementById('updateBanner');
    if (banner) {
        banner.style.display = 'block';
        banner.onclick = function () {
            // direct download if zip found, else opens release page
            csInterface.openURLInDefaultBrowser(downloadUrl);
        };
    }
}
