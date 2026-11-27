// «Xin Ba Mẹ cho vay sao» bản «Dịu» (con-dt-xin 05 cdt-ios-xin-them, sổ sao 15/11 #263 #265 — thay «Xin thêm giờ» theo phút): số dư hiện tại
// («0 sao · Hết sao rồi · 0 sao = 0 phút», «Hôm nay chơi 42 phút · −42 sao»), «Con xin vay 10 / 15 / 30 sao» (mặc định 15), «= 15 phút chơi hoặc
// đổi quà · con sẽ nợ 15 sao», «Nhắn Ba Mẹ» (không bắt buộc), «Sao vay là nợ · Sao nhiệm vụ trả nợ trước», «Xin Ba Mẹ cho vay 15 sao»
// (POST /api/kid/xin-vay {soSao, mucDich, quaId?, loiNhan}; máy chủ cũ ⇒ lời xin them_gio cùng số), «Xin mở app ›». Đường giữ tên cũ
// /tre/them-gio (agent + màn khác trỏ vào). `?soSao=&mucDich=qua&quaId=` từ màn Đổi quà (vay đúng phần thiếu).
import { useState } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { TextInput, View } from "react-native";
import { taiSao, xinVay } from "@/lib/api-tre";
import { cauVay, soSao, soVN } from "@/lib/con-diu";
import { D, FD } from "@/lib/diu";
import { Icon3D, useLam } from "@/lib/ui";
import { ChoD, ChonD, ChuD, LoiD, ManD, NutD, TheD } from "@/lib/ui-diu";
import { NO } from "@/lib/man-con";
import { useTaiTre } from "@/lib/ui-tre";
import { chuPhut } from "@/lib/chu-phut";

export default function XinVay() {
  const p = useLocalSearchParams<{ soSao?: string; mucDich?: string; quaId?: string; ten?: string }>();
  const { d, loi, matMang, tai } = useTaiTre("sao", taiSao);
  const xinTheo = Math.round(Number(p.soSao) || 0);
  const [chon, setChon] = useState<number | null>(xinTheo > 0 && xinTheo <= 1000 ? xinTheo : null);
  const [nhan, setNhan] = useState("");
  const { dangChay, loi: loiLam, lam } = useLam();
  if (!d) return <ManD lui={true} tieu="Xin Ba Mẹ cho vay sao"><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  if (d.khoa) return <Redirect href="/tre/gio-ngu?ly=ba_me_khoa" />;
  const soVay = chon ?? d.vayMacDinh;
  const muc = [...new Set([...d.mucVay, soVay])].sort((a, b) => a - b);
  const laQua = p.mucDich === "qua";
  const xin = () => lam(async () => {
    const r = await xinVay({ soSao: soVay, mucDich: laQua ? "qua" : "choi", ...(laQua && p.quaId ? { quaId: p.quaId } : {}), loiNhan: nhan.trim() });
    router.replace(`/tre/yeu-cau?moi=${r.id}`);
  }, { hangDoi: true });
  const am = d.no > 0 && d.sao <= 0;
  return (
    <ManD lui={true} tieu="Xin Ba Mẹ cho vay sao" day={<><LoiD loi={loiLam} />
      <NutD chu={`Xin Ba Mẹ cho vay ${soVN(soVay)} sao`} ic="gui" bam={xin} dangChay={dangChay} />
      <NutD chu="Xin mở app ›" loai="chu" bam={() => router.push("/tre/xin-phep?loai=cai_app")} /></>}>
      <TheD vang={!am} style={am ? { backgroundColor: NO.nen, borderColor: NO.vien } : undefined}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon3D ten="sao" co={56} />
          <View style={{ flex: 1 }}>
            <ChuD kieu="den" co={30} mau={am ? NO.chu : D.saoInk} so>{soSao(d.sao)}</ChuD>
            <ChuD kieu="rat" co={14} mau={am ? NO.chu : D.saoInk}>{d.hetSao ? "Hết sao rồi · 0 sao = 0 phút" : `${soVN(d.phutCon)} sao = ${soVN(d.phutCon)} phút`}</ChuD>
          </View>
        </View>
        {d.cau.no ? <ChuD kieu="rat" co={13} mau={NO.chu}>{d.cau.no}</ChuD> : null}
        {d.phutHomNay ? <ChuD co={13} mau={am ? NO.chu : D.saoInk}>{`Hôm nay chơi ${chuPhut(d.phutHomNay)} · −${soVN(d.phutHomNay)} sao`}</ChuD> : null}
      </TheD>
      {laQua && p.ten ? <ChuD kieu="rat" co={14.5} mau={D.chu2}>{`Để đổi ${p.ten}`}</ChuD> : null}
      <ChuD kieu="den" co={15}>Con xin vay</ChuD>
      <ChonD nhan="Con xin vay bao nhiêu sao" ds={muc.map((x) => ({ gia: x, chu: `${soVN(x)} sao` }))} gia={soVay} doi={setChon} />
      <ChuD kieu="rat" co={14} mau={D.xanhD}>{cauVay(soVay, d.no)}</ChuD>
      <TheD mong lom>
        <ChuD kieu="rat" co={13} mau={D.chu2}>Nhắn Ba Mẹ (không bắt buộc)</ChuD>
        <TextInput value={nhan} onChangeText={setNhan} maxLength={100} accessibilityLabel="Nhắn Ba Mẹ" placeholder="vd Con làm nốt bài với bạn ạ"
          placeholderTextColor={D.chu3} style={{ fontFamily: FD.dam, fontSize: 16, color: D.chu, minHeight: 28, padding: 0 }} />
      </TheD>
      <TheD mong style={{ backgroundColor: NO.nen, borderColor: NO.vien }}>
        <ChuD kieu="den" co={15} mau={NO.chu}>Sao vay là nợ</ChuD>
        <ChuD kieu="rat" co={13.5} mau={NO.chu}>Sao nhiệm vụ trả nợ trước</ChuD>
      </TheD>
    </ManD>
  );
}
