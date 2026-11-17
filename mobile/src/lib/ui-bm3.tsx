// Thành phần riêng cho hành trình Ba Mẹ «Ứng dụng & web» + «Cài đặt & hỗ trợ» (docs/thiet-ke-chot/bm-ung-dung, bm-cai-dat — thiết kế chốt 05/11).
// Chỉ THÊM (không đổi thành phần chung trong ui.tsx): tiêu đề mục chữ thường đậm (.muc), hàng vàng «Con đang xin» (.xin), ô icon lõm (.ic),
// hai nhóm danh sách Tính phút / Không tính phút (15/11 — #262), ô tìm, màn kết quả (Grow + .tin + Hoàn tác), ba nút quyết (.ba). Token Clay (mau.ts, clay.ts).
import type { ReactNode } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { bm } from "./api";
import { MAU_NHOM, PHU_NHOM, TEN_NHOM, type Nhom } from "./app-web";
import { BONG, BO_CLAY, KHOI, MEN } from "./clay";
import { Bao, Chu, F, Icon, Icon3D, M, Man, NhanMen, Nut, Rob, type LinhVat, type TenIcon } from "./ui";

/** Tiêu đề một mục (.muc): chữ thường đậm 15, phải là liên kết nhỏ (vd «Xem từng app ›»). */
export function MucTieu({ chu, phai }: { chu: string; phai?: { chu: string; bam: () => void } }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8, marginHorizontal: 6, marginBottom: -4 }}>
      <Chu kieu="rat" co={15} mau={M.chu2} style={{ flexShrink: 1 }}>{chu}</Chu>
      {phai ? (
        <Pressable onPress={phai.bam} hitSlop={10} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}>
          <Chu kieu="rat" co={14} mau={M.chinhInk}>{phai.chu}</Chu>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Ô icon lõm 42 (.ic): icon 3D trên nền xám lõm; `anh` = ảnh thật (icon app máy gửi lên, base64 PNG). */
export function OIcon({ ic, anh, co = 42, nen = M.xamSoft }: { ic: TenIcon; anh?: string | null; co?: number; nen?: string }) {
  return (
    <View style={{ width: co, height: co, borderRadius: Math.round(co / 3), backgroundColor: nen, alignItems: "center", justifyContent: "center", boxShadow: BONG.lom }}>
      {anh ? <Image source={{ uri: `data:image/png;base64,${anh}` }} style={{ width: co * 0.68, height: co * 0.68 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        : <Icon3D ten={ic} co={Math.round(co * 0.66)} />}
    </View>
  );
}

/** Hàng vàng «Con đang xin mở YouTube · 30 phút · lúc 19:20 — Xem ›» (.xin) — cũng dùng cho «Đang chờ nhận lời · Gửi lại». */
export function HangVang({ ic = "chuong", tieu, phu, nut = "Xem ›", bam, bamNut }: { ic?: TenIcon; tieu: string; phu?: string; nut?: string; bam?: () => void; bamNut?: () => void }) {
  const noi = (
    <>
      <OIcon ic={ic} nen="#f6dc95" />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={15} mau={M.diemInk}>{tieu}</Chu>
        {phu ? <Chu kieu="dam" co={12.5} mau={M.diemInk}>{phu}</Chu> : null}
      </View>
      {bamNut ? (
        <NhanMen onPress={bamNut} accessibilityRole="button" accessibilityLabel={`${nut.replace(" ›", "")}: ${tieu}`} muc="chip" sang men={MEN.sang}
          style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: "#fff", justifyContent: "center", ...KHOI.nho }}>
          <Chu kieu="rat" co={13.5} mau={M.diemInk}>{nut}</Chu>
        </NhanMen>
      ) : <Chu kieu="rat" co={14} mau={M.diemInk}>{nut}</Chu>}
    </>
  );
  const st = { flexDirection: "row" as const, alignItems: "center" as const, gap: 12, paddingVertical: 12, paddingLeft: 12, paddingRight: 14, borderRadius: 24,
    backgroundColor: M.diemSoft, ...KHOI.the };
  return bam ? <NhanMen onPress={bam} accessibilityRole="button" accessibilityLabel={`${tieu}${phu ? `, ${phu}` : ""}`} muc="khoi" style={st}>{noi}</NhanMen>
    : <View style={st}>{noi}</View>;
}

/** Một dòng trong một nhóm (.lg): icon, tên, phụ; bên phải «›» (khi bấm được) hoặc phần tuỳ ý (`phai`). */
export function DongDen({ dau, trai, tieu, phu, bam, phai }: {
  dau?: boolean; trai: ReactNode; tieu: string; phu?: string; bam?: () => void; phai?: ReactNode;
}) {
  const noi = (
    <>
      {trai}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={15} dong={1}>{tieu}</Chu>
        {phu ? <Chu kieu="dam" co={12.5} mau={M.chu3} dong={1}>{phu}</Chu> : null}
      </View>
      {phai ?? (bam ? <Icon ten="phai" mau="#8a908d" co={18} /> : null)}
    </>
  );
  const st = [{ flexDirection: "row" as const, alignItems: "center" as const, gap: 10, minHeight: 62 }, !dau && { borderTopWidth: 1.5, borderTopColor: "rgba(0,0,0,0.06)" }];
  return bam ? <Pressable onPress={bam} accessibilityRole="button" accessibilityLabel={`${tieu}${phu ? `, ${phu}` : ""}`} style={st}>{noi}</Pressable> : <View style={st}>{noi}</View>;
}

/** Đầu màn chi tiết (.hd): icon to trong ô clay, tên, một dòng phụ. */
export function DauMuc({ ic, anh, tieu, phu }: { ic: TenIcon; anh?: string | null; tieu: string; phu?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 4, paddingTop: 4 }}>
      <View style={{ width: 72, height: 72, borderRadius: 26, backgroundColor: M.the, alignItems: "center", justifyContent: "center", ...KHOI.the }}>
        {anh ? <Image source={{ uri: `data:image/png;base64,${anh}` }} style={{ width: 46, height: 46 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : <Icon3D ten={ic} co={46} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={24} dong={2}>{tieu}</Chu>
        {phu ? <Chu kieu="dam" co={13.5} mau={M.chu3}>{phu}</Chu> : null}
      </View>
    </View>
  );
}

/** Ô tìm lõm (.tim) — gõ trước, kết quả hiện bên dưới; nút ✕ xoá chữ. */
export function OTim({ gia, doi, goiY, nhan, url, khongKinh }: { gia: string; doi: (t: string) => void; goiY: string; nhan: string; url?: boolean;
  /** bỏ kính lúp (bàn Lần đầu them-at57ypdc / them-ubomxl31: ô tìm chỉ có chữ + «✕») */ khongKinh?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 52, paddingLeft: 18, paddingRight: 4, borderRadius: 26, backgroundColor: "#ecebe7", boxShadow: BONG.lom }}>
      {khongKinh ? null : <Icon ten="tim_kiem" mau={M.chu3} co={18} />}
      <TextInput value={gia} onChangeText={doi} placeholder={goiY} placeholderTextColor={M.chu3} autoCapitalize="none" autoCorrect={false} autoFocus
        keyboardType={url ? "url" : "default"} accessibilityLabel={nhan} style={{ flex: 1, minWidth: 0, fontFamily: F.dam, fontSize: 16, color: M.chu, paddingVertical: 12 }} />
      {gia ? (
        <Pressable onPress={() => doi("")} accessibilityRole="button" accessibilityLabel="Xoá chữ" hitSlop={6}
          style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Icon ten="x" mau={M.chu3} co={16} />
        </Pressable>
      ) : null}
    </View>
  );
}

