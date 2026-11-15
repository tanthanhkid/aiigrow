// «<Con> đã dùng gì» hôm nay (thiết kế chốt 15/11 — bm-bao-cao-ngay/03 them-c95l1cwc, #264 sao = phút): mở từ Báo cáo «Dùng nhiều nhất · Xem hết ›».
//  · 2 ô: «Tính phút 42′ = 42 sao · Còn −20 sao (nợ 20)» (→ Ví sao) · «Không tính phút 50′ · Không trừ sao» (→ App & web)
//  · «Đã dùng N»: từng app / trang hôm nay — giờ bắt đầu, máy, «● Đang mở» / «● Mất mạng», mục Tính phút «−39 sao» / Không tính «Không tính 10′»
//  · «Con xin hôm nay N»: con đang xin (Trả lời ›) · Grow chặn · Chưa cho (ngoài danh sách)
// Số liệu: GET con/:id/hom-nay (server/lib/hom-nay-dung.ts) + con/:id/vi-sao (số dư / nợ). Chỉ tên app / tên miền + thời lượng — không nội dung.
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm } from "@/lib/api";
import { TieuMuc } from "@/lib/hang-ngay";
import { kieuSao, saoTu, soVN, type SaoCon } from "@/lib/so-sao";
import { BieuTron, ChoTai, Chu, gioPhut, Icon3D, M, Man, Nhan, The, useTai, type TenIcon } from "@/lib/ui";

type DongDung = { luc: string | null; ten: string; muc: string; kieu: "app" | "web"; may: string | null; nen: string | null; mayId: string | null;
  phut: number; tinhGio: boolean; dangMo: boolean; matMang: boolean };
type DongChan = { luc: string; ten: string; may: string | null; ly: "dang_xin" | "chua_cho" | "grow_chan"; yeuCau: string | null; phut: number | null };
export type HomNayDung = { ten: string; ngay: string; choi: { daDung: number; tongPhut: number; conPhut: number };
  hoc: { phut: number; khung: { tu: string; den: string } | null }; /** 15/11 (#262): phút nhóm «Không tính phút» hôm nay */ khongTinhPhut?: { phut: number };
  dung: DongDung[]; biChan: DongChan[] };

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
  const { d, loi, matMang, tai } = useTai(async () => {
    const [hn, vs] = await Promise.all([bm.goi<HomNayDung>(`con/${con}/hom-nay`), bm.goi<Partial<SaoCon>>(`con/${con}/vi-sao?gioiHan=1`).catch(() => null)]);
    return { ...hn, sao: vs ? saoTu(vs) : null };
  });
  if (!d) return <Man lui={{ chu: "Báo cáo" }} tieu="Hôm nay con dùng gì"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const sao = d.sao;
  const k = sao ? kieuSao(sao) : null;
  const conCau = sao ? (k === "thuong" ? `Còn ${soVN(sao.sao)} sao = ${soVN(sao.sao)} phút` : `Còn ${soVN(k === "vay" ? sao.phutCon : -sao.no)} sao (nợ ${soVN(sao.no)})`)
    : d.choi.conPhut ? `Còn ${d.choi.conPhut} sao = ${d.choi.conPhut} phút` : "Hết sao";
  const xau = sao ? k !== "thuong" || sao.phutCon <= 0 : !d.choi.conPhut;
  return (
    <Man lui={{ chu: "Báo cáo" }} tieuLon={`${d.ten} đã dùng gì`} tai={tai} vongTai>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable onPress={() => router.push(`/vi/${con}` as never)} accessibilityRole="button" style={{ flex: 1 }}>
          <The dem style={{ gap: 4, padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon3D ten="game" co={18} mau={M.chu2} /><Chu kieu="dam" co={13} mau={M.chu2}>Tính phút</Chu></View>
            <Chu kieu="rat" co={22} so>{`${d.choi.daDung}′`}<Chu kieu="dam" co={14} mau={M.chu3}>{` = ${soVN(d.choi.daDung)} sao`}</Chu></Chu>
            <Chu co={13} mau={xau ? "#8a3c0c" : M.chinhInk}>{conCau}</Chu>
          </The>
        </Pressable>
        {/* 15/11 (#262): ô «Giờ học» ⇒ «Không tính phút» (app / web nhóm Không tính phút hôm nay — GET hom-nay › khongTinhPhut) */}
        <Pressable onPress={() => router.push({ pathname: "/chan", params: { con } })} accessibilityRole="button" style={{ flex: 1 }}>
          <The dem style={{ gap: 4, padding: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon3D ten="sach" co={18} mau={M.chu2} /><Chu kieu="dam" co={13} mau={M.chu2}>Không tính phút</Chu></View>
            <Chu kieu="rat" co={22} so>{`${d.khongTinhPhut?.phut ?? d.hoc.phut}′`}</Chu>
            <Chu co={13} mau={M.chu3}>Vào thoải mái, không trừ sao</Chu>
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
            {/* thiết kế 03 .tag: mục Tính phút «−39 sao» (1 phút = 1 sao) / «Không tính 10′» (xám) */}
            <Nhan chu={x.tinhGio ? `${soVN(-x.phut)} sao` : `Không tính ${x.phut}′`} loai={x.tinhGio ? "canh" : "xam"} />
          </Pressable>
        ))}
      </The>

      {d.biChan.length ? (
        <>
          <TieuMuc chu="Con xin hôm nay" so={d.biChan.length} />
          <The style={{ paddingVertical: 4 }}>
            {d.biChan.map((x, k) => {
              const phu = x.ly === "dang_xin" ? "Chưa có trong danh sách" : x.ly === "grow_chan" ? `${tenNgan(x.may) || "Máy của con"} · luôn chặn`
                : `${tenNgan(x.may) || "Máy của con"} · ngoài danh sách`;
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
                  </>
      ) : null}
      <Chu co={13} mau={M.chu3} style={{ marginHorizontal: 6 }}>Mục chưa có trong danh sách thì con chưa vào được và không trừ sao. Mục «Tính phút»: 1 phút = 1 sao.</Chu>
    </Man>
  );
}
