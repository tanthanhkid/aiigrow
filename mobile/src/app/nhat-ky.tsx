// «Nhật ký cả nhà» (thiết kế chốt 15/11 — bm-bao-cao-ngay/04 them-r3dsl3py, #265): ai cho vay sao, ai duyệt, ai đổi cài đặt, con xin / nộp / chơi —
// câu đời thường theo ngày (Hôm nay · Hôm qua · Thứ…), lọc theo con (chip «Tất cả» + từng con, N9). Đầu màn: «7 ngày qua cho vay N lần · S sao ·
// Bà Hoa 3 · Mẹ Lan 1» (`choVay`; máy chủ cũ chỉ có `ngoaiQuyTac` ⇒ dùng làm số lần). Dòng cho vay mang nhãn «vay 30».
// Số liệu: GET nhat-ky?ca-nha=1[&con=] (server/lib/nhat-ky-ca-nha.ts). Mở từ Báo cáo «Nhật ký cả nhà ›» (?con= để lọc sẵn một con).
import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { mauCon, TieuMuc } from "@/lib/hang-ngay";
import { soVN } from "@/lib/so-sao";
import { HangChonBe } from "@/lib/ui-chung";
import { Avt, BieuTron, ChoTai, Chu, Icon3D, M, Man, Nhan, The, useTai } from "@/lib/ui";
import { KHOI } from "@/lib/clay";

type Dong = { luc: string; ngay: string; con: string | null; tenCon: string | null; nguoi: string | null; tenNguoi: string | null; baMe?: boolean;
  tieu: string; phu: string; nhan: string | null; kieu: "tot" | "xau" | "cho" | "ngoai" | "thuong" };
type NhatKy = { soNgay: number; ds: Dong[]; /** 15/11 */ choVay?: { so: number; sao: number; theoNguoi: { ten: string; so: number; sao: number }[] };
  /** (cũ) = số lần cho vay */ ngoaiQuyTac?: { so: number; theoNguoi: { ten: string; so: number }[] } };

const THU = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const ngayDp = (t: Date) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
/** «2026-11-03» → «Hôm nay · Thứ Ba 3/11» / «Hôm qua · Thứ Hai 2/11» / «Chủ nhật 1/11». */
function tieuNgay(ngay: string) {
  const t = new Date(`${ngay}T12:00:00`), nay = new Date(), qua = new Date(Date.now() - 86_400_000);
  const ten = `${THU[t.getDay()]} ${t.getDate()}/${t.getMonth() + 1}`;
  return ngay === ngayDp(nay) ? `Hôm nay · ${ten}` : ngay === ngayDp(qua) ? `Hôm qua · ${ten}` : ten;
}
/** Chữ cái đại diện người lớn: «Mẹ Lan» → «L», «Bà Hoa» → «H». */
const chuCai = (ten: string) => (ten.trim().split(/\s+/).pop() ?? ten).charAt(0).toUpperCase();
const LOAI_NHAN: Record<Dong["kieu"], "ok" | "canh" | "loi" | "xam" | "lam" | "diem" | "tim"> = { tot: "diem", xau: "xam", cho: "canh", ngoai: "canh", thuong: "xam" };
/** Nhãn dòng: «Ba Mẹ cho vay 30 sao» ⇒ «vay 30» (thiết kế 04). */
const nhanDong = (x: Dong) => { const m = x.nhan === "Cho vay" ? /cho vay (\d+) sao/.exec(x.tieu) : null; return m ? `vay ${m[1]}` : x.nhan; };

export default function NhatKyCaNha() {
  const { con: conVao } = useLocalSearchParams<{ con?: string }>();
  const [loc, setLoc] = useState<string | null>(conVao ?? null);
  const g = useTai(() => bm.goi<GiaDinh>("gia-dinh"));
  const cacCon = g.d?.con ?? [];
  return (
    <Man lui={{ chu: "Báo cáo" }} tieuLon="Nhật ký cả nhà" tai={g.tai}>
      {cacCon.length > 1 ? (
        <HangChonBe ds={cacCon} chon={loc} doi={(x) => setLoc(x?.id ?? null)} tatCa tenNgan />
      ) : null}
      <DanhSach key={loc ?? ""} loc={loc} cacCon={cacCon} />
    </Man>
  );
}

