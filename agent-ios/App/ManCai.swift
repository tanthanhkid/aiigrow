// Cài & ghép (docs/thiet-ke-chot/con-dt-cai): Rob chào → chưa ghép → gõ mã 6 số / quét QR (mã sai · hết hạn · mất mạng) →
// đã ghép + cấp quyền Thời gian sử dụng (chưa cho phép) → máy khoá, chọn tên + PIN.
import SwiftUI
import AVFoundation
import ConCore

struct ManChao: View {
  @EnvironmentObject var m: MoHinhApp
  var body: some View {
    KhungMan {
      Spacer(minLength: 24)
      Anh(ten: "rob_rob_goc", co: 150)
      Text("Chào con! Mình là Rob").font(Diu.tieuDe).foregroundColor(Diu.chu).multilineTextAlignment(.center)
      Text("Mình giữ giờ chơi cùng con.").font(Diu.phu).foregroundColor(Diu.chu2)
      VStack(spacing: 0) {
        HangDs(icon: "ic_tick", t1: "Làm nhiệm vụ", t2: "Được sao")
        Divider().padding(.leading, 56)
        HangDs(icon: "ic_sao", t1: "10 sao = 10 phút", t2: "Đổi sao ra giờ chơi")
        Divider().padding(.leading, 56)
        HangDs(icon: "ic_gui", t1: "Muốn thêm?", t2: "Xin Ba Mẹ")
      }
      .theDiu(dem: 14)
      Spacer(minLength: 24)
      Button { m.man = .chuaGhep } label: { Label { Text("Ghép máy với Ba Mẹ") } icon: { Anh(ten: "ic_dt", co: 26) } }
        .buttonStyle(NutDiu())
    }
  }
}

struct ManChuaGhep: View {
  @EnvironmentObject var m: MoHinhApp
  var body: some View {
    KhungMan {
      Spacer(minLength: 12)
      Anh(ten: "rob_chi", co: 120)
      Text("Máy này chưa ghép").font(Diu.tieuDe).foregroundColor(Diu.chu)
      Text("Nhờ Ba Mẹ mở AiiGrow nhé.").font(Diu.phu).foregroundColor(Diu.chu2)
      VStack(alignment: .leading, spacing: 14) {
        BuocSo(i: 1, t1: "Ba Mẹ mở AiiGrow", t2: "Bấm «Thêm máy»")
        BuocSo(i: 2, t1: "Máy Ba Mẹ hiện mã 6 số", t2: "Mã đổi sau 10 phút")
        BuocSo(i: 3, t1: "Con gõ mã vào đây", t2: "Xong là ghép")
      }
      .theDiu()
      if let l = m.loi { Text(l).font(Diu.t2).foregroundColor(Diu.doChu).multilineTextAlignment(.center) }
      Spacer(minLength: 12)
      Button { m.loiGhep = nil; m.man = .nhapMa } label: { Label { Text("Gõ mã 6 số của Ba Mẹ") } icon: { Anh(ten: "ic_dt", co: 26) } }
        .buttonStyle(NutDiu())
      Button { m.loiGhep = nil; m.man = .quetQR } label: { Label { Text("Quét QR trên máy Ba Mẹ") } icon: { Anh(ten: "ic_camera", co: 26) } }
        .buttonStyle(NutDiu(kieu: .phu))
    }
  }
}

struct ManNhapMa: View {
  @EnvironmentObject var m: MoHinhApp
  @State var ma = ""
  var body: some View {
    KhungMan {
      DauMan(tieuDe: "", lui: { m.loiGhep = nil; m.man = .chuaGhep })
      switch m.loiGhep {
      case .sai?: loiSai
      case .hetHan?: loiHetHan
      case .matMang?: loiMatMang
      case nil: nhap
      }
    }
    .onAppear { if m.demo == "maGhepSai" { ma = "482918" } else if m.demo != nil { ma = "482913" } }
  }

