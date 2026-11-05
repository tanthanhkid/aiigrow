// Thành phần riêng cho hành trình Ba Mẹ «Ứng dụng & web» + «Cài đặt & hỗ trợ» (docs/thiet-ke-chot/bm-ung-dung, bm-cai-dat — thiết kế chốt 05/11).
// Chỉ THÊM (không đổi thành phần chung trong ui.tsx): tiêu đề mục chữ thường đậm (.muc), hàng vàng «Con đang xin» (.xin), ô icon lõm (.ic),
// thẻ 2 chế độ chặn (.che), lưới chọn app (.luoi .o), màn kết quả (Rob + .tin + Hoàn tác), ba nút quyết (.ba). Dùng token Clay (mau.ts, clay.ts).
import type { ReactNode } from "react";
import { Image, Pressable, View } from "react-native";
import { router } from "expo-router";
import type { YeuCau } from "./api";
import { BONG, BO_CLAY, KHOI, MEN } from "./clay";
import { Chu, Icon, Icon3D, LopMen, M, Man, NhanMen, Nut, Rob, type LinhVat, type TenIcon } from "./ui";

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
const CHE: Record<CheDoChan, { ic: TenIcon; tieu: string; phu: string }> = {
  mo_het: { ic: "web", tieu: "Mở hết", phu: "Chỉ chặn web người lớn" },
  chi_app_duoc_phep: { ic: "khoa", tieu: "Chỉ app được phép", phu: "App mới phải xin Ba Mẹ" },
};
/** Hai ô chế độ chặn (.che) — ô đang chọn viền ngọc 3. `doi` trống ⇒ chỉ hiện (Người trông giúp). */
export function TheCheDo({ cheDo, doi, tat }: { cheDo: CheDoChan; doi?: (v: CheDoChan) => void; tat?: boolean }) {
  return (
    <View style={{ flexDirection: "row", gap: 10 }} accessibilityRole="radiogroup">
      {(["mo_het", "chi_app_duoc_phep"] as const).map((k) => {
        const on = cheDo === k;
        return (
          <NhanMen key={k} onPress={() => doi?.(k)} disabled={!doi || tat} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: !doi }}
            accessibilityLabel={`${CHE[k].tieu}, ${CHE[k].phu}`} muc="khoi" sang men={MEN.the}
            style={[{ flex: 1, minWidth: 0, gap: 6, padding: 14, borderRadius: 26, backgroundColor: M.the, ...KHOI.the },
              on && { boxShadow: `0px 0px 0px 3px ${M.chinh}, ${BONG.the}` }]}>
            <Icon3D ten={CHE[k].ic} co={36} />
            <Chu kieu="rat" co={15}>{CHE[k].tieu}</Chu>
            <Chu kieu="dam" co={12} mau={M.chu3}>{CHE[k].phu}</Chu>
          </NhanMen>
        );
      })}
    </View>
  );
}

/** Một thẻ chế độ (màn «App trên Laptop»): icon + chế độ đang chạy + nút «Đổi chế độ». */
export function TheCheDoNgan({ cheDo, doi }: { cheDo: CheDoChan; doi?: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 26, backgroundColor: M.the,
      boxShadow: `0px 0px 0px 3px ${M.chinh}, ${BONG.the}` }}>
      <LopMen men={MEN.the} bo={26} />
      <Icon3D ten={CHE[cheDo].ic} co={40} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={15.5}>{CHE[cheDo].tieu}</Chu>
        <Chu kieu="dam" co={12} mau={M.chu3}>{CHE[cheDo].phu}</Chu>
      </View>
      {doi ? (
        <NhanMen onPress={doi} accessibilityRole="button" muc="chip" sang style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: M.chinhSoft, justifyContent: "center" }}>
          <Chu kieu="rat" co={13.5} mau={M.chinhInk}>Đổi chế độ</Chu>
        </NhanMen>
      ) : null}
    </View>
  );
}

/** Ô chọn trong lưới 3 cột (.luoi .o): icon to, tên, nhãn tính giờ; đã chọn ⇒ viền ngọc + dấu ✓. */
export function OChonApp({ ten, ic, anh, tinhGio, chon, bam }: { ten: string; ic: TenIcon; anh?: string | null; tinhGio: boolean; chon: boolean; bam: () => void }) {
  return (
    <NhanMen onPress={bam} accessibilityRole="checkbox" accessibilityState={{ checked: chon }} accessibilityLabel={`${ten}, ${tinhGio ? "tính vào giờ chơi" : "không tính giờ"}`}
      muc="khoi" sang men={MEN.the}
      style={[{ width: "31.5%", flexGrow: 1, alignItems: "center", paddingTop: 14, paddingBottom: 12, paddingHorizontal: 4, borderRadius: 26, backgroundColor: M.the, gap: 8, ...KHOI.the },
        chon && { boxShadow: `0px 0px 0px 3px ${M.chinh}, ${BONG.the}` }]}>
      {chon ? (
        <View style={{ position: "absolute", right: 8, top: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: M.chinh, alignItems: "center", justifyContent: "center", boxShadow: BONG.ngoc }}>
          <Icon ten="tick" mau="#fff" co={14} />
        </View>
      ) : null}
      <OIcon ic={ic} anh={anh} co={56} />
      <Chu kieu="rat" co={13.5} dong={2} style={{ textAlign: "center" }}>{ten}</Chu>
      <NhanGio tinh={tinhGio} nho />
    </NhanMen>
  );
}

/** Nhãn «Tính vào giờ chơi» (vàng) / «Không tính giờ» (ngọc) — .tg.v / .tg.x. */
export function NhanGio({ tinh, nho }: { tinh: boolean; nho?: boolean }) {
  return (
    <View style={{ paddingHorizontal: nho ? 8 : 10, paddingVertical: nho ? 2 : 4, borderRadius: 11, backgroundColor: tinh ? M.diemSoft : M.chinhSoft, flexShrink: 0 }}>
      <Chu kieu="rat" co={nho ? 11 : 12} mau={tinh ? M.diemInk : M.chinhInk}>{tinh ? "Tính vào giờ chơi" : "Không tính giờ"}</Chu>
    </View>
  );
}

/** Nhãn trắng «Luôn bật» (.luon). */
export const NhanLuon = ({ chu = "Luôn bật" }: { chu?: string }) => (
  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, backgroundColor: "#fff", ...KHOI.nho }}>
    <Chu kieu="rat" co={12} mau={M.chinhInk}>{chu}</Chu>
  </View>
);

/** Rob nói một câu (.rob + .bong) — đầu màn chọn / gõ. */
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

/** Màn kết quả (Đã chặn Roblox / Đã không cho mở YouTube / Đã mời…): Rob lớn, tiêu đề, thẻ tin, nút về + Hoàn tác. */
export function ManKetQua({ lv = "xong", tieu, ic, tin, phu, nut, hoan, lui }: {
  lv?: LinhVat; tieu: string; ic: TenIcon; tin: string; phu?: string; nut: { chu: string; bam: () => void }; hoan?: { chu: string; bam: () => void; dangChay?: boolean }; lui?: () => void;
}) {
  return (
    <Man lui={{ chu: "", bam: lui ?? nut.bam }} day={<>
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
export const laWeb = (muc: string) => /\.[a-z]{2,24}$/i.test(muc) && !/\.(exe|app)$/i.test(muc);
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
