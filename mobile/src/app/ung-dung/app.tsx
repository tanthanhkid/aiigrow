// Một app (thiết kế chốt bm-ung-dung/03 «Roblox» → 04 «Đã chặn Roblox»): «Tính vào giờ chơi» bật / tắt, «Áp cho» các con, «Lưu cho <app> của <con>»,
// «Không cho dùng app này» ⇒ màn kết quả có «Hoàn tác». Ghi bằng POST luat {con, muc, ten, loai: giai_tri | hoc | chan} cho từng con được chọn.
// Không có «Tối đa mỗi ngày» theo app: mọi app được phép dùng chung quỹ giờ chơi của ngày (L2 — bỏ giới hạn / trừ điểm theo từng app).
import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { bm, laChiXem, type GiaDinh } from "@/lib/api";
import { KHOI } from "@/lib/clay";
import { ManKetQua, MucTieu, OIcon, gioChoi, napQuyCon, hoanLuat, icCuaApp, khoaTen, luatCuaCon, veHoac, type LuatApp, type LuatTruoc } from "@/lib/ui-bm3";
import { BaoLoi, ChoTai, Chips, gioPhut, Chu, CongTac, Dong, M, Man, NhanMen, Nhom, Nut, useLam, useTai } from "@/lib/ui";

