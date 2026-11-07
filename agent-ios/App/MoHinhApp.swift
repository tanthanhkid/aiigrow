// Trạng thái app Con (bản «Dịu» 06/11). Cờ debug `-demo <màn>` dựng dữ liệu giả, không gọi mạng — chỉ để chụp màn trên simulator
// (danh sách màn: `MoHinhApp.napDemo`).
import Foundation
import SwiftUI
import UIKit
import ConCore
import FamilyControls

enum Man: Equatable { case chao, chuaGhep, nhapMa, quetQR, chinh, daGo }
enum LoiGhep: Equatable { case sai(String), hetHan, matMang }
enum TabCon: Hashable { case homNay, nhiemVu, saoQua, tin }

/// Bài nộp chưa gửi được (mất mạng) — lưu ở máy, gửi khi có mạng.
struct BaiCho: Codable, Equatable, Identifiable {
  var id: String { luot }
  var luot: String
  var ten: String
  var anh: [TepNop]
  var ghiAm: TepNop?
  var ghiChu: String?
  var luc: Date
  /// Bé nộp — chỉ gửi lại khi chính bé đó đang dùng máy (máy chủ xét lượt theo bé).
  var con: String?
}

@MainActor
final class MoHinhApp: ObservableObject {
  @Published var man: Man = .chao
  @Published var keHoach: KeHoach?
  @Published var khien: KhienMuonCo?
  @Published var phutConLai = 0
  @Published var phutDaDung = 0
  @Published var yeuCau: YeuCauDangCho?
  @Published var xinCho: YeuCauDangCho?
  @Published var loi: String?
  @Published var loiGhep: LoiGhep?
  @Published var dangBan = false
  @Published var uyQuyen = "notDetermined"
  @Published var loiQuyen: String?
  @Published var soLuong = SoLuongChon.rong
  @Published var moQuyen = false
  @Published var lanDongBo: Date?
  @Published var coBiMatOffline = false
  @Published var matMang = false
  // PIN theo bé
  @Published var phien: PhienMay?
  @Published var hoSo: HoSoMay?
  // hằng ngày
  @Published var tab: TabCon = .homNay
  @Published var tq: TongQuanCon?
  @Published var cuaHang: CuaHangCon?
  @Published var viQua: ViQuaCon?
  @Published var tin: [TinCon] = []
  @Published var yeuCauCho: [YeuCauCho] = []
  @Published var baiCho: [BaiCho] = []
  // điều hướng màn phụ (sheet)
  @Published var manPhu: ManPhu?

  let kho: KhoGiaTri
  let luaChon: LuaChonApp
  let uq = UyQuyenThat()
  let demo: String?

  init() {
    let args = ProcessInfo.processInfo.arguments
    demo = args.firstIndex(of: "-demo").flatMap { $0 + 1 < args.count ? args[$0 + 1] : nil }
    kho = demo == nil ? KhoUserDefaults() : KhoBoNho()
    luaChon = LuaChonApp(kho: kho)
    if let demo { napDemo(demo); return }
    man = KhoBiMat.doc() == nil ? .chao : .chinh
    baiCho = Self.docBaiCho()
    napTuKho()
  }

  var mayChu: URL { kho.doc(String.self, Khoa.mayChu).flatMap(URL.init(string:)) ?? ApiClient.mayChuMacDinh }
  var api: ApiClient { ApiClient(goc: mayChu, token: KhoBiMat.doc()) }

  func dongBo() -> DongBo {
    let d = DongBo(api: api, kho: kho, khien: KhienThat(chon: luaChon), lich: LichThat(chon: luaChon),
           uyQuyen: uq, chon: luaChon, xoaToken: { KhoBiMat.ghi(nil) },
           docBiMatOffline: { KhoBiMat.docBiMatOffline() }, luuBiMatOffline: { KhoBiMat.ghiBiMatOffline($0) })
    d.khoCho = KhoKeychain()
    return d
  }
  func vaoMay() -> VaoMay { VaoMay(api: api, kho: kho, khoCho: demo == nil ? KhoKeychain() : nil, biMat: { KhoBiMat.docBiMatOffline() }) }

