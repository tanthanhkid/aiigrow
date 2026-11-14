// Giao diện SwiftUI: xin thêm giờ, xin mở trang/app, ghép máy, màn khoá toàn màn hình.
// Chất liệu Clay gương + icon Fluent 3D + motion «vui»/«ánh men» (Clay.swift, docs/THIET-KE-CLAY.md).
import AppKit
import SwiftUI
import UserNotifications
import AiiGrowCore

/// Khối xin Ba Mẹ (thiết kế 45 «Xin Ba Mẹ thêm giờ», 36/41 «Xin mở ngoại lệ», 48 «Đã gửi Ba Mẹ!») — dùng trong cửa sổ riêng và ngay trên màn khoá.
struct XinThemView: View {
  @ObservedObject var tray: TrayModel
  @ObservedObject var xin: XinModel
  /// «Đổi sao lấy giờ ›» — nil = không hiện.
  var moChoi: (() -> Void)? = nil
  /// «Xin mở app ›» — nil = không hiện.
  var moXinApp: (() -> Void)? = nil
  /// Giờ ngủ / giờ học / Ba Mẹ khoá: không thêm giờ được — chỉ «Xin Ba Mẹ mở ngoại lệ» cả máy, có hạn.
  var ngoaiLe = false
  @State private var phut = 20
  @State private var loiNhan = ""
  static let lyDoNhanh = ["Con chưa xong bài", "Mai nộp cô"]

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      if xin.daGui, xin.phutDaXin != nil {
        HStack(spacing: 12) {
          VienClay(ten: "speech_balloon", duPhong: "paperplane.fill", nen: ClayMau.ngocSoft, co: 48)
          VStack(alignment: .leading, spacing: 2) {
            Text("Đã gửi Ba Mẹ!").font(.system(size: 20, weight: .bold))
            Text(ngoaiLe ? "Con xin mở \(xin.phutDaXin ?? phut) phút" : "Con xin thêm \(xin.phutDaXin ?? phut) phút").font(.system(size: 14)).foregroundColor(ClayMau.chu3)
          }
        }
        Text(TrayLogic.dongYeuCau(tray.tt?.yeuCauCho ?? []) ?? "Đang chờ Ba Mẹ · Ba Mẹ trả lời là máy báo con ngay.")
          .font(.system(size: 14, weight: .semibold)).foregroundColor(ClayMau.ngocInk).fixedSize(horizontal: false, vertical: true)
        Button("‹ Sửa lời xin") { xin.moi() }.buttonStyle(.plain)
          .font(.system(size: 13, weight: .bold)).foregroundColor(ClayMau.chu2)
      } else {
        Text(ngoaiLe ? "Xin mở ngoại lệ" : "Xin Ba Mẹ thêm giờ").font(.system(size: 20, weight: .bold))
        if ngoaiLe {
          Text("Ba Mẹ đồng ý thì máy mới mở").font(.system(size: 13)).foregroundColor(ClayMau.chu3)
        } else if let q = tray.tt.flatMap(TrayLogic.dongQuy) {
          Text("Giờ chơi còn \(q)").font(.system(size: 13)).foregroundColor(ClayMau.chu3)
        }
        Text(ngoaiLe ? "Mở bao lâu?" : "Con xin thêm").font(.system(size: 13, weight: .semibold)).foregroundColor(ClayMau.chu3)
        ChipClay(ds: (ngoaiLe ? TrayLogic.luaChonNgoaiLe : TrayLogic.luaChonPhut).map { ($0, TrayLogic.nhanLuaChonPhut($0)) }, chon: $phut)
          .onAppear { phut = ngoaiLe ? TrayLogic.luaChonNgoaiLe[0] : 20 }
          .onChange(of: ngoaiLe) { nl in phut = nl ? TrayLogic.luaChonNgoaiLe[0] : 20 }
        if ngoaiLe {
          Text("Vì sao con cần?").font(.system(size: 13, weight: .semibold)).foregroundColor(ClayMau.chu3)
          ChipClay(ds: XinThemView.lyDoNhanh.map { ($0, $0) }, chon: $loiNhan)
        }
        TextField(ngoaiLe ? "Tự viết…" : "Nhắn Ba Mẹ: con làm nốt bài với bạn ạ", text: $loiNhan)
          .textFieldStyle(.plain).font(.system(size: 14)).padding(.horizontal, 14).frame(minHeight: 44)
          .foregroundColor(ClayMau.chu).clayLom()
        Button(ngoaiLe ? "Gửi Ba Mẹ: mở \(phut) phút" : "Xin Ba Mẹ thêm \(phut) phút") {
          if ngoaiLe { xin.xinNgoaiLe(phut: phut, loiNhan: loiNhan) } else { xin.xinThem(phut: phut, loiNhan: loiNhan) }
        }
        .buttonStyle(NutClayStyle(kieu: .ngoc)).disabled(xin.dangGui)
        if ngoaiLe { Text("Không trừ giờ chơi, không trừ sao").font(.system(size: 12)).foregroundColor(ClayMau.chu3) }
        if !ngoaiLe, moChoi != nil || moXinApp != nil {
          HStack(spacing: 24) {
            if let moChoi, let t = tray.tt, ChoiBangDiem.hienNut(duocDoiDiem: t.duocDoiDiem || t.quyConPhut != nil, lyDoKhoa: t.lyDoKhoa, matMang: t.matMang, dsChoi: []) {
              Button("Đổi sao lấy giờ ›", action: moChoi).buttonStyle(.plain)
            }
            if let moXinApp { Button("Xin mở app ›", action: moXinApp).buttonStyle(.plain) }
          }
          .font(.system(size: 13, weight: .bold)).foregroundColor(ClayMau.ngocInk)
        }
        if !xin.thongBao.isEmpty, !xin.daGui {
          Text(xin.thongBao).font(.system(size: 14, weight: .medium)).foregroundColor(ClayMau.loi).fixedSize(horizontal: false, vertical: true)
        }
      }
    }
    .foregroundColor(ClayMau.chu)
    .animation(ClayMotion.bat, value: xin.daGui)
  }
}

