// Mảnh danh sách «chạm ＋ để chọn» của Lần đầu (thiết kế chốt 14/11 — bm1-ob-mau «Một ngày của Bảo Anh», them-mdujxlg2 «App cho Bảo Anh»,
// them-3xbscpzm «Web cho Bảo Anh», them-at57ypdc / them-ubomxl31 «Thêm app / web»): tab mục, đầu nhóm + «Chọn tất cả», dòng có ô emoji + ＋/✓,
// thanh tìm giả (bấm sang màn tìm), dòng đếm «Đã chọn N …», bong bóng Grow đầu màn. Token Clay (mau.ts, clay.ts), không chép CSS thô.
import type { ReactNode } from "react";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { BONG, KHOI } from "./clay";
import { ICON_3D } from "./icon-3d";
import { Chu, F, Icon, M, Rob, type LinhVat } from "./ui";

/** Màu nền ô emoji + màu nút «Chọn tất cả» theo mục (thiết kế: Học ngọc, Vận động lam, Giúp Ba Mẹ cam). */
export const MAU_MUC = { ngoc: { nen: "#dcebe6", chu: "#0a5246" }, lam: { nen: "#e1e8f4", chu: "#24427a" }, cam: { nen: "#f9e7d2", chu: "#8a3c0c" } } as const;
export type MauMuc = keyof typeof MAU_MUC;

/** Tab mục (Học · Vận động · Giúp Ba Mẹ): viên trắng, viên đang chọn ngọc đậm. */
export function TabMuc<T extends string>({ ds, dang, doi }: { ds: { ma: T; chu: string }[]; dang: T; doi: (m: T) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="tablist">
      {ds.map((x) => {
        const on = x.ma === dang;
        return (
          <Pressable key={x.ma} onPress={() => doi(x.ma)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={{ flex: 1, minHeight: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", paddingHorizontal: 6,
              backgroundColor: on ? M.chinh : "#f7f6f3", boxShadow: on ? BONG.ngoc : BONG.nho }}>
            <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: 13, color: on ? "#fff" : "#3a403d" }}>{x.chu}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Đầu nhóm: tên (+ số) bên trái, nút «Chọn tất cả» / «Bỏ chọn» bên phải. `con` = đầu chủ đề nhỏ (Giúp Ba Mẹ › Bếp núc). */
export function DauNhom({ chu, dem, het, bam, mau = "ngoc", con }: { chu: string; dem?: string; het?: boolean; bam?: () => void; mau?: MauMuc; con?: boolean }) {
  const m = MAU_MUC[mau];
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: con ? 10 : 6, paddingHorizontal: 4 }}>
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
export const TheDs = ({ children }: { children: ReactNode }) => (
  <View style={{ borderRadius: 24, backgroundColor: "#f7f6f3", paddingLeft: 12, paddingRight: 10, paddingVertical: 2, ...KHOI.the }}>{children}</View>
);

/** Một dòng: ô emoji, tên (+ dòng phụ / nhãn 12+), sao (tuỳ), nút tròn ＋ (chưa chọn) / ✓ ngọc (đã chọn). `dau` = không kẻ vạch trên. */
export function DongChon({ e, mau = "ngoc", ten, phu, sao, lon, chon, bam, dau }: {
  e: string; mau?: MauMuc; ten: string; phu?: string; sao?: number; lon?: boolean; chon: boolean; bam: () => void; dau?: boolean;
}) {
  return (
    <Pressable onPress={bam} accessibilityRole="checkbox" accessibilityState={{ checked: chon }} accessibilityLabel={`${ten}${sao ? `, ${sao} sao` : ""}`}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, paddingVertical: 6, borderTopWidth: dau ? 0 : 1, borderTopColor: "#e9e8e3" }}>
      <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: MAU_MUC[mau].nen, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 20, lineHeight: 26 }} accessibilityElementsHidden importantForAccessibility="no">{e}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={14} style={{ lineHeight: 18 }}>{ten}{lon ? <Chu kieu="rat" co={10.5} mau={MAU_MUC.cam.chu}>{"  12+"}</Chu> : null}</Chu>
        {phu ? <Chu kieu="dam" co={12} mau={M.chu3} dong={1}>{phu}</Chu> : null}
      </View>
      {sao ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Image source={ICON_3D.sao} style={{ width: 15, height: 15 }} accessibilityElementsHidden />
          <Chu kieu="rat" co={12.5} mau="#6e4300" so>{sao}</Chu>
        </View>
      ) : null}
      <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center",
        backgroundColor: chon ? M.chinh : "#ecebe7", boxShadow: chon ? BONG.ngoc : BONG.lom }}>
        {chon ? <Icon ten="tick" mau="#fff" co={18} /> : <Chu kieu="rat" co={20} mau={M.chinhInk}>＋</Chu>}
      </View>
    </Pressable>
  );
}

