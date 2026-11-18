// Ngôn ngữ «Dịu» (thiết kế chốt 06/11, L16 — docs/thiet-ke-chot/con-dt-*) đã áp phong cách E «Ánh kim» (18/11, #383 — ngang agent-android
// Diu.kt, agent-mac Clay.swift): nền kem neumorphism #ECE4D9, thẻ CÙNG màu nền nổi bằng bóng đôi (tối rgba(120,98,70,.28) lệch xuống-phải,
// sáng #FFFBF5 lệch lên-trái), ô nhập / ô chọn chưa chọn LÕM, nút chính + mục đang chọn vàng kim gradient 135° chữ navy #0A1629; chữ
// Fraunces SemiBold (tiêu đề, số lớn) + Be Vietnam Pro (OFL — TaiNguyen/Fonts, khai UIAppFonts trong project.yml). Tên token giữ như bản Dịu
// (xanh = màu «chính», nay là navy). Tương phản (chữ thường ≥ 4,5:1): chu/nen 14,4 · chu2/nen 9,6 · chu3/nen 5,8 · chu3/lom 5,4 ·
// chu/kimDam 6,9 · kim/navy 11,4 · nenSang/navy 15,3 · noChu/noNen 5,9 · doChu/nen 5,2.
// Icon 3D: Fluent Emoji (MIT — TaiNguyen/FLUENT-EMOJI-LICENSE.txt) + Grow của AiiLab, chép từ mobile/assets ⇒ TaiNguyen/Diu.xcassets.
import SwiftUI

extension Color {
  init(hex: UInt32, a: Double = 1) {
    self.init(.sRGB, red: Double(hex >> 16 & 0xff) / 255, green: Double(hex >> 8 & 0xff) / 255, blue: Double(hex & 0xff) / 255, opacity: a)
  }
}

enum Diu {
  static let xanh = Color(hex: 0x0a1629)        // «chính» = navy (chấm PIN, bước số, nút ghi âm…)
  static let xanhNhat = Color(hex: 0xe2d6c4)    // thẻ nhấn / nhãn trạng thái: kem sẫm
  static let xanhVien = Color(hex: 0xd9cdbc)
  static let xanhDam = Color(hex: 0x0a1629)     // chữ nhấn / liên kết = navy
  static let ok = Color(hex: 0x2d6a14)          // thành công 5,2:1 trên nền
  static let chu = Color(hex: 0x0a1629)
  static let chu2 = Color(hex: 0x3b352e)
  static let chu3 = Color(hex: 0x5f554b)
  static let nen = Color(hex: 0xece4d9)
  static let nenSang = Color(hex: 0xf2ebe3)     // chữ trên navy
  static let the = Color(hex: 0xece4d9)         // mặt thẻ = nền, nổi bằng bóng đôi
  static let lom = Color(hex: 0xe5dccf)         // ô lõm
  static let vien = Color(hex: 0xd9cdbc)        // đường kẻ mảnh
  static let nenIcon = Color(hex: 0xece4d9)     // viên icon = kem nổi
  static let ranh = Color(hex: 0xe2d6c4)        // rãnh vòng giờ / chấm PIN chưa gõ
  static let saoChu = Color(hex: 0x0a1629)      // chữ navy trên vàng ≥ 6,9:1
  static let saoNen = Color(hex: 0xf2d48c)
  static let saoVien = Color(hex: 0xd9ae57)
  // 15/11: số sao ÂM (đang nợ Ba Mẹ) — viên cảnh báo
  static let noNen = Color(hex: 0xf9e7d2)
  static let noChu = Color(hex: 0x983e04)
  static let do_ = Color(hex: 0xa2412c)
  static let doChu = Color(hex: 0xa2412c)
  static let cam = Color(hex: 0xf5a957)
  static let bong = Color(hex: 0x786246)        // bóng tối rgba(120,98,70,.28)
  static let bongSang = Color(hex: 0xfffbf5)    // bóng sáng lệch lên-trái
  // vàng kim loại: linear-gradient(135deg, kimSang 0, kim 38%, kimDam 72%, kimNhat 100%)
  static let kimSang = Color(hex: 0xfbe7b0)
  static let kim = Color(hex: 0xf4c76a)
  static let kimDam = Color(hex: 0xc9973b)
  static let kimNhat = Color(hex: 0xf2d48c)
  static let kimVien = Color(hex: 0xd9ae57)     // vòng «đang chọn»
  static var vang: LinearGradient {
    LinearGradient(stops: [.init(color: kimSang, location: 0), .init(color: kim, location: 0.38),
                           .init(color: kimDam, location: 0.72), .init(color: kimNhat, location: 1)],
                   startPoint: .topLeading, endPoint: .bottomTrailing)
  }

