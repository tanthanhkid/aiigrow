// Lần đầu · bước 5 «<Con> dùng app thế nào?» (bàn bm-thiet-lap-con: them-mdujxlg2@v19 — #490): thẻ navy «App và web trên máy <con> sẽ ở chế độ» + công tắc
// Mở hết | Theo danh sách + hai dòng ✓ / ? (cùng thẻ với tab App & web — lib/ds-chung › TheCheDo); Theo danh sách ⇒ thanh tìm lõm (⇒ Thêm app), hai nhóm
// Tính phút TRƯỚC / Không tính phút (chấm màu, KHÔNG chip trong dòng, KHÔNG số liệu dùng), «Gợi ý cho <con>» nút ＋ tròn. Dòng đã thêm bấm ⇒ «Đổi app» (doi-app.tsx).
// Chế độ chọn MỘT lần ở đây. «Tiếp: chọn web cho con» ⇒ Web; Mở hết ⇒ lưu một lần (POST thiet-lap) rồi sang Ghép máy. App gửi theo TÊN + nhom (docs/API.md › thiet-lap).
import { useCallback, useMemo, useRef, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { DM_APP } from "@/lib/danh-muc-lan-dau";
import { luuThietLap, napCaiDatCon } from "@/lib/ghep-may";
import { DauMan } from "@/lib/lan-dau";
import { KhoiAppMay, taiAppCuaCon, type MayApp } from "@/lib/app-may-ui";
import { icCuaApp } from "@/lib/ui-bm3";
import { boDau } from "@/lib/lan-dau-ds";
import { DsLanDau, TheCheDo } from "@/lib/ds-chung";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl, nhomCua, type AppChon } from "@/lib/thiet-lap";
import type { CheDo as CheDoUi } from "@/lib/app-web";
import { BaoLoi, Chu, M, Man, Nut, useLam } from "@/lib/ui";

type CheDo = "chi_app_duoc_phep" | "mo_het";
const GOI_Y_TOI_DA = 5;

export default function ChonApp() {
  const tl = layTl();
  const ten = tl.tenCon ?? "con";
  const [apps, setApps] = useState<AppChon[]>(tl.apps ?? []);
  const [cheDo, setCheDo] = useState<CheDo>(tl.cheDoChan ?? "chi_app_duoc_phep");
  const daBam = useRef(!!tl.cheDoChan);        // Ba Mẹ đã chọn (lần này hoặc trước) ⇒ chế độ nạp từ máy chủ không được đè
  const { lam, loi, dangChay } = useLam();
  const [may, setMay] = useState<MayApp[] | null>(null);      // app trên máy ĐÃ GHÉP của bé (máy gửi về) — null = đang tải
  useFocusEffect(useCallback(() => {
    const con = layTl().conId;
    if (con) taiAppCuaCon(con).then(setMay, () => setMay(null)); else setMay([]);
    setApps(layTl().apps ?? []);                // quay về từ «Thêm app» / «Đổi app» ⇒ đọc lại
    // đi lại Lần đầu cho Con đã có chế độ ⇒ hiện đúng chế độ đang có — chỉ khi Ba Mẹ chưa bấm chọn
    napCaiDatCon().then(() => { const n = layTl().cheDoChan; if (n && !daBam.current) setCheDo(n); }).catch(() => {});
  }, []));
  const moHet = cheDo === "mo_het";
  const doiCheDo = (v: CheDoUi) => { const n: CheDo = v === "mo_het" ? "mo_het" : "chi_app_duoc_phep"; daBam.current = true; setCheDo(n); datTl({ cheDoChan: n }); };
  const k = boDau;
  const tinh = (a: AppChon) => "tinhGio" in a && a.tinhGio;
  const da = useMemo(() => apps.map((a) => {
    const x = DM_APP.find((y) => k(y.ten) === k(a.ten));
    return { k: a.ten, ten: a.ten, nhom: nhomCua(tinh(a)), ic: icCuaApp(`${a.ten} ${x?.phu ?? ""}`) };
  }), [apps]); // eslint-disable-line react-hooks/exhaustive-deps
  const coMay = !!may?.some((m) => m.ds.some((x) => x.trangThai !== "he_thong"));
  const themApp = (t: string, n: "tinh_phut" | "khong_tinh_phut") => { const moi: AppChon[] = [...(layTl().apps ?? []).filter((a) => k(a.ten) !== k(t)), { ten: t, tinhGio: n === "tinh_phut" }]; setApps(moi); datTl({ apps: moi }); };
  const goiY = coMay ? [] : DM_APP.filter((x) => !apps.some((a) => k(a.ten) === k(x.ten))).slice(0, GOI_Y_TOI_DA).map((x) => ({ k: x.ten, ten: x.ten, ic: icCuaApp(`${x.ten} ${x.phu}`) }));
  const tiep = () => {
    datTl({ cheDoChan: cheDo, apps });
    if (!moHet) { router.push("/thiet-lap/web"); return; }
    lam(async () => {      // Mở hết: không còn bước Web ⇒ lưu một lần rồi tới «Xong rồi»
      const con = await luuThietLap();
      router.push({ pathname: "/thiet-lap/xong", params: { con } });
    }, { hangDoi: true });
  };
  return (
    <Man dau={<DauMan ve="/thiet-lap/gio" phai={<ThanhBuoc5 dang={5} />} />}
      day={<><BaoLoi loi={loi} /><Nut thu chu={moHet ? "Xong rồi" : "Tiếp: chọn web cho con"} rong dangChay={dangChay} bam={tiep} /></>}>
      <Chu kieu="rat" co={24} style={{ letterSpacing: -0.5 }}>{`${ten} dùng app thế nào?`}</Chu>
      <TheCheDo ten={ten} cheDo={moHet ? "mo_het" : "theo_danh_sach"} doi={doiCheDo} />
      {moHet ? (
        <Chu co={13.5} mau={M.chu2} style={{ paddingHorizontal: 4 }}>{`${ten} mở được mọi app, mọi trang web, không tính phút. AiiGrow chỉ lo nhiệm vụ, sao và quà. Đổi sang «Theo danh sách» lúc nào cũng được ở tab App & web.`}</Chu>
      ) : <>
        <KhoiAppMay ten={ten} may={may} chuaGhep={`Ghép máy để thấy app trên máy ${ten}`}
          daXep={(a) => apps.some((x) => k(x.ten) === k(a.ten))} chon={(a, n) => themApp(a.ten, n)}
          ghep={() => { const con = layTl().conId; if (con) router.push({ pathname: "/thiet-lap/ghep", params: { con, nguon: "lan-dau", sau: "app" } }); }} />
        <DsLanDau kieu="app" ten={ten} da={da} goiY={goiY} timChu="Tìm app trên máy con" tim={() => router.push("/thiet-lap/them-app")}
          mo={(t) => router.push({ pathname: "/thiet-lap/doi-app", params: { ten: t } })}
          them={themApp} />
        <Chu co={12.5} mau={M.chu3} style={{ paddingHorizontal: 4 }}>AiiGrow không đề xuất: TikTok, Facebook, Instagram, YouTube bản thường — chỉ dành cho từ 13 tuổi.</Chu>
      </>}
    </Man>
  );
}
