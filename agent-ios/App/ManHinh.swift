// Các màn của app Con. Vùng chạm ≥ 44pt, chữ tiếng Việt, ngôn ngữ «Clay gương» (Clay.swift). Luôn có dòng «Ba Mẹ quản lý máy này».
import SwiftUI
import FamilyControls
import ConCore

/// Nút chính than chì tráng men; `phu` = nút sáng chữ ngọc.
struct NutChinh: ButtonStyle {
  var phu = false
  func makeBody(configuration c: Configuration) -> some View { NutClay(kieu: phu ? .vien : .than).makeBody(configuration: c) }
}

/// Nút đóng trên thanh điều hướng: biểu tượng (nhãn đọc cho VoiceOver). Chữ «Đóng» trong viên kính cố định của iOS 26 bị cắt
/// thành «Đónç» khi cỡ chữ lớn; biểu tượng giữ nguyên kích thước, vùng chạm 44.
struct NutDong: View {
  var ten = "Đóng"
  var hinh = "xmark"
  let lam: () -> Void
  var body: some View {
    Button(action: lam) { Image(systemName: hinh).font(.body.weight(.semibold)).frame(minWidth: 44, minHeight: 44) }
      .accessibilityLabel(ten)
  }
}

struct DongQuanLy: View {
  var body: some View {
    Label("Ba Mẹ quản lý máy này bằng AiiGrow", systemImage: "person.2.fill")
      .font(.footnote).foregroundColor(Clay.chu3).frame(maxWidth: .infinity, alignment: .center).padding(.top, 4)
  }
}

struct ManGoc: View {
  @EnvironmentObject var m: MoHinhApp
  var body: some View {
    Group {
      switch m.man {
      case .chuaGhep: ManChuaGhep()
      case .nhapMa: ManNhapMa()
      case .chinh: ManChinh()
      case .daGo: ManDaGo()
      }
    }
    .frame(maxWidth: 560)
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(Clay.nenMan)
  }
}

// MARK: chưa ghép
struct ManChuaGhep: View {
  @EnvironmentObject var m: MoHinhApp
  var body: some View {
    // cuộn được: iPhone nhỏ / cỡ chữ lớn thì nút «Nhập mã ghép» không bị đẩy khỏi đáy màn; máy lớn vẫn căn giữa như cũ (minHeight)
    GeometryReader { g in ScrollView {
    VStack(spacing: 20) {
      Spacer()
      IconClay(ten: "fl_la", nen: Clay.chinhSoft, co: 104).vaoLanLuot(0)
      Text("AiiGrow Con").font(.largeTitle.bold()).multilineTextAlignment(.center).vaoLanLuot(1)
      Text("Ứng dụng giúp Ba Mẹ và con cùng giữ giờ chơi hợp lý trên iPhone, iPad.")
        .multilineTextAlignment(.center).foregroundColor(Clay.chu3).fixedSize(horizontal: false, vertical: true)
      VStack(alignment: .leading, spacing: 12) {
        buoc(1, "Ba Mẹ mở app AiiGrow, chọn «Thêm máy» › iPhone/iPad.")
        buoc(2, "Quét mã QR bằng Camera của máy này — app tự ghép.")
        buoc(3, "Hoặc bấm «Nhập mã ghép» và gõ mã 6 số Ba Mẹ đọc cho.")
      }
      .khoiClay().vaoLanLuot(2)
      if let l = m.loi { Text(l).font(.callout).foregroundColor(Clay.loi).multilineTextAlignment(.center) }
      Spacer()
      Button("Nhập mã ghép") { m.loi = nil; m.man = .nhapMa }.buttonStyle(NutChinh())
      Text("Máy được quản lý sẽ luôn hiện điều đó cho con biết.").font(.footnote).foregroundColor(Clay.chu3).multilineTextAlignment(.center)
    }
    .padding(24)
    .frame(minHeight: g.size.height)
    } }
  }
  func buoc(_ i: Int, _ s: String) -> some View {
    HStack(alignment: .top, spacing: 12) {
      Text("\(i)").font(.headline).foregroundColor(.white).frame(width: 30, height: 30).background(NenClay(kieu: .ngoc, bo: 15))
      Text(s).fixedSize(horizontal: false, vertical: true)
    }
  }
}

