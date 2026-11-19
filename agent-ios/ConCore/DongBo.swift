// Một lượt đồng bộ (mở app / BGAppRefreshTask): gửi nhịp ⇒ lập kế hoạch ⇒ đặt lịch DeviceActivity ⇒ áp khiên ⇒ xử lý lệnh.
// Mọi tác động hệ thống đi qua protocol (bản thật ở HeThong/, bản giả trong test) — FamilyControls không chạy trên simulator.
import Foundation

public protocol HeThongKhien: AnyObject {
  /// Áp khiên lúc này: `.moiApp` = mọi danh mục (trừ app hệ thống iOS không cho khiên), `.giaiTri` = app/danh mục Ba Mẹ gắn nhãn Giải trí.
  func ap(_ k: KhienMuonCo)
  func goHet()
}

public protocol HeThongLich: AnyObject {
  func theoDoi(_ lich: [MucLich]) throws
  func dungHet()
}

public protocol HeThongUyQuyen: AnyObject {
  /// "approved" | "denied" | "notDetermined" | "khong_ho_tro"
  var trangThai: String { get }
  func thuHoi() async
}

public struct SoLuongChon: Codable, Equatable {
  public var hoc: Int, giaiTri: Int, chan: Int, danhMucGiaiTri: Int
  public init(hoc: Int, giaiTri: Int, chan: Int, danhMucGiaiTri: Int) {
    self.hoc = hoc; self.giaiTri = giaiTri; self.chan = chan; self.danhMucGiaiTri = danhMucGiaiTri
  }
  public static let rong = SoLuongChon(hoc: 0, giaiTri: 0, chan: 0, danhMucGiaiTri: 0)
}

public protocol NguonLuaChon: AnyObject { func dem() -> SoLuongChon }

public enum KetQuaDongBo: Equatable { case xong(KeHoach), daGo }

public final class DongBo {
  public static let phienBan = "ios-0.2.0"
  let api: ApiClient
  let kho: KhoGiaTri
  let khien: HeThongKhien
  let lich: HeThongLich
  let uyQuyen: HeThongUyQuyen
  let chon: NguonLuaChon
  let xoaToken: () -> Void
  /// Đọc / nhớ bí mật mã mở offline (app: Keychain). nil = bỏ qua.
  let docBiMatOffline: (() -> String?)?
  let luuBiMatOffline: ((String) -> Void)?
  /// Kho hàng chờ có PIN (app: Keychain) — xem VaoMay.khoCho.
  public var khoCho: KhoGiaTri?

  public init(api: ApiClient, kho: KhoGiaTri, khien: HeThongKhien, lich: HeThongLich, uyQuyen: HeThongUyQuyen,
              chon: NguonLuaChon, xoaToken: @escaping () -> Void,
              docBiMatOffline: (() -> String?)? = nil, luuBiMatOffline: ((String) -> Void)? = nil) {
    self.api = api; self.kho = kho; self.khien = khien; self.lich = lich; self.uyQuyen = uyQuyen; self.chon = chon; self.xoaToken = xoaToken
    self.docBiMatOffline = docBiMatOffline; self.luuBiMatOffline = luuBiMatOffline
  }

  func nhipGui(now: Date, nguon: String) -> NhipGui {
    let kh = kho.doc(KeHoach.self, Khoa.keHoach)
    let nk = kho.doc(NhatKyDung.self, Khoa.nhatKyDung)
    // phút tính sao = phút đo tại chỗ trừ phút lúc mở bằng mã
    let dung = kh.map { TinhKhien.phutDoTaiCho($0, now: now, dung: nk) - TinhKhien.phutBoiMa($0, now: now, dung: nk) } ?? 0
    let boiMa = kh.map { TinhKhien.phutBoiMa($0, now: now, dung: nk) - (nk?.boiMaDaGui ?? 0) } ?? 0
    let lan = kho.doc(Date.self, Khoa.lanDongBo)
    let sl = chon.dem()
    let uq = uyQuyen.trangThai
    return NhipGui(phienBan: Self.phienBan, clientTime: NgayISO.viet(now), appQuanLyBat: uq == "approved",
                   thanhPhan: .init(quyenQuanLy: uq == "approved", monitor: kh != nil), nguon: nguon,
                   matKetNoiPhut: lan.map { max(0, Int(now.timeIntervalSince($0) / 60)) },
                   ios: .init(soAppHoc: sl.hoc, soAppGiaiTri: sl.giaiTri, soAppChan: sl.chan,
                              soDanhMucGiaiTri: sl.danhMucGiaiTri, phutDaDung: dung, uyQuyen: uq),
                   maOfflineVan: docBiMatOffline?().map(MaOffline.van), phutBoiMa: boiMa > 0 ? boiMa : nil)
  }

