// Giao thức daemon ⇄ tray — CHỖ NỐI giữa hai phần, đổi thì đổi cả hai bên + THIET-KE.md mục 3.
// Unix socket `DuongDan.socket`, mỗi yêu cầu MỘT dòng JSON, daemon trả MỘT dòng JSON rồi đóng.
// Daemon kiểm người gọi bằng getpeereid: lệnh của Con chỉ nhận từ uid tài khoản Con; `ghep` chỉ nhận từ uid thuộc nhóm admin và khi máy chưa ghép.
import Foundation

public enum DuongDan {
  public static let thuMuc = "/Library/Application Support/AiiGrow"
  public static let cauHinh = thuMuc + "/config.json"          // root 0600 — token máy, uid Con, Policy cuối
  public static let socket = "/var/run/aiigrow.sock"            // root tạo, quyền 0666, kiểm uid ở từng lệnh
  public static let log = "/Library/Logs/AiiGrow"
  public static let daemonPlist = "/Library/LaunchDaemons/vn.aiilab.aiigrow.daemon.plist"
  public static let trayPlist = "/Library/LaunchAgents/vn.aiilab.aiigrow.tray.plist"
  public static let daGo = "/var/db/aiigrow-da-go"                // dấu «máy đã bị gỡ» — tuGo/go-cai.sh ghi; bộ cập nhật + postinstall (cài tự động) tôn trọng
  public static let goCaiDangChay = "/var/run/aiigrow-go-cai"      // go-cai.sh ghi PID của mình suốt lúc chạy (cả chạy tay); xoá khi thoát
  public static let dangCapNhat = "/var/run/aiigrow-capnhat"      // job tự cập nhật ghi PID của sh job; postinstall chỉ coi là «cài tự động» khi PID còn sống; go-cai.sh xoá
  public static let app = "/Applications/AiiGrow.app"            // tray (LSUIElement), daemon nằm ở Contents/MacOS/aiigrow-daemon
}

/// Tray → daemon.
public enum YeuCauTray: Codable, Equatable {
  /// tray hỏi mỗi 5 giây
  case trangThai
  /// tray báo «còn sống» (thay appTienCanh) — daemon KHÔNG tin app tiền cảnh tray báo, tự kiểm
  case ping
  /// tray đời cũ gửi — daemon coi như `ping`, bỏ nội dung
  case appTienCanh(bundleId: String, ten: String)
  /// Con xin thêm giờ (30/60/120 phút)
  case xinThem(phut: Int, loiNhan: String?)
  /// Con xin mở một trang web / app đang bị chặn
  case xinMo(muc: String, loai: String, loiNhan: String?)
  /// Ba Mẹ (admin) ghép máy lần đầu: mã 6 số trong app + tên tài khoản macOS của Con (short name)
  case ghep(ma: String, taiKhoanCon: String)
  /// Ba Mẹ (admin) bấm «Kiểm tra cập nhật»: daemon hỏi manifest ngay; có bản mới thì tải + cài nền. Trả `.thongBao`.
  case capNhat
  /// App của Con (nhiệm vụ / nộp bài / phần quà / tin nhắn): daemon chuyển tới `api/device/<path>` bằng token máy (CHỈ đường trong
  /// `HocVienPaths`, như agent-win PipeCmd.HocVien) và trả JSON nguyên văn ở `.duLieu`. `than` = thân JSON (chuỗi) cho POST.
  case hocVien(method: String, path: String, than: String?)
  /// «Chơi bằng điểm»: daemon xét (phien/xet) rồi mở (phien/mo) cho `muc` — chỉ mục trong `playChoices` của Policy. Trả `.choi`.
  case choi(muc: String)
  /// Hỏi «đổi được khoảng bao nhiêu phút» cho `muc` (phien/xet, nhớ 60/15 giây) — chỉ trả SỐ PHÚT, không trả số điểm. Trả `.choi`.
  case choiThu(muc: String)
}

/// Chế độ máy đang áp — cùng nghĩa với `mode` của server (tu_do / hoc / khoa).
public enum CheDo: String, Codable { case tuDo = "tu_do", hoc, khoa }

