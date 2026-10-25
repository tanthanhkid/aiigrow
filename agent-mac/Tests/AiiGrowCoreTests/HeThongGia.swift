// Bản giả của HeThong + MayChuApi cho test — ghi lại mọi tác động để kiểm, không đụng máy thật.
import Foundation
@testable import AiiGrowCore

/// Biến dùng chung giữa luồng test, actor và hàng đợi GCD (chayNgoaiActor): mỗi lần đọc/ghi qua khoá — không đọc/ghi đồng thời một Dictionary/Array.
/// Sửa tại chỗ (`tep[k] = v`, `.append`, `+= 1`) đi qua `_modify` giữ khoá TRỌN lượt đọc-sửa-ghi: chỉ get/set thì hai luồng cùng sửa sẽ
/// mất một bản cập nhật (đọc bản cũ, ghi đè lên nhau). Trong lượt sửa không được đọc lại chính biến đó (khoá không đệ quy).
@propertyWrapper final class Khoa<T> {
  private var v: T
  private let k = NSLock()
  init(wrappedValue: T) { v = wrappedValue }
  var wrappedValue: T {
    get { k.lock(); defer { k.unlock() }; return v }
    set { k.lock(); v = newValue; k.unlock() }
    _modify { k.lock(); defer { k.unlock() }; yield &v }
  }
}

final class HeThongGia: HeThong, @unchecked Sendable {
  @Khoa var tienTrinhTheoUid: [UInt32: [TienTrinh]] = [:]
  @Khoa var conSongPid: Set<Int32> = []
  @Khoa var tep: [String: Data] = [:]
  @Khoa var uidTheoTen: [String: UInt32] = [:]
  @Khoa var admin: Set<String> = []
  @Khoa var phien: PhienConsole?
  var ten = "Mac-Test"
  @Khoa var tienCanhThat: String?                 // app tiền cảnh THẬT của phiên Con (daemon tự kiểm)

  // ghi lại tác động
  @Khoa var tinHieuDaGui: [(Int32, Int32)] = []
  @Khoa var daXoaDNS = 0
  @Khoa var daHaQuyen: [String] = []
  @Khoa var daDongPhien: [UInt32] = []
  @Khoa var log: [String] = []

  func tienTrinh(cuaUid uid: UInt32) -> [TienTrinh] { tienTrinhTheoUid[uid] ?? [] }
  func conSong(pid: Int32) -> Bool { conSongPid.contains(pid) }
  func docTep(_ duongDan: String) -> Data? { tep[duongDan] }
  func uid(cuaTaiKhoan ten: String) -> UInt32? { uidTheoTen[ten] }
  func taiKhoan(cuaUid uid: UInt32) -> String? { uidTheoTen.first(where: { $0.value == uid })?.key }
  func laAdmin(uid: UInt32) -> Bool { uid == 0 || (taiKhoan(cuaUid: uid).map { admin.contains($0) } ?? false) }
  func dsAdmin() -> [String] { Array(admin) }
  func phienConsole() -> PhienConsole? { phien }
  func tenMay() -> String { ten }
  func appTienCanh(cuaUid uid: UInt32) -> String? { soLanKiemTienCanh += 1; return tienCanhThat }
  @Khoa var soLanKiemTienCanh = 0
  @Khoa var soLanChayTrinhGo = 0
  @Khoa var loiHaQuyen: Error?
  func chayTrinhGo() { soLanChayTrinhGo += 1 }
  @Khoa var goDangChay = false
  func trinhGoDangChay() -> Bool { goDangChay }
  func lietKeThuMuc(_ duongDan: String) -> [String] {
    let tien = duongDan.hasSuffix("/") ? duongDan : duongDan + "/"
    return Set(tep.keys.filter { $0.hasPrefix(tien) }.compactMap { $0.dropFirst(tien.count).split(separator: "/").first.map(String.init) }).sorted()
  }

  // tự cập nhật
  static let chuKyDungMau = """
  Package "AiiGrow-0.1.2.pkg":
     Status: signed by a developer certificate issued by Apple for distribution
     Notarization: trusted by the Apple notary service
     Signed with a trusted timestamp on: 2026-10-24 08:00:00 +0000
     Certificate Chain:
      1. Developer ID Installer: TAN THANH TRAN (ADUL7HT969)
         Expires: 2031-02-01 00:00:00 +0000
      2. Developer ID Certification Authority
      3. Apple Root CA
  """
  @Khoa var pkgutilRa: (Int32, String) = (0, HeThongGia.chuKyDungMau)
  @Khoa var spctlRa: (Int32, String) = (0, "accepted")
  @Khoa var loiCaiGoi: Error?
  @Khoa var daCaiGoi: [String] = []
  @Khoa var daTaoThuMuc: [String] = []
  @Khoa var caiDangChayGia = false
  func chuyenTep(_ nguon: String, vao dich: String, quyen: Int) throws { tep[dich] = try Data(contentsOf: URL(fileURLWithPath: nguon)) }
  func caiDangChay() -> Bool { caiDangChayGia }
  func taoThuMuc(_ duongDan: String, quyen: Int) throws { daTaoThuMuc.append(duongDan) }
  func kiemChuKyGoi(_ duongDan: String) -> (Int32, String) { pkgutilRa }
  func kiemSpctlGoi(_ duongDan: String) -> (Int32, String) { spctlRa }
  func caiGoi(_ duongDan: String) throws { if let e = loiCaiGoi { throw e }; daCaiGoi.append(duongDan); sauCaiGoi?() }
  @Khoa var sauCaiGoi: (() -> Void)?

