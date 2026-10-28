// ✦ Trợ lý AI của bàn brainstorm — vòng agent LangGraph.js chạy TRONG TRÌNH DUYỆT.
// - LLM: @langchain/anthropic gọi thẳng api.anthropic.com bằng key Claude của chính người dùng (localStorage), kèm header
//   anthropic-dangerous-direct-browser-access (dangerouslyAllowBrowser). Key không đi qua máy chủ của bàn.
// - Tool: KHÔNG định nghĩa lại — nạp nguyên danh sách tool từ /mcp cùng origin (tools/list) rồi gọi tools/call; quyền là quyền
//   của người đang chat (cookie mật khẩu chung + mã chủ quản nếu họ đã nhập). Header x-bs-tro-ly mang câu lệnh gốc (cắt ngắn) → audit.
// - LangSmith: tuỳ chọn, chỉ bật khi người dùng dán key LangSmith (cũng lưu trong trình duyệt).
// Bundle bằng esbuild → /vendor/tro-ly-ai.js (tro-ly/dung.mjs); web/tro-ly.js nạp lười khi mở panel.
import { ChatAnthropic } from '@langchain/anthropic';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { tool } from '@langchain/core/tools';
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from '@langchain/core/messages';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { Client } from 'langsmith';

// Thao tác phá huỷ / khó thấy ngay ⇒ hỏi «Làm / Bỏ» trong chat (trừ khi bật «Tự làm không hỏi»).
export const PHA_HUY = new Set(['xoa_man', 'thay_man', 'gop_dung_chung', 'tach_dung_chung', 'khoi_phuc_phien_ban', 'xoa_bien_the', 'don_bien_the',
  'chap_nhan_de_xuat', 'tu_choi_de_xuat', 'xoa_gop_y', 'khoi_phuc_tu_nhat_ky', 'thu_hoi_link_gop_y']);

const HE_THONG = `Bạn là «Trợ lý» trong bàn brainstorm giao diện AiiGrow (canvas kiểu Figma: mỗi hành trình là một hàng màn, dưới mỗi màn là các biến thể; có phiên bản màn, liên kết data-toi giữa màn, màn dùng chung, góp ý /r/, đề xuất chờ duyệt, nhật ký audit).
Người dùng ra lệnh bằng tiếng Việt hoặc tiếng Anh; bạn TỰ làm bằng tool rồi báo lại. Trả lời bằng ngôn ngữ người dùng dùng (mặc định tiếng Việt có dấu), ngắn gọn.

Cách làm:
- Màn gọi bằng tên tự nhiên ⇒ tim_man (hoặc ds_hanh_trinh) ra đúng key trước. Ngữ cảnh bàn (section, khung đang chọn) đi kèm mỗi lệnh — «màn này», «biến thể này» là khung đang chọn.
- Lệnh mơ hồ (không rõ màn nào, nhiều màn trùng tên mà ngữ cảnh không chỉ ra, không rõ muốn làm gì, hoặc thao tác phá huỷ không rõ đích) ⇒ HỎI LẠI một câu ngắn, kèm các lựa chọn cụ thể (tên + key), KHÔNG đoán bừa và KHÔNG gọi tool ghi.
- Tạo biến thể: ngu_canh_bien_the (nhận luật thiết kế + HTML gốc + liên kết) → tự viết HTML hoàn chỉnh → tao_nhieu_bien_the (nhiều) hoặc tao_bien_the (một). HTML được làm sạch phía máy chủ (lamSach) như bàn web. Giữ nguyên data-toi của các nút đang nối. Sau khi lưu, xem ảnh trả về (hoặc anh_man) và tự đánh giá; lệch luật thì sua_bien_the.
- Nối nút: lien_ket_man / ds_lien_ket để thấy nút (phan_tu, chu, v) → sua_lien_ket (một) hoặc sua_lien_ket_nhieu (nhiều). Kiểm lại bằng lien_ket_man.
- Thay màn bằng biến thể: ds_bien_the để ra id (biến thể «số 2» = k=2 của đợt mới nhất, hoặc theo thứ tự hiện trên bàn) → thay_man.
- Thêm màn: them_man (sau màn nào) → nếu cần nội dung thì viết HTML theo luật thiết kế rồi thay_man(html) hoặc sua_man. Xoá màn: lien_ket_man trước để biết luồng nào hỏng, nêu ra trong câu xác nhận.
- Dùng chung: ds_dung_chung (có gợi ý gộp) → gop_dung_chung / tach_dung_chung.
- Trước thao tác chỉ chủ quản làm được, nếu chưa chắc quyền thì quyen_cua_toi. Tool báo cần mã chủ quản ⇒ nói người dùng nhập mã chủ quản trên bàn (💬 Góp ý), đừng thử vòng vo.
- Thao tác phá huỷ được hỏi «Làm / Bỏ» trong chat trước khi chạy; người dùng bấm «Bỏ» thì dừng việc đó, không tìm đường khác để làm cho bằng được.
- Cuối mỗi câu trả lời có thay đổi: liệt kê ngắn đã làm gì + cách quay lại (Lịch sử phiên bản của màn / 🗑 Thùng rác 7 ngày / 🕘 Lịch sử thay đổi của chủ quản, hoặc tool khôi phục tương ứng).
- Nhắc tên màn bằng cú pháp [[key|Tên màn]] (biến thể: [[id|nhãn]]) để người dùng bấm vào là bay tới khung đó.

Luật thiết kế AiiGrow (bắt buộc khi viết HTML):
- Clay gương (docs/THIET-KE-CLAY.md): nền #f4f4f2, chữ #0f1312, nút chính than chì #0f1312, ngọc lục bảo #0f6b5c điểm nhấn, vàng #f5b70a CHỈ cho điểm; font Inter. Khối phồng bo 24–36, bóng kép (ngoài mềm + inset sáng trên-trái + inset tối dưới-phải), không viền mảnh; bóng gương (men trắng nửa trên nút/chip). Icon minh hoạ = Fluent Emoji 3D có sẵn trong /assets/icon3d, mascot Rob trong /assets/rob — không vẽ SVG minh hoạ.
- Chữ tiếng Việt CÓ DẤU, giọng thật, không «Chào mừng bạn đến với…», «Khám phá ngay», không rải emoji; nói «phụ huynh», không «trainer»; số có đơn vị và ngày cụ thể.
- Premium, không «mùi AI» (Gu giao diện của Thanh): mỗi màn một việc chính; mỗi thao tác có phản hồi + hoàn tác + câu «bước tiếp theo»; nghĩ tới trạng thái trống/lỗi/đang tải; cùng tình huống cùng một mẫu giữa các màn; mascot hoà vào cảnh, không dán icon góc thẻ.
- UI-FOUNDATIONS: vùng chạm ≥44px, tương phản chữ ≥4.5:1, giữ đúng kích thước khung của màn.`;

