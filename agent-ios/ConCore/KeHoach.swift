// Logic THUẦN: nenTang (ios) ⇒ kế hoạch Screen Time.
//   • `lich`: các DeviceActivitySchedule cần theo dõi. Lịch chỉ là «chuông báo thức» ở mốc chuyển (mở khung, vào giờ ngủ, sang ngày,
//     hết thêm giờ) — mỗi lần chuông kêu, extension SUY LẠI trạng thái khiên từ kế hoạch + giờ hiện tại (TinhKhien.lucNay), không cộng dồn.
//   • `tranPhut` + sự kiện «dung.N» mỗi `buocPhut`: DeviceActivityEvent đo phút app giải trí, ghi phút đã dùng vào app group.
//   • web: webContent.blockedByFilter = .specific(WebDomain) — tối đa 50 tên miền (giới hạn Apple).
//   • phiên «Chơi bằng điểm» (chinhSach.phienDiem.phien): lịch không lặp «phiendiem» gỡ khiên giải trí đúng `conPhut` tính từ lần ĐẦU app thấy
//     phiên (không kéo dài khi đồng bộ lại) — app không chạy nền nên máy chủ là sổ điểm, iOS chỉ giữ cửa sổ mở.
//   • nhắc trước 5 phút: sự kiện «nhac5» ở mốc trần − 5 phút (DeviceActivityEvent) + `nhacTruocPhut` (warningTime) cho lịch thêm giờ / phiên điểm
//     ⇒ extension Monitor gửi thông báo cục bộ.
import Foundation

public struct SuKien: Codable, Equatable {
  public var ten: String; public var phut: Int
  public init(ten: String, phut: Int) { self.ten = ten; self.phut = phut }
}

/// Một DeviceActivitySchedule. Lặp: `batDau`/`ketThuc` = phút trong ngày (giờ máy), `thu` = weekday kiểu Apple (1 = CN … 7 = T7), nil = mọi ngày.
/// Không lặp (thêm giờ): `batDauLuc`/`ketThucLuc` tuyệt đối.
public struct MucLich: Codable, Equatable {
  public var ten: String
  public var batDau: Int
  public var ketThuc: Int
  public var thu: Int?
  public var lap: Bool
  public var batDauLuc: Date?
  public var ketThucLuc: Date?
  public var suKien: [SuKien]
  /// warningTime của DeviceActivitySchedule: báo trước khi lịch kết thúc (nil = không). Chỉ dùng cho lịch không lặp (thêm giờ, phiên điểm).
  public var nhacTruocPhut: Int? = nil
}

public struct KeHoach: Codable, Equatable {
  public var tz: String
  public var moNgayThuong: [Khung]
  public var moCuoiTuan: [Khung]
  public var ngu: Khung?
  /// Trần giải trí hôm nay = trần ngày + phút Ba Mẹ thêm hôm nay.
  public var tranPhut: Int
  public var buocPhut: Int
  public var webChan: [String]
  public var webGiaiTri: [String]
  public var khoaNgay: Bool
  public var khoaGiaiTri: Bool
  public var lyDoKhoa: [String]
  public var moDen: Date?
  public var chanCaiApp: Bool
  public var lich: [MucLich]
  public var canhBao: [String]
  public var serverTime: Date
  public var tenCon: String?
  public var dungChung: Bool
  /// Phiên điểm app đã thấy + hạn gỡ khiên của nó (neo từ lần đầu thấy). Kế hoạch cũ trong kho không có ⇒ nil.
  public var phienDiem: ChinhSach.PhienDang?
  public var phienDiemDen: Date?

  public init(tz: String, moNgayThuong: [Khung], moCuoiTuan: [Khung], ngu: Khung?, tranPhut: Int, buocPhut: Int,
              webChan: [String], webGiaiTri: [String], khoaNgay: Bool, khoaGiaiTri: Bool, lyDoKhoa: [String], moDen: Date?,
              chanCaiApp: Bool, lich: [MucLich], canhBao: [String], serverTime: Date, tenCon: String?, dungChung: Bool,
              phienDiem: ChinhSach.PhienDang? = nil, phienDiemDen: Date? = nil) {
    self.tz = tz; self.moNgayThuong = moNgayThuong; self.moCuoiTuan = moCuoiTuan; self.ngu = ngu; self.tranPhut = tranPhut
    self.buocPhut = buocPhut; self.webChan = webChan; self.webGiaiTri = webGiaiTri; self.khoaNgay = khoaNgay
    self.khoaGiaiTri = khoaGiaiTri; self.lyDoKhoa = lyDoKhoa; self.moDen = moDen; self.chanCaiApp = chanCaiApp; self.lich = lich
    self.canhBao = canhBao; self.serverTime = serverTime; self.tenCon = tenCon; self.dungChung = dungChung
    self.phienDiem = phienDiem; self.phienDiemDen = phienDiemDen
  }
}

