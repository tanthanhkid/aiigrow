// Màn sao = phút / vay sao / danh sách app (thiết kế con-cai-mac 15/11, #258 #262–#267): viên sao (âm = viên cảnh báo), «Xin Ba Mẹ cho vay sao»
// (them-zsf6b45n, từ màn khoá them-s9zxgltm), «Đã gửi» (them-zkgjog14), «Đã lưu lời xin» (them-qa6tsua3), Ba Mẹ cho / chưa cho (them-8efbpmkb /
// them-39y24jad), «Sao là phút chơi» (them-0k1r3wsl), «Hết sao rồi», «… chưa có trong danh sách» (them-sw37ub0p), Ba Mẹ đã thêm / chưa thêm app
// (them-oduos66h / them-paetepsf / them-t66cmp4a).
import AppKit
import SwiftUI
import AiiGrowCore

/// Viên sao: dương = viên vàng «⭐ 30 sao», âm = viên cảnh báo «⭐ −20 sao».
struct VienSao: View {
  let sao: Int
  var co: CGFloat = 15
  var body: some View {
    HStack(spacing: 6) {
      HinhFluent(ten: "star", duPhong: "star.fill", co: co + 4)
      Text(ChuSao.vien(sao)).font(.clay(size: co, weight: .bold)).monospacedDigit().lineLimit(1)
    }
    .foregroundColor(sao < 0 ? ClayMau.canh : ClayMau.diemInk)
    .padding(.horizontal, co * 0.8).padding(.vertical, co * 0.35)
    .background(Capsule().fill(sao < 0 ? ClayMau.canhSoft : ClayMau.diemSoft))
    .fixedSize()
  }
}

/// Dòng link nhỏ «… ›».
struct LinkNho: View {
  let chu: String
  let lam: () -> Void
  var body: some View {
    Button(chu, action: lam).buttonStyle(.plain).font(.clay(size: 13, weight: .bold)).foregroundColor(ClayMau.ngocInk)
  }
}

// MARK: - Xin Ba Mẹ cho vay sao

struct XinVayView: View {
  @ObservedObject var tray: TrayModel
  @ObservedObject var xin: XinModel
  /// Mở từ màn khoá / màn hết sao (them-s9zxgltm): tiêu đề «Hết sao rồi · xin vay nhé» + thẻ «Hoặc làm nhiệm vụ».
  var tuManKhoa = false
  var soViecChuaLam = 0
  var moThongTin: (() -> Void)? = nil
  var moXinApp: (() -> Void)? = nil
  var xemNhiemVu: (() -> Void)? = nil
  /// «Chơi tiếp» / «Về màn khoá».
  var dong: () -> Void = {}
  @State private var soSao = ChuSao.vayMacDinh
  @State private var loiNhan = ""

