// «<Con> dùng máy» (thiết kế chốt 05/11, bm-hang-ngay/35): chọn «Hôm nay» / «Cả tuần». Hôm nay = quỹ giờ chơi đã dùng / tổng (GET con/:id/quy),
// theo app (cột hôm nay của GET con/:id/man-hinh — app Học «Không tính»), theo máy (GET con/:id › may), nút «Đổi giờ chơi».
// Cả tuần = thời gian màn hình theo tuần (kiểu Screen Time) giữ như cũ: biểu đồ chồng theo mục, chạm ngày / mục để lọc; chỉ tên app/tên miền + thời lượng.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type ManHinhTuan, type MucMH } from "@/lib/api";
import { BieuTron, CanhGiua, ChoTai, ChonMot, Chu, Dong, Icon, M, Man, Nhom, NhomTieu, Nut, The, type TenIcon, useTai } from "@/lib/ui";
import { CotClay, ThanhClay } from "@/lib/bieu-do";
import { HangViec, IC_MAY, type ConCt, type QuyCon } from "@/lib/hang-ngay";

const MUC: Record<MucMH, { chu: string; mau: string; ic: TenIcon }> = {
  hoc: { chu: "Học tập", mau: M.chinh, ic: "mu" },
  game: { chu: "Trò chơi", mau: M.tim, ic: "game" },
  video: { chu: "Video & phim", mau: M.camDam, ic: "camera" },
  video_ngan: { chu: "Video ngắn", mau: M.hong, ic: "tia" },
  mxh: { chu: "Mạng xã hội & chat", mau: M.lam, ic: "tin" },
  tien_ich: { chu: "Công cụ & trình duyệt", mau: M.chu3, ic: "banhrang" },
  khac: { chu: "Giải trí khác", mau: M.reu, ic: "luoi" },
  chua_xep: { chu: "Chưa phân loại", mau: M.oNhap, ic: "dau_hoi" },
};
const THU = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const thuCua = (ngay: string) => THU[new Date(`${ngay}T12:00:00`).getDay()] ?? "";
const ngayNgan = (ngay: string) => `${ngay.slice(8, 10)}/${ngay.slice(5, 7)}`;
/** Giây → «2 giờ 5 phút»; dưới 1 phút → «< 1 phút». */
const gio = (giay: number) => { const p = Math.round(giay / 60);
  return giay <= 0 ? "0 phút" : p < 1 ? "< 1 phút" : p >= 60 ? `${Math.floor(p / 60)} giờ${p % 60 ? ` ${p % 60} phút` : ""}` : `${p} phút`; };
const TUAN = [{ gia: 0, chu: "Tuần này" }, { gia: 1, chu: "Tuần trước" }, { gia: 2, chu: "2 tuần trước" }];

export default function ManHinhCon() {
  const { con } = useLocalSearchParams<{ con: string }>();
  const [xem, setXem] = useState<"hom_nay" | "tuan">("hom_nay");
  const [lui, setLui] = useState(0);
  const ct = useTai(() => bm.goi<ConCt>(`con/${con}`));
  const ten = ct.d?.ten ?? "Con";
  return (
    <Man lui={{ chu: "Quay lại" }} tieu={`${ten} dùng máy`}>
      <ChonMot ds={[{ gia: "hom_nay" as const, chu: "Hôm nay" }, { gia: "tuan" as const, chu: "Cả tuần" }]} gia={xem} doi={setXem} />
      {xem === "hom_nay" ? <HomNay con={con} ct={ct.d} /> : (
        <>
          <ChonMot ds={TUAN} gia={lui} doi={setLui} />
          <Tuan key={lui} con={con} lui={lui} />
        </>
      )}
    </Man>
  );
}

