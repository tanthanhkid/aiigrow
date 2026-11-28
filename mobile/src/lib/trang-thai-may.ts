// #657: MỘT trạng thái hiển thị cho mỗi máy ở mọi màn Ba Mẹ (Máy trong nhà, chi tiết máy, Hồ sơ Con, Màn hình, Cả nhà). Máy chủ tính (server/lib/hien-thi-may.ts)
// và gửi `hienThi`; máy chủ cũ không gửi ⇒ tính lại cùng luật từ các trường có sẵn. «Cần sửa» chỉ là máy có việc để sửa (thiếu quyền / lệch chuẩn) —
// máy mất mạng / đang tắt KHÔNG phải «cần sửa».
export type HienThiMay = "dang_go" | "tat" | "mat_mang" | "can_sua" | "bao_ve";
type Nguon = { hienThi?: HienThiMay; trangThai?: string; baoVe?: string | null; dangGo?: unknown; matMang?: boolean; truc?: boolean };

export function maMay(m: Nguon): HienThiMay {
  if (m.hienThi) return m.hienThi;
  if (m.dangGo) return "dang_go";
  if (m.trangThai === "tat_may" || m.trangThai === "chua_co_nhip") return "tat";
  if (m.trangThai === "ngoai_vong" || m.matMang) return "mat_mang";
  if (m.baoVe === "mot_phan" || m.trangThai === "lech_chuan") return "can_sua";
  return "bao_ve";
}
export const canSuaMay = (m: Nguon) => maMay(m) === "can_sua";
/** #701: máy vào «Cần Ba Mẹ để ý» (Trang chủ, Chờ duyệt) — cùng điều kiện chuông / Thông báo (server/lib/can-de-y.ts): đã từng kết nối và màn Máy
 *  xếp «Cần sửa», mức bảo vệ chưa đủ (máy đủ quyền mà lệch chuẩn ⇒ màn Máy, không phải «chưa được bảo vệ»). Máy đang tắt / mất mạng / đang gỡ / chưa báo quyền không vào (mất mạng đã có dòng riêng). */
export const mayCanDeY = (m: Nguon & { lanCuoi?: string | null }) => !!m.lanCuoi && !!m.baoVe && m.baoVe !== "day_du" && canSuaMay(m);
export const TEN_HIEN_THI: Record<HienThiMay, string> = { dang_go: "Đang gỡ AiiGrow", tat: "Đang tắt", mat_mang: "Mất mạng", can_sua: "Cần sửa", bao_ve: "Đang bảo vệ" };

/** #858: câu trạng thái gỡ — MỘT chỗ cho Máy trong nhà và chi tiết máy. choMayBat (máy chưa liên lạc từ lúc gửi lệnh) do máy chủ tính cùng đồng hồ;
 *  máy chủ cũ không gửi ⇒ không đoán «chờ máy bật». Giờ gửi: hôm nay chỉ hh:mm, ngày khác kèm ngày (lệnh gửi 3 hôm trước không trông như chiều nay). */
type NguonGo = { dangGo?: { tu: string } | null; choMayBat?: boolean; banMoi?: { ten: string } | null };
export function lucGui(iso: string, now = new Date()) {
  const d = new Date(iso), hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  if (d.toDateString() === now.toDateString()) return hm;
  return `${hm} ngày ${d.getDate()}/${d.getMonth() + 1}${d.getFullYear() !== now.getFullYear() ? `/${d.getFullYear()}` : ""}`;
}
export function cauGo(m: NguonGo, now = new Date()): string | null {
  if (!m.dangGo) return null;
  if (m.banMoi) return `Máy đã được cài lại thành «${m.banMoi.ten}»`;
  return m.choMayBat ? `Chờ máy bật để gỡ (gửi lúc ${lucGui(m.dangGo.tu, now)})` : null;
}