struct XinThemCuaSo: View {
  @ObservedObject var tray: TrayModel
  @ObservedObject var xin: XinModel
  var moChoi: (() -> Void)? = nil
  var moXinApp: (() -> Void)? = nil
  /// Giờ học (05/11): không thêm giờ được — chỉ xin mở ngoại lệ.
  var ngoaiLe = false
  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      XinThemView(tray: tray, xin: xin, moChoi: moChoi, moXinApp: moXinApp, ngoaiLe: ngoaiLe)
        .padding(18).clayThe().vaoLanLuot(0)
      HStack(spacing: 6) {
        HinhFluent(ten: "seedling", duPhong: "leaf.fill", co: 16)
        Text(TrayLogic.dongDangBat).font(.system(size: 12)).foregroundColor(ClayMau.chu3)
      }
      .padding(.horizontal, 6).vaoLanLuot(1)
    }
    .padding(22).padding(.bottom, 12).frame(width: 440).nenClay()   // đáy dư cho bóng thẻ (lệch 16 + mờ 15)
  }
}

struct XinMoView: View {
  static let loaiMo = [("web", "Trang web"), ("app", "App")]
  @ObservedObject var tray: TrayModel
  @ObservedObject var xin: XinModel
  /// Mở từ màn «… chưa được mở»: điền sẵn app vừa bị chặn.
  var appBanDau: String = ""
  @State private var loai = "web"
  @State private var muc = ""
  @State private var loiNhan = ""
  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 12) {
        VienClay(ten: loai == "web" ? "globe_with_meridians" : "puzzle_piece", duPhong: loai == "web" ? "globe" : "app.fill",
                 nen: loai == "web" ? ClayMau.lamSoft : ClayMau.timSoft, co: 44)
          .id(loai).transition(.scale(scale: 0.85).combined(with: .opacity))
        Text("Con muốn mở gì?").font(.system(size: 17, weight: .bold))
      }
      // Hai nút kẹo thay segmented Picker (cao 24pt, dưới vùng bấm 44): cùng kiểu chip phút của «Xin thêm giờ».
      ChipClay(ds: XinMoView.loaiMo, chon: $loai)
      TextField(loai == "web" ? "Địa chỉ trang, ví dụ youtube.com" : "Tên app", text: $muc)
        .textFieldStyle(.plain).font(.system(size: 14)).padding(.horizontal, 14).frame(minHeight: 44).clayLom()
      Text("Nhắn Ba Mẹ (không bắt buộc)").font(.system(size: 12, weight: .medium)).foregroundColor(ClayMau.chu3)
      TextField("Con cần mở để làm gì?", text: $loiNhan)
        .textFieldStyle(.plain).font(.system(size: 14)).padding(.horizontal, 14).frame(minHeight: 44).clayLom()
      Button("Xin Ba Mẹ") { xin.xinMo(muc: muc.trimmingCharacters(in: .whitespaces), loai: loai, loiNhan: loiNhan) }
        .buttonStyle(NutClayStyle(kieu: .thanChi)).disabled(xin.dangGui || muc.trimmingCharacters(in: .whitespaces).isEmpty)
      let dong = TrayLogic.dongYeuCau(tray.tt?.yeuCauCho ?? []) ?? xin.thongBao
      if !dong.isEmpty { Text(dong).font(.system(size: 14, weight: .medium)).fixedSize(horizontal: false, vertical: true) }
    }
    .padding(18).clayThe().vaoLanLuot(0)
    .padding(22).padding(.bottom, 12).frame(width: 440).nenClay()   // đáy dư cho bóng thẻ (lệch 16 + mờ 15)
    .onAppear { if muc.isEmpty, !appBanDau.isEmpty { loai = "app"; muc = appBanDau } }
  }
}