  /// Be Vietnam Pro theo độ đậm (semibold → SemiBold, bold/heavy → Bold, black → ExtraBold). Thiếu tệp phông thì iOS tự về phông hệ thống.
  static func chu(_ co: CGFloat, _ w: Font.Weight = .bold) -> Font {
    let ten: String
    switch w {
    case .black: ten = "BeVietnamPro-ExtraBold"
    case .heavy, .bold: ten = "BeVietnamPro-Bold"
    case .semibold: ten = "BeVietnamPro-SemiBold"
    default: ten = "BeVietnamPro-Regular"
    }
    return .custom(ten, fixedSize: co)   // cỡ cố định như .system(size:) cũ — không đổi bố cục
  }
  /// Fraunces SemiBold — tiêu đề, số lớn.
  static func fraunces(_ co: CGFloat) -> Font { .custom("Fraunces-SemiBold", fixedSize: co) }
  static let tieuDe = fraunces(26)
  static let phu = chu(15, .semibold)
  static let t1 = chu(17, .heavy)
  static let t2 = chu(14, .semibold)
  static let nut = chu(17, .heavy)
}

/// Kem nổi: mặt cùng màu nền + bóng đôi (tối xuống-phải, sáng lên-trái).
struct NoiE<S: Shape>: ViewModifier {
  let hinh: S
  var nen: Color = Diu.the
  var lech: CGFloat = 6
  func body(content: Content) -> some View {
    content.background(
      hinh.fill(nen)
        .shadow(color: Diu.bong.opacity(0.28), radius: lech * 1.6, x: lech, y: lech)
        .shadow(color: Diu.bongSang.opacity(0.95), radius: lech * 1.6, x: -lech, y: -lech)
    )
  }
}

/// Lòng chảo lõm: bóng trong tối trên-trái + viền sáng dưới-phải.
struct LomE<S: InsettableShape>: ViewModifier {
  let hinh: S
  var nen: Color = Diu.lom
  func body(content: Content) -> some View {
    content.background(
      ZStack {
        hinh.fill(nen)
        hinh.strokeBorder(LinearGradient(colors: [Diu.bong.opacity(0.40), .clear], startPoint: .topLeading, endPoint: UnitPoint(x: 0.6, y: 0.6)), lineWidth: 3)
          .blur(radius: 1.5).clipShape(hinh)
        hinh.strokeBorder(LinearGradient(colors: [.clear, Diu.bongSang], startPoint: UnitPoint(x: 0.4, y: 0.4), endPoint: .bottomTrailing), lineWidth: 1.5)
      }
    )
  }
}

/// Vàng kim nổi (nút chính, mục đang chọn): gradient 135° + viền vàng sẫm mảnh + bóng đôi.
struct KimE<S: InsettableShape>: ViewModifier {
  let hinh: S
  func body(content: Content) -> some View {
    content.background(
      ZStack { hinh.fill(Diu.vang); hinh.strokeBorder(Diu.kimDam.opacity(0.55), lineWidth: 1) }
        .compositingGroup()
        .shadow(color: Diu.bong.opacity(0.40), radius: 7, x: 4, y: 5)
        .shadow(color: Diu.bongSang.opacity(0.9), radius: 6, x: -3, y: -3)
    )
  }
}

extension View {
  func noiE<S: Shape>(_ hinh: S, nen: Color = Diu.the, lech: CGFloat = 6) -> some View { modifier(NoiE(hinh: hinh, nen: nen, lech: lech)) }
  func lomE<S: InsettableShape>(_ hinh: S, nen: Color = Diu.lom) -> some View { modifier(LomE(hinh: hinh, nen: nen)) }
  func kimE<S: InsettableShape>(_ hinh: S) -> some View { modifier(KimE(hinh: hinh)) }
  /// Ô chọn trong nhóm: đang chọn ⇒ vàng kim nổi; chưa ⇒ kem lõm.
  @ViewBuilder func oChonE<S: InsettableShape>(_ hinh: S, _ dang: Bool) -> some View {
    if dang { kimE(hinh) } else { lomE(hinh) }
  }
}

