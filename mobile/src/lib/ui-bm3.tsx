// Thành phần riêng cho hành trình Ba Mẹ «Ứng dụng & web» + «Cài đặt & hỗ trợ» (docs/thiet-ke-chot/bm-ung-dung, bm-cai-dat — thiết kế chốt 05/11).
// Chỉ THÊM (không đổi thành phần chung trong ui.tsx): tiêu đề mục chữ thường đậm (.muc), hàng vàng «Con đang xin» (.xin), ô icon lõm (.ic),
// hai nhóm danh sách Tính phút / Không tính phút (15/11 — #262), ô tìm, màn kết quả (Grow + .tin + Hoàn tác), ba nút quyết (.ba). Token Clay (mau.ts, clay.ts).
import type { ReactNode } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { MAU_NHOM, PHU_NHOM, TEN_NHOM, type Nhom } from "./app-web";
import { BONG, KHOI, MEN } from "./clay";
import { Chu, DauSach, F, Icon, IconNet, M, NhanMen, Rob, type LinhVat, type TenIcon } from "./ui";

/** Tiêu đề một mục (.muc): chữ thường đậm 15, phải là liên kết nhỏ (vd «Xem từng app ›»). */
export function MucTieu({ chu, phai }: { chu: string; phai?: { chu: string; bam: () => void } }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8, marginHorizontal: 6, marginBottom: -4 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flexShrink: 1 }}>
        <DauSach mau={M.dauSach} />
        <Chu kieu="tieu" co={17} mau={M.chu} style={{ flexShrink: 1 }}>{chu}</Chu>
      </View>
      {phai ? (
        <Pressable onPress={phai.bam} hitSlop={10} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}>
          <Chu kieu="rat" co={14} mau={M.lienKet}>{phai.chu}</Chu>
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
        : <IconNet ten={ic} co={Math.round(co * 0.55)} />}
    </View>
  );
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
      {phai ?? (bam ? <Icon ten="phai" mau={M.oNhap} co={18} /> : null)}
    </>
  );
  const st = [{ flexDirection: "row" as const, alignItems: "center" as const, gap: 10, minHeight: 62 }, !dau && { borderTopWidth: 1, borderTopColor: "rgba(120,98,70,0.18)" }];
  return bam ? <Pressable onPress={bam} accessibilityRole="button" accessibilityLabel={`${tieu}${phu ? `, ${phu}` : ""}`} style={st}>{noi}</Pressable> : <View style={st}>{noi}</View>;
}

/** Ô tìm lõm (.tim) — gõ trước, kết quả hiện bên dưới; nút ✕ xoá chữ. */
export function OTim({ gia, doi, goiY, nhan, url, khongKinh }: { gia: string; doi: (t: string) => void; goiY: string; nhan: string; url?: boolean;
  /** bỏ kính lúp (bàn Lần đầu them-at57ypdc / them-ubomxl31: ô tìm chỉ có chữ + «✕») */ khongKinh?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 52, paddingLeft: 18, paddingRight: 4, borderRadius: 26, backgroundColor: M.xamSoft, boxShadow: BONG.lom }}>
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
      style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, paddingVertical: 4, paddingLeft: 14, paddingRight: 12, borderRadius: 22, backgroundColor: M.xamSoft, boxShadow: BONG.lom }}>
      <IconNet ten="tro_lai" co={22} />
      <Chu kieu="dam" co={13} mau={M.chu2} style={{ flex: 1 }}><Chu kieu="rat" co={13}>{`Đã bỏ qua ${so} lời xin`}</Chu> · con xin lại được</Chu>
      <Chu kieu="rat" co={13} mau={M.chinhInk}>Xem ›</Chu>
    </Pressable>
  );
}

// ---------------------------------------------------------------- hai nhóm của danh sách (15/11 — #262): Tính phút (vàng) · Không tính phút (xanh)

/** Viền vàng ô đang chọn / dấu ✓ trên nền navy (bàn: #D9AE57). */
export const VANG_VIEN = "#D9AE57";

