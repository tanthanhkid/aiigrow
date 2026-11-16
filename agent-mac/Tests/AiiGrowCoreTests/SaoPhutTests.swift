// Sổ sao 15/11 trên Mac (#263–#267, #258): 1 sao = 1 phút «Tính phút», số dư âm khi nợ, «Mở hết», mở bằng mã không trừ sao (phutBoiMa),
// usage theo bé (usage[].con), xin vay (có mạng / mất mạng), theo dõi Ba Mẹ trả lời lời xin.
import XCTest
@testable import AiiGrowCore

final class SaoPhutTests: XCTestCase {
  private let now = Date(timeIntervalSince1970: 1_763_200_000)

  private func pol(phutCon: Int = 10, sao: Int? = nil, no: Int = 0, tinh: [String] = ["com.roblox.roblox"]) -> Policy {
    var p = policyMau(mode: "hoc", allowed: ["com.apple.textedit"] + tinh, now: now)
    p.learningApps = ["com.apple.textedit"]
    p.appTinhGio = tinh
    p.soSao = SoSao(sao: sao ?? phutCon, no: no, phutCon: phutCon)
    return p
  }

  private func tamThuMuc() throws -> String {
    let tm = NSTemporaryDirectory() + "aiigrow-sao-\(UUID().uuidString)"
    try FileManager.default.createDirectory(atPath: tm, withIntermediateDirectories: true)
    addTeardownBlock { try? FileManager.default.removeItem(atPath: tm) }
    return tm
  }

  func testChuSao() {
    XCTAssertEqual(ChuSao.so(-20), "\u{2212}20")
    XCTAssertEqual(ChuSao.so(1020), "1.020")
    XCTAssertEqual(ChuSao.so(-1_234_567), "\u{2212}1.234.567")
    XCTAssertEqual(ChuSao.vien(30), "30 sao")
    XCTAssertEqual(ChuSao.phut(18), "còn 18 sao = 18 phút chơi")
    XCTAssertEqual(ChuSao.phut(-3), "còn 0 sao = 0 phút chơi")
    XCTAssertEqual(ChuSao.no(20), "Đang nợ Ba Mẹ 20 sao · sao nhiệm vụ trả nợ trước")
    XCTAssertNil(ChuSao.no(0))
    XCTAssertEqual(ChuSao.cauVay(15), "= 15 phút chơi hoặc đổi quà · con sẽ nợ Ba Mẹ 15 sao")
    XCTAssertEqual(ChuSao.mucVay, [10, 15, 30]); XCTAssertEqual(ChuSao.vayMacDinh, 15)
  }

