# EmbroideryCalc iOS release readiness

Updated September 7, 2026. **Review candidate; public release remains blocked.**
PR [#5](https://github.com/bmparent/emb-calc/pull/5) remains a draft on
`feat/ios-production-companion`. Nothing has been merged or submitted to Apple.

## Verification ledger

| Gate | State | Evidence and limits |
|---|---|---|
| Dependency installation / CI | passed | Clean Node 22 CI install, tests, typecheck and build on `69d1f9a`; [CI run](https://github.com/bmparent/emb-calc/actions/runs/34159655281). Local audit reports zero known vulnerabilities on September 7. |
| Production / quote regression checks | passed, model accuracy partial | 80 tests in 11 files. Whole cycles, handling floors, per-placement overlap, historical formula replay and margin/tax checks pass. Physical sew-outs remain unmeasured. |
| Save / restore regression checks | passed, native device behavior partial | Invalid drafts, corrupt nested backups, revision conflicts, failed writes, frozen runs and recovery tested. Native repository fault tests use mocked Capacitor ports. |
| Rendered A → B → C | passed in browser | 21 tests: Chromium phone, WebKit phone and Chromium tablet. Final export checks passed in Chromium phone/tablet and a separate WebKit run; timeout attempts are retained and explained in the report. Screenshots and JSON results are in `artifacts/release/`. |
| Accessibility | partial | No axe WCAG 2 A/AA or 2.1 AA violations on exercised screens; 320px, landscape and 200% browser text reflow checked. Physical VoiceOver, device keyboard and iOS Larger Text remain open. |
| Customer PDF | passed for sample | Actual downloaded one-page quote rendered and text inspected. Internal margin/cost fields absent. PDF is untagged; arbitrary Unicode font coverage is not verified. |
| Offline native asset preparation | passed | `npm run build:native` builds a dedicated app bundle, removes website/editorial/analytics pages and syncs Capacitor. No off-origin HTTP requests in the tested browser production workflow. |
| Xcode unsigned device / simulator build | passed | Final candidate `69d1f9a`: Xcode 26.3 Release device and Debug simulator builds; iPhone/iPad seeded snapshot load, relaunch and OCR checks passed. [Native run](https://github.com/bmparent/emb-calc/actions/runs/34159655224), receipts in `artifacts/release/native/`. No signed archive or physical interaction is claimed. |
| Signed archive / TestFlight | blocked: Apple account | No Apple signing credentials are configured in repository Actions secrets. Bundle ownership, team, signing, upload and TestFlight require the owner. |
| Physical iPhone / iPad acceptance | blocked: hardware | Execute [device test plan](DEVICE_TEST_PLAN.md) on the signed candidate. No physical-device claims are made. |
| Production estimate accuracy | blocked: measurements | Complete [sew-out sheet](SEW_OUT_VALIDATION.csv) and [measurement protocol](SEW_OUT_VALIDATION.md). Defaults are examples; no accuracy percentage is claimed. |
| Submission metadata / privacy / assets | prepared; owner review required | [Submission package](APP_STORE_SUBMISSION.md) and [privacy policy](APP_PRIVACY.md). Legal/account fields, final privacy answers and final screenshots must match the signed binary. |
| Separate operational site | preserved | Cloudflare production deployment IDs and disabled automatic production setting were inspected read-only. Branch preview checks do not establish or authorize a production release. |

## Acceptance boundary

Formula **3.1.0** prevents unrelated placements from lending time to handling
overlap and preserves whole operator waves. Existing running/completed 3.0.0
records retain their versioned computation; obsolete ready estimates become drafts.
This is a conservative scheduling approximation, not a measured machine guarantee.

Data recovery preserves corrupt bytes, exposes export/restore actions, and validates
backups before use. Production transitions wait for durable writes. JSON backups
contain jobs and profiles; keep original DST files, photos and custom color CSVs
separately. Clearing app data or uninstalling can remove local records.

## Reproduce from the repository root

```bash
npm ci
npm run typecheck
npm test
npm audit --json
npm run build:native
npx playwright install chromium webkit
npm run test:ui
```

On macOS with Xcode 26 and iOS 26 simulator runtimes:

```bash
bash scripts/verify-ios.sh
```

The script compiles unsigned Release/device and Debug/simulator apps, captures
the actual simulator UI and saves build/SDK/privacy evidence. It does not sign,
archive for App Store upload, run physical tests or submit a release.

See [release report](RELEASE_REPORT.md) for defects fixed, exact evidence provenance,
remaining risks and the owner's final actions. A passing build alone does not close
the physical-device, measured-accuracy or Apple submission gates.
