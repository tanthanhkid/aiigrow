#!/usr/bin/env node
// Bundle vòng agent ✦ Trợ lý AI (tro-ly/agent.mjs + LangGraph.js + @langchain/anthropic + langsmith) thành MỘT tệp ESM cho trình duyệt:
// tro-ly/dist/tro-ly-ai.js (không commit), phục vụ ở /vendor/tro-ly-ai.js — Mac: ung-dung.mjs TEP; Cloudflare: cf/dung.mjs chép vào dist.
// Gọi: `node tro-ly/dung.mjs` (hoặc import { dungTroLy } — server.mjs tự dựng khi thiếu/cũ). Cần devDependencies (npm install).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
export const RA = path.join(DIR, 'dist', 'tro-ly-ai.js');
const VAO = path.join(DIR, 'agent.mjs');

export function canDung() {
  try { const ra = fs.statSync(RA).mtimeMs; return [VAO, path.join(DIR, 'dung.mjs'), path.join(DIR, '..', 'package-lock.json')].some((f) => { try { return fs.statSync(f).mtimeMs > ra; } catch { return false; } }); } catch { return true; }
}
export async function dungTroLy({ im = false } = {}) {
  const { build } = await import('esbuild');
  const r = await build({ entryPoints: [VAO], outfile: RA, bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true,
    conditions: ['browser'], mainFields: ['browser', 'module', 'main'], legalComments: 'none', logLevel: 'warning', external: ['node:*'], // SDK chỉ import('node:fs') động trong nhánh đọc cấu hình máy — không chạy trên trình duyệt
    define: { 'process.env.NODE_ENV': '"production"', 'process.env.LANGCHAIN_CALLBACKS_BACKGROUND': '"false"' } });
  if (!im) console.log(`✦ Trợ lý AI: ${path.relative(process.cwd(), RA)} ${(fs.statSync(RA).size / 1024).toFixed(0)} KB${r.warnings.length ? ` (${r.warnings.length} cảnh báo)` : ''}`);
  return RA;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await dungTroLy();
