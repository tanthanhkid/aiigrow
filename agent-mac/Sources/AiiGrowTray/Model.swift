// Trạng thái dùng chung giữa menu, màn khoá và các cửa sổ.
import Foundation
import SwiftUI
import AiiGrowCore

extension Color {
  /// Xanh AiiGrow #1f8a70.
  static let xanhAiiGrow = Color(red: 0x1f / 255, green: 0x8a / 255, blue: 0x70 / 255)
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
        case .trangThai: daGui = true; thongBao = "Đã gửi cho Ba Mẹ."
        }
      } catch {
        daGui = false; thongBao = "Chưa gửi được. AiiGrow đang khởi động lại, con thử lại sau nhé."
      }
    }
  }
}

/// Nút lớn xanh, cao ≥ 44pt.
struct NutXanh: ButtonStyle {
  var dac = true
  func makeBody(configuration: Configuration) -> some View {
    configuration.label
      .font(.system(size: 15, weight: .semibold))
      .frame(maxWidth: .infinity, minHeight: 44)
      .padding(.horizontal, 12)
      .foregroundColor(dac ? .white : .xanhAiiGrow)
      .background(RoundedRectangle(cornerRadius: 10).fill(dac ? Color.xanhAiiGrow : Color.xanhAiiGrow.opacity(0.12)))
      .opacity(configuration.isPressed ? 0.8 : 1)
  }
}
