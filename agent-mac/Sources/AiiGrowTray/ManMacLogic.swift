// Logic THUẦN của các màn Mac làm lại theo thiết kế `docs/thiet-ke-chot/con-cai-mac` (60 màn, 06/11) — tách khỏi SwiftUI để test được:
// màn chọn tên + PIN (10–16), màn khoá theo bé (33, 35, 40, 58), đổi sao lấy giờ (49–51), quà bảng giá (23–25), ghép máy (03–09).
import Foundation
import AiiGrowCore

/// Ô PIN 4 số (bàn phím số trên màn + phím thật).
public struct PinNhap: Equatable {
  public private(set) var so = ""
  public init() {}
  public var du: Bool { so.count == 4 }
  public mutating func them(_ c: Character) { guard so.count < 4, c.isASCII, c.isNumber else { return }; so.append(c) }
  public mutating func xoa() { if !so.isEmpty { so.removeLast() } }
  public mutating func lamLai() { so = "" }
}

/// Bước của màn chọn tên (máy khoá).
public enum BuocChonTen: Equatable {
  case chonTen
  case pin(HoSoBe)
  case quenPin(HoSoBe)
  case baMeMa
}

/// Màn ghép máy đang hiện (03 / 05 / 06 / 07 / 08 / 09).
public enum ManGhep: Equatable { case nhap, maSai, hetHan, matMang, batQuyen, xong }

/// «Hỏi AiiGrow» — tự tìm lỗi (con-mat-mang 10; bản Windows `HoiAiiGrowView`): cùng bốn thẻ tình huống, cùng chữ; cách xử lý theo khả năng của Mac.
public enum HoiAiiGrow {
  /// (mã, icon Fluent, tiêu đề, dòng phụ) — y như Windows (thu_lai | ma_mo | bat_lai | cap_nhat).
  public static let the: [(ma: String, icon: String, tieu: String, phu: String)] = [
    ("thu_lai", "wifi", "Mất mạng?", "Máy vẫn trừ sao đúng luật"),
    ("ma_mo", "key", "Máy bị khoá?", "Xin Ba Mẹ mã mở máy"),
    ("bat_lai", "warning", "AiiGrow báo lỗi?", "Bấm «Bật lại AiiGrow»"),
    ("cap_nhat", "hourglass_not_done", "Cần cập nhật?", "Bấm cập nhật, chờ 1 phút"),
  ]
  public static let tieu = "Hỏi AiiGrow"
  public static let phu = "Con đang gặp gì? Bấm vào thẻ nhé"
  public static let goiBaMe = "Gọi Ba Mẹ giúp"
  /// Windows nói «màn khoá»; Mac: mã gõ ở ô «Mất mạng? Mở bằng mã của Ba Mẹ ›» trên màn khoá.
  public static let maMoCau = "Nhờ Ba Mẹ mở app AiiGrow trên điện thoại, đọc mã 6 số cho con gõ vào màn khoá."
  public static let maMoCho = "Màn khoá có dòng «Mất mạng? Mở bằng mã của Ba Mẹ ›» — bấm vào rồi gõ mã."

  public struct KetQua: Equatable { public var tieu: String, phu: String, tot: Bool }

  /// Thẻ «Mất mạng?» / «AiiGrow báo lỗi?» sau khi hỏi lại dịch vụ (Windows: thử lại / bật lại; Mac không khởi động lại được dịch vụ root từ khay,
  /// nó tự bật lại nhờ KeepAlive ⇒ chỉ hỏi lại và nói thật).
  public static func ketQuaThuLai(ma: String, matKetNoi: Bool, matMang: Bool, banDaemon: String?) -> KetQua {
    if matKetNoi {
      return KetQua(tieu: "AiiGrow chưa trả lời",
                    phu: ma == "bat_lai" ? "AiiGrow tự bật lại sau vài giây, máy vẫn giữ luật cũ. Vẫn lỗi thì khởi động lại máy hoặc nhờ Ba Mẹ cài lại gói AiiGrow."
                                         : "Máy vẫn giữ luật như cũ. Con chờ vài giây rồi thử lại nhé.", tot: false)
    }
    if matMang { return KetQua(tieu: "Vẫn chưa có mạng", phu: "Máy vẫn trừ sao đúng luật. Có mạng là AiiGrow gửi Ba Mẹ ngay.", tot: false) }
    return KetQua(tieu: "AiiGrow chạy bình thường", phu: "Sao và luật vẫn như cũ." + (banDaemon.map { " Bản \($0)." } ?? ""), tot: true)
  }
  /// Thẻ «Cần cập nhật?» cho Con: Mac tự cập nhật nền; nút kiểm ngay chỉ có ở menu tài khoản Ba Mẹ.
  public static func ketQuaCapNhat(banDaemon: String?) -> KetQua {
    KetQua(tieu: "AiiGrow tự cập nhật",
           phu: "Có bản mới là máy tự cài trong khoảng 1 phút, không cần ghép lại. Sao và luật giữ nguyên." + (banDaemon.map { " Đang chạy bản \($0)." } ?? "")
                + " Muốn kiểm ngay: nhờ Ba Mẹ chọn «Kiểm tra cập nhật» ở menu AiiGrow trong tài khoản của Ba Mẹ.", tot: true)
  }
  public static func ketQuaMaMo() -> KetQua { KetQua(tieu: "Máy bị khoá?", phu: maMoCau + " " + maMoCho, tot: true) }
}