  func guiTinHieu(pid: Int32, tinHieu: Int32) { tinHieuDaGui.append((pid, tinHieu)) }
  @Khoa var loiGhiTepChua: String?                // đường chứa chuỗi này ⇒ ghi lỗi (giả đĩa đầy / quyền)
  func ghiTep(_ duongDan: String, _ d: Data, quyen: Int) throws {
    if let x = loiGhiTepChua, duongDan.contains(x) { throw NSError(domain: "gia", code: 13) }
    tep[duongDan] = d
  }
  @Khoa var daXoa: [String] = []
  func xoaTep(_ duongDan: String) { tep[duongDan] = nil; daXoa.append(duongDan) }
  func xoaBoNhoDNS() { daXoaDNS += 1 }
  @Khoa var truocHaQuyen: (() -> Void)?
  func haQuyenAdmin(taiKhoan: String) throws { truocHaQuyen?(); if let e = loiHaQuyen { throw e }; daHaQuyen.append(taiKhoan); admin.remove(taiKhoan) }
  func dongPhien(uid: UInt32) throws { daDongPhien.append(uid) }
  func ghiLog(_ s: String) { log.append(s) }
}

/// Máy chủ giả — kịch bản đặt sẵn, ghi lại các lần gọi.
final class MayChuGia: MayChuApi, @unchecked Sendable {
  var ghepTraVe: KetQuaGhep?
  var ghepLoi: LoiApi?
  var khiGhep: (() -> Void)?
  var dongBoTraVe: KetQuaDongBo?
  var dongBoLoi: LoiApi?
  var yeuCauTraVe = KetQuaYeuCau(id: "yc1", trangThai: "cho")
  /// Độ trễ (ns) của dongBo — giả mạng chậm mà các request khác vẫn chạy song song.
  var treDongBo: UInt64 = 0
  var banMoiTraVe: BanMoi?
  var treBanMoi: UInt64 = 0
  func banMoi() async throws -> BanMoi? {
    if treBanMoi > 0 { try await Task.sleep(nanoseconds: treBanMoi) }
    return banMoiTraVe
  }

  @Khoa var lanGhep: [(ma: String, tenMay: String)] = []
  @Khoa var lanDongBo: [(TrangThaiAgent, [MucDung])] = []
  @Khoa var lanYeuCau: [(loai: String, phut: Int?, giaTri: String?, lyDo: String)] = []

  func ghep(ma: String, tenMay: String) async throws -> KetQuaGhep {
    lanGhep.append((ma, tenMay))
    khiGhep?()
    if let e = ghepLoi { throw e }
    return ghepTraVe ?? KetQuaGhep(deviceId: "dev1", token: "tok1", childName: "Bé Bo", server: nil)
  }
  func dongBo(trangThai: TrangThaiAgent, dung: [MucDung], luc: Date) async throws -> KetQuaDongBo {
    lanDongBo.append((trangThai, dung))
    if treDongBo > 0 { try await Task.sleep(nanoseconds: treDongBo) }
    if let e = dongBoLoi { throw e }
    if let r = dongBoTraVe { return r }
    throw LoiApi(chu: "chưa đặt dongBoTraVe")
  }
  func taoYeuCau(loai: String, phut: Int?, giaTri: String?, lyDo: String) async throws -> KetQuaYeuCau {
    lanYeuCau.append((loai, phut, giaTri, lyDo)); return yeuCauTraVe
  }
  func trangThaiYeuCau(id: String) async throws -> String { "cho" }
}

/// Đồng hồ điều khiển được cho test.
final class DongHoGia: @unchecked Sendable {
  var thuc = Date(timeIntervalSince1970: 1_760_000_000)
  var donDieu: Double = 1000
  func tien(_ giay: Double) { thuc = thuc.addingTimeInterval(giay); donDieu += giay }
}

extension KetQuaDongBo {
  static func tu(_ p: Policy, next: Int = 30, lenh: [LenhMay] = []) -> KetQuaDongBo {
    KetQuaDongBo(policy: p, nextCheckSec: next, lenh: lenh)
  }
}

func policyMau(mode: String, cheDo: String? = CheDoAgent.chan, minutesLeft: Int? = nil,
               allowed: [String] = [], web: ChinhSachWeb? = nil, grantEndsAt: Date? = nil, now: Date = Date()) -> Policy {
  var p = Policy()
  p.serverTime = now; p.mode = mode; p.cheDo = cheDo; p.minutesLeft = minutesLeft
  p.allowedApps = allowed; p.web = web; p.grantEndsAt = grantEndsAt
  p.locked = mode == CheDo.khoa.rawValue
  return p
}