  private var phut: Int { tray.tt?.phutSao ?? max(0, tray.tt?.soSao?.phutCon ?? 0) }

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      if xin.daGui, xin.choMang { daLuu }
      else if xin.daGui, xin.saoDaXin != nil { daGui }
      else { form }
    }
    .foregroundColor(ClayMau.chu)
    .animation(ClayMotion.bat, value: xin.daGui)
  }

  @ViewBuilder private var form: some View {
    Text(tuManKhoa ? "Hết sao rồi · xin vay nhé" : "Xin Ba Mẹ cho vay sao").font(.clay(size: 20, weight: .bold))
    Text(tuManKhoa ? "Chọn số sao con muốn vay" : "Con " + ChuSao.phut(phut)).font(.clay(size: 13)).foregroundColor(ClayMau.chu3)
    if !tuManKhoa { Text("Con xin vay").font(.clay(size: 13, weight: .semibold)).foregroundColor(ClayMau.chu3) }
    ChipClay(ds: ChuSao.mucVay.map { ($0, "\($0) sao") }, chon: $soSao)
    Chu(ChuSao.cauVay(soSao), co: 13, dam: .semibold, mau: ClayMau.diemInk, dong: 2)
    TextField(tuManKhoa ? "Con đang xây dở nhà với bạn" : "Nhắn Ba Mẹ: con làm nốt bài với bạn ạ", text: $loiNhan)
      .textFieldStyle(.plain).font(.clay(size: 14)).padding(.horizontal, 14).frame(minHeight: 44).clayLom()
    Button("Xin Ba Mẹ cho vay \(soSao) sao") { xin.xinVay(soSao: soSao, loiNhan: loiNhan) }
      .buttonStyle(NutClayStyle(kieu: .ngoc)).disabled(xin.dangGui)
    if tuManKhoa {
      VStack(alignment: .leading, spacing: 6) {
        Text("Hoặc làm nhiệm vụ · 1 việc = 10 sao").font(.clay(size: 14, weight: .bold)).foregroundColor(ClayMau.diemInk)
        if let xemNhiemVu, soViecChuaLam > 0 { LinkNho(chu: "Xem \(soViecChuaLam) nhiệm vụ chưa làm ›", lam: xemNhiemVu) }
      }
      .padding(14).frame(maxWidth: .infinity, alignment: .leading).clayThe(bo: 20, nen: ClayMau.diemSoft)
    } else if moThongTin != nil || moXinApp != nil {
      HStack(spacing: 24) {
        if let moThongTin { LinkNho(chu: "1 sao = 1 phút chơi ›", lam: moThongTin) }
        if let moXinApp { LinkNho(chu: "Xin mở app ›", lam: moXinApp) }
      }
    }
    if !xin.thongBao.isEmpty, !xin.daGui, !xin.dangGui {
      Chu(xin.thongBao, co: 14, dam: .medium, mau: ClayMau.loi, dong: 3)
    }
  }

  @ViewBuilder private var daGui: some View {
    HStack(spacing: 12) {
      VienClay(ten: "speech_balloon", duPhong: "paperplane.fill", nen: ClayMau.ngocSoft, co: 48)
      VStack(alignment: .leading, spacing: 2) {
        Text("Đã gửi Ba Mẹ!").font(.clay(size: 20, weight: .bold))
        Text("Con xin vay \(ChuSao.so(xin.saoDaXin ?? soSao)) sao").font(.clay(size: 14)).foregroundColor(ClayMau.chu3)
      }
    }
    VStack(alignment: .leading, spacing: 2) {
      Text("Đang chờ Ba Mẹ").font(.clay(size: 15, weight: .bold)).foregroundColor(ClayMau.ngocInk)
      Text("Ba Mẹ trả lời là máy báo con ngay.").font(.clay(size: 13)).foregroundColor(ClayMau.chu3)
    }
    Button("Chơi tiếp · còn \(ChuSao.so(phut)) sao = \(ChuSao.so(phut)) phút", action: dong).buttonStyle(NutClayStyle(kieu: .ngoc))
    LinkNho(chu: "‹ Sửa lời xin") { xin.moi() }
  }

  @ViewBuilder private var daLuu: some View {
    HStack(spacing: 12) {
      VienClay(ten: "wifi", duPhong: "wifi.slash", nen: ClayMau.canhSoft, co: 48)
      VStack(alignment: .leading, spacing: 2) {
        Text("Đã lưu lời xin vay sao").font(.clay(size: 20, weight: .bold))
        Text("Có mạng là AiiGrow tự gửi Ba Mẹ.").font(.clay(size: 14)).foregroundColor(ClayMau.chu3)
      }
    }
    let cho = (tray.tt?.yeuCauCho ?? []).filter { $0.choMang == true }.count
    VStack(alignment: .leading, spacing: 4) {
      Text("Chờ có mạng (\(max(1, cho)))").font(.clay(size: 13, weight: .bold)).foregroundColor(ClayMau.canh)
      Text("Xin Ba Mẹ cho vay \(ChuSao.so(xin.saoDaXin ?? soSao)) sao").font(.clay(size: 15, weight: .bold))
      Text("vừa xong · " + AppConView.gioPhut.string(from: xin.luc ?? Date())).font(.clay(size: 12)).foregroundColor(ClayMau.chu3)
    }
    .padding(14).frame(maxWidth: .infinity, alignment: .leading).clayLom(bo: 18)
    Text("Không cần bấm gửi lại đâu.").font(.clay(size: 13)).foregroundColor(ClayMau.chu3)
    Button(tuManKhoa ? "Về màn khoá" : "Đóng", action: dong).buttonStyle(NutClayStyle(kieu: .sang))
  }
}

struct XinVayCuaSo: View {
  @ObservedObject var tray: TrayModel
  @ObservedObject var xin: XinModel
  var tuManKhoa = false
  var soViecChuaLam = 0
  var moThongTin: (() -> Void)? = nil
  var moXinApp: (() -> Void)? = nil
  var xemNhiemVu: (() -> Void)? = nil
  var dong: () -> Void = {}
  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      XinVayView(tray: tray, xin: xin, tuManKhoa: tuManKhoa, soViecChuaLam: soViecChuaLam, moThongTin: moThongTin, moXinApp: moXinApp,
                 xemNhiemVu: xemNhiemVu, dong: dong)
        .padding(18).clayThe().vaoLanLuot(0)
      HStack(spacing: 6) {
        HinhFluent(ten: "seedling", duPhong: "leaf.fill", co: 16)
        Text(TrayLogic.dongDangBat).font(.clay(size: 12)).foregroundColor(ClayMau.chu3)
      }
      .padding(.horizontal, 6).vaoLanLuot(1)
    }
    .padding(22).padding(.bottom, 12).frame(width: 440).nenClay()
  }
}

