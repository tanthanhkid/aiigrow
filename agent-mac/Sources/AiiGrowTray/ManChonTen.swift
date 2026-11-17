// Màn chọn tên + PIN theo bé (thiết kế con-cai-mac màn 10–16, L13): máy khoá → «Ai đang dùng máy?» → chạm tên → PIN 4 số (sai 5 lần chờ
// 15 giây, «Quên PIN?») · «Ba Mẹ dùng máy» → «Ba Mẹ nhập mã» → «Ba Mẹ đang dùng máy · Khoá lại». Mọi lời gọi qua daemon (IPC), tray
// không giữ token, không thấy vân PIN.
import AppKit
import SwiftUI
import AiiGrowCore

@MainActor
final class ChonTenModel: ObservableObject {
  @Published var buoc: BuocChonTen = .chonTen
  @Published var hoSo: HoSoMay?
  @Published var pin = PinNhap()
  @Published var cau: String?
  @Published var cauLoi = false
  /// Đang bị chờ (sai 5 lần) tới lúc này.
  @Published var choDen: Date?
  /// Hạn chờ theo từng bé (mốc tuyệt đối) — chọn lại tên không làm mất / làm sai đồng hồ chờ.
  var choDenBe: [String: Date] = [:]
  private var taiLuc = Date()
  @Published var ma = ""
  @Published var dangGui = false
  /// Lần đăng nhập vừa xong (tray hỏi lại trạng thái để gỡ màn).
  var xong: () -> Void = {}
  /// Bấm «‹» về màn đầu (tray dùng để thoát màn «Ba Mẹ nhập mã» mở từ màn khoá / app).
  var khiVeDau: () -> Void = {}
  let goi: (YeuCauTray) async -> TraLoi
  init(goi: @escaping (YeuCauTray) async -> TraLoi = AppConModel.goiThat) { self.goi = goi }

  var dsBe: [HoSoBe] { hoSo?.con ?? [] }

  func tai() async {
    if case let .duLieu(j) = await goi(.hoSo), let h = try? IPCMa.decoder.decode(HoSoMay.self, from: Data(j.utf8)) {
      hoSo = h; taiLuc = Date()
      for b in h.con { if let d = b.khoaDen ?? b.choGiay.map({ taiLuc.addingTimeInterval(TimeInterval($0)) }), d > (choDenBe[b.id] ?? .distantPast) { choDenBe[b.id] = d } }
      // #339: bé đang nhập PIN vừa bị Ba Mẹ bỏ gán khỏi máy ⇒ về lưới tên (chữ như agent-win ManChonTen)
      if let b = beDangChon, !h.con.contains(where: { $0.id == b.id }) {
        buoc = .chonTen; pin.lamLai(); choDen = nil; cau = ChonTenModel.khongThayBe; cauLoi = true
      } else if cau == ChonTenModel.chuaLayDuoc { cau = nil; cauLoi = false }
    }
    else if hoSo == nil { cau = ChonTenModel.chuaLayDuoc; cauLoi = true }
  }

  static let chuaLayDuoc = "Chưa lấy được danh sách các bé. Con thử lại sau vài giây nhé."
  static let khongThayBe = "Không thấy tên này trên máy — chọn lại nhé."
  /// Dòng cuối màn chọn tên như agent-win (ManChonTenView.KhongThayTen / NhoBaMeThem); chạm ⇒ tải lại danh sách.
  static let khongThayTen = "Không thấy tên con?"
  static let nhoBaMeThem = "Nhờ Ba Mẹ thêm con vào máy này trên điện thoại."

  private var beDangChon: HoSoBe? {
    switch buoc { case let .pin(b), let .quenPin(b): return b; default: return nil }
  }

  /// #339: `hoSoSeq` daemon trả lần trước. Đổi ⇒ danh sách bé của máy vừa đổi (Ba Mẹ thêm / bỏ gán) ⇒ màn chọn tên đang mở tải lại ngay.
  private(set) var hoSoSeqDaThay: Int?
  @discardableResult
  func nhanHoSoSeq(_ seq: Int?) -> Bool {
    guard let seq else { return false }
    defer { hoSoSeqDaThay = seq }
    guard let cu = hoSoSeqDaThay, cu != seq else { return false }
    Task { await tai() }
    return true
  }

