# StemSplit - macOS Installation Guide

## System Requirements

- macOS 10.13 (High Sierra) or later
- 8 GB RAM minimum (16 GB recommended)
- 10 GB free disk space (for models and processing)
- Apple Silicon (M1/M2/M3) or Intel processor

## Installation Steps

### Option 1: DMG Installer (Recommended)

1. **Download** `StemSplit.dmg` from the releases page
2. **Open** the DMG file by double-clicking it
3. **Drag** the StemSplit app to the Applications folder
4. **Eject** the DMG from Finder

### Option 2: Build from Source

If you prefer to build from source:

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/stemsplit.git
cd stemsplit

# 2. Install dependencies
# Make sure you have Node.js, Rust, and Python 3.10+ installed
npm install

# 3. Build the installer
chmod +x build_complete_installer_mac.sh
./build_complete_installer_mac.sh
```

## First Launch

### Gatekeeper Warning

When you first open StemSplit, macOS may show a security warning because the app is not from the App Store.

**To bypass this:**

1. Right-click (or Control-click) on StemSplit in Applications
2. Select "Open" from the context menu
3. Click "Open" in the security dialog
4. The app will launch and remember this choice

**Alternative method:**
```bash
# Remove the quarantine attribute
xattr -d com.apple.quarantine /Applications/StemSplit.app
```

### Python Environment

On first launch, StemSplit will:
- Set up its embedded Python environment
- Download required audio processing models (this may take a few minutes)
- Configure audio processing backends

**Note:** Internet connection required for initial setup.

## Troubleshooting

### App Won't Open

If you see "App is damaged and can't be opened":

```bash
# Remove quarantine attribute
xattr -cr /Applications/StemSplit.app

# If that doesn't work, remove all extended attributes
sudo xattr -d -r com.apple.quarantine /Applications/StemSplit.app
```

### Python Errors

If you encounter Python-related errors:

```bash
# Verify Python environment
ls /Applications/StemSplit.app/Contents/Resources/python_env

# If missing, reinstall the app or build from source
```

### Audio Device Access

If StemSplit asks for microphone access:
- Go to System Preferences > Security & Privacy > Microphone
- Check the box next to StemSplit
- Restart the app

### Performance Issues

For best performance:
- Close other audio applications
- Use SSD storage for processing
- Ensure sufficient free RAM (4GB+ available)
- On Apple Silicon Macs, the app runs natively for better performance

## Uninstallation

To completely remove StemSplit:

```bash
# Remove the application
rm -rf /Applications/StemSplit.app

# Remove application data (optional)
rm -rf ~/Library/Application\ Support/com.stemsplit.app
rm -rf ~/Library/Caches/com.stemsplit.app
rm -rf ~/Library/Preferences/com.stemsplit.app.plist
```

## Model Storage

Audio separation models are stored in:
```
/Applications/StemSplit.app/Contents/Resources/Stem Split Models/
```

These models are included in the DMG and total approximately 2-5 GB.

## Support

For issues, feature requests, or questions:
- GitHub Issues: https://github.com/yourusername/stemsplit/issues
- Email: support@stemsplit.com

## Building Custom Installers

Developers can customize the installer:

```bash
# Edit DMG appearance
nano src-tauri/tauri.conf.json

# Modify Python dependencies
nano requirements.txt

# Rebuild installer
./build_complete_installer_mac.sh
```

---

**Version:** 0.1.0  
**Last Updated:** March 2026  
**License:** See LICENSE file
