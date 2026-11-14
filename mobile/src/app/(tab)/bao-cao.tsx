// Tab «Báo cáo» (thiết kế chốt 05/11, bm-hang-ngay/44): khoảng tuần, chip đổi con, «Tuần này <Con> dùng máy» (giờ giải trí / quỹ cả tuần, so tuần trước),
// biểu đồ 7 cột (trong quỹ · quá giờ · vạch quỹ mỗi ngày), «Dùng nhiều nhất», «Sao và giờ thêm» (sao kiếm tuần này, việc đã làm, phút đã đổi; lần xin
// thêm giờ), gợi ý của Grow khi có ngày quá giờ. Số liệu: GET con/:id/bao-cao, con/:id/gio-choi, con/:id/vi. Chỉ tên app/tên miền + thời lượng.
// «Xuất CSV» giữ (một dòng nhỏ cuối màn).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type Diem, type GiaDinh } from "@/lib/api";
import { ChipCon, HangViec, type GioChoi } from "@/lib/hang-ngay";
import { BaoLoi, Canh, CanhGiua, ChoTai, Chu, M, Man, The, useLam, useTai } from "@/lib/ui";
import { ChuGiai, CotClay } from "@/lib/bieu-do";
import { luuTepChu } from "@/lib/luu-tep";

type Tuan = { giaiTriTheoNgay: { ngay: string; phut: number }[]; tongGiaiTri: number; phutHoc: number; duyet: { duoc: number; tu_choi: number }; ngoaiLe: number;
  top: { muc: string; phut: number }[]; dungNhieu?: { muc: string; loai: string; phut: number; lech: number | null }[] };
type BaoCao = { ten: string; tuanNay: Tuan; tuanTruoc: Tuan; chuGiai: string[] };
const THU = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const THU_DAI = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
/** 380 → «6 giờ 20»; 45 → «45 phút». */
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
  if (!g.d) return <View style={{ flex: 1 }}><Man tieuLon="Báo cáo" chat><ChoTai loi={g.loi} matMang={g.matMang} tai={g.tai} /></Man></View>;
  if (!g.d.con.length) return <View style={{ flex: 1 }}><Man tieuLon="Báo cáo" chat><CanhGiua lv="canh-trong" tieu="Chưa có con nào" loi="Thêm hồ sơ con để có báo cáo tuần." /></Man></View>;
  return (
    <View style={{ flex: 1 }}>
      <Man tieuLon="Báo cáo" chat tai={g.tai}>
        {g.d.con.length > 1 ? <ChipCon ds={g.d.con} chon={con!} doi={(x) => setChon(x.id)} /> : null}
        {con ? <BaoCaoCon key={con} id={con} /> : null}
      </Man>
    </View>
  );
}

