// «node:fs» cho bản Cloudflare: wrangler đổi mọi `import fs from 'node:fs'` của máy chủ (kho-bien-the, review, audit, mcp, ung-dung) sang tệp này
// (wrangler.jsonc «alias»). Đĩa = SQLite của Durable Object (ctx.storage.sql — API ĐỒNG BỘ, nên giữ nguyên được các lời gọi *Sync của Node).
// Mỗi tệp: một dòng «tep» + các mảnh «manh» (≤ 1 MB/mảnh, giới hạn 2 MB/dòng của DO); ghi nối (audit) = thêm một mảnh.
// Thư mục khoá «.khoa*» chỉ nằm trong bộ nhớ (một DO = một tiến trình; DO khởi động lại thì khoá cũ tự mất, không kẹt 10 giây).
// Tệp ảo (chu-quan.json): nội dung do Worker dựng từ secret — đọc được, không ghi được, không nằm trong SQLite.
import path from 'node:path';

const MANH = 1024 * 1024;
let sql = null;
const AO = new Map();              // đường dẫn → () => string
const KHOA = new Set();            // thư mục khoá trong bộ nhớ
const KHOA_LUC = new Map();
const FD = new Map(); let fdKe = 100;

const loi = (ma, p) => Object.assign(new Error(`${ma}: ${p}`), { code: ma, path: p });
const chuan = (p) => path.posix.resolve('/', String(p));
const laKhoa = (p) => path.posix.basename(p).startsWith('.khoa');
const buf = (d, enc) => (typeof d === 'string' ? Buffer.from(d, enc && enc !== 'buffer' ? enc : 'utf8') : Buffer.from(d.buffer ? new Uint8Array(d.buffer, d.byteOffset, d.byteLength) : d));
const encCua = (o) => (typeof o === 'string' ? o : o?.encoding || null);
const ra = (b, enc) => (enc ? b.toString(enc) : b);

export function ganKho(s, ao = {}) {
  sql = s;
  sql.exec('CREATE TABLE IF NOT EXISTS tep (p TEXT PRIMARY KEY, cha TEXT NOT NULL, thu INTEGER NOT NULL, m REAL NOT NULL, co INTEGER NOT NULL)');
  sql.exec('CREATE INDEX IF NOT EXISTS tep_cha ON tep(cha)');
  sql.exec('CREATE TABLE IF NOT EXISTS manh (p TEXT NOT NULL, i INTEGER NOT NULL, d BLOB NOT NULL, PRIMARY KEY (p, i))');
  AO.clear(); for (const [k, f] of Object.entries(ao)) AO.set(chuan(k), f);
}
const dong = (p) => sql.exec('SELECT p, thu, m, co FROM tep WHERE p = ?', p).toArray()[0] || null;
function dsMoi(p) { // mọi thư mục cha phải có (ghi tệp vào thư mục chưa tạo: tạo luôn — dễ dãi hơn Node, không hại)
  const cha = path.posix.dirname(p); if (cha === p) return;
  if (cha !== '/' && !dong(cha)) { dsMoi(cha); sql.exec('INSERT OR IGNORE INTO tep (p, cha, thu, m, co) VALUES (?, ?, 1, ?, 0)', cha, path.posix.dirname(cha), Date.now()); }
}
function docTho(p) {
  p = chuan(p);
  if (AO.has(p)) return Buffer.from(AO.get(p)(), 'utf8');
  const d = dong(p); if (!d) throw loi('ENOENT', p); if (d.thu) throw loi('EISDIR', p);
  const ms = sql.exec('SELECT d FROM manh WHERE p = ? ORDER BY i', p).toArray().map((r) => Buffer.from(r.d));
  return ms.length === 1 ? ms[0] : Buffer.concat(ms);
}
function ghiTho(p, b) {
  p = chuan(p);
  if (AO.has(p)) throw loi('EACCES', p);
  const d = dong(p); if (d?.thu) throw loi('EISDIR', p);
  dsMoi(p);
  sql.exec('DELETE FROM manh WHERE p = ?', p);
  for (let i = 0, o = 0; o < b.length || i === 0; i++, o += MANH) sql.exec('INSERT INTO manh (p, i, d) VALUES (?, ?, ?)', p, i, b.subarray(o, o + MANH));
  sql.exec('INSERT OR REPLACE INTO tep (p, cha, thu, m, co) VALUES (?, ?, 0, ?, ?)', p, path.posix.dirname(p), Date.now(), b.length);
}
function noiTho(p, b) {
  p = chuan(p);
  const d = dong(p); if (!d) return ghiTho(p, b); if (d.thu) throw loi('EISDIR', p);
  if (!b.length) return;
  const i = (sql.exec('SELECT MAX(i) AS i FROM manh WHERE p = ?', p).toArray()[0]?.i ?? -1) + 1;
  for (let o = 0, k = i; o < b.length; o += MANH, k++) sql.exec('INSERT INTO manh (p, i, d) VALUES (?, ?, ?)', p, k, b.subarray(o, o + MANH));
  sql.exec('UPDATE tep SET m = ?, co = co + ? WHERE p = ?', Date.now(), b.length, p);
}
const thongTin = (thu, m, co) => ({ mtimeMs: m, mtime: new Date(m), size: co, isDirectory: () => !!thu, isFile: () => !thu });

