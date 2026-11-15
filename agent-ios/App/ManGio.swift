// Sao & xin (docs/thiet-ke-chot/con-dt-xin · con-dt-gio · con-dt-chan · con-dt-cai/02; 15/11 #262–#267): xin Ba Mẹ cho vay sao → con đang xin
// (Ba Mẹ cho vay / chưa cho; mất mạng: đã lưu lời xin); xin mở app ngoài danh sách (đã thêm / chưa thêm); mở bằng mã khi mất mạng; lọc web DNS;
// danh sách app (Tính phút / Không tính phút). Bỏ: đổi sao lấy giờ, xin thêm giờ, ngoại lệ.
import SwiftUI
import FamilyControls
import ConCore

// MARK: Xin Ba Mẹ cho vay sao (cdt-ios-xin-them, 15/11 #263 #265) — thay «xin thêm giờ» / «ngoại lệ» / «đổi sao lấy giờ» (1 sao = 1 phút)
struct ManXinThem: View {
  @EnvironmentObject var m: MoHinhApp
  @Environment(\.dismiss) var dong
  @State var soSao = 15
  @State var loiNhan = ""
  let goiY = ["Con làm nốt bài với bạn ạ", "Con làm xong bài tập rồi ạ", "Con xem nốt video học"]

  var body: some View {
    KhungMan {
      DauMan(tieuDe: "Xin Ba Mẹ cho vay sao", lui: { dong() })
      VStack(spacing: 4) {
        ChipSao(so: m.soSao)
        Text(m.hetSao ? "Hết sao rồi" : "Còn \(m.conPhut) sao").font(Diu.chu(26, .black)).foregroundColor(Diu.chu)
        Text("\(m.conPhut) sao = \(m.conPhut) phút").font(Diu.t2).foregroundColor(Diu.chu2)
        if m.daDung > 0 { Text("Hôm nay chơi \(m.daDung) phút · −\(m.daDung) sao").font(Diu.t2).foregroundColor(Diu.chu3) }
        if m.soNo > 0 { DongNo(no: m.soNo).padding(.top, 4) }
      }
      .frame(maxWidth: .infinity).theDiu(chinh: true)
      Text("Con xin vay").font(Diu.t1).foregroundColor(Diu.chu2).frame(maxWidth: .infinity, alignment: .leading)
      HStack(spacing: 8) {
        ForEach(m.mucVay, id: \.self) { n in
          Button { soSao = n } label: {
            Text("\(n) sao").font(Diu.chu(16, .heavy)).foregroundColor(soSao == n ? .white : Diu.chu)
              .frame(maxWidth: .infinity, minHeight: 48)
              .background(Capsule().fill(soSao == n ? Diu.xanh : .white)).overlay(Capsule().stroke(soSao == n ? .clear : Diu.vien, lineWidth: 1))
          }
          .buttonStyle(.plain).accessibilityAddTraits(soSao == n ? .isSelected : [])
        }
      }
      Text("= \(soSao) phút chơi hoặc đổi quà · con sẽ nợ \(m.soNo + soSao) sao").font(Diu.t2).foregroundColor(Diu.chu2)
        .frame(maxWidth: .infinity, alignment: .leading)
      VStack(alignment: .leading, spacing: 8) {
        Text("Nhắn Ba Mẹ").font(Diu.t1).foregroundColor(Diu.chu2)
        TextField("Tự viết… (không bắt buộc)", text: $loiNhan).font(Diu.chu(16, .semibold)).padding(.horizontal, 14).frame(minHeight: 48)
          .background(RoundedRectangle(cornerRadius: 16).fill(.white)).overlay(RoundedRectangle(cornerRadius: 16).stroke(Diu.vien, lineWidth: 1))
        ScrollView(.horizontal, showsIndicators: false) {
          HStack(spacing: 8) { ForEach(goiY, id: \.self) { g in
            Button(g) { loiNhan = g }.font(Diu.chu(14, .heavy)).foregroundColor(Diu.chu2).padding(.horizontal, 12).frame(minHeight: 40)
              .background(Capsule().fill(.white)).overlay(Capsule().stroke(Diu.vien, lineWidth: 1))
          } }
        }
      }
      HangDs(icon: "ic_canh_bao", t1: "Sao vay là nợ", t2: "Sao nhiệm vụ trả nợ trước").theDiu(dem: 12)
      if let l = m.loi { Text(l).font(Diu.t2).foregroundColor(Diu.doChu) }
      Button { Task { if await m.xinVay(soSao: soSao, loiNhan: loiNhan) != nil { m.manPhu = .conDangXin } } } label: {
        if m.dangBan { ProgressView().tint(.white) }
        else { Label { Text("Xin Ba Mẹ cho vay \(soSao) sao" + (m.matMang ? " · gửi khi có mạng" : "")) } icon: { Anh(ten: "ic_gui", co: 26) } }
      }
      .buttonStyle(NutDiu()).disabled(m.dangBan)
      Button("Xin mở app ›") { m.manPhu = .xinCai }.buttonStyle(NutDiu(kieu: .lk))
    }
    .onAppear { m.loi = nil; if !m.mucVay.contains(soSao) { soSao = m.mucVay.contains(m.vayMacDinh) ? m.vayMacDinh : (m.mucVay.first ?? 15) } }
  }
}

