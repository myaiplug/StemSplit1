# Platform Comparison: Windows vs macOS Installers

Quick reference showing differences between building for Windows and macOS.

## Build Commands

| Platform | Command |
|----------|---------|
| Windows | `.\build_complete_installer.ps1` |
| macOS | `./build_complete_installer_mac.sh` |

## Output Formats

| Platform | Format | Typical Size | Extension |
|----------|--------|--------------|-----------|
| Windows | Inno Setup Installer | 300-500 MB | `.exe` |
| macOS | DMG Disk Image | 400-600 MB | `.dmg` |

## Python Environment

| Platform | Type | Script |
|----------|------|--------|
| Windows | Embedded Python | `setup_embedded_python.ps1` |
| macOS | Virtual Environment| `setup_python_env_mac.sh` |

### Windows
- Downloads Python 3.10.11 embedded distribution
- Extracts to `python_embed/`
- Modifies `._pth` file for site-packages
- Portable, no system Python needed

### macOS
- Uses system Python or Homebrew Python
- Creates virtual environment in `python_env/`
- Activates via `source python_env/bin/activate`
- Bundled with app in Resources folder

## Installer Technology

### Windows
- **Tool:** Inno Setup 6
- **Script:** `setup.iss`
- **Features:**
  - GUI installer wizard
  - Registry integration
  - Start menu shortcuts
  - Desktop icon (optional)
  - Uninstaller automatically created
  - Custom icon support

### macOS
- **Tool:** Native `hdiutil` + Tauri bundler
- **Script:** `create_mac_dmg.sh`
- **Features:**
  - Drag-and-drop installation
  - Custom DMG background
  - Applications folder symlink
  - Volume styling
  - ICNS icon support
  - Optional code signing

## Build Architecture

| Platform | Architecture | Notes |
|----------|--------------|-------|
| Windows | x64 only | ArchitecturesAllowed=x64 |
| macOS | Universal Binary | Intel + Apple Silicon (optional) |
| macOS | x86_64 only | Intel Macs |
| macOS | aarch64 only | Apple Silicon |

### Windows
```powershell
cd src-tauri
cargo build --release --target x86_64-pc-windows-msvc
```

### macOS Universal
```bash
cd src-tauri
cargo tauri build --target universal-apple-darwin
```

## File Structure

### Windows
```
installers/
└── StemSplit_Setup_x64.exe

Application installed to:
C:\Program Files\StemSplit\
├── stem-split.exe
├── embedded_python\
├── scripts\
├── Stem Split Models\
├── UVR\
├── drumsep-main\
└── MVSEP-MDX23-music-separation-model-main\
```

### macOS
```
installers/
└── StemSplit.dmg

Application installed to:
/Applications/StemSplit.app/
└── Contents/
    ├── MacOS/
    │   └── stem-split
    ├── Resources/
    │   ├── python_env\
    │   ├── scripts\
    │   ├── Stem Split Models\
    │   ├── UVR\
    │   ├── drumsep-main\
    │   └── MVSEP-MDX23-music-separation-model-main\
    └── Info.plist
```

## Code Signing

### Windows
- **Optional** for distribution
- Use `signtool.exe` with code signing certificate
- Not required for installation
```powershell
signtool sign /f certificate.pfx /p password /t http://timestamp.digicert.com StemSplit_Setup_x64.exe
```

### macOS
- **Required** for Gatekeeper (macOS 10.15+)
- Needs Apple Developer ID ($99/year)
- Must notarize with Apple
```bash
codesign --sign "Developer ID Application" --options runtime StemSplit.app
xcrun notarytool submit StemSplit.zip --apple-id ... --wait
xcrun stapler staple StemSplit.app
```

## Permissions & Security

### Windows
- **UAC Prompt:** For Program Files installation
- **Firewall:** May prompt for Python network access
- **Antivirus:** Embedded Python might trigger scans
- **SmartScreen:** Unsigned apps show warning

### macOS
- **Gatekeeper:** Blocks unsigned apps by default
- **Quarantine:** Downloads marked with quarantine attribute
- **Entitlements:** Required for network, file access, JIT
- **Hardened Runtime:** Required for notarization
- **TCC:** May prompt for microphone/file access

## Dependencies Bundled

| Dependency | Windows | macOS | Size Impact |
|------------|---------|-------|-------------|
| Python Runtime | ✅ Embedded | ✅ Virtual Env | ~50 MB |
| NumPy | ✅ | ✅ | ~20 MB |
| PyTorch | ✅ | ✅ | ~200 MB |
| Audio Libraries | ✅ | ✅ | ~10 MB |
| ML Models | ✅ | ✅ | ~2-3 GB  |
| FFMPEG | Runtime DLL | System or bundled | ~50 MB |

