// Tab «Báo cáo» (thiết kế chốt 14/11 — bm-bao-cao-ngay/01 «Tab Báo cáo», 02 «Báo cáo · Bảo Minh»): «7 ngày qua», chip đổi con (N9),
// «Giờ chơi của <Con> · 28/10 – 3/11» (giờ chơi / quỹ 7 ngày, so 7 ngày trước — hoặc «Trong quỹ cả 7 ngày»), biểu đồ 7 cột (trong quỹ · quá giờ),
// «Nay: 42′, còn 18′», «Dùng nhiều nhất» (app · máy · Chơi/Học — «Xem hết ›» → Hôm nay con dùng gì), «Sao và giờ thêm» (sao kiếm + việc đã làm +
// phút đã đổi; số lần con xin thêm giờ · Ba Mẹ cho mấy lần), gợi ý của Grow, «Nhật ký cả nhà ›» (MỚI).
// Số liệu: GET con/:id/bao-cao?bay=1 (7 ngày tính tới hôm nay), con/:id/gio-choi, con/:id/quy, con/:id/vi. Chỉ tên app + thời lượng.
// «Xuất CSV» giữ (một dòng nhỏ cuối màn — thiết kế không nói ⇒ giữ hành vi cũ).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type Diem, type GiaDinh } from "@/lib/api";
import { ChipCon, HangViec, TieuMuc, type GioChoi, type QuyCon } from "@/lib/hang-ngay";
import { BaoLoi, Canh, CanhGiua, ChoTai, Chu, M, Man, Nhan, The, useLam, useTai } from "@/lib/ui";
import { ChuGiai, CotClay } from "@/lib/bieu-do";
import { luuTepChu } from "@/lib/luu-tep";

type Tuan = { giaiTriTheoNgay: { ngay: string; phut: number }[]; tongGiaiTri: number; phutHoc: number; duyet: { duoc: number; tu_choi: number }; ngoaiLe: number;
  top: { muc: string; phut: number }[]; dungNhieu?: { muc: string; ten?: string; loai: string; phut: number; may?: string | null; lech: number | null }[];
  /** 14/11: số lần con xin thêm giờ / được cho; sao kiếm trong 7 ngày (máy chủ cũ không gửi) */ xinThemGio?: { so: number; cho: number }; saoKiem?: number };
type BaoCao = { ten: string; tuanNay: Tuan; tuanTruoc: Tuan; chuGiai: string[] };
const THU = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const THU_DAI = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
/** 385 → «6 giờ 25»; 45 → «45 phút». */
const gio = (p: number) => (p >= 60 ? `${Math.floor(p / 60)} giờ${p % 60 ? ` ${String(p % 60).padStart(2, "0")}` : ""}` : `${p} phút`);
const gioNgan = (p: number) => (p >= 60 ? `${Math.floor(p / 60)}g ${String(p % 60).padStart(2, "0")}` : `${p}′`);
const ngayNgan = (ngay: string) => `${Number(ngay.slice(8, 10))}/${Number(ngay.slice(5, 7))}`;
const thuCua = (ngay: string) => new Date(`${ngay}T12:00:00`).getDay();

export default function TabBaoCao() {
  const g = useTai(() => bm.goi<GiaDinh>("gia-dinh"), "tab:bao-cao");
  const { con: conVao } = useLocalSearchParams<{ con?: string }>();
  const [chon, setChon] = useState<string | null>(null);
  // tab giữ trạng thái giữa các lần mở ⇒ mở từ màn của một Con (?con=) thì Con đó thắng lựa chọn chip cũ (review PR #183)
  const [vaoCu, setVaoCu] = useState(conVao);
  if (conVao !== vaoCu) { setVaoCu(conVao); setChon(null); }
  const con = chon ?? (conVao && g.d?.con.some((c) => c.id === conVao) ? conVao : g.d?.con[0]?.id) ?? null;
  const dau = (
    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10, marginHorizontal: 4, marginTop: 4 }}>
      <Chu kieu="rat" co={28} style={{ letterSpacing: -0.6 }}>Báo cáo</Chu>
      <Chu kieu="dam" co={14} mau={M.chu2}>7 ngày qua</Chu>
    </View>
  );
  if (!g.d) return <View style={{ flex: 1 }}><Man chat>{dau}<ChoTai loi={g.loi} matMang={g.matMang} tai={g.tai} /></Man></View>;
  if (!g.d.con.length) return <View style={{ flex: 1 }}><Man chat>{dau}<CanhGiua lv="canh-trong" tieu="Chưa có con nào" loi="Thêm hồ sơ con để có báo cáo." /></Man></View>;
  return (
    <View style={{ flex: 1 }}>
      <Man chat tai={g.tai}>
        {dau}
        {g.d.con.length > 1 ? <ChipCon ds={g.d.con} chon={con!} doi={(x) => setChon(x.id)} /> : null}
        {con ? <BaoCaoCon key={con} id={con} /> : null}
      </Man>
    </View>
  );
}