/** Tiêu đề nhóm (.muc + chấm màu — bàn them-g7g1cel5@v11): «● Tính phút ……… trả bằng sao». Chấm vàng / navy 12. */
export function MucNhom({ nhom, phai }: { nhom: Nhom; phai?: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, marginHorizontal: 6, marginBottom: -2 }}>
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: MAU_NHOM[nhom] }} />
      <Chu kieu="rat" co={15} style={{ flex: 1 }}>{TEN_NHOM[nhom]}</Chu>
      <Chu kieu="dam" co={12.5} mau={M.chu2}>{phai ?? (nhom === "tinh_phut" ? "trả bằng sao" : "vào thoải mái")}</Chu>
    </View>
  );
}

/** Khối một nhóm (.ds): thẻ kem nổi, các dòng cách nhau vạch mảnh. (Bàn vẽ lề 12 — giữ 16 theo chuẩn lề thẻ LE-THE.) */
export function KhoiNhom({ children }: { nhom?: Nhom; children: ReactNode }) {
  return <View style={{ paddingVertical: 4, paddingHorizontal: 16, borderRadius: 24, backgroundColor: M.the, ...KHOI.the }}>{children}</View>;
}

/** Hai ô nhóm xếp dọc (màn một app / một trang, cả Hằng ngày lẫn Lần đầu — bàn bm2-app-web@v20 · them-qjgsxgos@v1 `.o`): bóng tròn màu nhóm, tên, câu phụ, ô tick;
 *  ô đang chọn đổi navy, viền vàng 2px, chữ kem, tick vàng kim (bóng navy có viền vàng để không chìm vào thẻ navy). */
export function ChonNhom({ gia, doi, tat }: { gia: Nhom | null; doi: (n: Nhom) => void; tat?: boolean }) {
  return (
    <View style={{ gap: 10 }} accessibilityRole="radiogroup" accessibilityLabel="Nhóm">
      {(["tinh_phut", "khong_tinh_phut"] as const).map((k) => {
        const on = gia === k;
        return (
          <NhanMen key={k} onPress={() => doi(k)} disabled={tat} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: tat }} aria-checked={on}
            accessibilityLabel={`${TEN_NHOM[k]}, ${PHU_NHOM[k]}`} muc="khoi" sang={!on} men={MEN.the}
            style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 24, backgroundColor: M.the, ...KHOI.the },
              on && { backgroundColor: M.chu, boxShadow: `0px 0px 0px 2px ${VANG_VIEN}, ${BONG.the}` }]}>
            <View style={{ width: 48, height: 48, borderRadius: 24, opacity: on ? 1 : 0.8, backgroundColor: MAU_NHOM[k], overflow: "hidden",
              ...(on && k === "khong_tinh_phut" ? { borderWidth: 2, borderColor: VANG_VIEN } : null) }}>
              {on && k === "tinh_phut" ? <LinearGradient colors={["#FBE7B0", "#F4C76A", "#C9973B", "#F2D48C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} /> : null}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Chu kieu="rat" co={16} mau={on ? "#F2EBE3" : M.chu}>{TEN_NHOM[k]}</Chu>
              <Chu kieu="dam" co={13} mau={on ? "#E3D9CC" : M.chu2}>{PHU_NHOM[k]}</Chu>
            </View>
            <View style={[{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", overflow: "hidden" }, on ? { backgroundColor: M.diem } : { backgroundColor: M.the, boxShadow: BONG.lom }]}>
              {on ? <Icon ten="tick" mau={M.chu} co={15} /> : null}
            </View>
          </NhanMen>
        );
      })}
    </View>
  );
}

/** Ô icon tròn lõm 42 của một dòng danh sách / kết quả — dùng chung App & web (ds-con, Thêm app/web) và Lần đầu (bàn them-g7g1cel5@v11 · them-mdujxlg2@v19 `.ic`): tròn, nền kem, bóng lõm. */
export const OIconTrang = ({ ic, anh, e }: { ic?: TenIcon; anh?: string | null; /** emoji thay icon (danh mục Lần đầu) */ e?: string }) => (
  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: M.the, alignItems: "center", justifyContent: "center", boxShadow: BONG.lom }}>
    {anh ? <Image source={{ uri: `data:image/png;base64,${anh}` }} style={{ width: 28, height: 28 }} resizeMode="contain" accessibilityIgnoresInvertColors />
      : ic ? <IconNet ten={ic} co={22} /> : <Text style={{ fontSize: 22, lineHeight: 28 }}>{e}</Text>}
  </View>
);

