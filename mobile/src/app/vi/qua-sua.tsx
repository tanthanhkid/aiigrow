// «Thêm quà» / «Sửa quà» (thiết kế chốt 05/11 bm-hang-ngay/51, 52) + bảng trượt «Xoá quà X?» (62). Tạo = POST qua {ten, loai: "qua", diem};
// sửa = POST qua/:id; xoá = tắt quà (bat: false — sao con đã có không mất). «Con đổi được mấy lần?»: máy chủ chỉ có giới hạn theo THÁNG
// (toi_da_thang) — thiết kế ghi «mỗi tuần» (lệch, ghi PR). «Áp cho» từng Con chưa có ở máy chủ ⇒ quà áp cho cả nhà.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type GiaDinh, type Qua } from "@/lib/api";
import { BangTruot, BaoLoi, baoKhiVe, ChoTai, Chips, Chu, M, Man, Nut, ONhap, useLam, useTai } from "@/lib/ui";

const MUC_SAO = [30, 50, 80, 100];

export default function SuaQua() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [qua, g] = await Promise.all([bm.goi<{ ds: Qua[] }>("qua"), bm.goi<GiaDinh>("gia-dinh")]);
    return { q: id ? qua.ds.find((x) => x.id === id) ?? null : null, con: g.con };
  });
  const [ten, setTen] = useState<string | null>(null);
  const [sao, setSao] = useState<string | null>(null);
  const [gioiHan, setGioiHan] = useState<number | null | undefined>(undefined);
  const [xoa, setXoa] = useState(false);
  const { lam, loi: loiLam, dangChay } = useLam();
  const tieu = id ? "Sửa quà" : "Thêm quà";
  if (!d) return <Man lui={{ chu: "Quà" }} tieu={tieu}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const q = d.q;
  const t = ten ?? q?.ten ?? "";
  const s = sao ?? String(q?.diem ?? 50);
  const gh = gioiHan === undefined ? q?.toi_da_thang ?? null : gioiHan;
  const ok = t.trim().length > 0 && Number(s) >= 1;
  const coNhieuSao = Math.max(0, ...d.con.map((c) => c.soDu));
  const luu = () => lam(async () => {
    if (q) await bm.goi(`qua/${q.id}`, { ten: t.trim(), diem: Number(s), toi_da_thang: gh });
    else await bm.goi("qua", { ten: t.trim(), loai: "qua", diem: Number(s), toi_da_thang: gh });
    baoKhiVe(q ? `Đã lưu quà «${t.trim()}»` : `Đã thêm quà «${t.trim()}» · ${s} sao`);
    router.back();
  });
  const tat = () => lam(async () => {
    if (!q) return;
    await bm.goi(`qua/${q.id}`, { bat: false });
    setXoa(false);
    baoKhiVe(`Đã xoá quà «${q.ten}»`);
    router.back();
  });
  return (
    <Man lui={{ chu: "Quà" }} tieu={tieu}
      day={<><BaoLoi loi={xoa ? null : loiLam} />
        <Nut chu={q ? `Lưu quà ${t.trim() || q.ten}` : `Thêm quà ${s || 0} sao`} rong dangChay={dangChay} tat={!ok} bam={luu} />
        {q ? <Nut chu="Xoá quà này" loai="huy" rong bam={() => setXoa(true)} /> : null}</>}>
      <ONhap nhan="Tên quà" value={t} onChangeText={setTen} placeholder="Đi công viên Chủ nhật" maxLength={60} />
      <View style={{ gap: 8 }}>
        <Chu kieu="rat" co={15}>Cần bao nhiêu sao?</Chu>
        <View style={{ width: 140 }}><ONhap nhan="Số sao" value={s} onChangeText={(x) => setSao(x.replace(/\D/g, "").slice(0, 5))} keyboardType="number-pad" /></View>
        <Chips ds={MUC_SAO.map((x) => ({ gia: String(x), chu: `${x}` }))} chon={[s]} doi={setSao} />
        {d.con.length ? <Chu co={13.5} mau={M.chu3}>{`${d.con.map((c) => `${c.ten} có ${c.soDu} sao`).join(" · ")}. ${Number(s) > coNhieuSao ? "Con cần làm thêm việc mới đổi được." : "Con đủ sao để đổi ngay."}`}</Chu> : null}
      </View>
      <View style={{ gap: 8 }}>
        <Chu kieu="rat" co={15}>Con đổi được mấy lần?</Chu>
        <Chips ds={[{ gia: 0, chu: "Không giới hạn" }, { gia: 1, chu: "Tối đa 1 lần mỗi tháng" }]} chon={[gh ? 1 : 0]} doi={(x) => setGioiHan(x ? 1 : null)} />
      </View>
      <BangTruot mo={xoa} dong={() => setXoa(false)} tieu={`Xoá quà ${q?.ten ?? ""}?`}>
        <Chu co={14.5} mau={M.chu2}>Con sẽ không thấy quà này trên máy nữa. Sao con đã có không bị mất.</Chu>
        <BaoLoi loi={loiLam} />
        <Nut chu={`Xoá quà ${q?.ten ?? ""}`} loai="huy" rong dangChay={dangChay} bam={tat} />
        <Nut chu="Giữ lại quà" loai="ma" rong bam={() => setXoa(false)} />
      </BangTruot>
    </Man>
  );
}
