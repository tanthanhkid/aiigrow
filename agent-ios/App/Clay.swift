// Ngôn ngữ thiết kế «Clay gương» (docs/THIET-KE-CLAY.md) dịch sang SwiftUI: khối đất sét bo lớn, bóng kép, men gương (dải sáng cong
// mép trên thẻ, mảng men trắng nửa trên nút), icon Fluent 3D trong viên clay, motion «vui» (bẹp-nảy lò xo, vào lần lượt) + «ánh men»
// (vệt sáng lướt chéo khi nhấn). Thông số: docs/clay/clay-a-goc-guong.css, M-vui.js, M-anh-men.css. Giảm chuyển động ⇒ chỉ mờ.
import SwiftUI

extension Color {
  init(hex: UInt32, a: Double = 1) {
    self.init(.sRGB, red: Double(hex >> 16 & 0xff) / 255, green: Double(hex >> 8 & 0xff) / 255, blue: Double(hex & 0xff) / 255, opacity: a)
  }
}

enum Clay {
  static let nen = Color(hex: 0xecebe7)
  static let nenDinh = Color(hex: 0xe3ebe7)
  static let the = Color(hex: 0xf7f6f3)
  static let lom = Color(hex: 0xe9e8e3)
  static let chu = Color(hex: 0x0f1312)
  static let chu2 = Color(hex: 0x3a403d)
  static let chu3 = Color(hex: 0x565c59)
  static let chinh = Color(hex: 0x0f6b5c)
  static let chinhInk = Color(hex: 0x0a5246)
  static let chinhSoft = Color(hex: 0xdcebe6)
  static let diemSoft = Color(hex: 0xfbecc0)
  static let canh = Color(hex: 0x8a3c0c)
  static let canhSoft = Color(hex: 0xf9e7d2)
  static let lamSoft = Color(hex: 0xe1e9fb)
  static let timSoft = Color(hex: 0xe7e5f8)
  static let loi = Color(hex: 0xb42318)
  static let bong = Color(hex: 0x1c201e)
  /// Trắng trong suốt — dùng thay .clear trong gradient men (.clear là đen α0, nội suy với trắng ra vệt xám).
  static let trong = Color.white.opacity(0)

  /// Nền màn: hơi ngả ngọc ở đỉnh như mẫu.
  static var nenMan: some View {
    LinearGradient(colors: [nenDinh, nen, nen], startPoint: .top, endPoint: .bottom).ignoresSafeArea()
  }

  // Lò xo (withSpring tương đương): thả ra nảy vượt ~8%, nảy vào, bật.
  static let tha = Animation.interpolatingSpring(stiffness: 420, damping: 14)
  static let vao = Animation.interpolatingSpring(stiffness: 260, damping: 17)
  static let bat = Animation.interpolatingSpring(stiffness: 500, damping: 16)
  static let men = Animation.timingCurve(0.2, 0.7, 0.2, 1, duration: 0.32)
}

enum KieuClay: Equatable {
  case the(Color = Clay.the)
  case than, ngoc, vien, lom
  case tron(Color)
}

/// Bề mặt đất sét tráng men cho một khối bo góc / viên tròn.
struct NenClay: View {
  var kieu: KieuClay
  var bo: CGFloat = 32

