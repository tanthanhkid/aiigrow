// Giao diện SwiftUI: xin mở trang/app, ghép máy, màn khoá toàn màn hình (xin vay sao ở SaoViews.swift).
// Chất liệu Clay gương + icon Fluent 3D + motion «vui»/«ánh men» (Clay.swift, docs/THIET-KE-CLAY.md).
import AppKit
import SwiftUI
import UserNotifications
import AiiGrowCore

/// «Xin mở app» (them-shh2qdpw, #258): xin Ba Mẹ thêm app / trang vào danh sách · «Đã gửi» (them-5ici9ysd).
struct XinMoView: View {
  static let loaiMo = [("app", "App"), ("web", "Trang web")]
  @ObservedObject var tray: TrayModel
  @ObservedObject var xin: XinModel
  /// Mở từ màn «… chưa có trong danh sách»: điền sẵn app vừa bị đóng.
  var appBanDau: String = ""
  var veHomNay: () -> Void = {}
  @State private var loai = "app"
  @State private var muc = ""
  @State private var loiNhan = ""
  private var ten: String { appBanDau.isEmpty ? "app hoặc trang" : appBanDau }
  private var phut: Int? { tray.tt?.moHet == true ? nil : (tray.tt?.phutSao ?? tray.tt?.soSao?.phutCon) }

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      if xin.daGui, let m = xin.mucDaXin {
        HStack(spacing: 12) {
          VienClay(ten: "speech_balloon", duPhong: "paperplane.fill", nen: ClayMau.ngocSoft, co: 48)
          VStack(alignment: .leading, spacing: 2) {
            Text("Đã gửi Ba Mẹ!").font(.system(size: 20, weight: .bold))
            Chu("Con xin thêm \(HocVienView.tenMucChoi(m)) vào danh sách", co: 14, mau: ClayMau.chu3, dong: 2)
          }
        }
        VStack(alignment: .leading, spacing: 2) {
          Text("Đang chờ Ba Mẹ").font(.system(size: 15, weight: .bold)).foregroundColor(ClayMau.ngocInk)
          Text("Có trả lời là máy báo ngay.").font(.system(size: 13)).foregroundColor(ClayMau.chu3)
        }
        Button("Về Hôm nay" + (phut.map { " · còn \(ChuSao.so($0)) sao" } ?? ""), action: veHomNay).buttonStyle(NutClayStyle(kieu: .ngoc))
        LinkNho(chu: "‹ Sửa lời xin") { xin.moi() }
      } else {
        HStack(spacing: 12) {
          VienClay(ten: loai == "web" ? "globe_with_meridians" : "puzzle_piece", duPhong: loai == "web" ? "globe" : "app.fill",
                   nen: loai == "web" ? ClayMau.lamSoft : ClayMau.timSoft, co: 44)
            .id(loai).transition(.scale(scale: 0.85).combined(with: .opacity))
          VStack(alignment: .leading, spacing: 2) {
            Chu("Xin mở \(ten)", co: 18, dam: .bold, dong: 1)
            Chu(loai == "web" ? "Trang này chưa có trong danh sách" : "App này chưa có trong danh sách", co: 13, mau: ClayMau.chu3, dong: 1)
          }
        }
        ChipClay(ds: XinMoView.loaiMo, chon: $loai)
        if appBanDau.isEmpty {
          TextField(loai == "web" ? "Địa chỉ trang, ví dụ youtube.com" : "Tên app", text: $muc)
            .textFieldStyle(.plain).font(.system(size: 14)).padding(.horizontal, 14).frame(minHeight: 44).clayLom()
        }
        VStack(alignment: .leading, spacing: 4) {
          Text("Ba Mẹ thêm vào danh sách là con mở được").font(.system(size: 14, weight: .bold)).foregroundColor(ClayMau.diemInk)
          Text("Nếu Tính phút: 1 phút = 1 sao" + (phut.map { " · con còn \(ChuSao.so($0)) sao" } ?? "")).font(.system(size: 13)).foregroundColor(ClayMau.diemInk)
        }
        .padding(14).frame(maxWidth: .infinity, alignment: .leading).clayThe(bo: 20, nen: ClayMau.diemSoft)
        TextField("Nhắn Ba Mẹ: con xem video vẽ tranh ạ", text: $loiNhan)
          .textFieldStyle(.plain).font(.system(size: 14)).padding(.horizontal, 14).frame(minHeight: 44).clayLom()
        let m = (appBanDau.isEmpty ? muc : appBanDau).trimmingCharacters(in: .whitespaces)
        Button("Xin Ba Mẹ mở " + (m.isEmpty ? (loai == "web" ? "trang" : "app") : HocVienView.tenMucChoi(m))) { xin.xinMo(muc: m, loai: loai, loiNhan: loiNhan) }
          .buttonStyle(NutClayStyle(kieu: .ngoc)).disabled(xin.dangGui || m.isEmpty)
        if !xin.thongBao.isEmpty, !xin.dangGui { Chu(xin.thongBao, co: 14, dam: .medium, mau: ClayMau.loi, dong: 3) }
      }
    }
    .padding(18).clayThe().vaoLanLuot(0)
    .padding(22).padding(.bottom, 12).frame(width: 440).nenClay()   // đáy dư cho bóng thẻ (lệch 16 + mờ 15)
    .foregroundColor(ClayMau.chu)
    .animation(ClayMotion.bat, value: xin.daGui)
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
    dongQuyen("hourglass_not_done", "Thời gian sử dụng", "Để tính phút chơi bằng sao", bat: true, mo: GhepMayView.caiDatThoiGian)
    dongQuyen("speech_balloon", "Thông báo", "Để nhắc «còn 5 sao»", bat: quyenTB == true, mo: GhepMayView.caiDatThongBao)
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
      Chu("⭐  Sao riêng từng bé · 1 sao = 1 phút chơi", co: 13, dam: .semibold, dong: 1)
      Chu("🔑  PIN do Ba Mẹ đặt trong app", co: 13, dam: .semibold, dong: 1)
      Chu("🛡  Chỉ mở app trong danh sách · App mới thì xin Ba Mẹ", co: 13, dam: .semibold, dong: 1)
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

