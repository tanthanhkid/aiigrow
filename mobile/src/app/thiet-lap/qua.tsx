// them-s416tfdj / them-x9x2u07e «Quà của X» (bước 3/5 Lần đầu, thiết kế chốt 14/11): 2 tab.
//  · «🎟️ Voucher AiiGrow»: Ba Mẹ mua một lần, quà nằm sẵn trong kho của con (bảng giá thiết kế) — «Mua» ⇒ chi tiết them-hn2754ce (/thiet-lap/qua-mua).
//  · «✏️ Ba Mẹ tự điền»: tên quà (gợi ý chip) + số sao 50/100/200/300 ⇒ «＋ Thêm quà» = POST qua {ten, sao, apCho:[con]}; danh sách «Quà Ba Mẹ đã điền».
// 7 quà mặc định (N12) máy chủ đã gieo khi tạo Con (qua-bang-gia › gieoQuaMacDinh) — màn này không bỏ chúng. «Xong / Để sau» ⇒ Giờ chơi.
import { useState } from "react";
import { router } from "expo-router";
import { Pressable, Text, TextInput, View } from "react-native";
import { bm } from "@/lib/api";
import { BONG, KHOI } from "@/lib/clay";
import { DauMan, LienKet } from "@/lib/lan-dau";
import { MAU_MUC, TabMuc, TheDs } from "@/lib/lan-dau-ds";
import { layTl } from "@/lib/thiet-lap";
import { BaoLoi, Chu, F, Icon3D, M, Man, Nut, useLam, useTai } from "@/lib/ui";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { dong, soCham, VOUCHER } from "@/lib/voucher-lan-dau";

type Tab = "voucher" | "tu_dien";
type Qua = { id: string; ten: string; sao: number; mau: string | null; loai: string };
const GOI_Y = ["🍦 Đi ăn kem", "🎬 Xem phim", "🍲 Chọn món tối", "🏞️ Đi công viên", "🧸 Đồ chơi nhỏ"];
const SAO = [50, 100, 200, 300];

export default function ObQua() {
  const tl = layTl();
  const ten = tl.tenCon ?? "con";
  const [tab, setTab] = useState<Tab>("voucher");
  const sang = () => router.push("/thiet-lap/gio");
  return (
    <Man dau={<DauMan ve="/thiet-lap/mau" phai={<ThanhBuoc5 dang={2} />} />}
      day={<><Nut chu="Xong, sang giờ chơi" rong bam={sang} /><LienKet chu="Để sau, chọn quà sau" bam={sang} /></>}>
      <Text accessibilityRole="header" style={{ fontFamily: F.rat, fontSize: 26, letterSpacing: -0.5, color: M.chu }}>Quà của {ten}</Text>
      <TabMuc ds={[{ ma: "voucher" as Tab, chu: "🎟️ Voucher AiiGrow" }, { ma: "tu_dien" as Tab, chu: "✏️ Ba Mẹ tự điền" }]} dang={tab} doi={setTab} />
      {tab === "voucher" ? <TabVoucher /> : <TabTuDien con={tl.conId} />}
    </Man>
  );
}

function TabVoucher() {
  return (
    <>
      <Chu co={14} mau={M.chu2}>Ba Mẹ mua một lần, quà nằm sẵn trong kho của con. Con đủ sao thì đổi.</Chu>
      <TheDs>
        {VOUCHER.map((v, i) => (
          <Pressable key={v.ma} onPress={() => router.push({ pathname: "/thiet-lap/qua-mua", params: { ma: v.ma } })} accessibilityRole="button" accessibilityLabel={`${v.ten}, ${dong(v.gia)}, ${v.sao} sao. Mua`}
            style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 64, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: "#e9e8e3" }}>
            <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: MAU_MUC.cam.nen, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 22, lineHeight: 28 }}>{v.e}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Chu kieu="rat" co={14.5} dong={1}>{v.ten}</Chu>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Chu kieu="dam" co={12.5} mau={M.chu3}>💳 {dong(v.gia)} ·</Chu><Icon3D ten="sao" co={14} /><Chu kieu="rat" co={12.5} mau="#6e4300" so>{soCham(v.sao)}</Chu>
              </View>
            </View>
            <View style={{ minHeight: 36, paddingHorizontal: 16, borderRadius: 18, backgroundColor: M.chinh, alignItems: "center", justifyContent: "center", boxShadow: BONG.ngoc }}>
              <Text style={{ fontFamily: F.rat, fontSize: 13.5, color: "#fff" }}>Mua</Text>
            </View>
          </Pressable>
        ))}
      </TheDs>
    </>
  );
}

