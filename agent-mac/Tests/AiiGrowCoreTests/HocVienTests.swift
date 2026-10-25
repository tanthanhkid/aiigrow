// App của Con trên Mac (HocVien.swift + lệnh IPC hocVien / choi / choiThu + nhịp phiên chơi + app vừa chặn) — ngang agent-win HocVien.cs, PipeServer.
import XCTest
@testable import AiiGrowCore

final class HocVienTests: XCTestCase {

  // MARK: luật thuần

  func testDuongHocVienChiChoDungDuong() {
    XCTAssertTrue(HocVienPaths.duoc(method: "GET", path: "hoc-vien/tong-quan"))
    XCTAssertTrue(HocVienPaths.duoc(method: "GET", path: "hoc-vien/cua-hang"))
    XCTAssertTrue(HocVienPaths.duoc(method: "GET", path: "hoc-vien/tin?sau=2026-10-25T01%3A02%3A03.000Z"))
    XCTAssertTrue(HocVienPaths.duoc(method: "POST", path: "hoc-vien/nhiem-vu/abc_1/bat-dau"))
    XCTAssertTrue(HocVienPaths.duoc(method: "POST", path: "hoc-vien/luot/L-9/nop"))
    XCTAssertTrue(HocVienPaths.duoc(method: "POST", path: "hoc-vien/doi/q1"))
    XCTAssertTrue(HocVienPaths.duoc(method: "POST", path: "hoc-vien/loi-khen/m1/phan-hoi"))
    // đường khác / leo thư mục / phương thức sai / query trên POST ⇒ từ chối
    for (m, p) in [("GET", "dong-bo"), ("POST", "phien/mo"), ("GET", "hoc-vien/../lenh/1/xong"), ("POST", "hoc-vien/tong-quan"),
                   ("GET", "hoc-vien/doi/q1"), ("POST", "hoc-vien/doi/q1?x=1"), ("GET", "hoc-vien/tong-quan?x=1"), ("POST", "hoc-vien/doi/q%2F1"),
                   ("POST", "hoc-vien/doi//"), ("DELETE", "hoc-vien/doi/q1"), ("GET", "hoc-vien/tin?sau=a/b"), ("GET", ""), ("GET", "hoc-vien/tóng")] {
      XCTAssertFalse(HocVienPaths.duoc(method: m, path: p), "\(m) \(p)")
    }
    XCTAssertNil(HocVienPaths.doan("a/b")); XCTAssertNil(HocVienPaths.doan("")); XCTAssertEqual(HocVienPaths.doan("x_1-2"), "x_1-2")
  }

  func testSapXepViecCanLamTruoc() {
    func v(_ id: String, _ tt: String, han: Double? = nil, diem: Int = 5) -> HvNhiemVu {
      var x = HvNhiemVu(); x.id = id; x.trangThai = tt; x.diem = diem; x.han = han.map { Date(timeIntervalSince1970: $0) }; return x
    }
    let ds = HocVienView.sapXep([v("a", "du_hom_nay"), v("b", "san_sang", han: 200), v("c", "san_sang", han: 100), v("d", "dang_lam"),
                                 v("e", "can_bo_sung"), v("f", "san_sang", diem: 50)])
    XCTAssertEqual(ds.map(\.id), ["e", "d", "c", "b", "f", "a"])
    var t = HvTongQuan(); t.nhiemVu = ds
    XCTAssertEqual(HocVienView.soViecMo(t), 5)
  }