## Installation Experience

### Windows
1. Download `.exe` file
2. Double-click to run
3. UAC prompt (accept)
4. Follow wizard (Next, Next, Install)
5. Desktop shortcut created (optional)
6. Launch from Start Menu or Desktop

### macOS
1. Download `.dmg` file
2. Double-click to mount
3. Drag app to Applications folder
4. Eject DMG
5. Right-click app → Open (first time only)
6. Accept Gatekeeper warning
7. Launch normally after that

## Uninstallation

### Windows
- Control Panel → Programs and Features → Uninstall
- Or: Run `unins000.exe` in installation folder
- Removes all files and registry entries

### macOS
- Delete `/Applications/StemSplit.app`
- Optional: Clean app data:
  ```bash
  rm -rf ~/Library/Application\ Support/com.stemsplit.app
  rm -rf ~/Library/Caches/com.stemsplit.app
  rm -rf ~/Library/Preferences/com.stemsplit.app.plist
  ```

## Tauri Configuration

### Windows Specific
```json
{
  "tauri": {
    "bundle": {
      "windows": {
        "certificateThumbprint": null,
        "digestAlgorithm": "sha256",
        "timestampUrl": ""
      }
    }
  }
}
```

### macOS Specific
```json
{
  "tauri": {
    "bundle": {
      "macOS": {
        "frameworks": [],
        "minimumSystemVersion": "10.13",
        "hardenedRuntime": true,
        "entitlements": "entitlements.plist"
      },
      "dmg": {
        "background": "dmg-background.png",
        "window": { "width": 600, "height": 400 }
      }
    }
  }
}
```

## CI/CD

### Windows
- Build on: `windows-latest`
- runners: GitHub-hosted or self-hosted Windows
- Time: ~15-25 minutes

### macOS
- Build on: `macos-latest` (currently macOS 12)
- Runners: GitHub-hosted (macOS 12/13) or self-hosted
- Time: ~20-30 minutes
- Can build universal binaries

## Testing Matrix

| OS | Minimum Version | Recommended | Notes |
|----|----------------|-------------|-------|
| Windows 10 | 1809 (Oct 2018) | 21H2+ | x64 only |
| Windows 11 | All versions | Latest | Native ARM support possible |
| macOS | 10.13 High Sierra | 12.0+ Monterey | Universal binary recommended |

## Distribution Platforms

| Platform | Windows | macOS | Notes |
|----------|---------|-------|-------|
| GitHub Releases | ✅ .exe | ✅ .dmg | Recommended |
| Website (Direct) | ✅ | ✅ | Add download instructions |
| Microsoft Store | ⚠️ Requires MSIX | ❌ | Additional packaging |
| Mac App Store | ❌ | ⚠️ Requires sandbox | Strict requirements |
| Homebrew Cask | ❌ | ✅ | Community maintained |
| Winget | ✅ | ❌ | Windows Package Manager |
| Chocolatey | ✅ | ❌ | Community package manager |

## Auto-Update Support

Both platforms support auto-update via Tauri's built-in updater:

```json
{
  "tauri": {
    "updater": {
      "active": true,
      "endpoints": ["https://releases.stemsplit.com/{{target}}/{{current_version}}"],
      "dialog": true,
      "pubkey": "YOUR_PUBLIC_KEY"
    }
  }
}
```

## Quick Commands

### Windows
```powershell
# Full build
.\build_complete_installer.ps1

# Tauri only
cd src-tauri; cargo tauri build; cd ..

# Open installer folder
explorer installers
```

### macOS
```bash
# Full build
./build_complete_installer_mac.sh

# Tauri only
cd src-tauri && cargo tauri build && cd ..

# Open installer folder
open installers/
```

## File Size Optimizations

### Both Platforms
- Use `strip = true` in Cargo.toml
- Use `opt-level = "z"` for size
- Enable LTO (Link Time Optimization)
- Compress assets (models can be downloaded on demand)

### Windows
- Use LZMA2 compression in Inno Setup
- Set `SolidCompression=yes`

### macOS
- Use `hdiutil compress` with zlib level 9
- Bundle only essential Python packages

---

## Summary

| Aspect | Windows | macOS |
|--------|---------|-------|
| **Ease of Build** | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **User Install** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Code Signing** | Optional | Required for distribution |
| **File Size** | Smaller | Slightly larger |
| **Build Time** | Faster | Slower (universal builds) |
| **Distribution** | Easier | Requires Apple Developer account |

---

**For questions or issues with either platform, refer to:**
- **Windows:** `setup.iss`, `build_complete_installer.ps1`
- **macOS:** `BUILD_MAC.md`, `build_complete_installer_mac.sh`
