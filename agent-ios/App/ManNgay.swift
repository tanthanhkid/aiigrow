// Hằng ngày (docs/thiet-ke-chot/con-dt-ngay · con-dt-gio · con-dt-chan): Hôm nay (giờ còn, sao, nhiệm vụ, giờ học/ngủ — hoặc màn khoá
// theo lý do), Nhiệm vụ, Sao & quà (giữ sao, voucher QR), Tin nhắn.
import SwiftUI
import CoreImage.CIFilterBuiltins
import ConCore

// MARK: Hôm nay (cdt-nha-chinh · cdt-chinh-ios)
struct ManHomNay: View {
  @EnvironmentObject var m: MoHinhApp
  var body: some View {
    KhungMan {
      dau
      if m.matMang { theMatMang }
      if let k = m.khien, k.lyDo != .khong, k.lyDo != .chuaVao, k.dangMoOffline != true {
        TheKhoa(lyDo: k.lyDo)
      } else {
        theGio
        theSao
        theNhiemVu
        hangGio
      }
      if let yc = m.yeuCau, !yc.xong || yc.guiLuc > Date().addingTimeInterval(-3600) { theXin(yc) }
      if !m.baiCho.isEmpty {
        HangDs(icon: "ic_gui", t1: "\(m.baiCho.count) bài chưa gửi", t2: "Lưu ở máy, gửi khi có mạng").theDiu(dem: 12)
      }
      Button("App mới? Xin Ba Mẹ cài ›") { m.manPhu = .xinCai }.buttonStyle(NutDiu(kieu: .lk))
      Menu {
        Button("Chọn app học / giải trí") { m.manPhu = .chonApp }
        Button("Lọc web gia đình (DNS)") { m.manPhu = .dns }
        if m.uyQuyen != "approved" { Button("Cấp quyền Thời gian sử dụng") { m.moQuyen = true } }
      } label: { Text("Dành cho Ba Mẹ ›").font(Diu.chu(14, .heavy)).foregroundColor(Diu.chu3).frame(minHeight: 44) }
      DongQuanLy(ten: m.tenCon)
    }
  }

  var dau: some View {
    HStack(alignment: .center) {
      VStack(alignment: .leading, spacing: 2) {
        Text("Chào \(m.tenCon ?? "con")!").font(Diu.tieuDe).foregroundColor(Diu.chu).lineLimit(1).minimumScaleFactor(0.7)
        Text(Self.ngayGio(Date())).font(Diu.phu).foregroundColor(Diu.chu2)
      }
      Spacer()
      if let t = m.tenCon { ChipBe(ten: t) { m.manPhu = .doiBe } }
    }
    .frame(minHeight: 52)
  }

  static func ngayGio(_ d: Date) -> String {
    let thu = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"][Calendar.current.component(.weekday, from: d) - 1]
    return "\(thu) · \(d.gioPhut)"
  }

  var theMatMang: some View {
    HStack(spacing: 12) {
      OIcon(ten: "ic_wifi")
      VStack(alignment: .leading, spacing: 1) {
        Text("Mất mạng rồi").font(Diu.t1).foregroundColor(Diu.chu)
        Text("Không sao, máy vẫn chạy nha! Giờ chơi vẫn tính như thường.").font(Diu.t2).foregroundColor(Diu.chu2)
      }
      Spacer(minLength: 0)
      Button { Task { await m.dongBoNgay() } } label: { Image(systemName: "arrow.clockwise").font(.system(size: 18, weight: .heavy)).foregroundColor(Diu.xanh).frame(width: 44, height: 44) }
        .accessibilityLabel("Thử kết nối lại")
    }
    .theDiu(dem: 12)
  }

  var theGio: some View {
    VStack(spacing: 10) {
      if m.khien?.dangMoOffline == true, let den = m.moOfflineDen {
        NhanNho(chu: "Mở bằng mã · chơi tới \(den.gioPhut)", icon: "ic_mo_khoa", mau: Diu.xanhDam)
      } else if m.khien?.dangNgoaiLe == true, let den = m.keHoach?.ngoaiLeDen {
        NhanNho(chu: "Ba Mẹ mở ngoại lệ · tới \(den.gioPhut)", icon: "ic_mo_khoa", mau: Diu.xanhDam)
      }
      VongGio(con: m.conPhut, tong: max(1, m.tongPhut))
      Text("Còn \(m.conPhut) phút chơi").font(Diu.t1).foregroundColor(Diu.chu)
      HStack(spacing: 6) { Anh(ten: "ic_dongho", co: 20); Text("Đã chơi \(m.daDung) / \(m.tongPhut) phút").font(Diu.t2).foregroundColor(Diu.chu2) }
      Button { m.manPhu = .xinThem } label: { Label { Text("Xin Ba Mẹ thêm giờ") } icon: { Anh(ten: "ic_gui", co: 26) } }
        .buttonStyle(NutDiu(kieu: .phu))
    }
    .frame(maxWidth: .infinity)
    .theDiu(chinh: true)
  }

