// Nút trên màn chặn. iOS không cho extension mở app Con trực tiếp ⇒ ghi dấu vào app group + gửi thông báo cục bộ — Con chạm ⇒ app mở
// thẳng màn «Xin Ba Mẹ cho vay sao» (hết sao) / «Xin Ba Mẹ mở app» (ngoài danh sách).
import ManagedSettings
import FamilyControls
import UserNotifications
import Foundation
import ConCore

final class ShieldActionExtension: ShieldActionDelegate {
  /// `trongDs`: app / trang thuộc nhóm «Tính phút» (nil = không biết, vd danh mục).
  func xu(_ action: ShieldAction, trongDs: Bool? = nil, _ xong: @escaping (ShieldActionResponse) -> Void) {
    var k = KhoUserDefaults().doc(KhienMuonCo.self, Khoa.khienDangAp)
    guard action == .primaryButtonPressed else { xong(.close); return }
    // Theo danh sách + hết sao: app NGOÀI danh sách ⇒ «Xin Ba Mẹ mở» (không phải xin vay)
    if k?.lyDo == .hetGio, k?.danhSach == true, trongDs == false { k?.lyDo = .khong }
    KhoUserDefaults().luu(Date(), Khoa.xinTuManChan)
    KhoUserDefaults().luu(k?.lyDo == .khong ? "cai" : k?.lyDo == .hetGio ? "vay" : nil, Khoa.xinTuManChanLoai)
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

  static func tinhPhut() -> FamilyActivitySelection? {
    guard let d = KhoUserDefaults().data(Khoa.chonGiaiTri) else { return nil }
    return try? JSONDecoder().decode(FamilyActivitySelection.self, from: d)
  }

  override func handle(action: ShieldAction, for application: ApplicationToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
    xu(action, trongDs: Self.tinhPhut()?.applicationTokens.contains(application) ?? false, completionHandler)
  }
  override func handle(action: ShieldAction, for webDomain: WebDomainToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
    xu(action, trongDs: Self.tinhPhut()?.webDomainTokens.contains(webDomain) ?? false, completionHandler)
  }
  override func handle(action: ShieldAction, for category: ActivityCategoryToken, completionHandler: @escaping (ShieldActionResponse) -> Void) {
    xu(action, completionHandler)
  }
}
