// PIN theo bé (L13, 06/11 — docs/API.md mục «S3»): máy khoá → chọn tên → PIN 4 số; sai 5 lần chờ 15 giây; «Quên PIN» báo Ba Mẹ;
// «Ba Mẹ nhập mã» (mã mở máy của chính máy này, 15 / 30 / 60 phút) ⇒ «Ba Mẹ đang dùng máy»; «Đổi bé / Đăng xuất» ⇒ máy về màn chọn tên.
//   GET  api/device/ho-so                 → HoSoMay (danh sách bé + vanPin để kiểm PIN khi MẤT MẠNG)
//   POST api/device/dang-nhap-be {con, pin?} → {phienCon, con, coPin, canDatPin?} · 401 pin_sai {conLan} · 429 pin_tam_khoa {choGiay}
//   POST api/device/quen-pin {con}         → {daGui, lapLai}
//   POST api/device/ba-me-mo {ma}          → {baMeDung: {den, tu}, phut} · 401 ma_sai {conLan} · 429 ma_tam_khoa {choGiay} · 409 ma_da_dung
//   POST api/device/dang-xuat | khoa-lai   → {ok, khoa}
// Mất mạng: PIN kiểm bằng vân HMAC-SHA256(bí mật mã offline, "<id bé>:<PIN>") (server/lib/pin-be.ts › vanPin), tự đếm 5 lần / 15 giây;
// mã Ba Mẹ kiểm bằng TOTP (MaOffline.kiemPhut). Việc làm lúc mất mạng (đăng nhập / đăng xuất) xếp hàng, phát lại ở lượt đồng bộ kế.
import Foundation
import CryptoKit

/// Một bé trong «Ai đang dùng máy?».
public struct BeTrenMay: Codable, Equatable, Identifiable {
  public var id: String
  public var ten: String
  public var avatar: String?
  public var coPin: Bool
  public var vanPin: String?
  public var khoaDen: String?
  public var choGiay: Int?
  public init(id: String, ten: String, avatar: String? = nil, coPin: Bool, vanPin: String? = nil) {
    self.id = id; self.ten = ten; self.avatar = avatar; self.coPin = coPin; self.vanPin = vanPin
  }
  /// Chữ cái đầu cho avatar tròn (thiết kế: «Bảo Anh» ⇒ «B»).
  public var chuDau: String { String(ten.trimmingCharacters(in: .whitespaces).prefix(1)).uppercased() }
}

public struct HoSoMay: Codable, Equatable {
  public struct DangDung: Codable, Equatable { public var id: String; public var ten: String; public var avatar: String?; public var tu: String? }
  public struct BaMeDung: Codable, Equatable { public var den: String; public var tu: String? }
  public var con: [BeTrenMay]
  public var mayRieng: Bool
  public var dangDung: DangDung?
  public var baMeDung: BaMeDung?
  public var pinSaiToiDa: Int?
  public var pinChoGiay: Int?
  public init(con: [BeTrenMay], mayRieng: Bool) { self.con = con; self.mayRieng = mayRieng }
}

/// `nguoiDung` trong phản hồi nhip / dong-bo: con | ba_me | chua (máy dùng chung chưa ai vào ⇒ màn chọn tên).
public struct NguoiDungMay: Codable, Equatable {
  public struct Con: Codable, Equatable { public var id: String; public var ten: String; public var coPin: Bool? }
  public var loai: String
  public var con: Con?
  public var den: String?
}

/// Ai đang dùng máy — app + extension đọc (app group). `luc` = lúc biết.
public struct PhienMay: Codable, Equatable {
  public enum Loai: String, Codable { case con, baMe = "ba_me", chua }
  public var loai: Loai
  public var conId: String?
  public var ten: String?
  public var baMeDen: Date?
  public var luc: Date
  public init(loai: Loai, conId: String? = nil, ten: String? = nil, baMeDen: Date? = nil, luc: Date) {
    self.loai = loai; self.conId = conId; self.ten = ten; self.baMeDen = baMeDen; self.luc = luc
  }