const docText = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.filter((b) => b?.type === 'text' || b?.type === 'text_delta').map((b) => b.text || '').join('') : '');

// ---- nạp tool từ /mcp (một nguồn với MCP cho Claude Code / Claude.ai) ----
async function rpc(method, params, dau) {
  const r = await fetch('/mcp', { method: 'POST', credentials: 'same-origin',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...dau }, body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }) });
  let j = null; try { j = await r.json(); } catch { /* không phải JSON */ }
  if (!r.ok || j?.error) throw new Error(j?.error?.message || `MCP HTTP ${r.status}`);
  return j.result;
}
let dsToolMcp = null;
export async function napTool(dau) {
  if (!dsToolMcp) dsToolMcp = rpc('tools/list', {}, { ...dau, 'x-bs-tro-ly': encodeURIComponent('(nạp danh sách tool)') }).then((r) => r.tools).catch((e) => { dsToolMcp = null; throw e; });
  return dsToolMcp;
}

// Ảnh trong kết quả tool cũ nặng ngữ cảnh ⇒ chỉ giữ ảnh của 2 kết quả tool có ảnh gần nhất.
function gonAnh(msgs) {
  let giu = 2; const ra = [];
  for (let i = msgs.length - 1; i >= 0; i--) {
    const m = msgs[i];
    if (m instanceof ToolMessage && Array.isArray(m.content) && m.content.some((b) => b?.type === 'image')) {
      if (giu > 0) { giu -= 1; ra.push(m); continue; }
      ra.push(new ToolMessage({ tool_call_id: m.tool_call_id, name: m.name, content: m.content.map((b) => (b?.type === 'image' ? { type: 'text', text: '(ảnh cũ đã lược — gọi lại anh_man nếu cần)' } : b)) }));
      continue;
    }
    ra.push(m);
  }
  return ra.reverse();
}

const tomTat = (v, n = 600) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s.length > n ? `${s.slice(0, n)}…` : s; };

/**
 * Chạy một lượt lệnh.
 * o: { key, model, maxTokens, lenh, lichSu: [{vai:'nguoi'|'ai', chu}], nguCanh: object, dau: () => headers (mã chủ quản, tên),
 *      tuLam: () => bool, xacNhan: async ({ten, args}) => bool, signal, langsmith: {key, project}, onSuKien: (e) => void }
 * Sự kiện: {loai:'chu', chu} · {loai:'tool', id, ten, args} · {loai:'tool-xong', id, ten, ket, anh, loi} · {loai:'xac-nhan-bo', ten}
 */
