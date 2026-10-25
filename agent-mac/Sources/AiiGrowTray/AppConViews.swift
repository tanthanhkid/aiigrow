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
  @State private var quaHoi: HvQua?

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
        Text(tieuDe).font(.system(size: 26, weight: .bold)).lineLimit(1).truncationMode(.tail).padding(.top, 6)
        if !app.thongBao.isEmpty {
          Chu(app.thongBao, co: 14, dam: .semibold, mau: app.thongBaoLoi ? ClayMau.loi : ClayMau.ngocInk, dong: 2)
        }
        ScrollView {
          VStack(alignment: .leading, spacing: 14) { noiDung }
            .padding(.horizontal, 4).padding(.top, 6).padding(.bottom, 28)   // đáy dư cho bóng thẻ cuối
            .frame(maxWidth: 760, alignment: .leading)
        }
      }
      .frame(maxWidth: .infinity, alignment: .topLeading)
    }
    .padding(18)
    .frame(minWidth: 880, minHeight: 600)
    .nenClay()
    .alert(item: $quaHoi) { q in
      Alert(title: Text("Đổi «\(q.ten)» với \(q.diem) điểm nhé?"), primaryButton: .default(Text("Đổi quà")) {
        Task { await app.doiQua(q, dsChoi: dsChoi) }
      }, secondaryButton: .cancel(Text("Để sau")))
    }
  }

  private var tieuDe: String {
    switch app.muc {
    case .homNay: return "Hôm nay"
    case .nhiemVu: return "Nhiệm vụ của con"
    case .phanQua: return "Phần quà & điểm"
    case .tinNhan: return "Tin nhắn"
    }
  }

  // MARK: thanh bên

  private var thanhBen: some View {
    VStack(alignment: .leading, spacing: 10) {
      RobView(ten: MascotView.chon(app.muc, daNoi: daNoi, xongHetViec: xongHet), cao: 170)
      Text(tenCon.isEmpty ? "AiiGrow" : tenCon).font(.system(size: 20, weight: .bold)).lineLimit(1).truncationMode(.tail)
      let (dongKn, tot) = ketNoi
      Text("● " + dongKn).font(.system(size: 12, weight: .bold)).lineLimit(2).truncationMode(.tail)
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
      Chu("Máy này do Ba Mẹ quản lý bằng AiiGrow", co: 11, mau: ClayMau.chu3, dong: 2)
    }
    .padding(16)
    .frame(width: 250)
    .frame(maxHeight: .infinity, alignment: .top)
    .clayThe(bo: 30)
  }

  static let dsMuc: [(MucApp, String, String)] = [
    (.homNay, "Hôm nay", "alarm_clock"), (.nhiemVu, "Nhiệm vụ", "memo"), (.phanQua, "Phần quà & điểm", "wrapped_gift"), (.tinNhan, "Tin nhắn", "speech_balloon"),
  ]

  /// (chữ, tốt?) cho viên trạng thái.
  private var ketNoi: (String, Bool) {
    if tray.matKetNoi || tt == nil { return (TrayLogic.dongKhoiDongLai, false) }
    if tt?.daGhep != true { return ("Máy chưa ghép với Ba Mẹ", false) }
    if tt?.matMang == true { return ("Mất mạng — đang theo giờ đã lưu", false) }
    return ("Đã kết nối với Ba Mẹ", true)
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
        Chu("Chưa tải được", co: 16, dam: .bold, mau: ClayMau.loi)
        Chu(app.loiTai ?? "", co: 14, mau: ClayMau.loi)
        NutIcon(chu: "Thử lại", kieu: .thanChi, rong: 180) { Task { await app.lamMoi(dsChoi: dsChoi) } }
      }
    case .xong: EmptyView()
    }
  }

  // ---- Hôm nay

  @ViewBuilder private var homNay: some View {
    Chu(tenCon.isEmpty ? "Xin chào!" : "Chào \(tenCon)!", co: 22, dam: .bold, dong: 1).vaoLanLuot(0)
    if let t = tt, t.daGhep, !tray.matKetNoi {
      TimelineView(.periodic(from: .now, by: 1)) { ctx in
        let g = TrayLogic.giayConLai(t, nhanLuc: tray.nhanLuc, bayGio: ctx.date)
        TheCon {
          Chu("Thời gian dùng máy còn lại", co: 14, mau: ClayMau.chu3, dong: 1)
          Text(t.cheDo == .khoa ? "Đang khoá" : (g.map { TrayLogic.dongHo($0) } ?? "Không giới hạn"))
            .font(.system(size: 44, weight: .bold, design: .rounded)).monospacedDigit().foregroundColor(ClayMau.ngocInk)
            .lineLimit(1).truncationMode(.tail)
          Chu(TrayLogic.dongTrangThai(t, matKetNoi: false, nhanLuc: tray.nhanLuc, bayGio: ctx.date), co: 14, mau: ClayMau.chu3, dong: 2)
          Chu("Chế độ: " + TrayLogic.tenMucNguoiDung(t.cheDo), co: 14, dam: .semibold, mau: ClayMau.ngocInk, dong: 1)
        }
      }
      .vaoLanLuot(1)
      HStack(spacing: 14) {
        NutIcon(chu: "Xin thêm thời gian", icon: "hourglass_not_done", kieu: .thanChi, rong: 250, lam: moXin)
        if ChoiBangDiem.hienNut(duocDoiDiem: t.duocDoiDiem, lyDoKhoa: t.lyDoKhoa, matMang: t.matMang, dsChoi: dsChoi) {
          NutIcon(chu: "Chơi bằng điểm", icon: "video_game", kieu: .sang, rong: 250, lam: moChoi)
        }
      }
      .padding(.vertical, 2)
      if ChoiBangDiem.hienNut(duocDoiDiem: t.duocDoiDiem, lyDoKhoa: t.lyDoKhoa, matMang: t.matMang, dsChoi: dsChoi),
         let p = app.phutChoi, p > 0, let muc = app.phutChoiCua {
        // số phút tính theo MỤC (máy chủ định giá theo nhóm) ⇒ nói rõ là của mục nào
        Chu("Điểm hiện có đổi được khoảng \(p) phút chơi \(HocVienView.tenMucChoi(muc)).", co: 13, mau: ClayMau.chu3, dong: 2)
      }
    } else {
      TheCon(nen: ClayMau.canhSoft) {
        Chu(ketNoi.0, co: 16, dam: .bold, mau: ClayMau.loi)
        Chu(tt?.daGhep == false ? "Ba Mẹ cần ghép máy này trong app AiiGrow của Ba Mẹ." : "Con chờ vài giây nhé.", co: 14, mau: ClayMau.loi)
      }
    }
    if tt?.nhapMaOffline == true, tt?.cheDo != .khoa {
      // mất mạng giờ «chỉ app học»: Ba Mẹ đọc mã để mở tạm (trên màn khoá đã có ô riêng)
      MaOfflineView().padding(18).clayThe(bo: 26)
    }
    if let ds = tt?.homNayTheoApp, !ds.isEmpty {
      // Đã dùng hôm nay theo app (daemon đếm theo app tiền cảnh) — như mục Hôm nay của Android.
      TheCon {
        Chu("Hôm nay con đã dùng", co: 17, dam: .bold, dong: 1)
        ForEach(Array(ds.prefix(6).enumerated()), id: \.offset) { _, d in
          HStack(spacing: 10) {
            Chu(HocVienView.tenMucChoi(d.muc), co: 14, dam: .medium, dong: 1)
            Text(d.phut >= 60 ? "\(d.phut / 60) giờ \(d.phut % 60) phút" : "\(d.phut) phút")
              .font(.system(size: 14, weight: .semibold)).foregroundColor(ClayMau.ngocInk).monospacedDigit().fixedSize()
          }
        }
      }
    }
    if tt?.daGhep == true {
      TheCon {
        Chu("Việc của con", co: 17, dam: .bold, dong: 1)
        if let tq = app.tq {
          let n = HocVienView.soViecMo(tq)
          Chu(n > 0 ? "Con có \(n) việc đang chờ. Làm xong để tích điểm nhé!" : "Hôm nay con đã làm hết việc rồi. Giỏi lắm!", co: 14)
          Chu("\(tq.soDu) điểm  ·  \(HocVienView.capText(tq.capDo))", co: 14, dam: .bold, mau: ClayMau.diemInk, dong: 1)
        } else if let l = app.loiTai {
          Chu(l, co: 14, mau: ClayMau.loi)
        } else {
          Chu("Đang tải…", co: 14, mau: ClayMau.chu3)
        }
        HStack(spacing: 14) {
          NutIcon(chu: "Xem nhiệm vụ", icon: "memo", rong: 210) { app.chon(.nhiemVu) }
          if app.tinMoi > 0 { NutIcon(chu: "Đọc tin nhắn (\(app.tinMoi))", icon: "speech_balloon", rong: 230) { app.chon(.tinNhan) } }
        }
        .padding(.top, 4)
      }
      .vaoLanLuot(2)
      // #70 §1 (như Windows): Ba Mẹ cần máy ⇒ khoá màn hình để chuyển tài khoản, không đăng xuất Con, không trừ điểm.
      TheCon {
        Chu("Ba Mẹ cần máy? Bấm nút này hoặc Ctrl ⌃ + Cmd ⌘ + Q", co: 14, mau: ClayMau.chu3, dong: 2)
        NutIcon(chu: "Ba Mẹ dùng máy", icon: "key", rong: 240, lam: nhuongMay)
      }
    }
  }

  // ---- Nhiệm vụ

  @ViewBuilder private var nhiemVu: some View {
    chuaCo(chuaGhep: "Máy chưa ghép với Ba Mẹ nên chưa có nhiệm vụ.", dangTai: "Đang tải nhiệm vụ…")
    if let tq = app.tq {
      let ds = HocVienView.sapXep(tq.nhiemVu)
      if ds.isEmpty { Chu("Chưa có nhiệm vụ nào. Khi Ba Mẹ giao việc, con sẽ thấy ở đây và nhận thông báo.", co: 15, mau: ClayMau.chu3) }
      ForEach(Array(ds.enumerated()), id: \.element.id) { i, v in theViec(v).vaoLanLuot(min(i, 6)) }
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
        Text("+\(v.diem) điểm").font(.system(size: 14, weight: .bold)).foregroundColor(ClayMau.diemInk)
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
      Chu(g.ten + (g.trangThai == "duoc_duyet" && g.diem != nil ? "   ·   +\(g.diem!) điểm" : ""), co: 15, dam: .bold, dong: 2)
      Chu(HocVienView.trangThaiText(g.trangThai) + ((g.lyDo ?? "").isEmpty ? "" : " · " + g.lyDo!), co: 13,
          mau: g.trangThai == "tu_choi" ? ClayMau.loi : ClayMau.chu3)
      if let k = g.loiKhen, !k.isEmpty { Chu("Ba Mẹ: " + k, co: 14, mau: ClayMau.ngocInk) }
    }
  }

  // ---- Phần quà & điểm

  @ViewBuilder private var phanQua: some View {
    chuaCo(chuaGhep: "Máy chưa ghép với Ba Mẹ nên chưa có phần quà.", dangTai: "Đang tải…")
    if let tq = app.tq {
      // Điểm: vàng CHỈ dành cho điểm (mau.ts) — chữ diemInk trên nền diemSoft.
      TheCon(nen: ClayMau.diemSoft) {
        HStack(spacing: 14) {
          VienClay(ten: "star", duPhong: "star.fill", nen: ClayMau.the, co: 56)
          VStack(alignment: .leading, spacing: 2) {
            Chu("Điểm của con", co: 14, mau: ClayMau.diemInk, dong: 1)
            Text("\(tq.soDu) điểm").font(.system(size: 36, weight: .bold, design: .rounded)).foregroundColor(ClayMau.diemInk).lineLimit(1)
          }
        }
        Chu(HocVienView.capText(tq.capDo) + (tq.diemChoDuyet > 0 ? " · \(tq.diemChoDuyet) điểm đang chờ Ba Mẹ duyệt" : ""), co: 14, mau: ClayMau.diemInk, dong: 2)
      }
      .vaoLanLuot(0)
      ForEach(tq.phieuCho, id: \.id) { p in
        TheCon {
          Chu("\(p.ten)   ·   \(p.diem) điểm", co: 15, dam: .bold, dong: 2)
          Chu("Đã đổi, đang chờ Ba Mẹ trao quà cho con.", co: 13, mau: ClayMau.chu3, dong: 2)
        }
      }
      if let ch = app.ch, !ch.qua.isEmpty {
        Chu("Quà con có thể đổi", co: 18, dam: .bold, dong: 1).padding(.top, 4)
        ForEach(Array(ch.qua.enumerated()), id: \.element.id) { i, q in
          TheCon {
            HStack(alignment: .firstTextBaseline, spacing: 10) {
              Chu(q.ten, co: 17, dam: .bold, dong: 2)
              Text("\(q.diem) điểm").font(.system(size: 14, weight: .bold)).foregroundColor(ClayMau.diemInk)
                .padding(.horizontal, 10).padding(.vertical, 4).background(Capsule().fill(ClayMau.diemSoft)).fixedSize()
            }
            Chu(HocVienView.quaTrangThai(q) + (q.chiCuoiTuan ? " · chỉ đổi vào cuối tuần" : ""), co: 13, dam: .semibold,
                mau: q.du ? ClayMau.ngocInk : ClayMau.chu3, dong: 2)
            NutIcon(chu: "Đổi quà", icon: "wrapped_gift", kieu: q.du ? .thanChi : .sang, rong: 200) { quaHoi = q }
              .disabled(!q.du || app.dangBan).padding(.top, 4)
          }
          .vaoLanLuot(min(i + 1, 6))
        }
      } else {
        Chu(app.ch == nil ? "Chưa tải được danh sách quà." : "Ba Mẹ chưa đặt phần quà nào. Con cứ làm nhiệm vụ để tích điểm nhé!", co: 15, mau: ClayMau.chu3)
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

// MARK: - Chơi bằng điểm

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

  func choi(_ m: String) async {
    guard !dangGui else { return }
    dangGui = true; loi = false; thongBao = "Đang hỏi máy chủ…"
    let (chu, duoc) = ChoiBangDiem.ketQua(await goi(.choi(muc: m)))
    dangGui = false
    thongBao = chu; loi = !duoc; xong = duoc
  }
}

struct ChoiBangDiemView: View {
  let ds: [String]
  @ObservedObject var m: ChoiModel
  var dong: () -> Void = {}
  var tuHoi = true

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 12) {
        VienClay(ten: "video_game", duPhong: "gamecontroller.fill", nen: ClayMau.diemSoft, co: 48)
        Chu("Chơi bằng điểm", co: 20, dam: .bold, dong: 1)
      }
      if ds.isEmpty {
        Chu("Ba Mẹ chưa chọn app giải trí nào cho con đổi điểm. Con xin Ba Mẹ nhé.", co: 14, mau: ClayMau.chu3)
      } else {
        Chu("Mỗi app đổi điểm lấy số phút khác nhau — con xem số phút ở từng nút.", co: 13, mau: ClayMau.chu3)
        ScrollView {
          VStack(spacing: 12) {
            ForEach(ds, id: \.self) { muc in
              Button(ChoiBangDiem.nhanNut(muc, phut: m.phut[muc])) { Task { await m.choi(muc) } }
                .buttonStyle(NutClayStyle(kieu: .thanChi)).disabled(m.dangGui || m.xong)
            }
          }
          .padding(.horizontal, 2).padding(.vertical, 6).padding(.bottom, 10)
        }
        .frame(maxHeight: CGFloat(min(ds.count, 6)) * 58 + 16)
      }
      Button("Đóng", action: dong).buttonStyle(NutClayStyle(kieu: .sang)).keyboardShortcut(.cancelAction)
      if !m.thongBao.isEmpty { Chu(m.thongBao, co: 14, dam: .semibold, mau: m.loi ? ClayMau.loi : ClayMau.ngocInk) }
    }
    .padding(18).clayThe().vaoLanLuot(0)
    .padding(22).padding(.bottom, 12).frame(width: 420).nenClay()
    .task { if tuHoi { await m.hoiPhut(ds) } }
  }
}