export default function MotApp() {
  const ts = useLocalSearchParams<{ con: string; muc: string; ten?: string; caNha?: string }>();
  const caNha = ts.caNha === "1";        // app mới chưa xếp của cả nhà (thẻ «app mới» Trang chủ) ⇒ luật cả nhà, không gắn một con
  const { d, loi, matMang, tai } = useTai(async () => {
    const [g, luat, xem, quy] = await Promise.all([bm.goi<GiaDinh>("gia-dinh"), bm.goi<{ ds: LuatApp[] }>("luat"), laChiXem(), ts.con ? napQuyCon(ts.con) : Promise.resolve(null)]);
    return { g, luat: luat.ds, xem, quy };
  });
  const [tinh, setTinh] = useState<boolean | null>(null);
  const [apCho, setApCho] = useState<string[] | null>(null);
  const [daChan, setDaChan] = useState<{ truoc: { con: string; muc: string; truoc: LuatTruoc }[]; luc: Date } | null>(null);
  const { lam, loi: loiLam, dangChay } = useLam();
  const hoan = useLam();
  const ten = ts.ten || ts.muc;
  const ve = () => veHoac(`/app-web?con=${ts.con}`);
  if (!d) return <Man lui={{ chu: "" }} tieu={ten}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const con = d.g.con.find((c) => c.id === ts.con) ?? d.g.con[0];
  if (!con) return <Man lui={{ chu: "" }} tieu={ten}><ChoTai loi="Chưa có hồ sơ con nào." tai={tai} /></Man>;
  const luatCua = (id: string) => luatCuaCon(d.luat, id).find((l) => l.muc === ts.muc) ?? null;
  const hienTai = luatCua(con.id);
  const tinhGio = tinh ?? hienTai?.loai !== "hoc";
  const chon = apCho ?? [con.id];
  const tenCon = (id: string) => d.g.con.find((c) => c.id === id)?.ten ?? "";
  const ic = icCuaApp(`${ten} ${ts.muc}`);

  // mọi định danh cùng tên của app (roblox.exe, robloxplayerbeta.exe, com.roblox.client…) + đúng mục được mở
  const mucCua = (id: string) => [...new Set([ts.muc, ...d.luat.filter((l) => (caNha ? !l.child_id : l.child_id === id || !l.child_id) && khoaTen(l) === khoaTen({ ten, muc: ts.muc })).map((l) => l.muc)])];
  const ghi = async (loai: LuatApp["loai"]) => {
    const dsCon = caNha ? [""] : chon;
    const kq: { con: string; muc: string; truoc: LuatTruoc }[] = [];
    const ra = await Promise.allSettled(dsCon.flatMap((id) => mucCua(id).map((muc) => bm.goi<{ truoc: LuatTruoc }>("luat", { con: id || undefined, muc, ten, loai, nhom: hienTai?.nhom ?? undefined })
      .then((r) => { kq.push({ con: id, muc, truoc: r.truoc }); }))));
    const hong = ra.find((r): r is PromiseRejectedResult => r.status === "rejected");
    if (hong) {      // một phần ghi hỏng ⇒ trả các phần đã ghi về như cũ rồi báo lỗi — không để app bị chặn / cho dở dang
      await Promise.allSettled(kq.map((k) => hoanLuat(k.con || undefined, k.muc, k.truoc, loai)));
      throw hong.reason;
    }
    return kq;
  };
  const luu = () => lam(async () => { await ghi(tinhGio ? "giai_tri" : "hoc"); ve(); });
  const chan = () => lam(async () => {
    const truoc = await ghi("chan");
    setDaChan({ truoc, luc: new Date() });
  });
  const hoanTac = () => hoan.lam(async () => {
    await Promise.all(daChan!.truoc.map((t) => hoanLuat(t.con || undefined, t.muc, t.truoc, "chan")));
    setDaChan(null);
    await tai();
  });

  if (daChan) {
    const gio = gioPhut(daChan.luc);
    return (
      <ManKetQua tieu={`Đã chặn ${ten}`} ic="khoa" tin={`${caNha ? "Các con" : [...new Set(daChan.truoc.map((t) => tenCon(t.con)))].join(", ")} không mở được ${ten}`} phu={`Trên mọi máy · từ lúc ${gio}`}
        nut={{ chu: "Xong, về App & web", bam: ve }} loi={hoan.loi} hoan={{ chu: `Hoàn tác, cho dùng lại ${ten}`, bam: hoanTac, dangChay: hoan.dangChay }} />
    );
  }
  return (
    <Man lui={{ chu: "", bam: ve }} tieu={ten} day={d.xem ? undefined : <>
      <BaoLoi loi={loiLam} />
      <Nut chu={`Lưu cho ${ten} của ${caNha ? "cả nhà" : chon.length > 1 ? `${chon.length} con` : tenCon(chon[0])}`} rong dangChay={dangChay} tat={!chon.length} bam={luu} />
      <NhanMen onPress={chan} disabled={dangChay || !chon.length} accessibilityRole="button" muc="nut" sang
        style={{ minHeight: 50, borderRadius: 24, backgroundColor: M.canhSoft, alignItems: "center", justifyContent: "center", ...KHOI.the }}>
        <Chu kieu="rat" co={15} mau={M.canh}>Không cho dùng app này</Chu>
      </NhanMen>
    </>}>
      <View style={{ alignItems: "center", paddingTop: 6, gap: 4 }}>
        <View style={{ width: 84, height: 84, borderRadius: 28, backgroundColor: M.the, alignItems: "center", justifyContent: "center", ...KHOI.the }}><OIcon ic={ic} co={64} nen={M.the} /></View>
        <Chu kieu="rat" co={22} style={{ marginTop: 6 }}>{ten}</Chu>
        <Chu kieu="dam" co={13} mau={M.chu3}>{!hienTai ? `${con.ten} chưa được dùng` : hienTai.loai === "chan" ? `Đang chặn với ${con.ten}` : `${con.ten} đang được dùng`}</Chu>
      </View>
      <Nhom>
        <Dong dau tieu="Tính vào giờ chơi" phu={`Tổng hôm nay ${gioChoi(con, con.id === ts.con ? d.quy : null).da}/${gioChoi(con, con.id === ts.con ? d.quy : null).tong} phút`} trai={<OIcon ic="dongho" />}
          phai={d.xem ? undefined : <CongTac bat={tinhGio} nhan="Tính vào giờ chơi" doi={setTinh} />} />
      </Nhom>
      {d.g.con.length > 1 && !caNha ? (
        <>
          <MucTieu chu="Áp cho" />
          <Chips ds={d.g.con.map((c) => ({ gia: c.id, chu: c.ten }))} chon={chon}
            doi={(id) => setApCho(chon.includes(id) ? chon.filter((x) => x !== id) : [...chon, id])} />
        </>
      ) : null}
    </Man>
  );
}
