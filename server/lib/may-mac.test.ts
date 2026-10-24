// Máy macOS có tác tử riêng (agent-mac) được đối xử như máy Windows có tác tử: ghép platform "mac", thêm giờ ⇒ cửa sổ cua_so_den,
// dong-bo trả `windows` (mode tu_do + grantEndsAt, app là bundle id), ban-moi theo nền tảng.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyMay } = await import("./api-may.ts");
const yc = await import("./yeu-cau.ts");
const tt = await import("./tuan-thu.ts");
const g = await import("./gia-dinh.ts");
const cd = await import("./chuyen-doi.ts");
const { chinhSachWindows } = await import("./agent-windows.ts");
const ba = await import("./ban-agent.ts");
const { q, one } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

const T = new Date("2026-10-21T11:00:00Z");
const dongBo = async (tok: string, status: Record<string, unknown> = {}) => {
  const r = await xuLyMay(new Request("http://x/api/may/dong-bo", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
    body: JSON.stringify({ clientTime: new Date().toISOString(), status }) }), ["dong-bo"]);
  return { status: r.status, body: await r.json() as any };
};

test("coTacTu: Windows + Mac có tác tử; điện thoại / TV / mạng thì không", () => {
  assert.ok(cd.coTacTu("windows") && cd.coTacTu("mac"));
  for (const n of ["android", "ios", "tvos", "mang", "", null, undefined]) assert.equal(cd.coTacTu(n), false);
});

test("ghép máy platform «mac» lưu đúng; mã ghép của nền khác bị từ chối", async () => {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const r = await g.ghepMay(await g.taoMaGhep(fam, con, "mac"), "mac", "MacBook của Ken");
  assert.equal((await g.mayTuToken(r.token))!.platform, "mac");
  await assert.rejects(g.ghepMay(await g.taoMaGhep(fam, con, "mac"), "windows", "X"), (e: { ma?: string }) => e.ma === "sai_nen_tang");
});

test("thêm giờ cho lời xin từ máy Mac ⇒ cua_so_den, hanMoCuaMay, dong-bo nhận mode tu_do + grantEndsAt; Khoá lại ngay đóng cửa sổ", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Phi" });
  const r = await g.ghepMay(await g.taoMaGhep(fam, con, "mac"), "mac", "Mac của Phi");
  const may = (await g.mayTuToken(r.token))!;
  const a = await yc.guiYeuCau(con, may.id, { loai: "them_gio", phut: 30, lyDo: "Để làm bài tập" }, T);
  await yc.dongY(fam, a.id, bm, { truDiem: false, phut: 30 }, T);
  const g1 = await one<{ cua_so_den: Date | null }>(`select cua_so_den from grants where request_id = $1`, [a.id]);
  assert.ok(g1?.cua_so_den, "máy Mac phải có cửa sổ mở");
  const den = new Date(Date.now() + 30 * 60000);
  await q(`update grants set cua_so_den = $2 where request_id = $1`, [a.id, den]);        // dong-bo dùng đồng hồ thật ⇒ đặt hạn tương đối với «bây giờ»
  const s = await dongBo(r.token, { agent: "mac", version: "0.1.0", trayAlive: true, childSessionActive: true });
  assert.equal(s.status, 200);
  assert.equal(s.body.windows.mode, "tu_do");
  assert.equal(s.body.windows.grantEndsAt, den.toISOString());
  assert.equal((await tt.dsTuanThu(fam, new Date())).find((x) => x.id === may.id)?.moDen, den.toISOString());
  await tt.huyMoKhanCap(fam, may.id, bm, new Date());
  assert.equal(await tt.hanMoCuaMay(may, con, new Date()), null);
  assert.equal((await dongBo(r.token, { agent: "mac", childSessionActive: true })).body.windows.mode, "hoc");
  // mã mở offline cấp cho máy Mac; máy Android thì không
  assert.ok(await tt.maOfflineChoMay(fam, may.id, bm, new Date()));
});

