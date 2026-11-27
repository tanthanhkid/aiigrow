// #813: nhật ký web gộp theo tên miền gốc — luật cho tên miền con (vi.wikipedia.org) xếp đúng nhóm wikipedia.org; «khong-ro» đọc là «Chưa rõ app nào».
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const { datLuat } = await import("./luat-app.ts");
const { q } = await import("./db.ts");
const { gioDiaPhuong } = await import("./gio.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const { homNayDung } = await import("./hom-nay-dung.ts");
const { tenApp, tenAppDep } = await import("./ten-app.ts");

test("luật vi.wikipedia.org ⇒ dòng nhật ký wikipedia.org không còn «Chưa xếp»", async () => {
  const { fam } = await taoNha("Mẹ Lan");
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  const may = (await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop")).deviceId;
  const n = gioDiaPhuong(new Date(), "Asia/Ho_Chi_Minh").ngay;
  await q(`insert into web_nhat_ky(device_id, child_id, ngay, ten_mien, so_lan, giay, dau_luc) values ($1,$2,$3,'wikipedia.org',2,600, now())`, [may, con, n]);
  const truoc = (await homNayDung(fam, con)).dung.find((x) => x.muc === "wikipedia.org")!;
  assert.equal(truoc.chuaXep, true);
  await datLuat(fam, { con, muc: "vi.wikipedia.org", ten: "vi.wikipedia.org", loai: "hoc" });
  const sau = (await homNayDung(fam, con)).dung.find((x) => x.muc === "wikipedia.org")!;
  assert.equal(sau.chuaXep, false);
  assert.equal(sau.tinhGio, false);
});

test("«khong-ro» ⇒ «Chưa rõ app nào»", () => {
  assert.equal(tenApp("khong-ro"), "Chưa rõ app nào");
  assert.equal(tenAppDep("khong-ro"), "Chưa rõ app nào");
});

test("luật khớp thẳng wikipedia.org thắng luật tên miền con; tên miền con chỉ ảnh hưởng khi chưa có luật gốc", async () => {
  const { fam } = await taoNha("Mẹ Hoa");
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  const may = (await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop")).deviceId;
  const n = gioDiaPhuong(new Date(), "Asia/Ho_Chi_Minh").ngay;
  await q(`insert into web_nhat_ky(device_id, child_id, ngay, ten_mien, so_lan, giay, dau_luc) values ($1,$2,$3,'wikipedia.org',2,600, now())`, [may, con, n]);
  await datLuat(fam, { con, muc: "wikipedia.org", ten: "Wikipedia", loai: "hoc" });
  await datLuat(fam, { con, muc: "commons.wikipedia.org", ten: "commons", loai: "giai_tri" });
  const x = (await homNayDung(fam, con)).dung.find((d) => d.muc === "wikipedia.org")!;
  assert.equal(x.tinhGio, false, "luật gốc (hoc) thắng luật tên miền con (giai_tri)");
});
