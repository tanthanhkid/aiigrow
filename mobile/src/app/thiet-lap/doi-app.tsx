// Lần đầu · bước 5 «Đổi app đã thêm» (bàn bm-thiet-lap-con: them-qjgsxgos@v1 — #490): CÙNG khối với chi tiết app của Hằng ngày (lib/ds-chung › ChiTietMuc;
// bm2-app-web@v20) + thanh bước 5: icon tròn to, «<app> có tính phút không?», 2 thẻ nhóm lớn, «Lưu: <app> tính phút / không tính phút», «Bỏ <app> khỏi danh sách».
// Chỉ đổi trạng thái trong lib/thiet-lap (layTl().apps) — chưa gọi máy chủ (POST thiet-lap một lần ở cuối Lần đầu). Lưu / Bỏ ⇒ về màn app. Không có số liệu dùng.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { DM_APP } from "@/lib/danh-muc-lan-dau";
import { DauMan } from "@/lib/lan-dau";
import { boDau } from "@/lib/lan-dau-ds";
import { ChiTietMuc } from "@/lib/ds-chung";
import { icCuaApp } from "@/lib/ui-bm3";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl, nhomCua, type AppChon } from "@/lib/thiet-lap";
import { Man } from "@/lib/ui";

export default function DoiApp() {
  const { ten } = useLocalSearchParams<{ ten: string }>();
  const apps = layTl().apps ?? [];
  const a = apps.find((x) => boDau(x.ten) === boDau(ten ?? ""));
  const x = DM_APP.find((y) => boDau(y.ten) === boDau(ten ?? ""));
  const [nhom, setNhom] = useState<"tinh_phut" | "khong_tinh_phut">(a && "tinhGio" in a ? nhomCua(a.tinhGio) : "khong_tinh_phut");
  const ve = () => (router.canGoBack() ? router.back() : router.replace("/thiet-lap/app"));
  const luu = () => {
    datTl({ apps: apps.map((y): AppChon => (boDau(y.ten) === boDau(ten ?? "") ? { ten: y.ten, tinhGio: nhom === "tinh_phut" } : y)) });
    ve();
  };
  const bo = () => { datTl({ apps: apps.filter((y) => boDau(y.ten) !== boDau(ten ?? "")) }); ve(); };
  return (
    <Man dau={<DauMan ve="/thiet-lap/app" phai={<ThanhBuoc5 dang={5} />} />}>
      <ChiTietMuc ten={ten ?? "App"} phu={a ? (x?.phu ?? "Ba Mẹ gõ tên") : "Chưa có trong danh sách"} ic={icCuaApp(`${ten ?? ""} ${x?.phu ?? ""}`)}
        nhom={nhom} doi={setNhom} luu={luu} bo={a ? bo : undefined} />
    </Man>
  );
}
