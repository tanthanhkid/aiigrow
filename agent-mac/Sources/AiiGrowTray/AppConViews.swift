// Giao diện app «AiiGrow của Con» trên Mac — ngang bản Windows (agent-win AppForm / NopBaiForm / ChoiBangDiemForm / BlockedForm):
// thanh bên (Rob, tên Con, trạng thái kết nối, 4 mục) + nội dung Hôm nay · Nhiệm vụ · Phần quà & điểm · Tin nhắn; nộp bài; chơi bằng điểm;
// màn «… chưa được mở». Clay gương (docs/THIET-KE-CLAY.md): lề thẻ ≥ 16, vùng bấm ≥ 44, chữ dài cắt «…» (không co cỡ chữ).
import AppKit
import SwiftUI
import AiiGrowCore

// MARK: - Mảnh dùng chung

/// Ảnh Rob theo tên (Mascot/<ten>.png); thiếu tệp ⇒ viên clay mầm cây.
struct RobView: View {
  let ten: String
  var cao: CGFloat = 180
  var body: some View {
    if let img = FluentIcon.anh(ten, thuMuc: "Mascot") {
      Image(nsImage: img).resizable().interpolation(.high).aspectRatio(contentMode: .fit)
        .frame(maxWidth: .infinity).frame(height: cao).accessibilityLabel("Rob")
    } else {
      VienClay(ten: "seedling", duPhong: "leaf.fill", nen: ClayMau.ngocSoft, co: min(cao, 96)).frame(maxWidth: .infinity).frame(height: cao)
    }
  }
}

/// Một dòng chữ không co: tối đa `dong` dòng rồi «…».
struct Chu: View {
  let s: String
  var co: CGFloat = 14
  var dam: Font.Weight = .regular
  var mau: Color = ClayMau.chu
  var dong: Int = 3
  init(_ s: String, co: CGFloat = 14, dam: Font.Weight = .regular, mau: Color = ClayMau.chu, dong: Int = 3) {
    self.s = s; self.co = co; self.dam = dam; self.mau = mau; self.dong = dong
  }
  var body: some View {
    Text(s).font(.system(size: co, weight: dam)).foregroundColor(mau)
      .lineLimit(dong).truncationMode(.tail).fixedSize(horizontal: false, vertical: true)
      .frame(maxWidth: .infinity, alignment: .leading)
  }
}

/// Thẻ clay của nội dung: lề trong 18 (≥16).
struct TheCon<N: View>: View {
  var nen: Color = ClayMau.the
  @ViewBuilder let noiDung: () -> N
  var body: some View {
    VStack(alignment: .leading, spacing: 8) { noiDung() }
      .padding(18).frame(maxWidth: .infinity, alignment: .leading)
      .clayThe(bo: 26, nen: nen)
  }
}

/// Nút clay có icon Fluent bên trái.
struct NutIcon: View {
  let chu: String
  var icon: String?
  var kieu: KieuNut = .sang
  var rong: CGFloat? = 240
  let lam: () -> Void
  var body: some View {
    Button(action: lam) {
      HStack(spacing: 8) {
        if let icon { HinhFluent(ten: icon, duPhong: "circle.fill", co: 22) }
        Text(chu).lineLimit(1).truncationMode(.tail)
      }
    }
    .buttonStyle(NutClayStyle(kieu: kieu, cao: 46))
    .frame(width: rong)
  }
}

// MARK: - Cửa sổ app của Con

struct AppConView: View {
  @ObservedObject var app: AppConModel
  @ObservedObject var tray: TrayModel
  var moXin: () -> Void = {}
  var moChoi: () -> Void = {}
  var moNop: (HvNhiemVu) -> Void = { _ in }
  /// «Ba Mẹ dùng máy»: khoá màn hình để Ba Mẹ chọn tài khoản của mình (không đăng xuất Con, không trừ điểm).
  var nhuongMay: () -> Void = { NhuongMay.khoaManHinh() }
  /// «Đổi bé / Đăng xuất» (máy dùng chung, L13) — máy về màn chọn tên.
  var doiBe: () -> Void = {}
  @State private var quaHoi: HvQua?
  @State private var hoiDoiBe = false
  @State private var quaCuaCon = false
  /// Máy dùng chung có màn chọn tên (daemon mới + máy chủ S3).
  private var coDoiBe: Bool { tt?.nguoiDung != nil && tt?.mayRieng != true }

  private var tt: TrangThai? { tray.tt }
  private var dsChoi: [String] { tt?.dsChoi ?? [] }
  private var daNoi: Bool { !tray.matKetNoi && tt?.matMang != true }
  private var tenCon: String {
    let t = app.tq?.tenCon ?? ""
    return !t.isEmpty ? t : (tt?.tenCon ?? "")
  }
  private var xongHet: Bool { (app.tq?.nhiemVu.isEmpty == false) && app.tq.map(HocVienView.soViecMo) == 0 }

  var body: some View {
    HStack(alignment: .top, spacing: 18) {
      thanhBen
      VStack(alignment: .leading, spacing: 6) {
        if let b = bannerKetNoi { banner(b) }
        if app.muc != .homNay {      // Hôm nay: tiêu đề là lời chào «Chào Bảo Anh!» (thiết kế 19)
          Text(tieuDe).font(.system(size: 26, weight: .bold)).lineLimit(1).truncationMode(.tail).padding(.top, 6)
        }
        if !app.thongBao.isEmpty {
          Chu(app.thongBao, co: 14, dam: .semibold, mau: app.thongBaoLoi ? ClayMau.loi : ClayMau.ngocInk, dong: 2)
        }
        ScrollView {
          VStack(alignment: .leading, spacing: 14) { noiDung }
            .padding(.horizontal, 4).padding(.top, 6).padding(.bottom, 28)   // đáy dư cho bóng thẻ cuối
            .frame(minWidth: 0, idealWidth: 560, maxWidth: 760, alignment: .leading)   // chữ dài không đẩy cửa sổ quá cỡ tối thiểu
        }
      }
      .frame(maxWidth: .infinity, alignment: .topLeading)
    }
    .padding(18)
    .frame(minWidth: 880, minHeight: 600)
    .nenClay()
    .sheet(item: $quaHoi) { q in
      DoiQuaView(q: q, sao: app.ch?.soDu ?? app.tq?.soDu ?? 0, app: app, dong: { quaHoi = nil },
                 lamThem: { quaHoi = nil; app.chon(.nhiemVu) }, xemQua: { quaHoi = nil; app.chon(.phanQua) })
    }
    .sheet(isPresented: $hoiDoiBe) { doiBeSheet }
  }

