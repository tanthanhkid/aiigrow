#!/usr/bin/env node
// Máy chủ cục bộ (Mac) của bàn brainstorm: http của Node + realtime.mjs, lõi ở ung-dung.mjs (dùng chung với bản Cloudflare cf/worker.mjs).
// Chỉ nghe 127.0.0.1. KHÔNG ghi log nội dung yêu cầu.
import http from 'node:http';
import fs from 'node:fs';
import { ganRealtime, phatPhong, dsPhong, dongPhong } from './realtime.mjs';
import { taoUngDung } from './ung-dung.mjs';
import { canDung, dungTroLy } from './tro-ly/dung.mjs';

// ✦ Trợ lý AI: bundle vòng agent (LangGraph.js) cho trình duyệt khi chưa có / cũ hơn tro-ly/agent.mjs — thiếu devDependencies thì bàn vẫn chạy, chỉ panel Trợ lý báo chưa dựng.
if (canDung()) { try { await dungTroLy(); } catch (e) { console.warn(`! Chưa dựng được ✦ Trợ lý AI (${e.message.split('\n')[0]}) — chạy \`npm install\` rồi \`npm run dung-tro-ly\`.`); } }

let cong = Number(process.env.PORT) || 5178;
const app = taoUngDung({ cong: () => cong, phatPhong, dsPhong, dongPhong });
const may = http.createServer((req, res) => app.xuLy(req, res));
may.on('error', (e) => {
  if (e.code === 'EADDRINUSE' && cong < (Number(process.env.PORT) || 5178) + 20) { cong += 1; may.listen(cong, '127.0.0.1'); return; }
  console.error('Không mở được máy chủ:', e.message); process.exit(1);
});
may.on('listening', () => {
  if (!fs.existsSync(app.TEP['/vendor/html-to-image.js'])) console.warn('! Chưa có node_modules/html-to-image — chạy `npm install` để xuất PNG.');
  console.log(`\n  Bàn brainstorm AiiGrow đang chạy:  http://127.0.0.1:${cong}/\n  (thử không cần key: http://127.0.0.1:${cong}/?mock=1)  ·  Ctrl+C để tắt\n`);
});
// bàn chính khi khoaBang mà người nối không phải chủ quản: chỉ được con trỏ/nhìn/tên ('xem'), không phát thao tác
ganRealtime(may, (req) => app.hopLeNguon(req) && app.daVao(req), app.phongHopLe);
may.listen(cong, '127.0.0.1');
