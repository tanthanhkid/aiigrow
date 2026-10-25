// Ngôn ngữ thiết kế Clay gương (docs/THIET-KE-CLAY.md, Thanh chốt 24/10/2026) dịch sang SwiftUI:
// khối đất sét bo lớn + bóng kép + men bóng; nút kẹo bọc đường; icon Fluent Emoji 3D (MIT); motion «vui» + «ánh men».
// Reduce Motion ⇒ chỉ fade. Chỉ là lớp trình bày — không chứa logic.
import AppKit
import SwiftUI

// MARK: - Màu (docs/clay/clay-a-goc-guong.css)

enum ClayMau {
  static func hex(_ v: UInt32, _ a: Double = 1) -> Color {
    Color(.sRGB, red: Double((v >> 16) & 0xff) / 255, green: Double((v >> 8) & 0xff) / 255, blue: Double(v & 0xff) / 255, opacity: a)
  }
  static let nen = hex(0xecebe7)
  static let nenSang = hex(0xe3ebe7)
  static let the = hex(0xf7f6f3)
  static let lom = hex(0xe9e8e3)
  static let chu = hex(0x0f1312)
  static let chu2 = hex(0x3a403d)
  static let chu3 = hex(0x565c59)        // chữ phụ: 6,1:1 trên #f7f6f3
  static let ngoc = hex(0x0f6b5c)
  static let ngocDam = hex(0x08463d)
  static let ngocInk = hex(0x0a5246)
  static let ngocSoft = hex(0xdcebe6)
  static let thanChi = hex(0x2e3533)
  static let thanChiDam = hex(0x121615)
  static let diemInk = hex(0x6e4300)
  static let diemSoft = hex(0xfbecc0)
  static let canh = hex(0x8a3c0c)
  static let canhSoft = hex(0xf9e7d2)
  static let loi = hex(0xb42318)
  static let lamSoft = hex(0xe1e9fb)
  static let timSoft = hex(0xe7e5f8)
  static let bong = hex(0x1c201e)        // màu bóng đổ (rgba(28,32,30,…))
}

// MARK: - Chuyển động (docs/clay/M-vui.js, M-anh-men.css)

enum ClayMotion {
  /// NHẤN XUỐNG: «thạch bị ép» 110ms bezier(.3,0,.5,1).
  static let nhan = Animation.timingCurve(0.3, 0, 0.5, 1, duration: 0.11)
  /// THẢ RA: withSpring(stiffness 420, damping 14) — nảy vượt ~8%.
  static let tha = Animation.interpolatingSpring(mass: 1, stiffness: 420, damping: 14)
  /// NẢY VÀO: withSpring(stiffness 260, damping 17).
  static let vao = Animation.interpolatingSpring(mass: 1, stiffness: 260, damping: 17)
  /// BẬT (pop): withSpring(stiffness 500, damping 16).
  static let bat = Animation.interpolatingSpring(mass: 1, stiffness: 500, damping: 16)
  /// Vệt men lướt: 420ms cubic-bezier(.3,.6,.2,1).
  static let quet = Animation.timingCurve(0.3, 0.6, 0.2, 1, duration: 0.42)
  /// Reduce Motion: chỉ fade ≤ 180ms.
  static let fade = Animation.easeInOut(duration: 0.18)
}

// MARK: - Icon Fluent Emoji 3D (đóng gói trong app, không tải mạng)

private final class MocBundle {}

@MainActor
enum FluentIcon {
  private static var cache: [String: NSImage?] = [:]     // nhớ cả lần không thấy (màn khoá vẽ lại mỗi giây)

