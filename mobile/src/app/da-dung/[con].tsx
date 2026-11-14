// «<Con> đã dùng gì» hôm nay (thiết kế chốt 14/11 — bm-bao-cao-ngay/03 them-c95l1cwc): mở từ Báo cáo «Dùng nhiều nhất · Xem hết ›».
//  · 2 ô: Giờ chơi đã dùng / quỹ hôm nay (→ Giờ chơi) · Giờ học (phút app Học hôm nay + khung giờ học, ✓ khi đã qua) (→ Giờ học)
//  · «Đã dùng N»: từng app / trang hôm nay — giờ bắt đầu, máy, «● Đang mở» / «● Mất mạng», Chơi (tính giờ — N3) / Học (dùng thoải mái), phút
//  · «Bị chặn hôm nay N»: con đang xin (Trả lời ›) · Grow chặn (web người lớn) · Chưa cho (Ba Mẹ đã không cho)
// Số liệu: GET con/:id/hom-nay (server/lib/hom-nay-dung.ts). Chỉ tên app / tên miền + thời lượng — không nội dung.
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm } from "@/lib/api";
import { gioGon, TieuMuc } from "@/lib/hang-ngay";
import { BieuTron, ChoTai, Chu, gioPhut, Icon3D, M, Man, Nhan, The, useTai, type TenIcon } from "@/lib/ui";

type DongDung = { luc: string | null; ten: string; muc: string; kieu: "app" | "web"; may: string | null; nen: string | null; mayId: string | null;
  phut: number; tinhGio: boolean; dangMo: boolean; matMang: boolean };
type DongChan = { luc: string; ten: string; may: string | null; ly: "dang_xin" | "chua_cho" | "grow_chan"; yeuCau: string | null; phut: number | null };
export type HomNayDung = { ten: string; ngay: string; choi: { daDung: number; tongPhut: number; conPhut: number };
  hoc: { phut: number; khung: { tu: string; den: string } | null }; dung: DongDung[]; biChan: DongChan[] };

const phutCua = (g: string) => { const m = /^(\d{1,2}):(\d{2})/.exec(g); return m ? Number(m[1]) * 60 + Number(m[2]) : 0; };
const tenNgan = (may: string | null) => (may ?? "").replace(/ của .*$/, "");
/** Icon theo tên app (đủ cho các app hay gặp); web → «web». */
function icCua(x: { ten: string; kieu: "app" | "web"; tinhGio: boolean }): TenIcon {
  if (x.kieu === "web") return "web";
  const t = x.ten.toLowerCase();
  if (/camera|máy ảnh|ảnh/.test(t)) return "camera";
  if (/điển|sách|đọc|book/.test(t)) return "sach";
  if (/aiirob|học|toán|khan|duolingo/.test(t)) return "may_tinh";
  return x.tinhGio ? "game" : "may_tinh";
}

