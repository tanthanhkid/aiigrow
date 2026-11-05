// Logic THUẦN: kế hoạch + giờ hiện tại + phút đã dùng hôm nay ⇒ khiên cần có NGAY BÂY GIỜ.
// App (lúc đồng bộ) và extension DeviceActivityMonitor (lúc chuông lịch kêu) đều gọi đúng hàm này ⇒ hai nơi không lệch nhau.
// Thứ tự thắng: mở bằng mã offline > Khoá ngay > giờ ngủ > thêm giờ đã duyệt > phiên điểm > không tuân thủ > hết trần phút > ngoài khung.
import Foundation

public enum MucKhien: String, Codable { case khong, giaiTri = "giai_tri", moiApp = "moi_app" }

public enum LyDoKhien: String, Codable {
  case khong, khoaNgay = "khoa_ngay", ngu, khongTuanThu = "khong_tuan_thu", hetGio = "het_gio", ngoaiGio = "ngoai_gio", gioHoc = "gio_hoc"

  /// Câu cho Con — hiện trên màn chặn (ShieldConfiguration) và màn chính.
  public var cauChoCon: String {
    switch self {
    case .khong: return "Con đang trong giờ chơi."
    case .khoaNgay: return "Ba Mẹ đang khoá máy. Cần gấp thì con xin Ba Mẹ mở ngoại lệ nhé."
    case .ngu: return "Đến giờ ngủ rồi. Mai mình chơi tiếp nhé!"
    case .khongTuanThu: return "Máy cần kiểm lại cài đặt. Con nhờ Ba Mẹ xem giúp nhé."
    case .hetGio: return "Hôm nay con chơi hết giờ rồi. Con dùng sao hoặc xin Ba Mẹ thêm giờ nhé."
    case .ngoaiGio: return "Bây giờ chưa phải giờ chơi."
    case .gioHoc: return "Đang giờ học. App học vẫn dùng được."
    }
  }
}

public struct KhienMuonCo: Codable, Equatable {
  public var muc: MucKhien
  public var lyDo: LyDoKhien
  /// Tên miền phải chặn lúc này (luôn có web bị chặn; thêm web giải trí khi giải trí đang đóng).
  public var webChan: [String]
  public var chanCaiApp: Bool
  public var dangThemGio: Bool
  /// Đang trong phiên «Chơi bằng điểm» (lịch «phiendiem»). Khiên cũ trong kho không có ⇒ nil.
  public var dangChoiDiem: Bool? = nil
  /// Đang mở bằng mã offline Ba Mẹ đọc (MoTamOffline).
  public var dangMoOffline: Bool? = nil
  /// Đang trong ngoại lệ cả máy Ba Mẹ mở (05/11).
  public var dangNgoaiLe: Bool? = nil
}

extension LyDoKhien {
  /// Giờ ngủ / Ba Mẹ khoá (05/11): không thêm giờ được — Con chỉ «Xin Ba Mẹ mở ngoại lệ».
  public var chiNgoaiLe: Bool { self == .ngu || self == .khoaNgay }
}

/// Phút giải trí đã dùng trong ngày (ghi bởi DeviceActivityMonitor khi chạm mốc «dung.N» / «tran»).
public struct NhatKyDung: Codable, Equatable {
  public var ngay: String
  public var phut: Int
  public var tranHet: Bool
  public init(ngay: String, phut: Int, tranHet: Bool) { self.ngay = ngay; self.phut = phut; self.tranHet = tranHet }
}

public enum TinhKhien {
  /// Ngày "yyyy-MM-dd", phút trong ngày, weekday kiểu Apple (1 = CN) — theo múi giờ gia đình.
  public static func diaPhuong(_ now: Date, tz: String) -> (ngay: String, phut: Int, thu: Int) {
    var cal = Calendar(identifier: .gregorian)
    cal.timeZone = TimeZone(identifier: tz) ?? .current
    let c = cal.dateComponents([.year, .month, .day, .hour, .minute, .weekday], from: now)
    let ngay = String(format: "%04d-%02d-%02d", c.year ?? 0, c.month ?? 0, c.day ?? 0)
    return (ngay, (c.hour ?? 0) * 60 + (c.minute ?? 0), c.weekday ?? 1)
  }

  public static func phutDaDung(_ kh: KeHoach, now: Date, dung: NhatKyDung?) -> Int {
    let ngay = diaPhuong(now, tz: kh.tz).ngay
    // 05/11: máy chủ cộng phút mọi máy của Con (quỹ dùng chung) ⇒ lấy lớn hơn của phút đo tại chỗ và phút máy chủ (cùng ngày)
    let mayChu = kh.ngayDaDung == ngay ? (kh.daDungMayChu ?? 0) : 0
    guard let dung, dung.ngay == ngay else { return mayChu }
    // «tran» ghi phut = trần lúc đó ⇒ Ba Mẹ thêm phút (trần tăng) thì Con có lại phần chênh, không kẹt ở «hết giờ».
    return max(dung.phut, mayChu)
  }

