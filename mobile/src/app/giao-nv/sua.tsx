// «Sửa việc» (thiết kế chốt 05/11 bm-hang-ngay/38) + bảng trượt «Xoá việc «X»?» (39): lưu = POST nhiem-vu/:id, xoá = tắt việc (bat: false —
// sao con đang có giữ nguyên, lịch sử giữ). Một việc giao một Con hoặc cả nhà. Người trông giúp: chỉ xem (máy chủ cũng trả 403).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { BangTruot, Bao, BaoLoi, baoKhiVe, ChoTai, Chu, M, Man, Nut, TickDong, useLam, useTai } from "@/lib/ui";
import { CAU_TRONG_GIUP, quyenToi, type NhiemVuMoi } from "@/lib/hang-ngay";
import { TEN_BO } from "@/lib/nv-tab";
import { NhapViec, tenHopLe, thanViec, type FormViec } from "@/lib/form-viec";

export default function SuaViec() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [nv, g, quyen] = await Promise.all([bm.goi<{ ds: NhiemVuMoi[] }>("nhiem-vu"), bm.goi<GiaDinh>("gia-dinh"), quyenToi()]);
    return { v: nv.ds.find((x) => x.id === id) ?? null, ds: nv.ds, con: g.con, baMe: quyen === "ba_me" };
  });
  const [f, setF] = useState<FormViec | null>(null);
  const [xoa, setXoa] = useState(false);
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Nhiệm vụ" }} tieu="Sửa việc"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const v = d.v;
  if (!v) return <Man lui={{ chu: "Nhiệm vụ" }} tieu="Sửa việc"><Bao loai="lam" ic="tick" tieu="Việc này không còn nữa" loi="Có thể người khác trong nhà đã xoá." /></Man>;
  const goc: FormViec = { ten: v.ten, hinh: v.hinh ?? "choi", sao: v.diem, lapLai: v.lap_lai ?? ((v as { kieu?: string }).kieu === "mot_lan" ? "mot_lan" : "hang_ngay"),
    gioNhac: v.gio_nhac ?? "", bangChung: v.bang_chung === "tu_dong" ? "xong" : v.bang_chung, duyet: !v.tu_duyet, giaoCho: v.giao_cho ? [v.giao_cho] : [] };
  const form = f ?? goc;
  const tenCon = v.giao_cho ? d.con.find((c) => c.id === v.giao_cho)?.ten ?? "Con" : "Các con";
  const conLai = v.bo ? d.ds.filter((x) => x.bat && x.bo === v.bo && x.id !== v.id && x.giao_cho === v.giao_cho).length : null;
  const luu = () => lam(async () => {
    // chỉ gửi trường Ba Mẹ ĐÃ đổi: suaNv ghép lên bản cũ ⇒ giữ nguyên toi_da_ngay, nhom, hình trống, việc AiiRob tự chấm (review PR #183).
    // «Áp cho» không sửa được (suaNv không ghi giao_cho) nên màn sửa không hiện mục đó.
    const moi = thanViec(form), cu = thanViec(goc), than: Record<string, unknown> = {};
    for (const k of ["ten", "hinh", "diem", "lap_lai", "gio_nhac", "bang_chung", "tu_duyet"] as const) if (moi[k] !== cu[k]) than[k] = moi[k];
    if (than.lap_lai === "mot_lan") than.toi_da_ngay = null;
    if (Object.keys(than).length) await bm.goi(`nhiem-vu/${v.id}`, than);
    baoKhiVe(`Đã lưu việc «${form.ten.trim()}»`);
    router.back();
  });
  const tat = () => lam(async () => {
    await bm.goi(`nhiem-vu/${v.id}`, { bat: false });
    setXoa(false);
    baoKhiVe(`Đã xoá «${v.ten}»`);
    router.back();
  });
  return (
    <Man lui={{ chu: "Nhiệm vụ" }} tieu="Sửa việc"
      day={d.baMe ? <><BaoLoi loi={xoa ? null : loiLam} /><Nut chu={`Lưu việc «${form.ten.trim() || v.ten}»`} rong dangChay={dangChay} tat={!tenHopLe(form.ten)} bam={luu} /></> : undefined}>
      {d.baMe ? (
        <>
          <NhapViec f={form} doi={setF} con={[]} goiY={false} />
          <Nut chu="Xoá việc này" loai="huy" rong bam={() => setXoa(true)} />
        </>
      ) : <Bao loai="lam" ic="khoa" tieu={v.ten} loi={CAU_TRONG_GIUP} />}
      <BangTruot mo={xoa} dong={() => setXoa(false)} tieu={`Xoá việc «${v.ten}»?`}>
        <View>
          <TickDong chu={`${tenCon} không thấy việc này nữa`} />
          <TickDong chu="Sao con đang có vẫn giữ nguyên" />
          {conLai !== null && v.bo ? <TickDong chu={`Bộ ${TEN_BO[v.bo] ?? v.bo} còn ${conLai} việc`} /> : null}
        </View>
        <BaoLoi loi={loiLam} />
        <Nut chu={`Xoá «${v.ten}»`} loai="huy" rong dangChay={dangChay} bam={tat} />
        <Nut chu="Giữ lại việc này" loai="ma" rong bam={() => setXoa(false)} />
        <Chu co={12.5} mau={M.chu3}>Lịch sử việc đã làm vẫn giữ trong báo cáo.</Chu>
      </BangTruot>
    </Man>
  );
}
