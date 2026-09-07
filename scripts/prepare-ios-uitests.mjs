// Create an isolated test project beside App.xcodeproj. The shipping project and
// app contain no test hooks, seeded state, or test-only production behavior.
import fs from 'node:fs';
import xcode from 'xcode';

const project = xcode.project('ios/App/App.xcodeproj/project.pbxproj');
project.parseSync();
const objects = project.hash.project.objects;
objects.PBXTargetDependency ||= {};
objects.PBXContainerItemProxy ||= {};
const app = project.getFirstTarget();
const dependencies = [...app.firstTarget.dependencies];
const test = project.addTarget('AppUITests', 'unit_test_bundle', 'AppUITests', 'com.embroiderycalc.companion.uitests');
test.pbxNativeTarget.productType = '"com.apple.product-type.bundle.ui-testing"';
app.firstTarget.dependencies = dependencies;
project.addTargetDependency(test.uuid, [app.uuid]);
const product = objects.PBXFileReference[test.pbxNativeTarget.productReference];
product.path = 'AppUITests.xctest';
product.name = 'AppUITests.xctest';
product.explicitFileType = '"wrapper.cfbundle"';
const list = objects.XCConfigurationList[test.pbxNativeTarget.buildConfigurationList];
for (const config of list.buildConfigurations) {
  const settings = objects.XCBuildConfiguration[config.value].buildSettings;
  delete settings.INFOPLIST_FILE;
  Object.assign(settings, {
    GENERATE_INFOPLIST_FILE: 'YES', SWIFT_VERSION: '5.0',
    IPHONEOS_DEPLOYMENT_TARGET: '17.0', TARGETED_DEVICE_FAMILY: '"1,2"',
    TEST_TARGET_NAME: 'App', CODE_SIGNING_ALLOWED: 'NO',
  });
}
project.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', test.uuid);
project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', test.uuid);
project.addSourceFile('../../qa/ios/NativeFlowTests.swift', { target: test.uuid }, project.getFirstProject().firstProject.mainGroup);
const dir = 'ios/App/AppUITests.xcodeproj';
fs.mkdirSync(`${dir}/xcshareddata/xcschemes`, { recursive: true });
fs.writeFileSync(`${dir}/project.pbxproj`, project.writeSync());
const reference = (id, name, productName) => `<BuildableReference BuildableIdentifier="primary" BlueprintIdentifier="${id}" BuildableName="${productName}" BlueprintName="${name}" ReferencedContainer="container:AppUITests.xcodeproj"/>`;
const appRef = reference(app.uuid, 'App', 'App.app');
const testRef = reference(test.uuid, 'AppUITests', 'AppUITests.xctest');
fs.writeFileSync(`${dir}/xcshareddata/xcschemes/AppUITests.xcscheme`, `<?xml version="1.0" encoding="UTF-8"?>
<Scheme LastUpgradeVersion="2630" version="1.3">
  <BuildAction parallelizeBuildables="NO" buildImplicitDependencies="YES"><BuildActionEntries>
    <BuildActionEntry buildForTesting="YES" buildForRunning="YES" buildForProfiling="NO" buildForArchiving="NO" buildForAnalyzing="YES">${appRef}</BuildActionEntry>
    <BuildActionEntry buildForTesting="YES" buildForRunning="NO" buildForProfiling="NO" buildForArchiving="NO" buildForAnalyzing="YES">${testRef}</BuildActionEntry>
  </BuildActionEntries></BuildAction>
  <TestAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" shouldUseLaunchSchemeArgsEnv="YES">
    <Testables><TestableReference skipped="NO">${testRef}</TestableReference></Testables><MacroExpansion>${appRef}</MacroExpansion>
  </TestAction>
  <LaunchAction buildConfiguration="Debug" selectedDebuggerIdentifier="Xcode.DebuggerFoundation.Debugger.LLDB" selectedLauncherIdentifier="Xcode.IDEFoundation.Launcher.LLDB" launchStyle="0" useCustomWorkingDirectory="NO" ignoresPersistentStateOnLaunch="NO" debugDocumentVersioning="YES" debugServiceExtension="internal" allowLocationSimulation="YES"><BuildableProductRunnable runnableDebuggingMode="0">${appRef}</BuildableProductRunnable></LaunchAction>
</Scheme>
`);
console.log('Generated isolated AppUITests project');
