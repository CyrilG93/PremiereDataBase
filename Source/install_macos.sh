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

echo "📂 copying files..."

# Copy specific directories and files to avoid clutter (like .git, .DS_Store)
cp -R "$SOURCE_DIR/CSXS" "$CEP_DIR/$EXTENSION_NAME/"
cp -R "$SOURCE_DIR/client" "$CEP_DIR/$EXTENSION_NAME/"
cp -R "$SOURCE_DIR/host" "$CEP_DIR/$EXTENSION_NAME/"
cp -R "$SOURCE_DIR/node_modules" "$CEP_DIR/$EXTENSION_NAME/"
cp "$SOURCE_DIR/package.json" "$CEP_DIR/$EXTENSION_NAME/"

# Fix permissions if needed
chmod -R 755 "$CEP_DIR/$EXTENSION_NAME"

echo "✅ Data Base extension installed successfully!"
echo ""
echo "📁 Location: $CEP_DIR/$EXTENSION_NAME"
echo ""
echo "⚠️  If the extension doesn't appear in Premiere Pro:"
echo "    1. Enable unsigned extensions by running in Terminal:"
echo "       defaults write com.adobe.CSXS.11 PlayerDebugMode 1"
echo "    2. Restart Premiere Pro"
echo ""
echo "🚀 Access via: Window > Extensions > Data Base"