  /// Về màn đầu mà không báo tray (máy vừa chuyển sang «chưa ai vào»).
  func veDauLang() { buoc = .chonTen; pin.lamLai(); cau = nil; cauLoi = false; choDen = nil; ma = ""; Task { await tai() } }
  func veDau() { buoc = .chonTen; pin.lamLai(); cau = nil; cauLoi = false; choDen = nil; ma = ""; khiVeDau() }

  func chon(_ b: HoSoBe) {
    cau = nil; cauLoi = false; pin.lamLai()
    choDen = choDenBe[b.id].flatMap { $0 > Date() ? $0 : nil }
    if b.coPin { buoc = .pin(b) } else { Task { await dangNhap(b, pin: nil) } }      // bé chưa có PIN: chạm tên vào thẳng
  }

  func bam(_ c: Character) {
    guard case let .pin(b) = buoc, !dangGui, (choDen ?? .distantPast) <= Date() else { return }
    pin.them(c)
    if pin.du { Task { await dangNhap(b, pin: pin.so) } }
  }

  func dangNhap(_ b: HoSoBe, pin p: String?) async {
    dangGui = true; defer { dangGui = false }
    switch await goi(.dangNhapBe(con: b.id, pin: p)) {
    case let .pin(kq, conLan, cho, chu):
      if kq == "ok" { cau = nil; xong(); return }
      pin.lamLai()
      if kq == "can_pin", p == nil {                       // Ba Mẹ vừa đặt PIN cho bé (danh sách cũ ghi chưa có) ⇒ sang bước PIN
        var b2 = b; b2.coPin = true; buoc = .pin(b2); cau = nil; await tai(); return
      }
      if let cho, cho > 0 { choDen = Date().addingTimeInterval(TimeInterval(cho)); choDenBe[b.id] = choDen; cau = nil }
      else { cau = ManMac.cauPin(kq, conLan: conLan) ?? chu; cauLoi = true }
    case let .loi(_, chu): pin.lamLai(); cau = chu; cauLoi = true
    default: pin.lamLai(); cau = "Chưa vào được. Con thử lại nhé."; cauLoi = true
    }
  }

  func quenPin(_ b: HoSoBe) async {
    dangGui = true; defer { dangGui = false }
    switch await goi(.quenPin(con: b.id)) {
    case let .thongBao(c): cau = c; cauLoi = false
    case let .loi(_, c): cau = c; cauLoi = true
    default: cau = "Chưa báo được. Con thử lại nhé."; cauLoi = true
    }
  }

  func baMeMo() async {
    guard TrayLogic.maHopLe(ma), !dangGui else { return }
    dangGui = true; defer { dangGui = false }
    switch await goi(.baMeMo(ma: ma)) {
    case .thongBao: cau = nil; ma = ""; xong()
    case let .pin(_, _, _, chu), let .loi(_, chu): cau = chu; cauLoi = true; ma = ""
    default: cau = "Chưa mở được."; cauLoi = true
    }
  }
}

/// Avatar chữ cái (cam / xanh như thiết kế).
struct AvatarBe: View {
  let chu: String
  var thu = 0
  var co: CGFloat = 84
  var chon = false                       // bé đang chọn = vòng vàng kim
  static let mau: [[Color]] = [[ClayMau.hex(0xf6b46c), ClayMau.hex(0xee8f35)], [ClayMau.hex(0x8db8f2), ClayMau.hex(0x4c8be0)],
                               [ClayMau.hex(0x9ad3a8), ClayMau.hex(0x3fa266)], [ClayMau.hex(0xd1a6ef), ClayMau.hex(0x9a5fd0)]]
  var body: some View {
    let m = AvatarBe.mau[thu % AvatarBe.mau.count]
    Text(chu).font(.clay(size: co * 0.45, weight: .bold)).foregroundColor(.white)
      .frame(width: co, height: co)
      .background(Circle().fill(LinearGradient(colors: m, startPoint: .top, endPoint: .bottom)))
      .overlay(Circle().strokeBorder(chon ? ClayMau.kimVien : ClayMau.nenSang, lineWidth: chon ? 4 : 3))
      .shadow(color: ClayMau.bong.opacity(0.25), radius: 6, x: 0, y: 4)
      .accessibilityHidden(true)
  }
}

