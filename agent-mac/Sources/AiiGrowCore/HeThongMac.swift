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
  private var boNhoBoGo: [String: Bool] = [:]
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
      var tt = (TienTrinh(pid: pid, uid: k.kp_eproc.e_ucred.cr_uid, duongDan: duong, duongDanApp: app, bundleId: app.flatMap(bundleId),
                          bundleIdGan: QuyetDinhApp.appGanNhat(duong).flatMap(bundleId)))
      if duong.lowercased().contains("/library/input methods/"), let g = tt.duongDanAppGan { tt.laBoGo = laBoGo(g) }
      kq.append(tt)
    }
    return kq
  }

  /// Info.plist của .app có khoá bộ gõ không — nhớ theo đường dẫn .app như bundleId.
  private func laBoGo(_ app: String) -> Bool {
    khoa.lock(); defer { khoa.unlock() }
    if let b = boNhoBoGo[app] { return b }
    let b = QuyetDinhApp.plistLaBoGo(NSDictionary(contentsOfFile: app + "/Contents/Info.plist") as? [String: Any])
    boNhoBoGo[app] = b
    return b
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

  public func lietKeThuMuc(_ duongDan: String) -> [String] { (try? FileManager.default.contentsOfDirectory(atPath: duongDan)) ?? [] }

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

  public static let nhanTrinhGo = "vn.aiilab.aiigrow.go"

  public func chayTrinhGo() {
    let script = DuongDan.app + "/Contents/Resources/go-cai.sh"
    guard FileManager.default.fileExists(atPath: script) else { ghiLog("Không thấy trình gỡ \(script) — gỡ tay bằng go-cai.sh."); return }
    // `launchctl submit` là cách DUY NHẤT sống sót sau khi go-cai.sh `bootout` chính daemon (launchd giết cả nhóm tiến trình của daemon, nohup/setsid không thoát được).
    // Việc submit là một lần: go-cai.sh tự `launchctl remove` ở cuối; ở đây còn gỡ nhãn sót từ lần trước để submit không bị trùng nhãn.
    _ = HeThongMac.chay("/bin/launchctl", ["remove", HeThongMac.nhanTrinhGo], timeout: 10)
    // go-cai.sh tự chép mình ra /var/tmp rồi chạy bản sao (installer có thể ghi đè tệp gốc trong lúc nó chờ).
    let (ma, ra) = HeThongMac.chay("/bin/launchctl", ["submit", "-l", HeThongMac.nhanTrinhGo, "--", "/bin/bash", script], timeout: 10)
    if ma != 0 { ghiLog("Không chạy được trình gỡ (\(ma)): \(ra)") }
  }

  /// PID trong `DuongDan.goCaiDangChay` còn sống và đúng là go-cai.sh (job launchd lẫn chạy tay bằng sudo), hoặc job gỡ từ xa đã submit
  /// mà go-cai.sh chưa kịp ghi PID (nhãn có "PID").
  public func trinhGoDangChay() -> Bool {
    if HeThongMac.jobDangChay(HeThongMac.nhanTrinhGo) { return true }
    guard let s = try? String(contentsOfFile: DuongDan.goCaiDangChay, encoding: .utf8) else { return false }
    return HeThongMac.goCaiConSong(s)
  }

  /// Nội dung tệp PID go-cai.sh (dòng 1 PID, dòng 2 ps lstart) ⇒ tiến trình đó còn sống và đúng là trình gỡ.
  static func goCaiConSong(_ s: String) -> Bool {
    let dong = s.split(separator: "\n", omittingEmptySubsequences: false).map { $0.trimmingCharacters(in: .whitespaces) }
    guard let pid = Int32(dong.first ?? ""), pid > 0, kill(pid, 0) == 0 else { return false }
    // Dòng 2 = giờ bắt đầu (ps lstart) go-cai.sh ghi: khớp ⇒ đúng trình gỡ (kể cả chạy qua ống, dòng lệnh chỉ «bash»); tệp kiểu cũ ⇒ so dòng lệnh.
    if dong.count > 1, !dong[1].isEmpty {
      return HeThongMac.chay("/usr/bin/env", ["LC_ALL=C", "/bin/ps", "-p", String(pid), "-o", "lstart="], timeout: 10).1.trimmingCharacters(in: .whitespacesAndNewlines) == dong[1]
    }
    return HeThongMac.chay("/bin/ps", ["-p", String(pid), "-o", "command="], timeout: 10).1.contains("go-cai")
  }

  public func taoThuMuc(_ duongDan: String, quyen: Int) throws {
    try FileManager.default.createDirectory(atPath: duongDan, withIntermediateDirectories: true, attributes: [.posixPermissions: quyen])
    chmod(duongDan, mode_t(quyen))            // umask không được nới quyền
  }

  public func kiemChuKyGoi(_ duongDan: String) -> (Int32, String) {
    HeThongMac.chay("/usr/sbin/pkgutil", ["--check-signature", duongDan], timeout: 60)
  }

  public func kiemSpctlGoi(_ duongDan: String) -> (Int32, String) {
    HeThongMac.chay("/usr/sbin/spctl", ["-a", "-t", "install", duongDan], timeout: 60)
  }

  public func chuyenTep(_ nguon: String, vao dich: String, quyen: Int) throws {
    let fm = FileManager.default
    try? fm.removeItem(atPath: dich)
    try fm.moveItem(atPath: nguon, toPath: dich)
    chmod(dich, mode_t(quyen))
  }

  /// `launchctl list <nhãn>` có «"PID" =» ⇒ job đang chạy.
  public func caiDangChay() -> Bool { HeThongMac.jobDangChay(LuatCapNhat.nhanCai) }

  /// Job launchd `nhan` đang có tiến trình sống (`launchctl list <nhãn>` có khoá "PID"; nhãn đã xong/không có thì không).
  /// Bản shell cùng quy tắc: `launchctl list <nhãn> | grep -q '"PID"'` trong go-cai.sh, preinstall, postinstall.
  static func jobDangChay(_ nhan: String) -> Bool {
    let (ma, ra) = HeThongMac.chay("/bin/launchctl", ["list", nhan], timeout: 10)
    return ma == 0 && ra.contains("\"PID\"")
  }

  /// Lệnh sh của job cài (`caiGoi`).
  /// $1 gói · $2 nhãn · $3 dấu PID · $4 dấu đã gỡ · $5 plist daemon · $6 plist tray · $7 phien-gui.sh (uid phiên GUI, chung với pre/postinstall). Đọc kỹ ba nhánh:
  /// - napLai: installer hỏng SAU preinstall (đã bootout daemon + tray mọi phiên) thì postinstall không chạy ⇒ tự nạp lại bản cũ (trừ khi máy vừa bị gỡ).
  /// - Job `launchctl submit` được launchd chạy LẠI nếu chết giữa chừng: thấy dấu PID của lượt trước (lượt thường xoá nó khi xong) ⇒ không cài lại,
  ///   nạp lại bản cũ, dọn, tự gỡ nhãn — không vòng cài vô hạn.
  /// - Lượt trước đã xong (xoá gói + dấu PID) mà `launchctl remove` hỏng ⇒ launchd chạy lại: không còn gói ⇒ tự gỡ nhãn, không cài/nạp lại.
  /// - Máy bị gỡ trước khi installer chạy (dấu gỡ có SAU khi ghi PID ⇒ postinstall nhận ra job còn sống): không cài, dọn, tự gỡ nhãn.
  ///   Daemon không `launchctl remove` job này; go-cai.sh chỉ dừng installer chạy quá trần 5 phút (job nộp sau khi có da-go thì tự bỏ ngay).
  /// - Máy bị gỡ giữa lúc cài: postinstall đã dọn app ⇒ xoá luôn biên nhận installer vừa ghi.
  static let lenhJobCai = """
    DA_GO="$4" ; DAEMON="$5" ; TRAY="$6" ; PG="$7"
    napLai() { if [ ! -f "$DA_GO" ] && [ -f "$DAEMON" ]; then /bin/launchctl bootstrap system "$DAEMON" ; echo "nạp lại daemon, mã $?" ; \
      for u in $([ -f "$PG" ] && /bin/bash "$PG") ; do /bin/launchctl bootstrap gui/$u "$TRAY" ; done ; fi ; }
    if [ -f "$3" ] ; then echo "lượt cài trước dừng giữa chừng — không cài lại" ; napLai ; /bin/rm -f "$1" "$3" ; /bin/launchctl remove "$2" ; exit 0 ; fi
    if [ ! -f "$1" ] ; then echo "gói đã bị xoá (job bị chạy lại sau khi xong) — bỏ" ; /bin/launchctl remove "$2" ; exit 0 ; fi
    echo $$ > "$3"
    if [ -f "$DA_GO" ] ; then echo "máy đang được gỡ — không cài" ; /bin/rm -f "$1" "$3" ; /bin/launchctl remove "$2" ; exit 0 ; fi
    /usr/sbin/installer -pkg "$1" -target / ; ma=$? ; echo "installer xong, mã $ma"
    if [ $ma -ne 0 ] ; then napLai ; fi
    if [ -f "$DA_GO" ] ; then /usr/sbin/pkgutil --forget vn.aiilab.aiigrow.pkg ; fi
    /bin/rm -f "$1" "$3" ; /bin/launchctl remove "$2" ; exit $ma
    """

  /// Job launchd riêng: preinstall của gói `bootout` daemon, launchd giết cả nhóm tiến trình của daemon — chỉ `launchctl submit` thoát được.
  /// Bọc trong sh: cài xong tự xoá gói + tự `launchctl remove` nhãn (không để postinstall tự gỡ nhãn đang chạy installer).
  /// KHÔNG `launchctl remove` nhãn đang chạy (giết installer giữa chừng); chỉ gỡ nhãn sót đã xong.
  public func caiGoi(_ duongDan: String) throws {
    let nhan = LuatCapNhat.nhanCai
    guard !caiDangChay() else { throw LoiApi(chu: "Đang có một lượt cài chạy (\(nhan)) — bỏ qua lần này.") }
    _ = HeThongMac.chay("/bin/launchctl", ["remove", nhan], timeout: 10)           // nhãn sót đã xong từ lần trước
    let dau = DuongDan.dangCapNhat                                                  // ghi PID của sh job: postinstall biết đây là cài tự động (và còn sống)
    try? FileManager.default.removeItem(atPath: dau)                               // job không còn chạy (đã kiểm ở trên) ⇒ dấu nào còn là dấu sót

    let (ma, ra) = HeThongMac.chay("/bin/launchctl", ["submit", "-l", nhan, "-o", DuongDan.log + "/capnhat.log", "-e", DuongDan.log + "/capnhat.log",
                                                      "--", "/bin/sh", "-c", HeThongMac.lenhJobCai, "capnhat", duongDan, nhan, dau, DuongDan.daGo,
                                                      DuongDan.daemonPlist, DuongDan.trayPlist, DuongDan.app + "/Contents/Resources/phien-gui.sh"], timeout: 10)
    guard ma == 0 else { throw LoiApi(chu: "launchctl submit lỗi (\(ma)): \(ra)") }
  }

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
  /// Đọc bằng DispatchSource trên hàng đợi nối tiếp riêng; fd CHỈ được đóng trong cancelHandler (sau khi mọi lần đọc đã xong) — không race, không rò luồng/fd.
  @discardableResult
  public static func chay(_ lenh: String, _ thamSo: [String], timeout: Double = 20, trenOutput: Int = 1_000_000) -> (Int32, String) {
    final class Hop: @unchecked Sendable { var d = Data() }      // chỉ đụng trên `hang` (nối tiếp) hoặc sau khi nguồn đã huỷ
    var fds: [Int32] = [0, 0]
    guard pipe(&fds) == 0 else { return (-1, "pipe lỗi") }
    let doc = fds[0], ghi = fds[1]
    _ = fcntl(doc, F_SETFL, fcntl(doc, F_GETFL) | O_NONBLOCK)
    let p = Process()
    p.executableURL = URL(fileURLWithPath: lenh)
    p.arguments = thamSo
    let dauGhi = FileHandle(fileDescriptor: ghi, closeOnDealloc: false)
    p.standardOutput = dauGhi
    p.standardError = dauGhi
    let thoat = DispatchSemaphore(value: 0), eof = DispatchSemaphore(value: 0), daHuy = DispatchSemaphore(value: 0)
    p.terminationHandler = { _ in thoat.signal() }
    let hop = Hop()
    let hang = DispatchQueue(label: "vn.aiilab.aiigrow.chay")
    let nguon = DispatchSource.makeReadSource(fileDescriptor: doc, queue: hang)
    nguon.setEventHandler {
      // Mỗi sự kiện đọc MỘT lần (nguồn mức-kích-hoạt sẽ gọi lại nếu còn dữ liệu) ⇒ handler luôn trả về, không kẹt khi con xả output liên tục.
      var buf = [UInt8](repeating: 0, count: 65536)
      let n = read(doc, &buf, buf.count)
      if n > 0 {
        hop.d.append(buf, count: n)
        if hop.d.count >= trenOutput { nguon.cancel(); eof.signal() }       // trần kích thước output
        return
      }
      if n < 0 && (errno == EAGAIN || errno == EINTR) { return }
      nguon.cancel(); eof.signal()                                          // EOF hoặc lỗi
    }
    nguon.setCancelHandler { close(doc); daHuy.signal() }
    nguon.resume()
    func huy() { nguon.cancel(); _ = daHuy.wait(timeout: .now() + 2) }
    do { try p.run() } catch { close(ghi); huy(); return (-1, "\(error)") }
    close(ghi)                                               // đầu ghi của ta: để EOF tới khi con (và cháu) thoát
    if thoat.wait(timeout: .now() + timeout) == .timedOut {
      p.terminate()
      if thoat.wait(timeout: .now() + 1) == .timedOut { kill(p.processIdentifier, SIGKILL); _ = thoat.wait(timeout: .now() + 1) }
      huy()
      return (-1, "quá hạn \(Int(timeout)) giây: \(lenh)")
    }
    // Con đã thoát: chờ đọc tới EOF, nhưng cháu giữ ống thì chỉ chờ ngắn rồi lấy phần đã có.
    _ = eof.wait(timeout: .now() + 0.3)
    huy()
    let ra = hang.sync { hop.d }                             // sau khi nguồn đã huỷ; sync trên hàng đợi nối tiếp ⇒ không race với handler
    return (p.terminationStatus, String(decoding: ra, as: UTF8.self))
  }
}
