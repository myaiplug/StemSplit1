# Building StemSplit for macOS

Complete guide for building and distributing StemSplit on macOS.

## Prerequisites

Before building, ensure you have:

1. **macOS 10.13+** (for building universal binaries, use macOS 11+)
2. **Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```
3. **Homebrew** (recommended for dependencies):
   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```
4. **Rust** (via rustup):
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   # Add iOS/macOS targets for cross-compilation
   rustup target add aarch64-apple-darwin  # Apple Silicon
   rustup target add x86_64-apple-darwin   # Intel
   ```
5. **Node.js & npm** (v18+):
   ```bash
   brew install node
   ```
6. **Python 3.10+**:
   ```bash
   brew install python@3.10
   ```

## Quick Start

To build a complete DMG installer:

```bash
# Make scripts executable
chmod +x build_complete_installer_mac.sh
chmod +x setup_python_env_mac.sh
chmod +x create_mac_dmg.sh

# Build everything (this may take 10-30 minutes on first run)
./build_complete_installer_mac.sh
```

The final DMG will be in `installers/StemSplit.dmg`

## Step-by-Step Build Process

### 1. Setup Python Environment

```bash
# Create virtual environment with all dependencies
./setup_python_env_mac.sh
```

This creates a `python_env/` directory that will be bundled with the app.

### 2. Install Node Dependencies

```bash
npm install
```

### 3. Build Frontend (Next.js)

```bash
npm run build
```

This creates the `out/` directory with static assets.

### 4. Generate App Icons

```bash
cd src-tauri
./generate_icons.sh
cd ..
```

This creates properly formatted macOS icons from your source icon.

### 5. Build Tauri App

```bash
cd src-tauri
cargo tauri build
cd ..
```

This compiles the Rust backend and packages everything into a `.app` bundle.

**Output location**: `src-tauri/target/release/bundle/macos/StemSplit.app`

### 6. Create DMG Installer

```bash
./create_mac_dmg.sh
```

This packages the app into a distributable DMG with a nice installer UI.

**Output location**: `installers/StemSplit.dmg`

## Building Universal Binaries (Intel + Apple Silicon)

To create a universal binary that works on both Intel and Apple Silicon Macs:

```bash
cd src-tauri

# Build for both architectures
cargo tauri build --target universal-apple-darwin

cd ..
```

Or manually combine:

```bash
# Build for each architecture
cargo tauri build --target x86_64-apple-darwin
cargo tauri build --target aarch64-apple-darwin

# Combine into universal binary
lipo -create \
  target/x86_64-apple-darwin/release/stem-split \
  target/aarch64-apple-darwin/release/stem-split \
  -output target/release/stem-split-universal
```

## Code Signing (Optional but Recommended)

For distribution outside the App Store, you'll need a Developer ID certificate.

### 1. Get a Developer ID Certificate

1. Enroll in the [Apple Developer Program](https://developer.apple.com/programs/) ($99/year)
2. Generate a Developer ID Application certificate in Xcode or the Apple Developer portal
3. Install the certificate on your Mac

### 2. Sign the App

```bash
# Sign the app bundle
codesign --deep --force --verify --verbose \
  --sign "Developer ID Application: YOUR NAME (TEAM_ID)" \
  --options runtime \
  --entitlements src-tauri/entitlements.plist \
  src-tauri/target/release/bundle/macos/StemSplit.app

# Verify signature
codesign --verify --deep --strict --verbose=2 \
  src-tauri/target/release/bundle/macos/StemSplit.app

# Check what's signed
codesign -dv --verbose=4 \
  src-tauri/target/release/bundle/macos/StemSplit.app
```

### 3. Notarize the App

Required for Gatekeeper compatibility on macOS 10.15+:

```bash
# Create a zip of the app for notarization
ditto -c -k --keepParent \
  src-tauri/target/release/bundle/macos/StemSplit.app \
  StemSplit.zip

# Submit for notarization (requires app-specific password)
xcrun notarytool submit StemSplit.zip \
  --apple-id "your-email@example.com" \
  --team-id "YOUR_TEAM_ID" \
  --password "app-specific-password" \
  --wait

# Staple the notarization ticket
xcrun stapler staple src-tauri/target/release/bundle/macos/StemSplit.app

# Verify notarization
xcrun stapler validate src-tauri/target/release/bundle/macos/StemSplit.app

# Clean up
rm StemSplit.zip
```

### 4. Sign the DMG

```bash
codesign --sign "Developer ID Application: YOUR NAME (TEAM_ID)" \
  installers/StemSplit.dmg

# Verify
codesign --verify --verbose installers/StemSplit.dmg
```

## Troubleshooting

### Build Failures

**Cargo build fails:**
```bash
# Update Rust
rustup update

# Clean and rebuild
cd src-tauri
cargo clean
cargo build --release
```

**Node build fails:**
```bash
# Clear npm cache
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Python dependencies fail:**
```bash
# Reinstall with no cache
rm -rf python_env
pip cache purge
./setup_python_env_mac.sh
```

### DMG Creation Issues

If `create_mac_dmg.sh` fails:

```bash
# Ensure no mounted DMGs with the same name
hdiutil detach "/Volumes/StemSplit Installer" 2>/dev/null || true

# Remove temp files
rm -f temp.dmg

# Try again
./create_mac_dmg.sh
```

### Permission Issues

```bash
# Make all scripts executable
find . -name "*.sh" -exec chmod +x {} \;
```

## Distribution Checklist

Before distributing your DMG:

- [ ] App is signed with Developer ID
- [ ] App is notarized by Apple
- [ ] DMG is signed
- [ ] Tested on clean Mac (without dev tools)
- [ ] Tested on both Intel and Apple Silicon (if universal)
- [ ] Tested on minimum macOS version (10.13)
- [ ] All models are included and working
- [ ] Python environment is bundled correctly
- [ ] File size is reasonable (<500MB for download)
- [ ] Installation instructions are included

## Continuous Integration

For automated builds, you can use GitHub Actions:

```yaml
name: Build macOS

on: [push, pull_request]

jobs:
  build-macos:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Setup Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          target: universal-apple-darwin
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Build
        run: |
          chmod +x build_complete_installer_mac.sh
          ./build_complete_installer_mac.sh
      
      - name: Upload DMG
        uses: actions/upload-artifact@v3
        with:
          name: StemSplit-macOS
          path: installers/StemSplit.dmg
```

## File Structure

After a successful build:

```
.
├── installers/
│   └── StemSplit.dmg                 # Final distributable
├── python_env/                        # Bundled Python environment
├── src-tauri/
│   ├── target/
│   │   └── release/
│   │       └── bundle/
│   │           └── macos/
│   │               └── StemSplit.app # App bundle
│   ├── icons/                         # Generated icons
│   └── entitlements.plist            # Code signing entitlements
└── out/                               # Built Next.js app
```

## Support

For build issues:
- Check Tauri docs: https://tauri.app/v1/guides/building/macos
- Open an issue on GitHub
- Contact: build-support@stemsplit.com

---

**Last Updated:** March 2026  
**Tauri Version:** 1.7  
**Minimum macOS:** 10.13
