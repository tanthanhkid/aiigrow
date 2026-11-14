// Một trang web (thiết kế chốt 14/11 bm-ung-dung/08 them-2nupeqju — MỚI, ngang chức năng với một app): đầu màn tên miền + «Hôm nay đã vào N phút»,
// «<con> vào <trang> thế nào?» ba đèn (Vào thoải mái · Tính giờ · Chặn), «Áp cho» các con (N9), «Lưu cho <trang>» ⇒ về danh sách Web.
// Ghi: POST luat {con, muc, ten, loai: hoc | giai_tri | chan} (luật riêng của con thắng luật cả nhà). Trang luôn chặn ⇒ máy chủ 409 web_cam.
import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { bm, laChiXem, type GiaDinh, type ThongKeWeb } from "@/lib/api";
import { ChonDen, DauMuc, LOAI_DEN, MucTieu, denCua, hoanLuat, icCuaApp, veHoac, type Den, type LuatTruoc } from "@/lib/ui-bm3";
import { BaoLoi, ChoTai, Chips, Chu, M, Man, Nut, useLam, useTai } from "@/lib/ui";

export default function TrangWeb() {
  const { con, muc } = useLocalSearchParams<{ con: string; muc: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [g, w, xem] = await Promise.all([bm.goi<GiaDinh>("gia-dinh"), bm.goi<ThongKeWeb>(`con/${con}/web?ngay=1`), laChiXem()]);
    return { g, w, xem };
  });
  const [den, setDen] = useState<Den | null>(null);
  const [apCho, setApCho] = useState<string[] | null>(null);
  const { lam, loi: loiLam, dangChay } = useLam();
  const ve = () => veHoac(`/web/${con}`);
  if (!d) return <Man lui={{ chu: "", bam: ve }} tieu={muc}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const c = d.g.con.find((x) => x.id === con);
  const tenCon = c?.ten ?? "con";
  const luat = d.w.luat.find((l) => l.tenMien === muc && l.nguon === "con") ?? d.w.luat.find((l) => l.tenMien === muc);
  const chonDen = den ?? denCua(luat?.trangThai);
  const chon = apCho ?? [con];
  const phut = Math.round(d.w.top.filter((t) => t.tenMien === muc || t.tenMien.endsWith(`.${muc}`)).reduce((a, t) => a + t.giay, 0) / 60);
  const luu = () => lam(async () => {
    if (!chonDen) return;
    const loai = LOAI_DEN[chonDen];
    const kq: { con: string; truoc: LuatTruoc }[] = [];
    const ra = await Promise.allSettled(chon.map((id) => bm.goi<{ truoc: LuatTruoc }>("luat", { con: id, muc, ten: muc, loai }).then((r) => { kq.push({ con: id, truoc: r.truoc }); })));
    const hong = ra.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (hong) {      // một phần hỏng ⇒ trả các con đã ghi về như cũ
      await Promise.allSettled(kq.map((k) => hoanLuat(k.con, muc, k.truoc, loai)));
      throw hong.reason;
    }
    ve();
  });
  return (
    <Man lui={{ chu: "", bam: ve }} tieu={`Web của ${tenCon}`} day={d.xem ? undefined : <>
      <BaoLoi loi={loiLam} />
      <Nut chu={`Lưu cho ${muc}`} rong dangChay={dangChay} tat={!chonDen || !chon.length} bam={luu} />
    </>}>
      <DauMuc ic={icCuaApp(muc)} tieu={muc} phu={phut ? `Hôm nay đã vào ${phut} phút` : "Hôm nay chưa vào"} />
      <Chu kieu="rat" co={15} mau={M.chu2} style={{ marginTop: 14, marginHorizontal: 6 }}>{`${tenCon} vào ${muc} thế nào?`}</Chu>
      <ChonDen gia={chonDen} doi={setDen} web tat={d.xem} />
      {luat?.nguon === "gia_dinh" ? <Chu kieu="dam" co={12.5} mau={M.chu3} style={{ marginHorizontal: 6 }}>Đang theo luật chung của cả nhà — Lưu ở đây sẽ áp riêng cho con được chọn.</Chu> : null}
      {d.g.con.length > 1 && !d.xem ? (
        <>
          <MucTieu chu="Áp cho" />
          <Chips ds={d.g.con.map((x) => ({ gia: x.id, chu: x.ten }))} chon={chon} doi={(id) => setApCho(chon.includes(id) ? chon.filter((x) => x !== id) : [...chon, id])} />
        </>
      ) : null}
    </Man>
  );
}
