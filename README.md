# Data Base - Adobe Premiere Pro Extension

A powerful media database browser extension for Adobe Premiere Pro. Organize, search, and import media files from one or more database folders directly into your Premiere Pro projects.

![Version](https://img.shields.io/badge/version-1.7.0-blue)
![Premiere Pro](https://img.shields.io/badge/Premiere%20Pro-2023%2B-purple)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)

## ✨ Features

### 📁 Database Browser
- Configure one or more database folders
- Give each database folder a custom display name
- Browse files and folders with intuitive navigation
- Keep each database separated in the home view with its own discrete section
- Breadcrumb navigation for easy folder traversal
- Support for video, audio, and image files

### 🔍 Advanced Search & Filtering
- **Real-time search** - Results filter as you type
- **Type filters** - Filter by Video, Audio, or Image (can select multiple)
- **Favorites** - Mark files with a star and filter to show only favorites
- Smart file type detection based on extensions

### 📋 Display Modes
- **List View** - Compact list showing filename and folder path
- **Grid View** - Thumbnail grid for visual browsing
- **Resize Slider** - Adjust thumbnail/icon size for both views (persisted in settings)
- **Version Badge** - The current version is shown directly in the main header for quick verification

### 📥 Smart Import
- Multi-select files for batch import
- **Automatic bin creation** matching your database folder structure
  - Example: `DATABASE/ELEMENTS/TEST/clip.mp4` → Creates `ELEMENTS/TEST` bin in Premiere
- **Import to root folder only** still imports directly into the first visible folder level, even when multiple databases are configured
- Progress indicator during import

### 📂 Folder Management
- Create new folders within your database
- Delete files and folders
- Refresh database contents

### 📂 Drag and Drop
- **Move files between folders** by dragging and dropping
- **Multi-selection support** - Select multiple files and drag them all at once
- **Visual feedback** - Folders highlight when you drag files over them
- **Smart validation** - Prevents moving files to the same folder or overwriting existing files

### 📤 Add to Database (Export from Premiere)
- **Export from Project Panel**: Select bins or items in Premiere Pro and click "Add to DB"
- **Preserves Bin Structure**: Replicates your Premiere Pro bin hierarchy as folders in your database
- **Recursive**: Handles nested bins and all contained media
- **Smart Path Resolution**: Accurately maps `Bin/SubBin/Item` to `Folder/SubFolder/File`

### 📂 Folder Management
- **Create Folder**: Create new folders within your database
- **Import Folder**: Right-click any folder to recursively import its content
- **Delete**: Remove files or folders (with safety checks)
- **Open in Finder/Explorer**: Quickly access files in your OS
- **Expandable Folders**: Navigate hierarchy directly in List View

### 🎬 Video Thumbnails
- **Live Preview**: Hover over video thumbnails in Grid View to play
- **Supported Formats**: Preview support for web-friendly formats (mp4, webm, mov) using HTML5

### 🎵 Audio Preview & Waveforms
- **Interactive Waveforms**: High-quality visual representation of audio and video files
- **List View Waveforms**: Full waveforms for audio/video files with seek-on-click
- **Gallery View Waveforms**: Compact waveforms under thumbnails with play/pause button
- **Waveform Toggle**: Quick toolbar button to show/hide waveforms
- **Play on Click**: Click or seek anywhere on the waveform to start playback
- **Visual Feedback**: Real-time progress tracking on waveform and play buttons
- **Supported Formats**: MP3, WAV, AAC/M4A, OGG, FLAC

### 🔄 Consolidate Option
- Optional setting to copy files to project folder on import
- **Consolidation Depth**: Control how much folder structure is preserved (e.g., 0 = flat, 1 = parent folder, etc.)
- Preserves folder structure in project folder
- Disabled by default

### 🌍 Multi-Language Support
- 🇩🇪 Deutsch
- 🇬🇧 English (default)
- 🇪🇸 Español
- 🇫🇷 Français
- 🇮🇹 Italiano
- 🇧🇷 Português (Brasil)
- 🇷🇺 Русский
- 🇯🇵 日本語
- 🇨🇳 简体中文

### ⌨️ Spell Book / Excalibur Integration
- *(Currently disabled by default in v1.7.0; can be re-enabled via feature flags in code/installers.)*
- **Keyboard Shortcuts** via Spell Book extension
- **Available Commands**:
  - `Refresh Database` - Rescan the database folder
  - `Add Selection to Database` - Copy selected items from Premiere to DB
- Commands appear automatically in Excalibur when Spell Book is installed

## 📋 Requirements

- Adobe Premiere Pro 2023 or later
- macOS 10.14+ or Windows 10+

## 🚀 Installation

### macOS

1. Download or clone this repository
2. Open Terminal
3. **Easiest method (recommended):** drag and drop `install_macos.sh` (inside the `Source` folder) into the Terminal window, then press Enter
4. **Manual method (command line):** navigate to the `Source` folder and run:
   ```bash
   cd /path/to/PremiereDataBase/Source
   chmod +x install_macos.sh
   ./install_macos.sh
   ```
5. Restart Premiere Pro

> **Note**: The installer automatically enables unsigned extensions (PlayerDebugMode) for CSXS 9-16. No manual configuration required.

### Windows

1. Download or clone this repository
2. Right-click `install_win.bat` and select **Run as Administrator**
3. Restart Premiere Pro

> **Note**: The installer automatically enables unsigned extensions (PlayerDebugMode) in the Windows Registry. No manual configuration required.

## 📖 Usage

### Initial Setup

1. Open Premiere Pro
2. Go to **Window → Extensions → Data Base**
3. Click the ⚙️ settings button
4. Add one or more database folders
5. Give each one the display name you want to see in the plugin
6. Click **Save**

### Browsing & Searching

- On the home view, each database appears in its own section with a subtle separator
- When several databases are configured, the main window shows all of them directly at the top level
- Navigate folders by clicking on them or expanding them (List View)
- Use the breadcrumb to go back to parent folders
- Type in the search bar to filter files in real-time
- Click type buttons (Video/Audio/Image) to filter by file type
- Click the ⭐ button to show only favorites
- Switch between **List** and **Grid** views
- **Grid View**: Hover over video files to preview them

### Importing Files & Folders

- **Import Files**: Select files and click **Import**, or double-click a file
- **Import Folder**: Right-click a folder in the browser and select **Import Folder** to recursively import all its content
- **Smart Bins**: Files are imported into bins that match their folder structure

### Moving Files (Drag & Drop)

1. **Select** one or more files by clicking on them
2. **Drag** the selected files to a folder in the same database
3. **Drop** on the target folder (highlighted in blue when valid)
4. Files are moved to the new location

### Adding to Database (from Premiere)

1. Select one or more items (clips or bins) in the Premiere Pro Project Panel
2. Open the database you want to receive those items
3. Click the **Add to DB** button in the extension toolbar
4. The items will be copied to that database, creating folders that match your bin structure

### Managing Mdeia

- **Favorites**: Click the ⭐ icon to mark files. Right-click for context menu options.
- **Context Menu**: Right-click files/folders to Open in Explorer, Delete, or Import Folder.

## ⚙️ Settings

| Setting | Description |
|---------|-------------|
| **Database Folders** | Add one or more root folders, each with its own custom display name |
| **Language** | UI language (English/French) |
| **Copy on Import** | Copy files to project folder when importing (preserves structure) |
| **Consolidation Depth** | How many parent folders to keep when copying (0=none, 1=parent, etc.) |
| **Excluded Extensions** | File extensions to skip during scanning |
| **Excluded Folders** | Folder names to skip (e.g., .git, node_modules) |
| **Flatten Import Path** | Import files to root folder only (ignores subfolders) |

## 🎬 Supported File Types

### Video
`.mp4`, `.mov`, `.avi`, `.mkv`, `.wmv`, `.flv`, `.webm`, `.m4v`, `.mpeg`, `.mpg`, `.3gp`, `.mxf`, `.r3d`, `.braw`, `.prores`

### Audio
`.mp3`, `.wav`, `.aiff`, `.aif`, `.m4a`, `.aac`, `.ogg`, `.flac`, `.wma`, `.opus`

### Image
`.jpg`, `.jpeg`, `.png`, `.gif`, `.tiff`, `.tif`, `.psd`, `.ai`, `.eps`, `.bmp`, `.webp`, `.svg`

## 📁 Project Structure

```
PremiereDataBase/
├── README.md
├── Source/
│   ├── CSXS/
│   │   └── manifest.xml
│   ├── client/
│   │   ├── index.html
│   │   ├── css/
│   │   │   └── style.css
│   │   ├── js/
│   │   │   ├── CSInterface.js
│   │   │   ├── main.js
│   │   │   └── fileOperations.js
│   │   └── lang/
│   │       ├── en.json
│   │       └── fr.json
│   ├── host/
│   │   └── index.jsx
│   ├── scripts/
│   │   └── pdb_validate.js
│   ├── install_macos.sh
│   └── install_windows.bat
├── Releases/
└── .gitignore
```

## 🔧 Troubleshooting

### Extension doesn't appear in Premiere Pro

1. Make sure you've enabled unsigned extensions:
   - **macOS**: `defaults write com.adobe.CSXS.11 PlayerDebugMode 1`
   - **Windows**: Add `PlayerDebugMode = 1` in Registry at `HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.11`
2. Restart Premiere Pro after installation

### Files not appearing in database

1. Check that your database folders are correctly set in settings
2. Verify file extensions are not in the excluded list
3. Click the refresh button to rescan

### Import fails

1. Verify the files exist and are accessible
2. Check Premiere Pro console for error messages
3. Ensure you have write permissions to the project folder (if consolidate is enabled)

## 📜 License

MIT License - Feel free to use and modify as needed.

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## 📝 Changelog

### v1.7.0 (2026-04-14)
- **New Feature**: You can now configure multiple database folders with a custom display name for each one.
- **Improvement**: The home view now shows all configured databases directly in separate sections for easier browsing.
- **Fix**: `Import to root folder only` now keeps the direct first-level import behavior even when multiple databases are configured.
- **New Feature**: Added Deutsch, Español, Italiano, Português (Brasil), Русский, 日本語, and 简体中文, with flag-based language selectors.
- **Improvement**: The current version is now also shown directly next to the plugin name in the main header.
- **Fix**: After removing extra databases and keeping only one, the root view now shows that remaining database correctly again.
- **Change**: The debug log panel is now disabled by default for new installations.

### v1.6.9 (2026-04-14)
- **Fix**: After removing extra databases and keeping only one, the root view now shows that remaining database correctly again.
- **Improvement**: Language selectors now show flag icons again for quicker recognition.

### v1.6.8 (2026-04-14)
- **Fix**: `Import to root folder only` now imports directly into the first displayed folder level again, even when multiple databases are configured.
- **New Feature**: Added Deutsch, Español, Italiano, Português (Brasil), Русский, 日本語, and 简体中文 to the interface language list.
- **Improvement**: Language selectors are now shown in native names with a shared alphabetical order.

### v1.6.7 (2026-04-14)
- **Improvement**: the main window now shows all configured databases directly in the top-level view, without needing a separate "open this database" action.
- **Improvement**: when you go back from a database subfolder, the panel returns to the grouped home view automatically.

### v1.6.6 (2026-04-14)
- **New Feature**: You can now add multiple database folders instead of a single root folder.
- **New Feature**: Each database can have its own custom display name in the plugin.
- **Improvement**: The home view now keeps each database in its own separated section for cleaner browsing.
- **Improvement**: Importing files from multiple databases now keeps their roots separated in Premiere bins when needed.

### v1.6.5 (2026-02-16)
- **Change**: Spell Book integration is now disabled by default (kept in code behind feature flags for later reactivation).
- **Change**: macOS and Windows installers no longer install optional npm dependencies by default.
- **Change**: installer output is now generic and does not expose Spell Book-related messaging.

### v1.6.1 (2026-02-02)
- **New Feature**: **Waveform Toggle Button** - Quick show/hide waveforms from toolbar
- **New Feature**: **Gallery Mode Waveforms** - Compact waveforms under thumbnails for audio and video files
- **New Feature**: **Gallery Play/Pause Button** - Small button to control playback in gallery mode
- **Improvement**: Video files now show waveforms in both list and gallery views
- **Fix**: Clicking on gallery waveform no longer selects the file for import

### v1.5.1 (2026-01-27)
- **Fix**: macOS installer now automatically enables PlayerDebugMode (CSXS 9-16)
- No more manual `defaults write` commands required on macOS

### v1.5.0 (2026-01-27)
- **New Feature**: **Drag and Drop** - Move files between folders by dragging and dropping
- **Multi-selection drag** - Select multiple files and drag them all at once
- **Visual feedback** - Folders highlight when dragging files over them
- **Smart validation** - Prevents overwriting existing files or moving to same folder

### v1.4.1 (2026-01-26)
- **Bugfix**: Fixed waveform display not appearing by ensuring `list-view` class is applied by default.
- **Cleanup**: Removed duplicate event handlers in waveform initialization code.
- **Improvement**: Better check for audio player state before pausing.

### v1.4.0 (2026-01-26)
- **New Feature**: **Audio Waveforms** - Interactive horizontal waveforms for all audio files in List View.
- **Improvement**: **Play on Click** - Clicking the waveform now starts or seeks playback automatically.
- **Improvement**: **Optimized Rendering** - Direct DOM updates prevent list flickering and waveform reloads during file selection.
- **New Setting**: **Show Waveforms** - Toggle waveforms on/off in settings for a more compact list.
- **UI Refinement**: Balanced alignment and compact Gallery mode fixes.

### v1.3.0 (Rollback) (2026-01-22)
- **Rollback**: Reverted to clean architecture (Pre-Webpack/SpellBook) to resolve stability issues.
- **Removed**: Spell Book integration (temporarily removed until a stable implementation is found).
- **Stability**: Restored original file operation logic and installation method.

### v1.2.2 (Deprecated)

### v1.2.0 (2026-01-22)
- **New Feature**: Spell Book integration for keyboard shortcuts via Excalibur
  - `Refresh Database` - Trigger database rescan
  - `Add Selection to Database` - Copy Premiere selection to DB
- **Improvement**: Extension now persists in background for instant shortcut response

### v1.1.0 (2026-01-21)
- **New Feature**: Audio preview - Play audio files directly from the extension
- **New Feature**: Resize slider - Adjust thumbnail and icon sizes in List/Grid views
- **New Feature**: Flatten Import Path option - Import files to root folder only
- **Improvement**: Windows compatibility fixes for path handling
- **Improvement**: Fixed "Open in Explorer" on Windows
- **Fix**: Translation keys now display correctly in settings

### v1.0.0 (2026-01-19)
- **New Feature**: "Import Folder" context menu to recursively import entire folders
- **New Feature**: "Add to Database" button to export from Premiere to Database preserving bin structure
- **New Feature**: Video thumbnail previews (hover to play) in Grid View
- **New Feature**: Expandable folders in List View
- **Improvement**: Added "Consolidation Depth" setting for fine-grained control over folder structure preservation
- **Improvement**: Robust error handling for complex imports and JSON parsing
- **Improvement**: Enhanced cross-platform path handling for folders
- **Fix**: Resolved folder deletion issues in context menu
- **Initial Release**: Database browser, Search, Filters, Favorites, Multi-language support
