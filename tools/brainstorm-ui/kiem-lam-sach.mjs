// Kiểm lamSach (web/claude.js) trong Chrome THẬT: ca tấn công phải bị gỡ; màn thật docs/thiet-ke-chot phải giữ nguyên số thẻ/ảnh/style/data-toi.
// Chạy: node kiem-lam-sach.mjs   (cần Google Chrome; không cần mạng)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const goc = path.dirname(fileURLToPath(import.meta.url));
const chot = path.join(goc, '../../docs/thiet-ke-chot');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const tanCong = [
  ['script', '<div>a</div><script>alert(1)</script>', /<script/i],
  ['onerror', '<img src="x.png" onerror="alert(1)">', /onerror/i],
  ['onclick svg', '<svg onload="alert(1)"><circle onclick="x()" r="1"/></svg>', /onload|onclick/i],
  ['javascript: href', '<a href="javascript:alert(1)">x</a>', /javascript/i],
  ['javascript: href lẫn ký tự', '<a href="  java\tscript:alert(1)">x</a>', /script:/i],
  ['data:text/html href', '<a href="data:text/html,<script>alert(1)</script>">x</a>', /data:/i],
  ['srcdoc', '<div srcdoc="<script>alert(1)</script>">x</div>', /srcdoc/i],
  ['iframe srcdoc', '<iframe srcdoc="<script>1</script>"></iframe>', /iframe/i],
  ['formaction', '<form><button formaction="javascript:alert(1)">x</button></form>', /formaction|javascript/i],
  ['xlink:href svg', '<svg><a xlink:href="javascript:alert(1)"><text>x</text></a></svg>', /javascript/i],
  ['use href ngoài', '<svg><use href="https://evil.example/x.svg#a"/></svg>', /evil/i],
  ['svg script', '<svg><script>alert(1)</script></svg>', /<script/i],
  ['foreignObject', '<svg><foreignObject><iframe src="https://evil.example"></iframe></foreignObject></svg>', /foreignobject|iframe/i],
  ['svg animate href', '<svg><a><animate attributeName="href" values="javascript:alert(1)"/><text>x</text></a></svg>', /animate|javascript/i],
  ['svg set', '<svg><set attributeName="onmouseover" to="alert(1)"/></svg>', /<set/i],
  ['meta refresh', '<meta http-equiv="refresh" content="0;url=https://evil.example">', /refresh/i],
  ['base', '<base href="https://evil.example/">', /<base/i],
  ['object/embed', '<object data="x.swf"></object><embed src="x.swf">', /<object|<embed/i],
  ['math mXSS', '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>', /onerror|<math/i],
  ['noscript mXSS', '<noscript><p title="</noscript><img src=x onerror=alert(1)>">', /<img/i],
  ['style @import', '<style>@import url("https://evil.example/x.css");.a{color:red}</style>', /@import|evil/i],
  ['style expression', '<div style="width:expression(alert(1))">x</div>', /expression/i],
  ['style escape', '<style>.a{background:\\75 rl(javascript:alert(1))}</style>', /javascript/i],
  ['style url javascript', '<div style="background:url(javascript:alert(1))">x</div>', /javascript/i],
  ['style url data html', '<div style="background:url(data:text/html;base64,AAAA)">x</div>', /data:text/i],
  ['img data html', '<img src="data:text/html;base64,PHNjcmlwdD4=">', /data:text/i],
  ['link import ngoài', '<link rel="import" href="https://evil.example/x.html">', /import/i],
  ['link prefetch javascript', '<link rel="stylesheet" href="javascript:alert(1)">', /javascript/i],
  ['input onfocus autofocus', '<input autofocus onfocus="alert(1)">', /onfocus|autofocus/i],
  ['template', '<template><img src=x onerror=alert(1)></template>', /template|onerror/i],
  ['textarea/select', '<textarea><img src=x onerror=alert(1)></textarea>', /onerror|textarea/i],
];

