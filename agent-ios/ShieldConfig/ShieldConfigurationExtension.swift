// Màn chặn của AiiGrow: câu tiếng Việt thân thiện theo lý do (đọc từ app group) + nút «Xin thêm giờ».
import ManagedSettings
import ManagedSettingsUI
import UIKit
import ConCore

final class ShieldConfigurationExtension: ShieldConfigurationDataSource {
  static let xanh = UIColor(red: 0x1f / 255, green: 0x8a / 255, blue: 0x70 / 255, alpha: 1)

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
    return ShieldConfiguration(
      backgroundBlurStyle: .systemMaterial,
      backgroundColor: UIColor.systemBackground,
      icon: UIImage(systemName: lyDo == .ngu ? "moon.stars.fill" : "leaf.fill")?.withTintColor(Self.xanh, renderingMode: .alwaysOriginal),
      title: .init(text: tieuDe, color: .label),
      subtitle: .init(text: phu, color: .secondaryLabel),
      primaryButtonLabel: .init(text: coXin ? "Xin thêm giờ" : "Đã hiểu", color: .white),
      primaryButtonBackgroundColor: Self.xanh,
      secondaryButtonLabel: coXin ? .init(text: "Để sau", color: Self.xanh) : nil)
  }

  override func configuration(shielding application: Application) -> ShieldConfiguration { cauHinh(ten: application.localizedDisplayName) }
  override func configuration(shielding application: Application, in category: ActivityCategory) -> ShieldConfiguration {
    cauHinh(ten: application.localizedDisplayName)
  }
  override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration { cauHinh(ten: webDomain.domain) }
  override func configuration(shielding webDomain: WebDomain, in category: ActivityCategory) -> ShieldConfiguration { cauHinh(ten: webDomain.domain) }
}