// MARK: nhập mã
struct ManNhapMa: View {
  @EnvironmentObject var m: MoHinhApp
  @State var ma = ""
  @FocusState var dangGo: Bool
  var hopLe: Bool { LienKet.doc(chuoi: ma) != nil }
  var body: some View {
    GeometryReader { g in ScrollView {
    VStack(spacing: 20) {
      HStack {
        Button { m.man = .chuaGhep } label: { Label("Quay lại", systemImage: "chevron.left").frame(minWidth: 44, minHeight: 44) }
        Spacer()
      }
      IconClay(ten: "fl_ma_so", nen: Clay.lamSoft, co: 64).vaoLanLuot(0)
      Text("Nhập mã ghép").font(.title.bold())
      Text("Mã 6 số hiện trong app AiiGrow của Ba Mẹ, dùng được 15 phút.").multilineTextAlignment(.center).foregroundColor(Clay.chu3).fixedSize(horizontal: false, vertical: true)
      TextField("000000", text: $ma)
        .keyboardType(.numberPad).textContentType(.oneTimeCode).focused($dangGo)
        .font(.system(size: 40, weight: .semibold, design: .monospaced)).multilineTextAlignment(.center)
        .frame(minHeight: 72)
        .background(NenClay(kieu: .lom, bo: 24))
        .onChange(of: ma) { v in if v.count > 6, LienKet.doc(chuoi: v) == nil { ma = String(v.filter(\.isNumber).prefix(6)) } }
      if let l = m.loi { Text(l).font(.callout).foregroundColor(Clay.loi).multilineTextAlignment(.center) }
      Button {
        if let c = LienKet.doc(chuoi: ma) { Task { await m.ghep(c) } }
      } label: {
        if m.dangBan { ProgressView().tint(.white) } else { Text("Ghép máy") }
      }
      .buttonStyle(NutChinh()).disabled(!hopLe || m.dangBan).opacity(hopLe ? 1 : 0.5)
      Spacer()
      DongQuanLy()
    }
    .padding(24)
    .frame(minHeight: g.size.height)
    } }
    .onAppear { dangGo = true }
  }
}

// MARK: màn chính
struct ManChinh: View {
  @EnvironmentObject var m: MoHinhApp
  @State var moChon = false

  var trangThai: (String, String, Color) {
    // (câu, icon Fluent 3D, màu chữ, màu viên)
    guard let k = m.khien else { return ("Đang tải luật của Ba Mẹ…", "fl_dong_ho_cat", Clay.chu3) }
    let gio = { (d: Date?) in d?.formatted(date: .omitted, time: .shortened) ?? "" }
    if k.dangMoOffline == true { return ("Đang mở bằng mã của Ba Mẹ, tới \(gio(m.moOfflineDen))", "fl_ma_so", Clay.chinhInk) }
    if k.dangChoiDiem == true { return ("Đang chơi bằng điểm, tới \(gio(m.keHoach?.phienDiemDen))", "fl_qua", Clay.chinhInk) }
    if k.dangThemGio, let den = m.keHoach?.moDen { return ("Đang dùng giờ Ba Mẹ thêm, tới \(den.formatted(date: .omitted, time: .shortened))", "fl_qua", Clay.chinhInk) }
    switch k.lyDo {
    case .khong: return ("Đang trong giờ chơi", "fl_mat_troi", Clay.chinhInk)
    case .ngu: return (k.lyDo.cauChoCon, "fl_trang", Color(hex: 0x3b2fa8))
    case .hetGio: return (k.lyDo.cauChoCon, "fl_dong_ho_cat", Clay.canh)
    case .khoaNgay: return (k.lyDo.cauChoCon, "fl_khoa", Clay.canh)   // cùng icon với màn chặn và Android
    case .khongTuanThu: return (k.lyDo.cauChoCon, "fl_canh_bao", Clay.canh)
    default: return (k.lyDo.cauChoCon, "fl_dong_ho", Clay.canh)
    }
  }