export default function DaDung() {
  const { con } = useLocalSearchParams<{ con: string }>();
  const { d, loi, matMang, tai } = useTai(() => bm.goi<HomNayDung>(`con/${con}/hom-nay`));
  if (!d) return <Man lui={{ chu: "Báo cáo" }} tieu="Hôm nay con dùng gì"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const bayGio = new Date().getHours() * 60 + new Date().getMinutes();
  const hocXong = !!d.hoc.khung && bayGio >= phutCua(d.hoc.khung.den);
  return (
    <Man lui={{ chu: "Báo cáo" }} tieuLon={`${d.ten} đã dùng gì`} tai={tai} vongTai>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable onPress={() => router.push(`/gio/${con}` as never)} accessibilityRole="button" style={{ flex: 1 }}>
          <The dem style={{ gap: 4, padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon3D ten="game" co={18} mau={M.chu2} /><Chu kieu="dam" co={13} mau={M.chu2}>Giờ chơi</Chu></View>
            <Chu kieu="rat" co={22} so>{`${d.choi.daDung}′`}<Chu kieu="dam" co={14} mau={M.chu3}>{` / ${d.choi.tongPhut}′`}</Chu></Chu>
            <Chu co={13} mau={d.choi.conPhut ? M.chinhInk : M.loi}>{d.choi.conPhut ? `Còn ${d.choi.conPhut} phút` : "Hết giờ chơi"}</Chu>
          </The>
        </Pressable>
        <Pressable onPress={() => router.push(`/gio/hoc?con=${con}` as never)} accessibilityRole="button" style={{ flex: 1 }}>
          <The dem style={{ gap: 4, padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon3D ten="sach" co={18} mau={M.chu2} /><Chu kieu="dam" co={13} mau={M.chu2}>Giờ học</Chu></View>
            <Chu kieu="rat" co={22} so>{`${d.hoc.phut}′`}</Chu>
            <Chu co={13} mau={M.chu3}>{d.hoc.khung ? `${gioGon(d.hoc.khung.tu)}–${gioGon(d.hoc.khung.den)}${hocXong ? " ✓" : ""}` : "Chưa đặt giờ học"}</Chu>
          </The>
        </Pressable>
      </View>

      <TieuMuc chu="Đã dùng" so={d.dung.length} />
      <The style={{ paddingVertical: 4 }}>
        {!d.dung.length ? <Chu co={14} mau={M.chu3} style={{ paddingVertical: 14 }}>{`Hôm nay ${d.ten} chưa dùng app nào.`}</Chu> : null}
        {d.dung.map((x, k) => (
          <Pressable key={`${x.kieu}:${x.muc}`} onPress={() => x.mayId && router.push(`/may/${x.mayId}` as never)} disabled={!x.mayId} accessibilityRole="button"
            style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 60, paddingVertical: 8, borderTopWidth: k ? 1 : 0, borderTopColor: "#efefec" }}>
            <Chu kieu="dam" co={12.5} mau={M.chu3} so style={{ width: 40 }}>{x.luc ? gioPhut(x.luc) : ""}</Chu>
            <BieuTron ic={icCua(x)} mau={x.tinhGio ? "tim" : "xanh"} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Chu kieu="rat" co={15} dong={1}>{x.ten}</Chu>
              <Chu co={13} mau={x.dangMo || x.matMang ? (x.matMang ? M.canh : M.chinhInk) : M.chu3} dong={1}>
                {[x.matMang ? "● Mất mạng" : x.dangMo ? "● Đang mở" : null, tenNgan(x.may) || (x.nen ? x.nen : null)].filter(Boolean).join(" · ")}
              </Chu>
            </View>
            <View style={{ alignItems: "flex-end", gap: 2 }}>
              <Nhan chu={x.tinhGio ? "Chơi" : "Học"} loai={x.tinhGio ? "canh" : "ok"} />
              <Chu kieu="rat" co={14} so>{`${x.phut}′`}</Chu>
            </View>
          </Pressable>
        ))}
      </The>

      {d.biChan.length ? (
        <>
          <TieuMuc chu="Bị chặn hôm nay" so={d.biChan.length} />
          <The style={{ paddingVertical: 4 }}>
            {d.biChan.map((x, k) => {
              const phu = x.ly === "dang_xin" ? `Con đang xin${x.phut ? ` ${x.phut} phút` : ""}` : x.ly === "grow_chan" ? `${tenNgan(x.may) || "Máy của con"} · luôn chặn`
                : `${tenNgan(x.may) || "Máy của con"} · chưa có trong app được mở`;
              const ic: TenIcon = x.ly === "grow_chan" ? "khien" : x.ly === "chua_cho" ? "khoa" : "web";
              return (
                <Pressable key={`${x.ly}:${x.ten}:${k}`} disabled={x.ly !== "dang_xin" || !x.yeuCau} accessibilityRole="button"
                  onPress={() => router.push(`/yeu-cau?con=${con}` as never)}
                  style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 60, paddingVertical: 8, borderTopWidth: k ? 1 : 0, borderTopColor: "#efefec" }}>
                  <Chu kieu="dam" co={12.5} mau={M.chu3} so style={{ width: 40 }}>{x.ly === "grow_chan" ? "" : gioPhut(x.luc)}</Chu>
                  <BieuTron ic={ic} mau={x.ly === "dang_xin" ? "cam" : "xam"} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Chu kieu="rat" co={15} dong={1}>{x.ten}</Chu>
                    <Chu co={13} mau={M.chu3} dong={1}>{phu}</Chu>
                  </View>
                  {x.ly === "dang_xin" ? <Chu kieu="rat" co={14} mau={M.chinhInk}>Trả lời ›</Chu>
                    : <Nhan chu={x.ly === "grow_chan" ? "Grow chặn" : "Chưa cho"} loai="xam" />}
                </Pressable>
              );
            })}
          </The>
          <Chu co={13} mau={M.chu3} style={{ marginHorizontal: 6 }}>Bị chặn là con thử mở nhưng không vào được, không tính vào giờ chơi.</Chu>
        </>
      ) : null}
    </Man>
  );
}
