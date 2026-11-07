// Một nhiệm vụ (docs/thiet-ke-chot/con-dt-ngay 04–13): chi tiết → đang làm → nộp ảnh / ghi âm / viết → chờ Ba Mẹ duyệt
// (mất mạng: lưu ở máy, gửi khi có mạng) · Ba Mẹ nhờ làm lại.
import SwiftUI
import AVFoundation
import ConCore

struct ManNvChiTiet: View {
  @EnvironmentObject var m: MoHinhApp
  @Environment(\.dismiss) var dong
  let nv: NhiemVuCon
  enum Buoc { case chiTiet, dangLam, nop, choDuyet, luu, lamLai }
  @State var buoc: Buoc = .chiTiet
  @State var luot: String?
  @State var batDauLuc = Date()
  @State var cach = "anh"
  @State var anh: [UIImage] = []
  @State var moChup = false
  @State var viet = ""
  @StateObject var ghi = GhiAm()
  @State var tick = Date()
  let dongHo = Timer.publish(every: 1, on: .main, in: .common).autoconnect()

  var body: some View {
    KhungMan {
      switch buoc {
      case .chiTiet: chiTiet
      case .dangLam: dangLam
      case .nop: nop
      case .choDuyet: choDuyet
      case .luu: daLuu
      case .lamLai: lamLai
      }
    }
    .onReceive(dongHo) { tick = $0 }
    .onAppear {
      cach = nv.cachNop == "xong" || nv.cachNop == "tu_cham" ? "anh" : nv.cachNop
      luot = nv.luot
      buoc = nv.choDuyet ? .choDuyet : nv.canLamLai ? .lamLai : (nv.trangThai == "dang_lam" ? .dangLam : .chiTiet)
      if m.demo == "nvChiTiet" { buoc = .chiTiet }
    }
    .sheet(isPresented: $moChup) { ChupAnh { if let a = $0 { anh.append(a) } }.ignoresSafeArea() }
  }

  var anhCan: Int { nv.moTa?.components(separatedBy: "·").count ?? 1 }

  var chiTiet: some View {
    VStack(spacing: 14) {
      DauMan(tieuDe: nv.ten, lui: { dong() })
      OIcon(ten: HangNv.icon(nv), co: 96, nen: .white)
      HStack(spacing: 10) {
        ChipSao(so: nv.soSao)
        if let g = nv.gioNhac { NhanNho(chu: "Trước \(g)", icon: "ic_dongho") }
      }
      if let mt = nv.moTa, !mt.isEmpty {
        VStack(alignment: .leading, spacing: 8) {
          Text("Ba Mẹ muốn xem").font(Diu.t1).foregroundColor(Diu.chu2)
          ForEach(mt.components(separatedBy: "·").map { $0.trimmingCharacters(in: .whitespaces) }, id: \.self) { d in
            HangDs(icon: HangNv.icon(nv), t1: d)
          }
        }
        .theDiu()
      }
      if nv.cachNop == "tu_cham" {
        Text("Việc này AiiRob tự chấm trong app — làm xong là sao vào ví.").font(Diu.t2).foregroundColor(Diu.chu2).multilineTextAlignment(.center)
      } else {
        Button { Task { await batDau() } } label: { Label { Text("Bắt đầu \(nv.ten.lowercased())") } icon: { Anh(ten: "ic_chay", co: 26) } }
          .buttonStyle(NutDiu())
      }
      Button("Để sau") { dong() }.buttonStyle(NutDiu(kieu: .lk))
      if let l = m.loi { Text(l).font(Diu.t2).foregroundColor(Diu.doChu) }
    }
  }

  func batDau() async {
    m.loi = nil
    guard let l = await m.batDau(nv) else { return }
    luot = l; batDauLuc = Date()
    buoc = nv.cachNop == "xong" ? .nop : .dangLam
  }

  var dangLam: some View {
    let phut = max(0, Int(tick.timeIntervalSince(batDauLuc) / 60))
    return VStack(spacing: 14) {
      DauMan(tieuDe: "Đang \(nv.ten.lowercased())", lui: { dong() })
      NhanNho(chu: "\(phut) phút", icon: "ic_dongho")
      Anh(ten: "rob_chi", co: 110)
      Text(nv.cachNop == "ghi_am" ? "Làm xong thì ghi âm cho Ba Mẹ nghe nhé!" : nv.cachNop == "viet" ? "Làm xong thì viết vài câu cho Ba Mẹ nhé!"
           : "Làm xong thì chụp ảnh cho Ba Mẹ nhé!").font(Diu.phu).foregroundColor(Diu.chu2).multilineTextAlignment(.center)
      Button { buoc = .nop } label: { Label { Text(nv.cachNop == "ghi_am" ? "Xong · ghi âm nộp" : nv.cachNop == "viet" ? "Xong · viết nộp" : "Xong · chụp ảnh nộp") } icon: { Anh(ten: "ic_camera", co: 26) } }
        .buttonStyle(NutDiu())
      Button("Làm tiếp sau") { dong() }.buttonStyle(NutDiu(kieu: .lk))
    }
  }

