// API riêng cho màn Con (M3): trang «Nhà», danh sách trò chơi được phép, phiên giải trí mở từ app Con (web / máy riêng / máy dùng chung
// sau PIN). Phiên dùng ĐÚNG phien.ts như agent thiết bị (máy chủ là sổ sách, một Con một phiên) — app Con chỉ gửi nhịp «đang dùng thật».
import { coTacTu } from "./chuyen-doi.ts";
import { one, q } from "./db.ts";
import { lichCua, thamSo } from "./cau-hinh.ts";
import { dauNgayUtc, gioDiaPhuong, laCuoiTuan, phutCua, trongKhung, type Khung } from "./gio.ts";
import { dsLuat } from "./luat-app.ts";
import { tomTatVi } from "./vi.ts";
import { chuoiNgay } from "./thanh-tich.ts";
import { nvCuaCon } from "./nhiem-vu.ts";
import { cuaHang } from "./phan-thuong.ts";
import { conTheoTran, dungPhien, lyDoChu, moPhien, nhip, phienDang, trangThaiPhien, xetMoPhien, type XetPhien } from "./phien.ts";
import { LoiNghiepVu } from "./loi.ts";
import { banMayBao } from "./ban-agent.ts";
import { banTu024 } from "./phien-windows.ts";
import { khoaTuanThu } from "./tuan-thu.ts";
import type { May } from "./gia-dinh.ts";

type ConTre = { id: string; family_id: string; device_id: string | null };

/** Trò chơi / app giải trí Ba Mẹ đã cho phép (luật gia đình + luật riêng của Con), kèm giá điểm/phút. */
export async function troChoi(c: ConTre) {
  const f = (await one<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from families where id = $1`, [c.family_id]))!;
  const cc = (await one<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from children where id = $1`, [c.id]))!;
  const ts = thamSo(f.cau_hinh, cc.cau_hinh);
  const gia: Record<string, number> = { game: ts.gia_game, video_ngan: ts.gia_video_ngan, mxh: ts.gia_mxh, phim_gd: ts.gia_phim_gd, khac: ts.gia_khac };
  const ds = (await dsLuat(c.family_id)).filter((x) => x.loai === "giai_tri" && (x.child_id === "" || x.child_id === c.id));
  const theoMuc = new Map<string, (typeof ds)[number]>();
  for (const x of ds) if (!theoMuc.has(x.muc) || x.child_id) theoMuc.set(x.muc, x);     // luật riêng của Con thắng luật gia đình
  return [...theoMuc.values()].map((x) => ({ muc: x.muc, ten: x.ten, nhom: x.nhom, giaPhut: (gia[x.nhom] ?? ts.gia_khac) / 1000 }));
}

/** Khung giờ chơi hôm nay: đang trong khung ⇒ giờ kết thúc; ngoài khung ⇒ lần mở kế tiếp (hôm nay hoặc ngày mai). */
function khungHomNay(lich: ReturnType<typeof lichCua>, thu: number, phut: number) {
  const ds: Khung[] = laCuoiTuan(thu) ? lich.cuoiTuan : lich.ngayThuong;
  const dang = ds.find((k) => trongKhung(phut, k));
  if (dang) return { dang: true, den: dang.den, moLai: null as string | null, moMai: false };
  const sau = ds.filter((k) => phutCua(k.tu) > phut).sort((a, b) => phutCua(a.tu) - phutCua(b.tu))[0];
  if (sau) return { dang: false, den: null, moLai: sau.tu, moMai: false };
  const mai: Khung[] = laCuoiTuan((thu + 1) % 7) ? lich.cuoiTuan : lich.ngayThuong;
  return { dang: false, den: null, moLai: mai[0]?.tu ?? null, moMai: true };
}

