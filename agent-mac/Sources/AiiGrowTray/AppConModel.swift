// Dữ liệu của app «AiiGrow của Con» (agent-win AppForm + HvApi): tải tổng quan / cửa hàng / tin qua daemon (lệnh IPC `hocVien`),
// nhận việc, nộp bài, đổi quà, trả lời Ba Mẹ, hỏi số phút chơi bằng điểm. Tray KHÔNG giữ token — mọi lời gọi máy chủ đi qua daemon.
import AppKit
import Foundation
import AiiGrowCore

@MainActor
final class AppConModel: ObservableObject {
  @Published var muc: MucApp = .homNay
  @Published var tq: HvTongQuan?
  @Published var ch: HvCuaHang?
  @Published var tin: HvTinDs?
  /// Lần tải tổng quan gần nhất lỗi (nil = chưa lỗi / đã tải được).
  @Published var loiTai: String?
  @Published var thongBao = ""
  @Published var thongBaoLoi = false
  @Published var dangBan = false
  /// Số tin mới chưa đọc (tray đặt khi hỏi tin).
  @Published var tinMoi = 0
  /// «≈ X phút chơi» đổi được bằng điểm cho mục chơi đầu tiên (`phutChoiCua`); nil = chưa biết.
  @Published var phutChoi: Int?
  var phutChoiCua: String?
  private var dangTai = false

  /// Gửi một lệnh IPC tới daemon — tiêm được (test / chụp ảnh không mở socket).
  let goi: (YeuCauTray) async -> TraLoi

  init(goi: @escaping (YeuCauTray) async -> TraLoi = AppConModel.goiThat) { self.goi = goi }

  nonisolated static func goiThat(_ yc: YeuCauTray) async -> TraLoi {
    do { return try await IPCClient.guiAsync(yc, giay: 25) } catch {
      return .loi(ma: "ipc", chu: "Chưa nối được dịch vụ AiiGrow. Con thử lại sau vài giây nhé.")
    }
  }

  // MARK: gọi học viên

  /// (dữ liệu, câu lỗi cho Con).
  func hoi(_ method: String, _ path: String, than: [String: Any]? = nil) async -> (Data?, String?) {
    let chuoi = than.flatMap { try? JSONSerialization.data(withJSONObject: $0) }.map { String(decoding: $0, as: UTF8.self) }
    switch await goi(.hocVien(method: method, path: path, than: method == "POST" ? (chuoi ?? "{}") : nil)) {
    case .duLieu(let json): return (Data(json.utf8), nil)
    case .loi(let ma, let chu): return (nil, AppConModel.cauLoi(ma: ma, chu: chu))
    default: return (nil, "Chưa làm được. Con thử lại nhé.")
    }
  }

  static func cauLoi(ma: String, chu: String) -> String {
    if ma == "yeu_cau_sai" { return "Dịch vụ AiiGrow trên máy là bản cũ — nhờ Ba Mẹ cập nhật AiiGrow nhé." }
    return chu.trimmingCharacters(in: .whitespaces).isEmpty ? "Chưa làm được. Con thử lại nhé." : chu
  }

  func noi(_ s: String, loi: Bool = false) { thongBao = s; thongBaoLoi = loi }

  /// Tải lại cả ba nguồn (tổng quan trước — các mục khác chờ nó). `dsChoi` để hỏi số phút chơi của mục đầu.
  func lamMoi(dsChoi: [String] = []) async {
    guard !dangTai else { return }
    dangTai = true; defer { dangTai = false }
    let (d, loi) = await hoi("GET", "hoc-vien/tong-quan")
    guard let d, let t = HvTongQuan.doc(d) else {
      loiTai = loi ?? "Máy chủ trả dữ liệu lạ. Con thử lại nhé."
      return
    }
    tq = t; loiTai = nil
    async let phut: Void = lamMoiPhutChoi(dsChoi: dsChoi)
    if let c = await hoi("GET", "hoc-vien/cua-hang").0.flatMap(HvCuaHang.doc) { ch = c }
    if let x = await hoi("GET", "hoc-vien/tin").0.flatMap(HvTinDs.doc) { tin = x }
    await phut
  }

  func lamMoiPhutChoi(dsChoi: [String]) async {
    guard let dau = dsChoi.first else { phutChoi = nil; phutChoiCua = nil; return }
    if case let .choi(tt, phut, _) = await goi(.choiThu(muc: dau)) {
      phutChoiCua = dau
      phutChoi = tt == "duoc" ? phut : nil
    }
  }