/** Hàng lõm «Đã bỏ qua N lời xin · con xin lại được — Xem ›» (thay hàng «Luôn chặn» — #258) ở tab App & web và danh sách App / Web. */
export function HangBoQua({ so, bam }: { so: number; bam: () => void }) {
  return (
    <Pressable onPress={bam} accessibilityRole="button" accessibilityLabel={`Đã bỏ qua ${so} lời xin, con xin lại được. Xem`}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, paddingVertical: 4, paddingLeft: 14, paddingRight: 12, borderRadius: 22, backgroundColor: "#ecebe7", boxShadow: BONG.lom }}>
      <Icon3D ten="tro_lai" co={24} />
      <Chu kieu="dam" co={13} mau={M.chu2} style={{ flex: 1 }}><Chu kieu="rat" co={13}>{`Đã bỏ qua ${so} lời xin`}</Chu> · con xin lại được</Chu>
      <Chu kieu="rat" co={13} mau={M.chinhInk}>Xem ›</Chu>
    </Pressable>
  );
}

// ---------------------------------------------------------------- hai nhóm của danh sách (15/11 — #262): Tính phút (vàng) · Không tính phút (xanh)

const NEN_NHOM: Record<Nhom, string> = { tinh_phut: "#fdf6e2", khong_tinh_phut: "#eef6f2" };
const VIEN_NHOM: Record<Nhom, string> = { tinh_phut: "#e0a20c", khong_tinh_phut: "#1f9d6a" };

