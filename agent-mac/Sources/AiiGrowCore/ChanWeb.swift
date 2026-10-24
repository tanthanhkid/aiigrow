// LỌC WEB trên Mac — phần THUẦN (test được, không I/O):
//   • Chrome / Edge / Brave / Cốc Cốc: plist chính sách quản lý (URLBlocklist / URLAllowlist + tắt ẩn danh, xoá lịch sử, chế độ khách)
//     ở «/Library/Managed Preferences/<tài khoản Con>/<bundle id>.plist» — đường theo NGƯỜI DÙNG nên chỉ tài khoản Con bị lọc, Ba Mẹ không.
//     Plist mang khoá «AiiGrowManaged» = true để go-cai.sh nhận ra tệp của AiiGrow.
//   • Safari (không có chính sách URL ngoài MDM): khối /etc/hosts mở bằng «# AiiGrow BEGIN», đóng bằng «# AiiGrow END», mỗi dòng trong khối
//     còn đuôi « # AiiGrow» — gỡ được cả khi khối mất dòng đóng. hosts áp cho CẢ máy nên daemon chỉ đặt khi Con đang ở màn hình.
//     hosts không làm được «chỉ cho phép» (không chặn được «mọi thứ trừ…») — chế độ đó Safari dựa vào chặn app (mode «hoc»).
// Máy chủ quyết định danh sách (dong-bo.windows.web, server/lib/web.ts); daemon chỉ áp, như agent-win WebGuard.cs.
import Foundation

public enum KhoiHosts {
  public static let moc = "# AiiGrow"
  public static let batDau = "# AiiGrow BEGIN"
  public static let ketThuc = "# AiiGrow END"
  public static let tranTenMien = 1000

  /// Gỡ khối của AiiGrow (và mọi dòng mang đuôi « # AiiGrow»), giữ nguyên mọi dòng của người khác.
  public static func go(_ noiDung: String) -> String {
    var ra: [Substring] = []
    var trongKhoi = false
    let dong = noiDung.split(separator: "\n", omittingEmptySubsequences: false)
    for d in dong {
      let t = d.trimmingCharacters(in: .whitespaces)
      if t == batDau { trongKhoi = true; continue }
      if t == ketThuc { trongKhoi = false; continue }
      if trongKhoi && laDongCuaTa(t) { continue }
      if laDongCuaTa(t) { continue }
      if trongKhoi && t.isEmpty { continue }
      ra.append(d)
    }
    // Bỏ dòng trống thừa ở cuối do khối để lại, giữ đúng một xuống dòng cuối như tệp gốc.
    var kq = ra.joined(separator: "\n")
    while kq.hasSuffix("\n\n") { kq.removeLast() }
    return kq
  }

  /// Thay khối của AiiGrow bằng danh sách mới (rỗng ⇒ chỉ gỡ). Thêm cả «www.» cho mỗi tên miền; trỏ về 0.0.0.0 và :: (IPv6).
  public static func ap(_ noiDung: String, tenMien: [String]) -> String {
    let goc = go(noiDung)
    let ds = Array(Set(tenMien.compactMap(ChinhSachWeb.sach))).sorted().prefix(tranTenMien)
    guard !ds.isEmpty else { return goc }
    var khoi = [batDau]
    for m in ds {
      for h in m.hasPrefix("www.") ? [m] : [m, "www." + m] {
        khoi.append("0.0.0.0 \(h) \(moc)")
        khoi.append(":: \(h) \(moc)")
      }
    }
    khoi.append(ketThuc)
    var dau = goc
    if !dau.isEmpty && !dau.hasSuffix("\n") { dau += "\n" }
    return dau + khoi.joined(separator: "\n") + "\n"
  }

  private static func laDongCuaTa(_ t: String) -> Bool { t.hasSuffix(moc) && !t.hasPrefix("#") }
}

public enum ChinhSachTrinhDuyet {
  public struct TrinhDuyet: Equatable {
    public var ten: String
    public var bundleId: String
    public var coAnDanh: String
    public var scheme: String
  }

  public static let thuMuc = "/Library/Managed Preferences"
  public static let khoaDanhDau = "AiiGrowManaged"
  public static let tatCa: [TrinhDuyet] = [
    TrinhDuyet(ten: "Chrome", bundleId: "com.google.Chrome", coAnDanh: "IncognitoModeAvailability", scheme: "chrome://*"),
    TrinhDuyet(ten: "Edge", bundleId: "com.microsoft.Edge", coAnDanh: "InPrivateModeAvailability", scheme: "edge://*"),
    TrinhDuyet(ten: "Brave", bundleId: "com.brave.Browser", coAnDanh: "IncognitoModeAvailability", scheme: "brave://*"),
    // Cốc Cốc (Chromium, phổ biến ở VN) — thiếu thì Con mở YouTube bằng Cốc Cốc là lọt (agent-win 0.2.5).
    TrinhDuyet(ten: "CocCoc", bundleId: "com.coccoc.Coccoc", coAnDanh: "IncognitoModeAvailability", scheme: "coccoc://*"),
  ]
  /// Khoá AiiGrow sở hữu trong plist — gỡ thì chỉ xoá các khoá này, khoá của người khác giữ nguyên.
  public static func khoaCuaTa(_ t: TrinhDuyet) -> [String] {
    [khoaDanhDau, khoaGoc, "URLBlocklist", "URLAllowlist", t.coAnDanh, "AllowDeletingBrowserHistory", "BrowserGuestModeEnabled"]
  }
  public static let tranMuc = 900   // Chrome giới hạn 1000 mục mỗi danh sách