  // MARK: nộp (cdt-chup · them-qqzb3lnt · them-r6lv8p5v)
  var nop: some View {
    VStack(spacing: 14) {
      DauMan(tieuDe: nv.ten, lui: { buoc = .dangLam })
      if nv.cachNop != "xong" {
        HStack(spacing: 8) {
          chonCach("ghi_am", "Ghi âm", "ic_tai"); chonCach("anh", "Ảnh", "ic_camera"); chonCach("viet", "Viết", "ic_but")
        }
      }
      switch nv.cachNop == "xong" ? "xong" : cach {
      case "ghi_am":
        VStack(spacing: 12) {
          Text(String(format: "%02d:%02d", ghi.giay / 60, ghi.giay % 60)).font(Diu.chu(44, .black)).monospacedDigit().foregroundColor(Diu.chu)
          Text(nv.moTa ?? "Đọc to cho Ba Mẹ nghe").font(Diu.t2).foregroundColor(Diu.chu2)
          Button { ghi.dangGhi ? ghi.dung() : ghi.batDau() } label: {
            Image(systemName: ghi.dangGhi ? "stop.fill" : "mic.fill").font(.system(size: 30, weight: .bold)).foregroundColor(.white)
              .frame(width: 84, height: 84).background(Circle().fill(ghi.dangGhi ? Diu.do_ : Diu.xanh))
          }
          .accessibilityLabel(ghi.dangGhi ? "Dừng ghi âm" : "Ghi âm")
          if ghi.coBan && !ghi.dangGhi {
            HStack(spacing: 10) {
              Button("Thu lại") { ghi.xoa(); ghi.batDau() }.buttonStyle(NutDiu(kieu: .phu))
              Button("Nghe lại") { ghi.nghe() }.buttonStyle(NutDiu(kieu: .phu))
            }
          }
          if let l = ghi.loi { Text(l).font(Diu.t2).foregroundColor(Diu.doChu).multilineTextAlignment(.center) }
        }
        .frame(maxWidth: .infinity).theDiu()
      case "viet":
        VStack(alignment: .leading, spacing: 8) {
          Text(nv.moTa ?? "Viết cho Ba Mẹ").font(Diu.t1).foregroundColor(Diu.chu)
          TextEditor(text: $viet).font(Diu.chu(17, .semibold)).frame(minHeight: 140).scrollContentBackground(.hidden)
            .padding(8).background(RoundedRectangle(cornerRadius: 16).fill(Diu.nen))
          NhanNho(chu: Self.soCau(viet) >= 2 ? "\(Self.soCau(viet)) câu · đủ rồi" : "Viết 2 câu nhé", icon: "ic_but")
        }
        .theDiu()
      case "xong":
        Text("Bấm «Gửi Ba Mẹ» khi con làm xong nhé.").font(Diu.phu).foregroundColor(Diu.chu2)
      default:
        VStack(spacing: 10) {
          Text("📷 Ảnh \(min(anh.count + 1, max(anhCan, anh.count + 1)))/\(max(anhCan, anh.count))").font(Diu.t1).foregroundColor(Diu.chu)
          if !anh.isEmpty {
            ScrollView(.horizontal) { HStack { ForEach(Array(anh.enumerated()), id: \.offset) { i, a in
              Image(uiImage: a).resizable().scaledToFill().frame(width: 96, height: 96).clipShape(RoundedRectangle(cornerRadius: 14))
                .overlay(alignment: .topTrailing) {
                  Button { anh.remove(at: i) } label: { Image(systemName: "xmark.circle.fill").foregroundColor(.white).font(.system(size: 22)) }.padding(4)
                }
            } } }
          }
          Button { moChup = true } label: { Label { Text(anh.isEmpty ? "Chụp ảnh" : "Chụp thêm") } icon: { Anh(ten: "ic_camera", co: 26) } }
            .buttonStyle(NutDiu(kieu: anh.count >= anhCan ? .phu : .chinh))
        }
        .frame(maxWidth: .infinity).theDiu()
      }
      HStack(spacing: 6) { Anh(ten: "ic_sao", co: 20); Text("+\(nv.soSao) sao khi Ba Mẹ duyệt").font(Diu.t2).foregroundColor(Diu.saoChu) }
      if let l = m.loi { Text(l).font(Diu.t2).foregroundColor(Diu.doChu).multilineTextAlignment(.center) }
      Button { Task { await gui() } } label: {
        if m.dangBan { ProgressView().tint(.white) } else { Label { Text("Gửi Ba Mẹ") } icon: { Anh(ten: "ic_gui", co: 26) } }
      }
      .buttonStyle(NutDiu()).disabled(!duBangChung || m.dangBan)
      Button("Làm tiếp sau") { dong() }.buttonStyle(NutDiu(kieu: .lk))
    }
    .onAppear { m.loi = nil }
  }

