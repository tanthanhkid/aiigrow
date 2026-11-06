// Test logic thuần: nenTang ios ⇒ kế hoạch lịch/khiên, trạng thái khiên theo giờ, đo phút, link ghép, client, một lượt đồng bộ (bản giả).
import XCTest
@testable import ConCore

// Phản hồi nhịp mẫu — cùng hình dạng server/lib/nhip-may.ts + chuyenDoi(cs, "ios").
func nhipMau(khoaNgay: Bool = false, giaiTriDuocMo: Bool = true, ngayThuong: String = #"[{"tu":"17:00","den":"19:00"}]"#,
             cuoiTuan: String = #"[{"tu":"09:00","den":"11:00"},{"tu":"15:00","den":"20:00"}]"#,
             ngu: String = #"{"tu":"21:30","den":"06:30"}"#, tran: Int = 90, phutThem: Int = 0, moKhanCap: String = "null",
             grant: String? = nil, lenh: String = "[]", webChan: String = #"["https://www.tiktok.com/abc","roblox.com"]"#,
             them05: String = "") -> Data {
  let g = grant.map { #","grantEndsAt":"\#($0)""# } ?? ""
  return """
  {"serverTime":"2026-10-24T10:00:00.000Z","tuanThu":{},
   "chinhSach":{"phienBan":1,"serverTime":"2026-10-24T10:00:00.000Z","tz":"Asia/Ho_Chi_Minh",
     "may":{"id":"m1","ten":"iPad của Bin","nen":"ios","dungChung":false},"con":{"id":"c1","ten":"Bin","nhom":"tieu_hoc"},"canChonCon":false,
     "gioChoi":{"ngayThuong":\(ngayThuong),"cuoiTuan":\(cuoiTuan),"ngu":\(ngu),"tranNgayPhut":\(tran),"tranTuanPhut":600,
                "phienToiDaPhut":60,"nghiGiuaPhut":10,"tuDongDongPhut":5},
     "ungDung":{"heThong":["com.apple.mobilephone"],"hoc":[{"muc":"khanacademy.org","kieu":"web"}],
                "giaiTri":[{"muc":"youtube.com","kieu":"web","nhom":"video_ngan","giaPhanNghin":1000}],"chan":[{"muc":"tiktok.com","kieu":"web"}],"chuaXep":"chan"},
     "phienDiem":{"soDu":0,"phien":null,"giaTheoNhom":{}},"khoaNgay":\(khoaNgay),
     "ngoaiLe":{"phutThemHomNay":\(phutThem),"mucTamThoi":[],"moKhanCapDen":\(moKhanCap)},"gioMaySai":false,"tuanThu":{},\(them05)
     "hieuLuc":{"giaiTriDuocMo":\(giaiTriDuocMo),"lyDo":\(giaiTriDuocMo ? "[]" : #"["khong_tuan_thu"]"#)}},
   "nenTang":{"nen":"ios","ten":"iPhone/iPad","coChe":[],"nhipGiay":3600,"khongLamDuoc":[],"viecCho":[],"muc":[
     {"khaNang":"khung_gio","mucDo":"du","coChe":"x","cauHinh":{"lichMo":{"ngayThuong":\(ngayThuong),"cuoiTuan":\(cuoiTuan)},"tz":"Asia/Ho_Chi_Minh"}},
     {"khaNang":"gio_ngu","mucDo":"du","coChe":"x","cauHinh":{"ngu":\(ngu)}},
     {"khaNang":"tran_thoi_gian","mucDo":"du","coChe":"x","cauHinh":{"tranNgayPhut":\(tran),"tranTuanPhut":600}},
     {"khaNang":"chan_web","mucDo":"du","coChe":"x","cauHinh":{"webDomainsChan":\(webChan),"giaiTriCanPhien":["youtube.com","roblox.com"]}},
     {"khaNang":"khoa_ngay","mucDo":"du","coChe":"x","cauHinh":{"khoaNgay":\(khoaNgay)}},
     {"khaNang":"khoa_khong_tuan_thu","mucDo":"du","coChe":"x","cauHinh":{"khoaGiaiTri":\(!giaiTriDuocMo),"lyDo":\(giaiTriDuocMo ? "[]" : #"["khong_tuan_thu"]"#)}},
     {"khaNang":"nhip","mucDo":"mot_phan","coChe":"x"}]},
   "lenh":\(lenh)\(g)}
  """.data(using: .utf8)!
}

func doc(_ d: Data) throws -> NhipTraVe { try JSONDecoder().decode(NhipTraVe.self, from: d) }

/// Giờ Việt Nam (UTC+7). 24/10/2026 là thứ Bảy, 26/10/2026 là thứ Hai.
func vn(_ ngay: Int, _ gio: Int, _ phut: Int = 0) -> Date {
  var c = DateComponents(year: 2026, month: 10, day: ngay, hour: gio, minute: phut)
  c.timeZone = TimeZone(identifier: "Asia/Ho_Chi_Minh")
  return Calendar(identifier: .gregorian).date(from: c)!
}

final class KeHoachTests: XCTestCase {
  func testGiaiMaPhanHoiNhip() throws {
    let n = try doc(nhipMau())
    XCTAssertEqual(n.nenTang.nen, "ios")
    XCTAssertEqual(n.chinhSach.con?.ten, "Bin")
    XCTAssertEqual(n.nenTang.cauHinh("khung_gio")["lichMo"]?["ngayThuong"]?.dsKhung, [Khung(tu: "17:00", den: "19:00")])
  }

  func testLichTheoThuKhiNgayThuongKhacCuoiTuan() throws {
    let kh = LapKeHoach.tu(try doc(nhipMau()), now: vn(24, 10))
    let ten = kh.lich.map(\.ten)
    XCTAssertTrue(ten.contains("ngu")); XCTAssertTrue(ten.contains("ngay"))
    // 5 ngày thường × 1 khung + 2 ngày cuối tuần × 2 khung
    XCTAssertEqual(kh.lich.filter { $0.ten.hasPrefix("mo.") }.count, 9)
    let t2 = kh.lich.first { $0.ten == "mo.t2.0" }!
    XCTAssertEqual(t2.thu, 2); XCTAssertEqual(t2.batDau, 17 * 60); XCTAssertEqual(t2.ketThuc, 19 * 60)
    XCTAssertEqual(kh.lich.first { $0.ten == "mo.t1.1" }?.batDau, 15 * 60)   // Chủ nhật, khung thứ hai
    XCTAssertLessThanOrEqual(kh.lich.count, LapKeHoach.lichToiDa)
  }

  func testLichChungKhiMoiNgayGiongNhau() throws {
    let k = #"[{"tu":"16:00","den":"18:00"}]"#
    let kh = LapKeHoach.tu(try doc(nhipMau(ngayThuong: k, cuoiTuan: k)), now: vn(24, 10))
    let mo = kh.lich.filter { $0.ten.hasPrefix("mo.") }
    XCTAssertEqual(mo.count, 1); XCTAssertNil(mo[0].thu)
  }

  func testGioNguQuaNuaDem() throws {
    let kh = LapKeHoach.tu(try doc(nhipMau()), now: vn(24, 10))
    let ngu = kh.lich.first { $0.ten == "ngu" }!
    XCTAssertEqual(ngu.batDau, 21 * 60 + 30); XCTAssertEqual(ngu.ketThuc, 6 * 60 + 30); XCTAssertTrue(ngu.lap)
  }

  func testTranVaSuKienDoPhut() throws {
    let kh = LapKeHoach.tu(try doc(nhipMau(tran: 90, phutThem: 30)), now: vn(24, 10))
    XCTAssertEqual(kh.tranPhut, 120)
    let ngay = kh.lich.first { $0.ten == "ngay" }!
    XCTAssertEqual(ngay.suKien.last, SuKien(ten: "tran", phut: 120))
    XCTAssertEqual(ngay.suKien.first, SuKien(ten: "dung.5", phut: 5))
    XCTAssertEqual(ngay.suKien.count, 120 / 5 + 1)    // dung.5 … dung.115 + nhac5 + tran
    XCTAssertTrue(ngay.suKien.contains(SuKien(ten: "nhac5", phut: 115)))
    XCTAssertLessThanOrEqual(LapKeHoach.buocDo(480), 15)
    XCTAssertLessThanOrEqual(480 / LapKeHoach.buocDo(480), 40)
  }

  func testWebChuanHoaVaKhongTrung() throws {
    let kh = LapKeHoach.tu(try doc(nhipMau()), now: vn(24, 10))
    XCTAssertEqual(kh.webChan, ["tiktok.com", "roblox.com"])
    XCTAssertEqual(kh.webGiaiTri, ["youtube.com"])     // roblox.com đã chặn hẳn
  }

  func testWebToiDa50() throws {
    let ds = "[" + (0..<70).map { "\"web\($0).vn\"" }.joined(separator: ",") + "]"
    let kh = LapKeHoach.tu(try doc(nhipMau(webChan: ds)), now: vn(24, 10))
    XCTAssertEqual(kh.webChan.count, 50); XCTAssertTrue(kh.webGiaiTri.isEmpty); XCTAssertFalse(kh.canhBao.isEmpty)
  }

  func testThemGioLichKetThucDungHan() throws {
    let now = vn(24, 10)
    let kh = LapKeHoach.tu(try doc(nhipMau(grant: "2026-10-24T03:10:00.000Z")), now: now)   // 10:10 VN — chỉ còn 10 phút
    let t = kh.lich.first { $0.ten == "themgio" }!
    XCTAssertFalse(t.lap)
    XCTAssertEqual(t.ketThucLuc, NgayISO.doc("2026-10-24T03:10:00.000Z"))
    XCTAssertEqual(t.ketThucLuc!.timeIntervalSince(t.batDauLuc!), 15 * 60, accuracy: 1)   // lùi bắt đầu cho đủ 15 phút
  }

  func testMoKhanCapDaHetHanBiBo() throws {
    let kh = LapKeHoach.tu(try doc(nhipMau(moKhanCap: #""2026-10-24T02:00:00.000Z""#)), now: vn(24, 10))
    XCTAssertNil(kh.moDen); XCTAssertNil(kh.lich.first { $0.ten == "themgio" })
  }

  func testQuaNhieuKhungBiCatVaCanhBao() throws {
    let k = "[" + (0..<4).map { #"{"tu":"\#(String(format: "%02d", 8 + $0 * 2)):00","den":"\#(String(format: "%02d", 9 + $0 * 2)):00"}"# }.joined(separator: ",") + "]"
    let kh = LapKeHoach.tu(try doc(nhipMau(ngayThuong: k)), now: vn(24, 10))
    XCTAssertEqual(kh.lich.count, LapKeHoach.lichToiDa)
    XCTAssertFalse(kh.canhBao.isEmpty)
  }
}

final class TinhKhienTests: XCTestCase {
  func kh(_ n: Data, _ now: Date) throws -> KeHoach { LapKeHoach.tu(try doc(n), now: now) }

  func testTrongGioChoiKhongKhien() throws {
    let now = vn(24, 10, 15)                                // thứ Bảy 10:15 — trong 09:00–11:00
    let k = TinhKhien.lucNay(try kh(nhipMau(), now), now: now, dung: nil)
    XCTAssertEqual(k.muc, .khong); XCTAssertEqual(k.webChan, ["tiktok.com", "roblox.com"])
  }

  func testNgoaiGioKhienGiaiTriVaChanWebGiaiTri() throws {
    let now = vn(26, 10)                                    // thứ Hai 10:00 — ngoài 17:00–19:00
    let k = TinhKhien.lucNay(try kh(nhipMau(), now), now: now, dung: nil)
    XCTAssertEqual(k.muc, .giaiTri); XCTAssertEqual(k.lyDo, .ngoaiGio)
    XCTAssertTrue(k.webChan.contains("youtube.com"))
  }

  func testGioNguKhienMoiAppCaSauNuaDem() throws {
    let a = vn(24, 23), b = vn(25, 5, 59), c = vn(25, 6, 30)
    let p = try kh(nhipMau(), a)
    XCTAssertEqual(TinhKhien.lucNay(p, now: a, dung: nil).lyDo, .ngu)
    XCTAssertEqual(TinhKhien.lucNay(p, now: b, dung: nil).muc, .moiApp)
    XCTAssertNotEqual(TinhKhien.lucNay(p, now: c, dung: nil).lyDo, .ngu)
  }

  func testKhoaNgayThangThemGio() throws {
    let now = vn(24, 10)
    let k = TinhKhien.lucNay(try kh(nhipMau(khoaNgay: true, grant: "2026-10-24T05:00:00.000Z"), now), now: now, dung: nil)
    XCTAssertEqual(k.muc, .moiApp); XCTAssertEqual(k.lyDo, .khoaNgay)
  }

  func testThemGioMoNgoaiKhungRoiTuDongDongLai() throws {
    let now = vn(26, 10)                                    // ngoài khung
    let p = try kh(nhipMau(grant: "2026-10-26T03:30:00.000Z"), now)   // tới 10:30
    let mo = TinhKhien.lucNay(p, now: now, dung: nil)
    XCTAssertEqual(mo.muc, .khong); XCTAssertTrue(mo.dangThemGio)
    XCTAssertFalse(mo.webChan.contains("youtube.com"))
    XCTAssertEqual(TinhKhien.lucNay(p, now: vn(26, 10, 31), dung: nil).lyDo, .ngoaiGio)
  }

  func testThemGioKhongThangGioNgu() throws {
    let now = vn(24, 22)
    let p = try kh(nhipMau(grant: "2026-10-24T16:00:00.000Z"), now)
    XCTAssertEqual(TinhKhien.lucNay(p, now: now, dung: nil).lyDo, .ngu)
  }

  func testKhongTuanThuKhienGiaiTri() throws {
    let now = vn(24, 10)
    let k = TinhKhien.lucNay(try kh(nhipMau(giaiTriDuocMo: false), now), now: now, dung: nil)
    XCTAssertEqual(k.muc, .giaiTri); XCTAssertEqual(k.lyDo, .khongTuanThu)
  }

  func testHetTranTrongGioChoi() throws {
    let now = vn(24, 10)
    let p = try kh(nhipMau(tran: 60), now)
    var nk = TinhKhien.ghiSuKien("dung.30", cu: nil, kh: p, now: now)
    XCTAssertEqual(TinhKhien.phutConLai(p, now: now, dung: nk), 30)
    nk = TinhKhien.ghiSuKien("tran", cu: nk, kh: p, now: now)
    let k = TinhKhien.lucNay(p, now: now, dung: nk)
    XCTAssertEqual(k.muc, .giaiTri); XCTAssertEqual(k.lyDo, .hetGio)
    // Ba Mẹ thêm 30 phút ⇒ trần 90 ⇒ còn 30 phút, mở lại
    let p2 = try kh(nhipMau(tran: 60, phutThem: 30), now)
    XCTAssertEqual(TinhKhien.phutConLai(p2, now: now, dung: nk), 30)
    XCTAssertEqual(TinhKhien.lucNay(p2, now: now, dung: nk).muc, .khong)
  }

  func testSangNgayMoiDemLai() throws {
    let p = try kh(nhipMau(tran: 60), vn(24, 10))
    let nk = TinhKhien.ghiSuKien("tran", cu: nil, kh: p, now: vn(24, 10))
    XCTAssertEqual(TinhKhien.phutConLai(p, now: vn(25, 10), dung: nk), 60)
    let moi = TinhKhien.ghiSuKien("dung.5", cu: nk, kh: p, now: vn(25, 10))
    XCTAssertEqual(moi.phut, 5); XCTAssertFalse(moi.tranHet)
  }

  func testTranBangKhongLaKhongDuocChoi() throws {
    let now = vn(24, 10)
    XCTAssertEqual(TinhKhien.lucNay(try kh(nhipMau(tran: 0), now), now: now, dung: nil).lyDo, .hetGio)
  }

  func testKhungChua() {
    let k = Khung(tu: "21:30", den: "06:30")
    XCTAssertTrue(k.chua(23 * 60)); XCTAssertTrue(k.chua(0)); XCTAssertFalse(k.chua(12 * 60))
    XCTAssertTrue(Khung(tu: "20:00", den: "24:00").chua(1439))
    XCTAssertFalse(Khung(tu: "08:00", den: "08:00").chua(480))
  }
}

final class LienKetTests: XCTestCase {
  let tok = "AbCdEf0123456789_-xyz"
  func testUniversalLink() {
    XCTAssertEqual(LienKet.doc(URL(string: "https://aiigrow.aiilab.vn/cai/\(tok)")!), .token(tok, mayChu: URL(string: "https://aiigrow.aiilab.vn")))
  }
  func testScheme() { XCTAssertEqual(LienKet.doc(URL(string: "aiigrowcon://cai/\(tok)")!), .token(tok, mayChu: nil)) }
  func testSai() {
    XCTAssertNil(LienKet.doc(URL(string: "https://aiigrow.aiilab.vn/khac/\(tok)")!))
    XCTAssertNil(LienKet.doc(URL(string: "http://aiigrow.aiilab.vn/cai/\(tok)")!))
    XCTAssertNil(LienKet.doc(URL(string: "https://aiigrow.aiilab.vn/cai/ngan")!))
    XCTAssertNil(LienKet.doc(chuoi: "12345"))
    XCTAssertNil(LienKet.doc(chuoi: "12a456"))
  }
  func testMa6So() {
    XCTAssertEqual(LienKet.doc(chuoi: " 123 456 "), .ma("123456"))
    XCTAssertEqual(LienKet.doc(chuoi: "https://aiigrow.aiilab.vn/cai/\(tok)"), .token(tok, mayChu: URL(string: "https://aiigrow.aiilab.vn")))
  }
}

// MARK: client + đồng bộ với bản giả
final class VanChuyenGia: VanChuyen {
  var tra: [String: (Data, Int)] = [:]
  var da: [URLRequest] = []
  func gui(_ req: URLRequest) async throws -> (Data, Int) {
    da.append(req)
    let k = "\(req.httpMethod ?? "") \(req.url!.path)"
    guard let r = tra[k] else { throw URLError(.notConnectedToInternet) }
    return r
  }
  func than(_ i: Int) -> [String: Any] { (try? JSONSerialization.jsonObject(with: da[i].httpBody ?? Data())) as? [String: Any] ?? [:] }
}

final class KhienGia: HeThongKhien {
  var lan: [KhienMuonCo] = []; var go = 0
  func ap(_ k: KhienMuonCo) { lan.append(k) }
  func goHet() { go += 1 }
}
final class LichGia: HeThongLich {
  var lich: [MucLich] = []; var dung = 0
  func theoDoi(_ l: [MucLich]) throws { lich = l }
  func dungHet() { dung += 1 }
}
final class UyQuyenGia: HeThongUyQuyen {
  var trangThai = "approved"; var thuHoiLan = 0
  func thuHoi() async { thuHoiLan += 1 }
}
final class ChonGia: NguonLuaChon { func dem() -> SoLuongChon { SoLuongChon(hoc: 3, giaiTri: 5, chan: 1, danhMucGiaiTri: 2) } }

final class ApiVaDongBoTests: XCTestCase {
  var vc = VanChuyenGia(), kho = KhoBoNho(), khien = KhienGia(), lich = LichGia(), uq = UyQuyenGia(), daXoaToken = false

  func dongBo() -> DongBo {
    DongBo(api: ApiClient(goc: URL(string: "https://may.chu")!, token: "tk", vanChuyen: vc), kho: kho, khien: khien, lich: lich,
           uyQuyen: uq, chon: ChonGia(), xoaToken: { [unowned self] in daXoaToken = true })
  }

  func testGhepBangMaGuiNenIos() async throws {
    vc.tra["POST /api/device/ghep"] = (#"{"deviceId":"d1","token":"t1","dungChung":false,"childName":"Bin"}"#.data(using: .utf8)!, 200)
    let kq = try await ApiClient(goc: URL(string: "https://may.chu")!, vanChuyen: vc).ghepBangMa("123 456", tenMay: "iPad")
    XCTAssertEqual(kq.childName, "Bin")
    XCTAssertEqual(vc.than(0)["nen"] as? String, "ios"); XCTAssertEqual(vc.than(0)["ma"] as? String, "123456")
    XCTAssertNil(vc.da[0].value(forHTTPHeaderField: "Authorization"))
  }

  func testGhepBangTokenDungGhepGoi() async throws {
    vc.tra["POST /api/device/ghep-goi"] = (#"{"deviceId":"d1","token":"t1"}"#.data(using: .utf8)!, 200)
    _ = try await ApiClient(goc: URL(string: "https://may.chu")!, vanChuyen: vc).ghepBangToken("abc", tenMay: "iPhone")
    XCTAssertEqual(vc.than(0)["token"] as? String, "abc"); XCTAssertEqual(vc.than(0)["nen"] as? String, "ios")
  }

  func testLoiMayChuDocCau() async {
    vc.tra["POST /api/device/ghep"] = (#"{"error":"ma_het_han","message":"Mã đã hết hạn — xin Ba Mẹ mã mới"}"#.data(using: .utf8)!, 410)
    do { _ = try await ApiClient(goc: URL(string: "https://may.chu")!, vanChuyen: vc).ghepBangMa("123456", tenMay: "x"); XCTFail() }
    catch { XCTAssertEqual(error as? LoiApi, .mayChu(ma: "ma_het_han", cau: "Mã đã hết hạn — xin Ba Mẹ mã mới", http: 410)) }
  }

  func testMotLuotDongBo() async throws {
    vc.tra["POST /api/device/nhip"] = (nhipMau(), 200)
    let kq = try await dongBo().chay(now: vn(26, 10))
    guard case .xong(let kh) = kq else { return XCTFail() }
    XCTAssertEqual(vc.da[0].value(forHTTPHeaderField: "Authorization"), "Bearer tk")
    let b = vc.than(0)
    XCTAssertEqual(b["appQuanLyBat"] as? Bool, true)
    XCTAssertEqual((b["ios"] as? [String: Any])?["soAppGiaiTri"] as? Int, 5)
    XCTAssertNil((b["ios"] as? [String: Any])?["token"])       // không gửi token app
    XCTAssertEqual(lich.lich, kh.lich)
    XCTAssertEqual(khien.lan.last?.lyDo, .ngoaiGio)
    XCTAssertEqual(kho.doc(KeHoach.self, Khoa.keHoach), kh)
  }

  func testMatMangVanApTheoKeHoachDaNho() async throws {
    vc.tra["POST /api/device/nhip"] = (nhipMau(), 200)
    try await dongBo().chay(now: vn(26, 10))
    vc.tra = [:]
    do { try await dongBo().chay(now: vn(26, 17, 30)); XCTFail() } catch { guard case .mang = error as? LoiApi else { return XCTFail("\(error)") } }
    let k = dongBo().apLucNay(now: vn(26, 17, 30))
    XCTAssertEqual(k?.muc, .khong)
  }

  func testLenhGoTuXa() async throws {
    vc.tra["POST /api/device/nhip"] = (nhipMau(lenh: #"[{"id":"L1","loai":"go"}]"#), 200)
    vc.tra["POST /api/device/lenh/L1/xong"] = ("{}".data(using: .utf8)!, 200)
    kho.luu(ThongTinMay(deviceId: "d", tenCon: "Bin", dungChung: false), Khoa.thongTinMay)
    let kq = try await dongBo().chay(now: vn(26, 10))
    XCTAssertEqual(kq, .daGo)
    XCTAssertEqual(lich.dung, 1); XCTAssertEqual(khien.go, 1); XCTAssertEqual(uq.thuHoiLan, 1)
    XCTAssertTrue(daXoaToken); XCTAssertNil(kho.data(Khoa.thongTinMay))
    XCTAssertTrue(vc.da.contains { $0.url!.path == "/api/device/lenh/L1/xong" })
  }

  func testXinThemGioVaTheoDoiTrangThai() async throws {
    vc.tra["POST /api/device/yeu-cau"] = (#"{"id":"Y1","trang_thai":"cho","status":"cho"}"#.data(using: .utf8)!, 200)
    let yc = try await dongBo().xinThemGio(phut: 60, loiNhan: "  Con làm xong bài rồi ")
    XCTAssertEqual(yc.trangThai, "cho")
    XCTAssertEqual(vc.than(0)["loai"] as? String, "them_gio"); XCTAssertEqual(vc.than(0)["phut"] as? Int, 60)
    XCTAssertEqual(vc.than(0)["lyDo"] as? String, "Con làm xong bài rồi")
    vc.tra["GET /api/device/yeu-cau/Y1"] = (#"{"status":"duoc","trangThai":"dong_y"}"#.data(using: .utf8)!, 200)
    await dongBo().capNhatYeuCau()
    let sau = kho.doc(YeuCauDangCho.self, Khoa.yeuCauDangCho)!
    XCTAssertTrue(sau.xong); XCTAssertEqual(sau.cau, "Ba Mẹ đã đồng ý thêm 60 phút!")
  }

  // MARK: mục 5 — phiên Chơi bằng điểm, mã mở offline, nhắc 5 phút

  func nhipPhien(_ id: String?, conPhut: Int = 30, biMat: String? = nil) throws -> NhipTraVe {
    var s = String(data: nhipMau(), encoding: .utf8)!
    if let id { s = s.replacingOccurrences(of: #""phien":null"#, with: #""phien":{"id":"\#(id)","muc":"com.mojang.minecraftpe","conPhut":\#(conPhut),"may":"m1"}"#) }
    if let biMat { s = s.replacingOccurrences(of: #""lenh":[]"#, with: #""lenh":[],"maOfflineBiMat":"\#(biMat)""#) }
    return try JSONDecoder().decode(NhipTraVe.self, from: s.data(using: .utf8)!)
  }

  func testPhienDiemGoKhienDungSoPhutVaKhongTuKeoDai() throws {
    let t0 = vn(26, 10)                          // thứ Hai 10:00 — ngoài khung 17–19 ⇒ bình thường đang khiên giải trí
    let kh = LapKeHoach.tu(try nhipPhien("P1"), now: t0)
    XCTAssertEqual(kh.phienDiemDen, t0.addingTimeInterval(30 * 60))
    let l = kh.lich.first { $0.ten == "phiendiem" }!
    XCTAssertFalse(l.lap); XCTAssertEqual(l.ketThucLuc, kh.phienDiemDen); XCTAssertEqual(l.nhacTruocPhut, 5)
    let k = TinhKhien.lucNay(kh, now: t0.addingTimeInterval(60), dung: nil)
    XCTAssertEqual(k.muc, .khong); XCTAssertEqual(k.dangChoiDiem, true)
    XCTAssertEqual(TinhKhien.lucNay(kh, now: t0.addingTimeInterval(31 * 60), dung: nil).lyDo, .ngoaiGio)
    // iOS gọi intervalDidEnd sớm vài giây trước hạn ⇒ có dung sai thì coi như đã hết (khiên bật lại); không dung sai thì vẫn mở
    let sapHet = kh.phienDiemDen!.addingTimeInterval(-20)
    XCTAssertEqual(TinhKhien.lucNay(kh, now: sapHet, dung: nil).dangChoiDiem, true)
    XCTAssertEqual(TinhKhien.lucNay(kh, now: sapHet, dung: nil, dungSai: LapKeHoach.dungSaiHetLich).lyDo, .ngoaiGio)
    XCTAssertEqual(TinhKhien.lucNay(kh, now: sapHet, dung: nil, moOfflineDen: sapHet.addingTimeInterval(30), dungSai: LapKeHoach.dungSaiHetLich).lyDo, .ngoaiGio)
    // đồng bộ lại 20 phút sau, máy chủ vẫn báo conPhut 30 (không nhịp) ⇒ hạn KHÔNG dời
    let kh2 = LapKeHoach.tu(try nhipPhien("P1"), now: t0.addingTimeInterval(20 * 60), truoc: kh)
    XCTAssertEqual(kh2.phienDiemDen, kh.phienDiemDen)
    // phiên mới ⇒ neo lại; hết phiên ⇒ không lịch
    XCTAssertEqual(LapKeHoach.tu(try nhipPhien("P2", conPhut: 10), now: t0.addingTimeInterval(40 * 60), truoc: kh2).phienDiemDen,
                   t0.addingTimeInterval(50 * 60))
    // hết cửa sổ mà máy chủ vẫn báo cùng phiên (chưa nhận nhịp) ⇒ KHÔNG mở cửa sổ mới
    let quaHan = LapKeHoach.tu(try nhipPhien("P1"), now: t0.addingTimeInterval(45 * 60), truoc: kh2)
    XCTAssertNil(quaHan.lich.first { $0.ten == "phiendiem" })
    XCTAssertEqual(LapKeHoach.tu(try nhipPhien("P1"), now: t0.addingTimeInterval(90 * 60), truoc: quaHan).phienDiemDen, kh.phienDiemDen)
    let het = LapKeHoach.tu(try nhipPhien(nil), now: t0, truoc: kh)
    XCTAssertNil(het.phienDiemDen); XCTAssertNil(het.lich.first { $0.ten == "phiendiem" })
    // Khoá ngay / giờ ngủ vẫn thắng phiên điểm
    XCTAssertEqual(TinhKhien.lucNay(kh, now: vn(26, 22), dung: nil).lyDo, .ngu)
    // phiên mở trên máy KHÁC (máy tính) ⇒ iPhone không gỡ khiên; mở trên chính máy này (may = m1) ⇒ gỡ
    let s = String(data: nhipMau(), encoding: .utf8)!
    let khac = s.replacingOccurrences(of: #""phien":null"#, with: #""phien":{"id":"P9","muc":"roblox.exe","conPhut":30,"may":"pc1"}"#)
    XCTAssertNil(LapKeHoach.tu(try JSONDecoder().decode(NhipTraVe.self, from: khac.data(using: .utf8)!), now: t0).phienDiemDen)
    let minh = s.replacingOccurrences(of: #""phien":null"#, with: #""phien":{"id":"P9","muc":"x","conPhut":30,"may":"m1"}"#)
    XCTAssertNotNil(LapKeHoach.tu(try JSONDecoder().decode(NhipTraVe.self, from: minh.data(using: .utf8)!), now: t0).phienDiemDen)
  }

  func testLichMotLanChenVaoDanhSachDay() {
    let day = (0..<LapKeHoach.lichToiDa).map { MucLich(ten: $0 == 0 ? "ngay" : "mo.\($0)", batDau: 0, ketThuc: 60, thu: nil, lap: true, suKien: []) }
    let t = vn(26, 10)
    let ds = LapKeHoach.themLich(day, LapKeHoach.lichMotLan("mooffline", den: t.addingTimeInterval(3600), now: t))
    XCTAssertEqual(ds.count, LapKeHoach.lichToiDa); XCTAssertEqual(ds.last?.ten, "mooffline"); XCTAssertEqual(ds.last?.nhacTruocPhut, 5)
    XCTAssertTrue(ds.contains { $0.ten == "ngay" })
  }

  func testMaOfflineCungSoVoiMayChuVaWindows() {
    // RFC 6238 phụ lục B (SHA1, T = 59 s, bước 30, 8 số) + vector AiiGrow trong server/lib/ma-offline.test.ts
    XCTAssertEqual(MaOffline.ma("12345678901234567890", now: Date(timeIntervalSince1970: 59), buocGiay: 30, soChuSo: 8), "94287082")
    let t = Date(timeIntervalSince1970: 1_700_000_000)
    XCTAssertEqual(MaOffline.ma("aiigrow-thu-ma-offline", now: t), "703799")
    XCTAssertTrue(MaOffline.kiem("aiigrow-thu-ma-offline", "703 799", now: t.addingTimeInterval(300)))   // dung sai ±1 bước
    XCTAssertFalse(MaOffline.kiem("aiigrow-thu-ma-offline", "703799", now: t.addingTimeInterval(900)))
    XCTAssertFalse(MaOffline.kiem(nil, "703799", now: t))
    XCTAssertEqual(MaOffline.van("abcDEF_123-xyz"), "cabe62fd6d16")      // cùng số với máy chủ vanBiMat + agent Android
  }

  func testMoTamOfflineMotMaMotLuotSaiNhieuThiCho() {
    let bm = "aiigrow-thu-ma-offline", t = Date(timeIntervalSince1970: 1_700_000_000)
    var mt = MoTamOffline()
    XCTAssertEqual(mt.thuMo(biMat: nil, ma: "703799", now: t), .chuaCoBiMat)
    XCTAssertEqual(mt.thuMo(biMat: bm, ma: "703799", now: t), .daMo)
    XCTAssertEqual(mt.hanMo(t.addingTimeInterval(59 * 60)), t.addingTimeInterval(60 * 60))
    XCTAssertEqual(mt.thuMo(biMat: bm, ma: "703799", now: t.addingTimeInterval(60)), .dangMo)
    XCTAssertEqual(mt.ketThucKhiCoMang(t.addingTimeInterval(10 * 60)), 50)
    XCTAssertEqual(mt.thuMo(biMat: bm, ma: "703799", now: t.addingTimeInterval(11 * 60)), .daDung)
    var m2 = MoTamOffline()
    for i in 0..<5 { XCTAssertEqual(m2.thuMo(biMat: bm, ma: "000000", now: t.addingTimeInterval(Double(i))), .sai) }
    XCTAssertEqual(m2.thuMo(biMat: bm, ma: "703799", now: t.addingTimeInterval(10)), .choThuLai)
    XCTAssertEqual(m2.thuMo(biMat: bm, ma: MaOffline.ma(bm, now: t.addingTimeInterval(700)), now: t.addingTimeInterval(700)), .daMo)
    // lùi đồng hồ vào giữa lượt mở đã thấy hết ⇒ không hồi sinh
    var m3 = MoTamOffline()
    XCTAssertEqual(m3.thuMo(biMat: bm, ma: "703799", now: t), .daMo)
    _ = m3.ghiThay(t.addingTimeInterval(65 * 60))
    XCTAssertNil(m3.hanMo(t.addingTimeInterval(10 * 60)))
    // lùi đồng hồ về trước lúc nhập để gõ lại mã cũ ⇒ không nhận
    XCTAssertEqual(m3.thuMo(biMat: bm, ma: "703799", now: t.addingTimeInterval(-90)), .daDung)
  }

  func testDongBoNhoBiMatMoBangMaVaHetKhiCoMang() async throws {
    var nho: String?
    let db = DongBo(api: ApiClient(goc: URL(string: "https://thu.vn")!, token: "t", vanChuyen: vc), kho: kho, khien: khien, lich: lich, uyQuyen: uq,
                    chon: ChonGia(), xoaToken: {}, docBiMatOffline: { nho }, luuBiMatOffline: { nho = $0 })
    vc.tra["POST /api/device/nhip"] = (try JSONEncoder().encode(try nhipPhien(nil, biMat: "aiigrow-thu-ma-offline")), 200)
    vc.tra["POST /api/device/su-kien"] = (#"{"nhan":1}"#.data(using: .utf8)!, 200)
    try await db.chay(now: vn(26, 10))
    XCTAssertEqual(nho, "aiigrow-thu-ma-offline")
    let t = vn(26, 22)                           // giờ ngủ ⇒ khiên mọi app; mã Ba Mẹ đọc ⇒ mở
    let (kq, _) = db.moBangMaOffline(MaOffline.ma(nho!, now: t), biMat: nho, now: t)
    XCTAssertEqual(kq, .daMo)
    XCTAssertEqual(khien.lan.last?.dangMoOffline, true)
    XCTAssertTrue(lich.lich.contains { $0.ten == "mooffline" })
    XCTAssertEqual(kho.doc([SuKienMay].self, Khoa.suKienCho)?.first?.loai, "mo_ma_offline")
    // có mạng lại ⇒ hết lượt mở, gửi sự kiện, vân bí mật đi kèm nhịp
    try await db.chay(now: t.addingTimeInterval(120))
    XCTAssertNil(kho.doc(MoTamOffline.self, Khoa.moTamOffline)?.hanMo(t.addingTimeInterval(121)))
    XCTAssertEqual(khien.lan.last?.lyDo, .ngu)
    XCTAssertNil(kho.doc([SuKienMay].self, Khoa.suKienCho))
    XCTAssertTrue(vc.da.contains { $0.url!.path == "/api/device/su-kien" })
    let nhipCuoi = vc.da.last { $0.url!.path == "/api/device/nhip" }!
    let than = try JSONSerialization.jsonObject(with: nhipCuoi.httpBody!) as! [String: Any]
    XCTAssertEqual(than["maOfflineVan"] as? String, MaOffline.van("aiigrow-thu-ma-offline"))
  }

  func testLoiNhanTrongDungCauMacDinh() async throws {
    vc.tra["POST /api/device/yeu-cau"] = (#"{"id":"Y2","trang_thai":"dong_y","status":"tu_duyet"}"#.data(using: .utf8)!, 200)
    let yc = try await dongBo().xinThemGio(phut: 30, loiNhan: " ")
    XCTAssertEqual(vc.than(0)["lyDo"] as? String, "Con xin thêm 30 phút")
    XCTAssertTrue(yc.xong)
  }
}


/// Luật 05/11 trên iPhone/iPad: quỹ phút thay trần + khung giờ chơi, giờ học, ngoại lệ cả máy thắng giờ ngủ, web luôn chặn.
final class QuyGioTests: XCTestCase {
  let quy = #""quy":{"ngayPhut":60,"themPhut":15,"daDung":40,"conPhut":35,"dangHoc":false,"tyLe":{"sao":10,"phut":20}},"#

  func testQuyThayTranVaKhungGio() throws {
    let kh = LapKeHoach.tu(try doc(nhipMau(them05: quy)), now: vn(26, 10))
    XCTAssertEqual(kh.tranPhut, 75); XCTAssertEqual(kh.phut10Sao, 20)
    XCTAssertTrue(kh.lich.filter { $0.ten.hasPrefix("mo.") }.isEmpty, "quỹ: không còn lịch khung giờ chơi")
    // 10:00 thứ Hai — ngoài khung chơi cũ 17–19 nhưng quỹ còn ⇒ mở
    let k = TinhKhien.lucNay(kh, now: vn(26, 10), dung: nil)
    XCTAssertEqual(k.lyDo, .khong)
    XCTAssertEqual(TinhKhien.phutConLai(kh, now: vn(26, 10), dung: nil), 35, "máy chủ đã tính 40 phút (mọi máy)")
    XCTAssertEqual(TinhKhien.phutConLai(kh, now: vn(26, 10), dung: NhatKyDung(ngay: "2026-10-26", phut: 70, tranHet: false)), 5, "đo tại chỗ lớn hơn ⇒ dùng số đo")
    // PC dùng 30 trong 40 của máy chủ; lúc đồng bộ iPhone đo 10, sau đó chơi thêm 30 (đo 40) ⇒ đã dùng 70 ⇒ còn 5
    var k2 = kh; k2.dungTaiChoLucDongBo = 10
    XCTAssertEqual(TinhKhien.phutConLai(k2, now: vn(26, 10), dung: NhatKyDung(ngay: "2026-10-26", phut: 40, tranHet: false)), 5)
    XCTAssertEqual(TinhKhien.phutConLai(kh, now: vn(27, 10), dung: nil), 60, "sang ngày: quỹ ngày, không phút máy chủ / phút thêm của hôm qua")
    XCTAssertEqual(TinhKhien.lucNay(kh, now: vn(26, 10), dung: NhatKyDung(ngay: "2026-10-26", phut: 75, tranHet: true)).lyDo, .hetGio)
  }

  func testGioHocChiAppHoc() throws {
    let kh = LapKeHoach.tu(try doc(nhipMau(them05: quy + #""gioHoc":{"tu":"14:00","den":"16:00","thu":[1,2,3,4,5]},"#)), now: vn(26, 10))
    XCTAssertEqual(kh.hocThu, [2, 3, 4, 5, 6])
    XCTAssertEqual(kh.lich.filter { $0.ten.hasPrefix("hoc.") }.count, 5)
    XCTAssertEqual(TinhKhien.lucNay(kh, now: vn(26, 15), dung: nil).lyDo, .gioHoc)
    XCTAssertEqual(TinhKhien.lucNay(kh, now: vn(25, 15), dung: nil).lyDo, .khong, "Chủ nhật không có giờ học")
    XCTAssertEqual(TinhKhien.lucNay(kh, now: vn(26, 15), dung: nil).muc, .giaiTri)
  }

  func testNgoaiLeCaMayThangGioNgu() throws {
    let nl = #""ngoaiLeMo":[{"id":"a","den":"2026-10-26T16:00:00.000Z","muc":null,"nhom":"ios"},{"id":"b","den":"2026-10-26T16:30:00.000Z","muc":null,"nhom":"may_tinh"}],"#
    let kh = LapKeHoach.tu(try doc(nhipMau(them05: quy + nl)), now: vn(26, 22))
    XCTAssertEqual(kh.ngoaiLeDen, vn(26, 23), "chỉ ngoại lệ của nhóm iPhone/iPad")
    XCTAssertTrue(kh.lich.contains { $0.ten == "ngoaile" })
    let k = TinhKhien.lucNay(kh, now: vn(26, 22), dung: nil)
    XCTAssertEqual(k.muc, .khong); XCTAssertEqual(k.dangNgoaiLe, true)
    XCTAssertEqual(TinhKhien.lucNay(kh, now: vn(26, 23, 1), dung: nil).lyDo, .ngu, "hết hạn ⇒ khoá lại")
    XCTAssertTrue(LyDoKhien.ngu.chiNgoaiLe); XCTAssertTrue(LyDoKhien.gioHoc.chiNgoaiLe); XCTAssertFalse(LyDoKhien.hetGio.chiNgoaiLe)
  }

  func testWebLuonChanVaMayChuCu() throws {
    let d = Data(String(decoding: nhipMau(them05: quy), as: UTF8.self)
      .replacingOccurrences(of: #""chuaXep":"chan"}"#, with: #""chuaXep":"chan","cheDoChan":"chi_app_duoc_phep","webLuonChan":["pornhub.com"]}"#).utf8)
    let kh = LapKeHoach.tu(try doc(d), now: vn(26, 10))
    XCTAssertTrue(kh.webChan.contains("pornhub.com"))
    // máy chủ cũ (không quy) ⇒ luật cũ: khung giờ chơi vẫn chặn
    let cu = LapKeHoach.tu(try doc(nhipMau()), now: vn(26, 10))
    XCTAssertNil(cu.daDungMayChu)
    XCTAssertEqual(TinhKhien.lucNay(cu, now: vn(26, 10), dung: nil).lyDo, .ngoaiGio)
    // kế hoạch cũ lưu trong kho (không có trường mới) vẫn đọc được
    var o = try JSONSerialization.jsonObject(with: JSONEncoder().encode(cu)) as! [String: Any]
    o.removeValue(forKey: "daDungMayChu"); o.removeValue(forKey: "hoc")
    XCTAssertNoThrow(try JSONDecoder().decode(KeHoach.self, from: JSONSerialization.data(withJSONObject: o)))
  }
}

// MARK: 06/11 — PIN theo bé, mã mở máy 60/30/15, «Mở hết», hằng ngày (docs/API.md mục «S3»)
final class PinBeTests: XCTestCase {
  let quy = #""quy":{"ngayPhut":60,"themPhut":0,"daDung":10,"conPhut":50,"dangHoc":false,"tyLe":{"sao":10,"phut":10}},"#
  let bm = "aiigrow-thu-ma-offline", t = Date(timeIntervalSince1970: 1_700_000_000)
  var vc = VanChuyenGia(), kho = KhoBoNho()
  func api() -> ApiClient { ApiClient(goc: URL(string: "https://may.chu")!, token: "tk", vanChuyen: vc) }
  func vao() -> VaoMay { VaoMay(api: api(), kho: kho, biMat: { [bm] in bm }) }
  func json(_ s: String) -> Data { s.data(using: .utf8)! }

  func testMaMoMayBienThePhutCungSoMayChu() {
    // vector tính bằng server/lib/ma-offline.ts (maOfflinePhut) cùng bí mật + mốc
    XCTAssertEqual(MaOffline.ma(MaOffline.biMatPhut(bm, 30), now: t), "861847")
    XCTAssertEqual(MaOffline.kiemPhut(bm, "703799", now: t), 60)
    XCTAssertEqual(MaOffline.kiemPhut(bm, "861 847", now: t), 30)
    XCTAssertEqual(MaOffline.kiemPhut(bm, "516324", now: t.addingTimeInterval(300)), 15)
    XCTAssertNil(MaOffline.kiemPhut(bm, "123456", now: t))
    var mt = MoTamOffline()
    XCTAssertEqual(mt.thuMo(biMat: bm, ma: "861847", now: t), .daMo)
    XCTAssertEqual(mt.phutMo, 30); XCTAssertEqual(mt.moDen, t.addingTimeInterval(30 * 60), "mã 30 phút mở đúng 30 phút")
  }

  func testVanPinCungSoMayChu() {
    XCTAssertEqual(PinOffline.van(biMat: bm, con: "c1", pin: "4821"), "565987f95f0fedc06f1e2b7ed4a3f3e0be2278355d5f6d64463b57617be36b3b")
    let be = BeTrenMay(id: "c1", ten: "Bảo Anh", coPin: true, vanPin: "565987F95F0FEDC06F1E2B7ED4A3F3E0BE2278355D5F6D64463B57617BE36B3B")
    XCTAssertTrue(PinOffline.kiem(biMat: bm, be: be, pin: "4821"))
    XCTAssertFalse(PinOffline.kiem(biMat: bm, be: be, pin: "4820"))
    XCTAssertFalse(PinOffline.kiem(biMat: nil, be: be, pin: "4821"))
  }

  func testDemSaiNamLanCho15Giay() {
    var d = DemSai()
    XCTAssertEqual((1...4).map { _ in d.ghiSai(t, toiDa: 5, choGiay: 15) }, [4, 3, 2, 1])
    XCTAssertEqual(d.ghiSai(t, toiDa: 5, choGiay: 15), 0)
    XCTAssertEqual(d.giayCho(t.addingTimeInterval(4)), 11)
    XCTAssertEqual(d.giayCho(t.addingTimeInterval(15)), 0)
    XCTAssertEqual(d.ghiSai(t.addingTimeInterval(16), toiDa: 5, choGiay: 15), 4, "hết chờ ⇒ đếm lại")
    XCTAssertEqual(d.ghiSai(t.addingTimeInterval(16 + 16 * 60), toiDa: 5, choGiay: 15), 4, "sai cũ hơn 15 phút không cộng dồn")
  }

  func testDangNhapCoMangSaiVaTamKhoa() async {
    let be = BeTrenMay(id: "c1", ten: "Bảo Anh", coPin: true)
    vc.tra["POST /api/device/dang-nhap-be"] = (json(#"{"error":"pin_sai","message":"Chưa đúng · còn 3 lần thử","conLan":3}"#), 401)
    let r1 = await vao().dangNhap(be, pin: "1111")
    XCTAssertEqual(r1, .sai(conLan: 3))
    XCTAssertEqual(vc.than(0)["pin"] as? String, "1111"); XCTAssertEqual(vc.than(0)["con"] as? String, "c1")
    vc.tra["POST /api/device/dang-nhap-be"] = (json(#"{"error":"pin_tam_khoa","message":"Sai 5 lần","choGiay":15}"#), 429)
    let r2 = await vao().dangNhap(be, pin: "1111")
    XCTAssertEqual(r2, .tamKhoa(choGiay: 15))
    vc.tra["POST /api/device/dang-nhap-be"] = (json(#"{"phienCon":"p","con":{"id":"c1","ten":"Bảo Anh"},"coPin":true}"#), 200)
    guard case .vao(let p, let can, let off) = await vao().dangNhap(be, pin: "4821") else { return XCTFail() }
    XCTAssertEqual(p.loai, .con); XCTAssertEqual(p.conId, "c1"); XCTAssertFalse(can); XCTAssertFalse(off)
    XCTAssertEqual(kho.doc(PhienMay.self, Khoa.phienMay)?.loai, .con)
  }

  func testDangNhapMatMangKiemVanPinRoiPhatLai() async {
    let be = BeTrenMay(id: "c1", ten: "Bảo Anh", coPin: true, vanPin: PinOffline.van(biMat: bm, con: "c1", pin: "4821"))
    var h = HoSoMay(con: [be], mayRieng: false); h.pinSaiToiDa = 5
    kho.luu(h, Khoa.hoSoMay)
    // không có tuyến nào ⇒ VanChuyenGia ném lỗi mạng
    for i in 1...4 { let r = await vao().dangNhap(be, pin: "0000"); XCTAssertEqual(r, .sai(conLan: 5 - i)) }
    let r5 = await vao().dangNhap(be, pin: "0000")
    XCTAssertEqual(r5, .tamKhoa(choGiay: 15))
    let r6 = await vao().dangNhap(be, pin: "4821")
    if case .tamKhoa = r6 {} else { XCTFail("đang chờ 15 giây thì PIN đúng cũng chưa nhận") }
    let r7 = await vao().dangNhap(be, pin: "4821", now: Date().addingTimeInterval(16))
    guard case .vao(_, _, let off) = r7 else { return XCTFail("\(r7)") }
    XCTAssertTrue(off)
    XCTAssertEqual(kho.doc([ViecChoMang].self, Khoa.viecChoMang)?.first?.loai, "dang_nhap")
    // có mạng lại ⇒ phát lại đăng nhập trước nhip, xoá hàng chờ
    vc.tra["POST /api/device/dang-nhap-be"] = (json(#"{"phienCon":"p","con":{"id":"c1","ten":"Bảo Anh"},"coPin":true}"#), 200)
    await vao().phatLai()
    XCTAssertEqual(vc.da.last?.url?.path, "/api/device/dang-nhap-be")
    XCTAssertEqual(vc.than(vc.da.count - 1)["pin"] as? String, "4821")
    XCTAssertNil(kho.doc([ViecChoMang].self, Khoa.viecChoMang))
  }

  func testBeChuaCoPinVaoThang() async {
    vc.tra["POST /api/device/dang-nhap-be"] = (json(#"{"phienCon":"p","con":{"id":"c2","ten":"Bảo Minh"},"coPin":false,"canDatPin":true}"#), 200)
    guard case .vao(_, let can, _) = await vao().dangNhap(BeTrenMay(id: "c2", ten: "Bảo Minh", coPin: false), pin: nil) else { return XCTFail() }
    XCTAssertTrue(can)
    XCTAssertNil(vc.than(0)["pin"])
  }

  func testBaMeNhapMaCoMangVaMatMang() async {
    vc.tra["POST /api/device/ba-me-mo"] = (json(#"{"baMeDung":{"den":"2023-11-14T22:43:20.000Z","tu":"2023-11-14T22:13:20.000Z"},"phut":30}"#), 200)
    let r = await vao().baMeMo("861 847", now: t)
    XCTAssertEqual(r, .mo(den: t.addingTimeInterval(30 * 60), phut: 30, offline: false))
    XCTAssertEqual(vc.than(0)["ma"] as? String, "861847")
    vc.tra["POST /api/device/ba-me-mo"] = (json(#"{"error":"ma_da_dung","message":"Mã này đã dùng rồi"}"#), 409)
    let r2 = await vao().baMeMo("861847", now: t)
    XCTAssertEqual(r2, .daDung)
    // mất mạng ⇒ kiểm TOTP tại máy, mở đúng số phút của biến thể
    vc.tra = [:]
    let r3 = await vao().baMeMo("516324", now: t)
    XCTAssertEqual(r3, .mo(den: t.addingTimeInterval(15 * 60), phut: 15, offline: true))
    XCTAssertTrue(kho.doc(PhienMay.self, Khoa.phienMay)!.baMeDangDung(t.addingTimeInterval(60)))
    let r4 = await vao().baMeMo("516324", now: t.addingTimeInterval(30))
    XCTAssertEqual(r4, .daDung, "mỗi mã một lượt")
  }

  func testKhienTheoPhienMay() throws {
    let kh = LapKeHoach.tu(try doc(nhipMau(them05: quy)), now: vn(26, 10))
    let now = vn(26, 10)
    XCTAssertEqual(TinhKhien.lucNay(kh, now: now, dung: nil).lyDo, .khong, "không biết phiên (app / máy chủ cũ) ⇒ không khoá theo PIN")
    let chua = PhienMay(loai: .chua, luc: now)
    let k = TinhKhien.lucNay(kh, now: now, dung: nil, phien: chua)
    XCTAssertEqual(k.muc, .moiApp); XCTAssertEqual(k.lyDo, .chuaVao)
    let bame = PhienMay(loai: .baMe, baMeDen: now.addingTimeInterval(900), luc: now)
    var kk = kh; kk.khoaNgay = true
    XCTAssertEqual(TinhKhien.lucNay(kk, now: now, dung: nil, phien: bame).dangBaMe, true, "Ba Mẹ dùng thắng Ba Mẹ khoá / giờ ngủ")
    XCTAssertEqual(TinhKhien.lucNay(kh, now: now.addingTimeInterval(901), dung: nil, phien: bame).lyDo, .chuaVao, "hết giờ Ba Mẹ ⇒ máy tự khoá")
    XCTAssertEqual(TinhKhien.lucNay(kh, now: now, dung: nil, phien: PhienMay(loai: .con, conId: "c1", luc: now)).lyDo, .khong)
  }

  func testDongBoGhiNguoiDungVaLichBaMe() async throws {
    let khien = KhienGia(), lich = LichGia()
    let den = "2026-10-26T03:30:00.000Z"   // 10:30 giờ VN
    let d = Data(String(decoding: nhipMau(them05: quy), as: UTF8.self).replacingOccurrences(of: #""lenh":[]"#, with: #""lenh":[],"nguoiDung":{"loai":"ba_me","den":"\#(den)"}"#).utf8)
    vc.tra["POST /api/device/nhip"] = (d, 200)
    let db = DongBo(api: api(), kho: kho, khien: khien, lich: lich, uyQuyen: UyQuyenGia(), chon: ChonGia(), xoaToken: {})
    _ = try await db.chay(now: vn(26, 10))
    XCTAssertEqual(kho.doc(PhienMay.self, Khoa.phienMay)?.loai, .baMe)
    XCTAssertEqual(khien.lan.last?.dangBaMe, true)
    XCTAssertEqual(lich.lich.first { $0.ten == "bame" }?.ketThucLuc, NgayISO.doc(den), "chuông lúc hết giờ Ba Mẹ để máy tự khoá")
    // máy chủ báo chưa ai vào ⇒ khoá mọi app
    vc.tra["POST /api/device/nhip"] = (Data(String(decoding: d, as: UTF8.self).replacingOccurrences(of: #"{"loai":"ba_me","den":"\#(den)"}"#, with: #"{"loai":"chua"}"#).utf8), 200)
    _ = try await db.chay(now: vn(26, 10, 5))
    XCTAssertEqual(khien.lan.last?.lyDo, .chuaVao)
    // máy RIÊNG vừa đăng xuất tại máy: máy chủ vẫn báo «con» ⇒ giữ khoá tới khi bé nhập lại PIN
    kho.luu(HoSoMay(con: [], mayRieng: true), Khoa.hoSoMay)
    vc.tra["POST /api/device/nhip"] = (Data(String(decoding: d, as: UTF8.self).replacingOccurrences(of: #"{"loai":"ba_me","den":"\#(den)"}"#, with: #"{"loai":"con","con":{"id":"c1","ten":"Bin"}}"#).utf8), 200)
    _ = try await db.chay(now: vn(26, 10, 6))
    XCTAssertEqual(khien.lan.last?.lyDo, .chuaVao)
  }

  /// B1 (Nghi 06/11): «Mở hết» — iOS không chặn app theo danh sách (chỉ khiên app Giải trí khi hết quỹ / giờ ngủ / khoá) ⇒ còn quỹ thì mở,
  /// web chỉ chặn danh sách chặn + web luôn chặn; hết quỹ / giờ ngủ / Ba Mẹ khoá vẫn chặn.
  func testMoHetKhongKhoaApp() throws {
    let d = Data(String(decoding: nhipMau(webChan: #"["pornhub.com"]"#, them05: quy), as: UTF8.self)
      .replacingOccurrences(of: #""chuaXep":"chan"}"#, with: #""chuaXep":"cho_phep","cheDoChan":"mo_het","webLuonChan":["pornhub.com"]}"#).utf8)
    let kh = LapKeHoach.tu(try doc(d), now: vn(26, 10))
    let k = TinhKhien.lucNay(kh, now: vn(26, 10), dung: nil)
    XCTAssertEqual(k.muc, .khong); XCTAssertEqual(k.webChan, ["pornhub.com"])
    XCTAssertEqual(TinhKhien.lucNay(kh, now: vn(26, 22), dung: nil).lyDo, .ngu)
    XCTAssertEqual(TinhKhien.lucNay(kh, now: vn(26, 10), dung: NhatKyDung(ngay: "2026-10-26", phut: 60, tranHet: true)).lyDo, .hetGio)
  }

  func testGiaiMaTongQuanCuaHangVaDoiSao() async throws {
    vc.tra["GET /api/device/hoc-vien/tong-quan"] = (json(#"""
    {"con":{"id":"c1","ten":"Bảo Anh"},"soDu":30,"sao":30,"saoChoDuyet":10,"tongKiem":90,"capDo":{},
     "quy":{"conPhut":18,"daDung":42,"tongPhut":60,"quyNgayPhut":60,"themPhut":0,"dangNgu":false,"dangHoc":false,"khoa":false,
            "gioNgu":{"tu":"21:30","den":"06:30"},"gioHoc":{"tu":"17:00","den":"18:00","thu":[1,2,3,4,5]},"tyLe":{"sao":10,"phut":10},
            "doiSao":{"bat":true,"toiDaNgay":30,"conDoiDuoc":30},"choXinThem":true},
     "nhiemVu":[{"id":"t1","ten":"Dọn phòng","moTa":"2 ảnh","diem":10,"sao":10,"bangChung":"anh","kieu":"hang_ngay","han":null,"phutToiThieu":0,
                 "trangThai":"san_sang","luot":null,"dangCho":false,"giaoRieng":true,"lyDo":null,"hinh":null,"lapLai":"hang_ngay","gioNhac":"20:00","lamLai":false,"loiNhan":null,"bo":"tu_lap"},
                {"id":"t2","ten":"Đọc sách 20 phút","diem":10,"bangChung":"ghi_am","trangThai":"dang_lam","luot":"l2","dangCho":true}],
     "gan":[],"loiKhen":[{"id":"m1","noiDung":"Phòng con gọn ghê!","phanHoi":null,"luc":"2026-11-06T13:05:00.000Z"}],
     "phieuCho":[{"id":"r1","ten":"Đi ăn kem","diem":100,"luc":"2026-11-06T13:00:00.000Z"}]}
    """#), 200)
    let tq = try await api().tongQuan()
    XCTAssertEqual(tq.soSao, 30); XCTAssertEqual(tq.quy?.conPhut, 18); XCTAssertEqual(tq.quy?.phut10Sao, 10)
    XCTAssertEqual(tq.nhiemVu.map(\.cachNop), ["anh", "ghi_am"]); XCTAssertTrue(tq.nhiemVu[1].choDuyet); XCTAssertEqual(tq.saoGiu, 100)
    vc.tra["GET /api/device/hoc-vien/cua-hang"] = (json(#"{"soDu":40,"sao":40,"saoGiu":50,"qua":[{"id":"q1","ten":"Chọn món bữa tối","loai":"dac_quyen","diem":50,"sao":50,"phut":null,"menhGia":null,"chiCuoiTuan":false,"du":false,"conThieu":10,"choTraoTu":null,"moTa":"Ba Mẹ nấu món con chọn","hinh":"bua_toi","toiDaThang":null,"tonKho":null},{"id":"q2","ten":"AiiCafe 20k","loai":"voucher","diem":200,"menhGia":20000,"du":false,"conThieu":160}]}"#), 200)
    let ch = try await api().cuaHang()
    XCTAssertEqual(ch.qua.first?.conThieu, 10); XCTAssertTrue(ch.qua[1].laVoucher); XCTAssertEqual(ch.saoGiu, 50)
    vc.tra["POST /api/device/hoc-vien/doi-sao"] = (json(#"{"id":"g1","phut":10,"sao":10,"soDu":20,"conPhut":28}"#), 200)
    let ds = try await api().doiSao(phut: 10)
    XCTAssertEqual(ds.conPhut, 28); XCTAssertEqual(vc.than(vc.da.count - 1)["phut"] as? Int, 10)
    vc.tra["POST /api/device/hoc-vien/luot/l2/nop"] = (json(#"{"trangThai":"cho_duyet","nghiTrung":false}"#), 200)
    let tt = try await api().nop(luot: "l2", anh: [], ghiAm: TepNop(mime: "audio/mp4", duLieu: Data([1, 2, 3])), ghiChu: nil)
    XCTAssertEqual(tt, "cho_duyet")
    XCTAssertEqual((vc.than(vc.da.count - 1)["ghiAm"] as? [String: Any])?["base64"] as? String, "AQID")
  }
}

// MARK: lượt rà 1 (PR #202)
final class PinBeRaTests: XCTestCase {
  let bm = "aiigrow-thu-ma-offline", t = Date(timeIntervalSince1970: 1_700_000_000)
  var vc = VanChuyenGia(), kho = KhoBoNho(), khoCho = KhoBoNho()
  func vao() -> VaoMay { VaoMay(api: ApiClient(goc: URL(string: "https://may.chu")!, token: "tk", vanChuyen: vc), kho: kho, khoCho: khoCho, biMat: { [bm] in bm }) }
  func json(_ s: String) -> Data { s.data(using: .utf8)! }

  func testDangXuatCoMangXoaDangNhapCho() async {
    khoCho.luu([ViecChoMang(loai: "dang_nhap", con: "c1", pin: "4821", luc: t)], Khoa.viecChoMang)
    XCTAssertNil(kho.doc([ViecChoMang].self, Khoa.viecChoMang), "PIN chờ không nằm trong app group")
    vc.tra["POST /api/device/dang-xuat"] = (json(#"{"ok":true,"khoa":true}"#), 200)
    await vao().roiMay()
    XCTAssertNil(khoCho.doc([ViecChoMang].self, Khoa.viecChoMang), "đăng xuất online ⇒ không phát lại đăng nhập cũ")
    XCTAssertEqual(kho.doc(PhienMay.self, Khoa.phienMay)?.loai, .chua)
  }

  func testPhatLaiGiuHangChoKhiLoi5xx() async {
    khoCho.luu([ViecChoMang(loai: "dang_xuat", luc: t)], Khoa.viecChoMang)
    vc.tra["POST /api/device/dang-xuat"] = (json(#"{"error":"loi","message":"x"}"#), 503)
    await vao().phatLai()
    XCTAssertNotNil(khoCho.doc([ViecChoMang].self, Khoa.viecChoMang))
    vc.tra["POST /api/device/dang-xuat"] = (json(#"{"ok":true}"#), 200)
    await vao().phatLai()
    XCTAssertNil(khoCho.doc([ViecChoMang].self, Khoa.viecChoMang))
  }

  func testDoiBeXoaNhatKyPhutTaiMay() async {
    kho.luu("c1", Khoa.conCuoi)
    kho.luu(NhatKyDung(ngay: "2023-11-15", phut: 60, tranHet: true), Khoa.nhatKyDung)
    vc.tra["POST /api/device/dang-nhap-be"] = (json(#"{"phienCon":"p","con":{"id":"c2","ten":"Bảo Minh"},"coPin":false}"#), 200)
    _ = await vao().dangNhap(BeTrenMay(id: "c2", ten: "Bảo Minh", coPin: false), pin: nil)
    XCTAssertNil(kho.doc(NhatKyDung.self, Khoa.nhatKyDung))
  }

  func testBaMeNhapSai5LanMatMangThiCho() async {
    for _ in 1...4 { _ = await vao().baMeMo("000000", now: t) }
    let r = await vao().baMeMo("000000", now: t)
    if case .tamKhoa = r {} else { XCTFail("\(r)") }
    XCTAssertEqual(kho.doc([SuKienMay].self, Khoa.suKienCho)?.last?.loai, "sai_ma_offline")
  }

  func testMayChuCuBoKhoaChuaVaoVaMayRiengGiuKhoa() async throws {
    let khien = KhienGia()
    let db = DongBo(api: ApiClient(goc: URL(string: "https://may.chu")!, token: "tk", vanChuyen: vc), kho: kho, khien: khien, lich: LichGia(),
                    uyQuyen: UyQuyenGia(), chon: ChonGia(), xoaToken: {})
    kho.luu(PhienMay(loai: .chua, luc: vn(26, 9)), Khoa.phienMay)
    vc.tra["POST /api/device/nhip"] = (nhipMau(), 200)      // máy chủ cũ: không nguoiDung
    _ = try await db.chay(now: vn(26, 10))
    XCTAssertNil(kho.doc(PhienMay.self, Khoa.phienMay)); XCTAssertNotEqual(khien.lan.last?.lyDo, .chuaVao)
    // máy riêng: Ba Mẹ dùng đã hết hạn ⇒ máy chủ báo chủ máy nhưng máy vẫn khoá chờ PIN
    kho.luu(ThongTinMay(deviceId: "m1", tenCon: "Bin", dungChung: false), Khoa.thongTinMay)
    kho.luu(PhienMay(loai: .baMe, baMeDen: vn(26, 10, 1), luc: vn(26, 9)), Khoa.phienMay)
    let d = Data(String(decoding: nhipMau(), as: UTF8.self).replacingOccurrences(of: #""lenh":[]"#, with: #""lenh":[],"nguoiDung":{"loai":"con","con":{"id":"c1","ten":"Bin"}}"#).utf8)
    vc.tra["POST /api/device/nhip"] = (d, 200)
    _ = try await db.chay(now: vn(26, 10, 5))
    XCTAssertEqual(kho.doc(PhienMay.self, Khoa.phienMay)?.loai, .chua)
    XCTAssertEqual(khien.lan.last?.lyDo, .chuaVao)
  }
}
