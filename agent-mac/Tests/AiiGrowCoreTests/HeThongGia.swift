// Bản giả của HeThong + MayChuApi cho test — ghi lại mọi tác động để kiểm, không đụng máy thật.
import Foundation
@testable import AiiGrowCore

final class HeThongGia: HeThong, @unchecked Sendable {
  var tienTrinhTheoUid: [UInt32: [TienTrinh]] = [:]
  var conSongPid: Set<Int32> = []
  var tep: [String: Data] = [:]
  var uidTheoTen: [String: UInt32] = [:]
  var admin: Set<String> = []
  var phien: PhienConsole?
  var ten = "Mac-Test"
  var tienCanhThat: String?                 // app tiền cảnh THẬT của phiên Con (daemon tự kiểm)

  // ghi lại tác động
  var tinHieuDaGui: [(Int32, Int32)] = []
  var daXoaDNS = 0
  var daHaQuyen: [String] = []
  var daDongPhien: [UInt32] = []
  var log: [String] = []

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
  var soLanKiemTienCanh = 0
  var soLanChayTrinhGo = 0
  var loiHaQuyen: Error?
  func chayTrinhGo() { soLanChayTrinhGo += 1 }
  var goDangChay = false
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
  var pkgutilRa: (Int32, String) = (0, HeThongGia.chuKyDungMau)
  var spctlRa: (Int32, String) = (0, "accepted")
  var loiCaiGoi: Error?
  var daCaiGoi: [String] = []
  var daTaoThuMuc: [String] = []
  var caiDangChayGia = false
  func chuyenTep(_ nguon: String, vao dich: String, quyen: Int) throws { tep[dich] = try Data(contentsOf: URL(fileURLWithPath: nguon)) }
  func caiDangChay() -> Bool { caiDangChayGia }
  func taoThuMuc(_ duongDan: String, quyen: Int) throws { daTaoThuMuc.append(duongDan) }
  func kiemChuKyGoi(_ duongDan: String) -> (Int32, String) { pkgutilRa }
  func kiemSpctlGoi(_ duongDan: String) -> (Int32, String) { spctlRa }
  func caiGoi(_ duongDan: String) throws { if let e = loiCaiGoi { throw e }; daCaiGoi.append(duongDan); sauCaiGoi?() }
  var sauCaiGoi: (() -> Void)?
  var daDungCai = 0
  func dungCai() { daDungCai += 1 }

  func guiTinHieu(pid: Int32, tinHieu: Int32) { tinHieuDaGui.append((pid, tinHieu)) }
  func ghiTep(_ duongDan: String, _ d: Data, quyen: Int) throws { tep[duongDan] = d }
  func xoaTep(_ duongDan: String) { tep[duongDan] = nil }
  func xoaBoNhoDNS() { daXoaDNS += 1 }
  var truocHaQuyen: (() -> Void)?
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

  var lanGhep: [(ma: String, tenMay: String)] = []
  var lanDongBo: [(TrangThaiAgent, [MucDung])] = []
  var lanYeuCau: [(loai: String, phut: Int?, giaTri: String?, lyDo: String)] = []

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
