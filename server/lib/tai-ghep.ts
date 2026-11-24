// /tai/ghep/<g> (route app/tai/ghep/[g]): bộ cài Windows MANG SẴN gói ghép trong tên tệp (`AiiGrow-Setup.enroll-<gói>.exe`) ⇒ bộ cài W2
// (SetupForm, EnrollmentReader.FromFileName) tự ghép bằng `POST /api/device/ghep-goi`, không gõ mã. Tệp gốc nằm ở GitHub Release (không đổi
// được tên tệp qua chuyển hướng) ⇒ máy chủ CHUYỂN TIẾP luồng byte (~186 MB, không đệm) kèm Content-Disposition.
// #551: route công khai ⇒ người lạ mở hàng trăm kết nối làm cạn băng thông / worker của VPS 1 vCPU. Nay chỉ chuyển tiếp khi:
//   · token là gói cài CÒN HIỆU LỰC (goi_cai: có, chưa dùng, chưa hết hạn, gói Windows hoặc gói «phiên ghép» chưa gắn loại máy);
//   · ≤ TAI_TOKEN_GIO lượt / token / giờ và ≤ TAI_IP_GIO lượt / IP / giờ (IPv6 gộp /64 — gia-dinh.ts › nguonGoi);
//   · ≤ TAI_KHOI48_GIO lượt / khối IPv6 /48 / giờ, ≤ TAI_NHA_GIO lượt / gia đình / giờ (tạo nhiều gói không thêm lượt), ≤ TAI_TONG_GIO toàn cục / giờ;
//   · ≤ TAI_DONG_THOI luồng chuyển tiếp đồng thời trong tiến trình, mỗi luồng cắt khi ngừng đọc TAI_NGUNG_MS hoặc quá TAI_TOI_DA_MS; tắt đệm nginx (X-Accel-Buffering: no)
//     để trần luồng đúng là trần kết nối tải ra ngoài.
// Lượt đã giữ được trả lại khi rốt cuộc không chuyển tiếp (đầy luồng, GitHub lỗi, vướng trần sau).
// Không đạt ⇒ 302 về bộ cài thường (gõ mã 6 số) — người dùng thật vẫn tải được, máy chủ không tốn băng thông. Lỗi lấy tệp ⇒ như vậy.
import { BAN_AGENT_WINDOWS } from "./ban-agent.ts";
import { sha } from "./auth.ts";
import { q } from "./db.ts";
import { chuanToken } from "./ios-link.ts";
import { khoi48 } from "./gia-dinh.ts";
import { goiGhep, tenTepWindows } from "./trang-tai.ts";
import { bangM4b } from "./tuan-thu.ts";

export const TAI_TOKEN_GIO = 5;
export const TAI_IP_GIO = 10;
export const TAI_KHOI48_GIO = 30;
export const TAI_NHA_GIO = 10;
export const TAI_TONG_GIO = 150;
export const TAI_DONG_THOI = 16;
export const TAI_NGUNG_MS = 2 * 60_000;       // người tải không đọc thêm byte nào trong ngần này ⇒ cắt (đọc rề rà giữ chỗ)
export const TAI_TOI_DA_MS = 60 * 60_000;     // trần cứng một lượt tải (~186 MB ở ≥ 0,05 MB/s)
const GIO_MS = 3_600_000;

const nguonBoCai = () =>
  `https://github.com/tanthanhkid/aiigrow-tai/releases/download/v${BAN_AGENT_WINDOWS.version}/AiiGrow-Setup-${BAN_AGENT_WINDOWS.version}.exe`;

const g0 = globalThis as unknown as { __aiigTaiGhep?: number };
/** Số luồng đang chuyển tiếp trong tiến trình (test đọc). */
export const dangTai = () => g0.__aiigTaiGhep ?? 0;

async function giuLuot(khoa: string, tran: number) {
  const r = (await q<{ so_lan: number }>(`insert into pin_sai(khoa, so_lan) values ($1, 1)
    on conflict (khoa) do update set so_lan = pin_sai.so_lan + 1 returning so_lan`, [khoa]))[0];
  return r.so_lan <= tran;
}
const traLuot = (khoa: string) =>
  q(`update pin_sai set so_lan = greatest(0, so_lan - 1) where khoa = $1`, [khoa]).then(() => undefined, () => undefined);

/** Gói cài còn hiệu lực cho Windows? */
async function goiConHan(g: string, now: Date) {
  await bangM4b();
  return (await q<{ family_id: string }>(`select family_id from goi_cai where token_hash = $1 and used_at is null and expires_at > $2
    and platform in ('windows', '')`, [sha(g), now]))[0]?.family_id ?? null;
}

/** Giữ một chỗ luồng đồng thời (đồng bộ — không có await giữa kiểm và tăng). → hàm nhả (gọi nhiều lần vô hại), hoặc null nếu đã đầy. */
function giuLuong() {
  if (dangTai() >= TAI_DONG_THOI) return null;
  g0.__aiigTaiGhep = dangTai() + 1;
  let xong = false;
  return () => { if (!xong) { xong = true; g0.__aiigTaiGhep = Math.max(0, dangTai() - 1); } };
}

/** Hẹn giờ thay được trong test (không dùng đồng hồ thật). → hàm huỷ hẹn. */
type DatHen = (fn: () => void, ms: number) => () => void;
const henThat: DatHen = (fn, ms) => {
  const h = setTimeout(fn, ms);
  (h as { unref?: () => void }).unref?.();
  return () => clearTimeout(h);
};

