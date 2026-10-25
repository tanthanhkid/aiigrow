// M4b — mô hình CHÍNH SÁCH CHUNG, không phụ thuộc hệ điều hành (cách Intune / Workspace ONE / Android Management API tổ chức: một
// «policy» trừu tượng ở máy chủ, mỗi nền tảng có bộ chuyển đổi riêng — lib/chuyen-doi.ts). Máy chủ lưu + kiểm một kiểu cho MỌI máy Con.
// Không lưu gì mới: dựng từ dữ liệu có sẵn — lịch (children.lich), tham số (cau-hinh), luật app/web (app_rules), phiên điểm, ví, khoá ngay
// (taoPolicy trong may-con.ts), phút «thêm giờ» (grants), luật tạm (app_rules.het) + trạng thái tuân thủ (lib/tuan-thu.ts).
import { one, q } from "./db.ts";
import { thamSo, type ThamSo } from "./cau-hinh.ts";
import { gioDiaPhuong, type Khung } from "./gio.ts";
import { taoPolicy, type Policy } from "./may-con.ts";
import type { May } from "./gia-dinh.ts";
import type { NhomGiaiTri } from "./luat-app.ts";
import { mucAppThat } from "./app-may.ts";

export type KieuMuc = "app" | "web";
export type MucChung = { muc: string; kieu: KieuMuc; nhom?: NhomGiaiTri | null; giaPhanNghin?: number | null };

export type VanDeTuanThu = {
  loai: "gio_sai" | "app_tat" | "admin_la" | "khong_toi_may_chu" | "ngoai_vong";
  tru: number;                       // điểm tuân thủ bị trừ
  cauBaMe: string; cauCon: string;   // minh bạch: Con cũng biết vì sao máy đang khoá
  chiTiet?: Record<string, unknown>;
};

export type TrangThaiTuanThu = "tuan_thu" | "lech_chuan" | "ngoai_vong" | "tat_may" | "chua_co_nhip";

export type TuanThu = {
  trangThai: TrangThaiTuanThu; diem: number; vanDe: VanDeTuanThu[]; khoaGiaiTri: boolean; moKhanCapDen: string | null;
};

export type ChinhSachChung = {
  phienBan: 1;
  serverTime: string; tz: string;
  may: { id: string; ten: string; nen: string; dungChung: boolean };
  con: Policy["con"]; canChonCon: boolean;
  gioChoi: {
    ngayThuong: Khung[]; cuoiTuan: Khung[]; ngu: Khung;
    tranNgayPhut: number; tranTuanPhut: number; phienToiDaPhut: number; nghiGiuaPhut: number; tuDongDongPhut: number;
  };
  ungDung: { heThong: string[]; hoc: MucChung[]; giaiTri: MucChung[]; chan: MucChung[]; chuaXep: "chan" };
  phienDiem: { soDu: number; phien: Policy["phien"]; giaTheoNhom: Record<NhomGiaiTri, number> };
  khoaNgay: boolean;
  ngoaiLe: { phutThemHomNay: number; mucTamThoi: { muc: string; loai: string; het: string }[]; moKhanCapDen: string | null };
  gioMaySai: boolean;
  tuanThu: TuanThu;
  /** Tổng hợp: giải trí có được mở không + vì sao (khoá ngay / giờ máy sai / không tuân thủ). Không có «chế độ cục bộ». */
  hieuLuc: { giaiTriDuocMo: boolean; lyDo: ("khoa_ngay" | "gio_may_sai" | "khong_tuan_thu")[] };
};

const BUNDLE = /^(com|vn|org|net|io|me|tv|uk|de|jp|us|co|app|dev)\.[a-z0-9_-]+(\.[a-z0-9_-]+)+$/;

/** Mục là app (tệp chạy Windows/macOS, gói Android / bundle Apple dạng com.x.y) hay web (tên miền). */
export function kieuMuc(muc: string): KieuMuc {
  return muc.endsWith(".exe") || muc.endsWith(".app") || BUNDLE.test(muc) ? "app" : "web";
}

