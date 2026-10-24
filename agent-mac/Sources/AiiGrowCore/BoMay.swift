// «Bộ máy» của daemon: giữ cấu hình + Policy, đồng bộ máy chủ theo nextCheckSec, áp chính sách mỗi vòng 5 giây, trả lời tray qua IPC.
// Mọi tác động hệ thống đi qua HeThong; mọi lời gọi máy chủ đi qua MayChuApi ⇒ test chạy trọn trong tiến trình với bản giả.
// Tinh thần như agent-win AgentRuntime: máy chủ quyết định, tác tử chỉ thực thi; mặc định GIÁM SÁT (chỉ ghi việc sẽ làm).
import Foundation

public struct TuyChonBoMay: Sendable {
  public var duongDanHosts: String
  public var thuMucChinhSach: String
  /// Số giây mỗi vòng áp chính sách (THIET-KE.md mục 3: 5 giây).
  public var vongGiay: Double
  /// Đếm ngược (giây) trước khi đóng phiên Con khi mode «khoa» — tray hiện màn đếm ngược trong lúc này.
  public var demNguocKhoaGiay: Int
  /// Chỉ test: kiểm app tiền cảnh ngay trong vòng thay vì ở hàng đợi nền.
  public var tienCanhDongBo: Bool
  public init(duongDanHosts: String = "/etc/hosts", thuMucChinhSach: String = ChinhSachTrinhDuyet.thuMuc,
              vongGiay: Double = 5, demNguocKhoaGiay: Int = 30, tienCanhDongBo: Bool = false) {
    self.duongDanHosts = duongDanHosts; self.thuMucChinhSach = thuMucChinhSach
    self.vongGiay = vongGiay; self.demNguocKhoaGiay = demNguocKhoaGiay; self.tienCanhDongBo = tienCanhDongBo
  }
}

