// Danh sách app ĐÃ CÀI THẬT trên máy Con (lib/app-may.ts): agent gửi đủ / phần đổi, Ba Mẹ xem + đặt trạng thái theo định danh thật,
// agent Win/Mac nhận blockedApps kèm đường dẫn / băm / Team ID, Android nhận gói trong chinhSach.ungDung.chan.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const { xuLyMay } = await import("./api-may.ts");
const { xuLyM } = await import("./api-m.ts");
const { taoPhien } = await import("./auth.ts");
const { taoNha, taoBaMe } = await import("./test-fixtures/nha.ts");
const am = await import("./app-may.ts");
const { xepMuc } = await import("./man-hinh.ts");

async function goiMay(duong: string, tok: string, body?: unknown) {
  const r = await xuLyMay(new Request(`http://may.test/api/device/${duong}`, { method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${tok}` }, body: JSON.stringify(body ?? {}) }), duong.split("/"));
  return { status: r.status, body: await r.json() };
}
async function goiBm(duong: string, tok: string, body?: unknown) {
  const r = await xuLyM(new Request(`http://app.test/api/m/${duong}`, { method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${tok}` }, body: body === undefined ? undefined : JSON.stringify(body) }), duong.split("?")[0].split("/"));
  return { status: r.status, body: await r.json() };
}
async function nha(nen = "windows") {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Phi" });
  const ghep = await g.ghepMay(await g.taoMaGhep(fam, con, nen), nen, "Máy của Phi");
  return { fam, bm, con, tok: ghep.token, mayId: ghep.deviceId, tokBm: await taoPhien(bm) };
}

const ROBLOX = { khoa: "exe:c:\\users\\phi\\appdata\\local\\roblox\\versions\\v1\\robloxplayerbeta.exe", muc: "RobloxPlayerBeta.exe", ten: "Roblox Player",
  nguon: "start", nhaPhatHanh: "Roblox Corporation", duongDan: "C:\\Users\\phi\\AppData\\Local\\Roblox\\Versions\\v1\\RobloxPlayerBeta.exe",
  thuMuc: "C:\\Users\\phi\\AppData\\Local\\Roblox", phienBan: "0.650", sha256: "AB".repeat(32), icon: Buffer.from("png").toString("base64") };
const MINECRAFT = { khoa: "appx:microsoft.minecraftuwp_8wekyb3d8bbwe", muc: "microsoft.minecraftuwp", ten: "Minecraft", nguon: "store", nhaPhatHanh: "Mojang" };
const SCRATCH = { khoa: "exe:c:\\program files\\scratch 3\\scratch 3.exe", muc: "scratch 3.exe", ten: "Scratch 3", nguon: "registry" };
const NOTEPAD = { khoa: "exe:c:\\windows\\system32\\notepad.exe", muc: "notepad.exe", ten: "Notepad", nguon: "start" };

test("agent gửi đủ ⇒ lưu; phần đổi chỉ nhận khi bamTruoc khớp, lệch ⇒ 409 can_gui_du; app sai bị bỏ, icon quá lớn bị bỏ icon", async () => {
  const { tok, mayId, tokBm } = await nha();
  const r1 = await goiMay("ung-dung", tok, { du: true, bam: "a".repeat(64), ds: [ROBLOX, MINECRAFT, { khoa: "x", ten: "thiếu muc" }, { ...SCRATCH, icon: "A".repeat(am.TOI_DA_ICON + 4) }] });
  assert.equal(r1.status, 200);
  assert.deepEqual(r1.body, { ok: true, bam: "a".repeat(64), soApp: 3, thieuIcon: [] });
  // lệch bam ⇒ đòi gửi đủ, không ghi gì
  const lech = await goiMay("ung-dung", tok, { du: false, bamTruoc: "c".repeat(64), bam: "b".repeat(64), them: [NOTEPAD], bo: [] });
  assert.equal(lech.status, 409);
  assert.equal(lech.body.error, "can_gui_du");
  // phần đổi đúng: thêm Notepad, bỏ Minecraft, đổi tên Scratch
  const r2 = await goiMay("ung-dung", tok, { du: false, bamTruoc: "a".repeat(64), bam: "b".repeat(64), them: [NOTEPAD, { ...SCRATCH, ten: "Scratch Desktop" }], bo: [MINECRAFT.khoa] });
  assert.equal(r2.status, 200);
  assert.equal(r2.body.soApp, 3);
  const ds = (await goiBm(`may/${mayId}/ung-dung`, tokBm)).body;
  assert.ok(ds.capNhatLuc);
  assert.deepEqual(ds.ds.map((x: any) => [x.ten, x.muc, x.trangThai]), [
    ["Notepad", "notepad.exe", "he_thong"],          // allowlist hệ thống: luôn dùng được, Ba Mẹ không đổi
    ["Roblox Player", "robloxplayerbeta.exe", "chua_xep"],
    ["Scratch Desktop", "scratch 3.exe", "chua_xep"],
  ]);
  assert.equal(ds.ds.find((x: any) => x.muc === "scratch 3.exe").icon, null);
  assert.equal(ds.ds.find((x: any) => x.muc === "robloxplayerbeta.exe").icon, ROBLOX.icon);
  // gửi đủ lần nữa thay toàn bộ
  await goiMay("ung-dung", tok, { du: true, bam: "d".repeat(64), ds: [ROBLOX] });
  assert.equal((await goiBm(`may/${mayId}/ung-dung`, tokBm)).body.ds.length, 1);
  // gửi đủ mà thiếu ds ⇒ 400, không xoá sạch
  assert.equal((await goiMay("ung-dung", tok, { du: true, bam: "e".repeat(64) })).status, 400);
  assert.equal((await goiBm(`may/${mayId}/ung-dung`, tokBm)).body.ds.length, 1);
  // thiếu bam ⇒ 400
  assert.equal((await goiMay("ung-dung", tok, { du: true, ds: [] })).status, 400);
});

test("Ba Mẹ đặt Chặn theo định danh thật ⇒ blockedApps của máy có đường dẫn + thư mục + băm; Cho phép / Học tập vào allowedApps; bỏ ⇒ chưa xếp", async () => {
  const { tok, mayId, tokBm, con } = await nha();
  await goiMay("ung-dung", tok, { du: true, bam: "a".repeat(64), ds: [ROBLOX, MINECRAFT, SCRATCH] });
  // app không có trên máy ⇒ 404 (không cho gõ tay định danh)
  assert.equal((await goiBm(`may/${mayId}/ung-dung/dat`, tokBm, { khoa: "exe:c:\\game.exe", trangThai: "chan" })).status, 404);
  assert.equal((await goiBm(`may/${mayId}/ung-dung/dat`, tokBm, { khoa: ROBLOX.khoa, trangThai: "mo_het" })).status, 400);
  const dat = await goiBm(`may/${mayId}/ung-dung/dat`, tokBm, { khoa: ROBLOX.khoa, trangThai: "chan" });
  assert.equal(dat.status, 200);
  assert.equal(dat.body.muc, "robloxplayerbeta.exe");
  assert.equal(dat.body.con, con);                                       // máy riêng của Con ⇒ luật riêng của Con đó
  assert.equal(dat.body.truoc, null);
  await goiBm(`may/${mayId}/ung-dung/dat`, tokBm, { khoa: MINECRAFT.khoa, trangThai: "cho_phep" });
  await goiBm(`may/${mayId}/ung-dung/dat`, tokBm, { khoa: SCRATCH.khoa, trangThai: "hoc" });
  const ds = (await goiBm(`may/${mayId}/ung-dung`, tokBm)).body.ds;
  assert.deepEqual(Object.fromEntries(ds.map((x: any) => [x.muc, x.trangThai])),
    { "robloxplayerbeta.exe": "chan", "microsoft.minecraftuwp": "cho_phep", "scratch 3.exe": "hoc" });
  const db = (await goiMay("dong-bo", tok, {})).body;
  assert.deepEqual(db.windows.blockedApps, [{ muc: "robloxplayerbeta.exe", duongDan: ROBLOX.duongDan, thuMuc: ROBLOX.thuMuc, sha256: "ab".repeat(32), nhaPhatHanh: "Roblox Corporation" }]);
  // gói Store không đuôi .exe vẫn vào allowedApps (biết là app nhờ danh sách thật); app bị Chặn không vào
  assert.ok(db.windows.allowedApps.includes("microsoft.minecraftuwp"));
  assert.ok(db.windows.allowedApps.includes("scratch 3.exe"));
  assert.ok(!db.windows.allowedApps.includes("robloxplayerbeta.exe"));
  assert.equal(db.danhSachApp.bam, "a".repeat(64));
  // gói Store không lọt vào danh sách web (chính sách trình duyệt) như một tên miền
  assert.ok(![...db.windows.web.chan, ...db.windows.web.cho].includes("microsoft.minecraftuwp"));
  // agent bị sửa gửi «youtube.com» như app không gỡ được luật web của Ba Mẹ
  await goiBm("luat", tokBm, { muc: "youtube.com", loai: "chan" });
  await goiMay("ung-dung", tok, { du: false, bamTruoc: "a".repeat(64), bam: "c".repeat(64), them: [{ khoa: "x", muc: "youtube.com", ten: "x" }], bo: [] });
  assert.ok((await goiMay("dong-bo", tok, {})).body.windows.web.chan.includes("youtube.com"));
  await goiMay("ung-dung", tok, { du: false, bamTruoc: "c".repeat(64), bam: "a".repeat(64), them: [], bo: ["x"] });
  assert.equal(db.danhSachApp.yeuCau, null);
  // «Cho phép» tính Tiện ích ở thời gian màn hình, «Học tập» tính Học tập
  const luat = [{ child_id: "", muc: "microsoft.minecraftuwp", ten: "Minecraft", loai: "hoc", nhom: "cho_phep" }, { child_id: "", muc: "scratch 3.exe", ten: "Scratch", loai: "hoc", nhom: "khac" }] as any;
  assert.equal(xepMuc("microsoft.minecraftuwp", luat).muc, "tien_ich");
  assert.equal(xepMuc("scratch 3.exe", luat).muc, "hoc");
  // bỏ luật ⇒ về chưa xếp, trả luật cũ để Hoàn tác
  const bo = await goiBm(`may/${mayId}/ung-dung/dat`, tokBm, { khoa: ROBLOX.khoa, trangThai: "bo" });
  assert.equal(bo.body.truoc.loai, "chan");
  assert.equal((await goiBm(`may/${mayId}/ung-dung`, tokBm)).body.ds.find((x: any) => x.khoa === ROBLOX.khoa).trangThai, "chua_xep");
  assert.deepEqual((await goiMay("dong-bo", tok, {})).body.windows.blockedApps, []);
});

test("Làm mới: yeuCau đổi trong dong-bo; vai Chỉ xem không đặt được; máy nhà khác không thấy", async () => {
  const { tok, mayId, tokBm, fam } = await nha();
  const lm = await goiBm(`may/${mayId}/ung-dung/lam-moi`, tokBm, {});
  assert.equal(lm.status, 200);
  const db = (await goiMay("dong-bo", tok, {})).body;
  assert.equal(db.danhSachApp.yeuCau, lm.body.yeuCauLuc);
  assert.equal(db.danhSachApp.bam, null);
  const xem = await taoPhien(await taoBaMe(fam, "Bà", "xem"));
  assert.equal((await goiBm(`may/${mayId}/ung-dung`, xem)).status, 200);
  assert.equal((await goiBm(`may/${mayId}/ung-dung/dat`, xem, { khoa: "x", trangThai: "chan" })).status, 403);
  const khac = await nha();
  assert.equal((await goiBm(`may/${mayId}/ung-dung`, khac.tokBm)).status, 404);
});

test("Mac: bundle id + Team ID; luật Chặn cả nhà không có trong danh sách ⇒ chỉ muc; Android: gói lạ (ru.*) vẫn là app trong chinhSach.ungDung.chan", async () => {
  const mac = await nha("mac");
  const TELE = { khoa: "ru.keepcoder.Telegram", muc: "ru.keepcoder.Telegram", ten: "Telegram", nguon: "applications", teamId: "6n38vwS5bx", nhaPhatHanh: "Developer ID Application: Telegram FZ-LLC", duongDan: "/Applications/Telegram.app" };
  assert.equal((await goiMay("ung-dung", mac.tok, { du: true, bam: "e".repeat(64), ds: [TELE] })).status, 200);
  await goiBm(`may/${mac.mayId}/ung-dung/dat`, mac.tokBm, { khoa: "ru.keepcoder.telegram", trangThai: "chan" });
  await goiBm("luat", mac.tokBm, { muc: "com.roblox.RobloxPlayer", loai: "chan" });       // luật cả nhà ở màn cũ
  const w = (await goiMay("dong-bo", mac.tok, {})).body.windows;
  assert.deepEqual(w.blockedApps, [
    { muc: "ru.keepcoder.telegram", duongDan: "/Applications/Telegram.app", nhaPhatHanh: TELE.nhaPhatHanh, teamId: "6N38VWS5BX" },
    { muc: "com.roblox.robloxplayer" },
  ]);
  const an = await nha("android");
  await goiMay("ung-dung", an.tok, { du: true, bam: "f".repeat(64), ds: [{ khoa: "ru.ok.android", muc: "ru.ok.android", ten: "OK", nguon: "launcher" }] });
  await goiBm(`may/${an.mayId}/ung-dung/dat`, an.tokBm, { khoa: "ru.ok.android", trangThai: "chan" });
  const nh = (await goiMay("nhip", an.tok, {})).body;
  assert.deepEqual(nh.chinhSach.ungDung.chan, [{ muc: "ru.ok.android", kieu: "app" }]);
  assert.equal(nh.danhSachApp.bam, "f".repeat(64));
  // package Android phân biệt hoa thường: giữ đúng com.UCMobile.intl từ máy tới chinhSach (luật vẫn lưu chữ thường)
  await goiMay("ung-dung", an.tok, { du: false, bamTruoc: "f".repeat(64), bam: "9".repeat(64), them: [{ khoa: "com.UCMobile.intl", muc: "com.UCMobile.intl", ten: "UC Browser", nguon: "launcher" }] });
  const ds = (await goiBm(`may/${an.mayId}/ung-dung`, an.tokBm)).body.ds;
  assert.ok(ds.some((x: any) => x.khoa === "com.UCMobile.intl" && x.muc === "com.UCMobile.intl"));
  assert.equal((await goiBm(`may/${an.mayId}/ung-dung/dat`, an.tokBm, { khoa: "com.UCMobile.intl", trangThai: "chan" })).status, 200);
  assert.equal((await goiBm(`may/${an.mayId}/ung-dung`, an.tokBm)).body.ds.find((x: any) => x.khoa === "com.UCMobile.intl").trangThai, "chan");
  const cs2 = (await goiMay("nhip", an.tok, {})).body.chinhSach.ungDung.chan;
  assert.ok(cs2.some((x: any) => x.muc === "com.UCMobile.intl" && x.kieu === "app"), JSON.stringify(cs2));
});

test("luồng xếp loại cũ: tên thật từ danh sách máy thay tên đoán ở «Chưa xếp»", async () => {
  const { tok, tokBm } = await nha();
  await goiMay("ung-dung", tok, { du: true, bam: "a".repeat(64), ds: [ROBLOX] });
  const { q } = await import("./db.ts");
  const may = (await q<{ id: string; child_id: string }>(`select id, child_id from devices where token_hash is not null order by created_at desc limit 1`))[0];
  await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut) values ($1, $2, to_char(now(), 'YYYY-MM-DD'), 'robloxplayerbeta.exe', 'chua_phan_loai', 12)`, [may.id, may.child_id]);
  const l = (await goiBm("luat?thay=1", tokBm)).body;
  assert.equal(l.chuaXep.find((x: any) => x.muc === "robloxplayerbeta.exe")?.ten, "Roblox Player");
});

test("icon theo băm: gửi đủ không kèm ảnh giữ icon cũ khi iconBam trùng; băm mới không ảnh ⇒ thieuIcon", async () => {
  const { tok, mayId, tokBm } = await nha();
  const png = Buffer.from("png-that-96").toString("base64");
  const { createHash } = await import("node:crypto");
  const bamIcon = createHash("sha256").update(Buffer.from(png, "base64")).digest("hex");
  await goiMay("ung-dung", tok, { du: true, bam: "1".repeat(64), ds: [{ ...SCRATCH, icon: png }] });
  const r = await goiMay("ung-dung", tok, { du: true, bam: "2".repeat(64), ds: [{ ...SCRATCH, iconBam: bamIcon }, { ...NOTEPAD, iconBam: "f".repeat(64) }] });
  assert.deepEqual(r.body.thieuIcon, [NOTEPAD.khoa]);
  const ds = (await goiBm(`may/${mayId}/ung-dung`, tokBm)).body.ds;
  assert.equal(ds.find((x: any) => x.muc === "scratch 3.exe").icon, png);
  await goiMay("ung-dung", tok, { du: false, bamTruoc: "2".repeat(64), bam: "3".repeat(64), them: [{ ...NOTEPAD, icon: png, iconBam: "f".repeat(64) }], bo: [] });
  assert.equal((await goiBm(`may/${mayId}/ung-dung`, tokBm)).body.ds.find((x: any) => x.muc === "notepad.exe").icon, png);
});

test("sachApp: chặn định danh có «/» hoặc «..», team id sai bị bỏ, sha256 phải 64 hex; tên tệp có dấu / CJK hợp lệ", () => {
  assert.equal(am.sachApp({ khoa: "a", muc: "原神.exe", ten: "Genshin" })?.muc, "原神.exe");
  assert.equal(am.sachApp({ khoa: "a", muc: "Ho\u0323c.exe", ten: "H" })?.muc, "học.exe");     // NFD ⇒ NFC
  assert.equal(am.sachApp({ khoa: "a", muc: "Tom's Game.exe", ten: "T" })?.muc, "tom's game.exe");
  assert.equal(am.sachApp({ khoa: "a", muc: "../x.exe", ten: "X" }), null);
  assert.equal(am.sachApp({ khoa: "a", muc: "c:/x.exe", ten: "X" }), null);
  const a = am.sachApp({ khoa: "A", muc: "Game.EXE", ten: " Game ", teamId: "bad id!", sha256: "zz" })!;
  assert.deepEqual([a.khoa, a.muc, a.ten, a.team_id, a.sha256], ["a", "game.exe", "Game", null, null]);
});
