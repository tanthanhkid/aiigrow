// Mô hình phản hồi máy chủ cho máy iPhone/iPad (platform "ios"). Chỉ Foundation — không đụng API hệ thống, để test thuần.
//   POST api/device/nhip ⇒ { serverTime, tuanThu, chinhSach, nenTang, lenh[] }   (server/lib/nhip-may.ts)
//   nenTang = chuyenDoi(chinhSach, "ios")                                           (server/lib/chuyen-doi.ts, case "ios")
import Foundation

/// JSON tự do — `cauHinh` của từng mục nền tảng có hình dạng khác nhau.
public enum JSON: Codable, Equatable {
  case so(Double), chuoi(String), bool(Bool), mang([JSON]), doiTuong([String: JSON]), rong

  public init(from decoder: Decoder) throws {
    let c = try decoder.singleValueContainer()
    if c.decodeNil() { self = .rong }
    else if let b = try? c.decode(Bool.self) { self = .bool(b) }
    else if let d = try? c.decode(Double.self) { self = .so(d) }
    else if let s = try? c.decode(String.self) { self = .chuoi(s) }
    else if let a = try? c.decode([JSON].self) { self = .mang(a) }
    else { self = .doiTuong(try c.decode([String: JSON].self)) }
  }

  public func encode(to encoder: Encoder) throws {
    var c = encoder.singleValueContainer()
    switch self {
    case .so(let d): try c.encode(d)
    case .chuoi(let s): try c.encode(s)
    case .bool(let b): try c.encode(b)
    case .mang(let a): try c.encode(a)
    case .doiTuong(let o): try c.encode(o)
    case .rong: try c.encodeNil()
    }
  }

  public subscript(k: String) -> JSON? { if case .doiTuong(let o) = self { return o[k] }; return nil }
  public var chuoi: String? { if case .chuoi(let s) = self { return s }; return nil }
  public var so: Double? { if case .so(let d) = self { return d }; return nil }
  public var bool: Bool? { if case .bool(let b) = self { return b }; return nil }
  public var mang: [JSON]? { if case .mang(let a) = self { return a }; return nil }
  public var dsChuoi: [String] { mang?.compactMap(\.chuoi) ?? [] }
  public var khung: Khung? {
    guard let tu = self["tu"]?.chuoi, let den = self["den"]?.chuoi else { return nil }
    return Khung(tu: tu, den: den)
  }
  public var dsKhung: [Khung] { mang?.compactMap(\.khung) ?? [] }
}

public struct Khung: Codable, Equatable {
  public var tu: String, den: String
  public init(tu: String, den: String) { self.tu = tu; self.den = den }
  /// "HH:mm" ⇒ phút trong ngày; "24:00" ⇒ 1440.
  public static func phut(_ s: String) -> Int {
    let p = s.split(separator: ":").compactMap { Int($0) }
    guard p.count == 2 else { return 0 }
    return max(0, min(1440, p[0] * 60 + p[1]))
  }
  public var tuPhut: Int { Khung.phut(tu) }
  public var denPhut: Int { Khung.phut(den) }
  /// Phút `m` (0…1439) có nằm trong khung không — khung qua nửa đêm (tu > den) được hiểu là hai đoạn.
  public func chua(_ m: Int) -> Bool {
    let a = tuPhut, b = denPhut
    if a == b { return false }
    return a < b ? (m >= a && m < b) : (m >= a || m < b)
  }
}

public struct MucChung: Codable, Equatable { public var muc: String; public var kieu: String }