test("quyền bảo vệ suy từ status máy Mac; app của Mac là bundle id (không phải .exe) và giữ nguyên chữ hoa-thường", () => {
  assert.ok(g.quyenCuaMay({ status: { agent: "mac", cheDo: "chan", mode: "hoc", trayAlive: true, childSessionActive: true } }));
  assert.equal(g.quyenCuaMay({ status: { agent: "mac", cheDo: "chan", mode: "hoc" } })!.appLocker, undefined, "AppLocker chỉ có ở Windows");
  const pol = { serverTime: T.toISOString(), tz: "Asia/Ho_Chi_Minh", con: { ten: "Ken" }, khoaNgay: false, soDu: 0, phien: null, webChiChoPhep: false,
    lich: { ngayThuong: [], cuoiTuan: [], ngu: null }, allowlistHeThong: ["com.apple.finder", "explorer.exe"],
    luat: [{ muc: "com.Duolingo.app", loai: "hoc" }, { muc: "scratch.exe", loai: "hoc" }, { muc: "scratch.mit.edu", loai: "hoc" }] } as never;
  const m = chinhSachWindows(pol, undefined, undefined, { nen: "mac" });
  assert.deepEqual(m.allowedApps.sort(), ["com.Duolingo.app", "com.apple.finder"].sort());
  assert.deepEqual(chinhSachWindows(pol).allowedApps.sort(), ["explorer.exe", "scratch.exe"], "Windows giữ như cũ");
});

test("Mac: phiên chơi app của nền khác (.exe) KHÔNG thả trình duyệt; phiên trang web thì thả", () => {
  const goc = (muc: string) => ({ serverTime: T.toISOString(), tz: "Asia/Ho_Chi_Minh", con: { ten: "Ken" }, khoaNgay: false, soDu: 0, webChiChoPhep: false,
    phien: { id: "p1", muc, conPhut: 20 }, lich: { ngayThuong: [], cuoiTuan: [], ngu: null }, allowlistHeThong: [],
    luat: [{ muc, loai: "giai_tri" }] }) as never;
  assert.ok(!chinhSachWindows(goc("roblox.exe"), undefined, undefined, { nen: "mac" }).allowedApps.includes("com.google.Chrome"));
  assert.ok(chinhSachWindows(goc("roblox.com"), undefined, undefined, { nen: "mac" }).allowedApps.includes("com.google.Chrome"));
  const roblox = chinhSachWindows(goc("com.roblox.RobloxPlayer"), undefined, undefined, { nen: "mac" }).allowedApps;
  assert.ok(roblox.includes("com.roblox.RobloxPlayer") && !roblox.includes("com.google.Chrome"), "bundle id có chữ hoa là app, không phải web");
});

test("ban-moi theo nền tảng (banAgentCho — route chỉ đọc ?platform): không tham số = Windows như trước; mac = bản Mac", () => {
  assert.deepEqual(ba.banAgentCho(null), ba.BAN_AGENT_WINDOWS);
  assert.deepEqual(ba.banAgentCho("windows"), ba.BAN_AGENT_WINDOWS);
  assert.deepEqual(ba.banAgentCho("mac"), ba.BAN_AGENT_MAC);
  // gói Mac nằm trên chính máy chủ được hỏi (staging…): agent Mac chỉ nhận URL cùng host với máy chủ nó ghép
  const st = ba.banAgentCho("mac", "https://staging.aiigrow.example");
  assert.equal(st.url, `https://staging.aiigrow.example/tai/AiiGrow-${ba.BAN_AGENT_MAC.version}.pkg`);
  assert.equal(st.sha256, ba.BAN_AGENT_MAC.sha256);
  assert.deepEqual(ba.banAgentCho("mac", "http://localhost:3000"), ba.BAN_AGENT_MAC, "không https ⇒ giữ URL gốc");
  assert.deepEqual(ba.banAgentCho(null, "https://staging.aiigrow.example"), ba.BAN_AGENT_WINDOWS);
  assert.match(ba.BAN_AGENT_MAC.url, /^https:\/\/aiigrow\.aiilab\.vn\/tai\/AiiGrow-\d+\.\d+\.\d+\.pkg$/);
});

test("Mac báo usage bundle id chữ hoa ⇒ lưu chữ thường, khớp luật (chuanMuc) nên rời «Chưa xếp»", async () => {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const r = await g.ghepMay(await g.taoMaGhep(fam, con, "mac"), "mac", "Mac của Ken");
  const may = (await g.mayTuToken(r.token))!;
  const res = await xuLyMay(new Request("http://x/api/may/dong-bo", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${r.token}` },
    body: JSON.stringify({ clientTime: new Date().toISOString(), status: { agent: "mac" }, usage: [{ muc: "com.roblox.RobloxPlayer", phut: 12 }] }) }), ["dong-bo"]);
  assert.equal(res.status, 200);
  assert.deepEqual((await q<{ muc: string }>(`select muc from usage where device_id = $1`, [may.id])).map((x) => x.muc), ["com.roblox.robloxplayer"]);
});
