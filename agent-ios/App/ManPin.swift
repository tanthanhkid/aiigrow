// PIN theo bé (L13 — docs/thiet-ke-chot/con-dt-khac 05–13): máy khoá → «Ai đang dùng máy?» → nhập PIN 4 số (chưa đúng · còn N lần;
// sai 5 lần chờ 15 giây; Quên PIN báo Ba Mẹ) · «Ba Mẹ dùng máy» → nhập mã mở máy → «Ba Mẹ đang dùng» (Khoá lại) · «Đổi bé / Đăng xuất».
import SwiftUI
import ConCore

let mauAvatar: [Color] = [Diu.cam, Color(hex: 0x6f9be0), Color(hex: 0xb58be0), Color(hex: 0x4fb3a3)]

struct ManMayKhoa: View {
  @EnvironmentObject var m: MoHinhApp
  enum Buoc: Equatable { case chonTen, pin(BeTrenMay), cho(BeTrenMay, Date), quen(BeTrenMay), baMe }
  @State var buoc: Buoc = .chonTen
  @State var pin = ""
  @State var conLan: Int?
  @State var thongBao: String?
  @State var tick = Date()
  let dongHo = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

  var body: some View {
    KhungMan {
      switch buoc {
      case .chonTen: chonTen
      case .pin(let be): nhapPin(be)
      case .cho(let be, let den): choThuLai(be, den)
      case .quen(let be): quenPin(be)
      case .baMe: ManBaMeNhapMa(xong: { buoc = .chonTen })
      }
    }
    .onReceive(dongHo) { tick = $0 }
    .task { if m.demo == nil { await m.taiHoSo() } }
    .onAppear { napDemo() }
  }

  func napDemo() {
    guard let d = m.demo, let be = m.hoSo?.con.first else { return }
    switch d {
    case "nhapPin": buoc = .pin(be); pin = "48"
    case "pinSai": buoc = .pin(be); conLan = 3
    case "choPin": buoc = .cho(be, Date().addingTimeInterval(15))
    case "quenPin": buoc = .quen(be)
    case "baMeMa": buoc = .baMe
    default: break
    }
  }

  // MARK: Ai đang dùng máy? (them-28ir0qe4)
  var chonTen: some View {
    VStack(spacing: 14) {
      HStack { NhanNho(chu: "Máy đang khoá", icon: "ic_khoa"); Spacer() }
      Anh(ten: "rob_rob_goc", co: 110)
      Text("Ai đang dùng máy?").font(Diu.tieuDe).foregroundColor(Diu.chu)
      Text("Chạm vào tên của con nhé.").font(Diu.phu).foregroundColor(Diu.chu2)
      ForEach(Array((m.hoSo?.con ?? []).enumerated()), id: \.element.id) { i, be in
        Button { chon(be) } label: {
          HStack(spacing: 14) {
            AvatarBe(ten: be.ten, co: 52, mau: mauAvatar[i % mauAvatar.count])
            Text(be.ten).font(Diu.chu(20, .black)).foregroundColor(Diu.chu)
            Spacer()
            Image(systemName: "chevron.right").font(.system(size: 16, weight: .heavy)).foregroundColor(Diu.chu3)
          }
          .theDiu(dem: 12)
        }
        .buttonStyle(.plain)
        .disabled(m.dangBan)
      }
      if m.hoSo == nil {
        Text(m.matMang ? "Máy chưa có mạng và chưa nhớ danh sách bé. Bật Wi-Fi rồi thử lại nhé." : "Đang tải danh sách…")
          .font(Diu.t2).foregroundColor(Diu.chu2).multilineTextAlignment(.center)
      }
      if let thongBao { Text(thongBao).font(Diu.t2).foregroundColor(Diu.xanhDam).multilineTextAlignment(.center) }
      Text("Chưa ai vào thì máy chỉ mở màn này.").font(Diu.t2).foregroundColor(Diu.chu3)
      Spacer(minLength: 8)
      Button { buoc = .baMe } label: { Label { Text("Ba Mẹ dùng máy") } icon: { Anh(ten: "ic_nguoi", co: 26) } }
        .buttonStyle(NutDiu(kieu: .phu))
    }
  }

