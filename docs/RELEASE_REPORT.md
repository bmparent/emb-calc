# EmbroideryCalc review candidate — September 7, 2026

The iOS companion is prepared for review in PR #5. **It is not yet approved for a
public App Store release.** Software correctness and browser checks have evidence;
Apple signing, physical-device acceptance and measured sew-outs remain separate gates.

## Scope and changes

Work took place in an isolated checkout of `bmparent/emb-calc` on
`feat/ios-production-companion`. The unrelated Eidos live checkout was not edited.
The branch was fetched and reviewed against main and the original handoff.

- **A → B → C:** clearer step instructions, distinct garment illustrations, whole
  batch diagrams, separate elapsed/machine/labor figures and explicit saved/production
  actions. Corrected DST orientation and color-boundary sampling. Sequence colors
  are labeled illustrative rather than represented as actual thread colors.
- **Production model:** found that overlap could borrow machine time from another
  placement and divide an indivisible item across operators. Formula 3.1.0 caps
  overlap per placement, retains whole handling waves, and preserves setup, first
  preparation, final removal and finishing. Added physical-floor regressions.
- **Historical accuracy:** old running/paused/completed 3.0.0 records use their frozen
  version. Old ready estimates become drafts for recalculation. Imported quote and
  estimate totals are recomputed instead of trusted.
- **Recoverable data:** validate nested backups, limits, IDs, profiles and run clocks;
  preserve conflicting versions; expose corrupt-byte export and previous-save recovery.
  Failed production writes do not advance status. Serialized saves and cross-window
  checks protect rapid edits. Unsaved Shop settings survive navigation and require
  save/discard before switching profiles.
- **Color tools:** repaired image-control semantics, contrast, import/save errors and
  misleading stock labels. The built-in/example reference list does not claim to be
  the user's physical thread inventory.
- **Native screenshot defect:** actual iPhone captures exposed deferred focus scrolling that hid the header beneath the status bar. Navigation now focuses without implicit scrolling, keeps the status region clear, and native OCR checks require the brand, ready heading and saved-job name before accepting captures.
- **Native package:** dedicated offline bundle with local help/privacy pages, iOS 17
  minimum, Xcode 26 workflow, required-reason privacy manifests and native file/share
  plugins. Public-site analytics/editorial pages are excluded from the app bundle.
- **Build reliability:** repaired the npm lockfile's optional esbuild peer entries,
  updated vulnerable dependencies and checked xcode's uuid compatibility. The app icon was losslessly re-encoded as RGB PNG with no alpha channel; its visible RGB pixels are unchanged. CI's Node
  22/npm 10 clean install is the canonical installation check.

## Evidence provenance

Application code candidate: **`69d1f9afa37dfa1f996e2e800dc3fe1129aa5d17`**.
Documentation/evidence commits may follow it without changing application behavior.

