// Lựa chọn app của Ba Mẹ (FamilyActivityPicker) — token mờ, chỉ lưu trong app group trên máy; máy chủ chỉ biết SỐ LƯỢNG.
import Foundation
import FamilyControls
import ConCore

public enum NhanApp: String, CaseIterable, Identifiable {
  case hoc, giaiTri, chan
  public var id: String { rawValue }
  public var khoa: String { switch self { case .hoc: Khoa.chonHoc; case .giaiTri: Khoa.chonGiaiTri; case .chan: Khoa.chonChan } }
  public var ten: String { switch self { case .hoc: "App học"; case .giaiTri: "App giải trí"; case .chan: "App chặn hẳn" } }
  public var moTa: String {
    switch self {
    case .hoc: "Luôn mở, kể cả ngoài giờ chơi (trừ giờ ngủ và Khoá ngay)."
    case .giaiTri: "Chỉ mở trong giờ chơi, tính vào số phút mỗi ngày."
    case .chan: "Luôn bị chặn."
    }
  }
}

public final class LuaChonApp: NguonLuaChon {
  let kho: KhoGiaTri
  public init(kho: KhoGiaTri = KhoUserDefaults()) { self.kho = kho }

  public func doc(_ n: NhanApp) -> FamilyActivitySelection {
    guard let d = kho.data(n.khoa), let s = try? JSONDecoder().decode(FamilyActivitySelection.self, from: d) else { return FamilyActivitySelection() }
    return s
  }

  public func luu(_ s: FamilyActivitySelection, _ n: NhanApp) { kho.ghi(try? JSONEncoder().encode(s), n.khoa) }

  public func dem() -> SoLuongChon {
    let h = doc(.hoc), g = doc(.giaiTri), c = doc(.chan)
    return SoLuongChon(hoc: h.applicationTokens.count, giaiTri: g.applicationTokens.count, chan: c.applicationTokens.count,
                       danhMucGiaiTri: g.categoryTokens.count)
  }
}
