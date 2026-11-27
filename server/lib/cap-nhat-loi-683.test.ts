// #683: agent-win báo «cap_nhat_loi» khi tự cập nhật hỏng ⇒ Ba Mẹ có cảnh báo chú ý; cùng mã (mỗi bản một lần) gửi lại không báo đôi.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const { xuLyMay } = await import("./api-may.ts");
const { q } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

async function dv(duong: string, o: { tok?: string; body?: unknown } = {}) {
  const req = new Request(`http://app.test/api/device/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const r = await xuLyMay(req, duong.split("/"));
  return { status: r.status, body: await r.json() as any };
}

test("cap_nhat_loi: cảnh báo chú ý cho Ba Mẹ kèm bản, mỗi mã một lần", async () => {
  const { fam } = await taoNha("CN");
  const con = await g.taoCon(fam, { ten: "Ty" });
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "PC Ty", "9.9.9.9");
  const e = { ma: "cap_nhat_loi:0.2.34", loai: "cap_nhat_loi", luc: "2026-11-26T08:00:00Z", chiTiet: { ban: "0.2.34", dangChay: "0.2.33", lan: "1", lyDo: "bo_cai_loi" } };
  assert.equal((await dv("su-kien", { tok: may.token, body: { ds: [e] } })).body.nhan, 1);
  assert.equal((await dv("su-kien", { tok: may.token, body: { ds: [{ ...e, chiTiet: { ...e.chiTiet, lan: "2" } }] } })).body.nhan, 0);
  const cb = await q<{ loai: string; muc: string; noi_dung: string }>(`select * from alerts where family_id = $1`, [fam]);
  assert.equal(cb.length, 1);
  assert.equal(cb[0].loai, "may_cap_nhat_loi");
  assert.equal(cb[0].muc, "chu_y");
  const sk = await q<{ chi_tiet: any }>(`select chi_tiet from events where family_id = $1 and loai = 'may_cap_nhat_loi'`, [fam]);
  assert.equal(sk[0].chi_tiet.ban, "0.2.34");
});

// #727 C: máy Android cũng báo cùng loại sự kiện (chiTiet có nenTang) ⇒ cùng cảnh báo chú ý với Windows.
test("cap_nhat_loi từ máy Android: cảnh báo chú ý, mã trùng không báo đôi", async () => {
  const { fam } = await taoNha("CA");
  const con = await g.taoCon(fam, { ten: "Bi" });
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "android"), "android", "Pixel Bi", "9.9.9.8");
  const e = { ma: "cap_nhat_loi:0.2.6", loai: "cap_nhat_loi", luc: "2026-11-27T08:00:00Z", chiTiet: { ban: "0.2.6", dangChay: "0.2.5", lan: "2", lyDo: "tải APK lỗi", nenTang: "android" } };
  assert.equal((await dv("su-kien", { tok: may.token, body: { ds: [e] } })).body.nhan, 1);
  assert.equal((await dv("su-kien", { tok: may.token, body: { ds: [e] } })).body.nhan, 0);
  const cb = await q<{ loai: string; muc: string; noi_dung: string }>(`select * from alerts where family_id = $1`, [fam]);
  assert.equal(cb.length, 1);
  assert.equal(cb[0].loai, "may_cap_nhat_loi");
  assert.equal(cb[0].muc, "chu_y");
  assert.match(cb[0].noi_dung, /Pixel Bi/);
  const sk = await q<{ chi_tiet: any }>(`select chi_tiet from events where family_id = $1 and loai = 'may_cap_nhat_loi'`, [fam]);
  assert.equal(sk[0].chi_tiet.nenTang, "android");
});
