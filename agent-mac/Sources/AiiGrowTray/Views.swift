// Giao diện SwiftUI: xin thêm giờ, xin mở trang/app, ghép máy, màn khoá toàn màn hình.
import SwiftUI
import AiiGrowCore

/// Khối «Con muốn thêm bao lâu?» — dùng trong cửa sổ riêng và ngay trên màn khoá.
struct XinThemView: View {
  @ObservedObject var tray: TrayModel
  @ObservedObject var xin: XinModel
  var sang = false          // nền tối (màn khoá)
  @State private var phut = 30
  @State private var loiNhan = ""

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Con muốn thêm bao lâu?").font(.system(size: 17, weight: .semibold))
      HStack(spacing: 8) {
        ForEach(TrayLogic.luaChonPhut, id: \.self) { p in
          Button(TrayLogic.nhanLuaChonPhut(p)) { phut = p }
            .buttonStyle(NutXanh(dac: phut == p))
        }
      }
      Text("Nhắn Ba Mẹ (không bắt buộc)").font(.system(size: 12)).opacity(0.7)
      TextField("Ví dụ: con cần làm nốt bài tập", text: $loiNhan)
        .textFieldStyle(.roundedBorder).frame(minHeight: 32)
      Button("Xin Ba Mẹ") { xin.xinThem(phut: phut, loiNhan: loiNhan) }
        .buttonStyle(NutXanh()).disabled(xin.dangGui)
      let dong = TrayLogic.dongYeuCau(tray.tt?.yeuCauCho ?? []) ?? xin.thongBao
      if !dong.isEmpty { Text(dong).font(.system(size: 14)).fixedSize(horizontal: false, vertical: true) }
    }
    .foregroundColor(sang ? .white : .primary)
  }
}

struct XinThemCuaSo: View {
  @ObservedObject var tray: TrayModel
  @ObservedObject var xin: XinModel
  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      XinThemView(tray: tray, xin: xin)
      Text(TrayLogic.dongDangBat).font(.system(size: 12)).foregroundColor(.secondary)
    }
    .padding(22).frame(width: 400)
  }
}

struct XinMoView: View {
  @ObservedObject var tray: TrayModel
  @ObservedObject var xin: XinModel
  @State private var loai = "web"
  @State private var muc = ""
  @State private var loiNhan = ""
  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Con muốn mở gì?").font(.system(size: 17, weight: .semibold))
      Picker("", selection: $loai) { Text("Trang web").tag("web"); Text("App").tag("app") }
        .pickerStyle(.segmented).labelsHidden().frame(minHeight: 32)
      TextField(loai == "web" ? "Địa chỉ trang, ví dụ youtube.com" : "Tên app", text: $muc)
        .textFieldStyle(.roundedBorder).frame(minHeight: 32)
      Text("Nhắn Ba Mẹ (không bắt buộc)").font(.system(size: 12)).foregroundColor(.secondary)
      TextField("Con cần mở để làm gì?", text: $loiNhan).textFieldStyle(.roundedBorder).frame(minHeight: 32)
      Button("Xin Ba Mẹ") { xin.xinMo(muc: muc.trimmingCharacters(in: .whitespaces), loai: loai, loiNhan: loiNhan) }
        .buttonStyle(NutXanh()).disabled(xin.dangGui || muc.trimmingCharacters(in: .whitespaces).isEmpty)
      let dong = TrayLogic.dongYeuCau(tray.tt?.yeuCauCho ?? []) ?? xin.thongBao
      if !dong.isEmpty { Text(dong).font(.system(size: 14)) }
    }
    .padding(22).frame(width: 400)
  }
}

/// Cửa sổ «Ghép máy» của Ba Mẹ (phiên admin, máy chưa ghép).
struct GhepMayView: View {
  let taiKhoan: [String]
  var khiGui: (Bool) -> Void = { _ in }        // true = bắt đầu gửi lệnh ghép (đặt cờ TRƯỚC IPC), false = đã có phản hồi
  var khiCanhBao: () -> Void = {}
  var dongLai: () -> Void
  @State private var chon = ""
  @State private var ma = ""
  @State private var loi = ""
  @State private var dangGui = false
  @State private var xong = false
  @State private var canhBao = ""

