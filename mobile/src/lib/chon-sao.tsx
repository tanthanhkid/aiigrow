// Hàng chọn mức sao theo Bàn #492 (them-6pjz1stu, them-ncq0jtzo, them-79kgpij8): chip «★ 5 · ★ 10 · …» + chip «Tự chọn…» riêng một hàng;
// bấm «Tự chọn…» mở ô nhập số (1–toiDa). Số tự nhập hợp lệ thắng chip (useSaoTu). Dùng chung cho Thêm việc riêng, Sửa việc, Sửa quà.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { BONG } from "./clay";
import { type useSaoTu } from "./sao-tu-nhap";
import { Chu, IconNet, M, ONhap } from "./ui";

export function ChonSao({ muc, gia, doi, st, nhanTuChon = "Tự chọn…" }: {
  muc: number[]; gia: number; doi: (n: number) => void; st: ReturnType<typeof useSaoTu>; nhanTuChon?: string;
}) {
  const [mo, setMo] = useState(false);
  const tuChon = mo || st.chu !== "";
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityRole="radiogroup">
        {muc.map((x) => {
          const on = !tuChon && x === gia;
          return (
            <Pressable key={x} onPress={() => { st.xoa(); setMo(false); doi(x); }} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${x} sao`}
              style={[{ flexGrow: 1, minWidth: 64, minHeight: 44, borderRadius: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 12 },
                on ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc } : { backgroundColor: M.xamSoft, boxShadow: BONG.lom }]}>
              <IconNet ten="sao" co={14} mau={on ? M.diem : M.chu} />
              <Chu kieu="rat" co={14.5} so mau={on ? M.diem : M.chu}>{String(x)}</Chu>
            </Pressable>
          );
        })}
      </View>
      <Pressable onPress={() => setMo((v) => !v)} accessibilityRole="radio" accessibilityState={{ checked: tuChon }} accessibilityLabel={nhanTuChon}
        style={[{ minHeight: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
          tuChon ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc } : { backgroundColor: M.xamSoft, boxShadow: BONG.lom }]}>
        <Chu kieu="rat" co={14.5} mau={tuChon ? M.diem : M.chu}>{st.chu !== "" && !st.loi ? `Tự chọn · ${st.chu} sao` : nhanTuChon}</Chu>
      </Pressable>
      {tuChon ? <ONhap nhan="Số sao" value={st.chu} onChangeText={st.nhap} placeholder="Ví dụ: 25" keyboardType="number-pad" maxLength={st.maxLength} loi={st.thongBao} autoFocus={mo && st.chu === ""} /> : null}
    </View>
  );
}
