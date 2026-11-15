// «Lời xin đã bỏ qua» (thiết kế chốt 15/11 bm-ung-dung/11 them-1g0mpf21 — thay màn «Luôn chặn», luồng #258): Grow «Bỏ qua là chưa thêm, không ghi gì.
// Con xin lại, hoặc Ba Mẹ bấm «Thêm luôn» để cho ngay.», mỗi lời xin đã bỏ qua (30 ngày) một dòng: icon, tên, «Bảo Anh · hôm qua 20:05», nút «Thêm luôn»
// ⇒ bảng chọn nhóm (Tính phút / Không tính phút) ⇒ POST yeu-cau/:id/them-luon {nhom}. «Xong, về App & web». ?con= lọc một Con.
// Đọc: GET yeu-cau/bo-qua[?con=]. Người trông giúp cũng «Thêm luôn» được (máy chủ cho phép như đồng ý lời xin).
import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { napBoQua, themLuon, TEN_NHOM, type BoQua, type Nhom } from "@/lib/app-web";
import { KHOI, MEN } from "@/lib/clay";
import { ChonNhom, OIcon, RobNoi, icCuaApp } from "@/lib/ui-bm3";
import { BangTruot, BaoLoi, CanhGiua, ChoTai, Chu, gioPhut, M, Man, NhanMen, Nut, useHoanTac, useLam, useTai } from "@/lib/ui";

/** «hôm nay 19:20» / «hôm qua 20:05» / «12/11 17:40». */
function lucBoQua(s: string) {
  const t = new Date(s), nay = new Date(), qua = new Date(nay.getTime() - 86400000);
  const ngay = t.toDateString() === nay.toDateString() ? "hôm nay" : t.toDateString() === qua.toDateString() ? "hôm qua"
    : `${String(t.getDate()).padStart(2, "0")}/${String(t.getMonth() + 1).padStart(2, "0")}`;
  return `${ngay} ${gioPhut(t)}`;
}

export default function LoiXinBoQua() {
  const { con } = useLocalSearchParams<{ con?: string }>();
  const { d, loi, matMang, tai } = useTai(() => napBoQua(con));
  const [chon, setChon] = useState<BoQua | null>(null);
  const [nhom, setNhom] = useState<Nhom>("tinh_phut");
  const { lam, loi: loiLam, dangChay } = useLam();
  const { bao, noi } = useHoanTac();
  const ve = () => router.replace({ pathname: "/chan", params: con ? { con } : {} });
  if (!d) return <Man lui={{ chu: "", bam: ve }} tieu="Lời xin đã bỏ qua"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const ten = (x: BoQua) => x.ten ?? x.muc ?? (x.kieu === "web" ? "Trang web" : "App");
  const them = () => lam(async () => {
    const x = chon!;
    await themLuon(x.id, nhom);
    setChon(null);
    await tai();
    bao(`Đã thêm ${ten(x)} cho ${x.tenCon} · ${TEN_NHOM[nhom]}`);
  });
  return (
    <Man lui={{ chu: "", bam: ve }} tieu="Lời xin đã bỏ qua" tai={tai} vongTai noi={noi}>
      <RobNoi lv="xong" co={92}>
        <Chu kieu="rat" co={15}>Bỏ qua là chưa thêm, không ghi gì.</Chu>
        <Chu kieu="dam" co={12.5} mau={M.chu3}>Con xin lại, hoặc Ba Mẹ bấm «Thêm luôn» để cho ngay.</Chu>
      </RobNoi>
      {d.ds.length ? (
        <View style={{ paddingVertical: 4, paddingHorizontal: 16, borderRadius: 28, backgroundColor: "#f7f6f3", ...KHOI.the }}>
          {d.ds.map((x, i) => (
            <View key={x.id} style={[{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 66 }, i > 0 && { borderTopWidth: 1.5, borderTopColor: "rgba(0,0,0,0.06)" }]}>
              <OIcon ic={x.kieu === "web" ? "web" : icCuaApp(ten(x))} co={42} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Chu kieu="rat" co={15} dong={1}>{ten(x)}</Chu>
                <Chu kieu="dam" co={12.5} mau={M.chu3} dong={1}>{`${x.tenCon} · ${lucBoQua(x.luc)}`}</Chu>
              </View>
              <NhanMen onPress={() => { setNhom("tinh_phut"); setChon(x); }} accessibilityRole="button" accessibilityLabel={`Thêm luôn ${ten(x)}`} muc="chip" men={MEN.ngoc}
                style={{ minHeight: 44, paddingHorizontal: 16, borderRadius: 22, backgroundColor: M.chinh, justifyContent: "center" }}>
                <Chu kieu="rat" co={14} mau="#fff">Thêm luôn</Chu>
              </NhanMen>
            </View>
          ))}
        </View>
      ) : <CanhGiua lv="canh-trong" tieu="Không có lời xin nào bị bỏ qua" loi="Lời xin Ba Mẹ bỏ qua trong 30 ngày hiện ở đây." />}
      <Nut chu="Xong, về App & web" rong bam={ve} />

      <BangTruot mo={!!chon} dong={() => setChon(null)} tieu={chon ? `Thêm ${ten(chon)} cho ${chon.tenCon}` : ""}>
        {chon ? <Chu kieu="rat" co={15} mau={M.chu2}>{`${ten(chon)} có tính phút không?`}</Chu> : null}
        <ChonNhom gia={nhom} doi={setNhom} />
        <BaoLoi loi={loiLam} />
        <Nut chu={chon ? `Thêm ${ten(chon)} · ${TEN_NHOM[nhom]}` : "Thêm"} rong dangChay={dangChay} bam={them} />
      </BangTruot>
    </Man>
  );
}
