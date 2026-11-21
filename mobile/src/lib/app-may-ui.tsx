// «App trên máy của con» — khối DÙNG CHUNG của Lần đầu · bước App (them-mdujxlg2) và Hằng ngày · Thêm app (them-vw103x88) — #508 mục 1 + 6.
// App do AGENT trên máy con gửi về (Windows / Mac / Android: POST /api/device/ung-dung; iPhone/iPad không liệt kê được app cài) ⇒ Ba Mẹ thấy sẵn, chỉ việc xếp
// «Tính phút» / «Không tính phút» (hai nút ngay trên dòng). Ô tìm chỉ để lọc. Chưa ghép máy ⇒ «Ghép máy để thấy app của con» + nút Ghép máy.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { bm, type ConChiTiet } from "./api";
import type { Nhom } from "./app-web";
import { BONG, KHOI } from "./clay";
import { icCuaApp, OIconTrang, OTim } from "./ui-bm3";
import { Chu, IconNet, M, Nut } from "./ui";

export type AppMay = { khoa: string; muc: string; ten: string; icon: string | null; trangThai: string; nhaPhatHanh: string | null };
export type MayApp = { id: string; ten: string; nen: string; luc: string | null; ds: AppMay[] };

/** Chuẩn hoá tên để so trùng (bỏ dấu, chữ thường, chỉ chữ + số). */
export const chuanTen = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]/g, "");

/** Máy ĐÃ GHÉP của bé `con` kèm danh sách app máy gửi về (máy lỗi tải ⇒ bỏ, không làm hỏng màn). */
export async function taiAppCuaCon(con: string, truoc?: ConChiTiet): Promise<MayApp[]> {
  const ct = truoc ?? await bm.goi<ConChiTiet>(`con/${con}`);
  const r = await Promise.all(ct.may.map((m) => bm.goi<{ ds: AppMay[]; capNhatLuc: string | null }>(`may/${m.id}/ung-dung`)
    .then((x): MayApp | null => ({ id: m.id, ten: m.ten, nen: m.nen, luc: x.capNhatLuc, ds: x.ds }), () => null)));
  return r.filter((x): x is MayApp => !!x);
}

/** App chưa xếp, không trùng tên giữa các máy, bỏ app hệ thống và app `daXep` (đã có trong danh sách của bé). */
export function appChuaXep(may: MayApp[], daXep: (a: AppMay) => boolean): (AppMay & { k: string; tenMay: string })[] {
  const thay = new Set<string>();
  const kq: (AppMay & { k: string; tenMay: string })[] = [];
  for (const m of may) for (const a of m.ds) {
    const k = chuanTen(a.ten);
    if (!k || thay.has(k) || a.trangThai === "he_thong" || daXep(a)) continue;
    thay.add(k);
    kq.push({ ...a, k, tenMay: m.ten });
  }
  return kq.sort((a, b) => a.ten.localeCompare(b.ten, "vi"));
}