// MARK: - Ba Mẹ trả lời

/// Đầu thẻ trả lời: icon + tiêu đề + dòng phụ, lời nhắn của Ba Mẹ (nếu có).
private struct DauTraLoi: View {
  let icon: String
  let tieu: String
  let phu: String
  var nguoi: String?
  var loiNhan: String?
  var tot = true
  var body: some View {
    HStack(spacing: 12) {
      VienClay(ten: icon, duPhong: tot ? "checkmark.seal.fill" : "hand.raised.fill", nen: tot ? ClayMau.ngocSoft : ClayMau.canhSoft, co: 52)
      VStack(alignment: .leading, spacing: 2) {
        Chu(tieu, co: 20, dam: .bold, dong: 2)
        Chu(phu, co: 14, mau: ClayMau.chu3, dong: 2)
      }
    }
    if let l = loiNhan, !l.isEmpty {
      VStack(alignment: .leading, spacing: 2) {
        Text(nguoi ?? "Ba Mẹ").font(.clay(size: 13, weight: .bold)).foregroundColor(ClayMau.chu2)
        Chu("«\(l)»", co: 14, mau: ClayMau.chu)
      }
      .padding(14).frame(maxWidth: .infinity, alignment: .leading).clayLom(bo: 18)
    }
  }
}

/// Lời xin vay sao đã được trả lời (them-8efbpmkb / them-39y24jad).
struct VayKetQuaView: View {
  let y: YeuCauDangCho
  /// Sao tiêu được / nợ hiện tại (sau đồng bộ).
  var phutSao: Int
  var no: Int = 0
  var choiTiep: () -> Void = {}
  var lamNhiemVu: () -> Void = {}
  var nhanBaMe: () -> Void = {}
  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      let nguoi = y.tenNguoiDuyet ?? "Ba Mẹ"
      if y.trangThai == "duyet" {
        DauTraLoi(icon: "party_popper", tieu: "\(nguoi) cho vay \(ChuSao.so(y.phut ?? 0)) sao!",
                  phu: ChuSao.phut(phutSao) + (no > 0 ? " · đang nợ Ba Mẹ \(ChuSao.so(no)) sao" : ""), nguoi: nguoi, loiNhan: y.loiNhan)
        Button(y.mucDich == "qua" ? "Về Sao & quà" : "Chơi tiếp \(ChuSao.so(phutSao)) phút", action: choiTiep).buttonStyle(NutClayStyle(kieu: .ngoc))
      } else {
        DauTraLoi(icon: "speech_balloon", tieu: "Ba Mẹ chưa cho vay sao", phu: "Con " + ChuSao.phut(phutSao), nguoi: nguoi, loiNhan: y.loiNhan, tot: false)
        Button("Làm nhiệm vụ lấy sao", action: lamNhiemVu).buttonStyle(NutClayStyle(kieu: .ngoc))
        HStack(spacing: 12) {
          Button("Nhắn Ba Mẹ", action: nhanBaMe).buttonStyle(NutClayStyle(kieu: .sang))
          Button("Về Hôm nay", action: choiTiep).buttonStyle(NutClayStyle(kieu: .sang))
        }
      }
    }
    .padding(22).clayThe().vaoLanLuot(0)
    .padding(18).padding(.bottom, 10).frame(width: 440).nenClay().foregroundColor(ClayMau.chu)
  }
}

