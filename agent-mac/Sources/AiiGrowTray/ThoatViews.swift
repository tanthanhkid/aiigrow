// 14/11 (docs/thiet-ke-chot/DOI-1411.md) — hai màn mới phía Con trên Mac, ngang agent-win:
//   • «Cần mã của Ba Mẹ» (con-cai-mac 60 them-xe0zv9p7, 440×430): menu «Thoát AiiGrow…» — báo Ba Mẹ + ô mã 6 số của Ba Mẹ.
//   • «Giỏi lắm! N ngày liền» (con-ngay-thuong 25 them-jonn19rd, bản Windows 428×400): chuỗi ngày + 7 ô + cấp, sau khi Ba Mẹ duyệt.
// Logic chữ / luật: ThoatMac (ManMacLogic.swift), ChuoiView (AiiGrowCore/HocVien.swift).
import AppKit
import SwiftUI
import AiiGrowCore

@MainActor
final class ThoatModel: ObservableObject {
  @Published var ma = ""
  @Published var cau: String?
  @Published var dangGui = false
  /// nil = đang báo Ba Mẹ.
  @Published var baoOk: Bool?
  @Published var baoStatus: String?
  /// Ba Mẹ gõ đúng mã ⇒ tray đóng cửa sổ, hỏi lại trạng thái (bảng «Ba Mẹ đang dùng máy»).
  var daMo: () -> Void = {}
  let goi: (YeuCauTray) async -> TraLoi
  init(goi: @escaping (YeuCauTray) async -> TraLoi = AppConModel.goiThat) { self.goi = goi }

  func bao() async {
    let kq = ThoatMac.docBao(await goi(.baoThoat))
    baoOk = kq.ok; baoStatus = kq.status
  }

  func bam(_ c: Character) {
    guard !dangGui else { return }
    if c == "\u{8}" { if !ma.isEmpty { ma.removeLast() }; return }
    guard ma.count < 6, c.isASCII, c.isNumber else { return }
    ma.append(c); cau = nil
    if ma.count == 6 { Task { await gui() } }
  }

  func gui() async {
    guard TrayLogic.maHopLe(ma), !dangGui else { return }
    dangGui = true; defer { dangGui = false }
    switch await goi(.baMeMo(ma: ma)) {
    case .thongBao: cau = nil; ma = ""; daMo()
    case let .pin(_, _, _, chu), let .loi(_, chu): cau = chu; ma = ""
    default: cau = "Chưa mở được. Thử lại nhé."; ma = ""
    }
  }
}

/// «Cần mã của Ba Mẹ» — nội dung 440×402 dưới thanh tiêu đề 28 (tổng 440×430 như thiết kế).
struct ThoatMacView: View {
  @ObservedObject var m: ThoatModel
  var quayLai: () -> Void = {}

  var body: some View {
    let chip = ThoatMac.chipBao(ok: m.baoOk, status: m.baoStatus)
    ZStack(alignment: .top) {
      ClayMau.nen
      LinearGradient(colors: [ClayMau.ngocSoft, ClayMau.nen], startPoint: .top, endPoint: .bottom).frame(height: 130)
      VStack(spacing: 0) {
        HinhFluent(ten: "shield", duPhong: "lock.shield.fill", co: 72).padding(.top, 14)
        Text(ThoatMac.tieu).font(.system(size: 21, weight: .bold)).padding(.top, 8)
        Text(ThoatMac.phu).font(.system(size: 13)).foregroundColor(ClayMau.chu3).padding(.top, 3)
        HStack(spacing: 8) {
          ForEach(0..<6, id: \.self) { i in
            let c = Array(m.ma)
            Text(i < c.count ? String(c[i]) : "").font(.system(size: 26, weight: .bold)).frame(width: 46, height: 56).clayLom(bo: 15)
              .overlay(RoundedRectangle(cornerRadius: 15).strokeBorder(ClayMau.ngoc, lineWidth: 2.5).opacity(i == c.count ? 1 : 0))
          }
        }
        .modifier(Rung(lan: m.cau != nil ? 1 : 0))
        .padding(.top, 20)
        Text(m.dangGui ? "Đang kiểm mã…" : m.cau ?? ThoatMac.ghiMa)
          .font(.system(size: 12.5, weight: m.cau != nil ? .bold : .regular))
          .foregroundColor(m.cau != nil ? ClayMau.loi : ClayMau.chu3)
          .lineLimit(2).multilineTextAlignment(.center).padding(.horizontal, 20).padding(.top, 10)
        HStack(spacing: 6) {
          HinhFluent(ten: chip.icon, duPhong: "bell.fill", co: 18)
          Text(chip.chu).font(.system(size: 12.5, weight: .bold)).foregroundColor(chip.cam ? ClayMau.canh : ClayMau.ngocInk)
        }
        .padding(.horizontal, 12).frame(height: 28)
        .background(Capsule().fill(chip.cam ? ClayMau.canhSoft : ClayMau.ngocSoft))
        .padding(.top, 14)
        Spacer(minLength: 0)
        Button(action: quayLai) { HStack(spacing: 7) { HinhFluent(ten: "house", duPhong: "house.fill", co: 22); Text(ThoatMac.quay) } }
          .buttonStyle(NutClayStyle(kieu: .ngoc, bo: 22, cao: 44))
          .padding(.horizontal, 20).padding(.bottom, 20)
      }
    }
    .frame(width: 440, height: 402)
    .foregroundColor(ClayMau.chu)
    .environment(\.colorScheme, .light)
    .background(PhimSo { c in if c != "\r" { m.bam(c) } })
  }
}

