// 06/11 bản «Dịu» (con-dt-ngay 06/07/09/10): nút chọn cách nộp «Ghi âm · Ảnh · Viết» ở đáy mọi màn nộp; khung camera tối + thẻ trắng
// «📷 Ảnh 1/1 · <việc>»; ghi âm có đồng hồ «02:40», «Thu lại» / «Nghe lại» / «Gửi Ba Mẹ bản ghi 02:40»; viết có ô chữ + «+10 sao khi Ba Mẹ duyệt».
// con-chup «Chụp bằng chứng» (FR-03.02): camera mở ngay trong app, không chọn từ thư viện; ảnh gắn giờ + mã lượt. Nộp ≤ 3 chạm: bấm nút
// chụp là gửi luôn. Web: nút chụp mở camera của trình duyệt (capture) — máy tính không có camera thì chọn tệp. Mất mạng ⇒ ảnh xếp hàng chờ trên máy.
// Nhiệm vụ «kể lại» (văn bản): ô viết vài câu thay cho camera. 05/11 «ghi âm»: web ghi bằng micro của trình duyệt (MediaRecorder, ≤ 90 giây,
// gửi `ghiAm {mime: audio/*, base64}`); app native chưa có thư viện ghi âm ⇒ viết vài câu kể lại (máy chủ nhận, Ba Mẹ vẫn duyệt).
import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import { cauLoi, useLam } from "@/lib/ui";
import { useTaiTre, gioCua } from "@/lib/ui-tre";
import { D, FD } from "@/lib/diu";
import { ChuD, LoiD, ManD, NutD, SaoD, TheD } from "@/lib/ui-diu";
import { kid, nopBai, type AnhNop, type NvTreSao } from "@/lib/api-tre";

const ANH_TOI_DA = 300 * 1024;

/** Web: nén ảnh về ≤ 300 KB (KE-HOACH 5.2) bằng canvas — cạnh dài ≤ 1280, JPEG chất lượng giảm dần. */
function nenAnhWeb(f: File): Promise<AnhNop> {
  return new Promise((ok, hong) => {
    const url = URL.createObjectURL(f);
    const img = new (globalThis as unknown as { Image: new () => HTMLImageElement }).Image();
    img.onload = () => {
      const ti = Math.min(1, 1280 / Math.max(img.width || 1, img.height || 1));
      const cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(img.width * ti));
      cv.height = Math.max(1, Math.round(img.height * ti));
      cv.getContext("2d")?.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      for (const cl of [0.72, 0.6, 0.45, 0.32, 0.2]) {
        const b64 = cv.toDataURL("image/jpeg", cl).split(",")[1] ?? "";
        if (b64.length * 0.75 <= ANH_TOI_DA || cl === 0.2) return ok({ mime: "image/jpeg", base64: b64 });
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); hong(new Error("anh")); };
    img.src = url;
  });
}

