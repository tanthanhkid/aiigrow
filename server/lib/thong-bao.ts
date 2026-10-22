// Thông báo trong app cho Ba Mẹ (FR-08.01): một dòng thời gian dựng từ nhật ký (events) + cảnh báo (alerts) của gia đình — không
// thêm chỗ ghi nào ở các mô-đun khác. Gộp thông minh: Con nộp nhiều nhiệm vụ liền nhau ⇒ một dòng «Ken vừa nộp 3 nhiệm vụ».
// Việc chính Ba/Mẹ đang xem tự làm thì không báo lại; việc Ba Mẹ KHÁC làm (duyệt, từ chối, mở khẩn cấp…) thì báo.
// Mỗi Ba Mẹ có thiết lập riêng: giờ yên lặng (không đẩy trừ nghiêm trọng) và tắt từng nhóm (cảnh báo nghiêm trọng không tắt được).
// Push thật (APNs / FCM qua Expo) CHỜ THIẾT BỊ: `day` trên mỗi dòng là quyết định «có đẩy không» mà bộ gửi push sẽ dùng.
import { one, q } from "./db.ts";
import type { BaMe } from "./auth.ts";
import { gioDiaPhuong, trongKhung } from "./gio.ts";
import { LoiNghiepVu } from "./loi.ts";
import { bangTvTb, TEN_VAI } from "./thanh-vien.ts";

export const NHOM_TB = ["nhiem_vu", "yeu_cau", "qua", "thanh_tich", "ba_me_khac", "canh_bao", "gia_dinh"] as const;
export type NhomTb = (typeof NHOM_TB)[number];
export const TEN_NHOM_TB: Record<NhomTb, string> = {
  nhiem_vu: "Con nộp nhiệm vụ", yeu_cau: "Con xin phép", qua: "Đổi quà, phiếu quà", thanh_tich: "Huy hiệu, AiiRob",
  ba_me_khac: "Việc Ba Mẹ khác làm", canh_bao: "Cảnh báo", gia_dinh: "Thành viên gia đình",
};
export const GOP_PHUT = 60;          // nộp nhiệm vụ cách nhau ≤ 60 phút ⇒ gộp một dòng
export const NGAY_GIU = 14;          // dòng thời gian lấy 14 ngày gần nhất

export type MucTb = "thong_tin" | "chu_y" | "nghiem_trong";
export type ThongBao = {
  id: string; nhom: NhomTb; muc: MucTb; tieu: string; phu: string; luc: string; con: string | null; den: string; so: number;
  moi: boolean; day: boolean; imLang: boolean;
};
export type CaiDatTb = { yenLang: { bat: boolean; tu: string; den: string }; tat: NhomTb[] };
export const YEN_LANG_MD = { bat: false, tu: "22:00", den: "06:30" };

const LOAI_SU_KIEN = ["nop_nhiem_vu", "gui_yeu_cau", "doi_qua", "dung_voucher", "nap_quy", "huy_hieu", "tu_duyet_nhiem_vu",
  "duyet_nhiem_vu", "tu_choi_nhiem_vu", "can_bo_sung", "dong_y_yeu_cau", "tu_choi_yeu_cau", "xac_nhan_qua", "huy_qua",
  "mo_khan_cap", "lenh_go", "thanh_vien_vao", "doi_vai", "moi_ra", "loi_khen", "dong_bang_chuoi"];

const GIO = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function caiDatTb(parent: string): Promise<CaiDatTb & { docDen: Date | null }> {
  await bangTvTb();
  const r = await one<{ doc_den: Date | null; yen_lang: Partial<CaiDatTb["yenLang"]>; tat: string[] }>(
    `select doc_den, yen_lang, tat from ba_me_tb where parent_id = $1`, [parent]);
  const y = r?.yen_lang ?? {};
  return {
    docDen: r?.doc_den ?? null,
    yenLang: { bat: y.bat === true, tu: GIO.test(String(y.tu)) ? String(y.tu) : YEN_LANG_MD.tu, den: GIO.test(String(y.den)) ? String(y.den) : YEN_LANG_MD.den },
    tat: (r?.tat ?? []).filter((x): x is NhomTb => (NHOM_TB as readonly string[]).includes(x)),
  };
}

