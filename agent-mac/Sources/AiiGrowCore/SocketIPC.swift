// Máy chủ Unix socket của daemon (DuongDan.socket): mỗi kết nối MỘT dòng JSON yêu cầu ⇒ MỘT dòng JSON trả lời rồi đóng.
// Kiểm người gọi bằng getpeereid — uid thật của tiến trình bên kia, không giả được (THIET-KE.md mục 3).
import Foundation

public final class SocketIPC: @unchecked Sendable {
  private let duongDan: String
  private var fdNghe: Int32 = -1
  private let xuLy: (YeuCauTray, UInt32, Int32) async -> TraLoi
  /// Số kết nối xử lý đồng thời tối đa — vượt thì đóng ngay (một client treo không giữ cả hàng đợi).
  public static let toiDaDongThoi = 16
  private let dem = NSLock()
  private var dangXuLy = 0
  private let ghiLog: (String) -> Void
  private var chay = false

  public init(duongDan: String = DuongDan.socket, ghiLog: @escaping (String) -> Void = { _ in },
              xuLy: @escaping (YeuCauTray, UInt32, Int32) async -> TraLoi) {
    self.duongDan = duongDan; self.xuLy = xuLy; self.ghiLog = ghiLog
  }

  /// Mở socket (quyền 0666 — mọi uid gọi được, lệnh lọc theo uid ở từng yêu cầu). Ném lỗi nếu không bind được.
  public func mo() throws {
    signal(SIGPIPE, SIG_IGN)      // client đóng giữa chừng ⇒ write trả EPIPE, không giết daemon
    unlink(duongDan)
    let fd = socket(AF_UNIX, SOCK_STREAM, 0)
    guard fd >= 0 else { throw LoiApi(chu: "Không mở được socket") }
    var addr = sockaddr_un()
    addr.sun_family = sa_family_t(AF_UNIX)
    let toiDa = MemoryLayout.size(ofValue: addr.sun_path)
    guard duongDan.utf8.count < toiDa else { close(fd); throw LoiApi(chu: "Đường socket quá dài") }
    withUnsafeMutablePointer(to: &addr.sun_path) { p in
      p.withMemoryRebound(to: CChar.self, capacity: toiDa) { c in _ = duongDan.withCString { strncpy(c, $0, toiDa - 1) } }
    }
    let kq = withUnsafePointer(to: &addr) { p in
      p.withMemoryRebound(to: sockaddr.self, capacity: 1) { bind(fd, $0, socklen_t(MemoryLayout<sockaddr_un>.size)) }
    }
    guard kq == 0 else { close(fd); throw LoiApi(chu: "Không bind được socket \(duongDan): \(String(cString: strerror(errno)))") }
    chmod(duongDan, 0o666)
    guard listen(fd, 16) == 0 else { close(fd); throw LoiApi(chu: "Không listen được socket") }
    fdNghe = fd
    chay = true
  }

  /// Vòng accept — gọi trong Task nền. Mỗi kết nối một Task riêng (tối đa `toiDaDongThoi`, vượt thì đóng ngay); timeout đọc 3 giây.
  public func phucVu() async {
    while chay {
      let fd = accept(fdNghe, nil, nil)
      if fd < 0 { if errno == EINTR { continue }; break }
      guard giuCho() else { ghiLog("Quá \(SocketIPC.toiDaDongThoi) kết nối đồng thời — đóng bớt."); close(fd); continue }
      Task.detached { [self] in
        await tiepNhan(fd)
        traCho()
      }
    }
  }

  private func giuCho() -> Bool {
    dem.lock(); defer { dem.unlock() }
    guard dangXuLy < SocketIPC.toiDaDongThoi else { return false }
    dangXuLy += 1
    return true
  }
  private func traCho() { dem.lock(); dangXuLy -= 1; dem.unlock() }

  /// pid tiến trình bên kia (LOCAL_PEERPID) — 0 nếu không lấy được.
  static func pidDauKia(_ fd: Int32) -> Int32 {
    var pid: Int32 = 0
    var len = socklen_t(MemoryLayout<Int32>.size)
    return getsockopt(fd, 0 /* SOL_LOCAL */, 0x002 /* LOCAL_PEERPID */, &pid, &len) == 0 ? pid : 0
  }

  private func tiepNhan(_ fd: Int32) async {
    defer { close(fd) }
    var mot: Int32 = 1
    setsockopt(fd, SOL_SOCKET, SO_NOSIGPIPE, &mot, socklen_t(MemoryLayout<Int32>.size))
    var tv = timeval(tv_sec: 3, tv_usec: 0)
    setsockopt(fd, SOL_SOCKET, SO_RCVTIMEO, &tv, socklen_t(MemoryLayout<timeval>.size))

    var uid: uid_t = 0, gid: gid_t = 0
    guard getpeereid(fd, &uid, &gid) == 0 else { ghiLog("getpeereid lỗi — bỏ kết nối."); return }

    // Đọc tới dòng mới.
    var nhan = Data()
    var buf = [UInt8](repeating: 0, count: 8192)
    while nhan.count < 1_000_000 {
      let n = read(fd, &buf, buf.count)
      if n <= 0 { break }
      nhan.append(buf, count: n)
      if nhan.contains(0x0A) { break }
    }
    if let i = nhan.firstIndex(of: 0x0A) { nhan = nhan.prefix(upTo: i) }
    let traLoi: TraLoi
    if let yc = try? IPCMa.decoder.decode(YeuCauTray.self, from: nhan) {
      traLoi = await xuLy(yc, uid, SocketIPC.pidDauKia(fd))
    } else {
      traLoi = .loi(ma: "yeu_cau_sai", chu: "Yêu cầu không đọc được.")
    }
    guard var du = try? IPCMa.encoder.encode(traLoi) else { return }
    du.append(0x0A)
    du.withUnsafeBytes { b in
      var da = 0
      while da < du.count { let n = write(fd, b.baseAddress! + da, du.count - da); if n <= 0 { break }; da += n }
    }
  }

  public func dong() {
    chay = false
    if fdNghe >= 0 { close(fdNghe); fdNghe = -1 }
    unlink(duongDan)
  }
}