  /// Tìm `<ten>.png`: gói phát hành chép vào `AiiGrow.app/Contents/Resources/Fluent/` (goi/build-pkg.sh);
  /// lúc dev/test lấy từ bundle tài nguyên SwiftPM cạnh tệp chạy. KHÔNG dùng `Bundle.module` (thiếu bundle là fatalError).
  /// `thuMuc`: «Fluent» (icon 3D) hoặc «Mascot» (Rob của app Con) — cùng cách tìm.
  static func anh(_ ten: String, thuMuc goc: String = "Fluent") -> NSImage? {
    let khoa = goc + "/" + ten
    if let c = cache[khoa] { return c }    // c: NSImage? — nil đã nhớ thì không dò đĩa lại
    var thuMuc: [URL] = []
    if let r = Bundle.main.resourceURL { thuMuc.append(r.appendingPathComponent(goc)) }
    let canh = [Bundle.main.resourceURL, Bundle.main.bundleURL, Bundle.main.executableURL?.deletingLastPathComponent(),
                Bundle(for: MocBundle.self).bundleURL.deletingLastPathComponent()].compactMap { $0 }   // dòng cuối: lúc chạy test (.xctest nằm cạnh bundle tài nguyên)
    for g in canh {
      let b = g.appendingPathComponent("AiiGrowMac_AiiGrowTray.bundle")
      thuMuc.append(b.appendingPathComponent(goc))
      thuMuc.append(b.appendingPathComponent("Contents/Resources/" + goc))
    }
    for d in thuMuc {
      let u = d.appendingPathComponent(ten + ".png")
      if let img = NSImage(contentsOf: u) { cache[khoa] = .some(img); return img }
    }
    cache[khoa] = .some(nil)
    return nil
  }
}

/// Icon Fluent 3D; thiếu tệp thì rơi về SF Symbol (không bao giờ trống).
struct HinhFluent: View {
  let ten: String
  var duPhong: String = "circle.fill"
  var co: CGFloat = 24
  var body: some View {
    if let img = FluentIcon.anh(ten) {
      Image(nsImage: img).resizable().interpolation(.high).aspectRatio(contentMode: .fit)
        .frame(width: co, height: co)
        .shadow(color: ClayMau.bong.opacity(0.22), radius: 1.5, x: 0, y: 1.5)
        .accessibilityHidden(true)
    } else {
      Image(systemName: duPhong).font(.system(size: co * 0.8)).foregroundColor(ClayMau.ngoc)
        .frame(width: co, height: co).accessibilityHidden(true)
    }
  }
}

/// Viên clay tròn chứa icon 3D (`.bt` trong CSS): nền soft + men bóng trên + phản chiếu đáy + bóng nhỏ.
struct VienClay: View {
  let ten: String
  var duPhong = "circle.fill"
  var nen: Color = ClayMau.the
  var co: CGFloat = 44
  var body: some View {
    ZStack {
      Circle().fill(nen)
      Circle().fill(RadialGradient(colors: [.white.opacity(0.95), .white.opacity(0)], center: UnitPoint(x: 0.5, y: 0.18),
                                   startRadius: 0, endRadius: co * 0.42))
      Circle().fill(RadialGradient(colors: [.white.opacity(0.5), .white.opacity(0)], center: UnitPoint(x: 0.5, y: 0.95),
                                   startRadius: 0, endRadius: co * 0.3))
      Circle().strokeBorder(LinearGradient(colors: [.white, .white.opacity(0)], startPoint: .top, endPoint: .center), lineWidth: 1.2)
      HinhFluent(ten: ten, duPhong: duPhong, co: co * 0.56)
    }
    .frame(width: co, height: co)
    .shadow(color: ClayMau.bong.opacity(0.40), radius: 8, x: 0, y: 6)
    .shadow(color: ClayMau.bong.opacity(0.22), radius: 2.5, x: 0, y: 2)
  }
}

// MARK: - Khối đất sét (thẻ)

