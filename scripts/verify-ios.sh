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
DEVICE=$(python3 -c 'import json; d=json.load(open("artifacts/ios/devices.json")); print(next(x["udid"] for k,v in d["devices"].items() if "iOS-26" in k for x in v if "iPhone" in x["name"]))')
xcrun simctl boot "$DEVICE"
xcrun simctl bootstatus "$DEVICE" -b
xcrun simctl install "$DEVICE" artifacts/ios/simulator/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch "$DEVICE" com.embroiderycalc.companion | tee artifacts/ios/launch.txt
sleep 15
xcrun simctl io "$DEVICE" screenshot artifacts/ios/iphone-launch.png
# Keep the deliverable apps and logs, excluding rebuildable intermediate objects.
ditto -c -k --keepParent artifacts/ios/device/Build/Products/Release-iphoneos/App.app artifacts/ios/unsigned-device-app.zip
ditto -c -k --keepParent artifacts/ios/simulator/Build/Products/Debug-iphonesimulator/App.app artifacts/ios/simulator-app.zip
rm -rf artifacts/ios/device artifacts/ios/simulator
