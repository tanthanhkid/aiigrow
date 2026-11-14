// Thành phần riêng cho hành trình Ba Mẹ «Ứng dụng & web» + «Cài đặt & hỗ trợ» (docs/thiet-ke-chot/bm-ung-dung, bm-cai-dat — thiết kế chốt 05/11).
// Chỉ THÊM (không đổi thành phần chung trong ui.tsx): tiêu đề mục chữ thường đậm (.muc), hàng vàng «Con đang xin» (.xin), ô icon lõm (.ic),
// đèn 3 màu cho app / web (14/11), ô tìm, màn kết quả (Grow + .tin + Hoàn tác), ba nút quyết (.ba). Dùng token Clay (mau.ts, clay.ts).
import type { ReactNode } from "react";
import { Image, Pressable, TextInput, View } from "react-native";
import { router } from "expo-router";
import { bm, type ManHinhTuan, type YeuCau } from "./api";
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

export type CheDoChan = "chi_app_duoc_phep" | "mo_het";
/** Tên hai chế độ chặn (Nghi chốt 14/11 — N2). Mã nội bộ giữ `chi_app_duoc_phep`. */
export const TEN_CHE_DO: Record<CheDoChan, string> = { mo_het: "Mở hết", chi_app_duoc_phep: "Chặn app & web" };
export const IC_CHE_DO: Record<CheDoChan, TenIcon> = { mo_het: "mo_khoa", chi_app_duoc_phep: "khien" };

// ---------------------------------------------------------------- đèn 3 màu cho từng app / trang web (thiết kế chốt 14/11 bm-ung-dung — N3, N4)
// Xanh «Dùng / Vào thoải mái» = luật `hoc` (không trừ giờ chơi) · Vàng «Tính giờ» = `giai_tri` (trừ vào quỹ giờ chơi chung) · Đỏ «Chặn» = `chan`.
export type Den = "x" | "v" | "d";
export const LOAI_DEN: Record<Den, LuatApp["loai"]> = { x: "hoc", v: "giai_tri", d: "chan" };
/** Luật / trạng thái ⇒ đèn (`cho_phep` của web = luật `hoc`). Chưa có luật ⇒ null. */
export const denCua = (loai: string | null | undefined): Den | null =>
  loai === "hoc" || loai === "cho_phep" ? "x" : loai === "giai_tri" ? "v" : loai === "chan" ? "d" : null;
export const MAU_DEN: Record<Den, string> = { x: "#1f9d6a", v: "#f2b218", d: "#d23b2a" };
const NEN_DEN: Record<Den, string> = { x: "#f7f6f3", v: "#fdf6e2", d: "#fbebe8" };
/** Chữ của một đèn — app «Dùng thoải mái», web «Vào thoải mái»; chỉ nói «Tính giờ / Trừ vào giờ chơi», không nói còn bao nhiêu phút. */
export const chuDen = (d: Den, web?: boolean) => ({
  x: { tieu: web ? "Vào thoải mái" : "Dùng thoải mái", phu: "Không trừ giờ chơi" },
  v: { tieu: "Tính giờ", phu: "Trừ vào giờ chơi" },
  d: { tieu: "Chặn", phu: web ? "Con không vào được" : "Con không mở được" },
})[d];

/** Bóng đèn tròn (.bong) — mờ khi chưa chọn. */
export const BongDen = ({ den, co = 48, mo }: { den: Den; co?: number; mo?: boolean }) => (
  <View style={{ width: co, height: co, borderRadius: co / 2, backgroundColor: MAU_DEN[den], opacity: mo ? 0.35 : 1,
    boxShadow: "inset 0px 3px 0px rgba(255,255,255,0.45), inset 0px -8px 12px -4px rgba(0,0,0,0.25), 0px 8px 14px -8px rgba(0,0,0,0.4)" }} />
);

