// them-at57ypdc «Thêm app cho X» (bàn v5, 16/11: ô tìm trơn + «Kết quả cho «…»», câu hỏi nhóm nằm dưới dòng vừa thêm, nút đáy «Thêm <app> · <nhóm>»).
// Trước đó (thiết kế chốt 14/11): «Gõ tên app trên máy con» ⇒ «Kết quả N» — app trong danh mục khớp chữ gõ
// (lib/danh-muc-lan-dau.ts) + đúng tên Ba Mẹ gõ (khi không trùng danh mục); mỗi dòng ＋ / «✓ Đã thêm» (chạm lại để bỏ). «Xong» ⇒ về App cho X.
// 15/11 (#262): chạm ＋ ⇒ trong thẻ vàng hỏi «<app> có tính phút không?» (Không tính phút | Tính phút · 1 sao = 1 phút), dòng đã thêm hiện «✓ <nhóm>».
// App ngoài danh mục mặc định «Tính phút», gửi theo tên; máy chủ khớp với app thật máy Con báo.
import { useState } from "react";
import { router } from "expo-router";
import { Text } from "react-native";
import { DM_APP } from "@/lib/danh-muc-lan-dau";
import { DauMan } from "@/lib/lan-dau";
import { boDau, DongKetQua, HoiNhom, TheDs, tinhGioDm } from "@/lib/lan-dau-ds";
import { TEN_NHOM } from "@/lib/app-web-chu";
import { OTim } from "@/lib/ui-bm3";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl, nhomCua, type AppChon } from "@/lib/thiet-lap";
import { Chu, F, M, Man, Nut } from "@/lib/ui";

export default function ThemApp() {
  const ten = layTl().tenCon ?? "con";
  const [go, setGo] = useState("");
  const [apps, setApps] = useState<AppChon[]>(layTl().apps ?? []);
  const [dang, setDang] = useState<string | null>(null);      // app vừa thêm ⇒ hỏi nhóm
  const k = boDau(go);
  const khop = k ? DM_APP.filter((a) => boDau(a.ten).includes(k) || boDau(a.phu).includes(k)) : [];
  const ds: { ten: string; e: string; phu: string; tinhGio: boolean }[] = [
    ...khop.map((a) => ({ ten: a.ten, e: a.e, phu: a.phu, tinhGio: tinhGioDm(a) })),
    ...(k && !khop.some((a) => boDau(a.ten) === k) ? [{ ten: go.trim().slice(0, 60), e: "📱", phu: "Đúng tên Ba Mẹ gõ", tinhGio: true }] : []),
  ];
  const co = (t: string) => apps.some((a) => boDau(a.ten) === boDau(t));
  const doi = (x: (typeof ds)[number]) => {
    const moi = co(x.ten) ? apps.filter((a) => boDau(a.ten) !== boDau(x.ten)) : [...apps, { ten: x.ten, tinhGio: x.tinhGio }];
    setDang(co(x.ten) ? null : x.ten);
    setApps(moi);
    datTl({ apps: moi });
  };
  const tinhCua = (t: string) => { const a = apps.find((x) => boDau(x.ten) === boDau(t)); return !!a && "tinhGio" in a && a.tinhGio; };
  const datNhom = (t: string, tinh: boolean) => {
    const moi = apps.map((a) => (boDau(a.ten) === boDau(t) ? { ten: a.ten, tinhGio: tinh } : a));
    setApps(moi);
    datTl({ apps: moi });
  };
  // app vừa thêm ⇒ hỏi nhóm ngay dưới dòng của nó, nút đáy ghi rõ kết quả — chỉ khi dòng đó còn trong kết quả đang xem
  // (gõ tìm app khác thì nút đáy về «Xong», không ghi «Thêm <app cũ>»)
  const chot = dang && co(dang) && ds.some((x) => x.ten === dang) ? dang : null;
  const ve = () => (router.canGoBack() ? router.back() : router.replace("/thiet-lap/app"));
  return (
    <Man dau={<DauMan ve="/thiet-lap/app" phai={<ThanhBuoc5 dang={4} />} />}
      day={<Nut chu={chot ? `Thêm ${chot} · ${TEN_NHOM[nhomCua(tinhCua(chot))]}` : "Xong"} rong bam={ve} />}>
      <Text accessibilityRole="header" numberOfLines={1} style={{ fontFamily: F.tieu, fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: M.chu, marginLeft: 4 }}>{`Thêm app cho ${ten}`}</Text>
      <OTim gia={go} doi={setGo} khongKinh nhan="Tên app" goiY="Duolingo, Zoom, Khan Academy…" />
      {k ? (
        <>
          <Chu kieu="dam" co={14} mau={M.chu2} style={{ marginHorizontal: 6 }}>Kết quả cho <Chu kieu="rat" co={14}>{`«${go.trim()}»`}</Chu></Chu>
          <TheDs le>{ds.map((x, i) => (
            <DongKetQua key={x.ten} dau={!i} e={x.e} ten={x.ten} phu={x.phu} da={co(x.ten)} bam={() => doi(x)}>
              {chot === x.ten ? <HoiNhom ten={x.ten} nhom={nhomCua(tinhCua(x.ten))} doi={(n) => datNhom(x.ten, n === "tinh_phut")} /> : null}
            </DongKetQua>
          ))}</TheDs>
        </>
      ) : null}
    </Man>
  );
}
