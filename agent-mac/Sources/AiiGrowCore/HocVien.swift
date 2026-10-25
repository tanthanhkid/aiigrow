// App của HỌC VIÊN (Con) trên Mac — hai chiều với Ba Mẹ, cùng máy chủ với agent-win (server/lib/hoc-vien.ts, /api/device/hoc-vien/*).
// Bản dịch THUẦN của agent-win AiiGrow.Core/HocVien.cs: mô hình + chữ hiển thị + luật nhỏ, không AppKit/SwiftUI ⇒ test được.
// Mọi luật (tần suất, thời gian tối thiểu, ảnh trùng, trừ điểm, tồn kho) do MÁY CHỦ quyết; app chỉ hiện và gửi.
// Số điểm: như Windows (AppForm), app Con hiện số dư / giá quà lấy từ hoc-vien/* — TrangThai (menu, màn khoá) vẫn KHÔNG mang số điểm.
import Foundation

// MARK: - Đọc JSON khoan dung (id số hay chuỗi, số nguyên hay thực, null)

enum JsonMem {
  static func chuoi(_ v: Any?) -> String? {
    if let s = v as? String { return s }
    if let n = v as? NSNumber, CFGetTypeID(n) != CFBooleanGetTypeID() { return n.stringValue }
    return nil
  }
  static func so(_ v: Any?) -> Int? {
    if let n = v as? NSNumber { let d = n.doubleValue; return d.isFinite ? Int(d.rounded(.down)) : nil }
    if let s = v as? String { return Int(s) }
    return nil
  }
  static func thuc(_ v: Any?) -> Double? {
    if let n = v as? NSNumber { let d = n.doubleValue; return d.isFinite ? d : nil }
    if let s = v as? String { return Double(s) }
    return nil
  }
  static func dung(_ v: Any?) -> Bool { (v as? Bool) ?? ((v as? NSNumber)?.boolValue ?? false) }
  static func ngay(_ v: Any?) -> Date? { NgayGio.doc(v as? String) }
  static func ds(_ v: Any?) -> [[String: Any]] { v as? [[String: Any]] ?? [] }
  static func doc(_ raw: Data) -> [String: Any]? { (try? JSONSerialization.jsonObject(with: raw)) as? [String: Any] }
}

// MARK: - Mô hình

/// Một nhiệm vụ trong «Việc của Con». `trangThai`: san_sang | dang_lam | can_bo_sung | du_hom_nay | du_tuan.
public struct HvNhiemVu: Equatable, Identifiable {
  public var id = "", ten = "", moTa = "", nhom = "khac"
  public var diem = 0
  /// anh | video | ghi_am | van_ban | tu_dong.
  public var bangChung = "anh"
  public var kieu = "thuong"
  public var han: Date?
  public var phutToiThieu = 0
  public var trangThai = "san_sang"
  /// Id lượt đang làm / cần bổ sung (nil nếu chưa bắt đầu).
  public var luot: String?
  public var dangCho = 0
  public var giaoRieng = false
  /// Lý do Ba Mẹ nhờ bổ sung (chỉ khi can_bo_sung).
  public var lyDo: String?
  public init() {}
  init(_ o: [String: Any]) {
    id = JsonMem.chuoi(o["id"]) ?? ""; ten = o["ten"] as? String ?? ""; moTa = o["moTa"] as? String ?? ""; nhom = o["nhom"] as? String ?? "khac"
    diem = JsonMem.so(o["diem"]) ?? 0; bangChung = o["bangChung"] as? String ?? "anh"; kieu = o["kieu"] as? String ?? "thuong"
    han = JsonMem.ngay(o["han"]); phutToiThieu = JsonMem.so(o["phutToiThieu"]) ?? 0; trangThai = o["trangThai"] as? String ?? "san_sang"
    luot = JsonMem.chuoi(o["luot"]).flatMap { $0.isEmpty ? nil : $0 }; dangCho = JsonMem.so(o["dangCho"]) ?? 0
    giaoRieng = JsonMem.dung(o["giaoRieng"]); lyDo = o["lyDo"] as? String
  }
}