export async function luuCaiDatTb(parent: string, b: { yenLang?: unknown; tat?: unknown }) {
  const cu = await caiDatTb(parent);
  const y = (b.yenLang ?? {}) as Record<string, unknown>;
  const yenLang = {
    bat: y.bat === undefined ? cu.yenLang.bat : y.bat === true,
    tu: y.tu === undefined ? cu.yenLang.tu : String(y.tu),
    den: y.den === undefined ? cu.yenLang.den : String(y.den),
  };
  if (!GIO.test(yenLang.tu) || !GIO.test(yenLang.den) || yenLang.tu === yenLang.den)
    throw new LoiNghiepVu("gio_sai", "Giờ yên lặng cần dạng 22:00 – 06:30, giờ bắt đầu khác giờ kết thúc");
  const tat = b.tat === undefined ? cu.tat : (Array.isArray(b.tat) ? b.tat : []).map(String).filter((x): x is NhomTb => (NHOM_TB as readonly string[]).includes(x));
  await q(`insert into ba_me_tb(parent_id, yen_lang, tat) values ($1, $2::text::jsonb, $3::text::jsonb)
           on conflict (parent_id) do update set yen_lang = excluded.yen_lang, tat = excluded.tat, updated_at = now()`,
    [parent, JSON.stringify(yenLang), JSON.stringify([...new Set(tat)])]);
  return { yenLang, tat: [...new Set(tat)] };
}

export async function danhDauDoc(parent: string, den = new Date()) {
  await bangTvTb();
  await q(`insert into ba_me_tb(parent_id, doc_den) values ($1, $2::timestamptz)
           on conflict (parent_id) do update set doc_den = greatest(coalesce(ba_me_tb.doc_den, $2::timestamptz), $2::timestamptz), updated_at = now()`,
    [parent, den.toISOString()]);
}

/** Có đẩy (push) dòng này không: nhóm bị tắt hoặc đang giờ yên lặng ⇒ không, TRỪ cảnh báo nghiêm trọng. Thuần, test được. */
export function quyetDinhDay(muc: MucTb, nhom: NhomTb, luc: Date, cd: CaiDatTb, tz: string) {
  if (muc === "nghiem_trong") return { day: true, imLang: false };
  if (cd.tat.includes(nhom)) return { day: false, imLang: false };
  const imLang = cd.yenLang.bat && trongKhung(gioDiaPhuong(luc, tz).phut, cd.yenLang);
  return { day: !imLang, imLang };
}

type SuKien = { id: string; loai: string; child_id: string | null; chi_tiet: Record<string, any>; nguoi: string | null; created_at: Date;
  ten_con: string | null; ten_nguoi: string | null };
type CanhBaoRow = { id: string; child_id: string | null; loai: string; muc: MucTb; noi_dung: string; created_at: Date; ten_con: string | null };

const YC: Record<string, (c: Record<string, any>) => string> = {
  them_gio: (c) => `xin thêm ${c.phut ?? ""} phút`.replace("  ", " "), mo_web: (c) => `xin mở ${c.gia_tri ?? "một trang web"}`,
  cai_app: (c) => `xin cài ${c.gia_tri ?? "một ứng dụng"}`, ngoai_le: (c) => `xin chơi ${c.phut ?? ""} phút dù chưa đủ điểm`.replace("  ", " "),
  ngoai_gio: (c) => `xin chơi ngoài giờ ${c.phut ?? ""} phút`.replace("  ", " "), khac: (c) => (c.gia_tri ? `xin: ${c.gia_tri}` : "gửi một yêu cầu"),
};
const tien = (n: number) => `${Math.round(n).toLocaleString("en-US").replace(/,/g, ".")}đ`;

