// #555: PIN 4 số của bé (children.pin_ma) MÃ HOÁ bằng khoá ứng dụng phía máy chủ thay vì lưu rõ.
//   • Vì sao mã hoá (không băm): Ba Mẹ cần «Hiện» lại PIN (màn PIN của Con) và agent cần vân PIN (pin-be.ts › vanPin) — băm không đọc lại được;
//     băm 4 số cũng dò lại ngoại tuyến tức thì. Mã hoá AES-256-GCM với khoá KHÔNG nằm trong DB ⇒ lộ bản sao / backup DB không lộ PIN.
//   • Khoá: AIIGROW_PIN_KHOA (≥ 32 ký tự ngẫu nhiên, đặt trong /etc/aiigrow/aiigrow.env) — chưa đặt thì suy ra (HKDF) từ CRON_SECRET; môi trường
//     dev/test không có cả hai thì dùng khoá dev cố định. Production thiếu cả hai ⇒ suy từ DATABASE_URL + cảnh báo to (vẫn hơn lưu rõ).
//   • Dạng lưu: `p1.<mã khoá 8 hex>.<iv base64url>.<bản mã+tag base64url>`; AAD = id Con (chép pin_ma sang Con khác không giải được).
//   • Đổi khoá (vd đặt AIIGROW_PIN_KHOA sau khi đã chạy bằng khoá suy từ CRON_SECRET): khoá cũ vẫn còn trong vòng khoá ⇒ đọc được, và
//     `chuyenPinCu` lúc mở DB mã hoá lại theo khoá chính. Khoá cũ đã mất hẳn ⇒ PIN đó không giải được: Ba Mẹ thấy «chưa xem được», đặt PIN mới.
// Tệp này KHÔNG nhập db.ts (db.ts gọi chuyenPinCu lúc mở) — chỉ nhận hàm truy vấn.
import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";

type Khoa = { id: string; k: Buffer };
type Truy = <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;

const tuChuoi = (bi: string, nhan: string) => Buffer.from(hkdfSync("sha256", Buffer.from(bi), Buffer.from("aiigrow"), Buffer.from(nhan), 32));
const khoa = (k: Buffer): Khoa => ({ id: createHash("sha256").update(k).digest("hex").slice(0, 8), k });

let canhBaoRoi = false;
/** Vòng khoá: phần tử đầu = khoá chính (mã hoá), các phần tử sau chỉ để giải bản cũ. Đọc env mỗi lần (test đổi env được). */
export function vongKhoa(env: Record<string, string | undefined> = process.env): Khoa[] {
  const ds: Khoa[] = [];
  if (env.AIIGROW_PIN_KHOA) ds.push(khoa(tuChuoi(env.AIIGROW_PIN_KHOA, "pin-be/khoa")));
  if (env.CRON_SECRET) ds.push(khoa(tuChuoi(env.CRON_SECRET, "pin-be/cron")));
  if (env.NODE_ENV !== "production") ds.push(khoa(tuChuoi("aiigrow-dev-khong-dung-o-prod", "pin-be/dev")));
  else if (!ds.length) {
    if (!canhBaoRoi) { canhBaoRoi = true; console.error("[AN NINH] Thiếu AIIGROW_PIN_KHOA (và CRON_SECRET) — PIN bé đang mã hoá bằng khoá suy từ DATABASE_URL. Đặt AIIGROW_PIN_KHOA."); }
    ds.push(khoa(tuChuoi(env.DATABASE_URL ?? "aiigrow", "pin-be/db")));
  }
  return ds;
}

const b64 = (b: Buffer) => b.toString("base64url");

/** Mã hoá PIN của Con `con`. */
export function maHoaPin(con: string, pin: string, ds = vongKhoa()): string {
  const { id, k } = ds[0];
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  c.setAAD(Buffer.from(con));
  const ma = Buffer.concat([c.update(pin, "utf8"), c.final(), c.getAuthTag()]);
  return `p1.${id}.${b64(iv)}.${b64(ma)}`;
}

/** Đã ở dạng mã hoá chưa (dữ liệu cũ: 4 chữ số rõ). */
export const daMaHoa = (v: string | null | undefined) => !!v && v.startsWith("p1.");

/** Giải pin_ma → PIN 4 số; null = không có PIN hoặc không giải được (khoá đã mất / dữ liệu hỏng). Giá trị rõ cũ (trước khi chuyển) trả nguyên. */
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

/** Chuyển dữ liệu (chạy lại được, gọi mỗi lần mở DB): PIN rõ cũ ⇒ mã hoá; PIN mã bằng khoá phụ còn giữ ⇒ mã lại bằng khoá chính.
 *  Ghi có điều kiện `pin_ma = <giá trị vừa đọc>` ⇒ Ba Mẹ đặt PIN mới chen giữa không bị đè. → số dòng đã chuyển. */
export async function chuyenPinCu(q: Truy, ds = vongKhoa()): Promise<number> {
  const chinh = ds[0].id;
  const rows = await q<{ id: string; pin_ma: string }>(`select id, pin_ma from children where pin_ma is not null and pin_ma not like $1`, [`p1.${chinh}.%`]);
  let n = 0;
  for (const r of rows) {
    const pin = giaiPin(r.id, r.pin_ma, ds);
    if (!pin) continue;                                   // khoá cũ đã mất / hỏng ⇒ để nguyên (Ba Mẹ đặt lại)
    n += (await q(`update children set pin_ma = $3 where id = $1 and pin_ma = $2 returning 1`, [r.id, r.pin_ma, maHoaPin(r.id, pin, ds)])).length;
  }
  return n;
}