function BaoCaoCon({ id }: { id: string }) {
  const { d, loi, matMang, tai } = useTai(async () => {
    const [bc, gc, qy, vi] = await Promise.all([bm.goi<BaoCao>(`con/${id}/bao-cao?bay=1`), bm.goi<GioChoi>(`con/${id}/gio-choi`).catch(() => null),
      bm.goi<QuyCon>(`con/${id}/quy`).catch(() => null), bm.goi<{ lichSu: Diem[] }>(`con/${id}/vi`).catch(() => null)]);
    return { bc, gc, qy, vi };
  });
  const xuat = useLam();
  if (!d) return <ChoTai loi={loi} matMang={matMang} tai={tai} />;
  const { bc, gc } = d;
  const nay = bc.tuanNay;
  const ngay = nay.giaiTriTheoNgay;
  const homNay = ngay[ngay.length - 1]?.ngay;
  const quyNgay = (n: string) => (gc ? ([0, 6].includes(thuCua(n)) ? gc.quyCuoiTuan : gc.quyNgayThuong) : null);
  const tongQuy = gc ? ngay.reduce((a, x) => a + (quyNgay(x.ngay) ?? 0), 0) : null;
  const lech = nay.tongGiaiTri - bc.tuanTruoc.tongGiaiTri;
  const qua = ngay.map((x) => ({ ...x, qua: Math.max(0, x.phut - (quyNgay(x.ngay) ?? x.phut)) })).filter((x) => x.qua > 0).sort((a, b) => b.qua - a.qua);
  const max = Math.max(60, ...ngay.map((x) => Math.max(x.phut, quyNgay(x.ngay) ?? 0)));
  // phút đã đổi = các lần «Đổi N sao lấy P phút chơi» trong 7 ngày (so theo NGÀY ĐỊA PHƯƠNG; ví chỉ trả ≤100 dòng gần nhất)
  const dau = ngay[0]?.ngay;
  const ngayDp = (iso: string) => { const t = new Date(iso); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; };
  const trongTuan = (d.vi?.lichSu ?? []).filter((x) => dau && ngayDp(x.created_at) >= dau);
  const saoTuan = nay.saoKiem ?? trongTuan.filter((x) => x.delta > 0 && x.loai !== "hoan").reduce((a, x) => a + x.delta, 0);
  const phutDoi = trongTuan.filter((x) => x.loai === "doi_gio").reduce((a, x) => a + Number(/lấy (\d+) phút/.exec(x.ly_do)?.[1] ?? 0), 0);
  const dung = nay.dungNhieu?.length ? nay.dungNhieu.slice(0, 3) : nay.top.slice(0, 3).map((x) => ({ ...x, ten: undefined, loai: "giai_tri", may: null, lech: null }));
  const quyHn = d.qy?.quy;
  const xin = nay.xinThemGio ?? { so: nay.ngoaiLe, cho: nay.ngoaiLe };
  const xemDung = () => router.push(`/da-dung/${id}` as never);
  return (
    <>
      <The dem style={{ gap: 8 }}>
        <Chu kieu="dam" co={13.5} mau={M.chu3}>{`Giờ chơi của ${bc.ten}${ngay.length ? ` · ${ngayNgan(ngay[0].ngay)} – ${ngayNgan(ngay[ngay.length - 1].ngay)}` : ""}`}</Chu>
        <Chu kieu="rat" co={26} so>{gio(nay.tongGiaiTri)}{tongQuy ? <Chu kieu="dam" co={15} mau={M.chu3}>{` / quỹ ${gio(tongQuy)}`}</Chu> : null}</Chu>
        {!qua.length && nay.tongGiaiTri ? <Chu co={13.5} mau={M.chinhInk}>Trong quỹ cả 7 ngày</Chu>
          : bc.tuanTruoc.tongGiaiTri ? <Chu co={13.5} mau={lech > 0 ? M.loi : M.chinhInk}>{lech === 0 ? "Bằng 7 ngày trước" : `${lech > 0 ? "Nhiều" : "Ít"} hơn 7 ngày trước ${gio(Math.abs(lech))}`}</Chu> : null}
        <CotClay max={max} cao={128} nhanDoc="Giờ chơi theo ngày"
          ds={ngay.map((x) => {
            const q = quyNgay(x.ngay), trong = q === null ? x.phut : Math.min(x.phut, q), ngoai = x.phut - trong;
            const nhan = x.ngay === homNay ? "Nay" : THU[thuCua(x.ngay)];
            return { khoa: x.ngay, nhan, doc: `${nhan}: ${gio(x.phut)}${ngoai ? `, quá ${gio(ngoai)}` : ""}`,
              phan: [{ gia: trong, mau: M.chinh }, { gia: ngoai, mau: M.huy }] };
          })} />
        <ChuGiai ds={[{ chu: "Trong quỹ", mau: M.chinh }, { chu: "Quá giờ", mau: M.huy }]} />
        {gc || quyHn ? (
          <Chu co={13} mau={M.chu3}>
            {[gc ? `Quỹ ${gc.quyNgayThuong}′/ngày` : null, quyHn ? `Nay: ${quyHn.daDung}′, còn ${quyHn.conPhut}′` : null].filter(Boolean).join(" · ")}
          </Chu>
        ) : null}
      </The>

      {dung.length ? (
        <>
          <TieuMuc chu="Dùng nhiều nhất" phai={{ chu: "Xem hết ›", bam: xemDung }} />
          <The dem style={{ paddingVertical: 4 }}>
            {dung.map((x, k) => (
              <HangViec key={x.muc} dau={k === 0} ic={x.loai === "hoc" ? "may_tinh" : "game"} mau={x.loai === "hoc" ? "xanh" : "tim"} tieu={x.ten ?? x.muc}
                phu={x.may ? x.may.replace(/ của .*$/, "") : x.loai === "hoc" ? "Không trừ giờ chơi" : "Tính vào giờ chơi"}
                phai={<View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Nhan chu={x.loai === "hoc" ? "Học" : "Chơi"} loai={x.loai === "hoc" ? "ok" : "canh"} />
                  <Chu kieu="rat" co={14} so>{gioNgan(x.phut)}</Chu>
                </View>}
                bam={xemDung} />
            ))}
          </The>
        </>
      ) : null}

      <TieuMuc chu="Sao và giờ thêm" />
      <The dem style={{ paddingVertical: 4 }}>
        <HangViec dau ic="sao" mau="vang" tieu={`${saoTuan} sao`}
          phu={`Làm ${nay.duyet.duoc} việc · ${phutDoi ? `đã đổi ${phutDoi} phút chơi` : "chưa đổi"}`} bam={() => router.push(`/vi/${id}` as never)} />
        <HangViec ic="dongho" mau="cam" tieu={`${xin.so} lần`} phu={`Con xin thêm giờ · Ba Mẹ cho ${xin.cho} lần`} bam={() => router.push(`/yeu-cau?con=${id}` as never)} />
      </The>

      {qua.length ? (
        <Pressable onPress={() => router.push(`/gio/ngu?con=${id}` as never)} accessibilityRole="button">
          <Canh lv="chi" thap mau="vang" tieu={`${THU_DAI[thuCua(qua[0].ngay)]} ${bc.ten} chơi quá ${gio(qua[0].qua)}.`} loi="Đặt giờ ngủ sớm hơn ›" />
        </Pressable>
      ) : !nay.duyet.duoc && nay.tongGiaiTri ? (
        <Pressable onPress={() => router.push(`/giao-nv?con=${id}` as never)} accessibilityRole="button">
          <Canh lv="chi" thap mau="vang" tieu={`Ngày của ${bc.ten} còn trống.`} loi="Thêm vào ngày của con ›" />
        </Pressable>
      ) : null}

      <The dem style={{ paddingVertical: 4 }}>
        <HangViec dau ic="lich" mau="lam" tieu="Nhật ký cả nhà" phu="Ai cho giờ, ai duyệt, ai đổi cài đặt" bam={() => router.push("/nhat-ky" as never)} />
      </The>

      {!nay.tongGiaiTri && !nay.duyet.duoc ? <CanhGiua lv="canh-trong" tieu="Chưa đủ dữ liệu" loi="Báo cáo đầy đủ có sau vài ngày con dùng máy." /> : null}
      <BaoLoi loi={xuat.loi} />
      <Pressable onPress={() => xuat.lam(async () => { const r = await bm.goi<{ tenTep: string; noiDung: string }>(`con/${id}/bao-cao/csv`); await luuTepChu(r.tenTep, r.noiDung); })}
        accessibilityRole="button" disabled={xuat.dangChay} style={{ minHeight: 44, justifyContent: "center", alignSelf: "center" }}>
        <Chu kieu="rat" co={14} mau={M.chinhInk}>{xuat.dangChay ? "Đang xuất…" : "Xuất báo cáo tuần (CSV cho Excel)"}</Chu>
      </Pressable>
    </>
  );
}