public struct HvLuot: Equatable, Identifiable {
  public var id = "", ten = ""
  /// cho_duyet | duoc_duyet | tu_choi | can_bo_sung.
  public var trangThai = ""
  public var diem: Int?
  public var lyDo: String?, loiKhen: String?
  public var luc: Date?
  public init() {}
  init(_ o: [String: Any]) {
    id = JsonMem.chuoi(o["id"]) ?? ""; ten = o["ten"] as? String ?? ""; trangThai = o["trangThai"] as? String ?? ""
    diem = JsonMem.so(o["diem"]); lyDo = o["lyDo"] as? String; loiKhen = o["loiKhen"] as? String; luc = JsonMem.ngay(o["luc"])
  }
}

public struct HvLoiKhen: Equatable, Identifiable {
  public var id = "", noiDung = ""
  public var phanHoi: String?
  public var luc: Date?
  public init() {}
  init(_ o: [String: Any]) {
    id = JsonMem.chuoi(o["id"]) ?? ""; noiDung = o["noiDung"] as? String ?? ""; phanHoi = o["phanHoi"] as? String; luc = JsonMem.ngay(o["luc"])
  }
}

public struct HvPhieu: Equatable, Identifiable {
  public var id = "", ten = ""
  public var diem = 0
  public init() {}
  init(_ o: [String: Any]) { id = JsonMem.chuoi(o["id"]) ?? ""; ten = o["ten"] as? String ?? ""; diem = JsonMem.so(o["diem"]) ?? 0 }
}

public struct HvCapDo: Equatable {
  public var cap = 1, diemCapSau = 0, conThieu = 0
  public init() {}
  init(_ o: [String: Any]?) {
    guard let o else { return }
    cap = JsonMem.so(o["cap"]) ?? 1; diemCapSau = JsonMem.so(o["diemCapSau"]) ?? 0; conThieu = JsonMem.so(o["conThieu"]) ?? 0
  }
}

/// GET hoc-vien/tong-quan.
public struct HvTongQuan: Equatable {
  public var tenCon = ""
  public var soDu = 0, tongKiem = 0, diemChoDuyet = 0
  public var capDo = HvCapDo()
  public var nhiemVu: [HvNhiemVu] = []
  public var gan: [HvLuot] = []
  public var loiKhen: [HvLoiKhen] = []
  public var phieuCho: [HvPhieu] = []
  public init() {}
  public static func doc(_ raw: Data) -> HvTongQuan? {
    guard let o = JsonMem.doc(raw), o["nhiemVu"] != nil || o["soDu"] != nil else { return nil }
    var t = HvTongQuan()
    t.tenCon = (o["con"] as? [String: Any])?["ten"] as? String ?? ""
    t.soDu = JsonMem.so(o["soDu"]) ?? 0; t.tongKiem = JsonMem.so(o["tongKiem"]) ?? 0; t.diemChoDuyet = JsonMem.so(o["diemChoDuyet"]) ?? 0
    t.capDo = HvCapDo(o["capDo"] as? [String: Any])
    t.nhiemVu = JsonMem.ds(o["nhiemVu"]).map(HvNhiemVu.init)
    t.gan = JsonMem.ds(o["gan"]).map(HvLuot.init)
    t.loiKhen = JsonMem.ds(o["loiKhen"]).map(HvLoiKhen.init)
    t.phieuCho = JsonMem.ds(o["phieuCho"]).map(HvPhieu.init)
    return t
  }
}

public struct HvQua: Equatable, Identifiable {
  public var id = "", ten = "", loai = "qua"
  public var diem = 0
  public var du = false
  public var conThieu = 0
  public var chiCuoiTuan = false
  public init() {}
  init(_ o: [String: Any]) {
    id = JsonMem.chuoi(o["id"]) ?? ""; ten = o["ten"] as? String ?? ""; loai = o["loai"] as? String ?? "qua"
    diem = JsonMem.so(o["diem"]) ?? 0; du = JsonMem.dung(o["du"]); conThieu = JsonMem.so(o["conThieu"]) ?? 0; chiCuoiTuan = JsonMem.dung(o["chiCuoiTuan"])
  }
}

/// GET hoc-vien/cua-hang.
public struct HvCuaHang: Equatable {
  public var soDu = 0
  public var qua: [HvQua] = []
  public init() {}
  public static func doc(_ raw: Data) -> HvCuaHang? {
    guard let o = JsonMem.doc(raw), o["qua"] != nil else { return nil }
    var c = HvCuaHang(); c.soDu = JsonMem.so(o["soDu"]) ?? 0; c.qua = JsonMem.ds(o["qua"]).map(HvQua.init)
    return c
  }
}

