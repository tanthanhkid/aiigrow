// Lời xin của Con (thiết kế chốt 15/11 — bm-con-xin/01 them-a4nqjrmp, bm2-trang-chu, them-0kwhgpq6): MỘT chỗ cho tiêu đề, xử lý một chạm và thẻ lời xin
// dùng ở Hôm nay, «<Con> đang xin» (/yeu-cau?con=) và Chờ duyệt.
//  • vay_sao (và them_gio / ngoai_le / ngoai_gio của máy cũ — máy chủ nhận như xin vay, #263/#265) — «Xin Ba Mẹ cho vay 20 sao»: «Cho vay 20 sao» =
//    yeu-cau/:id/dong-y {soSao} ⇒ khoản vay (grantId) để Hoàn tác 60 giây (vay/:id/hoan-tac). Không còn «ngoại lệ», «thêm giờ».
//  • Máy đang khoá (them-0kwhgpq6): lời xin chơi hiện «Xin mở khoá máy · chơi vẫn trừ sao» — «Mở khoá» = mở khoá máy (không cho vay; máy chủ chưa có
//    loại lời xin «mở khoá» riêng nên lời xin được đóng bằng tu-choi kèm lý do «Ba Mẹ đã mở khoá máy»).
//  • mo_web / cai_app — app / web chưa có trong danh sách (#262, #258 — PR #279): «Tính phút» / «Không tính phút» = yeu-cau/:id/dong-y {nhom} (thêm lâu dài
//    vào danh sách) · «Bỏ qua» = yeu-cau/:id/bo-qua ⇒ màn «Đã bỏ qua» (/yeu-cau-web/bo-qua, Hoàn tác 60 giây).
//  • Không cho = yeu-cau/:id/tu-choi {lyDo: «Ba Mẹ chưa cho lúc này»}.
// Sau khi xử lý ⇒ màn kết quả /yeu-cau/xong (params: kieu, ten, phut, muc, may, grant, con, no, sao, phutCon, noTruoc, canh).
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { BONG } from "./clay";
import { bm, laXinVay, type MayCon } from "./api";
import { boQuaXin, hoanTacXin, themTuXin } from "./app-web";
import type { YeuCauMoi } from "./hang-ngay";
import { cauNo, saoTu, soVN, VienSao, type KqVay, type SaoCon } from "./so-sao";
import { Chu, gioPhut, HaiNut, M, Nut, type TenIcon } from "./ui";
import { OLomIcon } from "./ui-viec";

export const LY_DO_KHONG = "Ba Mẹ chưa cho lúc này";
export const LY_DO_MO_KHOA = "Ba Mẹ đã mở khoá máy · chơi vẫn trừ sao";
/** Lời xin vay sao (vay_sao + loại cũ them_gio / ngoai_le / ngoai_gio). */
export const laVay = (y: Pick<YeuCauMoi, "loai">) => laXinVay(y);
/** @deprecated 15/11 — mọi lời «thêm giờ» là lời xin vay; giữ tên cho màn cũ. */
export const laThemGio = laVay;
export const laAppWeb = (y: Pick<YeuCauMoi, "loai">) => y.loai === "mo_web" || y.loai === "cai_app";

/** Tên thứ con xin mở: app / tên miền. */
export const mucXin = (y: Pick<YeuCauMoi, "loai" | "gia_tri" | "pham_vi">) => (laVay(y) ? "" : y.gia_tri ?? "");

/** Tiêu đề lời xin như thiết kế: «Xin Ba Mẹ cho vay 20 sao», «Xin thêm YouTube», «Xin thêm app CapCut». */
export function tieuXin(y: Pick<YeuCauMoi, "loai" | "phut" | "gia_tri" | "pham_vi"> & { muc_dich?: string | null }) {
  if (laVay(y)) return `Xin Ba Mẹ cho vay ${soVN(y.phut ?? 15)} sao${y.muc_dich === "qua" ? " để đổi quà" : ""}`;
  if (y.loai === "cai_app") return `Xin thêm ${y.gia_tri ?? "app mới"}`;
  if (y.loai === "mo_web") return `Xin thêm ${y.gia_tri ?? "trang web"}`;
  return y.gia_tri ?? "Xin Ba Mẹ";
}

/** Tên máy con gửi lời xin (requests.device_id) — null khi không rõ. */
export const tenMayXin = (y: YeuCauMoi, may: Pick<MayCon, "id" | "ten">[] | undefined) => {
  const id = (y as YeuCauMoi & { device_id?: string | null }).device_id;
  return (id && may?.find((m) => m.id === id)?.ten) || null;
};

