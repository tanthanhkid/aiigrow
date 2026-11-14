// Lời xin của Con (thiết kế chốt 05/11 — bm-hang-ngay 01/19–22, bm-duyet 02/06/07): MỘT chỗ cho tiêu đề, xử lý một chạm và thẻ «Không cho / Cho N phút»
// dùng ở Hôm nay, «<Con> đang xin» (/yeu-cau?con=) và Chờ duyệt.
//  • them_gio  — «Thêm 20 phút chơi»: Cho = yeu-cau/:id/dong-y {phut} (Ba Mẹ tặng, không trừ sao, cộng vào quỹ hôm nay) ⇒ có grantId để Hoàn tác 60 giây.
//  • ngoai_le / ngoai_gio — «Mở YouTube 30 phút» / «Mở cả máy 30 phút»: Cho = dong-y {phut} (không trừ giờ chơi, không trừ sao, tới hạn).
//  • mo_web / cai_app — app / web lạ: chọn «dùng thoải mái» (Học, luôn) hay «trừ giờ chơi» (Giải trí, luôn) — Hôm nay mở màn chi tiết.
//  • Không cho = yeu-cau/:id/tu-choi {lyDo: «Ba Mẹ chưa cho lúc này»}.
// Sau khi xử lý ⇒ màn kết quả /yeu-cau/xong (params: kieu, ten, phut, muc, may, grant, con).
import { router } from "expo-router";
import { View } from "react-native";
import { bm, type MayCon } from "./api";
import type { YeuCauMoi } from "./hang-ngay";
import { Chu, gioPhut, HaiNut, M, Nut } from "./ui";

export const LY_DO_KHONG = "Ba Mẹ chưa cho lúc này";
export const laThemGio = (y: Pick<YeuCauMoi, "loai">) => y.loai === "them_gio";
export const laNgoaiLe = (y: Pick<YeuCauMoi, "loai">) => y.loai === "ngoai_le" || y.loai === "ngoai_gio";
export const laAppWeb = (y: Pick<YeuCauMoi, "loai">) => y.loai === "mo_web" || y.loai === "cai_app";

/** Tên thứ con xin mở: app / tên miền, ngoại lệ cả máy ⇒ «cả máy». */
export const mucXin = (y: Pick<YeuCauMoi, "loai" | "gia_tri" | "pham_vi">) =>
  laNgoaiLe(y) ? (y.pham_vi === "app" && y.gia_tri ? y.gia_tri : "cả máy") : y.gia_tri ?? "";

/** Tiêu đề lời xin như thiết kế: «Thêm 20 phút chơi», «Mở YouTube 30 phút», «Dùng app CapCut», «Vào vi.wikipedia.org». */
export function tieuXin(y: Pick<YeuCauMoi, "loai" | "phut" | "gia_tri" | "pham_vi">) {
  if (laThemGio(y)) return `Thêm ${y.phut ?? 15} phút chơi`;
  if (laNgoaiLe(y)) return `Mở ${mucXin(y)} ${y.phut ?? 15} phút`;
  if (y.loai === "cai_app") return `Dùng app ${y.gia_tri ?? "mới"}`;
  if (y.loai === "mo_web") return `Vào ${y.gia_tri ?? "trang web"}`;
  return y.gia_tri ?? "Xin Ba Mẹ";
}

/** Tên máy con gửi lời xin (requests.device_id) — null khi không rõ. */
export const tenMayXin = (y: YeuCauMoi, may: Pick<MayCon, "id" | "ten">[] | undefined) => {
  const id = (y as YeuCauMoi & { device_id?: string | null }).device_id;
  return (id && may?.find((m) => m.id === id)?.ten) || null;
};

export type KetQua = { kieu: "them_gio" | "mo" | "khong" | "ngoai_le"; ten: string; con: string; phut?: number; muc?: string; may?: string | null; grant?: string };
/** Mở màn kết quả. */
export const denXong = (k: KetQua) => router.push({ pathname: "/yeu-cau/xong", params: {
  kieu: k.kieu, ten: k.ten, con: k.con, ...(k.phut ? { phut: String(k.phut) } : {}), ...(k.muc ? { muc: k.muc } : {}), ...(k.may ? { may: k.may } : {}),
  ...(k.grant ? { grant: k.grant } : {}) } } as never);

