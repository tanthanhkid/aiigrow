// LỊCH SỬ WEB của Con trên Mac (bản Swift của agent-win WebHistory.cs + WebHistoryWorker): daemon (root) đọc lịch sử Chrome / Edge / Brave
// (Chromium `History`, bảng visits+urls) và Safari (`~/Library/Safari/History.db`, cần Full Disk Access — thiếu thì bỏ qua) của tài khoản Con,
// gộp TỔNG theo (ngày, tên miền gốc): số lần mở + số giây + lần cuối ⇒ POST /api/device/web/lich-su (server/lib/web.ts).
// CHỈ tên miền + đếm rời máy — không URL đầy đủ, không tiêu đề. Gửi tổng của hôm qua + hôm nay mỗi lần (máy chủ lấy giá trị lớn hơn ⇒ không cộng đôi).
import Foundation
import SQLite3

public struct LuotWeb: Equatable { public var url: String; public var luc: Date; public var giay: Double
  public init(url: String, luc: Date, giay: Double) { self.url = url; self.luc = luc; self.giay = giay } }

public struct TongWebNgay: Equatable { public var ngay: String; public var tenMien: String; public var soLan: Int; public var giay: Int; public var lanCuoi: Date }

public enum TenMienGoc {
  static let nhanLoai: Set<String> = ["com", "net", "org", "edu", "gov", "co", "ac", "or", "ne", "go", "gob", "info", "biz"]

  /// URL ⇒ tên miền gốc (bỏ www; «hdbank.com.vn», «bbc.co.uk» giữ 3 nhãn). Không phải http(s), IP, localhost ⇒ nil.
  public static func tu(url: String?) -> String? {
    guard let u = url.flatMap(URL.init(string:)), let s = u.scheme?.lowercased(), s == "http" || s == "https", let host = u.host else { return nil }
    return tu(host: host)
  }

  public static func tu(host: String?) -> String? {
    var h = (host ?? "").trimmingCharacters(in: CharacterSet(charactersIn: ". ")).lowercased()
    if h.hasPrefix("www.") { h.removeFirst(4) }
    guard !h.isEmpty, h.contains("."), !h.hasPrefix("["), !laIP(h) else { return nil }
    let p = h.split(separator: ".").map(String.init)
    if p.count <= 2 { return h }
    let giu = p[p.count - 1].count == 2 && nhanLoai.contains(p[p.count - 2]) ? 3 : 2
    return p.suffix(giu).joined(separator: ".")
  }

  static func laIP(_ h: String) -> Bool {
    let p = h.split(separator: ".")
    return p.count == 4 && p.allSatisfy { Int($0).map { (0...255).contains($0) } ?? false } || h.contains(":")
  }
}

public enum LichSuWeb {
  /// Mỗi lượt ghé tính tối đa 3 giờ (tab bỏ quên cả đêm không thổi phồng).
  public static let tranMotLuotGiay: Double = 3 * 3600
  public static let toiDaMotLan = 500

  public static func tongHop(_ ds: [LuotWeb], lich: Calendar = .current) -> [TongWebNgay] {
    var d: [String: (lan: Int, giay: Double, cuoi: Date)] = [:]
    for v in ds {
      guard let mien = TenMienGoc.tu(url: v.url) else { continue }
      let k = DemPhut.ngay(v.luc, lich: lich) + "|" + mien
      let c = d[k] ?? (0, 0, .distantPast)
      d[k] = (c.lan + 1, c.giay + min(max(v.giay, 0), tranMotLuotGiay), max(c.cuoi, v.luc))
    }
    return d.map { k, v in
      let p = k.split(separator: "|", maxSplits: 1).map(String.init)
      return TongWebNgay(ngay: p[0], tenMien: p[1], soLan: v.lan, giay: Int(v.giay.rounded()), lanCuoi: v.cuoi)
    }.sorted { ($0.ngay, $0.tenMien) < ($1.ngay, $1.tenMien) }
  }

  /// 00:00 hôm qua theo giờ máy.
  public static func mocDoc(_ now: Date, lich: Calendar = .current) -> Date {
    lich.date(byAdding: .day, value: -1, to: lich.startOfDay(for: now)) ?? now.addingTimeInterval(-86_400)
  }