  var nhap: some View {
    VStack(spacing: 14) {
      Anh(ten: "ic_dt", co: 64)
      Text("Gõ mã trên máy Ba Mẹ").font(Diu.tieuDe).foregroundColor(Diu.chu).multilineTextAlignment(.center)
      OSo(so: ma, dai: 6)
      NhanNho(chu: "Mã đổi sau 10 phút", icon: "ic_dongho")
      Button { Task { await m.ghep(.ma(ma)) } } label: {
        if m.dangBan { ProgressView().tint(.white) } else { Label { Text("Ghép máy này") } icon: { Anh(ten: "ic_tick", co: 26) } }
      }
      .buttonStyle(NutDiu()).disabled(ma.count != 6 || m.dangBan)
      BanPhimSo(so: $ma, toiDa: 6)
    }
  }

  var loiSai: some View {
    VStack(spacing: 14) {
      Anh(ten: "rob_trong_loi", co: 120)
      Text("Mã chưa đúng").font(Diu.tieuDe).foregroundColor(Diu.chu)
      Text("Con xem lại 6 số trên máy Ba Mẹ nhé.").font(Diu.phu).foregroundColor(Diu.chu2).multilineTextAlignment(.center)
      OSo(so: ma, dai: 6, loi: true)
      Spacer(minLength: 12)
      Button { ma = ""; m.loiGhep = nil } label: { Label { Text("Gõ lại mã") } icon: { Anh(ten: "ic_lap", co: 26) } }.buttonStyle(NutDiu())
      Button { m.loiGhep = nil; m.man = .quetQR } label: { Label { Text("Quét QR thay") } icon: { Anh(ten: "ic_camera", co: 26) } }
        .buttonStyle(NutDiu(kieu: .phu))
    }
  }

  var loiHetHan: some View {
    VStack(spacing: 14) {
      Anh(ten: "rob_cho", co: 120)
      Text("Mã hết hạn rồi").font(Diu.tieuDe).foregroundColor(Diu.chu)
      Text("Mã chỉ dùng được 10 phút.").font(Diu.phu).foregroundColor(Diu.chu2)
      VStack(alignment: .leading, spacing: 14) {
        BuocSo(i: 1, t1: "Ba Mẹ bấm «Lấy mã mới»", t2: "Trong AiiGrow · Thêm máy")
        BuocSo(i: 2, t1: "Con gõ mã mới", t2: "Xong là ghép")
      }
      .theDiu()
      Button { ma = ""; m.loiGhep = nil } label: { Label { Text("Nhờ Ba Mẹ lấy mã mới") } icon: { Anh(ten: "ic_gui", co: 26) } }.buttonStyle(NutDiu())
      Button { m.loiGhep = nil; m.man = .quetQR } label: { Label { Text("Quét QR mới") } icon: { Anh(ten: "ic_camera", co: 26) } }
        .buttonStyle(NutDiu(kieu: .phu))
    }
  }

  var loiMatMang: some View {
    VStack(spacing: 14) {
      Anh(ten: "rob_nghi", co: 120)
      Text("Chưa ghép được").font(Diu.tieuDe).foregroundColor(Diu.chu)
      Text("Máy chưa có mạng. Bật Wi-Fi rồi thử lại nhé.").font(Diu.phu).foregroundColor(Diu.chu2).multilineTextAlignment(.center)
      NhanNho(chu: "Mất mạng", icon: "ic_wifi")
      Spacer(minLength: 12)
      Button { Task { await m.ghep(.ma(ma)) } } label: {
        if m.dangBan { ProgressView().tint(.white) } else { Label { Text("Thử ghép lại") } icon: { Anh(ten: "ic_lap", co: 26) } }
      }
      .buttonStyle(NutDiu()).disabled(ma.count != 6)
      Button("Mã hết hạn? Nhờ Ba Mẹ lấy mã mới") { ma = ""; m.loiGhep = nil }.buttonStyle(NutDiu(kieu: .lk))
    }
  }
}

