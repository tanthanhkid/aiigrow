// Màn chặn của AiiGrow: câu tiếng Việt thân thiện theo lý do (đọc từ app group) + nút «Xin Ba Mẹ cho vay sao» (hết sao) / «Xin Ba Mẹ mở» (ngoài danh sách).
// Phong cách E «Ánh kim» (18/11, #383) trong giới hạn của Apple: ShieldConfiguration chỉ nhận màu nền, một ảnh icon, màu chữ và màu nút
// (không bo góc, gradient, bóng hay phông riêng). Nên: nền kem #ECE4D9, icon Fluent 3D trong viên kem nổi bóng đôi (vẽ sẵn thành ảnh),
// chữ navy #0A1629, nút chính vàng kim #F4C76A chữ navy (11,4:1), nút phụ chữ navy.
import ManagedSettings
import ManagedSettingsUI
import FamilyControls
import UIKit
import ConCore

final class ShieldConfigurationExtension: ShieldConfigurationDataSource {
  // phong cách E «Ánh kim» (ngang App/Diu.swift): nền kem, chữ navy, nút vàng kim
  static func mau(_ v: UInt32) -> UIColor {
    UIColor(red: CGFloat(v >> 16 & 0xff) / 255, green: CGFloat(v >> 8 & 0xff) / 255, blue: CGFloat(v & 0xff) / 255, alpha: 1)
  }
  static let kim = mau(0xf4c76a)
  static let nen = mau(0xece4d9)
  static let chu = mau(0x0a1629)
  static let chu2 = mau(0x3b352e)
  static let nenIcon = mau(0xece4d9)

  /// `web`: màn chặn trang web (cdt-chan-web) — chữ khác màn chặn app.
  /// App / trang bị khiên có nằm trong nhóm «Tính phút» (Giải trí) Ba Mẹ chọn không — token đọc từ app group.
  static func trongTinhPhut(app: ApplicationToken? = nil, web: WebDomainToken? = nil) -> Bool {
    guard let d = KhoUserDefaults().data(Khoa.chonGiaiTri), let s = try? JSONDecoder().decode(FamilyActivitySelection.self, from: d) else { return false }
    if let app { return s.applicationTokens.contains(app) }
    if let web { return s.webDomainTokens.contains(web) }
    return false
  }

  /// `trongDs`: app / trang thuộc danh sách «Tính phút» (nil = không biết).
  func cauHinh(ten: String?, web: Bool = false, trongDs: Bool? = nil) -> ShieldConfiguration {
    let k = KhoUserDefaults().doc(KhienMuonCo.self, Khoa.khienDangAp)
    var lyDo = k?.lyDo ?? .ngoaiGio
    let kh = KhoUserDefaults().doc(KeHoach.self, Khoa.keHoach)
    let kho = KhoUserDefaults()
    let gioiHan = kh.flatMap { TinhKhien.gioiHanKhoa($0, now: Date(), dung: kho.doc(NhatKyDung.self, Khoa.nhatKyDung), kho: kho) }
    // Theo danh sách + hết sao: app NGOÀI danh sách bị khiên vì ngoài danh sách, không phải vì hết sao
    if lyDo == .hetGio, k?.danhSach == true, trongDs == false { lyDo = .khong }
    let tieuDe: String, phu: String, nut: String
    switch lyDo {
    case .ngu: tieuDe = "Đến giờ ngủ rồi"; phu = "Chúc con ngủ ngon! Mai mình chơi tiếp nhé."; nut = "Mở AiiGrow Con"
    case .khoaNgay: tieuDe = "Ba Mẹ đang khoá máy"; phu = "Đọc sách hoặc ra ngoài chơi nhé!"; nut = "Mở AiiGrow Con"
    // 15/11 (#264): hết sao = hết phút «Tính phút» (cdt-het-phien)
    // 16/11 (#302): khoá vì giới hạn giờ chơi (đọc KeHoach.gioiHan từ app group) — không nói «Hết sao»
    case .hetGio where gioiHan != nil:
      tieuDe = gioiHan?.tieuDe() ?? "Nghỉ một chút"; phu = gioiHan?.cauPhu(tz: kh?.tz) ?? ""; nut = "Xin Ba Mẹ"
    case .hetGio: tieuDe = "Hết sao rồi"; phu = "Còn 0 sao = 0 phút chơi. Con làm nhiệm vụ hoặc xin Ba Mẹ cho vay sao nhé."; nut = "Xin Ba Mẹ cho vay sao"
    case .gioHoc: tieuDe = "Giờ học rồi!"; phu = "Chỉ mở app học. Học xong được chơi tiếp."; nut = "Mở AiiGrow Con"
    case .chuaVao: tieuDe = "Máy đang khoá"; phu = "Mở AiiGrow Con, chạm tên con rồi nhập PIN nhé."; nut = "Mở AiiGrow Con"
    case .khong:
      // 15/11 (#262, them-4e5fwl16 · cdt-chan-web): ngoài danh sách trắng của Ba Mẹ
      tieuDe = web ? "Trang này chưa có trong danh sách" : "\(ten ?? "App này") chưa có trong danh sách"
      phu = web ? "Máy chỉ mở trang Ba Mẹ đã thêm vào danh sách." : "Máy chỉ mở app Ba Mẹ đã thêm vào danh sách."
      nut = web || ten == nil ? "Xin Ba Mẹ mở" : "Xin Ba Mẹ mở \(ten!)"
    default: tieuDe = "Tạm nghỉ chút nhé"; phu = lyDo.cauChoCon; nut = "Mở AiiGrow Con"
    }
    let hinh: String
    switch lyDo {
    case .ngu: hinh = "fl_trang"
    case .khoaNgay, .chuaVao, .khong: hinh = "fl_khoa"
    case .hetGio: hinh = gioiHan?.hetGioNgay == true ? "fl_trang" : "fl_dong_ho_cat"
    default: hinh = "fl_dong_ho"
    }
    return ShieldConfiguration(
      backgroundBlurStyle: nil,
      backgroundColor: Self.nen,
      icon: VienClay.anh(hinh, nen: Self.nenIcon),
      title: .init(text: tieuDe, color: Self.chu),
      subtitle: .init(text: (web && lyDo != .khong ? (ten.map { "\($0) · " } ?? "") : "") + phu, color: Self.chu2),
      primaryButtonLabel: .init(text: nut, color: Self.chu),
      primaryButtonBackgroundColor: Self.kim,
      secondaryButtonLabel: .init(text: "Về trang chính", color: Self.chu))
  }

