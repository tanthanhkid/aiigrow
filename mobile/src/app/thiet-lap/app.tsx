// them-mdujxlg2 «<Con> dùng app thế nào?» (thiết kế chốt 15/11 — #262, gộp màn chọn chế độ cũ them-35vyl4cx): hai thẻ chọn chế độ «Mở hết · Mở mọi app,
// mọi web · Không tính phút» | «Theo danh sách · Chỉ mở app, web Ba Mẹ đã thêm». Theo danh sách ⇒ thanh tìm «🔍 Tìm app trên máy con… + Thêm» (⇒ them-at57ypdc),
// «Đã thêm N app · M tính phút — App khác: con xin Ba Mẹ», danh mục chia nhóm (lib/danh-muc-lan-dau.ts) mỗi nhóm «Chọn tất cả» + «● Thêm vào nhóm …»;
// dòng đã thêm hiện viên «● Không tính phút» / «● Tính phút» (nhóm «Giải trí» = Tính phút). Không chọn sẵn.
// «Tiếp: chọn web cho con» ⇒ them-3xbscpzm. Mở hết ⇒ lưu một lần (POST thiet-lap) rồi sang Ghép máy. App gửi theo TÊN + nhom (docs/API.md › thiet-lap).
import { useCallback, useMemo, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { DM_APP, type MucDm } from "@/lib/danh-muc-lan-dau";
import { luuThietLap, napCaiDatCon } from "@/lib/ghep-may";
import { DauMan } from "@/lib/lan-dau";
import { icCuaApp } from "@/lib/ui-bm3";
import { boDau, ChonCheDo, DongDem, HaiNhomPhut, ThanhTimGia, tinhGioDm, type DongNhomPhut } from "@/lib/lan-dau-ds";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl, type AppChon } from "@/lib/thiet-lap";
import { BaoLoi, Chu, M, Man, Nut, useLam } from "@/lib/ui";

type CheDo = "chi_app_duoc_phep" | "mo_het";

export default function ChonApp() {
  const tl = layTl();
  const ten = tl.tenCon ?? "con";
  const [apps, setApps] = useState<AppChon[]>(tl.apps ?? []);
  const [cheDo, setCheDo] = useState<CheDo>(tl.cheDoChan ?? "chi_app_duoc_phep");
  const daBam = useRef(!!tl.cheDoChan);        // Ba Mẹ đã chọn (lần này hoặc trước) ⇒ chế độ nạp từ máy chủ không được đè
  const { lam, loi, dangChay } = useLam();
  useFocusEffect(useCallback(() => {
    setApps(layTl().apps ?? []);                // quay về từ «Thêm app» ⇒ đọc lại
    // đi lại Lần đầu cho Con đã có chế độ ⇒ hiện đúng chế độ đang có — chỉ khi Ba Mẹ chưa bấm chọn
    napCaiDatCon().then(() => { const n = layTl().cheDoChan; if (n && !daBam.current) setCheDo(n); }).catch(() => {});
  }, []));
  const moHet = cheDo === "mo_het";
  const chonCheDo = (v: CheDo) => { daBam.current = true; setCheDo(v); datTl({ cheDoChan: v }); };
  const k = (t: string) => boDau(t);
  const luu = (moi: AppChon[]) => { setApps(moi); datTl({ apps: moi }); };
  const tinh = (a: AppChon) => "tinhGio" in a && a.tinhGio;
  const soTinh = apps.filter(tinh).length;
  // hai nhóm không chia theo môn (bàn 19/11): dòng ở nhóm ĐÃ LƯU của app (Ba Mẹ đổi bằng chip); chưa thêm ⇒ nhóm mặc định của danh mục
  const dong: DongNhomPhut[] = useMemo(() => [
    ...DM_APP.map((x) => { const a = apps.find((y) => k(y.ten) === k(x.ten)); return { ten: x.ten, phu: x.phu, ic: icCuaApp(`${x.ten} ${x.phu}`), da: !!a, tinh: a ? tinh(a) : tinhGioDm(x) }; }),
    ...apps.filter((a) => !DM_APP.some((x) => k(x.ten) === k(a.ten))).map((a) => ({ ten: a.ten, phu: "Ba Mẹ gõ tên", ic: icCuaApp(a.ten), da: true, tinh: tinh(a) })),
  ], [apps]); // eslint-disable-line react-hooks/exhaustive-deps
  const them = (t: string) => { const x = DM_APP.find((y) => k(y.ten) === k(t)); luu([...apps.filter((a) => k(a.ten) !== k(t)), { ten: t, tinhGio: x ? tinhGioDm(x) : false }]); };
  const bo = (t: string) => luu(apps.filter((a) => k(a.ten) !== k(t)));
  const doiNhom = (t: string) => luu(apps.map((a) => (k(a.ten) === k(t) ? { ten: a.ten, tinhGio: !tinh(a) } : a)));
  const tiep = () => {
    datTl({ cheDoChan: cheDo, apps });
    if (!moHet) { router.push("/thiet-lap/web"); return; }
    lam(async () => {
      const con = await luuThietLap();
      router.push({ pathname: "/thiet-lap/ghep", params: { con, nguon: "lan-dau" } });
    }, { hangDoi: true });
  };
  return (
    <Man dau={<DauMan ve="/thiet-lap/gio" phai={<ThanhBuoc5 dang={4} />} />}
      day={<><BaoLoi loi={loi} /><Nut chu={moHet ? "Tiếp: ghép máy của con" : "Tiếp: chọn web cho con"} rong dangChay={dangChay} bam={tiep} /></>}>
      <Chu kieu="rat" co={24} style={{ letterSpacing: -0.5 }}>{`${ten} dùng app thế nào?`}</Chu>
      <ChonCheDo gia={cheDo} doi={chonCheDo} />
      {moHet ? (
        <Chu co={13.5} mau={M.chu2} style={{ paddingHorizontal: 4 }}>{`${ten} mở được mọi app, mọi trang web, không tính phút. AiiGrow chỉ lo nhiệm vụ, sao và quà. Đổi sang «Theo danh sách» lúc nào cũng được ở tab App & web.`}</Chu>
      ) : <>
        <Chu co={13.5} mau={M.chu2} style={{ paddingHorizontal: 4 }}>Con chỉ mở app, web trong danh sách. Cái mới thì con xin Ba Mẹ.</Chu>
        <ThanhTimGia chu="Tìm app trên máy con" ic="tim_kiem" nhan="Tìm hoặc thêm app trên máy con" bam={() => router.push("/thiet-lap/them-app")} />
        <DongDem trai={`Đã thêm ${apps.length} app · ${soTinh} tính phút`} phai="App khác: con xin Ba Mẹ" />
        <HaiNhomPhut ds={dong} them={them} bo={bo} doiNhom={doiNhom} />
        <Chu co={12.5} mau={M.chu3} style={{ paddingHorizontal: 4 }}>AiiGrow không đề xuất: TikTok, Facebook, Instagram, YouTube bản thường — chỉ dành cho từ 13 tuổi.</Chu>
      </>}
    </Man>
  );
}
