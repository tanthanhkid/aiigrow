// PIN theo bé trên Mac dùng chung (L13, docs/API.md «S3»): vân PIN như máy chủ, đếm sai 5 lần / 15 giây, mã mở máy 60/30/15 phút,
// ai đang dùng máy (màn chọn tên / Ba Mẹ dùng), daemon: đăng nhập có mạng / mất mạng, Ba Mẹ nhập mã, Đổi bé.
import XCTest
@testable import AiiGrowCore

final class PinBeTests: XCTestCase {
  func testVanPinKhopMayChu() {
    // node: createHmac("sha256","bimat-may").update("c1:4821").digest("hex")
    let mong = "7b78587358dab8e16e25a502493ecf73b0b074ec50a3bd85549b68a8b707c148"
    XCTAssertEqual(PinBe.van(biMat: "bimat-may", con: "c1", pin: "4821"), mong)
    XCTAssertTrue(PinBe.kiem(biMat: "bimat-may", con: "c1", pin: "4821", van: mong.uppercased()))
    XCTAssertFalse(PinBe.kiem(biMat: "bimat-may", con: "c1", pin: "4822", van: mong))
    XCTAssertFalse(PinBe.kiem(biMat: "bimat-may", con: "c2", pin: "4821", van: mong), "vân gắn với id bé")
    XCTAssertFalse(PinBe.kiem(biMat: nil, con: "c1", pin: "4821", van: mong))
    XCTAssertFalse(PinBe.hopLe("482")); XCTAssertFalse(PinBe.hopLe("48a1")); XCTAssertTrue(PinBe.hopLe("0000"))
  }

  func testDemSaiNamLanChoMuoiLamGiay() {
    var d = BoDemSaiPin()
    let t0 = Date(timeIntervalSince1970: 1_800_000_000)
    for i in 1...4 { XCTAssertEqual(d.ghiSai(con: "c1", now: t0.addingTimeInterval(Double(i))).conLan, 5 - i) }
    let r = d.ghiSai(con: "c1", now: t0.addingTimeInterval(5))
    XCTAssertEqual(r.conLan, 0); XCTAssertEqual(r.choGiay, 15)
    XCTAssertEqual(d.choGiay(con: "c1", now: t0.addingTimeInterval(6)), 14)
    XCTAssertEqual(d.choGiay(con: "c2", now: t0.addingTimeInterval(6)), 0, "đếm theo từng bé")
    XCTAssertEqual(d.choGiay(con: "c1", now: t0.addingTimeInterval(21)), 0)
    XCTAssertEqual(d.ghiSai(con: "c1", now: t0.addingTimeInterval(22)).conLan, 4, "hết chờ thì đếm lại từ đầu")
    for i in 23...25 { _ = d.ghiSai(con: "c1", now: t0.addingTimeInterval(Double(i))) }
    XCTAssertEqual(d.ghiSai(con: "c1", now: t0.addingTimeInterval(26)).choGiay, 30, "khoá lần 2 liên tiếp ⇒ chờ gấp đôi (chống dò PIN lúc mất mạng)")
    d.xoa(con: "c1"); XCTAssertNil(d.lanKhoa["c1"])
    // lượt sai cũ hơn 15 phút không cộng dồn
    var e = BoDemSaiPin()
    for i in 0..<4 { _ = e.ghiSai(con: "c1", now: t0.addingTimeInterval(Double(i))) }
    XCTAssertEqual(e.ghiSai(con: "c1", now: t0.addingTimeInterval(16 * 60)).conLan, 4)
  }

