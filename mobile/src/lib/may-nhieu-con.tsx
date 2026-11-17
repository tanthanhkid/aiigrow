// #267 «một máy nhiều Con» (docs/API.md mục #267): máy nối 1 Con = máy riêng, ≥ 2 Con = máy chung (Windows / Mac / Android: bé chọn tên + PIN),
// iPhone / iPad chỉ một Con. Luật (sao, danh sách) đi theo Con, máy áp luật của bé đang dùng.
// Một chỗ cho kiểu dữ liệu (GET may/:id/con, trường mới của tuan-thu), cách suy danh sách Con của máy với máy chủ cũ (con / dungChung),
// và các mảnh giao diện dùng chung của các màn máy (thiết kế chốt 15/11: bm2-may-ds, bm2-may-m1, them-okpa735o, them-1016dwpz, them-tmezw761).
import { type ReactNode } from "react";
import { Pressable, Text, View } from "react-native";
import { bm, type PhienDang, type TuanThuMay } from "@/lib/api";
import { BONG, KHOI } from "@/lib/clay";
import { mauHoSo } from "@/lib/lan-dau";
import { Avt, BangTruot, BaoLoi, Chu, DauSach, F, Icon, Icon3D, M, Nut, useLam, type TenIcon } from "@/lib/ui";
import { datKhoaMay } from "@/lib/khoa-may";
import { tenGoi } from "@/lib/hang-ngay";

export type ConNganMay = { id: string; ten: string; avatar: string };
/** Một Con trong `GET may/:id/con › ds` (mọi Con trong nhà, kèm đã gán vào máy chưa). */
export type ConCuaMay = ConNganMay & {
  coPin: boolean; gan: boolean; dangDung: boolean; /** số dư sao hiện có (vi.ts › soDu) — âm = đang nợ */ sao: number; phutHomNay: number; lanCuoi: string | null;
  khoaCon: { khoa: boolean; den: string | null }; mayKhac: { id: string; ten: string; nen: string; rieng: boolean }[]; ganDuoc: boolean; lyDo?: string;
};
/** `GET may/:id/con` — «Máy này ai dùng?» + «Máy cả nhà · chi tiết». */
export type ConMay = {
  may: { id: string; ten: string; nen: string; motCon: boolean; soCon: number; mayChung: boolean; mayRieng: boolean };
  dangDung: (ConNganMay & { tu: string | null; phutHomNay: number }) | null; baMeDungDen: string | null;
  khoaMay: { khoa: boolean; den: string | null }; ds: ConCuaMay[];
};

/** iPhone / iPad: hệ điều hành không đổi người dùng ⇒ chỉ một Con (máy chủ trả `motCon`; máy chủ cũ ⇒ theo nền). */
export const laMotCon = (m: { nen: string; motCon?: boolean }) => m.motCon ?? (m.nen === "ios" || m.nen === "ipados");

/** Con dùng máy — `conDs` (máy chủ #267); máy chủ cũ: máy riêng ⇒ Con của máy, máy dùng chung ⇒ mọi Con trong nhà. */
export function conCuaMay(m: Pick<TuanThuMay, "con" | "dungChung" | "conDs">, caNha: ConNganMay[] = []): ConNganMay[] {
  if (m.conDs) return m.conDs;
  if (m.con) { const c = caNha.find((x) => x.id === m.con); return c ? [c] : []; }
  return m.dungChung ? caNha : [];
}
/** Máy có Con này dùng không (lọc «Máy của <Con>», «Cần để ý» trang chủ). */
export const mayCuaCon = (m: Pick<TuanThuMay, "con" | "dungChung" | "conDs">, con: string) =>
  m.conDs ? m.conDs.some((c) => c.id === con) : m.con === con || m.dungChung;
/** Máy chung = nối ≥ 2 Con. */
export const laMayChung = (m: Pick<TuanThuMay, "con" | "dungChung" | "conDs" | "soCon">) => (m.soCon ?? m.conDs?.length ?? (m.con ? 1 : m.dungChung ? 2 : 0)) >= 2;