  func napTuKho(now: Date = Date()) {
    keHoach = kho.doc(KeHoach.self, Khoa.keHoach)
    khien = kho.doc(KhienMuonCo.self, Khoa.khienDangAp)
    yeuCau = kho.doc(YeuCauDangCho.self, Khoa.yeuCauDangCho)
    xinCho = kho.doc(YeuCauDangCho.self, Khoa.xinChoMang)
    lanDongBo = kho.doc(Date.self, Khoa.lanDongBo)
    phien = kho.doc(PhienMay.self, Khoa.phienMay)
    hoSo = kho.doc(HoSoMay.self, Khoa.hoSoMay)
    if let kh = keHoach {
      let nk = kho.doc(NhatKyDung.self, Khoa.nhatKyDung)
      phutConLai = TinhKhien.phutConLai(kh, now: now, dung: nk)
      phutDaDung = TinhKhien.phutDaDung(kh, now: now, dung: nk)
    }
    soLuong = luaChon.dem()
    if demo == nil { uyQuyen = uq.trangThai; coBiMatOffline = KhoBiMat.docBiMatOffline() != nil }
  }

  /// Hạn mở bằng mã offline đang chạy (nil = không).
  var moOfflineDen: Date? { kho.doc(MoTamOffline.self, Khoa.moTamOffline)?.hanMo(Date()) }
  var tenCon: String? { (phien?.loai == .con ? phien?.ten : nil) ?? tq?.con?.ten ?? keHoach?.tenCon ?? kho.doc(ThongTinMay.self, Khoa.thongTinMay)?.tenCon }
  var dungChung: Bool { kho.doc(ThongTinMay.self, Khoa.thongTinMay)?.dungChung ?? (hoSo.map { !$0.mayRieng } ?? false) }
  /// Máy đang khoá chờ chọn tên + PIN.
  var dangKhoaChoTen: Bool { phien?.khoa(Date()) ?? false }
  var baMeDangDung: Bool { phien?.baMeDangDung(Date()) ?? false }
  var soSao: Int { tq?.soSao ?? cuaHang?.soSao ?? 0 }
  var tongPhut: Int { tq?.quy?.tongPhut ?? keHoach?.tranPhut ?? 0 }
  var conPhut: Int { matMang || tq?.quy == nil ? phutConLai : min(phutConLai, tq?.quy?.conPhut ?? phutConLai) }
  var daDung: Int { max(phutDaDung, matMang ? 0 : (tq?.quy?.daDung ?? 0)) }
  var phut10Sao: Int { tq?.quy?.phut10Sao ?? keHoach?.phut10Sao ?? 10 }
  /// Giờ ngủ / Ba Mẹ khoá / giờ học: không thêm giờ được — chỉ xin ngoại lệ.
  var chiNgoaiLe: Bool { khien?.lyDo.chiNgoaiLe == true }

  // MARK: ghép máy
  func ghep(_ c: CachGhep) async {
    guard demo == nil else { return }
    dangBan = true; loi = nil; loiGhep = nil
    defer { dangBan = false }
    do {
      let ten = UIDevice.current.name
      let kq: KetQuaGhep
      switch c {
      case .ma(let ma): kq = try await ApiClient(goc: mayChu).ghepBangMa(ma, tenMay: ten)
      case .token(let t, let goc):
        if let goc { kho.luu(goc.absoluteString, Khoa.mayChu) }
        kq = try await ApiClient(goc: mayChu).ghepBangToken(t, tenMay: ten)
      }
      KhoBiMat.ghi(kq.token)
      kho.luu(ThongTinMay(deviceId: kq.deviceId, tenCon: kq.childName, dungChung: kq.dungChung ?? false), Khoa.thongTinMay)
      // 06/11 (cdt-quyen): ghép xong + cho phép giữ giờ ⇒ màn Chọn tên (máy khoá), bé chạm tên + PIN để vào máy
      kho.luu(PhienMay(loai: .chua, luc: Date()), Khoa.phienMay)
      man = .chinh
      moQuyen = true
      _ = await vaoMay().taiHoSo()
      await dongBoNgay()
    } catch let e as LoiApi {
      switch e {
      case .mang: loiGhep = .matMang
      case .mayChu(let ma, let cau, _):
        loiGhep = ma == "ma_het_han" ? .hetHan : .sai(cau)
      default: loiGhep = .sai(e.errorDescription ?? "Chưa ghép được")
      }
    } catch { loiGhep = .sai(error.localizedDescription) }
  }

  func moLienKet(_ url: URL) {
    if url.scheme == LienKet.scheme, url.host == "xin-them-gio" { moXinTuManChan(); return }
    if url.scheme == LienKet.scheme, url.host == "choi" { Task { await dongBoNgay() }; return }
    guard let c = LienKet.doc(url) else { return }
    if man == .chinh { loi = "Máy này đã ghép với gia đình rồi."; return }
    Task { await ghep(c) }
  }