// MARK: Con đang xin + kết quả (cdt-yeu-cau · them-0p8dmjan · them-5nxwuaxz · them-j4g2mtm8 · them-w8po32o6 · them-qpj5mdyr)
struct ManConDangXin: View {
  @EnvironmentObject var m: MoHinhApp
  @Environment(\.dismiss) var dong
  var body: some View {
    KhungMan {
      if let x = m.xinCho { luuCho(x) }
      else if let yc = m.yeuCau, yc.xong { if yc.laApp { ketQuaApp(yc) } else { ketQuaVay(yc) } }
      else { dangCho }
    }
    .refreshable { await m.dongBoNgay() }
  }

  static func tieuDe(_ y: YeuCauCho) -> String {
    switch y.loai {
    case "vay_sao", "them_gio", "ngoai_le", "ngoai_gio": return "Vay \(y.phut ?? 0) sao"
    default: return "Mở \(y.gia_tri ?? "app")"
    }
  }

  var dangCho: some View {
    VStack(spacing: 14) {
      DauMan(tieuDe: "Con đang xin", lui: { dong() })
      Anh(ten: "rob_cho", co: 110)
      Text("Đã gửi Ba Mẹ!").font(Diu.chu(22, .black)).foregroundColor(Diu.chu)
      Text("Ba Mẹ trả lời là máy báo con ngay.").font(Diu.t2).foregroundColor(Diu.chu2)
      VStack(spacing: 0) {
        ForEach(m.yeuCauCho) { y in
          let vay = ["vay_sao", "them_gio", "ngoai_le", "ngoai_gio"].contains(y.loai)
          HangDs(icon: vay ? "ic_sao" : "ic_web", t1: Self.tieuDe(y),
                 t2: "Gửi lúc \(y.created_at.flatMap(NgayISO.doc)?.gioPhut ?? "") · ⏳ Đang chờ")
        }
        if m.yeuCauCho.isEmpty, let yc = m.yeuCau { HangDs(icon: yc.laApp ? "ic_web" : "ic_sao", t1: yc.tieuDe, t2: "Gửi lúc \(yc.guiLuc.gioPhut) · ⏳ Đang chờ") }
      }
      .theDiu(dem: 14)
      Button { m.tab = .homNay; dong() } label: { Text("Về trang chính · còn \(Diu.soSao(m.soSao))") }.buttonStyle(NutDiu())
      Button("Trong lúc chờ: làm nhiệm vụ kiếm sao ›") { m.tab = .nhiemVu; dong() }.buttonStyle(NutDiu(kieu: .lk))
    }
  }

  @ViewBuilder func loiNhanBaMe(_ yc: YeuCauDangCho) -> some View {
    if let l = yc.loiNhanBaMe, !l.isEmpty {
      HStack(alignment: .top, spacing: 10) {
        AvatarBe(ten: yc.nguoi, co: 36, mau: Diu.xanh)
        VStack(alignment: .leading, spacing: 2) {
          Text(yc.nguoi).font(Diu.t1).foregroundColor(Diu.chu)
          Text("«\(l)»").font(Diu.chu(16, .bold)).foregroundColor(Diu.chu)
        }
        Spacer(minLength: 0)
      }
      .theDiu(dem: 12)
    }
  }

