// Gọi Claude thẳng từ trình duyệt (key của CHÍNH người dùng, chỉ gửi api.anthropic.com) + chế độ mock + làm sạch HTML.
// Dùng chung cho bàn chính (app.js, che-do-sua.js) và trang góp ý (review.js).
export function baoLoiApi(ma, j, model = '') {
  const t = j?.error?.message || '';
  if (ma === 401) return 'Key không hợp lệ (401) — mở ⚙ Cài đặt kiểm lại key.';
  if (ma === 403) return `Key không có quyền (403): ${t}`;
  if (ma === 404) return `Không thấy model «${model}» (404) — chọn model khác trong ⚙ Cài đặt. ${t}`;
  if (ma === 429) return `Vượt giới hạn tốc độ (429) — đợi chút rồi Thử lại. ${t}`;
  if (ma === 529 || ma === 503) return `Claude đang quá tải (${ma}) — Thử lại sau ít phút.`;
  if (ma === 400) return `Yêu cầu bị từ chối (400): ${t}`;
  return `Lỗi API ${ma}: ${t || 'không rõ'}`;
}

// Cấu trúc cache: [system cố định ⟨cache 1h⟩] → [user: ngữ cảnh màn/hành trình ⟨cache 1h⟩] → [user: ý + hướng k — thay đổi].
// Gọi song song: bắn 1 yêu cầu trước, đợi message_start (tiền tố đã được ghi cache) rồi mới bắn phần còn lại → các yêu cầu sau đọc cache.
const CACHE = { type: 'ephemeral', ttl: '1h' };
export async function goiClaude({ key, model, sys, user, signal, moiChu, khiBatDau, maxTokens }) {
  let res;
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal,
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model, max_tokens: maxTokens || 16000, stream: true,
        system: [{ type: 'text', text: sys, cache_control: CACHE }],
        messages: [{ role: 'user', content: [{ type: 'text', text: user[0], cache_control: CACHE }, { type: 'text', text: user[1] }] }],
      }),
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new Error('Không gọi được api.anthropic.com — kiểm mạng/VPN rồi Thử lại.');
  }
  if (!res.ok) { const j = await res.json().catch(() => null); throw new Error(baoLoiApi(res.status, j, model)); }
  const doc = res.body.getReader(); const giai = new TextDecoder();
  let dem = '', txt = '', lyDo = ''; const dung = {};
  for (;;) {
    const { value, done } = await doc.read();
    if (done) break;
    dem += giai.decode(value, { stream: true });
    let i;
    while ((i = dem.indexOf('\n')) >= 0) {
      const dong = dem.slice(0, i).trim(); dem = dem.slice(i + 1);
      if (!dong.startsWith('data:')) continue;
      let ev; try { ev = JSON.parse(dong.slice(5)); } catch { continue; }
      if (ev.type === 'message_start') {
        const u = ev.message?.usage || {};
        Object.assign(dung, { vao: u.input_tokens || 0, ghi: u.cache_creation_input_tokens || 0, doc: u.cache_read_input_tokens || 0, ra: u.output_tokens || 0 });
        khiBatDau?.(dung); moiChu(txt, dung);
      } else if (ev.type === 'content_block_delta' && ev.delta?.type === 'text_delta') { txt += ev.delta.text; moiChu(txt, dung); }
      else if (ev.type === 'content_block_delta' && ev.delta?.type === 'thinking_delta') { moiChu(txt, dung, true); }
      else if (ev.type === 'message_delta') {
        if (ev.delta?.stop_reason) lyDo = ev.delta.stop_reason;
        if (ev.usage) { if (ev.usage.output_tokens != null) dung.ra = ev.usage.output_tokens; if (ev.usage.cache_read_input_tokens != null) dung.doc = ev.usage.cache_read_input_tokens; if (ev.usage.cache_creation_input_tokens != null) dung.ghi = ev.usage.cache_creation_input_tokens; }
      } else if (ev.type === 'error') throw new Error(`Claude báo lỗi giữa chừng: ${ev.error?.message || ev.error?.type}`);
    }
  }
  if (!lyDo) throw new Error('Kết nối tới Claude bị đứt giữa chừng — Thử lại.');
  return { txt, lyDo, dung };
}

// Chạy loạt: việc đầu chạy trước, đợi nó bắt đầu (cache đã ghi) rồi mới bắn các việc còn lại.
export async function chayLoat(viec) {
  if (!viec.length) return [];
  let bao; const daBatDau = new Promise((r) => { bao = r; });
  const dau = viec[0](bao).finally(() => bao());
  await daBatDau;
  return Promise.allSettled([dau, ...viec.slice(1).map((v) => v(() => {}))]);
}