  func testChuHienThi() {
    let now = Date(timeIntervalSince1970: 1_000_000)
    XCTAssertNil(HocVienView.hanText(nil, bayGio: now))
    XCTAssertEqual(HocVienView.hanText(now.addingTimeInterval(-1), bayGio: now), "Đã hết hạn")
    XCTAssertEqual(HocVienView.hanText(now.addingTimeInterval(90), bayGio: now), "Còn 2 phút")
    XCTAssertEqual(HocVienView.hanText(now.addingTimeInterval(3 * 3600 + 5), bayGio: now), "Còn 3 giờ")
    XCTAssertEqual(HocVienView.hanText(now.addingTimeInterval(2 * 86_400 + 5), bayGio: now), "Còn 2 ngày")
    var v = HvNhiemVu(); v.trangThai = "san_sang"
    XCTAssertEqual(HocVienView.nutText(v), "Nhận việc")
    v.bangChung = "tu_dong"; XCTAssertNil(HocVienView.nutText(v))
    v.bangChung = "anh"; v.trangThai = "dang_lam"; XCTAssertEqual(HocVienView.nutText(v), "Nộp bài")
    XCTAssertEqual(HocVienView.kiemNop(v, ghiChu: "", coAnh: false), "Con chọn một ảnh bằng chứng rồi nộp nhé.")
    XCTAssertNil(HocVienView.kiemNop(v, ghiChu: "", coAnh: true))
    v.trangThai = "can_bo_sung"; XCTAssertNil(HocVienView.kiemNop(v, ghiChu: "", coAnh: false), "bổ sung: ảnh không bắt buộc")
    v.bangChung = "van_ban"; XCTAssertEqual(HocVienView.kiemNop(v, ghiChu: " a ", coAnh: false), "Con viết vài câu rồi nộp nhé.")
    XCTAssertEqual(HocVienView.capText(HvCapDo()), "Cấp 1")
    XCTAssertEqual(HocVienView.doiThongBao(HvDoiKq(trangThai: "da_phat_hanh", maPhieu: "AB12"), tenQua: "Kem"), "Đã đổi «Kem». Mã phiếu: AB12")
    XCTAssertEqual(HocVienView.nopThongBao(HvNopKq(trangThai: "duoc_duyet")), "Xong rồi! Điểm đã được cộng.")
    XCTAssertEqual(HocVienView.tenMucChoi("com.roblox.roblox"), "Roblox")
    XCTAssertEqual(HocVienView.tenMucChoi("youtube.com"), "youtube.com")
    XCTAssertEqual(HocVienView.tenMucChoi("Minecraft.app"), "Minecraft")
    XCTAssertEqual(ChoiBangDiem.nhanNut("com.roblox.roblox", phut: 25), "Chơi Roblox · ≈ 25 phút")
    XCTAssertEqual(MascotView.chon(.homNay, daNoi: false, xongHetViec: false), "trong-loi")
    XCTAssertEqual(MascotView.chon(.nhiemVu, daNoi: true, xongHetViec: true), "xong")
  }