  var theSao: some View {
    VStack(alignment: .leading, spacing: 12) {
      HStack {
        VStack(alignment: .leading, spacing: 1) {
          Text("Sao của con").font(Diu.t1).foregroundColor(Diu.chu)
          if (m.tq?.soSaoCho ?? 0) > 0 { Text("⏳ chờ thêm \(m.tq!.soSaoCho)").font(Diu.t2).foregroundColor(Diu.chu2) }
        }
        Spacer()
        ChipSao(so: m.soSao)
      }
      Button { m.manPhu = .doiSao } label: { Label { Text("Đổi 10 sao lấy \(m.phut10Sao) phút") } icon: { Anh(ten: "ic_sao", co: 26) } }
        .buttonStyle(NutDiu())
        .disabled(m.tq?.quy?.doiSao?.bat == false)
    }
    .theDiu()
  }

  var theNhiemVu: some View {
    let ds = m.tq?.nhiemVu ?? []
    let cho = ds.filter(\.choDuyet).count
    return Button { m.tab = .nhiemVu } label: {
      HangDs(icon: "ic_tick", t1: "\(ds.count) nhiệm vụ hôm nay",
             t2: [cho > 0 ? "⏳ \(cho) chờ duyệt" : nil, "\(ds.count - cho) chưa làm"].compactMap { $0 }.joined(separator: " · "),
             phai: AnyView(Image(systemName: "chevron.right").font(.system(size: 16, weight: .heavy)).foregroundColor(Diu.chu3)))
        .theDiu(dem: 12)
    }
    .buttonStyle(.plain)
  }

  var hangGio: some View {
    HStack(spacing: 10) {
      if let h = m.tq?.quy?.gioHoc ?? m.keHoach?.hoc.map({ QuyCon.GioHoc2(tu: $0.tu, den: $0.den, thu: nil) }) {
        NhanNho(chu: "Giờ học \(h.tu)–\(h.den)", icon: "ic_sach")
      }
      if let n = m.tq?.quy?.gioNgu?.tu ?? m.keHoach?.ngu?.tu { NhanNho(chu: "Ngủ \(n)", icon: "ic_trang_ngu") }
      Spacer(minLength: 0)
    }
  }

  func theXin(_ yc: YeuCauDangCho) -> some View {
    Button { m.manPhu = .conDangXin } label: {
      HangDs(icon: yc.xong ? (yc.cau.contains("đồng ý") ? "ic_tick" : "ic_x") : "ic_dong_ho_cat", t1: "Xin thêm \(yc.phut) phút", t2: yc.cau,
             phai: AnyView(Image(systemName: "chevron.right").font(.system(size: 16, weight: .heavy)).foregroundColor(Diu.chu3)))
        .theDiu(dem: 12)
    }
    .buttonStyle(.plain)
  }
}

