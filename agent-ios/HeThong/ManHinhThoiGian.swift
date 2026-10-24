// Bản THẬT của các protocol trong ConCore/DongBo.swift — gọi Screen Time API (FamilyControls / ManagedSettings / DeviceActivity).
// Dùng chung cho app và extension DeviceActivityMonitor. Trên simulator các lệnh này không có tác dụng / báo lỗi — test logic ở ConCore.
import Foundation
import FamilyControls
import ManagedSettings
import DeviceActivity
import ConCore

public final class KhienThat: HeThongKhien {
  public static let tenKho = ManagedSettingsStore.Name("aiigrow")
  let chon: LuaChonApp
  public init(chon: LuaChonApp = LuaChonApp()) { self.chon = chon }

  public func ap(_ k: KhienMuonCo) {
    let s = ManagedSettingsStore(named: Self.tenKho)
    let gt = chon.doc(.giaiTri), chan = chon.doc(.chan), hoc = chon.doc(.hoc)
    let rongThanhNil = { (x: Set<ApplicationToken>) in x.isEmpty ? nil : x }
    switch k.muc {
    case .moiApp:
      // Khoá ngay / giờ ngủ: khiên mọi danh mục. App hệ thống (Điện thoại, Tin nhắn, Cài đặt…) iOS không cho khiên.
      s.shield.applications = rongThanhNil(chan.applicationTokens)
      s.shield.applicationCategories = .all()
      s.shield.webDomainCategories = .all()
      s.shield.webDomains = nil
    case .giaiTri:
      s.shield.applications = rongThanhNil(gt.applicationTokens.union(chan.applicationTokens).subtracting(hoc.applicationTokens))
      s.shield.applicationCategories = gt.categoryTokens.isEmpty ? nil : .specific(gt.categoryTokens, except: hoc.applicationTokens)
      s.shield.webDomainCategories = gt.categoryTokens.isEmpty ? nil : .specific(gt.categoryTokens)
      let web = gt.webDomainTokens.union(chan.webDomainTokens)
      s.shield.webDomains = web.isEmpty ? nil : web
    case .khong:
      s.shield.applications = rongThanhNil(chan.applicationTokens)
      s.shield.applicationCategories = nil
      s.shield.webDomainCategories = nil
      s.shield.webDomains = chan.webDomainTokens.isEmpty ? nil : chan.webDomainTokens
    }
    s.webContent.blockedByFilter = k.webChan.isEmpty ? nil : .specific(Set(k.webChan.map { WebDomain(domain: $0) }))
    s.application.denyAppInstallation = k.chanCaiApp ? true : nil
  }

  public func goHet() { ManagedSettingsStore(named: Self.tenKho).clearAllSettings() }
}

public final class LichThat: HeThongLich {
  let chon: LuaChonApp
  public init(chon: LuaChonApp = LuaChonApp()) { self.chon = chon }

  static func gio(_ phut: Int, thu: Int?) -> DateComponents {
    var c = DateComponents(hour: min(phut, 1439) / 60, minute: min(phut, 1439) % 60)
    if phut >= 1439 { c.second = 59 }
    c.weekday = thu
    return c
  }

  public func theoDoi(_ lich: [MucLich]) throws {
    let center = DeviceActivityCenter()
    center.stopMonitoring()
    let gt = chon.doc(.giaiTri)
    let coGiaiTri = !(gt.applicationTokens.isEmpty && gt.categoryTokens.isEmpty && gt.webDomainTokens.isEmpty)
    var loiDau: Error?
    for m in lich {
      let lich: DeviceActivitySchedule
      if m.lap {
        lich = DeviceActivitySchedule(intervalStart: Self.gio(m.batDau, thu: m.thu), intervalEnd: Self.gio(m.ketThuc, thu: m.thu), repeats: true)
      } else {
        guard let a = m.batDauLuc, let b = m.ketThucLuc else { continue }
        let cal = Calendar.current, k: Set<Calendar.Component> = [.year, .month, .day, .hour, .minute, .second]
        lich = DeviceActivitySchedule(intervalStart: cal.dateComponents(k, from: a), intervalEnd: cal.dateComponents(k, from: b), repeats: false)
      }
      var ev: [DeviceActivityEvent.Name: DeviceActivityEvent] = [:]
      if coGiaiTri {
        for s in m.suKien {
          ev[.init(s.ten)] = DeviceActivityEvent(applications: gt.applicationTokens, categories: gt.categoryTokens,
                                                 webDomains: gt.webDomainTokens, threshold: DateComponents(minute: s.phut))
        }
      }
      do { try center.startMonitoring(DeviceActivityName(m.ten), during: lich, events: ev) } catch { loiDau = loiDau ?? error }
    }
    if let loiDau { throw loiDau }
  }

  public func dungHet() { DeviceActivityCenter().stopMonitoring() }
}

public final class UyQuyenThat: HeThongUyQuyen {
  public init() {}
  public var trangThai: String {
    switch AuthorizationCenter.shared.authorizationStatus {
    case .approved: return "approved"
    case .denied: return "denied"
    default: return "notDetermined"
    }
  }

  /// `conTrongGiaDinh` = máy dùng Apple ID của Con trong Chia sẻ trong gia đình ⇒ `.child` (Ba Mẹ duyệt bằng Apple ID của Ba Mẹ,
  /// gỡ app phải có Ba Mẹ). Không thì `.individual` (người dùng máy tự xác nhận bằng Face ID / mật mã).
  public func xin(conTrongGiaDinh: Bool) async throws {
    try await AuthorizationCenter.shared.requestAuthorization(for: conTrongGiaDinh ? .child : .individual)
  }

  public func thuHoi() async {
    await withCheckedContinuation { (c: CheckedContinuation<Void, Never>) in
      AuthorizationCenter.shared.revokeAuthorization { _ in c.resume() }
    }
  }
}

/// Dùng trong extension DeviceActivityMonitor (và app khi trở lại tiền cảnh): suy lại khiên từ kế hoạch đã lưu.
public enum ApLai {
  public static func lucNay(kho: KhoGiaTri = KhoUserDefaults(), now: Date = Date()) {
    guard let kh = kho.doc(KeHoach.self, Khoa.keHoach) else { return }
    let k = TinhKhien.lucNay(kh, now: now, dung: kho.doc(NhatKyDung.self, Khoa.nhatKyDung))
    KhienThat().ap(k)
    kho.luu(k, Khoa.khienDangAp)
  }

  public static func ghiSuKien(_ ten: String, kho: KhoGiaTri = KhoUserDefaults(), now: Date = Date()) {
    guard let kh = kho.doc(KeHoach.self, Khoa.keHoach) else { return }
    kho.luu(TinhKhien.ghiSuKien(ten, cu: kho.doc(NhatKyDung.self, Khoa.nhatKyDung), kh: kh, now: now), Khoa.nhatKyDung)
  }
}
