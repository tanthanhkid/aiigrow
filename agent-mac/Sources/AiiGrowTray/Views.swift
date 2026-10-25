// Giao diện SwiftUI: xin thêm giờ, xin mở trang/app, ghép máy, màn khoá toàn màn hình.
// Chất liệu Clay gương + icon Fluent 3D + motion «vui»/«ánh men» (Clay.swift, docs/THIET-KE-CLAY.md).
import AppKit
import SwiftUI
import AiiGrowCore

/// Khối «Con muốn thêm bao lâu?» — dùng trong cửa sổ riêng và ngay trên màn khoá.
struct XinThemView: View {
  @ObservedObject var tray: TrayModel
  @ObservedObject var xin: XinModel
  /// «Đổi điểm lấy giờ chơi» (agent-win RequestForm khi được đổi điểm) — nil = không hiện (vd trên màn khoá).
  var moChoi: (() -> Void)? = nil
  @State private var phut = 30
  @State private var loiNhan = ""

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 12) {
        VienClay(ten: "hourglass_not_done", duPhong: "hourglass", nen: ClayMau.diemSoft, co: 44)
        Text("Con muốn thêm bao lâu?").font(.system(size: 17, weight: .bold))
      }
      ChipClay(ds: TrayLogic.luaChonPhut.map { ($0, TrayLogic.nhanLuaChonPhut($0)) }, chon: $phut)
      Text("Nhắn Ba Mẹ (không bắt buộc)").font(.system(size: 12, weight: .medium)).foregroundColor(ClayMau.chu3)
      TextField("Ví dụ: con cần làm nốt bài tập", text: $loiNhan)
        .textFieldStyle(.plain).font(.system(size: 14)).padding(.horizontal, 14).frame(minHeight: 44)
        .foregroundColor(ClayMau.chu).clayLom()
      Button("Xin Ba Mẹ") { xin.xinThem(phut: phut, loiNhan: loiNhan) }
        .buttonStyle(NutClayStyle(kieu: .thanChi)).disabled(xin.dangGui)
      if let moChoi, let t = tray.tt, ChoiBangDiem.hienNut(duocDoiDiem: t.duocDoiDiem, lyDoKhoa: t.lyDoKhoa, matMang: t.matMang, dsChoi: t.dsChoi ?? []) {
        Button(action: moChoi) {
          HStack(spacing: 8) { HinhFluent(ten: "star", duPhong: "star.fill", co: 22); Text("Hoặc đổi điểm lấy giờ chơi").lineLimit(1) }
        }
        .buttonStyle(NutClayStyle(kieu: .sang))
      }
      let dong = TrayLogic.dongYeuCau(tray.tt?.yeuCauCho ?? []) ?? xin.thongBao
      if !dong.isEmpty {
        Text(dong).font(.system(size: 14, weight: .medium)).fixedSize(horizontal: false, vertical: true)
          .transition(.opacity)
      }
    }
    .foregroundColor(ClayMau.chu)
  }
}