/// Màn khoá theo lý do, ngay trong Hôm nay (cdt-het-phien · cdt-gio-ngu · cdt-android-khoa · them-ioje1spu · cdt-gio-may).
struct TheKhoa: View {
  @EnvironmentObject var m: MoHinhApp
  let lyDo: LyDoKhien
  var body: some View {
    VStack(spacing: 14) {
      switch lyDo {
      case .hetGio:
        Anh(ten: "rob_nghi", co: 120)
        Text("Hết giờ chơi rồi").font(Diu.tieuDe).foregroundColor(Diu.chu)
        HangDs(icon: "ic_dongho", t1: "Hôm nay đã chơi \(m.daDung) / \(m.tongPhut) phút", t2: "Từ điển, AiiRob vẫn mở").theDiu(dem: 12)
        HStack { Text("Con có").font(Diu.t1).foregroundColor(Diu.chu); Spacer(); ChipSao(so: m.soSao) }.theDiu(dem: 12)
        if !m.matMang {
          Button { m.manPhu = .doiSao } label: { Label { Text("Đổi 10 sao lấy \(m.phut10Sao) phút") } icon: { Anh(ten: "ic_sao", co: 26) } }.buttonStyle(NutDiu())
        }
        Button { m.tab = .nhiemVu } label: { Label { Text("Làm nhiệm vụ kiếm sao") } icon: { Anh(ten: "ic_tick", co: 26) } }.buttonStyle(NutDiu(kieu: .phu))
        Button { m.manPhu = .xinThem } label: { Label { Text(m.matMang ? "Xin Ba Mẹ thêm giờ · gửi khi có mạng" : "Xin Ba Mẹ thêm giờ") } icon: { Anh(ten: "ic_gui", co: 26) } }
          .buttonStyle(NutDiu(kieu: .phu))
      case .ngu:
        Anh(ten: "rob_ngu", co: 120)
        Text("Đến giờ ngủ rồi").font(Diu.tieuDe).foregroundColor(Diu.chu)
        Text("Chúc \(m.tenCon ?? "con") ngủ ngon!").font(Diu.phu).foregroundColor(Diu.chu2)
        if let n = m.keHoach?.ngu { HangDs(icon: "ic_trang_ngu", t1: "\(n.tu) – \(n.den)", t2: "Sáng mai máy mở lúc \(n.den)").theDiu(dem: 12) }
        Button { m.manPhu = .xinThem } label: { Label { Text("Xin Ba Mẹ thêm 15 phút") } icon: { Anh(ten: "ic_gui", co: 26) } }.buttonStyle(NutDiu(kieu: .phu))
      case .khoaNgay:
        Anh(ten: "rob_nghi", co: 120)
        Text("Ba Mẹ đang khoá máy").font(Diu.tieuDe).foregroundColor(Diu.chu)
        Text("Đọc sách hoặc ra ngoài chơi nhé!").font(Diu.phu).foregroundColor(Diu.chu2)
        Button { m.manPhu = .xinThem } label: { Label { Text("Xin Ba Mẹ mở máy") } icon: { Anh(ten: "ic_gui", co: 26) } }.buttonStyle(NutDiu())
      case .gioHoc:
        Anh(ten: "rob_hoc", co: 120)
        Text("Giờ học rồi!").font(Diu.tieuDe).foregroundColor(Diu.chu)
        if let h = m.keHoach?.hoc { Text("\(h.tu) – \(h.den)").font(Diu.phu).foregroundColor(Diu.chu2) }
        Text("Chỉ mở app học. Học xong được chơi tiếp.").font(Diu.phu).foregroundColor(Diu.chu2).multilineTextAlignment(.center)
        Button { m.manPhu = .xinThem } label: { Label { Text("Xin Ba Mẹ mở app khác") } icon: { Anh(ten: "ic_gui", co: 26) } }.buttonStyle(NutDiu(kieu: .phu))
      default:
        Anh(ten: "rob_trong_loi", co: 120)
        Text("Tạm nghỉ chút nhé").font(Diu.tieuDe).foregroundColor(Diu.chu)
        Text(lyDo.cauChoCon).font(Diu.phu).foregroundColor(Diu.chu2).multilineTextAlignment(.center)
      }
      if lyDo != .gioHoc && m.coBiMatOffline {
        Button { m.manPhu = .maOffline } label: { Label { Text("Mất mạng? Nhập mã của Ba Mẹ") } icon: { Anh(ten: "ic_khoa", co: 24) } }
          .buttonStyle(NutDiu(kieu: m.matMang ? .chinh : .lk))
      }
    }
  }
}

// MARK: Nhiệm vụ (cdt-nhiem-vu)
struct ManNhiemVu: View {
  @EnvironmentObject var m: MoHinhApp
  var body: some View {
    let ds = m.tq?.nhiemVu ?? []
    let cho = ds.filter(\.choDuyet), lai = ds.filter { $0.canLamLai && !$0.choDuyet }, chua = ds.filter { !$0.choDuyet && !$0.canLamLai }
    return KhungMan {
      DauMan(tieuDe: "Nhiệm vụ")
      if let bo = ds.compactMap(\.bo).first { HStack { NhanNho(chu: "Bộ \(Self.tenBo(bo)) · \(ds.count) việc", icon: "ic_tick"); Spacer() } }
      if ds.isEmpty { Text(m.tq == nil ? "Đang tải…" : "Hôm nay chưa có nhiệm vụ nào.").font(Diu.phu).foregroundColor(Diu.chu2).padding(.vertical, 24) }
      nhom("Ba Mẹ nhờ làm lại", lai)
      nhom("Chờ Ba Mẹ duyệt", cho)
      nhom("Chưa làm", chua)
      HangDs(icon: "ic_sao", t1: "Ba Mẹ duyệt là sao vào ví", t2: "Đang có \(m.soSao) sao").theDiu(chinh: true, dem: 12)
    }
  }

