// Thông báo cục bộ «còn 5 phút» (như khay Windows TrayContext / Mac NhacGio). Gửi từ extension DeviceActivityMonitor khi chạm sự kiện
// «nhac5» (trần phút − 5) hoặc khi lịch thêm giờ / phiên điểm / mở bằng mã sắp hết (warningTime). App xin quyền thông báo sau khi ghép.
import Foundation
import UserNotifications

public enum ThongBao {
  public static func xinQuyen() {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound]) { _, _ in }
  }

  /// `loai`: «tran» (giờ giải trí hôm nay), «themgio», «phiendiem», «mooffline».
  public static func nhacSapHet(_ loai: String, phut: Int = 5) {
    let n = UNMutableNotificationContent()
    switch loai {
    case "phiendiem":
      n.title = "Còn \(phut) phút chơi"
      n.body = "Lưu trò chơi dần nhé. Hết phiên, app giải trí sẽ tạm khoá lại."
    case "themgio":
      n.title = "Còn \(phut) phút Ba Mẹ mở"
      n.body = "Con chuẩn bị dừng nhé."
    case "mooffline":
      n.title = "Còn \(phut) phút mở bằng mã của Ba Mẹ"
      n.body = "Con chuẩn bị dừng nhé."
    default:
      // 15/11 (cdt-nhac-5-phut): 1 sao = 1 phút
      n.title = "Còn \(phut) sao = \(phut) phút chơi"
      n.body = "Lưu bài đang chơi nhé. Hết sao là dừng — làm nhiệm vụ kiếm sao hoặc xin Ba Mẹ cho vay sao."
    }
    n.sound = .default
    n.userInfo = ["mo": "chinh"]
    UNUserNotificationCenter.current().add(UNNotificationRequest(identifier: "nhac.\(loai)", content: n, trigger: nil)) { _ in }
  }
}
