// Màn «Quà của con» (thiết kế con-cai-mac 26 «Ví quà», V1 07/11): phiếu chờ trao, quà đã nhận (voucher AiiCafe kèm mã QR + hạn), huy hiệu.
// Dữ liệu `GET device/vi-qua` (AppConModel.viQua); mất mạng thì hiện bản đã lưu. QR sinh tại máy từ trường `qr` — không tải ảnh từ mạng.
import AppKit
import CoreImage
import CoreImage.CIFilterBuiltins
import SwiftUI
import AiiGrowCore

/// Ảnh QR từ chuỗi (CIQRCodeGenerator, sửa lỗi mức M), phóng nguyên điểm ảnh (không mờ) để quét được.
enum QrAnh {
  static func tao(_ chuoi: String, canh: CGFloat = 132) -> NSImage? { sinh(chuoi, canh: canh)?.anh }

  /// (ảnh, số điểm ảnh mỗi mô-đun). Ảnh phóng nguyên số lần nên mô-đun đều; viền lặng chuẩn = 4 mô-đun.
  static func sinh(_ chuoi: String, canh: CGFloat) -> (anh: NSImage, he: Int)? {
    guard !chuoi.isEmpty else { return nil }
    let f = CIFilter.qrCodeGenerator()
    f.message = Data(chuoi.utf8); f.correctionLevel = "M"
    guard let out = f.outputImage else { return nil }
    let he = max(1, Int((canh / out.extent.width).rounded(.down)))
    let to = out.transformed(by: CGAffineTransform(scaleX: CGFloat(he), y: CGFloat(he)))
    let rep = NSCIImageRep(ciImage: to)
    let img = NSImage(size: rep.size); img.addRepresentation(rep)
    return (img, he)
  }
}

struct ViQuaView: View {
  @ObservedObject var app: AppConModel
  var quay: () -> Void = {}

  private static let ngay: DateFormatter = { let f = DateFormatter(); f.dateFormat = "dd/MM"; return f }()
  private var v: HvViQua { app.viQua ?? HvViQua() }
  /// Chưa có ví quà (máy chủ cũ / chưa tải được) ⇒ dùng phiếu chờ của tổng quan.
  private var phieuCho: [(id: String, ten: String, sao: Int)] {
    app.viQua != nil ? v.phieuCho.map { ($0.id, $0.ten, $0.sao) } : (app.tq?.phieuCho ?? []).map { ($0.id, $0.ten, $0.diem) }
  }
  private var daTrao: [HvQuaDaTrao] { v.daTrao }
  /// Voucher đã trao đi kèm trong `daTrao`; voucher không nằm trong đó (thu hồi / quá hạn…) vẫn hiện riêng để Con thấy trạng thái.
  private var voucherLe: [HvVoucher] { v.voucher.filter { x in x.ma.isEmpty || !daTrao.contains { $0.voucher?.ma == x.ma } } }

  var body: some View {
    HStack {
      Spacer()
      Button("‹ Đổi thêm quà", action: quay).buttonStyle(.plain).font(.system(size: 14, weight: .bold)).foregroundColor(ClayMau.ngocInk)
    }
    if app.viQuaDaLuu {
      Chu("Chưa có mạng — đang hiện bản đã lưu lần trước.", co: 13, dam: .semibold, mau: ClayMau.canh, dong: 2)
    }
    if !phieuCho.isEmpty {
      Chu("Chờ Ba Mẹ trao", co: 18, dam: .bold, dong: 1)
      ForEach(phieuCho, id: \.id) { p in
        TheCon {
          HStack(spacing: 12) {
            VienClay(ten: "wrapped_gift", duPhong: "gift.fill", nen: ClayMau.the, co: 44)
            VStack(alignment: .leading, spacing: 2) {
              Chu(p.ten, co: 16, dam: .bold, dong: 1)
              Chu("Đang giữ \(p.sao) sao · Ba Mẹ trao mới trừ", co: 13, mau: ClayMau.chu3, dong: 1)
            }
            nhan("Chờ trao", chu: ClayMau.canh, nen: ClayMau.canhSoft)
          }
        }
      }
    }
    if !daTrao.isEmpty || !voucherLe.isEmpty {
      Chu("Đã nhận", co: 18, dam: .bold, dong: 1).padding(.top, 4)
      ForEach(Array(daTrao.enumerated()), id: \.offset) { _, q in theDaTrao(q) }
      ForEach(Array(voucherLe.enumerated()), id: \.offset) { _, x in
        theVoucher(ten: x.ten, sao: nil, traoLuc: nil, x)
      }
    }
    if !v.huyHieu.isEmpty {
      Chu("Huy hiệu", co: 18, dam: .bold, dong: 1).padding(.top, 4)
      LazyVGrid(columns: [GridItem(.flexible(), spacing: 14), GridItem(.flexible(), spacing: 14)], spacing: 14) {
        ForEach(v.huyHieu) { h in
          TheCon(nen: ClayMau.diemSoft) {
            HStack(spacing: 14) {
              VienClay(ten: "star", duPhong: "star.fill", nen: ClayMau.the, co: 52)
              VStack(alignment: .leading, spacing: 4) {
                Chu(h.ten, co: 17, dam: .bold, mau: ClayMau.diemInk, dong: 2)
                if !h.moTa.isEmpty { Chu(h.moTa, co: 13.5, mau: ClayMau.diemInk, dong: 3) }
              }
            }
          }
        }
      }
    }
    if phieuCho.isEmpty && daTrao.isEmpty && voucherLe.isEmpty && v.huyHieu.isEmpty {
      Chu(app.viQua == nil ? "Chưa tải được quà của con. Con thử lại sau nhé." : "Con chưa có quà nào. Làm nhiệm vụ lấy sao rồi đổi quà nhé!", co: 15, mau: ClayMau.chu3)
    }
  }

