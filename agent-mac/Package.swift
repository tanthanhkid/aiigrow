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
    // Mascot/: Rob của app Con (ảnh agent-win Assets/mascot). Fluent/: icon Fluent Emoji 3D (MIT, microsoft/fluentui-emoji) — gói phát hành chép vào AiiGrow.app/Contents/Resources/Fluent (goi/build-pkg.sh).
    .executableTarget(name: "AiiGrowTray", dependencies: ["AiiGrowCore"], resources: [.copy("Fluent"), .copy("Mascot")]),
    .testTarget(name: "AiiGrowCoreTests", dependencies: ["AiiGrowCore"]),
    .testTarget(name: "AiiGrowTrayTests", dependencies: ["AiiGrowTray", "AiiGrowCore"]),
  ]
)