  var body: some View {
    ScrollView {
      VStack(spacing: 22) {   // thẻ đổ bóng 12+13pt: khe 22 để nút «Xin thêm giờ» không nằm trong bóng thẻ trên
        Text(m.tenCon.map { "Chào \($0)!" } ?? "Chào con!").font(.largeTitle.bold()).frame(maxWidth: .infinity, alignment: .leading)
          .vaoLanLuot(0)
        theThoiGian.vaoLanLuot(1)
        if let yc = m.yeuCau { theYeuCau(yc).vaoLanLuot(2) }
        // Nhiệm vụ / nộp bài / quà / tin nhắn / chơi bằng điểm: màn Con trong app AiiGrow (aiigrow://tre?phien=…)
        Button { Task { await m.moManCon() } } label: { Label("Nhiệm vụ & quà", systemImage: "star.fill") }
          .buttonStyle(NutChinh()).disabled(m.dangBan).vaoLanLuot(3)
        Button { m.moXinThem = true } label: { Label("Xin thêm giờ", systemImage: "hand.raised.fill") }
          .buttonStyle(NutChinh(phu: true)).vaoLanLuot(3)
        if m.coBiMatOffline, let k = m.khien, k.lyDo != .khong, k.dangMoOffline != true { theMaOffline.vaoLanLuot(4) }
        if m.uyQuyen != "approved" { theQuyen.vaoLanLuot(4) }
        theBaMe.vaoLanLuot(5)
        if let l = m.loi { Text(l).font(.footnote).foregroundColor(Clay.loi).multilineTextAlignment(.center) }
        DongQuanLy()
        if let t = m.lanDongBo {
          Text("Cập nhật luật lúc \(t.formatted(date: .omitted, time: .shortened))").font(.caption2).foregroundColor(Clay.chu3)
        }
      }
      .padding(20)
    }
    .refreshable { await m.dongBoNgay() }
    .sheet(isPresented: $m.moXinThem) { ManXinThem().environmentObject(m) }
    .sheet(isPresented: $m.moQuyen) { ManQuyen().environmentObject(m) }
    .sheet(isPresented: $moChon) { ManChonApp().environmentObject(m) }
    .sheet(isPresented: $m.moMaOffline) { ManMaOffline().environmentObject(m) }
    .sheet(isPresented: $m.moDns) { ManDns().environmentObject(m) }
  }

