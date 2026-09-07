# Codex handoff: finish EmbroideryCalc for iOS shipment

Continue implementation and verification until EmbroideryCalc is ready to ship on
the iOS App Store. Do the work, fix issues, and produce a reviewable release
candidate. Do not stop after an audit, a plan, or a passing unit-test suite.

## User intent and authorization

Brent approved the redesign, full implementation, and pushing this review branch
to `bmparent/emb-calc`. His latest instruction is: “yes but lets hand it off to codex
to take care of everything else until its ready to ship.” You may commit, push,
create/update the PR, resolve conflicts, and carry out necessary reversible fixes
and validation. Do not request that authorization again. Complete all work possible
before asking for a specific missing credential, Apple account action, hardware
check, or final public-release decision. Do not publish an App Store release merely
because the build succeeds.

The central product requirement is intuitive use: strong explanatory visuals,
plain directions, and an easy A → B → C process. A first-time embroidery operator
must understand what to enter, what the estimate means, and what to do next.
Keep advanced options available without making them prerequisites.

## Repository and starting point

- Repository: https://github.com/bmparent/emb-calc
- Branch: `feat/ios-production-companion`
- Implementation commits: `0b7608b` and `ab4f11d`; this handoff is an additional commit.
- Previous base: `249c73c1307a06f4c05ea7f562d2b65ad9a41a3f`.
- Existing standalone public site: https://embroiderycalc-public.pages.dev/calculator/
- Preserve the separate operational site at https://embroiderycalc-pro.pages.dev
  and its integrations. Verify deployment targets and hooks before any merge or
  deployment. The standalone site previously used direct Cloudflare uploads;
  do not assume pushing or merging publishes it.

Fetch the branch and read applicable AGENTS.md instructions. Preserve unrelated
work. Inspect changes since the base and any newer main-branch changes before
integrating. Read README.md, docs/RELEASE_READINESS.md, and
`docs/design/IMPLEMENTATION.md`. The PNG under docs/design is a generated concept,
not an actual screenshot; its sample numbers are illustrative and must never
replace computed outputs.

## Implemented, with verification limits

Astro + React + TypeScript, with a Capacitor iOS project:

- Guided A Job / B Estimate / C Next screens; Jobs, Tools, and Shop navigation.
- Garment and quantity entry, saved machine profiles, manual design entry,
  multiple placements, local DST import with sampled stitch-path previews.
- Formula 3.0.0 using whole batches and capped handling overlap. Historical
  aggregate estimates are retained only for code comparison.
- Versioned job drafts, recalculation, explicit start/pause/resume/complete,
  full timestamps, actual-versus-estimated production and duplication.
- Cost inputs, gross-margin pricing, separate tax, PDF quotes and backup sharing.
- Browser saves with visible failures and conflict detection; native file snapshots
  committed through a small Preferences pointer, retaining a previous snapshot.
- Backup merge preserving conflicting jobs and read-only legacy-history migration.
- Offline bundled iOS assets, Filesystem/Preferences/Share plugins, app icon,
  camera purpose string and required-reason privacy manifest.

Last recorded checks: 60 tests pass; TypeScript/Astro checks pass; static build,
native asset preparation and Capacitor plugin sync pass. The native persistence
suite mocks plugin ports. No Xcode compilation, signing, physical-device test,
sew-out validation, or visual browser walkthrough has been completed. The prior
managed browser timed out during tab discovery; retry with your available testing
environment. Reproduce the checks yourself and attach evidence.

## Work to complete

### 1. Review correctness and close data-loss risks

Review the new code independently, including services/production,
components/production, services/embroideryService.ts, and services/dstParser.ts.
Look beyond the existing tests. Fix any discovered defect and add meaningful
regression coverage for the behavior.

Check blank/invalid intermediate form values across restart, rapid changes and
queued saves, navigation while importing, cross-window conflicts, quota failures,
malformed nested backups and run timestamps, duplicate IDs, outdated formula
versions, legacy migration, backup size limits, and imported profile validation.
Confirm corrupt-data recovery is usable by an ordinary user: preserving a file
without an accessible recovery/export path is insufficient. Exercise the retained
native snapshot and recovery from interrupted commits. Confirm the UI never says
“Saved” or advances a production state after a failed write.

Verify estimate/quote invalidation and immutability of running production inputs;
completed actual time must remain consistent with event history. Avoid silently
losing unsaved Shop edits, replacing current jobs, or trusting stale backup totals.
Make revision behavior understandable and consistent. Preserve existing user data.

### 2. Verify the production and pricing models

Independently check physical constraints, not just agreement with existing code:

