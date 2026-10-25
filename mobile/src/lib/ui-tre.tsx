// Thành phần riêng của màn Con (AiiGrow Kid — kit.py man_con + tinh/app.css): thanh điều hướng 4 mục icon to, điểm luôn ở trên cùng,
// ô lớn (.o-lon), thẻ nhiệm vụ (.nv), ô quà (.qua-o), vòng đồng hồ (.vong), ô PIN, vé phiếu quà (.ve-cafe), khung màn Nhí/Teen.
// Dựng trên ui.tsx (không đổi gì ở đó). Nhí: nền vàng nhạt, chữ to, ≤ 3 lựa chọn mỗi màn; Teen: nền xanh lam xám, gọn, thêm thống kê.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Platform, Pressable, Text, TextInput, View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, useGlobalSearchParams } from "expo-router";
import { VongClay } from "./bieu-do";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BieuTron, Chu, DiemPill, F, Icon, Icon3D, LopMen, M, Man, NhanMen, Rob, useTai, type LinhVat, type MauBt, type TenIcon } from "./ui";
import { BONG, KHOI, MEN } from "./clay";
import { kid, may, type NhomTre, type NvTre, type ToiTre } from "./api-tre";
import { GOC } from "./api";

// ---------------------------------------------------------------- phiên Con (hồ sơ đang dùng)

type Tre = { san: boolean; co: boolean; daChao: boolean; ten: string; nhom: NhomTre; id: string; nap: () => Promise<void>; vao: (token: string) => Promise<void>; ra: () => Promise<void> };
const Ctx = createContext<Tre>({ san: false, co: false, daChao: true, ten: "", nhom: "nhi", id: "", nap: async () => {}, vao: async () => {}, ra: async () => {} });