  func chon(_ be: BeTrenMay) {
    thongBao = nil; pin = ""; conLan = nil
    if let den = NgayISO.doc(be.khoaDen), den > Date() { buoc = .cho(be, den); return }
    if be.coPin { buoc = .pin(be); return }
    Task {   // bé chưa có PIN ⇒ vào thẳng (máy nhắc Ba Mẹ đặt)
      if case .loi(let c) = await m.dangNhap(be, pin: nil) { thongBao = c }
    }
  }

  // MARK: Nhập PIN 4 số (them-b3l7ubu5 · them-2ljthd3f)
  func nhapPin(_ be: BeTrenMay) -> some View {
    VStack(spacing: 16) {
      DauMan(tieuDe: "", lui: { buoc = .chonTen })
      AvatarBe(ten: be.ten, co: 72, mau: mauAvatar[(m.hoSo?.con.firstIndex(of: be) ?? 0) % mauAvatar.count])
      Text(be.ten).font(Diu.tieuDe).foregroundColor(Diu.chu)
      Text(conLan.map { "Chưa đúng · còn \($0) lần thử" } ?? "Nhập PIN 4 số")
        .font(Diu.chu(17, .heavy)).foregroundColor(conLan == nil ? Diu.chu2 : Diu.doChu)
      OSo(so: pin, dai: 4, an: true, loi: conLan != nil && pin.isEmpty)
        .padding(.vertical, 8)
      BanPhimSo(so: $pin, toiDa: 4, tat: m.dangBan)
        .onChange(of: pin) { p in if p.count == 4 { gui(be, p) } }
      Button("Quên PIN?") { buoc = .quen(be) }.buttonStyle(NutDiu(kieu: .lk))
      if let thongBao { Text(thongBao).font(Diu.t2).foregroundColor(Diu.doChu).multilineTextAlignment(.center) }
      HStack(spacing: 8) { Anh(ten: "ic_tim", co: 20); Text("Máy sẽ nhớ con — lần sau mở là vào luôn").font(Diu.t2).foregroundColor(Diu.chu2) }
    }
  }

  func gui(_ be: BeTrenMay, _ p: String) {
    Task {
      let kq = await m.dangNhap(be, pin: p)
      switch kq {
      case .vao: conLan = nil
      case .sai(let c): conLan = c; pin = ""
      case .tamKhoa(let g): pin = ""; conLan = nil; buoc = .cho(be, Date().addingTimeInterval(TimeInterval(g)))
      case .loi(let c): thongBao = c; pin = ""
      }
    }
  }

  // MARK: Sai 5 lần · chờ 15 giây (them-8l4fb6yf)
  func choThuLai(_ be: BeTrenMay, _ den: Date) -> some View {
    let con = max(0, Int(ceil(den.timeIntervalSince(tick))))
    return VStack(spacing: 16) {
      HStack(spacing: 8) { AvatarBe(ten: be.ten, co: 36); Text(be.ten).font(Diu.t1).foregroundColor(Diu.chu); Spacer() }
      Text("Sai 5 lần rồi").font(Diu.tieuDe).foregroundColor(Diu.chu)
      Anh(ten: "rob_nghi", co: 120)
      Text("Hít thở chậm nào. Chờ một chút rồi thử lại nhé.").font(Diu.phu).foregroundColor(Diu.chu2).multilineTextAlignment(.center)
      VongGio(con: con, tong: VaoMay.choGiay, co: 150, nhan: "giây")
      if con == 0 {
        Button { conLan = nil; pin = ""; buoc = .pin(be) } label: { Text("Nhập lại PIN") }.buttonStyle(NutDiu())
      }
      Button { buoc = .quen(be) } label: { Label { Text("Quên PIN? Nhờ Ba Mẹ") } icon: { Anh(ten: "ic_nguoi", co: 26) } }
        .buttonStyle(NutDiu(kieu: .phu))
    }
    .onChange(of: con) { c in if c == 0, m.demo == nil { conLan = nil; pin = ""; buoc = .pin(be) } }
  }

