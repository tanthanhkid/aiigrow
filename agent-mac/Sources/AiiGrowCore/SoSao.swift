// Sổ sao 15/11 (#263–#266, docs/API.md «Sổ sao 15/11»): 1 sao = 1 phút cho app / web nhóm «Tính phút», số dư ÂM khi đang nợ Ba Mẹ.
// Máy chủ gửi `sao {sao, no, phutCon, saoVayChuaTieu, hetSao, canhBaoNo}` ở gốc dong-bo (null = máy dùng chung chưa chọn Con).
// Chữ hiển thị thống nhất mọi nền: «còn 18 sao = 18 phút chơi», «−20 sao» (dấu trừ U+2212), «Đang nợ Ba Mẹ 20 sao · sao nhiệm vụ trả nợ trước».
import Foundation

public struct SoSao: Codable, Equatable, Sendable {
  /// Số dư Con thấy — âm khi đang nợ.
  public var sao: Int
  /// Nợ Ba Mẹ còn lại (≥ 0, không trần).
  public var no: Int
  /// Sao tiêu được ngay = phút «Tính phút» còn chơi.
  public var phutCon: Int
  public var saoVayChuaTieu: Int
  public var hetSao: Bool
  /// Nợ > 1.000.
  public var canhBaoNo: Bool

  public init(sao: Int, no: Int = 0, phutCon: Int? = nil, saoVayChuaTieu: Int = 0, hetSao: Bool? = nil, canhBaoNo: Bool = false) {
    self.sao = sao; self.no = max(0, no)
    let pc = max(0, phutCon ?? max(0, sao))
    self.phutCon = pc; self.saoVayChuaTieu = saoVayChuaTieu
    self.hetSao = hetSao ?? (pc <= 0)
    self.canhBaoNo = canhBaoNo
  }

  /// Đọc khoan dung một object JSON (`sao` của dong-bo, `soSao` của tong-quan). Thiếu `sao` ⇒ nil.
  public static func doc(_ v: Any?) -> SoSao? {
    guard let o = v as? [String: Any], let s = (o["sao"] as? NSNumber)?.doubleValue, s.isFinite else { return nil }
    let so = { (k: String) in (o[k] as? NSNumber).map { Int($0.doubleValue.rounded(.down)) } }
    return SoSao(sao: Int(s.rounded(.down)), no: so("no") ?? 0, phutCon: so("phutCon"), saoVayChuaTieu: so("saoVayChuaTieu") ?? 0,
                 hetSao: o["hetSao"] as? Bool, canhBaoNo: (o["canhBaoNo"] as? Bool) ?? false)
  }
}

/// Chữ sao dùng chung (daemon + tray).
public enum ChuSao {
  public static let tru = "\u{2212}"

  /// 1020 ⇒ «1.020», −20 ⇒ «−20».
  public static func so(_ n: Int) -> String {
    let a = String(abs(n))
    var ra = ""
    for (i, c) in a.reversed().enumerated() { if i > 0 && i % 3 == 0 { ra.append(".") }; ra.append(c) }
    return (n < 0 ? tru : "") + String(ra.reversed())
  }
  /// «30 sao», «−20 sao».
  public static func vien(_ n: Int) -> String { so(n) + " sao" }
  /// «còn 18 sao = 18 phút chơi».
  public static func phut(_ n: Int) -> String { let s = so(max(0, n)); return "còn \(s) sao = \(s) phút chơi" }
  /// «Đang nợ Ba Mẹ 20 sao · sao nhiệm vụ trả nợ trước» (không nợ ⇒ nil).
  public static func no(_ n: Int) -> String? { n > 0 ? "Đang nợ Ba Mẹ \(so(n)) sao · sao nhiệm vụ trả nợ trước" : nil }
  /// Câu chung (như agent-win `SaoView.TraNoTruocHoa`): thêm vào tin «Ba Mẹ đã duyệt …» khi Con đang nợ — KHÔNG kèm số (tin duyệt không mang số nợ).
  public static let traNoTruocHoa = "Sao nhiệm vụ trả nợ trước"
  /// Thẻ «Chờ Ba Mẹ duyệt»: không nợ ⇒ «+20 sao chờ Ba Mẹ duyệt»; đang nợ ⇒ thêm «· Trả nợ 15 sao trước · con còn 5 sao» / «· Trả nợ 10 sao · còn nợ 5 sao».
  public static func choDuyet(_ choDuyet: Int, no: Int) -> String {
    let dau = "+\(so(max(0, choDuyet))) sao chờ Ba Mẹ duyệt"
    guard no > 0, choDuyet > 0, let tra = traNoKhiDuyet(cong: choDuyet, noTruoc: no) else { return dau }
    return dau + " · " + tra
  }
  /// Phần trả nợ của thẻ «Chờ Ba Mẹ duyệt» (`noTruoc` = nợ HIỆN CÓ, `cong` = sao đang chờ duyệt). Không nợ / không có sao ⇒ nil.
  public static func traNoKhiDuyet(cong: Int, noTruoc: Int) -> String? {
    guard noTruoc > 0, cong > 0 else { return nil }
    let tra = min(noTruoc, cong)
    return cong > noTruoc ? "Trả nợ \(so(tra)) sao trước · con còn \(so(cong - noTruoc)) sao" : "Trả nợ \(so(tra)) sao · còn nợ \(so(noTruoc - tra)) sao"
  }
  /// Mức vay Con chọn (máy chủ `mucVay`, mặc định 15).
  public static let mucVay = [10, 15, 30]
  public static let vayMacDinh = 15
  /// «= 15 phút chơi hoặc đổi quà · con sẽ nợ Ba Mẹ 15 sao».
  public static func cauVay(_ soSao: Int) -> String { "= \(so(soSao)) phút chơi hoặc đổi quà · con sẽ nợ Ba Mẹ \(so(soSao)) sao" }
}

