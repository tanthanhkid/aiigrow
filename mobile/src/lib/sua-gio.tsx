// Bảng trượt sửa một khung giờ (HH:MM – HH:MM) — dùng ở bước 5 thiết lập và màn Giờ chơi.
import { useState } from "react";
import { View } from "react-native";
import type { Khung } from "./api";
import { BangTruot, Chu, M, Nut, ONhap } from "./ui";

const GIO = /^([01]\d|2[0-3]):[0-5]\d$/;

export function SuaKhung({ mo, tieu, khung, dong, luu }: { mo: boolean; tieu: string; khung: Khung; dong: () => void; luu: (k: Khung) => void }) {
  const [tu, setTu] = useState(khung.tu);
  const [den, setDen] = useState(khung.den);
  const dung = GIO.test(tu) && GIO.test(den) && tu !== den;
  return (
    <BangTruot mo={mo} dong={dong} tieu={tieu}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><ONhap nhan="Từ" value={tu} onChangeText={setTu} placeholder="17:00" keyboardType="numbers-and-punctuation" maxLength={5} /></View>
        <View style={{ flex: 1 }}><ONhap nhan="Đến" value={den} onChangeText={setDen} placeholder="20:00" keyboardType="numbers-and-punctuation" maxLength={5} /></View>
      </View>
      {!dung ? <Chu co={13} mau={M.chu3}>Nhập giờ dạng 17:00; giờ bắt đầu khác giờ kết thúc.</Chu> : null}
      <Nut chu="Lưu khung giờ" rong tat={!dung} bam={() => { luu({ tu, den }); dong(); }} />
    </BangTruot>
  );
}
