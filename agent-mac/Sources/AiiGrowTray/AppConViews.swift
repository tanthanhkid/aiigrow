// Giao diện app «AiiGrow của Con» trên Mac — ngang bản Windows (agent-win AppForm / NopBaiForm / ChoiBangDiemForm / BlockedForm):
// thanh bên (Rob, tên Con, trạng thái kết nối, 4 mục) + nội dung Hôm nay · Nhiệm vụ · Phần quà & sao · Tin nhắn; nộp bài; chơi bằng sao;
// màn «… chưa được mở». Clay gương (docs/THIET-KE-CLAY.md): lề thẻ ≥ 16, vùng bấm ≥ 44, chữ dài cắt «…» (không co cỡ chữ).
import AppKit
import SwiftUI
import AiiGrowCore

// MARK: - Mảnh dùng chung

/// Ảnh Grow theo tên (Mascot/<ten>.png); thiếu tệp ⇒ viên clay mầm cây.
struct RobView: View {
  let ten: String
  var cao: CGFloat = 180
  var body: some View {
    if let img = FluentIcon.anh(ten, thuMuc: "Mascot") {
      Image(nsImage: img).resizable().interpolation(.high).aspectRatio(contentMode: .fit)
        .frame(maxWidth: .infinity).frame(height: cao).accessibilityLabel("Grow")
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
  var vai: VaiTro = .chu
  init(_ s: String, co: CGFloat = 14, dam: Font.Weight = .regular, mau: Color = ClayMau.chu, dong: Int = 3, vai: VaiTro = .chu) {
    self.s = s; self.co = co; self.dam = dam; self.mau = mau; self.dong = dong; self.vai = vai
  }
  var body: some View {
    Text(s).font(.clay(size: co, weight: dam, vai: vai)).foregroundColor(mau)
      .lineLimit(dong).truncationMode(.tail).fixedSize(horizontal: false, vertical: true)
      .frame(maxWidth: .infinity, alignment: .leading)
  }
}

/// Thẻ clay của nội dung: lề trong 18 (≥16).
struct TheCon<N: View>: View {
  var nen: Color = ClayMau.the
  /// Khối nổi bật Ánh kim: navy viền vàng (Bàn: thẻ hero Hôm nay, Sao & quà).
  var navy = false
  @ViewBuilder let noiDung: () -> N
  var body: some View {
    let v = VStack(alignment: .leading, spacing: 8) { noiDung() }
      .padding(18).frame(maxWidth: .infinity, alignment: .leading)
    if navy { v.clayNavy(bo: 26) } else { v.clayThe(bo: 26, nen: nen) }
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
  /// «Xin Ba Mẹ cho vay sao» (cửa sổ them-zsf6b45n).
  var moXin: () -> Void = {}
  /// «Xin thêm app / web» (#422, con-cai-mac 41) — ngay dưới «Xin Ba Mẹ cho vay sao», cả chế độ Mở hết.
  var moXinThem: () -> Void = {}
  /// «1 sao = 1 phút chơi ›» (cửa sổ them-0k1r3wsl «Sao là phút chơi»).
  var moChoi: () -> Void = {}
  var moNop: (HvNhiemVu) -> Void = { _ in }
  /// «Ba Mẹ dùng máy»: khoá màn hình để Ba Mẹ chọn tài khoản của mình (không đăng xuất Con, không trừ sao).
  var nhuongMay: () -> Void = { NhuongMay.khoaManHinh() }
  /// «Đổi người / Đăng xuất» (máy dùng chung, L13) — máy về màn chọn tên.
  var doiBe: () -> Void = {}
  /// «Hỏi AiiGrow cách sửa ›» ở thanh báo mất mạng / AiiGrow không trả lời.
  var hoiAiiGrow: () -> Void = {}
  /// Chữ trên ảnh bé (ManMac.chuCai — giống màn chọn tên); nil = chữ đầu tên.
  var chuCai: String? = nil
  private var chuAnh: String { chuCai ?? String(tenCon.split(separator: " ").first?.first ?? "?").uppercased() }
  @State private var quaHoi: HvQua?
  @State private var hoiDoiBe = false
  @State private var quaCuaCon = false
  /// Mở thẳng «Quà của con» (chụp màn 26).
  var moViQuaLucDau = false
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
          Text(tieuDe).font(.clay(size: 26, weight: .bold, vai: .tieuDe)).lineLimit(1).truncationMode(.tail).padding(.top, 6)
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
      DoiQuaView(q: q, sao: app.tq?.saoDungDuoc ?? app.ch?.soDu ?? 0, no: app.tq?.noBaMe ?? 0, app: app, dsChoi: dsChoi, dong: { quaHoi = nil },
                 lamThem: { quaHoi = nil; app.chon(.nhiemVu) }, xemQua: { quaHoi = nil; app.chon(.phanQua); quaCuaCon = true })
    }
    .sheet(isPresented: $hoiDoiBe) { doiBeSheet }
    .onAppear { if moViQuaLucDau { app.muc = .phanQua; quaCuaCon = true } }
    .onChange(of: app.muc) { _ in if app.muc != .phanQua { quaCuaCon = false } }
  }

  private var tieuDe: String {
    switch app.muc {
    case .homNay: return "Hôm nay"
    case .nhiemVu: return "Nhiệm vụ của con"
    case .phanQua: return quaCuaCon ? "Quà của con" : "Sao & quà"
    case .tinNhan: return "Tin nhắn"
    }
  }

  // MARK: thanh bên

  private var thanhBen: some View {
    VStack(alignment: .leading, spacing: 10) {
      RobView(ten: MascotView.chon(app.muc, daNoi: daNoi, xongHetViec: xongHet), cao: 170)
      HStack(spacing: 10) {
        if !tenCon.isEmpty { AvatarBe(chu: chuAnh, co: 30) }
        Text(tenCon.isEmpty ? "AiiGrow" : tenCon).font(.clay(size: 20, weight: .bold)).lineLimit(1).truncationMode(.tail)
      }
      let (dongKn, tot) = ketNoi
      Text("● " + dongKn + (tot ? " · " + AppConView.gioPhut.string(from: Date()) : "")).font(.clay(size: 12, weight: .bold)).lineLimit(2).truncationMode(.tail)
        .foregroundColor(tot ? ClayMau.ngocInk : ClayMau.loi)
        .padding(.horizontal, 10).padding(.vertical, 6)
        .background(Capsule().fill(tot ? ClayMau.ngocSoft : ClayMau.canhSoft))
        .padding(.bottom, 6)
      ForEach(Array(AppConView.dsMuc.enumerated()), id: \.offset) { _, m in
        let n = m.0 == .nhiemVu ? (app.tq.map(HocVienView.soViecMo) ?? 0) : (m.0 == .tinNhan ? app.tinMoi : 0)
        Button { withAnimation(ClayMotion.bat) { quaCuaCon = false; app.chon(m.0) } } label: {
          HStack(spacing: 10) {
            HinhFluent(ten: m.2, duPhong: "circle.fill", co: 24)
            Text(m.1).lineLimit(1).truncationMode(.tail).frame(maxWidth: .infinity, alignment: .leading)
            if n > 0 {
              Text("\(n)").font(.clay(size: 12, weight: .bold)).foregroundColor(ClayMau.chu)
                .padding(.horizontal, 8).padding(.vertical, 2).background(Capsule().fill(ClayMau.vang))
            }
          }
        }
        .buttonStyle(NutClayStyle(kieu: app.muc == m.0 ? .chon : .sang, bo: 20, cao: 48))
        .accessibilityAddTraits(app.muc == m.0 ? .isSelected : [])
      }
      Spacer(minLength: 8)
      if coDoiBe {
        Button { hoiDoiBe = true } label: {
          HStack(spacing: 8) { HinhFluent(ten: "nguoi", duPhong: "person.2.fill", co: 20); Text("Đổi người / Đăng xuất") }
        }
        .buttonStyle(.plain).font(.clay(size: 15, weight: .bold)).foregroundColor(ClayMau.ngocInk).frame(minHeight: 44)
      }
      Button("Ba Mẹ dùng máy ›", action: nhuongMay).buttonStyle(.plain)
        .font(.clay(size: 12, weight: .semibold)).foregroundColor(ClayMau.chu3).frame(minHeight: 32)
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
    if tt?.matMang == true { return ("Mất mạng · sao vẫn trừ", false) }
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
      LinkNho(chu: "Hỏi AiiGrow cách sửa ›", lam: hoiAiiGrow)
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
        if let q = tt.flatMap(TrayLogic.dongSao) { Chu("Sao vẫn trừ như bình thường · \(q)", co: 13, mau: ClayMau.chu3, dong: 1) }
      }
    case .xong: EmptyView()
    }
  }