// MARK: quét QR (AVCaptureMetadataOutput — không cần thư viện ngoài)
struct ManQuetQR: View {
  @EnvironmentObject var m: MoHinhApp
  @State var loiCam: String?
  var body: some View {
    KhungMan {
      DauMan(tieuDe: "Quét mã trên máy Ba Mẹ", lui: { m.man = .chuaGhep })
      ZStack {
        RoundedRectangle(cornerRadius: 24, style: .continuous).fill(Diu.chu)
        if m.demo == nil && loiCam == nil {
          MayQuet { chuoi in
            if let c = LienKet.doc(chuoi: chuoi) { m.man = .nhapMa; Task { await m.ghep(c) } }
          } loi: { loiCam = $0 }
        }
        RoundedRectangle(cornerRadius: 28, style: .continuous).stroke(.white, lineWidth: 4).frame(width: 220, height: 220)
        if let loiCam { Text(loiCam).font(Diu.t2).foregroundColor(.white).multilineTextAlignment(.center).padding(24) }
      }
      .frame(height: 360).clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
      NhanNho(chu: "Mã đổi sau 10 phút", icon: "ic_dongho")
      if let l = m.loiGhep { Text(l == .hetHan ? "Mã hết hạn rồi — nhờ Ba Mẹ lấy mã mới." : l == .matMang ? "Máy chưa có mạng." : "Mã chưa đúng.").font(Diu.t2).foregroundColor(Diu.doChu) }
      Button { m.loiGhep = nil; m.man = .nhapMa } label: { Label { Text("Gõ mã 6 số thay") } icon: { Anh(ten: "ic_dt", co: 26) } }
        .buttonStyle(NutDiu(kieu: .phu))
    }
  }
}

struct MayQuet: UIViewRepresentable {
  let doc: (String) -> Void
  let loi: (String) -> Void
  func makeCoordinator() -> DieuPhoi { DieuPhoi(doc: doc) }
  func makeUIView(context: Context) -> UIView {
    let v = KhungQuet()
    let s = AVCaptureSession()
    guard let dv = AVCaptureDevice.default(for: .video), let vao = try? AVCaptureDeviceInput(device: dv), s.canAddInput(vao) else {
      DispatchQueue.main.async { loi("Máy chưa mở được camera. Con gõ mã 6 số thay nhé.") }
      return v
    }
    s.addInput(vao)
    let ra = AVCaptureMetadataOutput()
    if s.canAddOutput(ra) { s.addOutput(ra); ra.setMetadataObjectsDelegate(context.coordinator, queue: .main); ra.metadataObjectTypes = [.qr] }
    v.lop.session = s; v.lop.videoGravity = .resizeAspectFill
    context.coordinator.phien = s
    DispatchQueue.global(qos: .userInitiated).async { s.startRunning() }
    return v
  }
  func updateUIView(_ v: UIView, context: Context) {}
  static func dismantleUIView(_ v: UIView, coordinator: DieuPhoi) { coordinator.phien?.stopRunning() }

  final class KhungQuet: UIView {
    override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
    var lop: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
  }
  final class DieuPhoi: NSObject, AVCaptureMetadataOutputObjectsDelegate {
    let doc: (String) -> Void
    var phien: AVCaptureSession?
    var xong = false
    init(doc: @escaping (String) -> Void) { self.doc = doc }
    func metadataOutput(_ o: AVCaptureMetadataOutput, didOutput ds: [AVMetadataObject], from c: AVCaptureConnection) {
      guard !xong, let s = (ds.first as? AVMetadataMachineReadableCodeObject)?.stringValue, LienKet.doc(chuoi: s) != nil else { return }
      xong = true; phien?.stopRunning(); doc(s)
    }
  }
}

// MARK: cấp quyền Thời gian sử dụng (cdt-quyen · them-cz5mw9ha · them-b3prchz2)
struct ManQuyen: View {
  @EnvironmentObject var m: MoHinhApp
  @State var giaDinh = true
  var body: some View {
    KhungMan {
      if m.loiQuyen != nil && m.uyQuyen != "approved" { chuaChoPhep } else { xin }
    }
  }

