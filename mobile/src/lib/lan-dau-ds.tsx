// Mảnh danh sách «chạm ＋ để chọn» của Lần đầu (thiết kế chốt 14/11 — bm1-ob-mau «Một ngày của Bảo Anh», them-mdujxlg2 «App cho Bảo Anh»,
// them-3xbscpzm «Web cho Bảo Anh», them-at57ypdc / them-ubomxl31 «Thêm app / web»): tab mục, đầu nhóm + «Chọn tất cả», dòng có ô emoji + ＋/✓,
// thanh tìm giả (bấm sang màn tìm), dòng đếm «Đã chọn N …», bong bóng Grow đầu màn. Token Clay (mau.ts, clay.ts), không chép CSS thô.
import type { ReactNode } from "react";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BONG, KHOI, MEN } from "./clay";
import { ICON_3D } from "./icon-3d";
import { MAU_NHOM, TEN_NHOM, type Nhom } from "./app-web";
import { SvgXml } from "react-native-svg";
import { Chu, F, Icon, IconNet, LopMen, M, Rob, type LinhVat, type TenIcon } from "./ui";
import { ChonNhomNgang, NutChon, OIconTrang } from "./ui-bm3";

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

/** Đầu nhóm: tên (+ số) bên trái, nút «Chọn tất cả» / «Bỏ chọn» bên phải. `con` = đầu chủ đề nhỏ (Giúp Ba Mẹ › Bếp núc). */
/** Tab dạng rãnh lõm (bàn them-s416tfdj v9 `.q-tab`): rãnh #F2EBE3 cao 52, tab đang chọn là viên sáng nổi chữ ngọc, tab kia chữ xám. */
export function TabLom<T extends string>({ ds, dang, doi }: { ds: { ma: T; chu: string }[]; dang: T; doi: (m: T) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 4, padding: 4, minHeight: 52, borderRadius: 26, backgroundColor: M.xamSoft, boxShadow: BONG.lom }} accessibilityRole="tablist">
      {ds.map((x) => {
        const on = x.ma === dang;
        return (
          <Pressable key={x.ma} onPress={() => doi(x.ma)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={[{ flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", borderRadius: 22 }, on && { backgroundColor: M.the, boxShadow: BONG.nho }]}>
            <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: 14, color: on ? M.chinhInk : M.chu3 }}>{x.chu}</Text>
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

/** «● Thêm vào nhóm Không tính phút · vào thoải mái» — dưới đầu mỗi nhóm danh mục. */
export function DongVaoNhom({ nhom }: { nhom: Nhom }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4, flexWrap: "wrap" }}>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: MAU_NHOM[nhom] }} />
      <Chu kieu="dam" co={12} mau={M.chu2}>Thêm vào nhóm</Chu>
      <Chu kieu="rat" co={12}>{TEN_NHOM[nhom]}</Chu>
      <Chu kieu="dam" co={12} mau={M.chu3}>{nhom === "tinh_phut" ? "· 1 sao = 1 phút chơi" : "· vào thoải mái"}</Chu>
    </View>
  );
}

/** Dòng kết quả ở màn tìm (bàn them-at57ypdc v5 / them-ubomxl31 v4 `.lg`): ô icon trắng 42, tên 15/800 + dòng phụ, nút tròn 32 «＋» (lõm) /
 *  «✓» (ngọc đặc). `children` (câu hỏi «… có tính phút không?» của dòng vừa thêm) nằm ngay dưới dòng, cùng khối. */
export function DongKetQua({ e, ic, ten, phu, da, bam, dau, children }: { e?: string; ic?: TenIcon; ten: string; phu?: string; da: boolean; bam: () => void; dau?: boolean;
  children?: ReactNode }) {
  return (
    <View style={{ borderTopWidth: dau ? 0 : 1.5, borderTopColor: "rgba(0,0,0,0.06)", paddingBottom: children ? 12 : 0 }}>
      <Pressable onPress={bam} accessibilityRole="checkbox" accessibilityState={{ checked: da }} accessibilityLabel={ten}
        style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 62, paddingVertical: 6 }}>
        <OIconTrang ic={ic} e={e} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Chu kieu="rat" co={15} dong={1}>{ten}</Chu>
          {phu ? <Chu kieu="dam" co={12.5} mau={M.chu3} dong={1}>{phu}</Chu> : null}
        </View>
        <NutChon chon={da} />
      </Pressable>
      {children}
    </View>
  );
}

