// Cài hồ sơ DNS gia đình (.mobileconfig) trên iPhone/iPad: iOS chỉ nhận hồ sơ tải từ Safari (app không tự cài được, cũng không mở
// được tệp cục bộ sang Cài đặt). Cách các app cấu hình VPN/DNS hay dùng: app phục vụ tệp ở một cổng 127.0.0.1 trong chốc lát rồi mở Safari
// tới đó ⇒ iOS báo «Đã tải về hồ sơ» ⇒ Ba Mẹ vào Cài đặt › Đã tải về hồ sơ › Cài đặt. Chỉ nghe trên máy (loopback), tự tắt sau 3 phút.
import Foundation
import Network
import UIKit

final class MayChuHoSo {
  static let shared = MayChuHoSo()
  private var nghe: NWListener?
  private var tatHen: DispatchWorkItem?
  private var nen: UIBackgroundTaskIdentifier = .invalid

  /// Phục vụ `noiDung` một lần ở http://127.0.0.1:<cổng>/<tep> ⇒ URL để mở bằng Safari.
  func phucVu(_ noiDung: String, tep: String) async throws -> URL {
    dung()
    let tham = NWParameters.tcp
    tham.requiredLocalEndpoint = NWEndpoint.hostPort(host: .ipv4(.loopback), port: .any)
    let l = try NWListener(using: tham)
    let duLieu = Data(noiDung.utf8)
    let ten = tep.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? "AiiGrow-DNS.mobileconfig"
    l.newConnectionHandler = { c in
      c.start(queue: .global())
      c.receive(minimumIncompleteLength: 1, maximumLength: 16_384) { _, _, _, _ in
        var dau = "HTTP/1.1 200 OK\r\nContent-Type: application/x-apple-aspen-config\r\n"
        dau += "Content-Disposition: attachment; filename=\"\(ten)\"\r\nContent-Length: \(duLieu.count)\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n"
        c.send(content: Data(dau.utf8) + duLieu, completion: .contentProcessed { _ in c.cancel() })
      }
    }
    let cong: UInt16 = try await withCheckedThrowingContinuation { (k: CheckedContinuation<UInt16, Error>) in
      var xong = false
      l.stateUpdateHandler = { st in
        guard !xong else { return }
        switch st {
        case .ready: xong = true; k.resume(returning: l.port?.rawValue ?? 0)
        case .failed(let e): xong = true; k.resume(throwing: e)
        default: break
        }
      }
      l.start(queue: .global())
    }
    nghe = l
    // Safari mở ⇒ app xuống nền: xin thêm ít thời gian chạy nền để kịp trả tệp
    nen = await UIApplication.shared.beginBackgroundTask { [weak self] in self?.dung() }
    let hen = DispatchWorkItem { [weak self] in self?.dung() }
    tatHen = hen
    DispatchQueue.main.asyncAfter(deadline: .now() + 180, execute: hen)
    return URL(string: "http://127.0.0.1:\(cong)/\(ten)")!
  }

  func dung() {
    nghe?.cancel(); nghe = nil
    tatHen?.cancel(); tatHen = nil
    if nen != .invalid {
      let n = nen
      nen = .invalid
      DispatchQueue.main.async { UIApplication.shared.endBackgroundTask(n) }
    }
  }
}
