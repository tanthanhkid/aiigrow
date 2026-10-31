// Cấu hình + token máy ở DuongDan.cauHinh (root, 0600) — kèm Policy cuối để chạy khi mất mạng (agent-win ConfigStore.cs, thay DPAPI bằng quyền tệp).
// Ghi nguyên khối: tệp tạm cùng thư mục (0600) rồi rename — mất điện giữa chừng không để lại tệp nửa vời.
import Foundation

public struct CauHinhMay: Codable, Equatable {
  public var mayChu: String = ApiClient.mayChuMacDinh
  public var deviceId: String = ""
  /// Token thiết bị (Bearer). Rỗng = chưa ghép.
  public var token: String = ""
  public var tenCon: String = ""
  /// Tên ngắn tài khoản macOS của Con.
  public var taiKhoanCon: String = ""
  public var uidCon: UInt32?
  /// Chế độ cục bộ khi Ba Mẹ chưa chọn trên app (mặc định GIÁM SÁT — như agent-win).
  public var cheDo: String = CheDoAgent.giamSat
  public var policyCuoi: Policy?
  public var policyLuc: Date?
  /// Giây Con dùng máy kể từ lần đồng bộ được policyCuoi — lưu để daemon khởi động lại vẫn trừ đúng giờ còn lại khi mất mạng.
  public var daDungGiayTuSync: Double = 0
  /// Phút dùng theo app đã đếm (giữ ~3 ngày) — gửi TỔNG mỗi lần đồng bộ (máy chủ ghi greatest).
  public var demPhut: [String: Double] = [:]
  /// Tài khoản đã bị hạ khỏi nhóm admin lúc ghép (để trả lại khi gỡ).
  public var daHaQuyen: [String] = []
  public var lienLacCuoi: Date?
  /// Mốc đầu tiên máy chủ từ chối token liên tục (MoCoi.swift) — nil khi đồng bộ được.
  public var tuChoiTu: Date?
  /// Giây máy CHẠY (đồng hồ đơn điệu) kể từ lần đồng bộ được cuối — cùng lienLacCuoi quyết «mất liên lạc lâu» (MoCoi.swift).
  public var matLienLacChayGiay: Double = 0
  /// Danh sách app thật (DanhSachApp.swift): bam lần gửi được gần nhất + yeuCau «Làm mới» đã xử lý.
  public var bamAppDaGui: String?
  public var yeuCauAppDaXuLy: String?
  /// Phút chơi bằng điểm lúc MẤT MẠNG chờ gửi bù (phien/bu) — lưu đĩa, gửi trước lần dong-bo kế tiếp có mạng.
  public var phienBu: PhienBu?
  /// Mở tạm bằng mã offline của Ba Mẹ (MaOffline.swift) — giữ qua khởi động lại daemon.
  public var moTamOffline: MoTamOffline?
  /// Sự kiện chờ gửi (NhatKyMay.swift) — lưu đĩa, xoá khi máy chủ nhận.
  public var hangDoiSuKien: [SuKienMay] = []

  public init() {}
  public var daGhep: Bool { !token.isEmpty }

  public init(from decoder: Decoder) throws {
    let c = try decoder.container(keyedBy: CodingKeys.self)
    func g<T: Decodable>(_ k: CodingKeys, _ m: T) -> T { ((try? c.decodeIfPresent(T.self, forKey: k)) ?? nil) ?? m }
    mayChu = g(.mayChu, ApiClient.mayChuMacDinh); deviceId = g(.deviceId, ""); token = g(.token, ""); tenCon = g(.tenCon, "")
    taiKhoanCon = g(.taiKhoanCon, ""); uidCon = (try? c.decodeIfPresent(UInt32.self, forKey: .uidCon)) ?? nil
    cheDo = CheDoAgent.chuan(g(.cheDo, "")) ?? CheDoAgent.giamSat
    policyCuoi = (try? c.decodeIfPresent(Policy.self, forKey: .policyCuoi)) ?? nil
    policyLuc = (try? c.decodeIfPresent(Date.self, forKey: .policyLuc)) ?? nil
    daDungGiayTuSync = g(.daDungGiayTuSync, 0); demPhut = g(.demPhut, [:]); daHaQuyen = g(.daHaQuyen, [])
    lienLacCuoi = (try? c.decodeIfPresent(Date.self, forKey: .lienLacCuoi)) ?? nil
    tuChoiTu = (try? c.decodeIfPresent(Date.self, forKey: .tuChoiTu)) ?? nil
    matLienLacChayGiay = g(.matLienLacChayGiay, 0)
    bamAppDaGui = (try? c.decodeIfPresent(String.self, forKey: .bamAppDaGui)) ?? nil
    yeuCauAppDaXuLy = (try? c.decodeIfPresent(String.self, forKey: .yeuCauAppDaXuLy)) ?? nil
    moTamOffline = (try? c.decodeIfPresent(MoTamOffline.self, forKey: .moTamOffline)) ?? nil
    hangDoiSuKien = g(.hangDoiSuKien, [])
    phienBu = (try? c.decodeIfPresent(PhienBu.self, forKey: .phienBu)) ?? nil
  }
}

