// bm-bao-cao: báo cáo tuần theo Con (FR-06.02/06.03) — biểu đồ học / giải trí theo ngày, top mục giải trí, câu chú giải đời thường.
// Chỉ tên app/tên miền + thời lượng, không ghi nội dung. «Xuất CSV» mở được bằng Excel / Google Sheets.
import { useState } from "react";
import { View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { BaoLoi, BieuTron, Canh, CanhGiua, ChoTai, ChonMot, Chu, Dong, Luoi2, M, Man, Nhom, NhomTieu, Nut, OSo, The, useLam, useTai } from "@/lib/ui";
import { luuTepChu } from "@/lib/luu-tep";

type Tuan = { giaiTriTheoNgay: { ngay: string; phut: number }[]; tongGiaiTri: number; phutHoc: number; diemKiemTheoNhom: { nhom: string; diem: number; n: number }[];
  duyet: { duoc: number; tu_choi: number }; ngoaiLe: number; top: { muc: string; phut: number }[];
  hocTheoNgay?: { ngay: string; phut: number }[]; dungNhieu?: { muc: string; loai: string; phut: number; lech: number | null }[] };
type BaoCao = { ten: string; tuanNay: Tuan; tuanTruoc: Tuan; chuGiai: string[] };
const THU = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const gio = (p: number) => (p >= 60 ? `${Math.floor(p / 60)} giờ${p % 60 ? ` ${String(p % 60).padStart(2, "0")}` : ""}` : `${p} phút`);

export default function BaoCaoTuan() {
  const g = useTai(() => bm.goi<GiaDinh>("gia-dinh"));
  const [chon, setChon] = useState<string | null>(null);
  const con = chon ?? g.d?.con[0]?.id ?? null;
  if (!g.d) return <Man tieuLon="Báo cáo" chat><ChoTai loi={g.loi} matMang={g.matMang} tai={g.tai} /></Man>;
  if (!g.d.con.length) return <Man tieuLon="Báo cáo" chat><CanhGiua lv="canh-trong" tieu="Chưa có Con nào" loi="Thêm hồ sơ Con để có báo cáo tuần." /></Man>;
  return (
    <Man tieuLon="Báo cáo" chat>
      {g.d.con.length > 1 ? <ChonMot ds={g.d.con.map((c) => ({ gia: c.id, chu: c.ten }))} gia={con!} doi={setChon} /> : null}
      {con ? <BaoCaoCon key={con} id={con} /> : null}
    </Man>
  );
}

function BaoCaoCon({ id }: { id: string }) {
  const { d, loi, matMang, tai } = useTai(() => bm.goi<BaoCao>(`con/${id}/bao-cao`));
  const xuat = useLam();
  const nay = d?.tuanNay;
  const hocNgay = (ngay: string) => nay?.hocTheoNgay?.find((x) => x.ngay === ngay)?.phut ?? 0;
  const max = Math.max(60, ...(nay?.giaiTriTheoNgay.map((x) => Math.max(x.phut, hocNgay(x.ngay))) ?? [0]));
  return (
    <>
      {!d || !nay ? <ChoTai loi={loi} matMang={matMang} tai={tai} /> : (
        <>
          <Canh lv="canh-tien-do" thap tieu={d.chuGiai[0] ?? `Tuần này của ${d.ten}`} loi={`Học ${gio(nay.phutHoc)} · Giải trí ${gio(nay.tongGiaiTri)}.`} />
          <The dem>
            <View style={{ flexDirection: "row", gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: M.chinh }} /><Chu kieu="dam" co={13} mau={M.chu2}>Học</Chu></View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: "#f5c94a" }} /><Chu kieu="dam" co={13} mau={M.chu2}>Giải trí</Chu></View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 10, height: 120, marginTop: 10, paddingHorizontal: 4 }}
              accessibilityLabel={`Theo ngày: ${nay.giaiTriTheoNgay.map((x) => `${THU[new Date(`${x.ngay}T12:00:00`).getDay()]} học ${hocNgay(x.ngay)}, giải trí ${x.phut} phút`).join("; ")}`}>
              {nay.giaiTriTheoNgay.map((x) => (
                <View key={x.ngay} style={{ flex: 1, alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                  <View style={{ width: "100%", flex: 1, flexDirection: "row", alignItems: "flex-end", gap: 3 }}>
                    <View style={{ flex: 1, height: `${Math.max(2, (hocNgay(x.ngay) / max) * 100)}%`, backgroundColor: M.chinh, borderRadius: 6 }} />
                    <View style={{ flex: 1, height: `${Math.max(2, (x.phut / max) * 100)}%`, backgroundColor: "#f5c94a", borderRadius: 6 }} />
                  </View>
                  <Chu kieu="rat" co={12} mau={M.chu3}>{THU[new Date(`${x.ngay}T12:00:00`).getDay()]}</Chu>
                </View>
              ))}
            </View>
          </The>
          <Luoi2>
            <OSo nho="Nhiệm vụ được duyệt" so={nay.duyet.duoc} phu={`Tuần trước ${d.tuanTruoc.duyet.duoc}`} />
            <OSo nho="Ngoại lệ" so={nay.ngoaiLe} phu={`Tuần trước ${d.tuanTruoc.ngoaiLe}`} />
          </Luoi2>
          {d.chuGiai.slice(1).map((c) => <Chu key={c} co={14} mau={M.chu2}>{`• ${c}`}</Chu>)}
          {nay.dungNhieu?.length ? (
            <>
              <NhomTieu chu="Dùng nhiều nhất" />
              <Nhom>
                {nay.dungNhieu.map((x, i) => (
                  <Dong key={x.muc} dau={i === 0} tieu={x.muc} phu={`${x.loai === "hoc" ? "Học tập" : "Giải trí"} · ${gio(x.phut)}`}
                    trai={<BieuTron ic={x.loai === "hoc" ? "mu" : "game"} mau={x.loai === "hoc" ? undefined : "vang"} />}
                    phai={x.lech !== null && x.lech !== 0 ? <Chu kieu="rat" so mau={(x.lech > 0) === (x.loai === "hoc") ? M.chinhInk : M.loi}>{`${x.lech > 0 ? "+" : "−"}${Math.abs(x.lech)}%`}</Chu> : undefined} />
                ))}
              </Nhom>
            </>
          ) : nay.top.length ? (
            <>
              <NhomTieu chu="Giải trí nhiều nhất" />
              <Nhom>
                {nay.top.map((x, i) => {
                  const cu = d.tuanTruoc.top.find((y) => y.muc === x.muc)?.phut ?? 0;
                  return <Dong key={x.muc} dau={i === 0} tieu={x.muc} phu={`Giải trí · ${gio(x.phut)}`} trai={<BieuTron ic="game" mau="vang" />}
                    phai={cu ? <Chu kieu="rat" so mau={x.phut > cu ? M.loi : M.chinh}>{`${x.phut > cu ? "+" : "−"}${Math.round(Math.abs(x.phut - cu) / cu * 100)}%`}</Chu> : undefined} />;
                })}
              </Nhom>
            </>
          ) : null}
          {!nay.tongGiaiTri && !nay.duyet.duoc ? <CanhGiua lv="canh-trong" tieu="Chưa đủ dữ liệu tuần" loi="Báo cáo đầy đủ có sau vài ngày Con dùng máy." /> : null}
          <BaoLoi loi={xuat.loi} />
          <Nut chu="Xuất CSV (Excel)" ic="tai" loai="vien" rong dangChay={xuat.dangChay} bam={() => xuat.lam(async () => {
            const r = await bm.goi<{ tenTep: string; noiDung: string }>(`con/${id}/bao-cao/csv`);
            await luuTepChu(r.tenTep, r.noiDung);
          })} />
        </>
      )}
    </>
  );
}
