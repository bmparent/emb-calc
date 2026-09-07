#!/usr/bin/env bash
# Manual hosted-Mac signing. No Apple credentials are used by PR checks.
set -euo pipefail
python3 scripts/ios-signing-preflight.py
[[ "${RUNNER_ENVIRONMENT:-}" == github-hosted && "$(uname)" == Darwin ]] || { echo 'Requires an ephemeral GitHub-hosted macOS runner.' >&2; exit 1; }
[[ "$(git rev-parse HEAD)" == "$RC_SHA" ]] || { echo 'Checkout differs from the reviewed RC_SHA.' >&2; exit 1; }
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || { echo 'Tracked checkout changes must be reviewed before signing.' >&2; exit 1; }
OUT="$PWD/artifacts/ios-signing"
mkdir -p "$OUT"
python3 scripts/ios-signing-preflight.py > "$OUT/preflight.json"
SIGNING_DIR=$(mktemp -d "$RUNNER_TEMP/embroidery-signing.XXXXXX")
KEYCHAIN_PATH="$SIGNING_DIR/signing.keychain-db"
PROFILE_PATH_OLD=''
PROFILE_PATH_NEW=''
cleanup() {
  security delete-keychain "$KEYCHAIN_PATH" >/dev/null 2>&1 || true
  if [[ -n "$PROFILE_PATH_OLD" ]]; then rm -f "$PROFILE_PATH_OLD"; fi
  if [[ -n "$PROFILE_PATH_NEW" ]]; then rm -f "$PROFILE_PATH_NEW"; fi
  case "$SIGNING_DIR" in "$RUNNER_TEMP"/embroidery-signing.*) rm -rf "$SIGNING_DIR";; esac
}
trap cleanup EXIT
export SIGNING_DIR
umask 077
python3 - <<'PY'
import base64,os,pathlib
root=pathlib.Path(os.environ['SIGNING_DIR'])
for name,variable in [('certificate.p12','IOS_CERTIFICATE_BASE64'),('profile.mobileprovision','IOS_PROFILE_BASE64')]:
    (root/name).write_bytes(base64.b64decode(os.environ[variable],validate=True))
if os.environ.get('UPLOAD_TESTFLIGHT')=='true':
    (root/'private_keys').mkdir()
    # The API key ID is checked before using it in a path.
    import re
    key=os.environ['ASC_KEY_ID']
    assert re.fullmatch(r'[A-Z0-9]{10}',key), 'Invalid App Store Connect key ID'
    (root/'private_keys'/f'AuthKey_{key}.p8').write_bytes(base64.b64decode(os.environ['ASC_PRIVATE_KEY_BASE64'],validate=True))