/// Lời xin thêm app / trang vào danh sách đã được trả lời (them-oduos66h / them-paetepsf / them-t66cmp4a; `mo_tam` = Ba Mẹ cho mở tạm).
struct AppKetQuaView: View {
  let y: YeuCauDangCho
  var phutSao: Int?
  var mo: () -> Void = {}
  var nhanBaMe: () -> Void = {}
  var veHomNay: () -> Void = {}
  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      let nguoi = y.tenNguoiDuyet ?? "Ba Mẹ"
      let ten = HocVienView.tenMucChoi(y.muc)
      let conSao = phutSao.map { " · " + ChuSao.phut($0) } ?? ""
      if y.trangThai == "duyet" && y.ketQua == "mo_tam" {
        DauTraLoi(icon: "party_popper", tieu: "\(nguoi) cho mở \(ten)" + (y.moTamPhut.map { " \($0) phút" } ?? "") + "!",
                  phu: "Mở tạm lần này · chưa thêm vào danh sách", nguoi: nguoi, loiNhan: y.loiNhan)
        Button("Mở \(ten)", action: mo).buttonStyle(NutClayStyle(kieu: .ngoc))
      } else if y.trangThai == "duyet" {
        let khong = y.nhom == "khong_tinh_phut"
        DauTraLoi(icon: "party_popper", tieu: "\(nguoi) đã thêm \(ten)!",
                  phu: khong ? "Nhóm Không tính phút · không trừ sao" : "Nhóm Tính phút" + conSao, nguoi: nguoi, loiNhan: y.loiNhan)
        Button(khong ? "Mở \(ten) · không tính phút" : "Mở \(ten) · 1 phút = 1 sao", action: mo).buttonStyle(NutClayStyle(kieu: .ngoc))
      } else {
        DauTraLoi(icon: "speech_balloon", tieu: "Ba Mẹ chưa thêm \(ten)", phu: "Con xin lại sau được nhé" + conSao, nguoi: nguoi, loiNhan: y.loiNhan, tot: false)
        HStack(spacing: 12) {
          Button("Nhắn Ba Mẹ", action: nhanBaMe).buttonStyle(NutClayStyle(kieu: .sang))
          Button("Về Hôm nay", action: veHomNay).buttonStyle(NutClayStyle(kieu: .ngoc))
        }
      }
    }
    .padding(22).clayThe().vaoLanLuot(0)
    .padding(18).padding(.bottom, 10).frame(width: 440).nenClay().foregroundColor(ClayMau.chu)
  }
}

// MARK: - Sao là phút chơi (them-0k1r3wsl — thay «Đổi sao lấy giờ»)

struct SaoLaPhutView: View {
  var phutSao: Int
  var moHet = false
  var hieuRoi: () -> Void = {}
  var xinVay: () -> Void = {}
  var lamNhiemVu: () -> Void = {}
  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text(moHet ? "Sao để đổi quà" : "Sao là phút chơi").font(.clay(size: 13, weight: .semibold)).foregroundColor(ClayMau.chu3)
      HStack(spacing: 12) {
        VienClay(ten: "star", duPhong: "star.fill", nen: ClayMau.diemSoft, co: 52)
        VStack(alignment: .leading, spacing: 0) {
          Text("Con đang có").font(.clay(size: 13)).foregroundColor(ClayMau.chu3)
          Text(moHet ? ChuSao.vien(phutSao) : "\(ChuSao.vien(phutSao)) = \(ChuSao.so(phutSao)) phút chơi").font(.clay(size: 22, weight: .bold)).foregroundColor(ClayMau.diemInk)
        }
      }
      if moHet {
        Chu("Hôm nay Ba Mẹ để chế độ Mở hết: app, web mở tự do, chơi không trừ sao. Sao để dành đổi quà.", co: 14, mau: ClayMau.chu2)
      } else {
        Chu("1 sao = 1 phút chơi · không cần đổi", co: 15, dam: .bold, mau: ClayMau.ngocInk, dong: 1)
        VStack(alignment: .leading, spacing: 6) {
          Chu("• Mở app nhóm Tính phút (Roblox, YouTube): mỗi phút trừ 1 sao.", co: 14, mau: ClayMau.chu2)
          Chu("• App học (Không tính phút): dùng thoải mái, không trừ sao.", co: 14, mau: ClayMau.chu2)
          Chu("• Hết sao thì app Tính phút dừng.", co: 14, mau: ClayMau.chu2)
        }
        Chu("Hết sao? Làm nhiệm vụ hoặc xin Ba Mẹ cho vay sao.", co: 14, dam: .semibold, mau: ClayMau.diemInk)
      }
      Button("Con hiểu rồi", action: hieuRoi).buttonStyle(NutClayStyle(kieu: .ngoc)).keyboardShortcut(.cancelAction)
      HStack(spacing: 20) {
        if !moHet { LinkNho(chu: "Xin Ba Mẹ cho vay sao ›", lam: xinVay) }
        LinkNho(chu: "Làm nhiệm vụ kiếm sao ›", lam: lamNhiemVu)
      }
    }
    .padding(18).clayThe().vaoLanLuot(0)
    .padding(22).padding(.bottom, 12).frame(width: 440).nenClay().foregroundColor(ClayMau.chu)
  }
}

