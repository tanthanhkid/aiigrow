// «Sửa hồ sơ <Con>» (thiết kế chốt 05/11, bm-hang-ngay/16): tên gọi, năm sinh, màu của con (avatar «mau-N», cùng bảng luồng Lần đầu).
// Ảnh của con: hiện chỉ có «Chữ cái» — chụp / chọn ảnh chưa có ở máy chủ (lệch ghi trong PR M2). Lưu = POST con/:id/sua.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, chuanHoaTen } from "@/lib/api";
import { KHOI } from "@/lib/clay";
import { mauCon, type ConCt } from "@/lib/hang-ngay";
import { Avt, BaoLoi, baoKhiVe, ChoTai, Chu, M, Man, NhanMen, Nut, ONhap, useLam, useTai } from "@/lib/ui";

const SO_MAU = 5;

export default function SuaHoSo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(() => bm.goi<ConCt>(`con/${id}`));
  const [ten, setTen] = useState<string | null>(null);
  const [nam, setNam] = useState<string | null>(null);
  const [mau, setMau] = useState<number | null>(null);
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Hồ sơ con" }} tieu="Sửa hồ sơ"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const tenG = ten ?? d.ten;
  const namG = nam ?? (d.namSinh ? String(d.namSinh) : "");
  const mauCu = Number(/^mau-(\d)$/.exec(d.avatar ?? "")?.[1]);
  const mauG = mau ?? (Number.isInteger(mauCu) ? mauCu : null);
  const namSo = Number(namG);
  const namNay = new Date().getFullYear();
  const namDung = !namG || (Number.isInteger(namSo) && namSo >= namNay - 25 && namSo <= namNay);
  const luu = () => lam(async () => {
    await bm.goi(`con/${id}/sua`, { ten: chuanHoaTen(tenG), ...(namG ? { namSinh: namSo } : {}), ...(mauG !== null ? { avatar: `mau-${mauG}` } : {}) });
    baoKhiVe(`Đã lưu hồ sơ ${chuanHoaTen(tenG)}`);
    router.back();
  });
  return (
    <Man lui={{ chu: "Hồ sơ con" }} tieu={`Sửa hồ sơ ${d.ten}`} day={<>
      <BaoLoi loi={loiLam} />
      <Nut chu={`Lưu hồ sơ ${chuanHoaTen(tenG) || d.ten}`} rong dangChay={dangChay} tat={!chuanHoaTen(tenG) || !namDung} bam={luu} />
    </>}>
      <View style={{ alignItems: "center", paddingVertical: 8 }}>
        <Avt ten={tenG || d.ten} mau={mauG !== null ? mauCon(`mau-${mauG}`) : mauCon(d.avatar)} co={88} />
      </View>
      <ONhap nhan="Tên gọi" value={tenG} onChangeText={setTen} autoCapitalize="words" maxLength={30} />
      <ONhap nhan="Năm sinh" value={namG} onChangeText={(t) => setNam(t.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" placeholder="2017"
        loi={namDung ? null : `Năm sinh từ ${namNay - 25} tới ${namNay}`} />
      <View style={{ gap: 8 }}>
        <Chu kieu="rat" co={14}>Màu của con</Chu>
        <View style={{ flexDirection: "row", gap: 12 }} accessibilityRole="radiogroup">
          {Array.from({ length: SO_MAU }, (_, k) => (
            <NhanMen key={k} onPress={() => setMau(k)} accessibilityRole="radio" accessibilityState={{ checked: mauG === k }} accessibilityLabel={`Màu ${k + 1}`} muc="chip"
              style={[{ width: 44, height: 44, borderRadius: 22, backgroundColor: mauCon(`mau-${k}`), borderWidth: 3, borderColor: mauG === k ? M.chu : "transparent" }, KHOI.nho]}>
              <View />
            </NhanMen>
          ))}
        </View>
      </View>
      <View style={{ gap: 4 }}>
        <Chu kieu="rat" co={14}>Ảnh của con</Chu>
        <Chu co={13.5} mau={M.chu3}>{`Đang dùng chữ cái «${(chuanHoaTen(tenG) || d.ten).split(" ").pop()?.charAt(0).toUpperCase() ?? ""}». Chụp ảnh / chọn ảnh sắp có.`}</Chu>
      </View>
    </Man>
  );
}
