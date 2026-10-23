// Phiên chơi trên máy Windows (agent 0.2.4): «đang dùng» theo app tiền cảnh (BRD 4.4), máy dùng chung có nhịp, phút chơi khi mất mạng
// (BRD 6.7: playOfflineMinutes + phien/bu). Mốc giờ cố định (giờ VN = UTC+7).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const ph = await import("./phien.ts");
const pw = await import("./phien-windows.ts");
const aw = await import("./agent-windows.ts");
const mc = await import("./may-con.ts");
const la = await import("./luat-app.ts");
const g = await import("./gia-dinh.ts");
const v = await import("./vi.ts");
const { xuLyMay } = await import("./api-may.ts");
const { q, one, newId } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

const VN = (s: string) => new Date(`${s}+07:00`);
const sau = (d: Date, phut: number) => new Date(d.getTime() + phut * 60000);
const fg = (app: string | null) => ({ childSessionActive: true, foregroundApp: app });

async function dv(duong: string, tok: string, body: unknown) {
  const r = await xuLyMay(new Request(`http://may.test/api/device/${duong}`, {
    method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${tok}` }, body: JSON.stringify(body),
  }), duong.split("/"));
  return { status: r.status, body: await r.json() as any };
}

async function nha(diem: number, o: { dungChung?: boolean } = {}) {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  if (diem) await v.dieuChinhTay(fam, con, diem, "Điểm thử", bm);
  await la.datLuat(fam, { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" });
  await la.datLuat(fam, { muc: "youtube.com", ten: "YouTube", loai: "giai_tri", nhom: "video_ngan" });
  await la.datLuat(fam, { muc: "scratch.exe", ten: "Scratch", loai: "hoc" });
  const ghep = await g.ghepMay(await g.taoMaGhep(fam, o.dungChung ? null : con, "windows"), "windows", "PC của Ken");
  const may = (await g.mayTuToken(ghep.token))!;
  return { fam, bm, con, may, token: ghep.token };
}

test("dangDungTuStatus: rỗng (khoá màn hình) / app khác ⇒ không dùng; trùng app, trình duyệt cho phiên web, null (khay chết), agent cũ ⇒ dùng", () => {
  assert.equal(pw.dangDungTuStatus(fg(""), "roblox.exe"), false, "màn hình khoá");
  assert.equal(pw.dangDungTuStatus(fg("scratch.exe"), "roblox.exe"), false, "chuyển sang app học");
  assert.equal(pw.dangDungTuStatus(fg("RobLox.EXE"), "roblox.exe"), true);
  assert.equal(pw.dangDungTuStatus(fg("msedge.exe"), "youtube.com"), true, "phiên web: trình duyệt ở nền trước");
  assert.equal(pw.dangDungTuStatus(fg("roblox.exe"), "youtube.com"), false);
  assert.equal(pw.dangDungTuStatus(fg(null), "roblox.exe"), true, "khay chết: không ngừng được đồng hồ bằng cách tắt khay");
  assert.equal(pw.dangDungTuStatus({ childSessionActive: true }, "roblox.exe"), true, "agent 0.2.0–0.2.3 không gửi trường");
  assert.equal(pw.dangDungTuStatus({ childSessionActive: false, foregroundApp: "roblox.exe" }, "roblox.exe"), false, "Con đã đăng xuất");
  assert.equal(pw.laNhipThucThi({ childSessionActive: true }), true);
  assert.equal(pw.laNhipThucThi({ agent: "windows", online: true } as never), false, "đồng bộ của HeartbeatWorker không là nhịp");
});

test("khoá màn hình (foregroundApp rỗng) ⇒ tạm dừng, không trừ điểm; 3 phút ⇒ đóng phiên", async () => {
  const { con, may } = await nha(100);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, may.id, "roblox.exe", {}, t0);
  for (let i = 1; i <= 5; i++) await pw.nhipPhienWindows(may, con, fg("roblox.exe"), sau(t0, i));
  assert.equal(await v.soDu(con), 95);
  let k = await pw.nhipPhienWindows(may, con, fg(""), sau(t0, 6));
  assert.equal(k!.trangThai, "tam");
  k = await pw.nhipPhienWindows(may, con, fg(""), sau(t0, 8));
  assert.equal(k!.trangThai, "tam");
  assert.equal(await v.soDu(con), 95, "khoá màn hình: không trừ điểm");
  k = await pw.nhipPhienWindows(may, con, fg(""), sau(t0, 9));
  assert.equal(k!.trangThai, "ket_thuc");
  assert.equal(k!.lyDoKet, "khong_hoat_dong");
  assert.equal((await one<{ trang_thai: string }>(`select trang_thai from play_sessions where id = $1`, [p.id]))!.trang_thai, "ket_thuc");
});

test("chuyển sang app khác (app học) ⇒ không trừ điểm; quay lại Roblox ⇒ tính tiếp", async () => {
  const { con, may } = await nha(100);
  const t0 = VN("2026-10-21T17:00:00");
  await ph.moPhien(con, may.id, "roblox.exe", {}, t0);
  for (let i = 1; i <= 3; i++) await pw.nhipPhienWindows(may, con, fg("roblox.exe"), sau(t0, i));
  for (let i = 4; i <= 5; i++) assert.equal((await pw.nhipPhienWindows(may, con, fg("scratch.exe"), sau(t0, i)))!.trangThai, "tam");
  assert.equal(await v.soDu(con), 97, "2 phút Scratch không trừ");
  await pw.nhipPhienWindows(may, con, fg("roblox.exe"), sau(t0, 6));
  const k = await pw.nhipPhienWindows(may, con, fg("roblox.exe"), sau(t0, 7));
  assert.equal(k!.trangThai, "chay");
  assert.equal(k!.phutDung, 4);
  assert.equal(await v.soDu(con), 96);
});

test("agent cũ (không gửi foregroundApp) ⇒ như #58: Con còn đăng nhập là tính; heartbeat (không childSessionActive) không là nhịp", async () => {
  const { con, may } = await nha(100);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, may.id, "roblox.exe", {}, t0);
  for (let i = 1; i <= 4; i++) await pw.nhipPhienWindows(may, con, { childSessionActive: true }, sau(t0, i));
  assert.equal(await v.soDu(con), 96);
  // khoá màn hình: tạm dừng ở phút 5; heartbeat (60 giây) xen vào không được xoá mốc tạm dừng
  await pw.nhipPhienWindows(may, con, fg(""), sau(t0, 5));
  assert.equal(await pw.nhipPhienWindows(may, con, { agent: "windows", online: true, cheDo: "chan" } as never, sau(t0, 6)), null);
  await pw.nhipPhienWindows(may, con, fg(""), sau(t0, 7));
  const k = await pw.nhipPhienWindows(may, con, fg(""), sau(t0, 8));
  assert.equal(k!.trangThai, "ket_thuc", "3 phút khoá màn hình ⇒ đóng dù heartbeat xen giữa");
  assert.equal((await one<{ phut_dung: number }>(`select phut_dung from play_sessions where id = $1`, [p.id]))!.phut_dung, 4);
});

test("máy dùng chung (child_id null, Con chọn bằng PIN): nhịp đồng bộ tìm phiên mở trên máy ⇒ trừ điểm; máy khác / nhà khác không đụng", async () => {
  const { fam, con, may } = await nha(100, { dungChung: true });
  assert.equal(may.child_id, null);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, may.id, "roblox.exe", {}, t0);     // mở từ trang khay (choi-tre › moTre, device_id = máy này)
  let k = null as Awaited<ReturnType<typeof pw.nhipPhienWindows>>;
  for (let i = 1; i <= 5; i++) k = await pw.nhipPhienWindows(may, null, fg("roblox.exe"), sau(t0, i));
  assert.equal(k!.trangThai, "chay");
  assert.equal(k!.phutDung, 5);
  assert.equal(await v.soDu(con), 95);
  assert.equal((await pw.phienCuaMay(may, null))!.id, p.id);
  // máy khác cùng gia đình: không thấy phiên này
  const may2 = (await g.mayTuToken((await g.ghepMay(await g.taoMaGhep(fam, null, "windows"), "windows", "PC 2")).token))!;
  assert.equal(await pw.nhipPhienWindows(may2, null, fg("roblox.exe"), sau(t0, 6)), null);
  // cách ly gia đình: thiết bị nhà khác (giả dùng trùng id máy) không thấy phiên Con nhà này
  assert.equal(await pw.phienCuaMay({ ...may, family_id: (await taoNha("Mai")).fam }, null), undefined);
});

test("playOfflineMinutes = min(phút còn lại của phiên, phút mua được bằng số dư + phút thưởng) theo giá phiên", async () => {
  assert.equal(aw.phutChoiOffline(20, 90, 0, 1000), 20, "phiên giới hạn");
  assert.equal(aw.phutChoiOffline(20, 3, 0, 1000), 3, "số dư giới hạn");
  assert.equal(aw.phutChoiOffline(20, 3, 4, 1000), 7, "phút thưởng dùng trước, không trừ điểm");
  assert.equal(aw.phutChoiOffline(20, 6, 0, 1500, 500), 3, "1,5 điểm/phút, đang nợ 0,5 điểm ⇒ (6 − 0,5)/1,5 = 3");
  assert.equal(aw.phutChoiOffline(20, 0, 0, 0), 20, "giá 0 ⇒ chỉ giới hạn bởi phiên");
  assert.equal(aw.phutChoiOffline(20, 0, 0, 1000), 0);

  const { fam, bm, con, may } = await nha(100);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, may.id, "roblox.exe", {}, t0);       // tối đa 30 phút
  for (let i = 1; i <= 10; i++) await pw.nhipPhienWindows(may, con, fg("roblox.exe"), sau(t0, i));
  const w = async (now: Date, conThuong = 0) =>
    aw.chinhSachWindows(await mc.taoPolicy(may, con, { gioMaySai: false }, now), undefined, undefined, { conThuong, phienTien: await pw.tienPhien(p.id) });
  let x = await w(sau(t0, 10));
  assert.deepEqual([x.playSessionId, x.playApp, x.playWeb, x.playOfflineMinutes], [p.id, "roblox.exe", false, 20]);
  await v.dieuChinhTay(fam, con, -87, "Đổi quà", bm);                // còn 3 điểm
  x = await w(sau(t0, 10));
  assert.equal(x.playOfflineMinutes, 3);
  await q(`insert into grants(id, child_id, phut, ngay) values ($1, $2, 4, '2026-10-21')`, [newId(), con]);
  x = await w(sau(t0, 10), await ph.thuongConLai(con, sau(t0, 10)));
  assert.equal(x.playOfflineMinutes, 7);
  // không có phiên ⇒ không gửi các trường
  const kp = aw.chinhSachWindows({ ...(await mc.taoPolicy(may, con, { gioMaySai: false }, sau(t0, 10))), phien: null });
  for (const k of ["playSessionId", "playApp", "playWeb", "playOfflineMinutes"]) assert.ok(!(k in kp), k);
});

test("phiên web ⇒ playWeb, playApp là tên miền", async () => {
  const { con, may } = await nha(100);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, may.id, "youtube.com", {}, t0);
  const x = aw.chinhSachWindows(await mc.taoPolicy(may, con, { gioMaySai: false }, t0), undefined, undefined, { phienTien: await pw.tienPhien(p.id) });
  assert.deepEqual([x.playSessionId, x.playApp, x.playWeb], [p.id, "youtube.com", true]);
  assert.ok(x.playOfflineMinutes! > 0);
});

test("phien/bu từ máy dùng chung: Con lấy từ phiên mở trên máy; phiên máy khác ⇒ 404; không id ⇒ 409; gửi lại cùng mã không trừ đôi", async () => {
  const { fam, con, may, token } = await nha(50, { dungChung: true });
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, may.id, "roblox.exe", {}, t0);
  for (let i = 1; i <= 2; i++) await pw.nhipPhienWindows(may, null, fg("roblox.exe"), sau(t0, i));
  assert.equal(await v.soDu(con), 48);
  const b = await dv("phien/bu", token, { ma: "bu-chung-1", id: p.id, muc: "roblox.exe", phut: 5, ketThuc: true });
  assert.equal(b.status, 200);
  assert.deepEqual([b.body.phut, b.body.diemTru, b.body.ketThuc], [5, 5, true]);
  assert.equal(await v.soDu(con), 43);
  assert.equal((await dv("phien/bu", token, { ma: "bu-chung-1", id: p.id, phut: 5, ketThuc: true })).body.lapLai, true);
  assert.equal(await v.soDu(con), 43);
  // máy khác (cùng nhà) gửi bù cho phiên không mở trên nó ⇒ 404
  const ghep2 = await g.ghepMay(await g.taoMaGhep(fam, null, "windows"), "windows", "PC 2");
  assert.equal((await dv("phien/bu", ghep2.token, { ma: "bu-chung-2", id: p.id, phut: 5 })).status, 404);
  assert.equal((await dv("phien/bu", token, { ma: "bu-chung-3", muc: "roblox.exe", phut: 5 })).status, 409);
});

test("phien/bu trên phiên đang tạm dừng: có phút chơi bù ⇒ phiên chạy lại; 0 phút ⇒ giữ mốc tạm dừng", async () => {
  const { con, may } = await nha(50);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, may.id, "roblox.exe", {}, t0);
  await pw.nhipPhienWindows(may, con, fg("roblox.exe"), sau(t0, 1));
  await pw.nhipPhienWindows(may, con, fg(""), sau(t0, 2));                 // tạm từ phút 2
  const tam = await one<{ tam_tu: Date }>(`select tam_tu from play_sessions where id = $1`, [p.id]);
  await mc.buPhien(may, con, { ma: "t-0", id: p.id, phut: 0 }, sau(t0, 3));
  let s = await one<{ trang_thai: string; tam_tu: Date | null }>(`select trang_thai, tam_tu from play_sessions where id = $1`, [p.id]);
  assert.equal(s!.trang_thai, "tam");
  assert.equal(new Date(s!.tam_tu!).getTime(), new Date(tam!.tam_tu).getTime());
  const b = await mc.buPhien(may, con, { ma: "t-1", id: p.id, phut: 2 }, sau(t0, 6));
  assert.equal(b.phut, 2);
  s = await one<{ trang_thai: string; tam_tu: Date | null }>(`select trang_thai, tam_tu from play_sessions where id = $1`, [p.id]);
  assert.deepEqual([s!.trang_thai, s!.tam_tu], ["chay", null]);
});