/** Tên máy bỏ hậu tố « · <hệ điều hành>» agent cũ gắn («Laptop của Bảo Anh · Windows 11» ⇒ «Laptop của Bảo Anh»). */
export const nganTen = (t: string) => t.replace(/ · .*$/, "");
/** Tên gốc để so khớp (bỏ cả « của <bé>»): «Laptop của Bảo Anh · Windows 11» ⇒ «Laptop». */
export const tenGocMay = (t: string) => nganTen(t).replace(/ của .*$/, "");
/** Phiên chơi đang chạy trên một máy (GET phien-dang — khớp theo tên máy) của bé đang dùng máy; chưa biết bé đang dùng ⇒ `con` (bé riêng của máy) hoặc bất kỳ. */
export function appTrenMay(phien: PhienDang[], may: { ten: string; dangDung?: { id: string } | null }, con?: string | null) {
  const ai = may.dangDung?.id ?? con ?? null;
  const goc = tenGocMay(may.ten);
  return phien.find((p) => p.may && tenGocMay(p.may) === goc && (!ai || p.con === ai)) ?? null;
}

/** Hình máy: máy tính bàn cho máy chung Windows / Mac (thiết kế «Máy cả nhà»), còn lại theo nền. */
export const hinhMay = (nen: string, chung = false): TenIcon =>
  nen === "ios" || nen === "ipados" ? "tablet" : nen === "android" ? "dt" : chung ? "may_tinh" : "laptop";
export const TEN_NEN: Record<string, string> = { windows: "Windows", mac: "Mac", ios: "iPhone / iPad", ipados: "iPad", android: "Android" };

/** «còn 25 sao = 25 phút chơi» (1 sao = 1 phút). Âm ⇒ «đang nợ 20 sao». */
export const cauSao = (n: number) => (n < 0 ? `đang nợ ${-n} sao` : `còn ${n} sao = ${n} phút chơi`);
/** «25 sao» / «−20 sao» (dấu trừ thật U+2212). */
export const soSao = (n: number) => `${n < 0 ? "−" : ""}${Math.abs(n)} sao`;

/** Viên sao nhỏ (thiết kế .diem): vàng «⭐ 25 sao»; âm ⇒ viên cảnh báo «⭐ −20 sao» (nền #ffe6d6, chữ #b34a06). */
export function SaoNho({ n, co = 12 }: { n: number; co?: number }) {
  const no = n < 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingLeft: 4, paddingRight: 7, paddingVertical: 1, borderRadius: 10, backgroundColor: no ? M.canhSoft : M.diemSoft, alignSelf: "flex-start" }}>
      <Icon3D ten="sao" co={co + 2} />
      <Chu kieu="rat" co={co} mau={no ? M.canh : M.diemInk} so>{soSao(n)}</Chu>
    </View>
  );
}

/** Avatar tròn của một Con (màu hồ sơ). */
export const AvtCon = ({ c, co = 36 }: { c: Pick<ConNganMay, "ten" | "avatar">; co?: number }) => <Avt ten={c.ten} mau={mauHoSo(c.avatar)[0]} co={co} con={c} />;
/** Hai–ba avatar chồng nhau (thiết kế .cap). */
export function CapAvt({ ds, co = 22 }: { ds: ConNganMay[]; co?: number }) {
  return (
    <View style={{ flexDirection: "row" }}>
      {ds.slice(0, 3).map((c, k) => <View key={c.id} style={{ marginLeft: k ? -co * 0.28 : 0 }}><AvtCon c={c} co={co} /></View>)}
    </View>
  );
}

