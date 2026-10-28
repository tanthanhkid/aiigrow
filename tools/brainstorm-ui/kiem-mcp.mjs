#!/usr/bin/env node
// Kiểm các tool MCP (đặc biệt 20 tool thêm cho Trợ lý AI) trên một KHO TẠM — không bao giờ đụng dữ liệu thật.
// Dùng: node tools/brainstorm-ui/kiem-mcp.mjs [thư mục kho mẫu để chép]
//   Không đưa kho mẫu: chạy trên kho rỗng (màn lấy từ mã). Có đưa: chép sang thư mục tạm rồi mới chạy.
// Tự bật server.mjs trên một cổng rảnh (loopback = chủ quản), gọi từng tool qua /mcp, tắt server theo PID.
// Thoát 0 = mọi bước đạt; 1 = có bước hỏng (in tên bước + lý do).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const mau = process.argv[2];
const kho = fs.mkdtempSync(path.join(os.tmpdir(), 'bs-kiem-mcp-'));
if (mau) fs.cpSync(mau, kho, { recursive: true });
fs.rmSync(path.join(kho, 'brainstorm-ui', 'chu-quan.json'), { force: true });
const cong = await new Promise((ok) => { const s = net.createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const U = `http://127.0.0.1:${cong}`;
const sv = spawn(process.execPath, [path.join(DIR, 'server.mjs')], { env: { ...process.env, BS_THIET_KE: kho, PORT: String(cong), BS_CHI_DOC: '' }, stdio: ['ignore', 'ignore', 'pipe'] });
let loiSv = ''; sv.stderr.on('data', (d) => { loiSv += d; });
const tat = () => { try { sv.kill('SIGTERM'); } catch { /* đã tắt */ } fs.rmSync(kho, { recursive: true, force: true }); };
process.on('exit', tat);
for (let i = 0; i < 60; i++) { try { await fetch(U + '/'); break; } catch { await new Promise((r) => setTimeout(r, 250)); } }

let id = 0;
async function goi(ten, args = {}) {
  const r = await fetch(U + '/mcp', { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'x-bs-tro-ly': encodeURIComponent('kiểm tool MCP') },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method: ten === 'list' ? 'tools/list' : 'tools/call', params: ten === 'list' ? {} : { name: ten, arguments: args } }) });
  const j = await r.json();
  if (ten === 'list') return j.result.tools;
  if (j.error) throw new Error(`${ten}: ${j.error.message}`);
  const c = j.result.content || [];
  const txt = c.filter((x) => x.type === 'text').map((x) => x.text);
  if (j.result.isError) throw new Error(`${ten}: ${txt.join(' ')}`);
  let data; try { data = JSON.parse(txt[0]); } catch { data = txt[0]; }
  return { data, anh: c.filter((x) => x.type === 'image').length, txt };
}

const ketQua = [];
async function buoc(ten, fn) {
  try { const ghi = await fn(); ketQua.push([true, ten, ghi || '']); } catch (e) { ketQua.push([false, ten, e.message]); }
}
const can = (dk, lyDo) => { if (!dk) throw new Error(lyDo); };
const HTML = (chu) => `<div class="man" style="padding:24px;font-family:sans-serif"><h1>${chu}</h1><button data-toi="bm2-trang-chu">Về trang chủ</button></div>`;

const MOI = ['sua_lien_ket_nhieu', 'quyen_cua_toi', 'tim_man', 'lien_ket_man', 'so_sanh_phien_ban', 'ds_de_xuat', 'ds_thung_rac', 'khoi_phuc_bien_the', 'don_bien_the', 'sua_bien_the',
  'tao_nhieu_bien_the', 'ds_link_gop_y', 'tao_link_gop_y', 'thu_hoi_link_gop_y', 'sua_gop_y', 'xoa_gop_y', 'gui_de_xuat', 'xem_su_kien_nhat_ky', 'khoi_phuc_tu_nhat_ky', 'doc_quy_trinh'];