  static func tenBo(_ ma: String) -> String {
    ["tu_lap": "Tự lập", "viec_nha": "Phụ việc nhà", "hoc_tap": "Học tập", "khoe_manh": "Khoẻ mạnh"][ma] ?? ma
  }

  @ViewBuilder func nhom(_ ten: String, _ ds: [NhiemVuCon]) -> some View {
    if !ds.isEmpty {
      HStack { Text("\(ten) \(ds.count)").font(Diu.t1).foregroundColor(Diu.chu2); Spacer() }.padding(.top, 4)
      VStack(spacing: 0) {
        ForEach(Array(ds.enumerated()), id: \.element.id) { i, nv in
          if i > 0 { Divider().padding(.leading, 56) }
          Button { m.manPhu = .nhiemVu(nv) } label: { HangNv(nv: nv) }.buttonStyle(.plain)
        }
      }
      .theDiu(dem: 14)
    }
  }
}

struct HangNv: View {
  let nv: NhiemVuCon
  static func icon(_ nv: NhiemVuCon) -> String {
    switch nv.cachNop { case "ghi_am": return "ic_sach"; case "viet": return "ic_but"; case "tu_cham": return "ic_may_tinh"; case "xong": return "ic_tick"; default: return "ic_camera" }
  }
  static func cach(_ nv: NhiemVuCon) -> String {
    switch nv.cachNop { case "ghi_am": return "ghi âm"; case "viet": return "viết"; case "tu_cham": return "Tự chấm trong app"; case "xong": return "bấm Xong"; default: return "ảnh" }
  }
  var body: some View {
    let phu: String = nv.choDuyet ? "Chờ duyệt · \(Self.cach(nv))" : nv.canLamLai ? "Làm lại · \(nv.lyDo ?? nv.loiNhan ?? "Ba Mẹ nhờ sửa chút xíu")"
      : [Self.cach(nv), nv.gioNhac.map { "trước \($0)" }].compactMap { $0 }.joined(separator: " · ")
    HangDs(icon: Self.icon(nv), t1: (nv.choDuyet ? "⏳ " : nv.canLamLai ? "↺ " : "") + nv.ten, t2: phu,
           phai: AnyView(HStack(spacing: 4) { Anh(ten: "ic_sao", co: 18); Text("+\(nv.soSao)").font(Diu.chu(14, .black)).foregroundColor(Diu.saoChu) }
             .padding(.horizontal, 8).frame(height: 28).background(Capsule().fill(Diu.saoNen))))
  }
}

