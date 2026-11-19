// #422 «Xin thêm app / web» (thiết kế con-cai-mac 41–44, kết quả them-5ici9ysd): phần THUẦN của hộp xin hai thẻ — lọc lưới app đã cài,
// soạn lời xin gửi daemon (muc = bundle id khi chọn từ lưới, ten = tên app; thẻ web: địa chỉ Con gõ), chữ nút. Giao diện ở tray (XinMoView).
import Foundation

public enum XinThem {
  /// Hai thẻ của hộp xin: «App trên Mac» / «Trang web».
  public enum The: String, CaseIterable, Sendable { case app, web }

  /// Một lời xin sẵn sàng gửi (`kieu` = trường `kieu` của api/device/xin-duyet).
  public struct LoiXin: Equatable, Sendable {
    public var muc: String
    public var ten: String?
    public var kieu: String
    public init(muc: String, ten: String?, kieu: String) { self.muc = muc; self.ten = ten; self.kieu = kieu }
  }

  /// Chỉ «app» | «web» đi lên máy chủ; giá trị lạ ⇒ nil (máy chủ tự xếp như trước #422).
  public static func kieuHopLe(_ k: String?) -> String? {
    guard let k = k?.trimmingCharacters(in: .whitespaces).lowercased(), k == "app" || k == "web" else { return nil }
    return k
  }

  /// Tên hiển thị đi qua IPC: bỏ ký tự điều khiển, cắt khoảng trắng, tối đa 100 ký tự; rỗng ⇒ nil.
  public static func tenGon(_ ten: String?) -> String? {
    guard let ten else { return nil }
    let t = String(ten.unicodeScalars.filter { !CharacterSet.controlCharacters.contains($0) }).trimmingCharacters(in: .whitespacesAndNewlines)
    return t.isEmpty ? nil : String(t.prefix(100))
  }

  /// Tên Con thấy cho một lời xin: tên app (nếu có) › muc.
  public static func tenHien(muc: String, ten: String?) -> String { tenGon(ten) ?? muc }

  /// Lưới «App đã cài trên Mac»: bỏ trùng bundle id (cùng app ở /Applications và ~/Applications), bỏ tên rỗng, xếp theo tên.
  public static func dsApp(_ ds: [AppMay]) -> [AppMay] {
    var thay = Set<String>()
    return ds.filter { a in
      let k = a.muc.lowercased()
      guard !k.isEmpty, !a.ten.trimmingCharacters(in: .whitespaces).isEmpty, !thay.contains(k) else { return false }
      thay.insert(k); return true
    }
    .sorted { $0.ten.localizedStandardCompare($1.ten) == .orderedAscending }
  }

  /// App điền sẵn khi mở hộp từ màn «… chưa có trong danh sách» (tên hoặc bundle id app vừa bị đóng).
  public static func appBanDau(_ ds: [AppMay], _ ten: String) -> AppMay? {
    let t = ten.trimmingCharacters(in: .whitespaces)
    guard !t.isEmpty else { return nil }
    return ds.first { $0.muc.caseInsensitiveCompare(t) == .orderedSame } ?? ds.first { $0.ten.caseInsensitiveCompare(t) == .orderedSame }
  }

  /// Lời xin của thẻ đang mở; nil = chưa đủ (chưa chọn app / chưa gõ địa chỉ) ⇒ nút gửi tắt.
  /// Thẻ app: `app` chọn từ lưới (muc = bundle id) hoặc `tenTran` (app vừa bị đóng mà không thấy trong lưới — máy chủ nhận tên trần).
  public static func loiXin(the: The, app: AppMay?, tenTran: String = "", web: String) -> LoiXin? {
    switch the {
    case .app:
      if let app { return LoiXin(muc: app.muc, ten: app.ten, kieu: "app") }
      let t = tenTran.trimmingCharacters(in: .whitespaces)
      return t.isEmpty ? nil : LoiXin(muc: t, ten: t, kieu: "app")
    case .web:
      let w = web.trimmingCharacters(in: .whitespacesAndNewlines)
      return w.isEmpty ? nil : LoiXin(muc: w, ten: nil, kieu: "web")
    }
  }

  /// Chữ nút gửi (thiết kế 43 / 44).
  public static func nut(the: The, tenApp: String?) -> String {
    switch the {
    case .app:
      let t = tenApp?.trimmingCharacters(in: .whitespaces) ?? ""
      return "Xin Ba Mẹ thêm " + (t.isEmpty ? "app" : t)
    case .web: return "Xin Ba Mẹ mở trang này"
    }
  }
}