  /// Từ `nguoiDung` máy chủ (nil = máy chủ cũ ⇒ không biết, giữ nguyên).
  public static func tu(_ n: NguoiDungMay?, now: Date) -> PhienMay? {
    guard let n else { return nil }
    switch n.loai {
    case "con": return PhienMay(loai: .con, conId: n.con?.id, ten: n.con?.ten, luc: now)
    case "ba_me": return PhienMay(loai: .baMe, baMeDen: NgayISO.doc(n.den), luc: now)
    case "chua": return PhienMay(loai: .chua, luc: now)
    default: return nil
    }
  }

  /// Máy đang khoá chờ chọn tên lúc `now`: chưa ai vào, hoặc Ba Mẹ dùng đã hết hạn (agent tự khoá, không chờ mạng).
  public func khoa(_ now: Date) -> Bool {
    switch loai {
    case .chua: return true
    case .baMe: return (baMeDen ?? .distantPast) <= now
    case .con: return false
    }
  }
  public func baMeDangDung(_ now: Date) -> Bool { loai == .baMe && (baMeDen ?? .distantPast) > now }
}

/// Bộ đếm sai tại máy (khi mất mạng): sai `toiDa` lần ⇒ chờ `choGiay`; hết chờ đếm lại; lần sai cũ hơn 15 phút không cộng dồn (như máy chủ).
public struct DemSai: Codable, Equatable {
  public var lan = 0
  public var cuoi: Date?
  public var khoaDen: Date?
  public init() {}

  public func giayCho(_ now: Date) -> Int {
    guard let d = khoaDen, d > now else { return 0 }
    return max(1, Int(ceil(d.timeIntervalSince(now))))
  }

  /// Ghi một lần sai ⇒ số lần còn thử (0 = vừa bị khoá chờ).
  public mutating func ghiSai(_ now: Date, toiDa: Int, choGiay: Int) -> Int {
    if let d = khoaDen, d <= now { lan = 0; khoaDen = nil }
    if let c = cuoi, now.timeIntervalSince(c) > 15 * 60 { lan = 0 }
    lan += 1; cuoi = now
    if lan >= toiDa { khoaDen = now.addingTimeInterval(TimeInterval(choGiay)); lan = 0; return 0 }
    return toiDa - lan
  }
  public mutating func xoa() { lan = 0; cuoi = nil; khoaDen = nil }
}

public enum PinOffline {
  /// Vân PIN — cùng số với máy chủ `vanPin` (HMAC-SHA256 hex, khoá = bí mật mã offline của máy).
  public static func van(biMat: String, con: String, pin: String) -> String {
    HMAC<SHA256>.authenticationCode(for: Data("\(con):\(pin)".utf8), using: SymmetricKey(data: Data(biMat.utf8)))
      .map { String(format: "%02x", $0) }.joined()
  }
  /// So hằng thời gian.
  public static func kiem(biMat: String?, be: BeTrenMay, pin: String) -> Bool {
    guard let biMat, !biMat.isEmpty, let mong = be.vanPin, pin.count == 4, pin.allSatisfy(\.isNumber) else { return false }
    let a = Array(van(biMat: biMat, con: be.id, pin: pin).utf8), b = Array(mong.lowercased().utf8)
    guard a.count == b.count else { return false }
    var khac: UInt8 = 0
    for i in 0..<a.count { khac |= a[i] ^ b[i] }
    return khac == 0
  }
}

public enum KetQuaVaoMay: Equatable {
  /// `canDatPin`: bé chưa có PIN — vào thẳng, máy nhắc Ba Mẹ đặt.
  case vao(PhienMay, canDatPin: Bool, offline: Bool)
  case sai(conLan: Int)
  case tamKhoa(choGiay: Int)
  case loi(String)
}

public enum KetQuaBaMeMo: Equatable {
  case mo(den: Date, phut: Int, offline: Bool)
  case sai(conLan: Int)
  case tamKhoa(choGiay: Int)
  case daDung
  case loi(String)
}

/// Việc làm lúc mất mạng, phát lại khi có mạng (trước nhip).
public struct ViecChoMang: Codable, Equatable {
  public var loai: String   // dang_nhap | dang_xuat
  public var con: String?
  public var pin: String?
  public var luc: Date
}

/// Điều phối vào máy (online trước, mất mạng thì kiểm tại máy). Không giữ trạng thái — đọc / ghi kho (app group).
public final class VaoMay {
  public static let saiToiDa = 5
  public static let choGiay = 15
  let api: ApiClient
  let kho: KhoGiaTri
  let biMat: () -> String?

