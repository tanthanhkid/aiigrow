// Mảnh giao diện dùng chung cho các màn Nhiệm vụ · Quà · Cả nhà theo thiết kế 14/11 (bm-viec-duyet, bm-sao-qua, bm-ca-nha):
// dải avatar các con (tròn, tên dưới, số việc chờ góc trên), thanh mục dạng viên (Học · Vận động · Giúp Ba Mẹ / Voucher · Ba Mẹ tự điền),
// nút ＋ tròn lõm (chạm = chọn, hiện tick ngọc), ô chọn số sao, ô icon lõm. Token Clay (mau.ts, clay.ts) — không chép CSS thô của HTML.
import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { BONG, KHOI, MEN } from "./clay";
import { Avt, Chu, Icon, Icon3D, M, NhanMen, type TenIcon } from "./ui";
import { mauCon } from "./hang-ngay";

/** «Bảo Anh · Bảo Minh · Bảo Ngọc · Khang» → «B / M / N / K»: chữ cái tên gọi (chữ cuối). */
const chuCai = (ten: string) => (ten.trim().split(/\s+/).pop() ?? "?").charAt(0).toUpperCase();

/**
 * Dải các con (thiết kế .cac-con): avatar tròn 56, tên dưới, con đang chọn có vòng ngọc, số việc chờ (cam) góc trên.
 * Nhà 1 con thì gọi chỗ khác không vẽ dải này (N9: chỉ hiện chọn con khi > 1 con).
 */
