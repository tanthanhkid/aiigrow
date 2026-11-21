// Lần đầu · bước 5 «Đổi web đã thêm» (bàn bm-thiet-lap-con: them-4glrqqlq@v2 — #490): giống «Đổi app» (doi-app.tsx) cho một trang web — ChiTietMuc dùng chung với
// chi tiết web của Hằng ngày + thanh bước 5. Lưu / Bỏ ghi vào layTl().webs rồi về màn web.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { DM_WEB } from "@/lib/danh-muc-lan-dau";
import { DauMan } from "@/lib/lan-dau";
import { ChiTietMuc } from "@/lib/ds-chung";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl, nhomCua } from "@/lib/thiet-lap";
import { Man } from "@/lib/ui";

export default function DoiWeb() {
  const { muc } = useLocalSearchParams<{ muc: string }>();
  const webs = layTl().webs ?? [];
  const w = webs.find((x) => x.muc === muc);
  const x = DM_WEB.find((y) => y.ten === muc);
  const [nhom, setNhom] = useState<"tinh_phut" | "khong_tinh_phut">(nhomCua(w?.tinhGio ?? false));
  const ve = () => (router.canGoBack() ? router.back() : router.replace("/thiet-lap/web"));
  const luu = () => { datTl({ webs: webs.map((y) => (y.muc === muc ? { ...y, tinhGio: nhom === "tinh_phut" } : y)) }); ve(); };
  const bo = () => { datTl({ webs: webs.filter((y) => y.muc !== muc) }); ve(); };
  return (
    <Man dau={<DauMan ve="/thiet-lap/web" phai={<ThanhBuoc5 dang={5} />} />}>
      <ChiTietMuc ten={muc ?? "Trang web"} phu={w ? (x?.phu ?? "Trang Ba Mẹ dán") : "Chưa có trong danh sách"} ic="web" nhom={nhom} doi={setNhom} luu={luu} bo={w ? bo : undefined} />
    </Man>
  );
}
