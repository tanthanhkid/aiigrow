// #555: PIN 4 số của bé (children.pin_ma) MÃ HOÁ bằng khoá ứng dụng phía máy chủ thay vì lưu rõ.
//   • Vì sao mã hoá (không băm): Ba Mẹ cần «Hiện» lại PIN (màn PIN của Con) và agent cần vân PIN (pin-be.ts › vanPin) — băm không đọc lại được;
//     băm 4 số cũng dò lại ngoại tuyến tức thì. Mã hoá AES-256-GCM với khoá KHÔNG nằm trong DB ⇒ lộ bản sao / backup DB không lộ PIN.
//   • Khoá: AIIGROW_PIN_KHOA (≥ 32 ký tự ngẫu nhiên, chỉ dùng cho việc này — đặt trong /etc/aiigrow/aiigrow.env). Đổi khoá: đặt khoá mới vào
//     AIIGROW_PIN_KHOA, khoá cũ vào AIIGROW_PIN_KHOA_CU (nhiều khoá cách bằng dấu phẩy) ⇒ lần mở DB sau `chuyenPinCu` mã lại theo khoá mới.
//     Khoá ngắn hơn 32 ký tự bị bỏ (cảnh báo). Dev/test dùng PGlite (không DATABASE_URL, NODE_ENV ≠ production) ⇒ khoá dev cố định — KHÔNG BAO GIỜ
//     dùng khoá dev khi nối Postgres thật (script chạy tay với DATABASE_URL prod mà quên env sẽ mã lại PIN bằng khoá công khai).
//     CHƯA CÓ KHOÁ CHÍNH ⇒ KHÔNG mã hoá (giữ như trước, cảnh báo to lúc mở DB), khoá trong _CU chỉ để giải:
//     không đoán khoá từ bí mật khác (CRON_SECRET… có thể đổi bất cứ lúc nào ⇒ mất mọi PIN).
//   • Dạng lưu: `p1.<mã khoá 8 hex>.<iv base64url>.<bản mã+tag base64url>`; AAD = id Con (chép pin_ma sang Con khác không giải được).
//     Giá trị 4 chữ số = dữ liệu cũ / chưa có khoá — vẫn đọc được. Khoá của bản mã không còn trong vòng ⇒ giaiPin null: Ba Mẹ đặt PIN mới.
// Tệp này KHÔNG nhập db.ts (db.ts gọi chuyenPinCu lúc mở) — chỉ nhận hàm truy vấn.
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";

type Khoa = { id: string; k: Buffer; chinh?: boolean };
type Truy = <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;
type Env = Record<string, string | undefined>;

const tuChuoi = (bi: string) => Buffer.from(hkdfSync("sha256", Buffer.from(bi), Buffer.from("aiigrow"), Buffer.from("pin-be/khoa"), 32));
const khoa = (bi: string): Khoa => { const k = tuChuoi(bi); return { id: createHash("sha256").update(k).digest("hex").slice(0, 8), k }; };
const KHOA_DEV = "aiigrow-dev-khong-dung-o-prod";

let nho: { sig: string; ds: Khoa[] } | null = null;
const canhBaoDaIn = new Set<string>();
const canhBao1 = (m: string) => { if (!canhBaoDaIn.has(m)) { canhBaoDaIn.add(m); console.error(m); } };
/** Vòng khoá: phần tử có `chinh` (nếu có, luôn đứng đầu) = khoá mã hoá; các phần tử còn lại chỉ để giải bản cũ.
 *  Không có khoá chính = chưa đặt AIIGROW_PIN_KHOA (lưu rõ như trước). Nhớ theo giá trị env (test đổi env được, không suy lại HKDF mỗi lần gọi). */
