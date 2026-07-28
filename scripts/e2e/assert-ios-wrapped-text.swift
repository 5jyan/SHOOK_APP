#!/usr/bin/env swift

import CoreGraphics
import Foundation
import ImageIO

private struct RGB: CustomStringConvertible {
  let red: UInt8
  let green: UInt8
  let blue: UInt8

  var description: String {
    String(format: "#%02X%02X%02X", red, green, blue)
  }
}

private struct Raster {
  let width: Int
  let height: Int
  let rgba: [UInt8]

  init(width: Int, height: Int, rgba: [UInt8]) throws {
    guard width > 0, height > 0, rgba.count == width * height * 4 else {
      throw ValidationError("invalid RGBA raster dimensions")
    }
    self.width = width
    self.height = height
    self.rgba = rgba
  }

  func rgb(x: Int, y: Int) -> RGB {
    let offset = (y * width + x) * 4
    return RGB(
      red: rgba[offset],
      green: rgba[offset + 1],
      blue: rgba[offset + 2]
    )
  }

  func alpha(x: Int, y: Int) -> UInt8 {
    rgba[(y * width + x) * 4 + 3]
  }
}

private struct InkMetrics {
  let background: RGB
  let upperInkPixels: Int
  let lowerInkPixels: Int
  let minimumInkPixels: Int

  var edgeBalance: Double {
    let larger = max(upperInkPixels, lowerInkPixels)
    guard larger > 0 else { return 0 }
    return Double(min(upperInkPixels, lowerInkPixels)) / Double(larger)
  }
}

private struct ValidationError: Error, CustomStringConvertible {
  let description: String

  init(_ description: String) {
    self.description = description
  }
}

private let foregroundDistanceSquared = 35 * 35
private let minimumEdgeBalance = 0.03

private func loadPNG(at path: String) throws -> Raster {
  let url = URL(fileURLWithPath: path)
  guard FileManager.default.fileExists(atPath: url.path) else {
    throw ValidationError("screenshot does not exist: \(url.path)")
  }
  guard
    let source = CGImageSourceCreateWithURL(url as CFURL, nil),
    let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
  else {
    throw ValidationError("could not decode screenshot as an image: \(url.path)")
  }

  let width = image.width
  let height = image.height
  guard width >= 40, height >= 40 else {
    throw ValidationError(
      "cropped screenshot is unexpectedly small (\(width)x\(height)); "
        + "the Maestro crop may not have targeted the wrapped Text element"
    )
  }

  var rgba = [UInt8](repeating: 0, count: width * height * 4)
  let rendered = rgba.withUnsafeMutableBytes { bytes -> Bool in
    guard
      let baseAddress = bytes.baseAddress,
      let context = CGContext(
        data: baseAddress,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: width * 4,
        space: CGColorSpaceCreateDeviceRGB(),
        bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
          | CGBitmapInfo.byteOrder32Big.rawValue
      )
    else {
      return false
    }

    context.setBlendMode(.copy)
    context.interpolationQuality = .none
    context.draw(
      image,
      in: CGRect(x: 0, y: 0, width: CGFloat(width), height: CGFloat(height))
    )
    return true
  }

  guard rendered else {
    throw ValidationError("could not render screenshot pixels into an RGBA buffer")
  }
  return try Raster(width: width, height: height, rgba: rgba)
}

private func median(_ values: [UInt8]) -> UInt8 {
  let sorted = values.sorted()
  return sorted[sorted.count / 2]
}

private func estimateBackground(in raster: Raster) -> RGB {
  let sampleDepth = min(6, max(1, min(raster.width, raster.height) / 8))
  var red: [UInt8] = []
  var green: [UInt8] = []
  var blue: [UInt8] = []

  let xRanges = [
    0..<sampleDepth,
    (raster.width - sampleDepth)..<raster.width,
  ]
  let yRanges = [
    0..<sampleDepth,
    (raster.height - sampleDepth)..<raster.height,
  ]

  for xRange in xRanges {
    for yRange in yRanges {
      for y in yRange {
        for x in xRange {
          let pixel = raster.rgb(x: x, y: y)
          red.append(pixel.red)
          green.append(pixel.green)
          blue.append(pixel.blue)
        }
      }
    }
  }

  return RGB(
    red: median(red),
    green: median(green),
    blue: median(blue)
  )
}

private func isInk(_ pixel: RGB, alpha: UInt8, background: RGB) -> Bool {
  guard alpha >= 128 else { return false }
  let redDistance = Int(pixel.red) - Int(background.red)
  let greenDistance = Int(pixel.green) - Int(background.green)
  let blueDistance = Int(pixel.blue) - Int(background.blue)
  let distanceSquared = redDistance * redDistance
    + greenDistance * greenDistance
    + blueDistance * blueDistance
  return distanceSquared >= foregroundDistanceSquared
}

private func countInk(
  in raster: Raster,
  rows: Range<Int>,
  background: RGB
) -> Int {
  var count = 0
  for y in rows {
    for x in 0..<raster.width {
      if isInk(
        raster.rgb(x: x, y: y),
        alpha: raster.alpha(x: x, y: y),
        background: background
      ) {
        count += 1
      }
    }
  }
  return count
}

