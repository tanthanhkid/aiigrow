// Logic THUẦN của các màn Mac làm lại theo thiết kế `docs/thiet-ke-chot/con-cai-mac` (60 màn, 06/11) — tách khỏi SwiftUI để test được:
// màn chọn tên + PIN (10–16), màn khoá theo bé (33, 35, 40, 58), đổi sao lấy giờ (49–51), quà bảng giá (23–25), ghép máy (03–09).
import Foundation
import AiiGrowCore

/// Ô PIN 4 số (bàn phím số trên màn + phím thật).
public struct PinNhap: Equatable {
  public private(set) var so = ""
  public init() {}
  public var du: Bool { so.count == 4 }
  public mutating func them(_ c: Character) { guard so.count < 4, c.isASCII, c.isNumber else { return }; so.append(c) }
  public mutating func xoa() { if !so.isEmpty { so.removeLast() } }
  public mutating func lamLai() { so = "" }
}

/// Bước của màn chọn tên (máy khoá).
public enum BuocChonTen: Equatable {
  case chonTen
  case pin(HoSoBe)
  case quenPin(HoSoBe)
  case baMeMa
}

/// Màn ghép máy đang hiện (03 / 05 / 06 / 07 / 08 / 09).
public enum ManGhep: Equatable { case nhap, maSai, hetHan, matMang, batQuyen, xong }

public enum ManMac {
  /// Máy dùng chung chưa ai vào ⇒ màn chọn tên che máy (chỉ phiên Con, đã ghép).
  public static func canChonTen(_ t: TrangThai?) -> Bool { t?.laPhienCon == true && t?.daGhep == true && t?.nguoiDung == "chua" }
  /// «Ba Mẹ đang dùng máy» còn hạn.
  public static func baMeDangDung(_ t: TrangThai?, bayGio: Date) -> Bool {
    guard t?.laPhienCon == true, t?.nguoiDung == "ba_me" else { return false }
    return (t?.baMeDungDen ?? .distantFuture) > bayGio
  }

  /// «0:15».
  public static func dongHoCho(_ giay: Int) -> String { String(format: "%d:%02d", max(0, giay) / 60, max(0, giay) % 60) }

  /// «06:30» → «6:30».
  public static func gio(_ s: String) -> String {
    guard s.count == 5, s.hasPrefix("0") else { return s }
    return String(s.dropFirst())
  }
  /// «21:30 – 6:30».
  public static func khung(_ k: KhungGio?) -> String? { k.map { gio($0.tu) + " – " + gio($0.den) } }

  /// Chữ cái đầu của tên gọi (chữ cuối của «Bảo Anh» ⇒ «A»? thiết kế dùng «B» cho Bảo Anh, «M» cho Bảo Minh: chữ đầu tiếng cuối khi trùng họ đệm).
  /// Thiết kế: Bảo Anh = B, Bảo Minh = M ⇒ bé đầu tiên lấy chữ đầu, bé trùng chữ đầu với bé trước lấy chữ đầu của tiếng cuối.
  public static func chuCai(_ ds: [HoSoBe]) -> [String: String] {
    var kq: [String: String] = [:], daDung = Set<String>()
    for b in ds {
      let tieng = b.ten.split(separator: " ").map(String.init)
      let dau = tieng.first.flatMap { $0.first.map { String($0).uppercased() } } ?? "?"
      let cuoi = tieng.last.flatMap { $0.first.map { String($0).uppercased() } } ?? dau
      let c = daDung.contains(dau) ? cuoi : dau
      kq[b.id] = c; daDung.insert(c)
    }
    return kq
  }

  /// Câu trên màn PIN sau một lần thử.
  public static func cauPin(_ ketQua: String, conLan: Int?) -> String? {
    switch ketQua {
    case "pin_sai": return "Chưa đúng · còn \(conLan ?? 0) lần thử"
    case "can_pin", "pin_sai_dang": return "Con nhập PIN 4 số nhé."
    default: return nil
    }
  }

  /// Lỗi lệnh ghép ⇒ màn (05 mã sai / 06 hết hạn / 07 mất mạng); nil = lỗi khác (hiện chữ máy chủ).
  public static func manLoiGhep(_ ma: String) -> ManGhep? {
    switch ma {
    case "ma_sai", "khong_thay_ma", "ma_khong_dung": return .maSai
    case "ma_het_han", "het_han": return .hetHan
    case "mat_mang": return .matMang
    default: return nil
    }
  }

  /// «482 017».
  public static func maHien(_ s: String) -> String { s.count == 6 ? String(s.prefix(3)) + " " + String(s.suffix(3)) : s }

  // MARK: màn khoá theo bé

  public struct ChuKhoa: Equatable {
    public var tieuDe: String
    public var phu: String
    public var nhan: String?           // viên trên tiêu đề: «Giờ ngủ 21:30 – 6:30»
    public var ngoaiLe: Bool           // chỉ «Xin Ba Mẹ mở ngoại lệ» (không thêm giờ, không đổi sao)
  }