/** Thanh tìm giả (lõm) + viên ngọc «+ Thêm» — bấm cả thanh sang màn tìm. */
export function ThanhTimGia({ chu, bam, nhan, ic = "tim_kiem" }: { chu: string; bam: () => void; nhan: string; ic?: TenIcon }) {
  return (
    <Pressable onPress={bam} accessibilityRole="search" accessibilityLabel={nhan}
      style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 48, borderRadius: 24, backgroundColor: M.xamSoft, boxShadow: BONG.lom, paddingLeft: 16, paddingRight: 5 }}>
      <IconNet ten={ic} co={18} mau={M.chu3} />
      <Chu kieu="dam" co={14.5} mau={M.chu3} style={{ flex: 1 }} dong={1}>{chu}</Chu>
      <View style={{ minHeight: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: M.diem, alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: BONG.vang }}>
        <LopMen men={MEN.vang} bo={20} />
        <Text style={{ fontFamily: F.rat, fontSize: 13.5, color: M.chinh }}>+ Thêm</Text>
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

/** Mục danh mục thuộc nhóm giải trí («Giải trí») ⇒ «Tính phút» (trả bằng sao); nhóm khác «Không tính phút». */
export const tinhGioDm = (m: { nhom: string }) => m.nhom.startsWith("Giải trí");
/** Danh mục chia nhóm theo thứ tự xuất hiện. */
export function theoNhom<T extends { nhom: string; eN: string }>(ds: T[]) {
  const ra: { nhom: string; eN: string; ds: T[] }[] = [];
  for (const x of ds) { const n = ra.find((g) => g.nhom === x.nhom); if (n) n.ds.push(x); else ra.push({ nhom: x.nhom, eN: x.eN, ds: [x] }); }
  return ra;
}

type CheDoTl = "chi_app_duoc_phep" | "mo_het";
/** Tên nhóm danh mục hiển thị: «Giải trí · Ba Mẹ cân nhắc» ⇒ «Giải trí» (thiết kế 15/11). */
export const tenNhomDm = (n: string) => n.replace(/ · Ba Mẹ cân nhắc$/, "");

