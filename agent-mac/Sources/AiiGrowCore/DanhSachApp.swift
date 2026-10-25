// «Danh sách app thật trên máy» (hợp đồng 25/10): agent quét app đã cài, gửi lên `POST api/device/ung-dung` (đủ / phần đổi),
// máy chủ báo tín hiệu ở gốc phản hồi dong-bo (`danhSachApp.bam`, `danhSachApp.yeuCau`) và gửi lại `windows.blockedApps` = app Ba Mẹ đặt «Chặn».
// File này chỉ có phần THUẦN (lọc, gộp, băm tất định, diff, quyết định gửi/quét, quyết định đóng) — quét thật ở QuetAppMac.swift.
import CryptoKit
import Foundation

/// Một app đã cài, đúng hình JSON hợp đồng (camelCase; trường nil bị bỏ khỏi JSON).
public struct AppMay: Codable, Equatable, Sendable {
  /// Mac: bundle id (giữ nguyên hoa/thường như Info.plist).
  public var khoa: String
  /// Định danh để xếp/chặn — Mac: bundle id (máy chủ hạ chữ thường).
  public var muc: String
  public var ten: String
  /// «applications» | «user-applications»
  public var nguon: String
  public var nhaPhatHanh: String?
  public var teamId: String?
  public var duongDan: String?
  public var phienBan: String?
  /// PNG base64 96×96 (không tiền tố data:) — chỉ gửi khi app mới / icon đổi / máy chủ báo `thieuIcon`.
  public var icon: String?
  /// SHA-256 hex chữ thường của byte PNG — luôn gửi khi có icon; máy chủ giữ icon cũ nếu trùng.
  public var iconBam: String?

  public init(khoa: String, muc: String, ten: String, nguon: String, nhaPhatHanh: String? = nil, teamId: String? = nil,
              duongDan: String? = nil, phienBan: String? = nil, icon: String? = nil, iconBam: String? = nil) {
    self.khoa = khoa; self.muc = muc; self.ten = ten; self.nguon = nguon; self.nhaPhatHanh = nhaPhatHanh; self.teamId = teamId
    self.duongDan = duongDan; self.phienBan = phienBan; self.icon = icon
    self.iconBam = iconBam ?? icon.flatMap { Data(base64Encoded: $0) }.map(DanhSachApp.hex)
  }

  /// Bản không kèm byte icon (vẫn giữ iconBam).
  public var khongIcon: AppMay { var a = self; a.icon = nil; return a }
}

/// Một mục `windows.blockedApps` — Mac chỉ dùng `muc` (bundle id) để đóng, `teamId` để ghi log.
public struct AppBiChan: Codable, Equatable, Sendable {
  public var muc: String
  public var duongDan: String?
  public var thuMuc: String?
  public var sha256: String?
  public var nhaPhatHanh: String?
  public var teamId: String?

  public init(muc: String, duongDan: String? = nil, thuMuc: String? = nil, sha256: String? = nil, nhaPhatHanh: String? = nil, teamId: String? = nil) {
    self.muc = muc; self.duongDan = duongDan; self.thuMuc = thuMuc; self.sha256 = sha256; self.nhaPhatHanh = nhaPhatHanh; self.teamId = teamId
  }

  /// Dễ tính: nhận cả chuỗi trần («com.roblox.roblox»); thiếu/sai kiểu trường phụ ⇒ bỏ trường đó. `muc` luôn chữ thường, đã cắt khoảng trắng.
  public init(from decoder: Decoder) throws {
    if let s = try? decoder.singleValueContainer().decode(String.self) {
      self.init(muc: s.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()); return
    }
    let c = try decoder.container(keyedBy: CodingKeys.self)
    func s(_ k: CodingKeys) -> String? {
      let v = ((try? c.decodeIfPresent(String.self, forKey: k)) ?? nil)?.trimmingCharacters(in: .whitespacesAndNewlines)
      return (v?.isEmpty ?? true) ? nil : v
    }
    self.init(muc: (s(.muc) ?? "").lowercased(), duongDan: s(.duongDan), thuMuc: s(.thuMuc), sha256: s(.sha256), nhaPhatHanh: s(.nhaPhatHanh), teamId: s(.teamId))
  }