export type KetQua = {
  kieu: "vay" | "mo" | "khong" | "mo_khoa" | "bo_qua"; ten: string; con: string; phut?: number; muc?: string; may?: string | null; grant?: string;
  /** «Bỏ qua» (app / web): hoàn tác trong 60 giây — POST yeu-cau/:id/hoan-tac */ hoan?: () => Promise<unknown>;
  /** «mo»: định danh máy chủ trả (dong-y › muc) — tìm đúng hàng trong danh sách khi đổi nhóm / hoàn tác */ ma?: string;
  /** cho vay: trạng thái sao sau vay + nợ trước + câu cảnh báo nợ > 1.000 */ sau?: SaoCon; noTruoc?: number; canh?: string | null;
};
/** Mở màn kết quả. */
export const denXong = (k: KetQua) => router.push({ pathname: "/yeu-cau/xong", params: {
  kieu: k.kieu, ten: k.ten, con: k.con, ...(k.phut ? { phut: String(k.phut) } : {}), ...(k.muc ? { muc: k.muc } : {}), ...(k.may ? { may: k.may } : {}),
  ...(k.grant ? { grant: k.grant } : {}), ...(k.ma ? { ma: k.ma } : {}), ...(k.sau ? { no: String(k.sau.no), sao: String(k.sau.sao), phutCon: String(k.sau.phutCon) } : {}),
  ...(k.noTruoc !== undefined ? { noTruoc: String(k.noTruoc) } : {}), ...(k.canh ? { canh: k.canh } : {}) } } as never);

/** «Cho vay N sao» một chạm đúng số sao con xin (hoặc `soSao`). `truoc` = sao của con trước khi vay (để ghi «Nợ cũ 20 + vay 20 sao»). */
export async function choXin(y: YeuCauMoi, may: string | null, soSao = y.phut ?? 15, truoc?: SaoCon | null): Promise<KetQua> {
  const r = await bm.goi<{ grantId?: string; vay?: KqVay }>(`yeu-cau/${y.id}/dong-y`, { soSao });
  return { kieu: "vay", ten: y.ten_con, con: y.child_id, phut: soSao, may, grant: r.grantId ?? r.vay?.id, sau: r.vay ? saoTu(r.vay) : undefined,
    noTruoc: truoc?.no, canh: r.vay?.canhBaoNo?.cau ?? null };
}
/** App / web chưa có trong danh sách: thêm vào nhóm «Tính phút» (trừ sao) hoặc «Không tính phút». */
export async function choAppWeb(y: YeuCauMoi, may: string | null, tinhPhut: boolean): Promise<KetQua> {
  const r = await themTuXin(y.id, tinhPhut ? "tinh_phut" : "khong_tinh_phut");
  return { kieu: "mo", ten: y.ten_con, con: y.child_id, muc: y.gia_tri ?? "", ma: r?.muc, may, phut: tinhPhut ? 1 : undefined };
}
/** «Bỏ qua» lời xin app / web: không ghi gì, Con xin lại được. Không có `sau` ⇒ màn «Đã bỏ qua» có Hoàn tác (60 giây, đếm theo đồng hồ máy);
 *  có `sau` (Chờ duyệt) ⇒ trả kết quả kèm `hoan` để màn đó báo toast + tải lại tại chỗ. */
export async function boQuaAppWeb(y: YeuCauMoi, may: string | null, sau?: (k: KetQua) => void) {
  await boQuaXin(y.id);
  if (sau) { sau({ kieu: "bo_qua", ten: y.ten_con, con: y.child_id, muc: y.gia_tri ?? "lời xin", may, hoan: () => hoanTacXin(y.id) }); return; }
  router.push({ pathname: "/yeu-cau-web/bo-qua", params: { id: y.id, ten: y.gia_tri ?? "lời xin", con: y.ten_con, ...(may ? { may } : {}) } });
}
export async function khongChoXin(y: YeuCauMoi, may: string | null, lyDo = LY_DO_KHONG): Promise<KetQua> {
  const ly = lyDo.trim().slice(0, 120) || LY_DO_KHONG;
  await bm.goi(`yeu-cau/${y.id}/tu-choi`, { lyDo: ly });
  return { kieu: "khong", ten: y.ten_con, con: y.child_id, may, muc: ly };
}