export default function Chup() {
  const { luot, nv } = useLocalSearchParams<{ luot: string; nv?: string }>();
  const { d } = useTaiTre(`nv-${nv}`, async () => (await kid.goi<{ ds: NvTreSao[] }>("nhiem-vu?tuCham=1")).ds.find((x) => x.id === nv) ?? null);
  const { dangChay, loi, lam, setLoi } = useLam();
  const [chon, setChon] = useState<Cach | null>(null);
  const gui = (anh: AnhNop[], ghiChu?: string, ghiAm?: AnhNop) => lam(async () => {
    const r = await nopBai(luot, { anh, ghiChu, ghiAm });
    const q = new URLSearchParams({ diem: String(d?.sao ?? d?.diem ?? ""), ten: d?.ten ?? "", ...(r.daXepHang ? { xep: "1" } : {}) }).toString();
    router.replace(r.trang_thai === "duoc_duyet" ? `/tre/duoc-duyet/${luot}` : `/tre/cho-duyet?${q}`);
  });
  const macDinh: Cach = d?.bang_chung === "van_ban" ? "viet" : d?.bang_chung === "ghi_am" ? "ghi" : "anh";
  const cach = chon ?? macDinh;
  const diem = d?.sao ?? d?.diem;
  const doi = <ChonCach cach={cach} doi={(c) => { setLoi(null); setChon(c); }} toi={cach === "anh"} />;
  if (cach === "viet") return <KeLai ten={d?.ten ?? "Nhiệm vụ"} diem={diem} gui={(t) => gui([], t)} dangChay={dangChay} loi={loi} doi={doi} />;
  if (cach === "ghi") {
    return coGhiAm()
      ? <GhiAm ten={d?.ten ?? "Nhiệm vụ"} gui={(a, t) => gui([], t, a)} dangChay={dangChay} loi={loi} viet={(t) => gui([], t)} doi={doi} />
      : <KeLai ten={d?.ten ?? "Nhiệm vụ"} diem={diem} goiY="Máy này chưa ghi âm được — viết vài câu kể lại cho Ba Mẹ nhé!" gui={(t) => gui([], t)} dangChay={dangChay} loi={loi} doi={doi} />;
  }
  return <Camera tieu={d ? `Ảnh · ${d.ten}` : "Ảnh việc đã làm"} phu={d?.mo_ta || "Chụp rõ việc đã làm nhé!"} ma={luot} gui={(a) => gui([a])} dangChay={dangChay} loi={loi}
    xoaLoi={() => setLoi(null)} doi={doi} />;
}

