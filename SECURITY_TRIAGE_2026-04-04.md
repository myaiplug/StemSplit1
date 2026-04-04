# Security Triage - 2026-04-04

## Scope

Dependency vulnerability triage for the StemSplit web stack after GA publication.

## Baseline

Initial npm audit totals:
- Critical: 1
- High: 8
- Moderate: 1
- Total: 10

## Remediation Applied

Targeted low-risk upgrades within current major line:
- next: 14.2.3 -> 14.2.35
- eslint-config-next: 14.2.3 -> 14.2.35

Validation after upgrade:
- `npm run lint`: PASS
- `npm run build`: PASS

Build note observed (non-blocking):
- Next.js metadata viewport warning for app routes.

## Post-Remediation State

Current npm audit totals:
- Critical: 0
- High: 4
- Moderate: 0
- Total: 4

Remaining packages flagged:
- next
- eslint-config-next
- @next/eslint-plugin-next
- glob

npm indicates remaining high issues require a major jump to Next 16 / eslint-config-next 16 line.

## Risk Assessment

- Critical exposure has been removed.
- Remaining findings are tied to tooling/framework major upgrade path and are not safely auto-fixable without broader compatibility validation.

## Recommended Next Actions

1. Create a dedicated upgrade branch for Next 16 migration and lint stack alignment.
2. Upgrade `next` and `eslint-config-next` together and run full app/regression validation.
3. Resolve metadata viewport deprecation warning in app metadata exports.
4. Re-run npm audit and close remaining advisories after migration.

## Files Changed in This Triage

- package.json
- package-lock.json
- next-env.d.ts
- SECURITY_TRIAGE_2026-04-04.md
