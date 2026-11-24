// /tai/ghep/<g> (route app/tai/ghep/[g]): bộ cài Windows MANG SẴN gói ghép trong tên tệp (`AiiGrow-Setup.enroll-<gói>.exe`) ⇒ bộ cài W2
// (SetupForm, EnrollmentReader.FromFileName) tự ghép bằng `POST /api/device/ghep-goi`, không gõ mã. Tệp gốc nằm ở GitHub Release (không đổi
// được tên tệp qua chuyển hướng) ⇒ máy chủ CHUYỂN TIẾP luồng byte (~186 MB, không đệm) kèm Content-Disposition.
// #551: route công khai ⇒ người lạ mở hàng trăm kết nối làm cạn băng thông / worker của VPS 1 vCPU. Nay chỉ chuyển tiếp khi:
//   · token là gói cài CÒN HIỆU LỰC (goi_cai: có, chưa dùng, chưa hết hạn, gói Windows hoặc gói «phiên ghép» chưa gắn loại máy);
//   · ≤ TAI_TOKEN_GIO lượt / token / giờ và ≤ TAI_IP_GIO lượt / IP / giờ (IPv6 gộp /64 — gia-dinh.ts › nguonGoi);
//   · ≤ TAI_DONG_THOI luồng chuyển tiếp đồng thời trong tiến trình.
// Không đạt ⇒ 302 về bộ cài thường (gõ mã 6 số) — người dùng thật vẫn tải được, máy chủ không tốn băng thông. Lỗi lấy tệp ⇒ như vậy.
import { BAN_AGENT_WINDOWS } from "./ban-agent.ts";
import { sha } from "./auth.ts";
import { q } from "./db.ts";
import { chuanToken } from "./ios-link.ts";
import { goiGhep, tenTepWindows } from "./trang-tai.ts";
import { bangM4b } from "./tuan-thu.ts";

export const TAI_TOKEN_GIO = 5;
export const TAI_IP_GIO = 10;
export const TAI_DONG_THOI = 4;
const GIO_MS = 3_600_000;

export const nguonBoCai = () =>
  `https://github.com/tanthanhkid/aiigrow-tai/releases/download/v${BAN_AGENT_WINDOWS.version}/AiiGrow-Setup-${BAN_AGENT_WINDOWS.version}.exe`;

const g0 = globalThis as unknown as { __aiigTaiGhep?: number };
/** Số luồng đang chuyển tiếp trong tiến trình (test đọc). */
export const dangTai = () => g0.__aiigTaiGhep ?? 0;

async function giuLuot(khoa: string, tran: number) {
  const r = (await q<{ so_lan: number }>(`insert into pin_sai(khoa, so_lan) values ($1, 1)
    on conflict (khoa) do update set so_lan = pin_sai.so_lan + 1 returning so_lan`, [khoa]))[0];
  return r.so_lan <= tran;
}

/** Gói cài còn hiệu lực cho Windows? */
async function goiConHan(g: string, now: Date) {
  await bangM4b();
  return (await q(`select 1 from goi_cai where token_hash = $1 and used_at is null and expires_at > $2 and platform in ('windows', '')`,
    [sha(g), now])).length > 0;
}

/** Giữ một chỗ luồng đồng thời (đồng bộ — không có await giữa kiểm và tăng). → hàm nhả (gọi nhiều lần vô hại), hoặc null nếu đã đầy. */
function giuLuong() {
  if (dangTai() >= TAI_DONG_THOI) return null;
  g0.__aiigTaiGhep = dangTai() + 1;
  let xong = false;
  return () => { if (!xong) { xong = true; g0.__aiigTaiGhep = Math.max(0, dangTai() - 1); } };
}

/** Bọc luồng: nhả chỗ khi đọc xong / lỗi / người tải huỷ (đóng kết nối). */
function demLuong(nguon: ReadableStream<Uint8Array>, nha: () => void) {
  const doc = nguon.getReader();
  return new ReadableStream<Uint8Array>({
    async pull(c) {
      try {
        const { done, value } = await doc.read();
        if (done) { nha(); c.close(); } else c.enqueue(value);
      } catch (e) { nha(); c.error(e); }
    },
    async cancel(ly) { nha(); await doc.cancel(ly).catch(() => undefined); },
  });
}

/** GET /tai/ghep/<g>. `server` = gốc link ghép (AIIGROW_APP_URL hoặc origin), `ip` = nguonGoi(req.headers). `layTep` thay được trong test. */
export async function taiGhep(gVao: unknown, server: string, ip: string, now = new Date(), layTep: typeof fetch = globalThis.fetch) {
  const thuong = Response.redirect(BAN_AGENT_WINDOWS.url, 302);
  const g = chuanToken(gVao);
  if (!g || g.length < 20) return thuong;
  if (!(await goiConHan(g, now))) return thuong;
  if (dangTai() >= TAI_DONG_THOI) return thuong;
  const k = Math.floor(now.getTime() / GIO_MS);
  // theo token trước: token đã hết lượt thì không đốt tiếp lượt của IP (nhiều nhà chung NAT)
  if (!(await giuLuot(`tai_ghep_tk:${sha(g)}:${k}`, TAI_TOKEN_GIO))) return thuong;
  if (!(await giuLuot(`tai_ghep_ip:${ip}:${k}`, TAI_IP_GIO))) return thuong;
  const nha = giuLuong();                                 // kiểm lại sau các lượt chờ DB, giữ chỗ trước khi gọi GitHub
  if (!nha) return thuong;
  const r = await layTep(nguonBoCai(), { redirect: "follow" }).catch(() => null);
  if (!r?.ok || !r.body) { nha(); return thuong; }
  const dai = r.headers.get("content-length");
  return new Response(demLuong(r.body, nha), {
    headers: {
      "content-type": "application/octet-stream",
      "content-disposition": `attachment; filename="${tenTepWindows(goiGhep(server, g))}"`,
      ...(dai ? { "content-length": dai } : {}),
      "cache-control": "no-store",
      "x-robots-tag": "noindex",
    },
  });
}

/** Cron hằng ngày: xoá bộ đếm tải của các giờ đã qua. → số dòng. */
export async function donBoDemTaiGhep(now = Date.now()) {
  const k = Math.floor(now / GIO_MS);
  return (await q(`delete from pin_sai where (khoa like 'tai\\_ghep\\_tk:%' or khoa like 'tai\\_ghep\\_ip:%')
    and substring(khoa from '[0-9]+$')::bigint < $1 returning 1`, [k - 1])).length;
}
