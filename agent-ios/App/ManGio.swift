// Giờ chơi & xin (docs/thiet-ke-chot/con-dt-xin · con-dt-gio · con-dt-chan · con-dt-cai/02): đổi sao lấy phút → đã đổi; xin thêm giờ /
// ngoại lệ → con đang xin (Ba Mẹ cho / chưa cho; mất mạng: đã lưu lời xin); xin cài app; mở bằng mã khi mất mạng; lọc web DNS; Ba Mẹ chọn app.
import SwiftUI
import FamilyControls
import ConCore

// MARK: Đổi sao lấy giờ (cdt-ios-choi-diem · them-4atwdaqy · them-bw8y2ta0)
struct ManDoiSao: View {
  @EnvironmentObject var m: MoHinhApp
  @Environment(\.dismiss) var dong
  @State var phut = 10
  @State var ketQua: KetQuaDoiSao?
  @State var loi: String?
  var saoCan: Int { Int((Double(phut) * 10 / Double(max(1, m.phut10Sao))).rounded(.up)) }
  var buoc: Int { m.phut10Sao }
  var toiDa: Int { m.tq?.quy?.doiSao?.conDoiDuoc ?? 60 }

  var body: some View {
    KhungMan {
      if let r = ketQua { daDoi(r) } else { chon }
    }
    .onAppear { phut = m.phut10Sao }
  }

  var chon: some View {
    let du = m.soSao >= saoCan
    return VStack(spacing: 14) {
      DauMan(tieuDe: "Đổi sao lấy giờ", lui: { dong() })
      VStack(spacing: 6) {
        Anh(ten: "ic_sao", co: 56)
        Text("Con đang có \(m.soSao) sao").font(Diu.chu(22, .black)).foregroundColor(Diu.chu)
        Text("10 sao = \(m.phut10Sao) phút").font(Diu.t2).foregroundColor(Diu.chu2)
      }
      .frame(maxWidth: .infinity).theDiu(chinh: true)
      Text("Con đổi").font(Diu.t1).foregroundColor(Diu.chu2)
      HStack(spacing: 16) {
        nutSo("minus") { phut = max(buoc, phut - buoc) }.disabled(phut <= buoc)
        VStack(spacing: 0) {
          Text("\(phut) phút").font(Diu.chu(30, .black)).foregroundColor(Diu.chu)
          Text("cần \(saoCan) sao").font(Diu.t2).foregroundColor(du ? Diu.chu2 : Diu.doChu)
        }
        .frame(minWidth: 140)
        nutSo("plus") { phut = min(max(buoc, toiDa), phut + buoc) }.disabled(phut + buoc > toiDa)
      }
      if du {
        HangDs(icon: "ic_dongho", t1: "Còn \(m.soSao - saoCan) sao · giờ chơi thành \(m.conPhut + phut) phút").theDiu(dem: 12)
      } else {
        HangDs(icon: "ic_canh_bao", t1: "Chưa đủ sao · còn thiếu \(saoCan - m.soSao) sao").theDiu(dem: 12)
      }
      if let loi { Text(loi).font(Diu.t2).foregroundColor(Diu.doChu).multilineTextAlignment(.center) }
      if du {
        Button { Task { await doi() } } label: {
          if m.dangBan { ProgressView().tint(.white) } else { Label { Text("Đổi \(saoCan) sao lấy \(phut) phút") } icon: { Anh(ten: "ic_sao", co: 26) } }
        }
        .buttonStyle(NutDiu()).disabled(m.dangBan || m.matMang)
        Button("Làm nhiệm vụ kiếm thêm sao ›") { m.tab = .nhiemVu; dong() }.buttonStyle(NutDiu(kieu: .lk))
      } else {
        Button { m.tab = .nhiemVu; dong() } label: { Label { Text("Làm nhiệm vụ kiếm sao") } icon: { Anh(ten: "ic_tick", co: 26) } }.buttonStyle(NutDiu())
        if m.soSao >= 10 {
          Button { phut = m.soSao / 10 * m.phut10Sao } label: { Text("Đổi \(m.soSao / 10 * 10) sao lấy \(m.soSao / 10 * m.phut10Sao) phút") }.buttonStyle(NutDiu(kieu: .phu))
        }
        Button("Xin Ba Mẹ thêm giờ ›") { m.manPhu = .xinThem }.buttonStyle(NutDiu(kieu: .lk))
      }
      if m.matMang { Text("Đổi sao cần có mạng.").font(Diu.t2).foregroundColor(Diu.chu3) }
    }
  }