  /// Gốc dong-bo mang `sao {…}` + `cheDo`; khối mac/windows giữ hình dạng cũ (`sao` là số). Lưu đĩa rồi đọc lại giữ nguyên. Máy chủ cũ ⇒ nil.
  func testDocSaoVaCheDoTuDongBo() throws {
    let raw = #"{"cheDo":"theo_danh_sach","sao":{"sao":-20,"no":30,"phutCon":10,"saoVayChuaTieu":10,"hetSao":false,"canhBaoNo":false},"windows":{"mode":"hoc","sao":-20,"appTinhGio":["com.Roblox.Roblox"]}}"#
    let kq = try ApiClient.tachDongBo(Data(raw.utf8))
    XCTAssertEqual(kq.policy.soSao, SoSao(sao: -20, no: 30, phutCon: 10, saoVayChuaTieu: 10, hetSao: false))
    XCTAssertEqual(kq.policy.saoCon, -20)
    XCTAssertFalse(kq.policy.moHet)
    XCTAssertEqual(try PolicyParser.parse(NgayGio.encoder.encode(kq.policy)), kq.policy)
    let moHet = try ApiClient.tachDongBo(Data(#"{"cheDo":"mo_het","sao":null,"windows":{"mode":"tu_do","moHet":true}}"#.utf8))
    XCTAssertTrue(moHet.policy.moHet); XCTAssertNil(moHet.policy.soSao)
    let cu = try ApiClient.tachDongBo(Data(#"{"windows":{"mode":"hoc","quyConPhut":12,"gioNgu":{"tu":"21:30","den":"06:30"},"blockedApps":["com.x"]}}"#.utf8))
    XCTAssertNil(cu.policy.soSao); XCTAssertEqual(SaoPhut.phutGoc(cu.policy), 12, "máy chủ trước sổ sao: quyConPhut")
  }

  func testDongNoiHetSaoVaSoDuTaiCho() {
    let p = pol(phutCon: 5)
    XCTAssertEqual(SaoPhut.conPhut(p, giay: 120), 3)
    XCTAssertEqual(SaoPhut.soDu(p, giay: 120), 3)
    XCTAssertFalse(SaoPhut.hetSao(p, giay: 299))
    XCTAssertTrue(SaoPhut.hetSao(p, giay: 300))
    // đang nợ: tiêu nốt 10 sao vay ⇒ số dư −20 → −30
    let no = pol(phutCon: 10, sao: -20, no: 30)
    XCTAssertEqual(SaoPhut.soDu(no, giay: 600), -30)
    XCTAssertEqual(SaoPhut.conPhut(no, giay: 600), 0)
  }

  func testApDungHetSaoDongAppTinhPhutGiuAppKhongTinhPhut() {
    var p = pol(phutCon: 1, tinh: ["com.roblox.roblox", "youtube.com"])
    p.web = ChinhSachWeb(cheDo: ChinhSachWeb.chiChoPhep, chan: [], cho: ["youtube.com", "wikipedia.org"])
    let r = SaoPhut.apDung(p, giay: 60, now: now)
    XCTAssertEqual(r.policy.allowedApps, ["com.apple.textedit"])
    XCTAssertEqual(r.policy.web?.cho, ["wikipedia.org"], "trang «Tính phút» thôi mở; trang «Không tính phút» vẫn mở")
    XCTAssertEqual(r.hetSao, ["com.roblox.roblox", "youtube.com"])
    XCTAssertTrue(r.policy.appTinhGio.isEmpty)
    XCTAssertEqual(SaoPhut.apDung(p, giay: 59, now: now).policy, p, "còn sao ⇒ không đổi")
    // «Mở hết» / mở bằng mã / Ba Mẹ đang dùng (tu_do có hạn) ⇒ không đóng gì
    var moHet = p; moHet.moHet = true
    XCTAssertTrue(SaoPhut.apDung(moHet, giay: 9_999, now: now).hetSao.isEmpty)
    XCTAssertTrue(SaoPhut.apDung(p, giay: 9_999, now: now, moBangMa: true).hetSao.isEmpty)
    var baMe = p; baMe.mode = CheDo.tuDo.rawValue; baMe.grantEndsAt = now.addingTimeInterval(600)
    XCTAssertTrue(SaoPhut.apDung(baMe, giay: 9_999, now: now).hetSao.isEmpty)
    // hết sao mà máy chủ đã gửi appTinhGio rỗng ⇒ dùng playChoices để biết app nào phải đóng
    var sau = pol(phutCon: 0, tinh: []); sau.playChoices = ["com.roblox.roblox"]; sau.allowedApps.append("com.roblox.roblox")
    XCTAssertEqual(SaoPhut.apDung(sau, giay: 0, now: now).hetSao, ["com.roblox.roblox"])
  }

  func testUsageTheoBeVaThanDongBo() throws {
    var d: [String: Double] = [:]
    DemPhut.cong(&d, ngay: "2026-11-15", app: "Com.Roblox.Roblox", giay: 600, con: "c1")
    DemPhut.cong(&d, ngay: "2026-11-15", app: "com.roblox.roblox", giay: 300, con: "c2")
    DemPhut.cong(&d, ngay: "2026-11-15", app: "com.roblox.roblox", giay: 120)
    XCTAssertEqual(DemPhut.tong(d), [MucDung(muc: "com.roblox.roblox", phut: 2, day: "2026-11-15"),
                                    MucDung(muc: "com.roblox.roblox", phut: 10, day: "2026-11-15", con: "c1"),
                                    MucDung(muc: "com.roblox.roblox", phut: 5, day: "2026-11-15", con: "c2")])
    let st = TrangThaiAgent(mode: "hoc", trayAlive: true, childSessionActive: true, offline: false, cheDo: CheDoAgent.chan, phienKhac: false)
    let than = try ApiClient.thanDongBo(trangThai: st, dung: DemPhut.tong(d), luc: now, phutBoiMa: 7)
    let usage = than["usage"] as? [[String: Any]]
    XCTAssertNil(usage?[0]["con"]); XCTAssertEqual(usage?[1]["con"] as? String, "c1")
    XCTAssertEqual(than["phutBoiMa"] as? Int, 7)
    XCTAssertNil(try ApiClient.thanDongBo(trangThai: st, dung: [], luc: now, phutBoiMa: 0)["phutBoiMa"])
  }

  func testDocHoSoSaoVaKetQuaLoiXin() {
    let h = HoSoMay.doc(Data(#"{"con":[{"id":"a","ten":"Bảo Anh","coPin":true,"sao":30,"no":0},{"id":"m","ten":"Bảo Minh","coPin":true,"sao":-20,"no":20}]}"#.utf8))
    XCTAssertEqual(h?.con.map(\.sao), [30, -20]); XCTAssertEqual(h?.con.last?.no, 20)
    let k = KetQuaLoiXin.doc(Data(#"{"status":"duoc","trangThai":"dong_y","ketQua":"da_them","nhom":"tinh_phut","muc":"youtube.com","tenNguoiDuyet":"Mẹ Lan","loiNhan":"Xem xong nghỉ mắt"}"#.utf8))
    XCTAssertEqual(k?.trangThaiTray, "duyet"); XCTAssertEqual(k?.nhom, "tinh_phut"); XCTAssertEqual(k?.tenNguoiDuyet, "Mẹ Lan")
    let tam = KetQuaLoiXin.doc(Data(#"{"status":"duoc","ketQua":"mo_tam","moTam":{"den":"2026-11-15T12:00:00.000Z","phut":30}}"#.utf8))
    XCTAssertEqual(tam?.trangThaiTray, "duyet"); XCTAssertEqual(tam?.moTamPhut, 30); XCTAssertNotNil(tam?.moTamDen)
    XCTAssertEqual(KetQuaLoiXin(status: "tu_choi", ketQua: "chua_them").trangThaiTray, "tu_choi")
    XCTAssertEqual(KetQuaLoiXin(status: "tu_choi", trangThai: "het_han").trangThaiTray, "het_han")
    XCTAssertEqual(KetQuaLoiXin(status: "cho", ketQua: "cho").trangThaiTray, "cho", "«Bỏ qua» 60 giây đầu vẫn là chờ")
    XCTAssertTrue(HocVienPaths.duoc(method: "GET", path: "hoc-vien/sao"))
    XCTAssertFalse(HocVienPaths.duoc(method: "POST", path: "hoc-vien/doi-sao"), "đổi sao lấy giờ đã bỏ")
  }

  // MARK: daemon

  private func boMay(_ tm: String, api: MayChuGia, fake: HeThongGia, dongHo: DongHoGia, sua: (inout CauHinhMay) -> Void = { _ in }) throws -> (BoMay, ConfigStore) {
    let kho = ConfigStore(duongDan: tm + "/config.json")
    try kho.sua { $0.token = "t"; $0.deviceId = "d"; $0.uidCon = 501; $0.taiKhoanCon = "be"; sua(&$0) }
    fake.uidTheoTen = ["be": 501]
    fake.phien = PhienConsole(uid: 501, manKhoa: false)
    let b = BoMay(api: api, heThong: fake, kho: kho,
                  tuyChon: TuyChonBoMay(duongDanHosts: tm + "/hosts", thuMucChinhSach: tm + "/Managed", tienCanhDongBo: true, tuCapNhat: false),
                  dongHo: { dongHo.thuc }, donDieu: { dongHo.donDieu })
    return (b, kho)
  }

  /// Sao đếm lùi CHỈ khi app «Tính phút» ở tiền cảnh; mất mạng vẫn đếm; hết ⇒ đóng app + lý do «het_sao» cho tray.
  func testBoMayDemSaoKeCaMatMang() async throws {
    let tm = try tamThuMuc()
    let fake = HeThongGia(), dongHo = DongHoGia(), api = MayChuGia()
    var p = policyMau(mode: CheDo.hoc.rawValue, allowed: ["com.roblox.roblox"], now: dongHo.thuc)
    p.appTinhGio = ["com.roblox.roblox"]; p.learningApps = ["com.apple.textedit"]; p.soSao = SoSao(sao: 1, phutCon: 1)
    api.dongBoTraVe = .tu(p, next: 600)
    let (b, kho) = try boMay(tm, api: api, fake: fake, dongHo: dongHo)
    let game = TienTrinh(pid: 77, uid: 501, duongDan: "/Applications/Roblox.app/Contents/MacOS/Roblox", bundleId: "com.roblox.roblox")
    fake.tienTrinhTheoUid = [501: [game]]; fake.conSongPid = [77]
    _ = await b.motVong()
    fake.tienCanhThat = "com.apple.textedit"                      // app «Không tính phút»: không tốn sao
    for _ in 0..<20 { dongHo.tien(5); _ = await b.apChinhSach() }
    XCTAssertEqual(kho.doc()?.quyGiayTuSync ?? -1, 0, accuracy: 0.01)
    XCTAssertTrue(fake.tinHieuDaGui.isEmpty)
    api.dongBoTraVe = nil; api.dongBoLoi = LoiApi(chu: "mất mạng")
    fake.tienCanhThat = "com.roblox.roblox"
    for _ in 0..<14 { dongHo.tien(5); _ = await b.motVong() }
    XCTAssertGreaterThanOrEqual(kho.doc()?.quyGiayTuSync ?? 0, 60)
    XCTAssertTrue(fake.tinHieuDaGui.contains { $0.0 == 77 }, "hết sao lúc mất mạng ⇒ đóng game")
    guard case let .trangThai(s) = await b.xuLyIPC(.trangThai, uidGoi: 501) else { return XCTFail() }
    XCTAssertEqual(s.phutSao, 0); XCTAssertEqual(s.soSao?.sao, 0); XCTAssertEqual(s.soSao?.hetSao, true)
    XCTAssertEqual(s.chanLyDo, SaoPhut.lyDoHetSao)
    XCTAssertEqual(s.dsTinhPhut, ["com.roblox.roblox"]); XCTAssertEqual(s.dsKhongTinhPhut, ["com.apple.textedit"])
  }

  /// «Mở hết»: không đếm, không đóng. Mở bằng mã offline: không trừ sao, đếm vào phutBoiMa, gửi ở lần đồng bộ kế.
  func testBoMayMoHetVaMoBangMa() async throws {
    let tm = try tamThuMuc()
    let fake = HeThongGia(), dongHo = DongHoGia(), api = MayChuGia()
    var p = policyMau(mode: CheDo.hoc.rawValue, allowed: ["com.roblox.roblox"], now: dongHo.thuc)
    p.appTinhGio = ["com.roblox.roblox"]; p.soSao = SoSao(sao: 1, phutCon: 1)
    var mo = MoTamOffline(); mo.moDen = dongHo.thuc.addingTimeInterval(1800)
    api.dongBoLoi = LoiApi(chu: "mất mạng")
    let (b, kho) = try boMay(tm, api: api, fake: fake, dongHo: dongHo) { $0.policyCuoi = p; $0.policyLuc = dongHo.thuc; $0.moTamOffline = mo }
    fake.tienTrinhTheoUid = [501: [TienTrinh(pid: 77, uid: 501, duongDan: "/Applications/Roblox.app/Contents/MacOS/Roblox", bundleId: "com.roblox.roblox")]]
    fake.conSongPid = [77]; fake.tienCanhThat = "com.roblox.roblox"
    for _ in 0..<30 { dongHo.tien(5); _ = await b.motVong() }
    XCTAssertEqual(kho.doc()?.quyGiayTuSync ?? -1, 0, accuracy: 0.01, "mở bằng mã ⇒ không trừ sao")
    XCTAssertGreaterThanOrEqual(kho.doc()?.boiMaGiayTuSync ?? 0, 120)
    XCTAssertTrue(fake.tinHieuDaGui.isEmpty, "mở bằng mã ⇒ không đóng app «Tính phút»")
    api.dongBoLoi = nil
    var moi = p; moi.moHet = true
    api.dongBoTraVe = .tu(moi, next: 600)
    dongHo.tien(700); _ = await b.motVong()
    XCTAssertEqual(api.lanBoiMa.last, 2)
    XCTAssertLessThan(kho.doc()?.boiMaGiayTuSync ?? 99, 60, "đã gửi ⇒ trừ phần đã gửi")
    // «Mở hết»: không đếm sao
    for _ in 0..<30 { dongHo.tien(5); _ = await b.apChinhSach() }
    XCTAssertEqual(kho.doc()?.quyGiayTuSync ?? -1, 0, accuracy: 0.01)
    guard case let .trangThai(s) = await b.xuLyIPC(.trangThai, uidGoi: 501) else { return XCTFail() }
    XCTAssertEqual(s.moHet, true); XCTAssertNil(s.phutSao)
  }

  /// Xin vay: có mạng ⇒ gửi + theo dõi; Ba Mẹ cho ⇒ trạng thái «duyet» kèm người duyệt. Mất mạng ⇒ lưu, có mạng tự gửi. Chỉ uid Con.
  func testXinVayVaTheoDoiTraLoi() async throws {
    let tm = try tamThuMuc()
    let fake = HeThongGia(), dongHo = DongHoGia(), api = MayChuGia()
    let p = policyMau(mode: CheDo.hoc.rawValue, now: dongHo.thuc)
    api.dongBoTraVe = .tu(p, next: 600)
    let (b, kho) = try boMay(tm, api: api, fake: fake, dongHo: dongHo)
    _ = await b.motVong()
    guard case .ok(let id) = await b.xuLyIPC(.xinVay(soSao: 15, mucDich: nil, quaId: nil, loiNhan: "làm nốt bài"), uidGoi: 501) else { return XCTFail() }
    XCTAssertEqual(id, "yc1"); XCTAssertEqual(api.lanXinVay.first?.soSao, 15)
    if case .loi = await b.xuLyIPC(.xinVay(soSao: 15, mucDich: nil, quaId: nil, loiNhan: nil), uidGoi: 999) {} else { XCTFail("chỉ uid Con") }
    guard case let .trangThai(s0) = await b.xuLyIPC(.trangThai, uidGoi: 501) else { return XCTFail() }
    XCTAssertEqual(s0.yeuCauCho.map(\.trangThai), ["cho"]); XCTAssertEqual(s0.yeuCauCho.first?.phut, 15)
    api.ketQuaXin = ["yc1": KetQuaLoiXin(status: "duoc", trangThai: "dong_y", tenNguoiDuyet: "Mẹ Lan", loiNhan: "Chơi xong đi tắm nhé")]
    dongHo.tien(700); _ = await b.motVong()
    guard case let .trangThai(s1) = await b.xuLyIPC(.trangThai, uidGoi: 501) else { return XCTFail() }
    XCTAssertEqual(s1.yeuCauCho.first?.trangThai, "duyet"); XCTAssertEqual(s1.yeuCauCho.first?.tenNguoiDuyet, "Mẹ Lan")
    // mất mạng: lưu, có mạng tự gửi
    api.dongBoTraVe = nil; api.dongBoLoi = LoiApi(chu: "mất mạng")
    dongHo.tien(700); _ = await b.motVong()
    guard case .thongBao("cho_mang") = await b.xuLyIPC(.xinVay(soSao: 10, mucDich: "qua", quaId: "q1", loiNhan: nil), uidGoi: 501) else { return XCTFail() }
    XCTAssertEqual(kho.doc()?.xinVayCho.count, 1)
    api.dongBoLoi = nil; api.dongBoTraVe = .tu(p, next: 600)
    dongHo.tien(700); _ = await b.motVong()
    XCTAssertEqual(api.lanXinVay.last?.soSao, 10); XCTAssertEqual(api.lanXinVay.last?.quaId, "q1")
    XCTAssertEqual(kho.doc()?.xinVayCho.count, 0)
    // tray cũ gửi xinThem ⇒ xin vay cùng số
    _ = await b.xuLyIPC(.xinThem(phut: 30, loiNhan: nil), uidGoi: 501)
    XCTAssertEqual(api.lanXinVay.last?.soSao, 30)
  }

  /// Lời xin mở app (#258): theo dõi tới khi Ba Mẹ «đã thêm» (kèm nhóm).
  func testXinMoAppTheoDoiKetQua() async throws {
    let tm = try tamThuMuc()
    let fake = HeThongGia(), dongHo = DongHoGia(), api = MayChuGia()
    api.dongBoTraVe = .tu(policyMau(mode: CheDo.hoc.rawValue, now: dongHo.thuc), next: 600)
    let (b, _) = try boMay(tm, api: api, fake: fake, dongHo: dongHo)
    _ = await b.motVong()
    _ = await b.xuLyIPC(.xinMo(muc: "YouTube", loai: "app", loiNhan: nil), uidGoi: 501)
    XCTAssertEqual(api.lanYeuCau.map(\.loai), ["cai_app"])
    api.ketQuaXin = ["yc1": KetQuaLoiXin(status: "duoc", ketQua: "da_them", nhom: "khong_tinh_phut", tenNguoiDuyet: "Mẹ Lan")]
    dongHo.tien(700); _ = await b.motVong()
    guard case let .trangThai(s) = await b.xuLyIPC(.trangThai, uidGoi: 501) else { return XCTFail() }
    XCTAssertEqual(s.yeuCauCho.first?.loai, "cai_app"); XCTAssertEqual(s.yeuCauCho.first?.muc, "YouTube")
    XCTAssertEqual(s.yeuCauCho.first?.trangThai, "duyet"); XCTAssertEqual(s.yeuCauCho.first?.nhom, "khong_tinh_phut")
  }

  // MARK: review lượt 1

  func testMayChuCuKhongTruCheoHaiNguon() {
    var p = policyMau(mode: "hoc", allowed: ["com.roblox.roblox"], now: now)
    p.appTinhGio = ["com.roblox.roblox"]; p.saoCon = 40; p.quyConPhut = 10
    XCTAssertEqual(SaoPhut.soDu(p, giay: 300), 40, "không có sổ sao ⇒ hiện windows.sao nguyên văn")
    XCTAssertEqual(SaoPhut.conPhut(p, giay: 300), 5, "được chơi theo quyConPhut")
  }

  func testGopDongKhongBeVaPhienBuTachBoiMa() {
    var d: [String: Double] = [:]
    DemPhut.cong(&d, ngay: "2026-11-15", app: "com.roblox.roblox", giay: 600)
    DemPhut.cong(&d, ngay: "2026-11-15", app: "com.roblox.roblox", giay: 120, con: "c1")
    DemPhut.gopVaoBe(&d, con: "c1")
    XCTAssertEqual(DemPhut.tong(d), [MucDung(muc: "com.roblox.roblox", phut: 12, day: "2026-11-15", con: "c1")])
    var bu = PhienBu(ma: "m", id: "p1", muc: "com.roblox.roblox", giay: 600, batDau: now, ketThuc: now, giayBoiMa: 240)
    XCTAssertEqual(bu.thanDs.map { $0["phut"] as? Double }, [6, 4])
    XCTAssertEqual(bu.thanDs.map { $0["boiMa"] as? Bool }, [nil, true])
    XCTAssertEqual(bu.thanDs.last?["ma"] as? String, "m-bm")
    bu.giayBoiMa = nil
    XCTAssertEqual(bu.thanDs.count, 1)
  }

  func testDocHvSao() {
    let h = HvSao.doc(Data(#"{"sao":-20,"no":30,"phutCon":10,"phutChoiHomNay":42,"lichSu":[{"id":1,"kieu":"vay","sao":30,"chuThich":"Ba Mẹ cho vay 30 sao · chơi"},{"id":2,"kieu":"choi","sao":-30,"chuThich":"Chơi Roblox 30 phút"}],"appHomNay":[{"ten":"Roblox","muc":"com.roblox.roblox","phut":30,"nhom":"tinh_phut","sao":30},{"ten":"Từ điển","phut":10,"nhom":"khong_tinh_phut","sao":0}]}"#.utf8))
    XCTAssertEqual(h?.soSao?.sao, -20); XCTAssertEqual(h?.phutChoiHomNay, 42)
    XCTAssertEqual(h?.lichSu.map(\.chuThich), ["Ba Mẹ cho vay 30 sao · chơi", "Chơi Roblox 30 phút"])
    XCTAssertEqual(h?.appHomNay.map(HvSao.dongApp), ["Roblox 30 phút · \u{2212}30 sao", "Từ điển không tính phút"])
    XCTAssertEqual(HvSao.doc(Data(#"{"sao":5}"#.utf8))?.lichSu, [], "máy chủ chưa có lichSu ⇒ rỗng")
  }

  /// 5xx = mất mạng ⇒ lưu chờ; hàng chờ đủ 3 ⇒ báo rõ, không nhận thêm (không bỏ lặng lẽ).
  func testXinVay5xxLuuVaGioiHanHangCho() async throws {
    let tm = try tamThuMuc()
    let fake = HeThongGia(), dongHo = DongHoGia(), api = MayChuGia()
    api.dongBoTraVe = .tu(policyMau(mode: CheDo.hoc.rawValue, now: dongHo.thuc), next: 600)
    let (b, kho) = try boMay(tm, api: api, fake: fake, dongHo: dongHo)
    _ = await b.motVong()
    api.xinVayLoi = LoiApi(maHttp: 502, chu: "Bad gateway")
    for _ in 0..<3 {
      guard case .thongBao("cho_mang") = await b.xuLyIPC(.xinVay(soSao: 15, mucDich: nil, quaId: nil, loiNhan: nil), uidGoi: 501) else { return XCTFail() }
    }
    guard case let .loi(ma, chu) = await b.xuLyIPC(.xinVay(soSao: 10, mucDich: nil, quaId: nil, loiNhan: nil), uidGoi: 501) else { return XCTFail() }
    XCTAssertEqual(ma, "cho_qua_nhieu"); XCTAssertTrue(chu.contains("3 lời xin"))
    XCTAssertEqual(kho.doc()?.xinVayCho.count, 3)
    dongHo.tien(700); _ = await b.motVong()                    // máy chủ vẫn 5xx ⇒ giữ nguyên hàng chờ
    XCTAssertEqual(kho.doc()?.xinVayCho.count, 3)
    api.xinVayLoi = LoiApi(maHttp: 400, ma: "so_sao_sai", chu: "sai")
    guard case .loi = await b.xuLyIPC(.xinVay(soSao: 15, mucDich: nil, quaId: nil, loiNhan: nil), uidGoi: 501) else { return XCTFail() }
  }

  func testTraNoKhiDuyet() {
    XCTAssertEqual(ChuSao.traNoKhiDuyet(cong: 10, noTruoc: 20), "Trả nợ 10 sao · còn nợ 10 sao")
    XCTAssertEqual(ChuSao.traNoKhiDuyet(cong: 30, noTruoc: 20), "Trả nợ 20 sao trước · con còn 10 sao")
    XCTAssertEqual(ChuSao.traNoKhiDuyet(cong: 20, noTruoc: 20), "Trả nợ 20 sao · còn nợ 0 sao")
    XCTAssertNil(ChuSao.traNoKhiDuyet(cong: 10, noTruoc: 0))
    XCTAssertNil(ChuSao.traNoKhiDuyet(cong: 0, noTruoc: 5))
    XCTAssertEqual(ChuSao.choDuyet(20, no: 0), "+20 sao chờ Ba Mẹ duyệt", "không nợ: không nhắc trả nợ")
    XCTAssertEqual(ChuSao.choDuyet(20, no: 15), "+20 sao chờ Ba Mẹ duyệt · Trả nợ 15 sao trước · con còn 5 sao")
    XCTAssertEqual(ChuSao.choDuyet(10, no: 15), "+10 sao chờ Ba Mẹ duyệt · Trả nợ 10 sao · còn nợ 5 sao")
    XCTAssertEqual(ChuSao.traNoTruocHoa, "Sao nhiệm vụ trả nợ trước")
  }

  func testQuyenHoSoGhepChiBaMe() {
    XCTAssertEqual(QuyenIPC.kiem(.hoSoGhep, uidGoi: 501, uidCon: 502, daGhep: true, laAdmin: { $0 == 501 }), .duoc)
    if case .tuChoi = QuyenIPC.kiem(.hoSoGhep, uidGoi: 502, uidCon: 502, daGhep: true, laAdmin: { _ in false }) {} else { XCTFail("Con không được") }
    if case .tuChoi = QuyenIPC.kiem(.hoSoGhep, uidGoi: 501, uidCon: nil, daGhep: false, laAdmin: { _ in true }) {} else { XCTFail("chưa ghép") }
  }
}
