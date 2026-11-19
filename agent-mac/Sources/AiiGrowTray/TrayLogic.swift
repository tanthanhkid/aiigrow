// Logic THUẦN của tray (không AppKit/SwiftUI) — tách ra để test được: định dạng câu, chọn màn, lọc tài khoản, nhắc giờ.
import Foundation
import AiiGrowCore

/// Màn hình tray cần hiện toàn màn hình.
public enum ManToanMan: Equatable {
  case khong
  case khoa(lyDo: String?)
  case demNguoc(giay: Int, lyDo: String?)
}

public enum TrayLogic {
  /// #422 «Xin thêm app / web»: nút ở Hôm nay (con-cai-mac 41), mục menu khay (42), tiêu đề hộp xin (43/44).
  public static let nutXinThem = "Xin thêm app / web"
  public static let mucXinThem = "Xin thêm app / web…"
  public static let tieuDeXinThem = "AiiGrow · Xin thêm app / web"
  /// Chọn màn: chỉ phiên của Con mới bị che; phiên admin của Ba Mẹ không bao giờ bị khoá màn.
  public static func chonMan(_ t: TrangThai?) -> ManToanMan {
    guard let t, t.laPhienCon else { return .khong }
    if let g = t.demNguocGiay, g > 0 { return .demNguoc(giay: g, lyDo: t.lyDoKhoa) }
    if t.cheDo == .khoa { return .khoa(lyDo: t.lyDoKhoa) }
    return .khong
  }

  /// Cửa sổ «Ghép máy» chỉ hiện ở phiên admin khi máy chưa ghép.
  public static func canGhep(_ t: TrangThai?, laAdmin: Bool) -> Bool {
    guard let t else { return false }
    return !t.daGhep && laAdmin
  }

  /// «5:00», «1:05:09».
  public static func dongHo(_ giay: Double) -> String {
    let s = Int(max(0, giay.rounded(.up)))
    let h = s / 3600, m = s % 3600 / 60, c = s % 60
    return h > 0 ? String(format: "%d:%02d:%02d", h, m, c) : String(format: "%d:%02d", m, c)
  }

  /// Số giây còn lại: cửa sổ mở (moDen) ưu tiên, rồi conPhut trừ thời gian đã trôi từ lúc nhận trạng thái. nil = không giới hạn.
  public static func giayConLai(_ t: TrangThai, nhanLuc: Date, bayGio: Date) -> Double? {
    if let d = t.moDen, d > bayGio { return d.timeIntervalSince(bayGio) }
    if let p = t.conPhut { return max(0, Double(p) * 60 - bayGio.timeIntervalSince(nhanLuc)) }
    return nil
  }

  /// Giây sao còn (1 sao = 1 phút) khi một app «Tính phút» đang chạy — để nhắc «Còn 5 sao» / «Còn 1 sao». nil = không đang trừ sao.
  public static func giaySao(_ t: TrangThai, nhanLuc: Date, bayGio: Date) -> Double? {
    guard t.moHet != true, t.dangTinhPhut != nil, let p = t.phutSao else { return nil }
    return max(0, Double(p) * 60 - bayGio.timeIntervalSince(nhanLuc))
  }

  /// «còn 18 sao = 18 phút chơi» / «Mở hết · không tính phút» / «Hết sao rồi» (nil = máy chủ cũ, không biết sao).
  public static func dongSao(_ t: TrangThai) -> String? {
    if t.moHet == true { return "Mở hết · không tính phút" }
    guard let p = t.phutSao ?? t.soSao?.phutCon else { return nil }
    if p <= 0, let g = ManMac.chuGioiHan(t) { return g.phu }          // khoá vì giới hạn giờ chơi, sao còn nguyên
    if p <= 0 { return "Hết sao rồi · xin Ba Mẹ cho vay sao" }
    let sao = ManMac.saoThat(t) ?? p                                   // «X sao» = sao thật; phút chơi được = phút còn (đã kẹp giới hạn)
    return (sao == p ? ChuSao.phut(p) : "còn \(ChuSao.so(sao)) sao · chơi được \(ChuSao.so(p)) phút") + (t.gioiHan?.dongConNgay.map { " · " + $0 } ?? "")
  }