public struct HvTin: Equatable, Identifiable {
  public var id = "", loai = "", tieu = "", noi = ""
  public var luc: Date?
  public init() {}
  init(_ o: [String: Any]) {
    id = JsonMem.chuoi(o["id"]) ?? ""; loai = o["loai"] as? String ?? ""; tieu = o["tieu"] as? String ?? ""; noi = o["noi"] as? String ?? ""
    luc = JsonMem.ngay(o["luc"])
  }
}

/// GET hoc-vien/tin?sau=…
public struct HvTinDs: Equatable {
  public var ds: [HvTin] = []
  public var bay: Date?
  public init() {}
  public static func doc(_ raw: Data) -> HvTinDs? {
    guard let o = JsonMem.doc(raw), o["ds"] != nil else { return nil }
    var t = HvTinDs(); t.ds = JsonMem.ds(o["ds"]).map(HvTin.init); t.bay = JsonMem.ngay(o["bay"])
    return t
  }
}

public struct HvNopKq: Equatable {
  /// cho_duyet | duoc_duyet (nhiệm vụ tự duyệt).
  public var trangThai = ""
  public var nghiTrung = false
  public init(trangThai: String = "", nghiTrung: Bool = false) { self.trangThai = trangThai; self.nghiTrung = nghiTrung }
  public static func doc(_ raw: Data) -> HvNopKq? {
    guard let o = JsonMem.doc(raw), let t = o["trangThai"] as? String else { return nil }
    return HvNopKq(trangThai: t, nghiTrung: JsonMem.dung(o["nghiTrung"]))
  }
}

public struct HvDoiKq: Equatable {
  /// cho_trao | cho_xac_nhan | da_phat_hanh.
  public var trangThai = ""
  public var maPhieu: String?
  public init(trangThai: String = "", maPhieu: String? = nil) { self.trangThai = trangThai; self.maPhieu = maPhieu }
  public static func doc(_ raw: Data) -> HvDoiKq? {
    guard let o = JsonMem.doc(raw), let t = o["trangThai"] as? String else { return nil }
    return HvDoiKq(trangThai: t, maPhieu: (o["voucher"] as? [String: Any])?["ma"] as? String)
  }
}

/// POST nhiem-vu/:id/bat-dau → {luot}.
public enum HvBatDau {
  public static func doc(_ raw: Data) -> String? { JsonMem.doc(raw).flatMap { JsonMem.chuoi($0["luot"]) }.flatMap { $0.isEmpty ? nil : $0 } }
}

/// POST loi-khen/:id/phan-hoi → {ok: true}.
public enum HvDongY {
  public static func doc(_ raw: Data) -> Bool { JsonMem.doc(raw).map { JsonMem.dung($0["ok"]) } ?? false }
}

// MARK: - Mục của app, trạng thái tải

/// Bốn mục của app Con (agent-win MucApp).
public enum MucApp: String, CaseIterable, Sendable { case homNay, nhiemVu, phanQua, tinNhan }

/// Một mục chưa có dữ liệu thì đang ở ca nào — chưa ghép / đang tải / lỗi (hiện lý do + «Thử lại», không treo «Đang tải…»).
public enum TaiHocVien: Equatable { case chuaGhep, dangTai, loi, xong }

// MARK: - Chữ hiển thị + luật nhỏ (agent-win HocVienView)

public enum HocVienView {
  public static func trangThaiTai(daGhep: Bool, coDuLieu: Bool, loi: String?) -> TaiHocVien {
    !daGhep ? .chuaGhep : coDuLieu ? .xong : ((loi ?? "").trimmingCharacters(in: .whitespaces).isEmpty ? .dangTai : .loi)
  }

  /// «Còn 2 giờ», «Còn 3 ngày», «Đã hết hạn». nil ⇒ không có hạn.
  public static func hanText(_ han: Date?, bayGio: Date) -> String? {
    guard let han else { return nil }
    let con = han.timeIntervalSince(bayGio)
    if con <= 0 { return "Đã hết hạn" }
    if con < 3600 { return "Còn \(max(1, Int((con / 60).rounded(.up)))) phút" }
    if con < 86_400 { return "Còn \(Int((con / 3600).rounded(.down))) giờ" }
    return "Còn \(Int((con / 86_400).rounded(.down))) ngày"
  }

