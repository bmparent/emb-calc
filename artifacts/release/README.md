# Release evidence

Code candidate: `69d1f9afa37dfa1f996e2e800dc3fe1129aa5d17`.
See [release report](../../docs/RELEASE_REPORT.md) and [open gates](../../docs/RELEASE_READINESS.md).

## Actual native captures

The unsigned simulator app loads a synthetic 24-polo job. These are actual pixels;
no invented estimates or generated UI are used. The native run also reopens the
snapshot after terminating the app. Interactive physical-device writes and system
share/file/camera behavior remain unverified.

- [iPhone ready screen](native/iphone-ready.png) / [relaunch](native/iphone-restart.png)
- [iPad ready screen](native/ipad-ready.png) / [relaunch](native/ipad-restart.png)
- [Xcode/device/privacy receipt](native/bundle-inspection.json)
- [Native workflow](https://github.com/bmparent/emb-calc/actions/runs/34159655224)
- [App Store image copies](../submission/app-store/)

## Browser workflow and artifacts

- [A: Job](screenshots/chromium-phone-a-job.png)
- [B: Estimate and batch explanation](screenshots/chromium-phone-b-estimate.png)
- [C: Saved estimate](screenshots/chromium-phone-c-next.png)
- [DST preview and multiple placements](screenshots/chromium-phone-dst-plan.png)
- [Recovery screen](screenshots/chromium-phone-recovery.png)
- [Local color tools](screenshots/chromium-phone-tools-image.png)
- [Actual downloaded customer PDF](chromium-phone-quote.pdf)
- [Full suite: 21 passed](browser-full-results.json)
- [Final isolated WebKit check: passed](browser-results.json)
- [Unit suite: 80 passed](unit-tests.xml)

The full-page browser screenshots include a navigation bar fixed to the captured
viewport; they are QA records, not App Store device images. Axe JSON files contain
zero violations on the exercised screens. Failed timeout attempts are retained,
and their limits are explained in the release report. No human VoiceOver or device
accessibility certification is implied.

`manifest.json` hashes the saved receipt bytes. The release package excludes native
intermediate build objects. Full unsigned app ZIPs are retained locally in the
ignored `artifacts/ios-final/` download and in the linked GitHub run.