  var theMaOffline: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 10) {
        IconClay(ten: "fl_ma_so", nen: Clay.lamSoft)
        Text("Máy mất mạng?").font(.headline)
      }
      Text("Ba Mẹ mở app AiiGrow › Máy › «Mã mở khi mất mạng» rồi đọc 6 số cho con gõ.").font(.subheadline).foregroundColor(Clay.chu3)
        .fixedSize(horizontal: false, vertical: true)
      Button("Nhập mã của Ba Mẹ") { m.moMaOffline = true }.buttonStyle(NutChinh(phu: true))
    }
    .padding(.bottom, 8)
    .khoiClay(bo: 28, dem: 16)
  }

  var theThoiGian: some View {
    let tran = max(1, m.keHoach?.tranPhut ?? 1)
    let tl = Double(m.phutConLai) / Double(tran)
    return VStack(spacing: 12) {
      ZStack {
        // rãnh lòng chảo + vòng ngọc tráng men
        Circle().stroke(Clay.lom, lineWidth: 20)
        Circle().stroke(LinearGradient(colors: [Clay.bong.opacity(0.14), .white.opacity(0.9)], startPoint: .top, endPoint: .bottom), lineWidth: 2)
          .padding(-10)
        Circle().stroke(LinearGradient(colors: [.white.opacity(0.9), Clay.bong.opacity(0.12)], startPoint: .top, endPoint: .bottom), lineWidth: 2)
          .padding(10)
        Circle().trim(from: 0, to: tl)
          .stroke(LinearGradient(colors: [Color(hex: 0x1a8a77), Color(hex: 0x0c5e51)], startPoint: .top, endPoint: .bottom),
                  style: StrokeStyle(lineWidth: 14, lineCap: .round))
          .overlay(Circle().trim(from: 0, to: tl).stroke(Color.white.opacity(0.35), style: StrokeStyle(lineWidth: 3, lineCap: .round)).padding(-3.5))
          .rotationEffect(.degrees(-90))
          .shadow(color: Clay.chinhInk.opacity(0.35), radius: 3, y: 2)
          .animation(Clay.men, value: tl)
        VStack(spacing: 2) {
          Text("\(m.phutConLai)").font(.system(size: 56, weight: .bold, design: .rounded)).monospacedDigit()
            .contentTransition(.numericText()).animation(Clay.bat, value: m.phutConLai)
          Text("phút giải trí còn lại").font(.subheadline).foregroundColor(Clay.chu3)
            .multilineTextAlignment(.center).lineLimit(3).minimumScaleFactor(0.6)
        }
        // chữ nằm trong lòng vòng (đường kính trong 210 − 2×(10+11) = 168; dòng dưới tâm hẹp hơn): cỡ chữ lớn thì xuống dòng / thu,
        // không chạm vòng
        .frame(maxWidth: 144)
      }
      .frame(width: 210, height: 210)
      .accessibilityElement(children: .combine)
      HStack(spacing: 10) {
        IconClay(ten: trangThai.1, co: 36)
        Text(trangThai.0).font(.headline).foregroundColor(trangThai.2).multilineTextAlignment(.leading)
      }
      .accessibilityElement(children: .combine)
      Text("Hôm nay đã dùng \(m.phutDaDung) / \(m.keHoach?.tranPhut ?? 0) phút").font(.footnote).foregroundColor(Clay.chu3)
    }
    // vòng tràn 11pt ra ngoài khung 210 (nét 20 + viền men) ⇒ đệm dọc 12 để vòng cách mép thẻ ≥ 16
    .padding(.vertical, 12).frame(maxWidth: .infinity)
    .khoiClay()
  }

  func theYeuCau(_ yc: YeuCauDangCho) -> some View {
    HStack(alignment: .top, spacing: 12) {   // icon đứng đầu dòng tiêu đề, không trôi xuống giữa khi chữ lớn rớt nhiều dòng
      IconClay(ten: yc.xong ? (yc.cau.contains("đồng ý thêm") ? "fl_dau_tich" : "fl_dau_x") : "fl_dong_ho",
               nen: yc.xong ? Clay.chinhSoft : Clay.canhSoft)
      VStack(alignment: .leading, spacing: 2) {
        Text("Xin thêm \(yc.phut) phút").font(.headline)
        Text(yc.cau).font(.subheadline).foregroundColor(Clay.chu3)
        if !yc.loiNhan.isEmpty { Text("«\(yc.loiNhan)»").font(.footnote).foregroundColor(Clay.chu3) }
      }
      Spacer()
    }
    .khoiClay(bo: 28, dem: 16)
  }

  var theQuyen: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 10) {
        IconClay(ten: "fl_canh_bao", nen: Clay.canhSoft)
        Text("Chưa bật quyền Thời gian sử dụng").font(.headline).foregroundColor(Clay.canh)
      }
      Text("Cần Ba Mẹ cấp quyền một lần để AiiGrow giữ giờ chơi trên máy này.").font(.subheadline).foregroundColor(Clay.chu3)
      Button("Cấp quyền") { m.moQuyen = true }.buttonStyle(NutChinh(phu: true))
    }
    .padding(.bottom, 8)   // bóng nút (bán kính 8, lệch 8) không chạm mép đáy thẻ
    .khoiClay(bo: 28, dem: 16)
  }

  var theBaMe: some View {
    VStack(alignment: .leading, spacing: 8) {
      HStack(spacing: 10) {
        IconClay(ten: "fl_ba_me", nen: Clay.timSoft)
        Text("Dành cho Ba Mẹ").font(.headline)
      }
      Text("App học: \(m.soLuong.hoc) · App giải trí: \(m.soLuong.giaiTri) (+\(m.soLuong.danhMucGiaiTri) nhóm) · Chặn: \(m.soLuong.chan)")
        .font(.subheadline).foregroundColor(Clay.chu3)
      Button("Chọn app học / giải trí") { moChon = true }.buttonStyle(NutChinh(phu: true))
      Button("Cài lọc web gia đình (DNS)") { m.moDns = true }.buttonStyle(NutChinh(phu: true))
      ForEach(m.keHoach?.canhBao ?? [], id: \.self) { Text($0).font(.footnote).foregroundColor(Clay.canh) }
    }
    .padding(.bottom, 8)   // bóng nút (bán kính 8, lệch 8) không chạm mép đáy thẻ
    .khoiClay(bo: 28, dem: 16)
  }
}

// MARK: xin thêm giờ
struct ManXinThem: View {
  @EnvironmentObject var m: MoHinhApp
  @Environment(\.dismiss) var dong
  @State var phut = 30
  @State var loiNhan = ""
  @State var daGui = false
  let goiY = ["Con làm xong bài tập rồi ạ", "Con đang chơi dở với bạn", "Con xem nốt video học"]

