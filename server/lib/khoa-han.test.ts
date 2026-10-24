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

test("«Tới sáng mai» = 7:00 kế tiếp theo múi giờ gia đình; hạn sai định dạng bị từ chối", async () => {
  assert.equal(mc.sangMaiCua("Asia/Ho_Chi_Minh", new Date("2026-10-24T14:00:00Z")).toISOString(), "2026-10-25T00:00:00.000Z");   // 21:00 VN ⇒ 7:00 hôm sau
  assert.equal(mc.sangMaiCua("Asia/Ho_Chi_Minh", new Date("2026-10-24T20:00:00Z")).toISOString(), "2026-10-25T00:00:00.000Z");   // 3:00 VN ⇒ 7:00 cùng ngày
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  await mc.khoaNgay(fam, con, true, bm, "sang");
  const cfg = (await one<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from children where id = $1`, [con]))!.cau_hinh;
  assert.ok(Date.parse(String(cfg.khoa_den)) > Date.now());
  await assert.rejects(mc.khoaNgay(fam, con, true, bm, new Date("abc")), /không hợp lệ/);
  await mc.khoaNgay(fam, con, false, bm, new Date("abc"));   // mở lại bỏ qua hạn, không lỗi
});

test("«tới sáng mai» đúng 7:00 cả ngày đổi giờ mùa hè (Europe/Berlin 25/10/2026: 3:00 → 2:00)", async () => {
  const { sangMaiCua } = await import("./may-con.ts");
  const { gioDiaPhuong } = await import("./gio.ts");
  const d = sangMaiCua("Europe/Berlin", new Date("2026-10-24T20:00:00Z"));
  assert.equal(gioDiaPhuong(d, "Europe/Berlin").phut, 7 * 60);
  assert.equal(d.toISOString(), "2026-10-25T06:00:00.000Z");
});

test("nhịp đồng bộ không quá lúc mở tạm hết (máy khoá lại đúng giờ)", async () => {
  const { nhipToiKhoaLai } = await import("./cau-hinh.ts");
  const now = new Date("2026-10-24T10:00:00Z");
  assert.equal(nhipToiKhoaLai(120, [null, null], now), 120);
  assert.equal(nhipToiKhoaLai(120, ["2026-10-24T10:00:30Z", "2026-10-24T11:00:00Z"], now), 32);
  assert.equal(nhipToiKhoaLai(120, [null, "2026-10-24T10:01:00Z"], now), 62, "hết hạn khoá ⇒ mở đúng giờ");
  assert.equal(nhipToiKhoaLai(120, ["2026-10-24T10:00:01Z"], now), 10);
  assert.equal(nhipToiKhoaLai(120, ["2026-10-24T09:59:00Z"], now), 120, "mốc đã qua ⇒ bỏ, giữ nhịp thường");
});