/// Cửa sổ «Ghép máy» của Ba Mẹ (phiên admin, máy chưa ghép) — thiết kế con-cai-mac 03 mã 6 số · 04 một chạm · 05 mã sai · 06 hết hạn ·
/// 07 mất mạng · 08 bật quyền · 09 xong (máy khoá + «Mở màn chọn tên»).
struct GhepMayView: View {
  let taiKhoan: [String]
  /// Gói cài một chạm (token trong tên .pkg) ⇒ chỉ chọn tài khoản của Con, không hỏi mã 6 số (vẫn có lối «Dùng mã 6 số»).
  var coGoiCai = false
  /// Đọc cờ gói cài TƯƠI từ trạng thái (postinstall có thể ghi token sau khi cửa sổ đã mở).
  @ObservedObject var tray: TrayModel = TrayModel()
  var khiGui: (Bool) -> Void = { _ in }        // true = bắt đầu gửi lệnh ghép (đặt cờ TRƯỚC IPC), false = đã có phản hồi
  var khiCanhBao: () -> Void = {}
  var dongLai: () -> Void
  /// Bắt đầu ở màn nào (chụp duyệt).
  var manDau: ManGhep = .nhap
  @State private var man: ManGhep = .nhap
  @State private var chon = ""
  @State private var ma = ""
  @State private var loi = ""
  @State private var dangGui = false
  @State private var canhBao = ""
  @State private var dangChonFocus = false
  @State private var dungMa = false
  @State private var quyenTB: Bool?
  private var motCham: Bool { (coGoiCai || tray.tt?.coGoiCai == true) && !dungMa }
  private var khoaNhap: Bool { dangGui }

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      buoc
      switch man {
      case .nhap: nhap
      case .maSai: loiMa(tieu: "Mã chưa đúng", phu: "So từng số với mã trên điện thoại Ba Mẹ nhé.",
                         ghi: "Mã quá 10 phút? Ba Mẹ bấm «Lấy mã mới» trong AiiGrow › Ghép máy.", nut: "Gõ lại mã")
      case .hetHan: loiMa(tieu: "Mã ghép đã hết hạn", phu: "Mã chỉ dùng được 10 phút. Ba Mẹ lấy mã mới nhé.",
                          ghi: "✓ Chưa ghép gì · tài khoản macOS \(chon) vẫn giữ", nut: "Gõ mã mới")
      case .matMang: matMang
      case .batQuyen: batQuyen
      case .xong: xong
      }
    }
    .padding(22).clayThe().vaoLanLuot(0)
    .padding(18).padding(.bottom, 10).frame(width: 470).nenClay()
    .foregroundColor(ClayMau.chu)
    .animation(ClayMotion.bat, value: man)
    .onAppear { if chon.isEmpty { chon = taiKhoan.first ?? "" }; man = manDau }
  }

  private var buoc: some View {
    let so = man == .batQuyen ? 4 : 3
    return HStack(spacing: 5) {
      ForEach(1...4, id: \.self) { i in
        Capsule().fill(i <= so ? ClayMau.ngoc : ClayMau.lom).frame(width: 28, height: 7)
      }
      Text(man == .xong ? "Xong" : man == .batQuyen ? "Bước 4/4 · Cho phép" : "Bước 3/4 · Ghép máy")
        .font(.system(size: 12, weight: .bold)).foregroundColor(ClayMau.ngocInk).padding(.leading, 6)
    }
  }

  // 03 / 04
  @ViewBuilder private var nhap: some View {
    Text("Ghép Mac của con").font(.system(size: 22, weight: .bold))
    Chu(motCham ? "Gói cài đã có mã của nhà mình. Chỉ cần một chạm." : "Gõ mã 6 số trong app AiiGrow của Ba Mẹ.", co: 14, mau: ClayMau.chu3)
    if motCham {
      HStack(spacing: 12) {
        VienClay(ten: "link", duPhong: "link", nen: ClayMau.ngocSoft, co: 44)
        VStack(alignment: .leading, spacing: 2) {
          Text("Nhà của con").font(.system(size: 16, weight: .bold))
          Text("Mã gắn sẵn trong gói cài").font(.system(size: 12)).foregroundColor(ClayMau.chu3)
        }
      }
      .padding(14).frame(maxWidth: .infinity, alignment: .leading).clayLom(bo: 18)
    }
    chonTaiKhoan
    if !motCham {
      TextField("Mã 6 số", text: Binding(get: { ma }, set: { ma = TrayLogic.locMa($0) }))
        .textFieldStyle(.plain).font(.system(size: 24, weight: .bold, design: .monospaced))
        .frame(height: 32).padding(.horizontal, 14).frame(minHeight: 50).clayLom(bo: 18)
        .onSubmit { gui() }
      Text("Mã dùng được 10 phút").font(.system(size: 12)).foregroundColor(ClayMau.chu3)
    }
    if !loi.isEmpty { Chu(loi, co: 13, dam: .medium, mau: ClayMau.loi) }
    Button(dangGui ? "Đang ghép…" : (motCham ? "Ghép vào nhà mình" : "Ghép Mac của con")) { gui() }
      .buttonStyle(NutClayStyle(kieu: .ngoc)).disabled(khoaNhap || (!motCham && !TrayLogic.maHopLe(ma)) || chon.isEmpty)
    if coGoiCai || tray.tt?.coGoiCai == true {
      Button(dungMa ? "Có link Ba Mẹ gửi? Ghép một chạm ›" : "Dùng mã 6 số thay vì gói cài ›") { dungMa.toggle(); loi = "" }
        .buttonStyle(.plain).font(.system(size: 13, weight: .bold)).foregroundColor(ClayMau.ngocInk).disabled(khoaNhap)
    }
    Text("Bấm ghép là Ba Mẹ đồng ý Điều khoản AiiGrow. Tài khoản của con về quyền người dùng thường (cần còn một tài khoản quản trị khác).")
      .font(.system(size: 11)).foregroundColor(ClayMau.chu3).fixedSize(horizontal: false, vertical: true)
  }

  @ViewBuilder private var chonTaiKhoan: some View {
    if taiKhoan.isEmpty {
      Chu("Chưa thấy tài khoản nào khác trên máy. Hãy tạo tài khoản cho con ở Cài đặt hệ thống → Người dùng & Nhóm.", co: 13, mau: ClayMau.loi)
    } else {
      // Ô chọn Clay cao 48 thay pop-up hệ thống: nhãn Clay bên dưới, NSPopUpButton thật trong suốt phủ kín ô.
      HStack(spacing: 8) {
        Text("Tài khoản macOS của con").font(.system(size: 13)).foregroundColor(ClayMau.chu3)
        Spacer(minLength: 8)
        Text(chon).font(.system(size: 15, weight: .semibold)).foregroundColor(ClayMau.chu).lineLimit(1).truncationMode(.middle)
        Image(systemName: "chevron.up.chevron.down").font(.system(size: 11, weight: .bold)).foregroundColor(ClayMau.chu3)
      }
      .padding(.horizontal, 16).frame(maxWidth: .infinity, minHeight: 48)
      .accessibilityHidden(true)
      .clayLom(bo: 18)
      .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(ClayMau.ngoc, lineWidth: 2.5).opacity(dangChonFocus && !khoaNhap ? 1 : 0))
      .overlay(ChonPopUp(ds: taiKhoan, chon: $chon, tieuDe: "Tài khoản macOS của con", focus: $dangChonFocus))
      .disabled(khoaNhap)
      .opacity(khoaNhap ? 0.5 : 1)
    }
  }

  // 05 / 06
  @ViewBuilder private func loiMa(tieu: String, phu: String, ghi: String, nut: String) -> some View {
    HStack(spacing: 12) {
      VienClay(ten: "stop_sign", duPhong: "exclamationmark.triangle.fill", nen: ClayMau.canhSoft, co: 48)
      VStack(alignment: .leading, spacing: 2) {
        Text(tieu).font(.system(size: 21, weight: .bold))
        Chu(phu, co: 13, mau: ClayMau.chu3, dong: 2)
      }
    }
    if !ma.isEmpty {
      Text(ManMac.maHien(ma)).font(.system(size: 26, weight: .bold, design: .monospaced)).foregroundColor(ClayMau.canh)
        .padding(.horizontal, 16).frame(maxWidth: .infinity, minHeight: 52, alignment: .leading).clayLom(bo: 18)
    }
    Chu(ghi, co: 13, dam: .semibold, mau: ClayMau.chu2, dong: 2)
    Button(nut) { ma = ""; loi = ""; man = .nhap }.buttonStyle(NutClayStyle(kieu: .ngoc))
  }

  // 07
  @ViewBuilder private var matMang: some View {
    HStack(spacing: 12) {
      VienClay(ten: "globe_with_meridians", duPhong: "wifi.slash", nen: ClayMau.canhSoft, co: 48)
      VStack(alignment: .leading, spacing: 2) {
        Text("Máy chưa vào được mạng").font(.system(size: 21, weight: .bold))
        Chu("Bật lại Wi-Fi rồi bấm «Thử lại».", co: 13, mau: ClayMau.chu3, dong: 1)
      }
    }
    VStack(alignment: .leading, spacing: 6) {
      Text("Kiểm Wi-Fi").font(.system(size: 14, weight: .bold))
      Chu("Bấm Wi-Fi trên thanh menu › chọn mạng nhà", co: 13, mau: ClayMau.chu3, dong: 1)
      if !ma.isEmpty {
        Text("Mã \(ManMac.maHien(ma)) vẫn giữ").font(.system(size: 14, weight: .bold)).padding(.top, 4)
        Chu("Trong 10 phút không cần gõ lại.", co: 13, mau: ClayMau.chu3, dong: 1)
      }
    }
    .padding(14).frame(maxWidth: .infinity, alignment: .leading).clayLom(bo: 18)
    HStack(spacing: 12) {
      Button("Quay lại") { man = .nhap }.buttonStyle(NutClayStyle(kieu: .sang))
      Button(dangGui ? "Đang thử…" : "Thử lại") { gui() }.buttonStyle(NutClayStyle(kieu: .ngoc)).disabled(dangGui)
    }
  }

  // 08
  @ViewBuilder private var batQuyen: some View {
    Text("Đã ghép nhà mình").font(.system(size: 13, weight: .bold)).foregroundColor(ClayMau.ngocInk)
    Text("Bật 3 quyền").font(.system(size: 22, weight: .bold))
    dongQuyen("hourglass_not_done", "Thời gian sử dụng", "Để giữ giờ chơi", bat: true, mo: GhepMayView.caiDatThoiGian)
    dongQuyen("speech_balloon", "Thông báo", "Để nhắc «còn 5 phút»", bat: quyenTB == true, mo: GhepMayView.caiDatThongBao)
    dongQuyen("desktop_computer", "Mở cùng máy", "AiiGrow tự chạy khi bật Mac",
              bat: FileManager.default.fileExists(atPath: DuongDan.trayPlist), mo: GhepMayView.caiDatMoCungMay)
    if quyenTB != true {
      Chu("Cách bật «Thông báo»: 1. Cài đặt hệ thống · 2. Thông báo › AiiGrow · 3. Cho phép", co: 12, mau: ClayMau.chu3, dong: 2)
    }
    if !canhBao.isEmpty {
      Text("Đã ghép máy, NHƯNG: " + canhBao).font(.system(size: 13, weight: .semibold)).foregroundColor(ClayMau.canh).fixedSize(horizontal: false, vertical: true)
    }
    Button("Bật xong, xem máy") { man = .xong }.buttonStyle(NutClayStyle(kieu: .ngoc))
      .task { await kiemThongBao() }
  }

  private func dongQuyen(_ icon: String, _ ten: String, _ phu: String, bat: Bool, mo: URL?) -> some View {
    HStack(spacing: 12) {
      VienClay(ten: icon, duPhong: "checkmark", nen: bat ? ClayMau.ngocSoft : ClayMau.the, co: 40)
      VStack(alignment: .leading, spacing: 1) {
        Text(ten).font(.system(size: 15, weight: .bold))
        Text(phu).font(.system(size: 12)).foregroundColor(ClayMau.chu3)
      }
      Spacer()
      if bat {
        Text("✓ Đã bật").font(.system(size: 13, weight: .bold)).foregroundColor(ClayMau.ngocInk)
      } else {
        Text("Chưa bật").font(.system(size: 12)).foregroundColor(ClayMau.canh)
        Button("Mở") { if let mo { NSWorkspace.shared.open(mo) } }.buttonStyle(NutClayStyle(kieu: .sang, bo: 14, cao: 44)).frame(width: 80)
      }
    }
    .padding(.horizontal, 12).padding(.vertical, 6).clayLom(bo: 18)
  }

  // 09
  @ViewBuilder private var xong: some View {
    HStack { Spacer(); VienClay(ten: "party_popper", duPhong: "checkmark.seal.fill", nen: ClayMau.ngocSoft, co: 64); Spacer() }
    Text("Máy đã sẵn sàng cho cả nhà!").font(.system(size: 22, weight: .bold)).frame(maxWidth: .infinity)
    Chu("Mỗi bé vào máy bằng tên + PIN 4 số.", co: 14, mau: ClayMau.chu3, dong: 1)
    VStack(alignment: .leading, spacing: 8) {
      Chu("⏱  Giờ tính theo từng bé · Điện thoại + Mac trừ chung", co: 13, dam: .semibold, dong: 1)
      Chu("🔑  PIN do Ba Mẹ đặt trong app", co: 13, dam: .semibold, dong: 1)
      Chu("🛡  Chỉ mở app Ba Mẹ cho · App mới thì xin Ba Mẹ", co: 13, dam: .semibold, dong: 1)
    }
    .padding(14).frame(maxWidth: .infinity, alignment: .leading).clayLom(bo: 18)
    Button("Mở màn chọn tên") { khiGui(false); dongLai(); NhuongMay.khoaManHinh() }.buttonStyle(NutClayStyle(kieu: .ngoc))
    Chu("Máy khoá lại; các bé đăng nhập tài khoản «\(chon)» rồi chọn tên + PIN.", co: 11, mau: ClayMau.chu3, dong: 2)
  }

  static let caiDatThongBao = URL(string: "x-apple.systempreferences:com.apple.Notifications-Settings.extension")
  static let caiDatMoCungMay = URL(string: "x-apple.systempreferences:com.apple.LoginItems-Settings.extension")
  static let caiDatThoiGian = URL(string: "x-apple.systempreferences:com.apple.Screen-Time-Settings.extension")

  private func kiemThongBao() async {
    guard Bundle.main.bundleURL.pathExtension == "app" else { quyenTB = false; return }
    let st = await UNUserNotificationCenter.current().notificationSettings()
    quyenTB = st.authorizationStatus == .authorized
  }

  private func gui() {
    guard !dangGui else { return }
    dangGui = true; loi = ""; khiGui(true)
    let ma = motCham ? "" : self.ma, chon = self.chon
    Task {
      defer { dangGui = false }                                  // thành công: KHÔNG khiGui(false) — cửa sổ giữ tới khi Ba Mẹ bấm «Mở màn chọn tên»
      do {
        switch try await IPCClient.guiAsync(.ghep(ma: ma, taiKhoanCon: chon), giay: 40) {
        case .loi(let mx, let chu):
          khiGui(false)
          if let m = ManMac.manLoiGhep(mx) { man = m } else { loi = chu; man = .nhap }
          if LoiApi.maTokenGoiHong.contains(mx) && motCham { dungMa = true }   // token gói hỏng ⇒ hiện ô mã 6 số
        case .canhBao(_, let chu): canhBao = chu; khiCanhBao(); man = .batQuyen
        default: man = .batQuyen
        }
      } catch { loi = "AiiGrow đang khởi động lại, Ba Mẹ thử lại sau vài giây nhé."; khiGui(false) }
    }
  }
}

