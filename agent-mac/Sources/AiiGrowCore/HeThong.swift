// MỌI tác động lên hệ điều hành của daemon đi qua protocol này — test dùng bản giả, cờ `--thu` dùng HeThongThu (chỉ in việc sẽ làm).
import Foundation

/// Phiên đang ở màn hình (console).
public struct PhienConsole: Equatable {
  public var uid: UInt32
  public var manKhoa: Bool
  public init(uid: UInt32, manKhoa: Bool) { self.uid = uid; self.manKhoa = manKhoa }
}

public protocol HeThong: AnyObject {
  // — đọc —
  func tienTrinh(cuaUid uid: UInt32) -> [TienTrinh]
  func conSong(pid: Int32) -> Bool
  func docTep(_ duongDan: String) -> Data?
  func uid(cuaTaiKhoan ten: String) -> UInt32?
  func taiKhoan(cuaUid uid: UInt32) -> String?
  func laAdmin(uid: UInt32) -> Bool
  /// Tên ngắn các tài khoản trong nhóm admin.
  func dsAdmin() -> [String]
  func phienConsole() -> PhienConsole?
  func tenMay() -> String
  /// Tên các mục con (thư mục/tệp) của một thư mục; không có ⇒ [].
  func lietKeThuMuc(_ duongDan: String) -> [String]
  /// Bundle id app tiền cảnh của phiên đồ hoạ của uid — daemon TỰ kiểm, không tin tray báo. nil = không xác định được.
  func appTienCanh(cuaUid uid: UInt32) -> String?
  // — tác động —
  func guiTinHieu(pid: Int32, tinHieu: Int32)
  func ghiTep(_ duongDan: String, _ d: Data, quyen: Int) throws
  func xoaTep(_ duongDan: String)
  func xoaBoNhoDNS()
  /// Chạy trình gỡ (go-cai.sh) như một job launchd riêng, để nó sống sau khi gỡ chính daemon.
  func chayTrinhGo()
  /// go-cai.sh còn đang chạy (PID trong `DuongDan.goCaiDangChay`).
  func trinhGoDangChay() -> Bool
  /// Tạo thư mục (cả cha) với quyền `quyen`, chủ root.
  func taoThuMuc(_ duongDan: String, quyen: Int) throws
  /// `pkgutil --check-signature <gói>` ⇒ (mã thoát, đầu ra).
  func kiemChuKyGoi(_ duongDan: String) -> (Int32, String)
  /// `spctl -a -t install <gói>` ⇒ (mã thoát, đầu ra).
  func kiemSpctlGoi(_ duongDan: String) -> (Int32, String)
  /// Chuyển tệp (vd tệp URLSession vừa tải) vào `dich`, quyền `quyen`, chủ root.
  func chuyenTep(_ nguon: String, vao dich: String, quyen: Int) throws
  /// Job `vn.aiilab.aiigrow.capnhat` đang chạy (installer chưa xong) ⇒ true.
  func caiDangChay() -> Bool
  /// Cài gói bằng `/usr/sbin/installer -pkg … -target /` chạy như job launchd riêng (preinstall bootout chính daemon).
  func caiGoi(_ duongDan: String) throws
  /// Dừng + gỡ job cài (`launchctl remove`) — dùng khi máy bị gỡ ngay sau lúc vừa giao installer.
  func dungCai()
  func haQuyenAdmin(taiKhoan: String) throws
  /// Đóng phiên đồ hoạ của uid (Con bị đăng xuất về màn đăng nhập).
  func dongPhien(uid: UInt32) throws
  func ghiLog(_ s: String)
}

/// Bọc một HeThong thật: mọi phần ĐỌC chạy thật, mọi TÁC ĐỘNG chỉ in «[thử] sẽ …».
public final class HeThongThu: HeThong {
  private let that: HeThong
  public private(set) var viecSeLam: [String] = []
  public init(_ that: HeThong) { self.that = that }

  private func se(_ s: String) { viecSeLam.append(s); print("[thử] sẽ \(s)") }

  public func tienTrinh(cuaUid uid: UInt32) -> [TienTrinh] { that.tienTrinh(cuaUid: uid) }
  public func conSong(pid: Int32) -> Bool { that.conSong(pid: pid) }
  public func docTep(_ duongDan: String) -> Data? { that.docTep(duongDan) }
  public func uid(cuaTaiKhoan ten: String) -> UInt32? { that.uid(cuaTaiKhoan: ten) }
  public func taiKhoan(cuaUid uid: UInt32) -> String? { that.taiKhoan(cuaUid: uid) }
  public func laAdmin(uid: UInt32) -> Bool { that.laAdmin(uid: uid) }
  public func dsAdmin() -> [String] { that.dsAdmin() }
  public func phienConsole() -> PhienConsole? { that.phienConsole() }
  public func tenMay() -> String { that.tenMay() }
  public func lietKeThuMuc(_ duongDan: String) -> [String] { that.lietKeThuMuc(duongDan) }
  public func appTienCanh(cuaUid uid: UInt32) -> String? { that.appTienCanh(cuaUid: uid) }

  public func guiTinHieu(pid: Int32, tinHieu: Int32) { se("gửi tín hiệu \(tinHieu) tới pid \(pid)") }
  public func ghiTep(_ duongDan: String, _ d: Data, quyen: Int) throws { se("ghi \(duongDan) (\(d.count) byte, quyền \(String(quyen, radix: 8)))") }
  public func xoaTep(_ duongDan: String) { se("xoá \(duongDan)") }
  public func chayTrinhGo() { se("chạy trình gỡ go-cai.sh (launchctl submit)") }
  public func trinhGoDangChay() -> Bool { false }
  public func taoThuMuc(_ duongDan: String, quyen: Int) throws { se("tạo thư mục \(duongDan) (quyền \(String(quyen, radix: 8)))") }
  public func kiemChuKyGoi(_ duongDan: String) -> (Int32, String) { se("kiểm chữ ký \(duongDan) (pkgutil)"); return (1, "[thử]") }
  public func kiemSpctlGoi(_ duongDan: String) -> (Int32, String) { se("kiểm spctl \(duongDan)"); return (1, "[thử]") }
  public func chuyenTep(_ nguon: String, vao dich: String, quyen: Int) throws { se("chuyển \(nguon) vào \(dich) (quyền \(String(quyen, radix: 8)))") }
  public func caiDangChay() -> Bool { false }
  public func caiGoi(_ duongDan: String) throws { se("cài gói \(duongDan) (installer qua launchctl submit)") }
  public func dungCai() { se("dừng job cài (launchctl remove \(LuatCapNhat.nhanCai))") }
  public func xoaBoNhoDNS() { se("xoá bộ nhớ DNS (dscacheutil -flushcache; killall -HUP mDNSResponder)") }
  public func haQuyenAdmin(taiKhoan: String) throws { se("hạ \(taiKhoan) khỏi nhóm admin (dseditgroup)") }
  public func dongPhien(uid: UInt32) throws { se("đóng phiên của uid \(uid) (launchctl bootout gui/\(uid))") }
  public func ghiLog(_ s: String) { that.ghiLog(s) }
}