  func ketQuaVay(_ yc: YeuCauDangCho) -> some View {
    VStack(spacing: 14) {
      Anh(ten: yc.duoc ? "rob_xong" : "rob_trong_loi", co: 120)
      Text(yc.duoc ? "\(yc.nguoi) cho vay \(yc.soSao) sao!" : "\(yc.nguoi) chưa cho vay sao lúc này.").font(Diu.tieuDe).foregroundColor(Diu.chu)
        .multilineTextAlignment(.center)
      if !yc.duoc { Text("Con làm nhiệm vụ kiếm sao nhé!").font(Diu.phu).foregroundColor(Diu.chu2) }
      HangDs(icon: "ic_sao", t1: "Vay \(yc.soSao) sao", t2: yc.duoc ? "= \(yc.soSao) phút chơi hoặc đổi quà" : "Trả lời lúc \(yc.guiLuc.gioPhut)",
             phai: AnyView(NhanNho(chu: yc.duoc ? "✓ Đã nhận" : "Chưa cho", mau: yc.duoc ? Diu.xanhDam : Diu.chu2, nen: yc.duoc ? Diu.xanhNhat : .white))).theDiu(dem: 12)
      if yc.duoc && m.soNo > 0 {
        HStack { DongNo(no: m.soNo); Spacer(minLength: 0); ChipSao(so: m.soSao) }
      }
      loiNhanBaMe(yc)
      if yc.duoc {
        Button { dong() } label: { Label { Text("Chơi \(max(m.conPhut, 0)) phút") } icon: { Anh(ten: "ic_game", co: 26) } }.buttonStyle(NutDiu())
        Button("Cảm ơn \(yc.nguoi) ›") { m.tab = .homNay; dong() }.buttonStyle(NutDiu(kieu: .lk))
      } else {
        Button { m.manPhu = .xinThem } label: { Label { Text("Xin lại") } icon: { Anh(ten: "ic_gui", co: 26) } }.buttonStyle(NutDiu())
        Button("Về trang chính") { m.tab = .homNay; dong() }.buttonStyle(NutDiu(kieu: .phu))
        Button("Làm nhiệm vụ kiếm sao") { m.tab = .nhiemVu; dong() }.buttonStyle(NutDiu(kieu: .lk))
      }
    }
  }

  func ketQuaApp(_ yc: YeuCauDangCho) -> some View {
    let ten = yc.ten ?? "app"
    let daThem = yc.ketQua == "da_them" || (yc.ketQua == nil && yc.duoc)
    let tinhPhut = yc.nhom != "khong_tinh_phut"
    return VStack(spacing: 14) {
      if daThem || yc.ketQua == "mo_tam" {
        Anh(ten: "rob_xong", co: 120)
        Text(daThem ? "\(yc.nguoi) đã thêm \(ten)!" : "\(yc.nguoi) cho mở \(ten)!").font(Diu.tieuDe).foregroundColor(Diu.chu).multilineTextAlignment(.center)
        HangDs(icon: "ic_web", t1: ten, t2: daThem ? "Đã vào danh sách · lần sau không cần xin" : "Mở lần này",
               phai: AnyView(NhanNho(chu: "✓ Đã thêm", mau: Diu.xanhDam, nen: Diu.xanhNhat))).theDiu(dem: 12)
        if daThem {
          HangDs(icon: tinhPhut ? "ic_dongho" : "ic_sach", t1: tinhPhut ? "Nhóm «Tính phút»" : "Nhóm «Không tính phút»",
                 t2: tinhPhut ? "1 sao = 1 phút · còn \(m.conPhut) sao = \(m.conPhut) phút chơi" : "Vào thoải mái, không trừ sao").theDiu(dem: 12)
        }
        loiNhanBaMe(yc)
        Button { dong() } label: { Label { Text(tinhPhut && daThem ? "Mở \(ten) · còn \(m.conPhut) phút" : "Mở \(ten)") } icon: { Anh(ten: "ic_game", co: 26) } }.buttonStyle(NutDiu())
        Button("Cảm ơn \(yc.nguoi) ›") { m.tab = .homNay; dong() }.buttonStyle(NutDiu(kieu: .lk))
      } else {
        Anh(ten: "rob_trong_loi", co: 120)
        Text("\(yc.nguoi) chưa thêm \(ten)").font(Diu.tieuDe).foregroundColor(Diu.chu).multilineTextAlignment(.center)
        Text("\(yc.nguoi) chưa thêm \(ten) vào danh sách. Con xin lại được nhé.").font(Diu.phu).foregroundColor(Diu.chu2).multilineTextAlignment(.center)
        loiNhanBaMe(yc)
        Button { m.manPhu = .xinCai } label: { Label { Text("Xin lại") } icon: { Anh(ten: "ic_gui", co: 26) } }.buttonStyle(NutDiu())
        Button("Về trang chính") { m.tab = .homNay; dong() }.buttonStyle(NutDiu(kieu: .lk))
      }
    }
  }

