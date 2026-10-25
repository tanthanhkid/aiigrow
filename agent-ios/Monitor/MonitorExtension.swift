// Extension DeviceActivityMonitor: iOS gọi khi lịch bắt đầu / kết thúc hoặc chạm ngưỡng phút — kể cả khi app Con không chạy.
// Mỗi lần: ghi phút đã dùng (nếu là sự kiện) rồi SUY LẠI khiên từ kế hoạch đã lưu (ApLai.lucNay). Không gọi mạng.
import DeviceActivity
import Foundation
import ConCore

final class MonitorExtension: DeviceActivityMonitor {
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    ApLai.lucNay()
  }

  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    // Lịch «thêm giờ» kết thúc đúng hạn: kế hoạch còn moDen cũ nhưng TinhKhien so moDen với giờ hiện tại ⇒ khiên tự bật lại.
    ApLai.lucNay()
  }

  override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
    super.eventDidReachThreshold(event, activity: activity)
    // «nhac5» = trần phút − 5: chỉ nhắc, không đổi khiên (đang mở bằng mã / phiên điểm / thêm giờ thì phút trần không phải giới hạn ⇒ bỏ)
    if event.rawValue == "nhac5" {
      if let k = KhoUserDefaults().doc(KhienMuonCo.self, Khoa.khienDangAp), k.lyDo == .khong, !k.dangThemGio, k.dangChoiDiem != true, k.dangMoOffline != true {
        ThongBao.nhacSapHet("tran")
      }
      return
    }
    ApLai.ghiSuKien(event.rawValue)
    ApLai.lucNay()
  }

  // Lịch không lặp có warningTime (thêm giờ, phiên điểm, mở bằng mã): iOS gọi trước khi lịch kết thúc ⇒ nhắc «còn 5 phút».
  override func intervalWillEndWarning(for activity: DeviceActivityName) {
    super.intervalWillEndWarning(for: activity)
    ThongBao.nhacSapHet(activity.rawValue)
  }
}
