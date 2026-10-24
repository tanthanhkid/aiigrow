// Máy chủ HTTP giả cho test tích hợp: URLProtocol chặn mọi lời gọi của ApiClient, trả JSON đúng dạng server thật
// (server/app/api/device/**, server/lib/agent-windows.ts + api-may.ts). Có thể bật lỗi mạng để kiểm chạy offline.
import Foundation
@testable import AiiGrowCore

final class HttpMock: URLProtocol {
  struct TraLoi { var ma: Int; var than: Data }
  /// path (không gồm host) + body JSON ⇒ trả lời. Trả nil ⇒ giả lỗi mạng (không tới được máy chủ).
  nonisolated(unsafe) static var xuLy: ((_ path: String, _ body: [String: Any]) -> TraLoi?)?
  /// Ghi lại mọi lời gọi tới.
  nonisolated(unsafe) static var daGoi: [(path: String, body: [String: Any])] = []
  /// Header Authorization của từng lời gọi (cùng thứ tự với daGoi).
  nonisolated(unsafe) static var daGoiAuth: [(path: String, auth: String?)] = []
  nonisolated(unsafe) static let khoa = NSLock()
  static func authCuoi(_ path: String) -> String?? {
    khoa.lock(); defer { khoa.unlock() }
    return daGoiAuth.last(where: { $0.path == path })?.auth
  }

  static func session() -> URLSession {
    let c = URLSessionConfiguration.ephemeral
    c.protocolClasses = [HttpMock.self]
    return URLSession(configuration: c)
  }
  static func dat(_ f: @escaping (_ path: String, _ body: [String: Any]) -> TraLoi?) {
    khoa.lock(); daGoi = []; daGoiAuth = []; xuLy = f; khoa.unlock()
  }
  static func json(_ ma: Int, _ o: [String: Any]) -> TraLoi { TraLoi(ma: ma, than: try! JSONSerialization.data(withJSONObject: o)) }
  /// Lời gọi cuối tới `path` (khoá trong hàm đồng bộ — gọi được từ async).
  static func lanGoiCuoi(_ path: String) -> [String: Any]? {
    khoa.lock(); defer { khoa.unlock() }
    return daGoi.last(where: { $0.path == path })?.body
  }

  override class func canInit(with request: URLRequest) -> Bool { true }
  override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
  override func stopLoading() {}

  override func startLoading() {
    let path = request.url?.path.trimmingCharacters(in: CharacterSet(charactersIn: "/")) ?? ""
    var body: [String: Any] = [:]
    if let d = request.bodyData, let o = try? JSONSerialization.jsonObject(with: d) as? [String: Any] { body = o }
    HttpMock.khoa.lock()
    HttpMock.daGoi.append((path, body))
    HttpMock.daGoiAuth.append((path, request.value(forHTTPHeaderField: "Authorization")))
    let kq = HttpMock.xuLy?(path, body)
    HttpMock.khoa.unlock()
    guard let kq else {
      client?.urlProtocol(self, didFailWithError: URLError(.notConnectedToInternet))
      return
    }
    let resp = HTTPURLResponse(url: request.url!, statusCode: kq.ma, httpVersion: "HTTP/1.1", headerFields: ["Content-Type": "application/json"])!
    client?.urlProtocol(self, didReceive: resp, cacheStoragePolicy: .notAllowed)
    client?.urlProtocol(self, didLoad: kq.than)
    client?.urlProtocolDidFinishLoading(self)
  }
}

private extension URLRequest {
  /// httpBody không có khi body là stream (JSONSerialization.data ⇒ có httpBody). Phòng hờ đọc cả stream.
  var bodyData: Data? {
    if let b = httpBody { return b }
    guard let s = httpBodyStream else { return nil }
    s.open(); defer { s.close() }
    var d = Data(); var buf = [UInt8](repeating: 0, count: 4096)
    while s.hasBytesAvailable { let n = s.read(&buf, maxLength: buf.count); if n <= 0 { break }; d.append(buf, count: n) }
    return d
  }
}

/// Client socket nhỏ cho test — gửi một YeuCauTray, nhận một TraLoi (giống Tray/IPCClient).
enum SocketTest {
  static func gui(_ yc: YeuCauTray, duongDan: String) throws -> TraLoi {
    let fd = socket(AF_UNIX, SOCK_STREAM, 0)
    defer { close(fd) }
    var addr = sockaddr_un()
    addr.sun_family = sa_family_t(AF_UNIX)
    let toiDa = MemoryLayout.size(ofValue: addr.sun_path)
    withUnsafeMutablePointer(to: &addr.sun_path) { p in
      p.withMemoryRebound(to: CChar.self, capacity: toiDa) { c in _ = duongDan.withCString { strncpy(c, $0, toiDa - 1) } }
    }
    let kq = withUnsafePointer(to: &addr) { p in p.withMemoryRebound(to: sockaddr.self, capacity: 1) { connect(fd, $0, socklen_t(MemoryLayout<sockaddr_un>.size)) } }
    guard kq == 0 else { throw LoiApi(chu: "không nối được socket") }
    var du = try IPCMa.encoder.encode(yc); du.append(0x0A)
    _ = du.withUnsafeBytes { write(fd, $0.baseAddress, du.count) }
    var nhan = Data(); var buf = [UInt8](repeating: 0, count: 8192)
    while nhan.count < 1_000_000 { let n = read(fd, &buf, buf.count); if n <= 0 { break }; nhan.append(buf, count: n); if nhan.contains(0x0A) { break } }
    if let i = nhan.firstIndex(of: 0x0A) { nhan = nhan.prefix(upTo: i) }
    return try IPCMa.decoder.decode(TraLoi.self, from: nhan)
  }
}
