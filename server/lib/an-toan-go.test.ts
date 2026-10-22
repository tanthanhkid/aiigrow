// An toàn & gỡ cài đặt (Thanh 22/10: «khi cần gỡ thì gỡ được, không muốn nó bị dính trong đó»):
//  • chế độ Giám sát / Chặn thật do Ba Mẹ chọn từ xa (POST may/:id/che-do) ⇒ dong-bo.windows.cheDo
//  • «Gỡ máy này» an toàn (POST may/:id/go): máy đã đồng bộ ⇒ lệnh gỡ, chỉ xoá khi agent báo xong; xoá hẳn có điều kiện.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
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
const ghep = async (fam: string, con: string, ten = "PC của Ken") => g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", ten);

test("chế độ: Ba Mẹ chưa chọn ⇒ không ép, hiện chế độ máy báo; chủ / Ba Mẹ duyệt đổi được, vai Chỉ xem và nhà khác bị chặn; policy Windows mang cheDo; ghi nhật ký + báo", async () => {
  const { fam, con, bmTok } = await nha();
  const may = await ghep(fam, con);
  // chưa ai chọn + agent chưa báo ⇒ «chưa biết», máy chủ không gửi cheDo (agent giữ chế độ đang chạy)
  assert.equal((await dv("dong-bo", { tok: may.token, body: {} })).body.windows.cheDo, undefined);
  const tt0 = (await m(`may/${may.deviceId}/tuan-thu`, { tok: bmTok })).body;
  assert.deepEqual([tt0.cheDo, tt0.cheDoMay, tt0.cheDoBaMeChon], [null, null, null]);

  const xem = await taoPhien(await taoBaMe(fam, "Bà", "xem"));
  const r403 = await m(`may/${may.deviceId}/che-do`, { tok: xem, body: { cheDo: "chan" } });
  assert.deepEqual([r403.status, r403.body.error], [403, "chi_xem"]);
  const khac = await nha("Mai");
  assert.equal((await m(`may/${may.deviceId}/che-do`, { tok: khac.bmTok, body: { cheDo: "chan" } })).status, 404);
  assert.equal((await m(`may/${may.deviceId}/che-do`, { tok: bmTok, body: { cheDo: "tat" } })).body.error, "che_do_sai");

  const duyet = await taoPhien(await taoBaMe(fam, "Ba", "duyet"));
  assert.deepEqual((await m(`may/${may.deviceId}/che-do`, { tok: duyet, body: { cheDo: "chan" } })).body, { cheDo: "chan", doi: true });
  assert.equal((await dv("dong-bo", { tok: may.token, body: {} })).body.windows.cheDo, "chan");
  assert.equal((await m("tuan-thu", { tok: bmTok })).body.ds[0].cheDo, "chan");
  assert.deepEqual((await m(`may/${may.deviceId}/che-do`, { tok: bmTok, body: { cheDo: "chan" } })).body, { cheDo: "chan", doi: false });
  assert.equal((await m(`may/${may.deviceId}/che-do`, { tok: bmTok, body: { cheDo: "giam-sat" } })).body.doi, true);
  assert.equal((await dv("dong-bo", { tok: may.token, body: {} })).body.windows.cheDo, "giam-sat");

  const ev = await q<{ chi_tiet: any; nguoi: string }>(`select chi_tiet, nguoi from events where family_id = $1 and loai = 'doi_che_do' order by seq`, [fam]);
  assert.equal(ev.length, 2, "đổi trùng không ghi");
  assert.deepEqual(ev[0].chi_tiet, { tu: null, sang: "chan" });
  assert.ok(ev[0].nguoi);
  assert.equal((await q(`select 1 from alerts where family_id = $1 and loai = 'doi_che_do'`, [fam])).length, 2);
  assert.ok((await m(`may/${may.deviceId}/tuan-thu`, { tok: bmTok })).body.suKien.some((s: any) => s.loai === "doi_che_do"));
  // nhà khác không thấy gì
  assert.equal((await q(`select 1 from alerts where family_id = $1 and loai = 'doi_che_do'`, [khac.fam])).length, 0);
});

