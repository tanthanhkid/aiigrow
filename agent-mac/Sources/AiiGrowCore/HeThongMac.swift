// HeThong thật trên macOS 13–26. Chỉ dùng cơ chế chính thức, không API riêng tư:
//   • tiến trình: sysctl KERN_PROC_UID + proc_pidpath ⇒ gói .app ngoài cùng ⇒ CFBundleIdentifier (Info.plist).
//   • phiên ở màn hình + màn khoá: IORegistry «IOConsoleUsers» (kCGSSessionOnConsoleKey, CGSSessionScreenIsLocked) — đọc được từ root,
//     không cần ngồi trong phiên người dùng như CGSessionCopyCurrentDictionary.
//   • khoá phiên: `launchctl bootout gui/<uid>` (root) — đóng phiên đồ hoạ của Con, về màn đăng nhập. CGSession -suspend (chuyển nhanh người dùng)
//     đã bị Apple bỏ từ macOS 11, SACLockScreenImmediate là API riêng tư và chỉ chạy trong phiên người dùng; còn tray tự khoá thì Con tắt được tray.
//     Đổi lại: app đang mở của Con bị đóng (tray đã đếm ngược báo trước 10–60 giây). Lỗi thì thử `bootout user/<uid>`.
//   • hạ quyền: dseditgroup -o edit -d <tk> -t user admin · DNS: dscacheutil -flushcache + killall -HUP mDNSResponder.
import Foundation
import IOKit
import SystemConfiguration

public final class HeThongMac: HeThong {
  private var boNhoBundle: [String: String] = [:]
  private let khoa = NSLock()
  public init() {}

  // MARK: đọc