  /// Chữ cạnh biểu tượng trên thanh menu.
  public static func tieuDeThanh(_ t: TrangThai?, matKetNoi: Bool, nhanLuc: Date, bayGio: Date) -> String {
    if matKetNoi || t == nil { return "" }
    guard let t else { return "" }
    if !t.daGhep { return "Chưa ghép" }
    if !t.laPhienCon { return "" }
    if t.cheDo == .khoa { return "Đang khoá" }
    if t.moHet == true { return "Mở hết" }
    if let g = giayConLai(t, nhanLuc: nhanLuc, bayGio: bayGio) { return "Còn \(Int((g / 60).rounded(.up))) phút" }
    if let c = t.phutSao {
      if c <= 0, let g = ManMac.chuGioiHan(t) { return g.tieuDe }
      return c <= 0 ? "Hết sao" : "\(ChuSao.so(ManMac.saoThat(t) ?? c)) sao"
    }
    return ""
  }

  public static let dongKhoiDongLai = "AiiGrow đang khởi động lại"
  public static let dongDangBat = "Máy này do Ba Mẹ quản lý bằng AiiGrow"

  /// Dòng trạng thái đầu menu.
  public static func dongTrangThai(_ t: TrangThai?, matKetNoi: Bool, nhanLuc: Date, bayGio: Date) -> String {
    if matKetNoi || t == nil { return dongKhoiDongLai }
    guard let t else { return dongKhoiDongLai }
    if !t.daGhep { return "Máy chưa ghép — Ba Mẹ cần ghép máy này" }
    if t.cheDo == .khoa { return "Đang khoá" }
    if let g = giayConLai(t, nhanLuc: nhanLuc, bayGio: bayGio) {
      let moThem = (t.moDen ?? .distantPast) > bayGio
      return "Còn \(Int((g / 60).rounded(.up))) phút" + (moThem ? " (Ba Mẹ đang mở máy)" : "")
    }
    if let s = dongSao(t) { return s.prefix(1).uppercased() + s.dropFirst() }
    return "Không giới hạn"
  }

  /// Dòng đầu menu thanh trên cùng (them-hyj1eryo): «● Đã kết nối · còn 18 sao = 18 phút». Chưa ghép / đang khởi động lại giữ nguyên dòng trạng thái.
  public static func dongDauMenu(_ t: TrangThai?, matKetNoi: Bool, nhanLuc: Date, bayGio: Date) -> String {
    let d = dongTrangThai(t, matKetNoi: matKetNoi, nhanLuc: nhanLuc, bayGio: bayGio)
    guard !matKetNoi, let t, t.daGhep, t.laPhienCon else { return d }
    if t.matMang { return "● Mất mạng · sao vẫn trừ" }
    return "● Đã kết nối · " + d.prefix(1).lowercased() + d.dropFirst()
  }

  /// Trạng thái cửa sổ ghép: giữ cửa sổ khi đang hiện cảnh báo «Đã ghép máy, NHƯNG…»; đóng bằng nút X hay «Đã hiểu» đều phải reset sạch (không kẹt cờ).
  public struct CuaSoGhep: Equatable {
    public var giuCanhBao = false
    public var dangGui = false                  // đang chờ phản hồi lệnh ghep: daGhep có thể thành true trước khi `.canhBao` về
    public init() {}
    /// Làm mới định kỳ: không còn cần ghép ⇒ đóng, TRỪ khi đang giữ cảnh báo hoặc đang gửi yêu cầu ghép.
    public func canDong(can: Bool, ep: Bool) -> Bool { !can && !ep && !giuCanhBao && !dangGui }
    public mutating func batDauGui() { dangGui = true }
    public mutating func guiXong() { dangGui = false }
    /// Menu «Ghép máy» khi cửa sổ đã có: luôn đưa lên trước (kể cả cửa sổ cảnh báo bị che).
    public func canDuaLenTruoc(ep: Bool, coCuaSo: Bool) -> Bool { ep && coCuaSo }
    public mutating func hienCanhBao() { giuCanhBao = true }
    /// Cửa sổ đã đóng (nút X, «Đã hiểu» hay đóng bằng mã) ⇒ bỏ cờ giữ.
    public mutating func daDong() { giuCanhBao = false; dangGui = false }
  }