/** Tiêu đề nhóm (.muc + chấm màu): «● Tính phút ……… trả bằng sao». */
export function MucNhom({ nhom, phai }: { nhom: Nhom; phai?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, marginHorizontal: 6, marginBottom: -2 }}>
      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: MAU_NHOM[nhom], boxShadow: "inset 0px 2px 0px rgba(255,255,255,0.4), inset 0px -4px 6px -2px rgba(0,0,0,0.25)" }} />
      <Chu kieu="rat" co={15} mau={M.chu2} style={{ flex: 1 }}>{TEN_NHOM[nhom]}</Chu>
      <Chu kieu="dam" co={12.5} mau={M.chu3}>{phai ?? (nhom === "tinh_phut" ? "trả bằng sao" : "vào thoải mái")}</Chu>
    </View>
  );
}

/** Khối một nhóm (.ds vàng / xanh nhạt): các dòng cách nhau vạch mảnh. Không nhóm ⇒ nền thẻ. (Bàn vẽ lề 12 — giữ 16 theo chuẩn lề thẻ LE-THE.) */
export function KhoiNhom({ nhom, children }: { nhom?: Nhom; children: ReactNode }) {
  return <View style={{ paddingVertical: 4, paddingHorizontal: 16, borderRadius: 26, backgroundColor: nhom ? NEN_NHOM[nhom] : "#f7f6f3", ...KHOI.the }}>{children}</View>;
}

/** Hai ô nhóm xếp dọc (màn một app / một trang): bóng tròn màu nhóm, tên, câu phụ, dấu chọn. */
export function ChonNhom({ gia, doi, tat }: { gia: Nhom | null; doi: (n: Nhom) => void; tat?: boolean }) {
  return (
    <View style={{ gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel="Nhóm">
      {(["tinh_phut", "khong_tinh_phut"] as const).map((k) => {
        const on = gia === k;
        return (
          <NhanMen key={k} onPress={() => doi(k)} disabled={tat} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: tat }} aria-checked={on}
            accessibilityLabel={`${TEN_NHOM[k]}, ${PHU_NHOM[k]}`} muc="khoi" sang men={MEN.the}
            style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 26, backgroundColor: on && k === "tinh_phut" ? "#fdf3d8" : M.the, ...KHOI.the },
              on && { boxShadow: `0px 0px 0px 3px ${VIEN_NHOM[k]}, ${BONG.the}` }]}>
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: MAU_NHOM[k], opacity: on ? 1 : 0.35,
              boxShadow: "inset 0px 3px 0px rgba(255,255,255,0.45), inset 0px -8px 12px -4px rgba(0,0,0,0.25), 0px 8px 14px -8px rgba(0,0,0,0.4)" }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Chu kieu="rat" co={16}>{TEN_NHOM[k]}</Chu>
              <Chu kieu="dam" co={13} mau={M.chu3}>{PHU_NHOM[k]}</Chu>
            </View>
            <View style={[{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" }, on ? { backgroundColor: M.chinh } : { backgroundColor: "#ecebe7", boxShadow: BONG.lom }]}>
              {on ? <Icon ten="tick" mau="#fff" co={15} /> : null}
            </View>
          </NhanMen>
        );
      })}
    </View>
  );
}