// MARK: Sao & quà (cdt-vi-qua)
struct ManSaoQua: View {
  @EnvironmentObject var m: MoHinhApp
  @State var qrMo: String?
  var body: some View {
    let giu = (m.viQua?.phieu ?? []).reduce(0) { $0 + $1.diem }
    KhungMan {
      DauMan(tieuDe: "Sao & quà")
      VStack(spacing: 10) {
        Anh(ten: "ic_sao", co: 56)
        Text("Con đang có \(m.soSao) sao").font(Diu.chu(22, .black)).foregroundColor(Diu.chu)
        if giu > 0 { Text("Đang giữ \(giu) sao cho quà chờ trao").font(Diu.t2).foregroundColor(Diu.chu2) }
        Button { m.manPhu = .doiSao } label: { Label { Text("Đổi sao lấy phút chơi") } icon: { Anh(ten: "ic_dongho", co: 26) } }.buttonStyle(NutDiu())
      }
      .frame(maxWidth: .infinity).theDiu(chinh: true)
      HStack { Text("Quà của con").font(Diu.t1).foregroundColor(Diu.chu2); Spacer() }.padding(.top, 4)
      VStack(spacing: 0) {
        ForEach(m.viQua?.phieu ?? []) { p in
          HangDs(icon: ManCuaHang.icon(nil, ten: p.ten), t1: p.ten, t2: "Đang giữ \(p.diem) sao · ⏳ Chờ Ba Mẹ trao")
        }
        ForEach(Array((m.viQua?.voucher ?? []).filter { $0.trang_thai == "da_phat_hanh" }.enumerated()), id: \.offset) { _, v in
          Button { qrMo = v.qr ?? v.ma } label: {
            HangDs(icon: "ic_coc", t1: v.ten ?? "Voucher AiiCafe", t2: "Đã nhận · đưa mã ở quầy" + (v.het_han.flatMap(NgayISO.doc).map { " · hạn \(Self.ngay($0))" } ?? ""),
                   phai: AnyView(Text("Còn \(v.conNgay ?? 0) ngày").font(Diu.chu(13, .heavy)).foregroundColor(Diu.xanhDam)))
          }.buttonStyle(.plain)
        }
        ForEach((m.viQua?.daTrao ?? []).prefix(5)) { d in HangDs(icon: "ic_qua", t1: d.ten, t2: "Ba Mẹ đã trao") }
        if (m.viQua?.phieu ?? []).isEmpty && (m.viQua?.voucher ?? []).isEmpty && (m.viQua?.daTrao ?? []).isEmpty {
          Text("Chưa có quà nào. Làm nhiệm vụ để có sao nhé!").font(Diu.t2).foregroundColor(Diu.chu2).padding(.vertical, 12)
        }
      }
      .theDiu(dem: 14)
      Button { m.manPhu = .cuaHang } label: { Label { Text("Xem quà đổi được") } icon: { Anh(ten: "ic_qua", co: 26) } }.buttonStyle(NutDiu(kieu: .phu))
    }
    .sheet(item: Binding(get: { qrMo.map { ChuoiId(s: $0) } }, set: { qrMo = $0?.s })) { x in ManQR(ma: x.s) }
  }
  static func ngay(_ d: Date) -> String { let f = DateFormatter(); f.dateFormat = "dd/MM"; return f.string(from: d) }
}

struct ChuoiId: Identifiable { var s: String; var id: String { s } }

/// Mã QR voucher cho quầy AiiCafe quét.
struct ManQR: View {
  let ma: String
  var body: some View {
    VStack(spacing: 16) {
      Capsule().fill(Diu.vien).frame(width: 40, height: 5).padding(.top, 8)
      Text("Đưa mã ở quầy AiiCafe").font(Diu.tieuDe).foregroundColor(Diu.chu)
      if let a = Self.anh(ma) { Image(uiImage: a).interpolation(.none).resizable().scaledToFit().frame(width: 240, height: 240).theDiu() }
      Text(ma).font(Diu.chu(24, .black)).foregroundColor(Diu.chu).textSelection(.enabled)
      Spacer()
    }
    .padding(16).presentationDetents([.medium, .large])
  }
  static func anh(_ s: String) -> UIImage? {
    let f = CIFilter.qrCodeGenerator(); f.message = Data(s.utf8); f.correctionLevel = "M"
    guard let o = f.outputImage?.transformed(by: CGAffineTransform(scaleX: 10, y: 10)), let cg = CIContext().createCGImage(o, from: o.extent) else { return nil }
    return UIImage(cgImage: cg)
  }
}

// MARK: Cửa hàng → Đổi quà → Đã gửi (cdt-cua-hang · cdt-doi-qua · them-l9qeq0np)
struct ManCuaHang: View {
  @EnvironmentObject var m: MoHinhApp
  @Environment(\.dismiss) var dong
  @State var chon: QuaCuaHang?
  @State var daGui: QuaCuaHang?

  static func icon(_ hinh: String?, ten: String) -> String {
    let t = (hinh ?? "") + " " + ten.lowercased()
    if t.contains("aiicafe") || t.contains("voucher") { return "ic_coc" }
    if t.contains("kem") { return "ic_qua" }
    if t.contains("bua") || t.contains("món") { return "ic_chen" }
    if t.contains("phim") { return "ic_tai" }
    if t.contains("lego") || t.contains("đồ chơi") || t.contains("do_choi") { return "ic_game" }
    if t.contains("heo") || t.contains("tiết kiệm") { return "ic_the_qua" }
    return "ic_qua"
  }

  var body: some View {
    KhungMan {
      if let q = daGui { daGuiView(q) } else if let q = chon { doiQua(q) } else { danhSach }
    }
    .task { if m.demo == nil { await m.taiNgay() } }
  }