  /// Nút «Kiểm tra cập nhật»: chỉ phiên Ba Mẹ (admin, không phải phiên Con) trên máy đã ghép (chưa ghép thì daemon không tự cập nhật). Daemon vẫn kiểm lại.
  public static func canKiemCapNhat(_ t: TrangThai?, laAdmin: Bool) -> Bool { t?.daGhep == true && t?.laPhienCon != true && laAdmin }

  /// Dòng trạng thái tự cập nhật (daemon trả trong `trangThai`); quá 1 ngày thì ẩn.
  public static func dongCapNhat(_ t: TrangThai?, bayGio: Date) -> String? {
    guard let c = t?.capNhat, !c.isEmpty else { return nil }
    if let l = t?.capNhatLuc, bayGio.timeIntervalSince(l) > 86_400 { return nil }
    return c
  }

  /// Câu trả lời nút «Kiểm tra cập nhật». Daemon cũ (0.1.0) chưa biết lệnh `capNhat` trả `yeu_cau_sai` ⇒ nói rõ cần cài lại gói mới.
  public static func chuKiemCapNhat(_ t: TraLoi) -> String {
    switch t {
    case .thongBao(let c): return c
    case .loi(ma: "yeu_cau_sai", chu: _): return "Dịch vụ AiiGrow trên máy là bản cũ, chưa có nút này — tải và cài gói mới ở trang /tai."
    case .loi(ma: _, chu: let c): return c
    default: return "Đã gửi yêu cầu."
    }
  }

  /// Dòng bản đang chạy ở menu.
  /// Bản daemon đang chạy (nguồn sự thật); tray là bản khác (chưa được nạp lại sau cập nhật) thì nói rõ.
  public static func dongBanDangChay(_ t: TrangThai?, banTray: String = PhienBan.hienTai) -> String {
    guard let d = t?.banDaemon, d != banTray else { return "AiiGrow bản \(t?.banDaemon ?? banTray)" }
    return "AiiGrow bản \(d) (menu này bản \(banTray) — đăng xuất/đăng nhập lại để làm mới)"
  }

  /// Cảnh báo khi Con còn quyền admin (nil = ổn).
  public static func dongCanhBaoAdmin(_ t: TrangThai?) -> String? {
    guard let c = t?.canhBaoAdmin, !c.isEmpty else { return nil }
    return "⚠ " + c
  }

  /// Dòng nhắc về lời xin gần nhất đang chờ / vừa được trả lời (nil = không có gì).
  public static func dongYeuCau(_ ds: [YeuCauDangCho]) -> String? {
    guard let y = ds.last else { return nil }
    let ten = y.ten ?? y.muc.map { HocVienView.tenMucChoi($0) } ?? (y.loai == "mo_web" ? "trang" : "app")
    let vay = y.loai == "vay_sao" || y.loai == "them_gio"
    switch y.trangThai {
    case "cho":
      if y.choMang == true { return "Đã lưu lời xin vay \(ChuSao.so(y.phut ?? 0)) sao · có mạng là AiiGrow tự gửi Ba Mẹ." }
      return vay ? "Đã gửi Ba Mẹ xin vay \(ChuSao.so(y.phut ?? 0)) sao — đang chờ Ba Mẹ trả lời…" : "Đã xin thêm \(ten) vào danh sách — đang chờ Ba Mẹ trả lời…"
    case "duyet":
      if vay { return "\(y.tenNguoiDuyet ?? "Ba Mẹ") cho vay \(ChuSao.so(y.phut ?? 0)) sao!" }
      if y.ketQua == "mo_tam" { return "\(y.tenNguoiDuyet ?? "Ba Mẹ") cho mở \(ten)" + (y.moTamPhut.map { " \($0) phút" } ?? "") + "." }
      return "\(y.tenNguoiDuyet ?? "Ba Mẹ") đã thêm \(ten)!"
    case "tu_choi": return vay ? "Ba Mẹ chưa cho vay sao." : "Ba Mẹ chưa thêm \(ten)."
    default: return nil
    }
  }