/** Ba ô đèn xếp dọc (.den .o) — màn chi tiết một app / một trang. */
export function ChonDen({ gia, doi, web, ds = ["x", "v", "d"], tat }: { gia: Den | null; doi: (d: Den) => void; web?: boolean; ds?: Den[]; tat?: boolean }) {
  return (
    <View style={{ gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel="Đèn">
      {ds.map((k) => {
        const on = gia === k, c = chuDen(k, web);
        return (
          <NhanMen key={k} onPress={() => doi(k)} disabled={tat} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: tat }} aria-checked={on}
            accessibilityLabel={`${c.tieu}, ${c.phu}`} muc="khoi" sang men={MEN.the}
            style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 26, backgroundColor: on && k === "v" ? "#fdf3d8" : M.the, ...KHOI.the },
              on && { boxShadow: `0px 0px 0px 3px ${k === "v" ? "#e0a20c" : MAU_DEN[k]}, ${BONG.the}` }]}>
            <BongDen den={k} mo={!on} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Chu kieu="rat" co={16}>{c.tieu}</Chu>
              <Chu kieu="dam" co={13} mau={M.chu3}>{c.phu}</Chu>
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

/** Hai ô đèn ngang trong rãnh lõm (.chon .den) — ngay dưới mục vừa chọn ở màn Thêm app / Thêm web. */
export function ChonDenNgang({ gia, doi, web }: { gia: Den; doi: (d: Den) => void; web?: boolean }) {
  return (
    <View style={{ flexDirection: "row", gap: 6, padding: 4, borderRadius: 20, backgroundColor: "#ecebe7", boxShadow: BONG.lom }} accessibilityRole="radiogroup">
      {(["x", "v"] as const).map((k) => {
        const on = gia === k, c = chuDen(k, web);
        return (
          <NhanMen key={k} onPress={() => doi(k)} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={`${c.tieu}, ${c.phu}`}
            muc="chip" sang={!on} men={on ? MEN.the : undefined}
            style={[{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 52, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16 },
              on && { backgroundColor: k === "v" ? "#fdf3d8" : "#fff", boxShadow: `inset 0px 0px 0px 2px ${k === "v" ? "#e0a20c" : MAU_DEN.x}, ${BONG.nho}` }]}>
            <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: MAU_DEN[k] }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Chu kieu="rat" co={13.5} mau={on ? (k === "v" ? "#6b4800" : M.chinhInk) : M.chu2}>{c.tieu}</Chu>
              <Chu kieu="dam" co={11.5} mau={M.chu3}>{c.phu}</Chu>
            </View>
          </NhanMen>
        );
      })}
    </View>
  );
}

/** Tiêu đề nhóm đèn (.muc + chấm màu), bên phải số nhỏ («2 app»). */
export function MucDen({ den, chu, phai }: { den: Den; chu: string; phai?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, marginHorizontal: 6, marginBottom: -2 }}>
      <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: MAU_DEN[den], boxShadow: "inset 0px 2px 0px rgba(255,255,255,0.4), inset 0px -4px 6px -2px rgba(0,0,0,0.25)" }} />
      <Chu kieu="rat" co={15} mau={M.chu2} style={{ flex: 1 }}>{chu}</Chu>
      {phai ? <Chu kieu="dam" co={12.5} mau={M.chu3}>{phai}</Chu> : null}
    </View>
  );
}

/** Khối một nhóm đèn (.ds / .ds.vang / .ds.do): các dòng cách nhau vạch mảnh. */
export function NhomDen({ den = "x", children }: { den?: Den; children: ReactNode }) {
  return <View style={{ paddingVertical: 4, paddingHorizontal: 16, borderRadius: 26, backgroundColor: NEN_DEN[den], ...KHOI.the }}>{children}</View>;
}

/** Một dòng trong nhóm đèn (.lg): icon, tên, phụ; bên phải «›», nút «Gỡ chặn» (`go`) hoặc phần tuỳ ý (`phai`). */
export function DongDen({ dau, trai, tieu, phu, bam, go, phai }: {
  dau?: boolean; trai: ReactNode; tieu: string; phu?: string; bam?: () => void; go?: () => void; phai?: ReactNode;
}) {
  const noi = (
    <>
      {trai}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={15} dong={1}>{tieu}</Chu>
        {phu ? <Chu kieu="dam" co={12.5} mau={M.chu3} dong={1}>{phu}</Chu> : null}
      </View>
      {phai ?? (go ? (
        <NhanMen onPress={go} accessibilityRole="button" accessibilityLabel={`Gỡ chặn ${tieu}`} muc="chip" sang men={MEN.sang}
          style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "#fff", justifyContent: "center", ...KHOI.the }}>
          <Chu kieu="rat" co={13.5} mau={M.chinhInk}>Gỡ chặn</Chu>
        </NhanMen>
      ) : bam ? <Icon ten="phai" mau="#8a908d" co={18} /> : null)}
    </>
  );
  const st = [{ flexDirection: "row" as const, alignItems: "center" as const, gap: 10, minHeight: 62 }, !dau && { borderTopWidth: 1.5, borderTopColor: "rgba(0,0,0,0.06)" }];
  return bam && !go ? <Pressable onPress={bam} accessibilityRole="button" accessibilityLabel={`${tieu}${phu ? `, ${phu}` : ""}`} style={st}>{noi}</Pressable> : <View style={st}>{noi}</View>;
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
export function OTim({ gia, doi, goiY, nhan, url }: { gia: string; doi: (t: string) => void; goiY: string; nhan: string; url?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 52, paddingLeft: 18, paddingRight: 4, borderRadius: 26, backgroundColor: "#ecebe7", boxShadow: BONG.lom }}>
      <Icon ten="tim_kiem" mau={M.chu3} co={18} />
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

/** Nút tròn ＋ / ✓ (.c) của một dòng kết quả. */
export const NutCong = ({ chon }: { chon: boolean }) => (
  <View style={[{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }, chon ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc } : { backgroundColor: "#fff", ...KHOI.the }]}>
    <Icon ten={chon ? "tick" : "cong"} mau={chon ? "#fff" : M.chinhInk} co={chon ? 18 : 20} />
  </View>
);

