// Mô hình dữ liệu dùng chung của tác tử Mac — cùng hình dạng JSON với agent-win (AiiGrow.Core/Models.cs) để máy chủ đọc như một.
import Foundation

public enum PhienBan {
  /// Bản tác tử Mac — gửi lên máy chủ ở header X-AiiGrow-Ban và status.version (server/lib/ban-agent.ts).
  public static let hienTai = "0.1.5"
}

/// Chế độ chạy tác tử do Ba Mẹ chọn (dong-bo.<nền>.cheDo). Mặc định GIÁM SÁT: chỉ ghi việc SẼ làm, không đóng app, không khoá — như agent-win.
public enum CheDoAgent {
  public static let giamSat = "giam-sat"
  public static let chan = "chan"
  /// Chuẩn hoá: chỉ nhận đúng hai giá trị, còn lại ⇒ nil (Ba Mẹ chưa chọn).
  public static func chuan(_ s: String?) -> String? {
    switch (s ?? "").trimmingCharacters(in: .whitespaces).lowercased() {
    case giamSat: return giamSat
    case chan: return chan
    default: return nil
    }
  }
}

/// Lý do khoá máy chủ gửi (lockReason) — agent-win LockReasons.
public enum LyDoKhoa {
  public static let khoa = "khoa"
  public static let ngu = "ngu"
  public static let hetGio = "het_gio"

  /// Dịch sang từ của tray (IPC.swift › TrangThai.lyDoKhoa).
  public static func choTray(_ s: String?) -> String? {
    switch s {
    case nil: return nil
    case khoa: return "ba_me_khoa"
    case ngu: return "gio_ngu"
    default: return s
    }
  }
}

/// Lọc web theo tên miền (server/lib/web.ts › ChinhSachWeb).
public struct ChinhSachWeb: Codable, Equatable {
  public static let mo = "mo"
  public static let chiChoPhep = "chi_cho_phep"
  public var cheDo: String
  public var chan: [String]
  public var cho: [String]
  /// Mục trong `cho` chỉ mở nhờ cửa sổ «mở» có hạn — hết hạn lúc mất mạng thì chặn lại.
  public var choKhiMo: [String]

  public init(cheDo: String = ChinhSachWeb.mo, chan: [String] = [], cho: [String] = [], choKhiMo: [String] = []) {
    self.cheDo = cheDo; self.chan = chan; self.cho = cho; self.choKhiMo = choKhiMo
  }

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    let cd = (try? c.decodeIfPresent(String.self, forKey: .cheDo)) ?? nil
    cheDo = cd == ChinhSachWeb.chiChoPhep ? ChinhSachWeb.chiChoPhep : ChinhSachWeb.mo
    chan = ChinhSachWeb.sachDs((try? c.decodeIfPresent([String].self, forKey: .chan)) ?? nil)
    cho = ChinhSachWeb.sachDs((try? c.decodeIfPresent([String].self, forKey: .cho)) ?? nil)
    choKhiMo = ChinhSachWeb.sachDs((try? c.decodeIfPresent([String].self, forKey: .choKhiMo)) ?? nil)
  }

  /// Chuẩn hoá một tên miền: chữ thường, bỏ «*.» / «.» đầu, phải có dấu chấm và chỉ chữ-số-chấm-gạch. Sai ⇒ nil (như WebPolicy.Sach).
  public static func sach(_ s: String?) -> String? {
    var t = (s ?? "").trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
    while t.hasPrefix("*.") || t.hasPrefix(".") { t.removeFirst(t.hasPrefix("*.") ? 2 : 1) }
    guard t.count > 3, t.count <= 100, t.contains("."), !t.contains("..") else { return nil }
    let hopLe = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyz0123456789.-")
    guard t.unicodeScalars.allSatisfy({ hopLe.contains($0) }), let d = t.first, let c = t.last,
          d.isLetter || d.isNumber, c.isLetter || c.isNumber else { return nil }
    return t
  }

  static func sachDs(_ ds: [String]?) -> [String] {
    Array(Set((ds ?? []).compactMap(sach))).sorted()
  }

  /// Hết hạn «mở» mà chưa đồng bộ lại được ⇒ trang chỉ mở nhờ cửa sổ đó bị chặn lại (WebPolicy.HetMo).
  public func hetMo(_ now: Date, moDen: Date?) -> ChinhSachWeb {
    guard let den = moDen, now >= den, !choKhiMo.isEmpty else { return self }
    let bo = Set(choKhiMo)
    return ChinhSachWeb(cheDo: cheDo, chan: Array(Set(chan).union(bo)).sorted(), cho: cho.filter { !bo.contains($0) }, choKhiMo: [])
  }
}