  public init(api: ApiClient, kho: KhoGiaTri, biMat: @escaping () -> String?) { self.api = api; self.kho = kho; self.biMat = biMat }

  public var phien: PhienMay? { kho.doc(PhienMay.self, Khoa.phienMay) }
  public var hoSoNho: HoSoMay? { kho.doc(HoSoMay.self, Khoa.hoSoMay) }

  /// Danh sách bé: có mạng ⇒ hỏi máy chủ + nhớ; mất mạng ⇒ bản đã nhớ.
  public func taiHoSo() async -> (HoSoMay?, offline: Bool) {
    do {
      let h = try await api.hoSoMay()
      kho.luu(h, Khoa.hoSoMay)
      return (h, false)
    } catch { return (hoSoNho, true) }
  }

  func demSai(_ khoa: String) -> DemSai { (kho.doc([String: DemSai].self, Khoa.demSai) ?? [:])[khoa] ?? DemSai() }
  func luuDem(_ khoa: String, _ d: DemSai) {
    var ds = kho.doc([String: DemSai].self, Khoa.demSai) ?? [:]
    ds[khoa] = d
    kho.luu(ds, Khoa.demSai)
  }

  func datPhien(_ p: PhienMay) { kho.luu(p, Khoa.phienMay) }
  func xepViec(_ v: ViecChoMang) {
    var ds = (kho.doc([ViecChoMang].self, Khoa.viecChoMang) ?? []).filter { $0.loai != "dang_nhap" && $0.loai != "dang_xuat" }
    ds.append(v)
    kho.luu(ds, Khoa.viecChoMang)
  }

  /// Bé chạm tên (+ PIN). `pin` nil = bé chưa có PIN.
  public func dangNhap(_ be: BeTrenMay, pin: String?, now: Date = Date()) async -> KetQuaVaoMay {
    let khoaDem = "pin:\(be.id)"
    do {
      let r = try await api.dangNhapBe(con: be.id, pin: pin)
      var d = demSai(khoaDem); d.xoa(); luuDem(khoaDem, d)
      let p = PhienMay(loai: .con, conId: r.con.id, ten: r.con.ten, luc: now)
      datPhien(p)
      kho.luu(nil as [ViecChoMang]?, Khoa.viecChoMang)
      return .vao(p, canDatPin: r.canDatPin == true || !r.coPin, offline: false)
    } catch LoiApi.chiTiet(let ma, let cau, _, let conLan, let choGiay) {
      switch ma {
      case "pin_sai": return .sai(conLan: conLan ?? 0)
      case "pin_tam_khoa": return .tamKhoa(choGiay: choGiay ?? Self.choGiay)
      default: return .loi(cau)
      }
    } catch LoiApi.mang {
      // MẤT MẠNG: kiểm PIN bằng vân đã nhớ
      var d = demSai(khoaDem)
      let cho = d.giayCho(now)
      if cho > 0 { return .tamKhoa(choGiay: cho) }
      let beNho = hoSoNho?.con.first { $0.id == be.id } ?? be
      if beNho.coPin {
        guard let pin, PinOffline.kiem(biMat: biMat(), be: beNho, pin: pin) else {
          if beNho.vanPin == nil || biMat() == nil { return .loi("Máy chưa nhớ PIN của con. Cần nối mạng một lần đã nhé.") }
          let con = d.ghiSai(now, toiDa: Self.saiToiDa, choGiay: Self.choGiay)
          luuDem(khoaDem, d)
          return con == 0 ? .tamKhoa(choGiay: Self.choGiay) : .sai(conLan: con)
        }
      }
      d.xoa(); luuDem(khoaDem, d)
      let p = PhienMay(loai: .con, conId: be.id, ten: be.ten, luc: now)
      datPhien(p)
      xepViec(ViecChoMang(loai: "dang_nhap", con: be.id, pin: pin, luc: now))
      return .vao(p, canDatPin: !beNho.coPin, offline: true)
    } catch { return .loi((error as? LoiApi)?.errorDescription ?? "Chưa vào được. Thử lại nhé.") }
  }

