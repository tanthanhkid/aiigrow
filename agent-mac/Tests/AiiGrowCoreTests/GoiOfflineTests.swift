// #337 / #339 (17/11) — máy dùng chung: luật + sao đi theo từng bé kể cả lúc mất mạng; Ba Mẹ đổi gán máy thì máy nhận ngay.
import XCTest
@testable import AiiGrowCore

final class GoiOfflineTests: XCTestCase {
  private let roblox = "com.roblox.roblox"

  private func tamThuMuc() throws -> String {
    let tm = NSTemporaryDirectory() + "aiigrow-goi-\(UUID().uuidString)"
    try FileManager.default.createDirectory(atPath: tm, withIntermediateDirectories: true)
    addTeardownBlock { try? FileManager.default.removeItem(atPath: tm) }
    return tm
  }

  private func boMay(_ tm: String, api: MayChuGia, fake: HeThongGia, dh: DongHoGia) throws -> (BoMay, ConfigStore) {
    let kho = ConfigStore(duongDan: tm + "/config.json")
    try kho.sua { $0.token = "t"; $0.deviceId = "d"; $0.uidCon = 501; $0.taiKhoanCon = "be" }
    fake.uidTheoTen = ["be": 501]
    fake.phien = PhienConsole(uid: 501, manKhoa: false)
    return (taoBoMay(tm, api: api, fake: fake, dh: dh, kho: kho), kho)
  }

  private func taoBoMay(_ tm: String, api: MayChuGia, fake: HeThongGia, dh: DongHoGia, kho: ConfigStore) -> BoMay {
    BoMay(api: api, heThong: fake, kho: kho,
          tuyChon: TuyChonBoMay(duongDanHosts: tm + "/hosts", thuMucChinhSach: tm + "/Managed", tienCanhDongBo: true, tuCapNhat: false),
          dongHo: { dh.thuc }, donDieu: { dh.donDieu })
  }

  private func trangThai(_ b: BoMay) async -> TrangThai? {
    if case let .trangThai(t) = await b.xuLyIPC(.trangThai, uidGoi: 501) { return t }
    return nil
  }

  /// Luật bé A (online): học + Roblox «Tính phút», 30 sao.
  private func polA(_ now: Date) -> Policy {
    var p = policyMau(mode: CheDo.hoc.rawValue, allowed: ["com.apple.textedit", roblox], now: now)
    p.appTinhGio = [roblox]; p.learningApps = ["com.apple.textedit"]; p.soSao = SoSao(sao: 30, phutCon: 30)
    p.maOfflineBiMat = "bimat-may"
    return p
  }

  /// Gói một bé trong ho-so?offline=1 (hình dạng dong-bo: Policy + `windows`, sổ sao ở gốc).
  private func goi(sao: Int?, khoa: Bool = false) -> String {
    let w = #"{"mode":"\#(khoa ? "khoa" : "hoc")","locked":\#(khoa),"cheDo":"chan","allowedApps":["com.apple.textedit","\#(roblox)"],"learningApps":["com.apple.textedit"],"appTinhGio":["\#(roblox)"]}"#
    return #"{"mode":"hoc","windows":\#(w)\#(sao.map { #","sao":{"sao":\#($0),"phutCon":\#($0)}"# } ?? "")}"#
  }

