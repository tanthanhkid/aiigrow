// Giao diện SwiftUI: xin mở trang/app, ghép máy, màn khoá toàn màn hình (xin vay sao ở SaoViews.swift).
// Chất liệu Clay gương + icon Fluent 3D + motion «vui»/«ánh men» (Clay.swift, docs/THIET-KE-CLAY.md).
import AppKit
import SwiftUI
import UserNotifications
import AiiGrowCore

/// «Xin thêm app / web» (#422, con-cai-mac 43 «App trên Mac» / 44 «Trang web») — MỘT hộp xin cho mọi lối vào: Hôm nay, menu khay,
/// link «Xin mở app ›» ở hộp vay sao, màn «… chưa có trong danh sách» (điền sẵn app vừa bị đóng). Gửi xong: «Đã gửi Ba Mẹ!» (them-5ici9ysd).
struct XinMoView: View {
  @ObservedObject var tray: TrayModel
  @ObservedObject var xin: XinModel
  /// Mở từ màn «… chưa có trong danh sách»: chọn sẵn app vừa bị đóng (tên hoặc bundle id).
  var appBanDau: String = ""
  var theBanDau: XinThem.The = .app
  /// «‹ Quay lại» (về Hôm nay); nil = không hiện.
  var quayLai: (() -> Void)? = nil
  var veHomNay: () -> Void = {}
  /// Lưới app bơm sẵn (chụp duyệt / test); nil ⇒ tray tự quét /Applications + ~/Applications (không cần daemon).
  var dsAppSan: [AppMay]? = nil
  @State private var the: XinThem.The = .app
  @State private var dsApp: [AppMay] = []
  @State private var daQuet = false
  @State private var chon: String?
  /// «Không thấy app? Gõ tên app»: app chưa cài / app hệ thống ngoài lưới; điền sẵn app vừa bị đóng khi không thấy trong lưới.
  @State private var tenGo = ""
  @State private var icon: [String: NSImage] = [:]
  @State private var web = ""
  @State private var loiNhan = ""
  @State private var daMo = false
  private var phut: Int? { tray.tt?.moHet == true ? nil : (tray.tt?.phutSao ?? tray.tt?.soSao?.phutCon) }
  private var appChon: AppMay? { chon.flatMap { c in dsApp.first { $0.muc == c } } }
  /// Chưa quét xong lưới thì chưa gửi (tránh gửi tên trần khi lưới sắp chọn sẵn bundle id).
  private var loi: XinThem.LoiXin? { daQuet ? XinThem.loiXin(the: the, app: appChon, tenTran: tenGo, web: web) : nil }

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      if xin.daGui, let m = xin.mucDaXin { daGui(m) } else { form }
    }
    .padding(18).clayThe().vaoLanLuot(0)
    .padding(22).padding(.bottom, 12).frame(width: 440).nenClay()   // đáy dư cho bóng thẻ (lệch 16 + mờ 15)
    .foregroundColor(ClayMau.chu)
    .animation(ClayMotion.bat, value: xin.daGui)
    .onAppear { guard !daMo else { return }; daMo = true; the = theBanDau }
    .task { await napApp() }
  }

  @ViewBuilder private func daGui(_ m: String) -> some View {
    HStack(spacing: 12) {
      VienClay(ten: "speech_balloon", duPhong: "paperplane.fill", nen: ClayMau.ngocSoft, co: 48)
      VStack(alignment: .leading, spacing: 2) {
        Text("Đã gửi Ba Mẹ!").font(.clay(size: 20, weight: .bold))
        Chu("Con xin thêm \(HocVienView.tenMucChoi(m)) vào danh sách", co: 14, mau: ClayMau.chu3, dong: 2)
      }
    }
    VStack(alignment: .leading, spacing: 2) {
      Text("Đang chờ Ba Mẹ").font(.clay(size: 15, weight: .bold)).foregroundColor(ClayMau.ngocInk)
      Text("Có trả lời là máy báo ngay.").font(.clay(size: 13)).foregroundColor(ClayMau.chu3)
    }
    Button("Về Hôm nay" + (phut.map { " · còn \(ChuSao.so($0)) sao" } ?? ""), action: veHomNay).buttonStyle(NutClayStyle(kieu: .ngoc))
    LinkNho(chu: "‹ Sửa lời xin") { xin.moi() }
  }

  @ViewBuilder private var form: some View {
    if let quayLai { LinkNho(chu: "‹ Quay lại", lam: quayLai) }
    HStack(spacing: 12) {
      VienClay(ten: the == .web ? "globe_with_meridians" : "puzzle_piece", duPhong: the == .web ? "globe" : "app.fill",
               nen: the == .web ? ClayMau.lamSoft : ClayMau.timSoft, co: 44)
        .id(the).transition(.scale(scale: 0.85).combined(with: .opacity))
      VStack(alignment: .leading, spacing: 2) {
        Chu("Xin thêm app / web", co: 18, dam: .bold, dong: 1)
        Chu("Chọn app trên Mac hoặc gõ địa chỉ trang web", co: 13, mau: ClayMau.chu3, dong: 1)
      }
    }
    ChipClay(ds: [(XinThem.The.app, "App trên Mac"), (XinThem.The.web, "Trang web")], chon: $the)
    if the == .app { theApp } else { theWeb }
    if the == .web { Text("Lời nhắn cho Ba Mẹ").font(.clay(size: 13, weight: .bold)).foregroundColor(ClayMau.chu3) }
    TextField(the == .web ? "Con học làm game trên Scratch ạ" : "Nhắn Ba Mẹ: con xem video vẽ tranh ạ", text: $loiNhan)
      .textFieldStyle(.plain).font(.clay(size: 14)).padding(.horizontal, 14).frame(minHeight: 44).clayLom()
    VStack(alignment: .leading, spacing: 6) {
      Text("Ba Mẹ sẽ chọn nhóm").font(.clay(size: 13, weight: .bold)).foregroundColor(ClayMau.chu3)
      HStack(spacing: 8) {                                            // chỉ thông tin: Ba Mẹ chọn nhóm khi duyệt
        chipTin("hourglass_not_done", "Tính phút · 1 sao = 1 phút")
        chipTin("party_popper", "Không tính phút")
      }
    }
    Button(XinThem.nut(the: the, tenApp: loi?.ten)) {
      guard let l = loi else { return }
      xin.xinMo(muc: l.muc, loai: l.kieu, loiNhan: loiNhan, ten: l.ten)
    }
    .buttonStyle(NutClayStyle(kieu: .ngoc)).disabled(xin.dangGui || loi == nil)
    if !xin.thongBao.isEmpty, !xin.dangGui { Chu(xin.thongBao, co: 14, dam: .medium, mau: ClayMau.loi, dong: 3) }
  }

  @ViewBuilder private var theApp: some View {
    Text("App đã cài trên Mac").font(.clay(size: 13, weight: .bold)).foregroundColor(ClayMau.chu3)
    if dsApp.isEmpty {
      Chu(daQuet ? "Chưa thấy app nào trên máy. Con chọn «Trang web» hoặc nhờ Ba Mẹ nhé." : "Đang tìm app trên máy…", co: 13, mau: ClayMau.chu3, dong: 2)
        .padding(14).frame(maxWidth: .infinity, alignment: .leading).clayLom(bo: 18)
    } else {
      ScrollView {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
          ForEach(dsApp, id: \.muc) { a in oApp(a) }
        }
        .padding(4)
      }
      .frame(height: min(CGFloat((dsApp.count + 2) / 3) * 92 + 8, 196))
    }
    TextField("Không thấy app? Gõ tên app", text: $tenGo)
      .textFieldStyle(.plain).font(.clay(size: 14)).padding(.horizontal, 14).frame(minHeight: 40).clayLom()
      .onChange(of: tenGo) { t in if !t.trimmingCharacters(in: .whitespaces).isEmpty { chon = nil } }   // gõ tên ⇒ bỏ ô đang chọn
  }

  @ViewBuilder private var theWeb: some View {
    Text("Địa chỉ trang web").font(.clay(size: 13, weight: .bold)).foregroundColor(ClayMau.chu3)
    TextField("scratch.mit.edu", text: $web)
      .textFieldStyle(.plain).font(.clay(size: 14)).padding(.horizontal, 14).frame(minHeight: 44).clayLom()
    Text("Gõ địa chỉ trang con muốn vào, ví dụ scratch.mit.edu").font(.clay(size: 12)).foregroundColor(ClayMau.chu3)
  }

  private func oApp(_ a: AppMay) -> some View {
    let dang = chon == a.muc
    return Button { withAnimation(ClayMotion.bat) { chon = dang ? nil : a.muc; if !dang { tenGo = "" } } } label: {
      VStack(spacing: 6) {
        Image(nsImage: icon[a.muc] ?? XinMoView.iconChung).resizable().interpolation(.high).frame(width: 40, height: 40)
        Text(a.ten).font(.clay(size: 12, weight: .semibold)).lineLimit(1).truncationMode(.tail)
      }
      .frame(maxWidth: .infinity, minHeight: 80).padding(.horizontal, 4)
      .background(RoundedRectangle(cornerRadius: 16, style: .continuous).fill(dang ? ClayMau.ngocSoft : ClayMau.lom))
      .overlay(RoundedRectangle(cornerRadius: 16, style: .continuous).stroke(dang ? ClayMau.ngoc : .clear, lineWidth: 2))
      .overlay(alignment: .topTrailing) {
        if dang { Image(systemName: "checkmark.circle.fill").foregroundColor(ClayMau.ngoc).padding(5) }
      }
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .accessibilityLabel(a.ten).accessibilityAddTraits(dang ? .isSelected : [])
  }

  private func chipTin(_ icon: String, _ chu: String) -> some View {
    HStack(spacing: 5) {
      HinhFluent(ten: icon, duPhong: "circle.fill", co: 16)
      Text(chu).font(.clay(size: 12, weight: .semibold)).lineLimit(1)
    }
    .padding(.horizontal, 10).padding(.vertical, 6)
    .background(Capsule().fill(ClayMau.diemSoft)).foregroundColor(ClayMau.diemInk)
  }

  static let iconChung = NSImage(systemSymbolName: "app.fill", accessibilityDescription: nil) ?? NSImage()
  /// Icon app: PNG bơm sẵn (chụp) › icon thật của gói › icon chung. Nạp MỘT lần lúc quét (không đọc đĩa mỗi lần vẽ lại).
  static func iconApp(_ a: AppMay) -> NSImage {
    if let b = a.icon, let d = Data(base64Encoded: b), let i = NSImage(data: d) { return i }
    if let p = a.duongDan { return NSWorkspace.shared.icon(forFile: p) }
    return iconChung
  }

  /// Lưới app quét lần trước (mở lại hộp trong 2 phút không quét lại đĩa).
  @MainActor private static var dem: (luc: Date, ds: [AppMay], icon: [String: NSImage])?

  private func napApp() async {
    var ds: [AppMay], ic: [String: NSImage]
    if let dsAppSan {
      ds = XinThem.dsApp(dsAppSan); ic = Dictionary(ds.map { ($0.muc, XinMoView.iconApp($0)) }, uniquingKeysWith: { a, _ in a })
    } else if let d = XinMoView.dem, Date().timeIntervalSince(d.luc) < 120 {
      ds = d.ds; ic = d.icon
    } else {
      let tk = NSUserName()
      ds = await Task.detached(priority: .userInitiated) { XinThem.dsApp(QuetAppMac(layChuKy: false, layIcon: false).quet(taiKhoanCon: tk)) }.value
      if Task.isCancelled { return }                                   // cửa sổ đã đóng
      ic = Dictionary(ds.map { ($0.muc, XinMoView.iconApp($0)) }, uniquingKeysWith: { a, _ in a })
      XinMoView.dem = (Date(), ds, ic)
    }
    dsApp = ds; icon = ic; daQuet = true
    if chon == nil, tenGo.isEmpty, !appBanDau.isEmpty {
      if let a = XinThem.appBanDau(ds, appBanDau) { chon = a.muc } else { tenGo = appBanDau }
    }
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
  /// Hồ sơ máy sau khi ghép (số bé / máy riêng) — màn «Máy đã sẵn sàng» rẽ theo đó. nil = chưa biết ⇒ bản máy chung.
  @State var hoSo: HoSoMay?
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
    .task(id: man) { if man == .batQuyen || man == .xong { await layHoSo() } }
  }

  private var buoc: some View {
    let so = man == .batQuyen ? 4 : 3
    return HStack(spacing: 5) {
      ForEach(1...4, id: \.self) { i in
        Capsule().fill(i <= so ? ClayMau.ngoc : ClayMau.lom).frame(width: 28, height: 7)
      }
      Text(man == .xong ? "Xong" : man == .batQuyen ? "Bước 4/4 · Cho phép" : "Bước 3/4 · Ghép máy")
        .font(.clay(size: 12, weight: .bold)).foregroundColor(ClayMau.ngocInk).padding(.leading, 6)
    }
  }

  // 03 / 04
  @ViewBuilder private var nhap: some View {
    Text("Ghép Mac của con").font(.clay(size: 22, weight: .bold, vai: .tieuDe))
    Chu(motCham ? "Gói cài đã có mã của nhà mình. Chỉ cần một chạm." : "Gõ mã 6 số trong app AiiGrow của Ba Mẹ.", co: 14, mau: ClayMau.chu3)
    if motCham {
      HStack(spacing: 12) {
        VienClay(ten: "link", duPhong: "link", nen: ClayMau.ngocSoft, co: 44)
        VStack(alignment: .leading, spacing: 2) {
          Text("Nhà của con").font(.clay(size: 16, weight: .bold))
          Text("Mã gắn sẵn trong gói cài").font(.clay(size: 12)).foregroundColor(ClayMau.chu3)
        }
      }
      .padding(14).frame(maxWidth: .infinity, alignment: .leading).clayLom(bo: 18)
    }
    chonTaiKhoan
    if !motCham {
      TextField("Mã 6 số", text: Binding(get: { ma }, set: { ma = TrayLogic.locMa($0) }))
        .textFieldStyle(.plain).font(.clay(size: 24, weight: .bold, design: .monospaced))
        .frame(height: 32).padding(.horizontal, 14).frame(minHeight: 50).clayLom(bo: 18)
        .onSubmit { gui() }
      Text("Mã dùng được 10 phút").font(.clay(size: 12)).foregroundColor(ClayMau.chu3)
    }
    if !loi.isEmpty { Chu(loi, co: 13, dam: .medium, mau: ClayMau.loi) }
    Button(dangGui ? "Đang ghép…" : (motCham ? "Ghép vào nhà mình" : "Ghép Mac của con")) { gui() }
      .buttonStyle(NutClayStyle(kieu: .ngoc)).disabled(khoaNhap || (!motCham && !TrayLogic.maHopLe(ma)) || chon.isEmpty)
    if coGoiCai || tray.tt?.coGoiCai == true {
      Button(dungMa ? "Có link Ba Mẹ gửi? Ghép một chạm ›" : "Dùng mã 6 số thay vì gói cài ›") { dungMa.toggle(); loi = "" }
        .buttonStyle(.plain).font(.clay(size: 13, weight: .bold)).foregroundColor(ClayMau.ngocInk).disabled(khoaNhap)
    }
    Text("Bấm ghép là Ba Mẹ đồng ý Điều khoản AiiGrow. Tài khoản của con về quyền người dùng thường (cần còn một tài khoản quản trị khác).")
      .font(.clay(size: 11)).foregroundColor(ClayMau.chu3).fixedSize(horizontal: false, vertical: true)
  }

  @ViewBuilder private var chonTaiKhoan: some View {
    if taiKhoan.isEmpty {
      Chu("Chưa thấy tài khoản nào khác trên máy. Hãy tạo tài khoản cho con ở Cài đặt hệ thống → Người dùng & Nhóm.", co: 13, mau: ClayMau.loi)
    } else {
      // Ô chọn Clay cao 48 thay pop-up hệ thống: nhãn Clay bên dưới, NSPopUpButton thật trong suốt phủ kín ô.
      HStack(spacing: 8) {
        Text("Tài khoản macOS của con").font(.clay(size: 13)).foregroundColor(ClayMau.chu3)
        Spacer(minLength: 8)
        Text(chon).font(.clay(size: 15, weight: .semibold)).foregroundColor(ClayMau.chu).lineLimit(1).truncationMode(.middle)
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
        Text(tieu).font(.clay(size: 21, weight: .bold, vai: .tieuDe))
        Chu(phu, co: 13, mau: ClayMau.chu3, dong: 2)
      }
    }
    if !ma.isEmpty {
      Text(ManMac.maHien(ma)).font(.clay(size: 26, weight: .bold, design: .monospaced)).foregroundColor(ClayMau.canh)
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
        Text("Máy chưa vào được mạng").font(.clay(size: 21, weight: .bold, vai: .tieuDe))
        Chu("Bật lại Wi-Fi rồi bấm «Thử lại».", co: 13, mau: ClayMau.chu3, dong: 1)
      }
    }
    VStack(alignment: .leading, spacing: 6) {
      Text("Kiểm Wi-Fi").font(.clay(size: 14, weight: .bold))
      Chu("Bấm Wi-Fi trên thanh menu › chọn mạng nhà", co: 13, mau: ClayMau.chu3, dong: 1)
      if !ma.isEmpty {
        Text("Mã \(ManMac.maHien(ma)) vẫn giữ").font(.clay(size: 14, weight: .bold)).padding(.top, 4)
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
    Text("Đã ghép nhà mình").font(.clay(size: 13, weight: .bold)).foregroundColor(ClayMau.ngocInk)
    Text("Bật 3 quyền").font(.clay(size: 22, weight: .bold, vai: .tieuDe))
    dongQuyen("hourglass_not_done", "Thời gian sử dụng", "Để giữ giờ chơi", bat: true, mo: GhepMayView.caiDatThoiGian)
    dongQuyen("speech_balloon", "Thông báo", "Để nhắc «còn 5 phút»", bat: quyenTB == true, mo: GhepMayView.caiDatThongBao)
    dongQuyen("desktop_computer", "Mở cùng máy", "AiiGrow tự chạy khi bật Mac",
              bat: FileManager.default.fileExists(atPath: DuongDan.trayPlist), mo: GhepMayView.caiDatMoCungMay)
    if quyenTB != true {
      Chu("Cách bật «Thông báo»: 1. Cài đặt hệ thống · 2. Thông báo › AiiGrow · 3. Cho phép", co: 12, mau: ClayMau.chu3, dong: 2)
    }
    if !canhBao.isEmpty {
      Text("Đã ghép máy, NHƯNG: " + canhBao).font(.clay(size: 13, weight: .semibold)).foregroundColor(ClayMau.canh).fixedSize(horizontal: false, vertical: true)
    }
    Button("Bật xong, xem máy") { man = .xong }.buttonStyle(NutClayStyle(kieu: .ngoc))
      .task { await kiemThongBao() }
  }

  private func dongQuyen(_ icon: String, _ ten: String, _ phu: String, bat: Bool, mo: URL?) -> some View {
    HStack(spacing: 12) {
      VienClay(ten: icon, duPhong: "checkmark", nen: bat ? ClayMau.ngocSoft : ClayMau.the, co: 40)
      VStack(alignment: .leading, spacing: 1) {
        Text(ten).font(.clay(size: 15, weight: .bold))
        Text(phu).font(.clay(size: 12)).foregroundColor(ClayMau.chu3)
      }
      Spacer()
      if bat {
        Text("✓ Đã bật").font(.clay(size: 13, weight: .bold)).foregroundColor(ClayMau.ngocInk)
      } else {
        Text("Chưa bật").font(.clay(size: 12)).foregroundColor(ClayMau.canh)
        Button("Mở") { if let mo { NSWorkspace.shared.open(mo) } }.buttonStyle(NutClayStyle(kieu: .sang, bo: 14, cao: 44)).frame(width: 80)
      }
    }
    .padding(.horizontal, 12).padding(.vertical, 6).clayLom(bo: 18)
  }

  // 09
  @ViewBuilder private var xong: some View {
    let c = ManMac.chuXong(hoSo, taiKhoan: chon)
    HStack { Spacer(); VienClay(ten: "party_popper", duPhong: "checkmark.seal.fill", nen: ClayMau.ngocSoft, co: 64); Spacer() }
    Text(c.tieuDe).font(.clay(size: 22, weight: .bold, vai: .tieuDe)).frame(maxWidth: .infinity)
    Chu(c.phu, co: 14, mau: ClayMau.chu3, dong: 2)
    VStack(spacing: 8) {
      ForEach(c.cacDong, id: \.tieu) { d in
        HStack(spacing: 12) {
          VienClay(ten: d.icon, duPhong: "checkmark", nen: ClayMau.ngocSoft, co: 36)
          VStack(alignment: .leading, spacing: 1) {
            Chu(d.tieu, co: 14, dam: .bold, dong: 1)
            Chu(d.phu, co: 12, mau: ClayMau.chu3, dong: 1)
          }
          Spacer(minLength: 0)
        }
        .padding(.horizontal, 12).padding(.vertical, 8).frame(maxWidth: .infinity, alignment: .leading).clayLom(bo: 18)
      }
    }
    Button(c.nut) { khiGui(false); dongLai(); NhuongMay.khoaManHinh() }.buttonStyle(NutClayStyle(kieu: .ngoc))
    Chu(c.chanTrang, co: 11, mau: ClayMau.chu3, dong: 2)
  }

  static let caiDatThongBao = URL(string: "x-apple.systempreferences:com.apple.Notifications-Settings.extension")
  static let caiDatMoCungMay = URL(string: "x-apple.systempreferences:com.apple.LoginItems-Settings.extension")
  static let caiDatThoiGian = URL(string: "x-apple.systempreferences:com.apple.Screen-Time-Settings.extension")

  private func kiemThongBao() async {
    guard Bundle.main.bundleURL.pathExtension == "app" else { quyenTB = false; return }
    let st = await UNUserNotificationCenter.current().notificationSettings()
    quyenTB = st.authorizationStatus == .authorized
  }

  /// Hồ sơ máy để màn «xong» rẽ máy riêng / máy chung: lấy sau khi ghép (không chặn nút / `dangGui`), thử lại tối đa 4 lần cách 3 giây;
  /// chưa có thì màn «xong» hiện chữ trung tính.
  private func layHoSo() async {
    for _ in 0..<4 where hoSo == nil && (man == .batQuyen || man == .xong) {
      if case .duLieu(let j)? = try? await IPCClient.guiAsync(.hoSoGhep, giay: 5), let h = try? IPCMa.decoder.decode(HoSoMay.self, from: Data(j.utf8)) { hoSo = h; return }
      try? await Task.sleep(nanoseconds: 3_000_000_000)
    }
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
/// link nhỏ «Mất mạng? Mở bằng mã của Ba Mẹ ›» · «Đổi người ›» · «Ba Mẹ mở máy ›».
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
        Text(het ? "Sắp hết sao rồi" : "Ba Mẹ sắp khoá máy").font(.clay(size: 38, weight: .bold, vai: .tieuDe))
        HStack(alignment: .firstTextBaseline, spacing: 10) {
          Text("Lưu bài đang làm nhé. Máy khoá sau").font(.clay(size: 17)).foregroundColor(ClayMau.chu2)
          Text(TrayLogic.dongHo(con)).font(.clay(size: 40, weight: .bold, vai: .so)).monospacedDigit().foregroundColor(ClayMau.ngocInk)
        }
        nutHanhDong(hetSao: het)
      case .khoa:
        if let t = tray.tt {
          let c = ManMac.chuKhoa(t, phutDaChoi: app.tq?.quy?.daDung)
          if t.matMang { VienNho(chu: "Mất mạng · " + AppConView.gioPhut.string(from: bayGio), mau: ClayMau.canh) }
          Text(t.matMang ? "Mất mạng, luật vẫn vậy nhé!" : c.tieuDe).font(.clay(size: 38, weight: .bold, vai: .tieuDe)).fixedSize(horizontal: false, vertical: true)
          Text(t.matMang && c.hetSao ? "Hết sao rồi · con còn 0 sao = 0 phút chơi." : t.matMang && !c.theoGioiHan ? c.tieuDe + " · " + c.phu : c.phu)
            .font(.clay(size: 17)).foregroundColor(ClayMau.chu2).fixedSize(horizontal: false, vertical: true)
          nutHanhDong(hetSao: c.hetSao, theoGioiHan: c.theoGioiHan)
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
      Text(ds.isEmpty ? "Chưa có việc nào chờ làm" : "Việc con làm được để kiếm sao").font(.clay(size: 17, weight: .bold))
      ForEach(Array(ds.prefix(5))) { v in
        HStack {
          Chu(v.ten, co: 15, dam: .semibold, dong: 1)
          Text("+\(ChuSao.vien(v.diem))").font(.clay(size: 13, weight: .bold)).foregroundColor(ClayMau.diemInk)
            .padding(.horizontal, 10).padding(.vertical, 3).background(Capsule().fill(ClayMau.diemSoft)).fixedSize()
        }
      }
      Chu("Làm xong thì báo Ba Mẹ duyệt — có sao là máy mở lại, con nộp bài trong AiiGrow (mục Nhiệm vụ).", co: 13, mau: ClayMau.chu3)
    }
    .foregroundColor(ClayMau.chu)
  }

  @ViewBuilder private func nutHanhDong(hetSao: Bool, theoGioiHan: Bool = false) -> some View {
    let t = tray.tt
    if theoGioiHan {                                    // nghỉ giữa lượt / đủ giờ hôm nay: sao còn nguyên, chỉ còn lối «Xin Ba Mẹ»
      let sao = t.flatMap { ManMac.saoThat($0) }
      HStack(spacing: 14) {
        VienClay(ten: "star", duPhong: "star.fill", nen: ClayMau.nenSang, co: 54)
        VStack(alignment: .leading, spacing: 2) {
          Text(sao.map { "Con có \(ChuSao.vien($0))" } ?? "Sao của con vẫn còn").font(.clay(size: 21, weight: .bold, vai: .tieuDe)).foregroundColor(ClayMau.kim)
          Text("Sao không mất khi nghỉ · 1 sao = 1 phút chơi").font(.clay(size: 13)).foregroundColor(ClayMau.nenSang)
        }
        Spacer()
      }
      .padding(18).clayNavy(bo: 30)
      HStack(spacing: 14) {
        Button { xin.moi(); withAnimation(ClayMotion.bat) { khoi = khoi == .xin ? .khong : .xin } } label: {
          HStack(spacing: 8) { HinhFluent(ten: "star", duPhong: "star.fill", co: 22); Text("Xin Ba Mẹ cho vay sao") }
        }
        .buttonStyle(NutClayStyle(kieu: .ngoc, bo: 26, cao: 54))
        Button { xin.moi(); withAnimation(ClayMotion.bat) { khoi = .xin } } label: {
          HStack(spacing: 8) { HinhFluent(ten: "speech_balloon", duPhong: "bubble.left.fill", co: 22); Text("Nhắn Ba Mẹ") }
        }
        .buttonStyle(NutClayStyle(kieu: .sang, bo: 26, cao: 54))
      }
    } else if hetSao {
      HStack(spacing: 14) {
        VienClay(ten: "star", duPhong: "star.fill", nen: ClayMau.nenSang, co: 54)
        VStack(alignment: .leading, spacing: 2) {
          Text("Con còn 0 sao").font(.clay(size: 21, weight: .bold, vai: .tieuDe)).foregroundColor(ClayMau.kim)
          Text(t?.matMang == true ? "Có mạng lại, sổ sao tự cập nhật." : "1 sao = 1 phút chơi").font(.clay(size: 13)).foregroundColor(ClayMau.nenSang)
        }
        Spacer()
      }
      .padding(18).clayNavy(bo: 30)
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
        .buttonStyle(.plain).font(.clay(size: 15, weight: .bold)).foregroundColor(ClayMau.ngocInk)
      }
      HStack(spacing: 40) {
        if t?.mayRieng != true, t?.nguoiDung != nil {
          Button(action: doiBe) { HStack(spacing: 6) { HinhFluent(ten: "nguoi", duPhong: "person.2.fill", co: 18); Text("Đổi người ›") } }
            .buttonStyle(.plain)
        }
        Button(action: baMeMoMay) { HStack(spacing: 6) { HinhFluent(ten: "key", duPhong: "key.fill", co: 18); Text("Ba Mẹ mở máy ›") } }
          .buttonStyle(.plain)
      }
      .font(.clay(size: 14, weight: .bold)).foregroundColor(ClayMau.chu2)
    }
    .padding(.top, 4)
  }
}