/// Policy do máy chủ tính sẵn — tác tử chỉ áp và nhớ bản cuối (agent-win Policy). Mac đọc khối `mac` của dong-bo, máy chủ cũ thì khối `windows`.
public struct Policy: Codable, Equatable {
  public var serverTime: Date?
  public var childName: String = ""
  public var mode: String = CheDo.tuDo.rawValue
  public var locked: Bool = false
  public var lockReason: String?
  /// Mac: bundle id (chữ thường), vd «com.apple.textedit». Tên .app («pages.app») cũng nhận.
  public var allowedApps: [String] = []
  public var learningApps: [String] = []
  public var minutesLeft: Int?
  public var grantEndsAt: Date?
  public var nextCheckSec: Int = 30
  public var canExchangePoints: Bool = false
  /// Chế độ Ba Mẹ chọn trên app — «giam-sat» | «chan»; nil = chưa chọn (giữ chế độ cục bộ).
  public var cheDo: String?
  public var web: ChinhSachWeb?
  /// App Ba Mẹ đặt «Chặn» (DanhSachApp.swift) — đóng ở MỌI mode khi chặn thật.
  public var blockedApps: [AppBiChan] = []

  public init() {}

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    func s(_ k: CodingKeys) -> String? { (try? c.decodeIfPresent(String.self, forKey: k)) ?? nil }
    serverTime = NgayGio.doc(s(.serverTime))
    childName = s(.childName) ?? ""
    mode = s(.mode) ?? CheDo.tuDo.rawValue
    locked = ((try? c.decodeIfPresent(Bool.self, forKey: .locked)) ?? nil) ?? false
    lockReason = s(.lockReason)
    allowedApps = ((try? c.decodeIfPresent([String].self, forKey: .allowedApps)) ?? nil) ?? []
    learningApps = ((try? c.decodeIfPresent([String].self, forKey: .learningApps)) ?? nil) ?? []
    if let d = (try? c.decodeIfPresent(Double.self, forKey: .minutesLeft)) ?? nil, d.isFinite { minutesLeft = Int(d.rounded(.down)) }
    grantEndsAt = NgayGio.doc(s(.grantEndsAt))
    nextCheckSec = ((try? c.decodeIfPresent(Int.self, forKey: .nextCheckSec)) ?? nil) ?? 30
    canExchangePoints = ((try? c.decodeIfPresent(Bool.self, forKey: .canExchangePoints)) ?? nil) ?? false
    cheDo = s(.cheDo)
    web = (try? c.decodeIfPresent(ChinhSachWeb.self, forKey: .web)) ?? nil
    blockedApps = AppBiChan.docDs(c, .blockedApps)
  }

  public func encode(to encoder: Encoder) throws {
    var c = encoder.container(keyedBy: CodingKeys.self)
    try c.encodeIfPresent(serverTime.map(NgayGio.viet), forKey: .serverTime)
    try c.encode(childName, forKey: .childName)
    try c.encode(mode, forKey: .mode)
    try c.encode(locked, forKey: .locked)
    try c.encodeIfPresent(lockReason, forKey: .lockReason)
    try c.encode(allowedApps, forKey: .allowedApps)
    try c.encode(learningApps, forKey: .learningApps)
    try c.encodeIfPresent(minutesLeft, forKey: .minutesLeft)
    try c.encodeIfPresent(grantEndsAt.map(NgayGio.viet), forKey: .grantEndsAt)
    try c.encode(nextCheckSec, forKey: .nextCheckSec)
    try c.encode(canExchangePoints, forKey: .canExchangePoints)
    try c.encodeIfPresent(cheDo, forKey: .cheDo)
    try c.encodeIfPresent(web, forKey: .web)
    if !blockedApps.isEmpty { try c.encode(blockedApps, forKey: .blockedApps) }
  }

  enum CodingKeys: String, CodingKey {
    case serverTime, childName, mode, locked, lockReason, allowedApps, learningApps, minutesLeft, grantEndsAt, nextCheckSec, canExchangePoints, cheDo, web, blockedApps
  }
}

