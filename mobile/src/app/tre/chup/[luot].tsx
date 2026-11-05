// con-chup «Chụp bằng chứng» (FR-03.02): camera mở ngay trong app, không chọn từ thư viện; ảnh gắn giờ + mã lượt. Nộp ≤ 3 chạm: bấm nút
// chụp là gửi luôn. Web: nút chụp mở camera của trình duyệt (capture) — máy tính không có camera thì chọn tệp. Mất mạng ⇒ ảnh xếp hàng chờ trên máy.
// Nhiệm vụ «kể lại» (văn bản): ô viết vài câu thay cho camera. 05/11 «ghi âm»: web ghi bằng micro của trình duyệt (MediaRecorder, ≤ 90 giây,
// gửi `ghiAm {mime: audio/*, base64}`); app native chưa có thư viện ghi âm ⇒ viết vài câu kể lại (máy chủ nhận, Ba Mẹ vẫn duyệt).
import React, { useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { SafeAreaView } from "react-native-safe-area-context";
import { BaoLoi, Canh, Chu, F, M, Nut, ONhap, Rob, cauLoi, useLam } from "@/lib/ui";
import { ManTre, useTaiTre, gioCua } from "@/lib/ui-tre";
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
  const gui = (anh: AnhNop[], ghiChu?: string, ghiAm?: AnhNop) => lam(async () => {
    const r = await nopBai(luot, { anh, ghiChu, ghiAm });
    const q = new URLSearchParams({ diem: String(d?.sao ?? d?.diem ?? ""), ...(r.daXepHang ? { xep: "1" } : {}) }).toString();
    router.replace(r.trang_thai === "duoc_duyet" ? `/tre/duoc-duyet/${luot}` : `/tre/cho-duyet?${q}`);
  });
  if (d && d.bang_chung === "van_ban") return <KeLai ten={d.ten} gui={(t) => gui([], t)} dangChay={dangChay} loi={loi} />;
  if (d && d.bang_chung === "ghi_am") {
    return coGhiAm()
      ? <GhiAm ten={d.ten} gui={(a, t) => gui([], t, a)} dangChay={dangChay} loi={loi} viet={(t) => gui([], t)} />
      : <KeLai ten={d.ten} goiY="Máy này chưa ghi âm được — viết vài câu kể lại cho Ba Mẹ nhé!" gui={(t) => gui([], t)} dangChay={dangChay} loi={loi} />;
  }
  return <Camera tieu={d ? `Chụp rõ “${d.ten}” nhé!` : "Chụp rõ việc đã làm nhé!"} ma={luot} gui={(a) => gui([a])} dangChay={dangChay} loi={loi} xoaLoi={() => setLoi(null)} />;
}

/** Web có micro (MediaRecorder) ⇒ ghi âm được; app native / trình duyệt cũ ⇒ không. */
const coGhiAm = () => Platform.OS === "web" && typeof (globalThis as { MediaRecorder?: unknown }).MediaRecorder === "function"
  && !!globalThis.navigator?.mediaDevices?.getUserMedia;
const GHI_TOI_DA_GIAY = 90;

/** Ghi âm bằng micro của trình duyệt: Ghi → Dừng → nghe lại → Gửi (kèm vài chữ nếu muốn). Base64 ≤ 2 MB (máy chủ: ghi_am_qua_lon). */
function GhiAm({ ten, gui, dangChay, loi, viet }: { ten: string; gui: (a: AnhNop, ghiChu?: string) => void; dangChay: boolean; loi: string | null; viet: (t: string) => void }) {
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
  if (thayViet) return <KeLai ten={ten} goiY="Viết vài câu kể lại cho Ba Mẹ nhé!" gui={viet} dangChay={dangChay} loi={loi} />;
  const day = trang === "ghi" ? <Nut chu={`Dừng (${giay}s)`} ic="x" rong loai="vien" bam={() => rec.current?.stop()} />
    : trang === "xong" && bai ? <><Nut chu="Gửi cho Ba Mẹ" ic="gui" rong bam={() => gui(bai.a, t.trim() || undefined)} dangChay={dangChay} />
      <Nut chu="Ghi lại" loai="ma" rong bam={() => { setBai(null); setTrang("cho"); }} /></>
      : <><Nut chu="Bắt đầu ghi âm" ic="tin" rong bam={batDau} />{nhac ? <Nut chu="Viết kể lại thay" ic="but" loai="ma" rong bam={() => setThayViet(true)} /> : null}</>;
  return (
    <ManTre lui={{ chu: "Quay lại" }} day={<><BaoLoi loi={nhac ?? loi} />{day}</>}>
      <Canh lv="chi" mau="vang" tieu={ten} loi={trang === "ghi" ? "Rob đang nghe… nói xong bấm Dừng nhé!" : "Ghi âm kể lại cho Ba Mẹ nghe nhé!"} thap />
      {trang === "xong" && bai ? (
        <View style={{ gap: 10 }}>
          {Platform.OS === "web" ? React.createElement("audio", { src: bai.url, controls: true, style: { width: "100%" } }) : null}
          <ONhap nhan="Viết thêm (không bắt buộc)" value={t} onChangeText={setT} maxLength={200} />
        </View>
      ) : null}
    </ManTre>
  );
}