/** Trang «Nhà» của Con: số dư, chuỗi ngày, mục tiêu gần nhất (còn thiếu X điểm), số nhiệm vụ mở, phút chơi còn lại hôm nay, khung giờ, nghỉ. */
export async function nhaTre(c: ConTre, now = new Date()) {
  const f = (await one<{ tz: string; cau_hinh: Record<string, unknown> }>(`select tz, cau_hinh from families where id = $1`, [c.family_id]))!;
  const cc = (await one<{ cau_hinh: Record<string, unknown>; lich: Record<string, unknown> }>(`select cau_hinh, lich from children where id = $1`, [c.id]))!;
  const ts = thamSo(f.cau_hinh, cc.cau_hinh);
  const g = gioDiaPhuong(now, f.tz);
  const tu = dauNgayUtc(g.ngay, f.tz);
  const r = (await one<{ choi: number; thuong: number }>(
    `select coalesce((select sum(phut_dung) from play_sessions where child_id = $1 and bat_dau >= $2), 0)::int as choi,
            coalesce((select sum(phut) from grants where child_id = $1 and ngay = $3 and cua_so_den is null), 0)::int as thuong`, [c.id, tu, g.ngay]))!;
  const nghi = await one<{ nghi_den: Date }>(`select nghi_den from play_sessions where child_id = $1 and nghi_den > $2 order by nghi_den desc limit 1`, [c.id, now]);
  const tran = await conTheoTran(q, c.id, ts, f.tz, now);
  const vi = await tomTatVi(c.id);
  const nv = await nvCuaCon(c.id, now);
  const ch = await cuaHang(c.id);
  // mục tiêu: món rẻ nhất CHƯA đủ điểm (ưu tiên phiếu quà); đủ hết ⇒ món đắt nhất
  const chua = ch.qua.filter((x) => !x.du);
  const mt = chua.find((x) => x.loai === "voucher") ?? chua[0] ?? ch.qua[ch.qua.length - 1] ?? null;
  const dang = await phienDang(c.id);
  return {
    soDu: vi.soDu, diemChoDuyet: vi.diemChoDuyet, capDo: vi.capDo, tongKiem: vi.tongKiem, chuoiNgay: await chuoiNgay(c.id, now),
    mucTieu: mt ? { id: mt.id, ten: mt.ten, diem: mt.diem, conThieu: mt.conThieu } : null,
    nhiemVuMo: nv.filter((x) => x.trang_thai_con === "san_sang" || x.trang_thai_con === "dang_lam" || x.trang_thai_con === "can_bo_sung").length,
    canBoSung: nv.filter((x) => x.trang_thai_con === "can_bo_sung").map((x) => ({ id: x.id, ten: x.ten, luot: x.luot_dang })),
    phutChoi: r.choi, tranNgay: ts.tran_ngay + r.thuong, conPhut: Math.max(0, Math.min(tran.conNgay, tran.conTuan)),   // trần tuần cũng chặn như xetMoPhien
    khung: khungHomNay(lichCua(cc.lich as never), g.thu, g.phut), gioNgu: trongKhung(g.phut, lichCua(cc.lich as never).ngu),
    nghiDen: nghi ? new Date(nghi.nghi_den).toISOString() : null,
    phien: dang ? { id: dang.id, muc: dang.muc, conPhut: Math.max(0, Math.ceil(dang.toi_da_phut - dang.phut_dung)) } : null,
    phienToiDa: ts.phien_toi_da, nghiGiua: ts.nghi_giua,
  };
}

/** Xét trước «Dùng điểm để chơi?» (FR-04.02) — kèm câu giải thích và giờ mở lại khi chưa được. */
/** Máy có tác tử (Windows/Mac) của trang khay: không tuân thủ ⇒ câu khoá (như phien/xet của agent); máy khác / web ⇒ null. */
async function khoaMayWin(c: ConTre, now: Date) {
  if (!c.device_id) return null;
  const may = await one<May>(`select * from devices where id = $1`, [c.device_id]);
  if (!may || !coTacTu(may.platform)) return null;
  const kt = await khoaTuanThu(may, now);
  return kt.khoa ? kt.cau : null;
}

export async function xetTre(c: ConTre, muc: string, now = new Date()) {
  if (!muc) throw new LoiNghiepVu("thieu_muc", "Chọn trò chơi trước nhé");
  const khoa = await khoaMayWin(c, now);
  if (khoa) { const kq: XetPhien = { duoc: false, lyDo: "khong_tuan_thu" }; return { ...kq, cau: khoa as string | null }; }
  const x = await xetMoPhien(c.id, muc, { mayId: c.device_id }, now);
  return { ...x, cau: x.duoc ? null : lyDoChu(x) };
}

