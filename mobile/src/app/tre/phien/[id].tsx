// con-phien «Đang chơi — còn 5 phút» (FR-04.02, BRD 6.3): đồng hồ nổi ở góc suốt phiên + điểm còn lại; còn 5 / 1 phút ⇒ băng báo + âm báo
// nhẹ, nút Dừng sớm để giữ điểm. Máy chủ là sổ sách: mỗi phút gửi nhịp «đang dùng thật» (trang đang mở), máy chủ trừ điểm và quyết định dừng.
import { useCallback, useEffect, useRef, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { AppState, Platform, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { VongClay } from "@/lib/bieu-do";
import { BangMang, BaoLoi, Chu, F, Icon, M, Nut, Rob, laMatMang, useLam } from "@/lib/ui";
import { NenChoi, amBao, useTre } from "@/lib/ui-tre";
import { kid, tenMuc, type NhipChoi } from "@/lib/api-tre";

const NHIP_MS = 60_000;
const hai = (n: number) => String(Math.max(0, Math.floor(n))).padStart(2, "0");
const dangMo = () => (Platform.OS === "web" ? globalThis.document?.visibilityState !== "hidden" : AppState.currentState === "active");

export default function DangChoi() {
  const { id, muc } = useLocalSearchParams<{ id: string; muc?: string }>();
  const { ten } = useTre();
  const [n, setN] = useState<NhipChoi | null>(null);
  const [giay, setGiay] = useState<number | null>(null);
  const [mat, setMat] = useState(false);
  const { dangChay, loi, lam } = useLam();
  const daBao = useRef<number | null>(null);
  const ket = useCallback((nghiDen?: string | null, ly?: string) => {
    const q = new URLSearchParams({ ...(nghiDen ? { nghiDen } : {}), ...(ly ? { ly } : {}) }).toString();
    router.replace(ly === "gio_ngu" || ly === "het_khung" ? `/tre/gio-ngu?ly=${ly === "gio_ngu" ? "gio_ngu" : "ngoai_khung"}` : `/tre/het-phien?${q}`);
  }, []);
  const guiNhip = useCallback(async () => {
    try {
      const r = await kid.goi<NhipChoi>("phien/nhip", { id, dangDung: dangMo() });
      setMat(false);
      setN(r);
      setGiay(r.conPhut * 60);
      if (r.trangThai === "ket_thuc") return ket(r.nghiDen, r.lyDoKet);
      if (r.canhBao && daBao.current !== r.canhBao) { daBao.current = r.canhBao; amBao(); }
    } catch (e) {
      if (laMatMang(e)) setMat(true);
    }
  }, [id, ket]);
  useEffect(() => {
    const t0 = setTimeout(guiNhip, 0);
    const t = setInterval(guiNhip, NHIP_MS);
    const g = setInterval(() => setGiay((s) => (s === null ? s : Math.max(0, s - 1))), 1000);
    return () => { clearTimeout(t0); clearInterval(t); clearInterval(g); };
  }, [guiNhip]);
  const dung = () => lam(async () => {
    const r = await kid.goi<{ nghiDen: string | null }>("phien/dung", { id });
    ket(r.nghiDen, "con_dung");
  });
  const con = giay ?? 0;
  const conPhut = Math.ceil(con / 60);
  const giu = n ? Math.min(n.soDu, Math.ceil((conPhut * (n.giaPhanNghin || 1000)) / 1000)) : 0;
  const ti = n?.toiDaPhut ? con / (n.toiDaPhut * 60) : 0;
  const tenTc = tenMuc(n?.muc || muc || "");
  const bao = n?.canhBao ?? (conPhut > 0 && conPhut <= 1 ? 1 : conPhut > 0 && conPhut <= 5 ? 5 : null);
  return (
    <NenChoi>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={{ alignItems: "flex-end", paddingHorizontal: 12, paddingTop: 12 }}>
          <View accessibilityRole="timer" accessibilityLabel={`Còn ${hai(con / 60)} phút ${hai(con % 60)} giây, ${n?.soDu ?? 0} điểm`}
            style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,.96)", borderRadius: 99, paddingVertical: 5,
              paddingLeft: 5, paddingRight: 12, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 6 }}>
            <VongClay ti={ti} co={34} day={6} mau={M.diem} />
            <Text style={{ fontFamily: F.rat, fontSize: 16, color: M.chu, fontVariant: ["tabular-nums"] }}>{giay === null ? "--:--" : `${hai(con / 60)}:${hai(con % 60)}`}</Text>
            <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: M.diem, alignItems: "center", justifyContent: "center" }}>
              <Icon ten="sao" mau={M.diemInk} co={12} />
            </View>
            <Text style={{ fontFamily: F.rat, fontSize: 16, color: M.chu, fontVariant: ["tabular-nums"] }}>{n?.soDu ?? "–"}</Text>
          </View>
        </View>
        <View style={{ marginHorizontal: 12, marginTop: 14, backgroundColor: "#fff", borderRadius: 22, paddingVertical: 12, paddingHorizontal: 14, flexDirection: "row",
          gap: 12, alignItems: "center", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 30, shadowOffset: { width: 0, height: 12 }, elevation: 6 }}
          accessibilityRole={bao ? "alert" : undefined} accessibilityLiveRegion="polite">
          <Rob ten="cho" co={56} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Chu kieu="rat" co={15.5}>{bao ? `Còn ${bao === 1 ? 1 : conPhut} phút nữa nhé!` : `${ten} đang chơi ${tenTc}`}</Chu>
            <Chu co={13} mau={M.chu3}>{giu > 0 ? `Dừng bây giờ thì giữ được ${giu} điểm.` : "Dừng sớm thì giữ lại điểm còn lại."}</Chu>
          </View>
          <View><Nut chu="Dừng" loai="vien" nho bam={dung} dangChay={dangChay} /></View>
        </View>
        <View style={{ flex: 1 }} />
        <View style={{ padding: 12, gap: 8 }}>
          {mat ? <BangMang chu="Mất mạng — đồng hồ vẫn đếm trên máy; có mạng lại Rob tính đúng số phút." /> : null}
          <BaoLoi loi={loi} />
        </View>
      </SafeAreaView>
    </NenChoi>
  );
}