public enum LapKeHoach {
  public static let lichToiDa = 20          // DeviceActivityCenter giới hạn số activity theo dõi cùng lúc (~20)
  public static let webToiDa = 50           // WebContentSettings .specific tối đa 50 tên miền
  public static let khoangNganNhat = 15     // DeviceActivitySchedule tối thiểu 15 phút
  public static let nhacTruoc = 5           // nhắc «còn 5 phút» (như khay Windows / Mac)

  /// Hạn gỡ khiên của phiên điểm: lần đầu thấy phiên ⇒ now + conPhut; đồng bộ lại cùng phiên ⇒ không quá hạn cũ (không tự kéo dài).
  public static func hanPhienDiem(_ p: ChinhSach.PhienDang?, truoc: KeHoach?, now: Date) -> Date? {
    guard let p, p.conPhut > 0 else { return nil }
    let moi = now.addingTimeInterval(Double(p.conPhut) * 60)
    let den = (truoc?.phienDiem?.id == p.id ? truoc?.phienDiemDen : nil).map { min($0, moi) } ?? moi
    return den > now ? den : nil
  }

  /// Lịch không lặp kết thúc ĐÚNG `den` (bắt đầu lùi lại cho đủ 15 phút — giới hạn DeviceActivity), nhắc trước 5 phút nếu còn đủ thời gian.
  public static func lichMotLan(_ ten: String, den: Date, now: Date) -> MucLich {
    MucLich(ten: ten, batDau: 0, ketThuc: 0, thu: nil, lap: false, batDauLuc: min(now, den.addingTimeInterval(-Double(khoangNganNhat * 60))),
            ketThucLuc: den, suKien: [], nhacTruocPhut: den.timeIntervalSince(now) > Double(nhacTruoc * 60) ? nhacTruoc : nil)
  }

  /// Thêm một lịch không lặp vào danh sách đã đầy (≤ lichToiDa): bỏ khung giờ chơi cuối cùng («mo.*», áp khi Con mở app) để chừa chỗ.
  public static func themLich(_ ds: [MucLich], _ m: MucLich) -> [MucLich] {
    var ds = ds.filter { $0.ten != m.ten }
    if ds.count >= lichToiDa, let i = ds.lastIndex(where: { $0.ten.hasPrefix("mo.") }) { ds.remove(at: i) }
    return ds + [m]
  }

