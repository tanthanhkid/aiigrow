// Ô «Hoặc tự nhập số sao» dùng chung (#302): giao-nv/tu-dat, giao-nv/sua, thiet-lap/qua. Rỗng = dùng chip; xoá ô thì không còn giá trị ẩn.
import { useState } from "react";
import { soNguyenGo } from "./so-nguyen.ts";

export function useSaoTu(toiDa: number) {
  const [chu, setChu] = useState("");
  const [mo, setMo] = useState(false);   // «Tự chọn…» đang mở
  const so = chu === "" ? null : Number(chu);
  const thieu = mo && so === null;       // mở ô tự chọn mà chưa nhập số ⇒ chặn Lưu, không lặng lẽ giữ giá trị cũ
  const loi = thieu || (so !== null && (!Number.isInteger(so) || so < 1 || so > toiDa));
  return {
    chu, so, loi, toiDa, mo, setMo, thieu, maxLength: String(toiDa).length,
    nhap: (t: string) => setChu(soNguyenGo(t).slice(0, String(toiDa).length)),
    xoa: () => setChu(""),
    /** số sao dùng: ô tự nhập hợp lệ thắng chip */
    dung: (chip: number) => (so !== null && !loi ? so : chip),
    thongBao: thieu ? "Nhập số sao" : loi ? `Số sao từ 1 đến ${toiDa.toLocaleString("vi-VN")}` : null,
  };
}
