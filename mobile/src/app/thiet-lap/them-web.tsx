// Lần đầu · bước 5 «Thêm web cho <con>» (bàn bm-thiet-lap-con: them-ubomxl31@v8 — #490): CÙNG khối với Thêm web của Hằng ngày (lib/ds-chung › KetQuaThem), khác chỉ ở
// thanh bước 5 trên đầu. Gõ tên hoặc dán link ⇒ «Kết quả cho «…»»: trang trong danh mục (DM_WEB) + tên miền rút từ link Ba Mẹ dán; chạm dòng ⇒ chọn (✓ navy) và
// hỏi «<trang> có tính phút không?»; nút đáy vàng «Thêm <trang> · <nhóm>» ghi vào layTl().webs rồi về màn web. Trang ngoài danh mục hỏi máy chủ trước
// (thiet-lap/kiem-web) — địa chỉ sai báo ngay ở đây, không để cả lượt lưu Lần đầu hỏng. Tối đa 60 trang. ?q= điền sẵn ô tìm.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { DM_WEB } from "@/lib/danh-muc-lan-dau";
import { DauMan } from "@/lib/lan-dau";
import { boDau, tenMien, tinhGioDm, WEB_TOI_DA } from "@/lib/lan-dau-ds";
import { bamChonThem, chuNutThem, datNhomThem, KetQuaThem, type ChonThem, type MucThem } from "@/lib/ds-chung";
import { OTim } from "@/lib/ui-bm3";
import { bm } from "@/lib/api";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl, nhomCua, type WebChon } from "@/lib/thiet-lap";
import { BaoLoi, Chu, Man, Nut, useLam } from "@/lib/ui";

export default function ThemWeb() {
  const { q } = useLocalSearchParams<{ q?: string }>();
  const ten = layTl().tenCon ?? "con";
  const [go, setGo] = useState(q ?? "");
  const [chon, setChon] = useState<ChonThem>(new Map());
  const { lam, loi, dangChay, setLoi } = useLam();
  const da = layTl().webs ?? [];
  const k = boDau(go), mien = tenMien(go);
  const tim = (mien ?? k).replace(/^https?:\/\//, "");
  const daCo = (m: string) => da.some((w) => w.muc === m);
  const khop = tim ? DM_WEB.filter((w) => w.ten.includes(tim) || boDau(w.phu).includes(k)) : [];
  const kq: MucThem[] = [
    ...khop.map((w) => ({ k: w.ten, ten: w.ten, phu: w.phu, ic: "web" as const, nhom: nhomCua(tinhGioDm(w)) })),
    ...(mien && !khop.some((w) => w.ten === mien) ? [{ k: mien, ten: mien, phu: "Trang Ba Mẹ dán", ic: "web" as const, nhom: nhomCua(true) }] : []),
  ].filter((m) => !daCo(m.ten));
  const ve = () => (router.canGoBack() ? router.back() : router.replace("/thiet-lap/web"));
  const luu = () => lam(async () => {
    setLoi(null);
    const ch = [...chon.values()].filter(({ m }) => !daCo(m.k));
    if (da.length + ch.length > WEB_TOI_DA) { setLoi(`Chọn tối đa ${WEB_TOI_DA} trang web.`); return; }
    const them: WebChon[] = [];
    for (const { m, nhom } of ch) {
      const muc = DM_WEB.some((w) => w.ten === m.k) ? m.k : (await bm.goi<{ muc: string }>("thiet-lap/kiem-web", { muc: m.k })).muc;
      if (!them.some((w) => w.muc === muc)) them.push({ muc, tinhGio: nhom === "tinh_phut" });
    }
    datTl({ webs: [...(layTl().webs ?? []), ...them.filter((w) => !(layTl().webs ?? []).some((x) => x.muc === w.muc))] });
    ve();
  });
  return (
    <Man dau={<>
      <DauMan ve="/thiet-lap/web" phai={<ThanhBuoc5 dang={5} />} />
      <Chu kieu="rat" co={22} dong={1} style={{ letterSpacing: -0.4, marginHorizontal: 20, marginBottom: 8 }}>{`Thêm web cho ${ten}`}</Chu>
      <OTim gia={go} doi={setGo} khongKinh nhan="Tên hoặc link trang web" goiY="Gõ tên hoặc dán link" url />
    </>} day={<><BaoLoi loi={loi} /><Nut thu chu={chuNutThem(chon, "trang")} rong dangChay={dangChay} tat={!chon.size} bam={luu} /></>}>
      <KetQuaThem go={go} kq={kq} chon={chon} doi={(m) => setChon(bamChonThem(m))} datNhom={(m, n) => setChon(datNhomThem(m, n))}
        trong="Chưa thấy trang nào. Gõ đủ tên miền, ví dụ olm.vn."
        chuaGo={`Gõ tên hoặc dán link trang web ${ten} được vào. Mọi trang con theo cùng nhóm.`} />
    </Man>
  );
}
