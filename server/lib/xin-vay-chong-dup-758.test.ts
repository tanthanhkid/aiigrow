// #758: xin vay chống bấm đúp / gửi lại sau mất mạng — một lời xin cho một lần bấm; Ba Mẹ chỉ «cho vay» một lần nên Con chỉ nhận một thông báo.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const yc = await import("./yeu-cau.ts");
const { q } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

async function nha() {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Bin", saoKhoiDau: 0 });
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Máy của Bin");
  return { fam, bm, con, may: may.deviceId };
}
const dem = async (con: string, loai: string) => Number((await q<{ n: string }>(`select count(*) n from events where child_id = $1 and loai = $2`, [con, loai]))[0].n);

test("#758: bấm đúp / gửi lại (kể cả sau > 5 giây) ⇒ cùng một lời xin; cho vay một lần ⇒ một thông báo", async () => {
  const { fam, bm, con, may } = await nha();
  const t0 = new Date();
  const K = "lan-bam-0001-abcdef";
  const a = await yc.guiYeuCau(con, may, { loai: "vay_sao", soSao: 15, mucDich: "choi", khoa: K }, t0);
  const b = await yc.guiYeuCau(con, may, { loai: "vay_sao", soSao: 15, mucDich: "choi", khoa: K }, t0);
  const c = await yc.guiYeuCau(con, may, { loai: "vay_sao", soSao: 15, mucDich: "choi", khoa: K }, new Date(t0.getTime() + 30_000));
  assert.equal(b.id, a.id);
  assert.equal(c.id, a.id, "gửi lại sau mất mạng (30 giây) vẫn là lời xin cũ");
  assert.equal(Number((await q<{ n: string }>(`select count(*) n from requests where child_id = $1 and trang_thai = 'cho'`, [con]))[0].n), 1);
  assert.equal(await dem(con, "gui_yeu_cau"), 1);

  // khác số sao ⇒ lời xin mới (Con đổi ý)
  const d = await yc.guiYeuCau(con, may, { loai: "vay_sao", soSao: 30, mucDich: "choi", khoa: "lan-bam-0002-abcdef" }, new Date(t0.getTime() + 31_000));
  assert.notEqual(d.id, a.id);

  // Ba Mẹ cho vay: một lần; bấm lại «Cho vay» trên lời xin đã xử lý ⇒ 409, không có sự kiện thứ hai
  await yc.dongY(fam, a.id, bm);
  await assert.rejects(() => yc.dongY(fam, a.id, bm), (e: any) => e.status === 409);
  assert.equal(await dem(con, "cho_vay"), 1);

  // gửi lại cùng khoá sau khi Ba Mẹ đã trả lời ⇒ vẫn lời xin đó (không sinh lời xin mới)
  const e = await yc.guiYeuCau(con, may, { loai: "vay_sao", soSao: 15, mucDich: "choi", khoa: K }, new Date(t0.getTime() + 40_000));
  assert.equal(e.id, a.id);
  // bấm lần mới (khoá mới) ⇒ lời xin mới
  const f = await yc.guiYeuCau(con, may, { loai: "vay_sao", soSao: 15, mucDich: "choi", khoa: "lan-bam-0003-abcdef" }, new Date(t0.getTime() + 50_000));
  assert.notEqual(f.id, a.id);
  // cùng khoá nhưng nội dung khác (đổi số sao) ⇒ lời xin mới, không trả lời xin cũ
  const h = await yc.guiYeuCau(con, may, { loai: "vay_sao", soSao: 45, mucDich: "choi", khoa: "lan-bam-0003-abcdef" }, new Date(t0.getTime() + 55_000));
  assert.notEqual(h.id, f.id);
  // qua API kid/xin-vay cũng nhận khoá
  const { xuLyConSao } = await import("./api-sao.ts");
  const goi = async () => (await (await xuLyConSao(con, null, new Request("http://x/api/kid/xin-vay", { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ soSao: 10, khoa: "lan-bam-0004-abcdef" }) }), ["xin-vay"], { soSao: 10, khoa: "lan-bam-0004-abcdef" }))!.json()) as any;
  const x1 = await goi(), x2 = await goi();
  assert.equal(x1.id, x2.id);
});
