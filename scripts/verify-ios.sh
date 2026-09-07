#!/usr/bin/env bash
set -euo pipefail
mkdir -p artifacts/ios
CREATED_DEVICES=''
bounded() {
  python3 - "$@" <<'PY'
import subprocess,sys
try:
    sys.exit(subprocess.run(sys.argv[2:],timeout=int(sys.argv[1])).returncode)
except subprocess.TimeoutExpired:
    print('Command exceeded '+sys.argv[1]+' seconds: '+' '.join(sys.argv[2:]),file=sys.stderr)
    sys.exit(124)
PY
}
cleanup() {
  for device in $CREATED_DEVICES; do
    bounded 20 xcrun simctl shutdown "$device" >/dev/null 2>&1 || true
    bounded 20 xcrun simctl delete "$device" >/dev/null 2>&1 || true
  done
  rm -rf artifacts/ios/device artifacts/ios/simulator artifacts/ios/ui-build
}
trap cleanup EXIT
capture_ready() {
  local device="$1" name="$2"
  # A loaded VM can take longer than five seconds to reopen WKWebView. Keep
  # every attempt and require visible content; never accept a blank launch.
  for attempt in {1..10}; do
    local base="artifacts/ios/$name-attempt-$attempt"
    xcrun simctl io "$device" screenshot "$base.png"
    if swift scripts/verify-screenshot.swift "$base.png" "EmbroideryCalc" "Ready when you are" "24 embroidered polos" > "$base-ocr.json"; then
      cp "$base.png" "artifacts/ios/$name.png"
      cp "$base-ocr.json" "artifacts/ios/$name-ocr.json"
      return 0
    fi
    sleep 5
  done
  echo "Visible content did not become ready: $name" >&2
  return 1
}
git rev-parse HEAD > artifacts/ios/git-commit.txt
XCODE=$(find /Applications -maxdepth 1 -name 'Xcode_26*.app' | sort -V | tail -1)
if [ -n "$XCODE" ]; then export DEVELOPER_DIR="$XCODE/Contents/Developer"; fi
xcodebuild -version | tee artifacts/ios/xcode.txt
xcodebuild -showsdks > artifacts/ios/sdks.txt
grep -q 'iphoneos26' artifacts/ios/sdks.txt
SIMULATOR_SDK_VERSION=$(xcrun --sdk iphonesimulator --show-sdk-version)
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath artifacts/ios/device CODE_SIGNING_ALLOWED=NO build > artifacts/ios/device-build.log 2>&1
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath artifacts/ios/simulator CODE_SIGNING_ALLOWED=NO build > artifacts/ios/simulator-build.log 2>&1
# Preserve completed build evidence even if a later interaction test fails.
python3 - <<'PY'
import pathlib,plistlib,json
root=pathlib.Path('artifacts/ios/device/Build/Products/Release-iphoneos/App.app')
info=plistlib.loads((root/'Info.plist').read_bytes())
report={'bundleId':info['CFBundleIdentifier'],'version':info['CFBundleShortVersionString'],'build':info['CFBundleVersion'],'minimumOS':info['MinimumOSVersion'],'requiredCapabilities':info['UIRequiredDeviceCapabilities'],'interfaceStyle':info['UIUserInterfaceStyle'],'deviceFamily':info['UIDeviceFamily'],'launchStoryboard':info['UILaunchStoryboardName'],'privacyManifests':{str(p.relative_to(root)):plistlib.loads(p.read_bytes()) for p in root.rglob('PrivacyInfo.xcprivacy')}}
assert report['privacyManifests'], 'Missing privacy manifests'
assert report['requiredCapabilities']==['arm64']
assert report['interfaceStyle']=='Light'
assert report['deviceFamily']==[1,2]
pathlib.Path('artifacts/ios/bundle-inspection.json').write_text(json.dumps(report,indent=2))
PY
ditto -c -k --keepParent artifacts/ios/device/Build/Products/Release-iphoneos/App.app artifacts/ios/unsigned-device-app.zip
ditto -c -k --keepParent artifacts/ios/simulator/Build/Products/Debug-iphonesimulator/App.app artifacts/ios/simulator-app.zip
xcrun simctl list devices available -j > artifacts/ios/devices.json
# Generate the same validated synthetic job used by the submission capture.
npm test > artifacts/ios/tests.txt 2>&1
node scripts/prepare-ios-uitests.mjs
python3 -m unittest discover -s qa/signing -v > artifacts/ios/signing-tests.txt 2>&1
xcrun altool --help > artifacts/ios/altool-help.txt 2>&1
[[ -z "${IOS_TEST_DEVICE:-}" || "${IOS_TEST_DEVICE:-}" == iphone || "${IOS_TEST_DEVICE:-}" == ipad ]] || { echo 'Invalid IOS_TEST_DEVICE' >&2; exit 1; }
for KIND in ${IOS_TEST_DEVICE:-iphone ipad}; do
  CHOICE=$(python3 - "$KIND" "$SIMULATOR_SDK_VERSION" <<'PY'
import json,sys
d=json.load(open("artifacts/ios/devices.json"))
runtime="com.apple.CoreSimulator.SimRuntime.iOS-"+sys.argv[2].replace(".","-")
items=[{**x,"runtime":k} for k,v in d["devices"].items() if k==runtime for x in v]
if sys.argv[1]=="iphone":
    matches=[x for x in items if "Pro Max" in x["name"]]
else:
    matches=[x for x in items if "iPad Pro" in x["name"] and "13-inch" in x["name"]]
if not matches: raise SystemExit("Required screenshot simulator is unavailable")
print(matches[0]["deviceTypeIdentifier"], matches[0]["runtime"])
PY
)
  read -r DEVICE_TYPE RUNTIME <<< "$CHOICE"
  DEVICE=$(bounded 60 xcrun simctl create "EmbroideryCalc-QA-$KIND-$$" "$DEVICE_TYPE" "$RUNTIME")
  CREATED_DEVICES="$CREATED_DEVICES $DEVICE"
  echo "$KIND $DEVICE $DEVICE_TYPE $RUNTIME" >> artifacts/ios/test-devices.txt
  echo "Booting $KIND on SDK-matched runtime $RUNTIME"
  bounded 180 xcrun simctl boot "$DEVICE" > "artifacts/ios/$KIND-boot.log" 2>&1
  bounded 180 xcrun simctl bootstatus "$DEVICE" -b >> "artifacts/ios/$KIND-boot.log" 2>&1
  xcrun simctl status_bar "$DEVICE" override --time "9:41" --dataNetwork wifi --wifiMode active --wifiBars 3 --batteryState charged --batteryLevel 100
  xcrun simctl install "$DEVICE" artifacts/ios/simulator/Build/Products/Debug-iphonesimulator/App.app
  # Seed the fresh simulator app's private data before its first launch.
  CONTAINER=$(xcrun simctl get_app_container "$DEVICE" com.embroiderycalc.companion data)
  python3 - "$CONTAINER" <<'PY'