  var nutPhut: some View {
    ForEach([30, 60, 120], id: \.self) { p in
      Button { withAnimation(Clay.bat) { phut = p } } label: { Text(p == 120 ? "2 giờ" : "\(p) phút").lineLimit(1).fixedSize() }
        .buttonStyle(NutClay(kieu: phut == p ? .ngoc : .vien, cao: 56))
        .accessibilityAddTraits(phut == p ? .isSelected : [])
    }
  }

  var body: some View {
    NavigationView {
      ScrollView {
        VStack(alignment: .leading, spacing: 18) {
          // Đổi điểm lấy thời gian (như RequestForm Windows): chơi ngay bằng điểm ở màn Con, không chờ Ba Mẹ duyệt
          Button { dong(); Task { await m.moManCon("choi") } } label: {
            HStack(spacing: 12) {
              IconClay(ten: "fl_qua", nen: Clay.canhSoft)
              VStack(alignment: .leading, spacing: 2) {
                Text("Đổi điểm lấy giờ chơi").font(.headline).foregroundColor(Clay.chu)
                Text("Có điểm thì chơi ngay, không cần chờ Ba Mẹ").font(.subheadline).foregroundColor(Clay.chu3)
              }
              Spacer(minLength: 0)
              Image(systemName: "chevron.right").foregroundColor(Clay.chu3)
            }
            .frame(minHeight: 44)
            .khoiClay(bo: 28, dem: 16)
          }
          .buttonStyle(.plain)
          Text("Hoặc xin Ba Mẹ thêm bao lâu?").font(.headline)
          // ba nút một hàng; cỡ chữ lớn không vừa thì xếp dọc (không cắt thành «30 p…»)
          ViewThatFits(in: .horizontal) {
            HStack(spacing: 12) { nutPhut }
            VStack(spacing: 12) { nutPhut }
          }
          Text("Lời nhắn cho Ba Mẹ").font(.headline)
          TextField("Vì sao con cần thêm giờ?", text: $loiNhan)
            .padding(.horizontal, 16).frame(minHeight: 56)
            .background(NenClay(kieu: .lom, bo: 22))
          ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) { ForEach(goiY, id: \.self) { g in
              Button(g) { loiNhan = g }.font(.subheadline.weight(.semibold)).foregroundColor(Clay.chu2).padding(.horizontal, 14).frame(minHeight: 44)
                .background(NenClay(kieu: .vien, bo: 22))
            } }
            .padding(.top, 6).padding(.bottom, 20).padding(.horizontal, 2)
          }
          if daGui, let yc = m.yeuCau {
            Label(yc.cau, systemImage: "paperplane.fill").foregroundColor(Clay.chinhInk).font(.headline)
              .transition(.opacity.combined(with: .scale(scale: 0.92)))
          }
          if let l = m.loi { Text(l).foregroundColor(Clay.loi).font(.callout) }
          Button {
            Task { daGui = await m.xinThem(phut: phut, loiNhan: loiNhan) }
          } label: {
            if m.dangBan { ProgressView().tint(.white) } else { Text(daGui ? "Gửi lại" : "Gửi cho Ba Mẹ") }
          }
          .buttonStyle(NutChinh()).disabled(m.dangBan)
          Text("Ba Mẹ đồng ý thì máy mở thêm giờ ở lần cập nhật kế tiếp (khi con mở app).")
            .font(.footnote).foregroundColor(Clay.chu3)
          DongQuanLy()
        }
        .padding(20)
      }
      .background(Clay.nenMan)
      .navigationTitle("Xin thêm giờ")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar { ToolbarItem(placement: .cancellationAction) { NutDong { dong() } } }
    }
    .navigationViewStyle(.stack)
  }
}

