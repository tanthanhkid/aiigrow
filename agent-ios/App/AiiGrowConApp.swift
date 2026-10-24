// App «AiiGrow Con» cho iPhone / iPad. Đồng bộ khi mở app + BGAppRefreshTask (iOS quyết lúc chạy, thường vài chục phút – vài giờ).
import SwiftUI
import UIKit
import BackgroundTasks
import UserNotifications
import ConCore

/// Ngọc lục bảo — điểm nhấn của bảng màu Clay (docs/THIET-KE-CLAY.md).
let mauChinh = Clay.chinh

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
  static let tacVuNhip = "vn.aiilab.aiigrow.con.nhip"

  func application(_ app: UIApplication, didFinishLaunchingWithOptions o: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
    BGTaskScheduler.shared.register(forTaskWithIdentifier: Self.tacVuNhip, using: nil) { t in
      guard let t = t as? BGAppRefreshTask else { return }
      Self.lenLich()
      let viec = Task { @MainActor in
        let m = MoHinhApp()
        await m.dongBoNgay()
        t.setTaskCompleted(success: m.loi == nil)
      }
      t.expirationHandler = { viec.cancel() }
    }
    UNUserNotificationCenter.current().delegate = self
    Self.lenLich()
    return true
  }

  static func lenLich() {
    let r = BGAppRefreshTaskRequest(identifier: tacVuNhip)
    r.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
    try? BGTaskScheduler.shared.submit(r)
  }

  // Thông báo «Xin thêm giờ» từ màn chặn ⇒ mở app ở màn xin thêm giờ.
  func userNotificationCenter(_ c: UNUserNotificationCenter, didReceive r: UNNotificationResponse, withCompletionHandler xong: @escaping () -> Void) {
    if r.notification.request.content.userInfo["mo"] as? String == "xin-them-gio" {
      UIApplication.shared.open(URL(string: "\(LienKet.scheme)://xin-them-gio")!)
    }
    xong()
  }
}

@main
struct AiiGrowConApp: App {
  @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
  @StateObject var m = MoHinhApp()
  @Environment(\.scenePhase) var pha

  var body: some Scene {
    WindowGroup {
      ManGoc()
        .environmentObject(m)
        .tint(mauChinh)
        .preferredColorScheme(.light)   // Clay gương chỉ có bảng sáng
        .onOpenURL { m.moLienKet($0) }
        .onChange(of: pha) { p in
          if p == .active { Task { await m.dongBoNgay() } }
          if p == .background { AppDelegate.lenLich() }
        }
    }
  }
}