export function vongKhoa(env: Env = process.env): Khoa[] {
  const sig = [env.AIIGROW_PIN_KHOA, env.AIIGROW_PIN_KHOA_CU, env.NODE_ENV, env.DATABASE_URL ? "pg" : ""].join("\u0000");
  if (nho?.sig === sig) return nho.ds;
  const hopLe = (x: string | undefined) => {
    const v = x?.trim();
    if (v && v.length < 32) canhBao1("[AN NINH] Bỏ khoá PIN ngắn hơn 32 ký tự (AIIGROW_PIN_KHOA / AIIGROW_PIN_KHOA_CU) — dùng chuỗi ngẫu nhiên dài.");
    return v && v.length >= 32 ? v : null;
  };
  const chinh = hopLe(env.AIIGROW_PIN_KHOA);
  const ds: Khoa[] = [];
  if (chinh) ds.push({ ...khoa(chinh), chinh: true });
  for (const x of String(env.AIIGROW_PIN_KHOA_CU ?? "").split(",")) { const v = hopLe(x); if (v) ds.push(khoa(v)); }
  if (env.NODE_ENV !== "production" && !env.DATABASE_URL) {             // PGlite dev/test: khoá dev (khoá chính khi chưa đặt khoá riêng)
    if (chinh) ds.push(khoa(KHOA_DEV)); else ds.unshift({ ...khoa(KHOA_DEV), chinh: true });
  }
  const uniq = [...new Map(ds.map((k) => [k.id, k])).values()];
  nho = { sig, ds: uniq };
  return uniq;
}

const b64 = (b: Buffer) => b.toString("base64url");

/** Giá trị lưu vào children.pin_ma cho PIN `pin` của Con `con` (chưa có khoá ở production ⇒ PIN rõ như trước #555). */
export function maHoaPin(con: string, pin: string, ds = vongKhoa()): string {
  if (!ds[0]?.chinh) return pin;
  const { id, k } = ds[0];
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  c.setAAD(Buffer.from(con));
  const ma = Buffer.concat([c.update(pin, "utf8"), c.final(), c.getAuthTag()]);
  return `p1.${id}.${b64(iv)}.${b64(ma)}`;
}

/** Đã ở dạng mã hoá chưa (dữ liệu cũ: 4 chữ số rõ). */
export const daMaHoa = (v: string | null | undefined) => !!v && v.startsWith("p1.");

/** Giải pin_ma → PIN 4 số; null = không có PIN hoặc không giải được (khoá đã mất / dữ liệu hỏng). Giá trị rõ cũ trả nguyên. */
export function giaiPin(con: string, v: string | null | undefined, ds = vongKhoa()): string | null {
  if (!v) return null;
  if (!daMaHoa(v)) return /^\d{4}$/.test(v) ? v : null;
  const [, id, iv, ma] = v.split(".");
  const kh = ds.find((x) => x.id === id);
  if (!kh || !iv || !ma) return null;
  try {
    const b = Buffer.from(ma, "base64url");
    const d = createDecipheriv("aes-256-gcm", kh.k, Buffer.from(iv, "base64url"));
    d.setAAD(Buffer.from(con));
    d.setAuthTag(b.subarray(b.length - 16));
    return Buffer.concat([d.update(b.subarray(0, b.length - 16)), d.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Chuyển dữ liệu (chạy lại được, gọi mỗi lần mở DB): PIN rõ cũ ⇒ mã hoá; PIN mã bằng khoá cũ còn giữ ⇒ mã lại bằng khoá chính.
 *  Ghi có điều kiện `pin_ma = <giá trị vừa đọc>` ⇒ Ba Mẹ đặt PIN mới chen giữa không bị đè. → số dòng đã chuyển (null = production chưa có khoá). */
export async function chuyenPinCu(q: Truy, ds = vongKhoa()): Promise<number | null> {
  if (!ds[0]?.chinh) {
    canhBao1("[AN NINH] Thiếu AIIGROW_PIN_KHOA — PIN của bé (children.pin_ma) vẫn lưu RÕ. Đặt khoá ngẫu nhiên ≥ 32 ký tự trong env rồi khởi động lại (#555).");
    return null;
  }
  const chinh = ds[0].id;
  const rows = await q<{ id: string; pin_ma: string }>(`select id, pin_ma from children where pin_ma is not null and pin_ma not like $1`, [`p1.${chinh}.%`]);
  let n = 0, mat = 0;
  for (const r of rows) {
    const pin = giaiPin(r.id, r.pin_ma, ds);
    if (!pin) { mat++; continue; }                        // khoá cũ đã mất / hỏng ⇒ để nguyên (Ba Mẹ đặt lại)
    n += (await q(`update children set pin_ma = $3 where id = $1 and pin_ma = $2 returning 1`, [r.id, r.pin_ma, maHoaPin(r.id, pin, ds)])).length;
  }
  if (mat) console.error(`[pin-ma] ${mat} PIN không giải được bằng khoá hiện có (thiếu khoá cũ trong AIIGROW_PIN_KHOA_CU?) — Ba Mẹ cần đặt lại.`);
  return n;
}