  func testDocTongQuanKhoanDung() throws {
    let raw = """
    {"con":{"id":"c1","ten":"Bi"},"soDu":42,"tongKiem":100,"capDo":{"cap":2,"diemCapSau":150,"conThieu":50},"diemChoDuyet":5,
     "nhiemVu":[{"id":7,"ten":"Đọc sách","moTa":"20 phút","diem":10,"bangChung":"anh","han":"2026-10-26T10:00:00.000Z","trangThai":"dang_lam","luot":"L1","dangCho":0,"giaoRieng":true,"lyDo":null,"phutToiThieu":20}],
     "gan":[{"id":"s1","ten":"Quét nhà","trangThai":"duoc_duyet","diem":5,"lyDo":null,"loiKhen":"Giỏi","luc":"2026-10-25T01:00:00Z"}],
     "loiKhen":[{"id":"m1","noiDung":"Ba Mẹ thương con","phanHoi":null}],"phieuCho":[{"id":"p1","ten":"Kem","diem":30}]}
    """
    let t = try XCTUnwrap(HvTongQuan.doc(Data(raw.utf8)))
    XCTAssertEqual(t.tenCon, "Bi"); XCTAssertEqual(t.soDu, 42); XCTAssertEqual(t.capDo.conThieu, 50)
    XCTAssertEqual(t.nhiemVu.first?.id, "7", "id số vẫn đọc thành chuỗi")
    XCTAssertEqual(t.nhiemVu.first?.luot, "L1"); XCTAssertNotNil(t.nhiemVu.first?.han); XCTAssertTrue(t.nhiemVu.first!.giaoRieng)
    XCTAssertEqual(t.gan.first?.loiKhen, "Giỏi"); XCTAssertEqual(t.loiKhen.first?.noiDung, "Ba Mẹ thương con"); XCTAssertEqual(t.phieuCho.count, 1)
    XCTAssertNil(HvTongQuan.doc(Data("{\"error\":\"x\"}".utf8)))
    let ch = try XCTUnwrap(HvCuaHang.doc(Data(#"{"soDu":3,"qua":[{"id":"q","ten":"Kem","diem":30,"du":false,"conThieu":27,"chiCuoiTuan":true}]}"#.utf8)))
    XCTAssertEqual(ch.qua.first?.conThieu, 27); XCTAssertTrue(ch.qua.first!.chiCuoiTuan)
    XCTAssertEqual(HvDoiKq.doc(Data(#"{"phieu":"x","trangThai":"da_phat_hanh","voucher":{"ma":"Z9"}}"#.utf8))?.maPhieu, "Z9")
    XCTAssertEqual(HvBatDau.doc(Data(#"{"luot":"L2"}"#.utf8)), "L2")
    XCTAssertTrue(HvDongY.doc(Data(#"{"ok":true}"#.utf8)))
  }

  func testTinTrackerChiBaoTinMoi() {
    func tin(_ id: String, _ loai: String = "khac") -> HvTin { var t = HvTin(); t.id = id; t.loai = loai; t.tieu = "T" + id; return t }
    var tr = TinTracker()
    var r = HvTinDs(); r.ds = [tin("1"), tin("2")]; r.bay = Date(timeIntervalSince1970: 5)
    XCTAssertTrue(tr.nhan(r).isEmpty, "lần đầu chỉ ghi nhớ")
    XCTAssertEqual(tr.moc, Date(timeIntervalSince1970: 5))
    r.ds = [tin("2"), tin("3", "giao_nhiem_vu")]
    let moi = tr.nhan(r)
    XCTAssertEqual(moi.map(\.id), ["3"])
    XCTAssertTrue(HocVienView.coNhiemVuMoi(moi))
    XCTAssertEqual(HocVienView.mucChoTin(moi), .nhiemVu)
    XCTAssertEqual(HocVienView.mucChoTin([tin("a", "huy_hieu"), tin("b", "giao_nhiem_vu")]), .tinNhan)
    XCTAssertEqual(HocVienView.thongBaoTin([tin("a"), tin("b")]).tieu, "Có 2 tin mới")
  }

  func testBatNhiemVuGiuLaiKhiKhoaVaGian5Phut() {
    var b = BatNhiemVu(); let t0 = Date(timeIntervalSince1970: 0)
    XCTAssertFalse(b.nhan(coNvMoi: false, khoa: false, appDangHien: false, bayGio: t0))
    XCTAssertFalse(b.nhan(coNvMoi: true, khoa: true, appDangHien: false, bayGio: t0)); XCTAssertTrue(b.choMoKhoa)
    XCTAssertTrue(b.moKhoa(appDangHien: false, bayGio: t0))
    XCTAssertFalse(b.moKhoa(appDangHien: false, bayGio: t0), "chỉ một lần")
    XCTAssertFalse(b.nhan(coNvMoi: true, khoa: false, appDangHien: false, bayGio: t0.addingTimeInterval(60)), "vừa bật trong 5 phút")
    XCTAssertTrue(b.nhan(coNvMoi: true, khoa: false, appDangHien: false, bayGio: t0.addingTimeInterval(400)))
    XCTAssertFalse(b.nhan(coNvMoi: true, khoa: false, appDangHien: true, bayGio: t0.addingTimeInterval(900)))
  }

  func testDangChoiTheoTienCanh() {
    XCTAssertTrue(ChoiBangDiem.dangChoi(tienCanh: nil, playApp: "com.roblox.roblox", playWeb: false), "chưa kiểm được ⇒ tính")
    XCTAssertTrue(ChoiBangDiem.dangChoi(tienCanh: "com.Roblox.Roblox", playApp: "com.roblox.roblox", playWeb: false))
    XCTAssertFalse(ChoiBangDiem.dangChoi(tienCanh: "com.apple.iwork.pages", playApp: "com.roblox.roblox", playWeb: false), "tắt game làm bài ⇒ không trừ")
    XCTAssertTrue(ChoiBangDiem.dangChoi(tienCanh: "com.google.Chrome", playApp: nil, playWeb: true))
    XCTAssertFalse(ChoiBangDiem.dangChoi(tienCanh: "com.apple.iwork.pages", playApp: nil, playWeb: true))
  }

  func testPhienChoiMatMangChiTrongPhutChoPhep() throws {
    let p = try PolicyParser.parse(#"{"mode":"hoc","allowedApps":["com.apple.pages","com.roblox.roblox"],"playSessionId":"ph","playApp":"com.roblox.roblox","playOfflineMinutes":10}"#)
    let t = Date(timeIntervalSince1970: 1000)
    XCTAssertEqual(BoMay.gioiHanPhienOffline(p, matMang: false, tu: t, now: t.addingTimeInterval(9999)), p, "có mạng ⇒ máy chủ quyết")
    XCTAssertEqual(BoMay.gioiHanPhienOffline(p, matMang: true, tu: t, now: t.addingTimeInterval(9 * 60)), p)
    let het = BoMay.gioiHanPhienOffline(p, matMang: true, tu: t, now: t.addingTimeInterval(11 * 60))
    XCTAssertEqual(het.allowedApps, ["com.apple.pages"]); XCTAssertNil(het.playSessionId)
    XCTAssertEqual(p.playOfflineMinutes, 10)
  }

  func testAnhVuaTran() {
    XCTAssertTrue(AnhBangChung.vua(4000, 3000) == (1280, 960))
    XCTAssertTrue(AnhBangChung.vua(800, 600) == (800, 600))
    XCTAssertTrue(AnhBangChung.vua(0, 5) == (1, 1))
  }

  func testNutChoiBangDiem() {
    XCTAssertTrue(ChoiBangDiem.hienNut(duocDoiDiem: true, lyDoKhoa: nil, matMang: false, dsChoi: []))
    XCTAssertFalse(ChoiBangDiem.hienNut(duocDoiDiem: false, lyDoKhoa: nil, matMang: false, dsChoi: []))
    XCTAssertFalse(ChoiBangDiem.hienNut(duocDoiDiem: true, lyDoKhoa: "ba_me_khoa", matMang: false, dsChoi: []))
    XCTAssertFalse(ChoiBangDiem.hienNut(duocDoiDiem: true, lyDoKhoa: nil, matMang: true, dsChoi: []))
    XCTAssertTrue(ChoiBangDiem.hienNut(duocDoiDiem: true, lyDoKhoa: nil, matMang: false, dsChoi: ["com.Roblox.Roblox"], muc: "com.roblox.roblox"))
    XCTAssertFalse(ChoiBangDiem.hienNut(duocDoiDiem: true, lyDoKhoa: nil, matMang: false, dsChoi: ["com.roblox.roblox"], muc: "com.apple.calculator"))
    XCTAssertEqual(ChoiBangDiem.ketQua(.choi(trangThai: "tu_choi", phut: 0, chu: "Hết điểm rồi")).chu, "Hết điểm rồi")
    XCTAssertTrue(ChoiBangDiem.ketQua(.choi(trangThai: "mo", phut: 20, chu: nil)) == ("Được rồi! Con chơi khoảng 20 phút nhé.", true))
    XCTAssertFalse(ChoiBangDiem.ketQua(.loi(ma: "yeu_cau_sai", chu: "x")).duoc)
  }

  func testIPCKhuHoiLenhMoiVaTrangThaiCuVanDoc() throws {
    for y in [YeuCauTray.hocVien(method: "POST", path: "hoc-vien/doi/q", than: "{}"), .choi(muc: "a"), .choiThu(muc: "b")] {
      XCTAssertEqual(try IPCMa.decoder.decode(YeuCauTray.self, from: IPCMa.encoder.encode(y)), y)
    }
    for t in [TraLoi.duLieu(json: "{\"a\":1}"), .choi(trangThai: "duoc", phut: 3, chu: nil)] {
      XCTAssertEqual(try IPCMa.decoder.decode(TraLoi.self, from: IPCMa.encoder.encode(t)), t)
    }
    // trạng thái của daemon cũ (không có dsChoi/chan*) vẫn đọc được
    var tt = TrangThai(daGhep: true, laPhienCon: true, tenCon: "Bi", cheDo: .tuDo, lyDoKhoa: nil, conPhut: 5, moDen: nil, khoaDen: nil,
                       demNguocGiay: nil, yeuCauCho: [], duocDoiDiem: true, matMang: false, trangChan: [])
    let cu = try IPCMa.encoder.encode(tt)
    XCTAssertNil(try IPCMa.decoder.decode(TrangThai.self, from: cu).dsChoi)
    tt.dsChoi = ["x"]; tt.chanSeq = 2
    XCTAssertEqual(try IPCMa.decoder.decode(TrangThai.self, from: IPCMa.encoder.encode(tt)), tt)
  }

  func testQuyenIPCLenhAppConChiTuUidCon() {
    let la: (UInt32) -> Bool = { _ in true }
    for y in [YeuCauTray.hocVien(method: "GET", path: "hoc-vien/tong-quan", than: nil), .choi(muc: "a"), .choiThu(muc: "a")] {
      XCTAssertEqual(QuyenIPC.kiem(y, uidGoi: 501, uidCon: 501, daGhep: true, laAdmin: la), .duoc)
      XCTAssertNotEqual(QuyenIPC.kiem(y, uidGoi: 502, uidCon: 501, daGhep: true, laAdmin: la), .duoc, "Ba Mẹ / tài khoản khác không dùng token máy")
      XCTAssertNotEqual(QuyenIPC.kiem(y, uidGoi: 0, uidCon: 501, daGhep: true, laAdmin: la), .duoc)
      XCTAssertNotEqual(QuyenIPC.kiem(y, uidGoi: 501, uidCon: 501, daGhep: false, laAdmin: la), .duoc)
    }
  }

  func testPolicyDocPlayChoicesVaPhien() throws {
    let p = try PolicyParser.parse(#"{"mode":"hoc","playChoices":["com.roblox.roblox"," ",""],"playSessionId":"ph1"}"#)
    XCTAssertEqual(p.playChoices, ["com.roblox.roblox"]); XCTAssertEqual(p.playSessionId, "ph1")
    let lai = try JSONDecoder().decode(Policy.self, from: JSONEncoder().encode(p))
    XCTAssertEqual(lai, p)
  }

  // MARK: daemon (BoMay + máy chủ giả HTTP)

  private func thuMucTam() throws -> String {
    let d = NSTemporaryDirectory() + "aiigrow-hv-\(UUID().uuidString)"
    try FileManager.default.createDirectory(atPath: d, withIntermediateDirectories: true)
    return d
  }

  private func dung(_ fake: HeThongGia, _ dongHo: DongHoGia, _ thuMuc: String, policy: String) throws -> BoMay {
    let kho = ConfigStore(duongDan: thuMuc + "/config.json")
    let pol = try PolicyParser.parse(policy)
    try kho.sua { $0.token = "t"; $0.deviceId = "d"; $0.uidCon = 501; $0.taiKhoanCon = "be"; $0.policyCuoi = pol; $0.policyLuc = dongHo.thuc }
    fake.uidTheoTen = ["be": 501]
    fake.phien = PhienConsole(uid: 501, manKhoa: false)
    let api = ApiClient(mayChu: "https://aiigrow.aiilab.vn", token: "t", session: HttpMock.session())
    return BoMay(api: api, heThong: fake, kho: kho,
                 tuyChon: TuyChonBoMay(duongDanHosts: thuMuc + "/hosts", thuMucChinhSach: thuMuc + "/Managed", tienCanhDongBo: true, tuCapNhat: false),
                 dongHo: { dongHo.thuc }, donDieu: { dongHo.donDieu })
  }

  func testHocVienChuyenNguyenVanVaChanDuongLa() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dh = DongHoGia()
    let b = try dung(fake, dh, thuMuc, policy: #"{"mode":"tu_do"}"#)
    HttpMock.dat { path, body in
      if path == "api/device/hoc-vien/tong-quan" { return HttpMock.json(200, ["soDu": 9, "nhiemVu": []]) }
      if path == "api/device/hoc-vien/luot/L1/nop" { return HttpMock.json(200, ["trangThai": "cho_duyet", "nghiTrung": false, "ghi": body["ghiChu"] ?? ""]) }
      return HttpMock.json(404, ["error": "khong_co_duong"])
    }
    guard case .duLieu(let j) = await b.xuLyIPC(.hocVien(method: "GET", path: "hoc-vien/tong-quan", than: nil), uidGoi: 501) else { return XCTFail() }
    XCTAssertEqual(HvTongQuan.doc(Data(j.utf8))?.soDu, 9)
    guard case .duLieu(let n) = await b.xuLyIPC(.hocVien(method: "POST", path: "hoc-vien/luot/L1/nop", than: #"{"ghiChu":"xong"}"#), uidGoi: 501) else { return XCTFail() }
    XCTAssertTrue(n.contains("xong"), "thân POST tới máy chủ nguyên văn")
    XCTAssertEqual(HttpMock.authCuoi("api/device/hoc-vien/luot/L1/nop"), "Bearer t")
    // đường không phải học viên ⇒ không gọi máy chủ
    let truoc = HttpMock.daGoi.count
    if case .duLieu = await b.xuLyIPC(.hocVien(method: "POST", path: "phien/mo", than: "{}"), uidGoi: 501) { XCTFail() }
    if case .duLieu = await b.xuLyIPC(.hocVien(method: "GET", path: "hoc-vien/tong-quan", than: nil), uidGoi: 502) { XCTFail("uid khác Con") }
    XCTAssertEqual(HttpMock.daGoi.count, truoc)
    // mất mạng ⇒ câu cho Con
    HttpMock.dat { _, _ in nil }
    guard case .loi(_, let chu) = await b.xuLyIPC(.hocVien(method: "GET", path: "hoc-vien/tin", than: nil), uidGoi: 501) else { return XCTFail() }
    XCTAssertEqual(chu, "Chưa có mạng, con thử lại sau nhé.")
  }

  func testChoiXetRoiMoChiMucTrongDanhSachVaNhoPhut() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dh = DongHoGia()
    let b = try dung(fake, dh, thuMuc, policy: #"{"mode":"hoc","canExchangePoints":true,"playChoices":["com.roblox.roblox"]}"#)
    HttpMock.dat { path, _ in
      switch path {
      case "api/device/phien/xet": return HttpMock.json(200, ["duoc": true, "phutToiDa": 22.5, "soDu": 40])
      case "api/device/phien/mo": return HttpMock.json(200, ["id": "ph1", "phutToiDa": 22.5])
      default: return HttpMock.json(404, [:])
      }
    }
    if case .choi = await b.xuLyIPC(.choi(muc: "com.lạ.game"), uidGoi: 501) { XCTFail("mục ngoài playChoices") }
    XCTAssertTrue(HttpMock.daGoi.isEmpty)
    let r1 = await b.xuLyIPC(.choiThu(muc: "com.Roblox.Roblox"), uidGoi: 501)
    XCTAssertEqual(r1, .choi(trangThai: "duoc", phut: 22, chu: nil))
    _ = await b.xuLyIPC(.choiThu(muc: "com.roblox.roblox"), uidGoi: 501)
    XCTAssertEqual(HttpMock.daGoi.filter { $0.path == "api/device/phien/xet" }.count, 1, "nhớ 60 giây")
    let r2 = await b.xuLyIPC(.choi(muc: "com.roblox.roblox"), uidGoi: 501)
    XCTAssertEqual(r2, .choi(trangThai: "mo", phut: 22, chu: nil))
    XCTAssertEqual(HttpMock.lanGoiCuoi("api/device/phien/mo")?["muc"] as? String, "com.roblox.roblox")
    // từ chối ⇒ câu máy chủ, không mở
    HttpMock.dat { path, _ in path == "api/device/phien/xet" ? HttpMock.json(200, ["duoc": false, "lyDo": "het_diem", "cau": "Con hết điểm rồi"]) : HttpMock.json(500, [:]) }
    let r3 = await b.xuLyIPC(.choi(muc: "com.roblox.roblox"), uidGoi: 501)
    XCTAssertEqual(r3, .choi(trangThai: "tu_choi", phut: 0, chu: "Con hết điểm rồi"))
    XCTAssertNil(HttpMock.lanGoiCuoi("api/device/phien/mo"))
  }

  func testNhipPhienChoiKhiPolicyCoPhien() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dh = DongHoGia()
    let b = try dung(fake, dh, thuMuc, policy: #"{"mode":"hoc","playSessionId":"ph9","playApp":"com.roblox.roblox"}"#)
    fake.tienCanhThat = "com.roblox.roblox"
    HttpMock.dat { path, _ in path == "api/device/phien/nhip" ? HttpMock.json(200, ["trangThai": "chay"]) : HttpMock.json(404, [:]) }
    await b.vongNhipChoi()
    XCTAssertEqual(HttpMock.lanGoiCuoi("api/device/phien/nhip")?["id"] as? String, "ph9")
    XCTAssertEqual(HttpMock.lanGoiCuoi("api/device/phien/nhip")?["dangDung"] as? Bool, true)
    await b.vongNhipChoi()
    XCTAssertEqual(HttpMock.daGoi.count, 1, "30 giây mới nhịp lại")
    fake.phien = PhienConsole(uid: 501, manKhoa: true)
    dh.tien(31)
    await b.vongNhipChoi()
    XCTAssertEqual(HttpMock.lanGoiCuoi("api/device/phien/nhip")?["dangDung"] as? Bool, false, "màn khoá ⇒ tạm dừng đếm")
    fake.phien = PhienConsole(uid: 501, manKhoa: false); fake.tienCanhThat = "com.apple.iwork.pages"
    dh.tien(31)
    await b.vongNhipChoi()
    XCTAssertEqual(HttpMock.lanGoiCuoi("api/device/phien/nhip")?["dangDung"] as? Bool, false, "game không ở tiền cảnh ⇒ không trừ điểm")
  }

  func testMatMangDemBuRoiGuiTruocDongBo() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dh = DongHoGia()
    let pj = #"{"mode":"hoc","cheDo":"chan","allowedApps":["com.roblox.roblox"],"playSessionId":"ph5","playApp":"com.roblox.roblox","playOfflineMinutes":30}"#
    let b = try dung(fake, dh, thuMuc, policy: pj)
    fake.tienCanhThat = "com.roblox.roblox"
    HttpMock.dat { _, _ in nil }                                  // mất mạng
    await b.vongDongBo()
    for _ in 0..<24 { dh.tien(5); _ = await b.vongAp() }         // 2 phút chơi
    var buGui: [String: Any]?
    HttpMock.dat { path, body in
      if path == "api/device/phien/bu" { buGui = body; return HttpMock.json(200, ["phut": 2]) }
      if path == "api/device/dong-bo" { return HttpMock.TraLoi(ma: 200, than: Data(#"{"windows":\#(pj),"nextCheckSec":30}"#.utf8)) }
      return HttpMock.json(404, [:])
    }
    dh.tien(120)
    await b.vongDongBo()
    XCTAssertEqual(buGui?["id"] as? String, "ph5")
    XCTAssertEqual((buGui?["phut"] as? Double) ?? 0, 2, accuracy: 0.2)
    let thuTu = HttpMock.daGoi.map(\.path)
    XCTAssertLessThan(thuTu.firstIndex(of: "api/device/phien/bu") ?? 99, thuTu.firstIndex(of: "api/device/dong-bo") ?? -1, "bù TRƯỚC dong-bo")
  }

  func testKhongNhipKhiKhongCoPhien() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let b = try dung(HeThongGia(), DongHoGia(), thuMuc, policy: #"{"mode":"hoc"}"#)
    HttpMock.dat { _, _ in HttpMock.json(200, [:]) }
    await b.vongNhipChoi()
    XCTAssertTrue(HttpMock.daGoi.isEmpty)
  }

  func testAppVuaChanBaoTrayMotLanMoiApp() async throws {
    let thuMuc = try thuMucTam(); defer { try? FileManager.default.removeItem(atPath: thuMuc) }
    let fake = HeThongGia(), dh = DongHoGia()
    let b = try dung(fake, dh, thuMuc, policy: #"{"mode":"hoc","cheDo":"chan","playChoices":["com.roblox.roblox"]}"#)
    let roblox = [TienTrinh(pid: 10, uid: 501, duongDan: "/Applications/Roblox.app/Contents/MacOS/RobloxPlayer", bundleId: "com.Roblox.Roblox"),
                  TienTrinh(pid: 11, uid: 501, duongDan: "/Applications/Roblox.app/Contents/MacOS/Helper", bundleId: "com.Roblox.Roblox")]
    fake.tienTrinhTheoUid = [501: roblox]
    fake.conSongPid = [10, 11]
    let t0 = await b.vongAp()
    XCTAssertEqual(t0.chanSeq, 1); XCTAssertEqual(t0.chanTen, "Roblox"); XCTAssertEqual(t0.chanApp, "com.roblox.roblox")
    XCTAssertEqual(t0.chanLyDo, "chi_app_hoc"); XCTAssertEqual(t0.dsChoi, ["com.roblox.roblox"])
    dh.tien(5)
    let r4 = await b.vongAp()
    XCTAssertEqual(r4.chanSeq, 1, "vẫn đang đóng cùng tiến trình ⇒ không báo lại")
    // Con mở lại ngay (pid mới) trong 15 giây ⇒ không bật màn lần nữa
    fake.tienTrinhTheoUid = [501: [TienTrinh(pid: 20, uid: 501, duongDan: "/Applications/Roblox.app/Contents/MacOS/RobloxPlayer", bundleId: "com.Roblox.Roblox")]]
    fake.conSongPid = [20]
    dh.tien(5)
    let r5 = await b.vongAp()
    XCTAssertEqual(r5.chanSeq, 1)
    // tiến trình không thuộc .app nào ⇒ không báo
    fake.tienTrinhTheoUid = [501: [TienTrinh(pid: 30, uid: 501, duongDan: "/usr/local/bin/tool")]]
    fake.conSongPid = [30]
    dh.tien(30)
    let r6 = await b.vongAp()
    XCTAssertEqual(r6.chanSeq, 1)
    // phiên Ba Mẹ (không phải Con) ⇒ không thấy phần riêng của Con
    fake.phien = PhienConsole(uid: 502, manKhoa: false)
    let tBaMe = await b.xuLyIPC(.trangThai, uidGoi: 502)
    guard case .trangThai(let t) = tBaMe else { return XCTFail() }
    XCTAssertNil(t.chanSeq); XCTAssertNil(t.dsChoi)
  }
}

private func == (a: (Int, Int), b: (Int, Int)) -> Bool { a.0 == b.0 && a.1 == b.1 }
private func == (a: (chu: String, duoc: Bool), b: (String, Bool)) -> Bool { a.chu == b.0 && a.duoc == b.1 }
