// Ngôn ngữ thiết kế Clay gương (docs/THIET-KE-CLAY.md, Thanh chốt 24/10/2026) dịch sang SwiftUI:
// khối đất sét bo lớn + bóng kép + men bóng; nút kẹo bọc đường; icon Fluent Emoji 3D (MIT); motion «vui» + «ánh men».
// Reduce Motion ⇒ chỉ fade. Chỉ là lớp trình bày — không chứa logic.
import AppKit
import SwiftUI

// MARK: - Màu (phong cách E «Ánh kim», 17/11 — ngang agent-win Clay.cs)
// Neumorphism trên nền kem: mặt thẻ CÙNG màu nền, nổi bằng bóng đôi (tối lệch xuống-phải, sáng lệch lên-trái); ô lõm = bóng trong.
// Nút chính + huy hiệu = vàng kim gradient 135° chữ navy; khối nổi bật = navy viền vàng mảnh. Tên token giữ như cũ
// (ngoc = «chính» nay là navy). Tương phản WCAG (đo bằng script, chữ thường ≥ 4,5:1):
//   chu/nen 14,4 · chu3/nen 5,8 · chu3/lom 5,4 · chu3/ngocSoft 5,1 · diemInk/nen 6,4 · diemInk/diemSoft 5,6 · canh/nen 5,0 · canh/canhSoft 5,2 · canh/lom 4,7 · loi = canh · xanh/nen 5,2
//   chu/kimDam (điểm tối nhất của nút vàng) 6,9 · kim/navy 11,4 · nenSang/navy 15,3 · kimInk/nen 5,0

enum ClayMau {
  static func hex(_ v: UInt32, _ a: Double = 1) -> Color {
    Color(.sRGB, red: Double((v >> 16) & 0xff) / 255, green: Double((v >> 8) & 0xff) / 255, blue: Double(v & 0xff) / 255, opacity: a)
  }
  static let nen = hex(0xece4d9)          // nền kem
  static let nenSang = hex(0xf2ebe3)      // kem sáng (chữ trên navy)
  static let the = hex(0xece4d9)          // mặt thẻ = nền, nổi bằng bóng đôi
  static let lom = hex(0xe5dccf)          // ô lõm
  static let chu = hex(0x0a1629)          // navy
  static let chu2 = hex(0x3b352e)
  static let chu3 = hex(0x5f554b)         // chữ phụ
  static let ngoc = chu                   // «chính» = navy
  static let ngocDam = hex(0x050c18)
  static let ngocInk = chu                // chữ nhấn trên nền sáng
  static let ngocSoft = hex(0xe2d6c4)     // ô chọn / chip nhấn: kem sẫm
  static let thanChi = hex(0x1d2f52)
  static let thanChiDam = chu
  static let diemInk = hex(0x6b4a12)      // vàng sẫm
  static let diemSoft = hex(0xf2d48c)     // chip sao = vàng kim nhạt
  static let canh = hex(0xa2412c)         // nợ / cảnh báo: cam sẫm
  static let canhSoft = hex(0xf9e7d2)
  static let loi = hex(0xa2412c)
  static let lamSoft = hex(0xe5dccf)      // viên nền icon (trước: xanh dương) = kem lõm E
  static let timSoft = hex(0xe2d6c4)      // viên nền icon (trước: tím) = kem sẫm E
  static let bong = hex(0x786246)         // bóng tối rgba(120,98,70,.28)
  static let bongSang = hex(0xfffbf5)     // bóng sáng lệch lên-trái
  static let kimSang = hex(0xfbe7b0)
  static let kim = hex(0xf4c76a)
  static let kimDam = hex(0xc9973b)
  static let kimNhat = hex(0xf2d48c)
  static let kimVien = hex(0xd9ae57)      // vòng «đang chọn»
  static let kimInk = hex(0x7a5a1f)
  static let xanh = hex(0x2d6a14)         // thành công
  /// Vàng kim loại 135°: kimSang 0 → kim 38% → kimDam 72% → kimNhat 100%.
  static var vang: LinearGradient {
    LinearGradient(stops: [.init(color: kimSang, location: 0), .init(color: kim, location: 0.38),
                           .init(color: kimDam, location: 0.72), .init(color: kimNhat, location: 1)],
                   startPoint: .topLeading, endPoint: .bottomTrailing)
  }
  static let bongNoi: Double = 0.28
}