  // MARK: Quên PIN (them-bwdspoi7)
  func quenPin(_ be: BeTrenMay) -> some View {
    VStack(spacing: 14) {
      DauMan(tieuDe: "", lui: { buoc = .pin(be) })
      Anh(ten: "rob_so_tay", co: 110)
      Text("Quên PIN rồi à?").font(Diu.tieuDe).foregroundColor(Diu.chu)
      Text("Không sao! Nhờ Ba Mẹ đặt PIN mới nhé.").font(Diu.phu).foregroundColor(Diu.chu2)
      VStack(alignment: .leading, spacing: 14) {
        BuocSo(i: 1, t1: "Ba Mẹ mở AiiGrow")
        BuocSo(i: 2, t1: "Vào hồ sơ \(be.ten)")
        BuocSo(i: 3, t1: "Bấm «PIN · Đặt lại»")
      }
      .theDiu()
      if let thongBao { NhanNho(chu: thongBao, icon: "ic_tick", mau: Diu.xanhDam, nen: Diu.xanhNhat) }
      Button { Task { thongBao = await m.quenPin(be) } } label: { Label { Text("Báo Ba Mẹ giúp con") } icon: { Anh(ten: "ic_gui", co: 26) } }
        .buttonStyle(NutDiu())
      Button { thongBao = nil; Task { await m.taiHoSo() }; buoc = .pin(be) } label: { Text("Có PIN mới · nhập lại") }.buttonStyle(NutDiu(kieu: .phu))
      Button("Chọn bé khác") { thongBao = nil; buoc = .chonTen }.buttonStyle(NutDiu(kieu: .lk))
    }
  }
}

// MARK: Ba Mẹ nhập mã (them-q72t4no4)
struct ManBaMeNhapMa: View {
  @EnvironmentObject var m: MoHinhApp
  let xong: () -> Void
  @State var ma = ""
  @State var cau: String?
  var body: some View {
    VStack(spacing: 14) {
      DauMan(tieuDe: "", lui: xong)
      Anh(ten: "ic_khoa", co: 64)
      Text("Ba Mẹ nhập mã").font(Diu.tieuDe).foregroundColor(Diu.chu)
      Text("Dùng khi cần mở máy gấp").font(Diu.phu).foregroundColor(Diu.chu2)
      HStack(spacing: 10) {
        Anh(ten: "ic_dt", co: 26)
        Text("Mở app AiiGrow của Ba Mẹ → Mã mở máy").font(Diu.t2).foregroundColor(Diu.chu2)
      }
      .theDiu(dem: 12)
      OSo(so: ma, dai: 6, loi: cau != nil)
      Text(cau ?? "Mã 6 số · đổi sau 10 phút").font(Diu.t2).foregroundColor(cau == nil ? Diu.chu3 : Diu.doChu).multilineTextAlignment(.center)
      BanPhimSo(so: $ma, toiDa: 6, tat: m.dangBan)
        .onChange(of: ma) { _ in cau = nil }
      Button {
        Task {
          switch await m.baMeMo(ma) {
          case .mo: ma = ""
          case .sai(let c): cau = "Mã chưa đúng · còn \(c) lần thử"; ma = ""
          case .tamKhoa(let g): cau = "Nhập sai nhiều lần — đợi \(max(1, (g + 59) / 60)) phút rồi thử lại"; ma = ""
          case .daDung: cau = "Mã này đã dùng rồi — mở app Ba Mẹ lấy mã mới"; ma = ""
          case .loi(let c): cau = c
          }
        }
      } label: {
        if m.dangBan { ProgressView().tint(.white) } else { Label { Text("Mở máy cho Ba Mẹ") } icon: { Anh(ten: "ic_mo_khoa", co: 26) } }
      }
      .buttonStyle(NutDiu()).disabled(ma.count != 6 || m.dangBan)
    }
    .onAppear { if m.demo != nil { ma = "48" } }
  }
}