  private func hoSo(_ ds: [(id: String, ten: String, goi: String?)], coGoi: Bool = true) -> Data {
    let con = ds.map { b in #"{"id":"\#(b.id)","ten":"\#(b.ten)","coPin":false,"sao":7,"soDu":7\#(b.goi.map { #","offline":\#($0)"# } ?? "")}"# }
    return Data(#"{"con":[\#(con.joined(separator: ","))],"mayRieng":false,"mayChung":true\#(coGoi ? #","offlineLuc":"2025-10-09T08:00:00.000Z""# : "")}"#.utf8)
  }

  func testDocGoiOfflineVaDsCon() throws {
    let d = hoSo([("c1", "Bảo Anh", goi(sao: 12, khoa: true)), ("c2", "Bảo Minh", goi(sao: nil)), ("c3", "Bảo Châu", nil)])
    let g = try XCTUnwrap(GoiOffline.doc(d, now: Date()))
    XCTAssertEqual(Set(g.keys), ["c1", "c2"], "bé không có gói ⇒ không có mục (khoá khi mất mạng)")
    XCTAssertEqual(g["c1"]?.policy.locked, true); XCTAssertEqual(g["c1"]?.policy.soSao?.sao, 12)
    XCTAssertEqual(g["c2"]?.policy.locked, false)
    XCTAssertEqual(g["c2"]?.policy.soSao?.sao, 7, "gói thiếu sổ sao ⇒ lấy con[].sao / soDu của ho-so")
    XCTAssertNil(g["c1"]?.policy.maOfflineBiMat)
    XCTAssertEqual(g["c1"]?.luc, NgayGio.doc("2025-10-09T08:00:00.000Z"))
    // máy riêng / máy chủ cũ ⇒ không có gói
    XCTAssertNil(GoiOffline.doc(Data(#"{"con":[{"id":"c1","ten":"A","coPin":false}],"mayRieng":true}"#.utf8), now: Date()))
    // dong-bo: dsCon
    let raw = Data(#"{"mode":"tu_do","dsCon":["c1",2],"nguoiDung":{"loai":"chua"}}"#.utf8)
    XCTAssertEqual(try ApiClient.tachDongBo(raw).dsCon, ["c1", "2"])
    XCTAssertNil(try ApiClient.tachDongBo(Data(#"{"mode":"tu_do"}"#.utf8)).dsCon)
    // phien/bu gửi kèm bé đã chơi
    let bu = PhienBu(id: "p1", muc: roblox, giay: 120, batDau: Date(), ketThuc: Date(), con: "c1")
    XCTAssertEqual(bu.thanDs.first?["con"] as? String, "c1")
    XCTAssertNil(PhienBu(id: "p1", muc: roblox, giay: 120, batDau: Date(), ketThuc: Date()).thanDs.first?["con"])
  }

  /// A chơi lúc mất mạng rồi «Đổi người» sang B: B chạy bằng luật + sao CỦA B (bị trừ sao, hết thì đóng game), không mượn luật / sổ sao của A;
  /// A vào lại thấy đúng số sao còn của A; gói + bộ đếm theo bé còn nguyên sau khi daemon khởi động lại.
  func testDoiBeMatMangDungLuatVaSaoTungBe() async throws {
    let tm = try tamThuMuc()
    let fake = HeThongGia(), dh = DongHoGia(), api = MayChuGia()
    let (b, kho) = try boMay(tm, api: api, fake: fake, dh: dh)
    var kq = KetQuaDongBo.tu(polA(dh.thuc), next: 600); kq.nguoiDung = .con(id: "c1", ten: "Bảo Anh"); kq.dsCon = ["c1", "c2"]
    api.dongBoTraVe = kq
    api.mayChungTra["GET ho-so"] = .success(hoSo([("c1", "Bảo Anh", goi(sao: 30)), ("c2", "Bảo Minh", goi(sao: 5))]))
    _ = await b.motVong()
    XCTAssertEqual(Set(kho.doc()?.goiOffline?.keys.map { $0 } ?? []), ["c1", "c2"], "lưu gói theo từng bé")
    let game = TienTrinh(pid: 77, uid: 501, duongDan: "/Applications/Roblox.app/Contents/MacOS/Roblox", bundleId: roblox)
    fake.tienTrinhTheoUid = [501: [game]]; fake.conSongPid = [77]

    // mất mạng: A chơi Roblox 2 phút
    api.dongBoTraVe = nil; api.dongBoLoi = LoiApi(chu: "mất mạng"); api.matMang = true
    fake.tienCanhThat = roblox
    for _ in 0..<24 { dh.tien(5); _ = await b.motVong() }
    XCTAssertEqual(kho.doc()?.quyGiayTuSync ?? 0, 120, accuracy: 6)
    XCTAssertTrue(fake.tinHieuDaGui.isEmpty)

    // Đổi người ⇒ B vào bằng PIN lúc mất mạng
    _ = await b.xuLyIPC(.dangXuat, uidGoi: 501)
    let r = await b.xuLyIPC(.dangNhapBe(con: "c2", pin: nil), uidGoi: 501)
    XCTAssertEqual(r, .pin(ketQua: "ok", conLan: nil, choGiay: nil, chu: "Bảo Minh"))
    XCTAssertEqual(kho.doc()?.saoCuaBe, "c2")
    XCTAssertEqual(kho.doc()?.quyGiayTuSync ?? -1, 0, accuracy: 0.01, "bộ đếm sao của B bắt đầu từ gói của B, không mang phút của A")
    XCTAssertEqual(kho.doc()?.policyCuoi?.maOfflineBiMat, "bimat-may", "bí mật mã offline của máy giữ nguyên")
    let tB = await trangThai(b)
    XCTAssertEqual(tB?.beId, "c2"); XCTAssertEqual(tB?.soSao?.sao, 5, "sao của B, không phải 28 của A")
    // B chơi: bị trừ sao; hết 5 sao ⇒ game đóng (trước sửa: B chơi miễn phí tới khi có mạng)
    for _ in 0..<66 { dh.tien(5); _ = await b.motVong() }
    XCTAssertTrue(fake.tinHieuDaGui.contains { $0.0 == 77 }, "hết sao của B lúc mất mạng ⇒ đóng game")
    let tB2 = await trangThai(b)
    XCTAssertEqual(tB2?.phutSao, 0); XCTAssertEqual(tB2?.soSao?.hetSao, true)

    // A vào lại: đúng số sao còn của A (30 − 2)
    _ = await b.xuLyIPC(.dangXuat, uidGoi: 501)
    _ = await b.xuLyIPC(.dangNhapBe(con: "c1", pin: nil), uidGoi: 501)
    let tA = await trangThai(b)
    XCTAssertEqual(tA?.beId, "c1")
    XCTAssertEqual(tA?.soSao?.sao ?? 0, 28, accuracy: 1)
    XCTAssertGreaterThanOrEqual(kho.doc()?.goiOffline?["c2"]?.quyGiay ?? 0, 300, "bộ đếm của B cất theo B")

    // khởi động lại daemon (vẫn mất mạng): luật + bộ đếm theo bé còn trên đĩa
    let b2 = taoBoMay(tm, api: api, fake: fake, dh: dh, kho: kho)
    let tA2 = await trangThai(b2)
    XCTAssertEqual(tA2?.soSao?.sao ?? 0, 28, accuracy: 1)
    _ = await b2.xuLyIPC(.dangXuat, uidGoi: 501)
    _ = await b2.xuLyIPC(.dangNhapBe(con: "c2", pin: nil), uidGoi: 501)
    let tB3 = await trangThai(b2)
    XCTAssertEqual(tB3?.beId, "c2"); XCTAssertEqual(tB3?.phutSao, 0, "B vẫn hết sao sau khởi động lại")

    // có mạng lại: phút của từng bé gửi kèm đúng bé (usage[].con)
    api.matMang = false; api.dongBoLoi = nil
    api.mayChungTra["POST dang-xuat"] = .success(Data("{}".utf8)); api.mayChungTra["POST dang-nhap-be"] = .success(Data("{}".utf8))
    var kq2 = KetQuaDongBo.tu(polA(dh.thuc), next: 600); kq2.nguoiDung = .con(id: "c2", ten: "Bảo Minh"); kq2.dsCon = ["c1", "c2"]
    api.dongBoTraVe = kq2
    dh.tien(700)
    _ = await b2.motVong()
    let dung = api.lanDongBo.last?.1 ?? []
    XCTAssertGreaterThanOrEqual(dung.filter { $0.con == "c1" }.map(\.phut).reduce(0, +), 2)
    XCTAssertGreaterThanOrEqual(dung.filter { $0.con == "c2" }.map(\.phut).reduce(0, +), 5)
  }

  /// Máy chung, bé chưa có gói (chưa tải được lần nào): mất mạng thì KHÔNG cho vào (khoá tới khi có mạng), không mượn luật bé trước.
  func testKhongCoGoiThiKhoaToiKhiCoMang() async throws {
    let tm = try tamThuMuc()
    let fake = HeThongGia(), dh = DongHoGia(), api = MayChuGia()
    let (b, kho) = try boMay(tm, api: api, fake: fake, dh: dh)
    var kq = KetQuaDongBo.tu(polA(dh.thuc), next: 600); kq.nguoiDung = .con(id: "c1", ten: "Bảo Anh")
    api.dongBoTraVe = kq
    api.mayChungTra["GET ho-so"] = .success(hoSo([("c1", "Bảo Anh", goi(sao: 30)), ("c2", "Bảo Minh", nil)]))
    _ = await b.motVong()
    api.dongBoTraVe = nil; api.dongBoLoi = LoiApi(chu: "mất mạng"); api.matMang = true
    dh.tien(700); _ = await b.motVong()
    _ = await b.xuLyIPC(.dangXuat, uidGoi: 501)
    guard case let .loi(ma, chu) = await b.xuLyIPC(.dangNhapBe(con: "c2", pin: nil), uidGoi: 501) else { return XCTFail("phải từ chối") }
    XCTAssertEqual(ma, "chua_co_luat"); XCTAssertTrue(chu.contains("Bảo Minh"))
    let t = await trangThai(b)
    XCTAssertEqual(t?.nguoiDung, "chua", "vẫn ở màn chọn tên")
    XCTAssertEqual(kho.doc()?.saoCuaBe, "c1", "luật của A không bị gán cho B")
    // A (có gói) vẫn vào được
    if case .pin("ok", _, _, _) = await b.xuLyIPC(.dangNhapBe(con: "c1", pin: nil), uidGoi: 501) {} else { XCTFail("A có gói ⇒ vào được") }
  }

  /// #339: dong-bo trả `dsCon` lệch danh sách đang nhớ ⇒ tải lại ho-so NGAY (hoSoSeq tăng cho tray); bé đang dùng bị bỏ gán ⇒ về màn chọn tên.
  func testDsConLechTaiLaiVaDayBeRa() async throws {
    let tm = try tamThuMuc()
    let fake = HeThongGia(), dh = DongHoGia(), api = MayChuGia()
    let (b, kho) = try boMay(tm, api: api, fake: fake, dh: dh)
    var kq = KetQuaDongBo.tu(polA(dh.thuc), next: 600); kq.nguoiDung = .con(id: "c1", ten: "Bảo Anh"); kq.dsCon = ["c1", "c2"]
    api.dongBoTraVe = kq
    api.mayChungTra["GET ho-so"] = .success(hoSo([("c1", "Bảo Anh", goi(sao: 30)), ("c2", "Bảo Minh", goi(sao: 5))]))
    _ = await b.motVong()
    let seq0 = await trangThai(b)?.hoSoSeq
    let lan0 = api.lanMayChung.filter { $0.0 == "GET ho-so" }.count
    // cùng danh sách ⇒ không tải lại
    dh.tien(700); _ = await b.motVong()
    XCTAssertEqual(api.lanMayChung.filter { $0.0 == "GET ho-so" }.count, lan0)
    // Ba Mẹ gán thêm bé ⇒ lượt đồng bộ kế (không chờ 30 phút) tải lại ho-so
    api.mayChungTra["GET ho-so"] = .success(hoSo([("c1", "Bảo Anh", goi(sao: 30)), ("c2", "Bảo Minh", goi(sao: 5)), ("c3", "Bảo Châu", goi(sao: 9))]))
    kq.dsCon = ["c1", "c2", "c3"]; api.dongBoTraVe = kq
    dh.tien(700); _ = await b.motVong()
    XCTAssertEqual(api.lanMayChung.filter { $0.0 == "GET ho-so" }.count, lan0 + 1)
    XCTAssertEqual(kho.doc()?.hoSoMay?.con.map(\.id), ["c1", "c2", "c3"])
    XCTAssertNotNil(kho.doc()?.goiOffline?["c3"], "bé mới có gói ngay")
    let seq1 = await trangThai(b)?.hoSoSeq
    XCTAssertNotEqual(seq0, seq1, "tray đang mở màn chọn tên thấy danh sách đổi")
    // Ba Mẹ bỏ gán bé đang dùng ⇒ đẩy về màn chọn tên ngay, bé đó mất gói
    api.mayChungTra["GET ho-so"] = .success(hoSo([("c2", "Bảo Minh", goi(sao: 5)), ("c3", "Bảo Châu", goi(sao: 9))]))
    kq.dsCon = ["c2", "c3"]; api.dongBoTraVe = kq
    dh.tien(700); _ = await b.motVong()
    let t = await trangThai(b)
    XCTAssertEqual(t?.nguoiDung, "chua", "bé bị bỏ gán ⇒ về màn chọn tên")
    XCTAssertNil(kho.doc()?.goiOffline?["c1"])
    XCTAssertEqual(kho.doc()?.hoSoMay?.con.map(\.id), ["c2", "c3"])
  }
}