/// Daemon → tray (trả lời `trangThai`).
public struct TrangThai: Codable, Equatable {
  public var daGhep: Bool
  public var laPhienCon: Bool              // phiên gọi có phải tài khoản Con không
  public var tenCon: String?
  public var cheDo: CheDo
  public var lyDoKhoa: String?             // "het_gio" | "gio_ngu" | "ba_me_khoa" | ... — tray dịch ra câu
  public var conPhut: Int?                 // phút giải trí còn lại hôm nay (nil = không giới hạn)
  public var moDen: Date?                  // cửa sổ mở (được thêm giờ) tới lúc nào
  public var khoaDen: Date?                // «Khoá ngay» có hạn
  public var demNguocGiay: Int?            // >0: sắp khoá phiên, tray hiện màn đếm ngược
  public var yeuCauCho: [YeuCauDangCho]
  public var duocDoiDiem: Bool             // KHÔNG bao giờ có số điểm
  public var matMang: Bool                 // đang chạy theo Policy nhớ
  public var trangChan: [String]           // tên miền đang chặn (để tray giải thích khi Con hỏi)
  public var capNhat: String?              // trạng thái tự cập nhật («Đang là bản mới nhất (0.1.1)»…) — KHÔNG trả cho phiên Con
  public var capNhatLuc: Date?
  public var banDaemon: String?            // bản daemon ĐANG chạy (tray cũ chưa nạp lại vẫn hiện đúng bản thật); nil = daemon cũ chưa gửi
  public var canhBaoAdmin: String?         // Con còn quyền admin: câu cảnh báo + cách xử lý cho Ba Mẹ (KHÔNG trả cho phiên Con; máy chủ vẫn nhận conLaAdmin)
  /// App / trang Giải trí Ba Mẹ cho đổi điểm (Policy.playChoices) — cửa sổ «Chơi bằng điểm». nil = daemon cũ.
  public var dsChoi: [String]?
  /// App vừa bị AiiGrow đóng trong phiên Con (màn «… chưa được mở»): `chanSeq` tăng mỗi lần đóng một app MỚI; nil = chưa có / daemon cũ.
  public var chanSeq: Int?
  public var chanApp: String?               // bundle id (chữ thường)
  public var chanTen: String?               // tên hiển thị (tên .app)
  public var chanLyDo: String?              // «ba_me_chan» | «chi_app_hoc» | «trinh_duyet»
  public init(daGhep: Bool, laPhienCon: Bool, tenCon: String?, cheDo: CheDo, lyDoKhoa: String?, conPhut: Int?, moDen: Date?, khoaDen: Date?,
              demNguocGiay: Int?, yeuCauCho: [YeuCauDangCho], duocDoiDiem: Bool, matMang: Bool, trangChan: [String], canhBaoAdmin: String? = nil, capNhat: String? = nil, capNhatLuc: Date? = nil) {
    self.daGhep = daGhep; self.laPhienCon = laPhienCon; self.tenCon = tenCon; self.cheDo = cheDo; self.lyDoKhoa = lyDoKhoa; self.conPhut = conPhut
    self.moDen = moDen; self.khoaDen = khoaDen; self.demNguocGiay = demNguocGiay; self.yeuCauCho = yeuCauCho; self.duocDoiDiem = duocDoiDiem
    self.matMang = matMang; self.trangChan = trangChan; self.canhBaoAdmin = canhBaoAdmin
    self.capNhat = capNhat; self.capNhatLuc = capNhatLuc
  }
}

public struct YeuCauDangCho: Codable, Equatable {
  public var id: String
  public var loai: String                  // them_gio | mo_web | cai_app
  public var phut: Int?
  public var trangThai: String             // cho | duyet | tu_choi
  public init(id: String, loai: String, phut: Int?, trangThai: String) { self.id = id; self.loai = loai; self.phut = phut; self.trangThai = trangThai }
}

/// Daemon trả mọi lệnh bằng một trong hai.
public enum TraLoi: Codable, Equatable {
  case trangThai(TrangThai)
  case ok(id: String?)
  case canhBao(id: String?, chu: String)   // thành công nhưng có điều Ba Mẹ cần biết (vd chưa hạ được quyền admin của Con)
  case thongBao(chu: String)               // câu kết quả (vd «Đang là bản mới nhất (0.1.1)»)
  case loi(ma: String, chu: String)        // chu: câu tiếng Việt hiện thẳng cho người dùng
  /// Lệnh `hocVien`: thân JSON máy chủ trả (nguyên văn).
  case duLieu(json: String)
  /// Lệnh `choi` / `choiThu`: «duoc» | «tu_choi» | «mo» | «khong_co_muc»…; `phut` = số phút chơi (làm tròn xuống); `chu` = câu máy chủ soạn.
  case choi(trangThai: String, phut: Int?, chu: String?)
}

public enum IPCMa {
  public static let encoder: JSONEncoder = { let e = JSONEncoder(); e.dateEncodingStrategy = .iso8601; return e }()
  public static let decoder: JSONDecoder = { let d = JSONDecoder(); d.dateDecodingStrategy = .iso8601; return d }()
}
