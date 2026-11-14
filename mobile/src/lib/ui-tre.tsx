// Phiên Con + tiện ích dữ liệu của màn Con (giao diện bản «Dịu» ở ui-diu.tsx, token diu.ts — 06/11, L16).
// 06/11 (L13): PIN theo bé quay lại — máy dùng chung: chọn tên → PIN 4 số (`/api/device/dang-nhap-be`), «Đổi bé / Đăng xuất» = máy khoá
// về màn chọn tên (`/api/device/dang-xuat`). Phiên Con mở từ agent (link `?phien=`) vẫn nhận như trước.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Platform } from "react-native";
import { router, useGlobalSearchParams } from "expo-router";
import { useTai } from "./ui";
import { kid, may, type NhomTre, type NvTre, type ToiTre } from "./api-tre";
import { GOC } from "./api";

// ---------------------------------------------------------------- phiên Con (hồ sơ đang dùng)

type Tre = { san: boolean; co: boolean; daChao: boolean; ten: string; nhom: NhomTre; id: string; /** thứ tự bé trên máy (màu avatar) */ iAvt: number; /** lời nhắn Ba Mẹ chưa trả lời (chấm đỏ tab Tin nhắn) */ soTin: number;
  nap: () => Promise<void>; vao: (token: string, iAvt?: number) => Promise<void>; ra: () => Promise<void> };
const Ctx = createContext<Tre>({ san: false, co: false, daChao: true, ten: "", nhom: "nhi", id: "", iAvt: 0, soTin: 0, nap: async () => {}, vao: async () => {}, ra: async () => {} });