/// Thẻ clay gương: nền sứ, dải sáng cong mép trên, phản chiếu đáy, bóng kép (ngoài mềm lệch xuống + bóng gần).
struct ClayThe: ViewModifier {
  var bo: CGFloat = 28
  var nen: Color = ClayMau.the
  func body(content: Content) -> some View {
    let hinh = RoundedRectangle(cornerRadius: bo, style: .continuous)
    content
      .background(
        ZStack {
          hinh.fill(nen)
          hinh.fill(LinearGradient(stops: [
            .init(color: Color(white: 0.996), location: 0), .init(color: Color(white: 0.996, opacity: 0), location: 0.26),
            .init(color: ClayMau.bong.opacity(0.025), location: 0.6), .init(color: ClayMau.bong.opacity(0.07), location: 1),
          ], startPoint: .top, endPoint: .bottom))
          // dải men trắng cong sát mép trên
          RadialGradient(colors: [.white, .white.opacity(0.95), .white.opacity(0)], center: UnitPoint(x: 0.5, y: 0),
                         startRadius: 0, endRadius: 60)
            .scaleEffect(x: 3.2, y: 0.32, anchor: .top)
            .clipShape(hinh)
          // viền sáng trên (inset 0 1.5px #fff) + vệt sáng đáy (inset 0 -2px rgba(255,255,255,.7))
          hinh.strokeBorder(LinearGradient(stops: [
            .init(color: .white, location: 0), .init(color: .white.opacity(0), location: 0.12),
            .init(color: .white.opacity(0), location: 0.9), .init(color: .white.opacity(0.7), location: 1),
          ], startPoint: .top, endPoint: .bottom), lineWidth: 1.5)
        }
        .compositingGroup()
        .shadow(color: ClayMau.bong.opacity(0.38), radius: 15, x: 0, y: 16)
        .shadow(color: ClayMau.bong.opacity(0.20), radius: 5, x: 0, y: 4)
      )
  }
}

/// Lòng chảo ấn lõm (ô nhập, dải tiến độ): bóng trong phía trên + viền sáng đáy.
struct ClayLom: ViewModifier {
  var bo: CGFloat = 16
  func body(content: Content) -> some View {
    let hinh = RoundedRectangle(cornerRadius: bo, style: .continuous)
    content
      .background(
        ZStack {
          hinh.fill(ClayMau.lom)
          hinh.strokeBorder(LinearGradient(colors: [ClayMau.bong.opacity(0.16), .clear], startPoint: .top, endPoint: UnitPoint(x: 0.5, y: 0.35)), lineWidth: 3)
            .blur(radius: 1.5).clipShape(hinh)
          hinh.strokeBorder(LinearGradient(colors: [.clear, .white.opacity(0.95)], startPoint: UnitPoint(x: 0.5, y: 0.8), endPoint: .bottom), lineWidth: 1.5)
        }
      )
  }
}

extension View {
  func clayThe(bo: CGFloat = 28, nen: Color = ClayMau.the) -> some View { modifier(ClayThe(bo: bo, nen: nen)) }
  func clayLom(bo: CGFloat = 16) -> some View { modifier(ClayLom(bo: bo)) }
  /// Tải trang: các khối vào lần lượt (stagger 55ms, translateY 26→0 + scale .92→1, spring NẢY VÀO). Reduce Motion ⇒ chỉ fade.
  func vaoLanLuot(_ i: Int) -> some View { modifier(VaoLanLuot(thuTu: i)) }
  /// Cửa sổ clay: nền ấm có quầng ngọc nhạt phía trên, ép giao diện sáng (ô nhập, Picker vẽ đúng trên nền sáng).
  func nenClay() -> some View {
    background(
      RadialGradient(colors: [ClayMau.nenSang, ClayMau.nen], center: UnitPoint(x: 0.2, y: 0), startRadius: 0, endRadius: 420)
        .ignoresSafeArea()
    )
    .foregroundColor(ClayMau.chu)
    .environment(\.colorScheme, .light)
  }
}

struct VaoLanLuot: ViewModifier {
  let thuTu: Int
  @Environment(\.accessibilityReduceMotion) private var giamDong
  @State private var hien = false
  func body(content: Content) -> some View {
    content
      .opacity(hien ? 1 : 0)
      .offset(y: hien || giamDong ? 0 : 26)
      .scaleEffect(hien || giamDong ? 1 : 0.92)
      .onAppear {
        let tre = giamDong ? 0 : Double(thuTu) * 0.055
        withAnimation((giamDong ? ClayMotion.fade : ClayMotion.vao).delay(tre)) { hien = true }
      }
  }
}

// MARK: - Nút kẹo bọc đường

enum KieuNut { case ngoc, thanChi, sang }

/// Nút clay: bẹp khi nhấn (scale .95×.90, 110ms) rồi thả nảy (spring 420/14) + vệt men lướt chéo 105°.
/// Reduce Motion ⇒ không bẹp/nảy/lướt, chỉ tối nhẹ. Cao ≥ 44pt.
struct NutClayStyle: ButtonStyle {
  var kieu: KieuNut = .ngoc
  var bo: CGFloat = 18
  var cao: CGFloat = 46
  func makeBody(configuration: Configuration) -> some View {
    NutClayThan(nhan: configuration.isPressed, kieu: kieu, bo: bo, cao: cao) { configuration.label }
  }
}