/** Một sự kiện ⇒ một dòng thông báo (null = không báo). */
function tuSuKien(e: SuKien): Omit<ThongBao, "moi" | "day" | "imLang" | "so" | "luc" | "id"> | null {
  const c = e.chi_tiet ?? {}, con = e.ten_con ?? "Con", ai = e.ten_nguoi ?? "Ba Mẹ";
  const veCon = e.child_id ? `/vi/${e.child_id}` : "/hom-nay";
  const g = (nhom: NhomTb, tieu: string, phu: string, den: string, muc: MucTb = "thong_tin") => ({ nhom, muc, tieu, phu, den, con: e.child_id });
  switch (e.loai) {
    case "nop_nhiem_vu": return g("nhiem_vu", `${con} vừa nộp «${c.ten ?? "nhiệm vụ"}»`, c.nghi_trung ? "Ảnh giống ảnh cũ — Ba Mẹ xem kỹ nhé" : "Chờ Ba Mẹ duyệt", "/cho-duyet", c.nghi_trung ? "chu_y" : "thong_tin");
    case "gui_yeu_cau": return g("yeu_cau", `${con} ${(YC[c.loai] ?? YC.khac)(c)}`, "Đồng ý hoặc từ chối trong Chờ duyệt", "/cho-duyet");
    case "doi_qua": return g("qua", `${con} đổi «${c.ten ?? "phần thưởng"}»`, `${c.diem ?? 0} điểm${c.cho_xac_nhan ? " · chờ Ba Mẹ trao quà" : ""}`, "/diem-qua");
    case "dung_voucher": return g("qua", `Phiếu quà ${tien(Number(c.menh_gia ?? 0))} đã dùng ở AiiCafe`, c.ma ? `Mã ${c.ma}` : "Quầy đã quét", "/quy");
    case "nap_quy": return g("qua", `Quỹ phiếu quà +${tien(Number(c.so_tien ?? 0))}`, e.nguoi ? `${ai} ghi nạp` : "AiiLab đã ghi nhận khoản nạp", "/quy");
    case "huy_hieu": return g("thanh_tich", `${con} nhận huy hiệu ${c.ten ?? ""}`.trim(), "Khen Con một câu nhé", e.child_id ? `/vi/${e.child_id}` : "/hom-nay");
    case "tu_duyet_nhiem_vu": return g("thanh_tich", `${con} xong «${c.ten ?? "nhiệm vụ"}»`, `+${c.diem ?? 0} điểm, tự duyệt`, e.child_id ? `/vi/${e.child_id}` : "/hom-nay");
    case "duyet_nhiem_vu": return g("ba_me_khac", `${ai} đã duyệt «${c.ten ?? "nhiệm vụ"}» của ${con}`, `+${c.diem ?? 0} điểm`, e.child_id ? `/vi/${e.child_id}` : "/hom-nay");
    case "tu_choi_nhiem_vu": return g("ba_me_khac", `${ai} chưa duyệt «${c.ten ?? "nhiệm vụ"}» của ${con}`, c.ly_do ? `Lý do: ${c.ly_do}` : "Đã báo Con lý do", "/hom-nay");
    case "can_bo_sung": return g("ba_me_khac", `${ai} nhờ ${con} chụp lại «${c.ten ?? "nhiệm vụ"}»`, c.ly_do ? `Lý do: ${c.ly_do}` : "Con được nộp lại", "/hom-nay");
    case "dong_y_yeu_cau": return g("ba_me_khac", `${ai} đã đồng ý yêu cầu của ${con}`, c.ngoai_le ? "Ngoại lệ — không trừ điểm" : "Theo quy tắc gia đình", veCon);
    case "tu_choi_yeu_cau": return g("ba_me_khac", `${ai} đã từ chối yêu cầu của ${con}`, c.ly_do ? `Lý do: ${c.ly_do}` : "Đã báo Con lý do", veCon);
    case "xac_nhan_qua": return g("ba_me_khac", `${ai} đã trao «${c.ten ?? "quà"}» cho ${con}`, "Phiếu quà đã xong", "/diem-qua");
    case "huy_qua": return g("ba_me_khac", `${ai} đã huỷ một phiếu quà của ${con}`, "Điểm đã hoàn lại cho Con", "/diem-qua");
    case "mo_khan_cap": return g("ba_me_khac", `${ai} mở khẩn cấp máy của ${con} ${c.phut ?? ""} phút`.replace("  ", " "), c.lyDo ? `Lý do: ${c.lyDo}` : "Hết hạn tự khoá lại", veCon, "chu_y");
    case "lenh_go": return g("ba_me_khac", `${ai} đã ra lệnh gỡ một máy khỏi gia đình`, "Máy gỡ xong sẽ biến khỏi danh sách", veCon, "chu_y");
    case "loi_khen": return g("ba_me_khac", `${ai} đã khen ${con}`, `«${String(c.noi_dung ?? "").slice(0, 80)}»`, veCon);
    case "dong_bang_chuoi": return g("ba_me_khac", `${ai} đã giữ chuỗi ngày của ${con}`, `Đóng băng ngày ${String(c.ngay ?? "").split("-").reverse().slice(0, 2).join("/")}`, veCon);
    case "thanh_vien_vao": return g("gia_dinh", `${c.ten ?? "Một người"} đã vào gia đình`, `Quyền ${TEN_VAI[c.vai] ?? ""}`.trim(), "/thanh-vien");
    case "doi_vai": return g("gia_dinh", `${ai} đổi quyền của ${c.ten ?? "thành viên"}`, `Thành ${TEN_VAI[c.thanh] ?? c.thanh}`, "/thanh-vien");
    case "moi_ra": return g("gia_dinh", `${c.ten ?? "Một thành viên"} không còn trong gia đình`, `${ai} đã mời ra`, "/thanh-vien");
    default: return null;
  }
}