/** Ô icon trắng nổi của một dòng danh sách / kết quả — dùng chung App & web (ds-con, Thêm app/web) và Lần đầu (lan-dau-ds › DongKetQua) (.ic — bàn them-g7g1cel5@v7 · them-vw103x88@v8): 42, nền trắng, bóng đổ mềm (không lõm). */
export const OIconTrang = ({ ic, anh, e }: { ic?: TenIcon; anh?: string | null; /** emoji thay icon (danh mục Lần đầu) */ e?: string }) => (
  <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", boxShadow: "0px 8px 12px -8px rgba(28,32,30,0.3)" }}>
    {anh ? <Image source={{ uri: `data:image/png;base64,${anh}` }} style={{ width: 28, height: 28 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      : ic ? <Icon3D ten={ic} co={26} /> : <Text style={{ fontSize: 22, lineHeight: 28 }}>{e}</Text>}
  </View>
);

/** Nút tròn ＋ / ✓ của một dòng kết quả ở màn Thêm app / Thêm web (cả Lần đầu) (.c — bàn them-vw103x88@v8): hình 32 (lõm xám ＋ · xanh ✓), vùng chạm 44. */
export const NutChon = ({ chon }: { chon: boolean }) => (
  <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
    <View style={[{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
      chon ? { backgroundColor: M.chinh, boxShadow: "inset 0px 1.5px 0px rgba(255,255,255,0.3), inset 0px -4px 6px -2px rgba(0,0,0,0.3)" } : { backgroundColor: "#ecebe7", boxShadow: BONG.lom }]}>
      <Chu kieu="rat" co={chon ? 15 : 18} mau={chon ? "#fff" : M.chinhInk}>{chon ? "✓" : "+"}</Chu>
    </View>
  </View>
);
/** Hai ô nhóm ngang — ngay dưới mục vừa chọn ở màn Thêm app / Thêm web và Lần đầu (lan-dau-ds › HoiNhom) (bàn bm-ung-dung them-vw103x88@v8 · them-yzl99l3y@v9 `.den`): hai thẻ
 *  trắng phồng cạnh nhau, bóng tròn màu nhóm (mờ khi chưa chọn), «Tính phút · Trả bằng sao» | «Không tính phút · Vào thoải mái»; ô đang chọn viền 3px màu nhóm. */
export function ChonNhomNgang({ gia, doi }: { gia: Nhom; doi: (n: Nhom) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup">
      {(["tinh_phut", "khong_tinh_phut"] as const).map((k) => {
        const on = gia === k;
        return (
          <NhanMen key={k} onPress={() => doi(k)} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={`${TEN_NHOM[k]}, ${PHU_NHOM[k]}`}
            muc="chip" sang men={MEN.the}
            style={[{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 6, minHeight: 60, paddingVertical: 8, paddingHorizontal: 8, borderRadius: 20,
              backgroundColor: on && k === "tinh_phut" ? "#fdf3d8" : "#fff", ...KHOI.the },
              on && { boxShadow: `0px 0px 0px 3px ${VIEN_NHOM[k]}, ${BONG.the}` }]}>
            <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: MAU_NHOM[k], opacity: on ? 1 : 0.4,
              boxShadow: "inset 0px 2px 0px rgba(255,255,255,0.45), inset 0px -5px 7px -2px rgba(0,0,0,0.25)" }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Chu kieu="rat" co={13.5}>{TEN_NHOM[k]}</Chu>
              <Chu kieu="dam" co={11.5} mau={M.chu3}>{k === "tinh_phut" ? "Trả bằng sao" : "Vào thoải mái"}</Chu>
            </View>
          </NhanMen>
        );
      })}
    </View>
  );
}

/** Nút tròn ＋ / ✓ (.c) của một dòng kết quả. */
export const NutCong = ({ chon }: { chon: boolean }) => (
  <View style={[{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }, chon ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc } : { backgroundColor: "#fff", ...KHOI.the }]}>
    <Icon ten={chon ? "tick" : "cong"} mau={chon ? "#fff" : M.chinhInk} co={chon ? 18 : 20} />
  </View>
);

/** Nhãn trắng «Luôn bật» (.luon). */
export const NhanLuon = ({ chu = "Luôn bật" }: { chu?: string }) => (
  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: "#fff", ...KHOI.nho }}>
    <Chu kieu="rat" co={12} mau={M.chinhInk}>{chu}</Chu>
  </View>
);