  private var tieuDe: String {
    switch app.muc {
    case .homNay: return "Hôm nay"
    case .nhiemVu: return "Nhiệm vụ của con"
    case .phanQua: return "Sao & quà"
    case .tinNhan: return "Tin nhắn"
    }
  }

  // MARK: thanh bên

  private var thanhBen: some View {
    VStack(alignment: .leading, spacing: 10) {
      RobView(ten: MascotView.chon(app.muc, daNoi: daNoi, xongHetViec: xongHet), cao: 170)
      HStack(spacing: 10) {
        if !tenCon.isEmpty { AvatarBe(chu: String(tenCon.split(separator: " ").first?.first ?? "?").uppercased(), co: 30) }
        Text(tenCon.isEmpty ? "AiiGrow" : tenCon).font(.system(size: 20, weight: .bold)).lineLimit(1).truncationMode(.tail)
      }
      let (dongKn, tot) = ketNoi
      Text("● " + dongKn + (tot ? " · " + AppConView.gioPhut.string(from: Date()) : "")).font(.system(size: 12, weight: .bold)).lineLimit(2).truncationMode(.tail)
        .foregroundColor(tot ? ClayMau.ngocInk : ClayMau.loi)
        .padding(.horizontal, 10).padding(.vertical, 6)
        .background(Capsule().fill(tot ? ClayMau.ngocSoft : ClayMau.canhSoft))
        .padding(.bottom, 6)
      ForEach(Array(AppConView.dsMuc.enumerated()), id: \.offset) { _, m in
        let n = m.0 == .nhiemVu ? (app.tq.map(HocVienView.soViecMo) ?? 0) : (m.0 == .tinNhan ? app.tinMoi : 0)
        Button { withAnimation(ClayMotion.bat) { app.chon(m.0) } } label: {
          HStack(spacing: 10) {
            HinhFluent(ten: m.2, duPhong: "circle.fill", co: 24)
            Text(m.1).lineLimit(1).truncationMode(.tail).frame(maxWidth: .infinity, alignment: .leading)
            if n > 0 {
              Text("\(n)").font(.system(size: 12, weight: .bold)).foregroundColor(.white)
                .padding(.horizontal, 8).padding(.vertical, 2).background(Capsule().fill(ClayMau.ngoc))
            }
          }
        }
        .buttonStyle(NutClayStyle(kieu: app.muc == m.0 ? .ngoc : .sang, bo: 20, cao: 48))
        .accessibilityAddTraits(app.muc == m.0 ? .isSelected : [])
      }
      Spacer(minLength: 8)
      if coDoiBe {
        Button { hoiDoiBe = true } label: {
          HStack(spacing: 8) { HinhFluent(ten: "seedling", duPhong: "person.2.fill", co: 20); Text("Đổi bé / Đăng xuất") }
        }
        .buttonStyle(.plain).font(.system(size: 15, weight: .bold)).foregroundColor(ClayMau.ngocInk).frame(minHeight: 44)
      }
      Button("Ba Mẹ dùng máy ›", action: nhuongMay).buttonStyle(.plain)
        .font(.system(size: 12, weight: .semibold)).foregroundColor(ClayMau.chu3).frame(minHeight: 32)
    }
    .padding(16)
    .frame(width: 250)
    .frame(maxHeight: .infinity, alignment: .top)
    .clayThe(bo: 30)
  }

  static let dsMuc: [(MucApp, String, String)] = [
    (.homNay, "Hôm nay", "alarm_clock"), (.nhiemVu, "Nhiệm vụ", "memo"), (.phanQua, "Sao & quà", "wrapped_gift"), (.tinNhan, "Tin nhắn", "speech_balloon"),
  ]

  /// (chữ, tốt?) cho viên trạng thái.
  private var ketNoi: (String, Bool) {
    if tray.matKetNoi || tt == nil { return (TrayLogic.dongKhoiDongLai, false) }
    if tt?.daGhep != true { return ("Máy chưa ghép với Ba Mẹ", false) }
    if tt?.matMang == true { return ("Mất mạng · giờ vẫn chạy", false) }
    return ("Đã kết nối", true)
  }

  private var bannerKetNoi: (String, String)? {
    if tray.matKetNoi || tt == nil { return (TrayLogic.dongKhoiDongLai, "Con chờ vài giây nhé. Lâu quá thì nhờ Ba Mẹ xem giúp.") }
    if tt?.matMang == true { return ("Máy đang mất mạng", "Nhiệm vụ và phần quà sẽ cập nhật khi có mạng lại.") }
    return nil
  }

  private func banner(_ b: (String, String)) -> some View {
    VStack(alignment: .leading, spacing: 2) {
      Chu(b.0, co: 15, dam: .bold, mau: ClayMau.loi, dong: 1)
      Chu(b.1, co: 13, mau: ClayMau.loi, dong: 2)
    }
    .padding(14).frame(maxWidth: 760, alignment: .leading)
    .background(RoundedRectangle(cornerRadius: 18, style: .continuous).fill(ClayMau.canhSoft))
  }

  // MARK: nội dung

  @ViewBuilder private var noiDung: some View {
    switch app.muc {
    case .homNay: homNay
    case .nhiemVu: nhiemVu
    case .phanQua: phanQua
    case .tinNhan: tinNhan
    }
  }