public struct ChinhSach: Codable {
  public struct May: Codable { public var id: String; public var ten: String; public var nen: String; public var dungChung: Bool }
  public struct Con: Codable { public var id: String; public var ten: String }
  public struct GioChoi: Codable {
    public var ngayThuong: [Khung]; public var cuoiTuan: [Khung]; public var ngu: Khung
    public var tranNgayPhut: Int; public var tranTuanPhut: Int
  }
  public struct UngDung: Codable {
    public var hoc: [MucChung]; public var giaiTri: [MucChung]; public var chan: [MucChung]
    /// 05/11 (máy chủ cũ): chế độ của Con — chi_app_duoc_phep | mo_het. #258: không còn lưới web cấm cứng (`webLuonChan` máy chủ gửi [] — agent bỏ qua).
    public var cheDoChan: String? = nil
    /// 15/11 (#262): theo_danh_sach (danh sách trắng: Giải trí = «Tính phút», Học = «Không tính phút») | mo_het (không chặn, không đếm). Máy chủ cũ: nil.
    public var cheDo: String? = nil
  }
  /// 15/11 (#263–#266, server/lib/so-sao.ts): sổ sao của bé — `sao` số dư Con thấy (ÂM khi nợ), `phutCon` = sao tiêu được = phút «Tính phút» còn chơi.
  public struct SaoCon: Codable, Equatable {
    public struct Cau: Codable, Equatable { public var soDu: String?; public var phut: String?; public var no: String? }
    public var sao: Int
    public var no: Int?
    public var phutCon: Int
    public var saoVayChuaTieu: Int?
    public var hetSao: Bool?
    public var canhBaoNo: Bool?
    public var cau: Cau?
    /// 16/11 (#302): sao THẬT tiêu được (`phutCon` đã kẹp theo giới hạn ngày/lượt nên có thể nhỏ hơn). Máy chủ cũ: nil ⇒ dùng `phutCon`.
    public var saoTieuDuoc: Int?
    /// chỉ `GET hoc-vien/sao`
    public var mucVay: [Int]?
    public var vayMacDinh: Int?
    public init(sao: Int, no: Int? = nil, phutCon: Int, hetSao: Bool? = nil) { self.sao = sao; self.no = no; self.phutCon = phutCon; self.hetSao = hetSao }
    public var soNo: Int { max(0, no ?? 0) }
    public var het: Bool { hetSao ?? (phutCon <= 0) }
    /// Số sao thật Con có thể tiêu (hiện «X sao»).
    public var saoThat: Int { saoTieuDuoc ?? phutCon }
  }
  /// 16/11 (#302, server/lib/gioi-han-choi.ts): giới hạn giờ chơi — tối đa mỗi ngày + mỗi lượt N phút rồi nghỉ đúng N phút. Máy chủ cũ: không gửi ⇒ nil ⇒ chạy như trước.
  /// GIỚI HẠN iOS: DeviceActivity không hẹn được mốc mở khoá chính xác lúc hết nghỉ khi app bị treo — khiên chỉ gỡ ở lần đồng bộ / ngưỡng DeviceActivity kế tiếp
  /// (máy chủ ép `nextCheckSec` ≤ hết nghỉ nên app đồng bộ sớm nhất có thể). Chữ «chơi tiếp lúc HH:MM» là giờ dự kiến.
  /// Khoá thật đã nằm trong `sao.phutCon` / `sao.hetSao` (kẹp sẵn); khối này chỉ để hiện đúng chữ + biết giờ chơi tiếp.
  public struct GioiHan: Codable, Equatable {
    public var apDung: Bool
    public var ngayPhut: Int?
    public var daChoi: Int?
    public var conNgay: Int?
    public var luotPhut: Int?
    public var luotDaChoi: Int?
    public var conLuot: Int?
    public var dangNghi: Bool?
    public var nghiDen: String?
    public var nghiDenGio: String?
    public var hetNgay: Bool?
    /// het_gio_ngay | dang_nghi | nil
    public var lyDoKhoa: String?
    public var phutToiDa: Int?
    public var cau: String?
    public init(apDung: Bool = true, ngayPhut: Int? = nil, daChoi: Int? = nil, conNgay: Int? = nil, lyDoKhoa: String? = nil, nghiDen: String? = nil,
                nghiDenGio: String? = nil, phutToiDa: Int? = nil, cau: String? = nil) {
      self.apDung = apDung; self.ngayPhut = ngayPhut; self.daChoi = daChoi; self.conNgay = conNgay; self.lyDoKhoa = lyDoKhoa
      self.nghiDen = nghiDen; self.nghiDenGio = nghiDenGio; self.phutToiDa = phutToiDa; self.cau = cau
    }
    public var dangNghiThat: Bool { apDung && lyDoKhoa == "dang_nghi" }
    public var hetGioNgay: Bool { apDung && lyDoKhoa == "het_gio_ngay" }
    /// Đang khoá vì giới hạn (không phải vì hết sao).
    public var dangKhoa: Bool { dangNghiThat || hetGioNgay }
    /// «HH:MM» chơi tiếp (giờ gia đình do máy chủ tính; thiếu thì đọc từ `nghiDen` theo múi giờ `tz`).
    public func gioChoiTiep(tz: String? = nil) -> String? {
      if let g = nghiDenGio, !g.isEmpty { return g }
      guard let d = NgayISO.doc(nghiDen) else { return nil }
      var c = Calendar(identifier: .gregorian)
      c.timeZone = tz.flatMap { TimeZone(identifier: $0) } ?? .current
      let h = c.dateComponents([.hour, .minute], from: d)
      return String(format: "%02d:%02d", h.hour ?? 0, h.minute ?? 0)
    }
    /// Tiêu đề màn khoá; nil khi không khoá vì giới hạn.
    public func tieuDe() -> String? { dangNghiThat ? "Nghỉ một chút" : (hetGioNgay ? "Hôm nay chơi đủ rồi" : nil) }
    /// Dòng phụ màn khoá / khiên: «Nghỉ một chút · chơi tiếp lúc HH:MM» hoặc `cau` của máy chủ.
    public func cauPhu(tz: String? = nil) -> String? {
      if dangNghiThat {
        if let g = gioChoiTiep(tz: tz) { return "Nghỉ một chút · chơi tiếp lúc \(g)" }
        return cau ?? "Nghỉ một chút rồi chơi tiếp nhé"
      }
      if hetGioNgay { return (cau?.isEmpty == false ? cau : nil) ?? "Hôm nay chơi đủ rồi — mai chơi tiếp nhé" }
      return nil
    }
    /// «Còn X phút hôm nay» khi có trần ngày và chưa khoá.
    public var conHomNay: Int? { apDung && !dangKhoa ? conNgay.map { max(0, $0) } : nil }
  }
  /// 05/11: quỹ phút chơi hôm nay (server/lib/quy-gio.ts) — mọi app Giải trí dùng chung; `daDung` = phút đã dùng (mọi máy).
  public struct Quy: Codable, Equatable {
    public var ngayPhut: Int; public var themPhut: Int; public var daDung: Int; public var conPhut: Int
    public var dangHoc: Bool?
    /// «10 sao = X phút»: `{sao: 10, phut: X}`.
    public var tyLe: TyLe?
    public struct TyLe: Codable, Equatable { public var sao: Int; public var phut: Int }
    public init(ngayPhut: Int, themPhut: Int, daDung: Int, conPhut: Int, dangHoc: Bool? = nil) {
      self.ngayPhut = ngayPhut; self.themPhut = themPhut; self.daDung = daDung; self.conPhut = conPhut; self.dangHoc = dangHoc
    }
  }
  /// Giờ học (chỉ app Học): `thu` 0 = CN … 6 = T7.
  public struct GioHoc: Codable, Equatable { public var tu: String; public var den: String; public var thu: [Int] }
  /// Ngoại lệ Ba Mẹ mở: `muc` nil = cả máy; `nhom` = nhóm máy (may_tinh | ios | android).
  public struct NgoaiLeMo: Codable, Equatable { public var den: String; public var muc: String?; public var nhom: String? }
  public struct NgoaiLe: Codable { public var phutThemHomNay: Int; public var moKhanCapDen: String? }
  public struct HieuLuc: Codable { public var giaiTriDuocMo: Bool; public var lyDo: [String] }
  /// Phiên «Chơi bằng điểm» đang chạy (server/lib/chinh-sach.ts › phienDiem.phien): Con mở trên app AiiGrow (màn Con /tre/choi) hay máy khác.
  public struct PhienDang: Codable, Equatable {
    public var id: String; public var muc: String; public var conPhut: Int
    /// Máy mở phiên (máy chủ mới gửi). Khác máy này ⇒ không gỡ khiên ở đây (phiên mở trên máy tính không mở iPhone).
    public var may: String?
    public init(id: String, muc: String, conPhut: Int, may: String? = nil) { self.id = id; self.muc = muc; self.conPhut = conPhut; self.may = may }
  }
  public struct PhienDiem: Codable { public var soDu: Int?; public var phien: PhienDang? }