/** Nút tròn ＋ / ✓ của một dòng kết quả ở màn Thêm app / Thêm web (bàn them-at57ypdc@v9 `.c`): hình 32 (＋ kem nổi · ✓ navy viền vàng, dấu vàng), vùng chạm 44. */
export const NutChon = ({ chon }: { chon: boolean }) => (
  <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
    <View style={[{ width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
      chon ? { backgroundColor: M.chu, boxShadow: `0px 0px 0px 2px ${VANG_VIEN}` } : { backgroundColor: M.the, boxShadow: BONG.nho }]}>
      {chon ? <Icon ten="tick" mau={M.diem} co={16} /> : <Icon ten="cong" mau={M.chu} co={16} />}
    </View>
  </View>
);
/** Hai ô nhóm ngang — ngay dưới mục vừa chọn ở màn Thêm app / Thêm web, Hằng ngày lẫn Lần đầu (bàn them-at57ypdc@v9 · them-vw103x88@v13 `.den`): hai ô lõm cạnh nhau, bóng tròn màu nhóm
 *  (mờ khi chưa chọn); ô đang chọn navy, viền vàng 2px, chữ vàng, bóng vàng kim. */
export function ChonNhomNgang({ gia, doi }: { gia: Nhom | null; doi: (n: Nhom) => void }) {
  return (
    <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup">
      {(["tinh_phut", "khong_tinh_phut"] as const).map((k) => {
        const on = gia === k;
        return (
          <NhanMen key={k} onPress={() => doi(k)} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on} accessibilityLabel={`${TEN_NHOM[k]}, ${PHU_NHOM[k]}`}
            muc="chip" sang={!on} men={MEN.the}
            style={[{ flex: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8, minHeight: 60, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 20,
              backgroundColor: M.the, boxShadow: BONG.lom },
              on && { backgroundColor: M.chu, boxShadow: `0px 0px 0px 2px ${VANG_VIEN}` }]}>
            <View style={{ width: 24, height: 24, borderRadius: 12, overflow: "hidden", backgroundColor: MAU_NHOM[k], opacity: on ? 1 : 0.55 }}>
              {on && k === "tinh_phut" ? <LinearGradient colors={["#FBE7B0", "#F4C76A", "#C9973B", "#F2D48C"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} /> : null}
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Chu kieu="rat" co={13.5} mau={on ? M.diem : M.chu} dong={1}>{TEN_NHOM[k]}</Chu>
              <Chu kieu="dam" co={11.5} mau={on ? "#F2EBE3" : M.chu2} dong={1}>{k === "tinh_phut" ? "Trả bằng sao" : "Vào thoải mái"}</Chu>
            </View>
          </NhanMen>
        );
      })}
    </View>
  );
}

/** Nhãn trắng «Luôn bật» (.luon). */
/** Nhãn «Luôn bật» (bàn them-2ru3t5iw `.luon`: viên ngọc nhạt #F2EBE3, chữ ngọc 12/800, không nổi). */
export const NhanLuon = ({ chu = "Luôn bật" }: { chu?: string }) => (
  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: M.chinhSoft }}>
    <Chu kieu="rat" co={12} mau={M.chinhInk}>{chu}</Chu>
  </View>
);

/** Grow nói một câu (.rob + .bong) — đầu màn chọn / gõ. */
export function RobNoi({ lv = "hoc", co = 76, children }: { lv?: LinhVat; co?: number; children: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Rob ten={lv} co={co} />
      <View style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 22, backgroundColor: M.the, ...KHOI.the }}>
        {typeof children === "string" ? <Chu kieu="dam" co={14}>{children}</Chu> : children}
      </View>
    </View>
  );
}

/** Ghép tên con vào đường dẫn: quay về màn trước nếu có, không thì về `ve`. */
export const veHoac = (ve: string) => (router.canGoBack() ? router.back() : router.replace(ve as never));

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

/** Nút viên nhỏ ở góc phải đầu màn («Cài đặt», «Hay gặp ›»). */
export function NutVien({ chu, bam }: { chu: string; bam: () => void }) {
  return (
    <NhanMen onPress={bam} accessibilityRole="button" muc="chip" sang men={MEN.sang}
      style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, backgroundColor: M.the, justifyContent: "center", ...KHOI.nho }}>
      <Chu kieu="rat" co={13.5} mau={M.chinhInk}>{chu}</Chu>
    </NhanMen>
  );
}