  /// Mục chưa có dữ liệu: chưa ghép / đang tải / lỗi (lý do + «Thử lại»). nil = có dữ liệu.
  @ViewBuilder private func chuaCo(chuaGhep: String, dangTai: String) -> some View {
    switch HocVienView.trangThaiTai(daGhep: tt?.daGhep == true, coDuLieu: app.tq != nil, loi: app.loiTai) {
    case .chuaGhep: Chu(chuaGhep, co: 15, mau: ClayMau.chu3)
    case .dangTai: Chu(dangTai, co: 15, mau: ClayMau.chu3)
    case .loi:
      TheCon(nen: ClayMau.canhSoft) {
        Chu(app.muc == .nhiemVu ? "Chưa tải được nhiệm vụ" : "Chưa tải được", co: 18, dam: .bold, mau: ClayMau.loi)
        Chu(tt?.matMang == true ? "Máy đang mất mạng. Con xem Wi-Fi rồi bấm tải lại nhé." : (app.loiTai ?? ""), co: 14, mau: ClayMau.loi)
        NutIcon(chu: app.muc == .nhiemVu ? "Tải lại nhiệm vụ" : "Thử lại", kieu: .thanChi, rong: 220) { Task { await app.lamMoi(dsChoi: dsChoi) } }
        if let q = tt.flatMap(TrayLogic.dongQuy) { Chu("Giờ chơi vẫn chạy như bình thường · còn \(q)", co: 13, mau: ClayMau.chu3, dong: 1) }
      }
    case .xong: EmptyView()
    }
  }

  // ---- Hôm nay

  @ViewBuilder private var homNay: some View {
    VStack(alignment: .leading, spacing: 2) {
      Chu(tenCon.isEmpty ? "Xin chào!" : "Chào \(tenCon)!", co: 28, dam: .bold, dong: 1)
      Chu(ManMac.thuGio(Date()), co: 13, mau: ClayMau.chu3, dong: 1)
    }
    .vaoLanLuot(0)
    if let t = tt, t.daGhep, !tray.matKetNoi {
      TimelineView(.periodic(from: .now, by: 1)) { ctx in
        let g = TrayLogic.giayConLai(t, nhanLuc: tray.nhanLuc, bayGio: ctx.date)
        let tong = t.quyTongPhut ?? app.tq?.quy?.tongPhut
        let con = t.quyConPhut ?? app.tq?.quy?.conPhut
        TheCon {
          HStack(alignment: .top, spacing: 14) {
            VienClay(ten: "alarm_clock", duPhong: "clock.fill", nen: ClayMau.the, co: 46)
            VStack(alignment: .leading, spacing: 0) {
              Chu("Giờ chơi còn lại", co: 15, mau: ClayMau.chu3, dong: 1)
              Text(t.cheDo == .khoa ? "Đang khoá" : (TrayLogic.dongQuy(t) ?? g.map { TrayLogic.dongHo($0) } ?? "Không giới hạn"))
                .font(.system(size: 50, weight: .bold, design: .rounded)).monospacedDigit().foregroundColor(ClayMau.ngocInk).lineLimit(1)
            }
            Spacer(minLength: 8)
            NutIcon(chu: "Xin Ba Mẹ thêm giờ", icon: "hourglass_not_done", kieu: .sang, rong: 214, lam: moXin)
          }
          if let tong, tong > 0, let con {
            GeometryReader { geo in
              ZStack(alignment: .leading) {
                Capsule().fill(ClayMau.ngocSoft)
                Capsule().fill(ClayMau.ngoc).frame(width: geo.size.width * CGFloat(min(1, max(0, Double(tong - con) / Double(tong)))))
              }
            }
            .frame(height: 12).padding(.top, 6)
            Chu("Đã chơi \(max(0, tong - con)) / \(tong) phút", co: 15, dam: .bold, dong: 1)
          }
          if let ds = t.homNayTheoApp, !ds.isEmpty {
            Chu(ds.prefix(3).map { "\(HocVienView.tenMucChoi($0.muc)) \($0.phut) phút" }.joined(separator: " · "), co: 13, mau: ClayMau.chu3, dong: 1)
          }
        }
      }
      .vaoLanLuot(1)
      HStack(alignment: .top, spacing: 18) {
        TheCon(nen: ClayMau.diemSoft) {
          HStack(spacing: 12) {
            VienClay(ten: "star", duPhong: "star.fill", nen: ClayMau.the, co: 48)
            VStack(alignment: .leading, spacing: 0) {
              Chu("Sao của con", co: 14, mau: ClayMau.diemInk, dong: 1)
              Text("\(app.tq?.soDu ?? 0) sao").font(.system(size: 30, weight: .bold, design: .rounded)).foregroundColor(ClayMau.diemInk).lineLimit(1)
            }
          }
          Chu("10 sao = \(app.tq?.quy?.phut10Sao ?? 10) phút chơi", co: 13, mau: ClayMau.diemInk, dong: 1)
          NutIcon(chu: "Đổi 10 sao lấy 10 phút", icon: "star", kieu: .sang, rong: nil, lam: moChoi)
            .disabled(app.tq.map { $0.soDu < 10 } ?? true || t.matMang)
        }
        .frame(minWidth: 0, idealWidth: 260, maxWidth: .infinity)
        TheCon {
          let tq = app.tq
          let nhom = ManMac.nhomNhiemVu(tq?.nhiemVu ?? [])
          HStack(spacing: 12) {
            VienClay(ten: "memo", duPhong: "doc.text", nen: ClayMau.the, co: 48)
            VStack(alignment: .leading, spacing: 0) {
              Chu("Nhiệm vụ hôm nay", co: 14, mau: ClayMau.chu3, dong: 1)
              Text("\(tq?.nhiemVu.count ?? 0) việc").font(.system(size: 30, weight: .bold, design: .rounded)).lineLimit(1)
            }
          }
          Chu("\(nhom.choDuyet.count) chờ Ba Mẹ duyệt · \(nhom.chuaLam.count) chưa làm", co: 13, dam: .bold, mau: ClayMau.canh, dong: 1)
          NutIcon(chu: "Xem \(tq?.nhiemVu.count ?? 0) nhiệm vụ", icon: "memo", kieu: .thanChi, rong: nil) { app.chon(.nhiemVu) }
        }
        .frame(minWidth: 0, idealWidth: 260, maxWidth: .infinity)
      }
      .vaoLanLuot(2)
      if let k = app.tq?.loiKhen.first {
        TheCon {
          HStack(spacing: 14) {
            VienClay(ten: "speech_balloon", duPhong: "bubble.left.fill", nen: ClayMau.the, co: 48)
            VStack(alignment: .leading, spacing: 2) {
              Chu("Ba Mẹ" + (k.luc.map { " · " + AppConView.gioPhut.string(from: $0) } ?? ""), co: 15, dam: .bold, dong: 1)
              Chu("«\(k.noiDung)»", co: 14, mau: ClayMau.chu2, dong: 2)
            }
            .frame(minWidth: 0, idealWidth: 300, maxWidth: .infinity, alignment: .leading)
            Spacer(minLength: 8)
            NutIcon(chu: "Đọc tin", kieu: .sang, rong: 140) { app.chon(.tinNhan) }
          }
        }
        .vaoLanLuot(3)
      }
      if tt?.nhapMaOffline == true, tt?.cheDo != .khoa {
        MaOfflineView().padding(18).clayThe(bo: 26)
      }
    } else {
      TheCon(nen: ClayMau.canhSoft) {
        Chu(ketNoi.0, co: 16, dam: .bold, mau: ClayMau.loi)
        Chu(tt?.daGhep == false ? "Ba Mẹ cần ghép máy này trong app AiiGrow của Ba Mẹ." : "Con chờ vài giây nhé.", co: 14, mau: ClayMau.loi)
      }
    }
  }

