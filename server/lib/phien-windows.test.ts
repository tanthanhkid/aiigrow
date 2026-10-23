// Phiên chơi trên máy Windows (agent 0.2.4): máy chủ tính đúng `playSeconds` agent đếm (BRD 4.4), máy dùng chung có nhịp + ghép phiên
// vào Policy chung, phút chơi khi mất mạng (BRD 6.7: playOfflineMinutes + phien/bu). Mốc giờ cố định (giờ VN = UTC+7).
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
const tre = await import("./choi-tre.ts");
const { sha } = await import("./auth.ts");
const { xuLyMay } = await import("./api-may.ts");
const { q, one, newId } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

const VN = (s: string) => new Date(`${s}+07:00`);
const sau = (d: Date, phut: number) => new Date(d.getTime() + phut * 60000);
/** Status của vòng thực thi agent 0.2.4: `giay` giây chơi thật của phiên `id` kể từ lần đồng bộ trước. */
const ps = (giay: number, id: string) => ({ childSessionActive: true, playSeconds: giay, playSessionId: id });
const CU = { childSessionActive: true };                                   // agent 0.2.0–0.2.3
/** Phiên PIN của Con trên máy dùng chung (dangNhapPin ghi kid_sessions, hạn 12 giờ) — đặt hạn theo mốc giờ của test. */
async function dangNhap(con: string, mayId: string, den: Date) {
  const tok = `pin-${newId()}`;
  await q(`insert into kid_sessions(id, child_id, device_id, expires_at) values ($1, $2, $3, $4)`, [sha(tok), con, mayId, den]);
  return tok;
}
const phienDb = (id: string) => one<{ trang_thai: string; phut_dung: number; ly_do_ket: string | null; nhip_cuoi: Date; tam_tu: Date | null }>(
  `select trang_thai, phut_dung, ly_do_ket, nhip_cuoi, tam_tu from play_sessions where id = $1`, [id]);

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

test("dungTuStatus: playSeconds của đúng phiên ⇒ tính đúng chừng đó (0 ⇒ tạm dừng); agent cũ / phiên khác ⇒ như #58; heartbeat không là nhịp", () => {
  assert.deepEqual(pw.dungTuStatus(ps(0, "p1"), "p1"), { dangDung: false, phut: 0 }, "khoá màn hình / app khác cả lượt");
  assert.deepEqual(pw.dungTuStatus(ps(30, "p1"), "p1"), { dangDung: true, phut: 0.5 });
  assert.deepEqual(pw.dungTuStatus(ps(-5, "p1"), "p1"), { dangDung: false, phut: 0 }, "số âm ⇒ 0");
  assert.deepEqual(pw.dungTuStatus(ps(30, "p0"), "p1"), { dangDung: false, phut: 0 }, "giây của phiên khác / agent chưa nhận Policy có phiên ⇒ 0");
  assert.deepEqual(pw.dungTuStatus({ childSessionActive: true, playSeconds: 0 }, "p1"), { dangDung: false, phut: 0 });
  assert.deepEqual(pw.dungTuStatus(CU, "p1"), { dangDung: true }, "agent 0.2.0–0.2.3");
  assert.deepEqual(pw.dungTuStatus({ ...ps(60, "p1"), childSessionActive: false }, "p1"), { dangDung: false }, "Con đã đăng xuất");
  assert.equal(pw.laAgentMoi(ps(0, "p1")), true);
  assert.equal(pw.laAgentMoi(CU), false);
  assert.equal(pw.laAgentMoi({ childSessionActive: true, playSeconds: "60" }), false);
  assert.equal(pw.laNhipThucThi(CU), true);
  assert.equal(pw.laNhipThucThi({ agent: "windows", online: true } as never), false, "đồng bộ của HeartbeatWorker không là nhịp");
});

