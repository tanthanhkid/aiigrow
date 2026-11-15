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
  /// Token gói cài một chạm (postinstall đọc từ tên `AiiGrow_<token>.pkg`) — root 0600; ghép xong / token hỏng thì xoá.
  public static let tokenGoi = thuMuc + "/goi-cai-token"
}

/// Tray → daemon.
public enum YeuCauTray: Codable, Equatable {
  /// tray hỏi mỗi 5 giây
  case trangThai
  /// tray báo «còn sống» (thay appTienCanh) — daemon KHÔNG tin app tiền cảnh tray báo, tự kiểm
  case ping
  /// tray đời cũ gửi — daemon coi như `ping`, bỏ nội dung
  case appTienCanh(bundleId: String, ten: String)
  /// (cũ — tray trước 15/11) xin thêm giờ ⇒ daemon coi như `xinVay(soSao: phut)`.
  case xinThem(phut: Int, loiNhan: String?)
  /// #263 «Xin Ba Mẹ cho vay sao» (10 / 15 / 30): `mucDich` «choi» | «qua» (+ `quaId`). Mất mạng ⇒ daemon lưu, có mạng tự gửi. Trả `.ok(id)` | `.thongBao("cho_mang")` | `.loi`.
  case xinVay(soSao: Int, mucDich: String?, quaId: String?, loiNhan: String?)
  /// Con xin mở một trang web / app đang bị chặn («Xin Ba Mẹ duyệt» — daemon gọi api/device/xin-duyet)
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
  /// Con gõ mã mở offline Ba Mẹ đọc (MaOffline.swift) — daemon tự kiểm, không cần máy chủ. Trả `.thongBao` (mở được) hoặc `.loi`.
  case maOffline(ma: String)
  /// Ba Mẹ (admin) lấy hồ sơ DNS gia đình (GET api/device/ho-so-dns) ⇒ `.duLieu(json)` có `apple.mobileconfig` + `apple.tep`.
  case hoSoDns
  // ---- 06/11 PIN theo bé (L13, PinBe.swift) — chỉ từ uid tài khoản Con (màn chọn tên chạy trong phiên đó)
  /// «Ai đang dùng máy?» ⇒ `.duLieu(json HoSoMay)` (KHÔNG có vân PIN). Mất mạng ⇒ bản nhớ.
  case hoSo
  /// Chạm tên + PIN ⇒ `.pin(ketQua: "ok", …)` | `.pin("pin_sai", conLan)` | `.pin("pin_tam_khoa", choGiay)` | `.loi`.
  case dangNhapBe(con: String, pin: String?)
  /// «Báo Ba Mẹ giúp con» ⇒ `.thongBao` | `.loi`.
  case quenPin(con: String)
  /// «Ba Mẹ nhập mã» (mã mở máy 6 số) ⇒ `.thongBao` (Ba Mẹ đang dùng máy) | `.pin("ma_sai", conLan)` | `.pin("ma_tam_khoa", choGiay)` | `.loi`.
  case baMeMo(ma: String)
  /// «Đổi bé / Đăng xuất» của bé ⇒ máy về màn chọn tên.
  case dangXuat
  /// «Khoá lại» khi Ba Mẹ dùng xong ⇒ máy về màn chọn tên.
  case khoaLai
  /// 14/11 (con-cai-mac 60 — FR-01.05): Con bấm «Thoát AiiGrow…» ⇒ daemon báo Ba Mẹ ngay (sự kiện `con_muon_thoat`, mất mạng thì vào
  /// hàng đợi sự kiện). Trả `.thongBao("da_bao" | "cho_mang")`. Không tắt gì — tắt / gỡ chỉ khi Ba Mẹ gõ mã 6 số (`baMeMo`).
  case baoThoat
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
  public var conPhut: Int?                 // phút còn theo minutesLeft cũ (máy chủ 15/11 không gửi ⇒ nil); sao = phút ở `soSao` / `phutSao`
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
  /// Đang mở tạm bằng mã offline của Ba Mẹ tới lúc này (nil = không).
  public var moOfflineDen: Date?
  /// Màn khoá hiện ô «Mất mạng? Nhập mã của Ba Mẹ» (mất mạng + lý do khoá mã gỡ được). nil/false = không.
  public var nhapMaOffline: Bool?
  /// Phút đã dùng hôm nay theo app (bundle id, nhiều nhất trước) — mục Hôm nay của app Con. Chỉ cho phiên Con.
  public var homNayTheoApp: [MucDung]?
  /// Sổ sao 15/11 (#263–#266): số dư (âm được) + nợ, phút / số dư đã trừ tại chỗ. nil = máy chủ cũ / chưa chọn bé. Chỉ cho phiên Con.
  public var soSao: SoSao?
  /// Sao còn tiêu được = phút «Tính phút» còn chơi (đếm lùi tại chỗ). nil = không giới hạn («Mở hết») / không biết.
  public var phutSao: Int?
  /// #262: Con ở «Mở hết» — không chặn, không tính phút.
  public var moHet: Bool?
  /// Danh sách của Con (bundle id / tên miền): nhóm «Tính phút» / «Không tính phút» — màn «… chưa có trong danh sách».
  public var dsTinhPhut: [String]?
  public var dsKhongTinhPhut: [String]?
  /// App «Tính phút» đang ở tiền cảnh (đang trừ sao) — nhắc «Còn 5 sao» ghi «Hết sao thì Roblox dừng».
  public var dangTinhPhut: String?
  /// 06/11 PIN theo bé: «chua» (máy khoá ⇒ màn chọn tên) | «con» | «ba_me». nil = máy chủ / daemon cũ (không màn chọn tên). Chỉ cho phiên Con.
  public var nguoiDung: String?
  public var beId: String?
  public var beTen: String?
  /// «Ba Mẹ đang dùng máy» tới lúc này.
  public var baMeDungDen: Date?
  /// Máy chỉ gán một bé.
  public var mayRieng: Bool?
  /// Máy chưa ghép nhưng có token gói cài một chạm ⇒ cửa sổ Ghép chỉ hỏi tài khoản của Con, không hỏi mã 6 số. Chỉ cho phiên Ba Mẹ.
  public var coGoiCai: Bool?
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
  public var loai: String                  // vay_sao | mo_web | cai_app (them_gio cũ)
  public var phut: Int?                    // vay_sao: số sao xin vay
  public var trangThai: String             // cho | duyet | tu_choi | het_han
  /// App / trang xin mở (tên hiện), mục đích vay («choi» | «qua»), quà (tên) — để tray soạn câu.
  public var muc: String?
  public var mucDich: String?
  /// Kết quả máy chủ (#258): da_them | mo_tam | chua_them …, nhóm khi đã thêm, người duyệt («Mẹ Lan»), lời nhắn.
  public var ketQua: String?
  public var nhom: String?
  public var tenNguoiDuyet: String?
  public var loiNhan: String?
  public var moTamPhut: Int?
  /// Lúc Con gửi (hoặc lúc lưu khi mất mạng).
  public var luc: Date?
  /// Mất mạng: đã lưu, có mạng daemon tự gửi (id tạm).
  public var choMang: Bool?
  public init(id: String, loai: String, phut: Int?, trangThai: String, muc: String? = nil, mucDich: String? = nil, luc: Date? = nil, choMang: Bool? = nil) {
    self.id = id; self.loai = loai; self.phut = phut; self.trangThai = trangThai; self.muc = muc; self.mucDich = mucDich; self.luc = luc; self.choMang = choMang
  }
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
  /// Lệnh PIN / mã Ba Mẹ: «ok» | «pin_sai» | «pin_tam_khoa» | «ma_sai» | «ma_tam_khoa» | «ma_da_dung»…
  case pin(ketQua: String, conLan: Int?, choGiay: Int?, chu: String)
}

public enum IPCMa {
  public static let encoder: JSONEncoder = { let e = JSONEncoder(); e.dateEncodingStrategy = .iso8601; return e }()
  public static let decoder: JSONDecoder = { let d = JSONDecoder(); d.dateDecodingStrategy = .iso8601; return d }()
}