  static let gioPhut: DateFormatter = { let f = DateFormatter(); f.dateFormat = "HH:mm"; return f }()

  /// 17 «Đổi bé / Đăng xuất».
  private var doiBeSheet: some View {
    VStack(spacing: 14) {
      AvatarBe(chu: String(tenCon.split(separator: " ").first?.first ?? "?").uppercased(), co: 64)
      Text(tenCon).font(.system(size: 20, weight: .bold))
      Text("● Đang dùng máy này").font(.system(size: 13, weight: .bold)).foregroundColor(ClayMau.ngocInk)
      HStack(spacing: 12) {
        Button("Đổi bé") { hoiDoiBe = false; doiBe() }.buttonStyle(NutClayStyle(kieu: .ngoc))
        Button("Đăng xuất") { hoiDoiBe = false; doiBe() }.buttonStyle(NutClayStyle(kieu: .sang))
      }
      Text("Đăng xuất thì máy khoá lại. Vào lại bằng tên + PIN.").font(.system(size: 12)).foregroundColor(ClayMau.chu3)
      Button("Ở lại") { hoiDoiBe = false }.buttonStyle(NutClayStyle(kieu: .sang)).keyboardShortcut(.cancelAction)
    }
    .padding(26).frame(width: 380).nenClay().foregroundColor(ClayMau.chu)
  }

  // ---- Nhiệm vụ

  @ViewBuilder private var nhiemVu: some View {
    chuaCo(chuaGhep: "Máy chưa ghép với Ba Mẹ nên chưa có nhiệm vụ.", dangTai: "Đang tải nhiệm vụ…")
    if let tq = app.tq {
      let ds = HocVienView.sapXep(tq.nhiemVu)
      let nhom = ManMac.nhomNhiemVu(ds)
      let khac = ds.filter { v in !nhom.choDuyet.contains(v) && !nhom.chuaLam.contains(v) }
      if ds.isEmpty { Chu("Chưa có nhiệm vụ nào. Khi Ba Mẹ giao việc, con sẽ thấy ở đây và nhận thông báo.", co: 15, mau: ClayMau.chu3) }
      if !nhom.choDuyet.isEmpty { Chu("Chờ Ba Mẹ duyệt (\(nhom.choDuyet.count))", co: 16, dam: .bold, mau: ClayMau.chu2, dong: 1) }
      ForEach(Array(nhom.choDuyet.enumerated()), id: \.element.id) { i, v in theViec(v).vaoLanLuot(min(i, 6)) }
      if !nhom.chuaLam.isEmpty { Chu("Chưa làm (\(nhom.chuaLam.count))", co: 16, dam: .bold, mau: ClayMau.chu2, dong: 1).padding(.top, 4) }
      ForEach(Array(nhom.chuaLam.enumerated()), id: \.element.id) { i, v in theViec(v).vaoLanLuot(min(i + 1, 6)) }
      ForEach(khac, id: \.id) { v in theViec(v) }
      if !ds.isEmpty {
        Chu("Ba Mẹ duyệt xong là sao vào ví ngay · Đang có \(tq.soDu) sao" + (tq.diemChoDuyet > 0 ? " · chờ thêm \(tq.diemChoDuyet) sao" : ""),
            co: 13, dam: .semibold, mau: ClayMau.diemInk, dong: 2)
      }
      let gan = tq.gan.filter { ["cho_duyet", "tu_choi", "duoc_duyet"].contains($0.trangThai) }.prefix(8)
      if !gan.isEmpty {
        Chu("Gần đây", co: 18, dam: .bold, dong: 1).padding(.top, 6)
        ForEach(Array(gan), id: \.id) { theLuot($0) }
      }
    }
  }