  func testMaMoMayBienThePhut() {
    let goc = "bi-mat-offline", t = Date(timeIntervalSince1970: 1_800_000_123)
    XCTAssertEqual(MaOffline.biMat(goc, phut: 30), "bi-mat-offline|30")
    for p in [60, 30, 15] { XCTAssertEqual(MaOffline.kiemPhut(goc, MaOffline.ma(goc, phut: p, luc: t), luc: t), p) }
    XCTAssertEqual(MaOffline.ma(goc, phut: 60, luc: t), MaOffline.ma(goc, luc: t), "60 phút = mã cũ")
    XCTAssertNil(MaOffline.kiemPhut(goc, "000000", luc: t.addingTimeInterval(7200)).flatMap { $0 == 60 && MaOffline.ma(goc, luc: t.addingTimeInterval(7200)) != "000000" ? $0 : nil })
    // màn khoá của con: mã 15 phút ⇒ mở đúng 15 phút
    var st = MoTamOffline()
    XCTAssertEqual(st.thuMo(biMat: goc, ma: MaOffline.ma(goc, phut: 15, luc: t), now: t), .daMo)
    XCTAssertEqual(st.moDen, t.addingTimeInterval(15 * 60))
  }

  func testDocHoSoVaNguoiDung() throws {
    let json = #"""
    {"con":[{"id":"c1","ten":"Bảo Anh","avatar":"rob","coPin":true,"vanPin":"9F2C"},{"id":2,"ten":"Bảo Minh","coPin":false,"khoaDen":"2026-11-06T12:40:15.000Z","choGiay":11},{"ten":"thiếu id"}],
     "mayRieng":false,"dangDung":{"id":"c1","ten":"Bảo Anh"},"baMeDung":null,"pinSaiToiDa":5,"pinChoGiay":15}
    """#
    let h = try XCTUnwrap(HoSoMay.doc(Data(json.utf8)))
    XCTAssertEqual(h.con.map(\.id), ["c1", "2"]); XCTAssertEqual(h.con[0].vanPin, "9f2c"); XCTAssertEqual(h.con[1].choGiay, 11)
    XCTAssertEqual(h.dangDung, "c1")
    XCTAssertTrue(h.anChoTray().con.allSatisfy { $0.vanPin == nil }, "vân PIN không sang tray")
    XCTAssertEqual(NguoiDungMay.doc(["loai": "chua"]), .chua)
    XCTAssertEqual(NguoiDungMay.doc(["loai": "con", "con": ["id": "c1", "ten": "Bảo Anh", "coPin": true]]), .con(id: "c1", ten: "Bảo Anh"))
    XCTAssertEqual(NguoiDungMay.doc(["loai": "ba_me", "den": "2026-11-06T12:30:00.000Z"]), .baMe(den: NgayGio.doc("2026-11-06T12:30:00.000Z")))
    let kq = try ApiClient.tachDongBo(Data(#"{"windows":{"mode":"hoc"},"nguoiDung":{"loai":"chua"}}"#.utf8))
    XCTAssertEqual(kq.nguoiDung, .chua)
  }

  func testPhienMayHieuLucVaApDung() {
    let t = Date(timeIntervalSince1970: 1_800_000_000)
    var pm = PhienMay()
    pm.nhanMayChu(.con(id: "c1", ten: "A"), guiLuc: t, now: t)
    pm.datCucBo(.baMe(den: t.addingTimeInterval(600)), now: t.addingTimeInterval(1), baMeOffline: true)
    pm.nhanMayChu(.chua, guiLuc: t.addingTimeInterval(2), now: t.addingTimeInterval(2))
    XCTAssertEqual(pm.hieuLuc(now: t.addingTimeInterval(3)), .baMe(den: t.addingTimeInterval(600)), "Ba Mẹ mở offline giữ tới hạn")
    XCTAssertEqual(pm.hieuLuc(now: t.addingTimeInterval(601)), .chua, "hết hạn Ba Mẹ ⇒ màn chọn tên, không chờ mạng")
    var p2 = PhienMay(); p2.mayChu = .con(id: "c1", ten: "A"); p2.datCucBo(.chua, now: t)
    p2.nhanMayChu(.con(id: "c1", ten: "A"), guiLuc: t.addingTimeInterval(-5), now: t)
    XCTAssertEqual(p2.hieuLuc(now: t), .chua, "đồng bộ gửi TRƯỚC lúc Đổi bé không ghi đè")
    p2.nhanMayChu(.con(id: "c1", ten: "A"), guiLuc: t.addingTimeInterval(5), now: t, daGuiHet: false)
    XCTAssertEqual(p2.hieuLuc(now: t), .chua, "lệnh Đổi bé chưa tới máy chủ ⇒ giữ màn chọn tên")
    p2.nhanMayChu(.chua, guiLuc: t.addingTimeInterval(5), now: t)
    XCTAssertNil(p2.cucBo)

    var p = policyMau(mode: "hoc", allowed: ["com.apple.textedit", "com.roblox.roblox"], now: t)
    p.blockedApps = [AppBiChan(muc: "com.x")]
    let hl = DanhGiaPolicy.tinh(p, now: t, daDungGiay: 0)
    let (q1, h1) = PhienMay.apDung(p, hl, .chua, now: t)
    XCTAssertTrue(q1.allowedApps.isEmpty); XCTAssertTrue(h1.chiAppHoc); XCTAssertFalse(h1.khoa, "màn chọn tên không đếm ngược đăng xuất")
    var k = p; k.mode = "khoa"; k.locked = true
    XCTAssertTrue(PhienMay.apDung(k, DanhGiaPolicy.tinh(k, now: t, daDungGiay: 0), .chua, now: t).1.khoa, "giờ ngủ/khoá vẫn khoá khi chưa ai vào")
    let (q2, h2) = PhienMay.apDung(k, DanhGiaPolicy.tinh(k, now: t, daDungGiay: 0), .baMe(den: t.addingTimeInterval(60)), now: t)
    XCTAssertFalse(h2.khoa); XCTAssertFalse(h2.chiAppHoc); XCTAssertTrue(q2.blockedApps.isEmpty)
    XCTAssertTrue(PhienMay.tinhGioCon(nil)); XCTAssertTrue(PhienMay.tinhGioCon(.con(id: "c", ten: "")))
    XCTAssertFalse(PhienMay.tinhGioCon(.chua)); XCTAssertFalse(PhienMay.tinhGioCon(.baMe(den: nil)))
  }

  // MARK: daemon

  private func dung(_ api: MayChuGia, _ p: Policy) throws -> (BoMay, ConfigStore, HeThongGia, DongHoGia, String) {
    let tm = NSTemporaryDirectory() + "aiigrow-pin-\(UUID().uuidString)"
    try FileManager.default.createDirectory(atPath: tm, withIntermediateDirectories: true)
    let fake = HeThongGia(), dh = DongHoGia()
    let kho = ConfigStore(duongDan: tm + "/config.json")
    try kho.sua { $0.token = "t"; $0.deviceId = "d"; $0.uidCon = 501; $0.taiKhoanCon = "be" }
    fake.uidTheoTen = ["be": 501]
    fake.phien = PhienConsole(uid: 501, manKhoa: false)
    api.dongBoTraVe = .tu(p, next: 600)
    let b = BoMay(api: api, heThong: fake, kho: kho,
                  tuyChon: TuyChonBoMay(duongDanHosts: tm + "/hosts", thuMucChinhSach: tm + "/Managed", tienCanhDongBo: true, tuCapNhat: false),
                  dongHo: { dh.thuc }, donDieu: { dh.donDieu })
    return (b, kho, fake, dh, tm)
  }

  private func trangThai(_ b: BoMay) async -> TrangThai? {
    if case let .trangThai(t) = await b.xuLyIPC(.trangThai, uidGoi: 501) { return t }
    return nil
  }

  func testDaemonDangNhapCoMangVaMatMang() async throws {
    let api = MayChuGia()
    var p = policyMau(mode: "tu_do", now: Date(timeIntervalSince1970: 1_760_000_000))
    p.maOfflineBiMat = "bimat-may"
    var kq = KetQuaDongBo.tu(p, next: 600); kq.nguoiDung = .chua
    let (b, kho, fake, dh, tm) = try dung(api, p)
    defer { try? FileManager.default.removeItem(atPath: tm) }
    api.dongBoTraVe = kq
    let van = PinBe.van(biMat: "bimat-may", con: "c1", pin: "4821")
    api.mayChungTra["GET ho-so"] = .success(Data(#"{"con":[{"id":"c1","ten":"Bảo Anh","coPin":true,"vanPin":"\#(van)"},{"id":"c2","ten":"Bảo Minh","coPin":false}],"mayRieng":false}"#.utf8))
    _ = await b.motVong()
    let t0 = await trangThai(b)
    XCTAssertEqual(t0?.nguoiDung, "chua")
    // màn chọn tên: app của Con bị đóng, không đếm ngược đăng xuất
    fake.tienTrinhTheoUid = [501: [TienTrinh(pid: 9, uid: 501, duongDan: "/Applications/Roblox.app/Contents/MacOS/Roblox", bundleId: "com.roblox.roblox")]]
    fake.conSongPid = [9]
    let tChua = await b.apChinhSach()
    XCTAssertTrue(fake.tinHieuDaGui.contains { $0.0 == 9 }); XCTAssertNil(tChua.demNguocGiay)
    // hồ sơ cho tray: không vân PIN
    guard case let .duLieu(j) = await b.xuLyIPC(.hoSo, uidGoi: 501) else { return XCTFail() }
    XCTAssertFalse(j.contains("vanPin")); XCTAssertTrue(j.contains("Bảo Anh"))
    XCTAssertNotNil(kho.doc()?.hoSoMay?.con.first?.vanPin, "daemon nhớ vân để kiểm lúc mất mạng")
    // tài khoản khác không gọi được
    if case .loi = await b.xuLyIPC(.dangNhapBe(con: "c1", pin: "4821"), uidGoi: 502) {} else { XCTFail("chỉ uid Con") }
    // có mạng: máy chủ báo sai
    api.mayChungTra["POST dang-nhap-be"] = .failure(LoiApi(maHttp: 401, ma: "pin_sai", chu: "x", conLan: 3))
    do { let r = await b.xuLyIPC(.dangNhapBe(con: "c1", pin: "1111"), uidGoi: 501); XCTAssertEqual(r, .pin(ketQua: "pin_sai", conLan: 3, choGiay: nil, chu: "Chưa đúng · còn 3 lần thử")) }
    api.mayChungTra["POST dang-nhap-be"] = .success(Data(#"{"phienCon":"x","con":{"id":"c1","ten":"Bảo Anh"},"coPin":true}"#.utf8))
    do { let r = await b.xuLyIPC(.dangNhapBe(con: "c1", pin: "4821"), uidGoi: 501); XCTAssertEqual(r, .pin(ketQua: "ok", conLan: nil, choGiay: nil, chu: "Bảo Anh")) }
    let t1 = await trangThai(b)
    XCTAssertEqual(t1?.nguoiDung, "con"); XCTAssertEqual(t1?.beTen, "Bảo Anh")
    // Đổi bé ⇒ về màn chọn tên ngay
    api.mayChungTra["POST dang-xuat"] = .success(Data(#"{"ok":true,"khoa":true}"#.utf8))
    _ = await b.xuLyIPC(.dangXuat, uidGoi: 501)
    let t2 = await trangThai(b)
    XCTAssertEqual(t2?.nguoiDung, "chua")
    // mất mạng: kiểm PIN tại máy, sai 5 lần ⇒ chờ 15 giây
    api.matMang = true
    for i in 1...4 { do { let r = await b.xuLyIPC(.dangNhapBe(con: "c1", pin: "0000"), uidGoi: 501); XCTAssertEqual(r, .pin(ketQua: "pin_sai", conLan: 5 - i, choGiay: nil, chu: "Chưa đúng · còn \(5 - i) lần thử")) } }
    do { let r = await b.xuLyIPC(.dangNhapBe(con: "c1", pin: "0000"), uidGoi: 501); XCTAssertEqual(r, .pin(ketQua: "pin_tam_khoa", conLan: 0, choGiay: 15, chu: "Sai 5 lần rồi")) }
    if case let .pin(kqq, _, _, _) = await b.xuLyIPC(.dangNhapBe(con: "c1", pin: "4821"), uidGoi: 501) { XCTAssertEqual(kqq, "pin_tam_khoa", "đang chờ thì PIN đúng cũng chưa vào") }
    // hồ sơ lúc mất mạng: bản nhớ, kèm số giây chờ
    guard case let .duLieu(j2) = await b.xuLyIPC(.hoSo, uidGoi: 501), let h2 = try? IPCMa.decoder.decode(HoSoMay.self, from: Data(j2.utf8)) else { return XCTFail() }
    XCTAssertEqual(h2.con.first?.choGiay, 15)
    // bé chưa có PIN vào thẳng; lượt đăng nhập được gửi lại khi có mạng
    do { let r = await b.xuLyIPC(.dangNhapBe(con: "c2", pin: nil), uidGoi: 501); XCTAssertEqual(r, .pin(ketQua: "ok", conLan: nil, choGiay: nil, chu: "Bảo Minh")) }
    let t3 = await trangThai(b)
    XCTAssertEqual(t3?.beId, "c2")
    api.matMang = false; api.mayChungTra["POST dang-nhap-be"] = .success(Data("{}".utf8))
    api.dongBoTraVe = { var k = KetQuaDongBo.tu(p, next: 600); k.nguoiDung = .con(id: "c2", ten: "Bảo Minh"); return k }()
    let truoc = api.lanMayChung.count
    dh.tien(700)
    _ = await b.motVong()
    XCTAssertTrue(api.lanMayChung.dropFirst(truoc).contains { $0.0 == "POST dang-nhap-be" && ($0.1?["con"] as? String) == "c2" })
  }

  func testDaemonBaMeNhapMaMatMangVaKhoaLai() async throws {
    let api = MayChuGia()
    let dh0 = Date(timeIntervalSince1970: 1_760_000_000)
    var p = policyMau(mode: "khoa", now: dh0); p.lockReason = LyDoKhoa.ngu
    p.maOfflineBiMat = "bimat-may"
    var kq = KetQuaDongBo.tu(p, next: 600); kq.nguoiDung = .chua
    let (b, _, _, dh, tm) = try dung(api, p)
    defer { try? FileManager.default.removeItem(atPath: tm) }
    api.dongBoTraVe = kq
    _ = await b.motVong()
    api.matMang = true; api.dongBoTraVe = nil; api.dongBoLoi = LoiApi(chu: "mất mạng")
    // sai mã
    if case let .pin(k, conLan, _, _) = await b.xuLyIPC(.baMeMo(ma: "000001"), uidGoi: 501) { XCTAssertEqual(k, "ma_sai"); XCTAssertEqual(conLan, 4) } else { XCTFail() }
    // mã 30 phút ⇒ Ba Mẹ dùng 30 phút, máy mở hết (giờ ngủ không khoá)
    let ma = MaOffline.ma("bimat-may", phut: 30, luc: dh.thuc)
    do { let r = await b.xuLyIPC(.baMeMo(ma: ma), uidGoi: 501); XCTAssertEqual(r, .thongBao(chu: "Ba Mẹ đang dùng máy")) }
    let t1 = await b.apChinhSach()
    let t1b = await trangThai(b)
    XCTAssertEqual(t1b?.nguoiDung, "ba_me"); XCTAssertEqual(t1b?.baMeDungDen, dh.thuc.addingTimeInterval(1800))
    XCTAssertNotEqual(t1.cheDo, .khoa)
    // có mạng lại: lệnh thả bé cũ (khoa-lai) gửi TRƯỚC dong-bo
    api.matMang = false; api.mayChungTra["POST khoa-lai"] = .success(Data("{}".utf8))
    api.dongBoLoi = nil; api.dongBoTraVe = kq
    dh.tien(700); _ = await b.motVong()
    XCTAssertTrue(api.lanMayChung.contains { $0.0 == "POST khoa-lai" })
    let t1c = await trangThai(b)
    XCTAssertEqual(t1c?.nguoiDung, "ba_me", "Ba Mẹ mở offline giữ tới hạn")
    api.matMang = true; api.dongBoTraVe = nil; api.dongBoLoi = LoiApi(chu: "mất mạng")
    // mã đã dùng không mở lại
    _ = await b.xuLyIPC(.khoaLai, uidGoi: 501)
    let t2 = await trangThai(b)
    XCTAssertEqual(t2?.nguoiDung, "chua")
    if case let .pin(k, _, _, _) = await b.xuLyIPC(.baMeMo(ma: ma), uidGoi: 501) { XCTAssertEqual(k, "ma_da_dung") } else { XCTFail() }
    // có mạng: máy chủ trả Ba Mẹ dùng
    api.matMang = false
    api.mayChungTra["POST ba-me-mo"] = .success(Data(#"{"baMeDung":{"den":"2030-01-01T00:00:00.000Z","tu":"2026-11-06T12:00:00.000Z"},"phut":15}"#.utf8))
    do { let r = await b.xuLyIPC(.baMeMo(ma: "123456"), uidGoi: 501); XCTAssertEqual(r, .thongBao(chu: "Ba Mẹ đang dùng máy · 15 phút")) }
    api.mayChungTra["POST ba-me-mo"] = .failure(LoiApi(maHttp: 429, ma: "ma_tam_khoa", chu: "x", choGiay: 600))
    if case let .pin(k, _, cho, _) = await b.xuLyIPC(.baMeMo(ma: "123456"), uidGoi: 501) { XCTAssertEqual(k, "ma_tam_khoa"); XCTAssertEqual(cho, 600) } else { XCTFail() }
  }

  /// 14/11 (con-cai-mac 60): «Thoát AiiGrow…» ⇒ báo Ba Mẹ ngay (sự kiện con_muon_thoat); mất mạng ⇒ vào hàng đợi; chỉ uid Con.
  func testDaemonBaoThoatBaoBaMe() async throws {
    let api = MayChuGia()
    let p = policyMau(mode: "tu_do", now: Date(timeIntervalSince1970: 1_760_000_000))
    let (b, kho, _, dh, tm) = try dung(api, p)
    defer { try? FileManager.default.removeItem(atPath: tm) }
    _ = await b.motVong()
    do { let r = await b.xuLyIPC(.baoThoat, uidGoi: 501); XCTAssertEqual(r, .thongBao(chu: "da_bao")) }
    // mở lại hộp trong 10 phút ⇒ không gửi lặp
    do { let r = await b.xuLyIPC(.baoThoat, uidGoi: 501); XCTAssertEqual(r, .thongBao(chu: "da_bao")) }
    let gui = api.lanNhatKy.filter { $0.0 == "su-kien" }
    XCTAssertEqual(gui.count, 1)
    let ds = gui.first?.1["ds"] as? [[String: Any]]
    XCTAssertEqual(ds?.first?["loai"] as? String, "con_muon_thoat")
    // quá 10 phút + mất mạng ⇒ «cho_mang», sự kiện nằm trong hàng đợi (vongNhatKy gửi sau)
    dh.tien(601)
    api.matMang = true
    do { let r = await b.xuLyIPC(.baoThoat, uidGoi: 501); XCTAssertEqual(r, .thongBao(chu: "cho_mang")) }
    XCTAssertTrue(kho.doc()?.hangDoiSuKien.contains { $0.loai == "con_muon_thoat" } ?? false)
    // tài khoản khác (Ba Mẹ) không gọi được
    if case let .loi(ma, _) = await b.xuLyIPC(.baoThoat, uidGoi: 502) { XCTAssertEqual(ma, "khong_phai_con") } else { XCTFail() }
  }
}
