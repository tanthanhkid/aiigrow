// them-hn2754ce «Quà Ba Mẹ mua · chi tiết» (thiết kế chốt 14/11): hình to, tên, mô tả, Ba Mẹ trả / Con đổi bằng, 3 dòng điều kiện, Số lượng −/＋,
// «Mua · 50.000đ». Thanh toán (them-bbxb64oc) + «Đã mua quà» (them-j1zshjyw) CHƯA có cổng thanh toán ⇒ nút mua mở bảng «Nhắn AiiGrow để mua» (Hỗ trợ).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { BONG, KHOI } from "@/lib/clay";
import { DauMan } from "@/lib/lan-dau";
import { MAU_MUC } from "@/lib/lan-dau-ds";
import { BangTruot, Chu, F, Icon3D, M, Man, Nut } from "@/lib/ui";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { dong, soCham, VOUCHER } from "@/lib/voucher-lan-dau";

export default function QuaMua() {
  const { ma } = useLocalSearchParams<{ ma?: string }>();
  const v = VOUCHER.find((x) => x.ma === ma) ?? VOUCHER[1];
  const [sl, setSl] = useState(1);
  const [hoi, setHoi] = useState(false);
  const nutSl = (chu: string, bam: () => void, tat: boolean, nhan: string) => (
    <Pressable onPress={bam} disabled={tat} accessibilityRole="button" accessibilityLabel={nhan}
      style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#ecebe7", boxShadow: BONG.nho, opacity: tat ? 0.4 : 1 }}>
      <Chu kieu="rat" co={20} mau={M.chinhInk}>{chu}</Chu>
    </Pressable>
  );
  return (
    <Man dau={<DauMan ve="/thiet-lap/qua" phai={<ThanhBuoc5 dang={2} />} />}
      day={<Nut chu={`Mua · ${dong(v.gia * sl)}`} rong bam={() => setHoi(true)} />}>
      <Chu kieu="rat" co={14} mau={M.chu3}>Quà Ba Mẹ mua</Chu>
      <View style={{ alignItems: "center", gap: 8, borderRadius: 28, backgroundColor: "#f7f6f3", paddingVertical: 22, paddingHorizontal: 16, ...KHOI.the }}>
        <View style={{ width: 96, height: 96, borderRadius: 30, backgroundColor: MAU_MUC.cam.nen, alignItems: "center", justifyContent: "center", boxShadow: BONG.lom }}>
          <Text style={{ fontSize: 52, lineHeight: 62 }}>{v.e}</Text>
        </View>
        <Text accessibilityRole="header" style={{ fontFamily: F.rat, fontSize: 23, color: M.chu, textAlign: "center" }}>{v.ten}</Text>
        <Chu co={14} mau={M.chu2} style={{ textAlign: "center" }}>{v.moTa}</Chu>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, borderRadius: 22, backgroundColor: "#f7f6f3", padding: 12, gap: 2, ...KHOI.the }}>
          <Chu kieu="dam" co={12.5} mau={M.chu3}>Ba Mẹ trả</Chu><Chu kieu="rat" co={17}>💳 {dong(v.gia)}</Chu>
        </View>
        <View style={{ flex: 1, borderRadius: 22, backgroundColor: "#f7f6f3", padding: 12, gap: 2, ...KHOI.the }}>
          <Chu kieu="dam" co={12.5} mau={M.chu3}>Con đổi bằng</Chu>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Icon3D ten="sao" co={18} /><Chu kieu="rat" co={17} mau="#6e4300">{soCham(v.sao)} sao</Chu></View>
        </View>
      </View>
      <View style={{ gap: 8, paddingHorizontal: 4 }}>
        {["📱 Đổi xong, con nhận mã QR trong app", "⏳ Mã dùng trong 60 ngày", "🔒 Chưa đổi thì Ba Mẹ vẫn giữ, không mất tiền"].map((x) => <Chu key={x} kieu="dam" co={14} mau={M.chu2}>{x}</Chu>)}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 22, backgroundColor: "#f7f6f3", paddingVertical: 8, paddingHorizontal: 14, ...KHOI.the }}>
        <Chu kieu="rat" co={15} style={{ flex: 1 }}>Số lượng</Chu>
        {nutSl("−", () => setSl((n) => Math.max(1, n - 1)), sl <= 1, "Bớt 1")}
        <Chu kieu="rat" co={18} so style={{ minWidth: 24, textAlign: "center" }}>{sl}</Chu>
        {nutSl("＋", () => setSl((n) => Math.min(10, n + 1)), sl >= 10, "Thêm 1")}
      </View>
      <BangTruot mo={hoi} dong={() => setHoi(false)} tieu="Mua quà qua AiiGrow">
        <Chu co={14.5} mau={M.chu2}>Thanh toán trong app đang được chuẩn bị. Ba Mẹ nhắn AiiGrow để mua {sl} × {v.ten} ({dong(v.gia * sl)}) — quà sẽ nằm sẵn trong kho của con.</Chu>
        <Nut chu="Nhắn AiiGrow" rong bam={() => { setHoi(false); router.push("/ho-tro"); }} />
        <Nut chu="Để sau" loai="ma" rong bam={() => setHoi(false)} />
      </BangTruot>
    </Man>
  );
}