/** Grow nói một câu (.rob + .bong) — đầu màn chọn / gõ. */
export function RobNoi({ lv = "hoc", co = 76, children }: { lv?: LinhVat; co?: number; children: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Rob ten={lv} co={co} />
      <View style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 22, backgroundColor: "#fff", ...KHOI.the }}>
        {typeof children === "string" ? <Chu kieu="dam" co={14}>{children}</Chu> : children}
      </View>
    </View>
  );
}

/** Màn kết quả (Đã bỏ qua YouTube / Đã mời…): Grow lớn, tiêu đề, thẻ tin, nút về + Hoàn tác. */
export function ManKetQua({ lv = "xong", tieu, ic, tin, phu, nut, hoan, lui, loi }: {
  loi?: string | null; lv?: LinhVat; tieu: string; ic: TenIcon; tin: string; phu?: string; nut: { chu: string; bam: () => void }; hoan?: { chu: string; bam: () => void; dangChay?: boolean }; lui?: () => void;
}) {
  return (
    <Man lui={{ chu: "", bam: lui ?? nut.bam }} day={<>
      {loi ? <Bao loai="loi" tieu={loi} ic="canh_bao" /> : null}
      <Nut chu={nut.chu} rong bam={nut.bam} />
      {hoan ? <Nut chu={hoan.chu} loai="vien" rong dangChay={hoan.dangChay} bam={hoan.bam} /> : null}
    </>}>
      <View style={{ alignItems: "center", paddingTop: 24, gap: 6 }}>
        <Rob ten={lv} co={200} />
        <Chu kieu="rat" co={24} style={{ textAlign: "center", letterSpacing: -0.4 }}>{tieu}</Chu>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 24, backgroundColor: M.the, ...KHOI.the }}>
        <OIcon ic={ic} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Chu kieu="rat" co={15}>{tin}</Chu>
          {phu ? <Chu kieu="dam" co={12.5} mau={M.chu3}>{phu}</Chu> : null}
        </View>
      </View>
    </Man>
  );
}

/** Ba nút quyết lớn (.ba — thiết kế 15/11 bm-ung-dung/13): `x` than chì chữ trắng (nút chính «Tính phút»), `c` trắng chữ đậm («Không tính phút»),
 *  `b` xám lõm («Bỏ qua»), `d` trắng chữ đỏ. `cham` = bóng tròn màu nhóm thay icon. */
