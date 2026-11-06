// Ngôn ngữ «Dịu» (thiết kế chốt 06/11, L16 — docs/thiet-ke-chot/con-dt-*, kit `condt-tre/kit-diu.css`): nền kem phẳng, MỘT màu nhấn xanh
// lá (nút chính, tab chọn, vòng giờ), vàng CHỈ cho sao; thẻ trắng viền mảnh bóng xám mềm, ≤ 1 thẻ màu nhạt mỗi màn; nút 52pt màu đặc;
// chữ tròn (Nunito không có trong repo ⇒ font hệ thống kiểu .rounded); Rob chỉ ở màn có cảm xúc (chào, chờ, lỗi, đã ghép).
// Icon 3D: Fluent Emoji (MIT — TaiNguyen/FLUENT-EMOJI-LICENSE.txt) + Rob của AiiLab, chép từ mobile/assets ⇒ TaiNguyen/Diu.xcassets.
import SwiftUI

extension Color {
  init(hex: UInt32, a: Double = 1) {
    self.init(.sRGB, red: Double(hex >> 16 & 0xff) / 255, green: Double(hex >> 8 & 0xff) / 255, blue: Double(hex & 0xff) / 255, opacity: a)
  }
}

enum Diu {
  static let xanh = Color(hex: 0x2f9e5f)
  static let xanhNhat = Color(hex: 0xe8f5ed)
  static let xanhVien = Color(hex: 0xd3eadb)
  static let xanhDam = Color(hex: 0x1f6e42)
  static let chu = Color(hex: 0x1f2a37)
  static let chu2 = Color(hex: 0x5f6b7a)
  static let chu3 = Color(hex: 0x9aa3ae)
  static let nen = Color(hex: 0xfbf8f2)
  static let vien = Color(hex: 0xece7dc)
  static let nenIcon = Color(hex: 0xf6f3ec)
  static let ranh = Color(hex: 0xe9e5dc)
  static let saoChu = Color(hex: 0x8a5a00)
  static let saoNen = Color(hex: 0xfff5d9)
  static let saoVien = Color(hex: 0xf3dd9c)
  static let do_ = Color(hex: 0xe5484d)
  static let doChu = Color(hex: 0xb42318)
  static let cam = Color(hex: 0xf5a957)
  static let bong = Color(hex: 0x1e1e14)

  static func chu(_ co: CGFloat, _ w: Font.Weight = .bold) -> Font { .system(size: co, weight: w, design: .rounded) }
  static let tieuDe = chu(26, .black)
  static let phu = chu(15, .semibold)
  static let t1 = chu(17, .heavy)
  static let t2 = chu(14, .semibold)
  static let nut = chu(17, .heavy)
}

/// Thẻ trắng viền mảnh, bo 24, bóng xám mềm. `chinh` = thẻ xanh nhạt (≤ 1 mỗi màn).
struct TheDiu: ViewModifier {
  var chinh = false
  var dem: CGFloat = 16
  func body(content: Content) -> some View {
    content.padding(dem).frame(maxWidth: .infinity, alignment: .leading)
      .background(RoundedRectangle(cornerRadius: 24, style: .continuous).fill(chinh ? Diu.xanhNhat : .white))
      .overlay(RoundedRectangle(cornerRadius: 24, style: .continuous).stroke(chinh ? Diu.xanhVien : Diu.vien, lineWidth: 1))
      .shadow(color: Diu.bong.opacity(0.06), radius: 4, y: 2)
  }
}
extension View {
  func theDiu(chinh: Bool = false, dem: CGFloat = 16) -> some View { modifier(TheDiu(chinh: chinh, dem: dem)) }
}

/// Nút 52pt bo tròn. `.chinh` xanh đặc chữ trắng; `.phu` trắng viền; `.lk` chữ xám không nền (liên kết).
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
          .foregroundColor(kieu == .chinh ? .white : Diu.chu)
          .padding(.horizontal, 22).frame(maxWidth: .infinity, minHeight: 52)
          .background(Capsule().fill(kieu == .chinh ? Diu.xanh : .white))
          .overlay(Capsule().stroke(kieu == .chinh ? .clear : Diu.vien, lineWidth: 1))
          .shadow(color: kieu == .chinh ? Diu.xanh.opacity(0.28) : Diu.bong.opacity(0.08), radius: kieu == .chinh ? 4 : 3, y: kieu == .chinh ? 3 : 2)
      }
    }
    .opacity(bat ? (nhan ? 0.85 : 1) : 0.45)
    .scaleEffect(nhan ? 0.98 : 1)
    .animation(.easeOut(duration: 0.12), value: nhan)
  }
}

/// Ảnh 3D (icon / Rob) trong Diu.xcassets.
struct Anh: View {
  let ten: String
  var co: CGFloat = 30
  var body: some View { Image(ten).resizable().scaledToFit().frame(width: co, height: co).accessibilityHidden(true) }
}