/// Màn toàn màn hình theo bé (thiết kế con-cai-mac 32 đếm ngược, 33 hết giờ, 35–39 giờ ngủ, 58 mất mạng): nền sáng, Grow bên trái,
/// tiêu đề + câu, thẻ sao «Đổi 10 sao», «Xin Ba Mẹ thêm giờ» / «Xin Ba Mẹ mở ngoại lệ», «Nhắn Ba Mẹ», link nhỏ «Mất mạng? Mở bằng mã
/// của Ba Mẹ ›» · «Đổi bé ›» · «Ba Mẹ mở máy ›». Khối xin / đổi sao / mã mở ra NGAY trên màn (cửa sổ khác không nổi trên màn khoá).
struct ManKhoaView: View {
  @ObservedObject var tray: TrayModel
  @ObservedObject var xin: XinModel
  /// Sao con đang có + tỷ lệ (app Con đã tải) — nil = chưa biết (ẩn thẻ sao). `app` (nếu có) thắng: số sao cập nhật sống.
  var sao: Int? = nil
  var phut10Sao: Int = 10
  @ObservedObject var app: AppConModel = AppConModel(goi: { _ in .loi(ma: "", chu: "") })
  private var saoHien: Int? { app.tq?.soDu ?? sao }
  private var tyLe: Int { app.tq?.quy?.phut10Sao ?? phut10Sao }
  var doiBe: () -> Void = {}
  var baMeMoMay: () -> Void = {}
  enum Khoi: Equatable { case khong, xin, doiSao, ma }
  @State private var khoi: Khoi = .khong
  @StateObject private var choi = ChoiModel()

