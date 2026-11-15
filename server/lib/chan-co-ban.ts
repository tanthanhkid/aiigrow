// App & web theo CON — hai chế độ (#262 / #258, thiết kế chốt 14–15/11, hành trình «Ứng dụng & web trên máy»). Tệp THUẦN (không nhập module nào)
// để may-con / agent-windows / web / luat-app cùng dùng mà không vòng nhập.
//   • theo_danh_sach (mặc định, Con mới cũng vậy): DANH SÁCH TRẮNG — máy chỉ mở app / web trong danh sách của Con; ngoài danh sách ⇒ không mở,
//     Con «Xin Ba Mẹ mở». Mỗi mục thuộc đúng một nhóm: «tinh_phut» (luật giai_tri — trừ sao 1 sao = 1 phút, so-sao.ts) hoặc
//     «khong_tinh_phut» (luật hoc — vào thoải mái).
//   • mo_het: không chặn gì, không tính phút (không trừ sao — so-sao.ts › laMoHetCon). Danh sách giữ nguyên, «tạm nghỉ».
// Không còn quy tắc «Chặn» / «Luôn chặn» / web người lớn do Ba Mẹ chỉnh, không còn giờ ngủ, giờ học.
// Giá trị cũ `chi_app_duoc_phep` (trước 15/11) = theo_danh_sach: máy chủ vẫn NHẬN khi app cũ gửi và vẫn TRẢ ở trường cũ `cheDoChan`
// (agent / app chưa phát hành bản mới đọc trường đó) — trường mới là `cheDo`.

export const CHE_DO = ["theo_danh_sach", "mo_het"] as const;
export type CheDo = (typeof CHE_DO)[number];
export const TEN_CHE_DO: Record<CheDo, string> = { theo_danh_sach: "Theo danh sách", mo_het: "Mở hết" };

/** children.che_do_chan ⇒ chế độ hiệu lực. Mọi giá trị khác «mo_het» (theo_danh_sach, chi_app_duoc_phep cũ, null) ⇒ theo_danh_sach. */
export const cheDoCua = (v: unknown): CheDo => (v === "mo_het" ? "mo_het" : "theo_danh_sach");

/** Giá trị Ba Mẹ gửi lên (mới hoặc cũ) ⇒ chế độ, sai ⇒ null. */
export const nhanCheDo = (v: unknown): CheDo | null =>
  v === "mo_het" ? "mo_het" : v === "theo_danh_sach" || v === "chi_app_duoc_phep" ? "theo_danh_sach" : null;

/** (cũ) Tên giá trị trước 15/11 — chỉ để TRẢ ở trường `cheDoChan` cho agent / app cũ. */
export const CHE_DO_CHAN = ["chi_app_duoc_phep", "mo_het"] as const;
export type CheDoChan = (typeof CHE_DO_CHAN)[number];
export const TEN_CHE_DO_CHAN: Record<CheDoChan, string> = { chi_app_duoc_phep: "Theo danh sách", mo_het: "Mở hết" };
/** children.che_do_chan ⇒ giá trị CŨ (chi_app_duoc_phep | mo_het) cho trường `cheDoChan`. */
export const cheDoChanCua = (v: unknown): CheDoChan => (cheDoCua(v) === "mo_het" ? "mo_het" : "chi_app_duoc_phep");
/** Tên hiển thị của mọi giá trị đã từng ghi (nhật ký cũ có «chi_app_duoc_phep»). */
export const tenCheDo = (v: unknown) => TEN_CHE_DO[cheDoCua(v)];