private struct NutClayThan<Nhan: View>: View {
  let nhan: Bool
  let kieu: KieuNut
  let bo: CGFloat
  let cao: CGFloat
  @ViewBuilder let nhanView: () -> Nhan
  @Environment(\.isEnabled) private var bat
  @Environment(\.accessibilityReduceMotion) private var giamDong
  @State private var vet: CGFloat = -1.1      // vị trí vệt men (-1.1 → 1.1 bề ngang)
  @State private var hienVet = false
  @State private var luot = 0                 // thế hệ vệt men: lần thả sau huỷ lượt dọn của lần trước

  private var toi: Bool { kieu == .ngoc || kieu == .thanChi }
  private var mauChu: Color {
    switch kieu {
    case .ngoc, .thanChi: return .white
    case .sang: return ClayMau.chu
    }
  }

  var body: some View {
    let hinh = RoundedRectangle(cornerRadius: bo, style: .continuous)
    nhanView()
      .font(.system(size: 15, weight: .bold))
      .lineLimit(2).multilineTextAlignment(.center).truncationMode(.tail)   // chữ dài: tối đa 2 dòng rồi «…»
      .frame(maxWidth: .infinity, minHeight: cao)
      .padding(.horizontal, 14)
      .foregroundColor(mauChu)
      .background(nen(hinh))
      .overlay(vetMen(hinh))
      .contentShape(hinh)
      .scaleEffect(x: nhan && !giamDong ? 0.95 : 1, y: nhan && !giamDong ? 0.90 : 1)
      .brightness(nhan && giamDong ? -0.06 : 0)
      .animation(nhan ? ClayMotion.nhan : (giamDong ? ClayMotion.fade : ClayMotion.tha), value: nhan)
      .opacity(bat ? 1 : 0.5)
      .onChange(of: nhan) { dang in
        guard !dang, !giamDong else { return }
        luot += 1; let lan = luot
        vet = -1.1; hienVet = true
        withAnimation(ClayMotion.quet) { vet = 1.1 }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.45) { if luot == lan { hienVet = false; vet = -1.1 } }
      }
  }

  @ViewBuilder private func nen(_ hinh: RoundedRectangle) -> some View {
    switch kieu {
    case .ngoc, .thanChi:
      let (tren, duoi, phanChieu, bong): (Color, Color, Color, Color) = kieu == .ngoc
        ? (ClayMau.ngoc, ClayMau.ngocDam, ClayMau.hex(0x50dcbe, 0.4), ClayMau.hex(0x0a5246))
        : (ClayMau.thanChi, ClayMau.thanChiDam, ClayMau.hex(0x788c87, 0.35), ClayMau.hex(0x0f1312))
      ZStack {
        hinh.fill(LinearGradient(colors: [tren, duoi], startPoint: .top, endPoint: .bottom))
        // vệt phản chiếu đáy: elip dẹt rộng, nhẹ (không thành đốm sáng giữa nút)
        RadialGradient(colors: [phanChieu, .clear], center: UnitPoint(x: 0.5, y: 1.0), startRadius: 0, endRadius: cao * 0.6)
          .scaleEffect(x: 4, y: 0.6, anchor: .bottom).opacity(0.7).clipShape(hinh)
        // mảng men trắng nửa trên, cắt sắc ở ~25%
        hinh.fill(LinearGradient(stops: [
          .init(color: .white.opacity(0.32), location: 0), .init(color: .white.opacity(0.08), location: 0.24),
          .init(color: .white.opacity(0), location: 0.26),
        ], startPoint: .top, endPoint: .bottom))
        hinh.strokeBorder(LinearGradient(colors: [.white.opacity(0.45), .clear, .black.opacity(0.35)], startPoint: .top, endPoint: .bottom), lineWidth: 1)
      }
      .compositingGroup()
      .shadow(color: bong.opacity(0.6), radius: 8, x: 0, y: 7)
      .shadow(color: bong.opacity(0.35), radius: 2.5, x: 0, y: 2)
    case .sang:
      ZStack {
        hinh.fill(ClayMau.the)
        hinh.fill(LinearGradient(stops: [
          .init(color: .white, location: 0), .init(color: .white.opacity(0.85), location: 0.44),
          .init(color: Color(white: 0.91, opacity: 0), location: 0.5), .init(color: ClayMau.bong.opacity(0.05), location: 1),
        ], startPoint: .top, endPoint: .bottom))
        hinh.strokeBorder(LinearGradient(colors: [.white, .clear], startPoint: .top, endPoint: .center), lineWidth: 1.5)
      }
      .compositingGroup()
      .shadow(color: ClayMau.bong.opacity(0.40), radius: 7, x: 0, y: 6)
      .shadow(color: ClayMau.bong.opacity(0.24), radius: 2, x: 0, y: 2)
    }
  }

  private func vetMen(_ hinh: RoundedRectangle) -> some View {
    GeometryReader { g in
      LinearGradient(stops: [
        .init(color: .white.opacity(0), location: 0.34), .init(color: .white.opacity(0.10), location: 0.42),
        .init(color: .white.opacity(toi ? 0.55 : 1), location: 0.49), .init(color: .white.opacity(0.16), location: 0.54),
        .init(color: .white.opacity(0), location: 0.62),
      ], startPoint: UnitPoint(x: 0, y: 0.37), endPoint: UnitPoint(x: 1, y: 0.63))   // ~105°
      .frame(width: g.size.width * 1.4)
      .offset(x: -g.size.width * 0.2 + vet * g.size.width)
      .opacity(hienVet ? 1 : 0)
    }
    .clipShape(hinh)
    .allowsHitTesting(false)
  }
}