// MARK: - Phông (Fraunces tiêu đề + Be Vietnam Pro chữ thường, OFL; thiếu thì về phông hệ thống)

/// Vai của chữ: chu = Be Vietnam Pro, tieuDe = Fraunces SemiBold, so = số đếm/đồng hồ (phông hệ thống tròn — có tnum nên .monospacedDigit() giữ bề ngang cố định).
enum VaiTro { case chu, tieuDe, so }

enum ClayFont {
  private static let moiLanDau: Void = {
    for d in thuMucTaiNguyen("Fonts") {
      var duoc = false
      for ten in ["Fraunces-SemiBold", "BeVietnamPro-Regular", "BeVietnamPro-Bold"] {
        let u = d.appendingPathComponent(ten + ".ttf")
        if FileManager.default.fileExists(atPath: u.path) { CTFontManagerRegisterFontsForURL(u as CFURL, .process, nil); duoc = true }
      }
      if duoc { break }      // dừng ở thư mục đầu có phông
    }
  }()
  /// Đăng ký các tệp .ttf (process scope) đúng một lần; gọi lại vô hại.
  static func dangKy() { _ = moiLanDau }
  static func co(_ size: CGFloat, _ weight: Font.Weight = .regular, _ design: Font.Design = .default, _ vai: VaiTro = .chu) -> Font {
    if design == .monospaced { return .system(size: size, weight: weight, design: .monospaced) }
    switch vai {
    case .so: return .system(size: size, weight: weight, design: .rounded)
    case .tieuDe: return .custom("Fraunces-SemiBold", size: size)
    case .chu:
      let dam: [Font.Weight] = [.semibold, .bold, .heavy, .black]    // ultraLight/thin/light/regular/medium ⇒ Regular
      return .custom(dam.contains(weight) ? "BeVietnamPro-Bold" : "BeVietnamPro-Regular", size: size)
    }
  }
}

extension Font {
  static func clay(size: CGFloat, weight: Font.Weight = .regular, design: Font.Design = .default, vai: VaiTro = .chu) -> Font { ClayFont.co(size, weight, design, vai) }
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

final class MocBundle {}

/// Các thư mục có thể chứa tài nguyên `goc` (Fluent/Mascot/Fonts): gói phát hành `Contents/Resources/<goc>`,
/// bundle SwiftPM cạnh tệp chạy (dev), cạnh .xctest (test). KHÔNG dùng `Bundle.module` (thiếu bundle là fatalError).
func thuMucTaiNguyen(_ goc: String) -> [URL] {
  var thuMuc: [URL] = []
  if let r = Bundle.main.resourceURL { thuMuc.append(r.appendingPathComponent(goc)) }
  let canh = [Bundle.main.resourceURL, Bundle.main.bundleURL, Bundle.main.executableURL?.deletingLastPathComponent(),
              Bundle(for: MocBundle.self).bundleURL.deletingLastPathComponent()].compactMap { $0 }   // dòng cuối: lúc chạy test
  for g in canh {
    let b = g.appendingPathComponent("AiiGrowMac_AiiGrowTray.bundle")
    thuMuc.append(b.appendingPathComponent(goc))
    thuMuc.append(b.appendingPathComponent("Contents/Resources/" + goc))
  }
  return thuMuc
}

@MainActor
enum FluentIcon {
  private static var cache: [String: NSImage?] = [:]     // nhớ cả lần không thấy (màn khoá vẽ lại mỗi giây)

