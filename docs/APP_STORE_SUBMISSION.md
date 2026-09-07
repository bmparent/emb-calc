# App Store submission package — candidate, not submitted

## Metadata for review

| Field | Prepared value |
|---|---|
| Name | EmbroideryCalc |
| Subtitle | Plan, quote & track embroidery |
| Version / build | 1.0.0 / 1 |
| Bundle identifier | com.embroiderycalc.companion — registration/ownership must be confirmed in Brent's Apple team |
| Devices | iPhone and iPad; iOS/iPadOS 17 or later |
| Primary category | Productivity |
| Secondary category | Business |
| Keywords | embroidery,stitches,DST,production,quote,hooping,machine,thread,Madeira,shop,estimate |
| Support URL | https://github.com/bmparent/emb-calc/issues |
| Privacy URL | https://github.com/bmparent/emb-calc/blob/d5f228b69452c9acf383a49e4f0899ee3864de03/docs/APP_PRIVACY.md |
| Promotional text | Turn stitch counts into a clear production plan. Review machine runs, prepare a quote, and keep a record of the work. |
| Price proposal | Free, no in-app purchases. Owner must set territories and availability in App Store Connect. |
| Release mode | Manual release after approval; do not enable automatic release. |

Copyright/legal seller, review contact name/phone/email, developer team, tax/agreement status and territory-specific trader disclosures must come from the Apple account owner. Do not invent them.

## Description

Plan embroidery work in three steps.

A — Add the job. Choose a garment, quantity, usable machine heads and RPM. Enter stitches manually or import a Tajima DST file. Add multiple placements when an order needs more than one design.

B — Review the estimate. See whole machine runs, elapsed production time, machine occupancy and hands-on labor. Adjust your shop's costs and target margin to prepare a quote with tax shown separately.

C — Save and start when ready. Share a customer PDF, start production, pause excluded off-shift time and record completion. Duplicate a job to make a new estimate without changing a production record.

Keep machine profiles and jobs on your device. Export JSON backups before changing devices. Restore backups without overwriting conflicting job versions, and use the recovery screen if a saved snapshot cannot open.

The optional color tool compares artwork colors with approximate Madeira thread references. Photos, DST files and color analysis are processed on your device. No account, advertising or subscription is required.

Production times are planning estimates. Calibrate the defaults with measured sew-outs from your shop. Sampled DST previews are not machine-control files; sequence colors are illustrative and trims are inferred. Use embroidery software and physical thread shade cards for final approval. Madeira is a trademark of its owner; this app is not affiliated with or endorsed by Madeira. Keep original design files, photos and custom color CSVs separately from job backups.

## Reviewer notes

No login, account, purchase or external service is needed. On a fresh installation, choose “Try an example job,” then “Review estimate,” then “Save estimate.” This creates a synthetic 24-polo estimate using six heads, 800 RPM and 10,000 stitches; displayed numbers are calculated by the app. The example is not a measured sew-out or a customer order.

In C, Share quote opens the iOS system share sheet. Start production is explicit. Pause excludes off-shift time. Resume and complete produce the actual-versus-estimated comparison. The app does not operate or connect to an embroidery machine. Shop contains profiles, backups, privacy, methodology and support. Tools supports local image import, optional camera capture and color comparisons. Declining camera access still allows image import and every production feature.

Minimum functionality rationale: persistent versioned jobs, a batch-aware production engine, lifecycle records, native backup/recovery and system file sharing support a production workflow beyond displaying a website. Apple makes the acceptance decision.

## Privacy, permissions and rating worksheet

- App privacy proposal: **Data Not Collected**, based on the bundled app having no telemetry/network service or automatic upload. On-device processing is distinct from developer collection. Validate the signed archive and device network behavior before attesting in App Store Connect.
- Tracking: no. Advertising: no. Accounts: no. Purchases/subscriptions: no. Exported quotes document physical embroidery work; the app processes no payments.
- Camera purpose: “Take an artwork photo to compare thread colors on this device.” No contacts, location, microphone or broad photo-library access is requested. System file pickers and the share sheet are used for user-selected files.
- Required-reason APIs: UserDefaults CA92.1 and file timestamps C617.1; inspect the aggregate native privacy manifests in the CI artifact and the final signed archive.
- Export-compliance worksheet: the app has no custom encryption service; the account owner must review and answer the current encryption questions against the signed binary.
- Rating proposal: no violence, sexual content, substances, gambling, medical advice, contests, messaging, advertising or unrestricted web browsing. Local file import is not a public user-content service. Complete Apple's current questionnaire truthfully; record the calculated age rating rather than inventing a final rating.
- Accessibility labels: do not claim verified VoiceOver, Larger Text or other App Store accessibility support until the device checklist passes. Browser axe scans do not establish those device claims.

## Screenshots and assets

The CI capture script compiles the actual native app, installs it in fresh iPhone Pro Max and 13-inch iPad simulators, seeds a validated synthetic saved job, and captures the displayed UI before/after relaunch. No fake phone frames, generated UI or invented production values are used. `iphone-ready.png` and `ipad-ready.png` are the candidate submission images; both were inspected at 1320×2868 and 2064×2752 respectively. Byte-identical upload copies are in `artifacts/submission/app-store/`. The matching `*-restart.png` images verify the saved job after relaunch. The simulator build is unsigned Debug; re-capture if the signed candidate changes visibly.

The 1024×1024 opaque RGB PNG icon without an alpha channel is in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`. Browser screenshots in `artifacts/release/screenshots` are QA evidence, not device screenshots for App Store upload. The generated design concept under `docs/design` is not a submission screenshot.

## Owner's final steps

1. In the Apple Developer account, confirm/register `com.embroiderycalc.companion` and select the legal team. Create the App Store Connect app record with that identifier and complete agreements/contact/trader fields.
2. On a Mac with Xcode 26 or later, check out the candidate commit, run `npm ci`, `npm run build:native`, then `npm run ios`. Select the developer team and use Product → Archive with a physical-device destination. Validate and upload the signed archive to App Store Connect. The CI device `.app` is unsigned; it cannot be uploaded as a signed archive or IPA.
3. Install the TestFlight build on an iPhone and iPad. Execute `docs/DEVICE_TEST_PLAN.md` and record results. TestFlight distribution and tester invitations have not occurred; owner controls participants.
4. Complete `docs/SEW_OUT_VALIDATION.csv` using actual machine measurements. Keep this gate open until accuracy is acceptable for the intended shop.
5. Confirm public privacy/support links, enter the metadata above, upload accepted device images and answer privacy/rating questions against the signed binary. Review the final release report and authorize submission/public release separately.

## Primary requirements checked September 7, 2026

- [Apple SDK upload requirements](https://developer.apple.com/news/?id=ueeok6yw): iOS/iPadOS 26 SDK or later for uploads since April 28, 2026.
- [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/): functionality, accurate metadata, privacy and review access.
- [App privacy details](https://developer.apple.com/app-store/app-privacy-details/): classify collection based on actual data handling.
- [Screenshot specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/): accepted 6.9-inch iPhone and 13-inch iPad dimensions; inspect captures against the listed sizes.

No App Store submission, Apple signing or final public release has been performed.
