/** Số phút → chữ cho người đọc, dùng chung toàn app (#697): dưới 60 «45 phút», từ 60 «3 giờ 5 phút» / «2 giờ».
 *  Chỗ cần quy đổi sao giữ số trần («185 sao = 185 phút» ⇒ dùng `soVN`), chỉ phần «đã chơi / còn / giới hạn» đi qua đây. */
export function chuPhut(n: number): string {
  const p = Math.max(0, Math.round(n || 0));
  if (p < 60) return `${p} phút`;
  const g = Math.floor(p / 60), du = p % 60;
  return du ? `${g} giờ ${du} phút` : `${g} giờ`;
}
