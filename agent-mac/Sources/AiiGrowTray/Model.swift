// Trạng thái dùng chung giữa menu, màn khoá và các cửa sổ.
import Foundation
import SwiftUI
import AiiGrowCore

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
  /// Số sao của lời xin vay vừa gửi («Đã gửi Ba Mẹ! Con xin vay 15 sao»); nil = lời xin mở app / web.
  @Published var saoDaXin: Int?
  /// App / trang vừa xin thêm vào danh sách.
  @Published var mucDaXin: String?
  /// Mất mạng: đã lưu, có mạng daemon tự gửi (màn «Đã lưu lời xin vay sao»).
  @Published var choMang = false
  @Published var luc: Date?
  let goi: (YeuCauTray) async -> TraLoi
  init(goi: @escaping (YeuCauTray) async -> TraLoi = { yc in (try? await IPCClient.guiAsync(yc)) ?? .loi(ma: "ipc", chu: "Chưa gửi được. AiiGrow đang khởi động lại, con thử lại sau nhé.") }) {
    self.goi = goi
  }
  /// Mở form mới (cửa sổ mới, đổi bé): bỏ trạng thái «đã gửi» của lời xin trước.
  func moi() { daGui = false; thongBao = ""; saoDaXin = nil; mucDaXin = nil; choMang = false; luc = nil }

  /// «Xin Ba Mẹ cho vay sao» (#263): chơi (mặc định) hoặc đổi quà (`quaId`).
  func xinVay(soSao: Int, loiNhan: String, mucDich: String? = nil, quaId: String? = nil) {
    saoDaXin = soSao; mucDaXin = nil
    gui(.xinVay(soSao: soSao, mucDich: mucDich, quaId: quaId, loiNhan: loiNhan.isEmpty ? nil : loiNhan))
  }
  /// «Xin Ba Mẹ mở» app / trang chưa có trong danh sách (#258: xin thêm vào danh sách).
  /// #422: `loai` = kieu «app» | «web»; `ten` = tên app khi `muc` là bundle id (chọn từ lưới).
  func xinMo(muc: String, loai: String, loiNhan: String, ten: String? = nil) {
    saoDaXin = nil; mucDaXin = ten.flatMap { $0.isEmpty ? nil : $0 } ?? muc
    let nhan = loiNhan.trimmingCharacters(in: .whitespacesAndNewlines)
    gui(.xinMo(muc: muc, loai: loai, loiNhan: nhan.isEmpty ? nil : nhan, ten: ten))
  }

  private func gui(_ yc: YeuCauTray) {
    guard !dangGui else { return }
    dangGui = true; thongBao = "Đang gửi…"; choMang = false
    Task {
      defer { dangGui = false }
      switch await goi(yc) {
      case .ok, .canhBao: daGui = true; luc = Date(); thongBao = "Đã gửi cho Ba Mẹ. Đang chờ Ba Mẹ trả lời…"
      case .thongBao(let chu) where chu == "cho_mang": daGui = true; choMang = true; luc = Date(); thongBao = "Có mạng là AiiGrow tự gửi Ba Mẹ."
      case .loi(let ma, let chu): daGui = false; thongBao = AppConModel.cauLoi(ma: ma, chu: chu)
      case .thongBao(let chu): daGui = true; luc = Date(); thongBao = chu
      case .trangThai, .duLieu, .choi, .pin: daGui = true; luc = Date(); thongBao = "Đã gửi cho Ba Mẹ."
      }
    }
  }
}