  /// Đọc mảng blockedApps: phần tử hỏng không làm hỏng cả mảng; bỏ mục rỗng, gộp trùng theo muc.
  static func docDs(_ c: KeyedDecodingContainer<Policy.CodingKeys>, _ k: Policy.CodingKeys) -> [AppBiChan] {
    struct Mem: Decodable { let v: AppBiChan?; init(from d: Decoder) throws { v = try? AppBiChan(from: d) } }
    let ds = ((try? c.decodeIfPresent([Mem].self, forKey: k)) ?? nil)?.compactMap(\.v) ?? []
    var thay = Set<String>()
    return ds.filter { !$0.muc.isEmpty && thay.insert($0.muc).inserted }
  }
}

/// Tín hiệu `danhSachApp` ở gốc phản hồi dong-bo. Vắng cả khối (máy chủ cũ) ⇒ nil ở KetQuaDongBo.
public struct TinHieuDanhSachApp: Equatable, Sendable {
  /// bam máy chủ đang giữ (nil = chưa có gì).
  public var bam: String?
  /// Chuỗi mờ — đổi khi Ba Mẹ bấm «Làm mới».
  public var yeuCau: String?
  public init(bam: String?, yeuCau: String?) { self.bam = bam; self.yeuCau = yeuCau }

  static func tach(_ o: [String: Any]) -> TinHieuDanhSachApp? {
    guard let k = o["danhSachApp"] as? [String: Any] else { return nil }
    func s(_ v: Any?) -> String? { (v as? String).flatMap { $0.isEmpty ? nil : $0 } }
    return TinHieuDanhSachApp(bam: s(k["bam"]), yeuCau: s(k["yeuCau"]))
  }
}

/// Thân `POST api/device/ung-dung`.
public enum ThanGuiApp: Equatable {
  case du(bam: String, ds: [AppMay])
  case doi(bamTruoc: String, bam: String, them: [AppMay], bo: [String])

  public var bam: String { switch self { case let .du(b, _): return b; case let .doi(_, b, _, _): return b } }
  public var laDu: Bool { if case .du = self { return true }; return false }

  /// Gửi đủ KHÔNG kèm byte icon (chỉ iconBam) — máy chủ báo `thieuIcon` rồi agent gửi bù theo lô.
  public func json() throws -> [String: Any] {
    func mang(_ ds: [AppMay]) throws -> Any { try JSONSerialization.jsonObject(with: JSONEncoder().encode(ds)) }
    switch self {
    case let .du(bam, ds): return ["du": true, "bam": bam, "ds": try mang(ds.map(\.khongIcon))]
    case let .doi(truoc, bam, them, bo): return ["du": false, "bamTruoc": truoc, "bam": bam, "them": try mang(them), "bo": bo]
    }
  }
}

/// 200 {ok, bam, soApp, thieuIcon}.
public struct KetQuaGuiApp: Equatable, Sendable {
  public var bam: String?
  public var soApp: Int?
  /// khoa máy chủ chưa có icon (nil = máy chủ không báo).
  public var thieuIcon: [String]?
  public init(bam: String?, soApp: Int?, thieuIcon: [String]? = nil) { self.bam = bam; self.soApp = soApp; self.thieuIcon = thieuIcon }
}

/// Danh sách đã chuẩn hoá + băm — một lần quét.
public struct BanDanhSachApp: Equatable, Sendable {
  public var ds: [AppMay]
  /// khoa ⇒ băm riêng từng app (để tính phần đổi lần sau).
  public var bamTung: [String: String]
  public var bam: String
}

public enum DanhSachApp {
  public static let toiDaApp = 1500
  public static let toiDaChu = 300
  public static let toiDaIconBase64 = 64 * 1024
  public static let canhIcon = 96
  /// Byte icon tối đa trong MỘT request (gửi bù icon theo lô) — thân request không vượt giới hạn máy chủ/proxy.
  public static let toiDaIconMoiLo = 1_500_000
  /// Chu kỳ quét lại (giây).
  public static let chuKyGiay: Double = 1800
  /// Lần thử lại sớm nhất sau một lượt (lỗi mạng / tín hiệu máy chủ) — không quét dồn mỗi lần đồng bộ.
  public static let thuLaiSauGiay: Double = 60

  // MARK: lọc + chuẩn hoá

  /// Info.plist ⇒ app có giao diện không (bỏ LSUIElement / LSBackgroundOnly = true — nhận cả Bool, số, chuỗi "1"/"YES").
  public static func coGiaoDien(_ plist: [String: Any]) -> Bool {
    func dung(_ v: Any?) -> Bool {
      if let b = v as? Bool { return b }
      if let n = v as? NSNumber { return n.boolValue }
      if let s = v as? String { return ["1", "yes", "true"].contains(s.lowercased()) }
      return false
    }
    return !dung(plist["LSUIElement"]) && !dung(plist["LSBackgroundOnly"])
  }

