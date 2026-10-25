// bm-man-hinh: thời gian màn hình của Con theo tuần (kiểu Screen Time) — app + trang web gộp theo mục (Học tập, Trò chơi, Video…),
// biểu đồ chồng theo ngày, chạm một ngày / một mục để lọc danh sách app & trang. Số liệu từ server/lib/man-hinh.ts; chỉ tên app/tên miền
// + thời lượng, không ghi nội dung. Mục chỉ để thống kê — muốn chặn / cho phép thì sang màn Trang web hoặc Ứng dụng; «Báo cáo tuần» (học / giải trí, xuất CSV) ở cuối.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type ManHinhTuan, type MucMH } from "@/lib/api";
import { BieuTron, CanhGiua, ChoTai, ChonMot, Chu, Dong, Icon, M, Man, Nhom, NhomTieu, Nut, The, type TenIcon, useTai } from "@/lib/ui";
import { CotClay, ThanhClay } from "@/lib/bieu-do";

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
  const [lui, setLui] = useState(0);
  return (
    <Man lui={{ chu: "Trang chủ" }} tieu="Thời gian màn hình">
      <ChonMot ds={TUAN} gia={lui} doi={setLui} />
      <Tuan key={lui} con={con} lui={lui} />
    </Man>
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
          ds={d.theoNgay.map((x) => ({ khoa: x.ngay, nhan: thuCua(x.ngay), doc: `${thuCua(x.ngay)} ${ngayNgan(x.ngay)}: ${gio(x.giay)}`,
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
              bam={x.kieu === "web" ? () => router.push(`/web/${con}`) : x.muc === "chua_xep" ? () => router.push("/app-web") : undefined} />
          ))}
        </Nhom>
      ) : <Chu co={14} mau={M.chu3}>Không có app hay trang nào khớp bộ lọc.</Chu>}
      {!het && ds.length > hien.length ? <Nut chu={`Xem thêm ${ds.length - hien.length} mục`} loai="vien" nho bam={() => setHet(true)} /> : null}

      <Nhom>
        <Dong dau tieu="Chặn hoặc cho phép trang web" phu="Chọn từng trang, hoặc chỉ cho vào trang bạn duyệt" trai={<BieuTron ic="web" mau="lam" />} bam={() => router.push(`/web/${con}`)} />
        <Dong tieu="Chặn hoặc xếp loại ứng dụng" phu="Học tập, giải trí, chặn" trai={<BieuTron ic="luoi" mau="tim" />} bam={() => router.push("/app-web")} />
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
