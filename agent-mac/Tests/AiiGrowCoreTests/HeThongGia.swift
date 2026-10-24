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

  func guiTinHieu(pid: Int32, tinHieu: Int32) { tinHieuDaGui.append((pid, tinHieu)) }
  func ghiTep(_ duongDan: String, _ d: Data, quyen: Int) throws { tep[duongDan] = d }
  func xoaTep(_ duongDan: String) { tep[duongDan] = nil }
  func xoaBoNhoDNS() { daXoaDNS += 1 }
  func haQuyenAdmin(taiKhoan: String) throws { daHaQuyen.append(taiKhoan); admin.remove(taiKhoan) }
  func dongPhien(uid: UInt32) throws { daDongPhien.append(uid) }
  func ghiLog(_ s: String) { log.append(s) }
}

/// Máy chủ giả — kịch bản đặt sẵn, ghi lại các lần gọi.
final class MayChuGia: MayChuApi, @unchecked Sendable {
  var ghepTraVe: KetQuaGhep?
  var ghepLoi: LoiApi?
  var dongBoTraVe: KetQuaDongBo?
  var dongBoLoi: LoiApi?
  var yeuCauTraVe = KetQuaYeuCau(id: "yc1", trangThai: "cho")

  var lanGhep: [(ma: String, tenMay: String)] = []
  var lanDongBo: [(TrangThaiAgent, [MucDung])] = []
  var lanYeuCau: [(loai: String, phut: Int?, giaTri: String?, lyDo: String)] = []

  func ghep(ma: String, tenMay: String) async throws -> KetQuaGhep {
    lanGhep.append((ma, tenMay))
    if let e = ghepLoi { throw e }
    return ghepTraVe ?? KetQuaGhep(deviceId: "dev1", token: "tok1", childName: "Bé Bo", server: nil)
  }
  func dongBo(trangThai: TrangThaiAgent, dung: [MucDung], luc: Date) async throws -> KetQuaDongBo {
    lanDongBo.append((trangThai, dung))
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