public enum ManMac {
  /// Máy dùng chung chưa ai vào ⇒ màn chọn tên che máy (chỉ phiên Con, đã ghép).
  public static func canChonTen(_ t: TrangThai?) -> Bool { t?.laPhienCon == true && t?.daGhep == true && t?.nguoiDung == "chua" }
  /// «Ba Mẹ đang dùng máy» còn hạn.
  public static func baMeDangDung(_ t: TrangThai?, bayGio: Date) -> Bool {
    guard t?.laPhienCon == true, t?.nguoiDung == "ba_me" else { return false }
    return (t?.baMeDungDen ?? .distantFuture) > bayGio
  }

  /// «0:15».
  public static func dongHoCho(_ giay: Int) -> String { String(format: "%d:%02d", max(0, giay) / 60, max(0, giay) % 60) }

  /// Chữ cái đầu của tên gọi (chữ cuối của «Bảo Anh» ⇒ «A»? thiết kế dùng «B» cho Bảo Anh, «M» cho Bảo Minh: chữ đầu tiếng cuối khi trùng họ đệm).
  /// Thiết kế: Bảo Anh = B, Bảo Minh = M ⇒ bé đầu tiên lấy chữ đầu, bé trùng chữ đầu với bé trước lấy chữ đầu của tiếng cuối.
  public static func chuCai(_ ds: [HoSoBe]) -> [String: String] {
    var kq: [String: String] = [:], daDung = Set<String>()
    for b in ds {
      let tieng = b.ten.split(separator: " ").map(String.init)
      let dau = tieng.first.flatMap { $0.first.map { String($0).uppercased() } } ?? "?"
      let cuoi = tieng.last.flatMap { $0.first.map { String($0).uppercased() } } ?? dau
      let c = daDung.contains(dau) ? cuoi : dau
      kq[b.id] = c; daDung.insert(c)
    }
    return kq
  }

  /// Câu trên màn PIN sau một lần thử.
  public static func cauPin(_ ketQua: String, conLan: Int?) -> String? {
    switch ketQua {
    case "pin_sai": return "Chưa đúng · còn \(conLan ?? 0) lần thử"
    case "can_pin", "pin_sai_dang": return "Con nhập PIN 4 số nhé."
    default: return nil
    }
  }

  /// Lỗi lệnh ghép ⇒ màn (05 mã sai / 06 hết hạn / 07 mất mạng); nil = lỗi khác (hiện chữ máy chủ).
  public static func manLoiGhep(_ ma: String) -> ManGhep? {
    switch ma {
    case "ma_sai", "khong_thay_ma", "ma_khong_dung": return .maSai
    case "ma_het_han", "het_han": return .hetHan
    case "mat_mang": return .matMang
    default: return nil
    }
  }

  /// «482 017».
  public static func maHien(_ s: String) -> String { s.count == 6 ? String(s.prefix(3)) + " " + String(s.suffix(3)) : s }

  // MARK: màn khoá theo bé

  public struct ChuKhoa: Equatable {
    public var tieuDe: String
    public var phu: String
    /// Khoá vì hết sao (lối ra: Làm nhiệm vụ / Xin Ba Mẹ cho vay sao). false = Ba Mẹ khoá (không xin gì được, chỉ «Ba Mẹ mở máy»).
    public var hetSao: Bool
    /// 16/11 (#302 mục 4): khoá VÌ giới hạn giờ chơi (nghỉ giữa lượt / đủ giờ hôm nay), sao còn nguyên ⇒ không «Hết sao», không đẩy «Làm nhiệm vụ»; vẫn «Xin Ba Mẹ».
    public var theoGioiHan: Bool = false
  }