  func nutSo(_ ic: String, _ lam: @escaping () -> Void) -> some View {
    Button(action: lam) {
      Image(systemName: ic).font(.system(size: 22, weight: .heavy)).foregroundColor(Diu.chu)
        .frame(width: 56, height: 56).background(Circle().fill(.white)).overlay(Circle().stroke(Diu.vien, lineWidth: 1))
    }
    .buttonStyle(.plain).accessibilityLabel(ic == "plus" ? "Thêm \(buoc) phút" : "Bớt \(buoc) phút")
  }

  func doi() async {
    loi = nil
    let truoc = m.conPhut
    switch await m.doiSao(phut: phut) {
    case .success(let r): ketQua = KetQuaDoiSao(phut: r.phut, sao: r.sao ?? saoCan, soDu: r.soDu, conPhut: r.conPhut ?? truoc + r.phut); conTruoc = truoc
    case .failure(let e): loi = e.errorDescription
    }
  }
  @State var conTruoc = 0

  func daDoi(_ r: KetQuaDoiSao) -> some View {
    VStack(spacing: 14) {
      NhanNho(chu: "−\(r.sao ?? saoCan) sao", icon: "ic_sao", mau: Diu.saoChu, nen: Diu.saoNen)
      Anh(ten: "rob_xong", co: 120)
      Text("+\(r.phut) phút chơi!").font(Diu.tieuDe).foregroundColor(Diu.chu)
      VongGio(con: r.conPhut ?? (conTruoc + r.phut), tong: max(1, m.tongPhut, r.conPhut ?? 0), co: 150)
      Text("Giờ chơi còn lại \(conTruoc) → \(r.conPhut ?? conTruoc + r.phut) phút").font(Diu.t1).foregroundColor(Diu.chu)
      Text("Đổi xong ngay, không cần chờ Ba Mẹ.").font(Diu.t2).foregroundColor(Diu.chu2)
      Button { dong() } label: { Label { Text("Chơi ngay") } icon: { Anh(ten: "ic_game", co: 26) } }.buttonStyle(NutDiu())
      Button("Về Hôm nay") { m.tab = .homNay; dong() }.buttonStyle(NutDiu(kieu: .lk))
    }
  }
}

// MARK: Xin thêm giờ / ngoại lệ (cdt-ios-xin-them · cdt-xin-phep)
struct ManXinThem: View {
  @EnvironmentObject var m: MoHinhApp
  @Environment(\.dismiss) var dong
  @State var phut = 20
  @State var loiNhan = ""
  let goiY = ["Con làm nốt bài với bạn ạ", "Con làm xong bài tập rồi ạ", "Con xem nốt video học"]
  var chips: [Int] { m.chiNgoaiLe ? [15, 30, 60] : [10, 20, 30] }

  var body: some View {
    KhungMan {
      DauMan(tieuDe: m.chiNgoaiLe ? "Xin Ba Mẹ mở máy" : "Xin thêm giờ", lui: { dong() })
      if !m.chiNgoaiLe {
        VStack(spacing: 4) {
          Text("\(m.conPhut) phút").font(Diu.chu(34, .black)).foregroundColor(Diu.chu)
          Text("Giờ chơi còn lại").font(Diu.t2).foregroundColor(Diu.chu2)
          Text("Đã chơi \(m.daDung) / \(m.tongPhut) phút").font(Diu.t2).foregroundColor(Diu.chu3)
        }
        .frame(maxWidth: .infinity).theDiu(chinh: true)
      } else {
        HangDs(icon: "ic_khoa", t1: m.khien?.lyDo.cauChoCon ?? "", t2: "Không trừ giờ chơi, không trừ sao").theDiu(dem: 12)
      }
      Text(m.chiNgoaiLe ? "Con xin mở" : "Con xin thêm").font(Diu.t1).foregroundColor(Diu.chu2).frame(maxWidth: .infinity, alignment: .leading)
      HStack(spacing: 8) {
        ForEach(chips, id: \.self) { p in
          Button { phut = p } label: {
            Text("\(p) phút").font(Diu.chu(16, .heavy)).foregroundColor(phut == p ? .white : Diu.chu)
              .frame(maxWidth: .infinity, minHeight: 48)
              .background(Capsule().fill(phut == p ? Diu.xanh : .white)).overlay(Capsule().stroke(phut == p ? .clear : Diu.vien, lineWidth: 1))
          }
          .buttonStyle(.plain).accessibilityAddTraits(phut == p ? .isSelected : [])
        }
      }
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
      if !m.chiNgoaiLe && m.soSao >= 10 && m.tq?.quy?.doiSao?.bat != false && !m.matMang {
        HStack {
          ChipSao(so: m.soSao, chu: "sao")
          Text("Đổi ngay, không cần chờ").font(Diu.t2).foregroundColor(Diu.chu2)
          Spacer(minLength: 0)
          Button("Đổi sao") { m.manPhu = .doiSao }.font(Diu.chu(15, .heavy)).foregroundColor(Diu.xanhDam).frame(minHeight: 44)
        }
        .theDiu(dem: 12)
      }
      if let l = m.loi { Text(l).font(Diu.t2).foregroundColor(Diu.doChu) }
      Button { Task { if await m.xin(phut: phut, loiNhan: loiNhan, ngoaiLe: m.chiNgoaiLe) != nil { m.manPhu = .conDangXin } } } label: {
        if m.dangBan { ProgressView().tint(.white) }
        else { Label { Text((m.chiNgoaiLe ? "Xin Ba Mẹ mở \(phut) phút" : "Xin Ba Mẹ thêm \(phut) phút") + (m.matMang ? " · gửi khi có mạng" : "")) } icon: { Anh(ten: "ic_gui", co: 26) } }
      }
      .buttonStyle(NutDiu()).disabled(m.dangBan)
      Button("Xin mở app ›") { m.manPhu = .xinCai }.buttonStyle(NutDiu(kieu: .lk))
    }
    .onAppear { m.loi = nil; if !chips.contains(phut) { phut = chips[1] } }
  }
}