test("playSeconds xen kẽ (chơi / khoá / chơi dở lượt): tính đúng số giây agent đếm, kẹp theo thời gian thật; giây của phiên khác ⇒ 0", async () => {
  const { con, may } = await nha(100);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, may.id, "roblox.exe", {}, t0);
  const nh = (giay: number, phut: number, id = p.id) => pw.nhipPhienWindows(may, con, ps(giay, id), sau(t0, phut));
  assert.equal((await nh(60, 1))!.phutDung, 1);
  assert.equal((await nh(30, 2))!.phutDung, 1.5, "nửa lượt Roblox, nửa lượt Scratch");
  let k = await nh(0, 3);
  assert.deepEqual([k!.trangThai, k!.phutDung], ["tam", 1.5], "cả lượt khoá màn hình");
  k = await nh(45, 4);
  assert.deepEqual([k!.trangThai, k!.phutDung], ["chay", 2.25], "chơi lại 45 giây — không mất phút vì lượt trước đang «tạm»");
  assert.equal((await nh(600, 5))!.phutDung, 3.25, "agent báo quá thời gian thật ⇒ kẹp 1 phút");
  k = await nh(10, 6, "phien-cu");
  assert.deepEqual([k!.trangThai, k!.phutDung], ["tam", 3.25], "số giây của phiên khác ⇒ không tính");
  assert.equal((await nh(60, 7))!.phutDung, 4.25);
  assert.equal(await v.soDu(con), 96, "4,25 phút × 1 điểm ⇒ trừ 4, nợ phần lẻ");
});

test("khoá màn hình (playSeconds 0) ⇒ tạm dừng, không trừ điểm; 3 phút ⇒ đóng phiên", async () => {
  const { con, may } = await nha(100);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, may.id, "roblox.exe", {}, t0);
  for (let i = 1; i <= 5; i++) await pw.nhipPhienWindows(may, con, ps(60, p.id), sau(t0, i));
  assert.equal(await v.soDu(con), 95);
  let k = await pw.nhipPhienWindows(may, con, ps(0, p.id), sau(t0, 6));
  assert.equal(k!.trangThai, "tam");
  k = await pw.nhipPhienWindows(may, con, ps(0, p.id), sau(t0, 8));
  assert.equal(k!.trangThai, "tam");
  assert.equal(await v.soDu(con), 95, "khoá màn hình: không trừ điểm");
  k = await pw.nhipPhienWindows(may, con, ps(0, p.id), sau(t0, 9));
  assert.deepEqual([k!.trangThai, k!.lyDoKet], ["ket_thuc", "khong_hoat_dong"]);
  assert.equal((await phienDb(p.id))!.trang_thai, "ket_thuc");
});

test("agent cũ (không playSeconds) ⇒ như #58: Con còn đăng nhập là tính; heartbeat (không childSessionActive) không là nhịp", async () => {
  const { con, may } = await nha(100);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, may.id, "roblox.exe", {}, t0);
  for (let i = 1; i <= 4; i++) await pw.nhipPhienWindows(may, con, CU, sau(t0, i));
  assert.equal(await v.soDu(con), 96);
  // tạm dừng ở phút 5; heartbeat (60 giây) xen vào không được xoá mốc tạm dừng
  await pw.nhipPhienWindows(may, con, ps(0, p.id), sau(t0, 5));
  assert.equal(await pw.nhipPhienWindows(may, con, { agent: "windows", online: true, cheDo: "chan" } as never, sau(t0, 6)), null);
  await pw.nhipPhienWindows(may, con, ps(0, p.id), sau(t0, 7));
  const k = await pw.nhipPhienWindows(may, con, ps(0, p.id), sau(t0, 8));
  assert.equal(k!.trangThai, "ket_thuc", "3 phút không chơi ⇒ đóng dù heartbeat xen giữa");
  assert.equal((await phienDb(p.id))!.phut_dung, 4);
});