  /// «Báo Ba Mẹ giúp con». → lapLai (đã báo trước đó).
  public func quenPin(_ be: BeTrenMay) async throws -> Bool { try await api.quenPin(con: be.id) }

  /// «Ba Mẹ nhập mã» — có mạng hỏi máy chủ; mất mạng kiểm TOTP tại máy (mỗi mã một lượt, sai 5 lần chờ 10 phút).
  public func baMeMo(_ ma: String, now: Date = Date()) async -> KetQuaBaMeMo {
    do {
      let r = try await api.baMeMo(ma: ma)
      let den = NgayISO.doc(r.baMeDung.den) ?? now.addingTimeInterval(TimeInterval(r.phut * 60))
      datPhien(PhienMay(loai: .baMe, baMeDen: den, luc: now))
      return .mo(den: den, phut: r.phut, offline: false)
    } catch LoiApi.chiTiet(let ma, let cau, _, let conLan, let choGiay) {
      switch ma {
      case "ma_sai": return .sai(conLan: conLan ?? 0)
      case "ma_tam_khoa": return .tamKhoa(choGiay: choGiay ?? 600)
      case "ma_da_dung": return .daDung
      default: return .loi(cau)
      }
    } catch LoiApi.mang {
      var mt = kho.doc(MoTamOffline.self, Khoa.moTamOffline) ?? MoTamOffline()
      let kq = mt.thuMo(biMat: biMat(), ma: ma, now: now)
      kho.luu(mt, Khoa.moTamOffline)
      switch kq {
      case .daMo:
        let den = mt.moDen ?? now
        datPhien(PhienMay(loai: .baMe, baMeDen: den, luc: now))
        kho.xepSuKien(SuKienMay(loai: "mo_ma_offline", luc: now, chiTiet: ["den": NgayISO.viet(den), "phut": String(mt.phutMo ?? 60), "ba_me": "1"]))
        return .mo(den: den, phut: mt.phutMo ?? 60, offline: true)
      case .dangMo, .daDung: return .daDung
      case .choThuLai: return .tamKhoa(choGiay: mt.giayCho(now))
      case .chuaCoBiMat: return .loi("Máy chưa nhận được mã của Ba Mẹ. Cần nối mạng một lần đã nhé.")
      case .sai: return .sai(conLan: max(0, MoTamOffline.saiToiDa - mt.saiLuc.count))
      }
    } catch { return .loi((error as? LoiApi)?.errorDescription ?? "Chưa mở được. Thử lại nhé.") }
  }

  /// «Đổi bé / Đăng xuất» (bé) hoặc «Khoá lại» (Ba Mẹ). Máy về màn chọn tên ngay, kể cả khi mất mạng.
  public func roiMay(baMe: Bool = false, now: Date = Date()) async {
    datPhien(PhienMay(loai: .chua, luc: now))
    if var mt = kho.doc(MoTamOffline.self, Khoa.moTamOffline), mt.dangMo(now) {   // Ba Mẹ mở bằng mã lúc mất mạng ⇒ «Khoá lại» kết thúc lượt mở
      mt.moDen = now; kho.luu(mt, Khoa.moTamOffline)
    }
    do { try await api.roiMay(baMe: baMe) }
    catch { xepViec(ViecChoMang(loai: "dang_xuat", luc: now)) }
  }

  /// Phát lại việc làm lúc mất mạng (DongBo gọi trước nhip). Lỗi mạng ⇒ giữ lại; máy chủ từ chối (PIN đã đổi…) ⇒ bỏ, máy khoá lại.
  public func phatLai(now: Date = Date()) async {
    guard let ds = kho.doc([ViecChoMang].self, Khoa.viecChoMang), let v = ds.last else { return }
    do {
      if v.loai == "dang_xuat" { try await api.roiMay(baMe: false) }
      else if let con = v.con { _ = try await api.dangNhapBe(con: con, pin: v.pin) }
      kho.luu(nil as [ViecChoMang]?, Khoa.viecChoMang)
    } catch LoiApi.mang {
    } catch {
      kho.luu(nil as [ViecChoMang]?, Khoa.viecChoMang)
      if v.loai == "dang_nhap" { datPhien(PhienMay(loai: .chua, luc: now)) }
    }
  }
}