// MARK: Con đang xin (cdt-yeu-cau · them-0p8dmjan · them-5nxwuaxz · them-qpj5mdyr)
struct ManConDangXin: View {
  @EnvironmentObject var m: MoHinhApp
  @Environment(\.dismiss) var dong
  var body: some View {
    KhungMan {
      if let x = m.xinCho { luuCho(x) }
      else if let yc = m.yeuCau, yc.xong { ketQua(yc) }
      else { dangCho }
    }
    .refreshable { await m.dongBoNgay() }
  }

  var dangCho: some View {
    VStack(spacing: 14) {
      DauMan(tieuDe: "Con đang xin", lui: { dong() })
      Anh(ten: "rob_cho", co: 110)
      Text("Đã gửi Ba Mẹ!").font(Diu.chu(22, .black)).foregroundColor(Diu.chu)
      Text("Ba Mẹ trả lời là máy báo con ngay.").font(Diu.t2).foregroundColor(Diu.chu2)
      VStack(spacing: 0) {
        ForEach(m.yeuCauCho) { y in
          HangDs(icon: y.loai == "them_gio" ? "ic_dongho" : y.loai == "ngoai_le" ? "ic_mo_khoa" : "ic_web",
                 t1: y.loai == "them_gio" ? "Thêm \(y.phut ?? 0) phút" : "\(y.gia_tri ?? "Mở máy") \(y.phut.map { "\($0) phút" } ?? "")",
                 t2: "Gửi lúc \(y.created_at.flatMap(NgayISO.doc)?.gioPhut ?? "") · ⏳ Đang chờ")
        }
        if m.yeuCauCho.isEmpty, let yc = m.yeuCau { HangDs(icon: "ic_dongho", t1: "Thêm \(yc.phut) phút", t2: "Gửi lúc \(yc.guiLuc.gioPhut) · ⏳ Đang chờ") }
      }
      .theDiu(dem: 14)
      if !m.chiNgoaiLe && m.conPhut > 0 {
        Button { dong() } label: { Label { Text("Chơi tiếp \(m.conPhut) phút còn lại") } icon: { Anh(ten: "ic_game", co: 26) } }.buttonStyle(NutDiu())
      }
      if !m.chiNgoaiLe { Button("Không muốn chờ? Đổi sao lấy giờ ›") { m.manPhu = .doiSao }.buttonStyle(NutDiu(kieu: .lk)) }
    }
  }

  func ketQua(_ yc: YeuCauDangCho) -> some View {
    let duoc = ["duoc", "dong_y", "da_thuc_thi", "tu_duyet"].contains(yc.trangThai)
    return VStack(spacing: 14) {
      Anh(ten: duoc ? "rob_xong" : "rob_trong_loi", co: 120)
      Text(duoc ? "Ba Mẹ cho rồi!" : "Ba Mẹ chưa cho").font(Diu.tieuDe).foregroundColor(Diu.chu)
      HangDs(icon: "ic_dongho", t1: "Thêm \(yc.phut) phút", t2: duoc ? "Giờ chơi → \(m.conPhut) phút" : "Lần này chưa được",
             phai: AnyView(NhanNho(chu: duoc ? "+\(yc.phut) phút" : "Chưa cho", mau: duoc ? Diu.xanhDam : Diu.chu2, nen: duoc ? Diu.xanhNhat : .white))).theDiu(dem: 12)
      if duoc {
        Button { dong() } label: { Label { Text("Chơi \(m.conPhut) phút") } icon: { Anh(ten: "ic_game", co: 26) } }.buttonStyle(NutDiu())
      } else {
        Button { m.tab = .nhiemVu; dong() } label: { Label { Text("Làm nhiệm vụ kiếm sao") } icon: { Anh(ten: "ic_tick", co: 26) } }.buttonStyle(NutDiu())
      }
      Button("Về trang chính") { m.tab = .homNay; dong() }.buttonStyle(NutDiu(kieu: .lk))
    }
  }

