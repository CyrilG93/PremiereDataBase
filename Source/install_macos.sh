#!/bin/bash
# Installation script for Data Base extension - macOS

EXTENSION_NAME="com.database.premiere"
SOURCE_DIR="$(dirname "$0")"

# Get the parent directory (Source folder)
cd "$SOURCE_DIR"
SOURCE_DIR=$(pwd)

# CEP Extensions directory
CEP_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"

# Create extensions directory if it doesn't exist
mkdir -p "$CEP_DIR"

# Remove existing installation (folder or symlink)
rm -rf "$CEP_DIR/$EXTENSION_NAME"
mkdir -p "$CEP_DIR/$EXTENSION_NAME"

echo "📦 Installing npm dependencies..."
# Install/update npm packages (spell-book, esm, etc.)
if command -v npm &> /dev/null; then
    npm install --silent
else
    echo "⚠️  npm not found. Please install Node.js to enable SpellBook integration."
fi

echo "📂 Copying files..."

# Copy specific directories and files
cp -R "$SOURCE_DIR/CSXS" "$CEP_DIR/$EXTENSION_NAME/"
cp -R "$SOURCE_DIR/client" "$CEP_DIR/$EXTENSION_NAME/"
cp -R "$SOURCE_DIR/host" "$CEP_DIR/$EXTENSION_NAME/"
cp -R "$SOURCE_DIR/node_modules" "$CEP_DIR/$EXTENSION_NAME/" 2>/dev/null || true
cp "$SOURCE_DIR/package.json" "$CEP_DIR/$EXTENSION_NAME/"
cp "$SOURCE_DIR/.debug" "$CEP_DIR/$EXTENSION_NAME/"

# Fix permissions if needed
chmod -R 755 "$CEP_DIR/$EXTENSION_NAME"

echo "✅ Data Base extension installed successfully!"
echo ""
echo "📁 Location: $CEP_DIR/$EXTENSION_NAME"
echo ""
echo "⚠️  If the extension doesn't appear in Premiere Pro:"
echo "    1. Enable unsigned extensions by running in Terminal:"
echo "       defaults write com.adobe.CSXS.9 PlayerDebugMode 1"
echo "       defaults write com.adobe.CSXS.10 PlayerDebugMode 1"
echo "       defaults write com.adobe.CSXS.11 PlayerDebugMode 1"
echo "       defaults write com.adobe.CSXS.12 PlayerDebugMode 1"
echo "       defaults write com.adobe.CSXS.13 PlayerDebugMode 1"
echo "       defaults write com.adobe.CSXS.14 PlayerDebugMode 1"
echo "       defaults write com.adobe.CSXS.15 PlayerDebugMode 1"
echo "    2. Restart Premiere Pro"
echo ""
echo "🚀 Access via: Window > Extensions > Data Base"
