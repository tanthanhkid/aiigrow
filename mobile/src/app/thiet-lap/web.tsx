// Lần đầu · bước 5 «<Con> vào web thế nào?» (bàn bm-thiet-lap-con: them-3xbscpzm@v19 — #490): KHÔNG có công tắc chế độ — một dòng navy «Chế độ: Theo danh sách · Đổi ›»
// (⇒ về màn app, nơi chọn chế độ), cùng danh sách với màn app (lib/ds-chung › DsLanDau): thanh tìm lõm (⇒ Thêm web), Tính phút TRƯỚC / Không tính phút, «Gợi ý cho <con>».
// Dòng đã thêm bấm ⇒ «Đổi web» (doi-web.tsx). «Tiếp: ghép máy của con» ⇒ lưu MỘT lần cả Lần đầu
// (POST thiet-lap: hồ sơ đã lưu + giờ chơi + giờ ngủ + chế độ + app + web — docs/API.md › «Thiết lập lần đầu») ⇒ Ghép máy.
import { useCallback, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { DM_WEB } from "@/lib/danh-muc-lan-dau";
import { luuThietLap } from "@/lib/ghep-may";
import { DauMan } from "@/lib/lan-dau";
import { DongCheDo, DsLanDau } from "@/lib/ds-chung";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl, nhomCua, type WebChon } from "@/lib/thiet-lap";
import { BaoLoi, Chu, M, Man, Nut, useLam } from "@/lib/ui";

const GOI_Y_TOI_DA = 5;

export default function ChonWeb() {
  const tl = layTl();
  const ten = tl.tenCon ?? "con";
  const [webs, setWebs] = useState<WebChon[]>(tl.webs ?? []);
  useFocusEffect(useCallback(() => { setWebs(layTl().webs ?? []); }, []));     // quay về từ «Thêm web» / «Đổi web» ⇒ đọc lại
  const { lam, loi, dangChay } = useLam();
  const da = useMemo(() => webs.map((w) => ({ k: w.muc, ten: w.muc, nhom: nhomCua(w.tinhGio), ic: "web" as const })), [webs]);
  const goiY = DM_WEB.filter((x) => !webs.some((w) => w.muc === x.ten)).slice(0, GOI_Y_TOI_DA).map((x) => ({ k: x.ten, ten: x.ten, ic: "web" as const }));
  const veApp = () => (router.canGoBack() ? router.back() : router.replace("/thiet-lap/app"));
  const tiep = () => lam(async () => {
    datTl({ webs });
    const con = await luuThietLap();
    router.push({ pathname: "/thiet-lap/ghep", params: { con, nguon: "lan-dau" } });
  }, { hangDoi: true });
  return (
    <Man dau={<DauMan ve="/thiet-lap/app" phai={<ThanhBuoc5 dang={4} />} />}
      day={<><BaoLoi loi={loi} /><Nut thu chu="Tiếp: ghép máy của con" rong dangChay={dangChay} bam={tiep} /></>}>
      <Chu kieu="rat" co={24} style={{ letterSpacing: -0.5 }}>{`${ten} vào web thế nào?`}</Chu>
      <DongCheDo cheDo="theo_danh_sach" doi={veApp} />
      <Chu co={13.5} mau={M.chu2} style={{ paddingHorizontal: 4 }}>Con chỉ mở app, web trong danh sách. Cái mới thì con xin Ba Mẹ.</Chu>
      <DsLanDau kieu="web" ten={ten} da={da} goiY={goiY} timChu="Dán địa chỉ web" tim={() => router.push("/thiet-lap/them-web")}
        mo={(m) => router.push({ pathname: "/thiet-lap/doi-web", params: { muc: m } })}
        them={(m) => router.push({ pathname: "/thiet-lap/them-web", params: { q: m } })} />
      <Chu co={12.5} mau={M.chu3} style={{ paddingHorizontal: 4 }}>AiiGrow không đề xuất: tiktok.com, facebook.com, youtube.com bản thường — chỉ dành cho từ 13 tuổi.</Chu>
    </Man>
  );
}
