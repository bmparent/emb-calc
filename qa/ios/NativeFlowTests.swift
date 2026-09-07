import XCTest

final class NativeFlowTests: XCTestCase {
    let app = XCUIApplication(bundleIdentifier: "com.embroiderycalc.companion")

    override func setUpWithError() throws {
        continueAfterFailure = false
        XCUIDevice.shared.orientation = .portrait
        app.launch()
        XCTAssertTrue(app.webViews.firstMatch.waitForExistence(timeout: 30))
    }

    override func tearDownWithError() throws {
        let hierarchy = XCTAttachment(string: app.debugDescription)
        hierarchy.name = "Final accessibility hierarchy"
        hierarchy.lifetime = .keepAlways
        add(hierarchy)
        capture("Final screen")
        app.terminate()
    }

    private func capture(_ name: String) {
        let screenshot = XCTAttachment(screenshot: app.screenshot())
        screenshot.name = name
        screenshot.lifetime = .keepAlways
        add(screenshot)
    }

    private func text(_ label: String) {
        XCTAssertTrue(app.staticTexts[label].firstMatch.waitForExistence(timeout: 25), label)
    }

    private func tap(_ label: String) {
        let button = app.buttons[label].firstMatch
        XCTAssertTrue(button.waitForExistence(timeout: 25), label)
        // Scroll the real web view when the control is below the viewport.
        for _ in 0..<8 {
            let navigation = app.buttons["Shop"].firstMatch
            let bottom = navigation.exists ? navigation.frame.minY : app.frame.maxY
            // WKWebView may report a DOM button hittable beneath its fixed
            // navigation. Require its full frame above the real navigation.
            if button.isHittable && button.frame.maxY < bottom { break }
            if button.frame.minY < app.frame.minY {
                app.webViews.firstMatch.swipeDown()
            } else {
                app.webViews.firstMatch.swipeUp()
            }
        }
        XCTAssertTrue(button.isHittable, "Visible action: \(label)")
        button.tap()
    }

    private func saved() { text("Saved on this device") }

    func testProductionFlow() throws {
        text("What are we making?")
        capture("A - Job")
        tap("Try an example job")
        saved()
        tap("Review estimate")
        text("Your production plan")
        capture("B - Estimate")
        tap("Save estimate")
        text("Ready when you are")
        saved()
        capture("C - Next")

        tap("Share quote")
        let sheet = app.otherElements["ActivityListView"].firstMatch
        XCTAssertTrue(sheet.waitForExistence(timeout: 30), "Native share sheet opened")
        let caption = app.otherElements["LP.CaptionBar.BottomCaption"].firstMatch
        XCTAssertTrue(caption.waitForExistence(timeout: 20))
        XCTAssertTrue(caption.label.contains("PDF"), "The native sheet received a PDF")
        capture("Native PDF share sheet")
        let dismiss = app.otherElements["PopoverDismissRegion"].firstMatch
        XCTAssertTrue(dismiss.exists)
        // This system region surrounds the centered popover on both devices.
        dismiss.coordinate(withNormalizedOffset: CGVector(dx: 0.05, dy: 0.1)).tap()
        text("Ready when you are")

        tap("Start production")
        text("Production is running")
        saved()
        tap("Pause production")
        text("Production paused")
        saved()
        capture("Paused before force quit")
        app.terminate()
        app.launch()
        text("Production paused")
        capture("Paused after relaunch")
        tap("Resume production")
        text("Production is running")
        saved()
        tap("Complete job")
        text("Job complete")
        saved()
        capture("Completed job")
        app.terminate()
        app.launch()
        text("Job complete")
        tap("Duplicate job")
        text("What are we making?")
        saved()
    }

    // The CI host corrupts only a disposable simulator snapshot after the first
    // test. No injected app hooks or mocked Capacitor ports are involved.
    func testRecoveryFromCorruptSnapshot() throws {
        XCTAssertTrue(app.buttons["Restore previous save"].waitForExistence(timeout: 30))
        capture("Unreadable saved data")
        tap("Restore previous save")
        text("Job complete")
        saved()
        capture("Recovered previous save")
        app.terminate()
        app.launch()
        text("Job complete")
    }

    func testAccessibility() throws {
        text("Job complete")
        capture("Before native accessibility audit")
        // Apple's audit is additional automated evidence. It does not replace
        // an owner navigating the real device with VoiceOver and Larger Text.
        try app.performAccessibilityAudit()
    }
}