  private var ten: String { tray.tt?.beTen ?? tray.tt?.tenCon ?? "Con" }

  var body: some View {
    NenManSang(chan: "AiiGrow · \(ten) đang dùng · Mac của cả nhà · máy do Ba Mẹ quản lý") {
      TimelineView(.periodic(from: .now, by: 1)) { ctx in
        HStack(alignment: .center, spacing: 50) {
          RobView(ten: tray.tt?.lyDoKhoa == "gio_ngu" ? "xong" : "trong-loi", cao: 380).frame(width: 380)
          noiDung(bayGio: ctx.date).frame(width: 560, alignment: .leading)
        }
        .padding(.horizontal, 60)
      }
    }
  }

  @ViewBuilder private func noiDung(bayGio: Date) -> some View {
    let man = TrayLogic.chonMan(tray.tt)
    VStack(alignment: .leading, spacing: 16) {
      switch man {
      case .demNguoc(let giay, _):
        let con = max(0, Double(giay) - bayGio.timeIntervalSince(tray.nhanLuc))
        Text("Sắp hết giờ chơi").font(.system(size: 38, weight: .bold))
        HStack(alignment: .firstTextBaseline, spacing: 10) {
          Text("Lưu bài đang làm nhé. Máy khoá sau").font(.system(size: 17)).foregroundColor(ClayMau.chu2)
          Text(TrayLogic.dongHo(con)).font(.system(size: 40, weight: .bold, design: .rounded)).monospacedDigit().foregroundColor(ClayMau.ngocInk)
        }
        nutHanhDong(ngoaiLe: TrayLogic.chiNgoaiLe(tray.tt?.lyDoKhoa))
      case .khoa:
        if let t = tray.tt {
          let c = ManMac.chuKhoa(t)
          if let n = c.nhan { VienNho(chu: n, icon: "alarm_clock") }
          if t.matMang { VienNho(chu: "Mất mạng · " + AppConView.gioPhut.string(from: bayGio), mau: ClayMau.canh) }
          Text(t.matMang && !c.ngoaiLe ? "Mất mạng, luật vẫn vậy nhé!" : c.tieuDe).font(.system(size: 38, weight: .bold)).fixedSize(horizontal: false, vertical: true)
          Text(t.matMang && !c.ngoaiLe ? c.tieuDe + " · " + c.phu : c.phu).font(.system(size: 17)).foregroundColor(ClayMau.chu2).fixedSize(horizontal: false, vertical: true)
          nutHanhDong(ngoaiLe: c.ngoaiLe)
        }
      case .khong:
        EmptyView()
      }
    }
  }

