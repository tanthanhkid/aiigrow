// them-ubomxl31 «Thêm web cho X» (bàn v4, 16/11: ô tìm trơn + «Kết quả cho «…»», icon web, câu hỏi nhóm dưới dòng vừa thêm, nút đáy «Thêm <trang> · <nhóm>»).
// Trước đó (MỚI 14/11): «Gõ tên hoặc dán link» ⇒ «Kết quả N» — trang trong danh mục khớp chữ gõ (DM_WEB) + tên miền rút
// từ link Ba Mẹ dán (https://www.khanacademy.org/math ⇒ khanacademy.org) khi chưa có trong danh mục; ＋ / «✓ Đã thêm». «Xong» ⇒ về Web cho X.
// 15/11 (#262): trang vừa thêm ⇒ hỏi «<trang> có tính phút không?» (Không tính phút | Tính phút), dòng đã thêm hiện «✓ <nhóm>». Trang ngoài danh mục
// mặc định «Tính phút». Mọi trang con của tên miền theo cùng nhóm (máy chủ khớp tên miền con).
import { useState } from "react";
import { router } from "expo-router";
import { Text } from "react-native";
import { DM_WEB } from "@/lib/danh-muc-lan-dau";
import { DauMan } from "@/lib/lan-dau";
import { boDau, DongKetQua, HoiNhom, tenMien, TheDs, tinhGioDm, WEB_TOI_DA } from "@/lib/lan-dau-ds";
import { TEN_NHOM } from "@/lib/app-web-chu";
import { OTim } from "@/lib/ui-bm3";
import { bm } from "@/lib/api";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl, nhomCua, type WebChon } from "@/lib/thiet-lap";
import { BaoLoi, Chu, F, M, Man, Nut, useLam } from "@/lib/ui";

export default function ThemWeb() {
  const ten = layTl().tenCon ?? "con";
  const [go, setGo] = useState("");
  const [webs, setWebs] = useState<WebChon[]>(layTl().webs ?? []);
  const { lam, loi, setLoi } = useLam();
  const k = boDau(go), mien = tenMien(go);
  const tim = (mien ?? k).replace(/^https?:\/\//, "");
  const khop = tim ? DM_WEB.filter((w) => w.ten.includes(tim) || boDau(w.phu).includes(k)) : [];
  const ds: { muc: string; e: string; phu: string; tinhGio: boolean }[] = [
    ...khop.map((w) => ({ muc: w.ten, e: w.e, phu: w.phu, tinhGio: tinhGioDm(w) })),
    ...(mien && !khop.some((w) => w.ten === mien) ? [{ muc: mien, e: "🔗", phu: "Trang Ba Mẹ dán", tinhGio: true }] : []),
  ];
  const co = (m: string) => webs.some((w) => w.muc === m);
  const ghi = (moi: WebChon[]) => { setWebs(moi); datTl({ webs: moi }); };
  const tinhCua = (m: string) => !!webs.find((w) => w.muc === m)?.tinhGio;
  const dang = [...webs].reverse().find((w) => ds.some((x) => x.muc === w.muc))?.muc ?? null;     // trang đã thêm gần nhất trong kết quả ⇒ hỏi nhóm
  // bỏ: ngay. Thêm: tối đa 60 trang; trang Ba Mẹ dán (ngoài danh mục) hỏi máy chủ trước — địa chỉ sai báo ngay ở đây,
  // không để cả lượt lưu Lần đầu (màn Web) hỏng vì một trang
  const doi = (x: (typeof ds)[number]) => {
    setLoi(null);
    if (co(x.muc)) { ghi(webs.filter((w) => w.muc !== x.muc)); return; }
    if (webs.length >= WEB_TOI_DA) { setLoi(`Chọn tối đa ${WEB_TOI_DA} trang web.`); return; }
    if (DM_WEB.some((w) => w.ten === x.muc)) { ghi([...webs, { muc: x.muc, tinhGio: x.tinhGio }]); return; }
    lam(async () => {
      const r = await bm.goi<{ muc: string }>("thiet-lap/kiem-web", { muc: x.muc });
      const cu = layTl().webs ?? [];
      if (!cu.some((w) => w.muc === r.muc)) ghi([...cu, { muc: r.muc, tinhGio: x.tinhGio }]);
    });
  };
  const ve = () => (router.canGoBack() ? router.back() : router.replace("/thiet-lap/web"));
  return (
    <Man dau={<DauMan ve="/thiet-lap/web" phai={<ThanhBuoc5 dang={4} />} />}
      day={<Nut chu={dang ? `Thêm ${dang} · ${TEN_NHOM[nhomCua(tinhCua(dang))]}` : "Xong"} rong bam={ve} />}>
      <Text accessibilityRole="header" numberOfLines={1} style={{ fontFamily: F.tieu, fontSize: 22, lineHeight: 28, letterSpacing: -0.4, color: M.chu, marginLeft: 4 }}>{`Thêm web cho ${ten}`}</Text>
      <OTim gia={go} doi={setGo} khongKinh nhan="Tên hoặc link trang web" goiY="Gõ tên hoặc dán link" url />
      <BaoLoi loi={loi} />
      {k ? (
        <>
          <Chu kieu="dam" co={14} mau={M.chu2} style={{ marginHorizontal: 6 }}>Kết quả cho <Chu kieu="rat" co={14}>{`«${go.trim()}»`}</Chu></Chu>
          {ds.length ? <TheDs le>{ds.map((x, i) => (
            <DongKetQua key={x.muc} dau={!i} ic="web" ten={x.muc} phu={x.phu} da={co(x.muc)} bam={() => doi(x)}>
              {dang === x.muc ? <HoiNhom ten={x.muc} nhom={nhomCua(tinhCua(x.muc))} doi={(n) => ghi(webs.map((w) => (w.muc === x.muc ? { ...w, tinhGio: n === "tinh_phut" } : w)))} /> : null}
            </DongKetQua>
          ))}</TheDs>
            : <Chu co={13} mau={M.chu2} style={{ paddingHorizontal: 4 }}>Chưa thấy trang nào. Gõ đủ tên miền, ví dụ olm.vn.</Chu>}
        </>
      ) : null}
    </Man>
  );
}