/** Danh sách theo bộ lọc — đổi lọc ⇒ đổi key ⇒ tải lại (useTai giữ hàm tải của lần vẽ đầu). */
function DanhSach({ loc, cacCon }: { loc: string | null; cacCon: GiaDinh["con"] }) {
  const { d, loi, matMang, tai } = useTai(() => bm.goi<NhatKy>(`nhat-ky?ca-nha=1&ngay=7${loc ? `&con=${encodeURIComponent(loc)}` : ""}`));
  const thuCon = (id: string | null) => Math.max(0, cacCon.findIndex((c) => c.id === id));
  const vay = d?.choVay ? { so: d.choVay.so, sao: d.choVay.sao as number | null, theoNguoi: d.choVay.theoNguoi }
    : { so: d?.ngoaiQuyTac?.so ?? 0, sao: null as number | null, theoNguoi: d?.ngoaiQuyTac?.theoNguoi ?? [] };
  const theoNgay: { ngay: string; ds: Dong[] }[] = [];
  for (const x of d?.ds ?? []) {
    const n = theoNgay[theoNgay.length - 1];
    if (n && n.ngay === x.ngay) n.ds.push(x); else theoNgay.push({ ngay: x.ngay, ds: [x] });
  }
  return (
    <>
      {!d ? <ChoTai loi={loi} matMang={matMang} tai={tai} /> : (
        <>
          {vay.so ? (
            // thiết kế 04: dải đào nổi — ô icon sao · «7 ngày qua cho vay 4 lần · 75 sao» · «Bà Hoa 3 · Mẹ Lan 1»
            <View style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 24, backgroundColor: M.canhSoft }, KHOI.the]}>
              <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: M.chonSoft, alignItems: "center", justifyContent: "center" }}><Icon3D ten="sao" co={24} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Chu kieu="rat" co={14.5}>{`${d.soNgay} ngày qua cho vay ${vay.so} lần${vay.sao !== null ? ` · ${soVN(vay.sao)} sao` : ""}`}</Chu>
                <Chu kieu="dam" co={12.5} mau={M.canh}>{vay.theoNguoi.map((x) => `${x.ten} ${x.so}`).join(" · ")}</Chu>
              </View>
            </View>
          ) : null}
          {!d.ds.length ? <Chu co={14} mau={M.chu3} style={{ marginHorizontal: 6 }}>{`${d.soNgay} ngày qua chưa có việc gì.`}</Chu> : null}
          {theoNgay.map((n) => (
            <View key={n.ngay} style={{ gap: 8 }}>
              <TieuMuc chu={tieuNgay(n.ngay)} />
              <The style={{ paddingVertical: 4 }}>
                {n.ds.map((x, k) => (
                  <View key={`${x.luc}:${k}`} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 8, borderTopWidth: k ? 1 : 0, borderTopColor: M.vien }}>
                    {(x.nguoi && x.tenNguoi) || x.baMe ? <Avt ten={chuCai(x.tenNguoi ?? "Ba Mẹ")} mau={M.lam} co={40} />
                      : x.con && x.tenCon ? <Avt ten={x.tenCon} mau={mauCon(cacCon.find((c) => c.id === x.con)?.avatar, thuCon(x.con))} co={40} con={cacCon.find((c) => c.id === x.con)} />
                      : <BieuTron ic="khien" mau="xam" />}
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Chu kieu="rat" co={15}>{x.tieu}</Chu>
                      <Chu co={13} mau={M.chu3}>{x.phu}</Chu>
                    </View>
                    {nhanDong(x) ? <Nhan chu={nhanDong(x)!} loai={LOAI_NHAN[x.kieu]} /> : null}
                  </View>
                ))}
              </The>
            </View>
          ))}
        </>
      )}
    </>
  );
}