function KeLai({ ten, gui, dangChay, loi, goiY }: { ten: string; gui: (t: string) => void; dangChay: boolean; loi: string | null; goiY?: string }) {
  const [t, setT] = useState("");
  const [nhac, setNhac] = useState<string | null>(null);
  return (
    <ManTre lui={{ chu: "Quay lại" }} day={<><BaoLoi loi={nhac ?? loi} /><Nut chu="Gửi cho Ba Mẹ" ic="gui" rong bam={() => (t.trim().length < 3 ? setNhac("Viết vài câu kể lại rồi gửi nhé") : (setNhac(null), gui(t)))} dangChay={dangChay} /></>}>
      <Canh lv="chi" mau="vang" tieu={ten} loi={goiY ?? "Kể lại vài câu cho Ba Mẹ nghe nhé!"} thap />
      <ONhap nhan="Con đã làm gì?" value={t} onChangeText={setT} multiline style={{ minHeight: 120, textAlignVertical: "top", paddingTop: 12 }} />
    </ManTre>
  );
}

function Camera({ tieu, ma, gui, dangChay, loi, xoaLoi }: { tieu: string; ma: string; gui: (a: AnhNop) => void; dangChay: boolean; loi: string | null; xoaLoi: () => void }) {
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
    <SafeAreaView style={{ flex: 1, backgroundColor: "#111" }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#7aa6af", overflow: "hidden" }}>
        {!web && quyen?.granted ? <CameraView ref={cam} facing="back" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} /> : null}
        <View pointerEvents="none" style={{ width: "78%", maxWidth: 420, aspectRatio: 1, borderWidth: 3, borderColor: "rgba(255,255,255,.9)", borderRadius: 28 }} />
        <View style={{ position: "absolute", left: 16, bottom: 16, backgroundColor: "rgba(0,0,0,.62)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
          <Text style={{ fontFamily: F.dam, fontSize: 13, color: "#fff" }}>{`${gio} · ${ma.slice(0, 8).toUpperCase()}`}</Text>
        </View>
        <View style={{ position: "absolute", left: 12, right: 12, top: 16, backgroundColor: "#fff", borderRadius: 22, paddingVertical: 12, paddingHorizontal: 14,
          flexDirection: "row", gap: 12, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 30, shadowOffset: { width: 0, height: 12 }, elevation: 6 }}>
          <Rob ten="chi" co={56} />
          <View style={{ flex: 1 }}>
            <Chu kieu="rat" co={15.5}>{tieu}</Chu>
            <Chu co={13} mau={M.chu3}>{!web && !quyen?.granted ? "Cho AiiGrow dùng camera để chụp nhé" : "Rob giữ ảnh này cho Ba Mẹ xem"}</Chu>
          </View>
        </View>
        {loiHien ? <View style={{ position: "absolute", left: 12, right: 12, bottom: 56 }}><BaoLoi loi={loiHien} /></View> : null}
      </View>
      <View style={{ height: 170, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 56 }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace("/tre/nhiem-vu"))} accessibilityRole="button" hitSlop={8}
          style={{ minWidth: 48, minHeight: 48, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: F.dam, fontSize: 16, color: "#fff" }}>Huỷ</Text>
        </Pressable>
        <Pressable onPress={chup} disabled={dangChay} accessibilityRole="button" accessibilityLabel={web || quyen?.granted ? "Chụp và gửi cho Ba Mẹ" : "Cho phép dùng camera"}
          style={{ width: 84, height: 84, borderRadius: 42, borderWidth: 5, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
          {dangChay ? <ActivityIndicator color="#fff" /> : <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: "#fff" }} />}
        </Pressable>
        <View style={{ width: 48 }} />
      </View>
    </SafeAreaView>
  );
}