  public func tienTrinh(cuaUid uid: UInt32) -> [TienTrinh] {
    var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_UID, Int32(bitPattern: uid)]
    var co = 0
    guard sysctl(&mib, 4, nil, &co, nil, 0) == 0, co > 0 else { return [] }
    co += 16 * MemoryLayout<kinfo_proc>.stride            // tiến trình mới sinh giữa hai lần gọi
    var ds = [kinfo_proc](repeating: kinfo_proc(), count: co / MemoryLayout<kinfo_proc>.stride)
    guard sysctl(&mib, 4, &ds, &co, nil, 0) == 0 else { return [] }
    let n = co / MemoryLayout<kinfo_proc>.stride
    var kq: [TienTrinh] = []
    var buf = [CChar](repeating: 0, count: 4 * Int(MAXPATHLEN))
    for k in ds.prefix(n) {
      let pid = k.kp_proc.p_pid
      guard pid > 0 else { continue }
      let len = proc_pidpath(pid, &buf, UInt32(buf.count))
      guard len > 0 else { continue }
      let duong = String(cString: buf)
      let app = QuyetDinhApp.appNgoaiCung(duong)
      kq.append(TienTrinh(pid: pid, uid: k.kp_eproc.e_ucred.cr_uid, duongDan: duong, duongDanApp: app, bundleId: app.flatMap(bundleId)))
    }
    return kq
  }

  private func bundleId(_ app: String) -> String? {
    khoa.lock(); defer { khoa.unlock() }
    if let b = boNhoBundle[app] { return b.isEmpty ? nil : b }
    let plist = NSDictionary(contentsOfFile: app + "/Contents/Info.plist")
    let b = plist?["CFBundleIdentifier"] as? String ?? ""
    boNhoBundle[app] = b
    return b.isEmpty ? nil : b
  }

  public func conSong(pid: Int32) -> Bool { kill(pid, 0) == 0 || errno == EPERM }

  public func docTep(_ duongDan: String) -> Data? { FileManager.default.contents(atPath: duongDan) }

  public func uid(cuaTaiKhoan ten: String) -> UInt32? { getpwnam(ten).map { $0.pointee.pw_uid } }

  public func taiKhoan(cuaUid uid: UInt32) -> String? { getpwuid(uid).map { String(cString: $0.pointee.pw_name) } }

  public func laAdmin(uid: UInt32) -> Bool {
    if uid == 0 { return true }
    guard let ten = taiKhoan(cuaUid: uid) else { return false }
    return dsAdmin().contains(ten)
  }

  public func dsAdmin() -> [String] {
    // dscl . -read /Groups/admin GroupMembership ⇒ «GroupMembership: root thanh …» (chỉ đọc, không cần root)
    let (ma, ra) = HeThongMac.chay("/usr/bin/dscl", [".", "-read", "/Groups/admin", "GroupMembership"])
    guard ma == 0 else { return [] }
    return ra.replacingOccurrences(of: "GroupMembership:", with: "").split(whereSeparator: { $0 == " " || $0 == "\n" }).map(String.init)
  }

  /// Tài khoản người dùng thường trên máy (uid ≥ 500, không bắt đầu bằng «_») — dscl . -list /Users UniqueID.
  public func dsNguoiDung() -> [(ten: String, uid: UInt32)] {
    let (ma, ra) = HeThongMac.chay("/usr/bin/dscl", [".", "-list", "/Users", "UniqueID"])
    guard ma == 0 else { return [] }
    return ra.split(separator: "\n").compactMap { d in
      let p = d.split(separator: " ", omittingEmptySubsequences: true)
      guard p.count == 2, let u = UInt32(p[1]), u >= 500, !p[0].hasPrefix("_") else { return nil }
      return (String(p[0]), u)
    }
  }

  public func phienConsole() -> PhienConsole? {
    let goc = IORegistryGetRootEntry(kIOMainPortDefault)
    defer { IOObjectRelease(goc) }
    guard let v = IORegistryEntryCreateCFProperty(goc, "IOConsoleUsers" as CFString, kCFAllocatorDefault, 0)?.takeRetainedValue(),
          let ds = v as? [[String: Any]] else { return nil }
    for p in ds where (p["kCGSSessionOnConsoleKey"] as? Bool) == true {
      guard let u = (p["kCGSSessionUserIDKey"] as? NSNumber)?.uint32Value else { continue }
      return PhienConsole(uid: u, manKhoa: (p["CGSSessionScreenIsLocked"] as? Bool) ?? false)
    }
    return nil
  }

  /// `launchctl asuser <uid> lsappinfo front` ⇒ ASN, rồi `lsappinfo info -only bundleid <ASN>` — chạy trong phiên đồ hoạ của Con (daemon root không có phiên riêng).
  public func appTienCanh(cuaUid uid: UInt32) -> String? {
    let (m1, r1) = HeThongMac.chay("/bin/launchctl", ["asuser", "\(uid)", "/usr/bin/lsappinfo", "front"], timeout: 3)
    guard m1 == 0, let asn = TienCanh.tachASN(r1) else { return nil }
    let (m2, r2) = HeThongMac.chay("/bin/launchctl", ["asuser", "\(uid)", "/usr/bin/lsappinfo", "info", "-only", "bundleid", asn], timeout: 3)
    guard m2 == 0 else { return nil }
    return TienCanh.tachBundleId(r2)
  }

  public func tenMay() -> String {
    (SCDynamicStoreCopyComputerName(nil, nil) as String?) ?? Host.current().localizedName ?? "Mac"
  }

  // MARK: tác động

  public func guiTinHieu(pid: Int32, tinHieu: Int32) {
    if kill(pid, tinHieu) != 0 { ghiLog("Không gửi được tín hiệu \(tinHieu) tới pid \(pid): \(String(cString: strerror(errno)))") }
  }

  public func ghiTep(_ duongDan: String, _ d: Data, quyen: Int) throws {
    try GhiTep.nguyenKhoi(d, vao: duongDan, quyen: mode_t(quyen))
  }

  public func xoaTep(_ duongDan: String) { unlink(duongDan) }

  public func xoaBoNhoDNS() {
    _ = HeThongMac.chay("/usr/bin/dscacheutil", ["-flushcache"])
    _ = HeThongMac.chay("/usr/bin/killall", ["-HUP", "mDNSResponder"])
  }

  public func haQuyenAdmin(taiKhoan: String) throws {
    let (ma, ra) = HeThongMac.chay("/usr/sbin/dseditgroup", ["-o", "edit", "-d", taiKhoan, "-t", "user", "admin"])
    guard ma == 0 else { throw LoiApi(chu: "Không hạ được quyền \(taiKhoan): \(ra)") }
  }

  public func dongPhien(uid: UInt32) throws {
    var (ma, ra) = HeThongMac.chay("/bin/launchctl", ["bootout", "gui/\(uid)"])
    if ma != 0 { (ma, ra) = HeThongMac.chay("/bin/launchctl", ["bootout", "user/\(uid)"]) }
    guard ma == 0 else { throw LoiApi(chu: "Không đóng được phiên uid \(uid): \(ra)") }
  }

  public func ghiLog(_ s: String) {
    let t = ISO8601DateFormatter().string(from: Date())
    print("\(t) \(s)")
    fflush(stdout)
  }

  /// Chạy lệnh, chờ xong tối đa `timeout` giây (quá hạn ⇒ kill tiến trình con, trả (-1, «quá hạn»)) ⇒ (mã thoát, stdout+stderr).
  @discardableResult
  public static func chay(_ lenh: String, _ thamSo: [String], timeout: Double = 20) -> (Int32, String) {
    final class Hop: @unchecked Sendable { let k = NSLock(); var d = Data() }
    let p = Process()
    p.executableURL = URL(fileURLWithPath: lenh)
    p.arguments = thamSo
    let ong = Pipe()
    p.standardOutput = ong
    p.standardError = ong
    let xong = DispatchSemaphore(value: 0)
    p.terminationHandler = { _ in xong.signal() }
    do { try p.run() } catch { return (-1, "\(error)") }
    // Đọc ở luồng riêng: tiến trình cháu (lsappinfo) có thể còn giữ đầu ghi ống sau khi launchctl bị kill.
    let hop = Hop(), docXong = DispatchSemaphore(value: 0)
    DispatchQueue.global().async {
      let d = ong.fileHandleForReading.readDataToEndOfFile()
      hop.k.lock(); hop.d = d; hop.k.unlock()
      docXong.signal()
    }
    if xong.wait(timeout: .now() + timeout) == .timedOut {
      p.terminate()
      if xong.wait(timeout: .now() + 1) == .timedOut { kill(p.processIdentifier, SIGKILL) }
      return (-1, "quá hạn \(Int(timeout)) giây: \(lenh)")
    }
    _ = docXong.wait(timeout: .now() + 1)
    hop.k.lock(); defer { hop.k.unlock() }
    return (p.terminationStatus, String(decoding: hop.d, as: UTF8.self))
  }
}