- One item with 10,000 stitches at 800 RPM takes at least 12.5 ideal sewing minutes,
  even when six heads are available.
- Quantities below, equal to, and above head count require whole cycles.
- Sixty items needing one minute of hooping each cannot lose that labor through
  a 100% overlap setting when available machine time is negligible.
- Setup, first loading, final removal, finishing, operator count, partial final
  batches, multiple placements, intervention labor, bobbins, trims, color changes,
  efficiency, slowdown, break risk, and contingency remain internally consistent.
- Check the conservative overlap approximation across multiple locations and
  operators. Explain assumptions clearly; do not imply a precision not supported
  by observed shop data.
- Cost / (1 − margin) defines price before tax. Distinguish labor minutes from
  machine and elapsed minutes; avoid double counting. Check rounding, extreme
  inputs and units. Customer PDFs must not expose internal cost/margin details.

Brent's shop defaults are starting values, not universal standards. Prepare a
small representative sew-out validation sheet using known quantities, designs,
heads, RPM and measured handling. Do not invent actual machine results. If physical
measurements are unavailable, isolate precisely what Brent must measure while
completing the remaining software work.

### 3. Finish and test the user experience

Run the actual app. Test the full A → B → C journey from a clean profile, then
repeat with real or synthetic DST fixtures, multi-location work, saved profiles,
duplication, PDF sharing, backup restore, and production interrupted by restart.

Check narrow iPhone widths, iPad, landscape, keyboard obstruction, safe areas,
large text and screen-reader labels/focus. Inspect every state visually: loading,
empty, validation error, saving, failed save, saved, running, paused and complete.
Use clear labels, appropriately distinct garment visuals, readable diagrams,
visible next actions, and concise inline help. Polish the retained color-analysis
Tools flow to the same usability standard. Confirm sampled DST previews have the
correct orientation, sequence boundaries and jump behavior, with honest limitations.

Capture real screenshots and fix layout defects. Try a simple unassisted-user
walkthrough; if no external tester is available, label your own walkthrough as
such. Resolve browser/tool problems when feasible and document exact remaining
limitations instead of counting skipped checks as passes.

### 4. Complete the native iOS release candidate

Use the checked-in Capacitor configuration and Xcode project. Start with:

    npm ci
    npm run typecheck
    npm test
    npm run build:native
    npm run ios

Check Node/toolchain requirements, reproducibility, dependency security and bundle
size. The TypeScript configuration excludes generated native/web output to avoid
checking bundled JavaScript. Keep lazy loading for heavy PDF and color tools.

Use macOS/Xcode or an authorized available macOS build environment for actual
native compilation. Confirm the final bundle ID and developer team, icons and
launch assets, supported orientations, app lifecycle, permission strings and
privacy manifest in the archive. Inspect all bundled routes for unintended
analytics, external requests, navigation traps and website-only behavior.

Test Files import, PDF/JSON share sheets, cancelled shares, camera permission
denial, optional photo capture, airplane mode, app backgrounding, force-quit and
restart, overnight pauses, upgrades, and low-storage recovery on a real iPhone.
Validate VoiceOver and larger text on device. Run meaningful simulator checks too,
but distinguish them from physical-device evidence.

If signing credentials or Apple account access are absent, finish the unsigned
build and all other work first, then identify the exact action needed. Do not
claim Capacitor sync is an Xcode build or claim a signed archive without evidence.

### 5. Prepare submission and the release decision

Verify current Apple requirements using primary Apple documentation. Review
minimum functionality, privacy, permissions, accessibility, support/privacy URLs,
and any payment implications of the actual product. Do not introduce accounts,
paid services or subscriptions merely to satisfy a checklist.

Prepare App Store metadata, supported-device screenshots from the real app,
reviewer notes, accurate privacy/age-rating answers and a support path. Make the
TestFlight build and testing plan concrete where available access allows it.
Do not add testers or send messages without authorization. Keep final public
release as an explicit reviewable decision after validation.

Push the completed branch, create/update a PR, and attach the verification record.
Leave a short release report identifying the exact commit/build, passing checks,
remaining failures or external dependencies, and the smallest next action Brent
must take. If a blocker prevents one part, continue every independent part.

## Definition of done

A coherent, visually verified A → B → C workflow; defensible runtime and pricing;
recoverable saved data; tested production lifecycle; successful native compilation
and honestly reported device validation; reviewable submission assets; committed
and pushed code; and a clear release recommendation supported by evidence.
“Tests pass” alone is not sufficient. Where an external gate is genuinely
unavailable, deliver everything else complete and state that gate precisely.
