// Sao = phút (sổ sao 15/11, #264) — THUẦN, test được. Thay quỹ giờ chơi + giờ ngủ / giờ học + ngoại lệ (đã bỏ).
// Máy chủ tính sẵn Policy (agent-windows.ts): còn sao ⇒ app / trang «Tính phút» nằm trong allowedApps + `appTinhGio`. Tác tử chỉ làm phần máy chủ
// không làm kịp giữa hai lần đồng bộ (và khi MẤT MẠNG): đếm lùi `sao.phutCon` theo giây app «Tính phút» ở tiền cảnh (1 sao = 1 phút), hết ⇒ đóng
// các app đó (nhóm «Không tính phút» vẫn mở). «Mở hết» ⇒ không đếm, không đóng. Máy mở bằng mã offline ⇒ không trừ sao, không đóng.
import Foundation

public enum SaoPhut {
  /// Lý do đóng app cho tray (TrangThai.chanLyDo): hết sao ⇒ màn «Hết sao rồi» (Làm nhiệm vụ / Xin Ba Mẹ cho vay sao).
  public static let lyDoHetSao = "het_sao"

  /// App / trang «Tính phút»: `appTinhGio` khi máy chủ đang thả nhờ sao; hết sao máy chủ gửi `appTinhGio` rỗng ⇒ dùng `playChoices`
  /// (mọi mục «Tính phút» trong danh sách của Con) để vẫn biết app nào phải đóng.
  public static func dsTinhPhut(_ p: Policy) -> Set<String> {
    Set((p.appTinhGio.isEmpty ? p.playChoices : p.appTinhGio).map { $0.lowercased() })
  }

  /// Phút sao lúc đồng bộ: `sao.phutCon` (máy chủ sổ sao) › `quyConPhut` (máy chủ trước sổ sao, cùng nghĩa từ 15/11) › nil = không giới hạn.
  public static func phutGoc(_ p: Policy) -> Int? {
    if p.moHet { return nil }
    if let s = p.soSao { return s.phutCon }
    return p.quyConPhut
  }

  /// Sao còn tiêu được tại chỗ = lúc đồng bộ − giây «Tính phút» đã chạy từ đó (làm tròn xuống). nil = không giới hạn («Mở hết» / máy chủ không gửi).
  public static func conPhut(_ p: Policy, giay: Double) -> Int? {
    guard let g = phutGoc(p) else { return nil }
    return max(0, Int(((Double(g) * 60 - giay) / 60).rounded(.down)))
  }

  /// Số dư Con thấy tại chỗ (âm được): số dư lúc đồng bộ − phút đã trừ thêm tại chỗ (không xuống dưới phần nợ).
  public static func soDu(_ p: Policy, giay: Double) -> Int? {
    guard let s = p.soSao ?? p.saoCon.map({ SoSao(sao: $0) }) else { return nil }
    guard !p.moHet, let c = conPhut(p, giay: giay) else { return s.sao }
    return s.sao - max(0, s.phutCon - c)
  }

  /// Hết sao chưa (giữ dạng giây để không tắt sớm 59 giây). Không có app «Tính phút» ⇒ không có gì để hết.
  public static func hetSao(_ p: Policy, giay: Double) -> Bool {
    guard let g = phutGoc(p), !dsTinhPhut(p).isEmpty else { return false }
    return Double(g) * 60 - giay <= 0
  }

  /// App tiền cảnh có phải app «Tính phút» (so bundle id / tên .app, không phân biệt hoa thường). Không kiểm được app tiền cảnh
  /// (`tienCanh` nil / «khong-ro») ⇒ tính khi `coAppTinhPhutDangChay`: lsappinfo lỗi không thành phút chơi miễn phí, Con ở app học không bị trừ oan.
  public static func laAppTinhPhut(_ p: Policy, tienCanh: String?, coAppTinhPhutDangChay: Bool = false) -> Bool {
    guard let t = tienCanh?.lowercased(), !t.isEmpty, t != DemPhut.khongRo else { return coAppTinhPhutDangChay }
    return dsTinhPhut(p).contains { $0 == t || $0 == t + ".app" }
  }

  /// Policy hiệu lực sau khi áp sao tại chỗ. `moBangMa` = máy đang mở bằng mã offline (không trừ sao, không đóng).
  /// Trả kèm app / trang bị bỏ vì hết sao (lý do «het_sao»).
  public static func apDung(_ p: Policy, giay: Double, now: Date, moBangMa: Bool = false) -> (policy: Policy, hetSao: Set<String>) {
    // Cửa sổ «mở» có hạn (Ba Mẹ đang dùng máy / mở tạm): máy chủ gửi tu_do + grantEndsAt ⇒ hết sao không đóng gì trong lúc đó.
    let moCoHan = (p.grantEndsAt.map { $0 > now } ?? false) && p.mode != CheDo.khoa.rawValue && !p.locked
    guard !p.moHet, !moBangMa, !moCoHan, hetSao(p, giay: giay) else { return (p, []) }
    var q = p
    let bo = dsTinhPhut(p).subtracting(p.learningApps.map { $0.lowercased() })
    q.allowedApps.removeAll { bo.contains($0.lowercased()) }
    if var w = q.web {                                       // trang «Tính phút» trong danh sách cũng thôi mở
      let mien = Set(w.cho.filter { bo.contains($0.lowercased()) })
      w.cho.removeAll { mien.contains($0) }
      w.choKhiMo.removeAll { mien.contains($0) }
      if w.cheDo == ChinhSachWeb.mo, !mien.isEmpty { w.chan = Array(Set(w.chan).union(mien)).sorted() }
      q.web = w
    }
    q.appTinhGio = []
    return (q, bo)
  }
}
