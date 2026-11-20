// Mảnh danh sách «chạm ＋ để chọn» của Lần đầu (thiết kế chốt 14/11 — bm1-ob-mau «Một ngày của Bảo Anh», them-mdujxlg2 «App cho Bảo Anh»,
// them-3xbscpzm «Web cho Bảo Anh», them-at57ypdc / them-ubomxl31 «Thêm app / web»): tab mục, đầu nhóm + «Chọn tất cả», dòng có ô emoji + ＋/✓,
// thanh tìm giả (bấm sang màn tìm), dòng đếm «Đã chọn N …», bong bóng Grow đầu màn. Token Clay (mau.ts, clay.ts), không chép CSS thô.
import type { ReactNode } from "react";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { BONG, KHOI } from "./clay";
import { ICON_3D } from "./icon-3d";
import { MAU_NHOM, TEN_NHOM, type Nhom } from "./app-web";
import { Chu, F, Icon, IconNet, M, Rob, type LinhVat, type TenIcon } from "./ui";

/** Màu nền ô emoji + màu nút «Chọn tất cả» theo mục (thiết kế: Học ngọc, Vận động lam, Giúp Ba Mẹ cam). */
export const MAU_MUC = { ngoc: { nen: M.chinhSoft, chu: M.chinhInk }, lam: { nen: M.lamSoft, chu: M.lam }, cam: { nen: M.canhSoft, chu: M.canh } } as const;
export type MauMuc = keyof typeof MAU_MUC;

