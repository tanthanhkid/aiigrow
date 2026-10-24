import AppKit

MainActor.assumeIsolated {
  let app = NSApplication.shared
  let delegate = TrayApp()
  app.delegate = delegate
  app.setActivationPolicy(.accessory)   // LSUIElement: không có biểu tượng Dock
  app.run()
}