  /// Nút trên màn chặn ⇒ màn xin (máy đang khoá chờ PIN thì để màn chọn tên, không mở xin).
  func moXinTuManChan() {
    guard man == .chinh, !dangKhoaChoTen, !baMeDangDung else { return }
    manPhu = khien?.lyDo == .khong ? .xinCai : .xinThem
  }

  // MARK: đồng bộ
  /// `nen`: BGAppRefreshTask (~30 giây) — chỉ nhip + áp khiên, bỏ phần hằng ngày / hồ sơ / gửi bài.
  func dongBoNgay(nen: Bool = false) async {
    guard demo == nil, KhoBiMat.doc() != nil else { return }
    do {
      if case .daGo = try await dongBo().chay() { man = .daGo; napTuKho(); return }
      loi = nil; matMang = false
      if uq.trangThai == "approved", !UserDefaults.standard.bool(forKey: "daXinThongBao") {
        UserDefaults.standard.set(true, forKey: "daXinThongBao"); ThongBao.xinQuyen()
      }
    } catch let e as LoiApi where e.chuaGhep {
      KhoBiMat.ghi(nil); man = .chuaGhep; loi = "Máy đã được gỡ khỏi gia đình. Nhờ Ba Mẹ ghép lại nếu cần."
      for k in [Khoa.suKienCho, Khoa.moTamOffline, Khoa.phienMay, Khoa.hoSoMay, Khoa.viecChoMang, Khoa.xinChoMang] { kho.ghi(nil, k) }
    } catch {
      dongBo().apLucNay()           // mất mạng: vẫn áp theo kế hoạch đã nhớ
      if case .mang = error as? LoiApi { matMang = true } else { loi = error.localizedDescription }
    }
    napTuKho()
    if kho.doc(Date.self, Khoa.xinTuManChan) != nil { kho.ghi(nil, Khoa.xinTuManChan); moXinTuManChan() }
    if nen { return }
    if dungChung || phien != nil { hoSo = await vaoMay().taiHoSo().0 }
    if !matMang && !dangKhoaChoTen && !baMeDangDung { await taiNgay(); await guiBaiCho() }
  }

  // MARK: chờ thay đổi (khi app đang mở)
  private var viecCho: Task<Void, Never>?
  /// P1 (07/11): app đang mở ⇒ giữ long-poll tới máy chủ; Ba Mẹ đổi gì ⇒ đồng bộ + áp khiên ngay (≤5 giây). Ở nền iOS không cho giữ kết nối — xem ConCore/ChoThayDoi.swift.
  func batDauCho() {
    guard demo == nil, viecCho == nil else { return }
    viecCho = Task { [weak self] in await self?.vongCho() }
  }
  func dungCho() { viecCho?.cancel(); viecCho = nil }

  private func vongCho() async {
    var ver: Int?, loi = 0
    while !Task.isCancelled {
      var nghi = 0.0
      if KhoBiMat.doc() == nil { ver = nil; nghi = 5 }
      else {
        let t0 = Date()
        do {
          let kq = try await api.choThayDoi(ver: ver)
          loi = 0
          if ver != nil && kq.doi { await dongBoNgay() }
          ver = kq.phienBan
          nghi = ChoThayDoi.choLai(loiLienTiep: 0, kq: kq, daCho: Date().timeIntervalSince(t0))
        } catch let e as LoiApi {
          if case .mayChu(_, _, 404) = e { loi = 0; nghi = 300 } else { loi += 1; nghi = ChoThayDoi.choLai(loiLienTiep: loi, kq: nil, daCho: 0) }
        } catch { loi += 1; nghi = ChoThayDoi.choLai(loiLienTiep: loi, kq: nil, daCho: 0) }
      }
      if nghi > 0 { try? await Task.sleep(nanoseconds: UInt64(nghi * 1_000_000_000)) }
    }
  }

  /// Dữ liệu hằng ngày của bé đang dùng máy.
  func taiNgay() async {
    guard demo == nil else { return }
    let a = api
    async let t = try? a.tongQuan()
    async let c = try? a.cuaHang()
    async let v = try? a.viQua()
    async let n = try? a.tin()
    async let q = try? a.quyCon()
    let (t1, c1, v1, n1, q1) = await (t, c, v, n, q)
    if let t1 { tq = t1 }
    if let c1 { cuaHang = c1 }
    if let v1 { viQua = v1 }
    if let n1 { tin = n1.ds }
    if let q1 { yeuCauCho = q1.yeuCauCho ?? [] }
  }

