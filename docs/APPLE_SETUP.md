# Apple setup from Windows

Brent confirmed on September 7, 2026 that an iPhone and iPad are available,
but Apple Developer/App Store Connect access has not been set up. No local Mac
is required for the planned hosted-Mac build path. No enrollment, purchase,
certificate issuance, signing, or upload has been performed.

## First action: enroll the owner

1. On the iPhone, install Apple's **Apple Developer** app, open Account and sign
   in with the Apple Account you intend to own the app. Enable two-factor
   authentication if Apple requires it. Choose **Enroll Now** and complete Apple's
   identity checks. The owner must accept the agreement and pay the membership fee.
2. Choose the correct legal enrollment type. An individual/sole proprietor's legal
   personal name appears as the seller. An organization requires a legal entity,
   authority to bind it, and normally a D-U-N-S number; a brand name alone does not
   establish an organization. Do not select an invented company identity.
3. Membership is currently **$99 USD per year**, with regional pricing. Wait for
   Apple to confirm activation, then sign in to App Store Connect in Chrome.
4. Tell Codex **“Apple membership is active; continue the EmbroideryCalc setup.”**
   Keep passwords, identity documents, recovery codes and private keys out of chat.

Sources checked September 7, 2026: [enrollment](https://developer.apple.com/programs/enroll/),
[enrollment in the Apple Developer app](https://developer.apple.com/support/app-account/).

## After activation: account and app record

Codex can continue the authorized setup using the signed-in session. The owner
supplies legal/contact information and makes any required agreement attestations.

- Confirm the Apple team ID and register the explicit bundle identifier
  `com.embroiderycalc.companion` if available. It is currently proposed, not reserved.
  If unavailable, update Capacitor and both Xcode configurations, signing preflight,
  native tests and documentation together, and rerun native verification.
- Create the iOS app record, name **EmbroideryCalc**, language **English (U.S.)**,
  SKU **embroiderycalc-ios-001**, using that registered identifier.
- Use [APP_STORE_SUBMISSION.md](APP_STORE_SUBMISSION.md) for the prepared copy,
  privacy/support URLs, screenshots and review notes. The owner supplies seller,
  copyright, review contact, territory and trader-status answers. App Review
  release should remain manual.

## Signing without a personal Mac

The manual **Sign iOS candidate** workflow uses GitHub's macOS runner. The workflow
must be available on the repository's default branch before GitHub exposes manual
dispatch. Keep PR #5 reviewable; do not merge solely to enable signing before the
native checks pass and the operational deployment boundary is rechecked.

The account owner can create the signing assets through Apple's portal. A CSR and
password-protected P12 can be generated locally on Windows with OpenSSL after the
owner's identity is known; only the CSR/public certificate goes to Apple's portal.
The matching private key stays in private local storage, outside this repository.
No third-party signing account or paid Mac rental is required for this path.

1. Issue an **Apple Distribution** certificate from a locally generated CSR.
   Combine Apple's downloaded certificate with its matching private key into a
   password-protected P12. Do not revoke another app's certificate.
2. Create an **App Store Connect** distribution profile for the exact App ID and
   that certificate. A development, ad hoc, wildcard or enterprise profile fails
   the preflight. This app needs no extra capabilities enabled.
3. Store these in repository **Settings → Secrets and variables → Actions**:

   | Secret | Value |
   | --- | --- |
   | `APPLE_TEAM_ID` | The owner's ten-character team ID |
   | `IOS_CERTIFICATE_BASE64` | Base64 of the matching distribution P12 |
   | `IOS_P12_PASSWORD` | The P12 password |
   | `IOS_PROFILE_BASE64` | Base64 of the App Store Connect provisioning profile |

4. For upload automation, generate an App Store Connect **team API key** with the
   least role that permits build upload (Developer). Team keys can access all apps
   for that role; do not grant Admin merely for this upload. The account holder may
   first need to request API access and accept Apple's terms. Store `ASC_KEY_ID`,
   `ASC_ISSUER_ID`, and the downloaded P8 as `ASC_PRIVATE_KEY_BASE64` in Actions
   secrets. Only the owner should approve granting this access.
5. Run **Sign iOS candidate** with the exact reviewed commit SHA, a fresh build
   number, and **upload_testflight = false** first. Download the signed artifact,
   inspect the archive/export logs and IPA hash. Signing is not yet verified:
   this workflow cannot be executed end to end until real Apple assets exist.
6. After reviewing the archive, rerun for the same reviewed code/build with
   **upload_testflight = true** (provided that build has not already been uploaded).
   If an earlier upload was accepted, choose a new build number. Inspect Apple's
   validation/upload response, then wait for the build to finish processing in
   App Store Connect. A successful upload command does not prove processing passed.

The workflow checks the reviewed commit, app/team/profile, certificate identity,
expiration, version/build and SDK. It imports keys only on an ephemeral Mac and
cleans up its keychain/profile/key files. It never runs on a PR or automatically
invites testers, submits App Review, or releases an app publicly.

References: [App Store profiles](https://developer.apple.com/help/account/provisioning-profiles/create-an-app-store-provisioning-profile/),
[secure Mac runner signing](https://docs.github.com/en/actions/how-tos/deploy/deploy-to-third-party-platforms/sign-xcode-applications),
[API access](https://developer.apple.com/help/app-store-connect/get-started/app-store-connect-api),
[build upload and processing](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/).

## TestFlight and release decision

After processing, enable the build for the owner's internal testing and install
Apple's TestFlight app on the iPhone and iPad. Do not send invitations to others
without authorization. Record device models, OS versions and the TestFlight build.
Execute [DEVICE_TEST_PLAN.md](DEVICE_TEST_PLAN.md), especially VoiceOver, large
text, Files, camera, sharing, offline use and force-quit recovery.

Complete the real production measurements in [SEW_OUT_VALIDATION.md](SEW_OUT_VALIDATION.md).
Keep unmeasured values blank. The signed build, physical tests and sew-outs remain
release gates; enrollment alone does not close them. Review the exact candidate
and evidence before submitting App Review or deciding on public release.