struct XinThemCuaSo: View {
  @ObservedObject var tray: TrayModel
  @ObservedObject var xin: XinModel
  var moChoi: (() -> Void)? = nil
  var body: some View {
    VStack(alignment: .leading, spacing: 16) {
      XinThemView(tray: tray, xin: xin, moChoi: moChoi)
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

/// Cửa sổ «Ghép máy» của Ba Mẹ (phiên admin, máy chưa ghép).
struct GhepMayView: View {
  let taiKhoan: [String]
  /// Gói cài một chạm (token trong tên .pkg) ⇒ chỉ chọn tài khoản của Con, không hỏi mã 6 số (vẫn có lối «Dùng mã 6 số»).
  var coGoiCai = false
  var khiGui: (Bool) -> Void = { _ in }        // true = bắt đầu gửi lệnh ghép (đặt cờ TRƯỚC IPC), false = đã có phản hồi
  var khiCanhBao: () -> Void = {}
  var dongLai: () -> Void
  @State private var chon = ""
  @State private var ma = ""
  @State private var loi = ""
  @State private var dangGui = false
  @State private var xong = false
  @State private var canhBao = ""
  @State private var dangChonFocus = false
  @State private var dungMa = false
  private var motCham: Bool { coGoiCai && !dungMa }
  /// Đang gửi / đã ghép / đang cảnh báo ⇒ không đổi tài khoản, không bấm ghép lại.
  private var khoaNhap: Bool { dangGui || xong || !canhBao.isEmpty }

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack(spacing: 12) {
        VienClay(ten: xong ? "party_popper" : "link", duPhong: xong ? "checkmark.seal.fill" : "link", nen: ClayMau.ngocSoft, co: 48)
          .id(xong).transition(.scale(scale: 0.85).combined(with: .opacity))
        Text("Ghép máy này với Con").font(.system(size: 20, weight: .bold))
      }
      Text(motCham ? "Gói cài này đã mang mã của gia đình. Ba Mẹ chỉ cần chọn tài khoản macOS của Con."
                   : "Chọn tài khoản macOS của Con và nhập mã 6 số lấy ở app AiiGrow Ba Mẹ.")
        .font(.system(size: 13)).foregroundColor(ClayMau.chu3).fixedSize(horizontal: false, vertical: true)
      if taiKhoan.isEmpty {
        Text("Chưa thấy tài khoản nào khác trên máy. Hãy tạo tài khoản cho Con ở Cài đặt hệ thống → Người dùng & Nhóm.")
          .font(.system(size: 13)).foregroundColor(ClayMau.loi)
      } else {
        // Ô chọn Clay cao 48 thay pop-up hệ thống (cao 22pt, dưới vùng bấm 44): nhãn Clay vẽ bên dưới, NSPopUpButton thật trong suốt
        // phủ kín 48pt ⇒ giữ nguyên menu neo theo nút, bàn phím, VoiceOver «pop-up» của hệ thống.
        HStack(spacing: 8) {
          Text("Tài khoản của Con").font(.system(size: 13)).foregroundColor(ClayMau.chu3)
          Spacer(minLength: 8)
          Text(chon).font(.system(size: 15, weight: .semibold)).foregroundColor(ClayMau.chu).lineLimit(1).truncationMode(.middle)
          Image(systemName: "chevron.up.chevron.down").font(.system(size: 11, weight: .bold)).foregroundColor(ClayMau.chu3)
        }
        .padding(.horizontal, 16).frame(maxWidth: .infinity, minHeight: 48)
        .accessibilityHidden(true)
        .clayLom(bo: 18)
        .overlay(RoundedRectangle(cornerRadius: 18, style: .continuous).strokeBorder(ClayMau.ngoc, lineWidth: 2.5).opacity(dangChonFocus && !khoaNhap ? 1 : 0))   // khoá rồi thì không vẽ như đang focus
        .overlay(ChonPopUp(ds: taiKhoan, chon: $chon, tieuDe: "Tài khoản của Con", focus: $dangChonFocus))
        .disabled(khoaNhap)
        .opacity(khoaNhap ? 0.5 : 1)          // cùng mức mờ NutClayStyle khi tắt
      }
      if !motCham {
        TextField("Mã 6 số", text: Binding(get: { ma }, set: { ma = TrayLogic.locMa($0) }))
          .textFieldStyle(.plain).font(.system(size: 22, weight: .medium, design: .monospaced))
          .frame(height: 32).padding(.horizontal, 14).frame(minHeight: 48).clayLom(bo: 18)
      }
      if !loi.isEmpty { Text(loi).font(.system(size: 13, weight: .medium)).foregroundColor(ClayMau.loi).fixedSize(horizontal: false, vertical: true) }
      if xong { Text("Đã ghép máy. Cảm ơn Ba Mẹ!").font(.system(size: 14, weight: .semibold)).foregroundColor(ClayMau.ngocInk) }
      if !canhBao.isEmpty {
        Text("Đã ghép máy, NHƯNG: " + canhBao).font(.system(size: 13, weight: .semibold)).foregroundColor(ClayMau.canh).fixedSize(horizontal: false, vertical: true)
        Button("Đã hiểu") { dongLai() }.buttonStyle(NutClayStyle(kieu: .sang))
      }
      Button(dangGui ? "Đang ghép…" : "Ghép máy") { gui() }
        .buttonStyle(NutClayStyle(kieu: .thanChi)).disabled(khoaNhap || (!motCham && !TrayLogic.maHopLe(ma)) || chon.isEmpty)
      if coGoiCai && !xong {
        Button(dungMa ? "Dùng gói cài một chạm" : "Dùng mã 6 số thay vì gói cài") { dungMa.toggle(); loi = "" }
          .buttonStyle(NutClayStyle(kieu: .sang)).disabled(khoaNhap)
      }
      Text("Tài khoản Con sẽ về quyền người dùng thường (cần còn một tài khoản quản trị khác).")
        .font(.system(size: 11)).foregroundColor(ClayMau.chu3).fixedSize(horizontal: false, vertical: true)
    }
    .padding(20).clayThe().vaoLanLuot(0)
    .padding(22).padding(.bottom, 12).frame(width: 460).nenClay()
    .animation(ClayMotion.bat, value: xong)
    .onAppear { if chon.isEmpty { chon = taiKhoan.first ?? "" } }
  }

  private func gui() {
    dangGui = true; loi = ""; khiGui(true)
    let ma = motCham ? "" : self.ma, chon = self.chon
    Task {
      defer { dangGui = false }                                  // KHÔNG khiGui(false) ở đây: cờ chặn tự đóng giữ tới khi dongLai chạy (hiện «Đã ghép máy» đủ 2 giây)
      do {
        switch try await IPCClient.guiAsync(.ghep(ma: ma, taiKhoanCon: chon)) {
        case .loi(_, let chu): loi = chu; khiGui(false)
        case .canhBao(_, let chu): canhBao = chu; khiCanhBao(); khiGui(false)     // đã ghép nhưng cần Ba Mẹ làm thêm: giữ cửa sổ mở để đọc, không tự đóng
        default: xong = true; DispatchQueue.main.asyncAfter(deadline: .now() + 2) { dongLai() }
        }
      } catch { loi = "AiiGrow đang khởi động lại, Ba Mẹ thử lại sau vài giây nhé."; khiGui(false) }
    }
  }
}

/// Màn toàn màn hình: khoá hoặc đếm ngược.
struct ManKhoaView: View {
  @ObservedObject var tray: TrayModel
  @ObservedObject var xin: XinModel
  var body: some View {
    ZStack {
      // than chì sâu + quầng ngọc lục bảo (Clay gương, nền tối)
      LinearGradient(colors: [ClayMau.thanChi, ClayMau.thanChiDam], startPoint: .top, endPoint: .bottom).ignoresSafeArea()
      RadialGradient(colors: [ClayMau.ngoc.opacity(0.55), .clear], center: UnitPoint(x: 0.5, y: 0.0), startRadius: 0, endRadius: 700)
        .ignoresSafeArea()
      TimelineView(.periodic(from: .now, by: 1)) { ctx in
        noiDung(bayGio: ctx.date)
      }
      .frame(maxWidth: 540)
      .padding(32)
    }
  }