/// Thẻ kem nổi bóng đôi, bo 24. `chinh` = thẻ nhấn lõm kem sẫm (≤ 1 mỗi màn).
struct TheDiu: ViewModifier {
  var chinh = false
  var dem: CGFloat = 16
  func body(content: Content) -> some View {
    let hinh = RoundedRectangle(cornerRadius: 24, style: .continuous)
    let noi = content.padding(dem).frame(maxWidth: .infinity, alignment: .leading)
    if chinh { noi.lomE(hinh, nen: Diu.xanhNhat) } else { noi.noiE(hinh) }
  }
}
extension View {
  func theDiu(chinh: Bool = false, dem: CGFloat = 16) -> some View { modifier(TheDiu(chinh: chinh, dem: dem)) }
}

/// Nút 52pt bo tròn. `.chinh` vàng kim nổi chữ navy; `.phu` kem lõm chữ navy; `.lk` chữ không nền (liên kết).
struct NutDiu: ButtonStyle {
  enum Kieu { case chinh, phu, lk }
  var kieu: Kieu = .chinh
  @Environment(\.isEnabled) var bat
  func makeBody(configuration c: Configuration) -> some View {
    let nhan = c.isPressed
    return Group {
      switch kieu {
      case .lk:
        c.label.font(Diu.chu(15, .heavy)).foregroundColor(Diu.chu2).frame(maxWidth: .infinity, minHeight: 44)
      default:
        c.label.font(Diu.nut).lineLimit(1).minimumScaleFactor(0.7)
          .foregroundColor(Diu.chu).tint(Diu.chu)
          .padding(.horizontal, 22).frame(maxWidth: .infinity, minHeight: 52)
          .oChonE(Capsule(), kieu == .chinh)
      }
    }
    .opacity(bat ? (nhan ? 0.85 : 1) : 0.45)
    .scaleEffect(nhan ? 0.98 : 1)
    .animation(.easeOut(duration: 0.12), value: nhan)
  }
}

/// Ảnh 3D (icon / Grow) trong Diu.xcassets.
struct Anh: View {
  let ten: String
  var co: CGFloat = 30
  var body: some View { Image(ten).resizable().scaledToFit().frame(width: co, height: co).accessibilityHidden(true) }
}

/// Ô icon 44 bo 14: viên kem nổi bóng đôi (E).
struct OIcon: View {
  let ten: String
  var co: CGFloat = 44
  var nen: Color = Diu.nenIcon
  var body: some View {
    Anh(ten: ten, co: co * 0.68).frame(width: co, height: co)
      .noiE(RoundedRectangle(cornerRadius: co * 0.32, style: .continuous), nen: nen, lech: max(2, co * 0.06))
  }
}

/// Chip sao vàng «⭐ 30 sao»; số âm (đang nợ) ⇒ viên cảnh báo «⭐ −20 sao».
struct ChipSao: View {
  let so: Int
  var chu = "sao"
  var body: some View {
    let am = so < 0
    HStack(spacing: 6) { Anh(ten: "ic_sao", co: 22); Text(Diu.soSao(so, chu)).font(Diu.chu(15, .black)) }
      .foregroundColor(am ? Diu.noChu : Diu.saoChu).padding(.horizontal, 12).frame(height: 32)
      .background(Capsule().fill(am ? AnyShapeStyle(Diu.noNen) : AnyShapeStyle(Diu.vang)))
      .overlay(Capsule().strokeBorder(am ? Diu.noNen : Diu.kimDam.opacity(0.55), lineWidth: 1))
  }
}

/// «Đang nợ Ba Mẹ 20 sao · sao nhiệm vụ trả nợ trước» (viên cảnh báo).
struct DongNo: View {
  let no: Int
  var body: some View {
    Text("Đang nợ Ba Mẹ \(no) sao · sao nhiệm vụ trả nợ trước").font(Diu.t2).foregroundColor(Diu.noChu)
      .multilineTextAlignment(.center).padding(.horizontal, 12).padding(.vertical, 6)
      .background(Capsule().fill(Diu.noNen))
  }
}

extension Diu {
  /// «30 sao» · «−20 sao» (dấu trừ thật U+2212).
  static func soSao(_ so: Int, _ chu: String = "sao") -> String {
    let n = so < 0 ? "\u{2212}\(-so)" : "\(so)"
    return chu.isEmpty ? n : "\(n) \(chu)"
  }
}