type Cach = "ghi" | "anh" | "viet";
/** Ba nút cách nộp ở đáy (Ghi âm · Ảnh · Viết): đang chọn = nền xanh. `toi` = đặt trên nền camera tối. */
function ChonCach({ cach, doi, toi }: { cach: Cach; doi: (c: Cach) => void; toi?: boolean }) {
  const ds: [Cach, string][] = [["ghi", "Ghi âm"], ["anh", "Ảnh"], ["viet", "Viết"]];
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 6, padding: 5, borderRadius: 26, backgroundColor: toi ? "rgba(255,255,255,0.12)" : D.the,
      borderWidth: toi ? 0 : 1, borderColor: D.vien }}>
      {ds.map(([c, chu]) => {
        const d = c === cach;
        return (
          <Pressable key={c} onPress={() => doi(c)} accessibilityRole="tab" accessibilityState={{ selected: d }} accessibilityLabel={`Nộp bằng ${chu.toLowerCase()}`}
            style={{ flex: 1, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", backgroundColor: d ? D.xanh : "transparent" }}>
            <Text style={{ fontFamily: FD.rat, fontSize: 15, color: d ? "#fff" : toi ? "#e8ecf7" : D.chu2 }}>{chu}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Web có micro (MediaRecorder) ⇒ ghi âm được; app native / trình duyệt cũ ⇒ không. */
const coGhiAm = () => Platform.OS === "web" && typeof (globalThis as { MediaRecorder?: unknown }).MediaRecorder === "function"
  && !!globalThis.navigator?.mediaDevices?.getUserMedia;
const GHI_TOI_DA_GIAY = 90;

/** Ghi âm bằng micro của trình duyệt: Ghi → Dừng → nghe lại → Gửi (kèm vài chữ nếu muốn). Base64 ≤ 2 MB (máy chủ: ghi_am_qua_lon). */
function GhiAm({ ten, gui, dangChay, loi, viet, doi }: { ten: string; gui: (a: AnhNop, ghiChu?: string) => void; dangChay: boolean; loi: string | null; viet: (t: string) => void; doi: ReactNode }) {
  const [thayViet, setThayViet] = useState(false);
  const [trang, setTrang] = useState<"cho" | "ghi" | "xong">("cho");
  const [giay, setGiay] = useState(0);
  const [bai, setBai] = useState<{ a: AnhNop; url: string } | null>(null);
  const [nhac, setNhac] = useState<string | null>(null);
  const [t, setT] = useState("");
  const rec = useRef<{ stop: () => void } | null>(null);
  useEffect(() => () => { rec.current?.stop(); if (bai) URL.revokeObjectURL(bai.url); }, [bai]);
  useEffect(() => {
    if (trang !== "ghi") return;
    const h = setInterval(() => setGiay((g) => { if (g + 1 >= GHI_TOI_DA_GIAY) rec.current?.stop(); return g + 1; }), 1000);
    return () => clearInterval(h);
  }, [trang]);
  const batDau = async () => {
    setNhac(null);
    let luong: MediaStream | null = null;
    try {
      luong = await globalThis.navigator.mediaDevices.getUserMedia({ audio: true });
      const ls = luong;
      const MR = (globalThis as unknown as { MediaRecorder: new (s: MediaStream) => { start: () => void; stop: () => void; state: string; mimeType: string;
        ondataavailable: ((e: { data: Blob }) => void) | null; onstop: (() => void) | null } }).MediaRecorder;
      const r = new MR(ls);
      const manh: Blob[] = [];
      r.ondataavailable = (e) => { if (e.data.size) manh.push(e.data); };
      r.onstop = () => {
        ls.getTracks().forEach((x) => x.stop());
        const mime = (r.mimeType || "audio/webm").split(";")[0];
        const blob = new Blob(manh, { type: mime });
        const doc = new FileReader();
        doc.onload = () => {
          const b64 = String(doc.result ?? "").split(",")[1] ?? "";
          if (b64.length * 0.75 > 2 * 1024 * 1024) { setNhac("Bài ghi dài quá — ghi ngắn lại nhé"); setTrang("cho"); return; }
          setBai({ a: { mime: mime.startsWith("audio/") ? mime : "audio/webm", base64: b64 }, url: URL.createObjectURL(blob) });
          setTrang("xong");
        };
        doc.readAsDataURL(blob);
      };
      rec.current = { stop: () => { if (r.state === "recording") r.stop(); } };
      setGiay(0);
      r.start();
      setTrang("ghi");
    } catch {
      luong?.getTracks().forEach((x) => x.stop());     // micro đã mở mà MediaRecorder hỏng ⇒ tắt micro, không để đèn ghi âm sáng
      setNhac("Chưa mở được micro — cho phép trình duyệt dùng micro rồi thử lại nhé");
    }
  };
  // không có / bị chặn micro ⇒ viết kể lại thay (máy chủ nhận vì không gửi ghiAmDuoc)
  if (thayViet) return <KeLai ten={ten} goiY="Viết vài câu kể lại cho Ba Mẹ nhé!" gui={viet} dangChay={dangChay} loi={loi} doi={doi} />;
  const mmss = (g: number) => `${String(Math.floor(g / 60)).padStart(2, "0")}:${String(g % 60).padStart(2, "0")}`;
  const day = trang === "ghi" ? <NutD chu={`Dừng · ${mmss(giay)}`} loai="phu" bam={() => rec.current?.stop()} />
    : trang === "xong" && bai ? <><NutD chu={`Gửi Ba Mẹ bản ghi ${mmss(giay)}`} ic="gui" bam={() => gui(bai.a, t.trim() || undefined)} dangChay={dangChay} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <NutD chu="Thu lại" loai="phu" nho style={{ flex: 1 }} bam={() => { setBai(null); setTrang("cho"); }} />
      </View></>
      : <><NutD chu="Bắt đầu ghi âm" ic="tin" bam={batDau} />{nhac ? <NutD chu="Viết kể lại thay" loai="chu" bam={() => setThayViet(true)} /> : null}</>;
  return (
    <ManD lui={true} tieu={ten} day={<><LoiD loi={nhac ?? loi} />{day}{doi}</>}>
      <View style={{ alignItems: "center", gap: 10, paddingTop: 16 }}>
        <View style={{ width: 150, height: 150, borderRadius: 75, backgroundColor: trang === "ghi" ? D.xanhN : D.the, borderWidth: trang === "ghi" ? 3 : 1,
          borderColor: trang === "ghi" ? D.xanh : D.vien, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: FD.den, fontSize: 38, color: D.chu, fontVariant: ["tabular-nums"] }}>{mmss(giay)}</Text>
        </View>
        <ChuD kieu="rat" co={15} mau={D.chu2} giua>{trang === "ghi" ? "Rob đang nghe… nói xong bấm Dừng nhé!" : trang === "xong" ? "Nghe lại rồi gửi Ba Mẹ nhé!" : "Kể lại hoặc đọc to cho Ba Mẹ nghe"}</ChuD>
      </View>
      {trang === "xong" && bai ? (
        <View style={{ gap: 10 }}>
          {Platform.OS === "web" ? React.createElement("audio", { src: bai.url, controls: true, style: { width: "100%" }, "aria-label": "Nghe lại" }) : null}
          <OChu nhan="Viết thêm (không bắt buộc)" gia={t} doi={setT} dong={2} />
        </View>
      ) : null}
    </ManD>
  );
}

/** Ô chữ Dịu (thẻ trắng viền mảnh, chữ Nunito). */
function OChu({ nhan, gia, doi, dong = 4 }: { nhan: string; gia: string; doi: (t: string) => void; dong?: number }) {
  return (
    <TheD mong>
      <ChuD kieu="rat" co={13} mau={D.chu2}>{nhan}</ChuD>
      <TextInput value={gia} onChangeText={doi} multiline maxLength={400} accessibilityLabel={nhan} placeholder="Con gõ ở đây…" placeholderTextColor={D.chu3}
        style={{ minHeight: dong * 24, fontFamily: FD.dam, fontSize: 16, color: D.chu, textAlignVertical: "top", padding: 0 }} />
    </TheD>
  );
}

function KeLai({ ten, gui, dangChay, loi, goiY, diem, doi }: { ten: string; gui: (t: string) => void; dangChay: boolean; loi: string | null; goiY?: string; diem?: number; doi: ReactNode }) {
  const [t, setT] = useState("");
  const [nhac, setNhac] = useState<string | null>(null);
  const soCau = t.split(/[.!?…]+/).filter((x) => x.trim().length > 2).length;
  return (
    <ManD lui={true} tieu="Viết cho Ba Mẹ" day={<><LoiD loi={nhac ?? loi} />
      <NutD chu="Gửi Ba Mẹ" ic="gui" bam={() => (t.trim().length < 3 ? setNhac("Viết vài câu kể lại rồi gửi nhé") : (setNhac(null), gui(t)))} dangChay={dangChay} />{doi}</>}>
      <ChuD kieu="den" co={17}>{ten}</ChuD>
      <ChuD co={15} mau={D.chu2}>{goiY ?? "Kể lại 2 câu về việc con đã làm"}</ChuD>
      <OChu nhan="Con đã làm gì?" gia={t} doi={setT} />
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <ChuD kieu="rat" co={13.5} mau={soCau >= 2 ? D.xanhD : D.chu3}>{soCau >= 2 ? `${soCau} câu · đủ rồi` : `${soCau} câu`}</ChuD>
        {diem ? <SaoD chu={`+${diem} sao khi Ba Mẹ duyệt`} /> : null}
      </View>
    </ManD>
  );
}

function Camera({ tieu, phu, ma, gui, dangChay, loi, xoaLoi, doi }: { tieu: string; phu: string; ma: string; gui: (a: AnhNop) => void; dangChay: boolean; loi: string | null; xoaLoi: () => void; doi: ReactNode }) {
  const web = Platform.OS === "web";
  const [quyen, xinQuyen] = useCameraPermissions();
  const cam = useRef<CameraView>(null);
  const oTep = useRef<HTMLInputElement | null>(null);
  const [gio, setGio] = useState(() => gioCua(new Date().toISOString()));
  const [loiAnh, setLoiAnh] = useState<string | null>(null);
  const guiRef = useRef(gui);
  useEffect(() => { guiRef.current = gui; });
  useEffect(() => { const t = setInterval(() => setGio(gioCua(new Date().toISOString())), 15000); return () => clearInterval(t); }, []);
  // web: một ô chọn tệp ẩn, mở camera sau của máy (capture) — giữ trong trang để chụp lại nhiều lần
  useEffect(() => {
    if (!web) return;
    const i = document.createElement("input");
    i.type = "file";
    i.accept = "image/*";
    i.setAttribute("capture", "environment");
    i.id = "tre-anh";
    i.setAttribute("aria-label", "Chụp ảnh bằng chứng");
    i.style.cssText = "position:fixed;left:-9999px;width:1px;height:1px;opacity:0";
    i.onchange = async () => {
      const f = i.files?.[0];
      i.value = "";
      if (!f) return;
      try { guiRef.current(await nenAnhWeb(f)); } catch { setLoiAnh("Ảnh chưa đọc được — chụp lại nhé"); }
    };
    document.body.appendChild(i);
    oTep.current = i;
    return () => { i.remove(); };
  }, [web]);
  const chup = async () => {
    xoaLoi();
    setLoiAnh(null);
    if (web) { oTep.current?.click(); return; }
    if (!quyen?.granted) { await xinQuyen(); return; }
    try {
      const a = await cam.current?.takePictureAsync({ quality: 0.3, base64: true, shutterSound: false });
      if (!a?.base64) throw new Error("anh");
      gui({ mime: "image/jpeg", base64: a.base64 });
    } catch (e) {
      setLoiAnh(cauLoi(e));
    }
  };
  const loiHien = loiAnh ?? loi;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#141a22" }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#7aa6af", overflow: "hidden" }}>
        {!web && quyen?.granted ? <CameraView ref={cam} facing="back" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} /> : null}
        <View pointerEvents="none" style={{ width: "78%", maxWidth: 420, aspectRatio: 1, borderWidth: 3, borderColor: "rgba(255,255,255,.9)", borderRadius: 28 }} />
        <View style={{ position: "absolute", left: 16, bottom: 16, backgroundColor: "rgba(0,0,0,.62)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
          <Text style={{ fontFamily: FD.rat, fontSize: 13, color: "#fff" }}>{`${gio} · ${ma.slice(0, 8).toUpperCase()}`}</Text>
        </View>
        <View style={{ position: "absolute", left: 12, right: 12, top: 16, backgroundColor: D.the, borderRadius: 22, paddingVertical: 12, paddingHorizontal: 14, gap: 2 }}>
          <ChuD kieu="den" co={16}>{`📷 ${tieu}`}</ChuD>
          <ChuD co={13.5} mau={D.chu2}>{!web && !quyen?.granted ? "Cho AiiGrow dùng camera để chụp nhé" : phu}</ChuD>
        </View>
        {loiHien ? <View style={{ position: "absolute", left: 12, right: 12, bottom: 56 }}><LoiD loi={loiHien} /></View> : null}
      </View>
      <View style={{ height: 130, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 56 }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/tre/nhiem-vu"))} accessibilityRole="button" hitSlop={8}
          style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: FD.rat, fontSize: 16, color: "#fff" }}>Huỷ</Text>
        </Pressable>
        <Pressable onPress={chup} disabled={dangChay} accessibilityRole="button" accessibilityLabel={web || quyen?.granted ? "Chụp và gửi cho Ba Mẹ" : "Cho phép dùng camera"}
          style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 5, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
          {dangChay ? <ActivityIndicator color="#fff" /> : <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#fff" }} />}
        </Pressable>
        <View style={{ width: 48 }} />
      </View>
      <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>{doi}</View>
    </SafeAreaView>
  );
}