/// Phiên chơi đang đếm bù khi mất mạng (agent-win PhienOffline): `ma` một lần ⇒ gửi lại không trừ đôi.
public struct PhienBu: Codable, Equatable {
  public var ma: String
  public var id: String
  public var muc: String
  public var giay: Double
  public var batDau: Date
  public var ketThuc: Date
  public init(ma: String = UUID().uuidString, id: String, muc: String, giay: Double = 0, batDau: Date, ketThuc: Date) {
    self.ma = ma; self.id = id; self.muc = muc; self.giay = giay; self.batDau = batDau; self.ketThuc = ketThuc
  }
  public var than: [String: Any] {
    ["ma": ma, "id": id, "muc": muc, "phut": (giay / 60 * 100).rounded() / 100, "batDau": NgayGio.viet(batDau), "ketThuc": NgayGio.viet(ketThuc)]
  }
}

public final class ConfigStore {
  public let duongDan: String
  private let khoa = NSLock()

  /// `duongDan` đổi được để test / chạy thử (--cau-hinh).
  public init(duongDan: String = DuongDan.cauHinh) { self.duongDan = duongDan }

  /// nil nếu chưa có hoặc hỏng (daemon coi như chưa ghép).
  public func doc() -> CauHinhMay? {
    khoa.lock(); defer { khoa.unlock() }
    guard let d = FileManager.default.contents(atPath: duongDan) else { return nil }
    return try? NgayGio.decoder.decode(CauHinhMay.self, from: d)
  }

  public func ghi(_ c: CauHinhMay) throws {
    khoa.lock(); defer { khoa.unlock() }
    let d = try NgayGio.encoder.encode(c)
    try GhiTep.nguyenKhoi(d, vao: duongDan, quyen: 0o600)
  }

  /// Đọc – sửa – ghi trong một khoá.
  @discardableResult
  public func sua(_ f: (inout CauHinhMay) -> Void) throws -> CauHinhMay {
    var c = doc() ?? CauHinhMay()
    f(&c)
    try ghi(c)
    return c
  }
}

public enum GhiTep {
  /// Ghi nguyên khối: tệp tạm cùng thư mục với quyền `quyen` ngay từ lúc tạo, fsync, rồi rename đè tệp chính.
  public static func nguyenKhoi(_ d: Data, vao duongDan: String, quyen: mode_t) throws {
    let thuMuc = (duongDan as NSString).deletingLastPathComponent
    try FileManager.default.createDirectory(atPath: thuMuc, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o755])
    let tam = duongDan + ".\(UUID().uuidString).tmp"
    let fd = open(tam, O_WRONLY | O_CREAT | O_EXCL, quyen)
    guard fd >= 0 else { throw LoiApi(chu: "Không tạo được \(tam): \(String(cString: strerror(errno)))") }
    var ok = true
    d.withUnsafeBytes { b in
      var da = 0
      while da < b.count {
        let n = write(fd, b.baseAddress! + da, b.count - da)
        if n <= 0 { ok = false; break }
        da += n
      }
    }
    fchmod(fd, quyen)               // umask không được nới quyền
    fsync(fd)
    close(fd)
    guard ok, rename(tam, duongDan) == 0 else {
      unlink(tam)
      throw LoiApi(chu: "Không ghi được \(duongDan)")
    }
  }
}
