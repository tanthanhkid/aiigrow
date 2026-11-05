// Chặn app theo CON — hai chế độ (thiết kế chốt 05/11, L4 — docs/KE-HOACH-KHOP-THIET-KE-0511.md). Tệp THUẦN (không nhập module nào)
// để may-con / agent-windows / web / luat-app cùng dùng mà không vòng nhập.
//   • chi_app_duoc_phep (mặc định, máy mới cũng vậy): máy chỉ mở app / web Ba Mẹ cho phép; app / web lạ ⇒ Con «Xin Ba Mẹ duyệt».
//   • mo_het: mở mọi app / web, chỉ tính giờ chơi; app / trang Ba Mẹ đặt «Chặn» vẫn chặn.
// Hai chế độ đều LUÔN chặn web người lớn, cờ bạc, bạo lực (WEB_LUON_CHAN) — Ba Mẹ không tắt được, không cho phép được.
// Máy luôn «chặn thật» (bỏ «Giám sát / Chặn thật» khỏi màn Ba Mẹ): agent cũ vẫn nhận `cheDo: "chan"` (lib/lenh-may.ts › cheDoGuiMay).

export const CHE_DO_CHAN = ["chi_app_duoc_phep", "mo_het"] as const;
export type CheDoChan = (typeof CHE_DO_CHAN)[number];
export const TEN_CHE_DO_CHAN: Record<CheDoChan, string> = { chi_app_duoc_phep: "Chỉ app được phép", mo_het: "Mở hết" };

/** children.che_do_chan ⇒ chế độ hiệu lực. null (Con tạo trước 05/11) ⇒ chi_app_duoc_phep — đúng cách máy đã chặn từ trước. */
export const cheDoChanCua = (v: unknown): CheDoChan => (v === "mo_het" ? "mo_het" : "chi_app_duoc_phep");

/** Nhóm web luôn chặn (màn «Luôn chặn» — bm-ung-dung/07). Danh sách tên miền gốc đã biết; khớp cả tên miền con. Bổ sung dần ở đây. */
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