  public static func trangThaiText(_ t: String?) -> String {
    switch t {
    case "dang_lam": return "Đang làm"
    case "can_bo_sung": return "Ba Mẹ nhờ bổ sung"
    case "du_hom_nay": return "Hôm nay đã đủ"
    case "du_tuan": return "Tuần này đã đủ"
    case "cho_duyet": return "Chờ Ba Mẹ duyệt"
    case "duoc_duyet": return "Đã được duyệt"
    case "tu_choi": return "Chưa được duyệt"
    default: return "Sẵn sàng"
    }
  }

  /// Nhãn nút hành động của một nhiệm vụ; nil ⇒ không có nút (hết lượt / nhiệm vụ tự động).
  public static func nutText(_ v: HvNhiemVu) -> String? {
    switch v.trangThai {
    case "dang_lam": return v.bangChung == "tu_dong" ? nil : "Nộp bài"
    case "can_bo_sung": return "Nộp lại"
    case "san_sang": return v.bangChung == "tu_dong" ? nil : "Nhận việc"
    default: return nil
    }
  }

  /// Có cần ảnh / vài câu khi nộp không (khớp luật máy chủ lib/nhiem-vu.ts nop()).
  public static func canAnh(_ v: HvNhiemVu) -> Bool { v.bangChung == "anh" }
  public static func canChu(_ v: HvNhiemVu) -> Bool { v.bangChung == "van_ban" }

  /// Kiểm trước khi gửi bài: nil = gửi được, khác nil = câu nhắc Con.
  public static func kiemNop(_ v: HvNhiemVu, ghiChu: String, coAnh: Bool) -> String? {
    if canChu(v) && ghiChu.trimmingCharacters(in: .whitespacesAndNewlines).count < 3 { return "Con viết vài câu rồi nộp nhé." }
    if canAnh(v) && !coAnh && v.trangThai != "can_bo_sung" { return "Con chọn một ảnh bằng chứng rồi nộp nhé." }
    return nil
  }

  /// Việc cần Con làm ngay xếp trước: cần bổ sung → đang làm → sẵn sàng (hạn gần trước, điểm cao trước) → đã đủ lượt.
  public static func sapXep(_ ds: [HvNhiemVu]) -> [HvNhiemVu] {
    func hang(_ v: HvNhiemVu) -> Int { ["can_bo_sung": 0, "dang_lam": 1, "san_sang": 2][v.trangThai] ?? 3 }
    return ds.enumerated().sorted { a, b in
      let (x, y) = (a.element, b.element)
      if hang(x) != hang(y) { return hang(x) < hang(y) }
      let hx = x.han ?? .distantFuture, hy = y.han ?? .distantFuture
      if hx != hy { return hx < hy }
      if x.diem != y.diem { return x.diem > y.diem }
      return a.offset < b.offset
    }.map(\.element)
  }

  /// Số việc Con còn làm được (sẵn sàng / đang làm / cần bổ sung).
  public static func soViecMo(_ t: HvTongQuan) -> Int { t.nhiemVu.filter { ["san_sang", "dang_lam", "can_bo_sung"].contains($0.trangThai) }.count }

  public static func capText(_ c: HvCapDo) -> String { c.conThieu > 0 ? "Cấp \(c.cap) · còn \(c.conThieu) điểm lên cấp" : "Cấp \(c.cap)" }

  public static func quaTrangThai(_ q: HvQua) -> String { q.du ? "Đủ điểm" : "Còn thiếu \(q.conThieu) điểm" }

  public static func doiThongBao(_ r: HvDoiKq, tenQua: String) -> String {
    switch r.trangThai {
    case "da_phat_hanh": return r.maPhieu.map { "Đã đổi «\(tenQua)». Mã phiếu: \($0)" } ?? "Đã đổi «\(tenQua)»."
    case "cho_xac_nhan": return "Đã đổi «\(tenQua)». Đang chờ Ba Mẹ xác nhận."
    default: return "Đã đổi «\(tenQua)». Nhờ Ba Mẹ trao quà cho con nhé!"
    }
  }

