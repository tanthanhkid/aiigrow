// Gom mọi hành trình. Tệp nào lỗi/thiếu thì bỏ qua (không làm hỏng cả bàn); không có tệp nào thì dùng 11 màn mẫu.
import { MAN } from './co-san.js';

const TEP = ['./bm-1.js', './bm-2.js', './bm-3.js', './con-may-tinh.js', './con-dien-thoai.js'];

export async function taiHanhTrinh() {
  const kq = await Promise.allSettled(TEP.map((t) => import(t)));
  const ds = []; const loi = [];
  kq.forEach((r, i) => { if (r.status === 'fulfilled' && Array.isArray(r.value.default)) ds.push(...r.value.default); else loi.push(TEP[i]); });
  if (!ds.length) {
    const nhom = (vai) => MAN.filter((m) => m.nhom === vai).map((m) => ({ ...m, nen: m.w === 390 ? 'iPhone' : 'Windows' }));
    ds.push({ id: 'mau-bm', vai: 'Ba Mẹ', nen: 'iPhone', ten: 'Màn mẫu Ba Mẹ', mo: '', buoc: nhom('Ba Mẹ') },
      { id: 'mau-con', vai: 'Con', nen: 'Windows', ten: 'Màn mẫu Con', mo: '', buoc: nhom('Con') });
  }
  // key trùng giữa các tệp → giữ bản đầu, báo lỗi
  const da = new Set();
  for (const h of ds) h.buoc = h.buoc.filter((b) => { if (da.has(b.key)) { loi.push(`trùng key ${b.key}`); return false; } da.add(b.key); return true; });
  return { ds, loi };
}