  @discardableResult
  public func chay(now: Date = Date(), nguon: String = "bat") async throws -> KetQuaDongBo {
    // 06/11: đăng nhập / đăng xuất làm lúc mất mạng ⇒ báo máy chủ TRƯỚC nhip (nhip trả «ai đang dùng» đã đúng)
    let bm = docBiMatOffline
    await VaoMay(api: api, kho: kho, khoCho: khoCho, biMat: { bm?() }).phatLai(now: now)
    await guiXinChoMang()
    let nkGui = kho.doc(NhatKyDung.self, Khoa.nhatKyDung)
    let gui = nhipGui(now: now, nguon: nguon)
    let tra = try await api.nhip(gui)
    // đã báo phutBoiMa: ghi MỐC tổng đã gửi của đúng ngày bản đã gửi (đọc lại ngay trước khi ghi — extension Monitor có thể vừa ghi phút mới)
    if gui.phutBoiMa != nil, let nkGui, var nk = kho.doc(NhatKyDung.self, Khoa.nhatKyDung), nk.ngay == nkGui.ngay {
      nk.boiMaDaGui = max(nk.boiMaDaGui ?? 0, nkGui.boiMa ?? 0); kho.luu(nk, Khoa.nhatKyDung)
    }
    // Lệnh «go» (gỡ từ xa): thu hồi quyền, gỡ khiên + lịch, báo xong, quên token. iOS không cho app tự xoá ⇒ màn hướng dẫn xoá biểu tượng.
    if let go = tra.lenh.first(where: { $0.loai == "go" }) {
      lich.dungHet(); khien.goHet()
      await uyQuyen.thuHoi()
      try? await api.xongLenh(go.id)
      for k in [Khoa.keHoach, Khoa.nhatKyDung, Khoa.khienDangAp, Khoa.thongTinMay, Khoa.yeuCauDangCho, Khoa.moTamOffline, Khoa.suKienCho,
                Khoa.phienMay, Khoa.hoSoMay, Khoa.demSai, Khoa.viecChoMang, Khoa.xinChoMang] { kho.ghi(nil, k) }
      xoaToken()
      return .daGo
    }
    if let bm = tra.maOfflineBiMat, !bm.isEmpty { luuBiMatOffline?(bm) }
    // Có mạng lại ⇒ kết thúc lượt mở bằng mã offline (Ba Mẹ lại quyết bằng luật online) — như agent Windows KetThucKhiCoMang
    if var mt = kho.doc(MoTamOffline.self, Khoa.moTamOffline), let con = mt.ketThucKhiCoMang(now) {
      kho.luu(mt, Khoa.moTamOffline)
      kho.xepSuKien(SuKienMay(loai: "het_ma_offline", luc: now, chiTiet: ["ket_thuc": "co_mang", "conPhut": String(con)]))
    }
    ghiPhien(tra.nguoiDung, now: now)
    let truoc = kho.doc(KeHoach.self, Khoa.keHoach), nk = kho.doc(NhatKyDung.self, Khoa.nhatKyDung)
    let taiCho = truoc.map { TinhKhien.phutDoTaiCho($0, now: now, dung: nk) } ?? 0
    let boiMaNay = truoc.map { TinhKhien.phutBoiMa($0, now: now, dung: nk) } ?? 0
    var kh = LapKeHoach.tu(tra, now: now, truoc: truoc, taiCho: taiCho, boiMa: boiMaNay)
    let conCuoi = kho.doc(String.self, Khoa.conCuoi)
    if let id = tra.chinhSach.con?.id, conCuoi != nil, conCuoi != id { kh.daDungMayChu = nil; kh.ngayDaDung = nil }   // chính sách của bé khác (phản hồi cũ)
    if let den = kho.doc(PhienMay.self, Khoa.phienMay)?.baMeDen, den > now { kh.lich = LapKeHoach.themLich(kh.lich, LapKeHoach.lichMotLan("bame", den: den, now: now)) }
    if kh.sao == nil, kh.daDungMayChu != nil { kh.dungTaiChoLucDongBo = TinhKhien.phutDoTaiCho(kh, now: now, dung: kho.doc(NhatKyDung.self, Khoa.nhatKyDung)) }
    kho.luu(kh, Khoa.keHoach)
    kho.luu(now, Khoa.lanDongBo)
    try? lich.theoDoi(kh.lich)       // không theo dõi được (chưa có quyền) vẫn áp khiên tức thời
    apLucNay(kh, now: now)
    await capNhatYeuCau()
    await guiSuKienCho()
    return .xong(kh)
  }