/** Thẻ một lời xin: tiêu đề · «19:20 · con đang chờ trên Laptop» · lời con · hàng nút. `lam` bọc thao tác (useLam của màn).
 *  `sau` (mặc định: mở màn kết quả) — Chờ duyệt dùng toast «Hoàn tác» tại chỗ. `truc`: app / web trả lời ngay 3 nút (Chờ duyệt, «đang xin»).
 *  `sao`: sao của con (lời xin vay hiện «−20 sao · Đang nợ Ba Mẹ 20 sao»). `moKhoa`: máy của con đang khoá ⇒ lời xin chơi = «Xin mở khoá máy».
 *  `oIcon` (Trang chủ — bàn bm2-trang-chu@v35 / them-0kwhgpq6@v9 .de-y .dong): ô icon đào bên trái, tiêu đề + dòng phụ mỗi thứ một dòng.
 *  `dangXin` («<Con> đang xin phép» — bàn them-a4nqjrmp@v13 .the): ô icon · tiêu đề · «Laptop · con đang chờ» · giờ bên phải; lời con / `phu` trong ô lõm;
 *  app / web: «Tính phút» nút lớn 2 dòng («Trừ sao của con · 1 sao = 1 phút» — #264) · «Không tính phút» ngọc nhạt | «Bỏ qua». */