  static func soCau(_ s: String) -> Int { s.split(whereSeparator: { ".!?\n".contains($0) }).filter { !$0.trimmingCharacters(in: .whitespaces).isEmpty }.count }

  var duBangChung: Bool {
    if nv.cachNop == "xong" { return true }
    switch cach { case "ghi_am": return ghi.coBan && !ghi.dangGhi; case "viet": return !viet.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty; default: return !anh.isEmpty }
  }

  func chonCach(_ c: String, _ ten: String, _ ic: String) -> some View {
    Button { cach = c } label: {
      HStack(spacing: 6) { Anh(ten: ic, co: 22); Text(ten).font(Diu.chu(15, .heavy)) }
        .foregroundColor(cach == c ? .white : Diu.chu2).frame(maxWidth: .infinity, minHeight: 44)
        .background(Capsule().fill(cach == c ? Diu.xanh : .white)).overlay(Capsule().stroke(cach == c ? .clear : Diu.vien, lineWidth: 1))
    }
    .buttonStyle(.plain).accessibilityAddTraits(cach == c ? .isSelected : [])
  }

  func gui() async {
    var l = luot
    if l == nil { l = await m.batDau(nv) }
    guard let luot = l else { return }
    self.luot = luot
    let anhData = cach == "anh" && nv.cachNop != "xong" ? anh.compactMap { NenAnh.jpeg($0) } : []
    let am = cach == "ghi_am" && nv.cachNop != "xong" ? ghi.duLieu() : nil
    let chu = cach == "viet" && nv.cachNop != "xong" ? viet : nil
    switch await m.nop(luot: luot, ten: nv.ten, anh: anhData, ghiAm: am, viet: chu) {
    case "luu": buoc = .luu
    case .some: buoc = .choDuyet
    case nil: break
    }
  }

  // MARK: chờ duyệt (cdt-cho-duyet) · đã lưu (them-6t2vvx7d) · làm lại (cdt-chup-lai)
  var choDuyet: some View {
    VStack(spacing: 14) {
      Text("Đã gửi Ba Mẹ").font(Diu.tieuDe).foregroundColor(Diu.chu)
      Anh(ten: "rob_cho", co: 120)
      Text("Ba Mẹ đang xem nha!").font(Diu.phu).foregroundColor(Diu.chu2)
      HangDs(icon: HangNv.icon(nv), t1: "⏳ Chờ duyệt", t2: nv.ten).theDiu(dem: 12)
      HStack(spacing: 6) { Anh(ten: "ic_sao", co: 20); Text("+\(nv.soSao) sao khi Ba Mẹ duyệt").font(Diu.t2).foregroundColor(Diu.saoChu) }
      Button { m.tab = .nhiemVu; dong() } label: { Label { Text("Làm nhiệm vụ khác") } icon: { Anh(ten: "ic_tick", co: 26) } }.buttonStyle(NutDiu())
    }
  }

  var daLuu: some View {
    VStack(spacing: 14) {
      Text("Chưa gửi được").font(Diu.tieuDe).foregroundColor(Diu.chu)
      Anh(ten: "rob_nghi", co: 120)
      Text("Mất mạng rồi. Bài vẫn còn nhé!").font(Diu.phu).foregroundColor(Diu.chu2)
      HangDs(icon: "ic_wifi", t1: nv.ten, t2: "Lưu ở máy, gửi khi có mạng").theDiu(dem: 12)
      Button { Task { await m.guiBaiCho(); if !m.baiCho.contains(where: { $0.luot == luot }) { buoc = .choDuyet } } } label: {
        Label { Text("Thử gửi lại") } icon: { Anh(ten: "ic_lap", co: 26) }
      }.buttonStyle(NutDiu())
      Button("Làm nhiệm vụ khác") { m.tab = .nhiemVu; dong() }.buttonStyle(NutDiu(kieu: .lk))
    }
  }

