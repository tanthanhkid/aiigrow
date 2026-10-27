// Gom mọi hành trình. Tệp nào lỗi/thiếu thì bỏ qua (không làm hỏng cả bàn); không có tệp nào thì dùng 11 màn mẫu.
import { MAN } from './co-san.js';

// import() với chuỗi cố định: trình duyệt nạp từng tệp (tệp lỗi thì bỏ qua), bộ gói của bản Cloudflare (wrangler/esbuild) gom được vào Worker.
const NAP = {
  './bm-1.js': () => import('./bm-1.js'), './bm-2.js': () => import('./bm-2.js'), './bm-3.js': () => import('./bm-3.js'),
  './con-may-tinh.js': () => import('./con-may-tinh.js'), './con-dien-thoai.js': () => import('./con-dien-thoai.js'),
};
const TEP = Object.keys(NAP);

// lay: hàm thay fetch (máy chủ Node đọc thẳng tệp web/that/ — MCP); mặc định fetch của trình duyệt.
export async function taiHanhTrinh(lay = (u) => fetch(u)) {
  const kq = await Promise.allSettled(TEP.map((t) => NAP[t]()));
  const ds = []; const loi = [];
  kq.forEach((r, i) => {
    if (r.status !== 'fulfilled' || !Array.isArray(r.value.default)) { loi.push(TEP[i]); return; }
    for (const h of r.value.default) {
      const hop = h && h.id && Array.isArray(h.buoc);
      if (!hop) { loi.push(`${TEP[i]}: hành trình hỏng`); continue; }
      if (ds.some((x) => x.id === h.id)) { loi.push(`trùng id hành trình ${h.id}`); continue; }
      // bản sao: không sửa đối tượng của mô-đun (máy chủ Node giữ mô-đun suốt đời tiến trình — MCP nạp lại nhiều lần)
      ds.push({ ...h, buoc: h.buoc.filter((b) => b && b.key && typeof b.html === 'string' && b.w > 0 && b.h > 0).map((b) => ({ ...b })) });
    }
  });
  if (!ds.length) {
    const nhom = (vai) => MAN.filter((m) => m.nhom === vai).map((m) => ({ ...m, nen: m.w === 390 ? 'iPhone' : 'Windows' }));
    ds.push({ id: 'mau-bm', vai: 'Ba Mẹ', nen: 'iPhone', ten: 'Màn mẫu Ba Mẹ', mo: '', buoc: nhom('Ba Mẹ') },
      { id: 'mau-con', vai: 'Con', nen: 'Windows', ten: 'Màn mẫu Con', mo: '', buoc: nhom('Con') });
  }
  await thayManThat(ds, loi, lay);
  // key trùng giữa các tệp → giữ bản đầu, báo lỗi
  const da = new Set();
  for (const h of ds) h.buoc = h.buoc.filter((b) => { if (da.has(b.key)) { loi.push(`trùng key ${b.key}`); return false; } da.add(b.key); return true; });
  return { ds: ds.filter((h) => h.buoc.length), loi };
}

// Màn «giống thật»: DOM chụp từ app Expo chạy thật (Ba Mẹ + Con /tre, iPhone 375×812) nằm ở web/that/ — xem DO-KHOP.md.
// Có bản chụp thì thay HTML dựng tay của bước đó; tải lỗi thì giữ bản dựng tay.
async function thayManThat(ds, loi, lay) {
  let bang;
  try { bang = await (await lay('/that/ds.json')).json(); } catch { return; }
  if (!bang || typeof bang !== 'object') return;
  const viec = [];
  for (const h of ds) h.buoc.forEach((b, i) => {
    const t = bang[b.key]; if (!t) return;
    const doiKe = t.ke !== (h.buoc[i + 1]?.key ?? null); // hành trình đã đổi thứ tự sau lần gen ⇒ bỏ data-toi gắn sẵn, để ganToi gắn lại
    viec.push(lay(`/that/html/${b.key}.html`).then((r) => (r.ok ? r.text() : Promise.reject(new Error(r.status)))).then((html) => {
      b.html = doiKe ? html.replace(/ data-toi="[^"]*"/g, '') : html; b.w = t.w; b.h = t.h; b.anh = t.anh || ''; // không có ảnh thật thì bỏ lớp ảnh của màn dựng tay cũ
    }).catch(() => loi.push(`không tải được màn thật ${b.key}`)));
  });
  await Promise.all(viec);
}