  @ViewBuilder private func noiDung(bayGio: Date) -> some View {
    let man = TrayLogic.chonMan(tray.tt)
    VStack(spacing: 18) {
      switch man {
      case .demNguoc(let giay, let lyDo):
        let con = max(0, Double(giay) - bayGio.timeIntervalSince(tray.nhanLuc))
        VienClay(ten: "alarm_clock", duPhong: "alarm.fill", nen: ClayMau.canhSoft, co: 88).rungChuong()
        Text("Máy sắp khoá").font(.system(size: 34, weight: .bold))
        VStack(spacing: 2) {
          Text(TrayLogic.dongHo(con)).font(.system(size: 88, weight: .bold, design: .rounded)).monospacedDigit()
          Text("máy sẽ khoá sau").font(.system(size: 17)).opacity(0.85)
        }
        .padding(.horizontal, 36).padding(.vertical, 14)
        .background(KinhMo(bo: 32))
        Text(TrayLogic.goiYKhoa(lyDo)).font(.system(size: 16)).multilineTextAlignment(.center)
      case .khoa(let lyDo):
        VienClay(ten: "locked", duPhong: "lock.fill", nen: ClayMau.the, co: 96).khoaDongSap()
        Text(TrayLogic.tieuDeKhoa(lyDo)).font(.system(size: 34, weight: .bold)).multilineTextAlignment(.center)
        Text(TrayLogic.goiYKhoa(lyDo)).font(.system(size: 17)).multilineTextAlignment(.center).opacity(0.9)
      case .khong:
        EmptyView()
      }
      if tray.tt?.nhapMaOffline == true {
        MaOfflineView()
          .padding(20)
          .clayThe(bo: 32)
          .environment(\.colorScheme, .light)
          .vaoLanLuot(1)
      }
      XinThemView(tray: tray, xin: xin)
        .padding(20)
        .clayThe(bo: 32)
        .environment(\.colorScheme, .light)
        .vaoLanLuot(1)
      HStack(spacing: 6) {
        HinhFluent(ten: "seedling", duPhong: "leaf.fill", co: 16)
        Text("AiiGrow · máy này do Ba Mẹ quản lý").font(.system(size: 12)).opacity(0.75)
      }
    }
    .foregroundColor(.white)
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

/// Cửa sổ nhỏ nhắc «còn 5 phút / 1 phút».
struct NhacView: View {
  let phut: Int
  var body: some View {
    HStack(spacing: 14) {
      VienClay(ten: "alarm_clock", duPhong: "clock.fill", nen: ClayMau.canhSoft, co: 48).rungChuong()
      VStack(alignment: .leading, spacing: 2) {
        Text("Còn \(phut) phút").font(.system(size: 16, weight: .bold))
        Text("Con lưu bài đang làm nhé.").font(.system(size: 13)).foregroundColor(ClayMau.chu3)
      }
    }
    .padding(16).frame(maxWidth: .infinity, alignment: .leading)
    .clayThe(bo: 26).vaoLanLuot(0)
    .padding(14).padding(.bottom, 18).frame(width: 320).nenClay()
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