/** Hàng đầu màn: nút lùi + tiêu đề 22/800 + dòng phụ 13/700 (thiết kế .top .tde) — hoặc dòng phụ nhỏ cùng hàng (`canh`, thiết kế bm2-may-ds «3 máy · 2 bé»). */
export function DauHaiDong({ tieu, phu, canh, phai, lui }: { tieu: string; phu?: string; canh?: boolean; phai?: ReactNode; lui: () => void }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2, paddingHorizontal: 8, paddingRight: 16, minHeight: 56 }}>
      <Pressable onPress={lui} accessibilityRole="button" accessibilityLabel="Quay lại" hitSlop={6} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
        <Icon ten="trai" mau={M.chinhInk} co={24} />
      </Pressable>
      <View style={{ flex: 1, minWidth: 0, flexDirection: canh ? "row" : "column", alignItems: canh ? "baseline" : "flex-start", gap: canh ? 6 : 0 }}>
        <Text accessibilityRole="header" numberOfLines={1} style={{ flexShrink: 1, fontFamily: F.den, fontSize: 22, lineHeight: 26, letterSpacing: -0.4, color: M.chu }}>{tieu}</Text>
        {phu ? <Chu kieu="rat" co={canh ? 14 : 13} mau={M.chu3} dong={1}>{phu}</Chu> : null}
      </View>
      {phai}
    </View>
  );
}

/** Hộp chữ (thiết kế .hop): ngọc / xám / đào. */
export function HopChu({ loai = "xam", children }: { loai?: "ngoc" | "xam" | "dao"; children: ReactNode }) {
  const [nen, chu] = loai === "ngoc" ? [M.chinhSoft, M.chinhInk] : loai === "dao" ? [M.canhSoft, M.canh] : [M.xamSoft, M.chu2];
  return <View style={{ paddingVertical: 12, paddingHorizontal: 14, borderRadius: 24, backgroundColor: nen }}><Chu kieu="dam" co={13} mau={chu} style={{ lineHeight: 18 }}>{children}</Chu></View>;
}

/** Tiêu đề mục 15/800 + chữ phụ bên phải (thiết kế .muc span «2/2 bé»). */
export function MucPhai({ chu, phai, bam }: { chu: string; phai?: string; bam?: () => void }) {
  const noi = (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 6, marginTop: 8, marginHorizontal: 6, minHeight: bam ? 44 : undefined }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7, flexShrink: 1 }}><DauSach /><Chu kieu="rat" co={15} mau={M.chu} style={{ flexShrink: 1 }}>{chu}</Chu></View>
      {phai ? <Chu kieu="dam7" co={12.5} mau={M.chu3}>{phai}</Chu> : null}
    </View>
  );
  return bam ? <Pressable onPress={bam} accessibilityRole="button" accessibilityLabel={chu}>{noi}</Pressable> : noi;
}

/** Thẻ danh sách clay (thiết kế .ls): các hàng cách nhau đường kẻ #F2EBE3. */
export const TheDs = ({ children }: { children: ReactNode }) => (
  <View style={[{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 28, backgroundColor: M.the }, KHOI.the]}>{children}</View>
);
export const keDau = (k: number) => (k ? { borderTopWidth: 1.5, borderTopColor: M.vien } : null);

/** Ô đánh dấu ngọc 28 (thiết kế .ck): chọn / trống / khoá (icon ổ khoá). */
export function ODanhDau({ chon, khoa }: { chon: boolean; khoa?: boolean }) {
  return (
    <View style={{ width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center",
      ...(chon && !khoa ? { backgroundColor: M.chinh, backgroundImage: "linear-gradient(#138a75, #0A1629)", boxShadow: BONG.ngoc } : { backgroundColor: M.xamSoft, boxShadow: BONG.lom }) }}>
      {khoa ? <Icon3D ten="khoa" co={18} /> : chon ? <Icon ten="tick" mau="#fff" co={16} /> : null}
    </View>
  );
}

/** Nhãn viên «Sẽ khoá» (than chì) / «Vẫn dùng» (ngọc nhạt) của bảng khoá máy. */
export const NhanKhoa = ({ seKhoa }: { seKhoa: boolean }) => (
  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 11, backgroundColor: seKhoa ? M.nut : M.chinhSoft }}>
    <Chu kieu="rat" co={12.5} mau={seKhoa ? "#fff" : M.chinhInk}>{seKhoa ? "Sẽ khoá" : "Vẫn dùng"}</Chu>
  </View>
);

/** Bảng trượt «Khoá <máy>?» (thiết kế them-tmezw761): khoá THEO MÁY (POST may/:id/khoa) — mọi bé dùng máy này «Sẽ khoá»,
 *  máy khác trong nhà «Vẫn dùng». `con` = các bé được gán (tungCon / conDs), `khac` = máy khác (tuan-thu). */