  /// App hệ thống Apple nằm trong /System (Safari… qua liên kết /Applications ⇒ /System/Cryptexes) — không gửi.
  public static func laAppHeThong(bundleId: String, duongDanThat: String) -> Bool {
    bundleId.lowercased().hasPrefix("com.apple.") && duongDanThat.hasPrefix("/System/")
  }

  /// Chính AiiGrow (tray + daemon) — không đưa vào danh sách cho Ba Mẹ xếp.
  public static func laAiiGrow(_ bundleId: String) -> Bool {
    let b = bundleId.lowercased()
    return b == "vn.aiilab.aiigrow" || b.hasPrefix("vn.aiilab.aiigrow.")
  }

  /// Tên hiển thị: CFBundleDisplayName ⇒ CFBundleName ⇒ tên tệp bỏ «.app».
  public static func tenHienThi(_ plist: [String: Any], duongDan: String) -> String {
    for k in ["CFBundleDisplayName", "CFBundleName"] {
      if let s = (plist[k] as? String)?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty { return s }
    }
    return ((duongDan as NSString).lastPathComponent as NSString).deletingPathExtension
  }

  /// «Developer ID Application: Roblox Corporation (Z7S2JB2N2R)» ⇒ «Roblox Corporation». Chứng chỉ chung của Apple (App Store: «Apple Mac OS Application Signing»,
  /// «Software Signing») không nói ai làm app ⇒ nil.
  public static func tenNhaPhatHanh(authority: String?) -> String? {
    guard var s = authority?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty else { return nil }
    if ["Apple Mac OS Application Signing", "Software Signing", "Apple Development", "Apple iPhone OS Application Signing"].contains(s) { return nil }
    for tien in ["Developer ID Application: ", "Apple Development: ", "Apple Distribution: ", "Mac Developer: ", "3rd Party Mac Developer Application: "] where s.hasPrefix(tien) {
      s.removeFirst(tien.count)
    }
    if s.hasSuffix(")"), let mo = s.range(of: " (", options: .backwards) { s = String(s[..<mo.lowerBound]) }    // bỏ « (TEAMID)»
    s = s.trimmingCharacters(in: .whitespaces)
    return s.isEmpty ? nil : s
  }

  static func cat(_ s: String?) -> String? {
    guard let s else { return nil }
    let t = s.trimmingCharacters(in: .whitespacesAndNewlines)
    return t.isEmpty ? nil : String(t.prefix(toiDaChu))
  }

  /// Chuẩn hoá một lần quét: cắt chữ ≤ 300, bỏ icon quá 64 KB, gộp trùng khoa (giữ mục ĐẦU — /Applications trước ~/Applications),
  /// ≤ 1500 app theo thứ tự quét (Con nhét nghìn gói rác vào ~/Applications cũng không đẩy được app trong /Applications ra), sắp theo khoa; rồi băm.
  public static func chuan(_ vao: [AppMay]) -> BanDanhSachApp {
    var thay = Set<String>(), ds: [AppMay] = []
    for a in vao {
      // gộp không phân biệt hoa/thường: máy chủ hạ chữ khoa/muc của Mac ⇒ hai gói chỉ khác hoa/thường là MỘT dòng
      guard let khoa = cat(a.khoa), let muc = cat(a.muc), thay.insert(khoa.lowercased()).inserted else { continue }
      var b = a
      b.khoa = khoa; b.muc = muc
      b.ten = cat(a.ten) ?? khoa
      b.nguon = cat(a.nguon) ?? "applications"
      b.nhaPhatHanh = cat(a.nhaPhatHanh); b.teamId = cat(a.teamId); b.duongDan = cat(a.duongDan); b.phienBan = cat(a.phienBan)
      if let i = a.icon, i.isEmpty || i.utf8.count > toiDaIconBase64 { b.icon = nil; b.iconBam = nil }
      if b.icon == nil { b.iconBam = nil }
      ds.append(b)
      if ds.count >= toiDaApp { break }
    }
    ds.sort { $0.khoa < $1.khoa }
    var tung: [String: String] = [:]
    for a in ds { tung[a.khoa] = hex(Data(dongBam(a).utf8)) }
    let bam = hex(Data(ds.map { dongBam($0) }.joined(separator: "\n").utf8))
    return BanDanhSachApp(ds: ds, bamTung: tung, bam: bam)
  }

