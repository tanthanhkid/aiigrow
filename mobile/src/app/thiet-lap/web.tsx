// them-3xbscpzm «Web cho X» (thiết kế chốt 15/11 — #262, chế độ «Theo danh sách»): dải «Chế độ: Theo danh sách · Đổi ›» (⇒ màn app chọn chế độ),
// thanh «🔗 Dán địa chỉ web… + Thêm» ⇒ them-ubomxl31, «Đã thêm N trang · M tính phút — Chạm ＋ để thêm», danh mục trang chia nhóm (DM_WEB) mỗi nhóm
// «Chọn tất cả» + «● Thêm vào nhóm …»; trang đã thêm hiện viên nhóm. Nhóm «Giải trí» = Tính phút, nhóm khác = Không tính phút. Không chọn sẵn.
// «Tiếp: ghép máy của con» ⇒ lưu MỘT lần cả Lần đầu
// (POST thiet-lap: hồ sơ đã lưu + giờ chơi + giờ ngủ + chế độ + app + web — docs/API.md › «Thiết lập lần đầu») ⇒ Ghép máy.
import { useCallback, useMemo, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { DM_WEB } from "@/lib/danh-muc-lan-dau";
import { luuThietLap } from "@/lib/ghep-may";
import { DauMan } from "@/lib/lan-dau";
import { ChonCheDo, DongDem, HaiNhomPhut, ThanhTimGia, tinhGioDm, type DongNhomPhut } from "@/lib/lan-dau-ds";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl, type WebChon } from "@/lib/thiet-lap";
import { BaoLoi, Chu, M, Man, Nut, useLam } from "@/lib/ui";

export default function ChonWeb() {
  const tl = layTl();
  const ten = tl.tenCon ?? "con";
  const [webs, setWebs] = useState<WebChon[]>(tl.webs ?? []);
  useFocusEffect(useCallback(() => { setWebs(layTl().webs ?? []); }, []));     // quay về từ «Thêm web» ⇒ đọc lại
  const { lam, loi, dangChay } = useLam();
  const luu = (moi: WebChon[]) => { setWebs(moi); datTl({ webs: moi }); };
  // hai nhóm không chia theo môn (bàn 19/11): nhóm ĐÃ LƯU của trang; chưa thêm ⇒ nhóm mặc định của danh mục
  const dong: DongNhomPhut[] = useMemo(() => [
    ...DM_WEB.map((x) => { const w = webs.find((y) => y.muc === x.ten); return { ten: x.ten, phu: x.phu, ic: "web" as const, da: !!w, tinh: w ? w.tinhGio : tinhGioDm(x) }; }),
    ...webs.filter((w) => !DM_WEB.some((x) => x.ten === w.muc)).map((w) => ({ ten: w.muc, phu: "Ba Mẹ dán", ic: "web" as const, da: true, tinh: w.tinhGio })),
  ], [webs]);
  const them = (t: string) => { const x = DM_WEB.find((y) => y.ten === t); luu([...webs.filter((w) => w.muc !== t), { muc: t, tinhGio: x ? tinhGioDm(x) : false }]); };
  const bo = (t: string) => luu(webs.filter((w) => w.muc !== t));
  const doiNhom = (t: string) => luu(webs.map((w) => (w.muc === t ? { ...w, tinhGio: !w.tinhGio } : w)));
  const tiep = () => lam(async () => {
    datTl({ webs });
    const con = await luuThietLap();
    router.push({ pathname: "/thiet-lap/ghep", params: { con, nguon: "lan-dau" } });
  }, { hangDoi: true });
  return (
    <Man dau={<DauMan ve="/thiet-lap/app" phai={<ThanhBuoc5 dang={4} />} />}
      day={<><BaoLoi loi={loi} /><Nut chu="Tiếp: ghép máy của con" rong dangChay={dangChay} bam={tiep} /></>}>
      <Chu kieu="rat" co={26} style={{ letterSpacing: -0.5 }}>{`${ten} vào web thế nào?`}</Chu>
      <ChonCheDo gia="chi_app_duoc_phep" doi={(v) => { if (v === "mo_het") { datTl({ cheDoChan: v }); router.back(); } }} />
      <Chu co={13.5} mau={M.chu2} style={{ paddingHorizontal: 4 }}>Con chỉ mở app, web trong danh sách. Cái mới thì con xin Ba Mẹ.</Chu>
      <ThanhTimGia chu="Dán địa chỉ web" ic="web" nhan="Thêm trang web bằng tên hoặc đường link" bam={() => router.push("/thiet-lap/them-web")} />
      <DongDem trai={`Đã thêm ${webs.length} trang · ${webs.filter((w) => w.tinhGio).length} tính phút`} phai="Chạm ＋ để thêm" />
      <HaiNhomPhut ds={dong} them={them} bo={bo} doiNhom={doiNhom} />
      <Chu co={12.5} mau={M.chu3} style={{ paddingHorizontal: 4 }}>AiiGrow không đề xuất: tiktok.com, facebook.com, youtube.com bản thường — chỉ dành cho từ 13 tuổi.</Chu>
    </Man>
  );
}