export function TreProvider({ children }: { children: ReactNode }) {
  const [san, setSan] = useState(false);
  const [co, setCo] = useState(false);
  const [toi, setToi] = useState<ToiTre["con"] | null>(null);
  const [soTin, setSoTin] = useState(0);
  const nap = useCallback(async () => {
    try {
      const r = await kid.goi<ToiTre>("toi");
      setToi(r.con);
      setSoTin(r.loiKhen.filter((x) => !x.phan_hoi).length);
    } catch { /* mất mạng: giữ hồ sơ cũ */ }
  }, []);
  // App native: agent Android / iOS mở thẳng `aiigrow://tre?phien=<phiên Con>` (phiên lấy bằng POST /api/device/phien-web của máy Con)
  // ⇒ nhận phiên từ tham số đường dẫn (link tới lúc đang nạp hay khi app đã mở đều nhận); link mới với phiên khác (đổi Con) thì đổi theo.
  // KIỂM phiên với máy chủ trước khi thay: link rác / phiên hết hạn không đá phiên đang dùng. Web đọc ?phien ở dưới (khung Kid của agent Windows).
  const { phien: thamSoPhien } = useGlobalSearchParams<{ phien?: string }>();
  const phienNative = Platform.OS !== "web" && typeof thamSoPhien === "string" && /^[\w-]{16,200}$/.test(thamSoPhien) ? thamSoPhien : null;
  const daNhan = useRef<string | null>(null);       // phiên đã nhận xong (chỉ ghi khi máy chủ xác nhận — lỗi mạng thì link sau thử lại)
  const dangNhan = useRef<string | null>(null);
  const nhanPhien = useCallback(async (p: string): Promise<ToiTre["con"] | null> => {
    if (daNhan.current === p || dangNhan.current === p) return null;
    dangNhan.current = p;
    try {
      // kiểm bằng token tạm (chưa ghi đè phiên đang dùng) — cùng đường GOC/api/kid với client `kid`
      const r = await fetch(`${GOC}/api/kid/toi`, { headers: { authorization: `Bearer ${p}` } });
      if (!r.ok) return null;
      const j = (await r.json()) as ToiTre;
      if (kid.co()) await kid.goi("dang-xuat", {}).catch(() => {});      // phiên cũ của máy này: đăng xuất ở máy chủ trước khi thay
      await kid.dat(p);
      daNhan.current = p;
      setCo(true);
      setToi(j.con);
      return j.con;
    } catch { return null; } finally { dangNhan.current = null; }
  }, []);
  useEffect(() => {
    if (!san || !phienNative) return;
    const p = phienNative;
    // link tới khi app đã mở: nhận (kiểm với máy chủ) rồi đưa vào Nhà — màn chọn hồ sơ / ghép máy không tự đổi theo `co`
    Promise.resolve().then(() => nhanPhien(p)).then((c) => { if (c) router.replace(c.daChao ? "/tre/nha" : "/tre/chao"); }).catch(() => {});
  }, [san, phienNative, nhanPhien]);
  useEffect(() => {
    (async () => {
      await may.nap();
      // agent Windows mở khung Kid ở <server>/app/tre?phien=<phiên Con>: nhận phiên Con từ query rồi xoá khỏi URL
      const qPhien = Platform.OS === "web" ? new URLSearchParams(globalThis.location?.search ?? "").get("phien") : null;
      if (qPhien) {
        await kid.dat(qPhien);
        try {
          const u = new URL(globalThis.location.href);
          u.searchParams.delete("phien");
          globalThis.history?.replaceState(globalThis.history.state, "", u.pathname + u.search + u.hash);
        } catch { /* bỏ qua */ }
      }
      // native: link sâu lúc mở app ⇒ nạp phiên cũ (để đăng xuất nó ở máy chủ) rồi nhận phiên mới (đã kiểm) trước khi màn Con quyết «có phiên chưa»
      if (phienNative) { await kid.nap(); await nhanPhien(phienNative); }
      const t = await kid.nap();
      setCo(!!t);
      if (t) await nap();
      setSan(true);
    })();
    kid.onHetPhien(() => { setCo(false); setToi(null); router.replace("/tre/chon-ten"); });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nạp một lần lúc dựng; link tới sau do effect phía trên nhận
  }, [nap]);
  const [iAvt, setIAvt] = useState(0);
  const vao = useCallback(async (t: string, i = 0) => {
    setIAvt(i);
    await kid.dat(t);
    setCo(true);
    const r = await kid.goi<ToiTre>("toi");
    setToi(r.con);
    router.replace(r.con.daChao ? "/tre/nha" : "/tre/chao");
  }, []);
  // mở app lúc mất mạng ⇒ chưa biết tên Con: thử lại mỗi 5 giây
  useEffect(() => {
    if (!co || toi) return;
    const t = setInterval(nap, 5000);
    return () => clearInterval(t);
  }, [co, toi, nap]);
  // «Đổi bé / Đăng xuất»: máy dùng chung ⇒ máy chủ bỏ «bé đang dùng» + xoá phiên Con của máy (máy khoá về màn chọn tên); máy không có
  // token thiết bị (khung Kid do agent mở) ⇒ chỉ đăng xuất phiên Con.
  const ra = useCallback(async () => {
    if (may.co()) { try { await may.goi("dang-xuat", {}); } catch { /* mất mạng: vẫn xoá trên máy */ } }
    try { await kid.goi("dang-xuat", {}); } catch { /* vẫn xoá trên máy */ }
    await kid.dat(null);
    setCo(false);
    setToi(null);
    router.replace("/tre/chon-ten");
  }, []);
  return (
    <Ctx.Provider value={{ san, co, daChao: toi?.daChao ?? true, ten: toi?.ten ?? "", nhom: toi?.nhom ?? "nhi", id: toi?.id ?? "", iAvt, soTin, nap, vao, ra }}>{children}</Ctx.Provider>
  );
}
export const useTre = () => useContext(Ctx);

