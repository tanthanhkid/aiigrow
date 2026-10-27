#!/usr/bin/env node
// Chuyển dữ liệu bàn brainstorm giữa thư mục Mac và Durable Object trên Cloudflare (đường /__kho của cf/worker.mjs — chỉ chủ quản).
//   node cf/kho.mjs nap <url> <thư mục brainstorm-ui> [--chot] — đưa bien-the/ phien-ban/ review/ audit/ lên (ghi đè cùng đường, chạy lại được);
//                                                       --chot: chốt di trú, từ đó Cloudflare đóng /__kho/nap
//   node cf/kho.mjs keo <url> <thư mục brainstorm-ui>   — kéo về (sao lưu git): tải tệp mới/đổi, xoá tệp cục bộ không còn trên Cloudflare
// Bí mật đọc từ biến môi trường BS_MAT_KHAU + BS_MA_CHU_QUAN, thiếu thì từ <thư mục>/chu-quan.json (matKhau, ma). Không in bí mật.
import fs from 'node:fs';
import path from 'node:path';

const [, , lenh, URL_GOC, THU] = process.argv;
if (!['nap', 'keo'].includes(lenh) || !URL_GOC || !THU) { console.error('Dùng: node cf/kho.mjs nap|keo <url> <thư mục brainstorm-ui>'); process.exit(2); }
const goc = URL_GOC.replace(/\/+$/, '');
let cq = {}; try { cq = JSON.parse(fs.readFileSync(path.join(THU, 'chu-quan.json'), 'utf8')); } catch { /* dùng biến môi trường */ }
const MK = process.env.BS_MAT_KHAU || cq.matKhau; const MA = process.env.BS_MA_CHU_QUAN || cq.ma;
if (!MK || !MA) { console.error('Thiếu mật khẩu chung / mã chủ quản'); process.exit(2); }
const THU_MUC = ['bien-the', 'phien-ban', 'review', 'audit'];
const KHO = '/kho/brainstorm-ui/';
const boQua = (ten) => ten.startsWith('.khoa') || ten.endsWith('.tam') || ten === '.DS_Store';

async function dangNhap() {
  const r = await fetch(`${goc}/__dang-nhap`, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ mat_khau: MK, tiep: '/' }) });
  const c = (r.headers.get('set-cookie') || '').match(/bs_phien=([^;]+)/);
  if (!c) throw new Error(`Đăng nhập không được (HTTP ${r.status})`);
  return `bs_phien=${c[1]}`;
}
const cookie = await dangNhap();
const hd = { cookie, 'x-bs-chu-quan': MA, origin: goc };
async function goi(duong, init = {}) {
  for (let lan = 1; ; lan++) {
    const r = await fetch(`${goc}${duong}`, { ...init, headers: { ...hd, ...(init.headers || {}) } });
    if (r.ok) return r;
    if (lan >= 4 || r.status < 500) throw new Error(`${duong.split('?')[0]}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
    await new Promise((ok) => setTimeout(ok, 1000 * lan));
  }
}
function dsCucBo() {
  const ra = [];
  const di = (thu, tuongDoi) => { let ds = []; try { ds = fs.readdirSync(thu, { withFileTypes: true }); } catch { return; }
    for (const e of ds) { if (boQua(e.name)) continue; const a = path.join(thu, e.name), r = `${tuongDoi}/${e.name}`; if (e.isDirectory()) di(a, r); else ra.push({ tuongDoi: r, a }); } };
  for (const t of THU_MUC) di(path.join(THU, t), t);
  return ra;
}

if (lenh === 'nap') {
  const ds = dsCucBo(); let lo = [], co = 0, n = 0, tong = 0;
  const day = async () => { if (!lo.length) return; await goi('/__kho/nap', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(lo) }); n += lo.length; lo = []; co = 0; };
  for (const f of ds) {
    const b = fs.readFileSync(f.a); tong += b.length;
    if (co + b.length > 8 * 1024 * 1024) await day();
    lo.push({ p: KHO + f.tuongDoi, b64: b.toString('base64') }); co += b.length;
  }
  await day();
  if (process.argv.includes('--chot')) { await goi('/__kho/chot', { method: 'POST' }); console.log('Đã chốt di trú'); }
  console.log(`Đã nạp ${n} tệp (${(tong / 1048576).toFixed(1)} MB) lên ${goc}`);
} else {
  const xa = await (await goi('/__kho/ds')).json();
  // chặn xoá hàng loạt: thiếu hẳn một thư mục gốc đang có cục bộ, hoặc sẽ xoá > 20% tệp cục bộ ⇒ dừng, không đụng gì
  const cucBo = dsCucBo(); const tapXa = new Set(Array.isArray(xa) ? xa.map((f) => f.p.slice(KHO.length)) : []);
  const seXoa = cucBo.filter((f) => !tapXa.has(f.tuongDoi)).length;
  const thieuThu = THU_MUC.filter((t) => cucBo.some((f) => f.tuongDoi.startsWith(`${t}/`)) && ![...tapXa].some((p) => p.startsWith(`${t}/`)));
  if (!Array.isArray(xa) || thieuThu.length || (seXoa > 5 && seXoa > cucBo.length * 0.2)) {
    console.error(`Danh sách Cloudflare đáng ngờ (thiếu thư mục: ${thieuThu.join(', ') || 'không'}; sẽ xoá ${seXoa}/${cucBo.length}) — dừng, không xoá gì`); process.exit(1);
  }
  const coXa = new Set(); let tai = 0, xoa = 0;
  for (const f of xa) {
    const tuongDoi = f.p.slice(KHO.length); coXa.add(tuongDoi);
    const dich = path.join(THU, tuongDoi);
    let st = null; try { st = fs.statSync(dich); } catch { /* chưa có */ }
    if (st && st.size === f.co && st.mtimeMs >= f.m) continue;
    const b = Buffer.from(await (await goi(`/__kho/tep?p=${encodeURIComponent(f.p)}`)).arrayBuffer());
    fs.mkdirSync(path.dirname(dich), { recursive: true });
    const tam = `${dich}.keo.tam`; fs.writeFileSync(tam, b); fs.renameSync(tam, dich);
    const t = new Date(f.m); fs.utimesSync(dich, t, t); tai++;
  }
  for (const f of dsCucBo()) if (!coXa.has(f.tuongDoi)) { fs.unlinkSync(f.a); xoa++; }
  console.log(`Kéo về: ${xa.length} tệp trên Cloudflare, tải ${tai}, xoá ${xoa} tệp cục bộ đã không còn`);
}
