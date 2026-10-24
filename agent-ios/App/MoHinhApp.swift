// Trạng thái app Con. Cờ debug `-demo <màn>` (chuaGhep | nhapMa | chinh | xinThem | quyen) dựng dữ liệu giả, không gọi mạng —
// chỉ để chụp màn trên simulator.
import Foundation
import SwiftUI
import UIKit
import ConCore
import FamilyControls

enum Man: Equatable { case chuaGhep, nhapMa, chinh, daGo }

@MainActor
final class MoHinhApp: ObservableObject {
  @Published var man: Man = .chuaGhep
  @Published var keHoach: KeHoach?
  @Published var khien: KhienMuonCo?
  @Published var phutConLai = 0
  @Published var phutDaDung = 0
  @Published var yeuCau: YeuCauDangCho?
  @Published var loi: String?
  @Published var dangBan = false
  @Published var uyQuyen = "notDetermined"
  @Published var loiQuyen: String?
  @Published var soLuong = SoLuongChon.rong
  @Published var moXinThem = false
  @Published var moQuyen = false
  @Published var lanDongBo: Date?

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
    man = KhoBiMat.doc() == nil ? .chuaGhep : .chinh
    napTuKho()
  }

  var mayChu: URL { kho.doc(String.self, Khoa.mayChu).flatMap(URL.init(string:)) ?? ApiClient.mayChuMacDinh }

  func dongBo() -> DongBo {
    DongBo(api: ApiClient(goc: mayChu, token: KhoBiMat.doc()), kho: kho, khien: KhienThat(chon: luaChon), lich: LichThat(chon: luaChon),
           uyQuyen: uq, chon: luaChon, xoaToken: { KhoBiMat.ghi(nil) })
  }

  func napTuKho(now: Date = Date()) {
    keHoach = kho.doc(KeHoach.self, Khoa.keHoach)
    khien = kho.doc(KhienMuonCo.self, Khoa.khienDangAp)
    yeuCau = kho.doc(YeuCauDangCho.self, Khoa.yeuCauDangCho)
    lanDongBo = kho.doc(Date.self, Khoa.lanDongBo)
    if let kh = keHoach {
      let nk = kho.doc(NhatKyDung.self, Khoa.nhatKyDung)
      phutConLai = TinhKhien.phutConLai(kh, now: now, dung: nk)
      phutDaDung = TinhKhien.phutDaDung(kh, now: now, dung: nk)
    }
    soLuong = luaChon.dem()
    if demo == nil { uyQuyen = uq.trangThai }
  }

  var tenCon: String? { keHoach?.tenCon ?? kho.doc(ThongTinMay.self, Khoa.thongTinMay)?.tenCon }

  // MARK: ghép máy
  func ghep(_ c: CachGhep) async {
    guard demo == nil else { return }
    dangBan = true; loi = nil
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
      man = .chinh
      moQuyen = uq.trangThai != "approved"
      await dongBoNgay()
    } catch { loi = error.localizedDescription }
  }

  func moLienKet(_ url: URL) {
    if url.scheme == LienKet.scheme, url.host == "xin-them-gio" { moXinThem = man == .chinh; return }
    guard let c = LienKet.doc(url) else { return }
    if man == .chinh { loi = "Máy này đã ghép với gia đình rồi."; return }
    Task { await ghep(c) }
  }

  // MARK: đồng bộ
  func dongBoNgay() async {
    guard demo == nil, KhoBiMat.doc() != nil else { return }
    do {
      if case .daGo = try await dongBo().chay() { man = .daGo }
      loi = nil
    } catch let e as LoiApi where e.chuaGhep {
      KhoBiMat.ghi(nil); man = .chuaGhep; loi = "Máy đã được gỡ khỏi gia đình. Nhờ Ba Mẹ ghép lại nếu cần."
    } catch {
      dongBo().apLucNay()           // mất mạng: vẫn áp theo kế hoạch đã nhớ
      loi = error.localizedDescription
    }
    if kho.doc(Date.self, Khoa.xinTuManChan) != nil { kho.ghi(nil, Khoa.xinTuManChan); moXinThem = man == .chinh }
    napTuKho()
  }

  // MARK: xin thêm giờ
  func xinThem(phut: Int, loiNhan: String) async -> Bool {
    if demo != nil {
      yeuCau = YeuCauDangCho(id: "demo", phut: phut, loiNhan: loiNhan, guiLuc: Date(), trangThai: "cho"); return true
    }
    dangBan = true; defer { dangBan = false }
    do { yeuCau = try await dongBo().xinThemGio(phut: phut, loiNhan: loiNhan); loi = nil; return true }
    catch { loi = error.localizedDescription; return false }
  }

  // MARK: quyền Screen Time
  func xinQuyen(conTrongGiaDinh: Bool) async {
    loiQuyen = nil
    // Gọi API thật cả trên simulator (FamilyControls báo lỗi ở đó) ⇒ màn này phải hiện câu giải thích, không crash.
    do {
      try await uq.xin(conTrongGiaDinh: conTrongGiaDinh)
      uyQuyen = uq.trangThai
      if uyQuyen != "approved" { loiQuyen = Self.cauLoiQuyen(nil) }
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
    case .authorizationCanceled?: return "Ba Mẹ chưa đồng ý hoặc đã huỷ. Bấm lại «Cấp quyền» khi Ba Mẹ ở cạnh nhé."
    case .invalidAccountType?: return "Máy chưa đăng nhập Apple ID của con trong Chia sẻ trong gia đình. Tắt lựa chọn ở trên để xác nhận bằng Face ID / mật mã, hoặc đăng nhập Apple ID của con rồi thử lại."
    case .authorizationConflict?: return "Máy này đang được một ứng dụng quản lý khác giữ quyền. Gỡ quyền của ứng dụng đó trong Cài đặt › Thời gian sử dụng rồi thử lại."
    case .restricted?: return "Cài đặt của máy đang chặn quyền này (hồ sơ quản lý / giới hạn). Ba Mẹ kiểm tra Cài đặt › Thời gian sử dụng."
    case .networkError?: return "Cần mạng để Apple xác nhận. Con bật Wi-Fi hoặc 4G rồi thử lại nhé."
    case .authenticationMethodUnavailable?: return "Máy cần đặt mật mã màn hình trước khi cấp quyền."
    default: return "Chưa cấp được quyền Thời gian sử dụng. Kiểm tra máy chạy iOS 16 trở lên và đã đăng nhập iCloud, rồi thử lại."
    }
    #endif
  }

  func luuChon(_ s: FamilyActivitySelection, _ n: NhanApp) {
    luaChon.luu(s, n)
    soLuong = luaChon.dem()
    Task { await dongBoNgay() }     // áp lại lịch (sự kiện đo phút phụ thuộc app giải trí) + báo số lượng
  }

  // MARK: demo
  func napDemo(_ m: String) {
    uyQuyen = m == "quyen" ? "notDetermined" : "approved"
    let now = Date()
    let kh = KeHoach(tz: TimeZone.current.identifier, moNgayThuong: [Khung(tu: "00:00", den: "24:00")], moCuoiTuan: [Khung(tu: "00:00", den: "24:00")],
                     ngu: nil, tranPhut: 90, buocPhut: 5, webChan: [], webGiaiTri: [], khoaNgay: false, khoaGiaiTri: false, lyDoKhoa: [],
                     moDen: nil, chanCaiApp: true, lich: [], canhBao: [], serverTime: now, tenCon: "Bin", dungChung: false)
    kho.luu(kh, Khoa.keHoach)
    kho.luu(NhatKyDung(ngay: TinhKhien.diaPhuong(now, tz: kh.tz).ngay, phut: 55, tranHet: false), Khoa.nhatKyDung)
    kho.luu(TinhKhien.lucNay(kh, now: now, dung: kho.doc(NhatKyDung.self, Khoa.nhatKyDung)), Khoa.khienDangAp)
    kho.luu(now.addingTimeInterval(-120), Khoa.lanDongBo)
    if m == "chinh" {
      kho.luu(YeuCauDangCho(id: "demo", phut: 30, loiNhan: "Con làm xong bài tập rồi ạ", guiLuc: now, trangThai: "cho"), Khoa.yeuCauDangCho)
    }
    napTuKho(now: now)
    soLuong = SoLuongChon(hoc: 4, giaiTri: 6, chan: 2, danhMucGiaiTri: 2)
    switch m {
    case "chuaGhep": man = .chuaGhep
    case "nhapMa": man = .nhapMa
    case "xinThem": man = .chinh; moXinThem = true
    case "quyen": man = .chinh; moQuyen = true; Task { await xinQuyen(conTrongGiaDinh: true) }
    case "daGo": man = .daGo
    default: man = .chinh
    }
  }
}
