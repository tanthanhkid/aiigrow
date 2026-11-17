// Thẻ nghe ghi âm bằng chứng (bàn 17/11 them-d40e3495@v5 «Bằng chứng · Đọc sách»): ▶ Nghe từ đầu · Nghe nhanh x2 · a / b. Bản WEB: HTMLAudioElement với data URI.
// Bản native (nghe-ghi-am.tsx) chưa phát được — dự án chưa có expo-audio. Cùng chữ ký export cho hai bản.
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { KHOI } from "./clay";
import { Chu, Icon3D, M } from "./ui";
import { SongAm, phutGiay, type NgheGhiAmProps } from "./song-am";

export { SongAm, phutGiay, type NgheGhiAmProps };

export function NgheGhiAm({ mime, base64, nhan }: NgheGhiAmProps) {
  const am = useRef<HTMLAudioElement | null>(null);
  const [luc, setLuc] = useState(0);
  const [dai, setDai] = useState<number | null>(null);
  const [chay, setChay] = useState(false);
  const [nhanh, setNhanh] = useState(false);
  useEffect(() => {
    const A = (globalThis as { Audio?: typeof Audio }).Audio;
    if (!A) return;
    const a = new A(`data:${mime};base64,${base64}`);
    am.current = a;
    const capNhat = () => setLuc(a.currentTime);
    const coDai = () => { if (Number.isFinite(a.duration)) setDai(a.duration); };
    const het = () => setChay(false);
    a.addEventListener("timeupdate", capNhat);
    a.addEventListener("loadedmetadata", coDai);
    a.addEventListener("durationchange", coDai);
    a.addEventListener("ended", het);
    return () => { a.pause(); a.removeEventListener("timeupdate", capNhat); a.removeEventListener("loadedmetadata", coDai);
      a.removeEventListener("durationchange", coDai); a.removeEventListener("ended", het); am.current = null; };
  }, [mime, base64]);
  const tuDau = () => { const a = am.current; if (!a) return; a.currentTime = 0; a.playbackRate = nhanh ? 2 : 1; a.play().then(() => setChay(true), () => setChay(false)); };
  const dungTiep = () => { const a = am.current; if (!a) return; if (chay) { a.pause(); setChay(false); } else a.play().then(() => setChay(true), () => setChay(false)); };
  const doiNhanh = () => { const a = am.current; const v = !nhanh; setNhanh(v); if (a) a.playbackRate = v ? 2 : 1; };
  const ti = dai ? luc / dai : 0;
  // thiết kế d40e3495@v5: khung trắng nổi chứa ô ngọc nhạt (ô icon sách + «Ghi âm <Con> đọc», sóng âm, nút phát tròn đen + thanh tiến độ + giờ),
  // dưới là hai viên «▶ Nghe từ đầu» (ngọc nhạt) · «Nghe nhanh x2» (xám)
  return (
    <View style={[{ padding: 10, borderRadius: 30, backgroundColor: M.the, gap: 10 }, KHOI.the]}>
      <View style={{ padding: 16, borderRadius: 24, backgroundColor: M.chinhSoft, gap: 12 }}>
        {nhan ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={[{ width: 56, height: 56, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }, KHOI.nho]}><Icon3D ten="sach" co={34} /></View>
            <Chu kieu="rat" co={17} style={{ flex: 1 }}>{nhan}</Chu>
          </View>
        ) : null}
        <SongAm ti={ti} cao={60} mau={M.chinhInk} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={luc > 0 || chay ? dungTiep : tuDau} accessibilityRole="button" accessibilityLabel={chay ? "Tạm dừng" : "Phát ghi âm"}
            style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: M.nut, alignItems: "center", justifyContent: "center" }}>
            {chay ? <View style={{ flexDirection: "row", gap: 4 }}><View style={{ width: 5, height: 16, backgroundColor: "#fff" }} /><View style={{ width: 5, height: 16, backgroundColor: "#fff" }} /></View>
              : <View style={{ marginLeft: 4, width: 0, height: 0, borderTopWidth: 9, borderBottomWidth: 9, borderLeftWidth: 15, borderTopColor: "transparent", borderBottomColor: "transparent", borderLeftColor: "#fff" }} />}
          </Pressable>
          <View style={{ flex: 1, height: 8, borderRadius: 4, backgroundColor: "#cfd6d3", overflow: "hidden" }}>
            <View style={{ width: `${Math.round(ti * 100)}%`, height: 8, borderRadius: 4, backgroundColor: M.chinhInk }} />
          </View>
          <Chu kieu="rat" co={14} so mau={M.chu2}>{`${phutGiay(luc)} / ${dai ? phutGiay(dai) : "--:--"}`}</Chu>
        </View>
      </View>
      {/* lề 16 tới mép khung (cổng LE-THE) */}
      <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 6, paddingBottom: 6 }}>
        <Pressable onPress={tuDau} accessibilityRole="button" style={{ flex: 1, minHeight: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: M.chinhSoft }}>
          <Chu kieu="rat" co={14.5} mau={M.chinhInk}>▶ Nghe từ đầu</Chu>
        </Pressable>
        <Pressable onPress={doiNhanh} accessibilityRole="button" style={{ flex: 1, minHeight: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", backgroundColor: "#ecebe7" }}>
          <Chu kieu="rat" co={14.5} mau={M.chu2}>{nhanh ? "Nghe thường x1" : "Nghe nhanh x2"}</Chu>
        </Pressable>
      </View>
    </View>
  );
}
