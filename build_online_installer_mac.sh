#!/bin/bash
# MAC ONLINE INSTALLER BUILDER
# This script builds a small, lightweight DMG file for macOS.
# Because it does not bundle the 5GB of Python environments and ML models, 
# the resulting app size will be tiny (~30MB).
# 
# NOTE: The Tauri app itself must handle downloading the models/python 
# when the user launches it for the first time on their Mac.

set -e

echo ""
echo "========================================"
echo "  StemSplit Mac ONLINE Installer Builder"
echo "========================================"
echo ""

APP_NAME="StemSplit"
OUTPUT_DIR="installers"
DMG_NAME="${APP_NAME}_Online_Setup.dmg"

# 1. Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# 2. Build frontend assets expected by tauri.conf distDir
echo "[1/3] Building frontend assets..."
npm run build

# 3. Build Tauri App (Without injecting Python dependencies or models)
echo "[2/3] Building Tauri React frontend & rust backend..."
# npm run tauri build creates the .app wrapper
npm run tauri build

APP_BUNDLE="src-tauri/target/release/bundle/macos/${APP_NAME}.app"

# 3. Validation
if [ ! -d "$APP_BUNDLE" ]; then
    echo "Error: App bundle not found! Build failed."
    exit 1
fi

echo "[3/3] Packing into a lightweight DMG..."

# Create temporary directory for DMG contents
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "Copying minimal APP bundle to volume wrapper..."
cp -R "$APP_BUNDLE" "$TEMP_DIR/"

# Create standard Application symlink for drag-and-drop
ln -s /Applications "$TEMP_DIR/Applications"

# We use hdiutil to create the final dmg
hdiutil create -volname "${APP_NAME} Installer" \
               -srcfolder "$TEMP_DIR" \
               -ov -format UDZO \
               "${OUTPUT_DIR}/${DMG_NAME}"

if [ -f "${OUTPUT_DIR}/${DMG_NAME}" ]; then
    DMG_HASH=$(shasum -a 256 "${OUTPUT_DIR}/${DMG_NAME}" | awk '{print $1}')
    echo "${DMG_HASH}  ${DMG_NAME}" > "${OUTPUT_DIR}/checksums-mac.sha256"
fi

echo "=========================================================="
echo "SUCCESS! Lightweight Online DMG created:"
echo "Location: installers/${DMG_NAME}"
echo "Size: $(du -sh "${OUTPUT_DIR}/${DMG_NAME}" | cut -f1)"
echo "Checksums: installers/checksums-mac.sha256"
echo "Next Step: Distribute this DMG. On first run, your Next.js"
echo "Startup sequence should download FFmpeg and Python binaries."
echo "=========================================================="