// Chế độ mock: giả lập stream + số token cache để thử cả luồng mà không cần key.
const MOCK_CSS = [
  '.the,.o{border-radius:40px!important}.tieuLon{color:#0a5246}',
  '.cuon,.chinh{flex-direction:column-reverse!important}',
  '.the{background-color:#e3efea!important}.nut{min-height:58px!important}',
  '.the:nth-of-type(n+3){display:none!important}.tieuLon{font-size:40px!important;line-height:46px!important}',
  '.viec,.the{outline:3px dashed #f5b70a;outline-offset:-6px}',
  'body{filter:hue-rotate(-12deg) saturate(1.2)}.nut{border-radius:99px!important}',
];
export const mockSua = (html, k, y) => html.replace('</head>', `<style>${MOCK_CSS[(k - 1) % MOCK_CSS.length]}</style></head>`)
  .replace(/(<body[^>]*>\s*<div[^>]*>)/, `$1<div style="position:absolute;left:16px;right:16px;top:8px;z-index:9;background:#0f6b5c;color:#fff;font:700 14px Inter;padding:8px 14px;border-radius:99px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">Mock ${k}: ${y.replace(/[<&]/g, '')}</div>`);
const mockDaGhi = new Set();
export async function goiMock({ toan, signal, moiChu, khiBatDau, khoaCache, vaoCache }) {
  await new Promise((r) => setTimeout(r, 250));
  const dung = mockDaGhi.has(khoaCache) ? { vao: 40, ghi: 0, doc: vaoCache, ra: 0 } : { vao: 40, ghi: vaoCache, doc: 0, ra: 0 };
  mockDaGhi.add(khoaCache); khiBatDau?.(dung);
  let txt = ''; const buoc = Math.ceil(toan.length / 24);
  for (let i = 0; i < toan.length; i += buoc) {
    if (signal.aborted) throw new DOMException('dừng', 'AbortError');
    await new Promise((r) => setTimeout(r, 60 + Math.random() * 80));
    txt += toan.slice(i, i + buoc); dung.ra = Math.round(txt.length / 3.5); moiChu(txt, dung);
  }
  return { txt, lyDo: 'end_turn', dung };
}

// Làm sạch HTML do Claude sinh bằng DANH SÁCH CHO PHÉP (thẻ, thuộc tính, URL, CSS), không dùng danh sách chặn.
// Thẻ/thuộc tính ngoài danh sách bị bỏ; URL chỉ http(s)/tương đối/#; ảnh thêm data:image/*; CSS lạ thì bỏ cả khối (fail closed).
const THE_CHO_PHEP = new Set(('html head body title meta link style div span p a b i u em strong small s sub sup br hr img button input label nav main section article aside header footer ' +
  'h1 h2 h3 h4 h5 h6 ul ol li dl dt dd table thead tbody tfoot tr td th caption colgroup col figure figcaption blockquote pre code time mark abbr cite q kbd samp var wbr picture source ' +
  'svg g path rect circle ellipse line polyline polygon defs lineargradient radialgradient stop clippath mask pattern symbol use text tspan desc filter fegaussianblur feoffset feblend fecolormatrix femerge femergenode fecomposite feflood fedropshadow').split(' '));
const THE_MO_RA = new Set(['form', 'fieldset', 'center', 'font', 'details', 'summary', 'menu', 'search']); // bỏ vỏ, giữ ruột; thẻ lạ khác bị xoá cả ruột
const THUOC_TINH = new Set(('class id style role tabindex lang dir title alt width height hidden translate draggable ' +
  'charset name content rel href src srcset type value placeholder disabled checked readonly inputmode maxlength min max step colspan rowspan datetime ' +
  'viewbox xmlns xmlns:xlink preserveaspectratio d x y x1 x2 y1 y2 cx cy r rx ry fill fill-rule fill-opacity clip-rule clip-path stroke stroke-width stroke-linecap stroke-linejoin stroke-dasharray stroke-dashoffset stroke-opacity stroke-miterlimit ' +
  'opacity transform transform-origin points offset stop-color stop-opacity gradientunits gradienttransform fx fy mask maskunits patternunits patterntransform shape-rendering text-anchor dominant-baseline font-family font-size font-weight letter-spacing ' +
  'filter stddeviation dx dy in in2 result mode values flood-color flood-opacity operator k1 k2 k3 k4 vector-effect').split(' '));
const THE_CO_URL = new Set(['a', 'img', 'link', 'use', 'source']);
const REL_CHO_PHEP = new Set(['stylesheet', 'preconnect', 'dns-prefetch', 'icon', 'preload']);
const ANH_DATA = /^data:image\/(png|jpe?g|gif|webp|avif|svg\+xml)[;,]/i;