  /// `truoc`: kế hoạch đã lưu (giữ hạn phiên điểm đã neo).
  public static func tu(_ n: NhipTraVe, now: Date = Date(), truoc: KeHoach? = nil) -> KeHoach {
    let cs = n.chinhSach, nt = n.nenTang
    var canhBao: [String] = []

    let kg = nt.cauHinh("khung_gio")
    let lm = kg["lichMo"]
    let moNT = lm?["ngayThuong"]?.dsKhung ?? cs.gioChoi.ngayThuong
    let moCT = lm?["cuoiTuan"]?.dsKhung ?? cs.gioChoi.cuoiTuan
    let tz = kg["tz"]?.chuoi ?? cs.tz
    let nguK = nt.cauHinh("gio_ngu")["ngu"]?.khung ?? cs.gioChoi.ngu
    let ngu: Khung? = nguK.tuPhut == nguK.denPhut ? nil : nguK

    let tranNgay = nt.cauHinh("tran_thoi_gian")["tranNgayPhut"]?.so.map { Int($0) } ?? cs.gioChoi.tranNgayPhut
    let tran = max(0, tranNgay + max(0, cs.ngoaiLe.phutThemHomNay))

    let cw = nt.cauHinh("chan_web")
    let webCs = { (ds: [MucChung]) in ds.filter { $0.kieu == "web" }.map(\.muc) }
    var webChan = chuanTenMien(cw["webDomainsChan"]?.dsChuoi ?? webCs(cs.ungDung.chan))
    var webGT = chuanTenMien(cw["giaiTriCanPhien"]?.dsChuoi ?? webCs(cs.ungDung.giaiTri)).filter { !webChan.contains($0) }
    if webChan.count > webToiDa { canhBao.append("Chỉ chặn được \(webToiDa) trang web đầu tiên (giới hạn của iOS)"); webChan = Array(webChan.prefix(webToiDa)) }
    if webChan.count + webGT.count > webToiDa { webGT = Array(webGT.prefix(webToiDa - webChan.count)) }

    let khoaNgay = nt.cauHinh("khoa_ngay")["khoaNgay"]?.bool ?? cs.khoaNgay
    let kk = nt.cauHinh("khoa_khong_tuan_thu")
    let khoaGT = kk["khoaGiaiTri"]?.bool ?? !cs.hieuLuc.giaiTriDuocMo
    let lyDo = kk["lyDo"]?.dsChuoi ?? cs.hieuLuc.lyDo

    let moDen = [NgayISO.doc(n.grantEndsAt), NgayISO.doc(n.moDen), NgayISO.doc(cs.ngoaiLe.moKhanCapDen)]
      .compactMap { $0 }.filter { $0 > now }.max()

    let buoc = buocDo(tran)
    var lich: [MucLich] = []
    // 1. giờ ngủ — lặp hằng ngày, có thể qua nửa đêm
    if let ngu, doDai(ngu.tuPhut, ngu.denPhut) >= khoangNganNhat {
      lich.append(MucLich(ten: "ngu", batDau: ngu.tuPhut, ketThuc: min(ngu.denPhut, 1439), thu: nil, lap: true, suKien: []))
    }
    // 2. cả ngày: đo phút giải trí + mốc sang ngày mới (xoá «hết giờ» hôm qua)
    var sk: [SuKien] = stride(from: buoc, to: tran, by: buoc).map { SuKien(ten: "dung.\($0)", phut: $0) }
    if tran > nhacTruoc { sk.append(SuKien(ten: "nhac5", phut: tran - nhacTruoc)) }
    if tran > 0 { sk.append(SuKien(ten: "tran", phut: tran)) }
    lich.append(MucLich(ten: "ngay", batDau: 0, ketThuc: 1439, thu: nil, lap: true, suKien: sk))
    // 3. thêm giờ đã duyệt — một lịch không lặp kết thúc ĐÚNG lúc hết hạn (bắt đầu lùi lại cho đủ 15 phút)
    if let moDen { lich.append(lichMotLan("themgio", den: moDen, now: now)) }
    // 3b. phiên Chơi bằng điểm mở trên CHÍNH máy này (máy chủ cũ không gửi `may` ⇒ nhận) — như thêm giờ: lịch không lặp đúng hạn phiên (đã neo)
    let phien = cs.phienDiem?.phien.flatMap { p in p.may == nil || p.may == cs.may.id ? p : nil }
    let phienDen = hanPhienDiem(phien, truoc: truoc, now: now)
    if let phienDen { lich.append(lichMotLan("phiendiem", den: phienDen, now: now)) }
    // 4. khung giờ chơi — chung mọi ngày nếu ngày thường = cuối tuần, không thì theo từng thứ
    var mo: [MucLich] = []
    let them = { (k: Khung, thu: Int?, ten: String) in
      let a = k.tuPhut, b = min(k.denPhut, 1440)
      guard b - a >= khoangNganNhat else { return }
      mo.append(MucLich(ten: ten, batDau: a, ketThuc: min(b, 1439), thu: thu, lap: true, suKien: []))
    }
    if moNT == moCT {
      for (i, k) in moNT.enumerated() { them(k, nil, "mo.\(i)") }
    } else {
      for thu in [2, 3, 4, 5, 6] { for (i, k) in moNT.enumerated() { them(k, thu, "mo.t\(thu).\(i)") } }
      for thu in [7, 1] { for (i, k) in moCT.enumerated() { them(k, thu, "mo.t\(thu).\(i)") } }
    }
    let conCho = lichToiDa - lich.count
    if mo.count > conCho {
      canhBao.append("Lịch chơi có quá nhiều khung (\(mo.count)); iOS chỉ theo dõi được \(lichToiDa) lịch — các khung sau được áp khi Con mở app")
      mo = Array(mo.prefix(max(0, conCho)))
    }
    lich += mo

    return KeHoach(tz: tz, moNgayThuong: moNT, moCuoiTuan: moCT, ngu: ngu, tranPhut: tran, buocPhut: buoc,
                   webChan: webChan, webGiaiTri: webGT, khoaNgay: khoaNgay, khoaGiaiTri: khoaGT || khoaNgay, lyDoKhoa: lyDo,
                   moDen: moDen, chanCaiApp: true, lich: lich, canhBao: canhBao,
                   serverTime: NgayISO.doc(n.serverTime) ?? now, tenCon: cs.con?.ten, dungChung: cs.may.dungChung,
                   phienDiem: phienDen == nil ? nil : phien, phienDiemDen: phienDen)
  }

  /// Bước đo phút: 5 phút, nới ra để không quá ~40 sự kiện.
  public static func buocDo(_ tran: Int) -> Int {
    guard tran > 0 else { return 5 }
    let b = Int((Double(tran) / 40).rounded(.up))
    return max(5, Int((Double(b) / 5).rounded(.up)) * 5)
  }

  static func doDai(_ a: Int, _ b: Int) -> Int { a < b ? b - a : 1440 - a + b }

  /// Tên miền chuẩn: bỏ scheme, đường dẫn, "www.", chữ hoa; bỏ trùng, giữ thứ tự.
  public static func chuanTenMien(_ ds: [String]) -> [String] {
    var thay = Set<String>(), ra: [String] = []
    for s in ds {
      var t = s.trimmingCharacters(in: .whitespaces).lowercased()
      if let r = t.range(of: "://") { t = String(t[r.upperBound...]) }
      t = String(t.split(separator: "/").first ?? "")
      t = String(t.split(separator: ":").first ?? "")
      if t.hasPrefix("www.") { t.removeFirst(4) }
      guard t.contains("."), !thay.contains(t) else { continue }
      thay.insert(t); ra.append(t)
    }
    return ra
  }
}