  @ViewBuilder private func nutHanhDong(ngoaiLe: Bool) -> some View {
    let t = tray.tt
    if !ngoaiLe, let sao = saoHien, t?.matMang != true {
      HStack(spacing: 14) {
        VienClay(ten: "star", duPhong: "star.fill", nen: ClayMau.the, co: 54)
        VStack(alignment: .leading, spacing: 2) {
          Text("Con có \(sao) sao").font(.system(size: 21, weight: .bold)).foregroundColor(ClayMau.diemInk)
          Text("10 sao = \(tyLe) phút chơi").font(.system(size: 13)).foregroundColor(ClayMau.diemInk)
        }
        Spacer()
        Button { withAnimation(ClayMotion.bat) { khoi = khoi == .doiSao ? .khong : .doiSao } } label: {
          HStack(spacing: 6) { HinhFluent(ten: "star", duPhong: "star.fill", co: 20); Text("Đổi \(DungSao.saoCan(phut: 10, phut10Sao: tyLe)) sao") }
        }
        .buttonStyle(NutClayStyle(kieu: .ngoc, bo: 24, cao: 52)).frame(width: 220).disabled(sao < DungSao.saoCan(phut: 10, phut10Sao: tyLe))
      }
      .padding(18).clayThe(bo: 30, nen: ClayMau.diemSoft)
    }
    HStack(spacing: 14) {
      Button { xin.moi(); withAnimation(ClayMotion.bat) { khoi = khoi == .xin ? .khong : .xin } } label: {
        HStack(spacing: 8) { HinhFluent(ten: "hourglass_not_done", duPhong: "hourglass", co: 22); Text(ngoaiLe ? "Xin Ba Mẹ mở ngoại lệ" : "Xin Ba Mẹ thêm giờ") }
      }
      .buttonStyle(NutClayStyle(kieu: .sang, bo: 26, cao: 54))
      Button { xin.moi(); withAnimation(ClayMotion.bat) { khoi = .xin } } label: {
        HStack(spacing: 8) { HinhFluent(ten: "speech_balloon", duPhong: "bubble.left.fill", co: 22); Text("Nhắn Ba Mẹ") }
      }
      .buttonStyle(NutClayStyle(kieu: .sang, bo: 26, cao: 54))
    }
    switch khoi {
    case .xin:
      XinThemView(tray: tray, xin: xin, ngoaiLe: ngoaiLe).padding(20).clayThe(bo: 28).vaoLanLuot(0)
    case .doiSao:
      DoiSaoView(sao: saoHien ?? 0, phut10Sao: tyLe, m: choi, conPhut: t?.quyConPhut ?? 0, dong: { khoi = .khong })
        .padding(20).clayThe(bo: 28).vaoLanLuot(0)
    case .ma:
      MaOfflineView().padding(20).clayThe(bo: 28).vaoLanLuot(0)
    case .khong:
      EmptyView()
    }
    VStack(alignment: .leading, spacing: 14) {
      if t?.nhapMaOffline == true || t?.matMang == true {
        Button { withAnimation(ClayMotion.bat) { khoi = khoi == .ma ? .khong : .ma } } label: {
          HStack(spacing: 8) { HinhFluent(ten: "key", duPhong: "key.fill", co: 20); Text("Mất mạng? Mở bằng mã của Ba Mẹ ›") }
        }
        .buttonStyle(.plain).font(.system(size: 15, weight: .bold)).foregroundColor(ClayMau.ngocInk)
      }
      HStack(spacing: 40) {
        if t?.mayRieng != true, t?.nguoiDung != nil {
          Button(action: doiBe) { HStack(spacing: 6) { HinhFluent(ten: "seedling", duPhong: "person.2.fill", co: 18); Text("Đổi bé ›") } }
            .buttonStyle(.plain)
        }
        Button(action: baMeMoMay) { HStack(spacing: 6) { HinhFluent(ten: "key", duPhong: "key.fill", co: 18); Text("Ba Mẹ mở máy ›") } }
          .buttonStyle(.plain)
      }
      .font(.system(size: 14, weight: .bold)).foregroundColor(ClayMau.chu2)
    }
    .padding(.top, 4)
  }
}

/// Đổi sao lấy giờ (thiết kế 49 / 50 / 51): − 10 phút + · «trừ 10 sao» · «Còn 20 sao · giờ chơi thành 28 phút» · «Đổi 10 sao lấy 10 phút»;
/// chưa đủ ⇒ «Chưa đủ sao · Đổi 40 phút cần 40 sao · 30 / 40 sao · Còn thiếu 10 sao».
struct DoiSaoView: View {
  let sao: Int
  var phut10Sao = 10
  @ObservedObject var m: ChoiModel
  /// Giờ chơi còn (phút) để ghi «giờ chơi thành …».
  var conPhut = 0
  var xinThem: (() -> Void)? = nil
  var lamNhiemVu: (() -> Void)? = nil
  var dong: () -> Void = {}
  @State private var phut = 10

