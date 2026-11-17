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
      style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#f7f6f3", boxShadow: BONG.nho, opacity: tat ? 0.4 : 1 }}>
      <Chu kieu="rat" co={20} mau={M.chinhInk}>{chu}</Chu>
    </Pressable>
  );
  return (
    <Man dau={<DauMan ve="/thiet-lap/qua" phai={<ThanhBuoc5 dang={2} />} />}
      day={<Nut chu={`Mua · ${dong(v.gia * sl)}`} rong bam={() => setHoi(true)} />}>
      {/* bàn them-hn2754ce v4: tiêu đề 24 · ô hình lam 154 · tên 22 + mô tả canh trái · 2 ô giá · thẻ 3 điều kiện · «Số lượng» trơn */}
      <Text accessibilityRole="header" style={{ fontFamily: F.rat, fontSize: 24, lineHeight: 30, letterSpacing: -0.5, color: M.chu, marginLeft: 4 }}>Quà Ba Mẹ mua</Text>
      <View style={{ height: 154, borderRadius: 30, backgroundColor: MAU_MUC.lam.nen, backgroundImage: "linear-gradient(#e1e8f4, #cfd9ee)", alignItems: "center", justifyContent: "center", ...KHOI.the }}>
        <Text style={{ fontSize: 92, lineHeight: 110 }}>{v.e}</Text>
      </View>
      <View style={{ paddingHorizontal: 4, gap: 4 }}>
        <Text style={{ fontFamily: F.rat, fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: M.chu }}>{v.ten}</Text>
        <Chu kieu="dam" co={13.5} mau={M.chu3}>{v.moTa}</Chu>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, borderRadius: 22, backgroundColor: "#f7f6f3", padding: 16, gap: 4, ...KHOI.nho }}>
          <Chu kieu="rat" co={12} mau={M.chu3}>Ba Mẹ trả</Chu><Chu kieu="rat" co={20}>💳 {dong(v.gia)}</Chu>
        </View>
        <View style={{ flex: 1, borderRadius: 22, backgroundColor: "#f7f6f3", padding: 16, gap: 4, ...KHOI.nho }}>
          <Chu kieu="rat" co={12} mau={M.chu3}>Con đổi bằng</Chu>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Icon3D ten="sao" co={20} /><Chu kieu="rat" co={20}>{soCham(v.sao)} sao</Chu></View>
        </View>
      </View>
      <View style={{ borderRadius: 22, backgroundColor: "#f7f6f3", paddingVertical: 4, paddingHorizontal: 16, ...KHOI.nho }}>
        {[["📱", "Đổi xong, con nhận mã QR trong app"], ["⏳", "Mã dùng trong 60 ngày"], ["🔒", "Chưa đổi thì Ba Mẹ vẫn giữ, không mất tiền"]].map(([e, x], i) => (
          <View key={x} style={{ flexDirection: "row", gap: 10, paddingVertical: 10, borderTopWidth: i ? 1 : 0, borderTopColor: "#e9e8e3" }}>
            <Text style={{ fontSize: 14, lineHeight: 18 }}>{e}</Text><Chu kieu="rat" co={13.5} style={{ flex: 1, lineHeight: 18 }}>{x}</Chu>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 4 }}>
        <Chu kieu="rat" co={14.5} style={{ flex: 1 }}>Số lượng</Chu>
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
