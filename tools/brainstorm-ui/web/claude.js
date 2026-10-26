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

// Bỏ <script>, on*, iframe… khỏi HTML do Claude sinh (khung đã sandbox không script; đây là lớp thứ hai cho tệp xuất/lưu/play).
export function lamSach(html) {
  const d = new DOMParser().parseFromString(html, 'text/html');
  d.querySelectorAll('script,iframe,frame,object,embed,base,meta[http-equiv],form,noscript,template,noembed,noframes,xmp,plaintext').forEach((n) => n.remove());
  d.querySelectorAll('*').forEach((n) => { for (const a of [...n.attributes]) if (/^on/i.test(a.name) || /^\s*javascript:/i.test(a.value)) n.removeAttribute(a.name); });
  return '<!doctype html>\n' + d.documentElement.outerHTML;
}


// Danh sách ảnh dùng được trong biến thể (đưa vào prompt hệ thống).
let assetsVanBan = '';
export async function taiAssets() {
  if (assetsVanBan) return assetsVanBan;
  try {
    const j = await (await fetch('/api/assets')).json();
    assetsVanBan = `- Icon 3D Fluent (đặt trong .bt): ${j.icon3d.map((t) => `/assets/icon3d/${t}`).join(', ')}\n- Mascot Rob (cảnh): ${j.rob.map((t) => `/assets/rob/${t}`).join(', ')}\n- Logo: /assets/logo.png`;
  } catch { assetsVanBan = '- /assets/rob/rob-goc.webp, /assets/icon3d/khoa.webp, /assets/logo.png'; }
  return assetsVanBan;
}