  /// Ai đang dùng máy theo máy chủ. Máy RIÊNG của bé vừa «Đăng xuất» tại máy: máy chủ vẫn coi chủ máy đang dùng ⇒ giữ khoá tại máy
  /// tới khi bé nhập lại PIN (thiết kế: «Đăng xuất thì máy khoá lại. Vào lại bằng tên + PIN.»).
  func ghiPhien(_ n: NguoiDungMay?, now: Date) {
    let cu = kho.doc(PhienMay.self, Khoa.phienMay)
    // tại máy vừa đổi người SAU lúc gửi nhip, hoặc còn việc chờ phát lại ⇒ phản hồi này đã cũ, giữ trạng thái tại máy
    if let cu, cu.luc > now, cu.luc < now.addingTimeInterval(600) { return }    // (đồng hồ bị lùi xa ⇒ không đóng băng, theo máy chủ)
    if let v = (khoCho ?? kho).doc([ViecChoMang].self, Khoa.viecChoMang), !v.isEmpty { return }
    // Ba Mẹ mở bằng mã lúc mất mạng: máy chủ không biết ⇒ giữ tới hạn
    if let cu, cu.offline == true, cu.baMeDangDung(now), n?.loai != "ba_me" { return }
    guard let moi = PhienMay.tu(n, now: now) else {
      // máy chủ chưa có PIN theo bé (chưa deploy S3 / quay lui) ⇒ không giữ khoá «chưa ai vào» mà không ai mở được
      if cu?.loai == .chua { kho.ghi(nil, Khoa.phienMay) }
      return
    }
    let mayRieng = kho.doc(HoSoMay.self, Khoa.hoSoMay)?.mayRieng ?? (kho.doc(ThongTinMay.self, Khoa.thongTinMay).map { !$0.dungChung } ?? false)
    // máy riêng: máy chủ luôn báo chủ máy ⇒ khoá tại máy (đăng xuất / Ba Mẹ dùng đã hết) giữ tới khi bé nhập lại PIN
    if let cu, cu.khoa(now), moi.loai == .con, mayRieng { if cu.loai != .chua { kho.luu(PhienMay(loai: .chua, luc: now), Khoa.phienMay) }; return }
    VaoMay.luuPhien(moi, kho: kho)       // bé khác ⇒ phút đo tại máy + phút máy chủ của bé trước không tính
  }

  /// Lời xin vay sao / xin thêm app-web (#422, mang `kieu`) lưu lúc mất mạng ⇒ gửi khi có mạng.
  /// Lời xin cũ «thêm giờ» / «ngoại lệ» (bản trước 15/11) ⇒ BỎ, không tự thành khoản vay.
  public func guiXinChoMang(now: Date = Date()) async {
    guard let x = kho.doc(YeuCauDangCho.self, Khoa.xinChoMang) else { return }
    if x.laApp, let ten = x.ten {
      do {
        _ = try await xinMoApp(ten: ten, lyDo: x.loiNhan.isEmpty ? nil : x.loiNhan, kieu: x.kieu, now: now)
        kho.ghi(nil, Khoa.xinChoMang)
      } catch let e as LoiApi where e.tamThoi || e.ma == "chua_chon_con" {
      } catch { kho.ghi(nil, Khoa.xinChoMang) }
      return
    }
    guard x.loai == "vay_sao" else { kho.ghi(nil, Khoa.xinChoMang); return }
    do {
      let r = try await api.xinVay(soSao: x.phut, loiNhan: x.loiNhan)
      kho.luu(YeuCauDangCho(id: r.id, phut: x.phut, loiNhan: x.loiNhan, guiLuc: now, trangThai: r.tuDuyet ? "tu_duyet" : "cho", loai: "vay_sao"), Khoa.yeuCauDangCho)
      kho.ghi(nil, Khoa.xinChoMang)
    } catch let e as LoiApi where e.tamThoi || e.ma == "chua_chon_con" {
    } catch { kho.ghi(nil, Khoa.xinChoMang) }
  }

  /// Hạn mở bằng mã offline lúc `now` + ghi «giờ đã thấy» (chống lùi đồng hồ). Dùng chung app / extension Monitor.
  public static func hanMoOffline(_ kho: KhoGiaTri, _ now: Date) -> Date? {
    guard var mt = kho.doc(MoTamOffline.self, Khoa.moTamOffline) else { return nil }
    let den = mt.hanMo(now)
    if den != nil, mt.ghiThay(now) { kho.luu(mt, Khoa.moTamOffline) }
    return den
  }

  /// Gửi hàng chờ sự kiện (mở bằng mã offline, gõ sai nhiều lần…). Lỗi ⇒ giữ lại, gửi ở lượt sau.
  public func guiSuKienCho() async {
    guard let ds = kho.doc([SuKienMay].self, Khoa.suKienCho), !ds.isEmpty else { return }
    if (try? await api.guiSuKien(ds)) != nil {
      let con = (kho.doc([SuKienMay].self, Khoa.suKienCho) ?? []).filter { e in !ds.contains { $0.ma == e.ma } }
      kho.luu(con.isEmpty ? nil : con, Khoa.suKienCho)
    }
  }