// MARK: mã mở offline
struct ManMaOffline: View {
  @EnvironmentObject var m: MoHinhApp
  @Environment(\.dismiss) var dong
  @State var ma = ""
  @State var kq: (Bool, String)?
  @FocusState var dangGo: Bool
  var body: some View {
    NavigationView {
      ScrollView {
        VStack(spacing: 18) {
          IconClay(ten: "fl_ma_so", nen: Clay.lamSoft, co: 72).vaoLanLuot(0)
          Text("Mã của Ba Mẹ").font(.title2.bold())
          Text("Khi máy mất mạng, Ba Mẹ mở app AiiGrow › Máy › «Mã mở khi mất mạng» và đọc 6 số. Mã đúng mở máy 60 phút; có mạng lại thì máy theo luật của Ba Mẹ như thường.")
            .multilineTextAlignment(.center).foregroundColor(Clay.chu3).fixedSize(horizontal: false, vertical: true)
          TextField("000000", text: $ma)
            .keyboardType(.numberPad).textContentType(.oneTimeCode).focused($dangGo)
            .font(.system(size: 40, weight: .semibold, design: .monospaced)).multilineTextAlignment(.center)
            .frame(minHeight: 72).background(NenClay(kieu: .lom, bo: 24))
            .onChange(of: ma) { v in let s = String(v.filter(\.isNumber).prefix(6)); if s != v { ma = s } }
          if let kq {
            Label(kq.1, systemImage: kq.0 ? "checkmark.circle.fill" : "exclamationmark.circle.fill")
              .font(.headline).foregroundColor(kq.0 ? Clay.chinhInk : Clay.loi).multilineTextAlignment(.leading)
          }
          Button("Mở máy") { kq = m.moBangMa(ma); if kq?.0 == true { ma = "" } }
            .buttonStyle(NutChinh()).disabled(ma.count != 6).opacity(ma.count == 6 ? 1 : 0.5)
          DongQuanLy()
        }
        .padding(20)
      }
      .background(Clay.nenMan)
      .navigationTitle("Mở bằng mã").navigationBarTitleDisplayMode(.inline)
      .toolbar { ToolbarItem(placement: .cancellationAction) { NutDong { dong() } } }
      .onAppear { dangGo = true }
    }
    .navigationViewStyle(.stack)
  }
}

// MARK: hồ sơ DNS gia đình
struct ManDns: View {
  @EnvironmentObject var m: MoHinhApp
  @Environment(\.dismiss) var dong
  let buoc = [
    "Bấm «Tải hồ sơ» — Safari mở và hỏi «Cho phép tải hồ sơ cấu hình?» ⇒ chọn Cho phép.",
    "Mở Cài đặt › «Đã tải về hồ sơ» (ngay dưới tên Apple ID) ⇒ Cài đặt ⇒ nhập mật mã máy.",
    "Xong: trang web Ba Mẹ chặn bị lọc ở mọi trình duyệt và app trên máy này, cả khi dùng 4G.",
  ]
  var body: some View {
    NavigationView {
      ScrollView {
        VStack(alignment: .leading, spacing: 16) {
          IconClay(ten: "fl_khoa", nen: Clay.chinhSoft, co: 72).frame(maxWidth: .infinity).vaoLanLuot(0)
          Text("Lọc web gia đình (DNS)").font(.title2.bold())
          Text("Hồ sơ DNS của gia đình lọc tên miền ngay trên máy, theo luật web Ba Mẹ đặt trong app AiiGrow. Ba Mẹ làm một lần, mất khoảng 1 phút.")
            .foregroundColor(Clay.chu3).fixedSize(horizontal: false, vertical: true)
          VStack(alignment: .leading, spacing: 12) {
            ForEach(Array(buoc.enumerated()), id: \.offset) { i, s in
              HStack(alignment: .top, spacing: 12) {
                Text("\(i + 1)").font(.headline).foregroundColor(.white).frame(width: 30, height: 30).background(NenClay(kieu: .ngoc, bo: 15))
                Text(s).fixedSize(horizontal: false, vertical: true)
              }
            }
          }
          .khoiClay()
          if let l = m.loi { Text(l).font(.callout).foregroundColor(Clay.loi) }
          Button { Task { await m.caiHoSoDns() } } label: {
            if m.dangBan { ProgressView().tint(.white) } else { Text("Tải hồ sơ") }
          }
          .buttonStyle(NutChinh()).disabled(m.dangBan)
          Text("Gỡ: Cài đặt › Cài đặt chung › VPN & Quản lý thiết bị › «AiiGrow — DNS gia đình» › Xoá hồ sơ (cần mật mã máy).")
            .font(.footnote).foregroundColor(Clay.chu3).fixedSize(horizontal: false, vertical: true)
          DongQuanLy()
        }
        .padding(20)
      }
      .background(Clay.nenMan)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar { ToolbarItem(placement: .cancellationAction) { NutDong { dong() } } }
      .onAppear { m.loi = nil }        // lỗi cũ của lượt đồng bộ không hiện lẫn vào bảng DNS
    }
    .navigationViewStyle(.stack)
  }
}

