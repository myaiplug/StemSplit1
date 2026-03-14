# Building Mac Installers WITHOUT a Mac

Complete guide for building professional macOS installers using GitHub Actions - no Mac required!

## 🎯 The Problem

macOS installers require:
- ❌ macOS-specific tools (`hdiutil`, `iconutil`, `codesign`)
- ❌ Xcode Command Line Tools
- ❌ Apple Developer account (for signing/notarizing)
- ❌ A physical Mac or Mac VM

**You can't realistically build proper Mac installers on Windows.**

## ✅ The Solution: GitHub Actions

Use GitHub's free macOS build servers. **This is what professional companies do!**

### Benefits:
- ✅ **FREE** for public repos (2000 min/month for private)
- ✅ **Real macOS** environment (latest versions)
- ✅ **Automated** builds on every push
- ✅ **Professional** DMG output
- ✅ Can add code signing later
- ✅ No Mac ownership required

---

## 🚀 Setup (5 Minutes)

### Step 1: Create GitHub Repository

```powershell
# In your project directory (e:\Projects\1_StemSplit)

# Initialize git (if not already done)
git init

# Add all files
git add .
git commit -m "Add Mac installer build system"

# Create repo on GitHub (github.com/new), then:
git remote add origin https://github.com/YOUR_USERNAME/stemsplit.git
git branch -M main
git push -u origin main
```

### Step 2: Verify Workflow File Exists

The workflow is already created at `.github/workflows/build-macos.yml`

You can check it:
```powershell
Get-Content .github\workflows\build-macos.yml
```

### Step 3: Make Scripts Executable (Important!)

Git needs to track execute permissions:

```powershell
# On Windows, mark as executable in Git
git update-index --chmod=+x build_complete_installer_mac.sh
git update-index --chmod=+x setup_python_env_mac.sh
git update-index --chmod=+x create_mac_dmg.sh
git update-index --chmod=+x src-tauri/generate_icons.sh

# Commit the permission changes
git commit -m "Mark shell scripts as executable"
git push
```

### Step 4: Trigger Your First Build

**Option A: Push to trigger auto-build**
```powershell
# Any push to main triggers a build
git add .
git commit -m "Trigger Mac build"
git push
```

**Option B: Create a release tag**
```powershell
# This builds AND creates a GitHub Release
git tag -a v0.1.0 -m "First release"
git push origin v0.1.0
```

**Option C: Manual trigger**
1. Go to your repo on GitHub
2. Click **Actions** tab
3. Click **Build macOS Installer** workflow
4. Click **Run workflow** → **Run workflow**

---

## 📦 Getting Your DMG

### From Actions Artifacts (Any Build)

1. Go to **Actions** tab in your GitHub repo
2. Click on the latest **Build macOS Installer** run
3. Scroll down to **Artifacts**
4. Download **StemSplit-macOS-xxx** (zip file)
5. Extract to get `StemSplit.dmg`

### From Releases (Tagged Builds Only)

1. Go to **Releases** section in your repo
2. Click on the version tag (e.g., `v0.1.0`)
3. Download `StemSplit.dmg` directly
4. This is the link you'll share with users!

---

## 🎬 Full Workflow Example

Here's a complete example of releasing version 1.0:

```powershell
# 1. Update version number
code src-tauri\tauri.conf.json
# Change "version": "1.0.0"

code src-tauri\Cargo.toml  
# Change version = "1.0.0"

# 2. Commit version changes
git add src-tauri/tauri.conf.json src-tauri/Cargo.toml
git commit -m "Bump version to 1.0.0"
git push

# 3. Create release tag
git tag -a v1.0.0 -m "Release 1.0.0 - Initial public release"
git push origin v1.0.0

# 4. Wait ~20-30 minutes for build to complete

# 5. Check your releases page:
# https://github.com/YOUR_USERNAME/stemsplit/releases/tag/v1.0.0

# You'll see:
# - Windows installer: StemSplit_Setup_x64.exe (if you set up Windows builds)
# - macOS installer: StemSplit.dmg (from GitHub Actions)
```

Now share that release URL with users!

---

## 🔧 Customizing the Build

### Change Build Triggers

Edit `.github/workflows/build-macos.yml`:

```yaml
# Build on every push to main
on:
  push:
    branches: [ main ]

# Or: Build only on tags
on:
  push:
    tags:
      - 'v*'

# Or: Build on pull requests
on:
  pull_request:
    branches: [ main ]
```

