// «Ba Mẹ nhập mã» + «Ba Mẹ đang dùng» (con-dt-khac 11–12, PIN 06/11 — L13/L19): Ba Mẹ mở app AiiGrow → «Mã mở máy» 6 số (đổi sau 10 phút,
// mang sẵn 15 / 30 / 60 phút) → gõ trên máy con ⇒ `POST /api/device/ba-me-mo {ma}` → máy mở hết cho Ba Mẹ, KHÔNG trừ giờ của con, tới `den`.
// «Khoá lại» (`khoa-lai`) hoặc hết giờ ⇒ máy về màn chọn tên. Mỗi mã một lượt (409 `ma_da_dung`); sai 5 lần ⇒ chờ 10 phút.
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { LoiApi } from "@/lib/api";
import { may } from "@/lib/api-tre";
import { D } from "@/lib/diu";
import { Icon3D } from "@/lib/ui";
import { BanPhim, ChuD, LoiD, ManD, NutD, O6, PillD, TheD, TieuD, VongD, mmss, useDemNguoc } from "@/lib/ui-diu";

const APP_MO: [Parameters<typeof Icon3D>[0]["ten"], string][] = [
  ["dt", "Điện thoại"], ["tin", "Tin nhắn"], ["camera", "Máy ảnh"], ["web", "Trình duyệt"], ["lich", "Lịch"], ["game", "Trò chơi"], ["sach", "Sách"], ["banhrang", "Cài đặt"],
];

export default function BaMe() {
  const p = useLocalSearchParams<{ den?: string }>();
  const [den, setDen] = useState<number | null>(() => (p.den && Date.parse(p.den) > Date.now() ? Date.parse(p.den) : null));
  const [ma, setMa] = useState("");
  const [loi, setLoi] = useState<string | null>(null);
  const [dang, setDang] = useState(false);
  const [choDen, setChoDen] = useState<number | null>(null);
  const con = useDemNguoc(den);
  const cho = useDemNguoc(choDen);
  const khoaLai = async () => {
    setDang(true);
    try { await may.goi("khoa-lai", {}); } catch { /* mất mạng: máy vẫn về màn chọn tên */ } finally { setDang(false); }
    router.replace("/tre/chon-ten");
  };
  useEffect(() => { if (den && con === 0) router.replace("/tre/chon-ten"); }, [den, con]);

  const dangGui = useRef(false);
  const mo = async (v: string) => {
    if (dangGui.current) return;
    dangGui.current = true;
    setDang(true); setLoi(null);
    try {
      const r = await may.goi<{ baMeDung: { den: string } }>("ba-me-mo", { ma: v });
      setDen(Date.parse(r.baMeDung.den));
    } catch (e) {
      setMa("");
      if (e instanceof LoiApi && e.ma === "ma_tam_khoa") setChoDen(Date.now() + Number(e.them?.choGiay ?? 600) * 1000);
      setLoi(e instanceof LoiApi ? e.message : "Chưa mở được — thử lại nhé.");
    } finally { dangGui.current = false; setDang(false); }
  };

  if (den) {
    return (
      <ManD day={<><NutD chu="Khoá lại" ic="khoa" bam={khoaLai} dangChay={dang} /><ChuD co={13.5} mau={D.chu2} giua>Xong việc thì bấm «Khoá lại»</ChuD></>}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <VongD ti={1} so={mmss(con)} co={84} day={8} />
          <View style={{ flex: 1 }}>
            <TieuD chu="Ba Mẹ đang dùng" nho />
            <PillD chu="Không trừ giờ của con" loai="xanh" />
          </View>
        </View>
        <TheD style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 14 }}>
          {APP_MO.map(([ic, t]) => (
            <View key={t} style={{ width: "25%", alignItems: "center", gap: 4 }}>
              <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: D.ic, alignItems: "center", justifyContent: "center" }}><Icon3D ten={ic} co={34} /></View>
              <ChuD kieu="rat" co={12} mau={D.chu2} dong={1}>{t}</ChuD>
            </View>
          ))}
        </TheD>
        <ChuD kieu="rat" co={15} mau={D.xanhD} giua>Máy mở hết cho Ba Mẹ</ChuD>
      </ManD>
    );
  }
  return (
    <ManD lui="/tre/chon-ten" tieu="Ba Mẹ nhập mã" day={<NutD chu="Mở máy cho Ba Mẹ" bam={() => mo(ma)} dangChay={dang} tat={ma.length < 6 || cho > 0} />}>
      <ChuD co={15} mau={D.chu2}>Dùng khi cần mở máy gấp</ChuD>
      <TheD mong>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Icon3D ten="dt" co={28} />
          <ChuD kieu="rat" co={14.5} style={{ flex: 1 }}>{"Mở app AiiGrow của Ba Mẹ → Máy của con → «Mã mở máy»"}</ChuD>
        </View>
      </TheD>
      <View style={{ gap: 8 }}>
        <O6 gia={ma} loi={!!loi && !ma} />
        <ChuD kieu="rat" co={13.5} mau={D.chu2} giua>{cho > 0 ? `Sai nhiều lần — chờ ${mmss(cho)} rồi thử lại` : "Mã 6 số · đổi sau 10 phút"}</ChuD>
      </View>
      <LoiD loi={loi} />
      <BanPhim go={(k) => { if (ma.length >= 6) return; const v = ma + k; setMa(v); if (v.length === 6 && cho === 0) mo(v); }}
        xoa={() => setMa((m) => m.slice(0, -1))} tat={dang || cho > 0} nho />
    </ManD>
  );
}