// MARK: - App bị chặn

struct ChanAppView: View {
  let ten: String
  let lyDo: String?
  let coChoi: Bool
  @ObservedObject var m: ChoiModel
  var muc: String
  var xinPhep: () -> Void = {}
  var dong: () -> Void = {}

  static func lyDoText(_ s: String?) -> String {
    switch s {
    case "ba_me_chan": return "Ba Mẹ đã chặn app này trên máy."
    case "chi_app_hoc": return "Bây giờ chỉ mở được các app học Ba Mẹ cho phép."
    case "trinh_duyet": return "Trình duyệt này chưa lọc web được. Con dùng trình duyệt Ba Mẹ cho phép nhé."
    default: return "Chưa được Ba Mẹ cho mở."
    }
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack(spacing: 12) {
        VienClay(ten: "stop_sign", duPhong: "hand.raised.fill", nen: ClayMau.canhSoft, co: 52)
        Chu("\(ten) chưa được mở", co: 18, dam: .bold, dong: 2)
      }
      Chu(ChanAppView.lyDoText(lyDo), co: 14, mau: ClayMau.chu3)
      if coChoi {
        NutIcon(chu: "Dùng điểm để chơi", icon: "star", kieu: .thanChi, rong: nil) { Task { await m.choi(muc) } }
          .disabled(m.dangGui || m.xong)
      }
      NutIcon(chu: "Xin phép Ba Mẹ", icon: "speech_balloon", kieu: coChoi ? .sang : .thanChi, rong: nil, lam: xinPhep)
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