export function DaiCon<T extends { id: string; ten: string; avatar?: string | null }>({ ds, chon, doi, so }: {
  ds: T[]; chon?: string | null; doi?: (c: T) => void; /** số việc chờ theo id con */ so?: Record<string, number>;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 6, paddingRight: 8 }} accessibilityRole="tablist">
      {ds.map((x, k) => {
        const on = x.id === chon;
        const n = so?.[x.id] ?? 0;
        return (
          <Pressable key={x.id} onPress={doi ? () => doi(x) : undefined} disabled={!doi} accessibilityRole="tab" accessibilityState={{ selected: on }}
            accessibilityLabel={n ? `${x.ten}, ${n} việc chờ duyệt` : x.ten} style={{ width: 72, alignItems: "center", gap: 5 }}>
            <View style={[{ borderRadius: 34, padding: 3 }, on ? { borderWidth: 3, borderColor: M.chinh } : { borderWidth: 3, borderColor: "transparent" }]}>
              <Avt ten={x.ten} mau={mauCon(x.avatar, k)} co={50} />
              {n ? (
                <View style={{ position: "absolute", right: -4, top: -4, minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11, backgroundColor: "#e2660f",
                  alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: M.nen }}>
                  <Chu kieu="rat" co={12} mau="#fff" so>{n}</Chu>
                </View>
              ) : null}
            </View>
            <Chu kieu="rat" co={13} mau={on ? M.chinhInk : M.chu2} dong={1}>{x.ten}</Chu>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Hàng chữ cái các con (thiết kế: «B M N K» chồng nhẹ) — dùng ở Thành viên, Mời người nhà, Tài khoản. */
export function ChuCaiCon({ ds, co = 30 }: { ds: { ten: string; avatar?: string | null }[]; co?: number }) {
  return (
    <View style={{ flexDirection: "row" }} accessibilityLabel={ds.map((c) => c.ten).join(", ")}>
      {ds.map((c, k) => (
        <View key={`${c.ten}-${k}`} style={{ marginLeft: k ? -6 : 0, borderRadius: co, borderWidth: 2, borderColor: "#fff" }}>
          <Avt ten={chuCai(c.ten)} mau={mauCon(c.avatar, k)} co={co} />
        </View>
      ))}
    </View>
  );
}

/** «Cả 4 con» / «Bảo Anh, Bảo Minh» / «Bảo Anh». */
export const cauCacCon = (ds: { ten: string }[]) => (ds.length > 2 ? `${ds.length} con` : ds.map((c) => c.ten).join(", "));

/** Thanh mục dạng viên (thiết kế .muc-tab): mục đang chọn = khối ngọc chữ trắng. */
export function ThanhMuc<T extends string>({ ds, chon, doi }: { ds: { gia: T; chu: string; ic?: TenIcon }[]; chon: T; doi: (v: T) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="tablist">
      {ds.map((x) => {
        const on = x.gia === chon;
        return (
          <NhanMen key={x.gia} onPress={() => doi(x.gia)} accessibilityRole="tab" accessibilityState={{ selected: on }} muc="chip" sang={!on} men={on ? MEN.ngoc : MEN.sang}
            style={[{ flexGrow: 1, flexShrink: 1, minHeight: 44, paddingHorizontal: 10, borderRadius: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
              on ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc } : { backgroundColor: "#f7f6f3", ...KHOI.nho }]}>
            {x.ic ? <Icon3D ten={x.ic} co={18} /> : null}
            <Chu kieu="rat" co={13.5} mau={on ? "#fff" : M.chu2} dong={1}>{x.chu}</Chu>
          </NhanMen>
        );
      })}
    </View>
  );
}

/** Nút ＋ tròn lõm 34 trong vùng chạm 44 (thiết kế .d i): chọn ⇒ viên ngọc có tick. */
export function NutCongTick({ chon, bam, nhan }: { chon: boolean; bam: () => void; nhan: string }) {
  return (
    <Pressable onPress={bam} accessibilityRole="checkbox" accessibilityState={{ checked: chon }} accessibilityLabel={nhan} hitSlop={4}
      style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
      <View style={[{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
        chon ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc } : { backgroundColor: "#ecebe7", boxShadow: BONG.lom }]}>
        {chon ? <Icon ten="tick" mau="#fff" co={16} /> : <Chu kieu="rat" co={22} mau={M.chinhInk} style={{ lineHeight: 24 }}>+</Chu>}
      </View>
    </Pressable>
  );
}

/** Ô icon 3D lõm (thiết kế .e / .ic): nền xám lõm, hoặc `nen` riêng (teal nhạt cho Học / AiiRob, cam nhạt cho Giúp Ba Mẹ). */
export function OLomIcon({ ic, co = 40, nen = "#ecebe7" }: { ic: TenIcon; co?: number; nen?: string }) {
  return (
    <View style={{ width: co, height: co, borderRadius: Math.round(co * 0.35), backgroundColor: nen, boxShadow: BONG.lom, alignItems: "center", justifyContent: "center" }}>
      <Icon3D ten={ic} co={Math.round(co * 0.6)} />
    </View>
  );
}

/** Viên sao nhỏ chỉ số (thiết kế `.d s` — «⭐ 10»), vàng chỉ cho sao. */
export function SaoNho({ n, dau }: { n: number; dau?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 3, paddingLeft: 4, paddingRight: 8, borderRadius: 11, backgroundColor: "#fbecc0" }}>
      <Icon3D ten="sao" co={16} />
      <Chu kieu="rat" co={12.5} mau="#6e4300" so>{`${dau ?? ""}${n.toLocaleString("vi-VN")}`}</Chu>
    </View>
  );
}

/** Hàng ô chọn lõm (thiết kế «Con nhận ⭐5 ⭐10 …», «Con đổi bằng …»): ô đang chọn = teal nhạt viền ngọc. */
export function ChonO<T extends string | number>({ ds, chon, doi, sao }: { ds: { gia: T; chu: string; ic?: TenIcon }[]; chon: T | null; doi: (v: T) => void; sao?: boolean }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityRole="radiogroup">
      {ds.map((x) => {
        const on = x.gia === chon;
        return (
          <Pressable key={String(x.gia)} onPress={() => doi(x.gia)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={sao ? `${x.chu} sao` : x.chu}
            style={[{ flexGrow: 1, minWidth: 64, minHeight: 44, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 10 },
              on ? { backgroundColor: "#dcebe6", borderWidth: 2, borderColor: M.chinh } : { backgroundColor: "#ecebe7", boxShadow: BONG.lom }]}>
            {sao ? <Icon3D ten="sao" co={18} /> : x.ic ? <Icon3D ten={x.ic} co={18} /> : null}
            <Chu kieu="rat" co={14.5} mau={on ? M.chinhInk : M.chu}>{x.chu}</Chu>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Tiêu đề mục (.muc 15/800) + phần phải (vd «Chọn tất cả», số). */
export function MucTieu({ chu, phu, phai }: { chu: string; phu?: string; phai?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4, marginTop: 6 }}>
      <Chu kieu="rat" co={15}>{chu}</Chu>
      {phu ? <Chu kieu="dam" co={12.5} mau={M.chu3}>{phu}</Chu> : null}
      <View style={{ flex: 1 }} />
      {phai}
    </View>
  );
}

/** Chữ nút nhỏ màu ngọc (≥ 44 chạm), vd «Chọn tất cả», «Sửa quà ›». */
export function ChuNut({ chu, bam }: { chu: string; bam: () => void }) {
  return (
    <Pressable onPress={bam} accessibilityRole="button" hitSlop={4} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 6 }}>
      <Chu kieu="rat" co={13.5} mau={M.chinhInk}>{chu}</Chu>
    </Pressable>
  );
}