/// Avatar tròn chữ cái đầu (Fraunces). Mặc định navy chữ vàng kim vòng vàng (E); màu riêng của bé ⇒ chữ navy.
struct AvatarBe: View {
  let ten: String
  var co: CGFloat = 30
  var mau: Color = Diu.xanh
  var body: some View {
    let navy = mau == Diu.xanh
    Text(String(ten.trimmingCharacters(in: .whitespaces).prefix(1)).uppercased())
      .font(Diu.fraunces(co * 0.48)).foregroundColor(navy ? Diu.kim : Diu.chu)
      .frame(width: co, height: co).background(Circle().fill(mau))
      .overlay(Circle().strokeBorder(navy ? Diu.kimVien : Diu.nen, lineWidth: co >= 60 ? 3 : 1.5))
  }
}

/// «B Bảo Anh ▾» — chạm mở Đổi người / Đăng xuất.
struct ChipBe: View {
  let ten: String
  let lam: () -> Void
  var body: some View {
    Button(action: lam) {
      HStack(spacing: 7) {
        AvatarBe(ten: ten, co: 30)
        Text(ten).font(Diu.chu(15, .black)).foregroundColor(Diu.chu).lineLimit(1)
        Image(systemName: "chevron.down").font(.system(size: 11, weight: .heavy)).foregroundColor(Diu.chu2)
      }
      .padding(.leading, 4).padding(.trailing, 12).frame(height: 38)
      .noiE(Capsule(), lech: 3)
    }
    .buttonStyle(.plain)
    .accessibilityLabel("\(ten), đổi bé hoặc đăng xuất")
  }
}

/// Vòng giờ còn lại (vàng kim trên rãnh kem lõm, lòng kem nổi, số Fraunces).
struct VongGio: View {
  let con: Int
  let tong: Int
  var co: CGFloat = 168
  var nhan = "phút"
  var body: some View {
    let tl = tong > 0 ? min(1, Double(con) / Double(tong)) : 0
    ZStack {
      Color.clear.lomE(Circle(), nen: Diu.ranh)
      Circle().trim(from: 0, to: tl).stroke(Diu.vang, style: StrokeStyle(lineWidth: 12, lineCap: .round)).rotationEffect(.degrees(-90)).padding(6)
      Color.clear.noiE(Circle(), lech: 3).padding(13)
      VStack(spacing: 0) {
        Text("\(con)").font(Diu.fraunces(co * 0.26)).monospacedDigit().foregroundColor(Diu.chu)
        Text(nhan).font(Diu.chu(14, .heavy)).foregroundColor(Diu.chu2)
      }
    }
    .frame(width: co, height: co)
    .accessibilityElement(children: .combine)
    .accessibilityLabel("Còn \(con) phút chơi")
  }
}

/// Bàn phím số lớn (mã ghép, PIN, mã Ba Mẹ). ⌫ xoá một số.
struct BanPhimSo: View {
  @Binding var so: String
  var toiDa: Int
  var tat = false
  var body: some View {
    let hang = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], ["", "0", "⌫"]]
    VStack(spacing: 10) {
      ForEach(hang, id: \.self) { h in
        HStack(spacing: 10) {
          ForEach(h, id: \.self) { k in
            if k.isEmpty { Color.clear.frame(maxWidth: .infinity, minHeight: 56) }
            else {
              Button {
                if k == "⌫" { if !so.isEmpty { so.removeLast() } } else if so.count < toiDa { so.append(k) }
              } label: {
                Group { if k == "⌫" { Image(systemName: "delete.left.fill").font(.system(size: 22, weight: .bold)) } else { Text(k).font(Diu.chu(26, .heavy)) } }
                  .foregroundColor(Diu.chu).frame(maxWidth: .infinity, minHeight: 56)
                  .noiE(RoundedRectangle(cornerRadius: 18, style: .continuous), nen: k == "⌫" ? .clear : Diu.the, lech: k == "⌫" ? 0 : 4)
              }
              .buttonStyle(.plain).disabled(tat)
              .accessibilityLabel(k == "⌫" ? "Xoá" : k)
            }
          }
        }
      }
    }
  }
}

/// Ô số (6 ô mã / 4 chấm PIN).
struct OSo: View {
  let so: String
  let dai: Int
  var an = false
  var loi = false
  var body: some View {
    HStack(spacing: an ? 18 : 8) {
      ForEach(0..<dai, id: \.self) { i in
        let c = i < so.count ? String(Array(so)[i]) : ""
        if an {
          Circle().fill(c.isEmpty ? Diu.ranh : (loi ? Diu.do_ : Diu.xanh)).frame(width: 18, height: 18)
            .overlay(Circle().strokeBorder(c.isEmpty ? Diu.bong.opacity(0.25) : .clear, lineWidth: 1))
        } else {
          Text(c).font(Diu.fraunces(28)).foregroundColor(loi ? Diu.doChu : Diu.chu)
            .frame(width: 44, height: 56)
            .lomE(RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous)
              .stroke(loi ? Diu.do_ : (i == so.count ? Diu.kimVien : .clear), lineWidth: 2))
        }
      }
    }
    .accessibilityElement().accessibilityLabel(an ? "Đã nhập \(so.count) trên \(dai) số" : "Mã: \(so)")
  }
}

