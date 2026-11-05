// Quỹ giờ chơi + giờ ngủ / giờ học + ngoại lệ (thiết kế chốt 05/11, docs/KE-HOACH-KHOP-THIET-KE-0511.md L2 L3 L11) — THUẦN, test được.
// Máy chủ tính sẵn Policy (agent-windows.ts): còn quỹ ⇒ app Giải trí nằm trong allowedApps + `appTinhGio`. Tác tử chỉ làm phần máy chủ không
// làm kịp giữa hai lần đồng bộ (và khi MẤT MẠNG): đếm lùi `quyConPhut` theo giây app tính giờ ở tiền cảnh, hết ⇒ đóng các app đó; ngoại lệ một
// app hết hạn ⇒ bỏ app đó; mất mạng ⇒ tự xét giờ ngủ / giờ học theo đồng hồ máy.
import Foundation

/// «HH:MM»–«HH:MM» (qua nửa đêm được), `thu` 0 = CN (chỉ giờ học có).
public struct KhungGio: Codable, Equatable, Sendable {
  public var tu: String
  public var den: String
  public var thu: [Int]?
  public init(tu: String, den: String, thu: [Int]? = nil) { self.tu = tu; self.den = den; self.thu = thu }

  static func phut(_ s: String) -> Int? {
    let p = s.split(separator: ":").compactMap { Int($0) }
    guard p.count == 2, (0...23).contains(p[0]), (0...59).contains(p[1]) else { return nil }
    return p[0] * 60 + p[1]
  }

  /// `phutNgay` = phút từ 0 giờ; `thuNay` 0 = CN. Khung qua nửa đêm (21:30–06:30) tính cả hai phía.
  public func chua(phutNgay: Int, thuNay: Int) -> Bool {
    guard let a = KhungGio.phut(tu), let b = KhungGio.phut(den), a != b else { return false }
    if let t = thu, !t.contains(thuNay) { return false }
    return a < b ? (phutNgay >= a && phutNgay < b) : (phutNgay >= a || phutNgay < b)
  }
}

/// Phần tử mảng đọc khoan dung: hỏng ⇒ nil, không làm hỏng cả mảng.
struct KhoanDung<T: Decodable>: Decodable {
  let v: T?
  init(from decoder: Decoder) throws { v = try? T(from: decoder) }
}

/// Ngoại lệ Ba Mẹ mở: `app` nil = cả máy.
public struct NgoaiLeMo: Codable, Equatable, Sendable {
  public var den: Date
  public var app: String?
  public init(den: Date, app: String?) { self.den = den; self.app = app }
  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    guard let d = NgayGio.doc((try? c.decodeIfPresent(String.self, forKey: .den)) ?? nil) else {
      throw DecodingError.dataCorruptedError(forKey: .den, in: c, debugDescription: "den sai")
    }
    den = d
    app = ((try? c.decodeIfPresent(String.self, forKey: .app)) ?? nil).map { $0.trimmingCharacters(in: .whitespaces).lowercased() }.flatMap { $0.isEmpty ? nil : $0 }
  }
  public func encode(to encoder: Encoder) throws {
    var c = encoder.container(keyedBy: CodingKeys.self)
    try c.encode(NgayGio.viet(den), forKey: .den)
    try c.encodeIfPresent(app, forKey: .app)
  }
  enum CodingKeys: String, CodingKey { case den, app }
}

/// Lý do đóng app thêm cho tray (TrangThai.chanLyDo): «het_gio» = hết quỹ hôm nay ⇒ Dùng sao / Xin Ba Mẹ.
public enum QuyGio {
  public static let lyDoHetGio = "het_gio"

  /// Phút quỹ còn tại chỗ = quỹ lúc đồng bộ − giây app tính giờ đã chạy từ đó (làm tròn xuống). nil = Policy không mang quỹ.
  public static func conPhut(_ p: Policy, quyGiay: Double) -> Int? {
    guard let q = p.quyConPhut else { return nil }
    return max(0, Int(((Double(q) * 60 - quyGiay) / 60).rounded(.down)))
  }