export function TreProvider({ children }: { children: ReactNode }) {
  const [san, setSan] = useState(false);
  const [co, setCo] = useState(false);
  const [toi, setToi] = useState<ToiTre["con"] | null>(null);
  const nap = useCallback(async () => {
    try {
      const r = await kid.goi<ToiTre>("toi");
      setToi(r.con);
    } catch { /* mất mạng: giữ hồ sơ cũ */ }
  }, []);
  // App native: agent Android / iOS mở thẳng `aiigrow://tre?phien=<phiên Con>` (phiên lấy bằng POST /api/device/phien-web của máy Con)
  // ⇒ nhận phiên từ tham số đường dẫn (link tới lúc đang nạp hay khi app đã mở đều nhận); link mới với phiên khác (đổi Con) thì đổi theo.
  // KIỂM phiên với máy chủ trước khi thay: link rác / phiên hết hạn không đá phiên đang dùng. Web đọc ?phien ở dưới (khung Kid của agent Windows).
  const { phien: thamSoPhien } = useGlobalSearchParams<{ phien?: string }>();
  const phienNative = Platform.OS !== "web" && typeof thamSoPhien === "string" && /^[\w-]{16,200}$/.test(thamSoPhien) ? thamSoPhien : null;
  const daNhan = useRef<string | null>(null);
  const nhanPhien = useCallback(async (p: string) => {
    if (daNhan.current === p) return false;
    daNhan.current = p;
    try {
      const r = await fetch(`${GOC}/api/kid/toi`, { headers: { authorization: `Bearer ${p}` } });
      if (!r.ok) return false;
      const j = (await r.json()) as ToiTre;
      await kid.dat(p);
      setCo(true);
      setToi(j.con);
      return true;
    } catch { return false; }
  }, []);
  useEffect(() => {
    if (!san || !phienNative) return;
    const p = phienNative;
    Promise.resolve().then(() => nhanPhien(p)).catch(() => {});   // nhận bất đồng bộ (kiểm với máy chủ), không đặt state ngay trong effect
  }, [san, phienNative, nhanPhien]);
  useEffect(() => {
    (async () => {
      await may.nap();
      // agent Windows mở khung Kid ở <server>/app/tre?phien=<phiên Con>: nhận phiên PIN từ query rồi xoá khỏi URL
      const qPhien = Platform.OS === "web" ? new URLSearchParams(globalThis.location?.search ?? "").get("phien") : null;
      if (qPhien) {
        await kid.dat(qPhien);
        try {
          const u = new URL(globalThis.location.href);
          u.searchParams.delete("phien");
          globalThis.history?.replaceState(globalThis.history.state, "", u.pathname + u.search + u.hash);
        } catch { /* bỏ qua */ }
      }
      // native: link sâu lúc mở app ⇒ nhận (đã kiểm) trước khi màn Con quyết «có phiên chưa»
      if (phienNative) await nhanPhien(phienNative);
      const t = await kid.nap();
      setCo(!!t);
      if (t) await nap();
      setSan(true);
    })();
    kid.onHetPhien(() => { setCo(false); setToi(null); router.replace("/tre/pin"); });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- nạp một lần lúc dựng; link tới sau do effect phía trên nhận
  }, [nap]);
  const vao = useCallback(async (t: string) => {
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
  const ra = useCallback(async () => {
    try { await kid.goi("dang-xuat", {}); } catch { /* vẫn xoá trên máy */ }
    await kid.dat(null);
    setCo(false);
    setToi(null);
    router.replace("/tre/pin");
  }, []);
  return (
    <Ctx.Provider value={{ san, co, daChao: toi?.daChao ?? true, ten: toi?.ten ?? "", nhom: toi?.nhom ?? "nhi", id: toi?.id ?? "", nap, vao, ra }}>{children}</Ctx.Provider>
  );
}
export const useTre = () => useContext(Ctx);

// ---------------------------------------------------------------- khung màn + thanh điều hướng

export type TabTre = "nha" | "nhiem-vu" | "cua-hang" | "xin-phep";
const MUC_TAB: { ma: TabTre; ic: TenIcon; chu: string }[] = [
  { ma: "nha", ic: "nha", chu: "Nhà" }, { ma: "nhiem-vu", ic: "sao", chu: "Nhiệm vụ" },
  { ma: "cua-hang", ic: "qua", chu: "Cửa hàng" }, { ma: "xin-phep", ic: "tin", chu: "Xin phép" },
];

/** Thanh điều hướng của Con (kit.tab_con): bốn mục, icon 28, chữ 13 — đúng 3 câu hỏi của Con + một chỗ xin phép Ba Mẹ. */
export function ThanhTre({ dang }: { dang: TabTre }) {
  const ins = useSafeAreaInsets();
  return (
    <View style={{ paddingHorizontal: 10, paddingTop: 6, paddingBottom: Math.max(ins.bottom - 6, 10) }}>
    <View accessibilityRole="tablist" style={{ flexDirection: "row", backgroundColor: M.the, borderRadius: 34, padding: 6, boxShadow: BONG.noi }}>
      <LopMen men={MEN.the} bo={34} />
      {MUC_TAB.map((m) => {
        const d = m.ma === dang;
        return (
          <NhanMen key={m.ma} onPress={() => (d ? null : router.replace(`/tre/${m.ma}` as never))} accessibilityRole="tab" accessibilityState={{ selected: d }} muc="chip" sang men={d ? MEN.day : undefined}
            accessibilityLabel={m.chu} style={[{ flex: 1, alignItems: "center", justifyContent: "center", gap: 2, minHeight: 62, minWidth: 0, borderRadius: 26 },
              d && { backgroundColor: M.chinhSoft, boxShadow: BONG.lom }]}>
            <Icon ten={m.ic} co={28} mau={d ? M.chinhInk : M.chu3} />
            <Text numberOfLines={1} style={{ fontFamily: F.dam, fontSize: 13, color: d ? M.chinhInk : M.chu3 }}>{m.chu}</Text>
          </NhanMen>
        );
      })}
    </View>
    </View>
  );
}

/** Khung màn Con: nền đầu màn theo nhóm (Nhí vàng nhạt / Teen xanh lam xám) + thanh điều hướng khi màn là màn chính. */
export function ManTre({ tab, children, ...p }: Omit<React.ComponentProps<typeof Man>, "nen"> & { tab?: TabTre }) {
  const { nhom } = useTre();
  if (!tab) return <Man nen={nhom === "teen" ? "teen" : "nhi"} {...p}>{children}</Man>;
  return (
    <View style={{ flex: 1, backgroundColor: M.nen }}>
      <Man nen={nhom === "teen" ? "teen" : "nhi"} {...p}>{children}</Man>
      <ThanhTre dang={tab} />
    </View>
  );
}

// ---------------------------------------------------------------- điểm trên cùng, ô lớn, thẻ nhiệm vụ, ô quà

/** Điểm luôn ở trên cùng (BRD 8.2) + chuỗi ngày (chạm ⇒ Huy hiệu). */
export function DiemTren({ n, chuoi }: { n: number; chuoi?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
      <DiemPill n={n} />
      {chuoi ? (
        <Pressable onPress={() => router.push("/tre/huy-hieu")} accessibilityRole="button" accessibilityLabel={`Chuỗi ${chuoi} ngày — xem huy hiệu`}
          style={{ minHeight: 44, justifyContent: "center" }}>
          <View style={[{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: M.diemSoft, borderRadius: 99, paddingLeft: 6, paddingRight: 11, paddingVertical: 3 }, KHOI.vien]}>
            <LopMen men={MEN.vien} bo={99} />
            <Icon3D ten="lua" co={20} />
            <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: 12.5, color: M.diemInk, lineHeight: 18 }}>{chuoi} ngày</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Ô lớn của Nhà (.o-lon): biểu tượng 60, tiêu đề 19 đậm, dòng phụ. */
export function OLon({ ic, mau, tieu, phu, bam, tat }: { ic: TenIcon; mau?: MauBt; tieu: string; phu?: string; bam: () => void; tat?: boolean }) {
  return (
    <NhanMen onPress={bam} accessibilityRole="button" accessibilityLabel={phu ? `${tieu}. ${phu}` : tieu} muc="khoi" sang men={MEN.the}
      style={[{ flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 30, minHeight: 96, backgroundColor: "#fff", ...KHOI.the }, tat && { opacity: 0.75 }]}>
      <BieuTron ic={ic} mau={mau ?? "xanh"} co={60} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={19}>{tieu}</Chu>
        {phu ? <Chu kieu="dam" co={14} mau={M.chu3}>{phu}</Chu> : null}
      </View>
    </NhanMen>
  );
}

/** Thẻ nhiệm vụ (.nv): biểu tượng 52, tên + dòng phụ, «+10» vàng; `het` = hôm nay đã đủ (mờ, không bấm). */
export function TheNv({ ic, mau, tieu, phu, diem, het, bam, nhan }: { ic: TenIcon; mau?: MauBt; tieu: string; phu: string; diem: number; het?: boolean; bam?: () => void; nhan?: ReactNode }) {
  const nd = (
    <View style={[{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 28, backgroundColor: "#fff", minHeight: 76, ...KHOI.the }]}>
      <LopMen men={MEN.the} bo={28} />
      <View style={het ? { opacity: 0.55 } : undefined}><BieuTron ic={ic} mau={het ? "xam" : mau ?? "xanh"} co={52} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={16.5} mau={het ? M.chu2 : M.chu}>{tieu}</Chu>
        <Chu co={13.5} mau={M.chu3}>{phu}</Chu>
        {nhan ? <View style={{ marginTop: 4 }}>{nhan}</View> : null}
      </View>
      <View style={[{ borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: het ? M.xamSoft : M.diemSoft }, KHOI.vien]}>
        <LopMen men={MEN.vien} bo={16} />
        <Text style={{ fontFamily: F.rat, fontSize: 16, color: het ? M.chu3 : M.diemInk, fontVariant: ["tabular-nums"] }}>+{diem}</Text>
      </View>
    </View>
  );
  if (!bam) return <View accessibilityLabel={`${tieu}. ${phu}`}>{nd}</View>;
  return <NhanMen onPress={bam} accessibilityRole="button" accessibilityLabel={`${tieu}, cộng ${diem} điểm. ${phu}`} muc="khoi" sang style={{ borderRadius: 28 }}>{nd}</NhanMen>;
}

/** Ô quà / huy hiệu (.qua-o): hình Rob trên nền màu, tên, nhãn giá, dòng thiếu. */
export function QuaO({ lv, nen, tieu, nhan, phu, bam, mo, nhanDoc }: { lv: LinhVat; nen: string; tieu: string; nhan?: ReactNode; phu?: string; bam?: () => void; mo?: boolean; nhanDoc?: string }) {
  const nd = (
    <View style={{ gap: 6, padding: 12, borderRadius: 28, backgroundColor: "#fff", flex: 1, ...KHOI.the }}>
      <LopMen men={MEN.the} bo={28} />
      <View style={{ height: 86, borderRadius: 20, backgroundColor: nen, alignItems: "center", justifyContent: "flex-end", overflow: "hidden", opacity: mo ? 0.55 : 1, boxShadow: BONG.lom }}>
        <Rob ten={lv} co={92} />
      </View>
      <Chu kieu="rat" co={15} mau={mo ? M.chu2 : M.chu}>{tieu}</Chu>
      {nhan}
      {phu ? <Chu kieu="rat" co={12.5} mau={M.chu3}>{phu}</Chu> : null}
    </View>
  );
  const st: ViewStyle = { flexBasis: "46%", flexGrow: 1, minWidth: 136 };
  return bam ? <NhanMen onPress={bam} accessibilityRole="button" accessibilityLabel={nhanDoc ?? tieu} muc="khoi" sang style={[st, { borderRadius: 28 }]}>{nd}</NhanMen>
    : <View style={st} accessibilityLabel={nhanDoc ?? tieu}>{nd}</View>;
}

// ---------------------------------------------------------------- vòng đồng hồ, ô PIN, vé phiếu quà

/** Vòng tròn màu đếm giờ (.vong): không chữ dài, hợp nhóm Nhí (BRD 8.2). `ti` 0..1. */
export function Vong({ ti, chu, phu, co = 200 }: { ti: number; chu: string; phu?: string; co?: number }) {
  return (
    <VongClay ti={ti} co={co} day={16} nhanDoc={phu ? `${chu} ${phu}` : chu}>
      <Text style={{ fontFamily: F.rat, fontSize: co * 0.22, color: M.chu, letterSpacing: -1, fontVariant: ["tabular-nums"] }}>{chu}</Text>
      {phu ? <Chu kieu="dam" co={14} mau={M.chu3} style={{ textAlign: "center", maxWidth: co * 0.66 }}>{phu}</Chu> : null}
    </VongClay>
  );
}

/** Ô PIN của Con (.ma6, 4 ô): một ô nhập ẩn, bàn phím số; chấm thay số đã gõ. */
export function OPin({ gia, doi, nhan = "PIN của Con", tuMo = true }: { gia: string; doi: (v: string) => void; nhan?: string; tuMo?: boolean }) {
  const ref = useRef<React.ComponentRef<typeof TextInput>>(null);
  const so = Math.max(4, gia.length);
  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel={nhan} style={{ flexDirection: "row", gap: 8, justifyContent: "center", minHeight: 54 }}>
      {Array.from({ length: so }, (_, k) => (
        <View key={k} style={{ width: 46, height: 54, borderRadius: 14, backgroundColor: "#fff", borderWidth: 1.5, alignItems: "center", justifyContent: "center", boxShadow: BONG.lom,
          borderColor: k === Math.min(gia.length, so - 1) ? M.chinh : M.vien2 }}>
          <Chu kieu="rat" co={24}>{gia[k] ? "•" : ""}</Chu>
        </View>
      ))}
      <TextInput ref={ref} value={gia} onChangeText={(t) => doi(t.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" maxLength={6}
        secureTextEntry accessibilityLabel={nhan} autoFocus={tuMo}
        style={{ position: "absolute", opacity: 0.011, width: "100%", height: "100%", color: "transparent" }} />
    </Pressable>
  );
}

/** Ô ghi chú (.ghi-chu) căn giữa. */
export const GhiChu = ({ children, giua }: { children: ReactNode; giua?: boolean }) => (
  <Chu co={13} mau={M.chu3} style={giua ? { textAlign: "center" } : undefined}>{children}</Chu>
);

export { BieuTron };

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

// ---------------------------------------------------------------- Rob đọc to (Nhí: BRD 8.2 — hướng dẫn bằng giọng)

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

// ---------------------------------------------------------------- biểu tượng app (kit.app)

const APP: Record<string, [string, string]> = {
  roblox: ["R", "#E2231A"], minecraft: ["M", "#4A7A28"], youtube: ["▶", "#D9002C"], tiktok: ["♪", "#111111"], scratch: ["S", "#B45309"],
  duolingo: ["D", "#3F7D0B"], khan: ["K", "#0B7A60"], word: ["W", "#185ABD"], zoom: ["Z", "#0B5CFF"], aiirob: ["A", "#6C5CE7"], chrome: ["◉", "#1A73E8"],
};
export function AppIc({ muc, ten, co = 48 }: { muc: string; ten?: string; co?: number }) {
  const k = Object.keys(APP).find((x) => muc.toLowerCase().includes(x));
  const [c, m] = k ? APP[k] : [(ten ?? muc).trim().charAt(0).toUpperCase() || "?", M.chinh];
  return (
    <View style={{ width: co, height: co, borderRadius: co * 0.32, backgroundColor: m, alignItems: "center", justifyContent: "center",
      boxShadow: "0px 6px 10px -5px rgba(0,0,0,0.35), inset 0px 1px 0px rgba(255,255,255,0.45), inset 0px -2px 3px rgba(0,0,0,0.25)" }}>
      <Text style={{ fontFamily: F.rat, fontSize: co * 0.42, color: "#fff" }}>{c}</Text>
    </View>
  );
}

/** Nền «trò chơi» phía sau hộp hỏi (kit .game): trời xanh + đất xanh lá. */
export function NenChoi({ children }: { children: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#173b8a" }}>
      <LinearGradient colors={["#7bd3ff", "#2c7be5", "#173b8a"]} locations={[0, 0.45, 1]} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
      <View style={{ position: "absolute", left: "-10%", right: "-10%", bottom: "-8%", height: "42%", backgroundColor: "#3aa655", borderTopLeftRadius: 999, borderTopRightRadius: 999 }} />
      {children}
    </View>
  );
}

// ---------------------------------------------------------------- nhiệm vụ: dòng phụ theo trạng thái, giờ bắt đầu lượt (đồng hồ chạy trên máy)

export function phuNv(x: NvTre) {
  switch (x.trang_thai_con) {
    case "dang_lam": return "Đang làm — chạm để làm tiếp";
    case "can_bo_sung": return "Ba Mẹ nhờ chụp lại";
    case "du_hom_nay": return "Hôm nay đã đủ, mai làm tiếp";
    case "du_tuan": return "Tuần này đã đủ, tuần sau làm tiếp";
    default:
      if (x.toi_da_ngay) return `Còn ${Math.max(0, x.toi_da_ngay - x.hom_nay)} lần hôm nay`;
      if (x.phut_toi_thieu) return `Làm ít nhất ${x.phut_toi_thieu} phút`;
      return x.mo_ta || (x.bang_chung === "van_ban" ? "Làm xong kể lại cho Ba Mẹ" : "Làm xong chụp ảnh gửi Ba Mẹ");
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

/** Chip chọn MỘT (kit.chips role=radio): lý do nhanh khi xin phép. */
export function ChipMot<T extends string>({ ds, gia, doi, nhan }: { ds: { gia: T; chu: string }[]; gia: T | null; doi: (v: T) => void; nhan: string }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={nhan}>
      {ds.map((x) => {
        const c = x.gia === gia;
        return (
          <NhanMen key={x.gia} onPress={() => doi(x.gia)} accessibilityRole="radio" accessibilityState={{ checked: c }} muc="chip" sang men={c ? undefined : MEN.sang}
            style={[{ minHeight: 44, paddingHorizontal: 15, borderRadius: 99, borderWidth: 1.5, alignItems: "center", justifyContent: "center",
              borderColor: c ? M.chinh : "transparent", backgroundColor: c ? "#eef5f2" : "#fff" }, KHOI.nho]}>
            <Text numberOfLines={1} style={{ fontFamily: F.dam, fontSize: 14.5, color: c ? M.chinhInk : M.chu2, lineHeight: 20 }}>{x.chu}</Text>
          </NhanMen>
        );
      })}
    </View>
  );
}