/** Giờ «HH:MM» từ ISO. */
export const gioCua = (iso: string | null | undefined) => {
  if (!iso) return "";
  const t = new Date(iso);
  return `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
};
export const ngayCua = (iso: string | null | undefined) => {
  if (!iso) return "";
  const t = new Date(iso);
  return `${String(t.getDate()).padStart(2, "0")}/${String(t.getMonth() + 1).padStart(2, "0")}/${t.getFullYear()}`;
};


// ---------------------------------------------------------------- dữ liệu: nhớ bản cuối để mất mạng vẫn thấy điểm đã có

const BO_NHO = new Map<string, unknown>();
/** `useTai` + nhớ bản tải được gần nhất theo khoá: mất mạng thì vẫn hiện số điểm / nhiệm vụ đã có kèm băng «Mất mạng» (con-trang «mang»). */
export function useTaiTre<T>(khoa: string, fn: () => Promise<T>) {
  const t = useTai(fn);
  useEffect(() => { if (t.d) BO_NHO.set(khoa, t.d); }, [khoa, t.d]);
  const cu = (BO_NHO.get(khoa) as T | undefined) ?? null;
  return { ...t, d: t.d ?? (t.matMang ? cu : null), cu: !t.d && t.matMang && !!cu };
}

// ---------------------------------------------------------------- Grow đọc to (Nhí: BRD 8.2 — hướng dẫn bằng giọng)

const coGiong = () => Platform.OS === "web" && typeof globalThis.speechSynthesis !== "undefined";
export const coDocTo = coGiong;
export function docTo(chu: string) {
  if (!coGiong()) return;
  try {
    globalThis.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(chu);
    u.lang = "vi-VN";
    u.rate = 0.95;
    globalThis.speechSynthesis.speak(u);
  } catch { /* trình duyệt không đọc được */ }
}

/** Âm báo nhẹ (còn 5 / 1 phút): một nốt ngắn, nhỏ — không gây giật mình (BRD 8.2). Chỉ bản web. */
export function amBao() {
  if (Platform.OS !== "web") return;
  try {
    const AC = (globalThis as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
    if (!AC) return;
    const ac = new AC(), o = ac.createOscillator(), g = ac.createGain();
    o.frequency.value = 660;
    g.gain.setValueAtTime(0.0001, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.08, ac.currentTime + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.6);
    o.connect(g).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + 0.65);
  } catch { /* không có âm thanh */ }
}

// ---------------------------------------------------------------- nhiệm vụ: dòng phụ theo trạng thái, giờ bắt đầu lượt (đồng hồ chạy trên máy)

/** Cách nộp bài theo `bang_chung` (05/11: ảnh / ghi âm / viết / bấm Xong / AiiRob tự chấm). */
export const CACH_NOP: Record<string, string> = {
  anh: "Làm xong chụp ảnh gửi Ba Mẹ", video: "Làm xong chụp ảnh gửi Ba Mẹ", ghi_am: "Làm xong ghi âm gửi Ba Mẹ", van_ban: "Làm xong viết kể lại cho Ba Mẹ",
  xong: "Làm xong bấm «Xong»", tu_dong: "Học với AiiRob — AiiRob tự chấm",
};

export function phuNv(x: NvTre) {
  switch (x.trang_thai_con) {
    case "dang_lam": return "Đang làm — chạm để làm tiếp";
    case "can_bo_sung": return (x as { loi_nhan?: string | null }).loi_nhan ? `Ba Mẹ nhờ làm lại: “${(x as { loi_nhan?: string }).loi_nhan}”` : "Ba Mẹ nhờ con làm lại";
    case "du_hom_nay": return "Hôm nay đã đủ, mai làm tiếp";
    case "du_tuan": return "Tuần này đã đủ, tuần sau làm tiếp";
    default:
      if (x.toi_da_ngay) return `Còn ${Math.max(0, x.toi_da_ngay - x.hom_nay)} lần hôm nay`;
      if (x.phut_toi_thieu) return `Làm ít nhất ${x.phut_toi_thieu} phút`;
      return x.mo_ta || CACH_NOP[x.bang_chung] || "Làm xong chụp ảnh gửi Ba Mẹ";
  }
}

const BAT_DAU = new Map<string, number>();
/** Giờ bắt đầu lượt `luot` trên máy này (lần đầu gọi = bây giờ). Web: nhớ qua tải lại trang. */
export function batDauLuc(luot: string) {
  const k = `aiig_tre_bd_${luot}`;
  let v = BAT_DAU.get(luot);
  if (v === undefined && Platform.OS === "web") { try { const s = globalThis.localStorage?.getItem(k); if (s) v = Number(s); } catch { /* bỏ qua */ } }
  if (v === undefined) {
    v = new Date().getTime();
    if (Platform.OS === "web") try { globalThis.localStorage?.setItem(k, String(v)); } catch { /* bỏ qua */ }
  }
  BAT_DAU.set(luot, v);
  return v;
}