private func inspectInk(in raster: Raster) -> InkMetrics {
  let background = estimateBackground(in: raster)
  let midpoint = raster.height / 2
  let upperInkPixels = countInk(
    in: raster,
    rows: 0..<midpoint,
    background: background
  )
  let lowerInkPixels = countInk(
    in: raster,
    rows: midpoint..<raster.height,
    background: background
  )

  // The fixture deliberately leaves several Korean glyphs on its final visual
  // line. This width-relative floor ignores anti-aliasing differences while
  // still rejecting an empty reserved line or a few noisy pixels.
  let minimumInkPixels = max(100, raster.width / 6)
  return InkMetrics(
    background: background,
    upperInkPixels: upperInkPixels,
    lowerInkPixels: lowerInkPixels,
    minimumInkPixels: minimumInkPixels
  )
}

@discardableResult
private func validateWrappedText(in raster: Raster, label: String) throws -> InkMetrics {
  guard raster.height >= 80 else {
    throw ValidationError(
      "\(label): crop height \(raster.height)px is too short for the expected "
        + "two-line fixture; the text may not have wrapped"
    )
  }

  let metrics = inspectInk(in: raster)
  let weakerHalf = min(metrics.upperInkPixels, metrics.lowerInkPixels)
  if weakerHalf < metrics.minimumInkPixels {
    throw ValidationError(
      "\(label): a wrapped-line half is blank or clipped "
        + "(size=\(raster.width)x\(raster.height), background=\(metrics.background), "
        + "upperInk=\(metrics.upperInkPixels), lowerInk=\(metrics.lowerInkPixels), "
        + "requiredPerHalf=\(metrics.minimumInkPixels)). "
        + "The final visual line must contain rendered glyph pixels, not only reserved height."
    )
  }

  if metrics.edgeBalance < minimumEdgeBalance {
    throw ValidationError(
      "\(label): ink is too imbalanced between the two visual-line halves "
        + "(upperInk=\(metrics.upperInkPixels), lowerInk=\(metrics.lowerInkPixels), "
        + "ratio=\(String(format: "%.4f", metrics.edgeBalance)), "
        + "requiredRatio=\(String(format: "%.2f", minimumEdgeBalance))). "
        + "The shorter final line appears partially or fully clipped."
    )
  }

  return metrics
}

private func syntheticRaster(includeFinalLine: Bool) throws -> Raster {
  let width = 300
  let height = 120
  let background = RGB(red: 23, green: 23, blue: 28)
  let foreground = RGB(red: 195, green: 195, blue: 198)
  var rgba = [UInt8](repeating: 255, count: width * height * 4)

  for y in 0..<height {
    for x in 0..<width {
      let offset = (y * width + x) * 4
      rgba[offset] = background.red
      rgba[offset + 1] = background.green
      rgba[offset + 2] = background.blue
    }
  }

  func fillInk(xRange: Range<Int>, yRange: Range<Int>) {
    for y in yRange {
      for x in xRange where (x / 7) % 3 != 2 {
        let offset = (y * width + x) * 4
        rgba[offset] = foreground.red
        rgba[offset + 1] = foreground.green
        rgba[offset + 2] = foreground.blue
      }
    }
  }

  fillInk(xRange: 12..<285, yRange: 18..<40)
  if includeFinalLine {
    fillInk(xRange: 12..<115, yRange: 78..<100)
  }
  return try Raster(width: width, height: height, rgba: rgba)
}

private func runSelfTest() throws {
  let valid = try syntheticRaster(includeFinalLine: true)
  let validMetrics = try validateWrappedText(in: valid, label: "synthetic-good")
  print(
    "PASS synthetic-good: upperInk=\(validMetrics.upperInkPixels) "
      + "lowerInk=\(validMetrics.lowerInkPixels)"
  )

  let blankFinalLine = try syntheticRaster(includeFinalLine: false)
  do {
    try validateWrappedText(in: blankFinalLine, label: "synthetic-blank-final-line")
    throw ValidationError("self-test failed: blank final-line fixture unexpectedly passed")
  } catch let error as ValidationError {
    if error.description.hasPrefix("self-test failed:") {
      throw error
    }
    print("PASS synthetic-blank-final-line rejected: \(error.description)")
  }
}

private func printUsage() {
  fputs(
    "Usage: assert-ios-wrapped-text.swift <cropped-screenshot.png>\n"
      + "       assert-ios-wrapped-text.swift --self-test\n",
    stderr
  )
}

do {
  let arguments = Array(CommandLine.arguments.dropFirst())
  if arguments == ["--self-test"] {
    try runSelfTest()
  } else if arguments.count == 1 {
    let screenshotPath = arguments[0]
    let raster = try loadPNG(at: screenshotPath)
    let metrics = try validateWrappedText(in: raster, label: screenshotPath)
    print(
      "PASS iOS wrapped text ink: size=\(raster.width)x\(raster.height) "
        + "background=\(metrics.background) upperInk=\(metrics.upperInkPixels) "
        + "lowerInk=\(metrics.lowerInkPixels) "
        + "balance=\(String(format: "%.4f", metrics.edgeBalance))"
    )
  } else {
    printUsage()
    exit(2)
  }
} catch {
  fputs("FAIL iOS wrapped text ink: \(error)\n", stderr)
  exit(1)
}
