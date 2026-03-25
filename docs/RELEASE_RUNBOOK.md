# StemSplit Release Runbook

## Goal

Ship a release with installer quality gate >= 90 and evidence-backed artifacts.

## 1. Local Preflight

Run from repo root:

```powershell
python .\scripts\ci\release_preflight.py `
  --repo-root "." `
  --json-out "installers/release-preflight.local.json" `
  --md-out "installers/release-preflight.local.md"
```

Verify local evidence reports exist and pass:

- `installers/smoke-windows.local.json`
- `installers/model-payload-report.local.json`
- `installers/quality-gate-windows.local.json`

## 2. Commit and Push

Review staged diff carefully, then:

```powershell
git add .
git commit -m "release: harden installer gates and release preflight"
git push origin main
```

## 3. Validate CI on GitHub

Required workflows should pass:

- `.github/workflows/installer-windows.yml`
- `.github/workflows/installer-macos.yml`
- `.github/workflows/windows-release-signed.yml` (when signing secrets are configured)
- `.github/workflows/macos-release-signed-notarized.yml` (when Apple signing secrets are configured)

Check uploaded artifacts include:

- installer binaries (`.exe`/`.dmg`)
- checksums
- smoke reports
- model payload reports
- quality gate reports

## 4. Publish GitHub Release

1. Create tag in GitHub (for example `v0.1.0`).
2. Create release notes including:
- Artifact filenames
- SHA-256 checksums
- Platform-specific install notes
3. Attach built installer artifacts from CI.
4. Mark as latest if stable.

## 5. Post-Release Validation

- Download and install on clean Windows test machine.
- Download and install on clean macOS test machine.
- Confirm first-run provisioning flow works.
- Confirm checksums in release notes match downloaded files.