  private func theViec(_ v: HvNhiemVu) -> some View {
    TheCon(nen: v.trangThai == "can_bo_sung" ? ClayMau.canhSoft : ClayMau.the) {
      HStack(alignment: .firstTextBaseline, spacing: 10) {
        Chu(v.ten, co: 17, dam: .bold, dong: 2)
        Text("+\(v.diem) sao").font(.system(size: 14, weight: .bold)).foregroundColor(ClayMau.diemInk)
          .padding(.horizontal, 10).padding(.vertical, 4).background(Capsule().fill(ClayMau.diemSoft)).fixedSize()
      }
      if !v.moTa.isEmpty { Chu(v.moTa, co: 14, mau: ClayMau.chu3) }
      let dong = [HocVienView.trangThaiText(v.trangThai), HocVienView.hanText(v.han, bayGio: Date()),
                  v.dangCho > 0 ? "\(v.dangCho) bài chờ duyệt" : nil, v.giaoRieng ? "Ba Mẹ giao riêng" : nil].compactMap { $0 }
      Chu(dong.joined(separator: "  ·  "), co: 13, dam: .medium, mau: v.trangThai == "can_bo_sung" ? ClayMau.canh : ClayMau.chu3, dong: 2)
      if v.trangThai == "can_bo_sung", let l = v.lyDo, !l.isEmpty { Chu("Ba Mẹ nhắn: " + l, co: 14, dam: .semibold, mau: ClayMau.canh) }
      if v.phutToiThieu > 0, ["san_sang", "dang_lam"].contains(v.trangThai) {
        Chu("Làm ít nhất \(v.phutToiThieu) phút rồi mới nộp được.", co: 13, mau: ClayMau.chu3, dong: 2)
      }
      if let nut = HocVienView.nutText(v) {
        NutIcon(chu: nut, icon: v.trangThai == "san_sang" ? "star" : "memo", kieu: v.trangThai == "san_sang" ? .thanChi : .sang, rong: 220) {
          if v.trangThai == "san_sang" { Task { await app.nhanViec(v, dsChoi: dsChoi) } }
          else if v.luot == nil { app.noi("Con bấm Nhận việc trước nhé.", loi: true) }
          else { moNop(v) }
        }
        .disabled(app.dangBan)
        .padding(.top, 4)
      }
    }
  }

  private func theLuot(_ g: HvLuot) -> some View {
    TheCon {
      Chu(g.ten + (g.trangThai == "duoc_duyet" && g.diem != nil ? "   ·   +\(g.diem!) sao" : ""), co: 15, dam: .bold, dong: 2)
      Chu(HocVienView.trangThaiText(g.trangThai) + ((g.lyDo ?? "").isEmpty ? "" : " · " + g.lyDo!), co: 13,
          mau: g.trangThai == "tu_choi" ? ClayMau.loi : ClayMau.chu3)
      if let k = g.loiKhen, !k.isEmpty { Chu("Ba Mẹ: " + k, co: 14, mau: ClayMau.ngocInk) }
    }
  }

  // ---- Phần quà & điểm

  @ViewBuilder private var phanQua: some View {
    chuaCo(chuaGhep: "Máy chưa ghép với Ba Mẹ nên chưa có phần quà.", dangTai: "Đang tải…")
    if let tq = app.tq {
      TheCon(nen: ClayMau.diemSoft) {
        HStack(spacing: 14) {
          VienClay(ten: "star", duPhong: "star.fill", nen: ClayMau.the, co: 60)
          VStack(alignment: .leading, spacing: 0) {
            Chu("Con đang có", co: 14, mau: ClayMau.diemInk, dong: 1)
            Text("\(tq.soDu) sao").font(.system(size: 38, weight: .bold, design: .rounded)).foregroundColor(ClayMau.diemInk).lineLimit(1)
            if tq.diemChoDuyet > 0 { Chu("+\(tq.diemChoDuyet) sao chờ Ba Mẹ duyệt", co: 13, mau: ClayMau.diemInk, dong: 1) }
            if let g = app.ch?.saoGiu, g > 0 { Chu("Đang giữ \(g) sao chờ Ba Mẹ trao", co: 13, mau: ClayMau.diemInk, dong: 1) }
          }
          Spacer(minLength: 8)
          VStack(alignment: .leading, spacing: 8) {
            Chu("10 sao = \(tq.quy?.phut10Sao ?? 10) phút chơi", co: 13, dam: .bold, mau: ClayMau.diemInk, dong: 1)
            NutIcon(chu: "Đổi 10 sao lấy 10 phút", icon: "star", kieu: .sang, rong: 250, lam: moChoi).disabled(tq.soDu < 10 || tt?.matMang == true)
          }
          .frame(width: 260)
        }
      }
      .vaoLanLuot(0)
      HStack {
        Chu("Đổi quà", co: 17, dam: .bold, dong: 1)
        Spacer()
        if !tq.phieuCho.isEmpty {
          Button("Quà của con ›") { quaCuaCon.toggle() }.buttonStyle(.plain).font(.system(size: 14, weight: .bold)).foregroundColor(ClayMau.ngocInk)
        }
      }
      .padding(.top, 2)
      if quaCuaCon {
        ForEach(tq.phieuCho, id: \.id) { p in
          TheCon {
            HStack(spacing: 12) {
              VienClay(ten: "wrapped_gift", duPhong: "gift.fill", nen: ClayMau.the, co: 44)
              VStack(alignment: .leading, spacing: 2) {
                Chu(p.ten, co: 16, dam: .bold, dong: 1)
                Chu("Đang giữ \(p.diem) sao · Ba Mẹ trao mới trừ", co: 13, mau: ClayMau.chu3, dong: 1)
              }
              Text("Chờ trao").font(.system(size: 13, weight: .bold)).foregroundColor(ClayMau.canh)
                .padding(.horizontal, 12).padding(.vertical, 6).background(Capsule().fill(ClayMau.canhSoft)).fixedSize()
            }
          }
        }
      }
      if let ch = app.ch, !ch.qua.isEmpty {
        ForEach(Array(ch.qua.enumerated()), id: \.element.id) { i, q in
          TheCon {
            HStack(spacing: 12) {
              VienClay(ten: "wrapped_gift", duPhong: "gift.fill", nen: ClayMau.the, co: 44)
              VStack(alignment: .leading, spacing: 2) {
                Chu(q.ten, co: 17, dam: .bold, dong: 1)
                Chu(ManMac.dongQua(q), co: 13, dam: .semibold, mau: q.choTraoTu != nil ? ClayMau.ngocInk : (q.du ? ClayMau.ngocInk : ClayMau.canh), dong: 1)
              }
              if q.conThieu > 0, q.choTraoTu == nil {
                GeometryReader { geo in
                  ZStack(alignment: .leading) {
                    Capsule().fill(ClayMau.diemSoft)
                    Capsule().fill(ClayMau.hex(0xf2b705)).frame(width: geo.size.width * CGFloat(max(0.04, Double(q.diem - q.conThieu) / Double(max(1, q.diem)))))
                  }
                }
                .frame(width: 110, height: 9)
              }
              Text("\(q.diem) sao").font(.system(size: 14, weight: .bold)).foregroundColor(ClayMau.diemInk)
                .padding(.horizontal, 14).padding(.vertical, 6).background(Capsule().fill(ClayMau.diemSoft)).fixedSize()
              if q.du, q.choTraoTu == nil {
                Button("Đổi \(q.diem) sao") { quaHoi = q }.buttonStyle(NutClayStyle(kieu: .sang, bo: 18, cao: 44)).frame(width: 170)
                  .disabled(app.dangBan || tt?.matMang == true)
              }
            }
            .contentShape(Rectangle())
            .onTapGesture { if q.choTraoTu == nil { quaHoi = q } }
          }
          .vaoLanLuot(min(i + 1, 6))
        }
      } else {
        Chu(app.ch == nil ? "Chưa tải được danh sách quà." : "Ba Mẹ chưa đặt phần quà nào. Con cứ làm nhiệm vụ để nhận sao nhé!", co: 15, mau: ClayMau.chu3)
      }
    }
  }

