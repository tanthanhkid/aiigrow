// Nút trên màn chặn. iOS không cho extension mở app Con trực tiếp ⇒ ghi dấu vào app group + gửi thông báo cục bộ — Con chạm ⇒ app mở
// thẳng màn «Xin Ba Mẹ cho vay sao» (hết sao) / «Xin Ba Mẹ mở app» (ngoài danh sách).
import ManagedSettings
import UserNotifications
import Foundation
import ConCore

final class ShieldActionExtension: ShieldActionDelegate {
  func xu(_ action: ShieldAction, _ xong: @escaping (ShieldActionResponse) -> Void) {
    let k = KhoUserDefaults().doc(KhienMuonCo.self, Khoa.khienDangAp)
    guard action == .primaryButtonPressed else { xong(.close); return }
    KhoUserDefaults().luu(Date(), Khoa.xinTuManChan)
    let n = UNMutableNotificationContent()
    if k?.lyDo == .chuaVao {
      n.title = "Máy đang khoá"; n.body = "Chạm vào đây để mở AiiGrow Con, chạm tên con rồi nhập PIN."
    } else if k?.lyDo == .khong {
      n.title = "Xin Ba Mẹ mở app"; n.body = "Chạm vào đây để gõ tên app và nhắn Ba Mẹ thêm vào danh sách."
    } else if k?.lyDo == .hetGio {
      n.title = "Xin Ba Mẹ cho vay sao"; n.body = "Chạm vào đây để chọn số sao và nhắn Ba Mẹ."
    } else {
      n.title = "Mở AiiGrow Con"; n.body = k?.lyDo.cauChoCon ?? "Chạm vào đây để mở AiiGrow Con."
    }
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