  public var serverTime: String
  public var tz: String
  public var may: May
  public var con: Con?
  public var gioChoi: GioChoi
  public var ungDung: UngDung
  public var khoaNgay: Bool
  public var ngoaiLe: NgoaiLe
  public var gioMaySai: Bool
  public var hieuLuc: HieuLuc
  /// Máy chủ cũ không gửi ⇒ nil (không có phiên điểm).
  public var phienDiem: PhienDiem?
  // ---- 05/11 — máy chủ cũ không gửi ⇒ nil ⇒ chạy luật cũ (trần + khung giờ chơi)
  public var quy: Quy?
  public var gioHoc: GioHoc?
  public var ngoaiLeMo: [NgoaiLeMo]?
  /// 15/11: sổ sao — nil = máy chủ cũ, hoặc máy chung chưa chọn bé.
  public var sao: SaoCon? = nil
  /// 16/11 (#302): giới hạn ngày + mỗi lượt. Máy chủ cũ / máy chung chưa chọn bé: nil.
  public var gioiHan: GioiHan? = nil
}

public struct MucNenTang: Codable {
  public var khaNang: String; public var mucDo: String; public var coChe: String
  public var cauHinh: [String: JSON]?
}

public struct NenTang: Codable {
  public var nen: String
  public var nhipGiay: Int?
  public var muc: [MucNenTang]
  public func cauHinh(_ khaNang: String) -> [String: JSON] { muc.first { $0.khaNang == khaNang }?.cauHinh ?? [:] }
}