  public static func duongDan(_ t: TrinhDuyet, taiKhoan: String, thuMucGoc: String = thuMuc) -> String {
    "\(thuMucGoc)/\(taiKhoan)/\(t.bundleId).plist"
  }

  /// Danh sách chặn / cho phép theo cú pháp chính sách Chromium (như WebPolicyKeys.Lap).
  public static func lap(_ p: ChinhSachWeb, mayChuHost: String?) -> (chan: [String], cho: [String]) {
    var chan: [String] = [], cho: [String] = []
    if p.cheDo == ChinhSachWeb.chiChoPhep {
      chan.append("*")
      cho += tatCa.map(\.scheme)
      if let h = ChinhSachWeb.sach(mayChuHost) { cho.append(h) }
    }
    chan += p.chan
    cho += p.cho
    func duyNhat(_ a: [String]) -> [String] { var s = Set<String>(); return Array(a.filter { s.insert($0).inserted }.prefix(tranMuc)) }
    return (duyNhat(chan), duyNhat(cho))
  }

  /// Khoá lưu giá trị GỐC (của MDM/người khác) mà ta ghi đè — gỡ thì trả lại đúng giá trị đó.
  public static let khoaGoc = "AiiGrowGoc"

  /// Nội dung plist mong muốn: gộp lên `cu` (plist sẵn có, nil nếu chưa có).
  /// • Plist KHÔNG có dấu `AiiGrowManaged` là của người khác: `p` nil ⇒ không động vào; `p` có ⇒ gộp vào, danh sách URL hợp nhất,
  ///   giá trị gốc của các khoá ta ghi đè được cất ở `AiiGrowGoc` để trả lại khi gỡ.
  /// • `p` nil trên plist của ta ⇒ gỡ khoá của ta (trả lại giá trị gốc); rỗng ⇒ nil (xoá tệp).
  public static func gop(cu: [String: Any]?, trinhDuyet t: TrinhDuyet, p: ChinhSachWeb?, mayChuHost: String?) -> [String: Any]? {
    let coDau = cu?[khoaDanhDau] != nil
    guard coDau || p != nil else { return cu }                       // giám sát/gỡ mà tệp không phải của ta: để nguyên
    let nho = khoaCuaTa(t).filter { $0 != khoaDanhDau }
    var d = cu ?? [:]
    // Giá trị gốc: của lần gộp trước (nếu tệp đã là của ta) hoặc đang có trong tệp của người khác.
    var goc: [String: Any] = coDau ? (d[khoaGoc] as? [String: Any] ?? [:]) : Dictionary(uniqueKeysWithValues: nho.compactMap { k in d[k].map { (k, $0) } })
    for k in nho + [khoaDanhDau, khoaGoc] { d.removeValue(forKey: k) }
    for (k, v) in goc { d[k] = v }                                    // trả giá trị gốc trước
    if let p {
      let (chan, cho) = lap(p, mayChuHost: mayChuHost)
      func hop(_ k: String, _ ta: [String]) -> [String] {
        var s = Set<String>(); let g = goc[k] as? [String] ?? []
        return Array((ta + g).filter { s.insert($0).inserted }.prefix(tranMuc))      // mục của AiiGrow (kể cả «*») đứng trước, luôn được giữ khi cắt trần
      }
      d[khoaDanhDau] = true
      d["URLBlocklist"] = hop("URLBlocklist", chan)
      d["URLAllowlist"] = hop("URLAllowlist", cho)
      d[t.coAnDanh] = 1                    // không ẩn danh ⇒ lịch sử web luôn đủ
      d["AllowDeletingBrowserHistory"] = false
      d["BrowserGuestModeEnabled"] = false
      goc = goc.filter { nho.contains($0.key) }
      if !goc.isEmpty { d[khoaGoc] = goc }
    }
    return d.isEmpty ? nil : d
  }

  public static func maHoa(_ d: [String: Any]) throws -> Data {
    try PropertyListSerialization.data(fromPropertyList: d, format: .xml, options: 0)
  }

  public static func giaiMa(_ data: Data?) -> [String: Any]? {
    guard let data, !data.isEmpty else { return nil }
    return (try? PropertyListSerialization.propertyList(from: data, format: nil)) as? [String: Any]
  }
}
