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

# Remove existing installation
rm -rf "$CEP_DIR/$EXTENSION_NAME"

# Create symlink to source
ln -s "$SOURCE_DIR" "$CEP_DIR/$EXTENSION_NAME"

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