/** Phút con đã dùng HÔM NAY cho các mục (GET con/:id/man-hinh — tuần này, giây theo ngày). Web khớp cả tên miền con. null = không có số liệu. */
export function phutHomNay(mh: ManHinhTuan | null | undefined, muc: string[], kieu: "app" | "web") {
  if (!mh) return null;
  const i = mh.theoNgay.findIndex((n) => n.ngay === mh.homNay);
  if (i < 0) return null;
  const ds = muc.map((m) => m.toLowerCase());
  const khop = (id: string) => ds.some((m) => id === m || (kieu === "web" && id.endsWith(`.${m}`)));
  const giay = mh.ds.filter((x) => x.kieu === kieu && khop(x.id.toLowerCase())).reduce((a, x) => a + (x.theoNgay[i] ?? 0), 0);
  return Math.round(giay / 60);
}
export const napManHinh = (con: string) => bm.goi<ManHinhTuan>(`con/${con}/man-hinh`).catch(() => null);

/** Nhãn «Tính giờ» (vàng) / «Dùng thoải mái» (ngọc) — .tg.v / .tg.x. */
export function NhanGio({ tinh, nho }: { tinh: boolean; nho?: boolean }) {
  return (
    <View style={{ paddingHorizontal: nho ? 8 : 10, paddingVertical: nho ? 2 : 4, borderRadius: 11, backgroundColor: tinh ? M.diemSoft : M.chinhSoft, flexShrink: 0 }}>
      <Chu kieu="rat" co={nho ? 11 : 12} mau={tinh ? M.diemInk : M.chinhInk}>{tinh ? "Tính giờ" : "Dùng thoải mái"}</Chu>
    </View>
  );
}

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

/** Màn kết quả (Đã chặn Roblox / Đã không cho mở YouTube / Đã mời…): Grow lớn, tiêu đề, thẻ tin, nút về + Hoàn tác. */
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

/** Ba nút quyết lớn (.ba): `x` ngọc (đồng ý), `c` vàng (cho thêm), `d` sáng chữ đỏ (không cho). */
export function NutQuyet({ loai, ic, chu, phu, bam, dangChay }: { loai: "x" | "c" | "d"; ic: TenIcon; chu: string; phu?: string; bam: () => void; dangChay?: boolean }) {
  const nen = loai === "x" ? M.chinh : loai === "c" ? M.diemSoft : M.the;
  const mau = loai === "x" ? "#fff" : loai === "c" ? M.diemInk : M.loi;
  return (
    <NhanMen onPress={bam} disabled={dangChay} accessibilityRole="button" accessibilityLabel={phu ? `${chu}, ${phu}` : chu} muc="khoi" sang={loai !== "x"}
      men={loai === "x" ? MEN.ngoc : MEN.sang}
      style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingVertical: 10, paddingHorizontal: 16, borderRadius: BO_CLAY.o, backgroundColor: nen,
        boxShadow: loai === "x" ? BONG.ngoc : BONG.the, opacity: dangChay ? 0.6 : 1 }}>
      <Icon3D ten={ic} co={32} mau={mau} />
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
export const gomTheoTen = (ds: LuatApp[]) => {
  const m = new Map<string, LuatApp[]>();
  for (const l of ds) { const k = khoaTen(l); m.set(k, [...(m.get(k) ?? []), l]); }
  return [...m.values()];
};
/** Luật trước khi đặt (POST luat trả `truoc` — luật riêng đúng phạm vi đó, null = chưa có). */
export type LuatTruoc = { con: string; muc: string; ten: string; loai: string; nhom: string | null; het: string | null } | null;
/** Hoàn tác một lần đặt luật: có luật cũ ⇒ đặt lại đúng luật cũ (giữ hạn), không ⇒ xoá luật vừa tạo; `neuLoai` = chỉ khi luật vẫn là loại vừa đặt. */
export const hoanLuat = (con: string | undefined, muc: string, truoc: LuatTruoc, neuLoai: string) =>
  truoc ? bm.goi("luat", { con, muc: truoc.muc, ten: truoc.ten, loai: truoc.loai, nhom: truoc.nhom ?? undefined, het: truoc.het ?? undefined, neuLoai })
    : bm.goi("luat/xoa", { con, muc, neuLoai });
/** Luật hiệu lực cho một Con: luật riêng của Con thắng luật cả nhà cùng mục. */
export const luatCuaCon = (ds: LuatApp[], con: string) => {
  const m = new Map<string, LuatApp>();
  for (const l of ds) if (!l.child_id) m.set(l.muc, l);
  for (const l of ds) if (l.child_id === con) m.set(l.muc, l);
  return [...m.values()];
};
/** «Con đang xin mở YouTube» / «… dùng Minecraft». */
export const tieuXin = (y: YeuCau) => `Con đang xin ${y.loai === "cai_app" ? "dùng" : "mở"} ${y.gia_tri ?? "app mới"}`;
export const phuXin = (y: YeuCau) => [y.phut ? `${y.phut} phút` : null, `lúc ${lucNgan(y.created_at)}`].filter(Boolean).join(" · ");


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
