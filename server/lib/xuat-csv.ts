// Xuất báo cáo tuần ra CSV (FR-06.02 «Xuất PDF/CSV»): mở bằng Excel / Google Sheets. Chỉ tên app / tên miền + thời lượng, điểm theo nhóm,
// duyệt / từ chối, ngoại lệ — không có nội dung, ảnh bằng chứng hay tin nhắn. CSV có BOM UTF-8 để Excel đọc đúng tiếng Việt.
import { baoCaoTuan } from "./bao-cao.ts";

type BaoCao = Awaited<ReturnType<typeof baoCaoTuan>>;

const o = (v: unknown) => {
  let s = String(v ?? "");
  // Chống CSV injection: ô CHỮ bắt đầu bằng = + - @ (hoặc tab/CR) ⇒ chèn ' để Excel/Sheets không chạy như công thức.
  // Số (typeof number) giữ nguyên để không biến số âm/thập phân thành chữ.
  if (typeof v !== "number" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const dong = (...cot: unknown[]) => cot.map(o).join(",");

const NHOM: Record<string, string> = { doc_sach: "Đọc sách", viec_nha: "Việc nhà", hoc_tap: "Học tập", van_dong: "Vận động", ky_nang: "Kỹ năng", khac: "Khác" };

/** Thuần: báo cáo tuần ⇒ nội dung CSV (CRLF, có BOM). */
export function csvBaoCao(bc: BaoCao) {
  const nay = bc.tuanNay, truoc = bc.tuanTruoc;
  const hoc = new Map((nay.hocTheoNgay ?? []).map((x) => [x.ngay, x.phut]));
  const r: string[] = [
    dong("Báo cáo tuần AiiGrow", bc.ten),
    dong("Tuần bắt đầu", nay.dau),
    "",
    dong("Ngày", "Phút giải trí", "Phút học"),
    ...nay.giaiTriTheoNgay.map((x) => dong(x.ngay, x.phut, hoc.get(x.ngay) ?? 0)),
    dong("Tổng tuần này", nay.tongGiaiTri, nay.phutHoc),
    dong("Tổng tuần trước", truoc.tongGiaiTri, truoc.phutHoc),
    "",
    dong("Dùng nhiều nhất", "Loại", "Phút", "So tuần trước (%)"),
    ...(nay.dungNhieu ?? []).map((x) => dong(x.muc, x.loai === "hoc" ? "Học tập" : x.loai === "giai_tri" ? "Giải trí" : x.loai, x.phut, x.lech ?? "mới")),
    "",
    dong("Nhóm nhiệm vụ", "Số lần được duyệt", "Điểm kiếm"),
    ...nay.diemKiemTheoNhom.map((x) => dong(NHOM[x.nhom] ?? x.nhom, x.n, x.diem)),
    "",
    dong("Được duyệt", nay.duyet.duoc),
    dong("Từ chối / cần bổ sung", nay.duyet.tu_choi),
    dong("Ngoại lệ", nay.ngoaiLe),
    ...(bc.chuGiai.length ? ["", dong("Ghi chú"), ...bc.chuGiai.map((x) => dong(x))] : []),
  ];
  const ten = bc.ten.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "") || "con";
  return { tenTep: `aiigrow-bao-cao-${ten}-${nay.dau}.csv`, noiDung: "﻿" + r.join("\r\n") + "\r\n" };
}

export async function xuatCsvBaoCao(fam: string, con: string, now = new Date()) {
  return csvBaoCao(await baoCaoTuan(fam, con, now));
}