  var body: some View {
    VStack(alignment: .leading, spacing: 14) {
      Text("Ghép máy này với Con").font(.system(size: 20, weight: .semibold))
      Text("Chọn tài khoản macOS của Con và nhập mã 6 số lấy ở app AiiGrow Ba Mẹ.")
        .font(.system(size: 13)).foregroundColor(.secondary).fixedSize(horizontal: false, vertical: true)
      if taiKhoan.isEmpty {
        Text("Chưa thấy tài khoản nào khác trên máy. Hãy tạo tài khoản cho Con ở Cài đặt hệ thống → Người dùng & Nhóm.")
          .font(.system(size: 13)).foregroundColor(.red)
      } else {
        Picker("Tài khoản của Con", selection: $chon) { ForEach(taiKhoan, id: \.self) { Text($0).tag($0) } }
          .frame(minHeight: 32)
      }
      TextField("Mã 6 số", text: Binding(get: { ma }, set: { ma = TrayLogic.locMa($0) }))
        .textFieldStyle(.roundedBorder).font(.system(size: 22, weight: .medium, design: .monospaced)).frame(minHeight: 40)
      if !loi.isEmpty { Text(loi).font(.system(size: 13)).foregroundColor(.red).fixedSize(horizontal: false, vertical: true) }
      if xong { Text("Đã ghép máy. Cảm ơn Ba Mẹ!").foregroundColor(.xanhAiiGrow) }
      if !canhBao.isEmpty {
        Text("Đã ghép máy, NHƯNG: " + canhBao).font(.system(size: 13, weight: .semibold)).foregroundColor(.orange).fixedSize(horizontal: false, vertical: true)
        Button("Đã hiểu") { dongLai() }
      }
      Button(dangGui ? "Đang ghép…" : "Ghép máy") { gui() }
        .buttonStyle(NutXanh()).disabled(dangGui || xong || !TrayLogic.maHopLe(ma) || chon.isEmpty || !canhBao.isEmpty)
      Text("Tài khoản Con sẽ về quyền người dùng thường (cần còn một tài khoản quản trị khác).")
        .font(.system(size: 11)).foregroundColor(.secondary)
    }
    .padding(24).frame(width: 420)
    .onAppear { if chon.isEmpty { chon = taiKhoan.first ?? "" } }
  }

  private func gui() {
    dangGui = true; loi = ""; khiGui(true)
    let ma = self.ma, chon = self.chon
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
  private let xanhDam = Color(red: 0x14 / 255, green: 0x5c / 255, blue: 0x4a / 255)

  var body: some View {
    ZStack {
      LinearGradient(colors: [xanhDam, Color.xanhAiiGrow], startPoint: .top, endPoint: .bottom).ignoresSafeArea()
      TimelineView(.periodic(from: .now, by: 1)) { ctx in
        noiDung(bayGio: ctx.date)
      }
      .frame(maxWidth: 520)
      .padding(32)
    }
  }

  @ViewBuilder private func noiDung(bayGio: Date) -> some View {
    let man = TrayLogic.chonMan(tray.tt)
    VStack(spacing: 18) {
      switch man {
      case .demNguoc(let giay, let lyDo):
        let con = max(0, Double(giay) - bayGio.timeIntervalSince(tray.nhanLuc))
        Text("Máy sắp khoá").font(.system(size: 34, weight: .bold))
        Text(TrayLogic.dongHo(con)).font(.system(size: 88, weight: .bold, design: .rounded)).monospacedDigit()
        Text("máy sẽ khoá sau").font(.system(size: 17)).opacity(0.85)
        Text(TrayLogic.goiYKhoa(lyDo)).font(.system(size: 16)).multilineTextAlignment(.center)
      case .khoa(let lyDo):
        Text(TrayLogic.tieuDeKhoa(lyDo)).font(.system(size: 34, weight: .bold)).multilineTextAlignment(.center)
        Text(TrayLogic.goiYKhoa(lyDo)).font(.system(size: 17)).multilineTextAlignment(.center).opacity(0.9)
      case .khong:
        EmptyView()
      }
      XinThemView(tray: tray, xin: xin, sang: true)
        .padding(18)
        .background(RoundedRectangle(cornerRadius: 16).fill(Color.black.opacity(0.22)))
      Text("AiiGrow · máy này do Ba Mẹ quản lý").font(.system(size: 12)).opacity(0.7)
    }
    .foregroundColor(.white)
  }
}

/// Cửa sổ nhỏ nhắc «còn 5 phút / 1 phút».
struct NhacView: View {
  let phut: Int
  var body: some View {
    HStack(spacing: 12) {
      Image(systemName: "clock.fill").font(.system(size: 26)).foregroundColor(.xanhAiiGrow)
      VStack(alignment: .leading, spacing: 2) {
        Text("Còn \(phut) phút").font(.system(size: 16, weight: .semibold))
        Text("Con lưu bài đang làm nhé.").font(.system(size: 13)).foregroundColor(.secondary)
      }
    }
    .padding(16).frame(width: 300, alignment: .leading)
  }
}