/// Chế độ app & web của Con (#262): «Mở hết» (không chặn, không trừ sao) | «Theo danh sách» (danh sách trắng).
public enum CheDoApp {
  public static let moHet = "mo_het"
  public static let theoDanhSach = "theo_danh_sach"
}

/// `GET api/device/yeu-cau/:id` (#258 / #263): `status` duoc | cho | tu_choi (cũ) + `trangThai` nguyên văn + kết quả lời xin app / web.
public struct KetQuaLoiXin: Equatable, Sendable {
  public var status: String
  public var trangThai: String?
  /// cho | da_them | mo_tam | chua_them | het_han | huy (chỉ lời xin app / web; vay sao ⇒ nil).
  public var ketQua: String?
  /// tinh_phut | khong_tinh_phut (khi da_them).
  public var nhom: String?
  public var muc: String?
  public var tenNguoiDuyet: String?
  public var loiNhan: String?
  /// `mo_tam`: cho mở tạm tới lúc này.
  public var moTamDen: Date?
  public var moTamPhut: Int?
  public init(status: String, trangThai: String? = nil, ketQua: String? = nil, nhom: String? = nil, muc: String? = nil,
              tenNguoiDuyet: String? = nil, loiNhan: String? = nil, moTamDen: Date? = nil, moTamPhut: Int? = nil) {
    self.status = status; self.trangThai = trangThai; self.ketQua = ketQua; self.nhom = nhom; self.muc = muc
    self.tenNguoiDuyet = tenNguoiDuyet; self.loiNhan = loiNhan; self.moTamDen = moTamDen; self.moTamPhut = moTamPhut
  }

  public static func doc(_ d: Data) -> KetQuaLoiXin? {
    guard let o = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any] else { return nil }
    let s = { (k: String) in (o[k] as? String).flatMap { $0.isEmpty ? nil : $0 } }
    let mt = o["moTam"] as? [String: Any]
    return KetQuaLoiXin(status: s("status") ?? "cho", trangThai: s("trangThai"), ketQua: s("ketQua"), nhom: s("nhom"), muc: s("muc"),
                        tenNguoiDuyet: s("tenNguoiDuyet"), loiNhan: s("loiNhan"),
                        moTamDen: NgayGio.doc(mt?["den"] as? String), moTamPhut: (mt?["phut"] as? NSNumber)?.intValue)
  }

  /// Trạng thái cho tray: cho | duyet | tu_choi | het_han.
  public var trangThaiTray: String {
    switch ketQua {
    case "da_them", "mo_tam": return "duyet"
    case "chua_them": return "tu_choi"
    case "het_han", "huy": return "het_han"
    case "cho": return "cho"
    default: break
    }
    if ["het_han", "huy"].contains(trangThai ?? "") { return "het_han" }
    switch status { case "duoc": return "duyet"; case "tu_choi": return "tu_choi"; default: return "cho" }
  }
}
