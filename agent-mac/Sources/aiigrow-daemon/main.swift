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
let boMay = BoMay(api: api, heThong: heThong, kho: kho)

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
  // Tự cập nhật: Task riêng (không chặn vòng áp/đồng bộ), trễ 90 giây sau khi khởi động rồi mỗi 6 giờ; cờ chống chạy chồng nằm trong BoCapNhat.
  if laThu { heThong.ghiLog("[thử] bỏ qua vòng tự cập nhật.") } else {
    Task {
      try? await Task.sleep(nanoseconds: 90 * 1_000_000_000)
      while true {
        await boMay.kiemCapNhatDinhKy()
        try? await Task.sleep(nanoseconds: 6 * 3600 * 1_000_000_000)
      }
    }
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
  Task {
    while true {
      _ = await boMay.vongAp()
      try? await Task.sleep(nanoseconds: 5 * 1_000_000_000)
    }
  }
  RunLoop.main.run()
}