/// Đầu màn: tiêu đề + nút lùi (tuỳ chọn).
struct DauMan: View {
  let tieuDe: String
  var lui: (() -> Void)?
  var body: some View {
    HStack(spacing: 10) {
      if let lui {
        Button(action: lui) {
          Image(systemName: "chevron.left").font(.system(size: 18, weight: .heavy)).foregroundColor(Diu.chu)
            .frame(width: 46, height: 46).noiE(Circle(), lech: 3)
        }
        .buttonStyle(.plain).accessibilityLabel("Quay lại")
      }
      Text(tieuDe).font(Diu.tieuDe).foregroundColor(Diu.chu).lineLimit(1).minimumScaleFactor(0.7)
      Spacer(minLength: 0)
    }
    .frame(minHeight: 52)
  }
}

/// Hàng có icon + 2 dòng chữ (danh sách trong thẻ).
struct HangDs: View {
  let icon: String
  let t1: String
  var t2: String?
  var phai: AnyView?
  var body: some View {
    HStack(spacing: 12) {
      OIcon(ten: icon)
      VStack(alignment: .leading, spacing: 1) {
        Text(t1).font(Diu.t1).foregroundColor(Diu.chu).lineLimit(2)
        if let t2 { Text(t2).font(Diu.t2).foregroundColor(Diu.chu2).lineLimit(2) }
      }
      Spacer(minLength: 0)
      if let phai { phai }
    }
    .frame(minHeight: 58)
  }
}

/// Bước số tròn navy số vàng kim (hướng dẫn 1-2-3).
struct BuocSo: View {
  let i: Int
  let t1: String
  var t2: String?
  var body: some View {
    HStack(alignment: .top, spacing: 12) {
      Text("\(i)").font(Diu.fraunces(16)).foregroundColor(Diu.kim).frame(width: 30, height: 30).background(Circle().fill(Diu.xanh))
        .overlay(Circle().strokeBorder(Diu.kimVien.opacity(0.85), lineWidth: 1))
      VStack(alignment: .leading, spacing: 1) {
        Text(t1).font(Diu.t1).foregroundColor(Diu.chu)
        if let t2 { Text(t2).font(Diu.t2).foregroundColor(Diu.chu2) }
      }
      Spacer(minLength: 0)
    }
  }
}

/// Dòng chân «AiiGrow · Bảo Anh · Ba Mẹ quản lý» — máy được quản lý luôn nói rõ.
struct DongQuanLy: View {
  var ten: String?
  var body: some View {
    Text(["AiiGrow", ten, "Ba Mẹ quản lý"].compactMap { $0 }.joined(separator: " · "))
      .font(Diu.chu(13, .semibold)).foregroundColor(Diu.chu3).frame(maxWidth: .infinity).multilineTextAlignment(.center)
  }
}

/// Nhãn nhỏ có viền (trạng thái «⏳ Chờ duyệt», «Mất mạng»…).
struct NhanNho: View {
  let chu: String
  var icon: String?
  var mau: Color = Diu.chu2
  var nen: Color = Diu.lom
  var body: some View {
    HStack(spacing: 5) {
      if let icon { Anh(ten: icon, co: 18) }
      Text(chu).font(Diu.chu(13, .heavy))
    }
    .foregroundColor(mau).padding(.horizontal, 10).frame(height: 28)
    .lomE(Capsule(), nen: nen)
  }
}

/// Khung cuộn của một màn: nền kem, lề 16, cuộn được khi chữ lớn.
struct KhungMan<N: View>: View {
  @ViewBuilder var noi: () -> N
  var body: some View {
    ScrollView { VStack(spacing: 12) { noi() }.padding(.horizontal, 16).padding(.top, 4).padding(.bottom, 16) }
      .background(Diu.nen.ignoresSafeArea())
  }
}

extension Date {
  var gioPhut: String { let f = DateFormatter(); f.dateFormat = "H:mm"; return f.string(from: self) }
}
