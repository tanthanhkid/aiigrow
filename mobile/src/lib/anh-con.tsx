// Ảnh đại diện Con (#302): chụp / chọn ảnh ở hồ sơ con. Máy chủ lưu ảnh ở cột riêng (server/lib/gia-dinh.ts › datAnhDaiDien); `avatar` của Con ghi
// «mau-N|anh:<giây>» để mọi danh sách biết Con có ảnh. Ảnh tải riêng (GET con/:id/anh) và nhớ trong bộ nhớ theo dấu «anh:<giây>» — ảnh mới ⇒ dấu mới ⇒ tải lại.
import { useEffect, useState } from "react";
import { bm } from "./api";

export type AnhChon = { mime: string; base64: string };
/** «mau-2|anh:1763300000» ⇒ true. */
export const coAnh = (avatar: string | null | undefined) => /\|anh:\d+$/.test(avatar ?? "");

const nho = new Map<string, string>();
const dangTai = new Map<string, Promise<string | null>>();
const khoa = (con: { id?: string | null; avatar?: string | null }) => `${con.id}${(con.avatar ?? "").slice((con.avatar ?? "").indexOf("|"))}`;
const taiAnh = (con: { id?: string | null; avatar?: string | null }) => {
  const k = khoa(con);
  const p = dangTai.get(k) ?? bm.goi<{ mime: string; base64: string }>(`con/${con.id}/anh`)
    .then((r) => { const u = `data:${r.mime};base64,${r.base64}`; nho.set(k, u); return u; })
    .catch(() => null).finally(() => dangTai.delete(k));
  dangTai.set(k, p);
  return p;
};

/** Địa chỉ ảnh đại diện (data URI) của Con; null = chưa có ảnh / đang tải ⇒ vẽ chữ cái như cũ. */
export function useAnhCon(con?: { id?: string | null; avatar?: string | null } | null) {
  const co = !!con?.id && coAnh(con.avatar);
  const k = co && con ? khoa(con) : "";
  const [tai, setTai] = useState<{ k: string; uri: string } | null>(null);
  useEffect(() => {
    if (!co || !con || nho.has(k)) return;
    let song = true;
    taiAnh(con).then((u) => { if (song && u) setTai({ k, uri: u }); });
    return () => { song = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k, co]);
  if (!co) return null;
  return nho.get(k) ?? (tai?.k === k ? tai.uri : null);
}

const TOI_DA_BYTE = 560 * 1024;                  // máy chủ nhận ≤ 600 KB (ANH_DAI_DIEN_TOI_DA) — chừa lề
const byteCua = (b64: string) => Math.floor((b64.length * 3) / 4);

/** Chụp (camera sau) hoặc chọn ảnh vuông; ảnh được thu nhỏ ≤ 512 px, JPEG ~0.7 (thử lại nhỏ hơn nếu vẫn > 560 KB). null = Ba Mẹ huỷ hoặc không cho quyền. */
// #564: hai thư viện ảnh không nằm trong gói JS chung của web — form hồ sơ gọi napThuVienAnh() lúc mở ⇒ tới lúc bấm thì đã nạp xong
// (trình duyệt chỉ mở hộp chọn tệp khi còn trong khoảnh khắc người bấm). Nạp lỗi ⇒ xoá nhớ để lần sau thử lại.
let thuVien: Promise<[typeof import("expo-image-picker"), typeof import("expo-image-manipulator")]> | null = null;
export const napThuVienAnh = () => {
  thuVien ??= Promise.all([import("expo-image-picker"), import("expo-image-manipulator")]);
  thuVien.catch(() => { thuVien = null; });
  return thuVien;
};

export async function chonAnhCon(nguon: "chup" | "thu-vien"): Promise<AnhChon | null> {
  let ImagePicker: typeof import("expo-image-picker"), ImageManipulator: typeof import("expo-image-manipulator");
  try { [ImagePicker, ImageManipulator] = await napThuVienAnh(); } catch { throw new Error("Chưa lấy được ảnh — thử lại nhé"); }
  const lenh = nguon === "chup" ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
  if (nguon === "chup") {
    const q = await ImagePicker.requestCameraPermissionsAsync();
    if (!q.granted) throw new Error("Cho AiiGrow dùng camera ở Cài đặt máy để chụp ảnh nhé.");
  }
  const r = await lenh({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: false, exif: false,
    ...(nguon === "chup" ? { cameraType: ImagePicker.CameraType.back } : {}) });
  const a = r.canceled ? null : r.assets[0];
  if (!a?.uri) return null;
  for (const [canh, chat] of [[512, 0.7], [384, 0.5], [256, 0.5]] as const) {
    const kq = await ImageManipulator.manipulateAsync(a.uri, a.width > canh ? [{ resize: { width: canh } }] : [],
      { compress: chat, format: ImageManipulator.SaveFormat.JPEG, base64: true });
    if (kq.base64 && byteCua(kq.base64) <= TOI_DA_BYTE) return { mime: "image/jpeg", base64: kq.base64 };
  }
  throw new Error("Ảnh còn quá nặng, chọn ảnh khác nhé.");
}

/** Lưu / gỡ ảnh KHÔNG làm hỏng việc chính: lỗi ⇒ ok=false (hồ sơ đã lưu rồi, Ba Mẹ thêm ảnh sau). avatar mới (nếu có) để nhớ lại. */
export async function dongBoAnhCon(id: string, anh: AnhChon | null, goAnh = false): Promise<{ ok: boolean; avatar?: string }> {
  if (!anh && !goAnh) return { ok: true };
  try { const r = anh ? await luuAnhCon(id, anh) : await xoaAnhCon(id); return { ok: true, avatar: r.avatar }; } catch { return { ok: false }; }
}
export const CHUA_LUU_ANH = "Chưa lưu được ảnh, thử lại sau";
export const luuAnhCon = (id: string, a: AnhChon) => bm.goi<{ avatar: string }>(`con/${id}/anh`, a);
export const xoaAnhCon = (id: string) => bm.goi<{ avatar: string }>(`con/${id}/anh`, { xoa: true });
export const uriAnh = (a: AnhChon) => `data:${a.mime};base64,${a.base64}`;
