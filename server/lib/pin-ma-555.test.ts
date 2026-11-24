// #555: PIN 4 số của bé mã hoá AES-256-GCM bằng khoá máy chủ (không lưu rõ), chuyển dữ liệu cũ tại chỗ, «Hiện» vẫn đọc được,
// đăng nhập bé + vân PIN agent vẫn đúng; trần lượt sai theo BÉ trên mọi máy (20/giờ).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
delete process.env.AIIGROW_PIN_KHOA;
delete process.env.CRON_SECRET;
const pm = await import("./pin-ma.ts");
const pin = await import("./pin-be.ts");
const g = await import("./gia-dinh.ts");
const { xuLyM } = await import("./api-m.ts");
const { xuLyMay } = await import("./api-may.ts");
const { q, one } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const { taoPhien } = await import("./auth.ts");

const goi = (xuLy: (r: Request, p: string[]) => Promise<Response>, goc: string) =>
  async (tok: string, duong: string, body?: unknown) => {
    const r = await xuLy(new Request(`http://x/api/${goc}/${duong}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    }), duong.split("?")[0].split("/"));
    return { status: r.status, body: (await r.json()) as any };
  };
const m = goi(xuLyM, "m"), dv = goi(xuLyMay, "device");

async function nha() {
  const { fam, bm } = await taoNha();
  const tokBm = await taoPhien(bm);
  const anh = (await m(tokBm, "con", { ten: "Bảo Anh", pin: "4821", saoKhoiDau: 0 })).body.id as string;
  const minh = (await m(tokBm, "con", { ten: "Bảo Minh", saoKhoiDau: 0 })).body.id as string;
  const may = async (ten: string) => {
    const r = await g.ghepMay(await g.taoMaGhep(fam, null, "windows"), "windows", ten);
    return { id: r.deviceId as string, tok: r.token as string };
  };
  return { fam, tokBm, anh, minh, may };
}
const pinMa = async (con: string) => (await one<{ pin_ma: string | null }>(`select pin_ma from children where id = $1`, [con]))!.pin_ma;

test("mã hoá: bản mã khác nhau mỗi lần, giải đúng; sai Con (AAD) / sửa bản mã / khoá lạ ⇒ null", () => {
  const a = pm.maHoaPin("con1", "0042"), b = pm.maHoaPin("con1", "0042");
  assert.notEqual(a, b);
  assert.match(a, /^p1\.[0-9a-f]{8}\.[\w-]+\.[\w-]+$/);
  assert.equal(pm.giaiPin("con1", a), "0042");
  assert.equal(pm.giaiPin("con2", a), null, "chép bản mã sang Con khác không giải được");
  const hong = a.slice(0, -2) + (a.endsWith("A") ? "BB" : "AA");
  assert.equal(pm.giaiPin("con1", hong), null);
  assert.equal(pm.giaiPin("con1", a, pm.vongKhoa({ NODE_ENV: "production", AIIGROW_PIN_KHOA: "k".repeat(40) })), null);
  assert.equal(pm.giaiPin("con1", "1234"), "1234", "giá trị rõ cũ (chưa chuyển) vẫn đọc được");
  assert.equal(pm.giaiPin("con1", null), null);
  const [p1, id, iv] = a.split(".");
  assert.equal(pm.giaiPin("con1", [p1, id, iv, Buffer.alloc(8).toString("base64url")].join(".")), null, "tag cắt ngắn bị từ chối");
});

test("vòng khoá: AIIGROW_PIN_KHOA là khoá chính, AIIGROW_PIN_KHOA_CU giải bản cũ; prod không có khoá dev; prod chưa đặt khoá ⇒ lưu rõ như trước", async () => {
  const cu = pm.vongKhoa({ NODE_ENV: "production", AIIGROW_PIN_KHOA: "c".repeat(40) });
  const ca2 = pm.vongKhoa({ NODE_ENV: "production", AIIGROW_PIN_KHOA: "k".repeat(40), AIIGROW_PIN_KHOA_CU: ` ${"c".repeat(40)} ,` });
  assert.equal(cu.length, 1);
  assert.equal(ca2.length, 2);
  assert.equal(ca2[1].id, cu[0].id);
  const ban = pm.maHoaPin("x", "9876", cu);
  assert.equal(pm.giaiPin("x", ban, ca2), "9876");
  assert.ok(pm.maHoaPin("x", "9876", ca2).startsWith(`p1.${ca2[0].id}.`));
  const dev = pm.vongKhoa({ NODE_ENV: "test" });
  assert.ok(!cu.some((k) => dev.some((d) => d.id === k.id)), "prod không giải được bằng khoá dev");
  // production thiếu AIIGROW_PIN_KHOA (CRON_SECRET không được dùng làm khoá) ⇒ vòng rỗng: lưu rõ, chuyển dữ liệu không chạy
  // khoá ngắn bị bỏ; chỉ có khoá cũ (_CU) ⇒ giải được nhưng không mã hoá bằng khoá cũ; nối Postgres thật (DATABASE_URL) ⇒ không dùng khoá dev
  const loi0 = console.error; console.error = () => {};
  try {
    assert.equal(pm.vongKhoa({ NODE_ENV: "production", AIIGROW_PIN_KHOA: "changeme" }).length, 0);
    const chiCu = pm.vongKhoa({ NODE_ENV: "production", AIIGROW_PIN_KHOA_CU: "c".repeat(40) });
    assert.equal(pm.giaiPin("x", ban, chiCu), "9876");
    assert.equal(pm.maHoaPin("x", "1111", chiCu), "1111");
    assert.equal(pm.vongKhoa({ NODE_ENV: "development", DATABASE_URL: "postgres://prod" }).length, 0);
  } finally { console.error = loi0; }
  const rong = pm.vongKhoa({ NODE_ENV: "production", CRON_SECRET: "x".repeat(40) });
  assert.equal(rong.length, 0);
  assert.equal(pm.maHoaPin("x", "1234", rong), "1234");
  assert.equal(pm.giaiPin("x", "1234", rong), "1234");
  const loiCu = console.error; console.error = () => {};
  try { assert.equal(await pm.chuyenPinCu(async () => { throw new Error("không được truy vấn"); }, rong), null); } finally { console.error = loiCu; }
});

test("Ba Mẹ đặt PIN ⇒ DB chỉ có bản mã; «Hiện» trả PIN; agent: vân PIN đúng; bé nhập đúng vào được, sai bị từ chối", async () => {
  const { tokBm, anh, minh, may } = await nha();
  const chung = await may("PC chung");
  const raw = (await pinMa(anh))!;
  assert.ok(pm.daMaHoa(raw) && !raw.includes("4821"));
  assert.equal((await m(tokBm, `con/${anh}/pin`)).body.pin, "4821");
  await m(tokBm, `con/${minh}/pin`, { pin: "0707" });
  assert.ok(pm.daMaHoa(await pinMa(minh)));
  assert.equal((await m(tokBm, `con/${minh}/pin`)).body.pin, "0707");
  const hs = (await dv(chung.tok, "ho-so")).body;
  const bm = (await one<{ offline_secret: string }>(`select offline_secret from devices where id = $1`, [chung.id]))!.offline_secret;
  assert.equal(hs.con.find((c: any) => c.id === anh).vanPin, createHmac("sha256", bm).update(`${anh}:4821`).digest("hex"));
  assert.equal((await dv(chung.tok, "dang-nhap-be", { con: anh, pin: "1111" })).body.error, "pin_sai");
  assert.ok((await dv(chung.tok, "dang-nhap-be", { con: anh, pin: "4821" })).body.phienCon);
});

test("chuyển dữ liệu: PIN rõ cũ ⇒ mã hoá tại chỗ (chạy lại không đổi gì); sau chuyển Hiện / đăng nhập / vân PIN vẫn đúng", async () => {
  const { tokBm, anh, minh, may } = await nha();
  const chung = await may("PC chung");
  await q(`update children set pin_ma = '4821' where id = $1`, [anh]);          // dữ liệu trước #555
  // trước khi chuyển: vẫn chạy (đọc được giá trị rõ)
  assert.equal((await m(tokBm, `con/${anh}/pin`)).body.pin, "4821");
  const n = await pm.chuyenPinCu(q);
  assert.ok(n! >= 1);
  const raw = (await pinMa(anh))!;
  assert.ok(pm.daMaHoa(raw));
  assert.equal(await pinMa(minh), null, "Con chưa có PIN giữ null");
  assert.equal(await pm.chuyenPinCu(q), 0, "chạy lại: không còn gì để chuyển");
  assert.equal(await pinMa(anh), raw);
  assert.equal((await m(tokBm, `con/${anh}/pin`)).body.pin, "4821");
  assert.ok((await dv(chung.tok, "dang-nhap-be", { con: anh, pin: "4821" })).body.phienCon);
  const hs = (await dv(chung.tok, "ho-so")).body;
  const bm = (await one<{ offline_secret: string }>(`select offline_secret from devices where id = $1`, [chung.id]))!.offline_secret;
  assert.equal(hs.con.find((c: any) => c.id === anh).vanPin, createHmac("sha256", bm).update(`${anh}:4821`).digest("hex"));
});

test("chuyển dữ liệu: đặt khoá chính mới ⇒ bản mã khoá cũ mã lại theo khoá mới; bản mã khoá đã mất để nguyên, Hiện trả null", async () => {
  const { anh, minh, tokBm } = await nha();
  const cu = pm.vongKhoa();
  process.env.AIIGROW_PIN_KHOA = "khoa-moi-".repeat(5);
  try {
    const moi = pm.vongKhoa();
    assert.notEqual(moi[0].id, cu[0].id);
    assert.ok((await pm.chuyenPinCu(q))! >= 1);
    assert.ok((await pinMa(anh))!.startsWith(`p1.${moi[0].id}.`));
    assert.equal((await m(tokBm, `con/${anh}/pin`)).body.pin, "4821");
    // bản mã bằng khoá không còn trong vòng ⇒ không giải được: không chuyển, Hiện null (Ba Mẹ đặt lại)
    const la = pm.maHoaPin(minh, "1357", pm.vongKhoa({ NODE_ENV: "production", AIIGROW_PIN_KHOA: "khoa-la-".repeat(6) }));
    await q(`update children set pin_ma = $2 where id = $1`, [minh, la]);
    await pm.chuyenPinCu(q);
    assert.equal(await pinMa(minh), la);
    const x = (await m(tokBm, `con/${minh}/pin`)).body;
    assert.deepEqual([x.coPin, x.pin], [true, null]);
  } finally {
    delete process.env.AIIGROW_PIN_KHOA;
  }
});

test("trần sai PIN theo bé trên mọi máy: 20 lượt sai/giờ ⇒ máy khác cũng phải chờ; lượt đúng không tính; hết giờ thử lại được; đặt PIN mới xoá bộ đếm", async () => {
  const { fam, tokBm, anh, may } = await nha();
  const ds = [await may("PC 1"), await may("PC 2")];
  const mayRow = async (id: string) => (await one<any>(`select * from devices where id = $1`, [id]))!;
  const t0 = new Date("2026-11-24T10:00:00Z");
  const luc = (giay: number) => new Date(t0.getTime() + giay * 1000);
  const thu = (i: number, p: string, giay: number) => mayRow(ds[i].id).then((d) => pin.dangNhapBe(d, anh, p, luc(giay)));
  const loiMa = async (p: Promise<unknown>) => { try { await p; return "ok"; } catch (e: any) { return e.ma as string; } };
  // một lượt đúng xen giữa không chiếm trần
  assert.equal(await loiMa(thu(0, "4821", 0)), "ok");
  // 4 đợt × 5 lượt sai (đợt nào cũng đủ 5 ⇒ máy chờ 15 giây; đổi máy / chờ rồi thử tiếp) = 20 lượt sai trong 2 phút
  let s = 1;
  for (let dot = 0; dot < 4; dot++) {
    for (let i = 0; i < 5; i++) assert.match(await loiMa(thu(dot % 2, "0000", s++)), /^pin_(sai|tam_khoa)$/);
    s += 16;
  }
  assert.equal(pin.PIN_SAI_BE_GIO, 20);
  // lượt 21 (máy đã hết chờ 15 giây) ⇒ chặn theo bé, kể cả PIN đúng
  const e = await thu(0, "4821", s).then(() => null, (x) => x);
  assert.equal(e?.ma, "pin_tam_khoa");
  assert.ok(e.them.choGiay > 3000 && e.them.choGiay <= 3600, `chờ tới hết khung giờ (${e.them.choGiay})`);
  assert.equal(await loiMa(thu(1, "4821", s + 20)), "pin_tam_khoa", "máy kia cũng bị chặn");
  // máy hiện hạn chờ theo bé ở «Ai đang dùng máy?»; gửi không PIN cũng báo chờ
  const hs = await pin.hoSoMay(await mayRow(ds[1].id), luc(s + 21));
  assert.ok(hs.con.find((c: any) => c.id === anh)!.choGiay! > 3000);
  assert.equal(await loiMa(thu(1, "", s + 22)), "pin_tam_khoa");
  // Ba Mẹ được báo một lần (khoá theo khung), mục «Cần Ba Mẹ để ý» dẫn tới màn đặt PIN
  assert.equal((await q(`select 1 from alerts where family_id = $1 and loai = 'pin_bi_do' and child_id = $2`, [fam, anh])).length, 1);
  const cdy = (await m(tokBm, "can-de-y")).body.ds.find((x: any) => x.con === anh && /nhập sai/.test(x.tieu));
  assert.equal(cdy?.den, `/ho-so/${anh}/pin`);
  // lượt bị trần theo bé chặn KHÔNG chiếm lượt của máy: thử dồn trên máy 0 trong lúc bị chặn, hết khung (chưa qua 15 phút) vẫn vào được ngay
  for (let i = 0; i < 8; i++) await loiMa(thu(0, "0000", 3590 - 8 + i));
  assert.equal(await loiMa(thu(0, "4821", 3605)), "ok", "máy không bị khoá vì các lượt bị chặn");
  // hết khung 1 giờ ⇒ vào được
  assert.equal(await loiMa(thu(1, "4821", 3700)), "ok");
  // dồn lại rồi Ba Mẹ đặt PIN mới ⇒ bộ đếm theo bé xoá
  await q(`update pin_sai set so_lan = 25, cap_nhat = $2 where khoa = $1`, [`pinbe:${anh}`, luc(3800)]);
  await pin.datPin(fam, anh, "2468", null, luc(3801));
  assert.equal(await one(`select 1 from pin_sai where khoa = $1`, [`pinbe:${anh}`]), undefined);
  assert.equal(await loiMa(thu(0, "2468", 3802)), "ok");
  // lượt đúng khi chưa có lượt sai nào ⇒ không để lại dòng bộ đếm (khung sau neo ở lượt SAI đầu tiên); cron dọn khung đã qua
  assert.equal(await one(`select 1 from pin_sai where khoa = $1`, [`pinbe:${anh}`]), undefined);
  await loiMa(thu(0, "0000", 3900));
  assert.equal((await one<{ so_lan: number }>(`select so_lan from pin_sai where khoa = $1`, [`pinbe:${anh}`]))!.so_lan, 1);
  await pin.donBoDemPinBe(luc(3900 + 3500));
  assert.ok(await one(`select 1 from pin_sai where khoa = $1`, [`pinbe:${anh}`]), "khung còn hiệu lực ⇒ giữ");
  await pin.donBoDemPinBe(luc(3900 + 3601));
  assert.equal(await one(`select 1 from pin_sai where khoa = $1`, [`pinbe:${anh}`]), undefined, "khung đã qua ⇒ dọn");
});

test("PIN không giải được (khoá cũ đã mất) ⇒ pin_can_dat_lai, không tính lượt sai, không ghi sai_pin", async () => {
  const { fam, anh, may } = await nha();
  const chung = await may("PC chung");
  const la = pm.maHoaPin(anh, "4821", pm.vongKhoa({ NODE_ENV: "production", AIIGROW_PIN_KHOA: "khoa-da-mat-".repeat(4) }));
  await q(`update children set pin_ma = $2 where id = $1`, [anh, la]);
  const r = await dv(chung.tok, "dang-nhap-be", { con: anh, pin: "4821" });
  assert.deepEqual([r.status, r.body.error], [409, "pin_can_dat_lai"]);
  assert.equal(await one(`select 1 from pin_sai where khoa = $1 or khoa = $2`, [`pin:${chung.id}:${anh}`, `pinbe:${anh}`]), undefined);
  assert.equal((await q(`select 1 from events where family_id = $1 and loai = 'sai_pin'`, [fam])).length, 0);
});
