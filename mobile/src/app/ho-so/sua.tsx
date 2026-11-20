// them-vnl5rmnz @v4 «Sửa hồ sơ <Con>» (thiết kế bm-gio-ho-so): thẻ hồ sơ như Lần đầu (lib/form-ho-so › TheHoSoCon — chữ cái / ảnh + 📷, tên, «🐓 9 tuổi», Grow),
// «Tên gọi ở nhà», «Năm sinh · tuổi <con giáp>», «Màu của con» (ChonMauCon — cùng bảng luồng Lần đầu), dòng «PIN vào máy · Đặt lại ›» (⇒ them-z2fyhohj),
// «Lưu hồ sơ <Con>». Ảnh của con (#302): chạm 📷 ⇒ chụp; «Chụp ảnh» / «Chọn ảnh» / «Bỏ ảnh» (lib/anh-con.tsx; ảnh lưu ở POST con/:id/anh).
// Năm sinh chỉ đọc: máy chủ (gia-dinh.ts › suaCon) chưa lưu năm sinh khi sửa ⇒ không mở bánh xe năm, nhắc đổi qua «Hỏi AiiGrow».
// Lưu = POST con/:id/sua rồi gửi ảnh.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, chuanHoaTen } from "@/lib/api";
import { BONG } from "@/lib/clay";
import { HangViec, type ConCt } from "@/lib/hang-ngay";
import { coAnh, luuAnhCon, xoaAnhCon } from "@/lib/anh-con";
import { MAU_HO_SO } from "@/lib/lan-dau";
import { ChonMauCon, conGiap, namCua, TheHoSoCon, useAnhForm } from "@/lib/form-ho-so";
import { BaoLoi, baoKhiVe, ChoTai, Chu, M, Man, Nut, ONhap, The, useLam, useTai } from "@/lib/ui";

export default function SuaHoSo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(() => bm.goi<ConCt>(`con/${id}`));
  const [ten, setTen] = useState<string | null>(null);
  const [mau, setMau] = useState<number | null>(null);
  const af = useAnhForm();
  const [boAnh, setBoAnh] = useState(false);
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Hồ sơ con" }} tieu="Sửa hồ sơ"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const tenG = ten ?? d.ten;
  const namG = d.namSinh ? String(d.namSinh) : "";
  const namSo = namCua(namG);
  const mauCu = Number(/^mau-(\d)(?:\||$)/.exec(d.avatar ?? "")?.[1]);
  // màu ngoài bảng (mau-5..9 từ bản cũ) ⇒ coi như chưa chọn, như mauCon (không để MAU_HO_SO[mau] ra undefined)
  const mauG = mau ?? (Number.isInteger(mauCu) && mauCu >= 0 && mauCu < MAU_HO_SO.length ? mauCu : null);
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
      <Nut chu={`Lưu hồ sơ ${chuanHoaTen(tenG) || d.ten}`} rong dangChay={dangChay} tat={!chuanHoaTen(tenG)} bam={luu} />
    </>}>
      <TheHoSoCon ten={tenG || d.ten} nam={namG} mau={mauG ?? 0} anh={af.uri} con={boAnh ? null : d} f={af} coAnh={coAnh(d.avatar) && !boAnh} boDaLuu={() => setBoAnh(true)} />
      <ONhap nhan="Tên gọi ở nhà" value={tenG} onChangeText={setTen} autoCapitalize="words" maxLength={30} />
      <View style={{ gap: 6 }}>
        <Chu kieu="rat" co={14} style={{ paddingHorizontal: 4 }}>Năm sinh</Chu>
        <View accessibilityLabel={namSo ? `Năm sinh ${namSo}, tuổi ${conGiap(namSo)[0]}` : "Chưa có năm sinh"}
          style={{ minHeight: 54, borderRadius: 27, backgroundColor: M.ranh, boxShadow: BONG.lom, flexDirection: "row", alignItems: "baseline", paddingHorizontal: 18, paddingTop: 15 }}>
          <Chu kieu={namSo ? "rat" : "dam"} co={namSo ? 18 : 16} mau={namSo ? M.chu : M.chu3} so>{namSo ? String(namSo) : "Chưa có"}</Chu>
          {namSo ? <Chu kieu="dam7" co={13} mau={M.chu3}>{` · tuổi ${conGiap(namSo)[0]}`}</Chu> : null}
        </View>
        <Chu co={13} mau={M.chu3} style={{ marginHorizontal: 6 }}>Đổi năm sinh: nhắn AiiGrow trong «Hỏi AiiGrow».</Chu>
      </View>
      <ChonMauCon mau={mauG ?? -1} doi={setMau} />
      {/* dòng «PIN vào máy · Đặt lại ›» ⇒ them-z2fyhohj */}
      <The dem style={{ paddingVertical: 4 }}>
        <HangViec dau ic="mo_khoa" mau="xanh" tieu="PIN vào máy" phai={<Chu kieu="rat" co={14} mau={M.lienKet}>{d.coPin ? "Đặt lại" : "Đặt PIN"}</Chu>}
          bam={() => router.push(`/ho-so/${id}/pin` as never)} nhanDoc={d.coPin ? "PIN vào máy, đặt lại" : "PIN vào máy, đặt PIN"} />
      </The>
    </Man>
  );
}