  func luuCho(_ x: YeuCauDangCho) -> some View {
    VStack(spacing: 14) {
      Text("Đã lưu lời xin").font(Diu.tieuDe).foregroundColor(Diu.chu)
      Anh(ten: "rob_nghi", co: 110)
      Text("Có mạng là gửi Ba Mẹ ngay!").font(Diu.phu).foregroundColor(Diu.chu2)
      HangDs(icon: "ic_sao", t1: "Vay \(x.phut) sao", t2: "Lưu lúc \(x.guiLuc.gioPhut) · ⏳ Chờ có mạng").theDiu(dem: 12)
      if m.coBiMatOffline { Button { m.manPhu = .maOffline } label: { Label { Text("Ba Mẹ ở cạnh? Nhập mã") } icon: { Anh(ten: "ic_khoa", co: 26) } }.buttonStyle(NutDiu()) }
      Button { Task { await m.dongBoNgay() } } label: { Label { Text("Thử kết nối lại") } icon: { Anh(ten: "ic_wifi", co: 26) } }.buttonStyle(NutDiu(kieu: .phu))
    }
  }
}

// MARK: Xin cài / mở app (cdt-cai · them-4e5fwl16) — iOS không biết app nào đang bị khiên ⇒ con gõ tên
struct ManXinCai: View {
  @EnvironmentObject var m: MoHinhApp
  @Environment(\.dismiss) var dong
  @State var ten = ""
  @State var muc = ""
  @State var lyDo = ""
  @State var daGui = false
  var body: some View {
    KhungMan {
      DauMan(tieuDe: daGui ? "Đã gửi Ba Mẹ" : "Xin Ba Mẹ mở app", lui: { dong() })
      if daGui {
        Anh(ten: "rob_cho", co: 110)
        Text("Ba Mẹ trả lời là máy báo con ngay.").font(Diu.phu).foregroundColor(Diu.chu2)
        Button("Xem lời xin") { m.manPhu = .conDangXin }.buttonStyle(NutDiu())
        Button("Về trang chính") { dong() }.buttonStyle(NutDiu(kieu: .lk))
      } else {
        // cdt-cai (15/11, #262): app ngoài danh sách của Ba Mẹ
        HStack { NhanNho(chu: "Theo danh sách của Ba Mẹ", icon: "ic_khien"); Spacer() }
        VStack(alignment: .leading, spacing: 8) {
          Text("App con muốn dùng").font(Diu.t1).foregroundColor(Diu.chu2)
          TextField("Ví dụ: Minecraft", text: $ten).font(Diu.chu(18, .heavy)).padding(.horizontal, 14).frame(minHeight: 52)
            .background(RoundedRectangle(cornerRadius: 16).fill(.white)).overlay(RoundedRectangle(cornerRadius: 16).stroke(Diu.vien, lineWidth: 1))
          Text("Con muốn cài để làm gì?").font(Diu.t1).foregroundColor(Diu.chu2).padding(.top, 6)
          HStack(spacing: 8) {
            ForEach(["Học", "Chơi với bạn", "Xem video"], id: \.self) { x in
              Button { muc = x } label: {
                Text(x).font(Diu.chu(15, .heavy)).foregroundColor(muc == x ? .white : Diu.chu).frame(maxWidth: .infinity, minHeight: 44)
                  .background(Capsule().fill(muc == x ? Diu.xanh : .white)).overlay(Capsule().stroke(muc == x ? .clear : Diu.vien, lineWidth: 1))
              }.buttonStyle(.plain)
            }
          }
          TextField("Kể Ba Mẹ nghe (không bắt buộc)", text: $lyDo).font(Diu.chu(16, .semibold)).padding(.horizontal, 14).frame(minHeight: 48)
            .background(RoundedRectangle(cornerRadius: 16).fill(.white)).overlay(RoundedRectangle(cornerRadius: 16).stroke(Diu.vien, lineWidth: 1))
        }
        HangDs(icon: "ic_dongho", t1: "Nếu Ba Mẹ thêm vào danh sách", t2: "«Tính phút»: trừ sao · còn \(m.conPhut) sao = \(m.conPhut) phút").theDiu(dem: 12)
        if let l = m.loi { Text(l).font(Diu.t2).foregroundColor(Diu.doChu) }
        Button { Task { daGui = await m.xinCaiApp(ten: ten, lyDo: [muc, lyDo].filter { !$0.isEmpty }.joined(separator: " — ")) } } label: {
          if m.dangBan { ProgressView().tint(.white) } else { Label { Text("Gửi Ba Mẹ xin cài \(ten.isEmpty ? "app" : ten)") } icon: { Anh(ten: "ic_gui", co: 26) } }
        }
        .buttonStyle(NutDiu()).disabled(ten.trimmingCharacters(in: .whitespaces).isEmpty || m.dangBan)
        Button("Thôi, để sau") { dong() }.buttonStyle(NutDiu(kieu: .lk))
      }
    }
    .onAppear { m.loi = nil; if m.demo != nil { ten = "Minecraft"; muc = "Học" } }
  }
}