function BaoCaoCon({ id }: { id: string }) {
  const { d, loi, matMang, tai } = useTai(async () => {
    const [bc, gc, vi] = await Promise.all([bm.goi<BaoCao>(`con/${id}/bao-cao`), bm.goi<GioChoi>(`con/${id}/gio-choi`).catch(() => null),
      bm.goi<{ lichSu: Diem[] }>(`con/${id}/vi`).catch(() => null)]);
    return { bc, gc, vi };
  });
  const xuat = useLam();
  if (!d) return <ChoTai loi={loi} matMang={matMang} tai={tai} />;
  const { bc, gc } = d;
  const nay = bc.tuanNay;
  const ngay = nay.giaiTriTheoNgay;
  const quyNgay = (n: string) => (gc ? ([0, 6].includes(thuCua(n)) ? gc.quyCuoiTuan : gc.quyNgayThuong) : null);
  const tongQuy = gc ? ngay.reduce((a, x) => a + (quyNgay(x.ngay) ?? 0), 0) : null;
  const lech = nay.tongGiaiTri - bc.tuanTruoc.tongGiaiTri;
  const qua = ngay.map((x) => ({ ...x, qua: Math.max(0, x.phut - (quyNgay(x.ngay) ?? x.phut)) })).filter((x) => x.qua > 0).sort((a, b) => b.qua - a.qua);
  const max = Math.max(60, ...ngay.map((x) => Math.max(x.phut, quyNgay(x.ngay) ?? 0)));
  // sao tuần này: cộng các lần nhận sao (delta > 0, trừ hoàn) từ đầu tuần của báo cáo; phút đã đổi = các lần «Đổi N sao lấy P phút chơi»
  const dau = ngay[0]?.ngay;
  // so theo NGÀY ĐỊA PHƯƠNG (created_at là UTC: 00:00–06:59 thứ Hai giờ VN vẫn là Chủ nhật UTC). Ví chỉ trả ≤100 dòng gần nhất ⇒ nhà giao dịch nhiều có thể đếm thiếu.
  const ngayDp = (iso: string) => { const t = new Date(iso); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`; };
  const trongTuan = (d.vi?.lichSu ?? []).filter((x) => dau && ngayDp(x.created_at) >= dau);
  const saoTuan = trongTuan.filter((x) => x.delta > 0 && x.loai !== "hoan").reduce((a, x) => a + x.delta, 0);
  const phutDoi = trongTuan.filter((x) => x.loai === "doi_gio").reduce((a, x) => a + Number(/lấy (\d+) phút/.exec(x.ly_do)?.[1] ?? 0), 0);
  const dung = nay.dungNhieu?.length ? nay.dungNhieu.slice(0, 3) : nay.top.slice(0, 3).map((x) => ({ ...x, loai: "giai_tri", lech: null }));
  return (
    <>
      {ngay.length ? <Chu kieu="dam" co={14} mau={M.chu3} style={{ marginHorizontal: 4 }}>{`${ngayNgan(ngay[0].ngay)} – ${ngayNgan(ngay[ngay.length - 1].ngay)}`}</Chu> : null}
      <Pressable onPress={() => router.push(`/man-hinh/${id}` as never)} accessibilityRole="button">
        <The dem style={{ gap: 8 }}>
          <Chu kieu="dam" co={13.5} mau={M.chu3}>{`Tuần này ${bc.ten} dùng máy`}</Chu>
          <Chu kieu="rat" co={26} so>{gio(nay.tongGiaiTri)}{tongQuy ? <Chu kieu="dam" co={15} mau={M.chu3}>{` / quỹ ${gio(tongQuy)}`}</Chu> : null}</Chu>
          {bc.tuanTruoc.tongGiaiTri ? <Chu co={13.5} mau={lech > 0 ? M.loi : M.chinhInk}>{lech === 0 ? "Bằng tuần trước" : `${lech > 0 ? "Nhiều" : "Ít"} hơn tuần trước ${gio(Math.abs(lech))}`}</Chu> : null}
          <CotClay max={max} cao={128} nhanDoc="Giờ chơi theo ngày"
            ds={ngay.map((x) => {
              const q = quyNgay(x.ngay), trong = q === null ? x.phut : Math.min(x.phut, q), ngoai = x.phut - trong;
              return { khoa: x.ngay, nhan: THU[thuCua(x.ngay)], doc: `${THU[thuCua(x.ngay)]}: ${gio(x.phut)}${ngoai ? `, quá ${gio(ngoai)}` : ""}`,
                phan: [{ gia: trong, mau: M.chinh }, { gia: ngoai, mau: M.huy }] };
            })} />
          <ChuGiai ds={[{ chu: "Trong quỹ", mau: M.chinh }, { chu: "Quá giờ", mau: M.huy }]} />
        </The>
      </Pressable>

      {dung.length ? (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 6, marginHorizontal: 4 }}>
            <Chu kieu="rat" co={17} style={{ flex: 1 }}>Dùng nhiều nhất</Chu>
            <Pressable onPress={() => router.push(`/man-hinh/${id}` as never)} hitSlop={10} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}>
              <Chu kieu="rat" co={14} mau={M.chinhInk}>Xem hết ›</Chu>
            </Pressable>
          </View>
          <The dem style={{ paddingVertical: 4 }}>
            {dung.map((x, k) => (
              <HangViec key={x.muc} dau={k === 0} ic={x.loai === "hoc" ? "mu" : "game"} mau={x.loai === "hoc" ? "xanh" : "tim"} tieu={x.muc}
                phu={x.loai === "hoc" ? "Học · không tính giờ" : "Tính vào giờ chơi"} phai={<Chu kieu="rat" co={14} so>{gioNgan(x.phut)}</Chu>}
                bam={() => router.push(`/man-hinh/${id}` as never)} />
            ))}
          </The>
        </>
      ) : null}

      <Chu kieu="rat" co={17} style={{ marginTop: 6, marginHorizontal: 4 }}>Sao và giờ thêm</Chu>
      <The dem style={{ paddingVertical: 4 }}>
        <HangViec dau ic="sao" mau="vang" tieu={`${saoTuan} sao`} phu={`Làm ${nay.duyet.duoc} việc${phutDoi ? ` · đã đổi ${phutDoi} phút chơi` : ""}`}
          bam={() => router.push(`/vi/${id}` as never)} />
        <HangViec ic="dongho" mau="cam" tieu={`${nay.ngoaiLe} lần`} phu="Ba Mẹ cho thêm giờ / mở ngoại lệ" bam={() => router.push(`/gio/${id}` as never)} />
      </The>

      {qua.length ? (
        <Pressable onPress={() => router.push(`/gio/ngu?con=${id}` as never)} accessibilityRole="button">
          <Canh lv="chi" thap mau="vang" tieu={`${THU_DAI[thuCua(qua[0].ngay)]} ${bc.ten} chơi quá ${gio(qua[0].qua)}`} loi="Đặt giờ ngủ sớm hơn ›" />
        </Pressable>
      ) : null}
      {!nay.tongGiaiTri && !nay.duyet.duoc ? <CanhGiua lv="canh-trong" tieu="Chưa đủ dữ liệu tuần" loi="Báo cáo đầy đủ có sau vài ngày con dùng máy." /> : null}
      <BaoLoi loi={xuat.loi} />
      <Pressable onPress={() => xuat.lam(async () => { const r = await bm.goi<{ tenTep: string; noiDung: string }>(`con/${id}/bao-cao/csv`); await luuTepChu(r.tenTep, r.noiDung); })}
        accessibilityRole="button" disabled={xuat.dangChay} style={{ minHeight: 44, justifyContent: "center", alignSelf: "center" }}>
        <Chu kieu="rat" co={14} mau={M.chinhInk}>{xuat.dangChay ? "Đang xuất…" : "Xuất báo cáo tuần (CSV cho Excel)"}</Chu>
      </Pressable>
    </>
  );
}
