// bm1-ob-gio «<Con> chơi máy thế nào?» (bước 4/5 Lần đầu; bàn v21 chốt 16/11 — #306): thẻ vàng «Quà khởi đầu cho con» (Grow + sao bay, số sao to, − / +
// bước 10, 0…200, mặc định 30, «1 sao = chơi 1 phút») + «Mỗi ngày chơi bao lâu?» + «Chơi liền bao lâu thì nghỉ?» (lib/gioi-han-ui › ChonGioiHan: ô số phút gõ
// trực tiếp + − / + 15 phút). «Tiếp: chọn app cho con» ⇒ /thiet-lap/app ⇒ Web ⇒ lưu một lần (POST thiet-lap {saoKhoiDau, gioiHanNgayThuong, gioiHanCuoiTuan, phutMoiLuot}
// — lib/thiet-lap › thanThietLap; máy chủ tặng sao một lần). Giờ ngủ không còn ở màn này (thiết kế 15/11).
import { useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, useWindowDimensions, View } from "react-native";
import { BONG, KHOI } from "@/lib/clay";
import { DauMan } from "@/lib/lan-dau";
import { doiSaoKhoiDau, SAO_KHOI_DAU_MD, SAO_KHOI_DAU_TOI_DA } from "@/lib/so-sao";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl } from "@/lib/thiet-lap";
import { GIOI_HAN_MD, type GioiHan } from "@/lib/gioi-han";
import { ChonGioiHan } from "@/lib/gioi-han-ui";
import { Chu, F, Icon3D, M, Man, Nut, Rob } from "@/lib/ui";

const NAU = "#6e4300";

function NutSao({ dau, nhan, bam, tat }: { dau: "−" | "+"; nhan: string; bam: () => void; tat: boolean }) {
  return (
    <Pressable onPress={bam} disabled={tat} accessibilityRole="button" accessibilityLabel={nhan} hitSlop={4}
      style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#fffaf0", alignItems: "center", justifyContent: "center", opacity: tat ? 0.45 : 1, boxShadow: BONG.nho }}>
      <Chu kieu="rat" co={22} mau="#0a5246">{dau}</Chu>
    </Pressable>
  );
}

export default function ObGio() {
  const tl = layTl();
  const nho = useWindowDimensions().width < 360;        // máy hẹp (320): Grow nhỏ lại, bảng quà lùi sang phải cho khỏi đè nút −
  const ten = tl.tenCon ?? "con";
  const [sao, setSao] = useState<number>(tl.saoKhoiDau ?? SAO_KHOI_DAU_MD);
  const [gh, setGh] = useState<GioiHan>(tl.gioiHan ?? GIOI_HAN_MD);
  const [ghLoi, setGhLoi] = useState<string | null>(null);
  const doi = (h: 1 | -1) => { const n = doiSaoKhoiDau(sao, h); setSao(n); datTl({ saoKhoiDau: n }); };
  const doiGh = (g: GioiHan, loi: string | null) => { setGh(g); setGhLoi(loi); if (!loi) datTl({ gioiHan: g }); };
  const tiep = () => { datTl({ saoKhoiDau: sao, gioiHan: gh }); router.push("/thiet-lap/app"); };
  return (
    <Man dau={<DauMan ve="/thiet-lap/qua" phai={<ThanhBuoc5 dang={3} />} />}
      day={<Nut chu="Tiếp: chọn app cho con" rong tat={!!ghLoi} bam={tiep} />}>
      <Text accessibilityRole="header" style={{ fontFamily: F.rat, fontSize: 25, lineHeight: 30, letterSpacing: -0.5, color: M.chu }}>{`${ten} chơi máy thế nào?`}</Text>
      <View style={{ height: 138, borderRadius: 28, overflow: "hidden", backgroundColor: "#fdecc8", backgroundImage: "linear-gradient(160deg, #fff4dc, #f9d996)", ...KHOI.the }}>
        <View style={{ position: "absolute", left: 16, top: 12 }}><Icon3D ten="sao" co={15} /></View>
        <View style={{ position: "absolute", left: nho ? 66 : 106, top: 16 }}><Icon3D ten="sao" co={22} /></View>
        <View style={{ position: "absolute", left: -2, bottom: -8 }}><Rob ten="rob-goc" co={nho ? 92 : 124} /></View>
        <View style={{ position: "absolute", right: 14, top: 12, ...(nho ? { left: 92 } : { width: 186 }), alignItems: "center" }}>
          <Chu kieu="rat" co={14} mau={NAU} dong={1}>Quà khởi đầu cho con</Chu>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", alignSelf: "stretch", marginTop: 6, marginBottom: 8 }}>
            <NutSao dau="−" nhan="Bớt 10 sao" bam={() => doi(-1)} tat={sao <= 0} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }} accessibilityLabel={`${sao} sao`}>
              <Icon3D ten="sao" co={30} /><Chu kieu="rat" co={nho ? 32 : 40} mau="#3b2600" so style={{ letterSpacing: -1.5 }}>{String(sao)}</Chu>
            </View>
            <NutSao dau="+" nhan="Thêm 10 sao" bam={() => doi(1)} tat={sao >= SAO_KHOI_DAU_TOI_DA} />
          </View>
          <View style={{ paddingVertical: 5, paddingHorizontal: 12, borderRadius: 14, backgroundColor: "rgba(255,255,255,0.75)", boxShadow: BONG.lom }}>
            <Chu kieu="rat" co={12.5} mau="#0a5246" dong={1}>1 sao = chơi 1 phút</Chu>
          </View>
        </View>
      </View>
      <ChonGioiHan gt={gh} doi={doiGh} />
    </Man>
  );
}
