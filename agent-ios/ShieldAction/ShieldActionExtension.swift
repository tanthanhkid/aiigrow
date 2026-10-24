// Nút trên màn chặn. iOS không cho extension mở app Con trực tiếp ⇒ «Xin thêm giờ»: ghi dấu vào app group + gửi thông báo cục bộ
// «Chạm để xin thêm giờ» — Con chạm ⇒ app mở thẳng màn Xin thêm giờ.
import ManagedSettings
import UserNotifications
import Foundation
import ConCore

final class ShieldActionExtension: ShieldActionDelegate {
  func xu(_ action: ShieldAction, _ xong: @escaping (ShieldActionResponse) -> Void) {
    let k = KhoUserDefaults().doc(KhienMuonCo.self, Khoa.khienDangAp)
    let coXin = k.map { $0.lyDo != .ngu && $0.lyDo != .khoaNgay } ?? true
    guard action == .primaryButtonPressed, coXin else { xong(.close); return }
    KhoUserDefaults().luu(Date(), Khoa.xinTuManChan)
    let n = UNMutableNotificationContent()
    n.title = "Xin Ba Mẹ thêm giờ"
    n.body = "Chạm vào đây để chọn số phút và gửi lời nhắn cho Ba Mẹ."
    n.userInfo = ["mo": "xin-them-gio"]
    UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "xin-them-gio", content: n, trigger: nil)) { _ in xong(.close) }
  }

  override func handle(action: ShieldAction, for application: ApplicationToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
    xu(action, completionHandler)
  }
  override func handle(action: ShieldAction, for webDomain: WebDomainToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
    xu(action, completionHandler)
  }
  override func handle(action: ShieldAction, for category: ActivityCategoryToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
    xu(action, completionHandler)
  }
}
