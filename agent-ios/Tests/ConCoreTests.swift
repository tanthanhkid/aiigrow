// Test logic thuần: nenTang ios ⇒ kế hoạch lịch/khiên, trạng thái khiên theo giờ, đo phút, link ghép, client, một lượt đồng bộ (bản giả).
import XCTest
@testable import ConCore

// Phản hồi nhịp mẫu — cùng hình dạng server/lib/nhip-may.ts + chuyenDoi(cs, "ios").
func nhipMau(khoaNgay: Bool = false, giaiTriDuocMo: Bool = true, ngayThuong: String = #"[{"tu":"17:00","den":"19:00"}]"#,
             cuoiTuan: String = #"[{"tu":"09:00","den":"11:00"},{"tu":"15:00","den":"20:00"}]"#,
             ngu: String = #"{"tu":"21:30","den":"06:30"}"#, tran: Int = 90, phutThem: Int = 0, moKhanCap: String = "null",
             grant: String? = nil, lenh: String = "[]", webChan: String = #"["https://www.tiktok.com/abc","roblox.com"]"#) -> Data {
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
     "ngoaiLe":{"phutThemHomNay":\(phutThem),"mucTamThoi":[],"moKhanCapDen":\(moKhanCap)},"gioMaySai":false,"tuanThu":{},
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
    if let id { s = s.replacingOccurrences(of: #""phien":null"#, with: #""phien":{"id":"\#(id)","muc":"com.mojang.minecraftpe","conPhut":\#(conPhut)}"#) }
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
    // đồng bộ lại 20 phút sau, máy chủ vẫn báo conPhut 30 (không nhịp) ⇒ hạn KHÔNG dời
    let kh2 = LapKeHoach.tu(try nhipPhien("P1"), now: t0.addingTimeInterval(20 * 60), truoc: kh)
    XCTAssertEqual(kh2.phienDiemDen, kh.phienDiemDen)
    // phiên mới ⇒ neo lại; hết phiên ⇒ không lịch
    XCTAssertEqual(LapKeHoach.tu(try nhipPhien("P2", conPhut: 10), now: t0.addingTimeInterval(40 * 60), truoc: kh2).phienDiemDen,
                   t0.addingTimeInterval(50 * 60))
    let het = LapKeHoach.tu(try nhipPhien(nil), now: t0, truoc: kh)
    XCTAssertNil(het.phienDiemDen); XCTAssertNil(het.lich.first { $0.ten == "phiendiem" })
    // Khoá ngay / giờ ngủ vẫn thắng phiên điểm
    XCTAssertEqual(TinhKhien.lucNay(kh, now: vn(26, 22), dung: nil).lyDo, .ngu)
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
