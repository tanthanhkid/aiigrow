// «Máy đang khoá · Ai đang dùng máy?» (con-dt-khac 05 them-28ir0qe4, PIN theo bé 06/11 — L13): chạm tên ⇒ nhập PIN 4 số (/tre/pin);
// bé chưa có PIN ⇒ vào thẳng (máy chủ trả `canDatPin`, Ba Mẹ được nhắc đặt). «Ba Mẹ dùng máy» ⇒ Ba Mẹ nhập mã mở máy (/tre/ba-me).
// Máy chưa ghép ⇒ /tre/ghep. Ba Mẹ đang dùng máy (ho-so › baMeDung) ⇒ /tre/ba-me (màn «Ba Mẹ đang dùng»).
import { useState } from "react";
import { Platform, Pressable, View } from "react-native";
import { Redirect, router } from "expo-router";
import { usePhien } from "@/lib/phien";
import { Rob, useLam, useTai } from "@/lib/ui";
import { useTre } from "@/lib/ui-tre";
import { may, type HoSoBe, type HoSoMay } from "@/lib/api-tre";
import { D } from "@/lib/diu";
import { chuAvt } from "@/lib/con-diu";
import { AvtD, ChoD, ChuD, LoiD, ManD, NutD, PillD } from "@/lib/ui-diu";

export default function ChonTen() {
  if (!may.co()) return <Redirect href="/tre/ghep" />;
  return <DanhSach />;
}

function DanhSach() {
  const { vao } = useTre();
  // Ba Mẹ còn đang dùng máy (ho-so › baMeDung) — xét lúc tải, không gọi Date.now() khi vẽ
  const { d, loi, matMang, tai } = useTai(async () => { const r = await may.goi<HoSoMay>("ho-so"); return { ...r, baMeCon: !!r.baMeDung && Date.parse(r.baMeDung.den) > Date.now() }; });
  const [chon, setChon] = useState<string | null>(null);
  const { dangChay, loi: loiVao, lam } = useLam();
  if (!d) return <ManD><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  if (d.baMeCon && d.baMeDung) return <Redirect href={`/tre/ba-me?den=${encodeURIComponent(d.baMeDung.den)}`} />;
  const ds = d.con;
  const cham = (c: HoSoBe, i: number) => {
    if (c.coPin !== false || c.khoaDen) { router.push(`/tre/pin?con=${c.id}&i=${i}`); return; }
    // bé chưa có PIN (S3: chạm tên vào thẳng)
    setChon(c.id);
    lam(async () => {
      const r = await may.goi<{ phienCon: string }>("dang-nhap-be", { con: c.id });
      await vao(r.phienCon, i);
    });
  };
  return (
    <ManD day={<NutD chu="Ba Mẹ dùng máy" loai="phu" ic="khoa" bam={() => router.push("/tre/ba-me")} />}>
      <View style={{ alignSelf: "flex-start" }}><PillD chu="Máy đang khoá" ic="khoa" /></View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Rob ten="rob-goc" co={110} />
        <View style={{ flex: 1, backgroundColor: D.the, borderRadius: 20, borderWidth: 1, borderColor: D.vien, padding: 14 }}>
          <ChuD kieu="den" co={18}>Ai đang dùng máy?</ChuD>
          <ChuD co={14} mau={D.chu2}>Chạm vào tên của con nhé.</ChuD>
        </View>
      </View>
      {!ds.length ? <ChuD co={15} mau={D.chu2} giua>Máy này chưa có hồ sơ con nào — nhờ Ba Mẹ thêm trong app nhé.</ChuD> : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        {ds.map((c, i) => {
          const dang = chon === c.id && dangChay;
          return (
            <Pressable key={c.id} onPress={() => cham(c, i)} disabled={dangChay} accessibilityRole="button" accessibilityLabel={`Mình là ${c.ten}`}
              accessibilityState={{ busy: dang }}
              style={({ pressed }) => ({ flexBasis: "46%", flexGrow: 1, alignItems: "center", gap: 10, paddingVertical: 18, borderRadius: 24, backgroundColor: D.the,
                borderWidth: dang ? 2 : 1, borderColor: dang ? D.xanh : D.vien, boxShadow: "0px 2px 8px rgba(30,30,20,0.06)", opacity: pressed ? 0.9 : 1 })}>
              <AvtD ten={c.ten} i={i} co={80} chu={chuAvt(c.ten, ds.map((x) => x.ten))} />
              <ChuD kieu="den" co={18} dong={1}>{c.ten}</ChuD>
            </Pressable>
          );
        })}
      </View>
      {dangChay ? <ChuD kieu="rat" co={14} mau={D.chu2} giua>Đang mở…</ChuD> : null}
      <LoiD loi={loiVao} />
      <ChuD co={13.5} mau={D.chu2} giua>Chưa ai vào thì máy chỉ mở màn này.</ChuD>
      <VeBaMe />
    </ManD>
  );
}

/** App native: lối Ba Mẹ đăng nhập app Ba Mẹ (luôn qua mật khẩu / OTP). Web (khung Kid trên máy tính) không hiện. */
function VeBaMe() {
  const { co } = usePhien();
  if (Platform.OS === "web" || co) return null;
  return <NutD chu="Ba Mẹ? Đăng nhập app Ba Mẹ" loai="chu" bam={() => router.push("/dang-nhap")} />;
}