export function NutQuyet({ loai, ic, cham, chu, phu, bam, dangChay }: { loai: "x" | "c" | "b" | "d"; ic?: TenIcon; cham?: string; chu: string; phu?: string; bam: () => void; dangChay?: boolean }) {
  const nen = loai === "x" ? M.nut : loai === "b" ? "#ecebe7" : M.the;
  const mau = loai === "x" ? "#fff" : loai === "d" ? M.loi : M.chu;
  return (
    <NhanMen onPress={bam} disabled={dangChay} accessibilityRole="button" accessibilityLabel={phu ? `${chu}, ${phu}` : chu} muc="khoi" sang={loai !== "x"}
      men={loai === "x" ? MEN.toi : loai === "b" ? undefined : MEN.sang}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 10, paddingHorizontal: 16, borderRadius: BO_CLAY.o, backgroundColor: nen,
        boxShadow: loai === "x" ? BONG.toi : loai === "b" ? BONG.lom : BONG.the, opacity: dangChay ? 0.6 : 1 }}>
      {cham ? <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: cham,
        boxShadow: "inset 0px 2px 0px rgba(255,255,255,0.45), inset 0px -5px 8px -3px rgba(0,0,0,0.25)" }} /> : ic ? <Icon3D ten={ic} co={32} mau={mau} /> : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={16} mau={mau}>{chu}</Chu>
        {phu ? <Chu kieu="dam" co={12} mau={mau} style={{ opacity: 0.85 }}>{phu}</Chu> : null}
      </View>
    </NhanMen>
  );
}

/** Ghép tên con vào đường dẫn: quay về màn trước nếu có, không thì về `ve`. */
export const veHoac = (ve: string) => (router.canGoBack() ? router.back() : router.replace(ve as never));

/** 19:20 hôm nay / «21/10» ngày khác. */
export const lucNgan = (s: string | null | undefined) => {
  if (!s) return "";
  const t = new Date(s), h = new Date();
  const hh = `${String(t.getHours()).padStart(2, "0")}:${String(t.getMinutes()).padStart(2, "0")}`;
  return t.toDateString() === h.toDateString() ? hh : `${String(t.getDate()).padStart(2, "0")}/${String(t.getMonth() + 1).padStart(2, "0")}`;
};

/** Đoán icon 3D cho tên app / tên miền khi máy không gửi icon thật. */
export function icCuaApp(ten: string): TenIcon {
  const t = ten.toLowerCase();
  if (/roblox|minecraft|game|steam|epic|garena|lien quan|liên quân|free ?fire|pubg/.test(t)) return "game";
  if (/scratch|paint|draw|vẽ|ve\b/.test(t)) return "but";
  if (/zalo|messenger|facebook|chat|tin nhắn|telegram|discord/.test(t)) return "tin";
  if (/sách|sach|book|dict|từ điển|tu dien|khan|đọc|doc|kindle/.test(t)) return "sach";
  if (/aiirob|zoom|teams|meet|word|excel|powerpoint|office|học|hoc/.test(t)) return "may_tinh";
  if (/youtube|tiktok|netflix|video|phim|chrome|edge|firefox|safari|brave|\.(com|vn|org|net|edu)/.test(t)) return "web";
  return "luoi";
}

// ---------------------------------------------------------------- luật app / lời xin (GET luat, GET cho-duyet)

export type LuatApp = { child_id: string | null; muc: string; ten: string; loai: "hoc" | "giai_tri" | "chan"; nhom: string | null };
/** Như máy chủ (chinh-sach.ts › kieuMuc): tệp .exe/.app và bundle / gói dạng com.x.y là app; còn lại có đuôi tên miền là web. */
const BUNDLE = /^(com|vn|org|net|io|me|tv|uk|de|jp|us|co|app|dev)\.[a-z0-9_-]+(\.[a-z0-9_-]+)+$/i;
/** Đuôi tên miền hay gặp — mục có dấu chấm mà đuôi không phải tên miền (microsoft.minecraftuwp, ru.keepcoder.telegram, edu.mit.scratch.scratch3) là gói app. */
const DUOI_WEB = new Set(["com", "vn", "org", "net", "edu", "gov", "io", "tv", "me", "co", "app", "dev", "info", "biz", "uk", "us", "jp", "de", "kr", "cn", "ru", "fr", "ai", "gg", "ly", "to", "xyz", "online", "site", "fm"]);
export const laWeb = (muc: string) => /\.[a-z]{2,24}$/i.test(muc) && !/\.(exe|app)$/i.test(muc) && !BUNDLE.test(muc)
  && DUOI_WEB.has(muc.split(".").pop()!.toLowerCase());
