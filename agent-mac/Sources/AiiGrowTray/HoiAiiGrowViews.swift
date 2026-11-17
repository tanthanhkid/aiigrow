// «Hỏi AiiGrow» — tự tìm lỗi (con-mat-mang 10, như agent-win HoiAiiGrowForm): bốn thẻ tình huống + «Gọi Ba Mẹ giúp»; bấm thẻ ⇒ làm / nói cách sửa.
import SwiftUI
import AiiGrowCore

struct HoiAiiGrowView: View {
  @ObservedObject var tray: TrayModel
  /// Hỏi lại dịch vụ (TrayApp.hoi) — xong thì `tray` đã có trạng thái mới.
  var hoiLai: () async -> Void = {}
  /// «Gọi Ba Mẹ giúp» ⇒ app Con mục Tin nhắn.
  var nhanBaMe: () -> Void = {}
  /// Phiên Ba Mẹ (admin) bấm «Cần cập nhật?» ⇒ kiểm ngay như menu «Kiểm tra cập nhật»; Con thì nil.
  var kiemCapNhat: (() -> Void)?
  var dong: () -> Void = {}
  @State private var ketQua: HoiAiiGrow.KetQua?
  @State private var dangHoi = false

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 12) {
        VienClay(ten: "speech_balloon", duPhong: "questionmark.bubble.fill", nen: ClayMau.ngocSoft, co: 48)
        VStack(alignment: .leading, spacing: 2) {
          Text(HoiAiiGrow.tieu).font(.clay(size: 20, weight: .bold))
          Chu(HoiAiiGrow.phu, co: 14, mau: ClayMau.chu3, dong: 1)
        }
      }
      LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible())], spacing: 10) {
        ForEach(HoiAiiGrow.the, id: \.ma) { t in
          Button { chon(t.ma) } label: {
            VStack(alignment: .leading, spacing: 4) {
              HinhFluent(ten: t.icon, duPhong: "questionmark.circle.fill", co: 36)
              Text(t.tieu).font(.clay(size: 14, weight: .bold))
              Text(t.phu).font(.clay(size: 12)).foregroundColor(ClayMau.chu3).fixedSize(horizontal: false, vertical: true)
            }
            .padding(12).frame(maxWidth: .infinity, minHeight: 112, alignment: .topLeading).clayLom(bo: 20)
          }
          .buttonStyle(.plain).disabled(dangHoi)
        }
      }
      if let k = ketQua {
        VStack(alignment: .leading, spacing: 4) {
          Text(k.tieu).font(.clay(size: 15, weight: .bold)).foregroundColor(k.tot ? ClayMau.ngocInk : ClayMau.canh)
          Text(k.phu).font(.clay(size: 13)).foregroundColor(ClayMau.chu2).fixedSize(horizontal: false, vertical: true)
        }
        .padding(14).frame(maxWidth: .infinity, alignment: .leading).clayThe(bo: 20, nen: k.tot ? ClayMau.ngocSoft : ClayMau.canhSoft)
      }
      Button { nhanBaMe(); dong() } label: {
        HStack(spacing: 8) { HinhFluent(ten: "speech_balloon", duPhong: "bubble.left.fill", co: 22); Text(HoiAiiGrow.goiBaMe) }
      }
      .buttonStyle(NutClayStyle(kieu: .ngoc))
    }
    .padding(18).clayThe().vaoLanLuot(0)
    .padding(22).padding(.bottom, 12).frame(width: 440).nenClay()
    .foregroundColor(ClayMau.chu)
    .animation(ClayMotion.bat, value: ketQua)
  }

  private func chon(_ ma: String) {
    switch ma {
    case "thu_lai", "bat_lai":
      dangHoi = true
      Task {
        await hoiLai()
        dangHoi = false
        ketQua = HoiAiiGrow.ketQuaThuLai(ma: ma, matKetNoi: tray.matKetNoi || tray.tt == nil, matMang: tray.tt?.matMang == true, banDaemon: tray.tt?.banDaemon)
      }
    case "cap_nhat":
      if let kiemCapNhat { dong(); kiemCapNhat() } else { ketQua = HoiAiiGrow.ketQuaCapNhat(banDaemon: tray.tt?.banDaemon) }
    default:
      ketQua = HoiAiiGrow.ketQuaMaMo()
    }
  }
}