const gioMay = (iso: string | null) => { if (!iso) return null; const d = new Date(iso); return Number.isNaN(+d) ? null : `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };

function NutNhom({ nhom, bam, chu }: { nhom: Nhom; bam: () => void; chu: string }) {
  const tinh = nhom === "tinh_phut";
  return (
    <Pressable onPress={bam} accessibilityRole="button" accessibilityLabel={`${chu}`}
      style={{ minWidth: 58, minHeight: 44, paddingHorizontal: 8, borderRadius: 16, alignItems: "center", justifyContent: "center",
        backgroundColor: tinh ? M.the : M.chu, boxShadow: tinh ? BONG.lom : BONG.nho }}>
      <Chu kieu="rat" co={12.5} mau={tinh ? M.chu : M.diem} style={{ textAlign: "center", lineHeight: 15 }}>{chu}</Chu>
    </Pressable>
  );
}

/** Khối «App trên <máy>» + «Chưa xếp · N app» (mỗi dòng hai nút nhóm). `chon(app, nhom)` ghi app vào danh sách của bé. `ghep` = đi Ghép máy. */
export function KhoiAppMay({ ten, may, daXep, chon, ghep, chuaGhep }: {
  /** dòng đầu khi chưa ghép máy (mặc định «Ghép máy để thấy app của <bé>») */ chuaGhep?: string;
  ten: string; may: MayApp[] | null; daXep: (a: AppMay) => boolean; chon: (a: AppMay, nhom: Nhom) => void; ghep: () => void;
}) {
  const [loc, setLoc] = useState("");
  if (!may) return null;
  if (!may.length) {
    return (
      <View style={[{ padding: 16, borderRadius: 26, backgroundColor: M.the, gap: 10 }, KHOI.the]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <IconNet ten="may_tinh" co={22} mau={M.chinh} />
          <Chu kieu="rat" co={15} style={{ flex: 1 }}>{chuaGhep ?? `Ghép máy để thấy app của ${ten}`}</Chu>
        </View>
        <Chu co={13.5} mau={M.chu2}>{`Máy của ${ten} gửi danh sách app về đây, Ba Mẹ chỉ việc xếp Tính phút hoặc Không tính phút.`}</Chu>
        <Nut chu="Ghép máy" rong bam={ghep} />
      </View>
    );
  }
  const tong = may.reduce((n, m) => n + m.ds.filter((a) => a.trangThai !== "he_thong").length, 0);
  const m0 = may[0];
  const chua = appChuaXep(may, daXep);
  const q = chuanTen(loc);
  const hien = q ? chua.filter((a) => chuanTen(a.ten).includes(q) || chuanTen(a.muc).includes(q)) : chua;
  const rong = may.every((m) => !m.ds.length);
  return (
    <>
      <View style={[{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 64, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 26, backgroundColor: M.the }, KHOI.the]}>
        <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: M.xamSoft, alignItems: "center", justifyContent: "center", boxShadow: BONG.lom }}><IconNet ten="may_tinh" co={22} mau={M.chinh} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Chu kieu="rat" co={14.5} dong={1}>{`App trên ${m0.ten}${may.length > 1 ? ` +${may.length - 1} máy` : ""}`}</Chu>
          <Chu kieu="dam" co={12.5} mau={M.chu2} dong={1}>{rong ? "Máy chưa gửi danh sách app" : `Máy gửi về ${tong} app${gioMay(m0.luc) ? ` · lúc ${gioMay(m0.luc)}` : ""}`}</Chu>
        </View>
        <View style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: M.chu }}><Chu kieu="rat" co={12} mau={M.diem}>Đã ghép</Chu></View>
      </View>
      {rong ? (
        <Chu kieu="dam" co={13.5} mau={M.chu3} style={{ marginHorizontal: 6 }}>
          {may.every((m) => m.nen === "ios") ? `iPhone, iPad không cho AiiGrow xem app đã cài — Ba Mẹ chọn app ở gợi ý hoặc gõ tên.` : `Mở AiiGrow trên máy ${ten} một lúc, danh sách app sẽ về đây.`}
        </Chu>
      ) : (
        <>
          <OTim gia={loc} doi={setLoc} goiY={`Lọc trong ${tong} app trên máy`} nhan="Lọc app trên máy" />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 6 }}>
            <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: M.chu2 }} />
            <Chu kieu="rat" co={15} style={{ flex: 1 }}>{`Chưa xếp · ${chua.length} app`}</Chu>
            <Chu kieu="dam" co={12.5} mau={M.chu2}>{`${ten} chưa mở được`}</Chu>
          </View>
          {hien.length ? (
            <View style={[{ borderRadius: 26, backgroundColor: M.the, paddingHorizontal: 12, paddingVertical: 4 }, KHOI.the]}>
              {hien.map((a, i) => (
                <View key={a.k} style={[{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 62 }, i > 0 && { borderTopWidth: 1, borderTopColor: "rgba(120,98,70,0.18)" }]}>
                  <OIconTrang ic={icCuaApp(`${a.ten} ${a.muc}`)} anh={a.icon} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Chu kieu="rat" co={15} dong={2}>{a.ten}</Chu>
                    {a.nhaPhatHanh ? <Chu kieu="dam" co={12} mau={M.chu3} dong={1}>{a.nhaPhatHanh}</Chu> : null}
                  </View>
                  <NutNhom nhom="tinh_phut" chu="Tính phút" bam={() => chon(a, "tinh_phut")} />
                  <NutNhom nhom="khong_tinh_phut" chu="Không tính" bam={() => chon(a, "khong_tinh_phut")} />
                </View>
              ))}
            </View>
          ) : (
            <Chu kieu="dam" co={13.5} mau={M.chu3} style={{ marginHorizontal: 6 }}>{chua.length ? `Không thấy app «${loc.trim()}» trên máy.` : `Đã xếp hết app trên máy ${ten}. App mới con cài, máy báo Ba Mẹ ngay.`}</Chu>
          )}
        </>
      )}
    </>
  );
}