  var xin: some View {
    VStack(spacing: 14) {
      Anh(ten: "rob_xong", co: 120)
      NhanNho(chu: "Đã ghép", icon: "ic_tick", mau: Diu.xanhDam, nen: Diu.xanhNhat)
      Text(m.dungChung ? "Máy dùng chung" : (m.tenCon.map { "Điện thoại của \($0)" } ?? "Điện thoại của con"))
        .font(Diu.tieuDe).foregroundColor(Diu.chu).multilineTextAlignment(.center)
      Text("Còn 1 bước: cho AiiGrow giữ giờ chơi.").font(Diu.phu).foregroundColor(Diu.chu2)
      VStack(spacing: 0) {
        HangDs(icon: "ic_dong_ho_cat", t1: "Thời gian sử dụng", t2: m.dungChung ? "Của Apple · đếm giờ riêng từng bé" : "Của Apple · để đếm giờ chơi")
        Divider().padding(.leading, 56)
        HangDs(icon: "ic_nguoi", t1: "Ba Mẹ xác nhận", t2: giaDinh ? "Bằng Apple ID của Ba Mẹ" : "Bằng Face ID / mật mã máy này")
        Divider().padding(.leading, 56)
        HangDs(icon: "ic_khien", t1: "Không đọc tin nhắn, ảnh", t2: "Chỉ đếm giờ và app")
      }
      .theDiu(dem: 14)
      if !m.dungChung { Text("Xong thì \(m.tenCon ?? "con") chạm tên + nhập PIN để vào máy.").font(Diu.t2).foregroundColor(Diu.chu2).multilineTextAlignment(.center) }
      Toggle(isOn: $giaDinh) { Text("Máy dùng Apple ID của con (Chia sẻ trong gia đình)").font(Diu.t2).foregroundColor(Diu.chu2) }
        .tint(Diu.xanh).frame(minHeight: 44)
      Button { Task { await m.xinQuyen(conTrongGiaDinh: giaDinh) } } label: { Label { Text("Cho phép giữ giờ chơi") } icon: { Anh(ten: "ic_tick", co: 26) } }
        .buttonStyle(NutDiu())
      Button("Để sau") { m.moQuyen = false }.buttonStyle(NutDiu(kieu: .lk))
    }
  }

  var chuaChoPhep: some View {
    VStack(spacing: 14) {
      Anh(ten: "rob_trong_loi", co: 120)
      Text("Chưa giữ được giờ chơi").font(Diu.tieuDe).foregroundColor(Diu.chu).multilineTextAlignment(.center)
      Text(m.loiQuyen ?? "").font(Diu.phu).foregroundColor(Diu.chu2).multilineTextAlignment(.center)
      NhanNho(chu: "Chưa cho phép", icon: "ic_canh_bao")
      VStack(alignment: .leading, spacing: 14) {
        BuocSo(i: 1, t1: "Bấm nút bên dưới", t2: "Máy hỏi lại Thời gian sử dụng")
        BuocSo(i: 2, t1: "Ba Mẹ nhập Apple ID", t2: "Ba Mẹ tự gõ, con không cần")
        BuocSo(i: 3, t1: "Chọn «Cho phép»", t2: "Xong là vào màn chính")
      }
      .theDiu()
      Button { Task { await m.xinQuyen(conTrongGiaDinh: giaDinh) } } label: { Label { Text("Nhờ Ba Mẹ cho phép lại") } icon: { Anh(ten: "ic_nguoi", co: 26) } }
        .buttonStyle(NutDiu())
      Button("Để sau") { m.moQuyen = false; m.loiQuyen = nil }.buttonStyle(NutDiu(kieu: .lk))
    }
  }
}

struct ManDaGo: View {
  var body: some View {
    KhungMan {
      Spacer(minLength: 40)
      Anh(ten: "rob_xong", co: 130)
      Text("Ba Mẹ đã gỡ AiiGrow khỏi máy này").font(Diu.tieuDe).foregroundColor(Diu.chu).multilineTextAlignment(.center)
      Text("Mọi giới hạn đã được bỏ. Để xoá biểu tượng: chạm giữ biểu tượng AiiGrow Con › Xoá ứng dụng.")
        .font(Diu.phu).foregroundColor(Diu.chu2).multilineTextAlignment(.center)
    }
  }
}