  // ---- Tin nhắn

  static let traLoiNhanh = ["Con cảm ơn ạ", "Con sẽ cố gắng", "Con yêu Ba Mẹ"]

  @ViewBuilder private var tinNhan: some View {
    let khen = app.tq?.loiKhen ?? []
    let tin = app.tin?.ds ?? []
    if !khen.isEmpty {
      Chu("Ba Mẹ nhắn con", co: 18, dam: .bold, dong: 1)
      ForEach(khen, id: \.id) { l in
        TheCon {
          Chu("Ba Mẹ: " + l.noiDung, co: 15, dam: .bold, mau: ClayMau.ngocInk)
          if let ph = l.phanHoi, !ph.isEmpty {
            Chu("Con: " + ph, co: 14)
          } else {
            HStack(spacing: 12) {
              ForEach(AppConView.traLoiNhanh, id: \.self) { c in
                Button(c) { Task { await app.traLoi(l, c, dsChoi: dsChoi) } }
                  .buttonStyle(NutClayStyle(kieu: .sang, bo: 16, cao: 44)).disabled(app.dangBan)
              }
            }
            .padding(.top, 4)
          }
        }
      }
    }
    if !tin.isEmpty {
      Chu("Thông báo gần đây", co: 18, dam: .bold, dong: 1).padding(.top, khen.isEmpty ? 0 : 6)
      ForEach(Array(tin.prefix(20)), id: \.id) { x in
        TheCon {
          Chu(x.tieu, co: 15, dam: .bold, dong: 2)
          if !x.noi.isEmpty { Chu(x.noi, co: 14, mau: ClayMau.chu3) }
          if let l = x.luc { Chu(AppConView.gio.string(from: l), co: 12, mau: ClayMau.chu3, dong: 1) }
        }
      }
    }
    if khen.isEmpty && tin.isEmpty {
      if app.tq == nil { chuaCo(chuaGhep: "Máy chưa ghép với Ba Mẹ nên chưa có tin nhắn.", dangTai: "Đang tải…") }
      else { Chu("Chưa có tin nhắn nào.", co: 15, mau: ClayMau.chu3) }
    }
  }

  static let gio: DateFormatter = { let f = DateFormatter(); f.dateFormat = "HH:mm dd/MM"; return f }()
}

// MARK: - Nộp bài

struct NopBaiView: View {
  let nv: HvNhiemVu
  @ObservedObject var app: AppConModel
  var xong: (HvNopKq) -> Void = { _ in }
  @State private var ghiChu = ""
  @State private var anh: String?
  @State private var tenAnh = ""
  @State private var loi = ""
  @State private var thanhCong = ""
  @State private var dangGui = false

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 12) {
        VienClay(ten: "memo", duPhong: "doc.text", nen: ClayMau.ngocSoft, co: 48)
        Chu(nv.ten, co: 19, dam: .bold, dong: 2)
      }
      if !nv.moTa.isEmpty { Chu(nv.moTa, co: 14, mau: ClayMau.chu3) }
      if nv.trangThai == "can_bo_sung", let l = nv.lyDo, !l.isEmpty { Chu("Ba Mẹ nhắn: " + l, co: 14, dam: .semibold, mau: ClayMau.canh) }
      Chu(HocVienView.canChu(nv) ? "Con viết vài câu kể lại nhé" : "Ghi chú cho Ba Mẹ (không bắt buộc)", co: 13, dam: .medium, mau: ClayMau.chu3, dong: 1)
      TextEditor(text: Binding(get: { ghiChu }, set: { ghiChu = String($0.prefix(500)) }))
        .font(.system(size: 14)).scrollContentBackground(.hidden).padding(10).frame(height: 96).clayLom()
      if HocVienView.canAnh(nv) || nv.trangThai == "can_bo_sung" {
        NutIcon(chu: anh == nil ? "Chọn ảnh…" : "Chọn ảnh khác…", icon: "desktop_computer", rong: nil) { chonAnh() }
        if !tenAnh.isEmpty { Chu("Đã chọn: " + tenAnh, co: 13, mau: ClayMau.chu3, dong: 1) }
      }
      Button(dangGui ? "Đang gửi…" : "Nộp cho Ba Mẹ") { gui() }
        .buttonStyle(NutClayStyle(kieu: .thanChi)).disabled(dangGui || !thanhCong.isEmpty)
      if !loi.isEmpty { Chu(loi, co: 14, dam: .medium, mau: ClayMau.loi) }
      if !thanhCong.isEmpty { Chu(thanhCong, co: 14, dam: .semibold, mau: ClayMau.ngocInk) }
    }
    .padding(18).clayThe().vaoLanLuot(0)
    .padding(22).padding(.bottom, 12).frame(width: 460).nenClay()
  }

  private func chonAnh() {
    let p = NSOpenPanel()
    p.title = "Chọn ảnh bằng chứng"; p.allowedContentTypes = [.jpeg, .png, .heic, .tiff, .bmp, .gif]
    p.allowsMultipleSelection = false; p.canChooseDirectories = false
    guard p.runModal() == .OK, let u = p.url else { return }
    if let img = NSImage(contentsOf: u), let d = AnhNop.nen(img) {
      anh = d.base64EncodedString(); tenAnh = u.lastPathComponent; loi = ""
    } else {
      anh = nil; tenAnh = ""; loi = "Ảnh này chưa dùng được (lỗi hoặc quá nặng). Con chọn ảnh khác nhé."
    }
  }

  private func gui() {
    guard !dangGui else { return }
    dangGui = true; loi = ""
    let ghi = ghiChu, a = anh
    Task {
      let (kq, l) = await app.nop(nv, ghiChu: ghi, anhBase64: a)
      dangGui = false
      guard let kq else { loi = l ?? "Chưa nộp được. Con thử lại nhé."; return }
      thanhCong = HocVienView.nopThongBao(kq)
      DispatchQueue.main.asyncAfter(deadline: .now() + 2.2) { xong(kq) }
    }
  }
}

