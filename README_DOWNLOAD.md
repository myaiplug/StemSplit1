# Download StemSplit

Professional AI-powered audio stem separation tool.

## 📥 Download

### Windows
[![Download for Windows](https://img.shields.io/badge/Download-Windows%20x64-blue?style=for-the-badge&logo=windows)](https://github.com/myaiplug/StemSplit1/releases/latest/download/StemSplit_Setup_v0.1.0_x64_Online.exe)

**File:** `StemSplit_Setup_v0.1.0_x64_Online.exe`

### macOS
[![Download for macOS Intel](https://img.shields.io/badge/Download-macOS%20Intel-black?style=for-the-badge&logo=apple)](https://github.com/myaiplug/StemSplit1/releases/latest/download/StemSplit_Online_Setup_macOS_Intel.dmg)
[![Download for macOS Apple Silicon](https://img.shields.io/badge/Download-macOS%20Apple%20Silicon-black?style=for-the-badge&logo=apple)](https://github.com/myaiplug/StemSplit1/releases/latest/download/StemSplit_Online_Setup_macOS_AppleSilicon.dmg)

**Intel file:** `StemSplit_Online_Setup_macOS_Intel.dmg`  
**Apple Silicon file:** `StemSplit_Online_Setup_macOS_AppleSilicon.dmg`

---

## Free Trial and Upgrade

StemSplit is free to download and includes a trial mode out of the box.

Flow:
1. Download and install StemSplit.
2. Launch app and use trial mode immediately.
3. Upgrade in-app when you want full features.
4. Enter your license key to unlock Pro features.

Trial vs Pro:

| Feature | Trial (Free) | Pro (Paid) |
|---|---|---|
| Max file length | Up to 3 minutes | Unlimited |
| Stem modes | 2-stem (vocals + instrumental) | Full stem set |
| Output format | MP3 | WAV + MP3 |
| Separation engines | Spleeter | All available engines |
| Batch processing | No | Yes |
| FX and VST tools | No | Yes |

---

## 🚀 Installation

### Windows Installation
1. **Download** the `.exe` installer above
2. **Double-click** to run
3. Click **"Next"** through the installer wizard
4. **Launch** from the Start Menu or Desktop shortcut

**No additional software required** - everything is included!

### macOS Installation
1. **Download** the correct `.dmg` for your Mac CPU:
	- Intel Mac: `..._macOS_Intel.dmg`
	- Apple Silicon (M1/M2/M3/M4): `..._macOS_AppleSilicon.dmg`
2. **Double-click** to mount the disk image
3. **Drag** StemSplit to the Applications folder
4. **Right-click** the app and select "Open" (first time only)
5. Click **"Open"** in the security dialog

**No additional software required** - everything is included!

---

## 💻 System Requirements

### Windows
- Windows 10 (1809+) or Windows 11
- 8 GB RAM minimum (16 GB recommended)
- 10 GB free disk space
- x64 processor

### macOS
- macOS 10.13 High Sierra or later
- 8 GB RAM minimum (16 GB recommended)
- 10 GB free disk space
- Intel or Apple Silicon processor

---

## 🔒 Security

### Windows
- The installer is built with Inno Setup
- Windows Defender may scan on first run (this is normal)
- Not code-signed yet (you may see a SmartScreen warning - click "More info" → "Run anyway")

### macOS
- The app bundle is built with Tauri
- First launch requires right-click → "Open" (Gatekeeper security)
- Not code-signed yet (working on Apple Developer certification)

**Why the security warnings?**  
We haven't purchased code signing certificates yet ($300-400/year), but the software is safe. All builds are reproducible from source code.

---

## 🛠️ Troubleshooting

### Windows: "Windows protected your PC"
This is Windows SmartScreen (apps without expensive code signing certificates trigger this).

**Fix:** Click **"More info"** → **"Run anyway"**

### macOS: "App is damaged and can't be opened"
This is macOS Gatekeeper blocking unsigned apps.

**Fix:** 
```bash
xattr -cr /Applications/StemSplit.app
```

Or: **Right-click** app → **"Open"** → Click **"Open"** in dialog

### macOS: "This application is not supported on this Mac"
This means the installer architecture does not match your CPU.

**Fix:**
- Intel MacBook/iMac: download `StemSplit_Online_Setup_macOS_Intel.dmg`
- Apple Silicon (M1/M2/M3/M4): download `StemSplit_Online_Setup_macOS_AppleSilicon.dmg`

### Still Having Issues?
- [Installation Guide (Windows)](INSTALLATION_WINDOWS.md)
- [Installation Guide (macOS)](INSTALLATION_MAC.md)
- [Open an issue](https://github.com/myaiplug/StemSplit1/issues)

---

## 🏗️ Build from Source

Want to build it yourself? See:
- [Windows Build Guide](build_complete_installer.ps1)
- [macOS Build Guide](BUILD_MAC.md)
- [Contributing Guide](CONTRIBUTING.md)

---

## 📝 Version History

See [Releases](https://github.com/myaiplug/StemSplit1/releases) for changelog.

---

## ⭐ Support the Project

If you find StemSplit useful:
- ⭐ Star this repository
- 🐛 Report bugs and request features
- 🤝 Contribute code or documentation
- ☕ [Buy me a coffee](https://ko-fi.com/myaiplug)

---

**Current Version:** 0.1.0  
**Last Updated:** March 2026  
**License:** MIT