  public static func nopThongBao(_ r: HvNopKq) -> String {
    if r.trangThai == "duoc_duyet" { return "Xong rồi! Điểm đã được cộng." }
    return r.nghiTrung ? "Đã nộp. Ảnh này giống ảnh con từng nộp, Ba Mẹ sẽ xem kỹ nhé." : "Đã nộp cho Ba Mẹ. Chờ Ba Mẹ duyệt nhé!"
  }

  /// Gộp nhiều tin mới thành MỘT thông báo: (tiêu đề, nội dung). Ít nhất một tin.
  public static func thongBaoTin(_ moi: [HvTin]) -> (tieu: String, noi: String) {
    if moi.count == 1 { return (cat(moi[0].tieu, 60), cat(moi[0].noi, 180)) }
    var thay = Set<String>(), dau: [String] = []
    for t in moi.prefix(3) where thay.insert(t.tieu).inserted { dau.append(t.tieu) }
    return ("Có \(moi.count) tin mới", cat(dau.joined(separator: " · "), 180))
  }

  /// Bấm vào thông báo ⇒ mở đúng mục: nhiệm vụ → Nhiệm vụ, quà / huy hiệu → Phần quà, còn lại → Tin nhắn; lẫn nhiều loại ⇒ Tin nhắn.
  public static func mucChoTin(_ moi: [HvTin]) -> MucApp {
    func muc(_ loai: String) -> MucApp {
      switch loai {
      case "giao_nhiem_vu", "nhiem_vu_moi", "duyet_nhiem_vu", "tu_duyet_nhiem_vu", "tu_choi_nhiem_vu", "can_bo_sung": return .nhiemVu
      case "xac_nhan_qua", "huy_qua", "huy_hieu": return .phanQua
      default: return .tinNhan
      }
    }
    let ds = Set(moi.map { muc($0.loai) })
    return ds.count == 1 ? ds.first! : .tinNhan
  }

  /// Có nhiệm vụ mới (Ba Mẹ giao riêng hoặc cho cả nhà) ⇒ tự bật app ở mục Nhiệm vụ, không chỉ bóng báo.
  public static func coNhiemVuMoi(_ moi: [HvTin]) -> Bool { moi.contains { $0.loai == "giao_nhiem_vu" || $0.loai == "nhiem_vu_moi" } }

  /// Tên dễ đọc của một mục chơi: bundle id «com.roblox.roblox» → «Roblox», tên .app bỏ đuôi, tên miền giữ nguyên.
  public static func tenMucChoi(_ muc: String?) -> String {
    let m = (muc ?? "").trimmingCharacters(in: .whitespaces)
    if m.isEmpty { return "App này" }
    if m.lowercased().hasSuffix(".app") { return String(m.dropLast(4)) }
    let phan = m.split(separator: ".")
    let laBundle = phan.count >= 3 && ["com", "org", "net", "io", "tv", "us", "vn", "jp", "de", "co"].contains(phan[0].lowercased())
    if laBundle, let cuoi = phan.last { return cuoi.prefix(1).uppercased() + cuoi.dropFirst() }
    return m
  }

  static func cat(_ s: String, _ toiDa: Int) -> String { s.count <= toiDa ? s : String(s.prefix(toiDa - 1)) + "…" }
}

/// Mascot Rob theo mục (agent-win MascotView): chưa nối được ⇒ «trong-loi» ở Hôm nay.
public enum MascotView {
  public static func chon(_ muc: MucApp, daNoi: Bool, xongHetViec: Bool) -> String {
    if !daNoi && muc == .homNay { return "trong-loi" }
    switch muc {
    case .nhiemVu: return xongHetViec ? "xong" : "so-tay"
    case .phanQua: return "qua"
    case .tinNhan: return "chi"
    case .homNay: return xongHetViec ? "xong" : "rob-goc"
    }
  }
  public static let tatCa = ["rob-goc", "so-tay", "xong", "qua", "chi", "trong-loi"]
}

/// Theo dõi tin đã báo để chỉ báo tin MỚI. Lần hỏi đầu chỉ ghi nhớ. Máy chủ lùi mốc 5 phút nên một tin có thể về nhiều lần ⇒ lọc theo id.
public struct TinTracker {
  private var thay = Set<String>()
  private var thuTu: [String] = []
  private let toiDa = 300
  public private(set) var daCoLanDau = false
  /// Mốc `sau` cho lần hỏi kế (= `bay` máy chủ trả; nil ⇒ máy chủ trả 7 ngày gần nhất).
  public private(set) var moc: Date?
  public init() {}

