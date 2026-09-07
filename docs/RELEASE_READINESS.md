# EmbroideryCalc companion — implementation review

Implemented September 7, 2026. This branch is a review build, not an App Store release.

## Implemented

- A Job / B Estimate / C Next flow, garment selection, batch visualization,
  real DST stitch previews, contextual directions, accessible labels, large controls,
  and Jobs / New estimate / Tools / Shop navigation.
- Formula 3.0.0: whole machine cycles even with partially occupied heads;
  serialized stop risk; labor overlap bounded by available machine time and
  eligible work. Setup, first loading, last removal and finishing remain included.
- Versioned drafts and production records; edits invalidate estimates; running
  inputs are protected; duplication starts a separate draft. Old calculation
  events migrate as drafts while legacy storage remains untouched.
- Cost-based quotes using gross margin, separate tax, and customer-facing PDF
  export. Initial rates are editable examples, not a pricing recommendation.
- Start, pause, resume and complete with full dates. Routine stoppages stay in
  elapsed production; explicit pauses are excluded. Completed comparisons inform
  manual shop calibration without automatically changing defaults.
- Browser persistence with serialized writes, cross-window conflict detection,
  visible quota failures and backup export/import. Conflicting imported versions
  are retained separately. Native snapshots commit through a small atomic pointer
  and preserve the previous snapshot. Corrupt data is preserved and reported.
- Capacitor iOS project, offline app bundle, native storage and sharing, app icon,
  optional camera purpose description, and required-reason privacy manifest.

## Verification

Run `npm run typecheck`, `npm test`, and `npm run build:native`.
Verified: 60 tests pass, TypeScript/Astro checks pass, and the static build plus
iOS asset/plugin sync succeeds. Xcode compilation has not been run.

Unit coverage includes partial-head timing, overlap floors, workload factors,
DST parsing, color matching, quote margin/tax, overnight lifecycle, invalid events,
draft invalidation, backup merge, stale revisions, quota failures, and native
snapshot commit/failure behavior. Native repository tests use mocked plugin ports;
they do not replace device tests.

The managed preview browser repeatedly timed out during tab discovery. No rendered
UI walkthrough or screenshot comparison could be completed. The concept under
`docs/design/` is a design reference, not a screenshot of the implemented app.

## Required release gates

1. Walk through A → B → C on narrow iPhone and iPad layouts. Check keyboard,
   landscape, text enlargement, VoiceOver, errors, multi-location input, DST
   previews, and the color tools. Confirm the layout against the design reference.
2. On macOS with Xcode, run `npm ci`, `npm run build:native`, `npm run ios`.
   Register the final bundle ID, select the developer team, build and run on a
   real iPhone. Validate Files import, native PDF/JSON share, camera denial,
   airplane mode, force-quit recovery during drafts/runs, paused overnight work,
   backups, upgrades, and low-storage failures. Archive/sign in Xcode.
3. Time representative real sew-outs. The overlap model is a conservative planning
   approximation; the included shop defaults require machine-specific validation.
4. Provide App Store Connect ownership, screenshots from the tested build, support
   and privacy URLs, age rating and privacy answers matching the final binary.
   Review the archive privacy report and submit to TestFlight before App Review.

No production deployment, existing operational-site change, App Store submission,
Apple signing, real-device verification, or automatic calibration is claimed.
Browser data is device-local; native data is private app storage. Backups remain
necessary before clearing data, removing the app, or switching devices.