  var body: some View {
    let d = ManMac.doiSao(phut: phut, sao: sao, phut10Sao: phut10Sao)
    VStack(alignment: .leading, spacing: 12) {
      if m.xong {
        HStack(spacing: 12) {
          VienClay(ten: "party_popper", duPhong: "checkmark.seal.fill", nen: ClayMau.ngocSoft, co: 52)
          VStack(alignment: .leading, spacing: 2) {
            Text("Đã đổi \(d.saoCan) sao · +\(phut) phút").font(.system(size: 20, weight: .bold))
            Text("Giờ chơi còn \(conPhut + phut) phút · con còn \(d.conSao) sao").font(.system(size: 14)).foregroundColor(ClayMau.chu3)
          }
        }
        Button("Chơi tiếp \(conPhut + phut) phút", action: dong).buttonStyle(NutClayStyle(kieu: .ngoc))
      } else {
        HStack(spacing: 12) {
          VienClay(ten: "star", duPhong: "star.fill", nen: ClayMau.diemSoft, co: 48)
          VStack(alignment: .leading, spacing: 0) {
            Text(d.du ? "Con đang có" : "Chưa đủ sao").font(.system(size: 13)).foregroundColor(ClayMau.chu3)
            Text(d.du ? "\(sao) sao" : "Đổi \(phut) phút cần \(d.saoCan) sao").font(.system(size: 22, weight: .bold)).foregroundColor(ClayMau.diemInk)
          }
          Spacer()
          Text("10 sao = \(phut10Sao) phút").font(.system(size: 13, weight: .semibold)).foregroundColor(ClayMau.diemInk)
        }
        HStack(spacing: 12) {
          Text("Con đổi").font(.system(size: 14)).foregroundColor(ClayMau.chu3)
          Button { phut = ManMac.buocPhut(phut, them: false) } label: { Text("−").font(.system(size: 20, weight: .bold)) }
            .buttonStyle(NutClayStyle(kieu: .sang, bo: 14, cao: 44)).frame(width: 52).disabled(phut <= 10 || m.dangGui)
          VStack(spacing: 0) {
            Text("\(phut) phút").font(.system(size: 20, weight: .bold)).monospacedDigit()
            Text("trừ \(d.saoCan) sao").font(.system(size: 12)).foregroundColor(ClayMau.chu3)
          }
          .frame(minWidth: 96)
          Button { phut = ManMac.buocPhut(phut, them: true) } label: { Text("+").font(.system(size: 20, weight: .bold)) }
            .buttonStyle(NutClayStyle(kieu: .sang, bo: 14, cao: 44)).frame(width: 52).disabled(phut >= 60 || m.dangGui)
        }
        if d.du {
          Text("Còn \(d.conSao) sao · giờ chơi thành \(conPhut + phut) phút").font(.system(size: 14, weight: .semibold)).foregroundColor(ClayMau.ngocInk)
        } else {
          Text("\(sao) / \(d.saoCan) sao · Còn thiếu \(d.thieu) sao").font(.system(size: 14, weight: .semibold)).foregroundColor(ClayMau.canh)
        }
        Button(d.du ? "Đổi \(d.saoCan) sao lấy \(phut) phút" : "Chọn ít phút hơn") {
          if d.du { Task { await m.doiSao(phut) } } else { phut = 10 }
        }
        .buttonStyle(NutClayStyle(kieu: d.du ? .ngoc : .sang)).disabled(m.dangGui)
        HStack(spacing: 20) {
          if let xinThem { Button("Xin Ba Mẹ thêm giờ ›", action: xinThem).buttonStyle(.plain) }
          if let lamNhiemVu { Button("Làm nhiệm vụ lấy thêm sao ›", action: lamNhiemVu).buttonStyle(.plain) }
        }
        .font(.system(size: 13, weight: .bold)).foregroundColor(ClayMau.ngocInk)
        if !m.thongBao.isEmpty, m.loi { Chu(m.thongBao, co: 13, dam: .semibold, mau: ClayMau.loi, dong: 2) }
      }
    }
    .foregroundColor(ClayMau.chu)
  }
}

/// Ô «Mất mạng? Nhập mã của Ba Mẹ» trên màn khoá (agent-win OfflineCodePanel): Ba Mẹ xem mã 6 số trong app, đọc cho Con gõ; daemon tự kiểm.
struct MaOfflineView: View {
  var gui: (String) async -> TraLoi = { ma in (try? await IPCClient.guiAsync(.maOffline(ma: ma))) ?? .loi(ma: "ipc", chu: "AiiGrow đang khởi động lại, con thử lại sau vài giây nhé.") }
  @State private var ma = ""
  @State private var cau = ""
  @State private var loi = false
  @State private var dangGui = false
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(spacing: 12) {
        VienClay(ten: "key", duPhong: "key.fill", nen: ClayMau.diemSoft, co: 44)
        VStack(alignment: .leading, spacing: 2) {
          Text("Mất mạng? Nhập mã của Ba Mẹ").font(.system(size: 17, weight: .bold)).lineLimit(1).truncationMode(.tail)
          Text("Ba Mẹ xem mã 6 số trong app AiiGrow và đọc cho con.").font(.system(size: 12)).foregroundColor(ClayMau.chu3).lineLimit(2)
        }
      }
      HStack(spacing: 12) {
        TextField("Mã 6 số", text: Binding(get: { ma }, set: { ma = TrayLogic.locMa($0) }))
          .textFieldStyle(.plain).font(.system(size: 22, weight: .medium, design: .monospaced))
          .padding(.horizontal, 14).frame(minHeight: 48).clayLom(bo: 18)
          .onSubmit { mo() }
        Button(dangGui ? "Đang kiểm…" : "Mở máy") { mo() }
          .buttonStyle(NutClayStyle(kieu: .thanChi)).frame(width: 150).disabled(dangGui || !TrayLogic.maHopLe(ma))
      }
      if !cau.isEmpty {
        Text(cau).font(.system(size: 14, weight: .semibold)).foregroundColor(loi ? ClayMau.loi : ClayMau.ngocInk).fixedSize(horizontal: false, vertical: true)
      }
    }
    .foregroundColor(ClayMau.chu)
  }
  private func mo() {
    guard !dangGui, TrayLogic.maHopLe(ma) else { return }
    dangGui = true
    let m = ma
    Task {
      let r = await gui(m)
      dangGui = false
      switch r {
      case .thongBao(let c): cau = c; loi = false
      case .loi(let mx, let c): cau = mx == "yeu_cau_sai" ? "Dịch vụ AiiGrow trên máy là bản cũ, chưa nhận mã này." : c; loi = true; ma = ""
      default: cau = "Chưa mở được."; loi = true
      }
    }
  }
}