  public mutating func nhan(_ r: HvTinDs) -> [HvTin] {
    var moi: [HvTin] = []
    for t in r.ds.sorted(by: { ($0.luc ?? .distantPast) < ($1.luc ?? .distantPast) }) {
      guard !t.id.isEmpty, thay.insert(t.id).inserted else { continue }
      thuTu.append(t.id)
      if thuTu.count > toiDa { thay.remove(thuTu.removeFirst()) }
      moi.append(t)
    }
    if let b = r.bay { moc = b }
    let lanDau = !daCoLanDau
    daCoLanDau = true
    return lanDau ? [] : moi
  }
}

/// Khi nào tự bật app vì nhiệm vụ mới: không khi app đang hiện, máy đang khoá (giữ lại tới lúc mở), vừa bật trong 5 phút.
public struct BatNhiemVu {
  public static let gian: TimeInterval = 5 * 60
  private var lan = Date.distantPast
  public private(set) var choMoKhoa = false
  public init() {}

  public mutating func nhan(coNvMoi: Bool, khoa: Bool, appDangHien: Bool, bayGio: Date) -> Bool {
    guard coNvMoi else { return false }
    if khoa { choMoKhoa = true; return false }
    return thu(appDangHien: appDangHien, bayGio: bayGio)
  }

  public mutating func moKhoa(appDangHien: Bool, bayGio: Date) -> Bool {
    guard choMoKhoa else { return false }
    choMoKhoa = false
    return thu(appDangHien: appDangHien, bayGio: bayGio)
  }

  private mutating func thu(appDangHien: Bool, bayGio: Date) -> Bool {
    if appDangHien || bayGio.timeIntervalSince(lan) < BatNhiemVu.gian { return false }
    lan = bayGio
    return true
  }
}

/// Đường được phép đi từ tray qua daemon tới `api/device/…` (agent-win HocVienPaths). Tray chạy dưới tài khoản Con ⇒ CHỈ các đường
/// học viên, KHÔNG cho gọi đường tuỳ ý (khoá, gỡ, chính sách…) bằng token máy.
public enum HocVienPaths {
  public static let goc = "hoc-vien/"

  public static func duoc(method: String?, path: String?) -> Bool {
    guard let path, !path.trimmingCharacters(in: .whitespaces).isEmpty else { return false }
    let m = (method ?? "").uppercased()
    let tach = path.split(separator: "?", maxSplits: 1, omittingEmptySubsequences: false)
    let p = String(tach[0]), query = tach.count > 1 ? String(tach[1]) : ""
    if (m != "GET" && !query.isEmpty) || !p.hasPrefix(goc) || query.contains("..") || p.contains("..") { return false }
    if query.contains(where: { $0 == "#" || $0.isWhitespace || $0 == "/" }) { return false }
    let s = p.dropFirst(goc.count).split(separator: "/", omittingEmptySubsequences: false).map(String.init)
    if s.contains(where: { $0.isEmpty || !$0.allSatisfy { ($0.isASCII && ($0.isLetter || $0.isNumber)) || $0 == "-" || $0 == "_" } }) { return false }
    switch (m, s.count) {
    case ("GET", 1): return ["tong-quan", "tin", "cua-hang"].contains(s[0]) && (query.isEmpty || (s[0] == "tin" && query.hasPrefix("sau=")))
    case ("POST", 2): return s[0] == "doi"
    case ("POST", 3): return (s[0] == "nhiem-vu" && s[2] == "bat-dau") || (s[0] == "luot" && s[2] == "nop") || (s[0] == "loi-khen" && s[2] == "phan-hoi")
    default: return false
    }
  }

  /// Một đoạn đường (id) an toàn để ghép vào `hoc-vien/...`: chỉ chữ/số/-/_ ASCII.
  public static func doan(_ id: String) -> String? {
    guard !id.isEmpty, id.allSatisfy({ ($0.isASCII && ($0.isLetter || $0.isNumber)) || $0 == "-" || $0 == "_" }) else { return nil }
    return id
  }
}