test("máy dùng chung + agent cũ (P1): không nhịp, không trừ điểm (Policy chung của agent cũ không thả app chơi)", async () => {
  const { con, may } = await nha(100, { dungChung: true });
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, may.id, "roblox.exe", {}, t0);
  await dangNhap(con, may.id, VN("2026-10-22T05:00:00"));
  for (let i = 1; i <= 5; i++) assert.equal(await pw.nhipPhienWindows(may, null, CU, sau(t0, i)), null);
  assert.equal(await v.soDu(con), 100);
  assert.equal((await phienDb(p.id))!.phut_dung, 0);
});

test("máy dùng chung + agent 0.2.4: nhịp tìm phiên mở trên máy ⇒ trừ điểm; máy khác / nhà khác không đụng", async () => {
  const { fam, con, may } = await nha(100, { dungChung: true });
  assert.equal(may.child_id, null);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, may.id, "roblox.exe", {}, t0);     // mở từ trang khay (choi-tre › moTre, device_id = máy này)
  await dangNhap(con, may.id, VN("2026-10-22T05:00:00"));
  let k = null as Awaited<ReturnType<typeof pw.nhipPhienWindows>>;
  for (let i = 1; i <= 5; i++) k = await pw.nhipPhienWindows(may, null, ps(60, p.id), sau(t0, i));
  assert.deepEqual([k!.trangThai, k!.phutDung], ["chay", 5]);
  assert.equal(await v.soDu(con), 95);
  assert.equal((await pw.phienCuaMay(may, null))!.id, p.id);
  const may2 = (await g.mayTuToken((await g.ghepMay(await g.taoMaGhep(fam, null, "windows"), "windows", "PC 2")).token))!;
  assert.equal(await pw.nhipPhienWindows(may2, null, ps(60, p.id), sau(t0, 6)), null);
  assert.equal(await pw.phienCuaMay({ ...may, family_id: (await taoNha("Mai")).fam }, null), undefined);
});

test("máy dùng chung: phiên PIN hết hạn ⇒ đóng phiên (het_dang_nhap); «Đổi người» (raTre) ⇒ đóng phiên", async () => {
  const { con, may } = await nha(100, { dungChung: true });
  const t0 = VN("2026-10-21T17:00:00");
  let p = await ph.moPhien(con, may.id, "roblox.exe", {}, t0);
  await dangNhap(con, may.id, sau(t0, 3));
  await pw.nhipPhienWindows(may, null, ps(60, p.id), sau(t0, 1));
  await pw.nhipPhienWindows(may, null, ps(60, p.id), sau(t0, 2));
  assert.equal(await pw.nhipPhienWindows(may, null, ps(60, p.id), sau(t0, 4)), null);
  let s = await phienDb(p.id);
  assert.deepEqual([s!.trang_thai, s!.ly_do_ket], ["ket_thuc", "het_dang_nhap"]);
  assert.equal(await v.soDu(con), 98);

  const t1 = VN("2026-10-21T18:00:00");
  p = await ph.moPhien(con, may.id, "roblox.exe", {}, t1);
  const tok = await dangNhap(con, may.id, VN("2026-10-22T05:00:00"));
  await pw.nhipPhienWindows(may, null, ps(60, p.id), sau(t1, 1));
  await tre.raTre(tok, sau(t1, 2));
  s = await phienDb(p.id);
  assert.deepEqual([s!.trang_thai, s!.ly_do_ket], ["ket_thuc", "con_dung"]);
  assert.equal(await one(`select 1 from kid_sessions where id = $1`, [sha(tok)]), undefined);
});