/** Dòng kết quả ở màn tìm (them-at57ypdc / them-ubomxl31): «✓ Đã thêm» chữ ngọc hoặc nút ＋. */
export function DongKetQua({ e, ten, phu, da, bam, dau }: { e: string; ten: string; phu?: string; da: boolean; bam: () => void; dau?: boolean }) {
  return (
    <Pressable onPress={bam} accessibilityRole="checkbox" accessibilityState={{ checked: da }} accessibilityLabel={ten}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 60, paddingVertical: 6, borderTopWidth: dau ? 0 : 1, borderTopColor: "#e9e8e3" }}>
      <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: MAU_MUC.ngoc.nen, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 21, lineHeight: 27 }}>{e}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={14.5} dong={1}>{ten}</Chu>
        {phu ? <Chu kieu="dam" co={12} mau={M.chu3} dong={1}>{phu}</Chu> : null}
      </View>
      {da ? <Chu kieu="rat" co={13} mau={M.chinhInk}>✓ Đã thêm</Chu> : (
        <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: "#ecebe7", boxShadow: BONG.lom }}>
          <Chu kieu="rat" co={20} mau={M.chinhInk}>＋</Chu>
        </View>
      )}
    </Pressable>
  );
}

/** Thanh tìm giả (lõm) + viên ngọc «+ Thêm» — bấm cả thanh sang màn tìm. */
export function ThanhTimGia({ chu, bam, nhan }: { chu: string; bam: () => void; nhan: string }) {
  return (
    <Pressable onPress={bam} accessibilityRole="search" accessibilityLabel={nhan}
      style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48, borderRadius: 24, backgroundColor: "#ecebe7", boxShadow: BONG.lom, paddingLeft: 16, paddingRight: 5 }}>
      <Chu kieu="dam" co={14.5} mau={M.chu3} style={{ flex: 1 }} dong={1}>{chu}</Chu>
      <View style={{ minHeight: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: M.chinh, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: F.rat, fontSize: 13.5, color: "#fff" }}>+ Thêm</Text>
      </View>
    </Pressable>
  );
}

/** «Đã chọn 0 app · App không chọn sẽ khoá». */
export const DongDem = ({ trai, phai }: { trai: string; phai: string }) => (
  <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8, paddingHorizontal: 4 }}>
    <Chu kieu="rat" co={12.5}>{trai}</Chu><Chu kieu="rat" co={12.5} mau={M.chu3} style={{ flexShrink: 1, textAlign: "right" }}>{phai}</Chu>
  </View>
);

/** Grow + bong bóng «Một ngày của Bảo Anh / Chạm ＋ để thêm vào ngày của con». */
export function BongGrow({ tieu, phu, lv = "chi" }: { tieu: string; phu?: string; lv?: LinhVat }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <Rob ten={lv} co={72} />
      <View style={{ flex: 1, backgroundColor: "#f7f6f3", borderRadius: 22, paddingVertical: 10, paddingHorizontal: 14, ...KHOI.the }}>
        <Chu kieu="rat" co={17} style={{ lineHeight: 22 }}>{tieu}</Chu>
        {phu ? <Chu kieu="dam" co={12.5} mau={M.chu3}>{phu}</Chu> : null}
      </View>
    </View>
  );
}

/** Bỏ dấu, chữ thường — so chữ Ba Mẹ gõ với tên app / tên miền. */
export const boDau = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").trim();
/** «https://www.KhanAcademy.org/math?x» ⇒ «khanacademy.org»; không giống tên miền ⇒ null. */
export const tenMien = (t: string) => {
  const s = t.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").split(/[/?#\s]/)[0];
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(s) ? s : null;
};

/** Mục danh mục thuộc nhóm giải trí («Giải trí · Ba Mẹ cân nhắc») ⇒ tính vào giờ chơi (vàng «Tính giờ» — N3); nhóm khác dùng thoải mái. */
export const tinhGioDm = (m: { nhom: string }) => m.nhom.startsWith("Giải trí");
/** Danh mục chia nhóm theo thứ tự xuất hiện. */
export function theoNhom<T extends { nhom: string; eN: string }>(ds: T[]) {
  const ra: { nhom: string; eN: string; ds: T[] }[] = [];
  for (const x of ds) { const n = ra.find((g) => g.nhom === x.nhom); if (n) n.ds.push(x); else ra.push({ nhom: x.nhom, eN: x.eN, ds: [x] }); }
  return ra;
}
