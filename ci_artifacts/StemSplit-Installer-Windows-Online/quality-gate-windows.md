# Installer Quality Gate Report

- Platform: `windows`
- Score: `100/100`
- Threshold: `90`
- Gate: `PASS`

| Check | Weight | Result | Details |
|---|---:|:---:|---|
| `artifact_exists` | 25 | PASS | installers\StemSplit_Setup_v0.1.0_x64_Online.exe |
| `size_sanity` | 10 | PASS | 4.12 MB |
| `checksum_manifest_present` | 15 | PASS | installers/checksums-windows.sha256 |
| `checksum_match` | 15 | PASS | match (StemSplit_Setup_v0.1.0_x64_Online.exe) |
| `smoke_tests_passed` | 20 | PASS | Installer smoke tests passed |
| `release_hardening_files_present` | 15 | PASS | payload report indicates pass |
