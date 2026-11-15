// Lựa chọn app của Ba Mẹ (FamilyActivityPicker) — token mờ, chỉ lưu trong app group trên máy; máy chủ chỉ biết SỐ LƯỢNG.
import Foundation
import FamilyControls
import ConCore

public enum NhanApp: String, CaseIterable, Identifiable {
  case hoc, giaiTri, chan
  public var id: String { rawValue }
  public var khoa: String { switch self { case .hoc: Khoa.chonHoc; case .giaiTri: Khoa.chonGiaiTri; case .chan: Khoa.chonChan } }
  /// 15/11 (#262): danh sách trắng 2 nhóm — Học = «Không tính phút», Giải trí = «Tính phút» (1 sao = 1 phút). Nhãn «Chặn» bỏ (ngoài danh sách đã không mở).
  public var ten: String { switch self { case .hoc: "Không tính phút"; case .giaiTri: "Tính phút"; case .chan: "Chặn (cũ)" } }
  public var moTa: String {
    switch self {
    case .hoc: "App học: vào thoải mái, không trừ sao."
    case .giaiTri: "YouTube, phim, game: 1 sao = 1 phút, hết sao thì dừng."
    case .chan: "Không còn dùng — app ngoài danh sách đã không mở."
    }
  }
  /// Nhãn Ba Mẹ chọn được trên máy (bỏ «Chặn»).
  public static let dangDung: [NhanApp] = [.giaiTri, .hoc]
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