| Check | Actual result | Receipt |
|---|---|---|
| Unit/regression | 80 passed, 11 files | `artifacts/release/unit-tests.xml`, `unit-run.txt` |
| TypeScript / Astro / CI build | Passed on candidate | [CI 34159655281](https://github.com/bmparent/emb-calc/actions/runs/34159655281) |
| Dependency audit | Zero known advisories at the recorded time | `artifacts/release/dependency-audit.json` |
| Complete rendered suite | 21 passed; 0 failed/skipped | `artifacts/release/browser-full-results.json`, `browser-run.txt` |
| Final export-path change | 2 Chromium passes; isolated WebKit pass after an instrumentation timeout | `artifacts/release/final-export-timeout-attempt.json`, `browser-results.json`, `final-webkit-run.txt` |
| Accessibility scans | Zero violations on tested screens | `artifacts/release/*-axe.json` |
| Browser screenshots | Actual built UI | `artifacts/release/screenshots/` |
| Customer PDF | Downloaded, text inspected, one-page rendering inspected | `artifacts/release/chromium-phone-quote.pdf`, `quote-text.txt` |
| Native preparation | Static app build + Capacitor sync passed | `artifacts/release/native-build.txt` |
| Xcode compile and capture | Passed: unsigned Release/device and Debug/simulator; iPhone and iPad load/relaunch/OCR | [iOS 34159655224](https://github.com/bmparent/emb-calc/actions/runs/34159655224), `artifacts/release/native/` |

The final complete browser suite ran on `d5f228b69452c9acf383a49e4f0899ee3864de03`.
The only subsequent application change sanitizes imported job IDs before constructing
native PDF filenames. That path has a new regression test and the three-browser
A → B → C/PDF walkthrough was repeated on `69d1f9a`: Chromium phone and tablet passed; WebKit timed out at the 120-second whole-test limit, then passed alone with a 300-second budget (about 108 seconds of test execution). The final candidate's CI reruns
unit/type/build checks. GitHub PR checkout hashes can be synthetic merge commits;
the workflow head SHA and its `git-commit.txt` receipt both remain visible.

One earlier rerun failed five Windows WebKit tests during loading/accessibility
instrumentation (5-second assertion / 60-second test limits). Its JSON and logs are
preserved as `browser-timeout-attempt.*`. Trace inspection showed axe evaluation and
initial hydration exceeding those time budgets. The repeated suite passed all 21
checks with 15-second assertions and 120-second whole-test limits; assertions and
accessibility rules were retained. A concurrent 80-test unit attempt also timed out
loading the new PDF test; `unit-timeout-attempt.*` preserves that result. All 80
then passed with one worker, and the final remote CI passed. The final export walkthrough also hit the WebKit whole-test timeout. Its trace showed slow page creation, axe evaluation and download instrumentation; the host reported 100% CPU and about 1 GB free RAM. After stopping this task's temporary Astro development server, the isolated WebKit run passed. Both attempts are retained as `final-export-timeout-attempt.*` and `final-webkit-run.txt`. These are functional verification results, not a measured app performance SLA.

## Rendered review

Playwright tested the built offline bundle at a local URL in Chromium phone
(390×844), WebKit phone (390×844), and Chromium tablet (1024×1366). It exercised:

- Manual/example entry, validation, multi-location DST planning, quote download,
  saving, start/pause/reload/resume/completion and duplication.
- Invalid intermediate drafts across reload; Shop edits across tabs/restart;
  rapid saves; a real second-window conflict; quota failure without a false
  production transition; malformed backup recovery and conflict-preserving import.
- Synthetic image color tools, narrow 320px reflow, landscape and 200% browser text.
- Axe WCAG 2 A/AA and 2.1 AA checks on the exercised states. The core production
  walkthrough also checks console/page errors and unsolicited external requests.

Rendered screenshots were inspected for hierarchy, wrapping, primary actions and
the difference between machine, labor and elapsed time. The quote was rendered with
Poppler and its text extracted with pypdf; sample customer output excludes internal
cost/margin fields. The frontend-testing skill's referenced browser skill was absent
from the available catalog, so installed Playwright provided repeatable browser
evidence. This was an agent review, not an independent human usability study.

Astro's React integration still emits deprecated Vite esbuild-option warnings, and native dependency deprecation warnings remain in build logs. These checks do not claim warning-free dependencies.

No browser test proves native file-picker, camera, share-sheet, VoiceOver or storage
behavior on an actual phone. Mocked native repository faults verify control flow;
they do not simulate iOS low-storage or power-loss durability. The sample PDF is
untagged, and arbitrary Unicode font coverage has not been verified.

## Native capture review

Final native workflow head: `69d1f9afa37dfa1f996e2e800dc3fe1129aa5d17`.
The PR merge checkout recorded by the build is
`c8d475be740ad93c87d557f5395c9289c8be092e`. Xcode 26.3 (17C529), using the iOS 26.2 SDK, compiled the unsigned Release
device app and Debug simulator app. The built device bundle reports version 1.0.0,
build 1, minimum OS 17.0 and three privacy manifests with no declared collection
or tracking; the app manifest includes UserDefaults CA92.1 and timestamps C617.1.

The final iPhone 17 Pro Max and iPad Pro 13-inch (M5) screenshots were inspected. The iPhone header is now
visible below the status area. All four ready/restart images pass OCR checks for
the app title, ready heading and synthetic job name. The iPhone image is 1320×2868;
the iPad image is 2064×2752. These are accepted screenshot dimensions in Apple's
current specifications. No screenshot has been resized or retouched for submission.

This proves native compilation and display/reopening of a **seeded** saved snapshot.
It does not prove interactive native writes, Files, camera or sharing on hardware.
Those remain in the device checklist. Full unsigned apps and original logs are
retained locally under `artifacts/ios-final/` and in the linked GitHub run. The small
logs, screenshots, OCR and bundle inspection receipts are committed under
`artifacts/release/native/`. Superseded native runs were cancelled after the final
candidate passed; their incomplete capture runs are not acceptance evidence.

## Estimate meaning

For each placement, `ceil(quantity / heads)` determines whole machine cycles.
One item at 10,000 stitches and 800 RPM cannot take less than 12.5 ideal sewing
minutes merely because six heads exist. Labor person-minutes and elapsed operator
waves are distinct; overlap cannot consume time from another placement or erase
the final removal. Quotes use `cost / (1 - margin)` with tax added separately.

The synthetic 24-polo sample (six heads, 800 RPM, 10,000 stitches, three colors and
example calibration/cost settings) computes about 210.30 elapsed minutes, 119.49
machine minutes, 98.63 labor minutes and a 95.74 quote before any configured tax.
These are calculated demonstration values, not a timed sew-out or a price recommendation.
The model is a planning approximation with manual calibration; measured accuracy is
unknown until the sew-out protocol is completed.

## Production boundary

Cloudflare was inspected read-only before branch publishing. The operational project
`embroiderycalc-pro` has automatic production deployments disabled and production
branch `main`; branch preview deployments remain enabled. `embroiderycalc-public`
uses direct upload. No environment variables, bindings, integrations, deployment
settings or canonical production deployment were changed. No merge, direct upload,
Apple submission, tester invitation or public release was performed.

## Submission and remaining actions

Prepared [App Store metadata](APP_STORE_SUBMISSION.md), [app privacy policy](APP_PRIVACY.md),
[physical-device acceptance record](DEVICE_TEST_PLAN.md), and [sew-out protocol](SEW_OUT_VALIDATION.md)
with its blank CSV. The icon and simulator images are assets to review against the
final signed build. Public support uses the repository issue page; opening an issue
requires a GitHub account. The owner may replace this with a staffed support URL.

1. **Apple owner:** confirm bundle ownership/team and legal/contact details, then
   archive/sign the candidate with Xcode 26 and upload it to TestFlight. The unsigned
   device `.app` from CI is not an App Store uploadable IPA/archive.
2. **Hardware tester:** install that build on an iPhone and iPad and complete the
   device checklist, including VoiceOver, file/share cancellation, camera denial,
   force quit, upgrade recovery and controlled low-storage tests.
3. **Shop operator:** measure the listed sew-outs, record the preselected acceptable
   error and retained raw observations, then decide whether calibration is adequate.
4. **Release owner:** review final screenshots, privacy/rating answers and the signed
   archive privacy report, then make a separate submission/public-release decision.

These gates cannot be inferred from passing local tests. The draft PR and
`RELEASE_READINESS.md` are the review handoff; no release-ready claim is made while
they remain open.


## File and artifact index

Implementation changes since the original handoff commit are listed in
`artifacts/release/implementation-changed-files.txt`. The release artifact manifest
records exact byte sizes and SHA-256 hashes. `.gitattributes` preserves artifact
bytes across Windows/macOS checkouts. Submission image copies under
`artifacts/submission/app-store/` are byte-identical to the native captures.
See [the evidence index](../artifacts/release/README.md) for visual review links.
