// Màn hằng ngày của Con ngay trong app iOS (bản «Dịu», 06/11 — L16) — cổng `/api/device/hoc-vien/*` (Bearer = token máy; máy dùng chung
// tự lấy bé đang đăng nhập — docs/API.md mục «S3»; chưa ai vào ⇒ 409 chua_chon_con):
//   GET  hoc-vien/tong-quan  → TongQuanCon (sao, quỹ giờ, nhiệm vụ, lượt gần đây, lời khen, quà đang giữ)
//   GET  hoc-vien/quy        → {quy, sao, phutDoiDuoc, yeuCauCho[]}       · POST hoc-vien/doi-sao {phut} → {phut, sao, soDu, conPhut}
//   POST hoc-vien/nhiem-vu/:id/bat-dau → {luot}                            · POST hoc-vien/luot/:id/nop {anh?, ghiAm?, ghiChu?} → {trangThai}
//   GET  hoc-vien/cua-hang   → {sao, saoGiu, qua[]}                        · POST hoc-vien/doi/:id → {phieu, trangThai, saoGiu}
//   GET  hoc-vien/vi-qua     → {daTrao[], voucher[], phieu[]}               · GET hoc-vien/tin?sau= → {ds[], bay}
//   POST hoc-vien/loi-khen/:id/phan-hoi {phanHoi}                           · POST xin-duyet {muc, ten?, lyDo?} (xin cài / mở app)
// Mọi trường máy chủ có thể thiếu ⇒ optional; app không vỡ khi máy chủ cũ / mới thêm trường.
import Foundation

public struct QuyCon: Codable, Equatable {
  public struct Khung2: Codable, Equatable { public var tu: String; public var den: String }
  public struct GioHoc2: Codable, Equatable {
    public var tu: String; public var den: String; public var thu: [Int]?
    public init(tu: String, den: String, thu: [Int]?) { self.tu = tu; self.den = den; self.thu = thu }
  }
  public struct TyLe: Codable, Equatable { public var sao: Int; public var phut: Int }
  public struct DoiSao: Codable, Equatable { public var bat: Bool; public var toiDaNgay: Int?; public var conDoiDuoc: Int? }
  public var conPhut: Int
  public var daDung: Int
  public var tongPhut: Int
  public var quyNgayPhut: Int?
  public var themPhut: Int?
  public var dangNgu: Bool?
  public var dangHoc: Bool?
  public var khoa: Bool?
  public var gioNgu: Khung2?
  public var gioHoc: GioHoc2?
  public var tyLe: TyLe?
  public var doiSao: DoiSao?
  public var choXinThem: Bool?
  public init(conPhut: Int, daDung: Int, tongPhut: Int) { self.conPhut = conPhut; self.daDung = daDung; self.tongPhut = tongPhut }
  /// Số phút 10 sao đổi được.
  public var phut10Sao: Int { tyLe.map { max(1, $0.phut * 10 / max(1, $0.sao)) } ?? 10 }
}

public struct NhiemVuCon: Codable, Equatable, Identifiable {
  public var id: String
  public var ten: String
  public var moTa: String?
  public var sao: Int?
  public var diem: Int?
  /// anh | ghi_am | viet | van_ban | xong | tu_cham | tu_dong
  public var bangChung: String?
  public var han: String?
  public var phutToiThieu: Int?
  /// san_sang | dang_lam | can_bo_sung | du_hom_nay | du_tuan
  public var trangThai: String?
  public var luot: String?
  public var dangCho: Bool?
  public var lyDo: String?
  public var hinh: String?
  public var gioNhac: String?
  public var lamLai: Bool?
  public var loiNhan: String?
  public var bo: String?
  public var soSao: Int { sao ?? diem ?? 0 }
  public var choDuyet: Bool { dangCho == true }
  public var canLamLai: Bool { lamLai == true || trangThai == "can_bo_sung" }
  /// Cách nộp: anh | ghi_am | viet | xong | tu_cham.
  public var cachNop: String {
    switch bangChung ?? "anh" {
    case "van_ban", "viet": return "viet"
    case "ghi_am": return "ghi_am"
    case "xong", "khong": return "xong"
    case "tu_cham", "tu_dong": return "tu_cham"
    default: return "anh"
    }
  }
}

public struct LuotGan: Codable, Equatable, Identifiable {
  public var id: String; public var ten: String; public var trangThai: String; public var diem: Int?; public var lyDo: String?; public var loiKhen: String?; public var luc: String?
}