/** Bọc luồng: nhả chỗ khi đọc xong / lỗi / người tải huỷ (đóng kết nối) / ngừng đọc quá TAI_NGUNG_MS / quá TAI_TOI_DA_MS. */
function demLuong(nguon: ReadableStream<Uint8Array>, nhaCho: () => void, datHen: DatHen) {
  const doc = nguon.getReader();
  let huyNgung = () => {}, huyToiDa = () => {};
  const nha = () => { huyNgung(); huyToiDa(); nhaCho(); };
  let cat = (_ly: string) => {};
  return new ReadableStream<Uint8Array>({
    start(c) {
      cat = (ly) => { nha(); try { c.error(new Error(ly)); } catch { /* đã đóng */ } doc.cancel().catch(() => undefined); };
      huyToiDa = datHen(() => cat("quá giờ tải"), TAI_TOI_DA_MS);
      huyNgung = datHen(() => cat("ngừng đọc"), TAI_NGUNG_MS);
    },
    async pull(c) {
      // hẹn «ngừng» KHÔNG huỷ khi đang chờ GitHub ⇒ bắt cả hai phía đứng: người tải không đọc, hoặc GitHub không gửi tiếp
      try {
        const { done, value } = await doc.read();
        if (done) { nha(); c.close(); return; }
        c.enqueue(value);
        huyNgung();
        huyNgung = datHen(() => cat("ngừng đọc"), TAI_NGUNG_MS);
      } catch (e) { nha(); c.error(e); }
    },
    async cancel(ly) { nha(); await doc.cancel(ly).catch(() => undefined); },
  });
}

/** GET /tai/ghep/<g>. `server` = gốc link ghép (AIIGROW_APP_URL hoặc origin), `ip` = nguonGoi(req.headers). `layTep`, `datHen` thay được trong test. */
export async function taiGhep(gVao: unknown, server: string, ip: string, now = new Date(), layTep: typeof fetch = globalThis.fetch,
  datHen: DatHen = henThat) {
  const thuong = Response.redirect(BAN_AGENT_WINDOWS.url, 302);
  const g = chuanToken(gVao);
  if (!g || g.length < 20) return thuong;
  if (dangTai() >= TAI_DONG_THOI) return thuong;          // đầy luồng ⇒ khỏi tra DB
  const nha0 = await goiConHan(g, now);
  if (!nha0) return thuong;
  const k = Math.floor(now.getTime() / GIO_MS);
  const k48 = khoi48(ip);
  // theo token trước: token đã hết lượt thì không đốt tiếp lượt của IP (nhiều nhà chung NAT)
  const tran: [string, number][] = [
    [`tai_ghep_tk:${sha(g)}:${k}`, TAI_TOKEN_GIO],
    [`tai_ghep_nha:${nha0}:${k}`, TAI_NHA_GIO],
    [`tai_ghep_ip:${ip}:${k}`, TAI_IP_GIO],
    ...(k48 ? [[`tai_ghep_48:${k48}:${k}`, TAI_KHOI48_GIO] as [string, number]] : []),
    [`tai_ghep_tong:${k}`, TAI_TONG_GIO],
  ];
  const daGiu: string[] = [];
  const traHet = () => Promise.all(daGiu.map(traLuot));
  for (const [khoa, n] of tran) {
    const ok = await giuLuot(khoa, n).then((x) => { daGiu.push(khoa); return x; }, () => false);   // lỗi DB ⇒ chưa tăng, không trả
    if (!ok) { await traHet(); return thuong; }
  }
  const nha = giuLuong();                                 // kiểm lại sau các lượt chờ DB, giữ chỗ trước khi gọi GitHub
  if (!nha) { await traHet(); return thuong; }
  const huy = new AbortController();
  const huyHen = datHen(() => huy.abort(), TAI_NGUNG_MS);     // GitHub không trả đầu đáp ⇒ bỏ, khỏi giữ chỗ
  const r = await layTep(nguonBoCai(), { redirect: "follow", signal: huy.signal }).catch(() => null);
  huyHen();
  if (!r?.ok || !r.body) { await r?.body?.cancel().catch(() => undefined); nha(); await traHet(); return thuong; }
  const dai = r.headers.get("content-length");
  return new Response(demLuong(r.body, nha, datHen), {
    headers: {
      "content-type": "application/octet-stream",
      ...dauDap(server, g),
      ...(dai ? { "content-length": dai } : {}),
      "x-accel-buffering": "no",
    },
  });
}

const dauDap = (server: string, g: string) => ({
  "content-disposition": `attachment; filename="${tenTepWindows(goiGhep(server, g))}"`,
  "cache-control": "no-store",
  "x-robots-tag": "noindex",
});

/** HEAD /tai/ghep/<g> (trình tải như IDM dò tên tệp trước): gói còn hạn ⇒ 200 cùng tên tệp như GET, không đốt lượt, không gọi GitHub. */
export async function dauTaiGhep(gVao: unknown, server: string, now = new Date()) {
  const g = chuanToken(gVao);
  if (!g || g.length < 20 || !(await goiConHan(g, now))) return Response.redirect(BAN_AGENT_WINDOWS.url, 302);
  return new Response(null, { headers: { "content-type": "application/octet-stream", ...dauDap(server, g) } });
}

/** Cron hằng ngày: xoá bộ đếm tải của các giờ đã qua. → số dòng. */
export async function donBoDemTaiGhep(now = Date.now()) {
  const k = Math.floor(now / GIO_MS);
  return (await q(`delete from pin_sai where khoa like 'tai\\_ghep\\_%'
    and substring(khoa from '[0-9]+$')::bigint < $1 returning 1`, [k - 1])).length;
}
