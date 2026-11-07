// «Nhập PIN 4 số» theo bé (con-dt-khac 06–10, PIN 06/11 — L13, API S3 `POST /api/device/dang-nhap-be {con, pin}`):
// avatar + tên, 4 chấm, bàn phím to; gõ đủ 4 số là gửi. Sai ⇒ «Chưa đúng · còn N lần thử»; sai 5 lần ⇒ «Sai 5 lần rồi · hít thở chậm nào»
// đếm ngược 15 giây (máy chủ giữ hạn — `pin_tam_khoa {choGiay, khoaDen}`); «Quên PIN?» ⇒ 3 bước nhờ Ba Mẹ + «Báo Ba Mẹ giúp con» (`quen-pin`).
// Đường cũ /tre/pin không tham số (agent bản trước) ⇒ về màn chọn tên.
import { useState } from "react";
import { View } from "react-native";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { LoiApi } from "@/lib/api";
import { may, type HoSoMay } from "@/lib/api-tre";
import { choTuHoSo, chuAvt, ketQuaPin } from "@/lib/con-diu";
import { D } from "@/lib/diu";
import { useTai } from "@/lib/ui";
import { useTre } from "@/lib/ui-tre";
import { AvtD, BanPhim, BuocD, Cham4, ChoD, ChuD, LoiD, ManD, NutD, PillD, TheD, TieuD, VongD, mmss, useDemNguoc } from "@/lib/ui-diu";

export default function Pin() {
  const p = useLocalSearchParams<{ con?: string; i?: string }>();
  if (!p.con || !may.co()) return <Redirect href="/tre/chon-ten" />;
  return <NhapPin con={p.con} i={Number(p.i) || 0} />;
}

function NhapPin({ con, i }: { con: string; i: number }) {
  const { vao } = useTre();
  // mốc hết chờ của bé (ho-so › khoaDen) tính lúc tải — không gọi Date.now() khi vẽ
  const hs = useTai(async () => { const r = await may.goi<HoSoMay>("ho-so"); const b = r.con.find((c) => c.id === con); return { ...r, denMs: b ? choTuHoSo(b) : null }; });
  const be = hs.d?.con.find((c) => c.id === con);
  const [pin, setPin] = useState("");
  const [conLan, setConLan] = useState<number | null>(null);
  const [den, setDen] = useState<number | null>(null);
  const [loi, setLoi] = useState<string | null>(null);
  const [dangGui, setDangGui] = useState(false);
  const [quen, setQuen] = useState(false);
  const cho = useDemNguoc(den ?? hs.d?.denMs ?? null);

  const gui = async (v: string) => {
    setDangGui(true); setLoi(null);
    try {
      const r = await may.goi<{ phienCon: string }>("dang-nhap-be", { con, pin: v });
      await vao(r.phienCon, i);
    } catch (e) {
      const k = ketQuaPin(e instanceof LoiApi ? { ma: e.ma, message: e.message, them: e.them } : { message: "Chưa vào được — thử lại nhé." });
      setPin("");
      if (k.loai === "sai") setConLan(k.conLan);
      else if (k.loai === "cho") { setDen(k.denMs); setConLan(0); }
      else if (k.loai === "can_pin") { setLoi("Ba Mẹ vừa đặt PIN mới — nhập PIN 4 số nhé."); hs.tai(); }
      else if (k.loai === "loi") setLoi(e instanceof LoiApi && e.ma === "mat_mang" ? "Mất mạng rồi — bật Wi‑Fi rồi nhập lại nhé." : k.cau);
    } finally { setDangGui(false); }
  };
  const go = (k: string) => {
    if (dangGui || cho > 0) return;
    const v = (pin + k).slice(0, 4);
    setPin(v);
    if (v.length === 4) gui(v);
  };

  if (!hs.d) return <ManD lui="/tre/chon-ten"><ChoD loi={hs.loi} matMang={hs.matMang} tai={hs.tai} /></ManD>;
  if (!be) return <Redirect href="/tre/chon-ten" />;
  if (quen) return <QuenPin ten={be.ten} i={i} con={con} lai={() => setQuen(false)} />;

  const dau = (
    <View style={{ alignItems: "center", gap: 8 }}>
      <AvtD ten={be.ten} i={i} co={96} chu={chuAvt(be.ten, hs.d.con.map((x) => x.ten))} />
      <ChuD kieu="den" co={22}>{be.ten}</ChuD>
    </View>
  );
  // sai 5 lần ⇒ chờ (them-8l4fb6yf)
  if (cho > 0) {
    return (
      <ManD lui="/tre/chon-ten" day={<NutD chu="Quên PIN? Nhờ Ba Mẹ" loai="chu" bam={() => setQuen(true)} />}>
        {dau}
        <View style={{ alignItems: "center", gap: 6, paddingTop: 8 }}>
          <TieuD chu={`Sai ${hs.d.pinSaiToiDa ?? 5} lần rồi`} nho giua />
          <ChuD co={15} mau={D.chu2} giua>{"Hít thở chậm nào.\nChờ một chút rồi thử lại nhé."}</ChuD>
        </View>
        <View style={{ alignItems: "center", paddingTop: 10 }}>
          <VongD ti={cho / Math.max(cho, hs.d.pinChoGiay ?? 15)} so={mmss(cho)} don="giây" co={150} />
        </View>
      </ManD>
    );
  }
  return (
    <ManD lui="/tre/chon-ten" day={<NutD chu="Quên PIN?" loai="chu" bam={() => setQuen(true)} />}>
      {dau}
      <View style={{ alignItems: "center", gap: 14 }}>
        {conLan ? <View style={{ alignSelf: "center" }}><PillD chu={`Chưa đúng · còn ${conLan} lần thử`} loai="loi" /></View>
          : <ChuD kieu="rat" co={15} mau={D.chu2}>Nhập PIN 4 số</ChuD>}
        <Cham4 n={pin.length} loi={!!conLan && !pin.length} />
      </View>
      <LoiD loi={loi} />
      <BanPhim go={go} xoa={() => setPin((x) => x.slice(0, -1))} tat={dangGui} nho />
      {!conLan ? <ChuD kieu="rat" co={13.5} mau={D.xanhD} giua>Máy sẽ nhớ con — lần sau mở là vào luôn</ChuD> : null}
    </ManD>
  );
}

