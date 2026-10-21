// M4b — phản hồi nhịp cho agent: tuân thủ + chính sách chung + cấu hình đã chuyển đổi cho nền tảng của máy + lệnh đang chờ.
import type { May } from "./gia-dinh.ts";
import { chinhSachChung } from "./chinh-sach.ts";
import { chuyenDoi, LA_TV, NEN_CHUYEN_DOI, type NenChuyenDoi } from "./chuyen-doi.ts";
import { nhanNhip, tongHop, tuanThuMay, type NhipVao } from "./tuan-thu.ts";
import { one } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { conCua } from "./gia-dinh.ts";
import { lenhCho } from "./lenh-may.ts";

export async function nhipMay(may: May, con: string | null, b: NhipVao, now = new Date()) {
  const kq = await nhanNhip(may, b, now);
  const cs = await chinhSachChung(may, con, kq.tuanThu, now);
  const nen = ((NEN_CHUYEN_DOI as readonly string[]).includes(may.platform) ? may.platform : "windows") as NenChuyenDoi;
  return { serverTime: now.toISOString(), tuanThu: kq.tuanThu, chinhSach: cs, nenTang: chuyenDoi(cs, nen), lenh: await lenhCho(may) };
}

// ---------------------------------------------------------------- phía Ba Mẹ: xem trước cấu hình nền tảng · luật tầng mạng cho TV
/** Ba Mẹ xem máy này nhận cấu hình gì (và OS không làm được gì). */
export async function cauHinhNenTangMay(fam: string, mayId: string, now = new Date()) {
  const may = await one<May>(`select * from devices where id = $1 and family_id = $2`, [mayId, fam]);
  if (!may) throw new LoiNghiepVu("khong_thay", "Không thấy thiết bị", 404);
  const cs = await chinhSachChung(may, may.child_id, await tuanThuMay(may, now), now);
  const nen = ((NEN_CHUYEN_DOI as readonly string[]).includes(may.platform) ? may.platform : "windows") as NenChuyenDoi;
  return { chinhSach: cs, nenTang: chuyenDoi(cs, nen) };
}

/** TV / thiết bị không có agent: luật router + DNS theo MAC, dựng từ chính sách chung của Con. `nen`: tvos | android_tv | tizen | webos | mang. */
export async function luatMangCon(fam: string, con: string, o: { mac?: unknown; ten?: unknown; nen?: unknown }, now = new Date()) {
  const c = await conCua(fam, con);
  const nenVao = String(o.nen ?? "mang") as NenChuyenDoi;
  const nen: NenChuyenDoi = LA_TV(nenVao) || nenVao === "mang" ? nenVao : "mang";
  const ten = String(o.ten ?? "").trim().slice(0, 60) || `TV của ${c.ten}`;
  const gia: May = { id: `mang:${String(o.mac ?? "")}`.slice(0, 40), child_id: con, family_id: fam, platform: "android", name: ten, dung_chung: false,
    status: {}, last_seen: null, created_at: now };
  const cs = await chinhSachChung(gia, con, tongHop([], 0, null, now), now);
  return chuyenDoi({ ...cs, may: { ...cs.may, nen } }, nen, { mac: o.mac, ten });
}
