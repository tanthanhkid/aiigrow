// «Xin thêm giờ» bản «Dịu» (con-dt-xin 05 cdt-ios-xin-them — L2/L3): vòng «18 phút · Giờ chơi còn lại · Đã chơi 42 / 60 phút», «Con xin thêm
// 10 / 20 / 30 phút» (Thanh chốt 05/11), «Nhắn Ba Mẹ» (không bắt buộc), thẻ «Con có 30 sao · Đổi ngay, không cần chờ» + nút «Đổi sao»,
// «Xin Ba Mẹ thêm 20 phút» (POST /api/kid/yeu-cau {loai: them_gio}), «Xin mở app ›». Giờ ngủ / Ba Mẹ khoá / giờ học ⇒ chỉ xin ngoại lệ.
import { useState } from "react";
import { Redirect, router } from "expo-router";
import { TextInput, View } from "react-native";
import { LoiApi } from "@/lib/api";
import { kid, lyDoKhoa, type QuyCon } from "@/lib/api-tre";
import { D, FD } from "@/lib/diu";
import { Icon3D, useLam } from "@/lib/ui";
import { CamXuc, ChoD, ChonD, ChuD, LoiD, ManD, NutD, TheD, VongD } from "@/lib/ui-diu";
import { useTaiTre } from "@/lib/ui-tre";

const PHUT_XIN = [10, 20, 30];

export default function ThemGio() {
  const { d, loi, matMang, tai } = useTaiTre("quy", () => kid.goi<QuyCon>("quy"));
  const [phut, setPhut] = useState(20);
  const [nhan, setNhan] = useState("");
  const { dangChay, loi: loiLam, lam } = useLam();
  if (!d) return <ManD lui={true} tieu="Xin thêm giờ"><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  const q = d.quy;
  const ly = lyDoKhoa(q);
  if (ly) return <Redirect href={`/tre/gio-ngu?ly=${ly}`} />;
  const xin = () => lam(async () => {
    try {
      const r = await kid.goi<{ id: string }>("yeu-cau", { loai: "them_gio", phut, lyDo: nhan.trim() });
      router.replace(`/tre/yeu-cau?moi=${r.id}`);
    } catch (e) {
      if (e instanceof LoiApi && e.ma === "chi_ngoai_le") { await tai(); return; }
      throw e;
    }
  }, { hangDoi: true });
  if (!q.choXinThem && !q.doiSao.bat) {
    return (
      <ManD lui={true} giua day={<NutD chu="Làm nhiệm vụ" bam={() => router.replace("/tre/nhiem-vu")} />}>
        <CamXuc lv="chi" co={140} tieu="Hôm nay không thêm giờ được" phu="Ba Mẹ đã tắt đổi sao và xin thêm giờ. Mai chơi tiếp nhé!" />
      </ManD>
    );
  }
  return (
    <ManD lui={true} tieu="Xin thêm giờ" day={<><LoiD loi={loiLam} />
      {q.choXinThem ? <NutD chu={`Xin Ba Mẹ thêm ${phut} phút`} ic="gui" bam={xin} dangChay={dangChay} /> : null}
      <NutD chu="Xin mở app ›" loai="chu" bam={() => router.push("/tre/xin-phep?loai=cai_app")} /></>}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <VongD ti={q.tongPhut ? q.conPhut / q.tongPhut : 0} so={String(q.conPhut)} don="phút" co={96} day={10} />
        <View style={{ flex: 1 }}>
          <ChuD kieu="den" co={18}>Giờ chơi còn lại</ChuD>
          <ChuD kieu="rat" co={14} mau={D.chu2}>{`Đã chơi ${q.daDung} / ${q.tongPhut} phút`}</ChuD>
        </View>
      </View>
      {q.choXinThem ? <>
        <ChuD kieu="den" co={15}>Con xin thêm</ChuD>
        <ChonD nhan="Con xin thêm bao lâu" ds={PHUT_XIN.map((x) => ({ gia: x, chu: `${x} phút` }))} gia={phut} doi={setPhut} />
        <TheD mong>
          <ChuD kieu="rat" co={13} mau={D.chu2}>Nhắn Ba Mẹ (không bắt buộc)</ChuD>
          <TextInput value={nhan} onChangeText={setNhan} maxLength={100} accessibilityLabel="Nhắn Ba Mẹ" placeholder="vd Con làm nốt bài với bạn ạ"
            placeholderTextColor={D.chu3} style={{ fontFamily: FD.dam, fontSize: 16, color: D.chu, minHeight: 28, padding: 0 }} />
        </TheD>
      </> : null}
      {q.doiSao.bat ? (
        <TheD vang mong>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Icon3D ten="sao" co={34} />
            <View style={{ flex: 1 }}>
              <ChuD kieu="den" co={16} mau={D.saoInk}>{`Con có ${d.sao} sao`}</ChuD>
              <ChuD kieu="rat" co={13} mau={D.saoInk}>Đổi ngay, không cần chờ</ChuD>
            </View>
            <NutD chu="Đổi sao" loai="phu" nho style={{ alignSelf: "center", paddingHorizontal: 18 }} bam={() => router.push("/tre/choi")} />
          </View>
        </TheD>
      ) : null}
    </ManD>
  );
}
