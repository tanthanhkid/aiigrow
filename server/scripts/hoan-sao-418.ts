// #418: hoàn sao trừ nhầm + xoá «app mới» do khay AiiGrow cũ sau cập nhật («AiiGrow.Tray.exe.cu-…») bị tính là app Con dùng.
// Chạy MỘT LẦN khi deploy bản sửa #418; chạy lại an toàn (đã hoàn thì bỏ qua). Mặc định XEM TRƯỚC — thêm --chay mới ghi.
//   DATABASE_URL=… node scripts/hoan-sao-418.ts          # xem trước: liệt kê dòng sẽ hoàn / xoá, không ghi
//   DATABASE_URL=… node scripts/hoan-sao-418.ts --chay   # ghi thật (một giao dịch)
import { donAppAiiGrow } from "../lib/don-app-aiigrow.ts";

const chay = process.argv.includes("--chay");
const kq = await donAppAiiGrow({ chay });
console.log(`${chay ? "ĐÃ GHI" : "XEM TRƯỚC (thêm --chay để ghi)"} — #418`);
console.log(`Hoàn sao: ${kq.hoan.length} dòng trừ, tổng ${kq.tongSao} sao`);
for (const h of kq.hoan) console.log(`  + ${h.sao} sao · con ${h.child_id} · ${h.created_at} · «${h.ly_do}» (points ${h.points_id})`);
console.log(`Xoá usage («đã dùng» / «app mới chờ xếp»): ${kq.usage.length} dòng`);
for (const u of kq.usage) console.log(`  - ${u.ngay} · ${u.muc} · ${u.loai} · ${u.phut} phút · con ${u.child_id} · máy ${u.device_id}`);
console.log(`Xoá luật Ba Mẹ lỡ xếp cho app AiiGrow: ${kq.luat.length} dòng`);
for (const l of kq.luat) console.log(`  - ${l.muc} · ${l.loai} · nhà ${l.family_id}${l.child_id ? ` · con ${l.child_id}` : ""}`);
process.exit(0);
