// Nhật ký agent: máy gửi qua /api/device/log (token máy), Ba Mẹ đọc đúng máy của gia đình, gia đình khác không đọc được;
// Policy dịch cho Windows trả kèm dong-bo; lời xin từ màn chặn hỏi lại được trạng thái.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const lg = await import("./log-may.ts");
const { xuLyMay } = await import("./api-may.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

async function goi(duong: string, o: { tok?: string; body?: unknown } = {}) {
  const req = new Request(`http://may.test/api/device/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const r = await xuLyMay(req, duong.split("/"));
  return { status: r.status, body: await r.json() };
}

async function mayMoi() {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const ghep = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop của Ken");
  return { fam, bm, con, tok: ghep.token, mayId: ghep.deviceId };
}

test("máy gửi log, Ba Mẹ đọc mới nhất trước, lọc theo mức; gia đình khác bị từ chối; không token ⇒ 401", async () => {
  const { fam, tok, mayId } = await mayMoi();
  const r = await goi("log", { tok, body: { ds: [
    { luc: "2026-10-21T10:00:00Z", muc: "tin", nguon: "AgentWorker", noiDung: "GIÁM SÁT: sẽ áp AppLocker (chỉ cho 3 app)" },
    { luc: "2026-10-21T10:01:00Z", muc: "loi", nguon: "HeartbeatWorker", noiDung: "Lỗi vòng heartbeat" },
    { muc: "tin", noiDung: "" },
  ] } });
  assert.equal(r.status, 200);
  assert.equal(r.body.nhan, 2);
  const doc = await lg.docLog(fam, mayId);
  assert.equal(doc.ds.length, 2);
  assert.equal(doc.ds[0].noiDung, "Lỗi vòng heartbeat");
  assert.equal((await lg.docLog(fam, mayId, { muc: "loi" })).ds.length, 1);
  const khac = await taoNha();
  await assert.rejects(lg.docLog(khac.fam, mayId), (e: { ma?: string }) => e.ma === "khong_thay");
  assert.equal((await lg.docLog(null, mayId)).ds.length, 2, "Admin đọc được");
  assert.equal((await goi("log", { body: { ds: [] } })).status, 401);
});

test("dong-bo trả kèm Policy dịch sẵn cho agent Windows", async () => {
  const { tok } = await mayMoi();
  const r = await goi("dong-bo", { tok, body: { clientTime: new Date().toISOString() } });
  assert.equal(r.status, 200);
  assert.ok(["hoc", "khoa"].includes(r.body.windows.mode));
  assert.ok(Array.isArray(r.body.windows.allowedApps));
  assert.equal(r.body.windows.childName, "Ken");
});

test("lời xin gửi từ màn chặn: hỏi lại trạng thái được, máy khác không thấy", async () => {
  const { tok } = await mayMoi();
  const yc = await goi("yeu-cau", { tok, body: { loai: "them_gio", phut: 15, lyDo: "Con đang xây dở nhà" } });
  assert.equal(yc.status, 200);
  const st = await goi(`yeu-cau/${yc.body.id}`, { tok });
  assert.equal(st.status, 200);
  assert.equal(st.body.status, "cho");
  assert.equal(yc.body.status, "cho", "POST trả status cho RequestResult của khay");
  const khac = await mayMoi();
  assert.equal((await goi(`yeu-cau/${yc.body.id}`, { tok: khac.tok })).status, 404);
});

test("lời xin từ máy được Ba Mẹ đồng ý ⇒ khay nhận «duoc» (từ khay 0.2.0/0.2.1 hiểu); gán Con cho máy dùng chung", async () => {
  const yc = await import("./yeu-cau.ts");
  const { fam, bm, tok } = await mayMoi();
  const r = await goi("yeu-cau", { tok, body: { loai: "them_gio", phut: 30, lyDo: "Làm bài" } });
  await yc.dongY(fam, r.body.id, bm, { truDiem: false, phut: 30 });
  const st = await goi(`yeu-cau/${r.body.id}`, { tok });
  assert.equal(st.body.status, "duoc");
  assert.equal(st.body.trangThai, "dong_y");
  // máy dùng chung (mã không gắn Con) ⇒ ghép trả childName null; Ba Mẹ gán Con ⇒ máy thành của Con
  const n = await taoNha();
  const con = await g.taoCon(n.fam, { ten: "Phi" });
  const ghep = await g.ghepMay(await g.taoMaGhep(n.fam, null, "windows"), "windows", "PC chung");
  assert.equal(ghep.dungChung, true);
  assert.equal(ghep.childName, null);
  await assert.rejects(g.ganConMay(n.fam, ghep.deviceId, "khong-co"), (e: { ma?: string }) => !!e.ma);
  await g.ganConMay(n.fam, ghep.deviceId, con);
  const may = (await g.mayTuToken(ghep.token))!;
  assert.equal(may.child_id, con);
  assert.equal(may.dung_chung, false);
  assert.equal((await goi("hoc-vien/tong-quan", { tok: ghep.token })).status, 200);
});
