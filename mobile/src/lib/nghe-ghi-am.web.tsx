// Thẻ nghe ghi âm bằng chứng (bm-hang-ngay/26 «Bằng chứng · Đọc sách»): ▶ Nghe từ đầu · Nghe nhanh x2 · a / b. Bản WEB: HTMLAudioElement với data URI.
// Bản native (nghe-ghi-am.tsx) chưa phát được — dự án chưa có expo-audio. Cùng chữ ký export cho hai bản.
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { KHOI } from "./clay";
import { Chu, M, Nut } from "./ui";
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
  return (
    <View style={[{ padding: 16, borderRadius: 28, backgroundColor: M.chinhSoft, gap: 12 }, KHOI.the]}>
      {nhan ? <Chu kieu="dam" co={13.5} mau={M.chinhInk}>{nhan}</Chu> : null}
      <SongAm ti={dai ? luc / dai : 0} />
      <Chu kieu="rat" co={15} so mau={M.chu2} style={{ textAlign: "center" }}>{`${phutGiay(luc)} / ${dai ? phutGiay(dai) : "--:--"}`}</Chu>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Nut chu={chay ? "Tạm dừng" : luc > 0 ? "Nghe tiếp" : "▶ Nghe từ đầu"} nho bam={luc > 0 || chay ? dungTiep : tuDau} />
        <Nut chu={nhanh ? "Nghe thường x1" : "Nghe nhanh x2"} nho loai="vien" bam={doiNhanh} />
      </View>
    </View>
  );
}