public struct LoiKhenCon: Codable, Equatable, Identifiable {
  public var id: String; public var noiDung: String; public var phanHoi: String?; public var luc: String?
}

public struct PhieuGiu: Codable, Equatable, Identifiable {
  public var id: String; public var ten: String; public var diem: Int; public var luc: String?
}

public struct TongQuanCon: Codable, Equatable {
  public struct Con: Codable, Equatable { public var id: String; public var ten: String }
  public var con: Con?
  public var sao: Int?
  public var soDu: Int?
  public var saoChoDuyet: Int?
  public var diemChoDuyet: Int?
  public var quy: QuyCon?
  public var nhiemVu: [NhiemVuCon]
  public var gan: [LuotGan]?
  public var loiKhen: [LoiKhenCon]?
  public var phieuCho: [PhieuGiu]?
  public var soSao: Int { sao ?? soDu ?? 0 }
  public var soSaoCho: Int { saoChoDuyet ?? diemChoDuyet ?? 0 }
  public var saoGiu: Int { (phieuCho ?? []).reduce(0) { $0 + $1.diem } }
}

public struct QuaCuaHang: Codable, Equatable, Identifiable {
  public var id: String
  public var ten: String
  public var loai: String?
  public var sao: Int?
  public var diem: Int?
  public var menhGia: Int?
  public var chiCuoiTuan: Bool?
  public var du: Bool?
  public var conThieu: Int?
  public var choTraoTu: String?
  public var moTa: String?
  public var hinh: String?
  public var tonKho: Int?
  public var gia: Int { sao ?? diem ?? 0 }
  public var laVoucher: Bool { loai == "voucher" }
}

public struct CuaHangCon: Codable, Equatable {
  public var sao: Int?
  public var soDu: Int?
  public var saoGiu: Int?
  public var qua: [QuaCuaHang]
  public var soSao: Int { sao ?? soDu ?? 0 }
}

public struct KetQuaDoiQua: Codable, Equatable { public var phieu: String?; public var trangThai: String?; public var saoGiu: Int? }

public struct ViQuaCon: Codable, Equatable {
  public struct DaTrao: Codable, Equatable, Identifiable { public var id: String; public var ten: String; public var loai: String?; public var diem: Int? }
  public struct Voucher: Codable, Equatable { public var ma: String; public var menh_gia: Int?; public var trang_thai: String?; public var het_han: String?; public var ten: String?; public var qr: String?; public var conNgay: Int? }
  public struct Phieu: Codable, Equatable, Identifiable { public var id: String; public var ten: String; public var loai: String?; public var diem: Int; public var trang_thai: String? }
  public var daTrao: [DaTrao]?
  public var voucher: [Voucher]?
  public var phieu: [Phieu]?
}

public struct YeuCauCho: Codable, Equatable, Identifiable {
  public var id: String; public var loai: String; public var phut: Int?; public var gia_tri: String?; public var pham_vi: String?; public var ly_do: String?; public var created_at: String?
}

public struct QuyDayDu: Codable, Equatable {
  public var quy: QuyCon
  public var sao: Int?
  public var phutDoiDuoc: Int?
  public var yeuCauCho: [YeuCauCho]?
}

public struct KetQuaDoiSao: Codable, Equatable {
  public var phut: Int; public var sao: Int?; public var soDu: Int?; public var conPhut: Int?
  public init(phut: Int, sao: Int?, soDu: Int?, conPhut: Int?) { self.phut = phut; self.sao = sao; self.soDu = soDu; self.conPhut = conPhut }
}

public struct TinCon: Codable, Equatable, Identifiable {
  public var id: String; public var loai: String; public var tieu: String; public var noi: String?; public var luc: String?
}
public struct DsTin: Codable, Equatable { public var ds: [TinCon]; public var bay: String? }

/// Tệp đính kèm bài nộp (ảnh JPEG / ghi âm m4a) — base64 khi gửi.
public struct TepNop: Codable, Equatable {
  public var mime: String
  public var base64: String
  public init(mime: String, duLieu: Data) { self.mime = mime; self.base64 = duLieu.base64EncodedString() }
}

public struct KetQuaDangNhapBe: Codable, Equatable {
  public struct Con: Codable, Equatable { public var id: String; public var ten: String; public var avatar: String? }
  public var phienCon: String?
  public var con: Con
  public var coPin: Bool
  public var canDatPin: Bool?
}
public struct KetQuaBaMeMoMay: Codable, Equatable {
  public struct Dung: Codable, Equatable { public var den: String; public var tu: String? }
  public var baMeDung: Dung; public var phut: Int
}