/// Co ảnh bằng chứng cho vừa trần máy chủ (≤ 400 KB sau giải base64; app nén về ≤ 300 KB).
public enum AnhBangChung {
  public static let maxCanh = 1280
  public static let maxByte = 300 * 1024

  /// Kích thước mới giữ tỉ lệ, cạnh dài ≤ maxCanh; không phóng to.
  public static func vua(_ w: Int, _ h: Int, maxCanh: Int = AnhBangChung.maxCanh) -> (w: Int, h: Int) {
    guard w > 0, h > 0 else { return (1, 1) }
    let dai = max(w, h)
    if dai <= maxCanh { return (w, h) }
    let k = Double(maxCanh) / Double(dai)
    return (max(1, Int((Double(w) * k).rounded())), max(1, Int((Double(h) * k).rounded())))
  }
}

/// «Chơi bằng điểm» (agent-win BlockScreenView.CanUsePoints + ChoiBangDiemForm): khi nào hiện nút, chữ kết quả.
public enum ChoiBangDiem {
  /// Nút hiện khi máy chủ cho đổi điểm, không bị Ba Mẹ khoá, không mất mạng (phien/xet không gọi được), và (nếu biết app) app nằm trong danh sách.
  public static func hienNut(duocDoiDiem: Bool, lyDoKhoa: String?, matMang: Bool, dsChoi: [String], muc: String? = nil) -> Bool {
    guard duocDoiDiem, !["ba_me_khoa", "khoa", "gio_ngu", "ngu"].contains(lyDoKhoa ?? ""), !matMang else { return false }   // giờ ngủ: máy chủ luôn từ chối
    guard let muc else { return true }
    return trongDs(muc, dsChoi)
  }

  public static func trongDs(_ muc: String, _ ds: [String]) -> Bool {
    let m = muc.trimmingCharacters(in: .whitespaces).lowercased()
    return !m.isEmpty && ds.contains { $0.lowercased() == m }
  }

  /// Câu hiện sau khi bấm «Chơi»: (câu, thành công?).
  public static func ketQua(_ t: TraLoi) -> (chu: String, duoc: Bool) {
    switch t {
    case let .choi(trangThai, _, chu) where trangThai == "tu_choi" || trangThai == "khong_co_muc":
      return (chu ?? "Chưa mở được bằng điểm. Con xin Ba Mẹ nhé.", false)
    case let .choi(_, phut, chu):
      if let chu, !chu.isEmpty { return (chu, true) }
      return (phut.map { "Được rồi! Con chơi khoảng \($0) phút nhé." } ?? "Được rồi! Chơi vui nhé.", true)
    case let .loi(ma, chu): return (ma == "yeu_cau_sai" ? "Dịch vụ AiiGrow trên máy là bản cũ — nhờ Ba Mẹ cập nhật nhé." : chu, false)
    default: return ("Chưa mở được. Con thử lại nhé.", false)
    }
  }

  /// «Đang chơi thật» cho phien/nhip (như Windows 0.2.4 chỉ đếm giây app chơi ở tiền cảnh): app tiền cảnh là app của phiên, hoặc một trình
  /// duyệt khi phiên là trang web. false ⇒ máy chủ tạm dừng đếm (tạm lâu ⇒ đóng phiên). Chưa kiểm được tiền cảnh ⇒ coi là đang chơi.
  public static func dangChoi(tienCanh: String?, playApp: String?, playWeb: Bool) -> Bool {
    guard let tc = tienCanh?.lowercased(), !tc.isEmpty, tc != DemPhut.khongRo else { return true }
    if playWeb {
      let trinhDuyet = Set(ChinhSachTrinhDuyet.tatCa.flatMap { [$0.bundleApp.lowercased(), $0.bundleId.lowercased()] } + ["com.apple.safari"])
      return trinhDuyet.contains(tc)
    }
    guard let app = playApp?.lowercased(), !app.isEmpty else { return true }
    return tc == app || tc.hasPrefix(app + ".") || app.hasPrefix(tc + ".")
  }

  /// Nhãn nút một mục: «Chơi Roblox · ≈ 25 phút».
  public static func nhanNut(_ muc: String, phut: Int?) -> String {
    let ten = "Chơi " + HocVienView.tenMucChoi(muc)
    if let phut, phut > 0 { return "\(ten) · ≈ \(phut) phút" }
    return ten
  }
}