  /// Một dòng tất định của app để băm: JSON khoá sắp xếp (chữ có «|» hay xuống dòng không làm hai app trùng dòng); icon góp qua iconBam.
  static func dongBam(_ a: AppMay) -> String {
    let b = a.khongIcon
    let e = JSONEncoder(); e.outputFormatting = [.sortedKeys, .withoutEscapingSlashes]
    return String(decoding: (try? e.encode(b)) ?? Data(), as: UTF8.self)
  }

  static func hex(_ d: Data) -> String { SHA256.hash(data: d).map { String(format: "%02x", $0) }.joined() }

  // MARK: diff

  /// So với bản đã gửi trước: `them` = app mới hoặc đổi, `bo` = khoa đã gỡ (sắp xếp).
  public static func diff(truoc: [String: String], sau: BanDanhSachApp) -> (them: [AppMay], bo: [String]) {
    let them = sau.ds.filter { truoc[$0.khoa] != sau.bamTung[$0.khoa] }
    let bo = truoc.keys.filter { sau.bamTung[$0] == nil }.sorted()
    return (them, bo)
  }

  // MARK: quyết định

  public enum Viec: Equatable { case khong, du, doi }

  /// Yêu cầu «Làm mới» chưa xử lý (khác lần đã xử lý và khác nil).
  public static func coYeuCauMoi(_ t: TinHieuDanhSachApp?, daXuLy: String?) -> Bool {
    guard let y = t?.yeuCau else { return false }
    return y != daXuLy
  }

  /// Sau khi quét xong: gửi đủ / gửi phần đổi / không gửi.
  /// `bamDaGui` + `coBanTruoc` (còn băm từng app của lần gửi đó) mới gửi phần đổi được.
  public static func quyetDinh(bamMoi: String, bamDaGui: String?, coBanTruoc: Bool, tinHieu: TinHieuDanhSachApp?, yeuCauDaXuLy: String?) -> Viec {
    if coYeuCauMoi(tinHieu, daXuLy: yeuCauDaXuLy) { return .du }
    let coDoi = bamDaGui != nil && coBanTruoc
    if let t = tinHieu {
      guard let bamMayChu = t.bam else { return .du }                   // máy chủ chưa có ⇒ đủ
      if bamMayChu == bamMoi { return .khong }
      return coDoi && bamMayChu == bamDaGui ? .doi : .du                 // máy chủ giữ bản khác bản ta gửi ⇒ phần đổi chắc chắn 409 ⇒ gửi đủ luôn
    }
    // Máy chủ cũ (vắng tín hiệu): theo bam lần gửi được trước.
    if bamMoi == bamDaGui { return .khong }
    return coDoi ? .doi : .du
  }

  /// `them` của phần đổi: app mới / đổi; kèm byte icon chỉ khi app mới hoặc iconBam khác lần gửi trước.
  public static func themKemIcon(_ them: [AppMay], iconTruoc: [String: String]) -> [AppMay] {
    them.map { iconTruoc[$0.khoa] != nil && iconTruoc[$0.khoa] == $0.iconBam ? $0.khongIcon : $0 }
  }

  /// Một lô app kèm icon cho các khoa máy chủ báo thiếu (tổng byte icon ≤ toiDa, ít nhất một app). App không có icon cục bộ không vào lô.
  public static func loIcon(_ ds: [AppMay], thieu: Set<String>, toiDa: Int = toiDaIconMoiLo) -> [AppMay] {
    var lo: [AppMay] = [], tong = 0
    for a in ds where thieu.contains(a.khoa) {
      guard let i = a.icon else { continue }
      if !lo.isEmpty && tong + i.utf8.count > toiDa { break }
      lo.append(a); tong += i.utf8.count
    }
    return lo
  }

