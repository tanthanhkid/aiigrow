// #433 A5: câu báo khi «Hoàn tác» không được — theo mã lỗi máy chủ, không gộp mọi lỗi thành «quá thời gian».
//   het_hoan_tac  — quá thời gian hoàn tác (duyệt nhiệm vụ / cho vay)
//   khong_du_diem — hoàn tác duyệt mà Con đã tiêu số sao vừa được cộng (sổ sao không cho rút quá số Con đang có)
//   da_tieu       — hoàn tác cho vay mà Con đã dùng sao vay
export function cauLoiHoanTac(e: unknown, ten = "Con", macDinh = "Đã quá thời gian hoàn tác") {
  const ma = typeof e === "object" && e !== null && "ma" in e ? String((e as { ma: unknown }).ma) : "";
  if (ma === "khong_du_diem") return `${ten} đã dùng số sao này rồi — không hoàn tác được`;
  if (ma === "da_tieu") return `${ten} đã dùng sao vay rồi — không hoàn tác được`;
  if (ma === "het_hoan_tac") return macDinh;
  const msg = e instanceof Error && e.message ? e.message : "";
  return ma && msg ? msg : macDinh;
}
