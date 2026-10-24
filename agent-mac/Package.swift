// swift-tools-version:5.10
// AiiGrow cho macOS — tác tử máy Con. Thiết kế: THIET-KE.md.
import PackageDescription

let package = Package(
  name: "AiiGrowMac",
  platforms: [.macOS(.v13)],
  products: [
    .executable(name: "aiigrow-daemon", targets: ["aiigrow-daemon"]),
    .executable(name: "AiiGrowTray", targets: ["AiiGrowTray"]),
  ],
  targets: [
    .target(name: "AiiGrowCore"),
    .executableTarget(name: "aiigrow-daemon", dependencies: ["AiiGrowCore"]),
    .executableTarget(name: "AiiGrowTray", dependencies: ["AiiGrowCore"]),
    .testTarget(name: "AiiGrowCoreTests", dependencies: ["AiiGrowCore"]),
    .testTarget(name: "AiiGrowTrayTests", dependencies: ["AiiGrowTray", "AiiGrowCore"]),
  ]
)
