// Logic THUẦN: kế hoạch + giờ hiện tại + phút đã dùng hôm nay ⇒ khiên cần có NGAY BÂY GIỜ.
// App (lúc đồng bộ) và extension DeviceActivityMonitor (lúc chuông lịch kêu) đều gọi đúng hàm này ⇒ hai nơi không lệch nhau.
// Thứ tự thắng: mở bằng mã offline > Ba Mẹ đang dùng máy (06/11) > máy khoá chờ chọn tên + PIN (06/11) > ngoại lệ cả máy > Khoá ngay > giờ ngủ > thêm giờ đã duyệt > phiên điểm > không tuân thủ > hết trần phút > ngoài khung.
import Foundation

public enum MucKhien: String, Codable { case khong, giaiTri = "giai_tri", moiApp = "moi_app" }

public enum LyDoKhien: String, Codable {
  case khong, khoaNgay = "khoa_ngay", ngu, khongTuanThu = "khong_tuan_thu", hetGio = "het_gio", ngoaiGio = "ngoai_gio", gioHoc = "gio_hoc"
  /// 06/11 (L13): máy khoá — chưa bé nào vào (chạm tên + PIN trong app AiiGrow Con).
  case chuaVao = "chua_vao"

  /// Câu cho Con — hiện trên màn chặn (ShieldConfiguration) và màn chính.
  public var cauChoCon: String {
    switch self {
    case .khong: return "Con đang trong giờ chơi."
    case .khoaNgay: return "Ba Mẹ đang khoá máy. Đọc sách hoặc ra ngoài chơi nhé!"
    case .ngu: return "Đến giờ ngủ rồi. Mai mình chơi tiếp nhé!"
    case .khongTuanThu: return "Máy cần kiểm lại cài đặt. Con nhờ Ba Mẹ xem giúp nhé."
    case .hetGio: return "Hết sao rồi. Con làm nhiệm vụ hoặc xin Ba Mẹ cho vay sao nhé."
    case .ngoaiGio: return "Bây giờ chưa phải giờ chơi."
    case .gioHoc: return "Đang giờ học. App học vẫn dùng được."
    case .chuaVao: return "Máy đang khoá. Mở AiiGrow Con, chạm tên con rồi nhập PIN nhé."
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
  /// 06/11: Ba Mẹ đang dùng máy (mở bằng mã Ba Mẹ) — không tính giờ con.
  public var dangBaMe: Bool? = nil
  /// 15/11: chế độ «Mở hết» — không khiên, không đếm.
  public var dangMoHet: Bool? = nil
  /// 15/11: «Theo danh sách» — khiên theo danh sách trắng (app / web ngoài danh sách không mở). nil/false = luật cũ (chỉ khiên app Giải trí).
  public var danhSach: Bool? = nil
  /// #262: web được mở khi «Theo danh sách» (mọi web khác bị chặn); hết sao ⇒ chỉ nhóm «Không tính phút». nil = không theo danh sách.
  public var webDuocMo: [String]? = nil
}

/// Phút giải trí đã dùng trong ngày (ghi bởi DeviceActivityMonitor khi chạm mốc «dung.N» / «tran»).
public struct NhatKyDung: Codable, Equatable {
  public var ngay: String
  public var phut: Int
  public var tranHet: Bool
  /// 15/11: phút trong `phut` đo lúc máy mở bằng mã (Ba Mẹ đọc mã / Ba Mẹ đang dùng) — không trừ sao. Nhật ký cũ: nil.
  public var boiMa: Int? = nil
  /// Phần `boiMa` đã báo máy chủ (`phutBoiMa` gửi phần chênh).
  public var boiMaDaGui: Int? = nil
  public init(ngay: String, phut: Int, tranHet: Bool, boiMa: Int? = nil) { self.ngay = ngay; self.phut = phut; self.tranHet = tranHet; self.boiMa = boiMa }
  /// Phút tính sao (bỏ phút lúc mở bằng mã).
  public var phutTinh: Int { max(0, phut - (boiMa ?? 0)) }
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
    let taiCho = (dung?.ngay == ngay) ? dung!.phutTinh : 0
    // 05/11: máy chủ đã cộng phút mọi máy của Con tới lúc đồng bộ (quỹ dùng chung) ⇒ + phút đo tại chỗ SAU lúc đó
    guard kh.ngayDaDung == ngay, let mayChu = kh.daDungMayChu else { return taiCho }
    // «tran» ghi phut = trần lúc đó ⇒ Ba Mẹ thêm phút (trần tăng) thì Con có lại phần chênh, không kẹt ở «hết giờ».
    return max(taiCho, mayChu + max(0, taiCho - (kh.dungTaiChoLucDongBo ?? taiCho)))
  }

  /// Phút đo tại chỗ hôm nay (DeviceActivity) — gửi máy chủ, và làm mốc `dungTaiChoLucDongBo`.
  public static func phutDoTaiCho(_ kh: KeHoach, now: Date, dung: NhatKyDung?) -> Int {
    guard let dung, dung.ngay == diaPhuong(now, tz: kh.tz).ngay else { return 0 }
    return dung.phut
  }

  public static func trongGioHoc(_ kh: KeHoach, now: Date) -> Bool {
    guard let h = kh.hoc, let thu = kh.hocThu else { return false }
    let d = diaPhuong(now, tz: kh.tz)
    return thu.contains(d.thu) && h.chua(d.phut)
  }

  /// Phút đo lúc mở bằng mã hôm nay (không trừ sao).
  public static func phutBoiMa(_ kh: KeHoach, now: Date, dung: NhatKyDung?) -> Int {
    guard let dung, dung.ngay == diaPhuong(now, tz: kh.tz).ngay else { return 0 }
    return max(0, dung.boiMa ?? 0)
  }

  public static func phutConLai(_ kh: KeHoach, now: Date, dung: NhatKyDung?) -> Int {
    // 15/11: sổ sao — còn = sao tiêu được lúc đồng bộ − phút Tính phút chơi SAU lúc đó (bỏ phút mở bằng mã). Sang ngày: không có quỹ mới, sao vẫn vậy.
    if let s = kh.sao {
      let raw = phutDoTaiCho(kh, now: now, dung: dung), bm = phutBoiMa(kh, now: now, dung: dung)
      // phút đã chơi tại máy mà máy chủ CHƯA xác nhận lúc đồng bộ (`phutChuaXacNhan`) mang qua mốc — kéo để làm mới không cho chơi lại
      if kh.ngayDaDung == diaPhuong(now, tz: kh.tz).ngay {
        let sau = max(0, raw - (kh.dungTaiChoLucDongBo ?? 0)) - max(0, bm - (kh.boiMaLucDongBo ?? 0))
        return max(0, s.phutCon - (kh.phutChuaXacNhan ?? 0) - max(0, sau))
      }
      return max(0, s.phutCon - max(0, raw - bm))
    }
    // quỹ của ngày đồng bộ; sang ngày (chưa đồng bộ lại) ⇒ quỹ ngày, không gồm phút cộng thêm hôm qua
    let tran = (kh.ngayDaDung != nil && kh.ngayDaDung != diaPhuong(now, tz: kh.tz).ngay) ? (kh.quyNgayPhut ?? kh.tranPhut) : kh.tranPhut
    return max(0, tran - phutDaDung(kh, now: now, dung: dung))
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
  /// `phien`: ai đang dùng máy (PinBe.swift) — nil = không biết (máy chủ cũ / app cũ) ⇒ không khoá theo PIN.
  public static func lucNay(_ kh: KeHoach, now: Date, dung: NhatKyDung?, moOfflineDen: Date? = nil, phien: PhienMay? = nil,
                            dungSai: TimeInterval = 0) -> KhienMuonCo {
    var k = lucNay0(kh, now: now, dung: dung, moOfflineDen: moOfflineDen, phien: phien, dungSai: dungSai)
    // danh sách trắng chỉ áp khi máy KHÔNG ở trạng thái mở hoàn toàn (mở bằng mã, Ba Mẹ đang dùng, mở tạm / thêm giờ, ngoại lệ, phiên điểm, Mở hết)
    let moHoanToan = k.dangMoHet == true || k.dangMoOffline == true || k.dangBaMe == true || k.dangThemGio || k.dangNgoaiLe == true || k.dangChoiDiem == true
    if kh.theoDanhSach && !moHoanToan {
      k.danhSach = true
      // kế hoạch lưu trước bản này không có danh sách web (nil) ⇒ giữ hành vi cũ tới lần đồng bộ kế tiếp (không chặn hết web oan)
      if let hoc = kh.webKhongTinhPhut {
        k.webDuocMo = k.muc == .khong ? hoc + (kh.webTinhPhut ?? []) : hoc     // đang đóng nhóm «Tính phút» (hết sao…) ⇒ chỉ web «Không tính phút»
        k.webChan = []      // web theo danh sách trắng, không còn danh sách đen
      }
    }
    return k
  }

  static func lucNay0(_ kh: KeHoach, now: Date, dung: NhatKyDung?, moOfflineDen: Date?, phien: PhienMay?, dungSai: TimeInterval) -> KhienMuonCo {
    let moc = now.addingTimeInterval(dungSai)
    if let den = moOfflineDen, den > moc {
      return KhienMuonCo(muc: .khong, lyDo: .khong, webChan: kh.webChan, chanCaiApp: kh.chanCaiApp, dangThemGio: false, dangMoOffline: true)
    }
    if let phien, phien.baMeDangDung(moc) {
      return KhienMuonCo(muc: .khong, lyDo: .khong, webChan: kh.webChan, chanCaiApp: kh.chanCaiApp, dangThemGio: false, dangBaMe: true)
    }
    if let phien, phien.khoa(moc) {
      return KhienMuonCo(muc: .moiApp, lyDo: .chuaVao, webChan: kh.webChan + kh.webGiaiTri, chanCaiApp: kh.chanCaiApp, dangThemGio: false)
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
    // 15/11 «Mở hết»: app, web dùng tự do, không trừ sao (Ba Mẹ khoá máy vẫn thắng)
    if kh.moHet { return KhienMuonCo(muc: .khong, lyDo: .khong, webChan: kh.webChan, chanCaiApp: kh.chanCaiApp, dangThemGio: false, dangMoHet: true) }
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
  /// `boiMa`: máy đang mở bằng mã (Ba Mẹ đọc mã / Ba Mẹ đang dùng) ⇒ phần phút tăng thêm ghi vào `boiMa` (không trừ sao).
  public static func ghiSuKien(_ ten: String, cu: NhatKyDung?, kh: KeHoach, now: Date, boiMa: Bool = false) -> NhatKyDung {
    let ngay = diaPhuong(now, tz: kh.tz).ngay
    var nk = (cu?.ngay == ngay) ? cu! : NhatKyDung(ngay: ngay, phut: 0, tranHet: false)
    let truoc = nk.phut
    if ten == "tran" { nk.tranHet = true; nk.phut = max(nk.phut, kh.tranPhut) }
    else if ten.hasPrefix("dung."), let p = Int(ten.dropFirst(5)) { nk.phut = max(nk.phut, p) }
    if boiMa, nk.phut > truoc { nk.boiMa = (nk.boiMa ?? 0) + nk.phut - truoc }
    return nk
  }
}
