#!/usr/bin/env bash
set -euo pipefail
mkdir -p artifacts/ios
git rev-parse HEAD > artifacts/ios/git-commit.txt
XCODE=$(find /Applications -maxdepth 1 -name 'Xcode_26*.app' | sort -V | tail -1)
if [ -n "$XCODE" ]; then export DEVELOPER_DIR="$XCODE/Contents/Developer"; fi
xcodebuild -version | tee artifacts/ios/xcode.txt
xcodebuild -showsdks > artifacts/ios/sdks.txt
grep -q 'iphoneos26' artifacts/ios/sdks.txt
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath artifacts/ios/device CODE_SIGNING_ALLOWED=NO build > artifacts/ios/device-build.log 2>&1
xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath artifacts/ios/simulator CODE_SIGNING_ALLOWED=NO build > artifacts/ios/simulator-build.log 2>&1
xcrun simctl list devices available -j > artifacts/ios/devices.json
# Generate the same validated synthetic job used by the submission capture.
npm test > artifacts/ios/tests.txt 2>&1
node scripts/prepare-ios-uitests.mjs
for KIND in iphone ipad; do
  DEVICE=$(python3 - "$KIND" <<'PY'
import json,sys
d=json.load(open("artifacts/ios/devices.json"))
items=[x for k,v in d["devices"].items() if "iOS-26" in k for x in v]
if sys.argv[1]=="iphone":
    matches=[x for x in items if "Pro Max" in x["name"]]
else:
    matches=[x for x in items if "iPad Pro" in x["name"] and "13-inch" in x["name"]]
if not matches: raise SystemExit("Required screenshot simulator is unavailable")
print(matches[0]["udid"])
PY
)
  xcrun simctl boot "$DEVICE" || true
  xcrun simctl bootstatus "$DEVICE" -b
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
  xcrun simctl io "$DEVICE" screenshot "artifacts/ios/$KIND-ready.png"
  swift scripts/verify-screenshot.swift "artifacts/ios/$KIND-ready.png" "EmbroideryCalc" "Ready when you are" "24 embroidered polos" > "artifacts/ios/$KIND-ready-ocr.json"
  xcrun simctl terminate "$DEVICE" com.embroiderycalc.companion
  xcrun simctl launch "$DEVICE" com.embroiderycalc.companion
  sleep 5
  xcrun simctl io "$DEVICE" screenshot "artifacts/ios/$KIND-restart.png"
  swift scripts/verify-screenshot.swift "artifacts/ios/$KIND-restart.png" "EmbroideryCalc" "Ready when you are" "24 embroidered polos" > "artifacts/ios/$KIND-restart-ocr.json"
  xcrun simctl terminate "$DEVICE" com.embroiderycalc.companion
  # Reinstall into fresh, disposable data so the UI test creates every save.
  xcrun simctl uninstall "$DEVICE" com.embroiderycalc.companion
  for CASE in ProductionFlow RecoveryFromCorruptSnapshot; do
    xcodebuild -project ios/App/AppUITests.xcodeproj -scheme AppUITests -configuration Debug -destination "platform=iOS Simulator,id=$DEVICE" -derivedDataPath artifacts/ios/ui-build -parallel-testing-enabled NO -maximum-concurrent-test-simulator-destinations 1 -resultBundlePath "artifacts/ios/$KIND-$CASE.xcresult" "-only-testing:AppUITests/NativeFlowTests/test$CASE" CODE_SIGNING_ALLOWED=NO test > "artifacts/ios/$KIND-$CASE.log" 2>&1
    xcrun xcresulttool get test-results summary --path "artifacts/ios/$KIND-$CASE.xcresult" > "artifacts/ios/$KIND-$CASE-summary.json"
    xcrun xcresulttool export attachments --path "artifacts/ios/$KIND-$CASE.xcresult" --output-path "artifacts/ios/$KIND-$CASE-attachments"
    CONTAINER=$(xcrun simctl get_app_container "$DEVICE" com.embroiderycalc.companion data)
    if [ "$CASE" = ProductionFlow ]; then MODE=prepare-recovery; else MODE=verify-recovery; fi
    python3 scripts/check-native-store.py "$CONTAINER" "$MODE" "artifacts/ios/$KIND-$MODE.json"
  done
  xcrun simctl shutdown "$DEVICE"
done

# Keep the deliverable apps and logs, excluding rebuildable intermediate objects.
python3 - <<'PY'
import pathlib,plistlib,json
root=pathlib.Path('artifacts/ios/device/Build/Products/Release-iphoneos/App.app')
info=plistlib.loads((root/'Info.plist').read_bytes())
report={'bundleId':info['CFBundleIdentifier'],'version':info['CFBundleShortVersionString'],'build':info['CFBundleVersion'],'minimumOS':info['MinimumOSVersion'],'privacyManifests':{str(p.relative_to(root)):plistlib.loads(p.read_bytes()) for p in root.rglob('PrivacyInfo.xcprivacy')}}
assert report['privacyManifests'], 'Missing privacy manifests'
pathlib.Path('artifacts/ios/bundle-inspection.json').write_text(json.dumps(report,indent=2))
PY
ditto -c -k --keepParent artifacts/ios/device/Build/Products/Release-iphoneos/App.app artifacts/ios/unsigned-device-app.zip
ditto -c -k --keepParent artifacts/ios/simulator/Build/Products/Debug-iphonesimulator/App.app artifacts/ios/simulator-app.zip
rm -rf artifacts/ios/device artifacts/ios/simulator artifacts/ios/ui-build