/// Màn toàn màn hình theo bé (thiết kế con-cai-mac them-kofpo0dl «Hết sao rồi», them-2ndg9bu6 mất mạng + mã, Ba Mẹ khoá): nền sáng, Grow bên trái,
/// tiêu đề + câu, viên «Con còn 0 sao», «Xin Ba Mẹ cho vay sao» / «Nhắn Ba Mẹ» (khối xin mở NGAY trên màn — cửa sổ khác không nổi trên màn khoá),
/// link nhỏ «Mất mạng? Mở bằng mã của Ba Mẹ ›» · «Đổi bé ›» · «Ba Mẹ mở máy ›».
struct ManKhoaView: View {
  @ObservedObject var tray: TrayModel
  @ObservedObject var xin: XinModel
  @ObservedObject var app: AppConModel = AppConModel(goi: { _ in .loi(ma: "", chu: "") })
  var doiBe: () -> Void = {}
  var baMeMoMay: () -> Void = {}
  enum Khoi: Equatable { case khong, xin, ma, nhiemVu }
  @State private var khoi: Khoi = .khong

  private var ten: String { tray.tt?.beTen ?? tray.tt?.tenCon ?? "Con" }

  var body: some View {
    NenManSang(chan: "AiiGrow · \(ten) đang dùng · Mac của cả nhà · máy do Ba Mẹ quản lý") {
      TimelineView(.periodic(from: .now, by: 1)) { ctx in
        HStack(alignment: .center, spacing: 50) {
          RobView(ten: "trong-loi", cao: 380).frame(width: 380)
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
      case .demNguoc(let giay, let lyDo):
        let con = max(0, Double(giay) - bayGio.timeIntervalSince(tray.nhanLuc))
        let het = lyDo == "het_gio"
        Text(het ? "Sắp hết sao rồi" : "Ba Mẹ sắp khoá máy").font(.system(size: 38, weight: .bold))
        HStack(alignment: .firstTextBaseline, spacing: 10) {
          Text("Lưu bài đang làm nhé. Máy khoá sau").font(.system(size: 17)).foregroundColor(ClayMau.chu2)
          Text(TrayLogic.dongHo(con)).font(.system(size: 40, weight: .bold, design: .rounded)).monospacedDigit().foregroundColor(ClayMau.ngocInk)
        }
        nutHanhDong(hetSao: het)
      case .khoa:
        if let t = tray.tt {
          let c = ManMac.chuKhoa(t, phutDaChoi: app.tq?.quy?.daDung)
          if t.matMang { VienNho(chu: "Mất mạng · " + AppConView.gioPhut.string(from: bayGio), mau: ClayMau.canh) }
          Text(t.matMang ? "Mất mạng, luật vẫn vậy nhé!" : c.tieuDe).font(.system(size: 38, weight: .bold)).fixedSize(horizontal: false, vertical: true)
          Text(t.matMang && c.hetSao ? "Hết sao rồi · con còn 0 sao = 0 phút chơi." : t.matMang ? c.tieuDe + " · " + c.phu : c.phu)
            .font(.system(size: 17)).foregroundColor(ClayMau.chu2).fixedSize(horizontal: false, vertical: true)
          nutHanhDong(hetSao: c.hetSao)
        }
      case .khong:
        EmptyView()
      }
    }
  }

  /// «Làm nhiệm vụ» ngay trên màn khoá (cửa sổ app không nổi trên màn khoá): việc chưa làm + số sao; nộp bài trong app khi máy mở.
  @ViewBuilder private var nhiemVuNgay: some View {
    let ds = ManMac.nhomNhiemVu(app.tq?.nhiemVu ?? []).chuaLam
    VStack(alignment: .leading, spacing: 8) {
      Text(ds.isEmpty ? "Chưa có việc nào chờ làm" : "Việc con làm được để kiếm sao").font(.system(size: 17, weight: .bold))
      ForEach(Array(ds.prefix(5))) { v in
        HStack {
          Chu(v.ten, co: 15, dam: .semibold, dong: 1)
          Text("+\(ChuSao.vien(v.diem))").font(.system(size: 13, weight: .bold)).foregroundColor(ClayMau.diemInk)
            .padding(.horizontal, 10).padding(.vertical, 3).background(Capsule().fill(ClayMau.diemSoft)).fixedSize()
        }
      }
      Chu("Làm xong thì báo Ba Mẹ duyệt — có sao là máy mở lại, con nộp bài trong AiiGrow (mục Nhiệm vụ).", co: 13, mau: ClayMau.chu3)
    }
    .foregroundColor(ClayMau.chu)
  }

  @ViewBuilder private func nutHanhDong(hetSao: Bool) -> some View {
    let t = tray.tt
    if hetSao {
      HStack(spacing: 14) {
        VienClay(ten: "star", duPhong: "star.fill", nen: ClayMau.the, co: 54)
        VStack(alignment: .leading, spacing: 2) {
          Text("Con còn 0 sao").font(.system(size: 21, weight: .bold)).foregroundColor(ClayMau.diemInk)
          Text(t?.matMang == true ? "Có mạng lại, sổ sao tự cập nhật." : "1 sao = 1 phút chơi").font(.system(size: 13)).foregroundColor(ClayMau.diemInk)
        }
        Spacer()
      }
      .padding(18).clayThe(bo: 30, nen: ClayMau.diemSoft)
      HStack(spacing: 14) {
        Button { withAnimation(ClayMotion.bat) { khoi = khoi == .nhiemVu ? .khong : .nhiemVu } } label: {
          HStack(spacing: 8) { HinhFluent(ten: "memo", duPhong: "doc.text", co: 22); Text("Làm nhiệm vụ") }
        }
        .buttonStyle(NutClayStyle(kieu: .ngoc, bo: 26, cao: 54))
        Button { xin.moi(); withAnimation(ClayMotion.bat) { khoi = khoi == .xin ? .khong : .xin } } label: {
          HStack(spacing: 8) { HinhFluent(ten: "star", duPhong: "star.fill", co: 22); Text("Xin Ba Mẹ cho vay sao") }
        }
        .buttonStyle(NutClayStyle(kieu: .sang, bo: 26, cao: 54))
        Button { xin.moi(); withAnimation(ClayMotion.bat) { khoi = .xin } } label: {
          HStack(spacing: 8) { HinhFluent(ten: "speech_balloon", duPhong: "bubble.left.fill", co: 22); Text("Nhắn Ba Mẹ") }
        }
        .buttonStyle(NutClayStyle(kieu: .sang, bo: 26, cao: 54))
      }
      if t?.matMang == true { Chu("Xin Ba Mẹ cho vay sao · có mạng là AiiGrow gửi Ba Mẹ ngay.", co: 13, mau: ClayMau.chu3, dong: 1) }
    }
    switch khoi {
    case .xin:
      XinVayView(tray: tray, xin: xin, tuManKhoa: true, soViecChuaLam: app.tq.map(HocVienView.soViecMo) ?? 0,
                 dong: { withAnimation(ClayMotion.bat) { khoi = .khong } })
        .padding(20).clayThe(bo: 28).vaoLanLuot(0)
    case .ma:
      MaOfflineView().padding(20).clayThe(bo: 28).vaoLanLuot(0)
    case .nhiemVu:
      nhiemVuNgay.padding(20).clayThe(bo: 28).vaoLanLuot(0)
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

/// Nhắc «Còn 5 sao = 5 phút chơi» (them-4wmbhz9f) / «Sắp hết sao rồi · Còn 1 sao» (them-vbafecic): Làm nhiệm vụ · Xin vay sao.
struct NhacView: View {
  let phut: Int
  /// App «Tính phút» đang chạy (tên hiện) — «Hết sao thì Roblox dừng».
  var tenApp: String? = nil
  var lamNhiemVu: (() -> Void)? = nil
  var xinVay: (() -> Void)? = nil
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(spacing: 14) {
        VienClay(ten: "alarm_clock", duPhong: "clock.fill", nen: ClayMau.canhSoft, co: 48).rungChuong()
        VStack(alignment: .leading, spacing: 2) {
          Text(phut <= 1 ? "Sắp hết sao rồi" : "Còn \(phut) sao = \(phut) phút chơi").font(.system(size: 16, weight: .bold))
          Text(phut <= 1 ? "Còn 1 sao · " + (tenApp.map { "\($0) dừng sau 1 phút" } ?? "còn 1 sao = 1 phút chơi")
               : "Hết sao thì \(tenApp ?? "app") dừng · lưu bài nhé").font(.system(size: 13)).foregroundColor(ClayMau.chu3)
        }
      }
      if lamNhiemVu != nil || xinVay != nil {
        HStack(spacing: 10) {
          if let lamNhiemVu { Button("Làm nhiệm vụ", action: lamNhiemVu).buttonStyle(NutClayStyle(kieu: .ngoc, bo: 16, cao: 44)) }
          if let xinVay { Button("Xin vay sao", action: xinVay).buttonStyle(NutClayStyle(kieu: .sang, bo: 16, cao: 44)) }
        }
      }
    }
    .padding(16).frame(maxWidth: .infinity, alignment: .leading)
    .clayThe(bo: 26).vaoLanLuot(0)
    .padding(14).padding(.bottom, 18).frame(width: 360).nenClay()
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
