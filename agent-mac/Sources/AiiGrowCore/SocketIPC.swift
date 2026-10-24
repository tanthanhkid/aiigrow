// Máy chủ Unix socket của daemon (DuongDan.socket): mỗi kết nối MỘT dòng JSON yêu cầu ⇒ MỘT dòng JSON trả lời rồi đóng.
// Kiểm người gọi bằng getpeereid — uid thật của tiến trình bên kia, không giả được (THIET-KE.md mục 3).
import Foundation

public final class SocketIPC: @unchecked Sendable {
  private let duongDan: String
  private var fdNghe: Int32 = -1
  private let xuLy: (YeuCauTray, UInt32) async -> TraLoi
  /// Số kết nối đồng thời tối đa cả socket, và tối đa cho MỖI uid (uid Con không chiếm hết phần của root/tray khác uid) — vượt thì đóng ngay.
  public static let toiDaDongThoi = 16
  public static let toiDaMoiUid = 4
  /// Hạn chót TỔNG để client gửi xong một dòng, tính từ lúc accept (không reset theo từng byte — chặn kiểu nhỏ giọt).
  public static let hanDocGiay = 3.0
  private let dem = NSLock()
  private var dangXuLy = 0
  private var theoUid: [uid_t: Int] = [:]
  /// I/O chặn (poll/read/write) chạy ở hàng đợi riêng, KHÔNG chiếm luồng cooperative của Swift concurrency (actor BoMay không bị đói).
  private let hangDoiIO = DispatchQueue(label: "vn.aiilab.aiigrow.ipc", attributes: .concurrent)
  private let ghiLog: (String) -> Void
  private var chay = false

  public init(duongDan: String = DuongDan.socket, ghiLog: @escaping (String) -> Void = { _ in },
              xuLy: @escaping (YeuCauTray, UInt32) async -> TraLoi) {
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

  /// Vòng accept — chạy ở luồng riêng (accept chặn), trả về khi socket đóng. Mỗi kết nối: đọc trên hàng đợi IO với hạn chót tổng,
  /// xử lý lệnh trong Task, ghi trả lời lại trên hàng đợi IO.
  public func phucVu() async {
    await withCheckedContinuation { (xong: CheckedContinuation<Void, Never>) in
      let t = Thread { [self] in
        while chay {
          let fd = accept(fdNghe, nil, nil)
          if fd < 0 { if errno == EINTR { continue }; break }
          nhan(fd)
        }
        xong.resume()
      }
      t.name = "aiigrow-ipc-accept"
      t.start()
    }
  }

  private func nhan(_ fd: Int32) {
    var mot: Int32 = 1
    setsockopt(fd, SOL_SOCKET, SO_NOSIGPIPE, &mot, socklen_t(MemoryLayout<Int32>.size))
    var u: uid_t = 0, gid: gid_t = 0
    guard getpeereid(fd, &u, &gid) == 0 else { ghiLog("getpeereid lỗi — bỏ kết nối."); close(fd); return }
    let uid = u
    guard giuCho(uid) else { ghiLog("Quá giới hạn kết nối (uid \(uid)) — đóng bớt."); close(fd); return }
    let han = DispatchTime.now() + SocketIPC.hanDocGiay
    hangDoiIO.async { [self] in
      guard let dong = docDong(fd, han: han) else { close(fd); traCho(uid); return }
      Task { [self] in
        let traLoi: TraLoi
        if let yc = try? IPCMa.decoder.decode(YeuCauTray.self, from: dong) {
          traLoi = await xuLy(yc, uid)
        } else {
          traLoi = .loi(ma: "yeu_cau_sai", chu: "Yêu cầu không đọc được.")
        }
        hangDoiIO.async { [self] in
          ghi(fd, traLoi)
          close(fd)
          traCho(uid)
        }
      }
    }
  }

  private func giuCho(_ uid: uid_t) -> Bool {
    dem.lock(); defer { dem.unlock() }
    guard dangXuLy < SocketIPC.toiDaDongThoi, theoUid[uid, default: 0] < SocketIPC.toiDaMoiUid else { return false }
    dangXuLy += 1; theoUid[uid, default: 0] += 1
    return true
  }
  private func traCho(_ uid: uid_t) {
    dem.lock(); defer { dem.unlock() }
    dangXuLy -= 1
    let n = theoUid[uid, default: 1] - 1
    theoUid[uid] = n > 0 ? n : nil
  }

  /// Đọc tới dòng mới trước hạn chót `han` (poll theo thời gian còn lại). nil = quá hạn / lỗi / đóng sớm không có dữ liệu.
  private func docDong(_ fd: Int32, han: DispatchTime) -> Data? {
    var nhan = Data()
    var buf = [UInt8](repeating: 0, count: 8192)
    while nhan.count < 1_000_000 {
      let conLai = Int((han.uptimeNanoseconds &- min(DispatchTime.now().uptimeNanoseconds, han.uptimeNanoseconds)) / 1_000_000)
      if conLai <= 0 { return nil }
      var pf = pollfd(fd: fd, events: Int16(POLLIN), revents: 0)
      let r = poll(&pf, 1, Int32(min(conLai, 3000)))
      if r < 0 { if errno == EINTR { continue }; return nil }
      if r == 0 { return nil }
      let n = read(fd, &buf, buf.count)
      if n <= 0 { break }
      nhan.append(buf, count: n)
      if nhan.contains(0x0A) { break }
    }
    if let i = nhan.firstIndex(of: 0x0A) { nhan = nhan.prefix(upTo: i) }
    return nhan
  }

  private func ghi(_ fd: Int32, _ traLoi: TraLoi) {
    var tv = timeval(tv_sec: 2, tv_usec: 0)
    setsockopt(fd, SOL_SOCKET, SO_SNDTIMEO, &tv, socklen_t(MemoryLayout<timeval>.size))
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