  public static func than(_ ds: [TongWebNgay]) -> [String: Any] {
    ["ds": ds.prefix(toiDaMotLan).map { ["ngay": $0.ngay, "tenMien": $0.tenMien, "soLan": $0.soLan, "giay": $0.giay, "lanCuoi": NgayGio.viet($0.lanCuoi)] }]
  }

  // MARK: đọc tệp SQLite (chép ra thư mục tạm trước: trình duyệt đang mở giữ khoá ghi)

  /// Chromium: visit_time micro giây từ 1601-01-01 UTC; visit_duration micro giây.
  static let lech1601: Double = 11_644_473_600
  /// Safari: visit_time giây từ 2001-01-01 UTC (Core Data); không có thời lượng ⇒ 0 giây.

  public static func docChromium(_ duongDan: String, tu: Date) -> [LuotWeb] {
    let moc = Int64((tu.timeIntervalSince1970 + lech1601) * 1_000_000)
    return truyVan(duongDan, "select u.url, v.visit_time, v.visit_duration from visits v join urls u on u.id = v.url where v.visit_time >= ?1", moc) { st in
      let url = String(cString: sqlite3_column_text(st, 0))
      let t = Double(sqlite3_column_int64(st, 1)) / 1_000_000 - lech1601
      return LuotWeb(url: url, luc: Date(timeIntervalSince1970: t), giay: Double(sqlite3_column_int64(st, 2)) / 1_000_000)
    }
  }

  public static func docSafari(_ duongDan: String, tu: Date) -> [LuotWeb] {
    let moc = Int64(tu.timeIntervalSinceReferenceDate)
    return truyVan(duongDan, "select i.url, v.visit_time from history_visits v join history_items i on i.id = v.history_item where v.visit_time >= ?1", moc) { st in
      LuotWeb(url: String(cString: sqlite3_column_text(st, 0)), luc: Date(timeIntervalSinceReferenceDate: sqlite3_column_double(st, 1)), giay: 0)
    }
  }

  static func truyVan(_ duongDan: String, _ sql: String, _ moc: Int64, _ dong: (OpaquePointer) -> LuotWeb) -> [LuotWeb] {
    let fm = FileManager.default
    guard fm.isReadableFile(atPath: duongDan) else { return [] }
    let tam = NSTemporaryDirectory() + "aiigrow-ls-\(UUID().uuidString)"
    guard (try? fm.createDirectory(atPath: tam, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])) != nil else { return [] }
    defer { try? fm.removeItem(atPath: tam) }
    let ban = tam + "/db"
    guard (try? fm.copyItem(atPath: duongDan, toPath: ban)) != nil else { return [] }
    for duoi in ["-wal", "-shm"] where fm.fileExists(atPath: duongDan + duoi) { try? fm.copyItem(atPath: duongDan + duoi, toPath: ban + duoi) }
    var db: OpaquePointer?
    guard sqlite3_open_v2(ban, &db, SQLITE_OPEN_READONLY, nil) == SQLITE_OK, let db else { return [] }
    defer { sqlite3_close(db) }
    var st: OpaquePointer?
    guard sqlite3_prepare_v2(db, sql, -1, &st, nil) == SQLITE_OK, let st else { return [] }
    defer { sqlite3_finalize(st) }
    sqlite3_bind_int64(st, 1, moc)
    var ra: [LuotWeb] = []
    while sqlite3_step(st) == SQLITE_ROW, ra.count < 200_000 {
      guard sqlite3_column_text(st, 0) != nil else { continue }
      ra.append(dong(st))
    }
    return ra
  }

  /// Mọi tệp lịch sử của tài khoản `nha` (thư mục nhà của Con): mọi hồ sơ Chromium (Default, Profile N) + Safari.
  public static func cacTep(nha: String, lietKe: (String) -> [String]) -> (chromium: [String], safari: [String]) {
    let goc = ["Google/Chrome", "Microsoft Edge", "BraveSoftware/Brave-Browser", "Chromium", "Arc/User Data"]
    var c: [String] = []
    for g in goc {
      let tm = nha + "/Library/Application Support/" + g
      for hs in lietKe(tm) where hs == "Default" || hs.hasPrefix("Profile ") { c.append(tm + "/" + hs + "/History") }
    }
    return (c, [nha + "/Library/Safari/History.db"])
  }
}