PY
security cms -D -i "$SIGNING_DIR/profile.mobileprovision" > "$SIGNING_DIR/profile.plist"
python3 scripts/ios-signing-preflight.py "$SIGNING_DIR/profile.plist" > "$SIGNING_DIR/profile-check.json"
PROFILE_UUID=$(python3 -c 'import json,os; print(json.load(open(os.environ["SIGNING_DIR"]+"/profile-check.json"))["uuid"])')
IDENTITY=$(python3 -c 'import json,os; print(json.load(open(os.environ["SIGNING_DIR"]+"/profile-check.json"))["certificateSHA1"])')
KEYCHAIN_PASSWORD=$(openssl rand -hex 32)
security create-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security set-keychain-settings -lut 3600 "$KEYCHAIN_PATH"
security unlock-keychain -p "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH"
security import "$SIGNING_DIR/certificate.p12" -P "$IOS_P12_PASSWORD" -t cert -f pkcs12 -k "$KEYCHAIN_PATH" -T /usr/bin/codesign -T /usr/bin/security >/dev/null
security set-key-partition-list -S apple-tool:,apple:,codesign: -k "$KEYCHAIN_PASSWORD" "$KEYCHAIN_PATH" >/dev/null
security list-keychains -d user -s "$KEYCHAIN_PATH" "$HOME/Library/Keychains/login.keychain-db"
security find-identity -v -p codesigning "$KEYCHAIN_PATH" | grep -q "$IDENTITY" || { echo 'P12 private key does not match a valid profile certificate.' >&2; exit 1; }
PROFILE_PATH_OLD="$HOME/Library/MobileDevice/Provisioning Profiles/$PROFILE_UUID.mobileprovision"
PROFILE_PATH_NEW="$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles/$PROFILE_UUID.mobileprovision"
mkdir -p "$(dirname "$PROFILE_PATH_OLD")" "$(dirname "$PROFILE_PATH_NEW")"
cp "$SIGNING_DIR/profile.mobileprovision" "$PROFILE_PATH_OLD"
cp "$SIGNING_DIR/profile.mobileprovision" "$PROFILE_PATH_NEW"
XCODE=$(find /Applications -maxdepth 1 -name 'Xcode_26*.app' | sort -V | tail -1)
if [[ -n "$XCODE" ]]; then export DEVELOPER_DIR="$XCODE/Contents/Developer"; fi
xcodebuild -version > "$OUT/xcode.txt"
xcodebuild -showsdks > "$OUT/sdks.txt"
grep -q 'iphoneos26' "$OUT/sdks.txt"
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -destination 'generic/platform=iOS' -archivePath "$OUT/EmbroideryCalc.xcarchive" -derivedDataPath "$SIGNING_DIR/build" CODE_SIGN_STYLE=Manual "CODE_SIGN_IDENTITY=$IDENTITY" "DEVELOPMENT_TEAM=$APPLE_TEAM_ID" "PROVISIONING_PROFILE_SPECIFIER=$PROFILE_UUID" "CURRENT_PROJECT_VERSION=$BUILD_NUMBER" archive > "$OUT/archive.log" 2>&1
export PROFILE_UUID IDENTITY OUT
python3 - <<'PY'
import os,pathlib,plistlib
out=pathlib.Path(os.environ['OUT'])
app=out/'EmbroideryCalc.xcarchive/Products/Applications/App.app'
info=plistlib.loads((app/'Info.plist').read_bytes())
assert info['CFBundleIdentifier']=='com.embroiderycalc.companion'
assert info['CFBundleVersion']==os.environ['BUILD_NUMBER']
assert info['CFBundleShortVersionString']=='1.0.0'
assert info['DTSDKName'].startswith('iphoneos26')
options={'method':'app-store-connect','destination':'export','signingStyle':'manual','teamID':os.environ['APPLE_TEAM_ID'],'signingCertificate':os.environ['IDENTITY'],'provisioningProfiles':{'com.embroiderycalc.companion':os.environ['PROFILE_UUID']},'manageAppVersionAndBuildNumber':False,'stripSwiftSymbols':True,'uploadSymbols':True}
(pathlib.Path(os.environ['SIGNING_DIR'])/'ExportOptions.plist').write_bytes(plistlib.dumps(options))
PY
codesign --verify --deep --strict "$OUT/EmbroideryCalc.xcarchive/Products/Applications/App.app" 2> "$OUT/signature-check.txt"
xcodebuild -exportArchive -archivePath "$OUT/EmbroideryCalc.xcarchive" -exportOptionsPlist "$SIGNING_DIR/ExportOptions.plist" -exportPath "$OUT/export" > "$OUT/export.log" 2>&1
IPA=$(find "$OUT/export" -maxdepth 1 -name '*.ipa')
[[ -f "$IPA" ]] || { echo 'Expected one exported IPA.' >&2; exit 1; }
shasum -a 256 "$IPA" > "$OUT/ipa-sha256.txt"
if [[ "${UPLOAD_TESTFLIGHT:-false}" == true ]]; then
  # altool reads ./private_keys; only this subprocess changes its working folder.
  (cd "$SIGNING_DIR"; xcrun altool --validate-app -f "$IPA" -t ios --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID" --output-format json) > "$OUT/apple-validation.json" 2>&1
  (cd "$SIGNING_DIR"; xcrun altool --upload-app -f "$IPA" -t ios --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID" --output-format json) > "$OUT/apple-upload.json" 2>&1
fi
echo 'Signed candidate exported. An upload still requires Apple processing and TestFlight verification.'
