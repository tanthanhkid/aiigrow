// «Sửa hồ sơ <Con>» (thiết kế chốt 14/11, bm-gio-ho-so/06 — giống 05/11): tên gọi, năm sinh, màu của con (avatar «mau-N», cùng bảng luồng Lần đầu).
// Ảnh của con (#302): «Chụp ảnh» / «Chọn ảnh» / «Bỏ ảnh» (lib/anh-con.tsx; ảnh lưu ở POST con/:id/anh). Lưu = POST con/:id/sua rồi gửi ảnh.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, chuanHoaTen } from "@/lib/api";
import { BONG, KHOI } from "@/lib/clay";
import { mauCon, type ConCt } from "@/lib/hang-ngay";
import { coAnh, luuAnhCon, xoaAnhCon } from "@/lib/anh-con";
import { HangAnhCon, useAnhForm } from "@/lib/form-ho-so";
import { Avt, BaoLoi, baoKhiVe, ChoTai, Chu, Icon3D, M, Man, NhanMen, Nut, ONhap, useLam, useTai } from "@/lib/ui";

const SO_MAU = 5;

export default function SuaHoSo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(() => bm.goi<ConCt>(`con/${id}`));
  const [ten, setTen] = useState<string | null>(null);
  const [nam, setNam] = useState<string | null>(null);
  const [mau, setMau] = useState<number | null>(null);
  const af = useAnhForm();
  const [boAnh, setBoAnh] = useState(false);
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Hồ sơ con" }} tieu="Sửa hồ sơ"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const tenG = ten ?? d.ten;
  const namG = nam ?? (d.namSinh ? String(d.namSinh) : "");
  const mauCu = Number(/^mau-(\d)(?:\||$)/.exec(d.avatar ?? "")?.[1]);
  const mauG = mau ?? (Number.isInteger(mauCu) ? mauCu : null);
  const conAnh = boAnh ? null : d;
  const namSo = Number(namG);
  const namNay = new Date().getFullYear();
  const namDung = !namG || (Number.isInteger(namSo) && namSo >= namNay - 25 && namSo <= namNay);
  const luu = () => lam(async () => {
    await bm.goi(`con/${id}/sua`, { ten: chuanHoaTen(tenG), ...(mauG !== null ? { avatar: `mau-${mauG}` } : {}) });
    if (af.anh) await luuAnhCon(id, af.anh);
    else if (boAnh && coAnh(d.avatar)) await xoaAnhCon(id);
    baoKhiVe(`Đã lưu hồ sơ ${chuanHoaTen(tenG)}`);
    router.back();
  });
  return (
    <Man lui={{ chu: "Hồ sơ con" }} tieu={`Sửa hồ sơ ${d.ten}`} day={<>
      <BaoLoi loi={loiLam} />
      <Nut chu={`Lưu hồ sơ ${chuanHoaTen(tenG) || d.ten}`} rong dangChay={dangChay} tat={!chuanHoaTen(tenG) || !namDung} bam={luu} />
    </>}>
      {/* thiết kế 06: avatar 88 viền ngọc + bút 3D góc; thẻ «Tên gọi» | «Năm sinh» (104) cạnh nhau; màu; «Ảnh của con» 3 ô */}
      <View style={{ alignSelf: "center", marginVertical: 8, borderRadius: 54, padding: 4, borderWidth: 3, borderColor: M.chinh }}>
        <Avt ten={tenG || d.ten} mau={mauG !== null ? mauCon(`mau-${mauG}`) : mauCon(d.avatar)} co={88} con={conAnh} anh={af.uri} />
        <View pointerEvents="none" style={{ position: "absolute", right: -8, bottom: -6 }}><Icon3D ten="but" co={38} /></View>
      </View>
      <View style={[{ flexDirection: "row", gap: 10, padding: 14, borderRadius: 28, backgroundColor: "#f7f6f3" }, KHOI.the]}>
        <View style={{ flex: 1, minWidth: 0 }}><ONhap nhan="Tên gọi" value={tenG} onChangeText={setTen} autoCapitalize="words" maxLength={30} /></View>
        {/* máy chủ (gia-dinh.ts › suaCon) chưa lưu năm sinh khi sửa ⇒ ô chỉ đọc, không báo «đã lưu» sai (review PR #183 — câu mở) */}
        <View style={{ width: 104 }}><ONhap nhan="Năm sinh" value={namG} editable={false} placeholder="Chưa có" /></View>
      </View>
      <Chu co={13} mau={M.chu3} style={{ marginHorizontal: 6, marginTop: -4 }}>Đổi năm sinh: nhắn AiiGrow trong «Hỏi AiiGrow».</Chu>
      <View style={{ gap: 8 }}>
        <Chu kieu="rat" co={15} mau={M.chu2} style={{ marginHorizontal: 6 }}>Màu của con</Chu>
        <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 4 }} accessibilityRole="radiogroup">
          {Array.from({ length: SO_MAU }, (_, k) => (
            <NhanMen key={k} onPress={() => setMau(k)} accessibilityRole="radio" accessibilityState={{ checked: mauG === k }} accessibilityLabel={`Màu ${k + 1}`} muc="chip"
              style={{ width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: mauG === k ? M.chinh : "transparent" }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: mauCon(`mau-${k}`), boxShadow: BONG.nho }} />
            </NhanMen>
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Chu kieu="rat" co={15} mau={M.chu2} style={{ marginHorizontal: 6 }}>Ảnh của con</Chu>
        <HangAnhCon f={af} coAnh={coAnh(d.avatar) && !boAnh} boDaLuu={() => setBoAnh(true)} />
      </View>
    </Man>
  );
}
