# Data Base - Adobe Premiere Pro Extension

A powerful media database browser extension for Adobe Premiere Pro. Organize, search, and import media files from a centralized database folder directly into your Premiere Pro projects.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Premiere Pro](https://img.shields.io/badge/Premiere%20Pro-2023%2B-purple)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey)

## ✨ Features

### 📁 Database Browser
- Configure a root folder as your media database
- Browse files and folders with intuitive navigation
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

### 📥 Smart Import
- Multi-select files for batch import
- **Automatic bin creation** matching your database folder structure
  - Example: `DATABASE/ELEMENTS/TEST/clip.mp4` → Creates `ELEMENTS/TEST` bin in Premiere
- Progress indicator during import

### 📂 Folder Management
- Create new folders within your database
- Delete files and folders
- Refresh database contents

### 🔄 Consolidate Option
- Optional setting to copy files to project folder on import
- Preserves folder structure in project folder
- Disabled by default

### 🌍 Multi-Language Support
- English (default)
- French (Français)
- Easily extensible for additional languages

## 📋 Requirements

- Adobe Premiere Pro 2023 or later
- macOS 10.14+ or Windows 10+

## 🚀 Installation

### macOS

1. Download or clone this repository
2. Open Terminal and navigate to the Source folder:
   ```bash
   cd /path/to/PremiereDataBase/Source
   ```
3. Make the install script executable and run it:
   ```bash
   chmod +x install_macos.sh
   ./install_macos.sh
   ```
4. Enable unsigned extensions (if not already done):
   ```bash
   defaults write com.adobe.CSXS.11 PlayerDebugMode 1
   ```
5. Restart Premiere Pro

### Windows

1. Download or clone this repository
2. Right-click `install_windows.bat` and select **Run as Administrator**
3. Enable unsigned extensions:
   - Open Registry Editor (regedit)
   - Navigate to `HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.11`
   - Create a new String value: `PlayerDebugMode` = `1`
4. Restart Premiere Pro

## 📖 Usage

### Initial Setup

1. Open Premiere Pro
2. Go to **Window → Extensions → Data Base**
3. Click the ⚙️ settings button
4. Click the folder icon to select your database root folder
5. Click **Save**

### Browsing & Searching

- Navigate folders by clicking on them
- Use the breadcrumb to go back to parent folders
- Type in the search bar to filter files in real-time
- Click type buttons (Video/Audio/Image) to filter by file type
- Click the ⭐ button to show only favorites

### Importing Files

1. Select files by clicking on them (or use the checkbox)
2. Use **Select All** / **Deselect All** buttons as needed
3. Click the **Import** button
4. Files will be imported with automatic bin creation matching your folder structure

### Managing Favorites

- Click the ⭐ icon on any file to add/remove from favorites
- Right-click for context menu with favorite options
- Click the favorites filter (⭐ button in search bar) to show only favorites

## ⚙️ Settings

| Setting | Description |
|---------|-------------|
| **Database Path** | Root folder containing your media files |
| **Language** | UI language (English/French) |
| **Copy on Import** | Copy files to project folder when importing (preserves structure) |
| **Excluded Extensions** | File extensions to skip during scanning |
| **Excluded Folders** | Folder names to skip (e.g., .git, node_modules) |

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
├── .gitignore
├── Source/
│   ├── CSXS/
│   │   └── manifest.xml
│   ├── client/
│   │   ├── index.html
│   │   ├── css/
│   │   │   └── style.css
│   │   ├── js/
│   │   │   ├── CSInterface.js
│   │   │   ├── fileOperations.js
│   │   │   └── main.js
│   │   └── lang/
│   │       ├── en.json
│   │       └── fr.json
│   ├── host/
│   │   └── index.jsx
│   ├── install_macos.sh
│   └── install_windows.bat
└── Releases/
```

## 🔧 Troubleshooting

### Extension doesn't appear in Premiere Pro

1. Make sure you've enabled unsigned extensions:
   - **macOS**: `defaults write com.adobe.CSXS.11 PlayerDebugMode 1`
   - **Windows**: Add `PlayerDebugMode = 1` in Registry at `HKEY_CURRENT_USER\SOFTWARE\Adobe\CSXS.11`
2. Restart Premiere Pro after installation

### Files not appearing in database

1. Check that your database path is correctly set in settings
2. Verify file extensions are not in the excluded list
3. Check that folder names are not in the excluded folders list
4. Click the refresh button to rescan

### Import fails

1. Verify the files exist and are accessible
2. Check Premiere Pro console for error messages
3. Ensure you have write permissions to the project folder (if consolidate is enabled)

## 📜 License

MIT License - Feel free to use and modify as needed.

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues or pull requests.

## 📝 Changelog

### v1.0.0 (2025-01-19)
- Initial release
- Database browser with search and filters
- Smart import with automatic bin creation
- Favorites system
- Multi-language support (EN/FR)
- List and grid view modes
- Consolidate on import option