let tools = [];
await buoc('tools/list có đủ tool mới, schema chặt', async () => {
  tools = await goi('list');
  const ten = new Set(tools.map((t) => t.name));
  const thieu = MOI.filter((t) => !ten.has(t)); can(!thieu.length, `thiếu ${thieu.join(', ')}`);
  const khongMoTa = tools.filter((t) => !t.description || t.description.length < 40).map((t) => t.name); can(!khongMoTa.length, `mô tả quá ngắn: ${khongMoTa}`);
  return `${tools.length} tool`;
});
await buoc('quyen_cua_toi (loopback = chủ quản)', async () => { const { data } = await goi('quyen_cua_toi'); can(data.chuQuan === true, JSON.stringify(data)); });
let key = 'bm2-vi', ht = '';
await buoc('tim_man «ví điểm» (không dấu vẫn ra)', async () => {
  const { data } = await goi('tim_man', { tu_khoa: 'vi diem' }); can(Array.isArray(data) && data.length, 'không ra màn nào');
  key = data[0].key; ht = data[0].hanhTrinh; return `${key} @ ${ht}`;
});
await buoc('lien_ket_man', async () => { const { data } = await goi('lien_ket_man', { key, tat_ca: true }); can(Array.isArray(data.ra) && Array.isArray(data.vao), JSON.stringify(data).slice(0, 200)); return `ra ${data.ra.length}, vào ${data.vao.length}`; });
await buoc('doc_quy_trinh', async () => { const { data } = await goi('doc_quy_trinh', {}); can(Array.isArray(data) && data.length, 'không có quy trình'); return `${data.length} quy trình`; });

let ids = [];
await buoc('tao_nhieu_bien_the (2 biến thể cùng đợt)', async () => {
  const r = await goi('tao_nhieu_bien_the', { key, y_tuong: 'kiểm tool', anh: false, bien_the: [{ html: HTML('Biến thể A'), nhan: 'A' }, { html: HTML('Biến thể B'), nhan: 'B' }] });
  ids = r.txt.map((t) => { try { return JSON.parse(t).id; } catch { return null; } }).filter(Boolean);
  can(ids.length === 2, `được ${ids.length} id: ${r.txt.join(' | ').slice(0, 300)}`); return ids.join(', ');
});
await buoc('sua_bien_the (đổi nhãn + html)', async () => { const { data } = await goi('sua_bien_the', { id: ids[0], nhan: 'A đã sửa', html: HTML('A sửa'), anh: false }); can(data.nhan === 'A đã sửa', JSON.stringify(data)); });
await buoc('don_bien_the (vào thùng rác)', async () => { const { data } = await goi('don_bien_the', { key }); can(ids.every((x) => data.ids?.includes(x)), JSON.stringify(data).slice(0, 300)); });
await buoc('ds_thung_rac', async () => { const { data } = await goi('ds_thung_rac', { key }); const s = JSON.stringify(data); can(ids.every((x) => s.includes(x)), s.slice(0, 300)); });
await buoc('khoi_phuc_bien_the', async () => { const { data } = await goi('khoi_phuc_bien_the', { ids }); can(ids.every((x) => data.daKhoiPhuc?.includes(x)), JSON.stringify(data)); });

await buoc('sua_lien_ket_nhieu (tạo phiên bản mới)', async () => {
  const lk = (await goi('lien_ket_man', { key, tat_ca: true })).data; const nut = lk.ra[0];
  can(nut, `màn ${key} không có nút`);
  const { data } = await goi('sua_lien_ket_nhieu', { thay_doi: [{ key, toi: 'bm2-trang-chu', phan_tu: nut.phan_tu, v: lk.v }] });
  can(!data.loi?.length, JSON.stringify(data).slice(0, 300));
  const sau = (await goi('lien_ket_man', { key, tat_ca: true })).data.ra.find((x) => x.phan_tu === nut.phan_tu); can(sau?.toi === 'bm2-trang-chu', JSON.stringify(sau));
});
await buoc('so_sanh_phien_ban', async () => { const { data } = await goi('so_sanh_phien_ban', { key }); can(data.tu && data.den, JSON.stringify(data).slice(0, 300)); return `${data.tu} → ${data.den}`; });