function existsSync(p) { p = chuan(p); return AO.has(p) || KHOA.has(p) || p === '/' || !!dong(p); }
function statSync(p) {
  p = chuan(p);
  if (AO.has(p)) { const n = Buffer.byteLength(AO.get(p)(), 'utf8'); return thongTin(0, 1, n); }
  if (KHOA.has(p)) return thongTin(1, KHOA_LUC.get(p) || 0, 0);
  if (p === '/') return thongTin(1, 0, 0);
  const d = dong(p); if (!d) throw loi('ENOENT', p); return thongTin(d.thu, d.m, d.co);
}
function readFileSync(p, o) { return ra(docTho(p), encCua(o)); }
function writeFileSync(p, d, o) { ghiTho(p, buf(d, encCua(o))); }
function appendFileSync(p, d, o) { noiTho(p, buf(d, encCua(o))); }
function mkdirSync(p, o = {}) {
  p = chuan(p);
  if (laKhoa(p)) { if (KHOA.has(p)) throw loi('EEXIST', p); KHOA.add(p); KHOA_LUC.set(p, Date.now()); return; }
  const d = dong(p);
  if (d) { if (o.recursive && d.thu) return; throw loi('EEXIST', p); }
  dsMoi(p);
  sql.exec('INSERT INTO tep (p, cha, thu, m, co) VALUES (?, ?, 1, ?, 0)', p, path.posix.dirname(p), Date.now());
  return o.recursive ? p : undefined;
}
function rmdirSync(p) {
  p = chuan(p);
  if (KHOA.has(p)) { KHOA.delete(p); KHOA_LUC.delete(p); return; }
  const d = dong(p); if (!d) throw loi('ENOENT', p); if (!d.thu) throw loi('ENOTDIR', p);
  if (sql.exec('SELECT 1 FROM tep WHERE cha = ? LIMIT 1', p).toArray().length) throw loi('ENOTEMPTY', p);
  sql.exec('DELETE FROM tep WHERE p = ?', p);
}
function rmSync(p, o = {}) {
  p = chuan(p);
  if (KHOA.has(p)) { KHOA.delete(p); return; }
  const d = dong(p); if (!d) { if (o.force) return; throw loi('ENOENT', p); }
  if (d.thu && !o.recursive) throw loi('EISDIR', p);
  const duoi = `${p}/%`;
  sql.exec('DELETE FROM manh WHERE p = ? OR p LIKE ?', p, duoi); sql.exec('DELETE FROM tep WHERE p = ? OR p LIKE ?', p, duoi);
}
function unlinkSync(p) {
  p = chuan(p); const d = dong(p); if (!d) throw loi('ENOENT', p); if (d.thu) throw loi('EISDIR', p);
  sql.exec('DELETE FROM manh WHERE p = ?', p); sql.exec('DELETE FROM tep WHERE p = ?', p);
}
function renameSync(a, b) {
  a = chuan(a); b = chuan(b); if (a === b) return;
  if (AO.has(a)) throw loi('EACCES', a); if (AO.has(b)) throw loi('EACCES', b); // tệp ảo (chu-quan.json từ bí mật) chỉ đọc
  const d = dong(a); if (!d) throw loi('ENOENT', a); if (d.thu) throw loi('EISDIR', a); // máy chủ chỉ đổi tên tệp
  if (dong(b)?.thu) throw loi('EISDIR', b);
  dsMoi(b);
  sql.exec('DELETE FROM manh WHERE p = ?', b); sql.exec('DELETE FROM tep WHERE p = ?', b);
  sql.exec('UPDATE manh SET p = ? WHERE p = ?', b, a);
  sql.exec('UPDATE tep SET p = ?, cha = ? WHERE p = ?', b, path.posix.dirname(b), a);
}
function readdirSync(p) {
  p = chuan(p);
  if (p !== '/') { const d = dong(p); if (!d) throw loi('ENOENT', p); if (!d.thu) throw loi('ENOTDIR', p); }
  const ten = sql.exec('SELECT p FROM tep WHERE cha = ? ORDER BY p', p).toArray().map((r) => path.posix.basename(r.p));
  for (const k of [...KHOA, ...AO.keys()]) if (path.posix.dirname(k) === p) ten.push(path.posix.basename(k));
  return ten;
}
// ---- mô tả tệp (audit: đọc đuôi + ghi nối + fsync)
function openSync(p, co = 'r') {
  p = chuan(p);
  if (co === 'r') docTho(p); // ENOENT như Node
  else if (co === 'a+' || co === 'a') { if (!existsSync(p)) ghiTho(p, Buffer.alloc(0)); }
  else if (co === 'w') ghiTho(p, Buffer.alloc(0));
  else throw loi('EINVAL', p);
  const fd = fdKe++; FD.set(fd, { p, co }); return fd;
}
const fdCua = (fd) => { const f = FD.get(fd); if (!f) throw loi('EBADF', String(fd)); return f; };
function fstatSync(fd) { return statSync(fdCua(fd).p); }
function readSync(fd, b, off, n, vt) {
  const nd = docTho(fdCua(fd).p); const tu = vt ?? 0;
  const k = Math.max(0, Math.min(n, nd.length - tu)); nd.copy(b, off, tu, tu + k); return k;
}
function writeSync(fd, d) { const f = fdCua(fd); const b = buf(d); noiTho(f.p, b); return b.length; } // 'w' đã được làm rỗng lúc mở ⇒ ghi nối = ghi tuần tự
function fsyncSync(fd) { fdCua(fd); } // SQLite của DO bền khi trả lời (output gate)
function closeSync(fd) { FD.delete(fd); }
function mkdtempSync() { throw loi('ENOSYS', 'mkdtemp'); }
function watch() { return { close() {}, on() { return this; }, unref() { return this; } }; } // một DO = một tiến trình: không có ai ghi chung để theo dõi

const promises = {
  readFile: async (p, o) => readFileSync(p, o),
  readdir: async (p) => readdirSync(p),
  writeFile: async (p, d, o) => writeFileSync(p, d, o),
  stat: async (p) => statSync(p),
};
function readFile(p, o, cb) { if (typeof o === 'function') { cb = o; o = undefined; } let r, e = null; try { r = readFileSync(p, o); } catch (x) { e = x; } queueMicrotask(() => cb(e, r)); }

const fs = { existsSync, statSync, readFileSync, writeFileSync, appendFileSync, mkdirSync, rmdirSync, rmSync, unlinkSync, renameSync, readdirSync,
  openSync, fstatSync, readSync, writeSync, fsyncSync, closeSync, mkdtempSync, watch, promises, readFile };
export default fs;
export { existsSync, statSync, readFileSync, writeFileSync, appendFileSync, mkdirSync, rmdirSync, rmSync, unlinkSync, renameSync, readdirSync,
  openSync, fstatSync, readSync, writeSync, fsyncSync, closeSync, mkdtempSync, watch, promises, readFile };