  var danhSach: some View {
    let ch = m.cuaHang
    let soSao = ch?.soSao ?? m.soSao
    let ganNhat = ch?.qua.filter { ($0.conThieu ?? 0) > 0 || $0.du == true }.min { $0.gia < $1.gia }?.id
    return VStack(spacing: 12) {
      HStack { DauMan(tieuDe: "Đổi quà", lui: { dong() }); ChipSao(so: soSao, chu: "sao").fixedSize() }
      HStack { Text("Quà con đổi được").font(Diu.t1).foregroundColor(Diu.chu2); Spacer() }
      ForEach(ch?.qua ?? []) { q in
        Button { chon = q } label: {
          HStack(spacing: 12) {
            OIcon(ten: Self.icon(q.hinh, ten: q.ten), nen: q.id == ganNhat ? .white : Diu.nenIcon)
            VStack(alignment: .leading, spacing: 1) {
              Text(q.ten).font(Diu.t1).foregroundColor(Diu.chu).lineLimit(1)
              Text(Self.phu(q)).font(Diu.t2).foregroundColor(q.du == true ? Diu.xanhDam : Diu.chu2).lineLimit(1)
            }
            Spacer(minLength: 0)
            HStack(spacing: 4) { Anh(ten: "ic_sao", co: 18); Text("\(q.gia)").font(Diu.chu(14, .black)).foregroundColor(Diu.saoChu) }
              .padding(.horizontal, 8).frame(height: 28).background(Capsule().fill(Diu.saoNen))
          }
          .theDiu(chinh: q.id == ganNhat, dem: 12)
        }
        .buttonStyle(.plain)
      }
      if ch == nil { Text("Đang tải…").font(Diu.phu).foregroundColor(Diu.chu2) }
      Button { m.manPhu = .doiSao } label: { Label { Text("Đổi 10 sao lấy \(m.phut10Sao) phút") } icon: { Anh(ten: "ic_dongho", co: 26) } }.buttonStyle(NutDiu(kieu: .phu))
      Text("Quà do Ba Mẹ đặt · đổi xong Ba Mẹ trao").font(Diu.t2).foregroundColor(Diu.chu3)
    }
  }

  static func phu(_ q: QuaCuaHang) -> String {
    var d: [String] = []
    if q.laVoucher { d.append("Mã QR") } else if q.chiCuoiTuan == true { d.append("T7, CN") } else if let t = q.tonKho { d.append("Còn \(t)") }
    if q.du == true { d.append("Đủ sao rồi! Bấm để đổi") } else if let c = q.conThieu, c > 0 { d.append("Còn thiếu \(c) sao") }
    return d.joined(separator: " · ")
  }

  func doiQua(_ q: QuaCuaHang) -> some View {
    let co = m.cuaHang?.soSao ?? m.soSao
    return VStack(spacing: 14) {
      DauMan(tieuDe: "Đổi quà", lui: { chon = nil })
      OIcon(ten: Self.icon(q.hinh, ten: q.ten), co: 96, nen: .white)
      Text(q.ten).font(Diu.tieuDe).foregroundColor(Diu.chu).multilineTextAlignment(.center)
      ChipSao(so: q.gia)
      HStack(spacing: 12) {
        ChipSao(so: co, chu: ""); Image(systemName: "arrow.right").font(.system(size: 16, weight: .heavy)).foregroundColor(Diu.chu3)
        ChipSao(so: max(0, co - q.gia))
      }
      Text("Sao được giữ lại · Ba Mẹ trao xong mới trừ").font(Diu.t2).foregroundColor(Diu.chu2).multilineTextAlignment(.center)
      if let mt = q.moTa { HangDs(icon: "ic_tim", t1: mt).theDiu(dem: 12) }
      if let l = m.loi { Text(l).font(Diu.t2).foregroundColor(Diu.doChu).multilineTextAlignment(.center) }
      Button { Task { if await m.doiQua(q) { daGui = q } } } label: {
        if m.dangBan { ProgressView().tint(.white) } else { Label { Text("Gửi Ba Mẹ đổi quà") } icon: { Anh(ten: "ic_gui", co: 26) } }
      }
      .buttonStyle(NutDiu()).disabled(q.du == false || m.dangBan)
      Button("Để dành sao") { chon = nil }.buttonStyle(NutDiu(kieu: .lk))
    }
    .onAppear { m.loi = nil }
  }