  /// Tìm `<ten>.png`: gói phát hành chép vào `AiiGrow.app/Contents/Resources/Fluent/` (goi/build-pkg.sh);
  /// lúc dev/test lấy từ bundle tài nguyên SwiftPM cạnh tệp chạy. KHÔNG dùng `Bundle.module` (thiếu bundle là fatalError).
  /// `thuMuc`: «Fluent» (icon 3D) hoặc «Mascot» (Grow của app Con) — cùng cách tìm.
  static func anh(_ ten: String, thuMuc goc: String = "Fluent") -> NSImage? {
    let khoa = goc + "/" + ten
    if let c = cache[khoa] { return c }    // c: NSImage? — nil đã nhớ thì không dò đĩa lại
    let thuMuc = thuMucTaiNguyen(goc)
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

/// Viên tròn chứa icon 3D: neumorphism (cùng màu nền, bóng đôi tối/sáng).
struct VienClay: View {
  let ten: String
  var duPhong = "circle.fill"
  var nen: Color = ClayMau.the
  var co: CGFloat = 44
  var body: some View {
    ZStack {
      Circle().fill(nen)
      HinhFluent(ten: ten, duPhong: duPhong, co: co * 0.56)
    }
    .frame(width: co, height: co)
    .shadow(color: ClayMau.bong.opacity(ClayMau.bongNoi), radius: co * 0.12, x: co * 0.07, y: co * 0.07)
    .shadow(color: ClayMau.bongSang.opacity(0.95), radius: co * 0.12, x: -co * 0.07, y: -co * 0.07)
  }
}

// MARK: - Khối đất sét (thẻ)

/// Thẻ neumorphism: mặt cùng màu nền, nổi bằng bóng đôi (tối xuống-phải, sáng lên-trái).
struct ClayThe: ViewModifier {
  var bo: CGFloat = 28
  var nen: Color = ClayMau.the
  func body(content: Content) -> some View {
    let hinh = RoundedRectangle(cornerRadius: bo, style: .continuous)
    content
      .background(
        hinh.fill(nen)
          .shadow(color: ClayMau.bong.opacity(ClayMau.bongNoi), radius: 14, x: 8, y: 8)
          .shadow(color: ClayMau.bongSang.opacity(0.95), radius: 14, x: -8, y: -8)
      )
  }
}

/// Lòng chảo lõm (ô nhập, dải tiến độ): bóng trong tối phía trên-trái + viền sáng dưới-phải.
struct ClayLom: ViewModifier {
  var bo: CGFloat = 16
  func body(content: Content) -> some View {
    let hinh = RoundedRectangle(cornerRadius: bo, style: .continuous)
    content
      .background(
        ZStack {
          hinh.fill(ClayMau.lom)
          hinh.strokeBorder(LinearGradient(colors: [ClayMau.bong.opacity(0.40), .clear], startPoint: .topLeading, endPoint: UnitPoint(x: 0.6, y: 0.6)), lineWidth: 4)
            .blur(radius: 2).clipShape(hinh)
          hinh.strokeBorder(LinearGradient(colors: [.clear, ClayMau.bongSang], startPoint: UnitPoint(x: 0.4, y: 0.4), endPoint: .bottomTrailing), lineWidth: 2)
        }
      )
  }
}

extension View {
  func clayThe(bo: CGFloat = 28, nen: Color = ClayMau.the) -> some View { modifier(ClayThe(bo: bo, nen: nen)) }
  func clayLom(bo: CGFloat = 16) -> some View { modifier(ClayLom(bo: bo)) }
  /// Tải trang: các khối vào lần lượt (stagger 55ms, translateY 26→0 + scale .92→1, spring NẢY VÀO). Reduce Motion ⇒ chỉ fade.
  func vaoLanLuot(_ i: Int) -> some View { modifier(VaoLanLuot(thuTu: i)) }
  /// Cửa sổ clay: nền kem phẳng, ép giao diện sáng (ô nhập, Picker vẽ đúng trên nền sáng).
  func nenClay() -> some View {
    background(
      ClayMau.nen.ignoresSafeArea()
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

  private var mauChu: Color {
    switch kieu {
    case .ngoc: return ClayMau.chu                // vàng kim ⇒ chữ navy
    case .thanChi: return ClayMau.nenSang         // khối navy ⇒ chữ kem sáng
    case .sang: return ClayMau.chu
    }
  }

  var body: some View {
    let hinh = RoundedRectangle(cornerRadius: bo, style: .continuous)
    nhanView()
      .font(.clay(size: 15, weight: .bold))
      .lineLimit(2).multilineTextAlignment(.center).truncationMode(.tail)   // chữ dài: tối đa 2 dòng rồi «…»
      .frame(maxWidth: .infinity, minHeight: cao)
      .padding(.horizontal, 14)
      .foregroundColor(mauChu.opacity(bat || kieu != .ngoc ? 1 : 0.6))
      .background(nen(hinh))
      .overlay(vetMen(hinh))
      .contentShape(hinh)
      .scaleEffect(x: nhan && !giamDong ? 0.95 : 1, y: nhan && !giamDong ? 0.90 : 1)
      .brightness(nhan && giamDong ? -0.06 : 0)
      .animation(nhan ? ClayMotion.nhan : (giamDong ? ClayMotion.fade : ClayMotion.tha), value: nhan)
      .opacity(bat || kieu == .ngoc ? 1 : 0.5)
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
    case .ngoc:
      // vàng kim loại 135°; tắt = vàng nhạt rõ ràng (không chỉ mờ đi)
      ZStack {
        if bat { hinh.fill(ClayMau.vang) } else { hinh.fill(ClayMau.kimNhat.opacity(0.45)) }
        hinh.strokeBorder(ClayMau.kimDam.opacity(bat ? 0.55 : 0.25), lineWidth: 1)
      }
      .compositingGroup()
      .shadow(color: ClayMau.bong.opacity(bat ? 0.40 : 0.15), radius: 8, x: 4, y: 5)
      .shadow(color: ClayMau.bongSang.opacity(0.9), radius: 6, x: -3, y: -3)
    case .thanChi:
      // khối navy viền vàng mảnh + quầng vàng nhẹ
      ZStack {
        hinh.fill(LinearGradient(colors: [ClayMau.thanChi, ClayMau.chu], startPoint: .topLeading, endPoint: .bottomTrailing))
        hinh.strokeBorder(ClayMau.kimVien.opacity(0.85), lineWidth: 1)
      }
      .compositingGroup()
      .shadow(color: ClayMau.kim.opacity(0.28), radius: 8, x: 0, y: 2)
      .shadow(color: ClayMau.bong.opacity(0.45), radius: 6, x: 3, y: 4)
    case .sang:
      // nút phụ = kem lõm
      ZStack {
        hinh.fill(ClayMau.lom)
        hinh.strokeBorder(LinearGradient(colors: [ClayMau.bong.opacity(0.40), .clear], startPoint: .topLeading, endPoint: UnitPoint(x: 0.6, y: 0.6)), lineWidth: 3)
          .blur(radius: 1.5).clipShape(hinh)
        hinh.strokeBorder(LinearGradient(colors: [.clear, ClayMau.bongSang], startPoint: UnitPoint(x: 0.4, y: 0.4), endPoint: .bottomTrailing), lineWidth: 1.5)
      }
    }
  }

  private func vetMen(_ hinh: RoundedRectangle) -> some View {
    GeometryReader { g in
      LinearGradient(stops: [
        .init(color: .white.opacity(0), location: 0.34), .init(color: .white.opacity(0.10), location: 0.42),
        .init(color: .white.opacity(kieu == .ngoc ? 0.55 : 0.35), location: 0.49), .init(color: .white.opacity(0.16), location: 0.54),
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