### Add Secrets (for Code Signing)

When you get an Apple Developer account:

1. Go to repo **Settings** → **Secrets and variables** → **Actions**
2. Add secrets:
   - `APPLE_DEVELOPER_ID`
   - `APPLE_APP_PASSWORD`
   - `APPLE_TEAM_ID`
3. Update workflow to use them

### Monitor Build Status

Add a badge to your README:

```markdown
[![macOS Build](https://github.com/YOUR_USERNAME/stemsplit/actions/workflows/build-macos.yml/badge.svg)](https://github.com/YOUR_USERNAME/stemsplit/actions/workflows/build-macos.yml)
```

---

## 💰 Cost Analysis

### GitHub Actions (Recommended)

| Repo Type | Free Minutes | Cost After |
|-----------|--------------|------------|
| Public | Unlimited | FREE |
| Private | 2,000 min/month | $0.008/min |

**Your build takes ~25 minutes**, so:
- Public repo: **FREE FOREVER** ✅
- Private repo: ~80 builds/month free, then $0.20/build

### Alternatives (NOT Recommended)

| Service | Cost | Notes |
|---------|------|-------|
| MacStadium | $79+/month | Overkill for builds |
| MacinCloud | $30+/month | Still expensive |
| AWS EC2 Mac | $1.00+/hour | Only for heavy usage |
| Physical Mac Mini | $599+ one-time | If you build A LOT |

**Verdict:** GitHub Actions is the clear winner for your use case.

---

## ⚠️ Limitations

What you **CAN'T** do without a Mac:

1. **Code Signing** (requires Mac + Apple Developer account)
2. **Notarization** (requires Mac + Apple Developer account)
3. **App Store Distribution** (requires Mac)
4. **Local Testing** (can't run macOS apps on Windows)

What you **CAN** do:

1. ✅ Build fully functional .dmg installers
2. ✅ Bundle all dependencies (Python, models, etc.)
3. ✅ Create professional drag-and-drop installers
4. ✅ Distribute via GitHub Releases
5. ✅ Users can install with right-click → Open (bypass Gatekeeper)

**The unsigned installer works perfectly** - users just need to right-click → "Open" the first time.

---

## 🎓 Alternative: Rent a Mac for Initial Setup

If you want to test/sign once, you could:

1. **MacinCloud** - $30 for 30 days
   - Remote Mac access
   - Test your installer
   - Set up code signing
   - Then cancel

2. **Ask a friend with a Mac** to:
   - Run your build script
   - Test the installer
   - Send you the DMG

But for ongoing builds, **GitHub Actions is still better**.

---

## 🏃 Quick Start Checklist

- [ ] Push code to GitHub
- [ ] Verify `.github/workflows/build-macos.yml` exists
- [ ] Mark shell scripts as executable in Git
- [ ] Tag a release: `git tag v0.1.0 && git push origin v0.1.0`
- [ ] Wait ~25 minutes
- [ ] Download DMG from Releases
- [ ] Test on a Mac (or have a friend test)
- [ ] Share release URL with users!

---

## 📚 References

- **Your Workflow:** `.github/workflows/build-macos.yml`
- **Build Script:** `build_complete_installer_mac.sh`
- **Mac Build Guide:** `BUILD_MAC.md`
- **GitHub Actions Docs:** https://docs.github.com/en/actions
- **Tauri CI Guide:** https://tauri.app/v1/guides/building/cross-platform

---

## 💡 Pro Tips

1. **Test Early:** Tag v0.0.1 and test the build process before doing real releases
2. **Use Draft Releases:** Create draft releases to test downloads before publishing
3. **Add Release Notes:** Use GitHub's release notes feature for changelog
4. **Automate Changelogs:** Use tools like `conventional-changelog`
5. **Monitor Usage:** GitHub shows download stats for releases
6. **Plan for Signing:** Budget for Apple Developer account ($99/year) when you're ready to distribute widely

---

## 🎉 You're Ready!

You now have a **professional Mac build pipeline** without owning a Mac. This is how most software companies do it - even Apple uses automated CI/CD!

**Next Steps:**
1. Push your code to GitHub
2. Wait for your first successful build
3. Download and celebrate your DMG! 🎊

---

**Questions?** Open an issue or check the troubleshooting section in `BUILD_MAC.md`
