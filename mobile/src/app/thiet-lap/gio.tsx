// bm1-ob-gio «<Con> chơi máy bằng sao tự kiếm» (bước 4/5 Lần đầu, thiết kế chốt 15/11 — #264): bỏ quỹ phút miễn phí mỗi ngày (1 sao = 1 phút «Tính phút»).
// Thẻ vàng: «Tặng sao khởi đầu» 0 (không tặng) · 20 · 30 · 60 sao (mặc định 30) + 3 dòng luật (Làm nhiệm vụ → nhận sao · Chơi «Tính phút» → trừ sao ·
// Hết sao → app tự khoá, con xin Ba Mẹ cho vay sao), Grow nói «Không còn giờ chơi miễn phí mỗi ngày: 1 sao = 1 phút…».
// «Tiếp: chọn app cho con» ⇒ /thiet-lap/app (Mở hết / Theo danh sách + app) ⇒ Web ⇒ lưu một lần (POST thiet-lap {saoKhoiDau} — lib/thiet-lap › thanThietLap; máy chủ tặng một lần).
// Giờ ngủ (bước cũ) không còn ở màn này theo thiết kế 15/11 — thiet-lap gửi giờ ngủ đang có / mặc định như trước.
// #302 (16/11): thêm «<Con> chơi bao lâu mỗi ngày?» — GIỚI HẠN TỐI ĐA mỗi ngày (30p / 60p / 90p / Tự chọn, kèm T7–CN; mặc định 60 · 90) + «Mỗi lượt
// tối đa» (chơi đủ lượt thì nghỉ đúng chừng đó phút) — lib/gioi-han-ui › ChonGioiHan; gửi kèm POST thiet-lap (gioiHanNgayThuong, gioiHanCuoiTuan, phutMoiLuot).
import { useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { BONG, KHOI } from "@/lib/clay";
import { DauMan } from "@/lib/lan-dau";
import { SAO_KHOI_DAU, SAO_KHOI_DAU_MD } from "@/lib/so-sao";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { RobNoi } from "@/lib/ui-bm3";
import { datTl, layTl } from "@/lib/thiet-lap";
import { GIOI_HAN_MD, type GioiHan } from "@/lib/gioi-han";
import { ChonGioiHan } from "@/lib/gioi-han-ui";
import { Chu, F, Icon3D, M, Man, Nut, type TenIcon } from "@/lib/ui";

const LUAT: [TenIcon, string, string][] = [
  ["tick", "Làm nhiệm vụ → nhận sao", "Sao do con tự kiếm"],
  ["game", "Chơi «Tính phút» → trừ sao", "1 sao = 1 phút chơi"],
  ["khoa", "Hết sao → app tự khoá", "Con xin Ba Mẹ cho vay sao"],
];
const NAU = "#4a3000";

export default function ObGio() {
  const tl = layTl();
  const ten = tl.tenCon ?? "con";
  const [sao, setSao] = useState<number>(tl.saoKhoiDau ?? SAO_KHOI_DAU_MD);
  const [gh, setGh] = useState<GioiHan>(tl.gioiHan ?? GIOI_HAN_MD);
  const [ghLoi, setGhLoi] = useState<string | null>(null);
  const chon = (n: number) => { setSao(n); datTl({ saoKhoiDau: n }); };
  const doiGh = (g: GioiHan, loi: string | null) => { setGh(g); setGhLoi(loi); if (!loi) datTl({ gioiHan: g }); };
  const tiep = () => { datTl({ saoKhoiDau: sao, gioiHan: gh }); router.push("/thiet-lap/app"); };
  const oChip = (on: boolean) => ({ flex: 1, minWidth: 0, height: 68, borderRadius: 22, alignItems: "center" as const, justifyContent: "center" as const, gap: 2,
    backgroundColor: on ? M.chinh : "#fff", boxShadow: on ? `0px 0px 0px 3px #fbe9c4, 0px 0px 0px 5px ${M.chinh}` : BONG.nho });
  return (
    <Man dau={<DauMan ve="/thiet-lap/qua" phai={<ThanhBuoc5 dang={3} />} />}
      day={<Nut chu="Tiếp: chọn app cho con" rong tat={!!ghLoi} bam={tiep} />}>
      <Text accessibilityRole="header" style={{ fontFamily: F.rat, fontSize: 25, lineHeight: 30, letterSpacing: -0.5, color: M.chu }}>{`${ten} chơi máy\nbằng sao tự kiếm`}</Text>
      <View style={{ borderRadius: 30, backgroundColor: "#fdecc8", backgroundImage: "linear-gradient(160deg, #fff4dc, #fbe3b4)", padding: 16, gap: 12, ...KHOI.the }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#f7f6f3", alignItems: "center", justifyContent: "center", ...KHOI.nho }}><Icon3D ten="sao" co={26} /></View>
          <Chu kieu="rat" co={15} mau={NAU} style={{ flex: 1 }}>Tặng sao khởi đầu</Chu>
          <View style={{ paddingVertical: 2, paddingHorizontal: 8, borderRadius: 9, backgroundColor: "#f9e7d2" }}><Chu kieu="rat" co={11.5} mau="#8a3c0c">ĐỀ XUẤT</Chu></View>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup">
          {SAO_KHOI_DAU.map((n) => {
            const on = sao === n;
            return (
              <Pressable key={n} onPress={() => chon(n)} accessibilityRole="radio" accessibilityState={{ checked: on }}
                accessibilityLabel={n ? `Tặng ${n} sao` : "Không tặng sao"} style={oChip(on)}>
                <Chu kieu="rat" co={19} so mau={on ? "#fff" : M.chu}>{String(n)}</Chu>
                <Chu kieu="dam7" co={10.5} mau={on ? "#dcebe6" : "#565c59"} dong={1}>{n ? "sao" : "không tặng"}</Chu>
              </Pressable>
            );
          })}
        </View>
        <View style={{ borderRadius: 22, backgroundColor: "#fdf3dc", boxShadow: BONG.lom, paddingVertical: 6, paddingHorizontal: 10, gap: 4 }}>
          {LUAT.map(([ic, tieu, phu]) => (
            <View key={tieu} style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 44 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#f7f6f3", alignItems: "center", justifyContent: "center", ...KHOI.nho }}><Icon3D ten={ic} co={22} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Chu kieu="rat" co={14} mau={NAU}>{tieu}</Chu>
                <Chu kieu="dam7" co={13} mau={NAU}>{phu}</Chu>
              </View>
            </View>
          ))}
        </View>
      </View>
      <Text accessibilityRole="header" style={{ fontFamily: F.rat, fontSize: 20, lineHeight: 26, letterSpacing: -0.3, color: M.chu, marginTop: 4 }}>{`${ten} chơi máy bao lâu mỗi ngày?`}</Text>
      <ChonGioiHan gt={gh} doi={doiGh} />
      <RobNoi lv="rob-goc">
        <Chu kieu="dam" co={14}>Không còn giờ chơi miễn phí mỗi ngày: 1 sao = 1 phút, và không quá giới hạn Ba Mẹ đặt. App học để «Không tính phút» thì không trừ sao.</Chu>
      </RobNoi>
    </Man>
  );
}