  /// Còn giây quỹ không (giữ dạng giây để không tắt sớm 59 giây).
  public static func hetQuy(_ p: Policy, quyGiay: Double) -> Bool {
    guard let q = p.quyConPhut, !p.appTinhGio.isEmpty else { return false }
    return Double(q) * 60 - quyGiay <= 0
  }

  /// App tiền cảnh có phải app tính giờ (so bundle id / tên .app, không phân biệt hoa thường).
  public static func laAppTinhGio(_ p: Policy, tienCanh: String?) -> Bool {
    guard let t = tienCanh?.lowercased(), !t.isEmpty, t != DemPhut.khongRo else { return false }
    return p.appTinhGio.contains { $0 == t || $0 == t + ".app" }
  }

  /// Policy hiệu lực sau khi áp quỹ / ngoại lệ / lịch tại chỗ. `matMang` = đang chạy theo Policy nhớ (xét giờ ngủ / giờ học bằng đồng hồ máy).
  /// Trả kèm danh sách app bị bỏ vì hết quỹ (để ghi lý do «het_gio»).
  public static func apDung(_ p: Policy, quyGiay: Double, now: Date, matMang: Bool, lich: Calendar = .current) -> (policy: Policy, hetQuy: Set<String>) {
    var q = p
    let caMay = (p.grantEndsAt.map { $0 > now } ?? false) && p.ngoaiLe.contains { $0.app == nil && $0.den > now }
    // 1) ngoại lệ một app hết hạn ⇒ bỏ app đó (trừ khi app cũng thuộc app Học)
    let hoc = Set(p.learningApps.map { $0.lowercased() })
    let conHan = Set(p.ngoaiLe.filter { $0.den > now }.compactMap(\.app))
    let hetHan = Set(p.ngoaiLe.filter { $0.den <= now }.compactMap(\.app)).subtracting(conHan).subtracting(hoc)
    if !hetHan.isEmpty { q.allowedApps.removeAll { hetHan.contains($0.lowercased()) } }
    // 2) mất mạng ⇒ tự xét giờ ngủ / giờ học (máy chủ không nói được nữa). Ngoại lệ cả máy còn hạn thắng.
    if matMang, !caMay {
      let c = lich.dateComponents([.hour, .minute, .weekday], from: now)
      let phut = (c.hour ?? 0) * 60 + (c.minute ?? 0), thu = ((c.weekday ?? 1) - 1)
      if let n = p.gioNgu, n.chua(phutNgay: phut, thuNay: thu), !q.locked {
        q.mode = CheDo.khoa.rawValue; q.locked = true; q.lockReason = LyDoKhoa.ngu
        q.allowedApps = q.allowedApps.filter { conHan.contains($0.lowercased()) }      // chỉ app ngoại lệ còn hạn (+ app hệ thống daemon tự thêm)
        q.grantEndsAt = nil
      } else if let h = p.gioHoc, h.chua(phutNgay: phut, thuNay: thu) {
        q.dangGioHoc = true
        if q.mode == CheDo.tuDo.rawValue, !(q.grantEndsAt.map { $0 > now } ?? false) { q.mode = CheDo.hoc.rawValue }
      }
      // giờ ngủ / học đã qua lúc mất mạng: không tự mở thêm (máy chủ quyết khi có mạng lại)
    }
    // 3) quỹ: hết (hoặc giờ học) ⇒ bỏ app tính giờ khỏi danh sách; «Mở hết» (tu_do) thì đóng hẳn chúng
    var bo = Set<String>()
    if !caMay, !p.appTinhGio.isEmpty, hetQuy(p, quyGiay: quyGiay) || q.dangGioHoc {
      bo = Set(p.appTinhGio).subtracting(conHan).subtracting(hoc)
      q.allowedApps.removeAll { bo.contains($0.lowercased()) }
      if q.mode == CheDo.tuDo.rawValue {
        let da = Set(q.blockedApps.map(\.muc))
        q.blockedApps += bo.sorted().filter { !da.contains($0) }.map { AppBiChan(muc: $0) }
      }
      q.appTinhGio = []
    }
    return (q, hetQuy(p, quyGiay: quyGiay) ? bo : [])
  }
}