  func daGuiView(_ q: QuaCuaHang) -> some View {
    VStack(spacing: 14) {
      Text("Đã gửi Ba Mẹ").font(Diu.tieuDe).foregroundColor(Diu.chu)
      Anh(ten: "rob_xong", co: 120)
      HangDs(icon: Self.icon(q.hinh, ten: q.ten), t1: q.ten, t2: "Đang giữ \(q.gia) sao · còn \(max(0, (m.cuaHang?.soSao ?? m.soSao) - q.gia)) sao").theDiu(dem: 12)
      NhanNho(chu: "⏳ Chờ Ba Mẹ trao")
      Text("Ba Mẹ trao quà thì mới trừ sao. Ba Mẹ huỷ thì \(q.gia) sao về lại cho con.").font(Diu.t2).foregroundColor(Diu.chu2).multilineTextAlignment(.center)
      Button { m.tab = .saoQua; dong() } label: { Label { Text("Về Sao & quà") } icon: { Anh(ten: "ic_sao", co: 26) } }.buttonStyle(NutDiu())
      Button("Làm nhiệm vụ kiếm sao") { m.tab = .nhiemVu; dong() }.buttonStyle(NutDiu(kieu: .lk))
    }
  }
}

// MARK: Tin nhắn (cdt-nha — Tin nhắn)
struct ManTin: View {
  @EnvironmentObject var m: MoHinhApp
  @State var daGui: Set<String> = []
  let nhanh = ["Dạ, con làm ngay!", "Con cảm ơn Ba Mẹ", "Con yêu Ba Mẹ"]
  var body: some View {
    KhungMan {
      DauMan(tieuDe: "Tin nhắn")
      ForEach(m.tq?.loiKhen ?? []) { lk in
        VStack(alignment: .leading, spacing: 10) {
          HStack(spacing: 10) {
            AvatarBe(ten: "Ba Mẹ", co: 36, mau: Diu.xanh)
            VStack(alignment: .leading, spacing: 0) {
              Text("Ba Mẹ").font(Diu.t1).foregroundColor(Diu.chu)
              if let l = lk.luc.flatMap(NgayISO.doc) { Text(l.gioPhut).font(Diu.t2).foregroundColor(Diu.chu3) }
            }
          }
          Text("«\(lk.noiDung)»").font(Diu.chu(17, .bold)).foregroundColor(Diu.chu)
          if let ph = lk.phanHoi { NhanNho(chu: "Con đã trả lời: \(ph)", icon: "ic_tick", mau: Diu.xanhDam, nen: Diu.xanhNhat) }
          else if daGui.contains(lk.id) { NhanNho(chu: "Đã gửi", icon: "ic_tick", mau: Diu.xanhDam, nen: Diu.xanhNhat) }
          else {
            Text("Trả lời nhanh").font(Diu.t2).foregroundColor(Diu.chu2)
            ForEach(nhanh, id: \.self) { c in
              Button { daGui.insert(lk.id); Task { await m.phanHoi(lk, c) } } label: { Text(c) }.buttonStyle(NutDiu(kieu: c == nhanh[0] ? .chinh : .phu))
            }
          }
        }
        .theDiu()
      }
      ForEach(m.tin.filter { $0.loai != "loi_khen" }) { t in
        HangDs(icon: Self.icon(t.loai), t1: t.tieu, t2: [t.noi, t.luc.flatMap(NgayISO.doc)?.gioPhut].compactMap { $0 }.joined(separator: " · ")).theDiu(dem: 12)
      }
      if (m.tq?.loiKhen ?? []).isEmpty && m.tin.isEmpty {
        Anh(ten: "rob_cho", co: 110).padding(.top, 24)
        Text("Chưa có tin nhắn nào.").font(Diu.phu).foregroundColor(Diu.chu2)
      }
    }
  }
  static func icon(_ loai: String) -> String {
    switch loai {
    case "duyet_nhiem_vu", "tu_duyet_nhiem_vu": return "ic_tick"
    case "tu_choi_nhiem_vu", "can_bo_sung", "lam_lai_nhiem_vu": return "ic_lap"
    case "xac_nhan_qua": return "ic_qua"
    case "huy_qua": return "ic_x"
    case "them_gio": return "ic_dongho"
    case "huy_hieu": return "ic_sao"
    default: return "ic_tin"
    }
  }
}