  private func nhan(_ s: String, chu: Color, nen: Color) -> some View {
    Text(s).font(.system(size: 13, weight: .bold)).foregroundColor(chu)
      .padding(.horizontal, 14).padding(.vertical, 6).background(Capsule().fill(nen)).fixedSize()
  }

  @ViewBuilder private func theDaTrao(_ q: HvQuaDaTrao) -> some View {
    if let vc = q.voucher { theVoucher(ten: q.ten, sao: q.sao, traoLuc: q.traoLuc, vc) }
    else {
      TheCon {
        HStack(spacing: 12) {
          VienClay(ten: "wrapped_gift", duPhong: "gift.fill", nen: ClayMau.the, co: 44)
          VStack(alignment: .leading, spacing: 2) {
            Chu(q.ten, co: 16, dam: .bold, dong: 1)
            Chu(["\(q.sao) sao", q.traoLuc.map { "trao ngày " + ViQuaView.ngay.string(from: $0) }].compactMap { $0 }.joined(separator: " · "),
                co: 14, mau: ClayMau.chu3, dong: 1)
          }
          nhan("Đã nhận", chu: ClayMau.ngocInk, nen: ClayMau.ngocSoft)
        }
      }
    }
  }

  /// Voucher AiiCafe: còn dùng được ⇒ ảnh QR + mã + hạn/«Còn N ngày»; đã dùng / hết hạn ⇒ không QR, ghi trạng thái.
  private func theVoucher(ten: String, sao: Int?, traoLuc: Date?, _ x: HvVoucher) -> some View {
    TheCon {
      HStack(alignment: .center, spacing: 14) {
        if let qr = x.qr, !HocVienView.voucherHetHan(x), let (img, he) = QrAnh.sinh(qr, canh: 132) {
          // cỡ hiển thị = đúng cỡ ảnh (mô-đun nguyên điểm ảnh) + viền lặng ≥ 4 mô-đun
          Image(nsImage: img).interpolation(.none).resizable().frame(width: img.size.width, height: img.size.height)
            .padding(CGFloat(4 * he)).background(RoundedRectangle(cornerRadius: 14).fill(Color.white))
            .accessibilityLabel("Mã QR của \(ten)")
        } else {
          VienClay(ten: "wrapped_gift", duPhong: "gift.fill", nen: ClayMau.the, co: 44)
        }
        VStack(alignment: .leading, spacing: 4) {
          Chu(ten.isEmpty ? "Voucher AiiCafe" : ten, co: 16, dam: .bold, dong: 2)
          Chu(ViQuaView.dongVoucher(sao: sao, x), co: 14, mau: ClayMau.chu3, dong: 3)
          if x.qr != nil, !HocVienView.voucherHetHan(x), !x.ma.isEmpty { Chu("Mã: " + x.ma, co: 14, dam: .semibold, mau: ClayMau.ngocInk, dong: 1) }
        }
        let het = x.trangThai == "het_han" || x.trangThai == "da_dung" || HocVienView.voucherHetHan(x)
        nhan(HocVienView.hanVoucher(x) ?? "Đã nhận", chu: het ? ClayMau.canh : ClayMau.ngocInk, nen: het ? ClayMau.canhSoft : ClayMau.ngocSoft)
      }
    }
  }

  /// «500 sao · mã QR · hạn 25/12» (thiết kế 26) — bỏ phần nào không có.
  static func dongVoucher(sao: Int?, _ x: HvVoucher) -> String {
    var p: [String] = []
    if let sao { p.append("\(sao) sao") }
    if x.qr != nil { p.append("mã QR") }
    if let h = x.hetHan { p.append("hạn " + ngay.string(from: h)) }
    return p.joined(separator: " · ")
  }
}