  /// Con gõ mã mở offline Ba Mẹ đọc (máy mất mạng). Đúng ⇒ đặt lịch «mooffline» kết thúc đúng hạn + gỡ khiên ngay; ghi sự kiện.
  public func moBangMaOffline(_ ma: String, biMat: String?, now: Date = Date()) -> (KetQuaMoOffline, String) {
    var mt = kho.doc(MoTamOffline.self, Khoa.moTamOffline) ?? MoTamOffline()
    let kq = mt.thuMo(biMat: biMat, ma: ma, now: now)
    let cau = mt.cau(kq, now: now)
    kho.luu(mt, Khoa.moTamOffline)
    if kq == .daMo, let den = mt.moDen {
      kho.xepSuKien(SuKienMay(loai: "mo_ma_offline", luc: now, chiTiet: ["den": NgayISO.viet(den), "phut": String(mt.phutMo ?? MoTamOffline.phutMoMacDinh)]))
      if let kh = kho.doc(KeHoach.self, Khoa.keHoach) {
        try? lich.theoDoi(LapKeHoach.themLich(kh.lich, LapKeHoach.lichMotLan("mooffline", den: den, now: now)))
      }
      apLucNay(now: now)
    } else if kq == .sai, mt.saiLuc.count == MoTamOffline.saiToiDa {
      kho.xepSuKien(SuKienMay(loai: "sai_ma_offline", luc: now, chiTiet: ["lan": String(mt.saiLuc.count)]))
    }
    return (kq, cau)
  }

  /// Áp khiên đúng thời điểm từ kế hoạch đã lưu (app mở / extension nhận chuông lịch).
  @discardableResult
  public func apLucNay(_ kh: KeHoach? = nil, now: Date = Date()) -> KhienMuonCo? {
    guard let kh = kh ?? kho.doc(KeHoach.self, Khoa.keHoach) else { return nil }
    let k = TinhKhien.lucNay(kh, now: now, dung: kho.doc(NhatKyDung.self, Khoa.nhatKyDung), moOfflineDen: Self.hanMoOffline(kho, now),
                             phien: kho.doc(PhienMay.self, Khoa.phienMay))
    khien.ap(k)
    kho.luu(k, Khoa.khienDangAp)
    return k
  }

  public func capNhatYeuCau() async {
    guard var yc = kho.doc(YeuCauDangCho.self, Khoa.yeuCauDangCho), !yc.xong else { return }
    if let t = try? await api.trangThaiYeuCau(yc.id) {
      yc.trangThai = t.trangThai ?? t.status
      if t.ketQua == "cho" { yc.trangThai = "cho" }       // «Bỏ qua» trong 60 giây đầu (Ba Mẹ còn hoàn tác) ⇒ vẫn chờ
      yc.ketQua = t.ketQua; yc.nhom = t.nhom; yc.tenNguoiDuyet = t.tenNguoiDuyet; yc.loiNhanBaMe = t.loiNhan
      if yc.ten == nil { yc.ten = t.muc }
      kho.luu(yc, Khoa.yeuCauDangCho)
    }
  }

  /// 15/11 (#263): «Xin Ba Mẹ cho vay sao» (thay xin thêm giờ / ngoại lệ) — theo dõi trạng thái như mọi lời xin.
  public func xinVay(soSao: Int, loiNhan: String, mucDich: String? = nil, quaId: String? = nil, now: Date = Date()) async throws -> YeuCauDangCho {
    let r = try await api.xinVay(soSao: soSao, loiNhan: loiNhan, mucDich: mucDich, quaId: quaId)
    let yc = YeuCauDangCho(id: r.id, phut: soSao, loiNhan: loiNhan, guiLuc: now, trangThai: r.tuDuyet ? "tu_duyet" : "cho", loai: "vay_sao")
    kho.luu(yc, Khoa.yeuCauDangCho)
    return yc
  }

  /// «Xin Ba Mẹ mở <app>» (ngoài danh sách) — kết quả: đã thêm (Tính phút / Không tính phút) / mở tạm / chưa thêm.
  /// #422: `kieu` "app" | "web" (hộp «Xin thêm app / web»); nil = lời xin cũ ở màn chặn.
  public func xinMoApp(ten: String, lyDo: String?, kieu: String? = nil, now: Date = Date()) async throws -> YeuCauDangCho {
    let r = try await api.xinDuyet(ten: ten, lyDo: lyDo, kieu: kieu)
    let yc = YeuCauDangCho(id: r.id, phut: 0, loiNhan: lyDo ?? "", guiLuc: now, trangThai: r.tuDuyet ? "tu_duyet" : "cho", loai: "mo_app", ten: ten, kieu: kieu)
    kho.luu(yc, Khoa.yeuCauDangCho)
    return yc
  }
}