function urlAnToan(v, choAnhData) {
  const s = String(v).replace(/[\u0000-\u0020\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, '');
  if (!s || s[0] === '#') return true;
  if (choAnhData && ANH_DATA.test(s)) return true;
  try { return /^https?:$/.test(new URL(s, 'https://x.invalid/').protocol); } catch { return false; }
}

// Giải escape CSS (\75 rl thành url) rồi mới soi, để không lọt bằng ký tự thoát.
const giaiEscape = (c) => c.replace(/\\([0-9a-f]{1,6})\s?/gi, (_, h) => { const n = parseInt(h, 16); return n && n < 0x110000 ? String.fromCodePoint(n) : ''; }).replace(/\\([\s\S])/g, '$1');
function cssAnToan(css) {
  const g = giaiEscape(css).replace(/\/\*[\s\S]*?\*\//g, '');
  if (/@import|@namespace|expression\s*\(|-moz-binding|behaviou?r\s*:|javascript:|vbscript:|<\/?style|<!--|-->|<\/?script/i.test(g)) return false;
  for (const m of g.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi)) if (!urlAnToan(m[1] ?? m[2] ?? m[3] ?? '', true)) return false;
  if (/(^|[^\w-])(image-set|src|image|cross-fade|element|paint)\s*\(/i.test(g.replace(/url\([^)]*\)/gi, ''))) return false;
  return true;
}

function lamSachThuoc(n, ten) {
  for (const a of [...n.attributes]) {
    const t = a.name.toLowerCase(), v = a.value;
    let ok = THUOC_TINH.has(t) || /^(data|aria)-[a-z0-9_.:-]+$/.test(t);
    if (ok && t === 'style') ok = cssAnToan(v);
    if (ok && (t === 'href' || t === 'src' || t === 'xlink:href')) ok = THE_CO_URL.has(ten) && urlAnToan(v, ten === 'img' || ten === 'source') && (ten !== 'use' || /^\s*#/.test(v));
    if (ok && t === 'srcset') ok = (ten === 'img' || ten === 'source') && v.split(',').every((p) => urlAnToan(p.trim().split(/\s+/)[0], true));
    if (ok && t === 'rel') ok = ten === 'link' && v.toLowerCase().split(/\s+/).every((r) => REL_CHO_PHEP.has(r));
    if (ok && t === 'type') ok = (ten === 'input' && /^(text|search|tel|email|number|password|checkbox|radio|range|color|date|time|url)$/i.test(v)) || (ten === 'button' && /^(button|submit)$/i.test(v)) || ten === 'source';
    if (ok && t === 'name' && ten === 'meta') ok = /^(viewport|theme-color|color-scheme|description)$/i.test(v);
    if (!ok) n.removeAttribute(a.name);
  }
  if (ten === 'meta' && !n.hasAttribute('charset') && !n.hasAttribute('name')) return false;
  if (ten === 'link' && (!n.hasAttribute('href') || !n.hasAttribute('rel'))) return false;
  if (ten === 'button' && n.hasAttribute('type')) n.setAttribute('type', 'button');
  if (ten === 'a' && n.hasAttribute('href')) n.setAttribute('rel', 'noopener noreferrer');
  return true;
}

function duyet(goc) {
  for (const n of [...goc.children]) {
    const ten = n.localName.toLowerCase();
    if (THE_MO_RA.has(ten)) { duyet(n); n.replaceWith(...n.childNodes); continue; }
    if (!THE_CHO_PHEP.has(ten) || (ten === 'style' && !cssAnToan(n.textContent)) || !lamSachThuoc(n, ten)) { n.remove(); continue; }
    duyet(n);
  }
}

export function lamSach(html) {
  const d = new DOMParser().parseFromString(String(html), 'text/html');
  lamSachThuoc(d.documentElement, 'html'); lamSachThuoc(d.body, 'body');
  duyet(d.documentElement);
  return '<!doctype html>\n' + d.documentElement.outerHTML;
}


// Danh sách ảnh dùng được trong biến thể (đưa vào prompt hệ thống).
// j = kết quả /api/assets — dùng chung với MCP của máy chủ (cùng một chuỗi trong prompt hệ thống)
export const vanBanAssets = (j) => `- Icon 3D Fluent (đặt trong .bt): ${j.icon3d.map((t) => `/assets/icon3d/${t}`).join(', ')}\n- Mascot Rob (cảnh): ${j.rob.map((t) => `/assets/rob/${t}`).join(', ')}\n- Logo: /assets/logo.png`;
let assetsVanBan = '';
export async function taiAssets() {
  if (assetsVanBan) return assetsVanBan;
  try {
    assetsVanBan = vanBanAssets(await (await fetch('/api/assets')).json());
  } catch { assetsVanBan = '- /assets/rob/rob-goc.webp, /assets/icon3d/khoa.webp, /assets/logo.png'; }
  return assetsVanBan;
}
