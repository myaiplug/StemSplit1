# Debugging GitHub Actions Mac Build

## Quick Check

Visit: https://github.com/myaiplug/StemSplit1/actions

Look for the latest workflow run and click it to see logs.

## Common Failure Points

### 1. **Setup Node.js / Install dependencies**
**Symptom:** `npm ci` or `npm install` fails

**Fix:**
```powershell
# Regenerate package-lock.json
rm package-lock.json
npm install
git add package-lock.json
git commit -m "Update dependencies"
git push
```

### 2. **Build Next.js app**
**Symptom:** Next.js build fails with errors

**Check:**
- Ensure `next.config.js` has `output: 'export'`
- Make sure all imports are valid
- Check for TypeScript errors

**Fix:**
```powershell
# Test locally first
npm run build

# If it works, push
git add .
git commit -m "Fix Next.js build"
git push
```

### 3. **Setup Rust / Build Tauri**
**Symptom:** Cargo or Tauri build fails

**Common causes:**
- Missing Rust targets
- Tauri CLI not installed
- Cargo.toml issues

**The new minimal workflow handles this automatically.**

### 4. **Python environment setup**
**Symptom:** Python package installation fails

**Fix:** This is actually optional for basic app builds. The fixed workflow continues even if this fails.

### 5. **DMG creation**
**Symptom:** `create_mac_dmg.sh` fails

**This is the last step** - if everything else works, we can create the DMG locally later.

## Test With Minimal Workflow

I've created a simpler workflow that's more likely to succeed:

`.github/workflows/build-macos-minimal.yml`

This workflow:
- ✅ Uses simpler build steps
- ✅ Better error messages
- ✅ Creates basic tar.gz instead of DMG
- ✅ Lists all output for debugging

### Run it:
```powershell
git add .github/workflows/build-macos-minimal.yml
git commit -m "Add minimal test workflow"
git push
```

Then manually trigger it:
1. Go to Actions tab
2. Click "Build macOS (Minimal)"
3. Click "Run workflow"
4. Select "main" branch
5. Click "Run workflow"

## View Detailed Logs

1. **Go to Actions tab:** https://github.com/myaiplug/StemSplit1/actions
2. **Click on the failed run**
3. **Click on "build-macos" job**
4. **Expand each step** to see detailed output
5. **Look for red ❌ marks** - that's where it failed

## Most Likely Issues

### Issue: "Error: Cannot find module"
**Solution:** Missing npm dependency
```powershell
npm install <missing-package>
git add package.json package-lock.json
git commit -m "Add missing dependency"
git push
```

### Issue: "Cargo.toml parse error"
**Solution:** Check `src-tauri/Cargo.toml` for syntax errors

### Issue: "Target not found"
**Solution:** The new workflow adds targets explicitly, should be fixed

### Issue: Tauri CLI not found
**Solution:** New workflow installs it, or we build with cargo directly

## Quick Fix Commands

```powershell
# 1. Push the minimal workflow
git add .github/workflows/build-macos-minimal.yml
git commit -m "Add minimal test workflow"
git push

# 2. If you find specific errors, fix them:
git add <fixed-files>
git commit -m "Fix build errors"
git push

# 3. Re-tag to trigger full build:
git tag -d v0.1.0                    # Delete local tag
git push origin :refs/tags/v0.1.0   # Delete remote tag
git tag -a v0.1.0 -m "Release v0.1.0 - Fixed"
git push origin v0.1.0
```

## Get Help

If you share the **specific error message** from the Actions logs, I can provide a precise fix!

To share:
1. Go to failed workflow run
2. Find the failing step
3. Copy the error message
4. Paste it here

---

The minimal workflow should at least give us a working binary, even if DMG creation is complex.