  /// Áp khiên lại ngay theo phiên máy mới (đăng nhập / đăng xuất / Ba Mẹ mở).
  func apLaiKhien() {
    guard demo == nil else { return }
    var kh = kho.doc(KeHoach.self, Khoa.keHoach)
    if let den = kho.doc(PhienMay.self, Khoa.phienMay)?.baMeDen, den > Date(), kh != nil {
      kh!.lich = LapKeHoach.themLich(kh!.lich, LapKeHoach.lichMotLan("bame", den: den, now: Date()))
      kho.luu(kh, Khoa.keHoach)        // lưu cùng lịch «bame» — lượt theoDoi sau từ kế hoạch đã lưu không xoá mất chuông khoá lại
      try? LichThat(chon: luaChon).theoDoi(kh!.lich)
    }
    dongBo().apLucNay()
    napTuKho()
  }

  // MARK: PIN theo bé
  func taiHoSo() async {
    guard demo == nil else { return }
    let (h, off) = await vaoMay().taiHoSo()
    hoSo = h; matMang = off
  }

  func dangNhap(_ be: BeTrenMay, pin: String?) async -> KetQuaVaoMay {
    if demo != nil {
      if pin == nil || pin == "4821" { let p = PhienMay(loai: .con, conId: be.id, ten: be.ten, luc: Date()); phien = p; return .vao(p, canDatPin: pin == nil, offline: false) }
      return .sai(conLan: 3)
    }
    dangBan = true; defer { dangBan = false }
    let kq = await vaoMay().dangNhap(be, pin: pin)
    if case .vao = kq { apLaiKhien(); tab = .homNay; Task { await dongBoNgay() } }
    return kq
  }

  func quenPin(_ be: BeTrenMay) async -> String {
    if demo != nil { return "Đã báo Ba Mẹ" }
    do { return try await vaoMay().quenPin(be) ? "Đã báo Ba Mẹ rồi — chờ Ba Mẹ đặt PIN mới nhé" : "Đã báo Ba Mẹ" }
    catch { return (error as? LoiApi)?.errorDescription ?? "Chưa báo được. Thử lại nhé." }
  }

  func baMeMo(_ ma: String) async -> KetQuaBaMeMo {
    if demo != nil { return ma == "482917" ? .mo(den: Date().addingTimeInterval(1800), phut: 30, offline: false) : .sai(conLan: 4) }
    dangBan = true; defer { dangBan = false }
    let kq = await vaoMay().baMeMo(ma)
    if case .mo = kq { apLaiKhien() }
    return kq
  }

  /// «Đổi bé / Đăng xuất» (bé) hoặc «Khoá lại» (Ba Mẹ).
  func roiMay(baMe: Bool = false) async {
    manPhu = nil
    if demo != nil { phien = PhienMay(loai: .chua, luc: Date()); return }
    await vaoMay().roiMay(baMe: baMe)
    tq = nil; cuaHang = nil; viQua = nil; tin = []
    apLaiKhien()
    await taiHoSo()
  }