// MARK: - Ổ khoá «đóng sập» / chuông rung

/// Ổ khoá đóng sập 380ms khi xuất hiện: nhấc -9px scale 1.3 → đập 2px .85/1.1 → 1.08/.94 → 1. Reduce Motion ⇒ chỉ fade.
struct KhoaDongSap: ViewModifier {
  @Environment(\.accessibilityReduceMotion) private var giamDong
  @State private var buoc = 0
  @State private var hien = false
  func body(content: Content) -> some View {
    let (dy, sx, sy): (CGFloat, CGFloat, CGFloat) = {
      if giamDong { return (0, 1, 1) }
      switch buoc {
      case 0: return (-9, 1.3, 1.3)
      case 1: return (2, 1.1, 0.85)
      case 2: return (0, 0.94, 1.08)
      default: return (0, 1, 1)
      }
    }()
    content
      .offset(y: dy).scaleEffect(x: sx, y: sy, anchor: .bottom)
      .opacity(hien ? 1 : 0)
      .onAppear {
        if giamDong { withAnimation(ClayMotion.fade) { hien = true }; return }
        withAnimation(.easeOut(duration: 0.12)) { hien = true }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) { withAnimation(.easeIn(duration: 0.08)) { buoc = 1 } }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.20) { withAnimation(.easeOut(duration: 0.09)) { buoc = 2 } }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.29) { withAnimation(ClayMotion.tha) { buoc = 3 } }
      }
  }
}

/// Rung (chuông/đồng hồ báo): rotate 0,-18,14,-9,5,0 quanh đỉnh trong 450ms. Reduce Motion ⇒ không rung.
struct RungChuong: ViewModifier {
  @Environment(\.accessibilityReduceMotion) private var giamDong
  @State private var goc: Double = 0
  func body(content: Content) -> some View {
    content
      .rotationEffect(.degrees(goc), anchor: .top)
      .onAppear {
        guard !giamDong else { return }
        let khung: [Double] = [-18, 14, -9, 5, 0]
        for (i, g) in khung.enumerated() {
          DispatchQueue.main.asyncAfter(deadline: .now() + 0.25 + Double(i) * 0.09) { withAnimation(.easeInOut(duration: 0.09)) { goc = g } }
        }
      }
  }
}

extension View {
  func khoaDongSap() -> some View { modifier(KhoaDongSap()) }
  func rungChuong() -> some View { modifier(RungChuong()) }
}
