// Màn chặn của AiiGrow: câu tiếng Việt thân thiện theo lý do (đọc từ app group) + nút «Xin thêm giờ».
// Bản «Dịu» (06/11) trong giới hạn của Apple: ShieldConfiguration chỉ nhận màu nền, một ảnh icon, màu chữ và màu nút (không bo góc,
// bóng hay chuyển động). Nên: nền kem #fbf8f2, icon Fluent 3D trong viên tròn kem, nút xanh lá đặc, chữ khớp màn con-dt-gio / con-dt-chan.
import ManagedSettings
import ManagedSettingsUI
import UIKit
import ConCore

final class ShieldConfigurationExtension: ShieldConfigurationDataSource {
  // bản «Dịu» 06/11 (docs/thiet-ke-chot/con-dt-gio, con-dt-chan): nền kem, MỘT màu nhấn xanh lá, chữ than
  static let xanh = UIColor(red: 0x2f / 255, green: 0x9e / 255, blue: 0x5f / 255, alpha: 1)
  static let xanhDam = UIColor(red: 0x1f / 255, green: 0x6e / 255, blue: 0x42 / 255, alpha: 1)
  static let nen = UIColor(red: 0xfb / 255, green: 0xf8 / 255, blue: 0xf2 / 255, alpha: 1)
  static let chu = UIColor(red: 0x1f / 255, green: 0x2a / 255, blue: 0x37 / 255, alpha: 1)
  static let chu2 = UIColor(red: 0x5f / 255, green: 0x6b / 255, blue: 0x7a / 255, alpha: 1)
  static let nenIcon = UIColor(red: 0xf6 / 255, green: 0xf3 / 255, blue: 0xec / 255, alpha: 1)

  /// `web`: màn chặn trang web (cdt-chan-web) — chữ khác màn chặn app.
  func cauHinh(ten: String?, web: Bool = false) -> ShieldConfiguration {
    let k = KhoUserDefaults().doc(KhienMuonCo.self, Khoa.khienDangAp)
    let lyDo = k?.lyDo ?? .ngoaiGio
    let tieuDe: String, phu: String, nut: String
    switch lyDo {
    case .ngu: tieuDe = "Đến giờ ngủ rồi"; phu = "Chúc con ngủ ngon! Cần gấp thì xin Ba Mẹ mở nhé."; nut = "Xin Ba Mẹ mở máy"
    case .khoaNgay: tieuDe = "Ba Mẹ đang khoá máy"; phu = "Đọc sách hoặc ra ngoài chơi nhé!"; nut = "Xin Ba Mẹ mở máy"
    case .hetGio: tieuDe = "Hết giờ chơi rồi"; phu = "Con đổi sao lấy phút hoặc xin Ba Mẹ thêm giờ nhé."; nut = "Thêm giờ chơi"
    case .gioHoc: tieuDe = "Giờ học rồi!"; phu = "Chỉ mở app học. Học xong được chơi tiếp."; nut = "Xin Ba Mẹ mở app khác"
    case .chuaVao: tieuDe = "Máy đang khoá"; phu = "Mở AiiGrow Con, chạm tên con rồi nhập PIN nhé."; nut = "Mở AiiGrow Con"
    case .khong:
      // khiên lúc không khoá giờ = app / trang Ba Mẹ chặn (them-4e5fwl16 · cdt-chan-web)
      tieuDe = web ? "Trang này chưa mở" : "\(ten ?? "App này") chưa mở"
      phu = web ? "Ba Mẹ chưa cho phép trang này. Con xin thử nhé!" : "Ba Mẹ chưa cho phép app này."
      nut = "Xin Ba Mẹ mở"
    default: tieuDe = "Tạm nghỉ chút nhé"; phu = lyDo.cauChoCon; nut = "Thêm giờ chơi"
    }
    let hinh: String
    switch lyDo {
    case .ngu: hinh = "fl_trang"
    case .khoaNgay, .chuaVao, .khong: hinh = "fl_khoa"
    case .hetGio: hinh = "fl_dong_ho_cat"
    default: hinh = "fl_dong_ho"
    }
    return ShieldConfiguration(
      backgroundBlurStyle: nil,
      backgroundColor: Self.nen,
      icon: VienClay.anh(hinh, nen: Self.nenIcon),
      title: .init(text: tieuDe, color: Self.chu),
      subtitle: .init(text: (web && lyDo != .khong ? (ten.map { "\($0) · " } ?? "") : "") + phu, color: Self.chu2),
      primaryButtonLabel: .init(text: nut, color: .white),
      primaryButtonBackgroundColor: Self.xanh,
      secondaryButtonLabel: .init(text: "Về trang chính", color: Self.xanhDam))
  }