  public static func trongGioHoc(_ kh: KeHoach, now: Date) -> Bool {
    guard let h = kh.hoc, let thu = kh.hocThu else { return false }
    let d = diaPhuong(now, tz: kh.tz)
    return thu.contains(d.thu) && h.chua(d.phut)
  }

  public static func phutConLai(_ kh: KeHoach, now: Date, dung: NhatKyDung?) -> Int {
    max(0, kh.tranPhut - phutDaDung(kh, now: now, dung: dung))
  }

  public static func trongGioChoi(_ kh: KeHoach, now: Date) -> Bool {
    let d = diaPhuong(now, tz: kh.tz)
    let ds = (d.thu == 1 || d.thu == 7) ? kh.moCuoiTuan : kh.moNgayThuong
    return ds.contains { $0.chua(d.phut) }
  }

  /// `moOfflineDen`: hạn «mở tạm bằng mã offline» (MoTamOffline) — mã do chính Ba Mẹ đọc lúc máy mất mạng ⇒ gỡ mọi khoá tới hạn
  /// (như agent Windows MoTamOffline.ApDung: không để máy kẹt khoá khi không có mạng); web bị chặn vẫn chặn.
  /// `dungSai`: giây coi như đã hết sớm — iOS có thể gọi intervalDidEnd hơi trước `den` (mốc làm tròn phút) ⇒ khi hết lịch gọi với dung sai
  /// để cửa sổ đang kết thúc không còn được tính là mở.
  public static func lucNay(_ kh: KeHoach, now: Date, dung: NhatKyDung?, moOfflineDen: Date? = nil, dungSai: TimeInterval = 0) -> KhienMuonCo {
    let moc = now.addingTimeInterval(dungSai)
    if let den = moOfflineDen, den > moc {
      return KhienMuonCo(muc: .khong, lyDo: .khong, webChan: kh.webChan, chanCaiApp: kh.chanCaiApp, dangThemGio: false, dangMoOffline: true)
    }
    let d = diaPhuong(now, tz: kh.tz)
    let themGio = (kh.moDen.map { $0 > moc }) ?? false
    let dong = { (m: MucKhien, l: LyDoKhien) in
      KhienMuonCo(muc: m, lyDo: l, webChan: kh.webChan + kh.webGiaiTri, chanCaiApp: kh.chanCaiApp, dangThemGio: false)
    }
    // ngoại lệ cả máy Ba Mẹ mở (05/11) thắng giờ ngủ / khoá
    if let den = kh.ngoaiLeDen, den > moc {
      return KhienMuonCo(muc: .khong, lyDo: .khong, webChan: kh.webChan, chanCaiApp: kh.chanCaiApp, dangThemGio: true, dangNgoaiLe: true)
    }
    if kh.khoaNgay { return dong(.moiApp, .khoaNgay) }
    if let ngu = kh.ngu, ngu.chua(d.phut) { return dong(.moiApp, .ngu) }
    if themGio { return KhienMuonCo(muc: .khong, lyDo: .khong, webChan: kh.webChan, chanCaiApp: kh.chanCaiApp, dangThemGio: true) }
    if let den = kh.phienDiemDen, den > moc {
      return KhienMuonCo(muc: .khong, lyDo: .khong, webChan: kh.webChan, chanCaiApp: kh.chanCaiApp, dangThemGio: false, dangChoiDiem: true)
    }
    if kh.khoaGiaiTri { return dong(.giaiTri, .khongTuanThu) }
    if trongGioHoc(kh, now: now) { return dong(.giaiTri, .gioHoc) }
    if phutConLai(kh, now: now, dung: dung) <= 0 { return dong(.giaiTri, .hetGio) }
    if !trongGioChoi(kh, now: now) { return dong(.giaiTri, .ngoaiGio) }
    return KhienMuonCo(muc: .khong, lyDo: .khong, webChan: kh.webChan, chanCaiApp: kh.chanCaiApp, dangThemGio: false)
  }

  /// Monitor nhận sự kiện «dung.N» / «tran» ⇒ cập nhật nhật ký (sang ngày thì đếm lại từ đầu).
  public static func ghiSuKien(_ ten: String, cu: NhatKyDung?, kh: KeHoach, now: Date) -> NhatKyDung {
    let ngay = diaPhuong(now, tz: kh.tz).ngay
    var nk = (cu?.ngay == ngay) ? cu! : NhatKyDung(ngay: ngay, phut: 0, tranHet: false)
    if ten == "tran" { nk.tranHet = true; nk.phut = max(nk.phut, kh.tranPhut) }
    else if ten.hasPrefix("dung."), let p = Int(ten.dropFirst(5)) { nk.phut = max(nk.phut, p) }
    return nk
  }
}