/// Nền chung các màn toàn màn hình sáng (10–16, 33, 35, 40): kem + quầng ngọc nhạt, chân trang «AiiGrow · … · máy do Ba Mẹ quản lý».
struct NenManSang<N: View>: View {
  var chan: String
  @ViewBuilder let noiDung: () -> N
  var body: some View {
    ZStack {
      ClayMau.nen.ignoresSafeArea()
      noiDung()
      VStack { Spacer(); Text(chan).font(.clay(size: 13)).foregroundColor(ClayMau.chu3).padding(.bottom, 48) }
    }
    .foregroundColor(ClayMau.chu)
    .environment(\.colorScheme, .light)
  }
}

/// Viên nhỏ nền kem lõm (pill) «Máy đang khoá» / «Ba Mẹ dùng máy».
struct VienNho: View {
  let chu: String
  var icon: String? = nil
  var mau: Color = ClayMau.ngocInk
  var body: some View {
    HStack(spacing: 8) {
      if let icon { HinhFluent(ten: icon, duPhong: "lock.fill", co: 18) }
      Text(chu).font(.clay(size: 14, weight: .bold)).foregroundColor(mau)
    }
    .padding(.horizontal, 16).padding(.vertical, 9)
    .background(Capsule().fill(ClayMau.lom))
  }
}

struct ManChonTenView: View {
  @ObservedObject var m: ChonTenModel

