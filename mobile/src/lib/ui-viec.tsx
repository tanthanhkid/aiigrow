// Mảnh giao diện dùng chung cho các màn Nhiệm vụ · Quà · Cả nhà theo thiết kế 14/11 (bm-viec-duyet, bm-sao-qua, bm-ca-nha):
// dải avatar các con (tròn, tên dưới, số việc chờ góc trên), thanh mục dạng viên (Học · Vận động · Giúp Ba Mẹ / Voucher · Ba Mẹ tự điền),
// nút ＋ tròn lõm (chạm = chọn, hiện tick ngọc), ô chọn số sao, ô icon lõm. Token Clay (mau.ts, clay.ts) — không chép CSS thô của HTML.
import type { ReactNode } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { BONG, KHOI, MEN } from "./clay";
import { Avt, Chu, Icon, Icon3D, IconNet, M, NhanMen, type TenIcon } from "./ui";
import { mauCon } from "./hang-ngay";

/** «Bảo Anh · Bảo Minh · Bảo Ngọc · Khang» → «B / M / N / K»: chữ cái tên gọi (chữ cuối). */
const chuCai = (ten: string) => (ten.trim().split(/\s+/).pop() ?? "?").charAt(0).toUpperCase();

/**
 * Dải các con (thiết kế .cac-con): avatar tròn 56, tên dưới, con đang chọn có vòng ngọc, số việc chờ (cam) góc trên.
 * Nhà 1 con thì gọi chỗ khác không vẽ dải này (N9: chỉ hiện chọn con khi > 1 con).
 */
export function DaiCon<T extends { id: string; ten: string; avatar?: string | null }>({ ds, chon, doi, so, phu, ic, them, nhanSo = "việc chờ duyệt", duoi }: {
  ds: T[]; chon?: string | null; doi?: (c: T) => void; /** số việc chờ theo id con */ so?: Record<string, number>;
  /** dòng nhỏ dưới tên theo id con (Trang chủ: «còn 18′») */ phu?: Record<string, string>; /** ô «＋ Thêm con» cuối dải */ them?: () => void;
  /** icon trạng thái nhỏ góc dưới phải avatar (Trang chủ 14/11 .av i: chơi / học / khoá / chưa dùng) */ ic?: Record<string, TenIcon | null>;
  /** chữ đọc màn hình cho số góc trên (Trang chủ: «lời xin») */ nhanSo?: string;
  /** khối dưới tên theo id con (15/11: viên sao «⭐ −20 sao» — lib/so-sao › VienSao) */ duoi?: Record<string, ReactNode>;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 6, paddingRight: 8 }} accessibilityRole="tablist">
      {ds.map((x, k) => {
        const on = x.id === chon;
        const n = so?.[x.id] ?? 0;
        return (
          <Pressable key={x.id} onPress={doi ? () => doi(x) : undefined} disabled={!doi} accessibilityRole="tab" accessibilityState={{ selected: on }}
            accessibilityLabel={[x.ten, n ? `${n} ${nhanSo}` : "", phu?.[x.id] ?? ""].filter(Boolean).join(", ")} style={{ width: 72, alignItems: "center", gap: 5 }}>
            <View style={[{ borderRadius: 34, padding: 3 }, { borderWidth: 3, borderColor: "transparent" }]}>
              <Avt ten={x.ten} mau={mauCon(x.avatar, k)} co={50} con={x} chon={on} />
              {n ? (
                <View style={{ position: "absolute", right: -4, top: -4, minWidth: 22, height: 22, paddingHorizontal: 5, borderRadius: 11, backgroundColor: M.badge,   // bàn Navy: huy hiệu vàng M.badge #F4C76A, chữ navy (11,4:1)
                  alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: M.nen }}>
                  <Chu kieu="rat" co={12} mau={M.chu} so>{n}</Chu>
                </View>
              ) : null}
              {ic?.[x.id] ? (
                <View style={{ position: "absolute", right: -2, bottom: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: M.the, alignItems: "center", justifyContent: "center",
                  boxShadow: "0px 2px 4px rgba(0,0,0,0.18)" }}>
                  <IconNet ten={ic[x.id]!} co={14} />
                </View>
              ) : null}
            </View>
            <Chu kieu={on ? "den" : "rat"} co={13} mau={on ? M.chinhInk : M.chu2} dong={1}>{x.ten}</Chu>
            {phu?.[x.id] ? <Chu kieu="dam" co={12} mau={M.chu3} dong={1} style={{ marginTop: -5 }}>{phu[x.id]}</Chu> : null}
            {duoi?.[x.id] ? <View style={{ marginTop: -3 }}>{duoi[x.id]}</View> : null}
          </Pressable>
        );
      })}
      {them ? (
        <Pressable onPress={them} accessibilityRole="button" accessibilityLabel="Thêm con" style={{ width: 72, alignItems: "center", gap: 5 }}>
          <View style={{ margin: 6, width: 50, height: 50, borderRadius: 25, backgroundColor: M.the, alignItems: "center", justifyContent: "center", ...KHOI.nho }}>
            <Icon ten="cong" mau={M.chinhInk} co={22} />
          </View>
          <Chu kieu="rat" co={13} mau={M.chu2} dong={1}>Thêm con</Chu>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

/** Hàng chữ cái các con (thiết kế: «B M N K» chồng nhẹ) — dùng ở Thành viên, Mời người nhà, Tài khoản. */
export function ChuCaiCon({ ds, co = 30 }: { ds: { ten: string; avatar?: string | null }[]; co?: number }) {
  return (
    <View style={{ flexDirection: "row" }} accessibilityLabel={ds.map((c) => c.ten).join(", ")}>
      {ds.map((c, k) => (
        <View key={`${c.ten}-${k}`} style={{ marginLeft: k ? -6 : 0, borderRadius: co, borderWidth: 2, borderColor: "#FFFBF5" }}>
          <Avt ten={chuCai(c.ten)} mau={mauCon(c.avatar, k)} co={co} con={c} />
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
              on ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc } : { backgroundColor: M.the, ...KHOI.nho }]}>
            {x.ic ? <Icon3D ten={x.ic} co={18} /> : null}
            <Chu kieu="rat" co={13.5} mau={on ? "#FFFBF5" : M.chu2} dong={1}>{x.chu}</Chu>
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
        chon ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc } : { backgroundColor: M.xamSoft, boxShadow: BONG.lom }]}>
        {chon ? <Icon ten="tick" mau="#FFFBF5" co={16} /> : <Chu kieu="rat" co={22} mau={M.chinhInk} style={{ lineHeight: 24 }}>+</Chu>}
      </View>
    </Pressable>
  );
}