// MARK: Ba Mẹ đang dùng máy (them-f2mt6vfr)
struct ManBaMeDung: View {
  @EnvironmentObject var m: MoHinhApp
  var body: some View {
    KhungMan {
      HStack {
        NhanNho(chu: "Ba Mẹ đang dùng", icon: "ic_nguoi", mau: Diu.xanhDam, nen: Diu.xanhNhat)
        Spacer()
        Button { Task { await m.roiMay(baMe: true) } } label: { Label { Text("Khoá lại") } icon: { Anh(ten: "ic_khoa", co: 22) } }
          .buttonStyle(NutDiu(kieu: .phu)).fixedSize()
      }
      Text("Không trừ giờ của con").font(Diu.phu).foregroundColor(Diu.chu2).frame(maxWidth: .infinity, alignment: .leading)
      LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 12), count: 4), spacing: 16) {
        ForEach([("ic_dt", "Điện thoại"), ("ic_tin", "Tin nhắn"), ("ic_camera", "Máy ảnh"), ("ic_web", "Trình duyệt"),
                 ("ic_lich", "Lịch"), ("ic_game", "Trò chơi"), ("ic_sach", "Sách"), ("ic_banhrang", "Cài đặt")], id: \.0) { x in
          VStack(spacing: 6) { OIcon(ten: x.0, co: 58, nen: .white); Text(x.1).font(Diu.chu(12, .heavy)).foregroundColor(Diu.chu2).lineLimit(1) }
        }
      }
      .theDiu()
      VStack(spacing: 4) {
        Text("Máy mở hết cho Ba Mẹ").font(Diu.t1).foregroundColor(Diu.chu)
        if let den = m.phien?.baMeDen { Text("Tới \(den.gioPhut) · xong việc thì bấm «Khoá lại»").font(Diu.t2).foregroundColor(Diu.chu2) }
        else { Text("Xong việc thì bấm «Khoá lại»").font(Diu.t2).foregroundColor(Diu.chu2) }
      }
      .theDiu(chinh: true)
      Text("iPhone/iPad: các app vẫn mở bằng màn hình chính của máy — AiiGrow chỉ gỡ khoá tới hạn trên.")
        .font(Diu.chu(13, .semibold)).foregroundColor(Diu.chu3).multilineTextAlignment(.center)
    }
  }
}

// MARK: Đổi bé / Đăng xuất (them-j424uyis)
struct ManDoiBe: View {
  @EnvironmentObject var m: MoHinhApp
  @Environment(\.dismiss) var dong
  var body: some View {
    VStack(spacing: 14) {
      Capsule().fill(Diu.vien).frame(width: 40, height: 5).padding(.top, 8)
      HStack(spacing: 12) {
        AvatarBe(ten: m.tenCon ?? "Con", co: 52)
        VStack(alignment: .leading, spacing: 1) {
          Text(m.tenCon ?? "Con").font(Diu.t1).foregroundColor(Diu.chu)
          Text("Đang dùng máy này").font(Diu.t2).foregroundColor(Diu.chu2)
        }
        Spacer()
      }
      .theDiu()
      if m.dungChung || (m.hoSo?.con.count ?? 0) > 1 {
        Button { Task { await m.roiMay() } } label: { Label { Text("Đổi bé") } icon: { Anh(ten: "ic_lap", co: 26) } }.buttonStyle(NutDiu(kieu: .phu))
      }
      Button { Task { await m.roiMay() } } label: { Label { Text("Đăng xuất") } icon: { Anh(ten: "ic_thoat", co: 26) } }.buttonStyle(NutDiu(kieu: .phu))
      Text("Đăng xuất thì máy khoá lại. Vào lại bằng tên + PIN.").font(Diu.t2).foregroundColor(Diu.chu2).multilineTextAlignment(.center)
      Button("Ở lại") { dong() }.buttonStyle(NutDiu())
      Spacer(minLength: 0)
    }
    .padding(.horizontal, 16)
    .presentationDetents([.medium])
  }
}
