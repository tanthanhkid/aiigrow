// Điều hướng gốc của app Con (bản «Dịu», 06/11): cài & ghép → cấp quyền → máy khoá (chọn tên + PIN) → hằng ngày (4 tab).
import SwiftUI
import ConCore

/// Màn phụ mở dạng sheet.
enum ManPhu: Identifiable, Equatable {
  case xinThem, doiSao, conDangXin, doiBe, xinCai, dns, chonApp, cuaHang, maOffline
  case nhiemVu(NhiemVuCon)
  var id: String {
    switch self {
    case .nhiemVu(let n): return "nv.\(n.id)"
    default: return "\(self)"
    }
  }
}

struct ManGoc: View {
  @EnvironmentObject var m: MoHinhApp
  var body: some View {
    Group {
      switch m.man {
      case .chao: ManChao()
      case .chuaGhep: ManChuaGhep()
      case .nhapMa: ManNhapMa()
      case .quetQR: ManQuetQR()
      case .daGo: ManDaGo()
      case .chinh:
        if m.moQuyen { ManQuyen() }
        else if m.baMeDangDung { ManBaMeDung() }
        else if m.dangKhoaChoTen { ManMayKhoa() }
        else { ManHangNgay() }
      }
    }
    .frame(maxWidth: 560)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Diu.nen.ignoresSafeArea())
    .sheet(item: $m.manPhu) { p in
      ManPhuView(p: p).environmentObject(m)
    }
  }
}

struct ManPhuView: View {
  @EnvironmentObject var m: MoHinhApp
  let p: ManPhu
  var body: some View {
    Group {
      switch p {
      case .xinThem: ManXinThem()
      case .doiSao: ManDoiSao()
      case .conDangXin: ManConDangXin()
      case .doiBe: ManDoiBe()
      case .xinCai: ManXinCai()
      case .dns: ManDns()
      case .chonApp: ManChonApp()
      case .cuaHang: ManCuaHang()
      case .maOffline: ManMaOffline()
      case .nhiemVu(let n): ManNvChiTiet(nv: n)
      }
    }
    .background(Diu.nen.ignoresSafeArea())
  }
}

/// Bốn tab hằng ngày: Hôm nay · Nhiệm vụ · Sao & quà · Tin nhắn (thanh tab nổi trắng bo 28, tab chọn nền xanh).
struct ManHangNgay: View {
  @EnvironmentObject var m: MoHinhApp
  var body: some View {
    VStack(spacing: 0) {
      Group {
        switch m.tab {
        case .homNay: ManHomNay()
        case .nhiemVu: ManNhiemVu()
        case .saoQua: ManSaoQua()
        case .tin: ManTin()
        }
      }
      .frame(maxHeight: .infinity)
      ThanhTab()
    }
    .background(Diu.nen.ignoresSafeArea())
    .refreshable { await m.dongBoNgay() }
  }
}

struct ThanhTab: View {
  @EnvironmentObject var m: MoHinhApp
  var body: some View {
    let soTin = m.tin.count > 0 ? min(9, m.tin.filter { $0.loai == "loi_khen" }.count + (m.tq?.loiKhen?.filter { $0.phanHoi == nil }.count ?? 0)) : 0
    HStack(spacing: 4) {
      o(.homNay, "ic_nha", "Hôm nay", 0)
      o(.nhiemVu, "ic_tick", "Nhiệm vụ", 0)
      o(.saoQua, "ic_sao", "Sao & quà", 0)
      o(.tin, "ic_tin", "Tin nhắn", soTin)
    }
    .padding(7).frame(height: 76)
    .background(RoundedRectangle(cornerRadius: 28, style: .continuous).fill(.white))
    .overlay(RoundedRectangle(cornerRadius: 28, style: .continuous).stroke(Diu.vien, lineWidth: 1))
    .shadow(color: Diu.bong.opacity(0.08), radius: 5, y: 2)
    .padding(.horizontal, 12).padding(.bottom, 6)
  }
  func o(_ t: TabCon, _ ic: String, _ ten: String, _ so: Int) -> some View {
    let dang = m.tab == t
    return Button { m.tab = t } label: {
      VStack(spacing: 1) {
        Anh(ten: ic, co: 30)
        Text(ten).font(Diu.chu(12.5, .heavy)).lineLimit(1).minimumScaleFactor(0.8)
      }
      .foregroundColor(dang ? .white : Diu.chu2).frame(maxWidth: .infinity, maxHeight: .infinity)
      .background(RoundedRectangle(cornerRadius: 20, style: .continuous).fill(dang ? Diu.xanh : .clear))
      .overlay(alignment: .topTrailing) {
        if so > 0 {
          Text("\(so)").font(Diu.chu(11, .black)).foregroundColor(.white).frame(minWidth: 20, minHeight: 20)
            .background(Capsule().fill(Diu.do_)).overlay(Capsule().stroke(.white, lineWidth: 2)).padding(.trailing, 8).padding(.top, 2)
        }
      }
    }
    .buttonStyle(.plain)
    .accessibilityLabel(ten).accessibilityAddTraits(dang ? .isSelected : [])
  }
}