// MARK: - Hết sao (app «Tính phút» vừa bị đóng) · chưa có trong danh sách

struct HetSaoView: View {
  var tenApp: String?
  /// Khoá vì giới hạn giờ chơi (sao còn nguyên): tiêu đề / phụ riêng, không «Hết sao rồi», không nút «Làm nhiệm vụ».
  var gioiHan: GioiHan.Chu? = nil
  var lamNhiemVu: () -> Void = {}
  var xinVay: () -> Void = {}
  var dong: () -> Void = {}
  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 12) {
        VienClay(ten: "star", duPhong: "star.fill", nen: ClayMau.canhSoft, co: 52)
        VStack(alignment: .leading, spacing: 2) {
          Chu(gioiHan?.tieuDe ?? "Hết sao rồi", co: 20, dam: .bold, dong: 1)
          Chu((tenApp.map { "\($0) dừng · " } ?? "") + (gioiHan?.phu ?? "con còn 0 sao"), co: 14, mau: ClayMau.chu3, dong: 2)
        }
      }
      Chu(gioiHan == nil ? "1 sao = 1 phút chơi · app không tính phút vẫn mở được." : "Sao vẫn còn nguyên · app không tính phút vẫn mở được.", co: 13, mau: ClayMau.chu3)
      if gioiHan == nil { NutIcon(chu: "Làm nhiệm vụ", icon: "memo", kieu: .ngoc, rong: nil, lam: lamNhiemVu) }
      NutIcon(chu: "Xin Ba Mẹ cho vay sao", icon: "speech_balloon", kieu: .sang, rong: nil, lam: xinVay)
      Button("Đóng", action: dong).buttonStyle(.plain).font(.clay(size: 13, weight: .bold)).foregroundColor(ClayMau.chu2).keyboardShortcut(.cancelAction)
    }
    .padding(18).clayThe().vaoLanLuot(0)
    .padding(20).padding(.bottom, 12).frame(width: 400).nenClay().foregroundColor(ClayMau.chu)
  }
}

struct ChuaCoDanhSachView: View {
  let ten: String
  var ds: [(ten: String, nhom: String)] = []
  /// Đổi chữ cho trường hợp trình duyệt chưa lọc web được (không phải «chưa có trong danh sách»).
  var tieu: String? = nil
  var phu: String? = nil
  var xinMo: () -> Void = {}
  var veHomNay: () -> Void = {}
  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 12) {
        VienClay(ten: "stop_sign", duPhong: "hand.raised.fill", nen: ClayMau.canhSoft, co: 52)
        VStack(alignment: .leading, spacing: 2) {
          Chu(tieu ?? "\(ten) chưa có trong danh sách", co: 18, dam: .bold, dong: 2)
          Chu(phu ?? "Máy chỉ mở app trong danh sách Ba Mẹ duyệt", co: 13, mau: ClayMau.chu3, dong: 3)
        }
      }
      if !ds.isEmpty {
        VStack(alignment: .leading, spacing: 6) {
          Text("Danh sách của con · \(ds.count) app:").font(.clay(size: 13, weight: .bold)).foregroundColor(ClayMau.chu2)
          ForEach(Array(ds.prefix(6).enumerated()), id: \.offset) { _, m in
            HStack {
              Text(m.ten).font(.clay(size: 14, weight: .semibold)).lineLimit(1).truncationMode(.tail)
              Spacer(minLength: 8)
              Text(m.nhom).font(.clay(size: 12, weight: .bold))
                .foregroundColor(m.nhom.hasPrefix("Tính") ? ClayMau.diemInk : ClayMau.ngocInk)
                .padding(.horizontal, 10).padding(.vertical, 3)
                .background(Capsule().fill(m.nhom.hasPrefix("Tính") ? ClayMau.diemSoft : ClayMau.ngocSoft)).fixedSize()
            }
          }
        }
        .padding(14).clayLom(bo: 18)
      }
      NutIcon(chu: "Xin Ba Mẹ mở \(ten)", icon: "speech_balloon", kieu: .ngoc, rong: nil, lam: xinMo)
      Button("Về Hôm nay", action: veHomNay).buttonStyle(NutClayStyle(kieu: .sang)).keyboardShortcut(.cancelAction)
    }
    .padding(18).clayThe().vaoLanLuot(0)
    .padding(20).padding(.bottom, 12).frame(width: 420).nenClay().foregroundColor(ClayMau.chu)
  }
}