test("máy dùng chung: bạn thứ hai mở phiên khi máy đang có phiên ⇒ từ chối «may_dang_choi» kèm câu tiếng Việt", async () => {
  const { fam, bm, con, may } = await nha(100, { dungChung: true });
  const con2 = await g.taoCon(fam, { ten: "Na" });
  await v.dieuChinhTay(fam, con2, 50, "Điểm thử", bm);
  const t0 = VN("2026-10-21T17:00:00");
  await ph.moPhien(con, may.id, "roblox.exe", {}, t0);
  const x = await ph.xetMoPhien(con2, "roblox.exe", { mayId: may.id }, sau(t0, 1));
  assert.deepEqual([x.duoc, x.lyDo], [false, "may_dang_choi"]);
  assert.match(ph.lyDoChu(x), /bạn khác chơi/);
  await assert.rejects(ph.moPhien(con2, may.id, "roblox.exe", {}, sau(t0, 1)));
  assert.equal((await ph.xetMoPhien(con2, "roblox.exe", { mayId: null }, sau(t0, 1))).duoc, true, "máy khác (không có mayId) vẫn mở được");
});

test("Policy máy dùng chung có phiên: ghép app chơi / trình duyệt + play* của Con đó; lịch, app học, khoá giữ của máy; không PIN ⇒ không ghép", async () => {
  const { con, may } = await nha(100, { dungChung: true });
  const t0 = VN("2026-10-21T17:00:00");
  const pol = await mc.taoPolicy(may, null, { gioMaySai: false }, t0);
  const p = await ph.moPhien(con, may.id, "roblox.exe", {}, t0);
  assert.equal(await pw.ghepPhienMayChung(may, pol, t0), null, "chưa có phiên PIN trên máy");
  await dangNhap(con, may.id, VN("2026-10-22T05:00:00"));
  const gh = (await pw.ghepPhienMayChung(may, pol, t0))!;
  assert.deepEqual([gh.pol.lich, gh.pol.khoaNgay, gh.pol.con], [pol.lich, pol.khoaNgay, null]);
  assert.equal(gh.pol.soDu, 100);
  const w = aw.chinhSachWindows(gh.pol, undefined, undefined, gh.mo);
  assert.ok(w.allowedApps.includes("roblox.exe"));
  assert.ok(!w.learningApps.includes("scratch.exe"), "app học vẫn theo máy dùng chung");
  assert.deepEqual([w.playSessionId, w.playApp, w.playWeb, w.playOfflineMinutes], [p.id, "roblox.exe", false, 30]);
  const chung = aw.chinhSachWindows(pol);
  assert.ok(!chung.allowedApps.includes("roblox.exe"));
  assert.ok(!("playSessionId" in chung));
  // phiên web ⇒ trình duyệt
  await ph.dungPhien(con, p.id, "ba_me_khoa", sau(t0, 1));
  const pw2 = await ph.moPhien(con, may.id, "youtube.com", {}, sau(t0, 2));
  const w2 = (await pw.ghepPhienMayChung(may, pol, sau(t0, 2)))!;
  const x2 = aw.chinhSachWindows(w2.pol, undefined, undefined, w2.mo);
  assert.ok(x2.allowedApps.includes("msedge.exe"));
  assert.deepEqual([x2.playSessionId, x2.playWeb], [pw2.id, true]);
});

test("play* chỉ gửi cho máy sở hữu phiên: Con có 2 PC ⇒ PC kia không có playSessionId", async () => {
  const { fam, con, may } = await nha(100);
  const may2 = (await g.mayTuToken((await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "PC 2")).token))!;
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, may.id, "roblox.exe", {}, t0);
  assert.equal(await pw.moRongPhienMay(may2, con, t0), null);
  const mo = (await pw.moRongPhienMay(may, con, t0))!;
  const pol = await mc.taoPolicy(may, con, { gioMaySai: false }, t0);
  assert.equal(aw.chinhSachWindows(pol, undefined, undefined, mo).playSessionId, p.id);
  assert.ok(!("playSessionId" in aw.chinhSachWindows(await mc.taoPolicy(may2, con, { gioMaySai: false }, t0))));
  assert.equal(await pw.nhipPhienWindows(may2, con, ps(60, p.id), sau(t0, 1)), null, "PC 2 không nhịp phiên của PC 1");
});