  var body: some View {
    let hinh = RoundedRectangle(cornerRadius: bo, style: .continuous)
    switch kieu {
    case .lom:
      hinh.fill(Clay.lom)
        .overlay(hinh.fill(LinearGradient(stops: [.init(color: Clay.bong.opacity(0.14), location: 0), .init(color: Clay.bong.opacity(0), location: 0.2)],
                                          startPoint: .top, endPoint: .bottom)))
        .overlay(hinh.strokeBorder(LinearGradient(stops: [.init(color: Clay.trong, location: 0.8), .init(color: .white.opacity(0.95), location: 1)],
                                                  startPoint: .top, endPoint: .bottom), lineWidth: 1.5))
    case .than, .ngoc:
      let ngoc = kieu == .ngoc
      hinh.fill(LinearGradient(colors: ngoc ? [Color(hex: 0x0f6b5c), Color(hex: 0x08463d)] : [Color(hex: 0x2e3533), Color(hex: 0x121615)],
                               startPoint: .top, endPoint: .bottom))
        // kẹo bọc đường: nửa trên một mảng men trắng mờ cắt sắc
        .overlay(hinh.fill(LinearGradient(stops: [.init(color: .white.opacity(ngoc ? 0.34 : 0.30), location: 0),
                                                  .init(color: .white.opacity(0.08), location: 0.24),
                                                  .init(color: Clay.trong, location: 0.26)], startPoint: .top, endPoint: .bottom)))
        // phản chiếu đáy
        .overlay(hinh.fill(EllipticalGradient(colors: [ngoc ? Color(hex: 0x50dcbe, a: 0.4) : Color(hex: 0x788c87, a: 0.35), ngoc ? Color(hex: 0x50dcbe, a: 0) : Color(hex: 0x788c87, a: 0)],
                                              center: UnitPoint(x: 0.5, y: 1.05), endRadiusFraction: 0.6)))
        .overlay(hinh.strokeBorder(LinearGradient(stops: [.init(color: .white.opacity(0.45), location: 0), .init(color: Clay.trong, location: 0.1),
                                                          .init(color: Clay.trong, location: 0.85), .init(color: .black.opacity(0.35), location: 1)],
                                                  startPoint: .top, endPoint: .bottom), lineWidth: 1.5))
        .compositingGroup()   // bóng cho cả khối, không cho từng lớp men (không thì vệt men đổ bóng thành sọc xám)
        .shadow(color: (ngoc ? Color(hex: 0x0a5246) : Color(hex: 0x0f1312)).opacity(0.55), radius: 8, y: 7)
        .shadow(color: (ngoc ? Color(hex: 0x0a5246) : Color(hex: 0x0f1312)).opacity(0.3), radius: 2.5, y: 2)
    case .vien:
      hinh.fill(Clay.the)
        .overlay(hinh.fill(LinearGradient(stops: [.init(color: .white, location: 0), .init(color: .white.opacity(0.85), location: 0.44),
                                                  .init(color: Clay.trong, location: 0.5), .init(color: Clay.bong.opacity(0.05), location: 1)],
                                          startPoint: .top, endPoint: .bottom)))
        .overlay(vienMen(hinh))
        .compositingGroup()   // bóng cho cả khối, không cho từng lớp men (không thì vệt men đổ bóng thành sọc xám)
        .shadow(color: Clay.bong.opacity(0.36), radius: 8, y: 8)
        .shadow(color: Clay.bong.opacity(0.2), radius: 2.5, y: 2)
    case .the(let mau):
      hinh.fill(mau)
        .overlay(hinh.fill(LinearGradient(stops: [.init(color: Color(hex: 0xfefefd), location: 0), .init(color: Color(hex: 0xfefefd, a: 0), location: 0.26),
                                                  .init(color: Clay.bong.opacity(0.025), location: 0.6), .init(color: Clay.bong.opacity(0.07), location: 1)],
                                          startPoint: .top, endPoint: .bottom)))
        // dải sáng cong sát mép trên
        .overlay(alignment: .top) {
          GeometryReader { g in
            Ellipse().fill(Color.white.opacity(0.95)).blur(radius: 6)
              .frame(width: g.size.width * 0.84, height: 26).position(x: g.size.width / 2, y: 3)
          }
        }
        .clipShape(hinh)
        .overlay(vienMen(hinh))
        .compositingGroup()   // bóng cho cả khối, không cho từng lớp men (không thì vệt men đổ bóng thành sọc xám)
        .shadow(color: Clay.bong.opacity(0.34), radius: 13, y: 12)
        .shadow(color: Clay.bong.opacity(0.2), radius: 4, y: 4)
    case .tron(let mau):
      Circle().fill(mau)
        .overlay(Circle().fill(EllipticalGradient(colors: [.white.opacity(0.95), Clay.trong], center: UnitPoint(x: 0.5, y: 0.18), endRadiusFraction: 0.45)))
        .overlay(Circle().fill(EllipticalGradient(colors: [.white.opacity(0.5), Clay.trong], center: UnitPoint(x: 0.5, y: 0.94), endRadiusFraction: 0.3)))
        .overlay(Circle().strokeBorder(LinearGradient(stops: [.init(color: .white, location: 0), .init(color: Clay.trong, location: 0.12)],
                                                      startPoint: .top, endPoint: .bottom), lineWidth: 1.5))
        .compositingGroup()   // bóng cho cả khối, không cho từng lớp men (không thì vệt men đổ bóng thành sọc xám)
        .shadow(color: Clay.bong.opacity(0.36), radius: 7, y: 7)
        .shadow(color: Clay.bong.opacity(0.2), radius: 2.5, y: 2)
    }
  }

  /// Viền men: sáng sắc mép trên, tối mờ mép dưới (inset của CSS).
  func vienMen(_ h: RoundedRectangle) -> some View {
    h.strokeBorder(LinearGradient(stops: [.init(color: .white, location: 0), .init(color: .white.opacity(0), location: 0.1),
                                          .init(color: Clay.trong, location: 0.86), .init(color: Clay.bong.opacity(0.09), location: 1)],
                                  startPoint: .top, endPoint: .bottom), lineWidth: 1.5)
  }
}