// MARK: Mở bằng mã khi mất mạng (cdt-ios-ma-offline · them-a16j4hh8 · cdt-ma-da-mo)
struct ManMaOffline: View {
  @EnvironmentObject var m: MoHinhApp
  @Environment(\.dismiss) var dong
  @State var ma = ""
  @State var kq: KetQuaMoOffline?
  @State var cau = ""
  var body: some View {
    KhungMan {
      if kq == .daMo { daMo } else { nhap }
    }
    .onAppear { if m.demo == "maSai" { ma = "731902"; kq = .sai; cau = "Mã chưa đúng" } }
  }

  var nhap: some View {
    VStack(spacing: 14) {
      DauMan(tieuDe: "App đang khoá", lui: { dong() })
      HStack(spacing: 8) {
        NhanNho(chu: m.khien?.lyDo == .hetGio ? "Hết sao · 0 sao = 0 phút" : (m.khien?.lyDo.cauChoCon.components(separatedBy: ".").first ?? "Đang khoá"), icon: "ic_dongho")
        if m.matMang { NhanNho(chu: "Mất mạng", icon: "ic_wifi") }
        Spacer(minLength: 0)
      }
      if kq == .sai || kq == .choThuLai || kq == .daDung {
        Anh(ten: "rob_trong_loi", co: 90)
        Text(kq == .sai ? "Mã chưa đúng" : cau).font(Diu.chu(22, .black)).foregroundColor(Diu.chu).multilineTextAlignment(.center)
        Text(kq == .sai ? "Con nhờ Ba Mẹ đọc lại 6 số nhé." : "Nhờ Ba Mẹ đọc mã mới trong AiiGrow.").font(Diu.t2).foregroundColor(Diu.chu2)
        if kq == .sai { NhanNho(chu: "Còn \(max(0, MoTamOffline.saiToiDa - m.saiMaOffline)) lần thử") }
      } else {
        Text("Ba Mẹ ở cạnh con? Nhờ Ba Mẹ đọc mã 6 số trong AiiGrow.").font(Diu.phu).foregroundColor(Diu.chu2).multilineTextAlignment(.center)
      }
      OSo(so: ma, dai: 6, loi: kq == .sai)
      BanPhimSo(so: $ma, toiDa: 6).onChange(of: ma) { v in if kq == .sai, !v.isEmpty { kq = nil } }
      Button {
        let r = m.moBangMa(ma); kq = r.0; cau = r.1; if r.0 != .daMo { ma = "" }
      } label: { Label { Text("Mở tạm \(m.phutMoOffline) phút bằng mã") } icon: { Anh(ten: "ic_mo_khoa", co: 26) } }
      .buttonStyle(NutDiu()).disabled(ma.count != 6)
      if m.khien?.lyDo == .hetGio {
        Button(m.matMang ? "Xin Ba Mẹ cho vay sao · gửi khi có mạng" : "Xin Ba Mẹ cho vay sao") { m.manPhu = .xinThem }.buttonStyle(NutDiu(kieu: .lk))
      }
      DongQuanLy(ten: m.tenCon)
    }
  }