test("playOfflineMinutes = min(phút còn lại, phút mua được + thưởng, phút tới hết khung / giờ ngủ)", async () => {
  assert.equal(aw.phutChoiOffline(20, 90, 0, 1000), 20, "phiên giới hạn");
  assert.equal(aw.phutChoiOffline(20, 3, 0, 1000), 3, "số dư giới hạn");
  assert.equal(aw.phutChoiOffline(20, 3, 4, 1000), 7, "phút thưởng dùng trước, không trừ điểm");
  assert.equal(aw.phutChoiOffline(20, 6, 0, 1500, 500), 3, "1,5 điểm/phút, đang nợ 0,5 điểm ⇒ (6 − 0,5)/1,5 = 3");
  assert.equal(aw.phutChoiOffline(20, 0, 0, 0), 20, "giá 0 ⇒ chỉ giới hạn bởi phiên");
  assert.equal(aw.phutChoiOffline(20, 0, 0, 1000), 0);
  const lich = { ngayThuong: [{ tu: "17:00", den: "22:00" }], cuoiTuan: [{ tu: "09:00", den: "21:00" }], ngu: { tu: "21:00", den: "06:30" } };
  const L = (s: string) => aw.phutToiHetLich({ lich, tz: "Asia/Ho_Chi_Minh", serverTime: VN(s).toISOString() });
  assert.equal(L("2026-10-21T17:00:00"), 240, "tới giờ ngủ 21:00 trước hết khung 22:00");
  assert.equal(L("2026-10-21T20:50:00"), 10);
  assert.equal(L("2026-10-21T21:10:00"), 0, "trong giờ ngủ");
  assert.equal(L("2026-10-21T16:00:00"), 0, "ngoài khung");
  assert.equal(L("2026-10-24T20:30:00"), 30, "thứ Bảy: khung 09:00–21:00");

  const { fam, bm, con, may } = await nha(100);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, may.id, "roblox.exe", {}, t0);       // tối đa 30 phút
  for (let i = 1; i <= 10; i++) await pw.nhipPhienWindows(may, con, ps(60, p.id), sau(t0, i));
  const w = async (now: Date, conThuong = 0, gio?: string) =>
    aw.chinhSachWindows({ ...(await mc.taoPolicy(may, con, { gioMaySai: false }, now)), ...(gio ? { serverTime: VN(gio).toISOString() } : {}) },
      undefined, undefined, { conThuong, phienTien: await pw.tienPhien(p.id) });
  let x = await w(sau(t0, 10));
  assert.deepEqual([x.playSessionId, x.playApp, x.playWeb, x.playOfflineMinutes], [p.id, "roblox.exe", false, 20]);
  assert.equal((await w(sau(t0, 10), 0, "2026-10-21T19:52:00")).playOfflineMinutes, 8, "khung mặc định 17:00–20:00");
  await v.dieuChinhTay(fam, con, -87, "Đổi quà", bm);                // còn 3 điểm
  x = await w(sau(t0, 10));
  assert.equal(x.playOfflineMinutes, 3);
  await q(`insert into grants(id, child_id, phut, ngay) values ($1, $2, 4, '2026-10-21')`, [newId(), con]);
  x = await w(sau(t0, 10), await ph.thuongConLai(con, sau(t0, 10)));
  assert.equal(x.playOfflineMinutes, 7);
  const kp = aw.chinhSachWindows({ ...(await mc.taoPolicy(may, con, { gioMaySai: false }, sau(t0, 10))), phien: null });
  for (const k of ["playSessionId", "playApp", "playWeb", "playOfflineMinutes"]) assert.ok(!(k in kp), k);
});

test("phiên web ⇒ playWeb, playApp là tên miền", async () => {
  const { con, may } = await nha(100);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, may.id, "youtube.com", {}, t0);
  const x = aw.chinhSachWindows(await mc.taoPolicy(may, con, { gioMaySai: false }, t0), undefined, undefined, (await pw.moRongPhienMay(may, con, t0))!);
  assert.deepEqual([x.playSessionId, x.playApp, x.playWeb], [p.id, "youtube.com", true]);
  assert.ok(x.playOfflineMinutes! > 0);
});

