// Tab «Báo cáo» (thiết kế chốt 15/11 — bm-bao-cao-ngay/01 them-gftgyspn «Tab Báo cáo», 02 them-w04gcohs «Báo cáo · Bảo Minh»; #264 bỏ quỹ giờ chơi):
// «7 ngày qua», chip đổi con (N9), «Phút chơi của <Con> · 28/10 – 3/11» — «6 giờ 25 = 385 sao đã tiêu» (1 sao = 1 phút «Tính phút»), so 7 ngày trước
// (hoặc «Chơi toàn bằng sao tự kiếm»), biểu đồ 7 cột, chú giải «Chơi bằng sao tự kiếm / Chơi bằng sao vay» + «Nay: 42 phút = 42 sao», «Dùng nhiều nhất»
// (app · máy · Chơi/Không tính — «Xem hết ›» → Hôm nay con dùng gì), «Sao kiếm, sao vay» (sao kiếm + việc + sao đã trả nợ → Ví sao; sao vay · Ba Mẹ cho vay
// mấy trong mấy lần xin · đang nợ → Con đang xin), gợi ý của Grow (→ Ví sao), «Nhật ký cả nhà ›».
// Số liệu: GET con/:id/bao-cao?bay=1 (tuanNay: saoKiem, saoVay, lanVay, saoTieuChoi, saoTraNo, xinVay {so, cho}), con/:id/vi-sao (nợ, phút còn).
// Máy chủ chưa tách phút chơi bằng sao vay THEO NGÀY ⇒ cột vẽ một màu (ghi lệch trong PR). «Xuất CSV» giữ.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { HangViec, tenGoi, TieuMuc } from "@/lib/hang-ngay";
import { saoTu, soVN, type SaoCon } from "@/lib/so-sao";
import { DaiCon, OLomIcon } from "@/lib/ui-viec";
import { BaoLoi, CanhGiua, ChoTai, Chu, Icon3D, M, Man, NhanMen, Rob, The, useLam, useTai } from "@/lib/ui";
import { ChuGiaiVuong, CotGioChoi } from "@/lib/bieu-do";
import { KHOI } from "@/lib/clay";
import { luuTepChu } from "@/lib/luu-tep";