  // MARK: tài khoản trên máy

  /// Phân tích kết quả `dscl . -list /Users UniqueID` (mỗi dòng «tên   uid»): user thường uid ≥ 501, bỏ tên bắt đầu «_».
  public static func taiKhoanThuong(dsclRa: String, hienTai: String?) -> [String] {
    var ds: [String] = []
    for dong in dsclRa.split(separator: "\n") {
      let cot = dong.split(whereSeparator: { $0 == " " || $0 == "\t" })
      guard cot.count >= 2, let uid = Int(cot[cot.count - 1]), uid >= 501 else { continue }
      let ten = String(cot[0])
      if ten.hasPrefix("_") || ten == "nobody" { continue }
      ds.append(ten)
    }
    ds.sort()
    let khac = ds.filter { $0 != hienTai }
    return khac.isEmpty ? ds : khac
  }

  /// Phân tích `dscl . -read /Groups/admin GroupMembership`: «GroupMembership: root thanh».
  public static func laAdmin(dsclRa: String, ten: String) -> Bool {
    guard let r = dsclRa.range(of: "GroupMembership:") else { return false }
    return dsclRa[r.upperBound...].split(whereSeparator: { $0 == " " || $0 == "\n" || $0 == "\t" }).contains { $0 == Substring(ten) }
  }

  /// GET ho-so-dns ⇒ (tên tệp an toàn, nội dung .mobileconfig). nil = không có phần Apple.
  public static func tachHoSoDns(_ d: Data) -> (String, String)? {
    guard let o = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any], let a = o["apple"] as? [String: Any],
          let noi = a["mobileconfig"] as? String, !noi.isEmpty else { return nil }
    let goc = (a["tep"] as? String) ?? "AiiGrow-DNS.mobileconfig"
    let sach = String(goc.filter { $0.isASCII && ($0.isLetter || $0.isNumber || "-_.".contains($0)) }.prefix(80))
    return (sach.hasSuffix(".mobileconfig") && !sach.hasPrefix(".") ? sach : "AiiGrow-DNS.mobileconfig", noi)
  }

  /// Mã ghép: chỉ giữ chữ số, tối đa 6.
  public static func locMa(_ s: String) -> String { String(s.filter { $0.isASCII && $0.isNumber }.prefix(6)) }
  public static func maHopLe(_ s: String) -> Bool { s.count == 6 && s.allSatisfy { $0.isASCII && $0.isNumber } }
}

/// Nhắc «còn 5 phút» / «còn 1 phút»: mỗi mốc nhắc đúng một lần, qua mốc cao hơn (được thêm giờ) thì nhắc lại được.
public struct NhacGio {
  public private(set) var daNhac: Set<Int> = []
  public init() {}
  /// - Returns: 5 hoặc 1 nếu cần nhắc ngay, nil nếu không.
  public mutating func xet(giayConLai: Double?) -> Int? {
    guard let g = giayConLai else { daNhac = []; return nil }
    if g > 5 * 60 + 5 { daNhac = [] }
    if g <= 0 { return nil }
    if g <= 60 { return daNhac.insert(1).inserted ? 1 : nil }
    if g <= 5 * 60 { return daNhac.insert(5).inserted ? 5 : nil }
    return nil
  }
}