// Phần chạy trong Chrome: nhận danh sách ca + HTML màn thật, trả kết quả qua JSON trong <pre>.
const trang = `<!doctype html><meta charset=utf-8><pre id=kq>chờ</pre><script type=module>
try {
const { lamSach } = await import('/claude.js');
const bo = await (await fetch('/__ca.json')).json();
const dem = (h) => { const d = new DOMParser().parseFromString(h, 'text/html'); return { the: d.querySelectorAll('*').length, img: d.querySelectorAll('img').length, style: d.querySelectorAll('style').length, toi: d.querySelectorAll('[data-toi]').length, svg: d.querySelectorAll('svg').length, link: d.querySelectorAll('link').length, nut: d.querySelectorAll('button,input').length, a: d.querySelectorAll('a[href]').length, styleAttr: d.querySelectorAll('[style]').length, cls: d.querySelectorAll('[class]').length };};
const kq = { tanCong: bo.tanCong.map(([ten, h]) => ({ ten, ra: lamSach(h) })), that: bo.that.map(([ten, h]) => { const ra = lamSach(h); return { ten, a: dem(h), b: dem(ra), lap: lamSach(ra) === ra }; }) };
document.getElementById('kq').textContent = JSON.stringify(kq); document.title = 'xong';
} catch (e) { document.getElementById('kq').textContent = '{"loi":' + JSON.stringify(String(e && e.stack || e)) + '}'; }
</script>`;

const that = [];
for (const m of fs.readdirSync(chot)) {
  const t = path.join(chot, m); if (!fs.statSync(t).isDirectory()) continue;
  const fs2 = fs.readdirSync(t).filter((f) => f.endsWith('.html')).slice(0, 3);
  for (const f of fs2) that.push([`${m}/${f}`, fs.readFileSync(path.join(t, f), 'utf8')]);
}
const ca = JSON.stringify({ tanCong: tanCong.map(([a, b]) => [a, b]), that });

const sv = http.createServer((req, res) => {
  const u = req.url.split('?')[0];
  if (u === '/') { res.setHeader('content-type', 'text/html; charset=utf-8'); return res.end(trang); }
  if (u === '/__ca.json') { res.setHeader('content-type', 'application/json'); return res.end(ca); }
  const f = path.join(goc, 'web', path.normalize(u));
  if (!f.startsWith(path.join(goc, 'web')) || !fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', f.endsWith('.js') ? 'text/javascript' : 'text/plain'); res.end(fs.readFileSync(f));
});
await new Promise((r) => sv.listen(0, '127.0.0.1', r));
const cong = sv.address().port;
const hop = fs.mkdtempSync('/tmp/ls-chrome-');
const cr = spawn(CHROME, ['--headless=new', '--disable-gpu', '--use-mock-keychain', '--password-store=basic', `--user-data-dir=${hop}`, '--virtual-time-budget=30000', '--dump-dom', `http://127.0.0.1:${cong}/`], { stdio: ['ignore', 'pipe', 'ignore'], detached: true });
let out = ''; cr.stdout.on('data', (d) => { out += d; });
const diet = () => { try { process.kill(-cr.pid, 'SIGKILL'); } catch {} };
const han = setTimeout(diet, 45000);
await new Promise((r) => { cr.on('close', r); cr.stdout.on('data', () => { if (/<pre id="kq">[{]/.test(out)) setTimeout(() => { diet(); r(); }, 200); }); }); clearTimeout(han); diet(); sv.close(); fs.rmSync(hop, { recursive: true, force: true });
const mk = out.match(/<pre id="kq">([{][\s\S]*?)<\/pre>/);
if (!mk) { console.error('Chrome không trả kết quả:', out.slice(0, 300)); process.exit(2); }
const un = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const kq = JSON.parse(un(mk[1]));
if (kq.loi) { console.error('Lỗi trong trang:', kq.loi); process.exit(2); }
let loi = 0;
tanCong.forEach(([ten, , bad], i) => { const ra = kq.tanCong[i].ra; if (bad.test(ra)) { loi++; console.error('LỌT  ', ten, '→', ra.replace(/\n/g, ' ').slice(0, 200)); } });
for (const t of kq.that) {
  const sai = Object.keys(t.a).filter((k) => t.a[k] !== t.b[k] && !(k === 'the' && t.a.the - t.b.the === 0));
  if (sai.length || !t.lap) { loi++; console.error('MẤT  ', t.ten, sai.map((k) => `${k}:${t.a[k]}→${t.b[k]}`).join(' '), t.lap ? '' : '(không idempotent)'); }
}
console.log(`${tanCong.length} ca tấn công, ${kq.that.length} màn thật, ${loi} lỗi`);
process.exit(loi ? 1 : 0);