/** Hai nhóm của danh sách. Lưu trong app_rules.loai: tinh_phut = «giai_tri», khong_tinh_phut = «hoc». */
export const NHOM_DS = ["tinh_phut", "khong_tinh_phut"] as const;
export type NhomDs = (typeof NHOM_DS)[number];
export const TEN_NHOM_DS: Record<NhomDs, string> = { tinh_phut: "Tính phút", khong_tinh_phut: "Không tính phút" };
export const nhomTuLoai = (loai: unknown): NhomDs => (loai === "giai_tri" ? "tinh_phut" : "khong_tinh_phut");
export const loaiTuNhom = (n: NhomDs): "giai_tri" | "hoc" => (n === "tinh_phut" ? "giai_tri" : "hoc");
/** Nhóm Ba Mẹ gửi (mới: tinh_phut | khong_tinh_phut; cũ: giai_tri | hoc | cho_phep) ⇒ nhóm, sai ⇒ null. */
export const nhanNhom = (v: unknown): NhomDs | null =>
  v === "tinh_phut" || v === "giai_tri" ? "tinh_phut" : v === "khong_tinh_phut" || v === "hoc" || v === "cho_phep" ? "khong_tinh_phut" : null;

/** Lưới an toàn chung (KHÔNG phải quy tắc Ba Mẹ chỉnh — màn «Luôn chặn» đã bỏ 15/11): các tên miền này không bao giờ vào được danh sách
 *  (không thêm, không duyệt lời xin). Ở «Theo danh sách» chúng vốn ngoài danh sách nên không mở; «Mở hết» không chặn gì (#258). */
export const WEB_CAM: Record<"nguoi_lon" | "co_bac" | "bao_luc", { ten: string; mien: string[] }> = {
  nguoi_lon: { ten: "Web người lớn", mien: [
    "pornhub.com", "xvideos.com", "xnxx.com", "xhamster.com", "redtube.com", "youporn.com", "tube8.com", "spankbang.com", "eporner.com",
    "porntrex.com", "beeg.com", "youjizz.com", "tnaflix.com", "hentaihaven.xxx", "nhentai.net", "rule34.xxx", "e-hentai.org", "onlyfans.com",
    "chaturbate.com", "stripchat.com", "bongacams.com", "livejasmin.com", "cam4.com", "myfreecams.com", "fansly.com", "brazzers.com",
    "sex.com", "porn.com", "motherless.com", "heavy-r.com", "javhd.com", "jav.guru", "missav.com", "sextop1.net", "phimsex.com",
  ] },
  co_bac: { ten: "Cờ bạc", mien: [
    "bet365.com", "1xbet.com", "188bet.com", "w88.com", "m88.com", "fun88.com", "12bet.com", "fb88.com", "kubet.com", "ku11.net", "dafabet.com",
    "betway.com", "williamhill.com", "pinnacle.com", "stake.com", "roobet.com", "bc.game", "pokerstars.com", "888casino.com", "888poker.com",
    "bovada.lv", "betfair.com", "unibet.com", "sbobet.com", "vn88.com", "new88.com", "jun88.com", "hi88.com", "f8bet.com", "shbet.com",
    "789bet.com", "8xbet.com", "mu88.com", "oxbet.com", "debet.com", "bk8.com", "v9bet.com", "letou.com", "happyluke.com", "go88.com",
  ] },
  bao_luc: { ten: "Bạo lực", mien: [
    "bestgore.fun", "theync.com", "kaotic.com", "goregrish.com", "crazyshit.com", "documentingreality.com", "seegore.com", "gorecenter.com",
    "deathaddict.com", "watchpeopledie.tv",
  ] },
};
export const WEB_LUON_CHAN: string[] = [...new Set(Object.values(WEB_CAM).flatMap((n) => n.mien))].sort();
const BO_CAM = new Set(WEB_LUON_CHAN);

/** Tên miền (đã chuẩn chữ thường, không www) thuộc nhóm luôn chặn — gồm tên miền con (m.pornhub.com ⇒ pornhub.com). */
export function laWebCam(muc: string): boolean {
  const t = String(muc ?? "").trim().toLowerCase().replace(/^www\./, "");
  if (!t.includes(".") || t.endsWith(".exe")) return false;
  const p = t.split(".");
  for (let i = 0; i < p.length - 1; i++) if (BO_CAM.has(p.slice(i).join("."))) return true;
  return false;
}