/** «Cho» một chạm (thêm giờ / ngoại lệ) đúng số phút con xin (hoặc `phut`). Trả thông tin cho màn kết quả. */
export async function choXin(y: YeuCauMoi, may: string | null, phut = y.phut ?? 15): Promise<KetQua> {
  const r = await bm.goi<{ grantId?: string }>(`yeu-cau/${y.id}/dong-y`, { phut });
  return laThemGio(y) ? { kieu: "them_gio", ten: y.ten_con, con: y.child_id, phut, may, grant: r.grantId }
    : { kieu: "ngoai_le", ten: y.ten_con, con: y.child_id, phut, muc: mucXin(y), may };
}
/** App / web lạ: «dùng thoải mái» (Học, luôn) hoặc «trừ giờ chơi» (Giải trí, luôn). */
export async function choAppWeb(y: YeuCauMoi, may: string | null, tinhGio: boolean): Promise<KetQua> {
  await bm.goi(`yeu-cau/${y.id}/dong-y`, { phanLoai: tinhGio ? "giai_tri" : "hoc", phamVi: "vinh_vien" });
  return { kieu: "mo", ten: y.ten_con, con: y.child_id, muc: y.gia_tri ?? "", may, phut: tinhGio ? 1 : undefined };
}
export async function khongChoXin(y: YeuCauMoi, may: string | null, lyDo = LY_DO_KHONG): Promise<KetQua> {
  const ly = lyDo.trim().slice(0, 120) || LY_DO_KHONG;
  await bm.goi(`yeu-cau/${y.id}/tu-choi`, { lyDo: ly });
  return { kieu: "khong", ten: y.ten_con, con: y.child_id, may, muc: ly };
}

/** Thẻ một lời xin: tiêu đề · «Lúc 19:20 · trên Laptop» · lời con · hàng nút. `lam` bọc thao tác (useLam của màn). */
/** `sau` (mặc định: mở màn kết quả) — Chờ duyệt dùng toast «Hoàn tác» tại chỗ. `truc`: app / web lạ trả lời ngay 3 nút (Chờ duyệt) thay vì mở màn chi tiết. */
export function TheXin({ y, may, lam, dang, phu, bo, sau = denXong, truc }: {
  y: YeuCauMoi; may: string | null; lam: (fn: () => Promise<unknown>) => void; dang?: boolean; phu?: string; bo?: boolean; sau?: (k: KetQua) => void; truc?: boolean;
}) {
  const xong = (fn: () => Promise<KetQua>) => lam(async () => sau(await fn()));
  return (
    <View style={{ gap: 8, paddingVertical: 12, borderTopWidth: bo ? 1 : 0, borderTopColor: "#efefec" }}>
      <View>
        <Chu kieu="rat" co={16}>{tieuXin(y)}</Chu>
        {/* thiết kế 14/11: «19:20 · con đang chờ trên Laptop» */}
        <Chu co={13.5} mau={M.chu3}>{`${gioPhut(y.created_at)} · con đang chờ${may ? ` trên ${may.replace(/ của .*$/, "")}` : ""}`}</Chu>
      </View>
      {y.ly_do?.trim() ? <Chu co={14.5} mau={M.chu2}>{`«${y.ly_do.trim()}»`}</Chu> : null}
      {phu ? <Chu co={13} mau={M.chu3}>{phu}</Chu> : null}
      {laAppWeb(y) && truc ? (
        <View style={{ gap: 8 }}>
          <Nut chu="Cho, dùng thoải mái" ic="tick" nho rong dangChay={dang} bam={() => xong(() => choAppWeb(y, may, false))} />
          <HaiNut>
            <Nut chu="Cho, trừ giờ chơi" loai="vien" nho dangChay={dang} bam={() => xong(() => choAppWeb(y, may, true))} />
            <Nut chu="Không cho" loai="huy" nho dangChay={dang} bam={() => xong(() => khongChoXin(y, may))} />
          </HaiNut>
        </View>
      ) : laAppWeb(y) ? (
        <HaiNut>
          <Nut chu="Không cho" loai="vien" nho dangChay={dang} bam={() => xong(() => khongChoXin(y, may))} />
          <Nut chu="Xem rồi cho" nho bam={() => router.push(`/yeu-cau/${y.id}` as never)} />
        </HaiNut>
      ) : (
        <HaiNut>
          <Nut chu="Không cho" loai="vien" nho dangChay={dang} bam={() => xong(() => khongChoXin(y, may))} />
          {/* ngoại lệ ⇒ mở màn chi tiết: số phút phải kẹp theo «tối đa ngoại lệ» của từng Con (máy chủ không kẹp — review PR #183) */}
          {!laThemGio(y) ? <Nut chu="Xem rồi cho" nho bam={() => router.push(`/yeu-cau/${y.id}` as never)} />
            : <Nut chu={`Cho ${y.phut ?? 15} phút`} nho dangChay={dang} bam={() => xong(() => choXin(y, may))} />}
        </HaiNut>
      )}
    </View>
  );
}
