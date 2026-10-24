// Một lượt đồng bộ (mở app / BGAppRefreshTask): gửi nhịp ⇒ lập kế hoạch ⇒ đặt lịch DeviceActivity ⇒ áp khiên ⇒ xử lý lệnh.
// Mọi tác động hệ thống đi qua protocol (bản thật ở HeThong/, bản giả trong test) — FamilyControls không chạy trên simulator.
import Foundation

public protocol HeThongKhien: AnyObject {
  /// Áp khiên lúc này: `.moiApp` = mọi danh mục (trừ app hệ thống iOS không cho khiên), `.giaiTri` = app/danh mục Ba Mẹ gắn nhãn Giải trí.
  func ap(_ k: KhienMuonCo)
  func goHet()
}

public protocol HeThongLich: AnyObject {
  func theoDoi(_ lich: [MucLich]) throws
  func dungHet()
}

public protocol HeThongUyQuyen: AnyObject {
  /// "approved" | "denied" | "notDetermined" | "khong_ho_tro"
  var trangThai: String { get }
  func thuHoi() async
}

public struct SoLuongChon: Codable, Equatable {
  public var hoc: Int, giaiTri: Int, chan: Int, danhMucGiaiTri: Int
  public init(hoc: Int, giaiTri: Int, chan: Int, danhMucGiaiTri: Int) {
    self.hoc = hoc; self.giaiTri = giaiTri; self.chan = chan; self.danhMucGiaiTri = danhMucGiaiTri
  }
  public static let rong = SoLuongChon(hoc: 0, giaiTri: 0, chan: 0, danhMucGiaiTri: 0)
}

public protocol NguonLuaChon: AnyObject { func dem() -> SoLuongChon }

public enum KetQuaDongBo: Equatable { case xong(KeHoach), daGo }

public final class DongBo {
  public static let phienBan = "ios-0.1.0"
  let api: ApiClient
  let kho: KhoGiaTri
  let khien: HeThongKhien
  let lich: HeThongLich
  let uyQuyen: HeThongUyQuyen
  let chon: NguonLuaChon
  let xoaToken: () -> Void

  public init(api: ApiClient, kho: KhoGiaTri, khien: HeThongKhien, lich: HeThongLich, uyQuyen: HeThongUyQuyen,
              chon: NguonLuaChon, xoaToken: @escaping () -> Void) {
    self.api = api; self.kho = kho; self.khien = khien; self.lich = lich; self.uyQuyen = uyQuyen; self.chon = chon; self.xoaToken = xoaToken
  }

  func nhipGui(now: Date, nguon: String) -> NhipGui {
    let kh = kho.doc(KeHoach.self, Khoa.keHoach)
    let dung = kh.map { TinhKhien.phutDaDung($0, now: now, dung: kho.doc(NhatKyDung.self, Khoa.nhatKyDung)) } ?? 0
    let lan = kho.doc(Date.self, Khoa.lanDongBo)
    let sl = chon.dem()
    let uq = uyQuyen.trangThai
    return NhipGui(phienBan: Self.phienBan, clientTime: NgayISO.viet(now), appQuanLyBat: uq == "approved",
                   thanhPhan: .init(quyenQuanLy: uq == "approved", monitor: kh != nil), nguon: nguon,
                   matKetNoiPhut: lan.map { max(0, Int(now.timeIntervalSince($0) / 60)) },
                   ios: .init(soAppHoc: sl.hoc, soAppGiaiTri: sl.giaiTri, soAppChan: sl.chan,
                              soDanhMucGiaiTri: sl.danhMucGiaiTri, phutDaDung: dung, uyQuyen: uq))
  }

  @discardableResult
  public func chay(now: Date = Date(), nguon: String = "bat") async throws -> KetQuaDongBo {
    let tra = try await api.nhip(nhipGui(now: now, nguon: nguon))
    // Lệnh «go» (gỡ từ xa): thu hồi quyền, gỡ khiên + lịch, báo xong, quên token. iOS không cho app tự xoá ⇒ màn hướng dẫn xoá biểu tượng.
    if let go = tra.lenh.first(where: { $0.loai == "go" }) {
      lich.dungHet(); khien.goHet()
      await uyQuyen.thuHoi()
      try? await api.xongLenh(go.id)
      for k in [Khoa.keHoach, Khoa.nhatKyDung, Khoa.khienDangAp, Khoa.thongTinMay, Khoa.yeuCauDangCho] { kho.ghi(nil, k) }
      xoaToken()
      return .daGo
    }
    let kh = LapKeHoach.tu(tra, now: now)
    kho.luu(kh, Khoa.keHoach)
    kho.luu(now, Khoa.lanDongBo)
    try? lich.theoDoi(kh.lich)       // không theo dõi được (chưa có quyền) vẫn áp khiên tức thời
    apLucNay(kh, now: now)
    await capNhatYeuCau()
    return .xong(kh)
  }

  /// Áp khiên đúng thời điểm từ kế hoạch đã lưu (app mở / extension nhận chuông lịch).
  @discardableResult
  public func apLucNay(_ kh: KeHoach? = nil, now: Date = Date()) -> KhienMuonCo? {
    guard let kh = kh ?? kho.doc(KeHoach.self, Khoa.keHoach) else { return nil }
    let k = TinhKhien.lucNay(kh, now: now, dung: kho.doc(NhatKyDung.self, Khoa.nhatKyDung))
    khien.ap(k)
    kho.luu(k, Khoa.khienDangAp)
    return k
  }

  public func capNhatYeuCau() async {
    guard var yc = kho.doc(YeuCauDangCho.self, Khoa.yeuCauDangCho), !yc.xong else { return }
    if let t = try? await api.trangThaiYeuCau(yc.id) {
      yc.trangThai = t.trangThai ?? t.status
      kho.luu(yc, Khoa.yeuCauDangCho)
    }
  }

  public func xinThemGio(phut: Int, loiNhan: String, now: Date = Date()) async throws -> YeuCauDangCho {
    let r = try await api.xinThemGio(phut: phut, loiNhan: loiNhan)
    let yc = YeuCauDangCho(id: r.id, phut: phut, loiNhan: loiNhan, guiLuc: now, trangThai: r.tuDuyet ? "tu_duyet" : "cho")
    kho.luu(yc, Khoa.yeuCauDangCho)
    return yc
  }
}