  // ---- Hôm nay

  @ViewBuilder private var homNay: some View {
    VStack(alignment: .leading, spacing: 2) {
      Chu(tenCon.isEmpty ? "Xin chào!" : "Chào \(tenCon)!", co: 28, dam: .bold, dong: 1, vai: .tieuDe)
      Chu(ManMac.thuGio(Date()), co: 13, mau: ClayMau.chu3, dong: 1)
    }
    .vaoLanLuot(0)
    if let t = tt, t.daGhep, !tray.matKetNoi {
      theSao(t).vaoLanLuot(1)
      HStack(alignment: .top, spacing: 18) {
        theSaoKiem(t)
        .frame(minWidth: 0, idealWidth: 260, maxWidth: .infinity)
        TheCon {
          let tq = app.tq
          let nhom = ManMac.nhomNhiemVu(tq?.nhiemVu ?? [])
          HStack(spacing: 12) {
            VienClay(ten: "memo", duPhong: "doc.text", nen: ClayMau.the, co: 48)
            VStack(alignment: .leading, spacing: 0) {
              Chu("Nhiệm vụ hôm nay", co: 14, mau: ClayMau.chu3, dong: 1)
              Text("\(tq?.nhiemVu.count ?? 0) việc").font(.clay(size: 30, weight: .bold, vai: .tieuDe)).lineLimit(1)
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

  /// Số dư Con thấy: daemon (đã trừ tại chỗ) › tổng quan.
  private func soSao(_ t: TrangThai?) -> SoSao? { ManMac.soSao(tt: t, tq: app.tq) }

  /// Thẻ chính Hôm nay (them-z86gsj81 / them-ncml9v7v đang nợ / them-02wt8s99 «Mở hết»).
  @ViewBuilder private func theSao(_ t: TrangThai) -> some View {
    let s = soSao(t)
    let sao = s?.sao ?? 0
    if t.moHet == true {
      TheCon {
        Chu("Hôm nay Ba Mẹ để chế độ Mở hết", co: 15, mau: ClayMau.chu3, dong: 1)
        HStack(spacing: 14) {
          VienClay(ten: "party_popper", duPhong: "sparkles", nen: ClayMau.ngocSoft, co: 52)
          VStack(alignment: .leading, spacing: 2) {
            Text("Mở hết · không tính phút").font(.clay(size: 30, weight: .bold, vai: .tieuDe)).foregroundColor(ClayMau.ngocInk).lineLimit(1)
            Chu("App, web mở tự do · chơi không trừ sao", co: 15, dam: .semibold, dong: 1)
          }
        }
        Chu("Sao chỉ để đổi quà · con đang có \(ChuSao.vien(sao))", co: 14, mau: ClayMau.chu3, dong: 1)
        NutIcon(chu: TrayLogic.nutXinThem, icon: "puzzle_piece", kieu: .sang, rong: 230, lam: moXinThem)   // #422: Mở hết vẫn xin thêm được
      }
    } else {
      let phut = t.phutSao ?? s?.phutCon ?? 0
      let gh = (phut <= 0 && t.cheDo != .khoa) ? ManMac.chuGioiHan(t) : nil      // khoá vì giới hạn giờ chơi: sao còn nguyên
      let het = t.cheDo != .khoa && gh == nil && (s?.hetSao == true || phut <= 0 || sao < 0)
      TheCon(navy: true) {
        HStack(alignment: .top, spacing: 14) {
          VStack(alignment: .leading, spacing: 4) {
            Chu(het ? "Hết sao rồi" : gh?.tieuDe ?? "Sao của con · cũng là phút chơi", co: 15, mau: ClayMau.nenSang, dong: 1)
            if sao < 0 { VienSao(sao: sao, co: 30) }
            else {
              Text(ChuSao.vien(sao)).font(.clay(size: 50, weight: .bold, vai: .so)).monospacedDigit().foregroundColor(ClayMau.kim).lineLimit(1)
            }
          }
          Spacer(minLength: 8)
          VStack(spacing: 10) {
            NutIcon(chu: "Xin Ba Mẹ cho vay sao", icon: "star", kieu: het ? .ngoc : .sang, rong: 230, lam: moXin)
            NutIcon(chu: TrayLogic.nutXinThem, icon: "puzzle_piece", kieu: .sang, rong: 230, lam: moXinThem)
          }
        }
        if let n = ChuSao.no(s?.no ?? 0) { Chu(n, co: 14, dam: .bold, mau: ClayMau.canhSoft, dong: 2) }
        Chu(t.cheDo == .khoa ? "Đang khoá" : gh?.phu ?? (ManMac.saoThat(t).map { $0 == phut ? ChuSao.phut(phut) : "còn \(ChuSao.so($0)) sao · chơi được \(ChuSao.so(phut)) phút" } ?? ChuSao.phut(phut)) + (het ? dongKhongTinh(t).map { " · \($0) vẫn mở (không tính phút)" } ?? "" : ""),
            co: 15, dam: .bold, mau: ClayMau.kim, dong: 2)
        if !het, let da = app.sao?.phutChoiHomNay ?? app.tq?.quy?.daDung, da > 0 { Chu("Hôm nay đã chơi \(da) phút · đã trả \(ChuSao.so(da)) sao", co: 14, dam: .semibold, mau: ClayMau.nenSang, dong: 1) }
        if let ah = app.sao?.appHomNay, !ah.isEmpty {                // máy chủ: phút gộp mọi máy của Con
          Chu(ah.prefix(3).map(HvSao.dongApp).joined(separator: " · "), co: 13, mau: ClayMau.nenSang.opacity(0.8), dong: 1)
        } else if let ds = t.homNayTheoApp, !ds.isEmpty {
          let tinh = Set(t.dsTinhPhut ?? []), khong = Set(t.dsKhongTinhPhut ?? [])
          let dong = ds.filter { tinh.contains($0.muc) || khong.contains($0.muc) }.prefix(3)
            .map { tinh.contains($0.muc) ? "\(HocVienView.tenMucChoi($0.muc)) \($0.phut) phút" : "\(HocVienView.tenMucChoi($0.muc)) không tính phút" }
          if !dong.isEmpty { Chu(dong.joined(separator: " · "), co: 13, mau: ClayMau.nenSang.opacity(0.8), dong: 1) }
        }
      }
    }
  }

  /// Tên một app «Không tính phút» của Con («Từ điển») cho câu «… vẫn mở».
  private func dongKhongTinh(_ t: TrangThai) -> String? { t.dsKhongTinhPhut?.first.map { HocVienView.tenMucChoi($0) } }

  /// Thẻ vàng: sao kiếm hôm nay / để hết nợ · link «1 sao = 1 phút chơi ›».
  private func theSaoKiem(_ t: TrangThai) -> some View {
    let s = soSao(t), tq = app.tq
    let cho = tq?.diemChoDuyet ?? 0
    let soViecCho = ManMac.nhomNhiemVu(tq?.nhiemVu ?? []).choDuyet.count
    return TheCon {
      if let (dau, sau) = ManMac.cauHetNo(no: s?.no ?? 0, choDuyet: cho, soViecCho: soViecCho) {
        lichSuSao(3)
        Chu(dau, co: 18, dam: .bold, mau: ClayMau.diemInk, dong: 1)
        if let sau { Chu(sau, co: 13, dam: .semibold, mau: ClayMau.diemInk, dong: 2) }
      } else {
        HStack(spacing: 12) {
          VienClay(ten: "star", duPhong: "star.fill", nen: ClayMau.the, co: 48)
          VStack(alignment: .leading, spacing: 0) {
            Chu("Sao kiếm hôm nay", co: 14, mau: ClayMau.diemInk, dong: 1)
            Text("+\(ChuSao.vien(ManMac.saoKiemHomNay(tq?.gan ?? [])))").font(.clay(size: 30, weight: .bold, vai: .so)).foregroundColor(ClayMau.diemInk).lineLimit(1)
          }
        }
        Chu("Không nợ Ba Mẹ" + (cho > 0 ? " · +\(ChuSao.so(cho)) sao chờ duyệt" : ""), co: 13, mau: ClayMau.diemInk, dong: 1)
      }
      LinkNho(chu: t.moHet == true ? "Sao để đổi quà ›" : "1 sao = 1 phút chơi ›", lam: moChoi)
    }
  }

  /// 17 «Đổi người / Đăng xuất».
  private var doiBeSheet: some View {
    VStack(spacing: 14) {
      AvatarBe(chu: chuAnh, co: 64)
      Text(tenCon).font(.clay(size: 20, weight: .bold))
      Text("● Đang dùng" + (soSao(tt).map { " · còn \(ChuSao.vien($0.sao))" } ?? " máy này")).font(.clay(size: 13, weight: .bold)).foregroundColor(ClayMau.ngocInk)
      HStack(spacing: 12) {
        Button("Đổi người") { hoiDoiBe = false; doiBe() }.buttonStyle(NutClayStyle(kieu: .ngoc))
        Button("Đăng xuất") { hoiDoiBe = false; doiBe() }.buttonStyle(NutClayStyle(kieu: .sang))
      }
      Text("Đổi người hay đăng xuất: dừng tính phút của \(tenCon.isEmpty ? "con" : tenCon), máy khoá lại chờ tên + PIN.").font(.clay(size: 12)).foregroundColor(ClayMau.chu3)
        .multilineTextAlignment(.center).fixedSize(horizontal: false, vertical: true)
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
        Chu((tq.diemChoDuyet > 0 ? ChuSao.choDuyet(tq.diemChoDuyet, no: soSao(tt)?.no ?? 0)
              : ManMac.dangNo(soSao(tt)) ? "Ba Mẹ duyệt xong, " + ChuSao.traNoTruocHoa.lowercased() : "Ba Mẹ duyệt xong là sao vào ví ngay") + " · Đang có \(ChuSao.vien(tq.saoThay))",
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
        Text("+\(v.diem) sao").font(.clay(size: 14, weight: .bold)).foregroundColor(ClayMau.diemInk)
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

  // ---- Phần quà & sao

  @ViewBuilder private var phanQua: some View {
    if quaCuaCon { ViQuaView(app: app, quay: { quaCuaCon = false }) }
    else { phanBangGia }
  }

  @ViewBuilder private var phanBangGia: some View {
    chuaCo(chuaGhep: "Máy chưa ghép với Ba Mẹ nên chưa có phần quà.", dangTai: "Đang tải…")
    if let tq = app.tq {
      theSaoQua(tq).vaoLanLuot(0)
      HStack {
        Chu("Đổi quà", co: 17, dam: .bold, dong: 1)
        Spacer()
        if !tq.phieuCho.isEmpty || app.viQua?.coGi == true {
          Button("Quà của con ›") { quaCuaCon.toggle() }.buttonStyle(.plain).font(.clay(size: 14, weight: .bold)).foregroundColor(ClayMau.ngocInk)
        }
      }
      .padding(.top, 2)
      if !app.quaHienThi.isEmpty {
        ForEach(Array(app.quaHienThi.enumerated()), id: \.element.id) { i, q in
          TheCon {
            HStack(spacing: 12) {
              VienClay(ten: "wrapped_gift", duPhong: "gift.fill", nen: ClayMau.the, co: 44)
              VStack(alignment: .leading, spacing: 2) {
                Chu(q.ten, co: 17, dam: .bold, dong: 1)
                Chu(ManMac.dongQua(q), co: 13, dam: .semibold, mau: q.choTraoTu != nil ? ClayMau.ngocInk : (HocVienView.doiDuoc(q) ? ClayMau.ngocInk : ClayMau.canh), dong: 1)
              }
              if q.conThieu > 0, q.choTraoTu == nil {
                GeometryReader { geo in
                  ZStack(alignment: .leading) {
                    Capsule().fill(ClayMau.diemSoft)
                    Capsule().fill(ClayMau.vang).frame(width: geo.size.width * CGFloat(max(0.04, Double(q.diem - q.conThieu) / Double(max(1, q.diem)))))
                  }
                }
                .frame(width: 110, height: 9)
              }
              Text("\(q.diem) sao").font(.clay(size: 14, weight: .bold)).foregroundColor(ClayMau.diemInk)
                .padding(.horizontal, 14).padding(.vertical, 6).background(Capsule().fill(ClayMau.diemSoft)).fixedSize()
              if HocVienView.doiDuoc(q) {
                Button("Đổi \(q.diem) sao") { quaHoi = q }.buttonStyle(NutClayStyle(kieu: .sang, bo: 18, cao: 44)).frame(width: 170)
                  .disabled(app.dangBan || tt?.matMang == true)
              } else if q.id == quaVay?.id {
                Button("Xin vay \(ChuSao.so(q.conThieu)) sao") { quaHoi = q }.buttonStyle(NutClayStyle(kieu: .sang, bo: 18, cao: 44)).frame(width: 170)
                  .disabled(app.dangBan)
              }
            }
            .contentShape(Rectangle())
            .onTapGesture { if q.choTraoTu == nil && q.conHopLe { quaHoi = q } }
          }
          .vaoLanLuot(min(i + 1, 6))
        }
      } else {
        Chu(app.ch == nil && app.viQua == nil ? "Chưa tải được danh sách quà." : "Ba Mẹ chưa đặt phần quà nào. Con cứ làm nhiệm vụ để nhận sao nhé!", co: 15, mau: ClayMau.chu3)
      }
    }
  }

  private var quaVay: HvQua? { ManMac.quaXinVay(app.quaHienThi) }

  /// Vài dòng sổ sao gần nhất («Ba Mẹ cho vay 30 sao», «Chơi Roblox 30 phút · −30 sao», «Trả nợ 10 sao · Dọn phòng») — máy chủ có `lichSu` mới hiện.
  @ViewBuilder private func lichSuSao(_ n: Int) -> some View {
    if let ls = app.sao?.lichSu, !ls.isEmpty {
      ForEach(Array(ls.prefix(n))) { d in
        Chu(d.chuThich + (d.kieu == "choi" ? " · " + ChuSao.vien(d.sao) : ""), co: 13, mau: ClayMau.chu2, dong: 1)
      }
    }
  }

  /// Đầu «Sao & quà» (them-r6eya42m / them-r12v4x2d đang nợ).
  private func theSaoQua(_ tq: HvTongQuan) -> some View {
    let s = soSao(tt)
    let sao = s?.sao ?? tq.soDu
    let nv = sao >= 0     // hero navy khi không nợ; nợ giữ nền cam nhạt cảnh báo
    let kimC = nv ? ClayMau.kim : ClayMau.diemInk, phuC = nv ? ClayMau.nenSang : ClayMau.diemInk
    return TheCon(nen: ClayMau.canhSoft, navy: nv) {
      HStack(spacing: 14) {
        VienClay(ten: "star", duPhong: "star.fill", nen: nv ? ClayMau.nenSang : ClayMau.the, co: 60)
        VStack(alignment: .leading, spacing: 2) {
          Chu(sao < 0 ? "Sao của con" : "Con đang có", co: 14, mau: sao < 0 ? ClayMau.canh : phuC, dong: 1)
          if sao < 0 { VienSao(sao: sao, co: 24) }
          else { Text(ChuSao.vien(sao)).font(.clay(size: 38, weight: .bold, vai: .so)).foregroundColor(kimC).lineLimit(1) }
          if let n = s?.no, n > 0 {
            Chu("Đang nợ Ba Mẹ \(ChuSao.so(n)) sao", co: 14, dam: .bold, mau: ClayMau.canh, dong: 1)
            Chu("Sao nhiệm vụ trả nợ trước", co: 13, mau: ClayMau.canh, dong: 1)
            lichSuSao(3)
          }
          if tq.diemChoDuyet > 0 { Chu(ChuSao.choDuyet(tq.diemChoDuyet, no: soSao(tt)?.no ?? 0), co: 13, mau: phuC, dong: 1) }
          if let g = app.ch?.saoGiu, g > 0 { Chu("Đã trừ \(ChuSao.so(g)) sao chờ Ba Mẹ trao", co: 13, mau: phuC, dong: 1) }
        }
        Spacer(minLength: 8)
        VStack(alignment: .leading, spacing: 8) {
          if sao >= 0, tt?.moHet != true {
            Chu("\(ChuSao.vien(sao)) = \(ChuSao.so(sao)) phút chơi hoặc đổi quà", co: 13, dam: .bold, mau: kimC, dong: 2)
          }
          LinkNho(chu: tt?.moHet == true ? "Sao để đổi quà ›" : "1 sao = 1 phút chơi ›", lam: moChoi, mau: nv ? ClayMau.kim : nil)
        }
        .frame(width: 240, alignment: .leading)
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
        .font(.clay(size: 14)).scrollContentBackground(.hidden).padding(10).frame(height: 96).clayLom()
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

// MARK: - Đổi quà (thiết kế them-3w616hjq «Đổi quà bằng sao», them-oe5faa6g «Đã gửi Ba Mẹ»): thiếu sao ⇒ «Xin Ba Mẹ cho vay N sao» (#263)

struct DoiQuaView: View {
  let q: HvQua
  /// #315: sao TIÊU ĐƯỢC (gồm sao vay chưa tiêu) — không phải số dư (âm khi nợ).
  let sao: Int
  /// Nợ Ba Mẹ còn lại — hiện dòng «Đang nợ Ba Mẹ M sao».
  var no: Int = 0
  @ObservedObject var app: AppConModel
  var dsChoi: [String] = []
  var dong: () -> Void = {}
  var lamThem: () -> Void = {}
  var xemQua: () -> Void = {}
  /// Lời xin vay để đổi quà (tiêm được khi chụp màn).
  @StateObject var xin = XinModel()
  @State private var daGui = false
  @State private var dangGui = false

  private var thieu: Int { q.conThieu > 0 ? q.conThieu : max(0, q.diem - max(0, sao)) }

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      if xin.daGui, let n = xin.saoDaXin {
        HStack(spacing: 12) {
          VienClay(ten: "speech_balloon", duPhong: "paperplane.fill", nen: ClayMau.ngocSoft, co: 52)
          VStack(alignment: .leading, spacing: 2) {
            Text(xin.choMang ? "Đã lưu lời xin" : "Đã gửi Ba Mẹ!").font(.clay(size: 21, weight: .bold, vai: .tieuDe))
            Text("Con xin vay \(ChuSao.so(n)) sao để đổi quà").font(.clay(size: 14)).foregroundColor(ClayMau.chu3)
          }
        }
        dongQua
        Button("Về Sao & quà", action: dong).buttonStyle(NutClayStyle(kieu: .ngoc))
        Chu("Ba Mẹ cho vay thì con nợ \(ChuSao.so(n)) sao · sao nhiệm vụ trả nợ trước.", co: 13, mau: ClayMau.chu3, dong: 2)
        Button("Xem quà của con ›", action: xemQua).buttonStyle(.plain).font(.clay(size: 13, weight: .bold)).foregroundColor(ClayMau.ngocInk)
      } else if daGui {
        HStack(spacing: 12) {
          VienClay(ten: "party_popper", duPhong: "checkmark.seal.fill", nen: ClayMau.ngocSoft, co: 52)
          VStack(alignment: .leading, spacing: 2) {
            Text("Đã gửi Ba Mẹ!").font(.clay(size: 21, weight: .bold, vai: .tieuDe))
            Text("Chờ Ba Mẹ trao quà…").font(.clay(size: 14)).foregroundColor(ClayMau.chu3)
          }
        }
        dongQua
        Chu("Đã trừ \(q.diem) sao", co: 15, dam: .bold, mau: ClayMau.diemInk, dong: 1)
        Chu("Ba Mẹ từ chối thì sao về lại cho con.", co: 13, mau: ClayMau.chu3, dong: 1)
        Button("Về Sao & quà", action: dong).buttonStyle(NutClayStyle(kieu: .ngoc))
        Button("Xem quà của con ›", action: xemQua).buttonStyle(.plain).font(.clay(size: 13, weight: .bold)).foregroundColor(ClayMau.ngocInk)
      } else {
        Text("Đổi quà").font(.clay(size: 13, weight: .semibold)).foregroundColor(ClayMau.chu3)
        dongQua
        let du = thieu <= 0 && HocVienView.doiDuoc(q)
        Chu(du ? "Con dùng được \(ChuSao.vien(max(0, sao))) · đủ rồi!" : "Con dùng được \(ChuSao.vien(max(0, sao))) · còn thiếu \(ChuSao.so(thieu)) sao", co: 15, dam: .bold, mau: du ? ClayMau.ngocInk : ClayMau.canh, dong: 1)
        if no > 0 { Chu("Đang nợ Ba Mẹ \(ChuSao.so(no)) sao", co: 13, dam: .bold, mau: ClayMau.canh, dong: 1) }
        if du {
          Chu("Đổi là trừ sao ngay · Ba Mẹ từ chối thì hoàn", co: 13, mau: ClayMau.chu3, dong: 2)
          Button(dangGui ? "Đang gửi…" : "Gửi Ba Mẹ: đổi \(q.diem) sao") {
            dangGui = true
            Task { daGui = await app.doiQua(q, dsChoi: dsChoi); dangGui = false }
          }
          .buttonStyle(NutClayStyle(kieu: .ngoc)).disabled(dangGui)
        } else {
          Chu("Ba Mẹ cho vay \(ChuSao.so(thieu)) sao là đổi được · con sẽ nợ \(ChuSao.so(thieu)) sao", co: 13, mau: ClayMau.chu3, dong: 2)
          Button(xin.dangGui ? "Đang gửi…" : "Xin Ba Mẹ cho vay \(ChuSao.so(thieu)) sao") {
            xin.xinVay(soSao: thieu, loiNhan: "Con xin vay để đổi «\(q.ten)»", mucDich: "qua", quaId: q.id)
          }
          .buttonStyle(NutClayStyle(kieu: .ngoc)).disabled(xin.dangGui || !q.conHopLe)
          if !xin.thongBao.isEmpty, !xin.dangGui { Chu(xin.thongBao, co: 13, dam: .semibold, mau: ClayMau.loi, dong: 2) }
        }
        if app.thongBaoLoi, !app.thongBao.isEmpty { Chu(app.thongBao, co: 13, dam: .semibold, mau: ClayMau.loi, dong: 2) }
        HStack(spacing: 20) {
          Button("Chọn quà khác", action: dong).buttonStyle(NutClayStyle(kieu: .sang)).keyboardShortcut(.cancelAction)
          if !du { Button("Làm thêm sao ›", action: lamThem).buttonStyle(.plain).font(.clay(size: 13, weight: .bold)).foregroundColor(ClayMau.ngocInk) }
        }
      }
    }
    .padding(24).frame(width: 440).nenClay().foregroundColor(ClayMau.chu)
  }

  private var dongQua: some View {
    HStack(spacing: 12) {
      VienClay(ten: "wrapped_gift", duPhong: "gift.fill", nen: ClayMau.diemSoft, co: 48)
      Chu(q.ten, co: 18, dam: .bold, dong: 2)
      Text("\(q.diem) sao").font(.clay(size: 14, weight: .bold)).foregroundColor(ClayMau.diemInk)
        .padding(.horizontal, 14).padding(.vertical, 6).background(Capsule().fill(ClayMau.diemSoft)).fixedSize()
    }
    .padding(14).clayThe(bo: 22)
  }
}