  /// Sao tiêu được THẬT (không kẹp giới hạn giờ chơi): `saoTieuDuoc` › `phutCon`. nil = chưa biết.
  public static func saoThat(_ t: TrangThai) -> Int? { t.soSao.map { $0.saoTieuDuoc ?? max(0, $0.phutCon) } }

  /// Chữ khoá theo giới hạn giờ chơi (nil = không phải trường hợp này, giữ chữ cũ). Dùng cho màn khoá, popup đóng app, khay.
  public static func chuGioiHan(_ t: TrangThai) -> GioiHan.Chu? { t.gioiHan?.chuKhoa(saoThat: saoThat(t)) }

  /// Thiết kế them-kofpo0dl «Hết sao rồi» / Ba Mẹ khoá. «het_gio» (máy chủ cũ, minutesLeft) = hết sao. Giờ ngủ đã bỏ (#258) ⇒ như Ba Mẹ khoá.
  public static func chuKhoa(_ t: TrangThai, phutDaChoi: Int? = nil) -> ChuKhoa {
    let ten = t.beTen ?? t.tenCon ?? "Con"
    // chữ giới hạn CHỈ khi khoá vì hết phút/nghỉ (het_gio, hết sao, hoặc không rõ lý do mà phút chơi đã về 0); Ba Mẹ khoá, v.v. giữ chữ mặc định
    let phutCon = t.phutSao ?? t.soSao?.phutCon
    let khoaVoiGio = t.lyDoKhoa.map { ["het_gio", SaoPhut.lyDoHetSao].contains($0) } ?? ((phutCon ?? 1) <= 0)
    if khoaVoiGio, let g = chuGioiHan(t) {
      return ChuKhoa(tieuDe: g.tieuDe, phu: g.phu, hetSao: false, theoGioiHan: true)
    }
    switch t.lyDoKhoa {
    case "het_gio", SaoPhut.lyDoHetSao:
      let da = phutDaChoi.map { " đã chơi \($0) phút hôm nay · dùng hết \(ChuSao.so($0)) sao." } ?? " đã dùng hết sao."
      return ChuKhoa(tieuDe: "Hết sao rồi", phu: ten + da + " App không tính phút vẫn mở được.", hetSao: true)
    default:
      return ChuKhoa(tieuDe: "Ba Mẹ đang khoá máy", phu: "Mở lại là máy báo con ngay.", hetSao: false)
    }
  }

  // MARK: sao (15/11)

  /// Nợ hiện dưới tên bé ở màn chọn tên: `no` của máy chủ, không có thì phần âm của số dư.
  public static func noCua(_ b: HoSoBe) -> Int? {
    let n = b.no ?? b.sao.map { max(0, -$0) } ?? 0
    return n > 0 ? n : nil
  }

  /// Quà được gắn nút «Xin vay N sao» (thiết kế them-r6eya42m): quà còn đổi được thiếu ít sao nhất.
  public static func quaXinVay(_ ds: [HvQua]) -> HvQua? {
    ds.filter { $0.conThieu > 0 && $0.choTraoTu == nil && $0.conHopLe }.min { $0.conThieu < $1.conThieu }
  }

  /// Sao Ba Mẹ duyệt hôm nay (tổng `gan` đã duyệt có lúc hôm nay) — «Sao kiếm hôm nay +30 sao».
  public static func saoKiemHomNay(_ gan: [HvLuot], bayGio: Date = Date(), lich: Calendar = .current) -> Int {
    gan.filter { $0.trangThai == "duoc_duyet" && ($0.luc.map { lich.isDate($0, inSameDayAs: bayGio) } ?? false) }.reduce(0) { $0 + ($1.diem ?? 0) }
  }

  /// Sổ sao Con thấy — MỘT thứ tự đọc cho mọi màn: trạng thái daemon (`soSao`) → tổng quan (`soSao`) → số dư tổng quan.
  public static func soSao(tt: TrangThai?, tq: HvTongQuan?) -> SoSao? { tt?.soSao ?? tq?.soSao ?? tq.map { SoSao(sao: $0.soDu) } }
  public static func dangNo(_ s: SoSao?) -> Bool { (s?.no ?? 0) > 0 || (s?.sao ?? 0) < 0 }