/// Ô icon 44 bo 14 nền kem đậm.
struct OIcon: View {
  let ten: String
  var co: CGFloat = 44
  var nen: Color = Diu.nenIcon
  var body: some View {
    Anh(ten: ten, co: co * 0.68).frame(width: co, height: co)
      .background(RoundedRectangle(cornerRadius: co * 0.32, style: .continuous).fill(nen))
  }
}

/// Chip sao vàng «⭐ 30 sao».
struct ChipSao: View {
  let so: Int
  var chu = "sao"
  var body: some View {
    HStack(spacing: 6) { Anh(ten: "ic_sao", co: 22); Text("\(so) \(chu)").font(Diu.chu(15, .black)) }
      .foregroundColor(Diu.saoChu).padding(.horizontal, 12).frame(height: 32)
      .background(Capsule().fill(Diu.saoNen)).overlay(Capsule().stroke(Diu.saoVien, lineWidth: 1))
  }
}

/// Avatar tròn chữ cái đầu.
struct AvatarBe: View {
  let ten: String
  var co: CGFloat = 30
  var mau: Color = Diu.cam
  var body: some View {
    Text(String(ten.trimmingCharacters(in: .whitespaces).prefix(1)).uppercased())
      .font(Diu.chu(co * 0.46, .black)).foregroundColor(.white)
      .frame(width: co, height: co).background(Circle().fill(mau))
  }
}

/// «B Bảo Anh ▾» — chạm mở Đổi bé / Đăng xuất.
struct ChipBe: View {
  let ten: String
  let lam: () -> Void
  var body: some View {
    Button(action: lam) {
      HStack(spacing: 7) {
        AvatarBe(ten: ten, co: 30).overlay(Circle().stroke(.white, lineWidth: 2))
        Text(ten).font(Diu.chu(15, .black)).foregroundColor(Diu.chu).lineLimit(1)
        Image(systemName: "chevron.down").font(.system(size: 11, weight: .heavy)).foregroundColor(Diu.chu2)
      }
      .padding(.leading, 4).padding(.trailing, 12).frame(height: 38)
      .background(Capsule().fill(.white)).overlay(Capsule().stroke(Diu.vien, lineWidth: 1))
      .shadow(color: Diu.bong.opacity(0.08), radius: 2, y: 1)
    }
    .buttonStyle(.plain)
    .accessibilityLabel("\(ten), đổi bé hoặc đăng xuất")
  }
}

/// Vòng giờ còn lại (xanh trên rãnh kem).
struct VongGio: View {
  let con: Int
  let tong: Int
  var co: CGFloat = 168
  var nhan = "phút"
  var body: some View {
    let tl = tong > 0 ? min(1, Double(con) / Double(tong)) : 0
    ZStack {
      Circle().fill(Diu.ranh)
      Circle().trim(from: 0, to: tl).stroke(Diu.xanh, style: StrokeStyle(lineWidth: 12)).rotationEffect(.degrees(-90)).padding(6)
      Circle().fill(.white).padding(12)
      VStack(spacing: 0) {
        Text("\(con)").font(Diu.chu(co * 0.26, .black)).monospacedDigit().foregroundColor(Diu.chu)
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
                  .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(k == "⌫" ? Color.clear : .white))
                  .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).stroke(k == "⌫" ? Color.clear : Diu.vien, lineWidth: 1))
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
        } else {
          Text(c).font(Diu.chu(28, .black)).foregroundColor(loi ? Diu.doChu : Diu.chu)
            .frame(width: 44, height: 56)
            .background(RoundedRectangle(cornerRadius: 14, style: .continuous).fill(.white))
            .overlay(RoundedRectangle(cornerRadius: 14, style: .continuous)
              .stroke(loi ? Diu.do_ : (i == so.count ? Diu.xanh : Diu.vien), lineWidth: i == so.count || loi ? 2 : 1))
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
            .frame(width: 46, height: 46).background(Circle().fill(.white)).overlay(Circle().stroke(Diu.vien, lineWidth: 1))
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

/// Bước số tròn xanh (hướng dẫn 1-2-3).
struct BuocSo: View {
  let i: Int
  let t1: String
  var t2: String?
  var body: some View {
    HStack(alignment: .top, spacing: 12) {
      Text("\(i)").font(Diu.chu(15, .black)).foregroundColor(.white).frame(width: 30, height: 30).background(Circle().fill(Diu.xanh))
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
  var nen: Color = .white
  var body: some View {
    HStack(spacing: 5) {
      if let icon { Anh(ten: icon, co: 18) }
      Text(chu).font(Diu.chu(13, .heavy))
    }
    .foregroundColor(mau).padding(.horizontal, 10).frame(height: 28)
    .background(Capsule().fill(nen)).overlay(Capsule().stroke(Diu.vien, lineWidth: 1))
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
