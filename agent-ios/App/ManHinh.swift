// Các màn của app Con. Vùng chạm ≥ 44pt, chữ tiếng Việt, màu chính #1f8a70. Luôn có dòng «Ba Mẹ quản lý máy này».
import SwiftUI
import FamilyControls
import ConCore

struct NutChinh: ButtonStyle {
  var phu = false
  func makeBody(configuration c: Configuration) -> some View {
    c.label.font(.headline).frame(maxWidth: .infinity, minHeight: 50)
      .foregroundColor(phu ? mauChinh : .white)
      .background(RoundedRectangle(cornerRadius: 14).fill(phu ? mauChinh.opacity(0.12) : mauChinh))
      .opacity(c.isPressed ? 0.8 : 1)
  }
}

struct DongQuanLy: View {
  var body: some View {
    Label("Ba Mẹ quản lý máy này bằng AiiGrow", systemImage: "person.2.fill")
      .font(.footnote).foregroundColor(.secondary).frame(maxWidth: .infinity, alignment: .center).padding(.top, 4)
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
    .background(Color(.systemGroupedBackground).ignoresSafeArea())
  }
}

// MARK: chưa ghép
struct ManChuaGhep: View {
  @EnvironmentObject var m: MoHinhApp
  var body: some View {
    VStack(spacing: 20) {
      Spacer()
      Image(systemName: "leaf.circle.fill").font(.system(size: 84)).foregroundColor(mauChinh)
      Text("AiiGrow Con").font(.largeTitle.bold())
      Text("Ứng dụng giúp Ba Mẹ và con cùng giữ giờ chơi hợp lý trên iPhone, iPad.")
        .multilineTextAlignment(.center).foregroundColor(.secondary)
      VStack(alignment: .leading, spacing: 12) {
        buoc(1, "Ba Mẹ mở app AiiGrow, chọn «Thêm máy» › iPhone/iPad.")
        buoc(2, "Quét mã QR bằng Camera của máy này — app tự ghép.")
        buoc(3, "Hoặc bấm «Nhập mã ghép» và gõ mã 6 số Ba Mẹ đọc cho.")
      }
      .padding().background(RoundedRectangle(cornerRadius: 16).fill(Color(.secondarySystemGroupedBackground)))
      if let l = m.loi { Text(l).font(.callout).foregroundColor(.red).multilineTextAlignment(.center) }
      Spacer()
      Button("Nhập mã ghép") { m.loi = nil; m.man = .nhapMa }.buttonStyle(NutChinh())
      Text("Máy được quản lý sẽ luôn hiện điều đó cho con biết.").font(.footnote).foregroundColor(.secondary)
    }
    .padding(24)
  }
  func buoc(_ i: Int, _ s: String) -> some View {
    HStack(alignment: .top, spacing: 12) {
      Text("\(i)").font(.headline).foregroundColor(.white).frame(width: 28, height: 28).background(Circle().fill(mauChinh))
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
    VStack(spacing: 20) {
      HStack {
        Button { m.man = .chuaGhep } label: { Label("Quay lại", systemImage: "chevron.left").frame(minWidth: 44, minHeight: 44) }
        Spacer()
      }
      Text("Nhập mã ghép").font(.title.bold())
      Text("Mã 6 số hiện trong app AiiGrow của Ba Mẹ, dùng được 15 phút.").multilineTextAlignment(.center).foregroundColor(.secondary)
      TextField("000000", text: $ma)
        .keyboardType(.numberPad).textContentType(.oneTimeCode).focused($dangGo)
        .font(.system(size: 40, weight: .semibold, design: .monospaced)).multilineTextAlignment(.center)
        .frame(minHeight: 64)
        .background(RoundedRectangle(cornerRadius: 14).stroke(mauChinh, lineWidth: 2))
        .onChange(of: ma) { v in if v.count > 6, LienKet.doc(chuoi: v) == nil { ma = String(v.filter(\.isNumber).prefix(6)) } }
      if let l = m.loi { Text(l).font(.callout).foregroundColor(.red).multilineTextAlignment(.center) }
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
    .onAppear { dangGo = true }
  }
}

// MARK: màn chính
struct ManChinh: View {
  @EnvironmentObject var m: MoHinhApp
  @State var moChon = false

  var trangThai: (String, String, Color) {
    guard let k = m.khien else { return ("Đang tải luật của Ba Mẹ…", "hourglass", .secondary) }
    if k.dangThemGio, let den = m.keHoach?.moDen { return ("Đang dùng giờ Ba Mẹ thêm, tới \(den.formatted(date: .omitted, time: .shortened))", "gift.fill", mauChinh) }
    switch k.lyDo {
    case .khong: return ("Đang trong giờ chơi", "sun.max.fill", mauChinh)
    case .ngu: return (k.lyDo.cauChoCon, "moon.stars.fill", .indigo)
    default: return (k.lyDo.cauChoCon, "pause.circle.fill", .orange)
    }
  }

  var body: some View {
    ScrollView {
      VStack(spacing: 16) {
        Text(m.tenCon.map { "Chào \($0)!" } ?? "Chào con!").font(.largeTitle.bold()).frame(maxWidth: .infinity, alignment: .leading)
        theThoiGian
        if let yc = m.yeuCau { theYeuCau(yc) }
        Button { m.moXinThem = true } label: { Label("Xin thêm giờ", systemImage: "hand.raised.fill") }
          .buttonStyle(NutChinh())
        if m.uyQuyen != "approved" { theQuyen }
        theBaMe
        if let l = m.loi { Text(l).font(.footnote).foregroundColor(.red).multilineTextAlignment(.center) }
        DongQuanLy()
        if let t = m.lanDongBo {
          Text("Cập nhật luật lúc \(t.formatted(date: .omitted, time: .shortened))").font(.caption2).foregroundColor(.secondary)
        }
      }
      .padding(20)
    }
    .refreshable { await m.dongBoNgay() }
    .sheet(isPresented: $m.moXinThem) { ManXinThem().environmentObject(m) }
    .sheet(isPresented: $m.moQuyen) { ManQuyen().environmentObject(m) }
    .sheet(isPresented: $moChon) { ManChonApp().environmentObject(m) }
  }

  var theThoiGian: some View {
    let tran = max(1, m.keHoach?.tranPhut ?? 1)
    let tl = Double(m.phutConLai) / Double(tran)
    return VStack(spacing: 12) {
      ZStack {
        Circle().stroke(mauChinh.opacity(0.15), lineWidth: 16)
        Circle().trim(from: 0, to: tl).stroke(mauChinh, style: StrokeStyle(lineWidth: 16, lineCap: .round)).rotationEffect(.degrees(-90))
        VStack(spacing: 2) {
          Text("\(m.phutConLai)").font(.system(size: 56, weight: .bold, design: .rounded))
          Text("phút giải trí còn lại").font(.subheadline).foregroundColor(.secondary)
        }
      }
      .frame(width: 210, height: 210)
      .accessibilityElement(children: .combine)
      Label(trangThai.0, systemImage: trangThai.1).font(.headline).foregroundColor(trangThai.2).multilineTextAlignment(.center)
      Text("Hôm nay đã dùng \(m.phutDaDung) / \(m.keHoach?.tranPhut ?? 0) phút").font(.footnote).foregroundColor(.secondary)
    }
    .padding().frame(maxWidth: .infinity)
    .background(RoundedRectangle(cornerRadius: 20).fill(Color(.secondarySystemGroupedBackground)))
  }

  func theYeuCau(_ yc: YeuCauDangCho) -> some View {
    HStack(spacing: 12) {
      Image(systemName: yc.xong ? (yc.cau.contains("đồng ý thêm") ? "checkmark.circle.fill" : "xmark.circle.fill") : "clock.fill")
        .font(.title2).foregroundColor(yc.xong ? mauChinh : .orange)
      VStack(alignment: .leading, spacing: 2) {
        Text("Xin thêm \(yc.phut) phút").font(.headline)
        Text(yc.cau).font(.subheadline).foregroundColor(.secondary)
        if !yc.loiNhan.isEmpty { Text("«\(yc.loiNhan)»").font(.footnote).foregroundColor(.secondary) }
      }
      Spacer()
    }
    .padding().background(RoundedRectangle(cornerRadius: 16).fill(Color(.secondarySystemGroupedBackground)))
  }

  var theQuyen: some View {
    VStack(alignment: .leading, spacing: 8) {
      Label("Chưa bật quyền Thời gian sử dụng", systemImage: "exclamationmark.triangle.fill").font(.headline).foregroundColor(.orange)
      Text("Cần Ba Mẹ cấp quyền một lần để AiiGrow giữ giờ chơi trên máy này.").font(.subheadline).foregroundColor(.secondary)
      Button("Cấp quyền") { m.moQuyen = true }.buttonStyle(NutChinh(phu: true))
    }
    .padding().background(RoundedRectangle(cornerRadius: 16).fill(Color(.secondarySystemGroupedBackground)))
  }

  var theBaMe: some View {
    VStack(alignment: .leading, spacing: 8) {
      Text("Dành cho Ba Mẹ").font(.headline)
      Text("App học: \(m.soLuong.hoc) · App giải trí: \(m.soLuong.giaiTri) (+\(m.soLuong.danhMucGiaiTri) nhóm) · Chặn: \(m.soLuong.chan)")
        .font(.subheadline).foregroundColor(.secondary)
      Button("Chọn app học / giải trí") { moChon = true }.buttonStyle(NutChinh(phu: true))
      ForEach(m.keHoach?.canhBao ?? [], id: \.self) { Text($0).font(.footnote).foregroundColor(.orange) }
    }
    .padding().background(RoundedRectangle(cornerRadius: 16).fill(Color(.secondarySystemGroupedBackground)))
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

  var body: some View {
    NavigationView {
      ScrollView {
        VStack(alignment: .leading, spacing: 18) {
          Text("Con muốn thêm bao lâu?").font(.headline)
          HStack(spacing: 12) {
            ForEach([30, 60, 120], id: \.self) { p in
              Button { phut = p } label: {
                Text(p == 120 ? "2 giờ" : "\(p) phút").font(.headline).frame(maxWidth: .infinity, minHeight: 56)
                  .foregroundColor(phut == p ? .white : mauChinh)
                  .background(RoundedRectangle(cornerRadius: 14).fill(phut == p ? mauChinh : mauChinh.opacity(0.12)))
              }
              .accessibilityAddTraits(phut == p ? .isSelected : [])
            }
          }
          Text("Lời nhắn cho Ba Mẹ").font(.headline)
          TextField("Vì sao con cần thêm giờ?", text: $loiNhan)
            .padding(12).frame(minHeight: 50)
            .background(RoundedRectangle(cornerRadius: 12).stroke(mauChinh.opacity(0.5), lineWidth: 1.5))
          ScrollView(.horizontal, showsIndicators: false) {
            HStack { ForEach(goiY, id: \.self) { g in
              Button(g) { loiNhan = g }.font(.subheadline).padding(.horizontal, 14).frame(minHeight: 44)
                .background(Capsule().fill(mauChinh.opacity(0.1)))
            } }
          }
          if daGui, let yc = m.yeuCau {
            Label(yc.cau, systemImage: "paperplane.fill").foregroundColor(mauChinh).font(.headline)
          }
          if let l = m.loi { Text(l).foregroundColor(.red).font(.callout) }
          Button {
            Task { daGui = await m.xinThem(phut: phut, loiNhan: loiNhan) }
          } label: {
            if m.dangBan { ProgressView().tint(.white) } else { Text(daGui ? "Gửi lại" : "Gửi cho Ba Mẹ") }
          }
          .buttonStyle(NutChinh()).disabled(m.dangBan)
          Text("Ba Mẹ đồng ý thì máy mở thêm giờ ở lần cập nhật kế tiếp (khi con mở app).")
            .font(.footnote).foregroundColor(.secondary)
          DongQuanLy()
        }
        .padding(20)
      }
      .navigationTitle("Xin thêm giờ")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Đóng") { dong() }.frame(minWidth: 44, minHeight: 44) } }
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
          Image(systemName: "hourglass.circle.fill").font(.system(size: 64)).foregroundColor(mauChinh).frame(maxWidth: .infinity)
          Text("Cấp quyền Thời gian sử dụng").font(.title2.bold())
          Text("AiiGrow dùng Thời gian sử dụng của Apple để mở / tạm khoá app theo giờ Ba Mẹ đặt. Apple sẽ hỏi Ba Mẹ xác nhận một lần. AiiGrow không đọc tin nhắn, ảnh hay nội dung app.")
            .foregroundColor(.secondary)
          Toggle(isOn: $giaDinh) {
            VStack(alignment: .leading) {
              Text("Máy dùng Apple ID của con trong Chia sẻ trong gia đình").font(.subheadline.weight(.semibold))
              Text(giaDinh ? "Ba Mẹ xác nhận bằng Apple ID của Ba Mẹ; gỡ app cần Ba Mẹ đồng ý." : "Xác nhận bằng Face ID / mật mã của máy này.")
                .font(.footnote).foregroundColor(.secondary)
            }
          }
          .tint(mauChinh).frame(minHeight: 44)
          if let l = m.loiQuyen {
            Label(l, systemImage: "info.circle.fill").font(.callout).foregroundColor(.orange)
              .padding().background(RoundedRectangle(cornerRadius: 12).fill(Color.orange.opacity(0.1)))
          }
          Button("Cấp quyền") { Task { await m.xinQuyen(conTrongGiaDinh: giaDinh) } }.buttonStyle(NutChinh())
          DongQuanLy()
        }
        .padding(20)
      }
      .navigationBarTitleDisplayMode(.inline)
      .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Đóng") { dong() }.frame(minWidth: 44, minHeight: 44) } }
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
        Text(nhan.moTa).font(.footnote).foregroundColor(.secondary)
        FamilyActivityPicker(selection: $chon)
        Button("Lưu \(nhan.ten.lowercased())") { m.luuChon(chon, nhan) }.buttonStyle(NutChinh())
      }
      .padding()
      .onAppear { chon = m.luaChon.doc(nhan) }
      .onChange(of: nhan) { chon = m.luaChon.doc($0) }
      .navigationTitle("Ba Mẹ chọn app").navigationBarTitleDisplayMode(.inline)
      .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Xong") { dong() }.frame(minWidth: 44, minHeight: 44) } }
    }
    .navigationViewStyle(.stack)
  }
}

// MARK: đã gỡ
struct ManDaGo: View {
  var body: some View {
    VStack(spacing: 16) {
      Image(systemName: "checkmark.seal.fill").font(.system(size: 72)).foregroundColor(mauChinh)
      Text("Ba Mẹ đã gỡ AiiGrow khỏi máy này").font(.title2.bold()).multilineTextAlignment(.center)
      Text("Mọi giới hạn đã được bỏ. Để xoá biểu tượng: chạm giữ biểu tượng AiiGrow Con › Xoá ứng dụng.")
        .multilineTextAlignment(.center).foregroundColor(.secondary)
    }
    .padding(24)
  }
}
