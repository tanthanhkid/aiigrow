// Kiểm tên việc dùng chung cho «Ba Mẹ tự thêm» và «Sửa việc» (thiết kế 14/11 bm-viec-duyet/04, 06). Ô nhập «một việc» cũ (NhapViec / FORM_TRONG /
// thanViec — bản 05/11) đã bỏ: hai màn 14/11 tự dựng form theo thiết kế (review PR #243).
import { TEN_NV_TOI_THIEU } from "./api";

export const tenHopLe = (ten: string) => [...ten.trim()].length >= TEN_NV_TOI_THIEU;