  public static func chuKhoa(_ t: TrangThai) -> ChuKhoa {
    let ten = t.beTen ?? t.tenCon ?? "Con"
    switch t.lyDoKhoa {
    case "het_gio":
      let tong = t.quyTongPhut
      return ChuKhoa(tieuDe: "Hết giờ chơi hôm nay", phu: tong.map { "\(ten) đã chơi đủ \($0) / \($0) phút. Giỏi lắm!" } ?? "\(ten) đã chơi đủ giờ hôm nay. Giỏi lắm!",
                     nhan: nil, ngoaiLe: false)
    case "gio_ngu":
      let mo = t.gioNgu.map { "Máy mở lại lúc \(gio($0.den)) sáng mai. " } ?? ""
      return ChuKhoa(tieuDe: "Đến giờ ngủ rồi", phu: mo + "Chúc \(ten) ngủ ngon!", nhan: khung(t.gioNgu).map { "Giờ ngủ " + $0 }, ngoaiLe: true)
    default:
      return ChuKhoa(tieuDe: "Ba Mẹ đang khoá máy", phu: "Mở lại là máy báo con ngay. Cần gấp thì con xin Ba Mẹ mở ngoại lệ nhé.", nhan: nil, ngoaiLe: true)
    }
  }

  // MARK: đổi sao lấy giờ (49–51)

  public struct DoiSao: Equatable {
    public var saoCan: Int
    public var conSao: Int
    public var du: Bool
    public var thieu: Int
  }
  /// `phut10Sao` = số phút của 10 sao (thiết kế: 10 sao = 10 phút).
  public static func doiSao(phut: Int, sao: Int, phut10Sao: Int) -> DoiSao {
    let can = DungSao.saoCan(phut: phut, phut10Sao: phut10Sao)
    return DoiSao(saoCan: can, conSao: max(0, sao - can), du: sao >= can, thieu: max(0, can - sao))
  }
  /// Nút −/+ đổi theo bậc 10 phút, 10…60.
  public static func buocPhut(_ p: Int, them: Bool) -> Int { min(60, max(10, p + (them ? 10 : -10))) }

  // MARK: quà bảng giá (23)

  /// Dòng phụ của một quà: «Đã đổi hôm qua · chờ Ba Mẹ trao» / «Chỉ cuối tuần · còn thiếu 270 sao» / «Còn thiếu 20 sao» / «Đủ sao rồi».
  public static func dongQua(_ q: HvQua, bayGio: Date = Date(), lich: Calendar = .current) -> String {
    if let tu = q.choTraoTu {
      let ngay = lich.isDate(tu, inSameDayAs: bayGio) ? "hôm nay" : lich.isDate(tu, inSameDayAs: bayGio.addingTimeInterval(-86_400)) ? "hôm qua" : "trước đó"
      return "Đã đổi \(ngay) · chờ Ba Mẹ trao"
    }
    var phan: [String] = []
    if q.chiCuoiTuan { phan.append("Chỉ cuối tuần") }
    if !q.conHopLe {
      if q.lyDoKhong == "chi_cuoi_tuan" { if !q.chiCuoiTuan { phan.append("Chỉ cuối tuần") } }
      else if let l = HocVienView.lyDoKhongDoi(q) { phan.append(l) }
    }
    if !q.moTa.isEmpty && !q.chiCuoiTuan { phan.append(q.moTa) }
    if q.conThieu > 0 { phan.append(phan.isEmpty ? "Còn thiếu \(q.conThieu) sao" : "còn thiếu \(q.conThieu) sao") }
    else if phan.isEmpty { phan.append("Đủ sao rồi") }
    return phan.joined(separator: " · ")
  }

  // MARK: nhiệm vụ (20)

  /// (chờ Ba Mẹ duyệt, chưa làm) theo thiết kế.
  public static func nhomNhiemVu(_ ds: [HvNhiemVu]) -> (choDuyet: [HvNhiemVu], chuaLam: [HvNhiemVu]) {
    let cho = ds.filter { $0.dangCho > 0 && !["san_sang", "can_bo_sung"].contains($0.trangThai) }
    let chua = ds.filter { ["san_sang", "dang_lam", "can_bo_sung"].contains($0.trangThai) && !cho.contains($0) }
    return (cho, chua)
  }

  /// «Thứ Ba · 19:30».
  public static func thuGio(_ d: Date) -> String {
    let thu = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"]
    let c = Calendar.current.dateComponents([.weekday, .hour, .minute], from: d)
    return "\(thu[((c.weekday ?? 1) - 1) % 7]) · " + String(format: "%02d:%02d", c.hour ?? 0, c.minute ?? 0)
  }
}