// MARK: quyền Screen Time
struct ManQuyen: View {
  @EnvironmentObject var m: MoHinhApp
  @Environment(\.dismiss) var dong
  @State var giaDinh = true
  var body: some View {
    NavigationView {
      ScrollView {
        VStack(alignment: .leading, spacing: 16) {
          IconClay(ten: "fl_dong_ho_cat", nen: Clay.chinhSoft, co: 88).frame(maxWidth: .infinity).vaoLanLuot(0)
          Text("Cấp quyền Thời gian sử dụng").font(.title2.bold())
          Text("AiiGrow dùng Thời gian sử dụng của Apple để mở / tạm khoá app theo giờ Ba Mẹ đặt. Apple sẽ hỏi Ba Mẹ xác nhận một lần. AiiGrow không đọc tin nhắn, ảnh hay nội dung app.")
            .foregroundColor(Clay.chu3)
          Toggle(isOn: $giaDinh) {
            VStack(alignment: .leading) {
              Text("Máy dùng Apple ID của con trong Chia sẻ trong gia đình").font(.subheadline.weight(.semibold))
              Text(giaDinh ? "Ba Mẹ xác nhận bằng Apple ID của Ba Mẹ; gỡ app cần Ba Mẹ đồng ý." : "Xác nhận bằng Face ID / mật mã của máy này.")
                .font(.footnote).foregroundColor(Clay.chu3)
            }
          }
          .tint(Clay.chinh).frame(minHeight: 44)
          if let l = m.loiQuyen {
            Label(l, systemImage: "info.circle.fill").font(.callout).foregroundColor(Clay.canh)
              .khoiClay(Clay.canhSoft, bo: 24, dem: 16)
          }
          Button("Cấp quyền") { Task { await m.xinQuyen(conTrongGiaDinh: giaDinh) } }.buttonStyle(NutChinh())
          DongQuanLy()
        }
        .padding(20)
      }
      .background(Clay.nenMan)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar { ToolbarItem(placement: .cancellationAction) { NutDong { dong() } } }
    }
    .navigationViewStyle(.stack)
  }
}

// MARK: Ba Mẹ chọn app (FamilyActivityPicker — token mờ, lưu trên máy)
struct ManChonApp: View {
  @EnvironmentObject var m: MoHinhApp
  @Environment(\.dismiss) var dong
  @State var nhan: NhanApp = .giaiTri
  @State var chon = FamilyActivitySelection()
  var body: some View {
    NavigationView {
      VStack(spacing: 12) {
        Picker("Nhãn", selection: $nhan) { ForEach(NhanApp.allCases) { Text($0.ten).tag($0) } }
          .pickerStyle(.segmented).frame(minHeight: 44)
        Text(nhan.moTa).font(.footnote).foregroundColor(Clay.chu3)
        FamilyActivityPicker(selection: $chon)
        Button("Lưu \(nhan.ten.lowercased())") { m.luuChon(chon, nhan) }.buttonStyle(NutChinh())
      }
      .padding()
      .onAppear { chon = m.luaChon.doc(nhan) }
      .onChange(of: nhan) { chon = m.luaChon.doc($0) }
      .navigationTitle("Ba Mẹ chọn app").navigationBarTitleDisplayMode(.inline)
      .toolbar { ToolbarItem(placement: .confirmationAction) { NutDong(ten: "Xong", hinh: "checkmark") { dong() } } }
    }
    .navigationViewStyle(.stack)
  }
}

// MARK: đã gỡ
struct ManDaGo: View {
  var body: some View {
    VStack(spacing: 16) {
      IconClay(ten: "fl_dau_tich", nen: Clay.chinhSoft, co: 96).vaoLanLuot(0)
      Text("Ba Mẹ đã gỡ AiiGrow khỏi máy này").font(.title2.bold()).multilineTextAlignment(.center)
      Text("Mọi giới hạn đã được bỏ. Để xoá biểu tượng: chạm giữ biểu tượng AiiGrow Con › Xoá ứng dụng.")
        .multilineTextAlignment(.center).foregroundColor(Clay.chu3)
    }
    .padding(24)
  }
}