export async function moTre(c: ConTre, muc: string, now = new Date()) {
  if (!muc) throw new LoiNghiepVu("thieu_muc", "Chọn trò chơi trước nhé");
  const khoa = await khoaMayWin(c, now);
  if (khoa) throw new LoiNghiepVu("khong_mo_duoc", khoa, 409);
  return moPhien(c.id, c.device_id, muc, {}, now);
}

export async function nhipTre(c: ConTre, id: string, dangDung: boolean, now = new Date()) {
  // Phiên mở từ máy Windows chạy agent ≥ 0.2.4: nhịp đồng bộ của agent (dong-bo + phien/bu) là nguồn sổ sách DUY NHẤT (lib/phien-windows.ts).
  // Trang khay CHỈ ĐỌC: nếu trang cũng nhịp thì (1) hai nguồn giành nhau tam/chay, (2) có mạng lại trang nhịp trước `phien/bu` sẽ đẩy
  // nhip_cuoi tới hiện tại ⇒ phút chơi lúc mất mạng bị kẹp gần 0. Agent cũ (0.2.0–0.2.3): giữ như #58 — trang nhịp theo trạng thái hiện có
  // (máy dùng chung + agent cũ: dong-bo không nhịp, trang là nguồn duy nhất).
  const p0 = await one<{ trang_thai: string; platform: string | null; status: { version?: unknown } | null }>(
    `select s.trang_thai, d.platform, d.status from play_sessions s left join devices d on d.id = s.device_id where s.id = $1 and s.child_id = $2`, [id, c.id]);
  // Mac: tác tử chưa đo giây phiên (không gửi playSeconds; dong-bo không nhịp — api-may.ts) ⇒ trang khay là nguồn duy nhất, nhịp theo `dangDung`.
  // Không suy từ devices.status (gộp, giữ playSeconds cũ). Khi tác tử Mac đo giây thật thì đổi cả hai chỗ cùng lúc.
  const nen = p0?.platform;
  const tacTuMoi = nen === "windows" && banTu024(banMayBao({ status: p0!.status as never }));
  const k = tacTuMoi
    ? await trangThaiPhien(c.id, id)
    : await nhip(c.id, id, nen === "windows" ? p0!.trang_thai !== "tam" : dangDung, now);
  const p = await one<{ muc: string; toi_da_phut: number; gia_phan_nghin: number }>(`select muc, toi_da_phut, gia_phan_nghin from play_sessions where id = $1`, [id]);
  return { ...k, muc: p?.muc ?? "", toiDaPhut: p?.toi_da_phut ?? 0, giaPhanNghin: p?.gia_phan_nghin ?? 0 };
}

export async function dungTre(c: ConTre, id: string, now = new Date()) {
  await dungPhien(c.id, id, "con_dung", now);
  const p = await one<{ diem_tru: number; phut_dung: number; nghi_den: Date | null }>(`select diem_tru, phut_dung, nghi_den from play_sessions where id = $1 and child_id = $2`, [id, c.id]);
  if (!p) throw new LoiNghiepVu("khong_thay", "Không thấy phiên", 404);
  return { diemTru: p.diem_tru, phutDung: p.phut_dung, nghiDen: p.nghi_den ? new Date(p.nghi_den).toISOString() : null, soDu: (await tomTatVi(c.id)).soDu };
}

/** Đăng xuất phiên PIN (máy dùng chung: «Đổi người»). Token máy riêng không xoá được ở đây. */
export async function raTre(token: string, now = new Date()) {
  const { sha } = await import("./auth.ts");
  // «Đổi người» trên máy dùng chung: phiên chơi Con này đang mở trên máy đó kết thúc luôn (không để bạn khác chơi bằng điểm của Con)
  const k = await one<{ child_id: string; device_id: string | null }>(`select child_id, device_id from kid_sessions where id = $1`, [sha(token)]);
  const chung = k?.device_id ? await one(`select 1 from devices where id = $1 and child_id is null`, [k.device_id]) : undefined;
  if (k?.device_id && chung) {
    const ph = await one<{ id: string }>(`select id from play_sessions where child_id = $1 and device_id = $2 and trang_thai in ('chay', 'tam')`, [k.child_id, k.device_id]);
    if (ph) await dungPhien(k.child_id, ph.id, "con_dung", now);
  }
  await q(`delete from kid_sessions where id = $1`, [sha(token)]);
}