/// «Giỏi lắm! N ngày liền» — Grow sao · số ngày · 7 ô (🔥 ngày có việc được duyệt, ô cuối «Nay») · Cấp (Mới lên!) → cấp sau · +N · nút.
struct GioiLamView: View {
  let chuoi: HvChuoi
  let cap: Int
  let moiLen: Bool
  let sao: Int
  var tuyet: () -> Void = {}

  var body: some View {
    VStack(spacing: 0) {
      RobView(ten: "sao", cao: 96)
      HStack(alignment: .firstTextBaseline, spacing: 6) {
        Text("\(chuoi.soNgay)").font(.system(size: 34, weight: .heavy)).foregroundColor(ClayMau.canh)
        Text("ngày liền!").font(.system(size: 19, weight: .bold))
      }
      Text(ChuoiView.phu(chuoi.soNgay)).font(.system(size: 12.5)).foregroundColor(ClayMau.chu3).padding(.top, 2)
      HStack(spacing: 6) {
        ForEach(Array(chuoi.tuan.enumerated()), id: \.offset) { i, d in
          let nay = i == chuoi.tuan.count - 1
          VStack(spacing: 3) {
            ZStack {
              RoundedRectangle(cornerRadius: 12, style: .continuous).fill(d.co ? ClayMau.canhSoft : ClayMau.lom)
              if d.co { HinhFluent(ten: "fire", duPhong: "flame.fill", co: 26) }
              else if d.bang { HinhFluent(ten: "shield", duPhong: "shield.fill", co: 22) }
            }
            .frame(width: 44, height: 44)
            Text(ChuoiView.thu(d, homNay: nay)).font(.system(size: 11, weight: nay ? .bold : .regular)).foregroundColor(nay ? ClayMau.canh : ClayMau.chu3)
          }
        }
      }
      .padding(.top, 12)
      HStack(spacing: 6) {
        vien("Cấp \(cap)", nen: ClayMau.ngocSoft, mau: ClayMau.ngocInk)
        if moiLen { vien("Mới lên!", nen: ClayMau.canhSoft, mau: ClayMau.canh) }
        Text("→ Cấp \(cap + 1)").font(.system(size: 13, weight: .bold)).foregroundColor(ClayMau.chu3)
        if sao > 0 { vien("+\(sao)", nen: ClayMau.diemSoft, mau: ClayMau.diemInk, icon: "star") }
      }
      .padding(.top, 12)
      Button(action: tuyet) { HStack(spacing: 7) { HinhFluent(ten: "star", duPhong: "star.fill", co: 22); Text(sao > 0 ? "Tuyệt! Nhận \(sao) sao" : "Tuyệt!") } }
        .buttonStyle(NutClayStyle(kieu: .ngoc, bo: 22, cao: 44))
        .padding(.top, 16)
    }
    .padding(.horizontal, 22).padding(.vertical, 18)
    .frame(width: 428)
    .nenClay()
  }

  private func vien(_ s: String, nen: Color, mau: Color, icon: String? = nil) -> some View {
    HStack(spacing: 4) {
      if let icon { HinhFluent(ten: icon, duPhong: "star.fill", co: 16) }
      Text(s).font(.system(size: 13, weight: .bold)).foregroundColor(mau)
    }
    .padding(.horizontal, 10).frame(height: 26).background(Capsule().fill(nen))
  }
}