/** Dựng chính sách chung từ Policy (taoPolicy) + tham số + ngoại lệ + tuân thủ — hàm thuần. */
export function dungChinhSach(p: Policy, o: {
  ts: ThamSo; may: Pick<May, "id" | "name" | "platform" | "dung_chung">; tuanThu: TuanThu;
  phutThem: number; mucTamThoi: { muc: string; loai: string; het: Date | string }[];
  /** Mục app thật máy Con đã gửi (lib/app-may.ts) — package «ru.keepcoder.telegram» không theo mẫu com./vn. vẫn là APP. */
  appThat?: Set<string>;
}): ChinhSachChung {
  const kieu = (muc: string): KieuMuc => (o.appThat?.has(muc.toLowerCase()) ? "app" : kieuMuc(muc));
  const m = (l: Policy["luat"][number]): MucChung =>
    l.loai === "giai_tri" ? { muc: l.muc, kieu: kieu(l.muc), nhom: l.nhom as NhomGiaiTri, giaPhanNghin: l.giaPhanNghin } : { muc: l.muc, kieu: kieu(l.muc) };
  const lyDo: ChinhSachChung["hieuLuc"]["lyDo"] = [];
  if (p.khoaNgay) lyDo.push("khoa_ngay");
  if (p.gioMaySai) lyDo.push("gio_may_sai");
  if (o.tuanThu.khoaGiaiTri) lyDo.push("khong_tuan_thu");
  return {
    phienBan: 1, serverTime: p.serverTime, tz: p.tz,
    may: { id: o.may.id, ten: o.may.name, nen: o.may.platform, dungChung: o.may.dung_chung },
    con: p.con, canChonCon: p.canChonCon,
    gioChoi: {
      ngayThuong: p.lich.ngayThuong, cuoiTuan: p.lich.cuoiTuan, ngu: p.lich.ngu,
      tranNgayPhut: o.ts.tran_ngay, tranTuanPhut: o.ts.tran_tuan, phienToiDaPhut: o.ts.phien_toi_da, nghiGiuaPhut: o.ts.nghi_giua,
      tuDongDongPhut: o.ts.tu_dong_dong,
    },
    ungDung: {
      heThong: p.allowlistHeThong,
      hoc: p.luat.filter((l) => l.loai === "hoc").map(m),
      giaiTri: p.luat.filter((l) => l.loai === "giai_tri").map(m),
      chan: p.luat.filter((l) => l.loai === "chan").map(m),
      chuaXep: "chan",
    },
    phienDiem: {
      soDu: p.soDu, phien: p.phien,
      giaTheoNhom: { game: o.ts.gia_game, video_ngan: o.ts.gia_video_ngan, mxh: o.ts.gia_mxh, phim_gd: o.ts.gia_phim_gd, khac: o.ts.gia_khac },
    },
    khoaNgay: p.khoaNgay,
    ngoaiLe: {
      phutThemHomNay: o.phutThem,
      mucTamThoi: o.mucTamThoi.map((x) => ({ muc: x.muc, loai: x.loai, het: new Date(x.het).toISOString() })),
      moKhanCapDen: o.tuanThu.moKhanCapDen,
    },
    gioMaySai: p.gioMaySai,
    tuanThu: o.tuanThu,
    hieuLuc: { giaiTriDuocMo: lyDo.length === 0, lyDo },
  };
}

/** Chính sách chung cho máy `may`, Con `con` (null = máy dùng chung chưa chọn Con). */
export async function chinhSachChung(may: May, con: string | null, tuanThu: TuanThu, now = new Date()): Promise<ChinhSachChung> {
  const gioMaySai = tuanThu.vanDe.some((v) => v.loai === "gio_sai");
  const p = await taoPolicy(may, con, { gioMaySai }, now);
  const f = (await one<{ cau_hinh: Record<string, unknown>; tz: string }>(`select cau_hinh, tz from families where id = $1`, [may.family_id]))!;
  const c = con ? await one<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from children where id = $1`, [con]) : undefined;
  const ts = thamSo(f.cau_hinh, c?.cau_hinh);
  const ngay = gioDiaPhuong(now, f.tz).ngay;
  const phutThem = con ? (await one<{ p: number }>(`select coalesce(sum(phut), 0)::int as p from grants where child_id = $1 and ngay = $2`, [con, ngay]))!.p : 0;
  const mucTamThoi = con ? await q<{ muc: string; loai: string; het: Date }>(
    `select muc, loai, het from app_rules where family_id = $1 and child_id in ('', $2) and het is not null and het > $3 order by het`,
    [may.family_id, con, now]) : [];
  return dungChinhSach(p, { ts, may, tuanThu, phutThem, mucTamThoi, appThat: await mucAppThat(may.family_id) });
}