/** Hôm nay: quỹ đã dùng + theo app + theo máy (bm-hang-ngay/35). */
function HomNay({ con, ct }: { con: string; ct: ConCt | null }) {
  const { d, loi, matMang, tai } = useTai(async () => {
    const [q, mh] = await Promise.all([bm.goi<QuyCon>(`con/${con}/quy`).catch(() => null), bm.goi<ManHinhTuan>(`con/${con}/man-hinh?lui=0`)]);
    return { q, mh };
  });
  if (!d) return <ChoTai loi={loi} matMang={matMang} tai={tai} />;
  const qy = d.q?.quy;
  const i = d.mh.theoNgay.findIndex((x) => x.ngay === d.mh.homNay);
  const app = i < 0 ? [] : d.mh.ds.map((x) => ({ ...x, p: x.theoNgay[i] ?? 0 })).filter((x) => x.p >= 30).sort((a, b) => b.p - a.p).slice(0, 8);
  const may = ct?.may ?? [];
  return (
    <>
      <Pressable onPress={() => router.push(`/gio/${con}` as never)} accessibilityRole="button">
        <The dem style={{ gap: 8 }}>
          <Chu kieu="dam" co={13.5} mau={M.chu3}>Đã chơi hôm nay</Chu>
          {qy ? (
            <>
              <Chu kieu="rat" co={28} so>{`${qy.daDung} phút `}<Chu kieu="dam" co={16} mau={M.chu3}>{`/ ${qy.tongPhut} phút`}</Chu></Chu>
              <ThanhClay ti={qy.tongPhut ? Math.min(1, qy.daDung / qy.tongPhut) : 0} mau={qy.conPhut ? M.chinh : M.huy} />
              <Chu co={13.5} mau={M.chu2}>{`Còn ${qy.conPhut} phút · app học không bị tính`}</Chu>
            </>
          ) : <Chu co={14} mau={M.chu2}>Chưa đọc được quỹ giờ chơi.</Chu>}
        </The>
      </Pressable>

      <Chu kieu="rat" co={17} style={{ marginTop: 6, marginHorizontal: 4 }}>Theo app</Chu>
      {app.length ? (
        <The dem style={{ paddingVertical: 4 }}>
          {app.map((x, k) => (
            <HangViec key={`${x.kieu}:${x.id}`} dau={k === 0} trai={<ODau muc={x.muc} />} tieu={x.ten}
              phu={x.muc === "hoc" ? "Không tính giờ" : x.kieu === "web" ? "Trang web" : MUC[x.muc].chu}
              phai={<Chu kieu="rat" co={14} so mau={x.muc === "hoc" ? M.chu3 : M.chu}>{gio(x.p)}</Chu>} />
          ))}
        </The>
      ) : <Chu co={14} mau={M.chu3} style={{ marginHorizontal: 4 }}>Hôm nay con chưa dùng app nào.</Chu>}

      {may.length ? (
        <>
          <Chu kieu="rat" co={17} style={{ marginTop: 6, marginHorizontal: 4 }}>Theo máy</Chu>
          <The dem style={{ paddingVertical: 4 }}>
            {may.map((m, k) => (
              <HangViec key={m.id} dau={k === 0} ic={IC_MAY[m.nen]} mau={m.baoVe === "day_du" ? "xam" : "cam"} tieu={m.ten}
                phu={m.baoVe !== "day_du" ? "Cần sửa · chưa được bảo vệ đủ" : m.truc ? "Đang mở" : "Đang tắt"} bam={() => router.push(`/may/${m.id}` as never)} />
            ))}
          </The>
        </>
      ) : null}
      <Nut chu={`Đổi giờ chơi của ${ct?.ten ?? "con"}`} loai="vien" rong bam={() => router.push(`/gio/${con}` as never)} />
    </>
  );
}

const ODau = ({ muc }: { muc: MucMH }) => (
  <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: `${MUC[muc].mau}1f` }}>
    <Icon ten={MUC[muc].ic} mau={MUC[muc].mau} co={20} />
  </View>
);