  // MARK: giờ chơi
  func doiSao(phut: Int) async -> Result<KetQuaDoiSao, LoiApi> {
    if demo != nil { return .success(Self.j(#"{"phut":\#(phut),"sao":\#(phut),"soDu":\#(soSao - phut),"conPhut":\#(conPhut + phut)}"#)) }
    dangBan = true; defer { dangBan = false }
    do {
      let r = try await api.doiSao(phut: phut)
      await dongBoNgay()      // quỹ tăng ⇒ trần mới ⇒ gỡ khiên ngay
      return .success(r)
    } catch let e as LoiApi { return .failure(e) } catch { return .failure(.mang(error.localizedDescription)) }
  }

  /// Xin thêm giờ / ngoại lệ. Mất mạng ⇒ lưu lời xin, gửi khi có mạng (→ "luu").
  func xin(phut: Int, loiNhan: String, ngoaiLe: Bool) async -> String? {
    if demo != nil {
      yeuCau = YeuCauDangCho(id: "demo", phut: phut, loiNhan: loiNhan, guiLuc: Date(), trangThai: "cho"); return "gui"
    }
    dangBan = true; defer { dangBan = false }
    do {
      yeuCau = ngoaiLe ? try await dongBo().xinNgoaiLe(phut: phut, loiNhan: loiNhan) : try await dongBo().xinThemGio(phut: phut, loiNhan: loiNhan)
      loi = nil
      if let q = try? await api.quyCon() { yeuCauCho = q.yeuCauCho ?? [] }
      return "gui"
    } catch LoiApi.mang {
      let x = YeuCauDangCho(id: "cho-mang", phut: phut, loiNhan: loiNhan, guiLuc: Date(), trangThai: ngoaiLe ? "ngoai_le" : "them_gio")
      kho.luu(x, Khoa.xinChoMang); xinCho = x; matMang = true
      return "luu"
    } catch { loi = (error as? LoiApi)?.errorDescription ?? error.localizedDescription; return nil }
  }

  func xinCaiApp(ten: String, lyDo: String) async -> Bool {
    if demo != nil { return true }
    dangBan = true; defer { dangBan = false }
    do { try await api.xinDuyet(ten: ten, lyDo: lyDo); loi = nil; return true }
    catch { loi = (error as? LoiApi)?.errorDescription ?? error.localizedDescription; return false }
  }

  // MARK: nhiệm vụ
  func batDau(_ nv: NhiemVuCon) async -> String? {
    if demo != nil { return "demo-luot" }
    if let l = nv.luot { return l }
    do { return try await api.batDau(nhiemVu: nv.id) }
    catch { loi = (error as? LoiApi)?.errorDescription ?? error.localizedDescription; return nil }
  }

  /// Nộp bài. Mất mạng ⇒ lưu ở máy (→ "luu"); lỗi khác ⇒ nil (đọc `loi`).
  func nop(luot: String, ten: String, anh: [Data], ghiAm: Data?, viet: String?) async -> String? {
    let bai = BaiCho(luot: luot, ten: ten, anh: anh.map { TepNop(mime: "image/jpeg", duLieu: $0) },
                     ghiAm: ghiAm.map { TepNop(mime: "audio/mp4", duLieu: $0) }, ghiChu: viet, luc: Date(), con: phien?.conId)
    if demo != nil { return "cho_duyet" }
    dangBan = true; defer { dangBan = false }
    do {
      let tt = try await api.nop(luot: bai.luot, anh: bai.anh, ghiAm: bai.ghiAm, ghiChu: bai.ghiChu)
      loi = nil; await taiNgay(); return tt
    } catch LoiApi.mang {
      baiCho.removeAll { $0.luot == luot }; baiCho.append(bai); Self.ghiBaiCho(baiCho); matMang = true
      return "luu"
    } catch { loi = (error as? LoiApi)?.errorDescription ?? error.localizedDescription; return nil }
  }

  func guiBaiCho() async {
    guard !baiCho.isEmpty else { return }
    for b in baiCho where b.con == nil || b.con == phien?.conId {
      do { _ = try await api.nop(luot: b.luot, anh: b.anh, ghiAm: b.ghiAm, ghiChu: b.ghiChu); baiCho.removeAll { $0.luot == b.luot } }
      catch let e as LoiApi where e.tamThoi || e.ma == "chua_chon_con" { break }
      catch { baiCho.removeAll { $0.luot == b.luot } }      // máy chủ từ chối (đã nộp / hết hạn) — bỏ, không kẹt hàng chờ
    }
    Self.ghiBaiCho(baiCho)
  }

  static var tepBaiCho: URL {
    let d = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    try? FileManager.default.createDirectory(at: d, withIntermediateDirectories: true)
    return d.appendingPathComponent("bai-cho.json")
  }
  static func docBaiCho() -> [BaiCho] {
    (try? Data(contentsOf: tepBaiCho)).flatMap { try? JSONDecoder().decode([BaiCho].self, from: $0) } ?? []
  }
  static func ghiBaiCho(_ ds: [BaiCho]) {
    if ds.isEmpty { try? FileManager.default.removeItem(at: tepBaiCho); return }
    try? JSONEncoder().encode(ds).write(to: tepBaiCho, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
  }

  // MARK: quà
  func doiQua(_ q: QuaCuaHang) async -> Bool {
    if demo != nil { return true }
    dangBan = true; defer { dangBan = false }
    do { _ = try await api.doiQua(q.id); loi = nil; await taiNgay(); return true }
    catch { loi = (error as? LoiApi)?.errorDescription ?? error.localizedDescription; return false }
  }

  func phanHoi(_ lk: LoiKhenCon, _ noi: String) async {
    if demo != nil { return }
    do { try await api.phanHoi(loiKhen: lk.id, noi); await taiNgay() } catch { loi = (error as? LoiApi)?.errorDescription }
  }

  // MARK: mã mở offline (Con gõ mã Ba Mẹ đọc khi máy mất mạng)
  func moBangMa(_ ma: String) -> (KetQuaMoOffline, String) {
    if demo != nil { return ma == "731902" ? (.daMo, "Đã mở 30 phút") : (.sai, "Mã chưa đúng") }
    let (kq, cau) = dongBo().moBangMaOffline(ma, biMat: KhoBiMat.docBiMatOffline())
    napTuKho()
    return (kq, cau)
  }
  var saiMaOffline: Int { kho.doc(MoTamOffline.self, Khoa.moTamOffline)?.saiLuc.count ?? 0 }
  var phutMoOffline: Int { kho.doc(MoTamOffline.self, Khoa.moTamOffline)?.phutMo ?? 60 }

  // MARK: hồ sơ DNS gia đình (.mobileconfig)
  func caiHoSoDns() async {
    guard demo == nil else { return }
    dangBan = true; defer { dangBan = false }
    do {
      let h = try await api.hoSoDns()
      let url = try await MayChuHoSo.shared.phucVu(h.apple.mobileconfig, tep: h.apple.tep)
      loi = nil
      await UIApplication.shared.open(url)
    } catch { loi = (error as? LoiApi)?.errorDescription ?? "Chưa mở được hồ sơ DNS. Thử lại sau ít phút nhé." }
  }

  // MARK: quyền Screen Time
  func xinQuyen(conTrongGiaDinh: Bool) async {
    loiQuyen = nil
    do {
      try await uq.xin(conTrongGiaDinh: conTrongGiaDinh)
      uyQuyen = uq.trangThai
      if uyQuyen != "approved" { loiQuyen = Self.cauLoiQuyen(nil) } else { moQuyen = false }
      await dongBoNgay()
    } catch {
      loiQuyen = Self.cauLoiQuyen(error)
      if demo == nil { uyQuyen = uq.trangThai }
    }
  }

  static func cauLoiQuyen(_ e: Error?) -> String {
    #if targetEnvironment(simulator)
    return "Máy ảo (Simulator) không cấp được quyền Thời gian sử dụng. Trên iPhone/iPad thật, bước này hiện hộp xác nhận của Apple."
    #else
    switch e as? FamilyControlsError {
    case .authorizationCanceled?: return "Ba Mẹ bấm «Không cho phép» nên AiiGrow chưa đếm giờ."
    case .invalidAccountType?: return "Máy chưa đăng nhập Apple ID của con trong Chia sẻ trong gia đình. Tắt lựa chọn «Apple ID của con» để xác nhận bằng Face ID / mật mã."
    case .authorizationConflict?: return "Máy này đang được một ứng dụng quản lý khác giữ quyền. Gỡ quyền của ứng dụng đó trong Cài đặt › Thời gian sử dụng rồi thử lại."
    case .restricted?: return "Cài đặt của máy đang chặn quyền này. Ba Mẹ kiểm tra Cài đặt › Thời gian sử dụng."
    case .networkError?: return "Cần mạng để Apple xác nhận. Bật Wi-Fi hoặc 4G rồi thử lại nhé."
    case .authenticationMethodUnavailable?: return "Máy cần đặt mật mã màn hình trước khi cấp quyền."
    default: return "Chưa cấp được quyền Thời gian sử dụng. Kiểm tra máy chạy iOS 16 trở lên và đã đăng nhập iCloud, rồi thử lại."
    }
    #endif
  }

  func luuChon(_ s: FamilyActivitySelection, _ n: NhanApp) {
    luaChon.luu(s, n)
    soLuong = luaChon.dem()
    Task { await dongBoNgay() }
  }

  // MARK: demo (chụp màn so với docs/thiet-ke-chot/con-dt-*)
  func napDemo(_ m: String) {
    uyQuyen = m == "quyen" || m == "chuaChoPhep" ? "notDetermined" : "approved"
    let now = Date()
    var kh = KeHoach(tz: TimeZone.current.identifier, moNgayThuong: [Khung(tu: "00:00", den: "24:00")], moCuoiTuan: [Khung(tu: "00:00", den: "24:00")],
                     ngu: Khung(tu: "21:30", den: "06:30"), tranPhut: 60, buocPhut: 5, webChan: [], webGiaiTri: [], khoaNgay: m == "khoaMay", khoaGiaiTri: false,
                     lyDoKhoa: [], moDen: nil, chanCaiApp: true, lich: [], canhBao: [], serverTime: now, tenCon: "Bảo Anh", dungChung: false)
    kh.hoc = Khung(tu: "17:00", den: "18:00"); kh.phut10Sao = 10
    if m == "gioNgu" { kh.ngu = Khung(tu: TinhKhien.diaPhuong(now.addingTimeInterval(-60), tz: kh.tz).phut.gio, den: "06:30") }
    kho.luu(kh, Khoa.keHoach)
    let daDung = ["hetGio", "maOffline", "maSai", "maHetHan", "luuXin"].contains(m) ? 60 : (m == "matMang" ? 52 : 42)
    kho.luu(NhatKyDung(ngay: TinhKhien.diaPhuong(now, tz: kh.tz).ngay, phut: daDung, tranHet: daDung >= 60), Khoa.nhatKyDung)
    let ph: PhienMay
    switch m {
    case "chonTen", "nhapPin", "pinSai", "choPin", "quenPin", "baMeMa": ph = PhienMay(loai: .chua, luc: now)
    case "baMeDung": ph = PhienMay(loai: .baMe, baMeDen: now.addingTimeInterval(1800), luc: now)
    default: ph = PhienMay(loai: .con, conId: "c1", ten: "Bảo Anh", luc: now)
    }
    kho.luu(ph, Khoa.phienMay)
    var hs = HoSoMay(con: [BeTrenMay(id: "c1", ten: "Bảo Anh", coPin: true), BeTrenMay(id: "c2", ten: "Bảo Minh", coPin: true)], mayRieng: false)
    hs.pinSaiToiDa = 5
    kho.luu(hs, Khoa.hoSoMay)
    kho.luu(TinhKhien.lucNay(kh, now: now, dung: kho.doc(NhatKyDung.self, Khoa.nhatKyDung), phien: ph), Khoa.khienDangAp)
    kho.luu(now.addingTimeInterval(-120), Khoa.lanDongBo)
    napTuKho(now: now)
    soLuong = SoLuongChon(hoc: 4, giaiTri: 6, chan: 2, danhMucGiaiTri: 2)
    coBiMatOffline = true
    tq = Self.tqDemo(conPhut: max(0, 60 - daDung), daDung: daDung)
    cuaHang = Self.cuaHangDemo
    viQua = Self.j(#"{"daTrao":[],"voucher":[{"ma":"AII-7K2P","menh_gia":50000,"trang_thai":"da_phat_hanh","het_han":"2026-12-25T00:00:00.000Z","ten":"Voucher AiiCafe 50k","qr":"AII-7K2P","conNgay":49}],"phieu":[{"id":"r1","ten":"Chọn món bữa tối","loai":"dac_quyen","diem":50,"trang_thai":"giu"}]}"#)
    tin = Self.j(#"[{"id":"e1","loai":"loi_khen","tieu":"Mẹ Lan khen con","noi":"Phòng con gọn ghê!","luc":"\#(NgayISO.viet(now.addingTimeInterval(-300)))"}]"#)
    yeuCauCho = Self.j(#"[{"id":"y1","loai":"them_gio","phut":20,"ly_do":"Con làm nốt bài với bạn ạ","created_at":"\#(NgayISO.viet(now.addingTimeInterval(-360)))"},{"id":"y2","loai":"mo_web","phut":30,"gia_tri":"YouTube","created_at":"\#(NgayISO.viet(now.addingTimeInterval(-60)))"}]"#)
    man = .chinh
    switch m {
    case "chao": man = .chao
    case "chuaGhep": man = .chuaGhep
    case "nhapMa": man = .nhapMa
    case "maGhepSai": man = .nhapMa; loiGhep = .sai("Mã chưa đúng")
    case "maGhepHetHan": man = .nhapMa; loiGhep = .hetHan
    case "maGhepMatMang": man = .nhapMa; loiGhep = .matMang
    case "quetQR": man = .quetQR
    case "quyen": moQuyen = true
    case "chuaChoPhep": moQuyen = true; loiQuyen = "Ba Mẹ bấm «Không cho phép» nên AiiGrow chưa đếm giờ."
    case "daGo": man = .daGo
    case "nhiemVu": tab = .nhiemVu
    case "saoQua": tab = .saoQua
    case "tin": tab = .tin
    case "cuaHang": tab = .saoQua; manPhu = .cuaHang
    case "doiSao": manPhu = .doiSao
    case "xinThem": manPhu = .xinThem
    case "conDangXin": manPhu = .conDangXin
    case "doiBe": manPhu = .doiBe
    case "xinCai": manPhu = .xinCai
    case "dns": manPhu = .dns
    case "nvChiTiet": tab = .nhiemVu; manPhu = .nhiemVu(tq!.nhiemVu[1])
    case "maOffline", "maSai", "maHetHan", "luuXin", "matMang": matMang = true
    default: break
    }
    if m == "luuXin" { xinCho = YeuCauDangCho(id: "cho-mang", phut: 20, loiNhan: "", guiLuc: now, trangThai: "them_gio") }
  }

  static func tqDemo(conPhut: Int, daDung: Int) -> TongQuanCon {
    let j = """
    {"con":{"id":"c1","ten":"Bảo Anh"},"sao":30,"saoChoDuyet":10,
     "quy":{"conPhut":\(conPhut),"daDung":\(daDung),"tongPhut":60,"quyNgayPhut":60,"themPhut":0,"dangNgu":false,"dangHoc":false,"khoa":false,
            "gioNgu":{"tu":"21:30","den":"06:30"},"gioHoc":{"tu":"17:00","den":"18:00","thu":[1,2,3,4,5]},"tyLe":{"sao":10,"phut":10},
            "doiSao":{"bat":true,"toiDaNgay":30,"conDoiDuoc":30},"choXinThem":true},
     "nhiemVu":[
      {"id":"t1","ten":"Đọc sách 20 phút","sao":10,"bangChung":"ghi_am","trangThai":"dang_lam","luot":"l1","dangCho":true,"gioNhac":"17:15","moTa":"Đọc to 1 trang cho Ba Mẹ nghe"},
      {"id":"t2","ten":"Dọn phòng","sao":10,"bangChung":"anh","trangThai":"san_sang","gioNhac":"20:00","moTa":"Ảnh giường · Ảnh bàn học"},
      {"id":"t3","ten":"Tự đánh răng","sao":10,"bangChung":"anh","trangThai":"san_sang","gioNhac":"21:30"},
      {"id":"t4","ten":"Tự xếp cặp","sao":10,"bangChung":"anh","trangThai":"san_sang","gioNhac":"21:00"},
      {"id":"t5","ten":"Học 1 bài với AiiRob","sao":20,"bangChung":"tu_cham","trangThai":"san_sang"}],
     "gan":[],"loiKhen":[{"id":"m1","noiDung":"Mẹ về lúc 19:00 nha. Con dọn phòng trước rồi chơi nhé!","phanHoi":null}],
     "phieuCho":[{"id":"r1","ten":"Chọn món bữa tối","diem":50}]}
    """
    return try! JSONDecoder().decode(TongQuanCon.self, from: Data(j.utf8))
  }

  static func j<T: Decodable>(_ s: String) -> T { try! JSONDecoder().decode(T.self, from: Data(s.utf8)) }

  static var cuaHangDemo: CuaHangCon {
    j(#"""
    {"sao":50,"saoGiu":0,"qua":[
     {"id":"q1","ten":"Chọn món bữa tối","loai":"dac_quyen","sao":50,"du":true,"conThieu":0,"moTa":"Ba Mẹ nấu món con chọn","hinh":"bua_toi"},
     {"id":"q2","ten":"Đi ăn kem","loai":"dac_quyen","sao":100,"du":false,"conThieu":50,"hinh":"an_kem"},
     {"id":"q3","ten":"AiiCafe 20k","loai":"voucher","sao":200,"menhGia":20000,"du":false,"conThieu":150,"hinh":"aiicafe"},
     {"id":"q4","ten":"Đồ chơi nhỏ","loai":"qua","sao":200,"du":false,"conThieu":150,"hinh":"do_choi"},
     {"id":"q5","ten":"Đi xem phim","loai":"dac_quyen","sao":300,"chiCuoiTuan":true,"du":false,"conThieu":250,"hinh":"xem_phim"},
     {"id":"q6","ten":"AiiCafe 50k","loai":"voucher","sao":500,"menhGia":50000,"du":false,"conThieu":450,"hinh":"aiicafe"},
     {"id":"q7","ten":"Bộ Lego","loai":"qua","sao":800,"tonKho":1,"du":false,"conThieu":750,"hinh":"lego"}]}
    """#)
  }
}

extension Int {
  /// Phút trong ngày ⇒ "HH:mm".
  var gio: String { String(format: "%02d:%02d", self / 60, self % 60) }
}