public struct Lenh: Codable, Equatable { public var id: String; public var loai: String }

/// Phản hồi `POST api/device/nhip`. `grantEndsAt` / `moDen`: hạn «thêm giờ đã duyệt» — máy chủ hiện CHƯA trả cho iOS (xem CAN-SERVER.md);
/// đọc nếu có, không có thì dùng `chinhSach.ngoaiLe.moKhanCapDen`.
public struct NhipTraVe: Codable {
  public var serverTime: String
  public var chinhSach: ChinhSach
  public var nenTang: NenTang
  public var lenh: [Lenh]
  public var grantEndsAt: String?
  public var moDen: String?
  /// Bí mật mã mở offline (TOTP, server/lib/ma-offline.ts) — app nhớ trong Keychain để tự kiểm mã Ba Mẹ đọc khi mất mạng.
  /// Chỉ gửi khi vân app báo (`NhipGui.maOfflineVan`) lệch; máy chủ cũ: nil.
  public var maOfflineBiMat: String?
  /// 06/11 (S3): ai đang dùng máy (con | ba_me | chua) — máy chủ cũ: nil.
  public var nguoiDung: NguoiDungMay?
}

public enum NgayISO {
  private static func f(_ phanGiay: Bool) -> ISO8601DateFormatter {
    let x = ISO8601DateFormatter()
    x.formatOptions = phanGiay ? [.withInternetDateTime, .withFractionalSeconds] : [.withInternetDateTime]
    return x
  }
  public static func doc(_ s: String?) -> Date? {
    guard let s, !s.isEmpty else { return nil }
    return f(true).date(from: s) ?? f(false).date(from: s)
  }
  public static func viet(_ d: Date) -> String { f(true).string(from: d) }
}