test("gỡ máy này: chỉ chủ + mật khẩu; máy đã đồng bộ ⇒ lệnh gỡ, KHÔNG xoá tới khi agent báo xong; đang gỡ ⇒ policy ép giám sát", async () => {
  const { fam, con, bmTok } = await nha();
  const may = await ghep(fam, con);
  await dv("dong-bo", { tok: may.token, body: {} });
  await m(`may/${may.deviceId}/che-do`, { tok: bmTok, body: { cheDo: "chan" } });

  assert.equal((await m(`may/${may.deviceId}/go`, { tok: bmTok, body: { matKhau: "sai" } })).body.error, "sai_mat_khau");
  const duyet = await taoBaMe(fam, "Ba", "duyet");
  await q(`update parents set pass_hash = $2 where id = $1`, [duyet, await bamMatKhau("matkhau123")]);
  assert.equal((await m(`may/${may.deviceId}/go`, { tok: await taoPhien(duyet), body: { matKhau: "matkhau123" } })).body.error, "chi_chu");
  const khac = await nha("Mai");
  assert.equal((await m(`may/${may.deviceId}/go`, { tok: khac.bmTok, body: { matKhau: "matkhau123" } })).status, 404);

  const r = (await m(`may/${may.deviceId}/go`, { tok: bmTok, body: { matKhau: "matkhau123" } })).body;
  assert.equal(r.trangThai, "dang_go");
  assert.equal(r.lapLai, false);
  assert.equal((await q(`select 1 from devices where id = $1`, [may.deviceId])).length, 1, "chưa xoá khi agent chưa báo xong");
  const tt = (await m(`may/${may.deviceId}/tuan-thu`, { tok: bmTok })).body;
  assert.equal(tt.dangGo.lenhId, r.id);
  assert.equal(tt.daDongBo, true);
  assert.equal(tt.coTheXoaHan, false);
  // bấm lại (kể cả qua go-tu-xa) ⇒ cùng một lệnh
  assert.equal((await m(`may/${may.deviceId}/go-tu-xa`, { tok: bmTok, body: { matKhau: "matkhau123" } })).body.id, r.id);
  // máy còn liên lạc ⇒ không xoá hẳn được
  assert.equal((await m(`may/${may.deviceId}/go`, { tok: bmTok, body: { matKhau: "matkhau123", xoaHan: true } })).body.error, "chua_duoc_xoa_han");

  const p = (await dv("dong-bo", { tok: may.token, body: {} })).body;
  assert.deepEqual(p.lenh, [{ id: r.id, loai: "go" }]);
  assert.equal(p.windows.cheDo, "giam-sat", "đang gỡ ⇒ ép giám sát dù Ba Mẹ đã chọn chặn");

  assert.deepEqual((await dv(`lenh/${r.id}/xong`, { tok: may.token, body: {} })).body, { ok: true, lapLai: false });
  assert.equal((await q(`select 1 from devices where id = $1`, [may.deviceId])).length, 0, "agent báo xong ⇒ xoá máy");
  assert.equal((await dv("dong-bo", { tok: may.token, body: {} })).status, 401);
});

test("xoá hẳn: máy chưa đồng bộ lần nào ⇒ cần xoaHan; đang gỡ > 7 ngày không liên lạc ⇒ được xoá hẳn, lệnh chờ huỷ", async () => {
  const { fam, con, bmTok } = await nha();
  // (a) ghép xong nhưng agent chưa từng dong-bo / nhịp
  const moi = await ghep(fam, con, "PC mới");
  const c = await m(`may/${moi.deviceId}/go`, { tok: bmTok, body: { matKhau: "matkhau123" } });
  assert.deepEqual([c.status, c.body.error], [409, "can_xoa_han"]);
  const tt0 = (await m(`may/${moi.deviceId}/tuan-thu`, { tok: bmTok })).body;
  assert.deepEqual([tt0.daDongBo, tt0.coTheXoaHan, tt0.dangGo], [false, true, null]);
  assert.equal((await m(`may/${moi.deviceId}/go`, { tok: bmTok, body: { matKhau: "sai", xoaHan: true } })).body.error, "sai_mat_khau");
  const x = (await m(`may/${moi.deviceId}/go`, { tok: bmTok, body: { matKhau: "matkhau123", xoaHan: true } })).body;
  assert.deepEqual(x, { trangThai: "da_xoa", canGoTaiMay: false });
  assert.equal((await q(`select 1 from devices where id = $1`, [moi.deviceId])).length, 0);

  // (b) đã đồng bộ, có lệnh gỡ, rồi im lặng > 7 ngày
  const cu = await ghep(fam, con, "PC cũ");
  await dv("nhip", { tok: cu.token, body: { phienBan: "1.4.0", appQuanLyBat: true } });
  const l = (await m(`may/${cu.deviceId}/go`, { tok: bmTok, body: { matKhau: "matkhau123" } })).body;
  assert.equal(l.trangThai, "dang_go");
  await q(`update lenh_may set created_at = now() - interval '8 days' where id = $1`, [l.id]);
  await q(`update devices set last_seen = now() - interval '8 days' where id = $1`, [cu.deviceId]);
  assert.equal((await m(`may/${cu.deviceId}/go`, { tok: bmTok, body: { matKhau: "matkhau123", xoaHan: true } })).body.error, "chua_duoc_xoa_han",
    "nhịp gần đây vẫn tính là còn liên lạc");
  await q(`update tuan_thu_may set nhip_cuoi = now() - interval '8 days' where device_id = $1`, [cu.deviceId]);
  assert.equal((await m(`may/${cu.deviceId}/tuan-thu`, { tok: bmTok })).body.coTheXoaHan, true);
  const x2 = (await m(`may/${cu.deviceId}/go`, { tok: bmTok, body: { matKhau: "matkhau123", xoaHan: true } })).body;
  assert.deepEqual(x2, { trangThai: "da_xoa", canGoTaiMay: true });
  assert.equal((await q<{ trang_thai: string }>(`select trang_thai from lenh_may where id = $1`, [l.id]))[0].trang_thai, "huy");
  // agent cũ nếu còn sống: token hết hiệu lực; báo xong lệnh đã huỷ không làm gì thêm
  assert.equal((await dv("dong-bo", { tok: cu.token, body: {} })).status, 401);
  assert.equal((await q(`select 1 from events where family_id = $1 and loai = 'go_may' and chi_tiet->>'cach' = 'xoa_han'`, [fam])).length, 2);
});