  func luuCho(_ x: YeuCauDangCho) -> some View {
    VStack(spacing: 14) {
      Text("Đã lưu lời xin").font(Diu.tieuDe).foregroundColor(Diu.chu)
      Anh(ten: "rob_nghi", co: 110)
      Text("Có mạng là gửi Ba Mẹ ngay!").font(Diu.phu).foregroundColor(Diu.chu2)
      HangDs(icon: "ic_dongho", t1: x.trangThai == "ngoai_le" ? "Mở máy \(x.phut) phút" : "Thêm \(x.phut) phút",
             t2: "Lưu lúc \(x.guiLuc.gioPhut) · ⏳ Chờ có mạng").theDiu(dem: 12)
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
      DauMan(tieuDe: daGui ? "Đã gửi Ba Mẹ" : "Xin cài app", lui: { dong() })
      if daGui {
        Anh(ten: "rob_cho", co: 110)
        Text("Ba Mẹ trả lời là máy báo con ngay.").font(Diu.phu).foregroundColor(Diu.chu2)
        Button("Về trang chính") { dong() }.buttonStyle(NutDiu())
      } else {
        HStack { NhanNho(chu: "Chỉ app được phép", icon: "ic_khien"); Spacer() }
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
        HangDs(icon: "ic_dongho", t1: "Nếu được cho phép", t2: "Tính vào giờ chơi · còn \(m.conPhut) phút").theDiu(dem: 12)
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
        NhanNho(chu: m.khien?.lyDo == .hetGio ? "Hết giờ · \(m.daDung) / \(m.tongPhut) phút" : (m.khien?.lyDo.cauChoCon.components(separatedBy: ".").first ?? "Đang khoá"), icon: "ic_dongho")
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
      BanPhimSo(so: $ma, toiDa: 6).onChange(of: ma) { _ in if kq == .sai { kq = nil } }
      Button {
        let r = m.moBangMa(ma); kq = r.0; cau = r.1; if r.0 != .daMo { ma = "" }
      } label: { Label { Text("Mở máy bằng mã") } icon: { Anh(ten: "ic_mo_khoa", co: 26) } }
      .buttonStyle(NutDiu()).disabled(ma.count != 6)
      if m.khien?.lyDo.chiNgoaiLe != true {
        Button(m.matMang ? "Xin Ba Mẹ thêm giờ · gửi khi có mạng" : "Xin Ba Mẹ thêm giờ") { m.manPhu = .xinThem }.buttonStyle(NutDiu(kieu: .lk))
      }
      DongQuanLy(ten: m.tenCon)
    }
  }

  var daMo: some View {
    VStack(spacing: 14) {
      Anh(ten: "rob_xong", co: 120)
      Text("Máy mở rồi!").font(Diu.tieuDe).foregroundColor(Diu.chu)
      Text("Mã của Ba Mẹ mở thêm cho con \(m.phutMoOffline) phút").font(Diu.phu).foregroundColor(Diu.chu2).multilineTextAlignment(.center)
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
      DauMan(tieuDe: "Ba Mẹ chọn app", lui: { dong() })
      Picker("Nhãn", selection: $nhan) { ForEach(NhanApp.allCases) { Text($0.ten).tag($0) } }
        .pickerStyle(.segmented).frame(minHeight: 44)
      Text(nhan.moTa).font(Diu.t2).foregroundColor(Diu.chu2)
      Text("App học: \(m.soLuong.hoc) · Giải trí: \(m.soLuong.giaiTri) (+\(m.soLuong.danhMucGiaiTri) nhóm) · Chặn: \(m.soLuong.chan)")
        .font(Diu.t2).foregroundColor(Diu.chu3)
      FamilyActivityPicker(selection: $chon)
      Button("Lưu \(nhan.ten.lowercased())") { m.luuChon(chon, nhan) }.buttonStyle(NutDiu())
    }
    .padding(16)
    .onAppear { chon = m.luaChon.doc(nhan) }
    .onChange(of: nhan) { chon = m.luaChon.doc($0) }
  }
}