public actor BoMay {
  private let api: MayChuApi
  private let heThong: HeThong
  private let kho: ConfigStore
  private let tuyChon: TuyChonBoMay
  private let dongHo: () -> Date
  /// Đồng hồ đơn điệu (giây) để đo thời gian trôi — chỉnh giờ máy không ăn gian được.
  private let donDieu: () -> Double

  private var cauHinh: CauHinhMay
  private var policy: Policy?
  /// Thời điểm (đơn điệu) phải đồng bộ lại.
  private var syncLuc: Double = 0
  private var matMang = false
  private var dangGhep = false
  private var trayNhipCuoi: Double = -1_000_000
  /// Mốc đơn điệu lần áp gần nhất (để cộng giờ đã dùng + đếm giây mục app).
  private var apTruoc: Double
  private let demTienCanh: DemTienCanh
  /// Đang đếm ngược khoá: còn mấy giây.
  private var demNguocConLai: Int?
  private var daApHosts: String?

  public init(api: MayChuApi, heThong: HeThong, kho: ConfigStore, tuyChon: TuyChonBoMay = TuyChonBoMay(),
              dongHo: @escaping () -> Date = Date.init, donDieu: @escaping () -> Double = { Double(DispatchTime.now().uptimeNanoseconds) / 1e9 }) {
    self.api = api; self.heThong = heThong; self.kho = kho; self.tuyChon = tuyChon
    self.dongHo = dongHo; self.donDieu = donDieu
    self.cauHinh = kho.doc() ?? CauHinhMay()
    self.policy = cauHinh.policyCuoi
    if cauHinh.daGhep { api.datPhien(mayChu: cauHinh.mayChu, token: cauHinh.token) }     // token/máy chủ từ cấu hình đĩa (bản giả/daemon khởi tạo thiếu cũng đúng)
    self.apTruoc = donDieu()
    self.demTienCanh = DemTienCanh(dongBo: tuyChon.tienCanhDongBo) { [heThong] uid in heThong.appTienCanh(cuaUid: uid) }
    if let u = cauHinh.uidCon { _ = demTienCanh.doc(uid: u, gio: apTruoc) }      // kích kiểm nền ngay khi daemon chạy ⇒ tick đầu có dữ liệu sớm
  }

  public var daGhep: Bool { cauHinh.daGhep }
  /// Tài khoản Con còn quyền admin (ghép chưa hạ được / ai đó nâng lại) — gửi lên máy chủ + hiện ở tray.
  public private(set) var conLaAdmin = false

  // MARK: ghép máy

  /// Ghép máy lần đầu (lệnh IPC `ghep`, uid admin). Gọi máy chủ pair, lưu token + uid Con, hạ Con về Standard nếu đang admin (phải còn admin khác).
  public func ghep(ma: String, taiKhoanCon: String) async throws {
    guard !cauHinh.daGhep else { throw LoiApi(ma: "da_ghep", chu: "Máy này đã được ghép rồi.") }
    guard !dangGhep else { throw LoiApi(ma: "dang_ghep", chu: "Đang ghép máy, vui lòng chờ.") }
    dangGhep = true                                   // đặt TRƯỚC await đầu tiên: actor reentrancy không cho gọi server hai lần
    defer { dangGhep = false }
    let tk = taiKhoanCon.trimmingCharacters(in: .whitespaces)
    guard let uidCon = heThong.uid(cuaTaiKhoan: tk) else { throw LoiApi(ma: "khong_thay_con", chu: "Không thấy tài khoản «\(tk)» trên máy.") }
    // Kiểm cục bộ TRƯỚC khi gọi máy chủ (lỗi cục bộ không để lại máy «ma» + mất mã ghép). Phải còn một admin KHÁC (không tự khoá Ba Mẹ ra ngoài).
    let canHa = heThong.laAdmin(uid: uidCon)
    if canHa {
      let conLai = heThong.dsAdmin().filter { $0.lowercased() != tk.lowercased() && $0.lowercased() != "root" }
      guard !conLai.isEmpty else { throw LoiApi(ma: "con_mot_admin", chu: "Cần còn một tài khoản quản trị khác trước khi hạ quyền tài khoản của Con.") }
    }
    let kq = try await api.ghep(ma: ma, tenMay: heThong.tenMay())
    // Lưu token NGAY (mã ghép đã bị dùng): hạ quyền lỗi sau đó vẫn là máy đã ghép, chỉ cảnh báo.
    let cu = cauHinh.daHaQuyen
    try kho.sua {
      $0.mayChu = kq.server ?? api_mayChu
      $0.deviceId = kq.deviceId
      $0.token = kq.token
      $0.tenCon = kq.childName.isEmpty ? tk : kq.childName
      $0.taiKhoanCon = tk
      $0.uidCon = uidCon
      $0.daHaQuyen = cu                                // hợp với danh sách cũ (ghép lại sau gỡ từ xa không làm mất tài khoản cần trả quyền)
    }
    cauHinh = kho.doc() ?? cauHinh
    api.datPhien(mayChu: cauHinh.mayChu, token: cauHinh.token)       // dong-bo kế tiếp mang token mới, không cần khởi động lại daemon
    heThong.ghiLog("Đã ghép máy: deviceId=\(kq.deviceId) con=\(tk) uid=\(uidCon)")
    conLaAdmin = canHa                                  // chỉ thành false khi hạ quyền xong
    if canHa {
      // Ghi daHaQuyen TRƯỚC khi hạ: ghi lỗi thì KHÔNG hạ (hạ rồi mà không nhớ ⇒ gỡ máy không trả lại được quyền admin cho Ba Mẹ).
      let daCo = cu.contains(tk)
      do { try kho.sua { if !$0.daHaQuyen.contains(tk) { $0.daHaQuyen.append(tk) } } }
      catch {
        heThong.ghiLog("CẢNH BÁO: không ghi được cấu hình (\(error)) nên KHÔNG hạ quyền admin của «\(tk)» — Ba Mẹ hạ tay trong Cài đặt hệ thống.")
        return
      }
      cauHinh = kho.doc() ?? cauHinh
      do {
        try heThong.haQuyenAdmin(taiKhoan: tk)
        conLaAdmin = false
      } catch {
        heThong.ghiLog("CẢNH BÁO: đã ghép nhưng chưa hạ được quyền admin của «\(tk)»: \(error) — Ba Mẹ hạ tay trong Cài đặt hệ thống.")
        if !daCo { _ = try? kho.sua { $0.daHaQuyen.removeAll { $0 == tk } }; cauHinh = kho.doc() ?? cauHinh }   // vẫn là admin ⇒ không cần trả
      }
    }
  }

  /// Câu cảnh báo cho Ba Mẹ khi tài khoản của Con vẫn còn quyền admin (nil = ổn).
  public var canhBaoAdmin: String? {
    guard conLaAdmin else { return nil }
    let tk = cauHinh.taiKhoanCon
    return "Chưa hạ được quyền admin của «\(tk)» — Con vẫn có thể tắt bảo vệ. Ba Mẹ vào Cài đặt hệ thống > Người dùng & Nhóm, tắt «Cho phép người dùng này quản trị máy tính»."
  }

  private var api_mayChu: String { (api as? ApiClient)?.mayChu ?? cauHinh.mayChu }

  // MARK: vòng chạy

  /// Một vòng (gọi mỗi `vongGiay`): đồng bộ nếu tới hạn, rồi áp chính sách. → trạng thái cho tray.
  @discardableResult
  public func motVong() async -> TrangThai {
    guard cauHinh.daGhep else { return trangThaiChuaGhep() }
    let gio = donDieu()
    if gio >= syncLuc { await dongBo() }
    return apChinhSach()                 // đã gỡ từ xa trong dongBo ⇒ apChinhSach tự trả «chưa ghép», không áp gì
  }

  private func trangThaiChuaGhep() -> TrangThai {
    let phien = heThong.phienConsole()
    return TrangThai(daGhep: false, laPhienCon: false, tenCon: nil, cheDo: .tuDo, lyDoKhoa: nil, conPhut: nil,
                     moDen: nil, khoaDen: nil, demNguocGiay: nil, yeuCauCho: [], duocDoiDiem: false,
                     matMang: false, trangChan: phien == nil ? [] : [])
  }

  private func dongBo() async {
    let con = conDangDung()
    if let u = cauHinh.uidCon { conLaAdmin = heThong.laAdmin(uid: u) }       // đọc lại mỗi lần đồng bộ: ai nâng Con lên admin cũng bị báo
    var st = TrangThaiAgent(mode: policy?.mode ?? CheDo.tuDo.rawValue,
                            trayAlive: trayDangSong(), childSessionActive: con != nil,
                            offline: matMang, cheDo: cheDoHieuLuc(), phienKhac: laPhienKhac())
    if conLaAdmin { st.conLaAdmin = true; st.quyen["haQuyenAdmin"] = false }   // quyen[…]=false ⇒ chiTietBaoVe của máy chủ liệt vào «còn thiếu» (mức Một phần)
    DemPhut.don(&cauHinh.demPhut)
    let dung = DemPhut.tong(cauHinh.demPhut)
    do {
      let kq = try await api.dongBo(trangThai: st, dung: dung, luc: dongHo())
      policy = kq.policy
      matMang = false
      syncLuc = donDieu() + Double(kq.nextCheckSec)
      _ = try? kho.sua {
        $0.policyCuoi = kq.policy
        $0.policyLuc = self.dongHo()
        $0.daDungGiayTuSync = 0
        $0.lienLacCuoi = self.dongHo()
      }
      cauHinh.policyCuoi = kq.policy
      cauHinh.policyLuc = dongHo()
      cauHinh.daDungGiayTuSync = 0
      for l in kq.lenh where l.loai == "go" { await tuGo(lenhId: l.id) }
    } catch let e as LoiApi {
      matMang = e.laMang
      syncLuc = donDieu() + Double(policy?.nextCheckSec ?? 60)
      if e.laTokenSai { heThong.ghiLog("Máy chủ báo token sai — có thể đã bị gỡ khỏi gia đình.") }
      else { heThong.ghiLog("Đồng bộ lỗi (\(e.chu)) — chạy theo Policy nhớ.") }
    } catch {
      matMang = true
      syncLuc = donDieu() + Double(policy?.nextCheckSec ?? 60)
    }
  }

  /// Áp Policy hiện có lên giờ hiện tại; cộng giờ đã dùng theo đồng hồ đơn điệu. → trạng thái cho tray.
  @discardableResult
  public func apChinhSach() -> TrangThai {
    guard cauHinh.daGhep else { return trangThaiChuaGhep() }       // chưa ghép / đã bị gỡ từ xa: thả hoàn toàn
    let now = dongHo()
    let phien = heThong.phienConsole()
    let laCon = phien?.uid == cauHinh.uidCon
    let manKhoa = phien?.manKhoa ?? true

    // Cộng giờ đã dùng + đếm phút theo app — chỉ khi Con là console user và màn không khoá (THIET-KE.md mục 5).
    let gio = donDieu()
    let troi = max(0, min(gio - apTruoc, tuyChon.vongGiay * 4))     // trần mỗi vòng: ngủ/treo không dồn một cục
    apTruoc = gio
    if laCon, !manKhoa {
      cauHinh.daDungGiayTuSync += troi
      demGiayApp(troi: troi, now: now)
      _ = try? kho.sua { $0.daDungGiayTuSync = self.cauHinh.daDungGiayTuSync; $0.demPhut = self.cauHinh.demPhut }
    }

    guard let p = policy else {
      return trangThai(p: nil, hl: nil, laCon: laCon, phutDung: nil)
    }
    let hl = DanhGiaPolicy.tinh(p, now: now, daDungGiay: cauHinh.daDungGiayTuSync)
    let chan = cheDoHieuLuc() == CheDoAgent.chan

    // App: đóng app ngoài danh sách của phiên Con (chỉ khi chặn thật + chỉ-app-học).
    if let uidCon = cauHinh.uidCon, laCon, chan {
      let ds = heThong.tienTrinh(cuaUid: uidCon)
      let choPhep = p.allowedApps + Array(QuyetDinhApp.heThong)
      for t in QuyetDinhApp.canDong(ds, uidCon: uidCon, chiAppHoc: hl.chiAppHoc, choPhep: choPhep) {
        dongApp(t)
      }
    }

    // Web: plist chính sách trình duyệt (theo tài khoản Con) + khối hosts cho Safari. Giám sát ⇒ gỡ hết.
    apWeb(p: p, now: now, chan: chan, laCon: laCon, manKhoa: manKhoa)

    // Khoá: đếm ngược rồi đóng phiên Con.
    var demNguoc: Int? = nil
    if hl.khoa, let uidCon = cauHinh.uidCon, laCon, !manKhoa {
      demNguoc = tienKhoa(uidCon: uidCon, chan: chan)
    } else {
      demNguocConLai = nil
    }
    return trangThai(p: p, hl: hl, laCon: laCon, phutDung: hl.conPhut, demNguoc: demNguoc)
  }

  private func demGiayApp(troi: Double, now: Date) {
    let ngay = DemPhut.ngay(now)
    // App tiền cảnh do DAEMON tự kiểm (lsappinfo trong phiên Con, đệm theo uid, chạy ngoài actor) — không phụ thuộc tray sống hay chết.
    // Không kiểm được (lsappinfo lỗi/quá hạn/đệm quá cũ) ⇒ tính dưới «Không rõ»; giờ vẫn trừ.
    let that = cauHinh.uidCon.flatMap { demTienCanh.doc(uid: $0, gio: donDieu()) }
    let app = TienCanh.chon(thatSu: that)
    DemPhut.cong(&cauHinh.demPhut, ngay: ngay, app: app, giay: troi)
  }


  // MARK: web

  private func apWeb(p: Policy, now: Date, chan: Bool, laCon: Bool, manKhoa: Bool) {
    // hosts áp cho cả máy ⇒ chỉ đặt khi Con đang ở màn hình, gỡ khi không phải Con (để Ba Mẹ không bị chặn).
    let web = chan ? (p.web ?? ChinhSachWeb()).hetMo(now, moDen: p.grantEndsAt) : nil
    let dungHosts = chan && laCon && !manKhoa
    apHosts(web: dungHosts ? web : nil)
    apChinhSachTrinhDuyet(web: chan ? web : nil)
  }

  private func apHosts(web: ChinhSachWeb?) {
    // hosts chỉ chặn được theo danh mục «chặn» (không làm được «chỉ cho phép»); chế độ đó Safari dựa vào chặn app.
    let tenMien = web.map { $0.cheDo == ChinhSachWeb.chiChoPhep ? [] : $0.chan } ?? []
    let goc = String(decoding: heThong.docTep(tuyChon.duongDanHosts) ?? Data(), as: UTF8.self)
    let moi = KhoiHosts.ap(goc, tenMien: tenMien)
    guard moi != goc else { return }
    do {
      try heThong.ghiTep(tuyChon.duongDanHosts, Data(moi.utf8), quyen: 0o644)
      heThong.xoaBoNhoDNS()
      daApHosts = moi
    } catch { heThong.ghiLog("Ghi hosts lỗi: \(error)") }
  }

  private func apChinhSachTrinhDuyet(web: ChinhSachWeb?) {
    guard let tk = cauHinh.uidCon.flatMap({ heThong.taiKhoan(cuaUid: $0) }) ?? (cauHinh.taiKhoanCon.isEmpty ? nil : cauHinh.taiKhoanCon) else { return }
    apChinhSachTrinhDuyet(taiKhoan: tk, web: web)
  }

  private func apChinhSachTrinhDuyet(taiKhoan tk: String, web: ChinhSachWeb?) {
    let host = URL(string: cauHinh.mayChu)?.host
    for td in ChinhSachTrinhDuyet.tatCa {
      let duong = ChinhSachTrinhDuyet.duongDan(td, taiKhoan: tk, thuMucGoc: tuyChon.thuMucChinhSach)
      let cu = ChinhSachTrinhDuyet.giaiMa(heThong.docTep(duong))
      guard let moi = ChinhSachTrinhDuyet.gop(cu: cu, trinhDuyet: td, p: web, mayChuHost: host) else {
        if cu != nil { heThong.xoaTep(duong) }
        continue
      }
      // Bỏ qua ghi CHỈ khi tệp thật trên đĩa đang đúng nội dung mong muốn (tệp mất hoặc bị sửa ⇒ ghi lại).
      if let cu, NSDictionary(dictionary: cu).isEqual(to: moi) { continue }
      guard let data = try? ChinhSachTrinhDuyet.maHoa(moi) else { continue }
      do { try heThong.ghiTep(duong, data, quyen: 0o644) }
      catch { heThong.ghiLog("Ghi chính sách \(td.ten) lỗi: \(error)") }
    }
  }

  // MARK: khoá + đóng app

  private func tienKhoa(uidCon: UInt32, chan: Bool) -> Int {
    let conLai = (demNguocConLai ?? tuyChon.demNguocKhoaGiay) - Int(tuyChon.vongGiay)
    if conLai > 0 { demNguocConLai = conLai; return conLai }
    demNguocConLai = 0
    if chan {
      do { try heThong.dongPhien(uid: uidCon); heThong.ghiLog("Đã đóng phiên của Con (hết đếm ngược khoá).") }
      catch { heThong.ghiLog("Đóng phiên lỗi: \(error)") }
    } else {
      heThong.ghiLog("[giám sát] sẽ đóng phiên của Con (uid \(uidCon)).")
    }
    return 0
  }

  /// SIGTERM, lần áp sau nếu còn sống thì SIGKILL (ghi dấu để không chờ 3 giây trong một vòng).
  private var daGuiTerm: Set<Int32> = []
  private func dongApp(_ t: TienTrinh) {
    if daGuiTerm.contains(t.pid), heThong.conSong(pid: t.pid) {
      heThong.guiTinHieu(pid: t.pid, tinHieu: SIGKILL)
      daGuiTerm.remove(t.pid)
      heThong.ghiLog("Đóng (SIGKILL) \(t.bundleId ?? t.duongDan) pid \(t.pid)")
    } else {
      heThong.guiTinHieu(pid: t.pid, tinHieu: SIGTERM)
      daGuiTerm.insert(t.pid)
      heThong.ghiLog("Đóng (SIGTERM) \(t.bundleId ?? t.duongDan) pid \(t.pid)")
    }
  }

  // MARK: lệnh IPC từ tray

  /// Xử lý một yêu cầu tray — gọi từ socket sau khi đã lấy uid người gọi bằng getpeereid.
  public func xuLyIPC(_ yc: YeuCauTray, uidGoi: UInt32) async -> TraLoi {
    let quyen = QuyenIPC.kiem(yc, uidGoi: uidGoi, uidCon: cauHinh.uidCon, daGhep: cauHinh.daGhep, laAdmin: heThong.laAdmin)
    if case let .tuChoi(ma, chu) = quyen { return .loi(ma: ma, chu: chu) }
    switch yc {
    case .trangThai:
      if uidGoi == cauHinh.uidCon { trayNhipCuoi = donDieu() }     // tray hỏi trạng thái mỗi 5 giây = nhịp «còn sống»
      return .trangThai(apChinhSach())
    case .ping, .appTienCanh:
      trayNhipCuoi = donDieu()
      return .ok(id: nil)
    case let .xinThem(phut, loiNhan):
      return await taoYeuCau(loai: "them_gio", phut: phut, giaTri: nil, lyDo: loiNhan ?? "Con xin thêm giờ")
    case let .xinMo(muc, loai, loiNhan):
      return await taoYeuCau(loai: loai == "web" ? "mo_web" : "cai_app", phut: nil, giaTri: muc, lyDo: loiNhan ?? "Con xin mở \(muc)")
    case let .ghep(ma, taiKhoanCon):
      do {
        try await ghep(ma: ma, taiKhoanCon: taiKhoanCon)
        if let cb = canhBaoAdmin { return .canhBao(id: cauHinh.deviceId, chu: cb) }
        return .ok(id: cauHinh.deviceId)
      }
      catch let e as LoiApi { return .loi(ma: e.ma ?? "ghep_loi", chu: e.chu) }
      catch { return .loi(ma: "ghep_loi", chu: "\(error)") }
    }
  }

  private func taoYeuCau(loai: String, phut: Int?, giaTri: String?, lyDo: String) async -> TraLoi {
    do {
      let r = try await api.taoYeuCau(loai: loai, phut: phut, giaTri: giaTri, lyDo: lyDo)
      syncLuc = min(syncLuc, donDieu() + 5)     // đồng bộ sớm để quyết định của Ba Mẹ tới nhanh
      return .ok(id: r.id)
    } catch let e as LoiApi { return .loi(ma: e.ma ?? "yeu_cau_loi", chu: e.chu) }
    catch { return .loi(ma: "yeu_cau_loi", chu: "\(error)") }
  }

  // MARK: phụ

  private func tuGo(lenhId: String) async {
    // Lệnh gỡ từ xa: trả quyền admin đã hạ, xoá chính sách web + hosts, xoá cấu hình. KHÔNG tự bootout launchd (gói cài lo).
    apChinhSachTrinhDuyet(web: nil)
    // Mọi thư mục tài khoản trong Managed Preferences (không chỉ Con): gỡ khoá của AiiGrow khỏi plist trình duyệt của ta.
    for tk in heThong.lietKeThuMuc(tuyChon.thuMucChinhSach) { apChinhSachTrinhDuyet(taiKhoan: tk, web: nil) }
    apHosts(web: nil)
    for tk in cauHinh.daHaQuyen { heThong.ghiLog("[gỡ] trả lại quyền admin cho \(tk) do go-cai.sh thực hiện.") }
    // Báo máy chủ «đã gỡ xong» TRƯỚC khi xoá token (sau đó token không còn dùng được). Lỗi mạng thì bỏ qua — máy chủ chờ tối đa 7 ngày rồi cho xoá hẳn.
    do { try await api.baoXongLenh(id: lenhId) } catch { heThong.ghiLog("Không báo được «xong lệnh gỡ» (\(error)) — vẫn gỡ tại máy.") }
    // Thả hoàn toàn: xoá token + Policy (cả trong bộ nhớ lẫn đĩa) ⇒ các vòng sau coi như chưa ghép, không áp lại plist/hosts/đóng app.
    _ = try? kho.sua { $0.token = ""; $0.policyCuoi = nil; $0.policyLuc = nil; $0.daDungGiayTuSync = 0 }
    cauHinh = kho.doc() ?? { var c = cauHinh; c.token = ""; c.policyCuoi = nil; return c }()
    api.datPhien(mayChu: cauHinh.mayChu, token: "")
    policy = nil
    demNguocConLai = nil
    heThong.ghiLog("Nhận lệnh gỡ từ xa — gỡ chính sách, đã thả hoàn toàn; chạy trình gỡ.")
    heThong.chayTrinhGo()                           // go-cai.sh: trả quyền admin, dọn plist/hosts, gỡ daemon + tray + app (không để daemon/tray mồ côi)
  }

  private func conDangDung() -> UInt32? {
    guard let phien = heThong.phienConsole(), phien.uid == cauHinh.uidCon, !phien.manKhoa else { return nil }
    return phien.uid
  }
  private func trayDangSong() -> Bool { donDieu() - trayNhipCuoi <= 20 }
  private func laPhienKhac() -> Bool {
    guard let phien = heThong.phienConsole(), let uidCon = cauHinh.uidCon else { return false }
    return phien.uid != uidCon && phien.uid >= 500
  }
  private func cheDoHieuLuc() -> String {
    // Chế độ Ba Mẹ chọn (Policy.cheDo) thắng chế độ cục bộ; chưa chọn ⇒ giữ cục bộ.
    CheDoAgent.chuan(policy?.cheDo) ?? cauHinh.cheDo
  }

  private func trangThai(p: Policy?, hl: PolicyHieuLuc?, laCon: Bool, phutDung: Double?, demNguoc: Int? = nil) -> TrangThai {
    let che = CheDo(rawValue: p?.mode ?? CheDo.tuDo.rawValue) ?? .tuDo
    let chan = (p?.web ?? ChinhSachWeb()).chan
    return TrangThai(
      daGhep: cauHinh.daGhep, laPhienCon: laCon, tenCon: cauHinh.tenCon.isEmpty ? nil : cauHinh.tenCon,
      cheDo: che, lyDoKhoa: LyDoKhoa.choTray(hl?.lyDoKhoa),
      conPhut: phutDung.map { Int($0.rounded(.down)) },
      moDen: hl?.moDen, khoaDen: nil, demNguocGiay: demNguoc,
      yeuCauCho: [], duocDoiDiem: p?.canExchangePoints ?? false,
      matMang: matMang, trangChan: cheDoHieuLuc() == CheDoAgent.chan ? chan : [], canhBaoAdmin: laCon ? nil : canhBaoAdmin)
  }
}