/** Ô icon 3D lõm (thiết kế .e / .ic): nền xám lõm, hoặc `nen` riêng (teal nhạt cho Học / AiiRob, cam nhạt cho Giúp Ba Mẹ). */
export function OLomIcon({ ic, co = 40, nen = M.xamSoft }: { ic: TenIcon; co?: number; nen?: string }) {
  return (
    <View style={{ width: co, height: co, borderRadius: Math.round(co * 0.35), backgroundColor: nen, boxShadow: BONG.lom, alignItems: "center", justifyContent: "center" }}>
      <IconNet ten={ic} co={Math.round(co * 0.55)} />
    </View>
  );
}

/** Viên sao nhỏ chỉ số (thiết kế `.d s` — «⭐ 10»), vàng chỉ cho sao. */
export function SaoNho({ n, dau }: { n: number; dau?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 3, paddingLeft: 4, paddingRight: 8, borderRadius: 11, backgroundColor: M.diemSoft }}>
      <Icon3D ten="sao" co={16} />
      <Chu kieu="rat" co={12.5} mau={M.diemInk} so>{`${dau ?? ""}${n.toLocaleString("vi-VN")}`}</Chu>
    </View>
  );
}

/** Hàng ô chọn lõm (thiết kế «Con nhận ⭐5 ⭐10 …», «Con đổi bằng …»): ô đang chọn = teal nhạt viền ngọc. */
export function ChonO<T extends string | number>({ ds, chon, doi, sao }: { ds: { gia: T; chu: string; ic?: TenIcon; nhan?: string }[]; chon: T | null; doi: (v: T) => void; sao?: boolean }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityRole="radiogroup">
      {ds.map((x) => {
        const on = x.gia === chon;
        return (
          <Pressable key={String(x.gia)} onPress={() => doi(x.gia)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={x.nhan ?? (sao ? `${x.chu} sao` : x.chu)}
            style={[{ flexGrow: 1, minWidth: 64, minHeight: 44, borderRadius: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingHorizontal: 10 },
              on ? { backgroundColor: M.chonSoft, borderWidth: 2, borderColor: M.chinh } : { backgroundColor: M.xamSoft, boxShadow: BONG.lom }]}>
            {sao ? <Icon3D ten="sao" co={18} /> : x.ic ? <Icon3D ten={x.ic} co={18} /> : null}
            <Chu kieu="rat" co={14.5} mau={on ? M.chinhInk : M.chu}>{x.chu}</Chu>
          </Pressable>
        );
      })}
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