  var lamLai: some View {
    VStack(spacing: 14) {
      DauMan(tieuDe: "Ba Mẹ nhờ làm lại", lui: { dong() })
      Anh(ten: "rob_chi", co: 110)
      Text("Sửa chút xíu là xong. Cố lên!").font(Diu.phu).foregroundColor(Diu.chu2)
      HangDs(icon: HangNv.icon(nv), t1: "↺ \(nv.ten)", t2: nv.lyDo ?? "Làm lại").theDiu(dem: 12)
      if let ln = nv.loiNhan { Text("«\(ln)»").font(Diu.chu(17, .bold)).foregroundColor(Diu.chu).theDiu() }
      HStack(spacing: 6) { Anh(ten: "ic_sao", co: 20); Text("Làm lại xong vẫn được +\(nv.soSao) sao").font(Diu.t2).foregroundColor(Diu.saoChu) }
      Button { buoc = .nop } label: { Label { Text("Làm lại & nộp") } icon: { Anh(ten: "ic_camera", co: 26) } }.buttonStyle(NutDiu())
      Button("Để sau") { dong() }.buttonStyle(NutDiu(kieu: .lk))
    }
  }
}

/// Nén ảnh nộp: cạnh dài ≤ 1280, JPEG ≤ 300 KB (máy chủ nhận ≤ 400 KB — docs/API.md › hoc-vien/luot/:id/nop).
enum NenAnh {
  static func jpeg(_ a: UIImage) -> Data? {
    let canh = max(a.size.width, a.size.height)
    let tl = canh > 1280 ? 1280 / canh : 1
    let co = CGSize(width: a.size.width * tl, height: a.size.height * tl)
    let f = UIGraphicsImageRendererFormat(); f.scale = 1
    let nho = UIGraphicsImageRenderer(size: co, format: f).image { _ in a.draw(in: CGRect(origin: .zero, size: co)) }
    var q: CGFloat = 0.8
    var d = nho.jpegData(compressionQuality: q)
    while let x = d, x.count > 300_000, q > 0.3 { q -= 0.1; d = nho.jpegData(compressionQuality: q) }
    return d
  }
}

/// Camera (máy ảo không có ⇒ thư viện ảnh).
struct ChupAnh: UIViewControllerRepresentable {
  let xong: (UIImage?) -> Void
  func makeCoordinator() -> DP { DP(xong: xong) }
  func makeUIViewController(context: Context) -> UIImagePickerController {
    let p = UIImagePickerController()
    p.sourceType = UIImagePickerController.isSourceTypeAvailable(.camera) ? .camera : .photoLibrary
    p.delegate = context.coordinator
    return p
  }
  func updateUIViewController(_ v: UIImagePickerController, context: Context) {}
  final class DP: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
    let xong: (UIImage?) -> Void
    init(xong: @escaping (UIImage?) -> Void) { self.xong = xong }
    func imagePickerController(_ p: UIImagePickerController, didFinishPickingMediaWithInfo i: [UIImagePickerController.InfoKey: Any]) {
      xong(i[.originalImage] as? UIImage); p.dismiss(animated: true)
    }
    func imagePickerControllerDidCancel(_ p: UIImagePickerController) { xong(nil); p.dismiss(animated: true) }
  }
}

/// Ghi âm AAC mono 32 kbps (≈ 4 phút / 1 MB — máy chủ nhận ≤ 2 MB).
@MainActor
final class GhiAm: NSObject, ObservableObject {
  @Published var dangGhi = false
  @Published var giay = 0
  @Published var coBan = false
  @Published var loi: String?
  private var ghi: AVAudioRecorder?
  private var phat: AVAudioPlayer?
  private var hen: Timer?
  let tep = FileManager.default.temporaryDirectory.appendingPathComponent("aiigrow-ghi-am.m4a")

  func batDau() {
    loi = nil
    AVAudioSession.sharedInstance().requestRecordPermission { ok in
      Task { @MainActor in
        guard ok else { self.loi = "Cần cho phép micro trong Cài đặt › AiiGrow Con."; return }
        do {
          try AVAudioSession.sharedInstance().setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker])
          try AVAudioSession.sharedInstance().setActive(true)
          let r = try AVAudioRecorder(url: self.tep, settings: [AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 22050,
                                                                 AVNumberOfChannelsKey: 1, AVEncoderBitRateKey: 32000])
          r.record(forDuration: 240)
          self.ghi = r; self.dangGhi = true; self.giay = 0
          self.hen = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { _ in
            Task { @MainActor in
              self.giay = Int(self.ghi?.currentTime ?? 0)
              if self.ghi?.isRecording != true { self.dung() }
            }
          }
        } catch { self.loi = "Chưa ghi âm được: \(error.localizedDescription)" }
      }
    }
  }
  func dung() { ghi?.stop(); hen?.invalidate(); dangGhi = false; coBan = FileManager.default.fileExists(atPath: tep.path) }
  func xoa() { try? FileManager.default.removeItem(at: tep); coBan = false; giay = 0 }
  func nghe() { phat = try? AVAudioPlayer(contentsOf: tep); phat?.play() }
  func duLieu() -> Data? { try? Data(contentsOf: tep) }
}
