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
  /// false = chế độ thử (--thu): không tự cập nhật, kể cả khi Ba Mẹ bấm nút.
  public var tuCapNhat: Bool
  public init(duongDanHosts: String = "/etc/hosts", thuMucChinhSach: String = ChinhSachTrinhDuyet.thuMuc,
              vongGiay: Double = 5, demNguocKhoaGiay: Int = 30, tienCanhDongBo: Bool = false, tuCapNhat: Bool = true) {
    self.duongDanHosts = duongDanHosts; self.thuMucChinhSach = thuMucChinhSach
    self.vongGiay = vongGiay; self.demNguocKhoaGiay = demNguocKhoaGiay; self.tienCanhDongBo = tienCanhDongBo; self.tuCapNhat = tuCapNhat
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
  private let capNhat: BoCapNhat
  private var policy: Policy?
  /// Thời điểm (đơn điệu) phải đồng bộ lại.
  private var syncLuc: Double = 0
  private var matMang = false
  private var dangGhep = false
  private var dangDongBo = false
  /// Mốc đồng bộ sớm xin lúc đang đồng bộ dở (taoYeuCau) — dongBo xong sẽ ghi đè syncLuc nên áp lại sau.
  private var syncSom: Double?
  /// Đang gỡ từ xa (tuGo đang await báo xong): vòng áp không được áp lại plist/hosts/đóng app.
  private var dangGo = false
  private var trayNhipCuoi: Double = -1_000_000
  /// Mốc đơn điệu lần áp gần nhất (để cộng giờ đã dùng + đếm giây mục app).
  private var apTruoc: Double
  private let demTienCanh: DemTienCanh
  /// HẠN CHÓT (đồng hồ đơn điệu) đóng phiên Con khi đang khoá; nil = không đang đếm. Còn lại = max(0, khoaLuc − donDieu()) tính tại lúc hỏi.
  private var khoaLuc: Double?
  private var daApHosts: String?
  /// Lượt đồng bộ gần nhất lỗi (mọi loại) ⇒ vòng áp cộng thời gian chạy vào CauHinhMay.matLienLacChayGiay (MoCoi.swift).
  private var dongBoLoi = false
  /// Đã ghi log «mồ côi — thôi chặn» (ghi một lần mỗi lần vào/ra trạng thái).
  private var daBaoMoCoi = false
  /// Tăng mỗi lần ghép — lượt đồng bộ mang token cũ về muộn thì bỏ kết quả.
  private var theHeGhep = 0

  public init(api: MayChuApi, heThong: HeThong, kho: ConfigStore, tuyChon: TuyChonBoMay = TuyChonBoMay(),
              dongHo: @escaping () -> Date = Date.init, donDieu: @escaping () -> Double = { Double(DispatchTime.now().uptimeNanoseconds) / 1e9 },
              capNhat: BoCapNhat? = nil, nguonApp: NguonApp? = nil, boDemLog: BoDemLog? = nil, docLichSuWeb: Bool = false) {
    self.nguonApp = nguonApp
    self.boDemLog = boDemLog
    self.docLichSuWeb = docLichSuWeb
    self.capNhat = capNhat ?? BoCapNhat(api: api, heThong: heThong, mayChu: { [kho] in (api as? ApiClient)?.mayChu ?? kho.doc()?.mayChu ?? ApiClient.mayChuMacDinh },
                                               dongHo: dongHo)
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
  /// Máy chủ từ chối token ≥ 6 giờ (máy đã bị xoá khỏi gia đình) ⇒ coi như CHƯA ghép với tray / lệnh ghép: Ba Mẹ ghép lại bằng mã 6 số
  /// mà không phải gỡ + cài lại (agent-win: 401 ⇒ khay báo cần ghép lại).
  private var daGhepHieuLuc: Bool { cauHinh.daGhep && !MoCoi.tuChoiLau(cauHinh, now: dongHo()) }
  /// Tài khoản Con còn quyền admin (ghép chưa hạ được / ai đó nâng lại) — gửi lên máy chủ + hiện ở tray.
  public private(set) var conLaAdmin = false

  // MARK: ghép máy

  /// Ghép máy lần đầu (lệnh IPC `ghep`, uid admin). Gọi máy chủ pair, lưu token + uid Con, hạ Con về Standard nếu đang admin (phải còn admin khác).
  public func ghep(ma: String, taiKhoanCon: String) async throws {
    guard !daGhepHieuLuc else { throw LoiApi(ma: "da_ghep", chu: "Máy này đã được ghép rồi.") }
    guard !dangGhep else { throw LoiApi(ma: "dang_ghep", chu: "Đang ghép máy, vui lòng chờ.") }
    dangGhep = true                                   // đặt TRƯỚC await đầu tiên: actor reentrancy không cho gọi server hai lần
    defer { dangGhep = false }
    // go-cai.sh còn chạy (đang chờ job cập nhật, tới 5 phút): ghép lúc này sẽ xoá dấu da-go mà postinstall dựa vào, rồi go-cai vẫn gỡ app.
    let ht = heThong
    guard await !chayNgoaiActor({ ht.trinhGoDangChay() }) else { throw LoiApi(ma: "dang_go", chu: "Máy đang được gỡ AiiGrow; chờ gỡ xong rồi cài lại và ghép.") }
    let tk = taiKhoanCon.trimmingCharacters(in: .whitespaces)
    guard let uidCon = heThong.uid(cuaTaiKhoan: tk) else { throw LoiApi(ma: "khong_thay_con", chu: "Không thấy tài khoản «\(tk)» trên máy.") }
    // Kiểm cục bộ TRƯỚC khi gọi máy chủ (lỗi cục bộ không để lại máy «ma» + mất mã ghép). Phải còn một admin KHÁC (không tự khoá Ba Mẹ ra ngoài).
    let canHa = await chayNgoaiActor { ht.laAdmin(uid: uidCon) }
    if canHa {
      let conLai = await chayNgoaiActor { ht.dsAdmin() }.filter { $0.lowercased() != tk.lowercased() && $0.lowercased() != "root" }
      guard !conLai.isEmpty else { throw LoiApi(ma: "con_mot_admin", chu: "Cần còn một tài khoản quản trị khác trước khi hạ quyền tài khoản của Con.") }
    }
    let kq: KetQuaGhep
    let ma6 = ma.trimmingCharacters(in: .whitespaces)
    if ma6.isEmpty, let tok = tokenGoi() {           // ghép một chạm: token trong tên gói cài (postinstall lưu)
      do { kq = try await api.ghepGoi(token: tok, tenMay: heThong.tenMay()) }
      catch let e as LoiApi {
        if LoiApi.maTokenGoiHong.contains(e.ma ?? "") { heThong.xoaTep(DuongDan.tokenGoi); tokenGoiNho = nil }   // hỏng hẳn ⇒ quay về mã 6 số
        throw e
      }
    } else {
      guard !ma6.isEmpty else { throw LoiApi(ma: "thieu_ma", chu: "Nhập mã 6 số lấy ở app AiiGrow Ba Mẹ.") }
      kq = try await api.ghep(ma: ma6, tenMay: heThong.tenMay())
    }
    // Lưu token NGAY (mã ghép đã bị dùng): hạ quyền lỗi sau đó vẫn là máy đã ghép, chỉ cảnh báo.
    let cu = cauHinh.daHaQuyen
    let ghepLai = cauHinh.daGhep                       // máy mồ côi (token bị từ chối) được ghép lại
    try kho.sua {
      $0.mayChu = kq.server ?? api_mayChu
      $0.deviceId = kq.deviceId
      $0.token = kq.token
      $0.tenCon = kq.childName.isEmpty ? tk : kq.childName
      $0.taiKhoanCon = tk
      $0.uidCon = uidCon
      $0.daHaQuyen = cu                                // hợp với danh sách cũ (ghép lại sau gỡ từ xa không làm mất tài khoản cần trả quyền)
      MoCoi.ghiThanhCong(&$0, now: self.dongHo())       // ghép lại máy mồ côi: hết mồ côi, Policy cũ bỏ (chờ dong-bo của lần ghép mới)
      if ghepLai {                                      // dữ liệu của gia đình cũ không mang sang lần ghép mới
        $0.policyCuoi = nil; $0.policyLuc = nil; $0.daDungGiayTuSync = 0
        $0.phienBu = nil; $0.moTamOffline = nil; $0.demPhut = [:]
      }
    }
    heThong.xoaTep(DuongDan.tokenGoi); tokenGoiNho = nil   // chỉ xoá token gói SAU khi đã lưu được token máy (ghi lỗi thì còn token để biết)
    cauHinh = kho.doc() ?? cauHinh
    api.datPhien(mayChu: cauHinh.mayChu, token: cauHinh.token)       // TRƯỚC await kế: lượt đồng bộ chen vào mang token mới
    theHeGhep += 1
    if ghepLai { policy = nil; khoaLuc = nil; dongBoLoi = false; syncLuc = 0; choiNho = [:] }
    quenDanhSachApp()                                   // máy mới trên máy chủ ⇒ quét + gửi đủ ngay ở lần đồng bộ đầu
    // ghép lại sau khi gỡ: bỏ dấu «máy đã gỡ» để tự cập nhật chạy lại (không cần khởi động lại daemon) — trừ khi go-cai.sh vừa chạy trong lúc chờ máy chủ
    if await !chayNgoaiActor({ ht.trinhGoDangChay() }) { heThong.xoaTep(DuongDan.daGo) }
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
    return "Tài khoản «\(tk)» của Con đang là quản trị (admin). Cách xử lý: Cài đặt hệ thống › Người dùng & Nhóm › chọn tài khoản của Con › tắt \"Cho phép người dùng quản trị máy tính này\" (cần một tài khoản quản trị khác)."
  }

  private var api_mayChu: String { (api as? ApiClient)?.mayChu ?? cauHinh.mayChu }

  // MARK: vòng chạy

  /// Vòng ĐỒNG BỘ (Task riêng của daemon): chỉ khi tới hạn `nextCheckSec`; chỉ cập nhật Policy + cache. Treo mạng ở đây KHÔNG làm ngưng vòng áp
  /// (actor cho phép việc khác chạy trong lúc đang await mạng) và không bao giờ có hai lần đồng bộ chồng nhau.
  public func vongDongBo() async {
    guard cauHinh.daGhep, !dangDongBo, donDieu() >= syncLuc else { return }
    dangDongBo = true; defer { dangDongBo = false }
    await dongBo()
    if let s = syncSom { syncLuc = min(syncLuc, s); syncSom = nil }
  }

  /// Vòng ÁP (Task riêng, 5 giây một lần): chỉ dùng Policy đã cache, KHÔNG BAO GIỜ await mạng — đóng app, hosts/plist, trừ giờ, đếm ngược khoá.
  @discardableResult
  public func vongAp() -> TrangThai { apChinhSach() }

  /// Đồng bộ nếu tới hạn rồi áp một lần (dùng cho `--mot-vong` và test); daemon chạy hai vòng ở hai Task riêng.
  @discardableResult
  public func motVong() async -> TrangThai {
    await vongDongBo()
    return apChinhSach()                 // đã gỡ từ xa trong dongBo ⇒ apChinhSach tự trả «chưa ghép», không áp gì
  }

  /// Token gói cài một chạm (DuongDan.tokenGoi) — chỉ ký tự base64url, 16–128.
  private var tokenGoiNho: (luc: Double, gt: String?)?
  private func tokenGoi() -> String? {
    if let n = tokenGoiNho, donDieu() - n.luc < (n.gt == nil ? 5 : 30) { return n.gt }   // chưa có token: hỏi lại sau 5 giây (postinstall vừa ghi)      // tray hỏi trạng thái 5 giây/lần ⇒ không đọc đĩa mỗi lần
    let gt = docTokenGoi()
    tokenGoiNho = (donDieu(), gt)
    return gt
  }
  private func docTokenGoi() -> String? {
    guard let d = heThong.docTep(DuongDan.tokenGoi) else { return nil }
    let t = String(decoding: d, as: UTF8.self).trimmingCharacters(in: .whitespacesAndNewlines)
    guard (16...128).contains(t.count), t.allSatisfy({ ($0.isASCII && ($0.isLetter || $0.isNumber)) || $0 == "-" || $0 == "_" }) else { return nil }
    return t
  }

  private func trangThaiChuaGhep() -> TrangThai {
    let phien = heThong.phienConsole()
    var tt = TrangThai(daGhep: false, laPhienCon: false, tenCon: nil, cheDo: .tuDo, lyDoKhoa: nil, conPhut: nil,
                     moDen: nil, khoaDen: nil, demNguocGiay: nil, yeuCauCho: [], duocDoiDiem: false,
                     matMang: false, trangChan: phien == nil ? [] : [])
    if tokenGoi() != nil { tt.coGoiCai = true }
    return tt
  }

  private func dongBo() async {
    let con = conDangDung()
    if let u = cauHinh.uidCon { conLaAdmin = heThong.laAdmin(uid: u) }       // đọc lại mỗi lần đồng bộ: ai nâng Con lên admin cũng bị báo
    var st = TrangThaiAgent(mode: policy?.mode ?? CheDo.tuDo.rawValue,
                            trayAlive: trayDangSong(), childSessionActive: con != nil,
                            offline: matMang, cheDo: cheDoHieuLuc(), phienKhac: laPhienKhac())
    st.moCoi = MoCoi.la(cauHinh, now: dongHo())                 // cùng cheDo «giam-sat» + quyen.chanThat=false (cheDoHieuLuc) như agent-win
    if conLaAdmin { st.conLaAdmin = true; st.quyen["haQuyenAdmin"] = false }   // quyen[…]=false ⇒ chiTietBaoVe của máy chủ liệt vào «còn thiếu» (mức Một phần)
    DemPhut.don(&cauHinh.demPhut)
    let dung = DemPhut.tong(cauHinh.demPhut)
    let daGuiGiay = cauHinh.daDungGiayTuSync     // vòng áp vẫn cộng trong lúc await — chỉ trừ phần đã tính tới lúc gửi
    if let bu = cauHinh.phienBu, !matMang || bu.giay > 0 {      // gửi bù TRƯỚC dong-bo (nhip_cuoi còn là nhịp online cuối ⇒ máy chủ đo được thời gian thật)
      do {
        if bu.giay >= 1 { try await api.guiPhienBu(bu.than) }
        if cauHinh.phienBu?.ma == bu.ma { cauHinh.phienBu = nil; _ = try? kho.sua { $0.phienBu = nil } }
      } catch let e as LoiApi where !e.laMang {
        cauHinh.phienBu = nil; _ = try? kho.sua { $0.phienBu = nil }          // máy chủ từ chối hẳn (phiên lạ…) ⇒ bỏ, không gửi mãi
        heThong.ghiLog("Gửi bù phút chơi bị từ chối: \(e.chu)")
      } catch {}
    }
    let the = theHeGhep
    do {
      let kq = try await api.dongBo(trangThai: st, dung: dung, luc: dongHo())
      guard the == theHeGhep else { return }                    // ghép lại trong lúc chờ: kết quả của token cũ, bỏ
      if BoMay.dauChoi(kq.policy) != policy.map(BoMay.dauChoi) { choiNho = [:] }   // bật/tắt đổi điểm, mục chơi, phiên, chế độ đổi ⇒ số phút nhớ bỏ đi
      if moTamDangMo() {                             // có mạng lại ⇒ kết thúc lượt mở offline, Ba Mẹ lại quyết bằng Policy online
        cauHinh.moTamOffline?.moDen = dongHo()
        let m = cauHinh.moTamOffline
        _ = try? kho.sua { $0.moTamOffline = m }
        heThong.ghiLog("Có mạng lại — kết thúc lượt mở bằng mã offline.")
        themSuKien("het_ma_offline", ["ket_thuc": "co_mang"])
      }
      policy = kq.policy
      matMang = false
      dongBoLoi = false
      let lucOk = dongHo()
      MoCoi.ghiThanhCong(&cauHinh, now: lucOk)                    // hết mồ côi (nếu đang) — vòng áp chạy lại bình thường
      syncLuc = donDieu() + Double(kq.nextCheckSec)
      cauHinh.policyCuoi = kq.policy
      cauHinh.policyLuc = dongHo()
      cauHinh.daDungGiayTuSync = max(0, cauHinh.daDungGiayTuSync - daGuiGiay)
      _ = try? kho.sua {
        $0.policyCuoi = kq.policy
        $0.policyLuc = self.dongHo()
        $0.daDungGiayTuSync = self.cauHinh.daDungGiayTuSync
        MoCoi.ghiThanhCong(&$0, now: lucOk)
      }
      for l in kq.lenh where l.loai == "go" { await tuGo(lenhId: l.id) }
      tinHieuApp = kq.danhSachApp
      kichGuiDanhSachApp()                          // Task riêng — không chặn vòng đồng bộ
    } catch _ where the != theHeGhep {
      return                                                    // lỗi của token cũ (ghép lại trong lúc chờ) — không ghi vào lần ghép mới
    } catch let e as LoiApi {
      matMang = e.laMang
      dongBoLoi = true
      syncLuc = donDieu() + Double(policy?.nextCheckSec ?? 60)
      if e.laTokenSai {
        MoCoi.ghiTuChoi(&cauHinh, now: dongHo())
        let t = cauHinh.tuChoiTu, cuoi = cauHinh.tuChoiCuoi
        _ = try? kho.sua { $0.tuChoiTu = t; $0.tuChoiCuoi = cuoi }
        heThong.ghiLog("Máy chủ báo token sai — có thể đã bị gỡ khỏi gia đình; quá \(Int(MoCoi.gioNguong)) giờ liên tục thì AiiGrow tự thôi chặn.")
      }
      else { heThong.ghiLog("Đồng bộ lỗi (\(e.chu)) — chạy theo Policy nhớ.") }
    } catch {
      matMang = true
      dongBoLoi = true
      syncLuc = donDieu() + Double(policy?.nextCheckSec ?? 60)
    }
  }

  /// Áp Policy hiện có lên giờ hiện tại; cộng giờ đã dùng theo đồng hồ đơn điệu. CHỈ vòng áp của daemon gọi (IPC thì không — xem `trangThaiTuoi`).
  @discardableResult
  public func apChinhSach() -> TrangThai { apChinhSachTho() }

  /// IPC `trangThai`: TÍNH TƯƠI, không tác dụng phụ — console hiện tại, Policy cache, đếm ngược từ hạn chót, daGhep hiện tại, sổ giờ hiện tại.
  /// Không đóng app, không trừ giờ, không ghi gì.
  private func trangThaiTuoi() -> TrangThai {
    guard cauHinh.daGhep, !dangGo else { return trangThaiChuaGhep() }
    let phien = heThong.phienConsole()
    let laCon = phien?.uid == cauHinh.uidCon
    let manKhoa = phien?.manKhoa ?? true
    guard let p0 = policy, !MoCoi.la(cauHinh, now: dongHo()) else { return trangThai(p: nil, hl: nil, laCon: laCon, phutDung: nil) }
    let p = BoMay.gioiHanPhienOffline(p0, matMang: matMang, tu: cauHinh.policyLuc, now: dongHo())
    let hl = MoTamOffline.apDung(DanhGiaPolicy.tinh(p, now: dongHo(), daDungGiay: cauHinh.daDungGiayTuSync), dangMo: moTamDangMo())
    var demNguoc: Int?
    if hl.khoa, laCon, !manKhoa {
      demNguoc = Int(((khoaLuc ?? donDieu() + Double(tuyChon.demNguocKhoaGiay)) - donDieu()).clamped0.rounded(.up))
    }
    return trangThai(p: p, hl: hl, laCon: laCon, phutDung: hl.conPhut, demNguoc: demNguoc)
  }

  private func apChinhSachTho() -> TrangThai {
    guard cauHinh.daGhep, !dangGo else { return trangThaiChuaGhep() }       // chưa ghép / đang gỡ / đã bị gỡ từ xa: thả hoàn toàn
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
      demPhutBu(troi: troi, now: now)
      _ = try? kho.sua { $0.daDungGiayTuSync = self.cauHinh.daDungGiayTuSync; $0.demPhut = self.cauHinh.demPhut; $0.phienBu = self.cauHinh.phienBu }
    }
    if dongBoLoi {                                          // mất liên lạc: cộng thời gian CHẠY (đơn điệu) — lưu mỗi phút, khởi động lại vẫn tính tiếp
      let phutTruoc = Int(cauHinh.matLienLacChayGiay / 60)
      MoCoi.congChay(&cauHinh, giay: troi)
      if Int(cauHinh.matLienLacChayGiay / 60) != phutTruoc { let g = cauHinh.matLienLacChayGiay; _ = try? kho.sua { $0.matLienLacChayGiay = g } }
    }
    // Máy mồ côi (MoCoi.swift — máy chủ từ chối token ≥ 6 giờ / mất liên lạc ≥ 14 ngày + 72 giờ chạy): thôi chặn như agent-win — gỡ luật web +
    // hosts, không đóng app, không khoá. Policy cuối giữ trên đĩa; đồng bộ lại được thì vòng sau áp lại bình thường.
    if MoCoi.la(cauHinh, now: now) {
      if !daBaoMoCoi {                                    // dọn MỘT lần lúc vào mồ côi (và lần đầu sau khởi động daemon)
        daBaoMoCoi = true
        thaWebMoiTaiKhoan()
        heThong.ghiLog("Máy mồ côi (\(MoCoi.tuChoiLau(cauHinh, now: now) ? "máy chủ từ chối token quá \(Int(MoCoi.gioNguong)) giờ" : "mất liên lạc quá \(Int(MoCoi.ngayMatLienLac)) ngày")) — AiiGrow tạm thôi chặn.")
      }
      trinhDuyetCanDong = []; daGuiTerm = [:]; chanDaBao = []; khoaLuc = nil
      return trangThai(p: nil, hl: nil, laCon: laCon, phutDung: nil)
    } else if daBaoMoCoi {
      daBaoMoCoi = false
      heThong.ghiLog("Hết mồ côi — áp chính sách trở lại.")
    }

    guard let p0 = policy else {
      return trangThai(p: nil, hl: nil, laCon: laCon, phutDung: nil)
    }
    let p = BoMay.gioiHanPhienOffline(p0, matMang: matMang, tu: cauHinh.policyLuc, now: now)
    let hl = MoTamOffline.apDung(DanhGiaPolicy.tinh(p, now: now, daDungGiay: cauHinh.daDungGiayTuSync), dangMo: moTamDangMo())
    let chan = cheDoHieuLuc() == CheDoAgent.chan

    // Web TRƯỚC: plist chính sách trình duyệt (theo tài khoản Con) + khối hosts cho Safari. Giám sát ⇒ gỡ hết.
    // Kết quả = trình duyệt mà luật web đang đúng trên đĩa ⇒ «chặn theo lọc»: chỉ những trình duyệt này được chạy ở Chặn thật.
    let trinhDuyet = apWeb(p: p, now: now, chan: chan, laCon: laCon, manKhoa: manKhoa)

    // App: đóng app ngoài danh sách của phiên Con (chỉ khi chặn thật + chỉ-app-học).
    // Mở tạm bằng mã offline: apDung đã bỏ «chỉ app học» ⇒ canDong trống; app Ba Mẹ «Chặn» + Safari chỉ-cho-phép VẪN đóng.
    if let uidCon = cauHinh.uidCon, laCon, chan {
      let ds = heThong.tienTrinh(cuaUid: uidCon)
      let choPhep = p.allowedApps + Array(QuyetDinhApp.heThong)
      var nho: [String: Bool] = [:]                      // mỗi lượt kiểm MỘT lần cho mỗi .app (Chrome có hàng chục tiến trình phụ)
      let tinCay: (String, String) -> Bool = { [heThong] app, bundle in
        if let v = nho[app + "|" + bundle] { return v }
        let td = ChinhSachTrinhDuyet.tatCa.first { $0.bundleApp.lowercased() == bundle }
        let tt = ["", "/Contents", "/Contents/MacOS", "/Contents/Frameworks"].map { heThong.thuocTinhTep(app + $0) }
        let v = QuyetDinhApp.appTrinhDuyetTinCay(thuocTinh: tt, uidCon: uidCon, kyDung: td?.teamId.map { heThong.kyBoiTeam(app, team: $0) } ?? false)
        nho[app + "|" + bundle] = v
        return v
      }
      var can = QuyetDinhApp.canDong(ds, uidCon: uidCon, chiAppHoc: hl.chiAppHoc, choPhep: choPhep, trinhDuyet: trinhDuyet.subtracting(trinhDuyetCanDong), tinCay: tinCay)
      can += BoMay.safariKhongLocDuoc(ds, uidCon: uidCon, p: p, now: now, chiAppHoc: hl.chiAppHoc, daCo: Set(can.map(\.pid)))
      let biChan = appBiChanCanDong(ds, uidCon: uidCon, p: p, chan: true, daCo: Set(can.map(\.pid)))     // app Ba Mẹ «Chặn»: MỌI mode
      // trình duyệt chỉ bị đóng MỘT lần để nạp luật lọc mới (trinhDuyetCanDong) — Con mở lại được ngay ⇒ không hiện màn «chưa được mở»
      let napLai = trinhDuyetCanDong
      ghiAppVuaChan(can: (can + biChan).filter { !napLai.contains(($0.bundleId ?? "").lowercased()) && !napLai.contains($0.bundleId ?? "") },
                    baMeChan: Set(biChan.map(\.pid)), chiAppHoc: hl.chiAppHoc)
      can += biChan
      if hl.chiAppHoc { trinhDuyetCanDong = [] }        // đã có một lượt đóng thật ⇒ trình duyệt mở từ giờ đọc luật mới
      let canPid = Set(can.map(\.pid))
      daGuiTerm = daGuiTerm.filter { canPid.contains($0.key) && heThong.conSong(pid: $0.key) }     // hết cần đóng / đã chết ⇒ quên SIGTERM cũ
      for t in can { dongApp(t) }
    } else {
      daGuiTerm = [:]
      chanDaBao = []
      if let uidCon = cauHinh.uidCon, laCon, !p.blockedApps.isEmpty {          // giám sát: chỉ ghi «sẽ đóng»
        _ = appBiChanCanDong(heThong.tienTrinh(cuaUid: uidCon), uidCon: uidCon, p: p, chan: false, daCo: [])
      } else { daBaoBiChan = [] }
    }

    // Khoá: đếm ngược rồi đóng phiên Con.
    var demNguoc: Int? = nil
    if hl.khoa, let uidCon = cauHinh.uidCon, laCon, !manKhoa {
      // mất mạng + mã gỡ được: đếm ngược DÀI (5 phút) để Ba Mẹ kịp đọc mã — hết vẫn đăng xuất (màn khoá của tray tắt được, không phải hàng rào)
      demNguoc = tienKhoa(uidCon: uidCon, chan: chan, giay: tuyChon.demNguocKhoaGiay, choMa: choNhapMaOffline(p, hl))
    } else {
      khoaLuc = nil
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

  /// → bundle id .app (chữ thường) của trình duyệt mà plist luật web ĐANG đúng trên đĩa (rỗng khi không chặn / ghi lỗi / chưa biết tài khoản Con).
  /// Trình duyệt vừa vào lọc (bundle id chữ thường) chưa qua lượt đóng app nào — xem apWeb.
  private var trinhDuyetCanDong = Set<String>()

  @discardableResult
  private func apWeb(p: Policy, now: Date, chan: Bool, laCon: Bool, manKhoa: Bool) -> Set<String> {
    // hosts áp cho cả máy ⇒ chỉ đặt khi Con đang ở màn hình, gỡ khi không phải Con (để Ba Mẹ không bị chặn).
    let web = chan ? (p.web ?? ChinhSachWeb()).hetMo(now, moDen: p.grantEndsAt) : nil
    let dungHosts = chan && laCon && !manKhoa
    apHosts(web: dungHosts ? web : nil)
    let (dung, vuaVao) = apChinhSachTrinhDuyet(web: chan ? web : nil)
    trinhDuyetCanDong.formUnion(vuaVao)
    if !chan { trinhDuyetCanDong = [] }
    // Policy không có khối web (máy chủ cũ / cache cũ) ⇒ chưa có luật lọc thật ⇒ không thả trình duyệt (an toàn trước).
    // Trình duyệt VỪA VÀO lọc (trước đó không có plist của AiiGrow: mới vào Chặn thật / tệp bị xoá) ⇒ trinhDuyetCanDong: lượt đóng app KẾ TIẾP (khi Con ở
    // màn hình + chỉ app học) đóng nó dù luật đã ghi (bản đang mở nạp chính sách cũ, cfprefsd còn đệm), sau đó mới thả. Sửa danh sách khi đang lọc thì không đóng.
    return web == nil || p.web == nil ? [] : dung
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

  @discardableResult
  private func apChinhSachTrinhDuyet(web: ChinhSachWeb?) -> (dung: Set<String>, vuaVao: Set<String>) {
    guard let tk = cauHinh.uidCon.flatMap({ heThong.taiKhoan(cuaUid: $0) }) ?? (cauHinh.taiKhoanCon.isEmpty ? nil : cauHinh.taiKhoanCon) else { return ([], []) }
    return apChinhSachTrinhDuyet(taiKhoan: tk, web: web)
  }

  /// → bundle id .app (chữ thường) của trình duyệt có plist đúng nội dung mong muốn sau lượt này (đã đúng sẵn hoặc vừa ghi xong).
  @discardableResult
  private func apChinhSachTrinhDuyet(taiKhoan tk: String, web: ChinhSachWeb?) -> (dung: Set<String>, vuaVao: Set<String>) {
    let host = URL(string: cauHinh.mayChu)?.host
    var dung = Set<String>(), vuaVao = Set<String>()
    for td in ChinhSachTrinhDuyet.tatCa {
      let duong = ChinhSachTrinhDuyet.duongDan(td, taiKhoan: tk, thuMucGoc: tuyChon.thuMucChinhSach)
      let cu = ChinhSachTrinhDuyet.giaiMa(heThong.docTep(duong))
      guard let moi = ChinhSachTrinhDuyet.gop(cu: cu, trinhDuyet: td, p: web, mayChuHost: host) else {
        if cu != nil { heThong.xoaTep(duong) }
        continue
      }
      // Bỏ qua ghi CHỈ khi tệp thật trên đĩa đang đúng nội dung mong muốn (tệp mất hoặc bị sửa ⇒ ghi lại).
      if let cu, NSDictionary(dictionary: cu).isEqual(to: moi) { dung.insert(td.bundleApp.lowercased()); continue }
      guard let data = try? ChinhSachTrinhDuyet.maHoa(moi) else { continue }
      do {
        try heThong.ghiTep(duong, data, quyen: 0o644); dung.insert(td.bundleApp.lowercased())
        if web != nil && cu?[ChinhSachTrinhDuyet.khoaDanhDau] == nil { vuaVao.insert(td.bundleApp.lowercased()) }
      }
      catch { heThong.ghiLog("Ghi chính sách \(td.ten) lỗi: \(error)") }
    }
    return (dung, vuaVao)
  }

  // MARK: khoá + đóng app

  /// Đếm ngược theo HẠN CHÓT: bắt đầu khoá ⇒ khoaLuc = bây giờ + demNguocKhoaGiay; còn lại tính từ đồng hồ đơn điệu, không phải bộ đếm theo vòng.
  static let choMaGiay = 300
  /// Lần gần nhất đã nới đếm ngược để chờ mã offline — mỗi 30 phút chỉ nới MỘT lần (Con tắt Wi‑Fi rồi đăng nhập lại không được thêm 5 phút mãi).
  private var noiChoMaLuc: Double?
  private func tienKhoa(uidCon: UInt32, chan: Bool, giay: Int, choMa: Bool = false) -> Int {
    let gio = donDieu()
    if khoaLuc == nil { khoaLuc = gio + Double(giay) }
    if choMa, noiChoMaLuc.map({ gio - $0 > 1800 }) ?? true {
      khoaLuc = max(khoaLuc!, gio + Double(BoMay.choMaGiay)); noiChoMaLuc = gio                 // mất mạng giữa lúc đếm cũng được nới
    } else if !choMa, khoaLuc! - gio > Double(giay) {
      khoaLuc = gio + Double(giay)                                                             // có mạng lại (mã không dùng được nữa) ⇒ về đếm thường
    }
    let conLai = (khoaLuc! - gio).clamped0
    if conLai > 0 { return Int(conLai.rounded(.up)) }
    if chan {
      do { try heThong.dongPhien(uid: uidCon); heThong.ghiLog("Đã đóng phiên của Con (hết đếm ngược khoá).") }
      catch { heThong.ghiLog("Đóng phiên lỗi: \(error)") }
    } else {
      heThong.ghiLog("[giám sát] sẽ đóng phiên của Con (uid \(uidCon)).")
    }
    return 0
  }

  /// SIGTERM; vòng sau nếu pid VẪN cần đóng (daGuiTerm đã lọc ở mỗi vòng áp) VÀ đã qua ≥ `vongGiay` giây kể từ SIGTERM của lần cần đóng này thì SIGKILL.
  private var daGuiTerm: [Int32: Double] = [:]
  private func dongApp(_ t: TienTrinh) {
    let gio = donDieu()
    if let luc = daGuiTerm[t.pid] {
      guard gio - luc >= tuyChon.vongGiay else { return }          // chưa đủ thời gian cho SIGTERM có tác dụng
      heThong.guiTinHieu(pid: t.pid, tinHieu: SIGKILL)
      daGuiTerm[t.pid] = nil
      heThong.ghiLog("Đóng (SIGKILL) \(t.bundleId ?? t.duongDan) pid \(t.pid)")
    } else {
      heThong.guiTinHieu(pid: t.pid, tinHieu: SIGTERM)
      daGuiTerm[t.pid] = gio
      heThong.ghiLog("Đóng (SIGTERM) \(t.bundleId ?? t.duongDan) pid \(t.pid)")
    }
  }

  // MARK: lệnh IPC từ tray

  /// Xử lý một yêu cầu tray — gọi từ socket sau khi đã lấy uid người gọi bằng getpeereid.
  public func xuLyIPC(_ yc: YeuCauTray, uidGoi: UInt32) async -> TraLoi {
    // Quyền admin của người gọi tra NGOÀI actor (dscl có thể chậm; tray hỏi trạng thái mỗi 5 giây với hạn 3 giây). Hỏi trạng thái chỉ cần khi
    // có dòng cập nhật để trả (bộ đệm 5 phút); lệnh thật (ghép, cập nhật) tra tươi.
    let ht = heThong
    let adminGoi: Bool
    switch yc {
    case .trangThai:
      adminGoi = capNhat.so.chu != nil && uidGoi != 0 && uidGoi != cauHinh.uidCon ? await laAdminDem(uidGoi) : false
    case .ghep, .capNhat, .hoSoDns:
      adminGoi = uidGoi != 0 ? await chayNgoaiActor { ht.laAdmin(uid: uidGoi) } : false
    default:
      adminGoi = false                                 // ping/appTienCanh/xin… không cần quyền admin — không chạy dscl
    }
    let laAdmin: (UInt32) -> Bool = { $0 == uidGoi && adminGoi }
    let daGhepXet: Bool
    if case .ghep = yc { daGhepXet = daGhepHieuLuc } else { daGhepXet = cauHinh.daGhep }     // chỉ lệnh ghép coi máy mồ côi (token bị từ chối) là chưa ghép
    let quyen = QuyenIPC.kiem(yc, uidGoi: uidGoi, uidCon: cauHinh.uidCon, daGhep: daGhepXet, laAdmin: laAdmin)
    if case let .tuChoi(ma, chu) = quyen { return .loi(ma: ma, chu: chu) }
    switch yc {
    case .trangThai:
      if uidGoi == cauHinh.uidCon { trayNhipCuoi = donDieu() }     // tray hỏi trạng thái mỗi 5 giây = nhịp «còn sống»
      var tt = trangThaiTuoi()                                    // tính tươi, không tác dụng phụ: gọi dồn dập không làm đếm ngược/kill nhanh hơn
      tt.banDaemon = PhienBan.hienTai
      if tt.coGoiCai == true, uidGoi != 0, !(await laAdminDem(uidGoi)) { tt.coGoiCai = nil }   // token gói chờ: chỉ báo cho Ba Mẹ (admin)
      if uidGoi == cauHinh.uidCon { tt.canhBaoAdmin = nil }        // MỘT quy tắc ẩn: theo uid người gọi; Con không được nói là tự gỡ được (máy chủ vẫn nhận conLaAdmin)
      // Trạng thái cập nhật: chỉ Ba Mẹ (cùng quy tắc quyền IPC capNhat); admin tra qua bộ nhớ đệm (tray hỏi mỗi 5 giây, dscl không chạy mỗi lần)
      if let chu = capNhat.so.chu, QuyenIPC.laBaMe(uidGoi: uidGoi, uidCon: cauHinh.uidCon, laAdmin: laAdmin) {
        tt.capNhat = chu; tt.capNhatLuc = capNhat.so.luc
      }
      return .trangThai(tt)
    case .ping, .appTienCanh:
      trayNhipCuoi = donDieu()
      return .ok(id: nil)
    case let .xinThem(phut, loiNhan):
      return await taoYeuCau(loai: "them_gio", phut: phut, giaTri: nil, lyDo: loiNhan ?? "Con xin thêm giờ")
    case let .xinMo(muc, loai, loiNhan):
      return await taoYeuCau(loai: loai == "web" ? "mo_web" : "cai_app", phut: nil, giaTri: muc, lyDo: loiNhan ?? "Con xin mở \(muc)")
    case .capNhat:
      return await capNhatNgay()
    case let .hocVien(method, path, than):
      return await hocVien(method: method, path: path, than: than)
    case let .choi(muc):
      return await choi(muc: muc)
    case let .choiThu(muc):
      return await choiThu(muc: muc)
    case let .maOffline(ma):
      return thuMaOffline(ma)
    case .hoSoDns:
      do { return .duLieu(json: String(decoding: try await api.hoSoDns(), as: UTF8.self)) }
      catch let e as LoiApi { return .loi(ma: e.ma ?? "dns_loi", chu: e.chu) }
      catch { return .loi(ma: "dns_loi", chu: "\(error)") }
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

  // MARK: tự cập nhật

  /// Nút «Kiểm tra cập nhật»: trả lời NGAY (tray chỉ chờ 3 giây), kiểm + tải + cài chạy nền; kết quả nằm ở `TrangThai.capNhat`.
  public func capNhatNgay() async -> TraLoi {
    guard tuyChon.tuCapNhat else { return .thongBao(chu: "[thử] daemon chạy chế độ thử — không tự cập nhật.") }
    guard daGhepKhongGo() else { return .loi(ma: "chua_ghep", chu: LuatCapNhat.chuChuaGhep) }
    guard capNhat.giuChoNgay() else { return .thongBao(chu: KetQuaCapNhat.dangBan.chu) }
    capNhat.so.dat("Đang kiểm tra bản mới…", luc: dongHo())      // ghi ngay để lần hỏi trạng thái kế thấy, không chờ Task kịp chạy
    Task { _ = await self.capNhat.batDau(thuCong: true, daGiuCho: true, choPhep: { await self.coTheCapNhat() }) }
    return .thongBao(chu: "Đang kiểm tra bản mới… Kết quả hiện ở menu AiiGrow.")
  }

  /// Daemon gọi (Task riêng, theo `LichCapNhat`); chờ lượt tải/cài nền xong rồi mới trả.
  /// Trả số giây chờ tới lượt kế (chu kỳ máy chủ đặt, hoặc khoảng lùi sau lỗi).
  @discardableResult public func kiemCapNhatDinhKy() async -> Double {
    guard tuyChon.tuCapNhat else { heThong.ghiLog("[thử] bỏ qua vòng tự cập nhật."); return LuatCapNhat.chuKyMacDinhGiay }
    let kq = await capNhat.batDau(choPhep: { await self.coTheCapNhat() })
    // nút Ba Mẹ đang giữ lượt ⇒ không đọc khoảng chờ của lượt khác, quay lại sau 15 phút
    if kq == .dangBan { return LuatCapNhat.giayThuLaiManifest }
    await capNhat.choXong()
    return await capNhat.choLaiGiay()
  }

  /// Chỉ cập nhật khi đã ghép và không đang gỡ.
  private func daGhepKhongGo() -> Bool { cauHinh.daGhep && !dangGo }

  /// `choPhep` của bộ cập nhật. Dấu gỡ sót (go-cai.sh chết giữa chừng — SIGKILL/mất điện — trước khi gỡ thật) trên máy vẫn ghép mà không có
  /// trình gỡ nào chạy: tự bỏ. Dọn ở ĐÂY (không ở BoCapNhat) vì tuGo bật `dangGo` + ghi dấu trên cùng actor này: sau await kiểm lại `dangGo`,
  /// giữa lần kiểm đó và lệnh xoá không có await ⇒ không xoá nhầm dấu của một lượt gỡ từ xa vừa bắt đầu.
  private func coTheCapNhat() async -> Bool {
    guard daGhepKhongGo() else { return false }
    if heThong.docTep(DuongDan.daGo) != nil {
      let ht = heThong
      let goChay = await chayNgoaiActor { ht.trinhGoDangChay() }
      if !goChay, daGhepKhongGo(), heThong.docTep(DuongDan.daGo) != nil {
        heThong.ghiLog("Cập nhật: dấu gỡ \(DuongDan.daGo) sót từ lượt gỡ dở (không có go-cai.sh nào chạy, máy vẫn ghép) — bỏ dấu.")
        heThong.xoaTep(DuongDan.daGo)
      }
    }
    return daGhepKhongGo()
  }


  /// laAdmin có bộ nhớ đệm 5 phút theo uid (HeThongMac.laAdmin chạy dscl).
  private var adminDem: [UInt32: (laAdmin: Bool, luc: Double)] = [:]
  private func laAdminDem(_ uid: UInt32) async -> Bool {
    if let d = adminDem[uid], donDieu() - d.luc < 300 { return d.laAdmin }
    let ht = heThong
    let a = await chayNgoaiActor { ht.laAdmin(uid: uid) }
    let bayGio = donDieu()
    adminDem[uid] = (a, bayGio)
    return a
  }

  private func taoYeuCau(loai: String, phut: Int?, giaTri: String?, lyDo: String) async -> TraLoi {
    do {
      let r = try await api.taoYeuCau(loai: loai, phut: phut, giaTri: giaTri, lyDo: lyDo)
      syncLuc = min(syncLuc, donDieu() + 5)     // đồng bộ sớm để quyết định của Ba Mẹ tới nhanh
      if dangDongBo { syncSom = min(syncSom ?? .infinity, donDieu() + 5) }   // dongBo dở sẽ ghi đè syncLuc — vongDongBo áp lại mốc này
      return .ok(id: r.id)
    } catch let e as LoiApi { return .loi(ma: e.ma ?? "yeu_cau_loi", chu: e.chu) }
    catch { return .loi(ma: "yeu_cau_loi", chu: "\(error)") }
  }

  // MARK: app của Con — nhiệm vụ / phần quà / tin nhắn, chơi bằng điểm (agent-win PipeServer: HocVien, Play, PlayInfo)

  /// Chuyển một lời gọi học viên tới máy chủ bằng token máy — chỉ đường trong HocVienPaths (tray chạy dưới tài khoản Con).
  private func hocVien(method: String, path: String, than: String?) async -> TraLoi {
    guard cauHinh.daGhep, !dangGo else { return .loi(ma: "chua_ghep", chu: "Máy chưa ghép với Ba Mẹ.") }
    guard HocVienPaths.duoc(method: method, path: path) else { return .loi(ma: "duong_sai", chu: "Đường không hỗ trợ.") }
    if let than, than.utf8.count > 600_000 { return .loi(ma: "qua_lon", chu: "Ảnh quá lớn. Con chọn ảnh khác nhé.") }
    do {
      let d = try await api.hocVien(method: method, path: path, than: than.map { Data($0.utf8) })
      if method.uppercased() == "POST" { choiNho = [:] }     // đổi quà / nộp bài tự duyệt ⇒ số dư đổi ⇒ số phút nhớ không còn đúng
      return .duLieu(json: String(decoding: d, as: UTF8.self))
    } catch let e as LoiApi {
      return .loi(ma: e.ma ?? "hoc_vien_loi", chu: BoMay.cauLoiCon(e))
    } catch { return .loi(ma: "hoc_vien_loi", chu: "\(error)") }
  }

  /// Nhớ kết quả «chơi thử» theo mục: «được» 60 giây, «từ chối» 15 giây (mở hộp / làm mới không bắn phien/xet liên tục). Policy đổi ⇒ bỏ hết.
  private var choiNho: [String: (luc: Double, tra: TraLoi)] = [:]

  /// Câu lỗi cho Con: không tới được máy chủ ⇒ «chưa có mạng»; máy chủ trả lỗi ⇒ câu máy chủ.
  static func cauLoiCon(_ e: LoiApi) -> String { e.laMang && e.maHttp == nil ? "Chưa có mạng, con thử lại sau nhé." : e.chu }

  /// Mất mạng giữa phiên chơi bằng điểm: chỉ được chơi tiếp `playOfflineMinutes` phút kể từ lần đồng bộ cuối (như Windows 0.2.4) — quá thì
  /// bỏ app chơi (và trình duyệt nếu phiên web) khỏi danh sách được mở. Không có số ⇒ 0 phút (không chơi «chùa» khi tắt Wi‑Fi).
  static func gioiHanPhienOffline(_ p: Policy, matMang: Bool, tu: Date?, now: Date) -> Policy {
    guard matMang, p.playSessionId != nil, let tu else { return p }
    guard now.timeIntervalSince(tu) > Double((p.playOfflineMinutes ?? 0) * 60) else { return p }
    var q = p
    var bo = Set<String>()
    if let a = p.playApp?.lowercased() { bo.insert(a) }
    if p.playWeb {
      bo.formUnion(ChinhSachTrinhDuyet.bundleMoi)
      // trình duyệt lọc được không bị đóng (laTrinhDuyetLoc) ⇒ phải rút luôn tên miền của phiên khỏi danh sách cho phép (playApp = tên miền)
      if let mien = p.playApp?.lowercased(), var w = q.web { w.cho.removeAll { $0.lowercased() == mien }; w.chan = Array(Set(w.chan + [mien])).sorted(); q.web = w }
    }
    q.allowedApps.removeAll { bo.contains($0.lowercased()) }
    q.playSessionId = nil
    return q
  }

  /// Phần Policy ảnh hưởng «chơi bằng điểm» (serverTime / minutesLeft đổi mỗi lượt — không tính).
  static func dauChoi(_ p: Policy) -> String {
    [String(p.canExchangePoints), p.mode, String(p.locked), p.playSessionId ?? "", p.playChoices.joined(separator: ",")].joined(separator: "|")
  }

  private func mucChoi(_ muc: String) -> String? {
    let m = muc.trimmingCharacters(in: .whitespacesAndNewlines)
    return (policy?.playChoices ?? []).first { $0.lowercased() == m.lowercased() }
  }

  private func choiThu(muc: String) async -> TraLoi {
    guard cauHinh.daGhep, !dangGo else { return .loi(ma: "chua_ghep", chu: "Máy chưa ghép với Ba Mẹ.") }
    guard !muc.isEmpty else { return .choi(trangThai: "khong_co_muc", phut: nil, chu: nil) }
    guard let m = mucChoi(muc) else { return .loi(ma: "khong_co_muc", chu: "Mục này Ba Mẹ chưa cho đổi điểm.") }
    let khoa = m.lowercased()
    if let n = choiNho[khoa], case let .choi(tt, _, _) = n.tra, donDieu() - n.luc < (tt == "duoc" ? 60 : 15) { return n.tra }
    do {
      let x = try await api.xetChoi(muc: m)
      let tra = TraLoi.choi(trangThai: x.duoc ? "duoc" : "tu_choi", phut: x.duoc ? x.phutHienThi : 0, chu: x.duoc ? nil : (x.cau ?? x.lyDo))
      choiNho[khoa] = (donDieu(), tra)
      return tra
    } catch let e as LoiApi { return .loi(ma: e.ma ?? "choi_loi", chu: BoMay.cauLoiCon(e)) }
    catch { return .loi(ma: "choi_loi", chu: "\(error)") }
  }

  /// «Chơi bằng điểm»: xét (phien/xet) rồi mở (phien/mo). Máy chủ quyết; daemon chỉ nhận mục trong Policy.playChoices.
  private func choi(muc: String) async -> TraLoi {
    guard cauHinh.daGhep, !dangGo else { return .loi(ma: "chua_ghep", chu: "Máy chưa ghép với Ba Mẹ.") }
    guard let m = mucChoi(muc) else { return .loi(ma: "khong_co_muc", chu: "Mục này Ba Mẹ chưa cho đổi điểm.") }
    choiNho = [:]                                     // điểm sắp đổi ⇒ số phút nhớ không còn đúng
    do {
      let x = try await api.xetChoi(muc: m)
      guard x.duoc else { return .choi(trangThai: "tu_choi", phut: 0, chu: x.cau ?? x.lyDo) }
      let mo: KetQuaMoChoi
      do { mo = try await api.moChoi(muc: m) } catch { dongBoSom(); throw error }   // hết giờ chờ mà máy chủ đã mở ⇒ lấy Policy ngay, không để Con bấm lại
      dongBoSom()                                     // Policy mới (app chơi được thả + playSessionId) tới ngay
      nhipLuc = donDieu() + 30
      return .choi(trangThai: "mo", phut: (mo.phutToiDa ?? x.phutToiDa).map { Int($0.rounded(.down)) }, chu: x.cau)
    } catch let e as LoiApi { return .loi(ma: e.ma ?? "choi_loi", chu: BoMay.cauLoiCon(e)) }
    catch { return .loi(ma: "choi_loi", chu: "\(error)") }
  }

  /// Xin đồng bộ trong ≤ 2 giây (kể cả khi một lượt đồng bộ đang dở — lượt đó sẽ ghi đè syncLuc nên đặt cả syncSom).
  private func dongBoSom() {
    syncLuc = min(syncLuc, donDieu() + 2)
    if dangDongBo { syncSom = min(syncSom ?? .infinity, donDieu() + 2) }
  }

  /// Mất mạng giữa phiên chơi: cộng giây «đang chơi thật» (app của phiên ở tiền cảnh) để gửi bù khi có mạng lại — trong giới hạn
  /// playOfflineMinutes (quá thì gioiHanPhienOffline đã khoá app chơi, không cộng nữa).
  private func demPhutBu(troi: Double, now: Date) {
    guard matMang, let p = policy, let id = p.playSessionId,
          BoMay.gioiHanPhienOffline(p, matMang: true, tu: cauHinh.policyLuc, now: now).playSessionId != nil else { return }
    let tc = cauHinh.uidCon.flatMap { demTienCanh.doc(uid: $0, gio: donDieu()) }
    guard ChoiBangDiem.dangChoi(tienCanh: tc, playApp: p.playApp, playWeb: p.playWeb) else { return }
    if let cu = cauHinh.phienBu, cu.id != id, cu.giay > 0 { return }     // còn phần bù của phiên trước chưa gửi ⇒ không đè
    var bu = cauHinh.phienBu?.id == id ? cauHinh.phienBu! : PhienBu(id: id, muc: p.playApp ?? "", batDau: now, ketThuc: now)
    bu.giay += troi; bu.ketThuc = now
    cauHinh.phienBu = bu
  }

  // MARK: log + sự kiện + lịch sử web lên máy chủ (NhatKyMay.swift, LichSuWeb.swift)

  private let boDemLog: BoDemLog?
  private let docLichSuWeb: Bool
  private var nhatKyLuc: Double = 0
  private var dangGuiNhatKy = false
  private var dauLichSu: String?
  /// Lịch sử web 15 phút một lần (chép tệp History lớn tốn I/O) — log / sự kiện vẫn 5 phút.
  private var lichSuLuc: Double = 0

  private func themSuKien(_ loai: String, _ chiTiet: [String: String] = [:]) {
    var q = cauHinh.hangDoiSuKien
    NhatKyMay.them(&q, SuKienMay(loai: loai, luc: dongHo(), chiTiet: chiTiet.merging(["may": heThong.tenMay()]) { a, _ in a }))
    cauHinh.hangDoiSuKien = q
    _ = try? kho.sua { $0.hangDoiSuKien = q }
  }

  /// Daemon gọi mỗi phút (Task riêng): tới hạn 5 phút + đã ghép + có mạng ⇒ gửi log, sự kiện, lịch sử web. Lỗi thì giữ lại lần sau.
  public func vongNhatKy() async {
    guard cauHinh.daGhep, !dangGo, !matMang, !dangGuiNhatKy, donDieu() >= nhatKyLuc else { return }
    dangGuiNhatKy = true; defer { dangGuiNhatKy = false }
    nhatKyLuc = donDieu() + NhatKyMay.nhipGiay
    if let b = boDemLog {
      for _ in 0..<5 {                                  // tối đa 5 lô (1000 dòng = cả bộ đệm) mỗi lượt — không để tồn đọng rồi rơi dòng
        let lo = b.lo()
        guard let cuoi = lo.last else { break }
        do { try await api.guiNhatKy("log", NhatKyMay.thanLog(lo.map(\.dong))); b.daGui(den: cuoi.so) } catch { break }
      }
    }
    let q = cauHinh.hangDoiSuKien
    if !q.isEmpty {
      do {
        try await api.guiNhatKy("su-kien", NhatKyMay.thanSuKien(q))
        let da = Set(q.prefix(100).map(\.ma))
        cauHinh.hangDoiSuKien.removeAll { da.contains($0.ma) }       // sự kiện thêm trong lúc await vẫn giữ
        let con = cauHinh.hangDoiSuKien
        _ = try? kho.sua { $0.hangDoiSuKien = con }
      } catch {}
    }
    if docLichSuWeb, donDieu() >= lichSuLuc, let tk = cauHinh.uidCon.flatMap({ heThong.taiKhoan(cuaUid: $0) }) ?? (cauHinh.taiKhoanCon.isEmpty ? nil : cauHinh.taiKhoanCon) {
      let ht = heThong, now = dongHo(), cu = dauLichSu, ngay = DemPhut.ngay(now)
      let (ds, dau) = await chayNgoaiActor { () -> ([TongWebNgay]?, String) in
        let nha = FileManager.default.homeDirectory(forUser: tk)?.path ?? "/Users/" + tk
        let tep = LichSuWeb.cacTep(nha: nha, lietKe: ht.lietKeThuMuc)
        // tệp lịch sử (và -wal) không đổi từ lần trước, cùng ngày ⇒ không chép / đọc lại (tệp Chrome có thể hàng trăm MB)
        let dau = ngay + "|" + LichSuWeb.dauTep(tep.chromium + tep.safari)
        if dau == cu { return (nil, dau) }
        let tu = LichSuWeb.mocDoc(now)
        return (LichSuWeb.tongHop(tep.chromium.flatMap { LichSuWeb.docChromium($0, tu: tu) } + tep.safari.flatMap { LichSuWeb.docSafari($0, tu: tu) }), dau)
      }
      if let ds {
        lichSuLuc = donDieu() + 900                     // gửi lỗi cũng giãn 15 phút (không chép lại tệp History lớn mỗi 5 phút)
        do { if !ds.isEmpty { try await api.guiNhatKy("web/lich-su", LichSuWeb.than(ds)) }; dauLichSu = dau } catch {}
      }
    }
  }

  /// Chế độ «chỉ cho phép» (web) mà không ở «chỉ app học»: Safari không lọc được kiểu chỉ-cho-phép (hosts chỉ chặn được danh sách đen) ⇒ đóng
  /// Safari như Windows đóng trình duyệt không lọc được. Phiên chơi trang web đang mở thì thôi (máy chủ đã thả trình duyệt cho phiên đó).
  static func safariKhongLocDuoc(_ ds: [TienTrinh], uidCon: UInt32, p: Policy, now: Date, chiAppHoc: Bool, daCo: Set<Int32>) -> [TienTrinh] {
    guard !chiAppHoc, let web = p.web, web.hetMo(now, moDen: p.grantEndsAt).cheDo == ChinhSachWeb.chiChoPhep else { return [] }
    if p.playWeb && p.playSessionId != nil { return [] }
    return ds.filter { t in
      t.uid == uidCon && !daCo.contains(t.pid)
        && ((t.bundleId ?? "").lowercased() == "com.apple.safari" || (t.duongDanApp ?? "").hasSuffix("/Safari.app"))
    }
  }

  // MARK: mã mở offline

  private func moTamDangMo() -> Bool { cauHinh.moTamOffline?.dangMo(dongHo()) ?? false }

  /// Mất mạng + khoá mà mã gỡ được + máy đã có bí mật ⇒ màn khoá chờ mã (không đếm ngược đăng xuất).
  private func choNhapMaOffline(_ p: Policy, _ hl: PolicyHieuLuc) -> Bool {
    matMang && !(p.maOfflineBiMat ?? "").isEmpty && (hl.khoa ? MoTamOffline.moDuocKhoa(hl.lyDoKhoa) : hl.chiAppHoc)
  }

  /// Con gõ mã Ba Mẹ đọc: đọc – kiểm – ghi trên bản ở đĩa (lượt sai không mất khi daemon khởi động lại). Không cần mạng.
  private func thuMaOffline(_ ma: String) -> TraLoi {
    guard cauHinh.daGhep, !dangGo else { return .loi(ma: "chua_ghep", chu: "Máy chưa ghép với Ba Mẹ.") }
    // Mã chỉ dành cho lúc MẤT MẠNG (có mạng thì Ba Mẹ quyết trong app) — không cho dùng mã để bỏ «chỉ app học» khi đang online.
    guard matMang else { return .loi(ma: "dang_co_mang", chu: "Máy đang có mạng — con xin Ba Mẹ trong app nhé.") }
    let now = dongHo()
    var st = cauHinh.moTamOffline ?? MoTamOffline()
    let kq = st.thuMo(biMat: policy?.maOfflineBiMat, ma: ma, now: now)
    let cau = st.cau(kq, now: now)
    cauHinh.moTamOffline = st                           // bộ nhớ TRƯỚC: ghi đĩa lỗi cũng không xoá được lượt sai (giới hạn dò vẫn tính)
    do { try kho.sua { $0.moTamOffline = st } } catch {
      if kq == .daMo { cauHinh.moTamOffline?.moDen = nil }                  // chưa lưu được thì không mở (khởi động lại sẽ mất)
      return .loi(ma: "luu_loi", chu: "Chưa lưu được, con thử lại nhé.")
    }
    heThong.ghiLog("Mã mở offline: \(kq)")
    if kq == .daMo { themSuKien("mo_ma_offline", ["den": NgayGio.viet(st.moDen ?? now)]) }
    if kq == .sai, st.saiLuc.count == MoTamOffline.saiToiDa { themSuKien("sai_ma_offline", ["soLan": String(st.saiLuc.count)]) }
    switch kq {
    case .daMo, .dangMo: return .thongBao(chu: cau)
    default: return .loi(ma: "ma_offline", chu: cau)
    }
  }

  /// Mốc (đơn điệu) gửi nhịp phiên chơi kế tiếp.
  private var nhipLuc: Double = 0
  private var dangNhip = false
  private var nhipLoiLienTiep = 0
  /// Nhịp phiên chơi bằng điểm đang mở TRÊN MÁY NÀY (Policy.playSessionId): 30 giây một lần, «đang dùng» = Con đang ngồi máy (phiên console
  /// của Con, màn không khoá) VÀ app của phiên (hoặc trình duyệt nếu phiên web) ở tiền cảnh — như Windows 0.2.4. Máy chủ trừ điểm theo phút, hết phút / hết điểm / giờ ngủ ⇒ «ket_thuc» ⇒ đồng bộ ngay để khoá lại app chơi.
  /// Daemon gọi trong Task riêng (main.swift) — mạng treo không làm ngưng vòng áp / vòng đồng bộ.
  public func vongNhipChoi() async {
    guard cauHinh.daGhep, !dangGo, !dangNhip, let id = policy?.playSessionId, donDieu() >= nhipLuc else { return }
    dangNhip = true; defer { dangNhip = false }
    nhipLuc = donDieu() + 30
    do {
      let tienCanh = cauHinh.uidCon.flatMap { demTienCanh.doc(uid: $0, gio: donDieu()) }
      let dung = conDangDung() != nil && ChoiBangDiem.dangChoi(tienCanh: tienCanh, playApp: policy?.playApp, playWeb: policy?.playWeb ?? false)
      let tt = try await api.nhipChoi(id: id, dangDung: dung)
      if tt == "ket_thuc" { dongBoSom(); choiNho = [:] }
      nhipLoiLienTiep = 0
    } catch let e as LoiApi {
      nhipLoiLienTiep += 1
      if !e.laMang { dongBoSom(); nhipLuc = donDieu() + 60 }       // phiên không còn (404/409) ⇒ lấy Policy mới; không bắn lại liên tục
      else { nhipLuc = donDieu() + min(300, 30 * Double(1 << min(nhipLoiLienTiep, 4))) }   // mất mạng: giãn dần tới 5 phút
      if nhipLoiLienTiep == 1 { heThong.ghiLog("Nhịp phiên chơi lỗi (\(e.chu)) — thử lại giãn dần, không ghi tiếp tới khi được.") }
    } catch {}
  }

  // MARK: phụ

  private func tuGo(lenhId: String) async {
    // Lệnh gỡ từ xa: trả quyền admin đã hạ, xoá chính sách web + hosts, xoá cấu hình. KHÔNG tự bootout launchd (gói cài lo).
    dangGo = true                                   // vòng áp chạy song song trong lúc await bên dưới — chặn nó áp lại plist/hosts/đóng app
    // Dấu «máy đã gỡ» TRƯỚC await đầu tiên: installer tự cập nhật vừa giao xong mà postinstall chạy trong lúc chờ máy chủ thì không nạp lại daemon.
    try? heThong.ghiTep(DuongDan.daGo, Data("da-go\n".utf8), quyen: 0o600)
    policy = nil; khoaLuc = nil
    thaWebMoiTaiKhoan()
    for tk in cauHinh.daHaQuyen { heThong.ghiLog("[gỡ] trả lại quyền admin cho \(tk) do go-cai.sh thực hiện.") }
    // Báo máy chủ «đã gỡ xong» TRƯỚC khi xoá token (sau đó token không còn dùng được). Lỗi mạng thì bỏ qua — máy chủ chờ tối đa 7 ngày rồi cho xoá hẳn.
    do { try await api.baoXongLenh(id: lenhId) } catch { heThong.ghiLog("Không báo được «xong lệnh gỡ» (\(error)) — vẫn gỡ tại máy.") }
    // Thả hoàn toàn: xoá token + Policy (cả trong bộ nhớ lẫn đĩa) ⇒ các vòng sau coi như chưa ghép, không áp lại plist/hosts/đóng app.
    _ = try? kho.sua { $0.token = ""; $0.policyCuoi = nil; $0.policyLuc = nil; $0.daDungGiayTuSync = 0 }
    quenDanhSachApp()
    cauHinh = kho.doc() ?? { var c = cauHinh; c.token = ""; c.policyCuoi = nil; return c }()
    api.datPhien(mayChu: cauHinh.mayChu, token: "")
    policy = nil
    khoaLuc = nil
    heThong.ghiLog("Nhận lệnh gỡ từ xa — gỡ chính sách, đã thả hoàn toàn; chạy trình gỡ.")
    dangGo = false                                  // daGhep đã false ⇒ vòng áp tự thả; để ghép lại (không khởi động lại daemon) vẫn chạy được
    heThong.chayTrinhGo()                           // go-cai.sh: trả quyền admin, dọn plist/hosts, gỡ daemon + tray + app (không để daemon/tray mồ côi)
  }

  /// Gỡ luật web của AiiGrow: plist trình duyệt ở MỌI thư mục tài khoản trong Managed Preferences (không chỉ Con) + khối hosts (tuGo, mồ côi).
  private func thaWebMoiTaiKhoan() {
    apChinhSachTrinhDuyet(web: nil)
    for tk in heThong.lietKeThuMuc(tuyChon.thuMucChinhSach) { apChinhSachTrinhDuyet(taiKhoan: tk, web: nil) }
    apHosts(web: nil)
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
    if MoCoi.la(cauHinh, now: dongHo()) { return CheDoAgent.giamSat }    // mồ côi ⇒ giám sát (agent-win CheDoHieuLuc.Chon(…, moCoi))
    // Chế độ Ba Mẹ chọn (Policy.cheDo) thắng chế độ cục bộ; chưa chọn ⇒ giữ cục bộ.
    return CheDoAgent.chuan(policy?.cheDo) ?? cauHinh.cheDo
  }

  // MARK: danh sách app thật + app bị Chặn (DanhSachApp.swift, QuetAppMac.swift)

  private let nguonApp: NguonApp?
  private var tinHieuApp: TinHieuDanhSachApp?
  private var lanQuetApp: Double?
  private var lanThuApp: Double?
  /// 404 ở /ung-dung (máy chủ cũ) ⇒ thôi gửi tới lần khởi động sau.
  private var tatGuiApp = false
  private var viecApp: Task<Void, Never>?
  /// Số lượt gửi hỏng liên tiếp — giãn lịch thử lại.
  private var soLanLoiApp = 0
  /// Máy chủ còn thiếu icon của vài app (gửi bù ở lượt sau).
  private var conThieuIcon = false
  /// «chặn|pid» app bị Chặn đã ghi log (tránh ghi mỗi 5 giây; đổi chặn ⇄ giám sát thì ghi lại).
  private var daBaoBiChan: Set<String> = []

  /// Tiến trình của app bị Ba Mẹ «Chặn» cần đóng (chặn thật) — giám sát thì chỉ ghi log «sẽ đóng», trả [].
  private func appBiChanCanDong(_ ds: [TienTrinh], uidCon: UInt32, p: Policy, chan: Bool, daCo: Set<Int32>) -> [TienTrinh] {
    let khop = DanhSachApp.canDongBiChan(ds, uidCon: uidCon, biChan: p.blockedApps).filter { !daCo.contains($0.0.pid) }
    let dau = { (t: TienTrinh) in "\(chan)|\(t.pid)" }
    for (t, b) in khop where !daBaoBiChan.contains(dau(t)) {
      let team = b.teamId.map { " teamId \($0)" } ?? ""
      heThong.ghiLog("\(chan ? "" : "[giám sát] sẽ đóng ")app Ba Mẹ chặn: \(b.muc)\(team) — \(t.bundleId ?? t.duongDan) pid \(t.pid)")
    }
    daBaoBiChan = Set(khop.map { dau($0.0) })
    return chan ? khop.map(\.0) : []
  }

  /// Gọi sau mỗi lần đồng bộ được: tới lúc (khởi động / 30 phút / yeuCau đổi / bam máy chủ khác) thì quét + gửi trong Task riêng.
  private func kichGuiDanhSachApp() {
    guard nguonApp != nil, !tatGuiApp, viecApp == nil, cauHinh.daGhep, !dangGo,
          DanhSachApp.canQuet(gio: donDieu(), lanQuetCuoi: lanQuetApp, lanThuCuoi: lanThuApp, tinHieu: tinHieuApp,
                              bamDaGui: cauHinh.bamAppDaGui, yeuCauDaXuLy: cauHinh.yeuCauAppDaXuLy, soLanLoi: soLanLoiApp,
                              conThieuIcon: conThieuIcon) else { return }
    lanThuApp = donDieu()
    let the = theHeApp
    viecApp = Task { await self.guiDanhSachApp(the: the); self.xongViecApp(the: the) }
  }

  private func xongViecApp(the: Int) { if the == theHeApp { viecApp = nil } }
  /// Tăng mỗi lần gỡ/ghép lại — lượt gửi của lần ghép cũ về muộn thì không ghi gì.
  private var theHeApp = 0

  /// Gỡ / ghép lại: quên mọi trạng thái gửi (máy chủ coi là máy mới).
  private func quenDanhSachApp() {
    theHeApp += 1; viecApp?.cancel(); viecApp = nil
    lanQuetApp = nil; lanThuApp = nil; tatGuiApp = false; soLanLoiApp = 0; tinHieuApp = nil; conThieuIcon = false
    cauHinh.bamAppDaGui = nil; cauHinh.yeuCauAppDaXuLy = nil
    _ = try? kho.sua { $0.bamAppDaGui = nil; $0.yeuCauAppDaXuLy = nil }
    unlink(SoAppDaGui.duongDan(canh: kho.duongDan))
  }

  /// Chỉ test: chờ lượt quét/gửi đang chạy (nếu có).
  public func choDanhSachApp() async { await viecApp?.value }

  private func guiDanhSachApp(the: Int) async {
    guard let nguon = nguonApp else { return }
    let tk = cauHinh.uidCon.flatMap { heThong.taiKhoan(cuaUid: $0) } ?? (cauHinh.taiKhoanCon.isEmpty ? nil : cauHinh.taiKhoanCon)
    let ban = DanhSachApp.chuan(await chayNgoaiActor { nguon.quet(taiKhoanCon: tk) })
    guard the == theHeApp else { return }                        // gỡ / ghép lại trong lúc quét
    lanQuetApp = donDieu()
    let duongSo = SoAppDaGui.duongDan(canh: kho.duongDan)
    let so = SoAppDaGui.doc(duongSo).flatMap { $0.bam == cauHinh.bamAppDaGui ? $0 : nil }
    let t = tinHieuApp, yeuCauMoi = DanhSachApp.coYeuCauMoi(t, daXuLy: cauHinh.yeuCauAppDaXuLy) ? t?.yeuCau : nil
    let viec = DanhSachApp.quyetDinh(bamMoi: ban.bam, bamDaGui: cauHinh.bamAppDaGui, coBanTruoc: so != nil, tinHieu: t, yeuCauDaXuLy: cauHinh.yeuCauAppDaXuLy)
    // khoa máy chủ còn thiếu icon (chỉ giữ khoa còn trong danh sách và có icon cục bộ)
    let coIcon = Set(ban.ds.filter { $0.icon != nil }.map(\.khoa))
    var thieu = Set(so?.thieuIcon ?? []).intersection(coIcon)
    do {
      switch viec {
      case .khong:
        if cauHinh.bamAppDaGui != ban.bam || so == nil { luuDaGui(ban, yeuCau: nil, thieu: thieu, duongSo: duongSo) }   // máy chủ đã giữ đúng bản này
      case .du, .doi:
        var than: ThanGuiApp
        if viec == .doi {
          let d = DanhSachApp.diff(truoc: so?.bamTung ?? [:], sau: ban)
          than = .doi(bamTruoc: cauHinh.bamAppDaGui ?? "", bam: ban.bam, them: DanhSachApp.themKemIcon(d.them, iconTruoc: so?.iconTung ?? [:]), bo: d.bo)
        } else { than = .du(bam: ban.bam, ds: ban.ds) }
        var kq: KetQuaGuiApp
        do { kq = try await api.guiUngDung(than) }
        catch let e as LoiApi where e.maHttp == 409 && !than.laDu {
          guard the == theHeApp else { return }
          than = .du(bam: ban.bam, ds: ban.ds)                   // máy chủ giữ bản khác bamTruoc ⇒ gửi đủ ngay
          kq = try await api.guiUngDung(than)
        }
        guard the == theHeApp, cauHinh.daGhep, !dangGo else { return }     // bị gỡ / ghép lại trong lúc gửi
        // Máy chủ báo thiếu ⇒ theo đó; không báo ⇒ gửi đủ (không byte icon) coi như thiếu cả, phần đổi coi như đã có.
        thieu = Set(kq.thieuIcon ?? (than.laDu ? Array(coIcon) : Array(thieu))).intersection(coIcon)
        luuDaGui(ban, yeuCau: than.laDu ? yeuCauMoi : nil, thieu: thieu, duongSo: duongSo)
        heThong.ghiLog("Đã gửi danh sách app (\(than.laDu ? "đủ" : "phần đổi"), \(ban.ds.count) app).")
      }
      // Gửi bù icon theo lô (phần đổi không xoá/thêm app, chỉ kèm byte icon).
      for _ in 0..<20 where !thieu.isEmpty {
        let lo = DanhSachApp.loIcon(ban.ds, thieu: thieu)
        guard !lo.isEmpty else { break }
        let kq = try await api.guiUngDung(.doi(bamTruoc: ban.bam, bam: ban.bam, them: lo, bo: []))
        guard the == theHeApp, cauHinh.daGhep, !dangGo else { return }
        let moi = Set(kq.thieuIcon ?? Array(thieu.subtracting(lo.map(\.khoa)))).intersection(coIcon)
        let tienTrien = moi != thieu
        thieu = moi
        luuDaGui(ban, yeuCau: nil, thieu: thieu, duongSo: duongSo)
        if !tienTrien { break }                                 // máy chủ không nhận icon nào nữa ⇒ thôi, lượt sau thử lại
      }
      soLanLoiApp = 0
    } catch _ where the != theHeApp {
      return                                                    // lỗi của lần ghép cũ — không đụng trạng thái mới
    } catch let e as LoiApi where e.maHttp == 404 {
      tatGuiApp = true
      heThong.ghiLog("Máy chủ chưa nhận danh sách app (404) — thôi gửi tới lần khởi động sau.")
    } catch {
      soLanLoiApp += 1
      heThong.ghiLog("Gửi danh sách app lỗi (\(error)) — thử lại lượt sau.")
    }
  }

  private func luuDaGui(_ ban: BanDanhSachApp, yeuCau: String?, thieu: Set<String>, duongSo: String) {
    var icon: [String: String] = [:]
    for a in ban.ds { if let b = a.iconBam { icon[a.khoa] = b } }
    do { try SoAppDaGui(bam: ban.bam, bamTung: ban.bamTung, iconTung: icon, thieuIcon: thieu.sorted()).ghi(duongSo) }
    catch { heThong.ghiLog("Ghi \(duongSo) lỗi: \(error)") }
    conThieuIcon = !thieu.isEmpty
    cauHinh.bamAppDaGui = ban.bam
    if let yeuCau { cauHinh.yeuCauAppDaXuLy = yeuCau }
    let y = cauHinh.yeuCauAppDaXuLy
    _ = try? kho.sua { $0.bamAppDaGui = ban.bam; $0.yeuCauAppDaXuLy = y }
  }

  /// App vừa bị đóng (lần SIGTERM đầu) trong phiên Con ⇒ tray hiện màn «… chưa được mở» (agent-win BlockedForm). Chỉ tính tiến trình thuộc một
  /// .app (tiến trình nền / dòng lệnh thì không); nhiều tiến trình của cùng app trong một vòng = một lần; cùng app trong 15 giây = không báo lại.
  private var chanSeq = 0
  private var chanCuoi: (bundle: String, ten: String, lyDo: String, luc: Double)?
  /// pid đã báo (giữ tới khi pid không còn trong danh sách cần đóng — SIGTERM rồi SIGKILL vẫn là MỘT lần báo).
  private var chanDaBao: Set<Int32> = []
  private func ghiAppVuaChan(can: [TienTrinh], baMeChan: Set<Int32>, chiAppHoc: Bool) {
    let moi = can.filter { !chanDaBao.contains($0.pid) }
    chanDaBao = Set(can.map(\.pid))
    guard let t = moi.first(where: { $0.duongDanApp != nil }), let app = t.duongDanApp else { return }
    let bundle = (t.bundleId ?? "").lowercased()
    let ten = URL(fileURLWithPath: app).deletingPathExtension().lastPathComponent
    let khoa = bundle.isEmpty ? app.lowercased() : bundle
    if let c = chanCuoi, c.bundle == khoa, donDieu() - c.luc < 15 { chanCuoi?.luc = donDieu(); return }
    chanSeq += 1
    themSuKien("chan_app", ["app": khoa, "ten": ten])
    // lý do: Ba Mẹ «Chặn» app · giờ chỉ app học · còn lại = trình duyệt chưa lọc web được (đóng vì luật web, không đổi điểm được)
    chanCuoi = (khoa, ten, baMeChan.contains(t.pid) ? "ba_me_chan" : (chiAppHoc ? "chi_app_hoc" : "trinh_duyet"), donDieu())
  }

  private func trangThai(p: Policy?, hl: PolicyHieuLuc?, laCon: Bool, phutDung: Double?, demNguoc: Int? = nil) -> TrangThai {
    var che = CheDo(rawValue: p?.mode ?? CheDo.tuDo.rawValue) ?? .tuDo
    // chế độ hiển thị theo Policy HIỆU LỰC (mở tạm bằng mã offline gỡ khoá / «chỉ app học») — tray và thực thi không lệch nhau
    if let hl, moTamDangMo(), !hl.khoa, che == .khoa || (che == .hoc && !hl.chiAppHoc) { che = hl.chiAppHoc ? .hoc : .tuDo }
    let chan = (p?.web ?? ChinhSachWeb()).chan
    var tt = TrangThai(
      daGhep: daGhepHieuLuc, laPhienCon: laCon, tenCon: cauHinh.tenCon.isEmpty ? nil : cauHinh.tenCon,
      cheDo: che, lyDoKhoa: LyDoKhoa.choTray(hl?.lyDoKhoa),
      conPhut: phutDung.map { Int($0.rounded(.down)) },
      moDen: hl?.moDen, khoaDen: nil, demNguocGiay: demNguoc,
      yeuCauCho: [], duocDoiDiem: p?.canExchangePoints ?? false,
      matMang: matMang, trangChan: cheDoHieuLuc() == CheDoAgent.chan ? chan : [], canhBaoAdmin: canhBaoAdmin)
    if laCon {                                         // phần riêng của Con (danh sách chơi, app vừa chặn) chỉ cho phiên Con
      tt.dsChoi = p?.playChoices ?? []
      if moTamDangMo() { tt.moOfflineDen = cauHinh.moTamOffline?.moDen }
      tt.nhapMaOffline = p.flatMap { pp in hl.map { choNhapMaOffline(pp, $0) } } ?? false
      let homNay = DemPhut.ngay(dongHo()) + "|"
      tt.homNayTheoApp = cauHinh.demPhut.compactMap { k, giay in
        k.hasPrefix(homNay) && giay >= 60 && !k.hasSuffix("|" + DemPhut.khongRo) ? MucDung(muc: String(k.dropFirst(homNay.count)), phut: Int(giay / 60), day: String(homNay.dropLast())) : nil
      }.sorted { $0.phut != $1.phut ? $0.phut > $1.phut : $0.muc < $1.muc }
      tt.chanSeq = chanSeq
      if let c = chanCuoi { tt.chanApp = c.bundle; tt.chanTen = c.ten; tt.chanLyDo = c.lyDo }
    }
    return tt
  }
}

private extension Double { var clamped0: Double { Swift.max(0, self) } }