  /// Chữ màn «Máy đã sẵn sàng» sau khi ghép (con-cai-mac 09 + biến thể máy riêng #267). Máy riêng = máy chủ báo `mayRieng == true` (máy gắn một bé,
  /// `nguoiDung` luôn «con» ⇒ màn khoá KHÔNG hỏi tên / PIN; PIN chỉ còn ở «Ba Mẹ nhập mã»): không nói tên + PIN, không nói «cả nhà».
  /// `mayRieng == false` ⇒ máy chung (chọn tên + PIN). Chưa lấy được hồ sơ ⇒ chữ trung tính, không đoán.
  public struct ChuXong: Equatable {
    public var tieuDe: String
    public var phu: String
    public var cacDong: [String]
    public var nut: String
    /// «Máy khoá lại; …» dưới nút.
    public var chanTrang: String
  }
  public static func chuXong(_ h: HoSoMay?, taiKhoan: String) -> ChuXong {
    let chung = "Chỉ mở app, web Ba Mẹ đã thêm · Ba Mẹ có thể để Mở hết"
    guard let h else {
      return ChuXong(tieuDe: "Máy đã sẵn sàng!", phu: "AiiGrow đã ghép với Ba Mẹ.",
                     cacDong: ["⭐  1 sao = 1 phút chơi", "🛡  " + chung], nut: "Mở màn khoá",
                     chanTrang: "Máy khoá lại; Con đăng nhập tài khoản «\(taiKhoan)» để vào.")
    }
    if h.mayRieng {
      let ten = h.con.first?.ten
      return ChuXong(tieuDe: ten.map { "Máy của \($0) đã sẵn sàng!" } ?? "Máy của con đã sẵn sàng!", phu: "Con mở máy là vào thẳng, không cần làm gì thêm.",
                     cacDong: ["⭐  " + (ten.map { "Sao của \($0)" } ?? "Sao của con") + " · 1 sao = 1 phút chơi", "🛡  " + chung],
                     nut: "Mở màn khoá",
                     chanTrang: "Máy khoá lại; con đăng nhập tài khoản «\(taiKhoan)» để vào.")
    }
    return ChuXong(tieuDe: "Máy đã sẵn sàng cho cả nhà!", phu: "Mỗi bé vào máy bằng tên + PIN 4 số.",
                   cacDong: ["⭐  Sao riêng từng bé · 1 sao = 1 phút chơi", "🔑  PIN do Ba Mẹ đặt trong app", "🛡  " + chung],
                   nut: "Mở màn chọn tên",
                   chanTrang: "Máy khoá lại; các bé đăng nhập tài khoản «\(taiKhoan)» rồi chọn tên + PIN.")
  }

  /// Câu «để hết nợ»: «Để hết nợ còn 20 sao» + «2 việc chờ duyệt (+20 sao) là hết nợ» (nil = không nợ).
  public static func cauHetNo(no: Int, choDuyet: Int, soViecCho: Int) -> (String, String?)? {
    guard no > 0 else { return nil }
    let dau = "Để hết nợ còn \(ChuSao.so(no)) sao"
    guard choDuyet > 0, soViecCho > 0 else { return (dau, nil) }
    return (dau, "\(soViecCho) việc chờ duyệt (+\(ChuSao.so(choDuyet)) sao)" + (choDuyet >= no ? " là hết nợ" : " · trả bớt nợ"))
  }

  /// Danh sách của Con cho màn «… chưa có trong danh sách»: (tên, nhãn nhóm).
  public static func dsCuaCon(_ t: TrangThai) -> [(ten: String, nhom: String)] {
    let khong = t.dsKhongTinhPhut ?? []
    let tinh = (t.dsTinhPhut ?? []).filter { !khong.contains($0) }
    return khong.map { (HocVienView.tenMucChoi($0), "Không tính phút") } + tinh.map { (HocVienView.tenMucChoi($0), "Tính phút · 1 sao/phút") }
  }

  // MARK: quà bảng giá (23)