function Tuan({ con, lui }: { con: string; lui: number }) {
  const { d, loi, matMang, tai } = useTai(() => bm.goi<ManHinhTuan>(`con/${con}/man-hinh?lui=${lui}`));
  const [ngay, setNgay] = useState<number | null>(null);
  const [muc, setMuc] = useState<MucMH | null>(null);
  const [het, setHet] = useState(false);
  if (!d) return <ChoTai loi={loi} matMang={matMang} tai={tai} />;
  if (!d.tongGiay && !d.ds.length) {
    return <CanhGiua lv="canh-trong" tieu="Chưa có dữ liệu tuần này"
      loi={`Khi ${d.ten || "Con"} dùng máy có AiiGrow, thời gian từng app và trang web hiện ở đây sau khoảng 5 phút.`} />;
  }

  const lonNhat = Math.max(3600, ...d.theoNgay.map((x) => x.giay));
  const lech = d.tuanTruocGiay ? Math.round(((d.tongGiay - d.tuanTruocGiay) / d.tuanTruocGiay) * 100) : null;
  // số theo bộ lọc ngày: tổng mục và danh sách
  const theoMuc = ngay === null ? d.theoMuc
    : (Object.entries(d.theoNgay[ngay].theoMuc) as [MucMH, number][]).map(([m, g]) => ({ muc: m, giay: g, soMuc: 0 })).sort((a, b) => b.giay - a.giay);
  const tong = theoMuc.reduce((a, x) => a + x.giay, 0);
  const ds = d.ds.map((x) => ({ ...x, p: ngay === null ? x.giay : x.theoNgay[ngay] }))
    .filter((x) => (muc === null || x.muc === muc) && (x.p > 0 || (ngay === null && x.soLan > 0)))
    .sort((a, b) => b.p - a.p);
  const hien = het ? ds : ds.slice(0, 15);
  const tieuLoc = [ngay !== null ? `${thuCua(d.theoNgay[ngay].ngay)} ${ngayNgan(d.theoNgay[ngay].ngay)}` : null, muc ? MUC[muc].chu : null].filter(Boolean).join(" · ");

  return (
    <>
      <The dem>
        <Chu kieu="dam" co={13} mau={M.chu3}>{`${d.ten} · ${ngayNgan(d.dau)} – ${ngayNgan(d.cuoi)}`}</Chu>
        <Chu kieu="rat" co={30} so>{gio(d.tongGiay)}</Chu>
        <Chu co={14} mau={M.chu2}>
          {`Trung bình ${gio(d.tbNgayGiay)}/ngày${lech !== null && lech !== 0 ? ` · ${lech > 0 ? "nhiều" : "ít"} hơn tuần trước ${Math.abs(lech)}%` : ""}`}
        </Chu>
        <CotClay kieu="chong" max={lonNhat} cao={140} chon={ngay} tat={(i) => d.theoNgay[i].ngay > d.homNay}
          bam={(i) => { setNgay(ngay === i ? null : i); setHet(false); }}
          ds={d.theoNgay.map((x) => ({ khoa: x.ngay, nhan: thuCua(x.ngay), doc: `${thuCua(x.ngay)} ${ngayNgan(x.ngay)}: ${gio(x.giay)}`, tong: x.giay,
            phan: theoMucXep(x.theoMuc).map(([m, p]) => ({ gia: p, mau: MUC[m].mau, mo: !!muc && muc !== m })) }))} />
      </The>

      <NhomTieu chu={ngay === null ? "Theo mục" : `Theo mục · ${thuCua(d.theoNgay[ngay].ngay)} ${ngayNgan(d.theoNgay[ngay].ngay)}`} />
      {theoMuc.length ? (
        <Nhom>
          {theoMuc.map((x, i) => (
            <Pressable key={x.muc} onPress={() => { setMuc(muc === x.muc ? null : x.muc); setHet(false); }} accessibilityRole="button"
              accessibilityState={{ selected: muc === x.muc }} accessibilityLabel={`${MUC[x.muc].chu}: ${gio(x.giay)}`}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 16, minHeight: 56,
                borderTopWidth: i ? 1 : 0, borderTopColor: M.vien, backgroundColor: muc === x.muc ? M.chinhSoft : undefined }}>
              <ODau muc={x.muc} />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                  <Chu kieu="dam" co={15} style={{ flex: 1 }}>{MUC[x.muc].chu}</Chu>
                  <Chu kieu="rat" co={14} so>{gio(x.giay)}</Chu>
                </View>
                <ThanhClay key={`${ngay}`} ti={tong ? x.giay / tong : 0} mau={MUC[x.muc].mau} cao={10} tre={i * 45} />
              </View>
              <Chu co={13} mau={M.chu3} so style={{ minWidth: 36, textAlign: "right" }}>{`${tong ? Math.round((x.giay / tong) * 100) : 0}%`}</Chu>
            </Pressable>
          ))}
        </Nhom>
      ) : <Chu co={14} mau={M.chu3}>Ngày này chưa dùng máy.</Chu>}

      <NhomTieu chu={tieuLoc ? `App & trang web · ${tieuLoc}` : "App & trang web"}
        phai={ngay !== null || muc ? { chu: "Bỏ lọc", bam: () => { setNgay(null); setMuc(null); setHet(false); } } : undefined} />
      {hien.length ? (
        <Nhom>
          {hien.map((x, i) => (
            <Dong key={`${x.kieu}:${x.id}`} dau={i === 0} tieu={x.ten}
              phu={`${MUC[x.muc].chu} · ${x.kieu === "web" ? `Trang web${ngay === null && x.soLan ? ` · ${x.soLan} lượt mở` : ""}` : "Ứng dụng"}`}
              trai={<ODau muc={x.muc} />}
              phai={<Chu kieu="rat" co={14} so>{gio(x.p)}</Chu>}
              bam={x.kieu === "web" ? () => router.push(`/web/${con}`) : x.muc === "chua_xep" ? () => router.push(`/app-web?con=${con}`) : undefined} />
          ))}
        </Nhom>
      ) : <Chu co={14} mau={M.chu3}>Không có app hay trang nào khớp bộ lọc.</Chu>}
      {!het && ds.length > hien.length ? <Nut chu={`Xem thêm ${ds.length - hien.length} mục`} loai="vien" nho bam={() => setHet(true)} /> : null}

      <Nhom>
        <Dong dau tieu="Chặn hoặc cho phép trang web" phu="Chọn từng trang, hoặc chỉ cho vào trang bạn duyệt" trai={<BieuTron ic="web" mau="lam" />} bam={() => router.push(`/web/${con}`)} />
        <Dong tieu="Chặn hoặc xếp loại ứng dụng" phu="Học tập, giải trí, chặn" trai={<BieuTron ic="luoi" mau="tim" />} bam={() => router.push(`/app-web?con=${con}`)} />
        <Dong tieu="Báo cáo tuần" phu="Học và giải trí theo ngày, xuất CSV cho Excel" trai={<BieuTron ic="cot" />} bam={() => router.push({ pathname: "/bao-cao", params: { con } })} />
      </Nhom>
      <Chu co={13} mau={M.chu3}>
        Chỉ ghi tên app, tên miền và thời gian, không ghi nội dung. Thời gian trong trình duyệt được tách theo từng trang web nên không tính hai lần; thời gian trên web chỉ gần đúng. Mục «Chưa phân loại» là app AiiGrow chưa biết — chạm vào để xếp loại.
      </Chu>
    </>
  );
}

/** Thứ tự chồng trong cột (từ đỉnh xuống): mục nhỏ ở trên, mục lớn nhất ở chân. */
function theoMucXep(tm: Partial<Record<MucMH, number>>) {
  return (Object.entries(tm) as [MucMH, number][]).filter(([, p]) => p > 0).sort((a, b) => a[1] - b[1]);
}
