# Quick Start - Upload to GitHub and Build Mac Installer

Follow these steps on Windows to get your Mac installer built:

## Step 1: Create GitHub Repo
1. Go to https://github.com/new
2. Name: `stemsplit` (or your choice)
3. Make it **PUBLIC** (for free builds)
4. Don't check"Add a README"
5. Click "Create repository"

## Step 2: Push Your Code

Run these commands in PowerShell:

```powershell
# Replace YOUR_USERNAME with your GitHub username
git remote add origin https://github.com/YOUR_USERNAME/stemsplit.git

# Add all files
git add .

# Commit
git commit -m "Initial commit with Mac installer support"

# Set main branch and push
git branch -M main
git push -u origin main
```

## Step 3: Create a Release (Triggers Mac Build)

```powershell
# Create version tag
git tag -a v0.1.0 -m "Release v0.1.0"

# Push the tag (this triggers the automated Mac build)
git push origin v0.1.0
```

## Step 4: Wait for Build (~25 minutes)

1. Go to your repo on GitHub
2. Click the **"Actions"** tab
3. You'll see **"Build macOS Installer"** running
4. Wait for the green checkmark ✓

## Step 5: Download Your DMG!

**Option A - From Releases (Easiest):**
1. Click **"Releases"** on the right sidebar
2. Click on **"v0.1.0"**
3. Download **`StemSplit.dmg`** (~500MB)

**Option B - From Actions:**
1. Click **"Actions"** tab
2. Click the completed build
3. Scroll down to **"Artifacts"**
4. Download **`StemSplit-macOS-xxx.zip`**
5. Extract to get the DMG

## Step 6: Distribute!

Share this URL with Mac users:
```
https://github.com/YOUR_USERNAME/stemsplit/releases
```

They can download and install with zero setup required!

## 🎉 That's It!

You now have:
- ✅ Professional Mac installer (.dmg)
- ✅ Automated builds on every release
- ✅ No Mac ownership required
- ✅ FREE forever (public repos)

## Future Releases

To create new versions:

```powershell
# Make your changes, then:
git add .
git commit -m "Your changes"
git push

# Tag new version
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin v0.2.0

# Wait 25 minutes, new DMG appears in releases!
```

## Troubleshooting

**Build fails?**
- Check Actions tab for error logs
- Most common: Missing files or syntax errors

**Can't push?**
- Make sure you created the remote
- Check you're using correct GitHub username
- Verify you're logged into git: `git config --global user.name`

**Need help?**
- Check `BUILD_MAC_WITHOUT_MAC.md` for details
- View the workflow: `.github/workflows/build-macos.yml`

---

**Ready? Run the commands above and get your Mac installer! 🚀**