test("trang khay nhịp phiên Windows (nhipTre) chỉ đọc: không đẩy nhip_cuoi ⇒ phien/bu sau khi mất mạng vẫn tính đủ", async () => {
  const { fam, con, may } = await nha(50);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, may.id, "roblox.exe", {}, t0);
  await pw.nhipPhienWindows(may, con, ps(60, p.id), sau(t0, 1));
  const truoc = (await phienDb(p.id))!.nhip_cuoi;
  const ct = { id: con, family_id: fam, device_id: may.id };
  for (const i of [2, 3, 4]) {
    const k = await tre.nhipTre(ct, p.id, i % 2 === 0, sau(t0, i));
    assert.deepEqual([k.trangThai, k.phutDung], ["chay", 1]);
  }
  assert.equal(new Date((await phienDb(p.id))!.nhip_cuoi).getTime(), new Date(truoc).getTime());
  const b = await mc.buPhien(may, con, { ma: "bu-tre", id: p.id, phut: 4 }, sau(t0, 5));
  assert.equal(b.phut, 4);
  assert.equal(await v.soDu(con), 45);
});

test("phien/bu từ máy dùng chung: Con lấy từ phiên mở trên máy; phiên máy khác ⇒ 404; không id ⇒ 409; gửi lại cùng mã không trừ đôi", async () => {
  const { fam, con, may, token } = await nha(50, { dungChung: true });
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, may.id, "roblox.exe", {}, t0);
  await dangNhap(con, may.id, VN("2026-10-22T05:00:00"));
  for (let i = 1; i <= 2; i++) await pw.nhipPhienWindows(may, null, ps(60, p.id), sau(t0, i));
  assert.equal(await v.soDu(con), 48);
  const b = await dv("phien/bu", token, { ma: "bu-chung-1", id: p.id, muc: "roblox.exe", phut: 5, ketThuc: true });
  assert.equal(b.status, 200);
  assert.deepEqual([b.body.phut, b.body.diemTru, b.body.ketThuc], [5, 5, true]);
  assert.equal(await v.soDu(con), 43);
  assert.equal((await dv("phien/bu", token, { ma: "bu-chung-1", id: p.id, phut: 5, ketThuc: true })).body.lapLai, true);
  assert.equal(await v.soDu(con), 43);
  const ghep2 = await g.ghepMay(await g.taoMaGhep(fam, null, "windows"), "windows", "PC 2");
  assert.equal((await dv("phien/bu", ghep2.token, { ma: "bu-chung-2", id: p.id, phut: 5 })).status, 404);
  assert.equal((await dv("phien/bu", token, { ma: "bu-chung-3", muc: "roblox.exe", phut: 5 })).status, 409);
});

test("phien/bu trên phiên đang tạm dừng: có phút chơi bù ⇒ phiên chạy lại; 0 phút ⇒ giữ mốc tạm dừng", async () => {
  const { con, may } = await nha(50);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, may.id, "roblox.exe", {}, t0);
  await pw.nhipPhienWindows(may, con, ps(60, p.id), sau(t0, 1));
  await pw.nhipPhienWindows(may, con, ps(0, p.id), sau(t0, 2));                 // tạm từ phút 2
  const tam = (await phienDb(p.id))!.tam_tu;
  await mc.buPhien(may, con, { ma: "t-0", id: p.id, phut: 0 }, sau(t0, 3));
  let s = await phienDb(p.id);
  assert.equal(s!.trang_thai, "tam");
  assert.equal(new Date(s!.tam_tu!).getTime(), new Date(tam!).getTime());
  const b = await mc.buPhien(may, con, { ma: "t-1", id: p.id, phut: 2 }, sau(t0, 6));
  assert.equal(b.phut, 2);
  s = await phienDb(p.id);
  assert.deepEqual([s!.trang_thai, s!.tam_tu], ["chay", null]);
});