function TabTuDien({ con }: { con?: string }) {
  const { d, tai } = useTai(() => bm.goi<{ ds: Qua[] }>(`qua${con ? `?con=${encodeURIComponent(con)}` : ""}`));
  const [ten, setTen] = useState("");
  const [sao, setSao] = useState(100);
  const { lam, loi, dangChay } = useLam();
  const rieng = (d?.ds ?? []).filter((q) => !q.mau && q.loai !== "voucher");
  const them = () => lam(async () => {
    const t = ten.replace(/^\p{Extended_Pictographic}️?\s*/u, "").trim();
    if ([...t].length < 2) throw new Error("Điền tên quà con muốn.");
    await bm.goi("qua", { ten: t, sao, loai: t === "Đồ chơi nhỏ" ? "qua" : "dac_quyen", ...(con ? { apCho: [con] } : {}) });
    setTen("");
    await tai();
  });
  const oChon = (on: boolean) => ({ minHeight: 40, borderRadius: 20, paddingHorizontal: 12, alignItems: "center" as const, justifyContent: "center" as const, flexDirection: "row" as const, gap: 4,
    backgroundColor: on ? M.chinhSoft : "#ecebe7", boxShadow: on ? `0px 0px 0px 2px ${M.chinh}` : BONG.lom });
  return (
    <>
      <Chu co={14} mau={M.chu2}>Quà ở nhà Ba Mẹ tự lo, không tốn tiền trong app. Điền tên quà và số sao con cần để đổi.</Chu>
      <View style={{ borderRadius: 24, backgroundColor: "#f7f6f3", padding: 14, gap: 10, ...KHOI.the }}>
        <Chu kieu="rat" co={15}>Quà con muốn</Chu>
        <View style={{ minHeight: 50, borderRadius: 25, backgroundColor: "#ecebe7", boxShadow: BONG.lom, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16 }}>
          <Text style={{ fontSize: 18 }}>🎁</Text>
          <TextInput value={ten} onChangeText={setTen} placeholder="Ví dụ: Đi ăn kem" placeholderTextColor={M.chu3} maxLength={60} accessibilityLabel="Quà con muốn"
            style={{ flex: 1, fontFamily: F.dam, fontSize: 16, color: M.chu, paddingVertical: 10, outlineStyle: "none" } as never} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {GOI_Y.map((g) => <Pressable key={g} onPress={() => setTen(g.replace(/^\S+\s/, ""))} accessibilityRole="button" style={oChon(ten === g.replace(/^\S+\s/, ""))}>
            <Chu kieu="rat" co={13}>{g}</Chu></Pressable>)}
        </View>
        <Chu kieu="rat" co={15}>Con đổi bằng</Chu>
        <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup">
          {SAO.map((s) => <Pressable key={s} onPress={() => setSao(s)} accessibilityRole="radio" accessibilityState={{ checked: sao === s }} accessibilityLabel={`${s} sao`}
            style={[oChon(sao === s), { flex: 1, paddingHorizontal: 0 }]}><Icon3D ten="sao" co={16} /><Chu kieu="rat" co={14} so>{s}</Chu></Pressable>)}
        </View>
        <BaoLoi loi={loi} />
        <Nut chu="＋ Thêm quà" loai="ngoc" rong dangChay={dangChay} tat={!ten.trim()} bam={them} />
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 4 }}>
        <Chu kieu="rat" co={16} style={{ flex: 1 }}>Quà Ba Mẹ đã điền</Chu><Chu kieu="dam" co={12.5} mau={M.chu3}>{rieng.length} quà</Chu>
      </View>
      {rieng.length ? (
        <TheDs>
          {rieng.map((q, i) => (
            <View key={q.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, borderTopWidth: i ? 1 : 0, borderTopColor: "#e9e8e3" }}>
              <Text style={{ fontSize: 20 }}>🎁</Text>
              <Chu kieu="rat" co={14.5} style={{ flex: 1 }} dong={1}>{q.ten}</Chu>
              <Icon3D ten="sao" co={15} /><Chu kieu="rat" co={13} mau="#6e4300" so>{soCham(q.sao)}</Chu>
            </View>
          ))}
        </TheDs>
      ) : (
        <View style={{ alignItems: "center", gap: 2, paddingVertical: 14, borderRadius: 22, backgroundColor: "#ecebe7", boxShadow: BONG.lom }}>
          <Text style={{ fontSize: 26 }}>🎁</Text>
          <Chu kieu="rat" co={14}>Chưa có quà nào.</Chu>
          <Chu co={12.5} mau={M.chu3}>Ba Mẹ điền ở trên, quà sẽ hiện ở đây.</Chu>
        </View>
      )}
    </>
  );
}