  var daMo: some View {
    VStack(spacing: 14) {
      Anh(ten: "rob_xong", co: 120)
      Text("Máy mở rồi!").font(Diu.tieuDe).foregroundColor(Diu.chu)
      Text("Mã của Ba Mẹ mở tạm \(m.phutMoOffline) phút · không trừ sao").font(Diu.phu).foregroundColor(Diu.chu2).multilineTextAlignment(.center)
      if let den = m.moOfflineDen { HangDs(icon: "ic_dongho", t1: "Chơi tới \(den.gioPhut)", t2: "Hết \(m.phutMoOffline) phút máy khoá lại").theDiu(dem: 12) }
      HangDs(icon: "ic_wifi", t1: "Có mạng lại, AiiGrow báo Ba Mẹ.").theDiu(dem: 12)
      if let n = m.keHoach?.ngu { HangDs(icon: "ic_trang_ngu", t1: "Đi ngủ lúc \(n.tu) nhé.").theDiu(dem: 12) }
      Button { dong() } label: { Label { Text("Chơi \(m.phutMoOffline) phút") } icon: { Anh(ten: "ic_game", co: 26) } }.buttonStyle(NutDiu())
    }
  }
}

// MARK: Lọc web cho iPhone (cdt-ios-dns)
struct ManDns: View {
  @EnvironmentObject var m: MoHinhApp
  @Environment(\.dismiss) var dong
  var body: some View {
    KhungMan {
      DauMan(tieuDe: "Lọc web cho iPhone", lui: { dong() })
      OIcon(ten: "ic_khien", co: 88, nen: .white)
      HStack { NhanNho(chu: "Dành cho Ba Mẹ", icon: "ic_nguoi"); Spacer() }
      Text("Làm một lần, khoảng 1 phút").font(Diu.phu).foregroundColor(Diu.chu2).frame(maxWidth: .infinity, alignment: .leading)
      VStack(alignment: .leading, spacing: 14) {
        BuocSo(i: 1, t1: "Bấm «Tải bộ lọc», chọn Cho phép")
        BuocSo(i: 2, t1: "Mở Cài đặt › Đã tải về hồ sơ › Cài đặt", t2: "Ba Mẹ tự gõ mật mã máy.")
        BuocSo(i: 3, t1: "Xong!", t2: "Trang Ba Mẹ chặn sẽ chặn cả khi dùng 4G.")
      }
      .theDiu()
      Text("Gỡ: Cài đặt › Cài đặt chung › VPN & Quản lý thiết bị").font(Diu.t2).foregroundColor(Diu.chu3)
      if let l = m.loi { Text(l).font(Diu.t2).foregroundColor(Diu.doChu) }
      Button { Task { await m.caiHoSoDns() } } label: {
        if m.dangBan { ProgressView().tint(.white) } else { Label { Text("Tải bộ lọc web gia đình") } icon: { Anh(ten: "ic_tai", co: 26) } }
      }
      .buttonStyle(NutDiu()).disabled(m.dangBan)
    }
    .onAppear { m.loi = nil }
  }
}

// MARK: Ba Mẹ chọn app (FamilyActivityPicker — token mờ, lưu trên máy)
struct ManChonApp: View {
  @EnvironmentObject var m: MoHinhApp
  @Environment(\.dismiss) var dong
  @State var nhan: NhanApp = .giaiTri
  @State var chon = FamilyActivitySelection()
  var body: some View {
    VStack(spacing: 12) {
      DauMan(tieuDe: "Danh sách app của con", lui: { dong() })
      Picker("Nhóm", selection: $nhan) { ForEach(NhanApp.dangDung) { Text($0.ten).tag($0) } }
        .pickerStyle(.segmented).frame(minHeight: 44)
      Text(nhan.moTa).font(Diu.t2).foregroundColor(Diu.chu2)
      Text("Tính phút: \(m.soLuong.giaiTri) app · Không tính phút: \(m.soLuong.hoc) app · chọn từng app (app ngoài danh sách không mở)")
        .font(Diu.t2).foregroundColor(Diu.chu3)
      FamilyActivityPicker(selection: $chon)
      Button("Lưu nhóm «\(nhan.ten)»") { m.luuChon(chon, nhan) }.buttonStyle(NutDiu())
    }
    .padding(16)
    .onAppear { chon = m.luaChon.doc(nhan) }
    .onChange(of: nhan) { chon = m.luaChon.doc($0) }
  }
}