  override func configuration(shielding application: Application) -> ShieldConfiguration {
    cauHinh(ten: application.localizedDisplayName, trongDs: Self.trongTinhPhut(app: application.token))
  }
  override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
    cauHinh(ten: application.localizedDisplayName, trongDs: Self.trongTinhPhut(app: application.token))
  }
  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
    cauHinh(ten: webDomain.domain, web: true, trongDs: Self.trongTinhPhut(web: webDomain.token))
  }
  override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration {
    cauHinh(ten: webDomain.domain, web: true, trongDs: Self.trongTinhPhut(web: webDomain.token))
  }
}

/// Viên kem nổi neumorphism (E): mặt cùng màu nền, bóng tối rgba(120,98,70,.28) lệch xuống-phải + bóng sáng #FFFBF5 lệch lên-trái,
/// icon Fluent 3D ở giữa — vẽ thành một UIImage vì màn chặn chỉ nhận ảnh tĩnh.
enum VienClay {
  static func anh(_ ten: String, nen: UIColor, co: CGFloat = 96) -> UIImage? {
    let le: CGFloat = 22
    // chừa đủ cho bóng (lệch 8 + mờ 18) ở cả bốn phía để không bị cắt và viên nằm đúng tâm ảnh (Apple căn giữa icon)
    let tong = CGSize(width: co + le * 2, height: co + le * 2)
    let khung = CGRect(x: le, y: le, width: co, height: co)
    let icon = UIImage(named: ten, in: Bundle(for: ShieldConfigurationExtension.self), with: nil)
    let bongToi = UIColor(red: 0x78 / 255, green: 0x62 / 255, blue: 0x46 / 255, alpha: 0.28)
    let bongSang = UIColor(red: 1, green: 0xfb / 255, blue: 0xf5 / 255, alpha: 0.95)
    return UIGraphicsImageRenderer(size: tong).image { r in
      let g = r.cgContext
      let tron = UIBezierPath(ovalIn: khung)
      g.saveGState()
      g.setShadow(offset: CGSize(width: -7, height: -7), blur: 16, color: bongSang.cgColor)
      nen.setFill(); tron.fill()
      g.restoreGState()
      g.saveGState()
      g.setShadow(offset: CGSize(width: 7, height: 7), blur: 16, color: bongToi.cgColor)
      nen.setFill(); tron.fill()
      g.restoreGState()
      icon?.draw(in: khung.insetBy(dx: co * 0.2, dy: co * 0.2))
    }
  }
}
