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

  public static func tieuDeKhoa(_ lyDo: String?) -> String {
    switch lyDo {
    case "het_gio": return "Hết giờ dùng máy hôm nay"
    case "gio_ngu": return "Đến giờ nghỉ rồi"
    default: return "Máy đang được Ba Mẹ khoá"
    }
  }

  public static func goiYKhoa(_ lyDo: String?) -> String {
    switch lyDo {
    case "het_gio": return "Con lưu bài đang làm nhé. Con có thể xin Ba Mẹ thêm thời gian."
    case "gio_ngu": return "Máy sẽ mở lại khi hết giờ nghỉ. Cần gấp thì xin Ba Mẹ nhé."
    default: return "Con có thể nhắn xin Ba Mẹ mở máy."
    }
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

  /// Chữ cạnh biểu tượng trên thanh menu.
  public static func tieuDeThanh(_ t: TrangThai?, matKetNoi: Bool, nhanLuc: Date, bayGio: Date) -> String {
    if matKetNoi || t == nil { return "" }
    guard let t else { return "" }
    if !t.daGhep { return "Chưa ghép" }
    if !t.laPhienCon { return "" }
    if t.cheDo == .khoa { return "Đang khoá" }
    if let g = giayConLai(t, nhanLuc: nhanLuc, bayGio: bayGio) { return "Còn \(Int((g / 60).rounded(.up))) phút" }
    return ""
  }

  public static let dongKhoiDongLai = "AiiGrow đang khởi động lại"
  public static let dongDangBat = "AiiGrow đang bật — Ba Mẹ quản lý máy này"

  /// Dòng trạng thái đầu menu.
  public static func dongTrangThai(_ t: TrangThai?, matKetNoi: Bool, nhanLuc: Date, bayGio: Date) -> String {
    if matKetNoi || t == nil { return dongKhoiDongLai }
    guard let t else { return dongKhoiDongLai }
    if !t.daGhep { return "Máy chưa ghép — Ba Mẹ cần ghép máy này" }
    if t.cheDo == .khoa { return "Đang khoá" }
    if let g = giayConLai(t, nhanLuc: nhanLuc, bayGio: bayGio) {
      let moThem = (t.moDen ?? .distantPast) > bayGio
      return "Còn \(Int((g / 60).rounded(.up))) phút" + (moThem ? " (Ba Mẹ đã thêm giờ)" : " hôm nay")
    }
    return "Không giới hạn giờ hôm nay"
  }

  /// Dòng nhắc về lời xin gần nhất đang chờ / vừa được trả lời (nil = không có gì).
  public static func dongYeuCau(_ ds: [YeuCauDangCho]) -> String? {
    guard let y = ds.last else { return nil }
    let loai = y.loai == "them_gio" ? "thêm giờ" : (y.loai == "mo_web" ? "mở trang" : "mở app")
    switch y.trangThai {
    case "cho": return "Đã gửi Ba Mẹ xin \(loai) — đang chờ Ba Mẹ trả lời…"
    case "duyet": return y.loai == "them_gio" ? "Ba Mẹ đã cho thêm giờ. Học tốt nhé!" : "Ba Mẹ đã đồng ý cho \(loai)."
    case "tu_choi": return "Ba Mẹ chưa đồng ý lần này."
    default: return nil
    }
  }

  public static func nhanLuaChonPhut(_ p: Int) -> String {
    p % 60 == 0 ? "\(p / 60) giờ" : "\(p) phút"
  }
  public static let luaChonPhut = [30, 60, 120]

  public static func tenMucNguoiDung(_ cheDo: CheDo) -> String {
    switch cheDo { case .tuDo: return "Tự do"; case .hoc: return "Chỉ app học"; case .khoa: return "Đang khoá" }
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