type Tuan = { giaiTriTheoNgay: { ngay: string; phut: number }[]; tongGiaiTri: number; phutHoc: number; duyet: { duoc: number; tu_choi: number }; ngoaiLe: number;
  top: { muc: string; phut: number }[]; dungNhieu?: { muc: string; ten?: string; loai: string; phut: number; may?: string | null; lech: number | null }[];
  /** 14/11: số lần con xin thêm giờ / được cho; sao kiếm trong 7 ngày (máy chủ cũ không gửi) */ xinThemGio?: { so: number; cho: number }; saoKiem?: number;
  /** 15/11 sổ sao: lời xin vay / Ba Mẹ cho · sao vay · số lần vay · sao tiêu (chơi / quà) · sao kiếm đã trả nợ */
  xinVay?: { so: number; cho: number }; saoVay?: number; lanVay?: number; saoTieu?: number; saoTieuChoi?: number; saoTieuQua?: number; saoTraNo?: number };
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
    const [bc, vs] = await Promise.all([bm.goi<BaoCao>(`con/${id}/bao-cao?bay=1`), bm.goi<Partial<SaoCon>>(`con/${id}/vi-sao?gioiHan=1`).catch(() => null)]);
    return { bc, sao: vs ? saoTu(vs) : null };
  });
  const xuat = useLam();
  if (!d) return <ChoTai loi={loi} matMang={matMang} tai={tai} />;
  const { bc } = d;
  const nay = bc.tuanNay;
  const ngay = nay.giaiTriTheoNgay;
  const homNay = ngay[ngay.length - 1]?.ngay;
  const lech = nay.tongGiaiTri - bc.tuanTruoc.tongGiaiTri;
  const max = Math.max(60, ...ngay.map((x) => x.phut));
  const nhieuNhat = [...ngay].sort((a, b) => b.phut - a.phut)[0];
  const saoTieu = nay.saoTieuChoi ?? nay.tongGiaiTri;
  const saoVay = nay.saoVay ?? 0;
  const saoKiem = nay.saoKiem ?? 0, traNo = nay.saoTraNo ?? 0;
  const xin = nay.xinVay ?? nay.xinThemGio ?? { so: nay.ngoaiLe, cho: nay.ngoaiLe };
  const no = d.sao?.no ?? 0;
  const phutNay = ngay[ngay.length - 1]?.phut ?? 0;
  const dung = nay.dungNhieu?.length ? nay.dungNhieu.slice(0, 3) : nay.top.slice(0, 3).map((x) => ({ ...x, ten: undefined, loai: "giai_tri", may: null, lech: null }));
  const xemDung = () => router.push(`/da-dung/${id}` as never);
  const ten = tenGoi(bc.ten);
  return (
    <>
      <Pressable onPress={xemDung} accessibilityRole="button" accessibilityHint="Mở «Hôm nay con dùng gì»">
        <The dem style={{ gap: 2, padding: 18 }}>
          <Chu kieu="dam7" co={14} mau="#565c59">{`Phút chơi của ${ten}${ngay.length ? ` · ${ngayNgan(ngay[0].ngay)} – ${ngayNgan(ngay[ngay.length - 1].ngay)}` : ""}`}</Chu>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <Chu kieu="rat" co={38} so style={{ letterSpacing: -1 }}>{gio(nay.tongGiaiTri)}</Chu>
            <Chu kieu="dam7" co={15} mau="#565c59">{`= ${soVN(saoTieu)} sao đã tiêu`}</Chu>
          </View>
          {(() => {
            const cau = nay.tongGiaiTri && !saoVay ? "Chơi toàn bằng sao tự kiếm"
              : bc.tuanTruoc.tongGiaiTri ? (lech === 0 ? "Bằng 7 ngày trước" : `${lech > 0 ? "Nhiều" : "Ít"} hơn 7 ngày trước ${gio(Math.abs(lech))}`) : null;
            const xau = lech > 0 && saoVay > 0;
            return cau ? (
              <View style={{ alignSelf: "flex-start", marginTop: 6, paddingHorizontal: 11, paddingVertical: 5, borderRadius: 13, backgroundColor: xau ? "#fbe3d3" : "#dcebe6" }}>
                <Chu kieu="rat" co={13} mau={xau ? "#8a3c0c" : M.chinhInk}>{cau}</Chu>
              </View>
            ) : null;
          })()}
          <CotGioChoi max={max} nhanDoc="Phút chơi theo ngày (1 phút = 1 sao)"
            ds={ngay.map((x) => {
              const laNay = x.ngay === homNay, nhan = laNay ? "Nay" : THU[thuCua(x.ngay)];
              return { khoa: x.ngay, nhan, nay: laNay, phut: x.phut, quy: null, doc: `${nhan}: ${gio(x.phut)} = ${x.phut} sao` };
            })} />
          <ChuGiaiVuong ds={[{ chu: "Chơi bằng sao tự kiếm", mau: M.chinh }, { chu: "Chơi bằng sao vay", mau: "#e2660f" },
            { chu: `Nay: ${phutNay} phút = ${soVN(phutNay)} sao${d.sao && !no ? ` · còn ${soVN(d.sao.phutCon)} sao` : ""}` }]} />
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
                  phu={x.may ? x.may.replace(/ của .*$/, "").replace(/ · .*$/, "") : hoc ? "Không trừ sao" : "Trừ sao · 1 phút = 1 sao"}
                  phai={<View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 11, backgroundColor: hoc ? "#ecebe7" : "#dcebe6" }}>
                    <Chu kieu="rat" co={12.5} so mau={hoc ? M.chu2 : M.chinhInk}>{`${hoc ? "Không tính" : "Chơi"} ${gioNgan(x.phut)}`}</Chu>
                  </View>}
                  bam={xemDung} />
              );
            })}
          </The>
        </>
      ) : null}

      <TieuMuc chu="Sao kiếm, sao vay" />
      {/* thiết kế .hai: ô vàng «120 sao» kiếm (→ Ví sao) · ô «45 sao vay» Ba Mẹ cho vay mấy trong mấy lần xin (→ Con đang xin) */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <NhanMen onPress={() => router.push(`/vi/${id}` as never)} accessibilityRole="button" muc="khoi" sang
          style={{ flex: 1, minHeight: 124, padding: 16, borderRadius: 26, backgroundColor: "#fdeab0", backgroundImage: "linear-gradient(#ffe39a, #fbecc0)", ...KHOI.the }}>
          <Icon3D ten="sao" co={32} />
          <Chu kieu="rat" co={26} so style={{ marginTop: 6, letterSpacing: -0.5 }}>{`${soVN(saoKiem)} sao`}</Chu>
          <Chu kieu="dam7" co={12.5} mau="#6e4300" style={{ lineHeight: 17 }}>
            {`Kiếm từ ${nay.duyet.duoc} việc · ${traNo ? `${soVN(traNo)} sao đã trả nợ` : `đã tiêu ${soVN(nay.saoTieu ?? saoTieu)}`} ›`}
          </Chu>
        </NhanMen>
        <NhanMen onPress={() => router.push(`/yeu-cau?con=${id}` as never)} accessibilityRole="button" muc="khoi" sang
          style={{ flex: 1, minHeight: 124, padding: 16, borderRadius: 26, backgroundColor: saoVay ? "#f9e7d2" : "#f7f6f3", ...KHOI.the }}>
          <Icon3D ten="sao" co={32} />
          <Chu kieu="rat" co={26} so mau={saoVay ? "#8a3c0c" : M.chu} style={{ marginTop: 6, letterSpacing: -0.5 }}>{`${soVN(saoVay)} sao vay`}</Chu>
          <Chu kieu="dam7" co={12.5} mau={saoVay ? "#8a3c0c" : "#565c59"} style={{ lineHeight: 17 }}>
            {`${xin.so ? `Ba Mẹ cho vay ${xin.cho} trong ${xin.so} lần xin` : "Không xin vay tuần này"} · ${no ? `đang nợ ${soVN(no)}` : "không nợ"} ›`}
          </Chu>
        </NhanMen>
      </View>

      {saoVay > 0 || (!nay.duyet.duoc && nay.tongGiaiTri) ? (
        // thiết kế .rob: thẻ ngọc nhạt, Grow 58 trái, câu 14/700 + liên kết đậm
        <NhanMen onPress={() => router.push((saoVay > 0 ? `/vi/${id}` : `/giao-nv?con=${id}`) as never)} accessibilityRole="button" muc="khoi" sang
          style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 28, backgroundColor: "#dcebe6", ...KHOI.the }}>
          <Rob ten="chi" co={58} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Chu kieu="dam7" co={14} mau={M.chinhInk} style={{ lineHeight: 20 }}>
              {saoVay > 0 && nhieuNhat ? `${THU_DAI[thuCua(nhieuNhat.ngay)]} ${ten} chơi ${gio(nhieuNhat.phut)}. 7 ngày qua chơi bằng ${soVN(saoVay)} sao vay.`
                : `Ngày của ${ten} còn trống.`}
            </Chu>
            <View style={{ minHeight: 32, justifyContent: "center" }}>
              <Chu kieu="rat" co={14} mau={M.chinhInk}>{saoVay > 0 ? "Xem luật sao của con ›" : "Thêm vào ngày của con ›"}</Chu>
            </View>
          </View>
        </NhanMen>
      ) : null}

      <NhanMen onPress={() => router.push("/nhat-ky" as never)} accessibilityRole="button" muc="khoi" sang
        style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 4, minHeight: 68, paddingLeft: 12, paddingRight: 16, borderRadius: 28, backgroundColor: "#f7f6f3", ...KHOI.the }}>
        <OLomIcon ic="lich" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Chu kieu="rat" co={15}>Nhật ký cả nhà</Chu>
          <Chu kieu="dam" co={12.5} mau="#565c59">Ai cho vay sao, ai duyệt, ai đổi cài đặt</Chu>
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
