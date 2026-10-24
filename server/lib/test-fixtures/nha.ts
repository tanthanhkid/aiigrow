// Dựng gia đình thử cho test: Ba Mẹ (Chủ) + Con. Mỗi tệp test chạy trong tiến trình riêng với PGlite trong bộ nhớ.
import { newId, q } from "../db.ts";
import { gioDiaPhuong } from "../gio.ts";
import { lichCua } from "../cau-hinh.ts";

export async function taoNha(ten = "Lan", tz = "Asia/Ho_Chi_Minh") {
  const fam = newId(), bm = newId();
  await q(`insert into families(id, ten, tz) values ($1, $2, $3)`, [fam, `Nhà ${ten}`, tz]);
  await q(`insert into parents(id, family_id, dinh_danh, ten, vai) values ($1, $2, $3, $4, 'chu')`, [bm, fam, `${bm}@vidu.vn`, ten]);
  return { fam, bm };
}

export async function taoBaMe(fam: string, ten = "Ba", vai = "duyet") {
  const id = newId();
  await q(`insert into parents(id, family_id, dinh_danh, ten, vai) values ($1, $2, $3, $4, $5)`, [id, fam, `${id}@vidu.vn`, ten, vai]);
  return id;
}

/** Ảnh PNG giả (base64) khác nhau theo `hat` — đủ để băm khác nhau. */
export const anhGia = (hat: string) => ({ mime: "image/png", base64: Buffer.from(`\x89PNG-gia-${hat}`).toString("base64") });

const hhmm = (phut: number) => { const p = ((phut % 1440) + 1440) % 1440; return `${String(Math.floor(p / 60)).padStart(2, "0")}:${String(p % 60).padStart(2, "0")}`; };

/** Lịch cho Con để test đi qua route dùng đồng hồ thật (new Date() bên trong route) cho kết quả như nhau ở mọi giờ chạy
 *  (lịch mặc định: 21:00 VN rơi vào giờ ngủ 21:00–06:30, 10:00 ngày thường ngoài khung 17:00–20:00).
 *  Một khung chơi qua nửa đêm phủ cả ngày trừ MỘT phút, giờ ngủ đúng phút hở đó — giá trị bình thường, mọi module (phien, agent-windows,
 *  chuyen-doi/DNS) hiểu như nhau; không dùng khung suy biến tu = den. Phút hở đặt cách «bây giờ» (và các mốc `tranh` test tự dùng,
 *  vd giờ cố định của moPhien) ≥ 2 giờ ⇒ khung còn ≥ 2 giờ, phutToiDa / playOfflineMinutes không bị khung cắt ngắn. */
export async function luonChoiDuoc(con: string, tranh: Date[] = []) {
  const tz = (await q<{ tz: string }>(`select f.tz from children c join families f on f.id = c.family_id where c.id = $1`, [con]))[0]!.tz;
  const moc = [new Date(), ...tranh].map((d) => gioDiaPhuong(d, tz).phut);
  const xa = (h: number) => moc.every((m) => Math.min(Math.abs(h - m), 1440 - Math.abs(h - m)) >= 120);
  let ho = moc[0] + 720;
  for (let i = 0; i < 24 && !xa(((ho % 1440) + 1440) % 1440); i++) ho += 60;
  const khung = [{ tu: hhmm(ho + 1), den: hhmm(ho) }];
  const lich = { ngayThuong: khung, cuoiTuan: khung, ngu: { tu: hhmm(ho), den: hhmm(ho + 1) } };
  await q(`update children set lich = $2::jsonb where id = $1`, [con, JSON.stringify(lichCua(lich))]);
  return lich;
}
