# StemSplit macOS Installer - Quick Reference

Quick commands and troubleshooting for building StemSplit on macOS.

## 🚀 Quick Build

```bash
# One command to build everything
chmod +x build_complete_installer_mac.sh && ./build_complete_installer_mac.sh
```

**Output:** `installers/StemSplit.dmg` (~500MB)

## 📋 Prerequisites Checklist

```bash
# Check if you have everything
node --version          # Should be v18+
cargo --version         # Rust toolchain
python3 --version       # Should be 3.10+
xcode-select -p         # Xcode Command Line Tools
```

Install missing tools:
```bash
# Homebrew (if needed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js
brew install node

# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Python
brew install python@3.10

# Xcode CLI Tools
xcode-select --install
```

## 🔧 Individual Build Steps

```bash
# 1. Python environment
./setup_python_env_mac.sh

# 2. Node dependencies
npm install

# 3. Generate icons
cd src-tauri && ./generate_icons.sh && cd ..

# 4. Build frontend
npm run build

# 5. Build Tauri app
cd src-tauri && cargo tauri build && cd ..

# 6. Create DMG
./create_mac_dmg.sh
```

## 🐛 Common Issues & Fixes

### "Permission denied" on scripts
```bash
find . -name "*.sh" -exec chmod +x {} \;
```

### Cargo build fails
```bash
cd src-tauri
cargo clean
cargo build --release
cd ..
```

### Node build fails
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
npm run build
```

### Python dependencies fail
```bash
rm -rf python_env
./setup_python_env_mac.sh
```

### DMG already mounted
```bash
hdiutil detach "/Volumes/StemSplit Installer" 2>/dev/null || true
./create_mac_dmg.sh
```

### App won't open ("damaged")
```bash
# Remove quarantine attribute
xattr -cr /Applications/StemSplit.app
```

## 📦 Universal Binary (Intel + Apple Silicon)

```bash
cd src-tauri
cargo tauri build --target universal-apple-darwin
cd ..
```

## 🔐 Code Signing

```bash
# Sign app bundle
codesign --deep --force \
  --sign "Developer ID Application: YOUR NAME" \
  --options runtime \
  --entitlements src-tauri/entitlements.plist \
  src-tauri/target/release/bundle/macos/StemSplit.app

# Verify
codesign --verify --deep --strict --verbose=2 \
  src-tauri/target/release/bundle/macos/StemSplit.app
```

## 🔔 Notarization

```bash
# Package for notarization
ditto -c -k --keepParent \
  src-tauri/target/release/bundle/macos/StemSplit.app \
  StemSplit.zip

# Submit (requires Apple Developer account)
xcrun notarytool submit StemSplit.zip \
  --apple-id "your-email@example.com" \
  --team-id "YOUR_TEAM_ID" \
  --password "app-specific-password" \
  --wait

# Staple ticket
xcrun stapler staple src-tauri/target/release/bundle/macos/StemSplit.app

# Clean up
rm StemSplit.zip
```

## 📁 File Locations

| File | Location |
|------|----------|
| Final DMG | `installers/StemSplit.dmg` |
| App Bundle | `src-tauri/target/release/bundle/macos/StemSplit.app` |
| Python Env | `python_env/` |
| Frontend Build | `out/` |
| Icons | `src-tauri/icons/` |

## 🧪 Testing

```bash
# Test app directly
open src-tauri/target/release/bundle/macos/StemSplit.app

# Test DMG
open installers/StemSplit.dmg

# Check app signature
codesign -dv src-tauri/target/release/bundle/macos/StemSplit.app

# Check app size
du -sh src-tauri/target/release/bundle/macos/StemSplit.app
```

## 🌐 Continuous Integration

GitHub Actions will automatically build on push:
- **Trigger:** Push to main/develop or create a tag
- **Output:** DMG artifact in Actions tab
- **Release:** Automatically attached to tagged releases

View workflow: `.github/workflows/build-macos.yml`

## 📚 Full Documentation

- **BUILD_MAC.md** - Complete build guide
- **INSTALLATION_MAC.md** - User installation instructions
- **src-tauri/tauri.conf.json** - App configuration
- **src-tauri/entitlements.plist** - Signing entitlements

## ⚡ Speed Tips

```bash
# Parallel builds
cd src-tauri
cargo build --release -j$(sysctl -n hw.ncpu)

# Skip dependency check
cargo tauri build --no-bundle

# Use sccache for faster builds
brew install sccache
export RUSTC_WRAPPER=sccache
```

## 🎯 Production Checklist

- [ ] App signed with Developer ID
- [ ] App notarized by Apple
- [ ] DMG signed
- [ ] Tested on clean Mac (Intel & Apple Silicon)
- [ ] Tested on macOS 10.13 minimum
- [ ] All models included
- [ ] Python environment bundled
- [ ] Installation guide included
- [ ] Version number updated
- [ ] Release notes prepared

## 🆘 Get Help

- **Detailed Guide:** Read `BUILD_MAC.md`
- **User Instructions:** Read `INSTALLATION_MAC.md`
- **Tauri Docs:** https://tauri.app/v1/guides/building/macos
- **GitHub Issues:** Open an issue with build logs

---

**Version:** 0.1.0  
**Updated:** March 2026  
**Platform:** macOS 10.13+
