// Read actual simulator pixels; a successful launch alone can still show a blank
// view or a screen scrolled beneath the status bar. Requires macOS Vision.
import Foundation
import Vision
import ImageIO

let arguments = CommandLine.arguments
guard arguments.count >= 3,
      let source = CGImageSourceCreateWithURL(URL(fileURLWithPath: arguments[1]) as CFURL, nil),
      let image = CGImageSourceCreateImageAtIndex(source, 0, nil) else {
    fputs("Usage: verify-screenshot.swift image.png expected-text...\n", stderr)
    exit(1)
}
let request = VNRecognizeTextRequest()
request.recognitionLevel = .accurate
request.recognitionLanguages = ["en-US"]
request.usesLanguageCorrection = false
try VNImageRequestHandler(cgImage: image, options: [:]).perform([request])
let lines = (request.results ?? []).compactMap { $0.topCandidates(1).first?.string }
func normalized(_ value: String) -> String {
    value.lowercased().filter { $0.isLetter || $0.isNumber }
}
let recognized = normalized(lines.joined(separator: " "))
let missing = arguments.dropFirst(2).filter { !recognized.contains(normalized($0)) }
let report: [String: Any] = ["image": arguments[1], "width": image.width,
    "height": image.height, "recognizedText": lines, "missingText": Array(missing)]
let output = try JSONSerialization.data(withJSONObject: report, options: [.prettyPrinted, .sortedKeys])
FileHandle.standardOutput.write(output)
FileHandle.standardOutput.write(Data("\n".utf8))
if !missing.isEmpty { exit(1) }
