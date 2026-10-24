// Trạng thái dùng chung giữa menu, màn khoá và các cửa sổ.
import Foundation
import SwiftUI
import AiiGrowCore

extension Color {
  /// Ngọc lục bảo AiiGrow #0f6b5c (token `chinh` của Clay gương — docs/THIET-KE-CLAY.md).
  static let xanhAiiGrow = ClayMau.ngoc
}

@MainActor
final class TrayModel: ObservableObject {
  @Published var tt: TrangThai?
  @Published var matKetNoi = true
  var nhanLuc = Date()

  func capNhat(_ t: TrangThai) { tt = t; matKetNoi = false; nhanLuc = Date() }
  func matNoi() { matKetNoi = true }
}

/// Gửi lời xin lên daemon và giữ câu thông báo cho form.
@MainActor
final class XinModel: ObservableObject {
  @Published var thongBao = ""
  @Published var dangGui = false
  @Published var daGui = false

  func xinThem(phut: Int, loiNhan: String) {
    gui(.xinThem(phut: phut, loiNhan: loiNhan.isEmpty ? nil : loiNhan))
  }
  func xinMo(muc: String, loai: String, loiNhan: String) {
    gui(.xinMo(muc: muc, loai: loai, loiNhan: loiNhan.isEmpty ? nil : loiNhan))
  }

  private func gui(_ yc: YeuCauTray) {
    guard !dangGui else { return }
    dangGui = true; thongBao = "Đang gửi…"
    Task {
      defer { dangGui = false }
      do {
        switch try await IPCClient.guiAsync(yc) {
        case .ok, .canhBao: daGui = true; thongBao = "Đã gửi cho Ba Mẹ. Đang chờ Ba Mẹ trả lời…"
        case .loi(_, let chu): daGui = false; thongBao = chu
        case .thongBao(let chu): daGui = true; thongBao = chu
        case .trangThai: daGui = true; thongBao = "Đã gửi cho Ba Mẹ."
        }
      } catch {
        daGui = false; thongBao = "Chưa gửi được. AiiGrow đang khởi động lại, con thử lại sau nhé."
      }
    }
  }
}

/// Nút lớn, cao ≥ 44pt — chất liệu Clay gương (Clay.swift): `dac` = kẹo ngọc lục bảo, không `dac` = khối sứ sáng.
struct NutXanh: ButtonStyle {
  var dac = true
  func makeBody(configuration: Configuration) -> some View {
    NutClayStyle(kieu: dac ? .ngoc : .sang).makeBody(configuration: configuration)
  }
}