/// Cửa sổ nhỏ nhắc «còn 5 phút / 1 phút» (thiết kế 31): «Còn 5 phút chơi · Lưu bài đang làm nhé · con có 30 sao · Đổi 10 sao · Xin thêm giờ».
struct NhacView: View {
  let phut: Int
  var sao: Int? = nil
  var doiSao: (() -> Void)? = nil
  var xinThem: (() -> Void)? = nil
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(spacing: 14) {
        VienClay(ten: "alarm_clock", duPhong: "clock.fill", nen: ClayMau.canhSoft, co: 48).rungChuong()
        VStack(alignment: .leading, spacing: 2) {
          Text("Còn \(phut) phút chơi").font(.system(size: 16, weight: .bold))
          Text("Lưu bài đang làm nhé" + (sao.map { " · con có \($0) sao" } ?? "")).font(.system(size: 13)).foregroundColor(ClayMau.chu3)
        }
      }
      if doiSao != nil || xinThem != nil {
        HStack(spacing: 10) {
          if let doiSao { Button("Đổi 10 sao", action: doiSao).buttonStyle(NutClayStyle(kieu: .ngoc, bo: 16, cao: 44)) }
          if let xinThem { Button("Xin thêm giờ", action: xinThem).buttonStyle(NutClayStyle(kieu: .sang, bo: 16, cao: 44)) }
        }
      }
    }
    .padding(16).frame(maxWidth: .infinity, alignment: .leading)
    .clayThe(bo: 26).vaoLanLuot(0)
    .padding(14).padding(.bottom, 18).frame(width: 340).nenClay()
    .foregroundColor(ClayMau.chu)
  }
}

/// Kính mờ trên nền tối (khung đồng hồ đếm ngược): nền trắng trong + men nửa trên + viền sáng.
struct KinhMo: View {
  var bo: CGFloat = 28
  var body: some View {
    let hinh = RoundedRectangle(cornerRadius: bo, style: .continuous)
    ZStack {
      hinh.fill(Color.white.opacity(0.09))
      hinh.fill(LinearGradient(stops: [
        .init(color: .white.opacity(0.18), location: 0), .init(color: .white.opacity(0.03), location: 0.45), .init(color: .clear, location: 0.5),
      ], startPoint: .top, endPoint: .bottom))
      hinh.strokeBorder(LinearGradient(colors: [.white.opacity(0.45), .white.opacity(0.06)], startPoint: .top, endPoint: .bottom), lineWidth: 1)
    }
    .shadow(color: .black.opacity(0.35), radius: 16, x: 0, y: 14)
  }
}

/// NSPopUpButton thật, trong suốt, phủ kín ô Clay: bấm chỗ nào trong ô cũng mở menu neo theo ô; bàn phím + VoiceOver như pop-up hệ thống.
struct ChonPopUp: NSViewRepresentable {
  let ds: [String]
  @Binding var chon: String
  let tieuDe: String
  @Binding var focus: Bool
  @Environment(\.isEnabled) private var bat

  /// Pop-up trong suốt tự vẽ vòng focus không thấy ⇒ báo ra để nhãn Clay vẽ viền ngọc thay.
  final class PopUpTrong: NSPopUpButton {
    var khiFocus: ((Bool) -> Void)?
    override func becomeFirstResponder() -> Bool { let ok = super.becomeFirstResponder(); if ok { khiFocus?(true) }; return ok }
    override func resignFirstResponder() -> Bool { let ok = super.resignFirstResponder(); if ok { khiFocus?(false) }; return ok }
  }

  final class Dieu: NSObject {
    var chon: Binding<String>
    init(_ c: Binding<String>) { chon = c }
    @objc func doi(_ b: NSPopUpButton) { if let t = b.titleOfSelectedItem { chon.wrappedValue = t } }
  }
  func makeCoordinator() -> Dieu { Dieu($chon) }
  func makeNSView(context: Context) -> PopUpTrong {
    let b = PopUpTrong(frame: .zero, pullsDown: false)
    let f = $focus
    b.khiFocus = { v in DispatchQueue.main.async { f.wrappedValue = v } }
    b.isBordered = false
    b.alphaValue = 0                          // AppKit vẫn chuyển bấm cho view alpha 0 (khác isHidden); nhãn Clay bên dưới là phần nhìn thấy
    b.target = context.coordinator; b.action = #selector(Dieu.doi(_:))
    b.setAccessibilityLabel(tieuDe)
    for h in [NSLayoutConstraint.Orientation.horizontal, .vertical] {   // để SwiftUI kéo giãn nút phủ kín ô 48pt (mặc định ôm cao 22)
      b.setContentHuggingPriority(.defaultLow - 1, for: h); b.setContentCompressionResistancePriority(.defaultLow - 1, for: h)
    }
    return b
  }
  func updateNSView(_ b: PopUpTrong, context: Context) {
    context.coordinator.chon = $chon
    if b.itemTitles != ds { b.removeAllItems(); b.addItems(withTitles: ds) }
    if ds.contains(chon) { if b.titleOfSelectedItem != chon { b.selectItem(withTitle: chon) } }
    else if let dau = ds.first { let c = $chon; DispatchQueue.main.async { c.wrappedValue = dau } }   // nhãn và giá trị gửi đi luôn khớp mục pop-up
    b.isEnabled = bat
  }
}

/// Nhóm chip chọn một (nút kẹo Clay 46pt): đang chọn = ngọc, còn lại = sứ; khe 14 để bóng (~7pt mỗi bên) hai nút không chồng nhau.
struct ChipClay<K: Hashable>: View {
  let ds: [(K, String)]
  @Binding var chon: K
  var body: some View {
    HStack(spacing: 14) {
      ForEach(ds, id: \.0) { k, nhan in
        Button(nhan) { withAnimation(ClayMotion.bat) { chon = k } }
          .buttonStyle(NutClayStyle(kieu: chon == k ? .ngoc : .sang))
          .accessibilityAddTraits(chon == k ? .isSelected : [])
      }
    }
    .padding(.vertical, 2)
  }
}