let ma = '';
await buoc('tao_link_gop_y', async () => { const { data } = await goi('tao_link_gop_y', { hanh_trinh: ht, ghi_chu: 'kiểm' }); ma = data.ma; can(ma, JSON.stringify(data)); });
await buoc('ds_link_gop_y', async () => { const { data } = await goi('ds_link_gop_y', { hanh_trinh: ht }); can(JSON.stringify(data).includes(ma), JSON.stringify(data).slice(0, 300)); });
let gy = '', gy2 = '';
await buoc('them_gop_y → sua_gop_y → xoa_gop_y', async () => {
  const g = (await goi('them_gop_y', { key, noi: 'góp ý kiểm', ma_link: ma })).data; gy = g.id; can(gy, JSON.stringify(g));
  const g2 = (await goi('them_gop_y', { key, noi: 'góp ý cho đề xuất', ma_link: ma })).data; gy2 = g2.id;
  const s = (await goi('sua_gop_y', { hanh_trinh: ht, id: gy, noi: 'góp ý đã sửa', muc: 'cau-hoi' })).data; can(JSON.stringify(s).includes('đã sửa') || s.ok !== false, JSON.stringify(s));
  await goi('xoa_gop_y', { hanh_trinh: ht, id: gy });
  const con = (await goi('ds_gop_y', { hanh_trinh: ht })).data; can(!JSON.stringify(con).includes(gy), 'góp ý vẫn còn sau khi xoá');
});
await buoc('gui_de_xuat (từ biến thể) + ds_de_xuat', async () => {
  const { data } = await goi('gui_de_xuat', { key, tu_bien_the: ids[1], gop_y: gy2, ma_link: ma }); can(data.id, JSON.stringify(data));
  const ds = (await goi('ds_de_xuat', { hanh_trinh: ht })).data; can(JSON.stringify(ds).includes(data.id), JSON.stringify(ds).slice(0, 300));
});
await buoc('thu_hoi_link_gop_y', async () => { const { data } = await goi('thu_hoi_link_gop_y', { ma }); can(data.thuHoi, JSON.stringify(data)); });

await buoc('nhat_ky ghi «qua Trợ lý AI» + lệnh gốc', async () => {
  const { data } = await goi('nhat_ky', { gioi: 30 }); const e = data.ds.find((x) => x.ai?.nguon === 'tro-ly-ai'); can(e && e.ai.lenh === 'kiểm tool MCP', JSON.stringify(data.ds[0]?.ai));
});
await buoc('xem_su_kien_nhat_ky + khoi_phuc_tu_nhat_ky (gop-y.xoa → trước)', async () => {
  const { data } = await goi('nhat_ky', { gioi: 50, loai: 'gop-y.xoa' }); const e = data.ds[0]; can(e, 'không thấy sự kiện gop-y.xoa');
  const x = (await goi('xem_su_kien_nhat_ky', { ngay: e.ngay, i: e.i })).data; can(x.e?.loai === 'gop-y.xoa', JSON.stringify(x).slice(0, 300));
  await goi('khoi_phuc_tu_nhat_ky', { ngay: e.ngay, i: e.i, ben: 'truoc' });
  const con = (await goi('ds_gop_y', { hanh_trinh: ht })).data; can(JSON.stringify(con).includes(gy), 'góp ý chưa quay lại');
});
await buoc('lỗi đọc được: màn không tồn tại', async () => {
  try { await goi('lien_ket_man', { key: 'khong-co-man-nay' }); } catch (e) { can(/khong-co-man-nay|không/i.test(e.message), e.message); return e.message.slice(0, 80); }
  throw new Error('không báo lỗi');
});

for (const [ok, ten, ghi] of ketQua) console.log(`${ok ? 'ĐẠT ' : 'HỎNG'}  ${ten}${ghi ? ` — ${ghi}` : ''}`);
const hong = ketQua.filter((x) => !x[0]).length;
if (hong && loiSv) console.log('--- stderr server ---\n' + loiSv.slice(-2000));
console.log(hong ? `${hong}/${ketQua.length} bước hỏng` : `Đạt cả ${ketQua.length} bước`);
process.exit(hong ? 1 : 0);