/// Ô «Ba Mẹ ở cạnh con?» (them-2ndg9bu6) trên màn khoá (agent-win OfflineCodePanel): Ba Mẹ xem mã 6 số trong app, đọc cho Con gõ; daemon tự kiểm.
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
          Text("Ba Mẹ ở cạnh con?").font(.clay(size: 17, weight: .bold)).lineLimit(1).truncationMode(.tail)
          Text("Nhờ Ba Mẹ đọc mã 6 số trong app AiiGrow.").font(.clay(size: 12)).foregroundColor(ClayMau.chu3).lineLimit(2)
        }
      }
      TextField("Mã 6 số", text: Binding(get: { ma }, set: { ma = TrayLogic.locMa($0) }))
        .textFieldStyle(.plain).font(.clay(size: 22, weight: .medium, design: .monospaced))
        .padding(.horizontal, 14).frame(minHeight: 48).clayLom(bo: 18)
        .onSubmit { mo() }
      Button(dangGui ? "Đang kiểm…" : "Mở máy bằng mã của Ba Mẹ") { mo() }
        .buttonStyle(NutClayStyle(kieu: .ngoc)).disabled(dangGui || !TrayLogic.maHopLe(ma))
      Text("Có mạng lại, sổ sao tự cập nhật.").font(.clay(size: 12)).foregroundColor(ClayMau.chu3)
      if !cau.isEmpty {
        Text(cau).font(.clay(size: 14, weight: .semibold)).foregroundColor(loi ? ClayMau.loi : ClayMau.ngocInk).fixedSize(horizontal: false, vertical: true)
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
          Text(phut <= 1 ? "Sắp hết sao rồi" : "Còn \(phut) sao = \(phut) phút chơi").font(.clay(size: 16, weight: .bold))
          Text(phut <= 1 ? "Còn 1 sao · " + (tenApp.map { "\($0) dừng sau 1 phút" } ?? "còn 1 sao = 1 phút chơi")
               : "Hết sao thì \(tenApp ?? "app") dừng · lưu bài nhé").font(.clay(size: 13)).foregroundColor(ClayMau.chu3)
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
          .buttonStyle(NutClayStyle(kieu: chon == k ? .chon : .sang))
          .accessibilityAddTraits(chon == k ? .isSelected : [])
      }
    }
    .padding(.vertical, 2)
  }
}