/** «Quên PIN rồi à?» (them-bwdspoi7): 3 bước Ba Mẹ đặt lại + «Báo Ba Mẹ giúp con» (`POST quen-pin`, đã báo ⇒ không báo trùng). */
function QuenPin({ ten, i, con, lai }: { ten: string; i: number; con: string; lai: () => void }) {
  const [daBao, setDaBao] = useState<null | "moi" | "lai">(null);
  const [dang, setDang] = useState(false);
  const [loi, setLoi] = useState<string | null>(null);
  const bao = async () => {
    setDang(true); setLoi(null);
    try { const r = await may.goi<{ lapLai?: boolean }>("quen-pin", { con }); setDaBao(r.lapLai ? "lai" : "moi"); }
    catch (e) { setLoi(e instanceof LoiApi ? e.message : "Chưa báo được — thử lại nhé."); }
    finally { setDang(false); }
  };
  return (
    <ManD lui={lai} day={<><NutD chu="Có PIN mới · nhập lại" bam={lai} /><NutD chu="Chọn bé khác" loai="chu" bam={() => router.replace("/tre/chon-ten")} /></>}>
      <TieuD chu="Quên PIN rồi à?" />
      <ChuD co={15} mau={D.chu2}>Không sao! Nhờ Ba Mẹ đặt PIN mới nhé.</ChuD>
      <TheD style={{ gap: 14 }}>
        <BuocD n={1} tieu="Ba Mẹ mở AiiGrow" />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1 }}><BuocD n={2} tieu={`Vào hồ sơ ${ten}`} /></View>
          <AvtD ten={ten} i={i} co={32} />
        </View>
        <BuocD n={3} tieu="Bấm «PIN · Đặt lại»" cuoi />
      </TheD>
      {daBao ? <View style={{ alignSelf: "center" }}><PillD chu={daBao === "lai" ? "Đã báo Ba Mẹ rồi · chờ Ba Mẹ nhé" : "Đã báo Ba Mẹ"} loai="xanh" ic="tick" /></View>
        : <NutD chu="Báo Ba Mẹ giúp con" loai="phu" ic="gui" bam={bao} dangChay={dang} />}
      <LoiD loi={loi} />
    </ManD>
  );
}
