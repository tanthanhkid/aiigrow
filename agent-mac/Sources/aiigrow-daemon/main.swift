// aiigrow-daemon — LaunchDaemon chạy dưới root. Vòng lặp 5 giây: đồng bộ máy chủ theo nextCheckSec, áp chính sách; phục vụ socket IPC cho tray.
// Ba Task độc lập: đồng bộ, áp, tự cập nhật (THIET-KE.md mục «Tự cập nhật»).
// Cờ:
//   --thu            : chạy THỬ — không tác động hệ thống thật, chỉ in việc sẽ làm (HeThongThu). Mặc định cho phát triển trên máy Thanh.
//   --cau-hinh <đ>   : đổi đường cấu hình (test / chạy thử).
//   --socket <đ>     : đổi đường socket.
//   --may-chu <url>  : đổi địa chỉ máy chủ (chỉ khi chưa ghép).
//   --mot-vong       : chạy đúng một vòng rồi thoát (kiểm tay).
import AiiGrowCore
import Foundation

func thamSo(_ ten: String) -> String? {
  let a = CommandLine.arguments
  guard let i = a.firstIndex(of: ten), i + 1 < a.count else { return nil }
  return a[i + 1]
}
let coCo = { (t: String) in CommandLine.arguments.contains(t) }

let laThu = coCo("--thu")
let duongCauHinh = thamSo("--cau-hinh") ?? DuongDan.cauHinh
let duongSocket = thamSo("--socket") ?? DuongDan.socket
let mayChu = thamSo("--may-chu") ?? ApiClient.mayChuMacDinh
let motVong = coCo("--mot-vong")

let heThat = HeThongMac()
let heThong: HeThong = laThu ? HeThongThu(heThat) : heThat
let kho = ConfigStore(duongDan: duongCauHinh)
let token = kho.doc()?.token
let api = ApiClient(mayChu: kho.doc()?.mayChu ?? mayChu, token: token)
let boMay = BoMay(api: api, heThong: heThong, kho: kho, tuyChon: TuyChonBoMay(tuCapNhat: !laThu), nguonApp: QuetAppMac(),
                   boDemLog: heThat.boDemLog, docLichSuWeb: !laThu)   // log + sự kiện + lịch sử web lên máy chủ mỗi 5 phút     // danh sách app thật: /Applications + ~/Applications của Con

heThong.ghiLog("aiigrow-daemon \(PhienBan.hienTai) khởi động\(laThu ? " [THỬ]" : "") — cấu hình \(duongCauHinh), socket \(duongSocket)")

let socket = SocketIPC(duongDan: duongSocket, ghiLog: heThong.ghiLog) { yc, uid in
  await boMay.xuLyIPC(yc, uidGoi: uid)
}

if motVong {
  Task {
    _ = await boMay.motVong()
    heThong.ghiLog("Chạy một vòng xong.")
    exit(0)
  }
  RunLoop.main.run()
} else {
  do { try socket.mo() } catch { heThong.ghiLog("Mở socket lỗi: \(error) — tiếp tục không có IPC.") }
  Task { await socket.phucVu() }
  // Hai vòng ĐỘC LẬP: đồng bộ mạng treo không được làm ngưng việc áp chính sách (đóng app, khoá, hosts).
  Task {
    while true {
      await boMay.vongDongBo()
      try? await Task.sleep(nanoseconds: 1 * 1_000_000_000)
    }
  }
  // Log + sự kiện + lịch sử web (5 phút một lần, tự kiểm hạn) — Task riêng.
  Task {
    while true {
      await boMay.vongNhatKy()
      try? await Task.sleep(nanoseconds: 60 * 1_000_000_000)
    }
  }
  // Nhịp phiên chơi bằng điểm (phien/nhip, 30 giây khi Policy có playSessionId): Task riêng — mạng treo không chặn đồng bộ / áp.
  Task {
    while true {
      await boMay.vongNhipChoi()
      try? await Task.sleep(nanoseconds: 5 * 1_000_000_000)
    }
  }
  Task {
    while true {
      _ = await boMay.vongAp()
      try? await Task.sleep(nanoseconds: 5 * 1_000_000_000)
    }
  }
  // Tự cập nhật: Task riêng (không chặn vòng áp/đồng bộ); lịch ở LichCapNhat (+90 giây, rồi mỗi 6 giờ); cờ chống chạy chồng nằm trong BoCapNhat.
  // Chế độ --thu: tuyChon.tuCapNhat = false ⇒ kiemCapNhatDinhKy tự bỏ qua (một quy tắc duy nhất).
  Task {
    // Ngủ theo đồng hồ treo tường, từng bước 60 giây: Task.sleep đếm thời gian MÁY THỨC, MacBook ngủ nhiều thì «6 giờ» thành vài ngày.
    // Đồng hồ treo tường bị chỉnh LÙI thì vẫn thoát theo thời gian máy thức (không ngủ thêm bằng đúng khoảng lùi).
    await LichCapNhat.chay(ngu: { giay in
      let den = Date().addingTimeInterval(giay)
      let denThuc = DispatchTime.now().uptimeNanoseconds &+ UInt64(giay * 1_000_000_000)
      while Date() < den && DispatchTime.now().uptimeNanoseconds < denThuc {
        try? await Task.sleep(nanoseconds: UInt64(min(60, max(1, den.timeIntervalSinceNow)) * 1_000_000_000))
        if Task.isCancelled { return false }
      }
      return true
    }, viec: { await boMay.kiemCapNhatDinhKy() })
  }
  RunLoop.main.run()
}
