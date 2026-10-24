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
    ApLai.ghiSuKien(event.rawValue)
    ApLai.lucNay()
  }
}
