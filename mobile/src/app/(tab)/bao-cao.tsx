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
import { HangViec, TieuMuc, type GioChoi, type QuyCon } from "@/lib/hang-ngay";
import { DaiCon, OLomIcon } from "@/lib/ui-viec";
import { BaoLoi, CanhGiua, ChoTai, Chu, Icon3D, M, Man, NhanMen, Rob, The, useLam, useTai } from "@/lib/ui";
import { ChuGiaiVuong, CotGioChoi } from "@/lib/bieu-do";
import { KHOI } from "@/lib/clay";
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
/** «Nguyễn Ngọc Bảo Anh» → «Bảo Anh» (thiết kế gọi con bằng tên gọi). */
const tenGoi = (ten: string) => ten.trim().split(/\s+/).slice(-2).join(" ");
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
    // thiết kế .top: «Báo cáo» 28/800 + viên «7 ngày qua» nổi bên phải
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 4, marginTop: 4 }}>
      <Chu kieu="den" co={28} style={{ flex: 1, letterSpacing: -0.6 }}>Báo cáo</Chu>
      <View style={{ height: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: "#f7f6f3", justifyContent: "center", ...KHOI.nho }}>
        <Chu kieu="rat" co={13} mau={M.chinhInk}>7 ngày qua</Chu>
      </View>
    </View>
  );
  if (!g.d) return <View style={{ flex: 1 }}><Man>{dau}<ChoTai loi={g.loi} matMang={g.matMang} tai={g.tai} /></Man></View>;
  if (!g.d.con.length) return <View style={{ flex: 1 }}><Man>{dau}<CanhGiua lv="canh-trong" tieu="Chưa có con nào" loi="Thêm hồ sơ con để có báo cáo." /></Man></View>;
  return (
    <View style={{ flex: 1 }}>
      <Man tai={g.tai}>
        {dau}
        {g.d.con.length > 1 ? <DaiCon ds={g.d.con} chon={con!} doi={(x) => setChon(x.id)} /> : null}
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
      <Pressable onPress={xemDung} accessibilityRole="button" accessibilityHint="Mở «Hôm nay con dùng gì»">
        <The dem style={{ gap: 2, padding: 18 }}>
          <Chu kieu="dam7" co={14} mau="#565c59">{`Giờ chơi của ${tenGoi(bc.ten)}${ngay.length ? ` · ${ngayNgan(ngay[0].ngay)} – ${ngayNgan(ngay[ngay.length - 1].ngay)}` : ""}`}</Chu>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <Chu kieu="rat" co={38} so style={{ letterSpacing: -1 }}>{gio(nay.tongGiaiTri)}</Chu>
            {tongQuy ? <Chu kieu="dam7" co={15} mau="#565c59">{`/ quỹ ${gio(tongQuy)}`}</Chu> : null}
          </View>
          {(() => {
            const cau = !qua.length && nay.tongGiaiTri ? "Trong quỹ cả 7 ngày"
              : bc.tuanTruoc.tongGiaiTri ? (lech === 0 ? "Bằng 7 ngày trước" : `${lech > 0 ? "Nhiều" : "Ít"} hơn 7 ngày trước ${gio(Math.abs(lech))}`) : null;
            const xau = lech > 0 && !!qua.length;
            return cau ? (
              <View style={{ alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 13, backgroundColor: xau ? "#fbe3d3" : "#dcebe6" }}>
                <Chu kieu="rat" co={13} mau={xau ? "#8a3c0c" : M.chinhInk}>{cau}</Chu>
              </View>
            ) : null;
          })()}
          <CotGioChoi max={max} nhanDoc="Giờ chơi theo ngày"
            ds={ngay.map((x) => {
              const q = quyNgay(x.ngay), ngoai = q === null ? 0 : Math.max(0, x.phut - q);
              const laNay = x.ngay === homNay, nhan = laNay ? "Nay" : THU[thuCua(x.ngay)];
              return { khoa: x.ngay, nhan, nay: laNay, phut: x.phut, quy: q, doc: `${nhan}: ${gio(x.phut)}${ngoai ? `, quá ${gio(ngoai)}` : ""}` };
            })} />
          <ChuGiaiVuong ds={[{ chu: "Trong quỹ", mau: M.chinh }, { chu: "Quá giờ", mau: "#e2660f" },
            ...(gc ? [{ chu: `Quỹ ${gc.quyNgayThuong}′/ngày`, dut: true }] : []), ...(quyHn ? [{ chu: `Nay: ${quyHn.daDung}′, còn ${quyHn.conPhut}′` }] : [])]} />
        </The>
      </Pressable>

      {dung.length ? (
        <>
          <TieuMuc chu="Dùng nhiều nhất" phai={{ chu: "Xem hết ›", bam: xemDung }} />
          <The dem style={{ paddingVertical: 4, paddingHorizontal: 12 }}>
            {dung.map((x, k) => {
              const hoc = x.loai === "hoc";
              return (
                <HangViec key={x.muc} dau={k === 0} trai={<OLomIcon ic={hoc ? (/điển|sách/i.test(x.ten ?? x.muc) ? "sach" : "may_tinh") : "game"} />} tieu={x.ten ?? x.muc}
                  phu={x.may ? x.may.replace(/ của .*$/, "").replace(/ · .*$/, "") : hoc ? "Không trừ giờ chơi" : "Tính vào giờ chơi"}
                  phai={<View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 11, backgroundColor: hoc ? "#ecebe7" : "#dcebe6" }}>
                    <Chu kieu="rat" co={12.5} so mau={hoc ? M.chu2 : M.chinhInk}>{`${hoc ? "Học" : "Chơi"} ${gioNgan(x.phut)}`}</Chu>
                  </View>}
                  bam={xemDung} />
              );
            })}
          </The>
        </>
      ) : null}

      <TieuMuc chu="Sao và giờ thêm" />
      {/* thiết kế .hai: hai ô cạnh nhau — ô vàng «N sao» (→ Ví sao) · ô «N lần» con xin thêm giờ (→ Con xin dùng) */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <NhanMen onPress={() => router.push(`/vi/${id}` as never)} accessibilityRole="button" muc="khoi" sang
          style={{ flex: 1, minHeight: 124, padding: 16, borderRadius: 26, backgroundColor: "#fdeab0", backgroundImage: "linear-gradient(#ffe39a, #fbecc0)", ...KHOI.the }}>
          <Icon3D ten="sao" co={32} />
          <Chu kieu="rat" co={26} so style={{ marginTop: 6, letterSpacing: -0.5 }}>{`${saoTuan} sao`}</Chu>
          <Chu kieu="dam7" co={12.5} mau="#6e4300" style={{ lineHeight: 17 }}>{`Làm ${nay.duyet.duoc} việc · ${phutDoi ? `đã đổi ${phutDoi} phút chơi` : "chưa đổi"} ›`}</Chu>
        </NhanMen>
        <NhanMen onPress={() => router.push(`/yeu-cau?con=${id}` as never)} accessibilityRole="button" muc="khoi" sang
          style={{ flex: 1, minHeight: 124, padding: 16, borderRadius: 26, backgroundColor: "#f7f6f3", ...KHOI.the }}>
          <Icon3D ten="dongho" co={32} />
          <Chu kieu="rat" co={26} so style={{ marginTop: 6, letterSpacing: -0.5 }}>{`${xin.so} lần`}</Chu>
          <Chu kieu="dam7" co={12.5} mau="#565c59" style={{ lineHeight: 17 }}>{`Con xin thêm giờ · Ba Mẹ cho ${xin.cho} lần ›`}</Chu>
        </NhanMen>
      </View>

      {qua.length || (!nay.duyet.duoc && nay.tongGiaiTri) ? (
        // thiết kế .rob: thẻ ngọc nhạt, Grow 58 trái, câu 14/700 + liên kết đậm
        <NhanMen onPress={() => router.push((qua.length ? `/gio/ngu?con=${id}` : `/giao-nv?con=${id}`) as never)} accessibilityRole="button" muc="khoi" sang
          style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 28, backgroundColor: "#dcebe6", ...KHOI.the }}>
          <Rob ten="chi" co={58} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Chu kieu="dam7" co={14} mau={M.chinhInk} style={{ lineHeight: 20 }}>
              {qua.length ? `${THU_DAI[thuCua(qua[0].ngay)]} ${tenGoi(bc.ten)} chơi quá ${gio(qua[0].qua)}.` : `Ngày của ${tenGoi(bc.ten)} còn trống.`}
            </Chu>
            <View style={{ minHeight: 32, justifyContent: "center" }}>
              <Chu kieu="rat" co={14} mau={M.chinhInk}>{qua.length ? "Đặt giờ ngủ sớm hơn ›" : "Thêm vào ngày của con ›"}</Chu>
            </View>
          </View>
        </NhanMen>
      ) : null}

      <NhanMen onPress={() => router.push("/nhat-ky" as never)} accessibilityRole="button" muc="khoi" sang
        style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4, minHeight: 68, paddingLeft: 12, paddingRight: 16, borderRadius: 28, backgroundColor: "#f7f6f3", ...KHOI.the }}>
        <OLomIcon ic="lich" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Chu kieu="rat" co={15}>Nhật ký cả nhà</Chu>
          <Chu kieu="dam" co={12.5} mau="#565c59">Ai cho giờ, ai duyệt, ai đổi cài đặt</Chu>
        </View>
        <Chu kieu="rat" co={18} mau={M.chinhInk}>›</Chu>
      </NhanMen>

      {!nay.tongGiaiTri && !nay.duyet.duoc ? <CanhGiua lv="canh-trong" tieu="Chưa đủ dữ liệu" loi="Báo cáo đầy đủ có sau vài ngày con dùng máy." /> : null}
      <BaoLoi loi={xuat.loi} />
      <Pressable onPress={() => xuat.lam(async () => { const r = await bm.goi<{ tenTep: string; noiDung: string }>(`con/${id}/bao-cao/csv`); await luuTepChu(r.tenTep, r.noiDung); })}
        accessibilityRole="button" disabled={xuat.dangChay} style={{ minHeight: 44, justifyContent: "center", alignSelf: "center" }}>
        <Chu kieu="rat" co={14} mau={M.chinhInk}>{xuat.dangChay ? "Đang xuất…" : "Xuất báo cáo tuần (CSV cho Excel)"}</Chu>
      </Pressable>
    </>
  );
}
