// «Khoá máy ngay» có hạn: 15 phút / 1 giờ / tới sáng mai — tự hết khi qua giờ, không cần tiến trình nền; không hạn = khoá tới khi Ba Mẹ mở.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const mc = await import("./may-con.ts");
const { dangKhoa, khoaDen } = await import("./cau-hinh.ts");
const { one } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

test("dangKhoa: cờ + hạn", () => {
  const now = new Date("2026-10-24T10:00:00Z");
  assert.equal(dangKhoa({}, now), false);
  assert.equal(dangKhoa({ khoa_ngay: true }, now), true);
  assert.equal(dangKhoa({ khoa_ngay: true, khoa_den: "2026-10-24T10:30:00Z" }, now), true);
  assert.equal(dangKhoa({ khoa_ngay: true, khoa_den: "2026-10-24T09:59:00Z" }, now), false, "qua hạn ⇒ tự mở");
  assert.equal(khoaDen({ khoa_ngay: true, khoa_den: "2026-10-24T10:30:00Z" }, now), "2026-10-24T10:30:00Z");
  assert.equal(khoaDen({ khoa_ngay: true }, now), null);
});

test("khoaNgay: đặt hạn, khoá lại không hạn thì xoá hạn cũ, mở thì xoá cả hai; hạn ở quá khứ bị từ chối", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const cfg = async () => (await one<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from children where id = $1`, [con]))!.cau_hinh;
  const den = new Date(Date.now() + 3600_000);
  await mc.khoaNgay(fam, con, true, bm, den);
  assert.equal((await cfg()).khoa_den, den.toISOString());
  assert.equal(dangKhoa(await cfg()), true);
  assert.equal(dangKhoa(await cfg(), new Date(den.getTime() + 1000)), false);
  await mc.khoaNgay(fam, con, true, bm);
  assert.equal((await cfg()).khoa_den, undefined);
  assert.equal((await cfg()).khoa_ngay, true);
  await mc.khoaNgay(fam, con, false, bm);
  assert.deepEqual([(await cfg()).khoa_ngay, (await cfg()).khoa_den], [undefined, undefined]);
  await assert.rejects(mc.khoaNgay(fam, con, true, bm, new Date(Date.now() - 1000)), /sau bây giờ/);
});