/** Tab mục (Học · Vận động · Giúp Ba Mẹ): viên trắng, viên đang chọn ngọc đậm. */
export function TabMuc<T extends string>({ ds, dang, doi }: { ds: { ma: T; chu: string; ic?: TenIcon }[]; dang: T; doi: (m: T) => void }) {
  // bàn bm1-ob-mau (19/11): 4 tab icon nét + chữ; tab đang chọn là viên trắng nổi, chữ đậm navy
  return (
    <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="tablist">
      {ds.map((x) => {
        const on = x.ma === dang;
        return (
          <Pressable key={x.ma} onPress={() => doi(x.ma)} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={x.chu}
            style={{ flex: 1, minHeight: 44, borderRadius: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 4,
              backgroundColor: on ? M.chinh : M.ranh, boxShadow: on ? BONG.ngoc : BONG.nho }}>
            {x.ic ? <IconNet ten={x.ic} co={14} mau={on ? M.diem : M.chu2} /> : null}
            <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: 12.5, color: on ? M.diem : M.chu2 }}>{x.chu}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function DauNhom({ chu, dem, het, bam, mau = "ngoc", con, ic }: { chu: string; /** icon nét đứng trước tên nhóm */ ic?: TenIcon; dem?: string; het?: boolean; bam?: () => void; mau?: MauMuc; con?: boolean }) {
  const m = MAU_MUC[mau];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: con ? 10 : 6, paddingHorizontal: 4 }}>
      {ic ? <IconNet ten={ic} co={20} mau={M.chinh} /> : null}
      <Chu kieu="rat" co={con ? 14.5 : 17} style={{ flex: 1 }} dong={2}>{chu}</Chu>
      {dem ? <Chu kieu="dam" co={12} mau={M.chu3}>{dem}</Chu> : null}
      {bam ? (
        <Pressable onPress={bam} accessibilityRole="button" accessibilityLabel={`${het ? "Bỏ chọn" : "Chọn tất cả"} ${chu}`} hitSlop={6}
          style={{ minHeight: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: m.nen, alignItems: "center", justifyContent: "center" }}>
          <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: 12.5, color: m.chu }}>{het ? "Bỏ chọn" : "Chọn tất cả"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Khung thẻ chứa các dòng (nền ngà, bóng clay). */
export const TheDs = ({ children, le }: { children: ReactNode; /** lề trái-phải 16 (khối có ô chọn trong thẻ — them-at57ypdc) */ le?: boolean }) => (
  <View style={{ borderRadius: 24, backgroundColor: M.the, paddingLeft: le ? 16 : 12, paddingRight: le ? 16 : 10, paddingVertical: 2, ...KHOI.the }}>{children}</View>
);

/** Một dòng: ô emoji, tên (+ dòng phụ / nhãn 12+), sao (tuỳ), nút tròn ＋ (chưa chọn) / ✓ ngọc (đã chọn). `dau` = không kẻ vạch trên.
 *  `nhom` (app / web — 15/11 #262): đã chọn thì hiện viên «● Tính phút» / «● Không tính phút» thay dấu ✓. */
export function DongChon({ e, ic, mau = "ngoc", ten, phu, sao, lon, chon, bam, dau, nhom }: {
  e: string; /** icon nét thay emoji (bàn E 19/11) */ ic?: TenIcon; mau?: MauMuc; ten: string; phu?: string; sao?: number; lon?: boolean; chon: boolean; bam: () => void; dau?: boolean; nhom?: Nhom;
}) {
  return (
    <Pressable onPress={bam} accessibilityRole="checkbox" accessibilityState={{ checked: chon }} accessibilityLabel={`${ten}${sao ? `, ${sao} sao` : ""}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, paddingVertical: 6, borderTopWidth: dau ? 0 : 1, borderTopColor: M.ranh }}>
      <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: MAU_MUC[mau].nen, alignItems: "center", justifyContent: "center" }}>
        {ic ? <IconNet ten={ic} co={20} mau={M.chinh} /> : <Text style={{ fontSize: 20, lineHeight: 26 }} accessibilityElementsHidden importantForAccessibility="no">{e}</Text>}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={14} style={{ lineHeight: 18 }}>{ten}{lon ? <Chu kieu="rat" co={10.5} mau={MAU_MUC.cam.chu}>{"  12+"}</Chu> : null}</Chu>
        {phu ? <Chu kieu="dam" co={12} mau={M.chu3} dong={1}>{phu}</Chu> : null}
      </View>
      {sao ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Image source={ICON_3D.sao} style={{ width: 15, height: 15 }} accessibilityElementsHidden />
          <Chu kieu="rat" co={12.5} mau={M.diemInk} so>{sao}</Chu>
        </View>
      ) : null}
      {chon && nhom ? <VienNhom nhom={nhom} /> : (
        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center",
          backgroundColor: chon ? M.chinh : M.xamSoft, boxShadow: chon ? BONG.ngoc : BONG.lom }}>
          {chon ? <Icon ten="tick" mau="#FFFBF5" co={18} /> : <Chu kieu="rat" co={20} mau={M.chinhInk}>＋</Chu>}
        </View>
      )}
    </Pressable>
  );
}

/** Viên «● Tính phút» (vàng nhạt) / «● Không tính phút» (ngọc nhạt) — mục đã thêm vào danh sách. */
export function VienNhom({ nhom }: { nhom: Nhom }) {
  const tinh = nhom === "tinh_phut";
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, minHeight: 32, paddingHorizontal: 10, borderRadius: 16, backgroundColor: tinh ? M.diemSoft : M.chinhSoft, boxShadow: BONG.nho }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: MAU_NHOM[nhom] }} />
      <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: 12, color: tinh ? M.diemInk : M.chinhInk }}>{TEN_NHOM[nhom]}</Text>
    </View>
  );
}

/** Thanh tìm giả (lõm, chỉ icon + chữ gợi ý — bàn them-mdujxlg2@v19) — bấm cả thanh sang màn tìm. */
export function ThanhTimGia({ chu, bam, nhan, ic = "tim_kiem" }: { chu: string; bam: () => void; nhan: string; ic?: TenIcon }) {
  return (
    <Pressable onPress={bam} accessibilityRole="search" accessibilityLabel={nhan}
      style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 52, borderRadius: 26, backgroundColor: M.xamSoft, boxShadow: BONG.lom, paddingLeft: 16, paddingRight: 16 }}>
      <IconNet ten={ic} co={18} mau={M.chu3} />
      <Chu kieu="dam" co={14.5} mau={M.chu3} style={{ flex: 1 }} dong={1}>{chu}</Chu>
    </Pressable>
  );
}

/** Grow + bong bóng «Một ngày của Bảo Anh / Chạm ＋ để thêm vào ngày của con». */
export function BongGrow({ tieu, phu, lv = "chi" }: { tieu: string; phu?: string; lv?: LinhVat }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Rob ten={lv} co={72} />
      <View style={{ flex: 1, backgroundColor: M.the, borderRadius: 22, paddingVertical: 10, paddingHorizontal: 14, ...KHOI.the }}>
        <Chu kieu="rat" co={17} style={{ lineHeight: 22 }}>{tieu}</Chu>
        {phu ? <Chu kieu="dam" co={12.5} mau={M.chu3}>{phu}</Chu> : null}
      </View>
    </View>
  );
}

/** Bỏ dấu, chữ thường — so chữ Ba Mẹ gõ với tên app / tên miền. */
export const boDau = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").trim();
/** «https://www.KhanAcademy.org/math?x» ⇒ «khanacademy.org»; không giống tên miền / là IP ⇒ null. Địa chỉ sai do máy chủ kiểm (thiet-lap/kiem-web). */
export const WEB_TOI_DA = 60;
export const tenMien = (t: string) => {
  const s = t.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").split(/[/?#\s]/)[0];
  // cùng luật máy chủ (server/lib/web.ts › tenMienSach): nhãn không bắt đầu/kết thúc bằng «-», ≤ 100 ký tự, không phải địa chỉ IP
  return s.length <= 100 && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(s) && !/^\d+(\.\d+)+$/.test(s) ? s : null;
};
/** Nhóm «Giải trí» của danh mục = Tính phút; nhóm khác = Không tính phút. */
export const tinhGioDm = (m: { nhom: string }) => m.nhom.startsWith("Giải trí");