/** Dòng thời gian thông báo của một Ba Mẹ: mới nhất trước, đã gộp, kèm cờ mới / có đẩy / giờ yên lặng. */
export async function dsThongBao(bm: BaMe, now = new Date()) {
  const cd = await caiDatTb(bm.id);
  const tz = (await one<{ tz: string }>(`select tz from families where id = $1`, [bm.family_id]))?.tz ?? "Asia/Ho_Chi_Minh";
  const tu = new Date(now.getTime() - NGAY_GIU * 86_400_000).toISOString();
  const sk = await q<SuKien>(
    `select e.id, e.loai, e.child_id, e.chi_tiet, e.nguoi, e.created_at, c.ten as ten_con, p.ten as ten_nguoi from events e
       left join children c on c.id = e.child_id left join parents p on p.id = e.nguoi
     where e.family_id = $1 and e.created_at >= $2::timestamptz and e.loai = any($3::text[]) and (e.nguoi is null or e.nguoi <> $4)
     order by e.created_at desc, e.seq desc limit 300`, [bm.family_id, tu, LOAI_SU_KIEN, bm.id]);
  const cb = await q<CanhBaoRow>(
    `select a.id, a.child_id, a.loai, a.muc, a.noi_dung, a.created_at, c.ten as ten_con from alerts a left join children c on c.id = a.child_id
     where a.family_id = $1 and a.created_at >= $2::timestamptz order by a.created_at desc limit 100`, [bm.family_id, tu]);
  type Tho = Omit<ThongBao, "moi" | "day" | "imLang"> & { t: number; loai: string };
  const tho: Tho[] = [];
  for (const e of sk) {
    const d = tuSuKien(e);
    if (d) tho.push({ ...d, id: `e:${e.id}`, so: 1, luc: new Date(e.created_at).toISOString(), t: new Date(e.created_at).getTime(), loai: e.loai });
  }
  for (const a of cb) {
    tho.push({ id: `a:${a.id}`, nhom: "canh_bao", muc: a.muc, tieu: a.noi_dung, phu: a.ten_con ? `Cảnh báo · ${a.ten_con}` : "Cảnh báo",
      luc: new Date(a.created_at).toISOString(), t: new Date(a.created_at).getTime(), con: a.child_id, den: `/canh-bao/${a.id}`, so: 1, loai: "canh_bao" });
  }
  tho.sort((a, b) => b.t - a.t);
  // gộp: nộp nhiệm vụ cùng Con, liền nhau (không xen dòng khác của Con đó) và cách nhau ≤ GOP_PHUT
  const gop: (Tho & { cuoiT: number; ten: string[] })[] = [];
  for (const x of tho) {
    let truoc: (typeof gop)[number] | undefined;
    if (x.loai === "nop_nhiem_vu") for (let i = gop.length - 1; i >= 0 && !truoc; i--) if (gop[i].con === x.con && gop[i].loai !== "canh_bao") truoc = gop[i];
    if (truoc && truoc.loai === "nop_nhiem_vu" && truoc.cuoiT - x.t <= GOP_PHUT * 60_000) {
      truoc.so += 1;
      truoc.cuoiT = x.t;
      truoc.ten.push(/«(.*)»/.exec(x.tieu)?.[1] ?? "");
      if (x.muc === "chu_y") truoc.muc = "chu_y";
      continue;
    }
    gop.push({ ...x, cuoiT: x.t, ten: [/«(.*)»/.exec(x.tieu)?.[1] ?? ""] });
  }
  const docDen = cd.docDen ? new Date(cd.docDen).getTime() : 0;
  const ds: ThongBao[] = gop.slice(0, 100).map((g) => {
    if (g.so > 1) {
      const ten = /^(.*) vừa nộp/.exec(g.tieu)?.[1] ?? "Con";
      g.tieu = `${ten} vừa nộp ${g.so} nhiệm vụ`;
      g.phu = g.ten.filter(Boolean).reverse().slice(0, 3).join(" · ") + (g.muc === "chu_y" ? " · có ảnh giống ảnh cũ" : "");
    }
    const { day, imLang } = quyetDinhDay(g.muc, g.nhom, new Date(g.t), cd, tz);
    return { id: g.id, nhom: g.nhom, muc: g.muc, tieu: g.tieu, phu: g.phu, luc: g.luc, con: g.con, den: g.den, so: g.so, moi: g.t > docDen, day, imLang };
  });
  return { ds, chuaDoc: ds.filter((x) => x.moi).length, caiDat: { yenLang: cd.yenLang, tat: cd.tat }, nhom: NHOM_TB.map((k) => ({ ma: k, ten: TEN_NHOM_TB[k] })) };
}

