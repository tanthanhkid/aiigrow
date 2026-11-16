// Ảnh đại diện Con (#302): chụp / chọn ảnh ở hồ sơ con. Máy chủ lưu ảnh ở cột riêng (server/lib/gia-dinh.ts › datAnhDaiDien); `avatar` của Con ghi
// «mau-N|anh:<giây>» để mọi danh sách biết Con có ảnh. Ảnh tải riêng (GET con/:id/anh) và nhớ trong bộ nhớ theo dấu «anh:<giây>» — ảnh mới ⇒ dấu mới ⇒ tải lại.
import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
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

/** Chụp (camera trước) hoặc chọn ảnh vuông; trả ảnh đã cắt, nhỏ (≤ 512 px). null = Ba Mẹ huỷ hoặc không cho quyền. */
export async function chonAnhCon(nguon: "chup" | "thu-vien"): Promise<AnhChon | null> {
  const lenh = nguon === "chup" ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
  if (nguon === "chup") {
    const q = await ImagePicker.requestCameraPermissionsAsync();
    if (!q.granted) throw new Error("Cho AiiGrow dùng camera ở Cài đặt máy để chụp ảnh nhé.");
  }
  const r = await lenh({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.4, base64: true, cameraType: ImagePicker.CameraType.front,
    exif: false });
  const a = r.canceled ? null : r.assets[0];
  if (!a?.base64) return null;
  return { mime: a.mimeType === "image/png" ? "image/png" : "image/jpeg", base64: a.base64 };
}

export const luuAnhCon = (id: string, a: AnhChon) => bm.goi<{ avatar: string }>(`con/${id}/anh`, a);
export const xoaAnhCon = (id: string) => bm.goi<{ avatar: string }>(`con/${id}/anh`, { xoa: true });
export const uriAnh = (a: AnhChon) => `data:${a.mime};base64,${a.base64}`;