/** Hai thẻ chọn chế độ (dùng chung cho màn Web khi Ba Mẹ bấm «Đổi ›»). */
export function ChonCheDo({ gia, doi }: { gia: CheDoTl; doi: (v: CheDoTl) => void }) {
  // bàn them-mdujxlg2 / them-3xbscpzm (19/11): một rãnh lõm hai mục «Mở hết» · «Theo danh sách» (icon nét), mục đang chọn là viên vàng kim chữ navy
  const O: { v: CheDoTl; tieu: string; ic: TenIcon; nhan: string }[] = [
    { v: "mo_het", tieu: "Mở hết", ic: "mo_khoa", nhan: "Mở mọi app, mọi web, không tính phút" },
    { v: "chi_app_duoc_phep", tieu: "Theo danh sách", ic: "khien", nhan: "Chỉ mở app, web Ba Mẹ đã thêm" },
  ];
  return (
    <View style={{ flexDirection: "row", gap: 4, padding: 4, minHeight: 52, borderRadius: 26, backgroundColor: M.xamSoft, boxShadow: BONG.lom }} accessibilityRole="radiogroup">
      {O.map((o) => {
        const on = gia === o.v;
        return (
          <Pressable key={o.v} onPress={() => doi(o.v)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${o.tieu}: ${o.nhan}`}
            style={[{ flex: 1, minWidth: 0, borderRadius: 22, overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 44 }, on && { backgroundColor: M.diem, boxShadow: BONG.vang }]}>
            {on ? <LopMen men={MEN.vang} bo={22} /> : null}
            <IconNet ten={o.ic} co={18} mau={on ? M.chinh : M.chu3} />
            <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: 14.5, color: on ? M.chinh : M.chu3 }}>{o.tieu}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const BOOKMARK = (mau: string) => `<svg viewBox="0 0 256 256"><path fill="${mau}" d="M184,32H72A16,16,0,0,0,56,48V224a8,8,0,0,0,12.24,6.78L128,193.43l59.77,37.35A8,8,0,0,0,200,224V48A16,16,0,0,0,184,32Z"/></svg>`;
export type DongNhomPhut = { ten: string; phu?: string; ic: TenIcon; da: boolean; tinh: boolean };
/** Hai nhóm «Không tính phút · Vào thoải mái» / «Tính phút · 1 sao = 1 phút chơi» (bàn them-mdujxlg2 / them-3xbscpzm — không chia theo môn).
 *  Dòng đã thêm: chip «● nhóm» — chạm chip ⇒ đổi sang nhóm kia; dòng chưa thêm: chip «＋ Thêm» (vào nhóm mặc định). Chạm tên dòng ⇒ thêm / bỏ. */
export function HaiNhomPhut({ ds, them, bo, doiNhom }: { ds: DongNhomPhut[]; them: (ten: string) => void; bo: (ten: string) => void; doiNhom: (ten: string) => void }) {
  const N: { tinh: boolean; ten: string; phu: string; mau: string }[] = [
    { tinh: false, ten: "Không tính phút", phu: "Vào thoải mái", mau: M.chinh },
    { tinh: true, ten: "Tính phút", phu: "1 sao = 1 phút chơi", mau: M.diem },
  ];
  return (
    <View style={{ gap: 12 }}>
      {N.map((n) => {
        const dong = ds.filter((x) => x.tinh === n.tinh).sort((a, b) => Number(b.da) - Number(a.da));
        return (
          <View key={n.ten} style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 4 }}>
              <SvgXml xml={BOOKMARK(n.tinh ? "#C9973B" : M.chinh)} width={16} height={16} />
              <Chu kieu="rat" co={16} style={{ flex: 1 }}>{n.ten}</Chu><Chu kieu="dam" co={12.5} mau={M.chu3}>{n.phu}</Chu>
            </View>
            <TheDs le>
              {dong.map((x, i) => (
                <View key={x.ten} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, borderTopWidth: i ? 1 : 0, borderTopColor: M.ranh }}>
                  <Pressable onPress={() => (x.da ? bo(x.ten) : them(x.ten))} accessibilityRole="checkbox" accessibilityState={{ checked: x.da }} accessibilityLabel={`${x.ten}${x.da ? ", đã thêm, chạm để bỏ" : ""}`}
                    style={{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: M.xamSoft, boxShadow: BONG.nho, alignItems: "center", justifyContent: "center" }}><IconNet ten={x.ic} co={16} mau={M.chinh} /></View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Chu kieu="rat" co={15} dong={1}>{x.ten}</Chu>
                      {x.phu ? <Chu kieu="dam" co={11.5} mau={M.chu3} dong={1}>{x.phu}</Chu> : null}
                    </View>
                  </Pressable>
                  {x.da ? (
                    <Pressable onPress={() => doiNhom(x.ten)} accessibilityRole="button" accessibilityLabel={`${x.ten} đang ở nhóm ${n.ten}, chạm để chuyển sang ${n.tinh ? "Không tính phút" : "Tính phút"}`} hitSlop={6}
                      style={{ minHeight: 34, paddingHorizontal: 10, borderRadius: 17, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: n.tinh ? M.diemSoft : M.xamSoft, boxShadow: BONG.nho }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: n.tinh ? "#C9973B" : M.chinh }} />
                      <Text numberOfLines={1} style={{ fontFamily: F.rat, fontSize: 12, color: M.chinh }}>{n.ten}</Text>
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => them(x.ten)} accessibilityRole="button" accessibilityLabel={`Thêm ${x.ten}`} hitSlop={6}
                      style={{ minHeight: 34, paddingHorizontal: 12, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: M.the, boxShadow: BONG.nho }}>
                      <Text style={{ fontFamily: F.rat, fontSize: 12, color: M.chinh }}>＋ Thêm</Text>
                    </Pressable>
                  )}
                </View>
              ))}
            </TheDs>
          </View>
        );
      })}
    </View>
  );
}

/** «Duolingo ABC có tính phút không?» + hai ô «Không tính phút · Vào thoải mái» | «Tính phút · 1 sao = 1 phút chơi» (them-at57ypdc / them-ubomxl31). */
export function HoiNhom({ ten, nhom, doi }: { ten: string; nhom: Nhom; doi: (n: Nhom) => void }) {
  // hai ô nhóm dùng chung với Thêm app / Thêm web của App & web (ui-bm3 › ChonNhomNgang)
  return (
    <View style={{ gap: 8 }}>
      <Chu kieu="rat" co={13.5} mau={M.chu2} style={{ marginHorizontal: 2 }}>{`${ten} có tính phút không?`}</Chu>
      <ChonNhomNgang gia={nhom} doi={doi} />
    </View>
  );
}
