// M4b — nhịp + tuân thủ: mất nhịp ⇒ ngoài vòng + cảnh báo MỘT lần; giờ sai / app tắt / admin lạ ⇒ hạ điểm + khoá giải trí (fail-closed);
// mở khẩn cấp do Ba Mẹ (có hạn) hết hạn ⇒ khoá lại; cách ly gia đình; máy chưa gửi nhịp (agent cũ) không bị khoá.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const tt = await import("./tuan-thu.ts");
const g = await import("./gia-dinh.ts");
const la = await import("./luat-app.ts");
const v = await import("./vi.ts");
const ph = await import("./phien.ts");
const { taoPhien } = await import("./auth.ts");
const { xuLyMay } = await import("./api-may.ts");
const { xuLyM } = await import("./api-m.ts");
const { q, one } = await import("./db.ts");
const { taoNha, taoBaMe } = await import("./test-fixtures/nha.ts");

const VN = (s: string) => new Date(`${s}+07:00`);
const sau = (d: Date, phut: number) => new Date(d.getTime() + phut * 60000);

type Kq = { status: number; body: any };
async function goi(f: typeof xuLyMay, goc: string, duong: string, o: { tok?: string; body?: unknown } = {}): Promise<Kq> {
  const req = new Request(`http://x.test/api/${goc}/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const r = await f(req, duong.split("?")[0].split("/"));
  return { status: r.status, body: await r.json() };
}
const dv = (d: string, o?: { tok?: string; body?: unknown }) => goi(xuLyMay, "device", d, o);
const m = (d: string, o?: { tok?: string; body?: unknown }) => goi(xuLyM, "m", d, o);

async function nha(nen: "windows" | "android" = "windows", ten = "Lan") {
  const { fam, bm } = await taoNha(ten);
  const con = await g.taoCon(fam, { ten: "Ken" });
  await v.dieuChinhTay(fam, con, 50, "Điểm thử", bm);
  await la.datLuat(fam, { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" });
  const ghep = await g.ghepMay(await g.taoMaGhep(fam, con, nen), nen, `Máy của Ken (${nen})`);
  const may = async () => (await g.mayTuToken(ghep.token))!;
  return { fam, bm, con, token: ghep.token, may, bmTok: await taoPhien(bm), mayId: ghep.deviceId };
}
const alerts = (fam: string, loai: string) => q(`select * from alerts where family_id = $1 and loai = $2`, [fam, loai]);
const events = (fam: string, loai: string) => q(`select * from events where family_id = $1 and loai = $2`, [fam, loai]);
const TOT = { phienBan: "1.4.0", appQuanLyBat: true, taiKhoan: { ten: "ken", laAdmin: false }, taiKhoanAdmin: [] as string[] };

test("mất nhịp quá ngưỡng ⇒ «ngoài vòng» + cảnh báo đúng MỘT lần mỗi lần mất; trở lại ⇒ ghi sự kiện; lần mất sau báo lại", async () => {
  const { fam, may } = await nha();
  const t0 = VN("2026-10-21T15:00:00");
  await tt.nhanNhip(await may(), { ...TOT, clientTime: t0.toISOString() }, t0);
  assert.equal((await tt.tuanThuMay(await may(), sau(t0, 10))).trangThai, "tuan_thu");
  assert.equal((await tt.quetMatNhip(fam, sau(t0, 10))).length, 0, "chưa quá 15 phút");
  assert.equal((await tt.quetMatNhip(fam, sau(t0, 16))).length, 1);
  assert.equal((await tt.quetMatNhip(fam, sau(t0, 40))).length, 0, "quét lại: không báo trùng");
  const s = await tt.tuanThuMay(await may(), sau(t0, 40));
  assert.equal(s.trangThai, "ngoai_vong");
  assert.equal(s.khoaGiaiTri, true);
  assert.equal(s.diem, 0);
  assert.equal((await alerts(fam, "may_ngoai_vong")).length, 1);
  assert.equal((await alerts(fam, "may_ngoai_vong"))[0].muc, "nghiem_trong");
  // trở lại
  const t1 = sau(t0, 60);
  const k = await tt.nhanNhip(await may(), { ...TOT, clientTime: t1.toISOString() }, t1);
  assert.equal(k.troLai, true);
  assert.equal(k.tuanThu.trangThai, "tuan_thu");
  assert.equal((await events(fam, "may_tro_lai")).length, 1);
  // lần mất sau
  assert.equal((await tt.quetMatNhip(fam, sau(t1, 20))).length, 1);
  assert.equal((await alerts(fam, "may_ngoai_vong")).length, 2);
});

test("agent báo tắt / ngủ sạch ⇒ im lặng sau đó là «tat_may», không cảnh báo; điện thoại dùng ngưỡng mất nhịp dài hơn", async () => {
  const { fam, may } = await nha();
  const t0 = VN("2026-10-21T15:00:00");
  await tt.nhanNhip(await may(), { ...TOT, nguon: "sap_tat" }, t0);
  assert.equal((await tt.quetMatNhip(fam, sau(t0, 300))).length, 0);
  assert.equal((await tt.tuanThuMay(await may(), sau(t0, 300))).trangThai, "tat_may");
  const dt = await nha("android", "Hoa");
  await tt.nhanNhip(await dt.may(), { phienBan: "1.0", appQuanLyBat: true }, t0);
  assert.equal((await tt.quetMatNhip(dt.fam, sau(t0, 60))).length, 0, "Android: 60 phút chưa quá ngưỡng 180");
  assert.equal((await tt.quetMatNhip(dt.fam, sau(t0, 200))).length, 1);
});

test("giờ máy sai qua API nhịp ⇒ trừ 40 điểm, khoá giải trí (phien/xet · phien/mo từ chối), cảnh báo + sự kiện một lần", async () => {
  const { fam, token, con, may } = await nha();
  const lech = new Date(Date.now() + 30 * 60000).toISOString();
  const r = (await dv("nhip", { tok: token, body: { ...TOT, clientTime: lech } })).body;
  assert.equal(r.tuanThu.diem, 60);
  assert.equal(r.tuanThu.khoaGiaiTri, true);
  assert.deepEqual(r.tuanThu.vanDe.map((x: any) => x.loai), ["gio_sai"]);
  assert.deepEqual(r.chinhSach.hieuLuc.lyDo, ["gio_may_sai", "khong_tuan_thu"]);
  assert.equal(r.chinhSach.gioMaySai, true);
  assert.equal(r.nenTang.nen, "windows");
  assert.deepEqual(r.lenh, []);
  await dv("nhip", { tok: token, body: { ...TOT, clientTime: lech } });
  assert.equal((await alerts(fam, "lech_gio")).length, 1, "khoá chống trùng (chung khoá với dong-bo)");
  assert.equal((await events(fam, "tuan_thu_lech")).length, 1, "sự kiện chỉ khi vấn đề mới xuất hiện");
  const x = (await dv("phien/xet", { tok: token, body: { muc: "roblox.exe" } })).body;
  assert.deepEqual([x.duoc, x.lyDo], [false, "khong_tuan_thu"]);
  assert.match(x.cau, /Giờ máy/);
  assert.equal((await dv("phien/mo", { tok: token, body: { muc: "roblox.exe" } })).status, 409);
  // phiên đang chạy ⇒ nhịp phiên kết thúc phiên
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, (await may()).id, "roblox.exe", {}, t0);
  const n = (await dv("phien/nhip", { tok: token, body: { id: p.id } })).body;
  assert.equal(n.trangThai, "ket_thuc");
  assert.equal(n.lyDoKet, "khong_tuan_thu");
  assert.equal((await one<{ trang_thai: string }>(`select trang_thai from play_sessions where id = $1`, [p.id]))!.trang_thai, "ket_thuc");
  // giờ đúng lại ⇒ hết khoá + sự kiện ổn định
  const ok = (await dv("nhip", { tok: token, body: { ...TOT, clientTime: new Date().toISOString() } })).body;
  assert.deepEqual([ok.tuanThu.trangThai, ok.tuanThu.diem, ok.tuanThu.khoaGiaiTri], ["tuan_thu", 100, false]);
  assert.equal((await events(fam, "tuan_thu_on")).length, 1);
});

test("app quản lý tắt ⇒ trừ 50, khoá, cảnh báo nghiêm trọng; không tới được máy chủ lâu ⇒ trừ 30, khoá", async () => {
  const { fam, token } = await nha();
  const r = (await dv("nhip", { tok: token, body: { ...TOT, thanhPhan: { dichVu: true, khay: false } } })).body;
  assert.equal(r.tuanThu.diem, 50);
  assert.equal(r.tuanThu.khoaGiaiTri, true);
  assert.deepEqual(r.tuanThu.vanDe[0].chiTiet.tat, ["khay"]);
  const cb = await alerts(fam, "tuan_thu_app_tat");
  assert.equal(cb.length, 1);
  assert.equal(cb[0].muc, "nghiem_trong");
  const r2 = (await dv("nhip", { tok: token, body: { ...TOT, matKetNoiPhut: 45 } })).body;
  assert.deepEqual([r2.tuanThu.diem, r2.tuanThu.khoaGiaiTri, r2.tuanThu.vanDe[0].loai], [70, true, "khong_toi_may_chu"]);
});

test("tài khoản quản trị lạ ⇒ khoá tới khi Ba Mẹ xác nhận tài khoản là của mình; Con đăng nhập bằng tài khoản admin cũng bị bắt", async () => {
  const { fam, token, bmTok, mayId } = await nha();
  const body = { ...TOT, taiKhoan: { ten: "Ken", laAdmin: true }, taiKhoanAdmin: ["BaMe"] };
  const r = (await dv("nhip", { tok: token, body })).body;
  assert.deepEqual(r.tuanThu.vanDe[0].chiTiet.taiKhoan, ["bame", "ken"]);
  assert.equal(r.tuanThu.vanDe[0].chiTiet.dangDung, "ken");
  assert.equal(r.tuanThu.khoaGiaiTri, true);
  assert.equal((await alerts(fam, "tuan_thu_admin_la")).length, 1);
  assert.deepEqual((await m(`may/${mayId}/tai-khoan-tin-cay`, { tok: bmTok, body: { ten: "BaMe" } })).body.adminTinCay, ["bame"]);
  const r2 = (await dv("nhip", { tok: token, body })).body;
  assert.deepEqual(r2.tuanThu.vanDe[0].chiTiet.taiKhoan, ["ken"], "vẫn còn Con dùng tài khoản admin");
  assert.equal(r2.tuanThu.khoaGiaiTri, true);
  const r3 = (await dv("nhip", { tok: token, body: { ...body, taiKhoan: { ten: "ken", laAdmin: false } } })).body;
  assert.deepEqual([r3.tuanThu.trangThai, r3.tuanThu.khoaGiaiTri], ["tuan_thu", false]);
  assert.equal((await events(fam, "tin_cay_admin")).length, 1);
});

test("mở khẩn cấp do Ba Mẹ: gỡ khoá tuân thủ trong thời hạn (kẹp tối đa), ghi nhật ký; hết hạn ⇒ khoá lại + ghi «hết mở khẩn cấp»", async () => {
  const { fam, bm, may, mayId, bmTok } = await nha();
  const t0 = VN("2026-10-21T15:00:00");
  const sai = { ...TOT, clientTime: sau(t0, 60).toISOString() };
  await tt.nhanNhip(await may(), sai, t0);
  assert.equal((await tt.khoaTuanThu(await may(), t0)).khoa, true);
  const kc = await tt.moKhanCap(fam, mayId, { phut: 30, lyDo: "Con cần nộp bài" }, bm, t0);
  assert.equal(kc.phut, 30);
  assert.equal((await tt.khoaTuanThu(await may(), sau(t0, 10))).khoa, false);
  assert.equal((await tt.khoaTuanThu(await may(), sau(t0, 10))).tuanThu.moKhanCapDen, sau(t0, 30).toISOString());
  await tt.nhanNhip(await may(), { ...sai, clientTime: sau(t0, 80).toISOString() }, sau(t0, 20));    // vẫn lệch, giữ nhịp
  assert.equal((await tt.khoaTuanThu(await may(), sau(t0, 25))).khoa, false);
  assert.equal((await tt.khoaTuanThu(await may(), sau(t0, 31))).khoa, true, "hết hạn ⇒ khoá lại");
  await tt.khoaTuanThu(await may(), sau(t0, 32));
  assert.equal((await events(fam, "het_mo_khan_cap")).length, 1);
  assert.equal((await events(fam, "mo_khan_cap")).length, 1);
  assert.equal((await alerts(fam, "mo_khan_cap")).length, 1, "báo các Ba Mẹ khác");
  // qua API: kẹp tối đa 120 phút; huỷ sớm; vai Chỉ xem không mở được
  assert.equal((await m(`may/${mayId}/mo-khan-cap`, { tok: bmTok, body: { phut: 9999 } })).body.phut, 120);
  assert.equal((await m(`may/${mayId}/mo-khan-cap/huy`, { tok: bmTok, body: {} })).body.ok, true);
  const xem = await taoPhien(await taoBaMe(fam, "Bà", "xem"));
  assert.equal((await m(`may/${mayId}/mo-khan-cap`, { tok: xem, body: { phut: 30 } })).status, 403);
  // Ba Mẹ xem tuân thủ
  const ds = (await m("tuan-thu", { tok: bmTok })).body.ds;
  assert.equal(ds[0].id, mayId);
  const ct = (await m(`may/${mayId}/tuan-thu`, { tok: bmTok })).body;
  assert.ok(ct.suKien.some((e: any) => e.loai === "mo_khan_cap"));
  const ch = (await m(`may/${mayId}/cau-hinh-nen-tang`, { tok: bmTok })).body;
  assert.equal(ch.nenTang.nen, "windows");
  assert.ok(ch.nenTang.khongLamDuoc.length > 0);
});

test("máy chưa từng gửi nhịp (agent M4 cũ chỉ dong-bo) ⇒ «chua_co_nhip», không khoá; dong-bo trả thêm lenh", async () => {
  const { token, may } = await nha();
  assert.equal((await tt.tuanThuMay(await may())).trangThai, "chua_co_nhip");
  const p = (await dv("dong-bo", { tok: token, body: { clientTime: new Date().toISOString() } })).body;
  assert.deepEqual(p.lenh, []);
  assert.ok("soDu" in p && "luat" in p, "trường Policy cũ giữ nguyên");
  assert.notEqual((await dv("phien/xet", { tok: token, body: { muc: "roblox.exe" } })).body.lyDo, "khong_tuan_thu");
});

test("cách ly gia đình: Ba Mẹ nhà khác không xem / mở khẩn cấp / xác nhận admin / xem cấu hình / luật mạng của máy, Con nhà này", async () => {
  const a = await nha();
  const b = await nha("windows", "Mai");
  await dv("nhip", { tok: a.token, body: TOT });
  for (const [d, body] of [[`may/${a.mayId}/tuan-thu`, undefined], [`may/${a.mayId}/cau-hinh-nen-tang`, undefined],
    [`may/${a.mayId}/mo-khan-cap`, { phut: 30 }], [`may/${a.mayId}/tai-khoan-tin-cay`, { ten: "x" }], [`con/${a.con}/luat-mang?mac=aa:bb:cc:dd:ee:ff`, undefined]] as const)
    assert.equal((await m(d, { tok: b.bmTok, body })).status, 404, d);
  assert.deepEqual((await m("tuan-thu", { tok: b.bmTok })).body.ds.map((x: any) => x.id), [b.mayId]);
  assert.equal((await events(a.fam, "mo_khan_cap")).length, 0);
});

test("TV / tầng mạng: Ba Mẹ lấy luật router + DNS theo MAC cho Con (không cần TV / router)", async () => {
  const { con, bmTok } = await nha();
  await la.datLuat((await q<{ family_id: string }>(`select family_id from children where id = $1`, [con]))[0].family_id,
    { muc: "tiktok.com", loai: "chan" });
  const r = (await m(`con/${con}/luat-mang?mac=AA:BB:CC:DD:EE:01&nen=tizen&ten=TV%20ph%C3%B2ng%20kh%C3%A1ch`, { tok: bmTok })).body;
  assert.equal(r.nen, "tizen");
  assert.equal(r.mang.thietBi.mac, "aa:bb:cc:dd:ee:01");
  assert.equal(r.mang.thietBi.ten, "TV phòng khách");
  assert.ok(r.mang.dns.chan.includes("tiktok.com"));
  assert.ok(r.mang.router.length >= 2);
});

test("tuan-thu ?nhe=1 (Trang chủ): đọc đúng trạng thái nhưng KHÔNG quét mất nhịp / ghi cảnh báo — màn Máy mới quét", async () => {
  const { fam, may } = await nha();
  const t0 = VN("2026-10-21T15:00:00");
  await tt.nhanNhip(await may(), { ...TOT, clientTime: t0.toISOString() }, t0);
  const nhe = await tt.dsTuanThu(fam, sau(t0, 40), { nhe: true });
  assert.equal(nhe[0].trangThai, "ngoai_vong");
  assert.equal((await alerts(fam, "may_ngoai_vong")).length, 0);
  await tt.dsTuanThu(fam, sau(t0, 40));
  assert.equal((await alerts(fam, "may_ngoai_vong")).length, 1);
});