extension View {
  /// Khối đất sét (thẻ) bo 32, đệm 18 (tối thiểu 16).
  func khoiClay(_ mau: Color = Clay.the, bo: CGFloat = 32, dem: CGFloat = 18) -> some View {
    padding(dem).frame(maxWidth: .infinity, alignment: .leading).background(NenClay(kieu: .the(mau), bo: bo))
  }

  /// Tải trang: khối vào lần lượt (so le 55ms, nảy từ dưới). Giảm chuyển động ⇒ chỉ mờ.
  func vaoLanLuot(_ i: Int) -> some View { modifier(VaoLanLuot(i: i)) }
}

struct VaoLanLuot: ViewModifier {
  let i: Int
  @Environment(\.accessibilityReduceMotion) var giam
  @State var hien = false
  func body(content: Content) -> some View {
    content
      .opacity(hien ? 1 : 0)
      .offset(y: hien || giam ? 0 : 26)
      .scaleEffect(hien || giam ? 1 : 0.96)
      .onAppear {
        withAnimation(giam ? .easeOut(duration: 0.18) : Clay.vao.delay(Double(i) * 0.055)) { hien = true }
      }
  }
}

/// Icon minh hoạ Fluent 3D (MIT, TaiNguyen/Fluent.xcassets) trong viên clay tròn.
struct IconClay: View {
  var ten: String
  var nen: Color = Clay.the
  var co: CGFloat = 44
  var body: some View {
    Image(ten).resizable().scaledToFit().frame(width: co * 0.6, height: co * 0.6)
      .frame(width: co, height: co)
      .background(NenClay(kieu: .tron(nen)))
      .accessibilityHidden(true)
  }
}

/// Nút kẹo dẻo tráng men: nhấn ⇒ bẹp (thạch bị ép) + vệt men lướt chéo; thả ⇒ nảy lò xo.
struct NutClay: ButtonStyle {
  var kieu: KieuClay = .than
  var bo: CGFloat = 22
  var cao: CGFloat = 52
  func makeBody(configuration c: Configuration) -> some View { NutClayThan(c: c, kieu: kieu, bo: bo, cao: cao) }
}

private struct NutClayThan: View {
  let c: ButtonStyleConfiguration
  let kieu: KieuClay
  let bo: CGFloat
  let cao: CGFloat
  @Environment(\.accessibilityReduceMotion) var giam
  @State var quet: CGFloat = -1.2

  var sang: Bool {
    switch kieu { case .than, .ngoc: return false; default: return true }
  }

  var body: some View {
    let nhan = c.isPressed && !giam
    // chữ cách mép khối 16 hai bên; nhãn dài xuống dòng căn giữa, khối cao ra (minHeight), không cắt
    c.label.font(.headline).multilineTextAlignment(.center).padding(.vertical, 6).frame(maxWidth: .infinity, minHeight: cao).padding(.horizontal, 16)
      .foregroundColor(sang ? Clay.chinhInk : .white)
      .background(NenClay(kieu: kieu, bo: bo))
      .overlay(
        GeometryReader { g in
          LinearGradient(stops: [.init(color: Clay.trong, location: 0.34), .init(color: .white.opacity(0.1), location: 0.42),
                                 .init(color: .white.opacity(sang ? 1 : 0.55), location: 0.49), .init(color: .white.opacity(0.16), location: 0.54),
                                 .init(color: Clay.trong, location: 0.62)],
                         startPoint: UnitPoint(x: 0, y: 0.35), endPoint: UnitPoint(x: 1, y: 0.65))
            .frame(width: g.size.width * 1.4).offset(x: g.size.width * (quet - 0.2))
        }
        .clipShape(RoundedRectangle(cornerRadius: bo, style: .continuous))
        .allowsHitTesting(false)
      )
      .scaleEffect(x: nhan ? 0.96 : 1, y: nhan ? 0.93 : 1)
      .opacity(giam && c.isPressed ? 0.85 : 1)   // nút tắt: màn tự làm mờ như trước
      .animation(c.isPressed ? .timingCurve(0.3, 0, 0.5, 1, duration: 0.11) : Clay.tha, value: c.isPressed)
      .onChange(of: c.isPressed) { p in
        guard p, !giam else { return }
        quet = -1.1
        withAnimation(.timingCurve(0.3, 0.6, 0.2, 1, duration: 0.42)) { quet = 1.1 }
      }
  }
}
