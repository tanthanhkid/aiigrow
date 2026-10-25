// Client Unix socket tới daemon: một dòng JSON hỏi, một dòng JSON trả (xem IPC.swift).
import Foundation
import AiiGrowCore

enum IPCLoi: Error { case khongNoiDuoc, ghiLoi, docLoi, giaiMaLoi }

enum IPCClient {
  /// Chặn luồng gọi — gọi từ luồng nền. Mất kết nối ⇒ ném lỗi (tray hiện «đang khởi động lại»).
  static func gui(_ yc: YeuCauTray, giayChoToiDa: Int = 3, duongDan: String = DuongDan.socket) throws -> TraLoi {
    let fd = socket(AF_UNIX, SOCK_STREAM, 0)
    guard fd >= 0 else { throw IPCLoi.khongNoiDuoc }
    defer { close(fd) }
    var mot: Int32 = 1
    setsockopt(fd, SOL_SOCKET, SO_NOSIGPIPE, &mot, socklen_t(MemoryLayout<Int32>.size))
    var tv = timeval(tv_sec: giayChoToiDa, tv_usec: 0)
    setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &tv, socklen_t(MemoryLayout<timeval>.size))
    setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &tv, socklen_t(MemoryLayout<timeval>.size))

    var addr = sockaddr_un()
    addr.sun_family = sa_family_t(AF_UNIX)
    let toiDa = MemoryLayout.size(ofValue: addr.sun_path)
    guard duongDan.utf8.count < toiDa else { throw IPCLoi.khongNoiDuoc }
    withUnsafeMutablePointer(to: &addr.sun_path) { p in
      p.withMemoryRebound(to: CChar.self, capacity: toiDa) { c in _ = duongDan.withCString { strncpy(c, $0, toiDa - 1) } }
    }
    let kq = withUnsafePointer(to: &addr) { p in
      p.withMemoryRebound(to: sockaddr.self, capacity: 1) { connect(fd, $0, socklen_t(MemoryLayout<sockaddr_un>.size)) }
    }
    guard kq == 0 else { throw IPCLoi.khongNoiDuoc }

    var du = try IPCMa.encoder.encode(yc)
    du.append(0x0A)
    var daGhi = 0
    try du.withUnsafeBytes { b in
      while daGhi < du.count {
        let n = write(fd, b.baseAddress! + daGhi, du.count - daGhi)
        if n <= 0 { throw IPCLoi.ghiLoi }
        daGhi += n
      }
    }
    var nhan = Data()
    var buf = [UInt8](repeating: 0, count: 8192)
    while nhan.count < 1_000_000 {
      let n = read(fd, &buf, buf.count)
      if n < 0 { throw IPCLoi.docLoi }
      if n == 0 { break }
      nhan.append(buf, count: n)
      if nhan.contains(0x0A) { break }
    }
    if let i = nhan.firstIndex(of: 0x0A) { nhan = nhan.prefix(upTo: i) }
    guard !nhan.isEmpty else { throw IPCLoi.docLoi }
    do { return try IPCMa.decoder.decode(TraLoi.self, from: nhan) } catch { throw IPCLoi.giaiMaLoi }
  }

  /// Bản async: chạy trên luồng nền.
  /// `giay`: lệnh đi máy chủ (app Con, chơi bằng điểm) chờ tới 25 giây; lệnh cục bộ 3 giây.
  static func guiAsync(_ yc: YeuCauTray, giay: Int = 3) async throws -> TraLoi {
    try await Task.detached(priority: .userInitiated) { try gui(yc, giayChoToiDa: giay) }.value
  }
}
