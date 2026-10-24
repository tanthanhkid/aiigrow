// Màn chặn của AiiGrow: câu tiếng Việt thân thiện theo lý do (đọc từ app group) + nút «Xin thêm giờ».
// Ngôn ngữ «Clay gương» trong giới hạn của Apple: ShieldConfiguration chỉ nhận màu nền, một ảnh icon, màu chữ và màu nút (không bo góc,
// bóng hay chuyển động). Nên: nền đất sét #ecebe7, icon = viên clay tráng men vẽ sẵn thành ảnh (Fluent 3D bên trong), nút ngọc lục bảo.
import ManagedSettings
import ManagedSettingsUI
import UIKit
import ConCore

final class ShieldConfigurationExtension: ShieldConfigurationDataSource {
  static let ngoc = UIColor(red: 0x0f / 255, green: 0x6b / 255, blue: 0x5c / 255, alpha: 1)
  static let ngocInk = UIColor(red: 0x0a / 255, green: 0x52 / 255, blue: 0x46 / 255, alpha: 1)
  static let nen = UIColor(red: 0xec / 255, green: 0xeb / 255, blue: 0xe7 / 255, alpha: 1)
  static let chu = UIColor(red: 0x0f / 255, green: 0x13 / 255, blue: 0x12 / 255, alpha: 1)
  static let chu3 = UIColor(red: 0x56 / 255, green: 0x5c / 255, blue: 0x59 / 255, alpha: 1)

  func cauHinh(ten: String?) -> ShieldConfiguration {
    let k = KhoUserDefaults().doc(KhienMuonCo.self, Khoa.khienDangAp)
    let lyDo = k?.lyDo ?? .ngoaiGio
    let tieuDe: String
    switch lyDo {
    case .ngu: tieuDe = "Chúc con ngủ ngon 🌙"
    case .khoaNgay: tieuDe = "Mình nghỉ một chút nhé"
    case .hetGio: tieuDe = "Hết giờ chơi hôm nay rồi"
    default: tieuDe = "Tạm nghỉ chút nhé"
    }
    let phu = (ten.map { "\($0) đang tạm khoá. " } ?? "") + lyDo.cauChoCon + "\nCon có thể xin Ba Mẹ thêm giờ."
    let coXin = lyDo != .ngu && lyDo != .khoaNgay
    let hinh: (String, UIColor)
    switch lyDo {
    case .ngu: hinh = ("fl_trang", UIColor(red: 0xe7 / 255, green: 0xe5 / 255, blue: 0xf8 / 255, alpha: 1))
    case .khoaNgay: hinh = ("fl_khoa", UIColor(red: 0xfb / 255, green: 0xec / 255, blue: 0xc0 / 255, alpha: 1))
    case .hetGio: hinh = ("fl_dong_ho_cat", UIColor(red: 0xf9 / 255, green: 0xe7 / 255, blue: 0xd2 / 255, alpha: 1))
    default: hinh = ("fl_dong_ho", UIColor(red: 0xdc / 255, green: 0xeb / 255, blue: 0xe6 / 255, alpha: 1))
    }
    return ShieldConfiguration(
      backgroundBlurStyle: nil,
      backgroundColor: Self.nen,
      icon: VienClay.anh(hinh.0, nen: hinh.1),
      title: .init(text: tieuDe, color: Self.chu),
      subtitle: .init(text: phu, color: Self.chu3),
      primaryButtonLabel: .init(text: coXin ? "Xin thêm giờ" : "Đã hiểu", color: .white),
      primaryButtonBackgroundColor: Self.ngoc,
      secondaryButtonLabel: coXin ? .init(text: "Để sau", color: Self.ngocInk) : nil)
  }

  override func configuration(shielding application: Application) -> ShieldConfiguration { cauHinh(ten: application.localizedDisplayName) }
  override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
    cauHinh(ten: application.localizedDisplayName)
  }
  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration { cauHinh(ten: webDomain.domain) }
  override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration { cauHinh(ten: webDomain.domain) }
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