test("chế độ thật do agent báo: máy cài sẵn «chặn» hiện đúng «chặn», không bị tụt về giám sát; Ba Mẹ chọn rồi thì lựa chọn thắng", async () => {
  const { fam, con, bmTok } = await nha();
  const may = await ghep(fam, con);
  const p = (await dv("dong-bo", { tok: may.token, body: { status: { agent: "windows", cheDo: "chan" } } })).body;
  assert.equal(p.windows.cheDo, undefined, "chưa chọn ⇒ không ép giam-sat lên máy đang chặn");
  let tt = (await m(`may/${may.deviceId}/tuan-thu`, { tok: bmTok })).body;
  assert.deepEqual([tt.cheDo, tt.cheDoMay, tt.cheDoBaMeChon], ["chan", "chan", null]);
  // Ba Mẹ bấm đúng chế độ đang chạy ⇒ giữ lựa chọn, không ghi «đổi»
  assert.deepEqual((await m(`may/${may.deviceId}/che-do`, { tok: bmTok, body: { cheDo: "chan" } })).body, { cheDo: "chan", doi: false });
  assert.equal((await dv("dong-bo", { tok: may.token, body: { status: { cheDo: "chan" } } })).body.windows.cheDo, "chan");
  assert.equal((await q(`select 1 from events where family_id = $1 and loai = 'doi_che_do'`, [fam])).length, 0);
  // đổi sang giám sát ⇒ máy nhận giam-sat; tới khi agent báo lại, app thấy cả lựa chọn lẫn chế độ thật
  assert.equal((await m(`may/${may.deviceId}/che-do`, { tok: bmTok, body: { cheDo: "giam-sat" } })).body.doi, true);
  tt = (await m(`may/${may.deviceId}/tuan-thu`, { tok: bmTok })).body;
  assert.deepEqual([tt.cheDo, tt.cheDoMay, tt.cheDoBaMeChon], ["giam-sat", "chan", "giam-sat"]);
  assert.equal((await dv("dong-bo", { tok: may.token, body: { status: { cheDo: "giam-sat" } } })).body.windows.cheDo, "giam-sat");
  tt = (await m(`may/${may.deviceId}/tuan-thu`, { tok: bmTok })).body;
  assert.equal(tt.cheDoMay, "giam-sat");
  // giá trị lạ từ agent bị bỏ qua
  await dv("dong-bo", { tok: may.token, body: { status: { cheDo: "tat-het" } } });
  assert.equal((await m(`may/${may.deviceId}/tuan-thu`, { tok: bmTok })).body.cheDoMay, null);
});

test("gỡ tại máy: POST device/da-go (Bearer) ⇒ máy rời gia đình như gỡ từ xa; lệnh gỡ đang chờ thành xong; gọi lại ⇒ 401", async () => {
  const { fam, con, bmTok } = await nha();
  const may = await ghep(fam, con);
  await dv("dong-bo", { tok: may.token, body: {} });
  const l = (await m(`may/${may.deviceId}/go`, { tok: bmTok, body: { matKhau: "matkhau123" } })).body;
  assert.equal(l.trangThai, "dang_go");
  assert.equal((await dv("da-go", { tok: "token-la", body: {} })).status, 401);
  assert.deepEqual((await dv("da-go", { tok: may.token, body: {} })).body, { ok: true });
  assert.equal((await q(`select 1 from devices where id = $1`, [may.deviceId])).length, 0);
  assert.equal((await q<{ trang_thai: string }>(`select trang_thai from lenh_may where id = $1`, [l.id]))[0].trang_thai, "xong");
  assert.equal((await m(`may/${may.deviceId}/tuan-thu`, { tok: bmTok })).status, 404, "app thấy «không còn trong gia đình»");
  assert.equal((await dv("da-go", { tok: may.token, body: {} })).status, 401);
  // agent (nếu còn chạy) báo xong lệnh cũ ⇒ ok, không ghi đôi
  assert.deepEqual((await dv(`lenh/${l.id}/xong`, { tok: may.token, body: {} })).body, { ok: true, lapLai: true });
  const ev = await q<{ chi_tiet: any }>(`select chi_tiet from events where family_id = $1 and loai = 'go_may'`, [fam]);
  assert.deepEqual(ev.map((e) => e.chi_tiet.cach), ["tai_may"]);
  assert.equal((await q(`select 1 from alerts where family_id = $1 and loai = 'go_may'`, [fam])).length, 1);
  // máy chưa có lệnh gỡ cũng gỡ tại máy được
  const may2 = await ghep(fam, con, "PC 2");
  assert.deepEqual((await dv("da-go", { tok: may2.token, body: {} })).body, { ok: true });
  assert.equal((await q(`select 1 from devices where id = $1`, [may2.deviceId])).length, 0);
});
