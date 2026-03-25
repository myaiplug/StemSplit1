# StemSplit v0.1.0

Release date: 2026-03-25
Commit: `ca031e4`

## Highlights

- Hardened installer quality gate with evidence-based checks.
- Added smoke test evidence consumption (`--smoke-report`) in quality gate.
- Added model payload validation with manifest policy:
  - `scripts/ci/model_payload_manifest.json`
  - `scripts/ci/validate_model_payloads.py`
- Added release preflight automation:
  - `scripts/ci/release_preflight.py`
  - `docs/RELEASE_RUNBOOK.md`
- Added/updated CI workflows for Windows and macOS installer validation.
- Updated download documentation and repository release links.

## Downloads

### Windows
- `StemSplit_Setup_v0.1.0_x64_Online.exe`
- SHA-256:

```text
8238aa668e53316b3723a9db284fbdff4056f0b4eeecfae48784af78652e7e21  StemSplit_Setup_v0.1.0_x64_Online.exe
```

### macOS
- `StemSplit_Online_Setup.dmg`
- SHA-256: add from CI artifact `installers/checksums-mac.sha256`

## Validation Evidence

- `installers/smoke-windows.local.json`
- `installers/model-payload-report.local.json`
- `installers/quality-gate-windows.local.json` (`100/100`)
- `installers/release-preflight.local.json` (`PASS`)

For release publication, prefer CI-generated artifacts/reports for both Windows and macOS.

## Notes

- If code-signing secrets are configured, use signed release workflows for production distribution.
- Dependabot currently reports vulnerabilities on default branch; track separately from this installer release scope.
