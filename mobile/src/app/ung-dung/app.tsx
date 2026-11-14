// Một app (thiết kế chốt 14/11 bm-ung-dung/05 bm2-app-web — N3, N4): đầu màn icon + tên + «Hôm nay đã chơi N phút», «<con> dùng <app> thế nào?»
// ba đèn (Dùng thoải mái · Tính giờ · Chặn), «Áp cho» các con (N9, khi > 1 con), «Lưu cho <app>» ⇒ về danh sách App (không còn màn «Đã chặn …»).
// Ghi: POST luat {con, muc, ten, loai: hoc | giai_tri | chan} cho MỌI định danh cùng tên của app và từng con được chọn. Một phần hỏng ⇒ trả về như cũ.
// `caNha=1` (app mới chưa xếp của cả nhà — thẻ «app mới» Trang chủ) ⇒ luật cả nhà.
import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { bm, laChiXem, type GiaDinh } from "@/lib/api";
import { ChonDen, DauMuc, MucTieu, denCua, hoanLuat, icCuaApp, khoaTen, luatCuaCon, LOAI_DEN, napManHinh, phutHomNay, veHoac, type Den, type LuatApp, type LuatTruoc } from "@/lib/ui-bm3";
import { BaoLoi, ChoTai, Chips, Chu, M, Man, Nut, useLam, useTai } from "@/lib/ui";

export default function MotApp() {
  const ts = useLocalSearchParams<{ con: string; muc: string; ten?: string; caNha?: string }>();
  const caNha = ts.caNha === "1";
  const { d, loi, matMang, tai } = useTai(async () => {
    const [g, luat, xem, mh] = await Promise.all([bm.goi<GiaDinh>("gia-dinh"), bm.goi<{ ds: LuatApp[] }>("luat"), laChiXem(), ts.con ? napManHinh(ts.con) : Promise.resolve(null)]);
    return { g, luat: luat.ds, xem, mh };
  });
  const [den, setDen] = useState<Den | null>(null);
  const [apCho, setApCho] = useState<string[] | null>(null);
  const { lam, loi: loiLam, dangChay } = useLam();
  const ten = ts.ten || ts.muc;
  const ve = () => veHoac(ts.con ? `/ung-dung?con=${ts.con}` : "/chan");
  if (!d) return <Man lui={{ chu: "", bam: ve }} tieu={ten}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const con = d.g.con.find((c) => c.id === ts.con) ?? d.g.con[0];
  if (!con) return <Man lui={{ chu: "", bam: ve }} tieu={ten}><ChoTai loi="Chưa có hồ sơ con nào." tai={tai} /></Man>;
  const cungTen = (l: Pick<LuatApp, "ten" | "muc">) => khoaTen(l) === khoaTen({ ten, muc: ts.muc });
  const hienTai = luatCuaCon(d.luat, con.id).filter((l) => l.muc === ts.muc || cungTen(l));
  // đèn hiện tại: định danh nào bị chặn ⇒ đỏ; có tính giờ ⇒ vàng; còn lại xanh; chưa có luật ⇒ chưa chọn
  const denCu = hienTai.some((l) => l.loai === "chan") ? "d" : hienTai.some((l) => l.loai === "giai_tri") ? "v" : denCua(hienTai[0]?.loai);
  const chonDen = den ?? denCu;
  const chon = apCho ?? [con.id];
  const tenCon = (id: string) => d.g.con.find((c) => c.id === id)?.ten ?? "";
  const phut = phutHomNay(d.mh, [ts.muc, ...hienTai.map((l) => l.muc)], "app");

  // mọi định danh cùng tên của app (roblox.exe, robloxplayerbeta.exe, com.roblox.client…) + đúng mục được mở
  const mucCua = (id: string) => [...new Set([ts.muc, ...d.luat.filter((l) => (caNha ? !l.child_id : l.child_id === id || !l.child_id) && cungTen(l)).map((l) => l.muc)])];
  const luu = () => lam(async () => {
    if (!chonDen) return;
    const loai = LOAI_DEN[chonDen];
    const dsCon = caNha ? [""] : chon;
    const kq: { con: string; muc: string; truoc: LuatTruoc }[] = [];
    const nhom = hienTai.find((l) => l.nhom)?.nhom ?? undefined;
    const ra = await Promise.allSettled(dsCon.flatMap((id) => mucCua(id).map((muc) => bm.goi<{ truoc: LuatTruoc }>("luat", { con: id || undefined, muc, ten, loai, nhom })
      .then((r) => { kq.push({ con: id, muc, truoc: r.truoc }); }))));
    const hong = ra.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (hong) {      // một phần ghi hỏng ⇒ trả các phần đã ghi về như cũ rồi báo lỗi — không để app bị chặn / cho dở dang
      await Promise.allSettled(kq.map((k) => hoanLuat(k.con || undefined, k.muc, k.truoc, loai)));
      throw hong.reason;
    }
    ve();
  });
  return (
    <Man lui={{ chu: "", bam: ve }} tieu={caNha ? "App của cả nhà" : `App của ${con.ten}`} day={d.xem ? undefined : <>
      <BaoLoi loi={loiLam} />
      <Nut chu={`Lưu cho ${ten}`} rong dangChay={dangChay} tat={!chon.length || !chonDen} bam={luu} />
    </>}>
      <DauMuc ic={icCuaApp(`${ten} ${ts.muc}`)} tieu={ten}
        phu={caNha ? "Áp cho cả nhà" : phut === null ? undefined : phut ? `Hôm nay đã dùng ${phut} phút` : "Hôm nay chưa dùng"} />
      <Chu kieu="rat" co={15} mau={M.chu2} style={{ marginTop: 14, marginHorizontal: 6 }}>{`${caNha ? "Các con" : con.ten} dùng ${ten} thế nào?`}</Chu>
      <ChonDen gia={chonDen} doi={setDen} tat={d.xem} />
      {d.g.con.length > 1 && !caNha && !d.xem ? (
        <>
          <MucTieu chu="Áp cho" />
          <Chips ds={d.g.con.map((c) => ({ gia: c.id, chu: c.ten }))} chon={chon}
            doi={(id) => setApCho(chon.includes(id) ? chon.filter((x) => x !== id) : [...chon, id])} />
          {chon.length > 1 ? <Chu kieu="dam" co={12.5} mau={M.chu3} style={{ marginHorizontal: 6 }}>{`Áp cho ${chon.map(tenCon).join(", ")}`}</Chu> : null}
        </>
      ) : null}
    </Man>
  );
}
