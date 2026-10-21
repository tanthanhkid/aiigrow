// M4b — cài MỘT CHẠM (token ghép nhúng trong gói cài) + GỠ TỪ XA (chủ gia đình xác thực lại bằng mật khẩu ⇒ lệnh «go» ⇒ agent báo xong).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const lm = await import("./lenh-may.ts");
const tt = await import("./tuan-thu.ts");
const g = await import("./gia-dinh.ts");
const { taoPhien, bamMatKhau } = await import("./auth.ts");
const { xuLyMay } = await import("./api-may.ts");
const { xuLyM } = await import("./api-m.ts");
const { q } = await import("./db.ts");
const { taoNha, taoBaMe } = await import("./test-fixtures/nha.ts");

type Kq = { status: number; body: any };
async function goi(f: typeof xuLyMay, goc: string, duong: string, o: { tok?: string; body?: unknown } = {}): Promise<Kq> {
  const req = new Request(`http://app.test/api/${goc}/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const r = await f(req, duong.split("/"));
  return { status: r.status, body: await r.json() };
}
const dv = (d: string, o?: { tok?: string; body?: unknown }) => goi(xuLyMay, "device", d, o);
const m = (d: string, o?: { tok?: string; body?: unknown }) => goi(xuLyM, "m", d, o);

async function nha(ten = "Lan") {
  const { fam, bm } = await taoNha(ten);
  await q(`update parents set pass_hash = $2 where id = $1`, [bm, await bamMatKhau("matkhau123")]);
  const con = await g.taoCon(fam, { ten: "Ken" });
  return { fam, bm, con, bmTok: await taoPhien(bm) };
}

test("gói cài: token một lần, có hạn, chỉ lưu băm; agent đổi lấy token máy (tái dùng ghepMay); cách cũ {ma} vẫn chạy", async () => {
  const { fam, con, bmTok } = await nha();
  const gc = (await m("goi-cai", { tok: bmTok, body: { con, nen: "windows" } })).body;
  assert.ok(gc.token && gc.het);
  assert.match(gc.cai.chiTiet.lenhIm, new RegExp(`/token=${gc.token}$`));
  assert.equal((await q(`select 1 from goi_cai where token_hash = $1`, [gc.token])).length, 0, "không lưu token thô");
  assert.equal((await dv("ghep", { body: { token: gc.token, nen: "android", tenMay: "PC" } })).body.error, "sai_nen_tang");
  const ghep = (await dv("ghep", { body: { token: gc.token, nen: "windows", tenMay: "PC của Ken" } })).body;
  assert.ok(ghep.token && ghep.deviceId);
  assert.equal(ghep.dungChung, false);
  assert.equal(ghep.childName, "Ken");
  const p = (await dv("dong-bo", { tok: ghep.token, body: {} })).body;
  assert.equal(p.con.ten, "Ken");
  const lai = await dv("ghep", { body: { token: gc.token, nen: "windows", tenMay: "PC 2" } });
  assert.deepEqual([lai.status, lai.body.error], [409, "ma_da_dung"]);
  assert.equal((await dv("ghep", { body: { token: "doan-bua", nen: "windows" } })).status, 404);
  // hết hạn
  const cu = await lm.taoGoiCai(fam, { con, nen: "mac" }, "https://app.test", undefined, new Date(Date.now() - 49 * 3600_000));
  assert.equal((await dv("ghep", { body: { token: cu.token, nen: "mac" } })).status, 410);
  // đường chính ghep-goi (agent-win)
  const gc2 = (await m("goi-cai", { tok: bmTok, body: { con, nen: "windows" } })).body;
  const g2 = (await dv("ghep-goi", { body: { token: gc2.token, nen: "windows", tenMay: "PC 3" } })).body;
  assert.ok(g2.token && g2.childName === "Ken");
  assert.equal((await dv("ghep-goi", { body: { token: gc2.token, nen: "windows" } })).status, 409);
  // máy dùng chung + cách cũ
  const chung = (await m("goi-cai", { tok: bmTok, body: { nen: "android" } })).body;
  assert.equal((await dv("ghep", { body: { token: chung.token, nen: "android", tenMay: "Máy tính bảng" } })).body.dungChung, true);
  assert.ok(chung.cai.chiTiet.qrCaiDat["android.app.extra.PROVISIONING_ADMIN_EXTRAS_BUNDLE"].aiigrow_token === chung.token);
  const ma = (await m("ma-ghep", { tok: bmTok, body: { con, nen: "windows" } })).body.ma;
  assert.ok((await dv("ghep", { body: { ma, nen: "windows", tenMay: "PC cũ" } })).body.token);
  // Con nhà khác / vai Chỉ xem
  const khac = await nha("Mai");
  assert.equal((await m("goi-cai", { tok: khac.bmTok, body: { con, nen: "windows" } })).status, 404);
  const xem = await taoPhien(await taoBaMe(fam, "Bà", "xem"));
  assert.equal((await m("goi-cai", { tok: xem, body: { con, nen: "windows" } })).status, 403);
  assert.equal((await m("goi-cai", { tok: bmTok, body: { con, nen: "tv" } })).body.error, "nen_tang_sai");
});

test("gỡ từ xa: sai mật khẩu / vai không phải chủ / khác gia đình ⇒ từ chối; đúng ⇒ lệnh qua dong-bo + nhịp ⇒ báo xong ⇒ đã gỡ; báo xong lần hai không ghi đôi", async () => {
  const { fam, con, bmTok } = await nha();
  const ghep = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop của Ken");
  await dv("nhip", { tok: ghep.token, body: { phienBan: "1.4.0", appQuanLyBat: true } });
  const sai = await m(`may/${ghep.deviceId}/go-tu-xa`, { tok: bmTok, body: { matKhau: "doan-bua" } });
  assert.deepEqual([sai.status, sai.body.error], [401, "sai_mat_khau"]);
  const duyet = await taoBaMe(fam, "Ba", "duyet");
  await q(`update parents set pass_hash = $2 where id = $1`, [duyet, await bamMatKhau("matkhau123")]);
  const r403 = await m(`may/${ghep.deviceId}/go-tu-xa`, { tok: await taoPhien(duyet), body: { matKhau: "matkhau123" } });
  assert.deepEqual([r403.status, r403.body.error], [403, "chi_chu"]);
  const khac = await nha("Mai");
  assert.equal((await m(`may/${ghep.deviceId}/go-tu-xa`, { tok: khac.bmTok, body: { matKhau: "matkhau123" } })).status, 404);
  assert.equal((await q(`select 1 from lenh_may where device_id = $1`, [ghep.deviceId])).length, 0);

  const l = (await m(`may/${ghep.deviceId}/go-tu-xa`, { tok: bmTok, body: { matKhau: "matkhau123" } })).body;
  assert.equal(l.lapLai, false);
  assert.match(l.cach, /msiexec/);
  assert.equal((await m(`may/${ghep.deviceId}/go-tu-xa`, { tok: bmTok, body: { matKhau: "matkhau123" } })).body.id, l.id, "bấm lại: cùng lệnh");
  assert.deepEqual((await dv("dong-bo", { tok: ghep.token, body: {} })).body.lenh, [{ id: l.id, loai: "go" }]);
  assert.deepEqual((await dv("nhip", { tok: ghep.token, body: { appQuanLyBat: true } })).body.lenh, [{ id: l.id, loai: "go" }]);
  assert.equal((await m("tuan-thu", { tok: bmTok })).body.ds[0].lenhCho[0].loai, "go");
  // token máy khác không báo xong được
  const may2 = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "PC khác");
  assert.equal((await dv(`lenh/${l.id}/xong`, { tok: may2.token, body: {} })).status, 404);

  const x1 = (await dv(`lenh/${l.id}/xong`, { tok: ghep.token, body: {} })).body;
  assert.deepEqual(x1, { ok: true, lapLai: false });
  assert.equal((await dv("dong-bo", { tok: ghep.token, body: {} })).status, 401, "máy đã gỡ: token hết hiệu lực");
  const x2 = (await dv(`lenh/${l.id}/xong`, { tok: ghep.token, body: {} })).body;
  assert.deepEqual(x2, { ok: true, lapLai: true });
  assert.equal((await q(`select 1 from events where family_id = $1 and loai = 'go_may'`, [fam])).length, 1, "không ghi đôi");
  assert.equal((await q(`select 1 from tuan_thu_may where device_id = $1`, [ghep.deviceId])).length, 0);
  // đã gỡ ⇒ không còn cảnh báo mất nhịp
  assert.equal((await tt.quetMatNhip(fam, new Date(Date.now() + 24 * 3600_000))).includes(ghep.deviceId), false);
  assert.equal((await q(`select 1 from alerts where family_id = $1 and loai = 'may_ngoai_vong' and device_id = $2`, [fam, ghep.deviceId])).length, 0);
  assert.equal((await q(`select 1 from events where family_id = $1 and loai = 'lenh_go_sai_mat_khau'`, [fam])).length, 1);
});
