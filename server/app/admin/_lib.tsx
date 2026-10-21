"use client";
// Tiện ích chung của cổng admin: gọi /api/admin, tải dữ liệu theo mục, định dạng tiền / giờ, khung trạng thái (đang tải / lỗi / trống).
import { useCallback, useEffect, useState, type ReactNode } from "react";

export const KHOA = "aiig_admin";
export const docToken = () => { try { return localStorage.getItem(KHOA); } catch { return null; } };
export const ghiToken = (t: string | null) => { try { if (t) localStorage.setItem(KHOA, t); else localStorage.removeItem(KHOA); } catch { /* chế độ riêng tư */ } };

export class LoiApi extends Error { status: number; constructor(m: string, s: number) { super(m); this.status = s; } }

export async function api<T = any>(duong: string, body?: unknown): Promise<T> { // eslint-disable-line @typescript-eslint/no-explicit-any
  let r: Response;
  try {
    r = await fetch(`/api/admin/${duong}`, {
      method: body === undefined ? "GET" : "POST", cache: "no-store",
      headers: { "content-type": "application/json", ...(docToken() ? { authorization: `Bearer ${docToken()}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch { throw new LoiApi("Mất kết nối tới máy chủ — kiểm tra mạng rồi thử lại", 0); }
  const d = await r.json().catch(() => ({}));
  if (r.status === 401 && duong !== "dang-nhap") { ghiToken(null); window.dispatchEvent(new Event("aiig-het-phien")); }
  if (!r.ok) throw new LoiApi(d.message ?? "Máy chủ chưa làm được việc này", r.status);
  return d as T;
}

export function useTai<T>(duong: string | null) {
  const [d, setD] = useState<T | null>(null), [loi, setLoi] = useState(""), [lan, setLan] = useState(0);
  useEffect(() => {
    if (!duong) return;
    let huy = false;
    setLoi("");
    api<T>(duong).then((x) => { if (!huy) setD(x); }).catch((e: Error) => { if (!huy) setLoi(e.message); });
    return () => { huy = true; };
  }, [duong, lan]);
  return { d, loi, nap: useCallback(() => setLan((x) => x + 1), []) };
}

export const tien = (n?: number | null) => (n ?? 0).toLocaleString("vi-VN") + "đ";
export const so = (n?: number | null) => (n ?? 0).toLocaleString("vi-VN");
const TZ = "Asia/Ho_Chi_Minh";
export const luc = (s?: string | null) => (s ? new Date(s).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ }) : "—");
export const ngay = (s?: string | null) => (s ? new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: TZ }) : "—");
export const hienMa = (ma: string) => ma.replace(/(.{4})(?=.)/g, "$1-");

export const TT_PHIEU: Record<string, [string, string]> = {
  da_phat_hanh: ["Còn dùng được", "ok"], cho_xac_nhan: ["Chờ Ba Mẹ xác nhận", "canh-n"], da_dung: ["Đã dùng", "xam"],
  het_han: ["Hết hạn", "loi"], thu_hoi: ["Đã huỷ", "loi"],
};
export const NhanPhieu = ({ tt }: { tt: string }) => { const [c, l] = TT_PHIEU[tt] ?? [tt, "xam"]; return <span className={`nhan ${l}`}>{c}</span>; };

/** Khung trạng thái: đang tải / lỗi (có Thử lại) / nội dung. */
export function Tai<T>({ t, children }: { t: { d: T | null; loi: string; nap: () => void }; children: (d: T) => ReactNode }) {
  if (t.loi && !t.d) return (
    <div className="bao loi-b" role="alert"><div><b>Chưa tải được</b><p>{t.loi}</p>
      <button className="nut vien nho" style={{ marginTop: 8 }} onClick={t.nap}>Thử lại</button></div></div>);
  if (!t.d) return <p className="trong" aria-busy="true">Đang tải…</p>;
  return <>{children(t.d)}</>;
}

export function Tieu({ ten, mo, phai }: { ten: string; mo?: string; phai?: ReactNode }) {
  return <div className="tieu"><h1>{ten}</h1>{phai ? <div className="phai">{phai}</div> : null}{mo ? <p>{mo}</p> : null}</div>;
}