  /// Có cần quét (và có thể gửi) ở lần đồng bộ này không. `gio` = đồng hồ đơn điệu (giây).
  /// `soLanLoi`: số lượt gửi hỏng liên tiếp ⇒ giãn thử lại 60 s, 120 s, 240 s … tối đa 30 phút (không quét lại cả /Applications mỗi phút khi máy chủ lỗi).
  public static func canQuet(gio: Double, lanQuetCuoi: Double?, lanThuCuoi: Double?, tinHieu: TinHieuDanhSachApp?,
                             bamDaGui: String?, yeuCauDaXuLy: String?, soLanLoi: Int = 0, conThieuIcon: Bool = false) -> Bool {
    guard let quet = lanQuetCuoi else { return true }                                   // khởi động / vừa ghép
    if gio - quet >= chuKyGiay { return true }
    let thuDuoc = gio - (lanThuCuoi ?? quet) >= min(chuKyGiay, thuLaiSauGiay * pow(2, Double(min(max(soLanLoi, 0), 10))))
    // Làm mới / chưa gửi được lần nào / lượt trước hỏng / máy chủ còn thiếu icon
    if coYeuCauMoi(tinHieu, daXuLy: yeuCauDaXuLy) || bamDaGui == nil || soLanLoi > 0 || conThieuIcon { return thuDuoc }
    if let t = tinHieu, t.bam == nil || t.bam != bamDaGui { return thuDuoc }              // máy chủ giữ bản khác / mất dữ liệu
    return false
  }

  // MARK: thực thi chặn

  /// Tiến trình của Con thuộc app bị Ba Mẹ «Chặn» (bundle id ngoài cùng HOẶC gần nhất == muc, không phân biệt hoa/thường).
  /// Không bao giờ chọn app hệ thống / AiiGrow / thư mục hệ thống / bộ gõ miễn trừ / tiến trình phụ (app chính đóng thì chúng tự chết).
  public static func canDongBiChan(_ ds: [TienTrinh], uidCon: UInt32, biChan: [AppBiChan]) -> [(TienTrinh, AppBiChan)] {
    guard !biChan.isEmpty else { return [] }
    var theoMuc: [String: AppBiChan] = [:]
    for b in biChan where !b.muc.isEmpty && !QuyetDinhApp.heThong.contains(b.muc) && !laAiiGrow(b.muc) { theoMuc[b.muc] = theoMuc[b.muc] ?? b }
    guard !theoMuc.isEmpty else { return [] }
    var kq: [(TienTrinh, AppBiChan)] = []
    for t in ds where t.uid == uidCon && t.pid > 1 {
      guard let app = t.duongDanApp else { continue }
      let duongThap = t.duongDan.lowercased()
      if QuyetDinhApp.thuMucMienTru.contains(where: { duongThap.hasPrefix($0) }) || QuyetDinhApp.laTienTrinhPhu(t.duongDan) { continue }
      if QuyetDinhApp.thuMucHeThong.contains(where: { app.hasPrefix($0) || t.duongDan.hasPrefix($0) }) { continue }
      if app.lowercased() == DuongDan.app.lowercased() { continue }
      let ung = [t.bundleId, t.bundleIdGan].compactMap { $0?.lowercased() }
      if ung.contains(where: { QuyetDinhApp.heThong.contains($0) || laAiiGrow($0) }) { continue }
      if let b = ung.lazy.compactMap({ theoMuc[$0] }).first { kq.append((t, b)) }
    }
    return kq
  }
}

/// Băm từng app của lần gửi được gần nhất — tệp riêng cạnh config.json (≤ 1500 dòng; không nhét vào config vì config ghi lại mỗi 5 giây).
public struct SoAppDaGui: Codable, Equatable {
  public var bam: String
  public var bamTung: [String: String]
  /// khoa ⇒ iconBam đã gửi (để phần đổi chỉ kèm byte icon khi đổi).
  public var iconTung: [String: String]?
  /// khoa máy chủ báo thiếu icon — gửi bù theo lô.
  public var thieuIcon: [String]?
  public init(bam: String, bamTung: [String: String], iconTung: [String: String]? = nil, thieuIcon: [String]? = nil) {
    self.bam = bam; self.bamTung = bamTung; self.iconTung = iconTung; self.thieuIcon = thieuIcon
  }

  public static func duongDan(canh cauHinh: String) -> String {
    ((cauHinh as NSString).deletingLastPathComponent as NSString).appendingPathComponent("ung-dung-da-gui.json")
  }
  public static func doc(_ duong: String) -> SoAppDaGui? {
    FileManager.default.contents(atPath: duong).flatMap { try? JSONDecoder().decode(SoAppDaGui.self, from: $0) }
  }
  public func ghi(_ duong: String) throws {
    try GhiTep.nguyenKhoi(try JSONEncoder().encode(self), vao: duong, quyen: 0o600)
  }
}