extension ApiClient {
  struct Ok: Decodable {}

  // ---- S3: máy dùng chung
  public func hoSoMay() async throws -> HoSoMay { try await goi("GET", "api/device/ho-so", nil, HoSoMay.self) }
  public func dangNhapBe(con: String, pin: String?) async throws -> KetQuaDangNhapBe {
    var b: [String: Any] = ["con": con]
    if let pin { b["pin"] = pin }
    return try await goiChiTiet("POST", "api/device/dang-nhap-be", Self.json(b), KetQuaDangNhapBe.self)
  }
  public func quenPin(con: String) async throws -> Bool {
    struct R: Decodable { var lapLai: Bool? }
    return try await goi("POST", "api/device/quen-pin", Self.json(["con": con]), R.self).lapLai ?? false
  }
  public func baMeMo(ma: String) async throws -> KetQuaBaMeMoMay {
    try await goiChiTiet("POST", "api/device/ba-me-mo", Self.json(["ma": ma.filter(\.isNumber)]), KetQuaBaMeMoMay.self)
  }
  public func roiMay(baMe: Bool) async throws {
    _ = try await goi("POST", baMe ? "api/device/khoa-lai" : "api/device/dang-xuat", Self.json([:]), Ok.self)
  }

  // ---- hằng ngày
  public func tongQuan() async throws -> TongQuanCon { try await goi("GET", "api/device/hoc-vien/tong-quan", nil, TongQuanCon.self) }
  public func quyCon() async throws -> QuyDayDu { try await goi("GET", "api/device/hoc-vien/quy", nil, QuyDayDu.self) }
  public func doiSao(phut: Int) async throws -> KetQuaDoiSao {
    try await goi("POST", "api/device/hoc-vien/doi-sao", Self.json(["phut": phut]), KetQuaDoiSao.self)
  }
  public func batDau(nhiemVu id: String) async throws -> String {
    struct R: Decodable { var luot: String }
    return try await goi("POST", "api/device/hoc-vien/nhiem-vu/\(id)/bat-dau", Self.json([:]), R.self).luot
  }
  public func nop(luot: String, anh: [TepNop], ghiAm: TepNop?, ghiChu: String?) async throws -> String {
    struct R: Decodable { var trangThai: String? }
    var b: [String: Any] = [:]
    if !anh.isEmpty { b["anh"] = anh.map { ["mime": $0.mime, "base64": $0.base64] } }
    if let ghiAm { b["ghiAm"] = ["mime": ghiAm.mime, "base64": ghiAm.base64] }
    if let ghiChu, !ghiChu.isEmpty { b["ghiChu"] = ghiChu }
    return try await goi("POST", "api/device/hoc-vien/luot/\(luot)/nop", Self.json(b), R.self).trangThai ?? "cho_duyet"
  }
  public func cuaHang() async throws -> CuaHangCon { try await goi("GET", "api/device/hoc-vien/cua-hang", nil, CuaHangCon.self) }
  public func doiQua(_ id: String) async throws -> KetQuaDoiQua { try await goi("POST", "api/device/hoc-vien/doi/\(id)", Self.json([:]), KetQuaDoiQua.self) }
  public func viQua() async throws -> ViQuaCon { try await goi("GET", "api/device/hoc-vien/vi-qua", nil, ViQuaCon.self) }
  /// Tin 7 ngày gần nhất (không gửi `sau` — app mở là đọc lại cả hộp, lọc trùng theo id).
  public func tin() async throws -> DsTin { try await goi("GET", "api/device/hoc-vien/tin", nil, DsTin.self) }
  public func phanHoi(loiKhen id: String, _ noi: String) async throws {
    _ = try await goi("POST", "api/device/hoc-vien/loi-khen/\(id)/phan-hoi", Self.json(["phanHoi": String(noi.prefix(60))]), Ok.self)
  }
  /// «Xin Ba Mẹ cài / mở app» — iOS không biết app nào đang bị khiên (token mờ) ⇒ Con gõ tên app.
  public func xinDuyet(ten: String, lyDo: String?) async throws {
    var b: [String: Any] = ["muc": ten, "ten": ten]
    if let lyDo, !lyDo.isEmpty { b["lyDo"] = String(lyDo.prefix(100)) }
    _ = try await goi("POST", "api/device/xin-duyet", Self.json(b), Ok.self)
  }
}
