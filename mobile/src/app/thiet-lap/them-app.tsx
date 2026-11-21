// Lần đầu · bước 5 «Thêm app cho <con>» (bàn bm-thiet-lap-con: them-at57ypdc@v9 — #490): CÙNG khối với Thêm app của Hằng ngày (lib/ds-chung › KetQuaThem), khác chỉ ở
// thanh bước 5 trên đầu. Ô tìm trơn, «Kết quả cho «…»», chạm dòng ⇒ chọn (✓ navy) và ngay dưới hiện «<app> có tính phút không?» (2 ô nhóm lớn); nút đáy vàng
// «Thêm <app> · <nhóm>» ghi vào lib/thiet-lap (layTl().apps) rồi về màn app. App đã thêm không hiện lại. ?q= điền sẵn ô tìm (từ «Gợi ý cho <con>»).
// App ngoài danh mục (Ba Mẹ gõ tên) mặc định «Tính phút», gửi theo tên; máy chủ khớp với app thật máy Con báo.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { DM_APP } from "@/lib/danh-muc-lan-dau";
import { DauMan } from "@/lib/lan-dau";
import { boDau, tinhGioDm } from "@/lib/lan-dau-ds";
import { bamChonThem, chuNutThem, datNhomThem, KetQuaThem, type ChonThem, type MucThem } from "@/lib/ds-chung";
import { icCuaApp, OTim } from "@/lib/ui-bm3";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl, nhomCua, type AppChon } from "@/lib/thiet-lap";
import { Chu, Man, Nut } from "@/lib/ui";

export default function ThemApp() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const ten = layTl().tenCon ?? "con";
  const [go, setGo] = useState(q ?? "");
  const [chon, setChon] = useState<ChonThem>(new Map());
  const da = layTl().apps ?? [];
  const k = boDau(go);
  const daCo = (t: string) => da.some((a) => boDau(a.ten) === boDau(t));
  const khop = k ? DM_APP.filter((a) => boDau(a.ten).includes(k) || boDau(a.phu).includes(k)) : [];
  const kq: MucThem[] = [
    ...khop.map((a) => ({ k: a.ten, ten: a.ten, phu: a.phu, ic: icCuaApp(`${a.ten} ${a.phu}`), nhom: nhomCua(tinhGioDm(a)) })),
    ...(k && !khop.some((a) => boDau(a.ten) === k) ? [{ k: go.trim().slice(0, 60), ten: go.trim().slice(0, 60), phu: "Đúng tên Ba Mẹ gõ", ic: icCuaApp(go), nhom: nhomCua(true) }] : []),
  ].filter((m) => !daCo(m.ten));
  const ve = () => (router.canGoBack() ? router.back() : router.replace("/thiet-lap/app"));
  const luu = () => {
    const moi: AppChon[] = [...da, ...[...chon.values()].filter(({ m }) => !daCo(m.ten)).map(({ m, nhom }) => ({ ten: m.ten, tinhGio: nhom === "tinh_phut" }))];
    datTl({ apps: moi });
    ve();
  };
  return (
    <Man dau={<>
      <DauMan ve="/thiet-lap/app" phai={<ThanhBuoc5 dang={5} />} />
      <Chu kieu="rat" co={22} dong={1} style={{ letterSpacing: -0.4, marginHorizontal: 20, marginBottom: 8 }}>{`Thêm app cho ${ten}`}</Chu>
      <OTim gia={go} doi={setGo} khongKinh nhan="Tên app" goiY="Duolingo, Zoom, Khan Academy…" />
    </>} day={<Nut thu chu={chuNutThem(chon, "app")} rong tat={!chon.size} bam={luu} />}>
      <KetQuaThem go={go} kq={kq} chon={chon} doi={(m) => setChon(bamChonThem(m))} datNhom={(m, n) => setChon(datNhomThem(m, n))}
        trong="Chưa thấy app nào. Gõ đúng tên app trên máy con."
        chuaGo={`Gõ tên app ${ten} sẽ dùng. App chưa thêm thì con chưa mở được — con xin Ba Mẹ.`} />
    </Man>
  );
}
