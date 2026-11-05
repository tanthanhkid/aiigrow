// Nút trên màn chặn. iOS không cho extension mở app Con trực tiếp ⇒ «Xin thêm giờ»: ghi dấu vào app group + gửi thông báo cục bộ
// «Chạm để xin thêm giờ» — Con chạm ⇒ app mở thẳng màn Xin thêm giờ.
import ManagedSettings
import UserNotifications
import Foundation
import ConCore

final class ShieldActionExtension: ShieldActionDelegate {
  func xu(_ action: ShieldAction, _ xong: @escaping (ShieldActionResponse) -> Void) {
    let k = KhoUserDefaults().doc(KhienMuonCo.self, Khoa.khienDangAp)
    let coXin = k.map { $0.lyDo != .gioHoc } ?? true
    guard action == .primaryButtonPressed, coXin else { xong(.close); return }
    KhoUserDefaults().luu(Date(), Khoa.xinTuManChan)
    let n = UNMutableNotificationContent()
    let ngoaiLe = k?.lyDo.chiNgoaiLe == true
    n.title = ngoaiLe ? "Xin Ba Mẹ mở ngoại lệ" : "Thêm giờ chơi"
    n.body = ngoaiLe ? "Chạm vào đây để chọn bao lâu và nhắn Ba Mẹ." : "Chạm vào đây để dùng sao hoặc xin Ba Mẹ thêm giờ."
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