  var body: some View {
    NenManSang(chan: "AiiGrow · Mac của cả nhà · máy do Ba Mẹ quản lý") {
      VStack(spacing: 18) {
        switch m.buoc {
        case .chonTen: chonTen
        case let .pin(b): nhapPin(b)
        case let .quenPin(b): quenPin(b)
        case .baMeMa: baMeMa
        }
      }
      .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    .task { await m.tai() }
    .background(PhimSo { c in
      switch m.buoc {
      case .pin: if c == "\u{8}" { m.pin.xoa() } else { m.bam(c) }
      case .baMeMa:
        if c == "\u{8}" { if !m.ma.isEmpty { m.ma.removeLast() } }
        else if c == "\r" { Task { await m.baMeMo() } }
        else if m.ma.count < 6, c.isASCII, c.isNumber { m.ma.append(c) }
      default: break
      }
    })
  }

  // ---- 10 «Ai đang dùng máy?»
  private var chonTen: some View {
    let chuCai = ManMac.chuCai(m.dsBe)
    return VStack(spacing: 22) {
      VienNho(chu: "Máy đang khoá", icon: "locked")
      VStack(spacing: 16) {
        RobView(ten: "rob-goc", cao: 108)
        Text("Ai đang dùng máy?").font(.clay(size: 30, weight: .bold, vai: .tieuDe))
        Text("Bấm vào tên của con nhé.").font(.clay(size: 16)).foregroundColor(ClayMau.chu3)
        HStack(spacing: 20) {
          ForEach(Array(m.dsBe.enumerated()), id: \.element.id) { i, b in
            Button { m.chon(b) } label: {
              VStack(spacing: 12) {
                AvatarBe(chu: chuCai[b.id] ?? "?", thu: i)
                Text(b.ten).font(.clay(size: 19, weight: .bold)).foregroundColor(ClayMau.chu).lineLimit(1)
                if let sao = b.sao { VienSao(sao: sao, co: 14) }                        // 15/11: sao đi theo từng bé
                if let no = ManMac.noCua(b) { Text("Đang nợ Ba Mẹ \(ChuSao.so(no)) sao").font(.clay(size: 12, weight: .semibold)).foregroundColor(ClayMau.canh).lineLimit(1) }
              }
              .frame(width: 172, height: b.sao == nil ? 170 : 214).clayThe(bo: 24)
            }
            .buttonStyle(.plain).disabled(m.dangGui)
            .accessibilityLabel("Chọn \(b.ten)")
          }
        }
        .padding(.top, 6)
        if let c = m.cau { Text(c).font(.clay(size: 13, weight: .semibold)).foregroundColor(m.cauLoi ? ClayMau.loi : ClayMau.ngocInk) }
        Text("Chưa ai vào thì máy chỉ mở màn này · sao và luật đi theo từng bé.").font(.clay(size: 12)).foregroundColor(ClayMau.chu3)
        // #339: như agent-win — bé mới chưa hiện thì chạm để tải lại; vẫn không có thì nhờ Ba Mẹ gán con vào máy
        Button { m.cau = nil; m.cauLoi = false; Task { await m.tai() } } label: {
          VStack(spacing: 2) {
            Text(ChonTenModel.khongThayTen).font(.clay(size: 13, weight: .bold)).foregroundColor(ClayMau.chu2)
            Text(ChonTenModel.nhoBaMeThem).font(.clay(size: 12)).foregroundColor(ClayMau.chu3)
          }
        }
        .buttonStyle(.plain).disabled(m.dangGui)
        .accessibilityLabel("Không thấy tên con? Tải lại danh sách")
      }
      .padding(.horizontal, 60).padding(.vertical, 24)
      .frame(width: 576)
      .clayThe(bo: 32)
      Spacer().frame(height: 90)
      Button { m.cau = nil; m.buoc = .baMeMa } label: { VienNho(chu: "Ba Mẹ dùng máy", icon: "key") }.buttonStyle(.plain)
    }
  }

  // ---- 11/12/13 PIN
  private func nhapPin(_ b: HoSoBe) -> some View {
    let thu = m.dsBe.firstIndex(of: b) ?? 0
    return VStack(spacing: 14) {
      AvatarBe(chu: ManMac.chuCai(m.dsBe)[b.id] ?? "?", thu: thu, chon: true)
      Text(b.ten).font(.clay(size: 21, weight: .bold, vai: .tieuDe))
      TimelineView(.periodic(from: .now, by: 0.5)) { ctx in
        let con = Int(ceil((m.choDen ?? .distantPast).timeIntervalSince(ctx.date)))
        if con > 0 {
          VStack(spacing: 10) {
            Text("Sai 5 lần rồi").font(.clay(size: 22, weight: .bold, vai: .tieuDe))
            Text("Hít thở chậm nào. Chờ một chút rồi thử lại nhé.").font(.clay(size: 14)).foregroundColor(ClayMau.chu3)
            VStack(spacing: 0) {
              Text(ManMac.dongHoCho(con)).font(.clay(size: 44, weight: .bold, vai: .so)).monospacedDigit().foregroundColor(ClayMau.ngocInk)
              Text("giây").font(.clay(size: 13)).foregroundColor(ClayMau.chu3)
            }
            .frame(width: 150, height: 110).clayLom(bo: 24)
            Button("Quên PIN? Nhờ Ba Mẹ") { m.cau = nil; m.buoc = .quenPin(b) }.buttonStyle(.plain)
              .font(.clay(size: 14, weight: .bold)).foregroundColor(ClayMau.ngocInk)
          }
        } else {
          VStack(spacing: 14) {
            Text(m.cau ?? "Nhập PIN 4 số").font(.clay(size: 15, weight: m.cauLoi ? .bold : .regular))
              .foregroundColor(m.cauLoi ? ClayMau.loi : ClayMau.chu3)
            HStack(spacing: 14) {
              ForEach(0..<4, id: \.self) { i in
                Circle().fill(i < m.pin.so.count ? ClayMau.ngoc : ClayMau.lom).frame(width: 18, height: 18)
                  .overlay(Circle().strokeBorder(ClayMau.bong.opacity(0.12), lineWidth: 1))
              }
            }
            .modifier(Rung(lan: m.cauLoi ? 1 : 0))
            banPhim
            Button("Quên PIN?") { m.cau = nil; m.buoc = .quenPin(b) }.buttonStyle(.plain)
              .font(.clay(size: 15, weight: .bold)).foregroundColor(ClayMau.ngocInk)
            Text("Máy sẽ nhớ con — lần sau mở là vào luôn").font(.clay(size: 13, weight: .semibold)).foregroundColor(ClayMau.ngocInk)
              .padding(.horizontal, 18).padding(.vertical, 8).background(Capsule().fill(ClayMau.ngocSoft))
          }
        }
      }
    }
    .padding(.horizontal, 48).padding(.vertical, 26).frame(width: 432)
    .clayThe(bo: 32)
    .overlay(alignment: .topLeading) { nutLui.padding(18) }
  }

  private var banPhim: some View {
    let hang: [[Character?]] = [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"], [nil, "0", "\u{8}"]]
    return VStack(spacing: 10) {
      ForEach(0..<4, id: \.self) { r in
        HStack(spacing: 10) {
          ForEach(0..<3, id: \.self) { c in
            if let k = hang[r][c] {
              Button { if k == "\u{8}" { m.pin.xoa() } else { m.bam(k) } } label: {
                if k == "\u{8}" { Image(systemName: "delete.left.fill").font(.system(size: 18)) } else { Text(String(k)).font(.clay(size: 20, weight: .bold)) }
              }
              .buttonStyle(NutClayStyle(kieu: .sang, bo: 14, cao: 46)).frame(width: 76)
              .accessibilityLabel(k == "\u{8}" ? "Xoá" : String(k))
            } else { Color.clear.frame(width: 76, height: 46) }
          }
        }
      }
    }
    .disabled(m.dangGui)
  }

  private var nutLui: some View {
    Button { m.veDau() } label: { Image(systemName: "chevron.left").font(.system(size: 14, weight: .bold)).foregroundColor(ClayMau.ngocInk) }
      .buttonStyle(NutClayStyle(kieu: .sang, bo: 22, cao: 44)).frame(width: 44)
      .accessibilityLabel("Quay lại")
  }

  // ---- 14 Quên PIN
  private func quenPin(_ b: HoSoBe) -> some View {
    VStack(alignment: .leading, spacing: 14) {
      HStack { Spacer(); RobView(ten: "trong-loi", cao: 96); Spacer() }
      Text("Quên PIN rồi à?").font(.clay(size: 26, weight: .bold, vai: .tieuDe)).frame(maxWidth: .infinity)
      Text("Không sao! Nhờ Ba Mẹ đặt PIN mới nhé.").font(.clay(size: 15)).foregroundColor(ClayMau.chu3).frame(maxWidth: .infinity)
      VStack(alignment: .leading, spacing: 10) {
        buocSo(1, "Ba Mẹ mở AiiGrow trên điện thoại")
        buocSo(2, "Vào hồ sơ \(b.ten)")
        buocSo(3, "Bấm «PIN · Đặt lại»")
      }
      .padding(16).frame(maxWidth: .infinity, alignment: .leading).clayLom(bo: 20)
      Button(m.dangGui ? "Đang báo…" : "Báo Ba Mẹ giúp con") { Task { await m.quenPin(b) } }
        .buttonStyle(NutClayStyle(kieu: .thanChi)).disabled(m.dangGui)
      if let c = m.cau { Chu(c, co: 14, dam: .semibold, mau: m.cauLoi ? ClayMau.loi : ClayMau.ngocInk, dong: 2) }
      HStack(spacing: 12) {
        Button("Có PIN mới · nhập lại") { m.cau = nil; m.pin.lamLai(); m.buoc = .pin(b) }.buttonStyle(NutClayStyle(kieu: .sang))
        Button("Chọn bé khác") { m.veDau() }.buttonStyle(NutClayStyle(kieu: .sang))
      }
    }
    .padding(28).frame(width: 470).clayThe(bo: 32)
  }

  private func buocSo(_ n: Int, _ s: String) -> some View {
    HStack(spacing: 12) {
      Text("\(n)").font(.clay(size: 14, weight: .bold)).foregroundColor(ClayMau.chu).frame(width: 26, height: 26).background(Circle().fill(ClayMau.vang))
      Text(s).font(.clay(size: 15, weight: .medium))
    }
  }

  // ---- 15 Ba Mẹ nhập mã
  private var baMeMa: some View {
    VStack(spacing: 14) {
      RobView(ten: "chi", cao: 80)
      Text("Ba Mẹ nhập mã").font(.clay(size: 30, weight: .bold, vai: .tieuDe))
      Text("Mở app AiiGrow của Ba Mẹ → Mã mở máy").font(.clay(size: 16)).foregroundColor(ClayMau.chu3)
      HStack(spacing: 9) {
        ForEach(0..<6, id: \.self) { i in
          let c = Array(m.ma)
          Text(i < c.count ? String(c[i]) : "").font(.clay(size: 24, weight: .bold)).frame(width: 46, height: 54).clayLom(bo: 14)
            .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(ClayMau.ngoc, lineWidth: 2.5).opacity(i == c.count ? 1 : 0))
        }
      }
      .modifier(Rung(lan: m.cauLoi ? 1 : 0))
      Text("Mã 6 số · đổi sau 10 phút · gõ bằng bàn phím").font(.clay(size: 12)).foregroundColor(ClayMau.chu3)
      if let c = m.cau { Text(c).font(.clay(size: 14, weight: .bold)).foregroundColor(m.cauLoi ? ClayMau.loi : ClayMau.ngocInk) }
      Text("Ba Mẹ dùng thì không trừ giờ của con").font(.clay(size: 13, weight: .semibold)).foregroundColor(ClayMau.ngocInk)
        .padding(.horizontal, 18).padding(.vertical, 8).background(Capsule().fill(ClayMau.ngocSoft))
      Button { Task { await m.baMeMo() } } label: {
        HStack(spacing: 8) { HinhFluent(ten: "key", duPhong: "key.fill", co: 20); Text(m.dangGui ? "Đang kiểm…" : "Mở máy cho Ba Mẹ") }
      }
      .buttonStyle(NutClayStyle(kieu: .ngoc)).disabled(m.dangGui || !TrayLogic.maHopLe(m.ma))
    }
    .padding(.horizontal, 34).padding(.vertical, 24).frame(width: 432)
    .clayThe(bo: 32)
    .overlay(alignment: .topLeading) { nutLui.padding(18) }
  }
}

/// 16 «Ba Mẹ đang dùng máy» — bảng nhỏ góc trên phải, không che máy.
struct BaMeDangDungView: View {
  var den: Date?
  var khoaLai: () -> Void
  var body: some View {
    VStack(alignment: .leading, spacing: 10) {
      HStack(spacing: 12) {
        VienClay(ten: "key", duPhong: "key.fill", nen: ClayMau.ngocSoft, co: 46)
        VStack(alignment: .leading, spacing: 2) {
          Text("Ba Mẹ đang dùng máy").font(.clay(size: 17, weight: .bold))
          Text("Không trừ giờ của con" + (den.map { " · tới " + AppConView.gioPhut.string(from: $0) } ?? ""))
            .font(.clay(size: 13, weight: .semibold)).foregroundColor(ClayMau.ngocInk)
        }
      }
      Chu("Máy mở hết cho Ba Mẹ. Xong việc thì bấm «Khoá lại» — máy về màn chọn tên.", co: 13, mau: ClayMau.chu3)
      Button(action: khoaLai) { HStack(spacing: 8) { HinhFluent(ten: "locked", duPhong: "lock.fill", co: 20); Text("Khoá lại") } }
        .buttonStyle(NutClayStyle(kieu: .thanChi))
    }
    .padding(18).clayThe(bo: 26)
    .padding(14).padding(.bottom, 16).frame(width: 360).nenClay()
    .foregroundColor(ClayMau.chu)
  }
}

/// Lắc ngang khi sai (Reduce Motion ⇒ không lắc).
struct Rung: GeometryEffect {
  var lan: CGFloat
  var animatableData: CGFloat { get { lan } set { lan = newValue } }
  func effectValue(size: CGSize) -> ProjectionTransform { ProjectionTransform(CGAffineTransform(translationX: 6 * sin(lan * .pi * 4), y: 0)) }
}

/// Bắt phím thật (số, xoá, Enter) cho màn PIN / mã — view AppKit nhận first responder.
struct PhimSo: NSViewRepresentable {
  let nhan: (Character) -> Void
  final class V: NSView {
    var nhan: ((Character) -> Void)?
    override var acceptsFirstResponder: Bool { true }
    override func viewDidMoveToWindow() { super.viewDidMoveToWindow(); DispatchQueue.main.async { [weak self] in self?.window?.makeFirstResponder(self) } }
    override func keyDown(with e: NSEvent) {
      if e.keyCode == 51 { nhan?("\u{8}"); return }
      if e.keyCode == 36 || e.keyCode == 76 { nhan?("\r"); return }
      if let c = e.charactersIgnoringModifiers?.first, c.isASCII, c.isNumber { nhan?(c) } else { super.keyDown(with: e) }
    }
  }
  func makeNSView(context: Context) -> V { let v = V(); v.nhan = nhan; return v }
  func updateNSView(_ v: V, context: Context) { v.nhan = nhan }
}