/// Ngày giờ ISO 8601 — máy chủ JS gửi có phần nghìn giây (toISOString), có khi không.
public enum NgayGio {
  private static let coPhanGiay: ISO8601DateFormatter = {
    let f = ISO8601DateFormatter(); f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]; return f
  }()
  private static let khongPhanGiay = ISO8601DateFormatter()
  private static let khoa = NSLock()

  public static func doc(_ s: String?) -> Date? {
    guard let s, !s.isEmpty else { return nil }
    khoa.lock(); defer { khoa.unlock() }
    return coPhanGiay.date(from: s) ?? khongPhanGiay.date(from: s)
  }

  public static func viet(_ d: Date) -> String {
    khoa.lock(); defer { khoa.unlock() }
    return coPhanGiay.string(from: d)
  }

  /// Bộ mã JSON cho cấu hình + API: ngày giờ là chuỗi ISO, đọc được cả hai dạng.
  public static let encoder: JSONEncoder = {
    let e = JSONEncoder()
    e.dateEncodingStrategy = .custom { d, enc in var c = enc.singleValueContainer(); try c.encode(viet(d)) }
    e.outputFormatting = [.sortedKeys]
    return e
  }()
  public static let decoder: JSONDecoder = {
    let d = JSONDecoder()
    d.dateDecodingStrategy = .custom { dec in
      let c = try dec.singleValueContainer()
      let s = try c.decode(String.self)
      guard let v = doc(s) else { throw DecodingError.dataCorruptedError(in: c, debugDescription: "Ngày giờ sai: \(s)") }
      return v
    }
    return d
  }()
}

/// Kết quả ghép máy (POST api/device/ghep).
public struct KetQuaGhep: Codable, Equatable {
  public var deviceId: String
  public var token: String
  public var childName: String
  public var server: String?
  public init(deviceId: String, token: String, childName: String, server: String? = nil) {
    self.deviceId = deviceId; self.token = token; self.childName = childName; self.server = server
  }
}

/// Lệnh máy chủ gửi kèm dong-bo (vd «go» = gỡ máy khỏi gia đình).
public struct LenhMay: Equatable { public var id: String; public var loai: String }

/// Kết quả dong-bo đã tách.
public struct KetQuaDongBo {
  public var policy: Policy
  public var nextCheckSec: Int
  public var lenh: [LenhMay]
  /// Tín hiệu `danhSachApp` ở gốc phản hồi (nil = máy chủ cũ).
  public var danhSachApp: TinHieuDanhSachApp?
  public init(policy: Policy, nextCheckSec: Int, lenh: [LenhMay], danhSachApp: TinHieuDanhSachApp? = nil) {
    self.policy = policy; self.nextCheckSec = nextCheckSec; self.lenh = lenh; self.danhSachApp = danhSachApp
  }
}

/// Kết quả tạo lời xin (POST api/device/yeu-cau) — `status` «cho» | «tu_duyet»; máy chủ cũ chỉ có `trang_thai`.
public struct KetQuaYeuCau: Equatable {
  public var id: String
  public var trangThai: String
  public init(id: String, trangThai: String) { self.id = id; self.trangThai = trangThai }
}

/// Trạng thái tác tử gửi kèm mỗi lần đồng bộ — cùng khoá với agent-win AgentStatus (máy chủ lưu JSON này).
public struct TrangThaiAgent: Codable, Equatable {
  public var agent = "mac"
  public var version = PhienBan.hienTai
  public var mode: String
  public var appLockerApplied = false            // macOS không có AppLocker — luôn false, giữ khoá cho máy chủ
  public var trayAlive: Bool
  public var childSessionActive: Bool
  public var offline: Bool
  public var cheDo: String
  public var moCoi = false
  public var quyen: [String: Bool]
  public var phienKhac: Bool
  public var conLaAdmin: Bool?                   // true khi tài khoản Con còn quyền admin (nil = ổn, bỏ khỏi JSON)
  public var playSeconds: Double?                // Mac chưa đo giây theo phiên chơi bằng điểm ⇒ để nil (Codable bỏ hẳn khỏi JSON) — máy chủ coi như agent đời cũ, trang khay là nguồn nhịp. Gửi 0 sẽ làm phiên bị tạm rồi đóng sau 3 phút

  public init(mode: String, trayAlive: Bool, childSessionActive: Bool, offline: Bool, cheDo: String, phienKhac: Bool) {
    self.mode = mode; self.trayAlive = trayAlive; self.childSessionActive = childSessionActive; self.offline = offline
    self.cheDo = cheDo; self.phienKhac = phienKhac
    // Như QuyenBaoVe.Tinh: khay chỉ chạy khi Con đang đăng nhập — Con chưa đăng nhập thì không tính là thiếu.
    var q: [String: Bool] = ["dichVu": true, "khay": trayAlive || !childSessionActive, "chanThat": cheDo == CheDoAgent.chan]
    if phienKhac { q["phienCon"] = false }
    self.quyen = q
  }
}

/// Phút dùng theo (ngày, app) gửi lên dong-bo: {muc, phut, day}.
public struct MucDung: Codable, Equatable {
  public var muc: String
  public var phut: Int
  public var day: String
  public init(muc: String, phut: Int, day: String) { self.muc = muc; self.phut = phut; self.day = day }
}