import sys,pathlib,plistlib,shutil
root=pathlib.Path(sys.argv[1])
(root/"Documents/production").mkdir(parents=True,exist_ok=True)
shutil.copyfile("artifacts/submission/demo-ready.json",root/"Documents/production/demo.json")
prefs=root/"Library/Preferences/com.embroiderycalc.companion.plist"
prefs.parent.mkdir(parents=True,exist_ok=True)
data=plistlib.loads(prefs.read_bytes()) if prefs.exists() else {}
data["CapacitorStorage.production-store-pointer"]="production/demo.json"
prefs.write_bytes(plistlib.dumps(data))
PY
  xcrun simctl launch "$DEVICE" com.embroiderycalc.companion
  sleep 12
  capture_ready "$DEVICE" "$KIND-ready"
  xcrun simctl terminate "$DEVICE" com.embroiderycalc.companion
  xcrun simctl launch "$DEVICE" com.embroiderycalc.companion
  sleep 5
  capture_ready "$DEVICE" "$KIND-restart"
  xcrun simctl terminate "$DEVICE" com.embroiderycalc.companion
  # Reinstall into fresh, disposable data so the UI test creates every save.
  xcrun simctl uninstall "$DEVICE" com.embroiderycalc.companion
  for CASE in ProductionFlow RecoveryFromCorruptSnapshot Accessibility; do
    echo "Testing $KIND $CASE"
    TEST_STATUS=0
    bounded 600 xcodebuild -project ios/App/AppUITests.xcodeproj -scheme AppUITests -configuration Debug -destination "platform=iOS Simulator,id=$DEVICE" -derivedDataPath artifacts/ios/ui-build -parallel-testing-enabled NO -maximum-concurrent-test-simulator-destinations 1 -test-timeouts-enabled YES -default-test-execution-time-allowance 300 -maximum-test-execution-time-allowance 420 -resultBundlePath "artifacts/ios/$KIND-$CASE.xcresult" "-only-testing:AppUITests/NativeFlowTests/test$CASE" CODE_SIGNING_ALLOWED=NO test > "artifacts/ios/$KIND-$CASE.log" 2>&1 || TEST_STATUS=$?
    if [ -d "artifacts/ios/$KIND-$CASE.xcresult" ]; then
      xcrun xcresulttool get test-results summary --path "artifacts/ios/$KIND-$CASE.xcresult" > "artifacts/ios/$KIND-$CASE-summary.json"
      xcrun xcresulttool export attachments --path "artifacts/ios/$KIND-$CASE.xcresult" --output-path "artifacts/ios/$KIND-$CASE-attachments"
    fi
    if [ "$TEST_STATUS" -ne 0 ]; then
      tail -100 "artifacts/ios/$KIND-$CASE.log"
      exit "$TEST_STATUS"
    fi
    CONTAINER=$(xcrun simctl get_app_container "$DEVICE" com.embroiderycalc.companion data)
    if [ "$CASE" = ProductionFlow ]; then
      python3 scripts/check-native-store.py "$CONTAINER" prepare-recovery "artifacts/ios/$KIND-prepare-recovery.json"
    elif [ "$CASE" = RecoveryFromCorruptSnapshot ]; then
      python3 scripts/check-native-store.py "$CONTAINER" verify-recovery "artifacts/ios/$KIND-verify-recovery.json"
    fi
  done
  bounded 30 xcrun simctl shutdown "$DEVICE"
done
