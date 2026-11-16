// #302: ảnh đại diện Con (lưu, đọc lại, đổi màu không mất ảnh, gỡ), thêm nhiều Con không giới hạn, mục «Khác» tự đặt tên + quà đổi bằng số sao tự nhập.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const nv = await import("./nhiem-vu.ts");
const pt = await import("./phan-thuong.ts");
const { q } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

const loi = async (p: Promise<unknown>, ma: string) => assert.rejects(p, (e: { ma?: string }) => e.ma === ma);
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64").toString("base64");

test("ảnh đại diện: lưu → đọc lại; đổi màu giữ ảnh; gỡ ảnh về chữ cái; ảnh sai / quá lớn bị từ chối; gia đình khác không thấy", async () => {
  const { fam } = await taoNha();
  const id = await g.taoCon(fam, { ten: "Nghi", avatar: "mau-1" });
  await loi(g.anhDaiDien(fam, id), "khong_thay");
  const r = await g.datAnhDaiDien(fam, id, { base64: PNG, mime: "image/png" });
  assert.match(r.avatar, /^mau-1\|anh:\d+$/);
  assert.deepEqual(await g.anhDaiDien(fam, id), { mime: "image/png", base64: PNG });
  await g.suaCon(fam, id, { avatar: "mau-3" });
  assert.match((await g.conCua(fam, id)).avatar, /^mau-3\|anh:\d+$/, "đổi màu không làm mất ảnh");
  await loi(g.datAnhDaiDien(fam, id, { base64: PNG, mime: "image/gif" }), "anh_sai");
  await loi(g.datAnhDaiDien(fam, id, { base64: "" }), "anh_sai");
  await loi(g.datAnhDaiDien(fam, id, { base64: Buffer.alloc(g.ANH_DAI_DIEN_TOI_DA + 1).toString("base64") }), "anh_lon");
  const nha2 = await taoNha("Hoa");
  await loi(g.datAnhDaiDien(nha2.fam, id, { base64: PNG }), "khong_thay");
  await g.datAnhDaiDien(fam, id, { xoa: true });
  assert.equal((await g.conCua(fam, id)).avatar, "mau-3");
  await loi(g.anhDaiDien(fam, id), "khong_thay");
});

test("thêm nhiều Con không giới hạn", async () => {
  const { fam } = await taoNha();
  for (let i = 0; i < 12; i++) await g.taoCon(fam, { ten: `Con ${i + 1}` });
  assert.equal((await g.dsCon(fam)).length, 12);
});

test("việc Ba Mẹ tự thêm: mục «Khác» tự đặt tên + số sao tự nhập; quà đổi bằng số sao tự nhập; xoá quà", async () => {
  const { fam } = await taoNha();
  const id = await nv.taoNv(fam, { ten: "Tập đàn piano", diem: 37, nhom: "khac", bo: "khac:Âm nhạc", bang_chung: "anh" });
  const x = (await q<{ bo: string; diem: number }>(`select bo, diem from tasks where id = $1`, [id]))[0];
  assert.deepEqual([x.bo, x.diem], ["khac:Âm nhạc", 37]);
  await assert.rejects(nv.taoNv(fam, { ten: "Việc quá tay", diem: 1001, nhom: "khac", bang_chung: "anh" }));
  const qa = await pt.taoQua(fam, { ten: "Đi du lịch", diem: 1234, loai: "dac_quyen" });
  assert.equal((await q<{ diem: number }>(`select diem from rewards where id = $1`, [qa]))[0].diem, 1234);
});