/** Một app có thể có nhiều định danh (roblox.exe, robloxplayerbeta.exe, com.roblox.client…) cùng tên ⇒ gom theo tên hiện. */
export const khoaTen = (l: Pick<LuatApp, "ten" | "muc">) => (l.ten || l.muc).trim().toLowerCase();
/** Luật hiệu lực cho một Con: luật riêng của Con thắng luật cả nhà cùng mục. */
export const luatCuaCon = (ds: LuatApp[], con: string) => {
  const m = new Map<string, LuatApp>();
  for (const l of ds) if (!l.child_id) m.set(l.muc, l);
  for (const l of ds) if (l.child_id === con) m.set(l.muc, l);
  return [...m.values()];
};
// ---------------------------------------------------------------- thẻ dòng rời (.tb thông báo · .cc hộp thư hỗ trợ), nút viên đầu màn (.cai · .faq)

/** Thẻ một dòng rời (mỗi việc một thẻ): `vach` = vạch màu bên trái (cam: việc mới cần để ý · đỏ: gấp). `phai` = chữ hành động «Xem ›» hoặc nút tuỳ ý. */
export function TheDong({ trai, tieu, phu, phai, vach, bam, nhanDoc }: {
  trai: ReactNode; tieu: string; phu?: string; phai?: ReactNode; vach?: string; bam?: () => void; nhanDoc?: string;
}) {
  const st = [{ flexDirection: "row" as const, alignItems: "center" as const, gap: 12, padding: 12, borderRadius: 24, backgroundColor: vach ? "#fff" : M.the, overflow: "hidden" as const, ...KHOI.the }];
  const noi = (
    <>
      {vach ? <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, backgroundColor: vach }} /> : null}
      {trai}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={15}>{tieu}</Chu>
        {phu ? <Chu kieu="dam" co={12.5} mau={M.chu3} dong={2}>{phu}</Chu> : null}
      </View>
      {typeof phai === "string" ? <Chu kieu="rat" co={13} mau={M.chinhInk}>{phai}</Chu> : phai}
    </>
  );
  return bam ? <NhanMen onPress={bam} accessibilityRole="button" accessibilityLabel={nhanDoc ?? `${tieu}${phu ? `, ${phu}` : ""}`} muc="khoi" sang style={st}>{noi}</NhanMen>
    : <View style={st}>{noi}</View>;
}

/** Nút viên nhỏ ở góc phải đầu màn («Cài đặt», «Hay gặp ›»). */
export function NutVien({ chu, bam }: { chu: string; bam: () => void }) {
  return (
    <NhanMen onPress={bam} accessibilityRole="button" muc="chip" sang men={MEN.sang}
      style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: M.the, justifyContent: "center", ...KHOI.nho }}>
      <Chu kieu="rat" co={13.5} mau={M.chinhInk}>{chu}</Chu>
    </NhanMen>
  );
}

// ---------------------------------------------------------------- quỹ giờ chơi hôm nay (S1: GET con/:id/quy — L2)

export type QuyCon = { daDung: number; tongPhut: number; conPhut: number; tyLe?: { sao: number; phut: number } };
/** Quỹ giờ chơi hôm nay của một con; máy chủ cũ (chưa có S1) ⇒ null, dùng phút chơi / trần ngày của `gia-dinh`. */
export const napQuyCon = (id: string) => bm.goi<{ quy: QuyCon }>(`con/${id}/quy`).then((r) => r.quy, () => null);
export const gioChoi = (c: { phutChoi: number; tranNgay: number }, q: QuyCon | null | undefined) =>
  q ? { da: q.daDung, tong: q.tongPhut, con: q.conPhut } : { da: c.phutChoi, tong: c.tranNgay, con: Math.max(0, c.tranNgay - c.phutChoi) };