export function TheXin({ y, may, lam, dang, phu, bo, sau = denXong, truc, sao, moKhoa, oIcon, dangXin }: {
  y: YeuCauMoi; may: string | null; lam: (fn: () => Promise<unknown>) => void; dang?: boolean; phu?: string; bo?: boolean; sau?: (k: KetQua) => void; truc?: boolean;
  sao?: SaoCon | null; moKhoa?: () => Promise<void>; oIcon?: boolean; dangXin?: boolean;
}) {
  const xong = (fn: () => Promise<KetQua>) => lam(async () => sau(await fn()));
  const vay = laVay(y), mayNgan = may ? may.replace(/ của .*$/, "") : null;
  const xinMoKhoa = vay && !!moKhoa && (y as YeuCauMoi & { muc_dich?: string | null }).muc_dich !== "qua";
  // Trang chủ (bàn bm2-trang-chu@v35): lời xin app / web «Xin mở YouTube»
  const tieu = xinMoKhoa ? "Xin mở khoá máy" : oIcon && laAppWeb(y) && y.gia_tri ? `Xin mở ${y.gia_tri}` : tieuXin(y as YeuCauMoi & { muc_dich?: string | null });
  const dong2 = xinMoKhoa ? `${gioPhut(y.created_at)} · chơi vẫn trừ sao`
    : laAppWeb(y) ? `${gioPhut(y.created_at)} · chưa có trong danh sách${mayNgan ? ` · ${mayNgan}` : ""}`
      : `${gioPhut(y.created_at)} · ${vay && sao?.hetSao ? "hết sao, muốn chơi tiếp" : "con đang chờ"}${mayNgan ? ` · ${mayNgan}` : ""}`;
  const no = vay && sao && !xinMoKhoa ? cauNo(sao) : null;
  // icon theo bàn: xin mở khoá máy «sach», app / web «web», xin vay «dongho» (them-1mnk3mjz)
  const ic: TenIcon = xinMoKhoa ? "sach" : laAppWeb(y) ? "web" : vay ? "dongho" : "chuong";
  return (
    <View style={{ gap: 8, paddingVertical: 12, borderTopWidth: bo ? 1 : 0, borderTopColor: M.vien }}>
      {dangXin ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <OLomIcon ic={ic} co={44} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Chu kieu="rat" co={16}>{tieu}</Chu>
            <Chu kieu="dam" co={12.5} mau={M.chu3}>{[mayNgan, xinMoKhoa ? "chơi vẫn trừ sao" : vay && sao?.hetSao ? "hết sao" : "con đang chờ"].filter(Boolean).join(" · ")}</Chu>
          </View>
          <Chu kieu="rat" co={13} mau={M.chu3} so>{gioPhut(y.created_at)}</Chu>
        </View>
      ) : oIcon ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <OLomIcon ic={ic} co={44} nen="#f3d6b8" />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Chu kieu="rat" co={16} dong={1}>{tieu}</Chu>
            <Chu kieu="dam" co={13} mau={M.canh} dong={1}>{dong2}</Chu>
          </View>
        </View>
      ) : (
        <View>
          <Chu kieu="rat" co={16}>{tieu}</Chu>
          <Chu co={13.5} mau={xinMoKhoa ? M.canh : M.chu3}>{dong2}</Chu>
        </View>
      )}
      {/* Trang chủ (oIcon): bàn bm2-trang-chu / them-0kwhgpq6 không có lời con cho xin app / web, xin mở khoá; xin vay giữ (them-1mnk3mjz) */}
      {/* dangXin: lời con viết (ly_do) luôn hiện trong ô lõm; xin app / web thêm dòng phụ (máy / nhóm) dưới */}
      {dangXin ? (y.ly_do?.trim() || (laAppWeb(y) && phu)) ? (
        <View style={{ gap: 4, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16, backgroundColor: M.xamSoft, boxShadow: BONG.lom }}>
          {y.ly_do?.trim() ? <Chu kieu="dam" co={13.5} mau={M.chu2}>{`«${y.ly_do.trim()}»`}</Chu> : null}
          {laAppWeb(y) && phu ? <Chu kieu="dam" co={13} mau={M.chu3}>{phu}</Chu> : null}
        </View>
      ) : null : y.ly_do?.trim() && !(oIcon && (xinMoKhoa || laAppWeb(y))) ? <Chu co={14.5} mau={M.chu2}>{`«${y.ly_do.trim()}»`}</Chu> : null}
      {vay && sao && !xinMoKhoa ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <VienSao s={sao} />
          {no ? <Chu kieu="dam" co={13} mau={M.canh}>{no.replace(/ · .*$/, "")}</Chu> : null}
        </View>
      ) : null}
      {phu && !dangXin ? <Chu co={13} mau={M.chu3}>{phu}</Chu> : null}
      {xinMoKhoa ? (
        <HaiNut>
          <Nut chu="Không cho" loai="vien" nho dangChay={dang} bam={() => xong(() => khongChoXin(y, may))} />
          <Nut chu="Mở khoá" nho dangChay={dang} bam={() => xong(async () => {
            await moKhoa!();
            await khongChoXin(y, may, LY_DO_MO_KHOA);
            return { kieu: "mo_khoa", ten: y.ten_con, con: y.child_id, may };
          })} />
        </HaiNut>
      ) : laAppWeb(y) && truc && dangXin ? (
        <View style={{ gap: 8 }}>
          <Pressable onPress={() => xong(() => choAppWeb(y, may, true))} disabled={dang} accessibilityRole="button" accessibilityLabel="Tính phút, trừ sao của con"
            style={{ minHeight: 54, borderRadius: 27, alignItems: "center", justifyContent: "center", backgroundColor: M.nut, boxShadow: BONG.toi, opacity: dang ? 0.6 : 1 }}>
            <Chu kieu="rat" co={16} mau="#fff">Tính phút</Chu>
            <Chu kieu="dam" co={11.5} mau={M.chinhSoft}>Trừ sao của con · 1 sao = 1 phút</Chu>
          </Pressable>
          <HaiNut>
            <Nut chu="Không tính phút" loai="xanh" nho dangChay={dang} bam={() => xong(() => choAppWeb(y, may, false))} />
            <Nut chu="Bỏ qua" loai="vien" nho dangChay={dang} bam={() => lam(() => boQuaAppWeb(y, may, sau === denXong ? undefined : sau))} />
          </HaiNut>
        </View>
      ) : laAppWeb(y) && truc ? (
        // thiết kế 15/11 them-a4nqjrmp: «Tính phút · Trừ sao của con · 1 sao = 1 phút» (nút chính) · «Không tính phút» | «Bỏ qua»
        <View style={{ gap: 8 }}>
          <Nut chu="Tính phút" nho rong dangChay={dang} bam={() => xong(() => choAppWeb(y, may, true))} />
          <HaiNut>
            <Nut chu="Không tính phút" loai="vien" nho dangChay={dang} bam={() => xong(() => choAppWeb(y, may, false))} />
            <Nut chu="Bỏ qua" loai="vien" nho dangChay={dang} bam={() => lam(() => boQuaAppWeb(y, may, sau === denXong ? undefined : sau))} />
          </HaiNut>
        </View>
      ) : laAppWeb(y) ? (
        // Trang chủ (bm2-trang-chu 15/11): «Bỏ qua» | «Thêm · Tính phút»
        <HaiNut>
          <Nut chu="Bỏ qua" loai="vien" nho dangChay={dang} bam={() => lam(() => boQuaAppWeb(y, may, sau === denXong ? undefined : sau))} />
          <Nut chu="Thêm · Tính phút" nho dangChay={dang} bam={() => xong(() => choAppWeb(y, may, true))} />
        </HaiNut>
      ) : vay ? (
        <HaiNut>
          <Nut chu="Không cho" loai="vien" nho dangChay={dang} bam={() => xong(() => khongChoXin(y, may))} />
          <Nut chu={`Cho vay ${soVN(y.phut ?? 15)} sao`} nho dangChay={dang} bam={() => xong(() => choXin(y, may, y.phut ?? 15, sao))} />
        </HaiNut>
      ) : (
        <HaiNut>
          <Nut chu="Không cho" loai="vien" nho dangChay={dang} bam={() => xong(() => khongChoXin(y, may))} />
          <Nut chu="Xem" nho bam={() => router.push(`/yeu-cau/${y.id}` as never)} />
        </HaiNut>
      )}
    </View>
  );
}