// MARK: - Dùng sao thêm giờ chơi (05/11 — thay «Chơi bằng điểm»: mọi app Giải trí dùng chung quỹ phút, sao đổi lấy phút cộng vào quỹ)

@MainActor
final class ChoiModel: ObservableObject {
  @Published var phut: [String: Int] = [:]
  @Published var thongBao = ""
  @Published var loi = false
  @Published var dangGui = false
  @Published var xong = false
  let goi: (YeuCauTray) async -> TraLoi
  init(goi: @escaping (YeuCauTray) async -> TraLoi = AppConModel.goiThat) { self.goi = goi }

  /// Hỏi số phút cho TỪNG mục (máy chủ định giá theo nhóm), tuần tự (giới hạn kết nối IPC mỗi uid), tối đa 12 mục đầu; daemon nhớ 60 giây.
  func hoiPhut(_ ds: [String]) async {
    let goi = self.goi
    await withTaskGroup(of: (String, Int?).self) { g in        // song song — GioiHanIPC giữ tối đa 2 lệnh cùng lúc
      for m in ds.prefix(12) {
        g.addTask { if case let .choi(tt, p, _) = await goi(.choiThu(muc: m)), tt == "duoc", let p, p > 0 { return (m, p) }; return (m, nil) }
      }
      for await (m, p) in g { if let p { phut[m] = p } }
    }
  }

  /// «Dùng sao»: hoc-vien/doi-sao {phut} — máy chủ kiểm số sao, trần đổi/ngày, giờ ngủ; trừ sao + cộng phút vào quỹ hôm nay.
  func doiSao(_ phut: Int) async {
    guard !dangGui else { return }
    dangGui = true; loi = false; thongBao = "Đang đổi sao…"
    let (chu, duoc) = DungSao.ketQua(await goi(.hocVien(method: "POST", path: "hoc-vien/doi-sao", than: DungSao.than(phut: phut))), phut: phut)
    dangGui = false
    thongBao = chu; loi = !duoc; xong = duoc
  }

  func choi(_ m: String) async {
    guard !dangGui else { return }
    dangGui = true; loi = false; thongBao = "Đang hỏi máy chủ…"
    let (chu, duoc) = ChoiBangDiem.ketQua(await goi(.choi(muc: m)))
    dangGui = false
    thongBao = chu; loi = !duoc; xong = duoc
  }
}

/// Cửa sổ «Dùng sao thêm giờ chơi» — cùng khung cửa sổ «Chơi bằng điểm» cũ (420 rộng, thẻ Clay), mỗi nút một mức 15 / 30 / 60 phút.
struct ChoiBangDiemView: View {
  /// Tỷ lệ «10 sao = X phút» (hoc-vien/tong-quan › quy.tyLe); nil = chưa biết (1 sao = 1 phút).
  var phut10Sao: Int = 10
  /// Số sao con đang có (nil = chưa tải).
  var sao: Int? = nil
  @ObservedObject var m: ChoiModel
  var conPhut = 0
  var xinThem: (() -> Void)? = nil
  var lamNhiemVu: (() -> Void)? = nil
  var dong: () -> Void = {}

  /// Thiết kế 49–51 «Đổi sao lấy giờ».
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      Text("Đổi sao lấy giờ").font(.system(size: 13, weight: .semibold)).foregroundColor(ClayMau.chu3)
      DoiSaoView(sao: sao ?? 0, phut10Sao: phut10Sao, m: m, conPhut: conPhut, xinThem: xinThem, lamNhiemVu: lamNhiemVu, dong: dong)
    }
    .padding(18).clayThe().vaoLanLuot(0)
    .padding(22).padding(.bottom, 12).frame(width: 420).nenClay()
  }
}

// MARK: - App bị chặn

struct ChanAppView: View {
  let ten: String
  let lyDo: String?
  /// Hết giờ chơi + còn sao ⇒ nút «Dùng sao thêm giờ».
  let coChoi: Bool
  @ObservedObject var m: ChoiModel
  var muc: String
  var xinPhep: () -> Void = {}
  var dong: () -> Void = {}
  /// Mở cửa sổ «Dùng sao thêm giờ chơi».
  var dungSao: () -> Void = {}

