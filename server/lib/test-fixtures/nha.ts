// Dựng gia đình thử cho test: Ba Mẹ (Chủ) + Con. Mỗi tệp test chạy trong tiến trình riêng với PGlite trong bộ nhớ.
import { newId, q } from "../db.ts";

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