  /// Dòng phụ của một quà: «Đã đổi hôm qua · chờ Ba Mẹ trao» / «Chỉ cuối tuần · còn thiếu 270 sao» / «Còn thiếu 20 sao» / «Đủ sao rồi».
  public static func dongQua(_ q: HvQua, bayGio: Date = Date(), lich: Calendar = .current) -> String {
    if let tu = q.choTraoTu {
      let ngay = lich.isDate(tu, inSameDayAs: bayGio) ? "hôm nay" : lich.isDate(tu, inSameDayAs: bayGio.addingTimeInterval(-86_400)) ? "hôm qua" : "trước đó"
      return "Đã đổi \(ngay) · chờ Ba Mẹ trao"
    }
    var phan: [String] = []
    if q.chiCuoiTuan { phan.append("Chỉ cuối tuần") }
    if !q.conHopLe {
      if q.lyDoKhong == "chi_cuoi_tuan" { if !q.chiCuoiTuan { phan.append("Chỉ cuối tuần") } }
      else if let l = HocVienView.lyDoKhongDoi(q) { phan.append(l) }
    }
    if !q.moTa.isEmpty && !q.chiCuoiTuan { phan.append(q.moTa) }
    if q.conThieu > 0 { phan.append(phan.isEmpty ? "Còn thiếu \(q.conThieu) sao" : "còn thiếu \(q.conThieu) sao") }
    else if phan.isEmpty { phan.append("Đủ sao rồi") }
    return phan.joined(separator: " · ")
  }

  // MARK: nhiệm vụ (20)

  /// (chờ Ba Mẹ duyệt, chưa làm) theo thiết kế.
  public static func nhomNhiemVu(_ ds: [HvNhiemVu]) -> (choDuyet: [HvNhiemVu], chuaLam: [HvNhiemVu]) {
    let cho = ds.filter { $0.dangCho > 0 && !["san_sang", "can_bo_sung"].contains($0.trangThai) }
    let chua = ds.filter { ["san_sang", "dang_lam", "can_bo_sung"].contains($0.trangThai) && !cho.contains($0) }
    return (cho, chua)
  }

  /// «Thứ Ba · 19:30».
  public static func thuGio(_ d: Date) -> String {
    let thu = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"]
    let c = Calendar.current.dateComponents([.weekday, .hour, .minute], from: d)
    return "\(thu[((c.weekday ?? 1) - 1) % 7]) · " + String(format: "%02d:%02d", c.hour ?? 0, c.minute ?? 0)
  }
}

/// 14/11 «Con định tắt/gỡ AiiGrow (Mac)» (docs/thiet-ke-chot/con-cai-mac 60 them-xe0zv9p7 — FR-01.05; bản Windows: agent-win ThoatView):
/// menu «Thoát AiiGrow…» ⇒ cửa sổ «Cần mã của Ba Mẹ». Mở là báo Ba Mẹ (IPC `baoThoat` ⇒ sự kiện `con_muon_thoat`). Gõ đúng mã 6 số của Ba Mẹ
/// (cùng mã «Ba Mẹ nhập mã», IPC `baMeMo`) ⇒ «Ba Mẹ đang dùng máy»: AiiGrow thôi giới hạn tới hạn của mã. Tray KHÔNG tự thoát / tự gỡ —
/// gỡ hẳn vẫn cần tài khoản quản trị của Ba Mẹ (go-cai.sh).
public enum ThoatMac {
  public static let menu = "Thoát AiiGrow…"
  public static let tieu = "Cần mã của Ba Mẹ"
  public static let phu = "Thoát hoặc gỡ AiiGrow phải có Ba Mẹ đồng ý."
  public static let ghiMa = "Mã 6 số trong app AiiGrow của Ba Mẹ"
  public static let quay = "Thôi, quay lại"

  /// Menu chỉ có ở phiên Con đã ghép (lệnh IPC chỉ nhận từ uid Con).
  public static func hienMenu(_ t: TrangThai?) -> Bool { t?.laPhienCon == true && t?.daGhep == true }

  /// Viên dưới ô mã theo kết quả báo Ba Mẹ: nil = đang báo (ngọc); «da_bao» / «cho_mang» / lỗi (cam — thiết kế «.chip.cam»). → (chữ, icon Fluent, cam).
  public static func chipBao(ok: Bool?, status: String?) -> (chu: String, icon: String, cam: Bool) {
    switch ok {
    case nil: return ("Đang báo Ba Mẹ…", "send", false)
    case true? where status == "cho_mang": return ("Có mạng là Ba Mẹ nhận thông báo", "wifi", true)
    case true?: return ("Ba Mẹ đã nhận thông báo", "bell", true)
    case false?: return ("Chưa báo được Ba Mẹ", "warning", true)
    }
  }

  /// Kết quả IPC `baoThoat` → (ok, status).
  public static func docBao(_ r: TraLoi?) -> (ok: Bool, status: String?) {
    if case let .thongBao(c)? = r { return (true, c) }
    return (false, nil)
  }
}