  // MARK: hành động

  func nhanViec(_ v: HvNhiemVu, dsChoi: [String]) async {
    guard !dangBan, let id = HocVienPaths.doan(v.id) else { return }
    dangBan = true; noi("Đang nhận việc…")
    let (d, loi) = await hoi("POST", "hoc-vien/nhiem-vu/\(id)/bat-dau")
    dangBan = false
    guard let d, HvBatDau.doc(d) != nil else { noi(loi ?? "Chưa nhận được việc. Con thử lại nhé.", loi: true); return }
    await lamMoi(dsChoi: dsChoi)
    noi("Con đã nhận «\(v.ten)». Làm xong thì bấm Nộp bài nhé!")
  }

  /// Nộp bài: (kết quả, câu lỗi).
  func nop(_ v: HvNhiemVu, ghiChu: String, anhBase64: String?) async -> (HvNopKq?, String?) {
    guard let luot = v.luot.flatMap(HocVienPaths.doan) else { return (nil, "Con bấm Nhận việc trước nhé.") }
    if let l = HocVienView.kiemNop(v, ghiChu: ghiChu, coAnh: anhBase64 != nil) { return (nil, l) }
    var than: [String: Any] = ["ghiChu": ghiChu.trimmingCharacters(in: .whitespacesAndNewlines)]
    if let a = anhBase64 { than["anh"] = [["mime": "image/jpeg", "base64": a]] }
    let (d, loi) = await hoi("POST", "hoc-vien/luot/\(luot)/nop", than: than)
    guard let d, let kq = HvNopKq.doc(d) else { return (nil, loi ?? "Chưa nộp được. Con thử lại nhé.") }
    return (kq, nil)
  }

  func doiQua(_ q: HvQua, dsChoi: [String]) async {
    guard !dangBan, let id = HocVienPaths.doan(q.id) else { return }
    dangBan = true; noi("Đang đổi quà…")
    let (d, loi) = await hoi("POST", "hoc-vien/doi/\(id)")
    dangBan = false
    guard let d, let kq = HvDoiKq.doc(d) else { noi(loi ?? "Chưa đổi được. Con thử lại nhé.", loi: true); return }
    await lamMoi(dsChoi: dsChoi)
    noi(HocVienView.doiThongBao(kq, tenQua: q.ten))
  }

  func traLoi(_ l: HvLoiKhen, _ cau: String, dsChoi: [String]) async {
    guard !dangBan, let id = HocVienPaths.doan(l.id) else { return }
    dangBan = true; noi("Đang gửi…")
    let (d, loi) = await hoi("POST", "hoc-vien/loi-khen/\(id)/phan-hoi", than: ["phanHoi": cau])
    dangBan = false
    guard let d, HvDongY.doc(d) else { noi(loi ?? "Chưa gửi được. Con thử lại nhé.", loi: true); return }
    await lamMoi(dsChoi: dsChoi)
    noi("Đã nhắn lại Ba Mẹ.")
  }

  func chon(_ m: MucApp) {
    muc = m
    if m == .tinNhan { tinMoi = 0 }
    thongBao = ""
  }
}

/// Ảnh bằng chứng: thu nhỏ (cạnh dài ≤ 1280) rồi nén JPEG, giảm chất lượng dần tới khi ≤ 300 KB (agent-win NopBaiForm.ToJpeg).
enum AnhNop {
  static func jpeg(_ anh: NSImage) -> Data? {
    guard let cg = anh.cgImage(forProposedRect: nil, context: nil, hints: nil) else { return nil }
    let (w, h) = AnhBangChung.vua(cg.width, cg.height)
    guard let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: w, pixelsHigh: h, bitsPerSample: 8, samplesPerPixel: 4,
                                     hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0),
          let ctx = NSGraphicsContext(bitmapImageRep: rep) else { return nil }
    NSGraphicsContext.saveGraphicsState()
    NSGraphicsContext.current = ctx
    ctx.imageInterpolation = .high
    NSColor.white.setFill(); NSRect(x: 0, y: 0, width: w, height: h).fill()
    ctx.cgContext.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
    NSGraphicsContext.restoreGraphicsState()
    var cuoi: Data?
    for q in [0.82, 0.70, 0.58, 0.46, 0.35] {
      cuoi = rep.representation(using: .jpeg, properties: [.compressionFactor: q])
      if let c = cuoi, c.count <= AnhBangChung.maxByte { break }
    }
    return cuoi
  }
}
