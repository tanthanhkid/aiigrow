// Proxy thử nghiệm cho e2e agent Windows (KHÔNG phải mã sản phẩm).
//  • HTTP 127.0.0.1:<CONG_PROXY> → chuyển nguyên văn tới máy chủ Next (127.0.0.1:<CONG_NEXT>), TRỪ GET /api/agent/ban-moi:
//    trả manifest do kịch bản đặt (POST /__e2e/manifest). Mặc định bản 0.0.1 ⇒ agent luôn «đã là bản mới nhất», không bao giờ
//    tải bản phát hành thật trên Blob trong lúc chạy thử. Lý do: server/lib/ban-agent.ts cố định, không có biến môi trường để đè.
//  • HTTPS 127.0.0.1:<CONG_TEP> phục vụ tệp trong <THU_MUC_TEP> (bộ cài bản cao hơn) bằng chứng chỉ tự ký (PFX) —
//    agent chỉ nhận URL https cùng host với máy chủ (TuCapNhat.KiemManifest), nên cần cổng https trên 127.0.0.1.
// Chạy: node proxy.mjs  (biến môi trường: CONG_PROXY=3311 CONG_NEXT=3310 CONG_TEP=3443 PFX=… PFX_MK=… THU_MUC_TEP=…)
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";

const CONG_PROXY = Number(process.env.CONG_PROXY || 3311);
const CONG_NEXT = Number(process.env.CONG_NEXT || 3310);
const CONG_TEP = Number(process.env.CONG_TEP || 3443);
const THU_MUC_TEP = process.env.THU_MUC_TEP || "";
const MAC_DINH = { version: "0.0.1", url: `https://127.0.0.1:${CONG_TEP}/khong-co.exe`, sha256: "0".repeat(64) };
let manifest = { ...MAC_DINH };
let soLanHoiManifest = 0;

const ghi = (...a) => console.log(new Date().toISOString(), ...a);

const proxy = http.createServer((req, res) => {
  const url = req.url || "/";
  if (url === "/__e2e/manifest" && req.method === "POST") {
    let b = "";
    req.on("data", (c) => (b += c));
    req.on("end", () => {
      try {
        const m = JSON.parse(b || "{}");
        manifest = m && m.version ? m : { ...MAC_DINH };
        ghi("đặt manifest", JSON.stringify(manifest));
        res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ ok: true, manifest }));
      } catch (e) {
        res.writeHead(400).end(String(e));
      }
    });
    return;
  }
  if (url === "/__e2e/manifest" && req.method === "GET") {
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ manifest, soLanHoiManifest }));
    return;
  }
  if (url.split("?")[0] === "/api/agent/ban-moi" && req.method === "GET") {
    soLanHoiManifest++;
    ghi("agent hỏi ban-moi", req.headers["x-aiigrow-ban"] || "", "→", manifest.version);
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(JSON.stringify(manifest));
    return;
  }
  const t = Date.now();
  const p = http.request({ host: "127.0.0.1", port: CONG_NEXT, method: req.method, path: url, headers: req.headers }, (r) => {
    res.writeHead(r.statusCode || 502, r.headers);
    r.pipe(res);
    r.on("end", () => {
      if (url.startsWith("/api/device/")) ghi(req.method, url.split("?")[0], r.statusCode, `${Date.now() - t}ms`, req.headers["x-aiigrow-ban"] || "");
    });
  });
  p.on("error", (e) => {
    ghi("lỗi chuyển tiếp", url, e.message);
    if (!res.headersSent) res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ loi: "proxy", cau: e.message }));
  });
  req.pipe(p);
});
proxy.listen(CONG_PROXY, "127.0.0.1", () => ghi(`proxy http://127.0.0.1:${CONG_PROXY} → :${CONG_NEXT}`));

if (process.env.PFX && THU_MUC_TEP) {
  const tep = https.createServer({ pfx: fs.readFileSync(process.env.PFX), passphrase: process.env.PFX_MK || "" }, (req, res) => {
    const ten = path.basename(decodeURIComponent((req.url || "/").split("?")[0]));
    const f = path.join(THU_MUC_TEP, ten);
    if (!ten || !fs.existsSync(f)) {
      ghi("https 404", req.url);
      res.writeHead(404).end();
      return;
    }
    ghi("https tải", ten);
    res.writeHead(200, { "content-type": "application/octet-stream", "content-length": fs.statSync(f).size });
    fs.createReadStream(f).pipe(res);
  });
  tep.listen(CONG_TEP, "127.0.0.1", () => ghi(`tệp https://127.0.0.1:${CONG_TEP} ← ${THU_MUC_TEP}`));
}