export function BangKhoaTheoMay({ mo, dong, may, con, dangDung, app, khac, xong }: {
  mo: boolean; dong: () => void; may: { id: string; ten: string; nen: string }; con: ConNganMay[]; dangDung?: string | null; app?: string | null;
  khac: { id: string; ten: string; nen: string; rieng: boolean }[];
  xong: (chu: string, hoan: () => Promise<unknown>) => void;
}) {
  const { lam, loi, dangChay } = useLam();
  const chung = con.length >= 2;
  const ngan = may.ten;
  return (
    <BangTruot mo={mo} dong={dong} hinh={hinhMay(may.nen, chung)} hinhPhu="khoa" tieu={`Khoá ${ngan}?`}>
      <Chu kieu="dam" mau={M.chu2} style={{ textAlign: "center", marginTop: -4 }}>
        {`${chung ? "Khoá cho mọi bé dùng máy này" : "Khoá máy này"}${app ? ` · ${app} sẽ đóng` : ""}`}
      </Chu>
      {con.length ? <>
        <Chu kieu="rat" co={14} mau={M.chu2} style={{ marginHorizontal: 6 }}>{`Trên ${ngan}`}</Chu>
        <TheDs>
          {/* bé đang dùng lên đầu (thiết kế them-tmezw761) */}
          {[...con].sort((a, b) => Number(b.id === dangDung) - Number(a.id === dangDung)).map((c, k) => (
            <View key={c.id} style={[{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60 }, keDau(k)]}>
              <AvtCon c={c} co={36} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Chu kieu="rat" dong={1}>{tenGoi(c.ten)}</Chu>
                {c.id === dangDung
                  ? <Chu kieu="dam" co={12.5} mau={M.chu3} dong={1}><Chu kieu="rat" co={12.5} mau={M.chinh}>● Đang dùng</Chu>{app ? ` · ${app}` : ""}</Chu>
                  : <Chu kieu="dam" co={12.5} mau={M.chu3} dong={1}>Không vào được máy này</Chu>}
              </View>
              <NhanKhoa seKhoa />
            </View>
          ))}
        </TheDs>
      </> : null}
      {khac.length ? <>
        <Chu kieu="rat" co={14} mau={M.chu2} style={{ marginHorizontal: 6 }}>Máy khác · không đổi gì</Chu>
        <TheDs>
          {khac.map((x, k) => (
            <View key={x.id} style={[{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60 }, keDau(k)]}>
              <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: M.xamSoft, boxShadow: BONG.lom, alignItems: "center", justifyContent: "center" }}>
                <Icon3D ten={hinhMay(x.nen, !x.rieng)} co={24} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Chu kieu="rat" dong={1}>{x.ten}</Chu>
                <Chu kieu="dam" co={12.5} mau={M.chu3}>{x.rieng ? "Máy riêng" : "Máy chung"}</Chu>
              </View>
              <NhanKhoa seKhoa={false} />
            </View>
          ))}
        </TheDs>
      </> : null}
      <BaoLoi loi={loi} />
      <Nut chu={`Khoá ${ngan} ngay`} ic="khoa" ic3d rong dangChay={dangChay} bam={() => lam(async () => {
        await datKhoaMay(may.id, true); dong();
        xong(`Đã khoá ${ngan}`, () => datKhoaMay(may.id, false));
      })} />
      <Nut chu="Để sau" loai="vien" rong bam={dong} />
    </BangTruot>
  );
}

/** Đặt danh sách Con dùng máy (POST may/:id/con {ds}) — lỗi 400 can_mot_con / 409 ios_mot_con có `message` để hiện. */
export const datConMay = (may: string, ds: string[]) => bm.goi<ConMay & { ok: boolean; them: string[]; bo: string[] }>(`may/${may}/con`, { ds });
/** Gán thêm / bỏ gán một Con (POST may/:id/con/:con/gan|bo). */
export const ganBoCon = (may: string, con: string, gan: boolean) => bm.goi<ConMay>(`may/${may}/con/${con}/${gan ? "gan" : "bo"}`, {});