export async function chay(o) {
  const lenhNgan = String(o.lenh || '').replace(/\s+/g, ' ').trim().slice(0, 120);
  const dauGoi = () => ({ ...(o.dau?.() || {}), 'x-bs-tro-ly': encodeURIComponent(lenhNgan || '(trống)') });
  const ds = await napTool(o.dau?.() || {});
  const tools = ds.map((t) => tool(async (args) => {
    if (PHA_HUY.has(t.name) && !o.tuLam?.()) {
      const dong = await o.xacNhan({ ten: t.name, args });
      if (!dong) { o.onSuKien?.({ loai: 'xac-nhan-bo', ten: t.name }); return `Người dùng bấm «Bỏ» — KHÔNG thực hiện ${t.name}. Dừng việc này và hỏi người dùng muốn làm gì khác.`; }
    }
    if (/^tao_(nhieu_)?bien_the$|^tao_phuong_an$/.test(t.name) && !args.model) args = { ...args, model: o.model || 'claude-sonnet-5-5' }; // bàn ghi model sinh
    const r = await rpc('tools/call', { name: t.name, arguments: args }, dauGoi());
    const content = (r.content || []).map((c) => (c.type === 'image' ? { type: 'image', data: c.data, mimeType: c.mimeType || 'image/png' } : { type: 'text', text: String(c.text ?? '') }));
    if (r.isError) throw new Error(content.filter((c) => c.type === 'text').map((c) => c.text).join(' ') || 'Tool lỗi');
    return content.length ? content : 'Xong.';
  }, { name: t.name, description: t.description || t.name, schema: t.inputSchema || { type: 'object', properties: {} } }));

  const llm = new ChatAnthropic({ model: o.model || 'claude-sonnet-5-5', apiKey: o.key, maxTokens: o.maxTokens || 32000, streaming: true, maxRetries: 2,
    clientOptions: { dangerouslyAllowBrowser: true } });
  const sys = new SystemMessage({ content: [{ type: 'text', text: HE_THONG, cache_control: { type: 'ephemeral' } }] });
  const agent = createReactAgent({ llm, tools, prompt: (state) => [sys, ...gonAnh(state.messages)] });

  const truoc = (o.lichSu || []).slice(-12).filter((x) => x.chu).map((x) => (x.vai === 'nguoi' ? new HumanMessage(x.chu) : new AIMessage(x.chu)));
  const vao = new HumanMessage(`[Ngữ cảnh bàn lúc ra lệnh]\n${JSON.stringify(o.nguCanh || {}, null, 1)}\n\n[Lệnh]\n${o.lenh}`);

  const callbacks = [];
  if (o.langsmith?.key) callbacks.push(new LangChainTracer({ projectName: o.langsmith.project || 'aiigrow-figma', client: new Client({ apiKey: o.langsmith.key, apiUrl: 'https://api.smith.langchain.com', autoBatchTracing: false }) }));

  let cuoi = '';
  const luong = agent.streamEvents({ messages: [...truoc, vao] }, { version: 'v2', signal: o.signal, callbacks, recursionLimit: 80 });
  for await (const e of luong) {
    if (e.event === 'on_chat_model_stream') {
      const t = docText(e.data?.chunk?.content); if (t) { cuoi += t; o.onSuKien?.({ loai: 'chu', chu: t }); }
    } else if (e.event === 'on_chat_model_start') {
      if (cuoi) { cuoi += '\n\n'; o.onSuKien?.({ loai: 'chu', chu: '\n\n' }); }
    } else if (e.event === 'on_tool_start') {
      o.onSuKien?.({ loai: 'tool', id: e.run_id, ten: e.name, args: e.data?.input });
    } else if (e.event === 'on_tool_end' || e.event === 'on_tool_error') {
      const out = e.data?.output; const c = out?.content ?? out;
      const loi = e.event === 'on_tool_error' || out?.status === 'error';
      const anh = Array.isArray(c) ? c.filter((b) => b?.type === 'image').map((b) => `data:${b.mimeType || 'image/png'};base64,${b.data}`) : [];
      o.onSuKien?.({ loai: 'tool-xong', id: e.run_id, ten: e.name, loi, ket: tomTat(loi && e.data?.error ? String(e.data.error.message || e.data.error) : (docText(c) || c || '')), anh });
    }
  }
  return cuoi.trim();
}
