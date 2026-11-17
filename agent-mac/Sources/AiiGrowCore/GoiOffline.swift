// #337 (17/11): «gói mất mạng theo bé» của máy dùng chung. Máy chủ chỉ gửi luật của bé ĐANG đăng nhập ở dong-bo ⇒ mất mạng mà «Đổi người»,
// bé sau từng chạy bằng Policy của bé trước (khoá, giới hạn, sao) và — vì sổ sao là của bé khác — không bị trừ sao (chơi miễn phí tới khi có mạng).
// `GET api/device/ho-so?offline=1` (máy chủ PR #342) gửi kèm `con[i].offline` = thân dong-bo của TỪNG bé (Policy + khối `windows`, không có
// `maOfflineBiMat` / `lenh` / `nguoiDung`) + `offlineLuc`. Daemon lưu riêng theo bé (cấu hình đĩa, bền qua khởi động lại); đổi bé ⇒ nạp gói đúng bé
// (luật + bộ đếm sao / giờ tại chỗ của bé đó). Bé không có gói ⇒ không cho vào lúc mất mạng (khoá tới khi có mạng), không mượn luật bé khác.
import Foundation

/// Luật của một bé lúc mất mạng + bộ đếm tại chỗ kể từ mốc của luật đó (như `policyCuoi` / `quyGiayTuSync` / `daDungGiayTuSync` của bé đang dùng).
public struct GoiOfflineBe: Codable, Equatable {
  public var policy: Policy
  /// Mốc của luật (offlineLuc của ho-so, hoặc lúc đồng bộ được luật bé đó) — giới hạn phiên chơi offline tính từ đây.
  public var luc: Date
  /// Giây «Tính phút» đã đếm tại chỗ kể từ `luc` (sao trừ tại chỗ).
  public var quyGiay: Double
  /// Giây dùng máy đã đếm kể từ `luc` (minutesLeft cũ).
  public var dungGiay: Double
  public init(policy: Policy, luc: Date, quyGiay: Double = 0, dungGiay: Double = 0) {
    self.policy = policy; self.luc = luc; self.quyGiay = quyGiay; self.dungGiay = dungGiay
  }
}

public enum GoiOffline {
  /// Đường daemon gọi để lấy hồ sơ máy kèm gói của từng bé (máy chủ cũ bỏ qua tham số ⇒ ho-so như cũ).
  public static let duongHoSo = "ho-so?offline=1"

  /// Đọc `con[i].offline` của ho-so?offline=1 → [id bé: gói]. nil = phản hồi không mang gói (máy riêng / máy chủ chưa hỗ trợ).
  /// Sổ sao lấy từ `sao` ở gốc gói (như dong-bo); gói thiếu thì lấy `con[i].sao` / `soDu` / `no` của ho-so. Không giữ bí mật mã offline.
  public static func doc(_ d: Data, now: Date) -> [String: GoiOfflineBe]? {
    guard let o = (try? JSONSerialization.jsonObject(with: d)) as? [String: Any], let ds = o["con"] as? [[String: Any]] else { return nil }
    let luc = NgayGio.doc(o["offlineLuc"] as? String)
    var ra: [String: GoiOfflineBe] = [:]
    for c in ds {
      guard let id = JsonMem.chuoi(c["id"]), !id.isEmpty, let off = c["offline"] as? [String: Any],
            let raw = try? JSONSerialization.data(withJSONObject: off), var p = try? ApiClient.tachDongBo(raw).policy else { continue }
      if p.soSao == nil, let s = (c["sao"] as? NSNumber)?.doubleValue, s.isFinite {
        p.soSao = SoSao(sao: Int(s.rounded(.down)), no: (c["no"] as? NSNumber)?.intValue ?? 0,
                        phutCon: (c["soDu"] as? NSNumber).map { Int($0.doubleValue.rounded(.down)) })
      }
      p.maOfflineBiMat = nil
      ra[id] = GoiOfflineBe(policy: p, luc: luc ?? now)
    }
    guard luc != nil || !ra.isEmpty else { return nil }
    return ra
  }
}