  override func configuration(shielding application: Application) -> ShieldConfiguration { cauHinh(ten: application.localizedDisplayName) }
  override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
    cauHinh(ten: application.localizedDisplayName)
  }
  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration { cauHinh(ten: webDomain.domain, web: true) }
  override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration { cauHinh(ten: webDomain.domain, web: true) }
}

/// Viên clay tròn tráng men (bóng kép, men trắng nửa trên, phản chiếu đáy) với icon Fluent 3D ở giữa — vẽ thành một UIImage
/// vì màn chặn chỉ nhận ảnh tĩnh.
enum VienClay {
  static func anh(_ ten: String, nen: UIColor, co: CGFloat = 96) -> UIImage? {
    let le: CGFloat = 14
    // đáy chừa đủ cho bóng (lệch 8 + mờ 14) để bóng không bị cắt; trên chừa bằng dưới để viên nằm đúng tâm ảnh (Apple căn giữa icon)
    let tong = CGSize(width: co + le * 2, height: co + le * 2 + 24)
    let khung = CGRect(x: le, y: le + 12, width: co, height: co)
    let icon = UIImage(named: ten, in: Bundle(for: ShieldConfigurationExtension.self), with: nil)
    return UIGraphicsImageRenderer(size: tong).image { r in
      let g = r.cgContext
      let tron = UIBezierPath(ovalIn: khung)
      // bóng ngoài kép
      g.saveGState()
      g.setShadow(offset: CGSize(width: 0, height: 8), blur: 14, color: UIColor(white: 0.12, alpha: 0.38).cgColor)
      nen.setFill(); tron.fill()
      g.restoreGState()
      g.saveGState()
      g.setShadow(offset: CGSize(width: 0, height: 2), blur: 4, color: UIColor(white: 0.12, alpha: 0.22).cgColor)
      nen.setFill(); tron.fill()
      g.restoreGState()
      // men: vệt sáng trên + phản chiếu đáy
      g.saveGState()
      tron.addClip()
      let cs = CGColorSpaceCreateDeviceRGB()
      if let men = CGGradient(colorsSpace: cs, colors: [UIColor(white: 1, alpha: 0.95).cgColor, UIColor(white: 1, alpha: 0).cgColor] as CFArray, locations: [0, 1]) {
        g.saveGState()
        g.translateBy(x: khung.midX, y: khung.minY + co * 0.18); g.scaleBy(x: 1, y: 0.6)
        g.drawRadialGradient(men, startCenter: .zero, startRadius: 0, endCenter: .zero, endRadius: co * 0.5, options: [])
        g.restoreGState()
      }
      if let day = CGGradient(colorsSpace: cs, colors: [UIColor(white: 1, alpha: 0.5).cgColor, UIColor(white: 1, alpha: 0).cgColor] as CFArray, locations: [0, 1]) {
        g.saveGState()
        g.translateBy(x: khung.midX, y: khung.minY + co * 0.94); g.scaleBy(x: 1, y: 0.4)
        g.drawRadialGradient(day, startCenter: .zero, startRadius: 0, endCenter: .zero, endRadius: co * 0.4, options: [])
        g.restoreGState()
      }
      g.restoreGState()
      // viền men sáng mép trên
      UIColor(white: 1, alpha: 0.9).setStroke()
      let vien = UIBezierPath(arcCenter: CGPoint(x: khung.midX, y: khung.midY), radius: co / 2 - 0.75, startAngle: .pi * 1.15, endAngle: .pi * 1.85, clockwise: true)
      vien.lineWidth = 1.5; vien.stroke()
      icon?.draw(in: khung.insetBy(dx: co * 0.2, dy: co * 0.2))
    }
  }
}