  static func lyDoText(_ s: String?) -> String {
    switch s {
    case "ba_me_chan": return "Ba Mẹ đã chặn app này trên máy."
    case QuyGio.lyDoHetGio: return "Hôm nay con đã chơi hết giờ rồi."
    case QuyGio.lyDoGioHoc: return "Đang giờ học. Bây giờ chỉ mở được app học."
    case "chi_app_hoc": return "Máy chỉ mở app Ba Mẹ cho phép."
    case "trinh_duyet": return "Trình duyệt này chưa lọc web được. Con dùng trình duyệt Ba Mẹ cho phép nhé."
    default: return "Chưa được Ba Mẹ cho mở."
    }
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 12) {
        VienClay(ten: "stop_sign", duPhong: "hand.raised.fill", nen: ClayMau.canhSoft, co: 52)
        Chu(lyDo == QuyGio.lyDoGioHoc ? "Đang giờ học" : "\(ten) chưa được mở", co: 18, dam: .bold, dong: 2)
      }
      Chu(ChanAppView.lyDoText(lyDo), co: 14, mau: ClayMau.chu3)
      if coChoi {
        NutIcon(chu: "Dùng sao thêm giờ", icon: "star", kieu: .thanChi, rong: nil, lam: dungSao)
      }
      if lyDo != "ba_me_chan" {
        NutIcon(chu: lyDo == QuyGio.lyDoHetGio ? "Xin Ba Mẹ thêm giờ" : lyDo == QuyGio.lyDoGioHoc ? "Xin Ba Mẹ mở ngoại lệ" : "Xin Ba Mẹ mở \(ten)", icon: "speech_balloon",
                kieu: coChoi ? .sang : .thanChi, rong: nil, lam: xinPhep)
      }
      Button("Đóng", action: dong).buttonStyle(NutClayStyle(kieu: .sang)).keyboardShortcut(.cancelAction)
      if !m.thongBao.isEmpty { Chu(m.thongBao, co: 14, dam: .semibold, mau: m.loi ? ClayMau.loi : ClayMau.ngocInk) }
    }
    .padding(18).clayThe().vaoLanLuot(0)
    .padding(20).padding(.bottom, 12).frame(width: 400).nenClay()
  }
}

// MARK: - Tin mới

struct TinMoiView: View {
  let tieu: String
  let noi: String
  var xem: () -> Void = {}
  var body: some View {
    HStack(alignment: .top, spacing: 14) {
      VienClay(ten: "speech_balloon", duPhong: "bell.fill", nen: ClayMau.ngocSoft, co: 48).rungChuong()
      VStack(alignment: .leading, spacing: 6) {
        Chu(tieu, co: 15, dam: .bold, dong: 2)
        if !noi.isEmpty { Chu(noi, co: 13, mau: ClayMau.chu3, dong: 3) }
        Button("Xem", action: xem).buttonStyle(NutClayStyle(kieu: .thanChi, bo: 16, cao: 44)).frame(width: 120)
      }
    }
    .padding(16).frame(maxWidth: .infinity, alignment: .leading)
    .clayThe(bo: 26).vaoLanLuot(0)
    .padding(14).padding(.bottom, 18).frame(width: 360).nenClay()
  }
}

// MARK: - Đổi quà (thiết kế 24 «Đổi quà bằng sao», 25 «Đã gửi Ba Mẹ»)

struct DoiQuaView: View {
  let q: HvQua
  let sao: Int
  @ObservedObject var app: AppConModel
  var dong: () -> Void = {}
  var lamThem: () -> Void = {}
  var xemQua: () -> Void = {}
  @State private var daGui = false
  @State private var dangGui = false

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      if daGui {
        HStack(spacing: 12) {
          VienClay(ten: "party_popper", duPhong: "checkmark.seal.fill", nen: ClayMau.ngocSoft, co: 52)
          VStack(alignment: .leading, spacing: 2) {
            Text("Đã gửi Ba Mẹ!").font(.system(size: 21, weight: .bold))
            Text("Chờ Ba Mẹ trao quà…").font(.system(size: 14)).foregroundColor(ClayMau.chu3)
          }
        }
        dongQua
        Chu("\(q.diem) sao đang được giữ", co: 15, dam: .bold, mau: ClayMau.diemInk, dong: 1)
        Chu("Ba Mẹ trao quà mới trừ sao.", co: 13, mau: ClayMau.chu3, dong: 1)
        Button("Về Sao & quà", action: dong).buttonStyle(NutClayStyle(kieu: .ngoc))
        Button("Xem quà của con ›", action: xemQua).buttonStyle(.plain).font(.system(size: 13, weight: .bold)).foregroundColor(ClayMau.ngocInk)
      } else {
        Text("Đổi quà").font(.system(size: 13, weight: .semibold)).foregroundColor(ClayMau.chu3)
        dongQua
        let du = sao >= q.diem
        Chu(du ? "Con có \(sao) sao · đủ rồi!" : "Con có \(sao) sao · còn thiếu \(q.diem - sao) sao", co: 15, dam: .bold, mau: du ? ClayMau.ngocInk : ClayMau.canh, dong: 1)
        Chu(du ? "Gửi Ba Mẹ · Ba Mẹ trao quà mới trừ sao" : "Đủ sao thì gửi Ba Mẹ · Ba Mẹ trao quà mới trừ sao", co: 13, mau: ClayMau.chu3, dong: 2)
        Button(dangGui ? "Đang gửi…" : "Gửi Ba Mẹ: đổi \(q.diem) sao") {
          dangGui = true
          Task { await app.doiQua(q, dsChoi: []); dangGui = false; daGui = !app.thongBaoLoi }
        }
        .buttonStyle(NutClayStyle(kieu: .ngoc)).disabled(!du || dangGui)
        if app.thongBaoLoi, !app.thongBao.isEmpty { Chu(app.thongBao, co: 13, dam: .semibold, mau: ClayMau.loi, dong: 2) }
        HStack(spacing: 20) {
          Button("Chọn quà khác", action: dong).buttonStyle(NutClayStyle(kieu: .sang)).keyboardShortcut(.cancelAction)
          if !du { Button("Làm thêm sao ›", action: lamThem).buttonStyle(.plain).font(.system(size: 13, weight: .bold)).foregroundColor(ClayMau.ngocInk) }
        }
      }
    }
    .padding(24).frame(width: 440).nenClay().foregroundColor(ClayMau.chu)
  }

  private var dongQua: some View {
    HStack(spacing: 12) {
      VienClay(ten: "wrapped_gift", duPhong: "gift.fill", nen: ClayMau.diemSoft, co: 48)
      Chu(q.ten, co: 18, dam: .bold, dong: 2)
      Text("\(q.diem) sao").font(.system(size: 14, weight: .bold)).foregroundColor(ClayMau.diemInk)
        .padding(.horizontal, 14).padding(.vertical, 6).background(Capsule().fill(ClayMau.diemSoft)).fixedSize()
    }
    .padding(14).clayThe(bo: 22)
  }
}
