// #418: khay AiiGrow cũ sau cập nhật («AiiGrow.Tray.exe.cu-xxxxxxxx») bị tính là app Con dùng ⇒ «app mới chờ Ba Mẹ xếp» + trừ sao.
// Máy chủ lọc (máy chưa cập nhật vẫn báo) + script hoàn sao / xoá «app mới» một lần (scripts/hoan-sao-418.ts).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const v = await import("./vi.ts");
const la = await import("./luat-app.ts");
const don = await import("./don-app-aiigrow.ts");
const { homNayDung } = await import("./hom-nay-dung.ts");
const { xuLyM } = await import("./api-m.ts");
const { xuLyMay } = await import("./api-may.ts");
const { taoPhien } = await import("./auth.ts");
const { q, one, newId } = await import("./db.ts");
const { taoNha, luonChoiDuoc } = await import("./test-fixtures/nha.ts");

const goi = (xuLy: (r: Request, p: string[]) => Promise<Response>, goc: string) => async (tok: string, duong: string, body?: unknown) => {
  const r = await xuLy(new Request(`http://x/api/${goc}/${duong}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), duong.split("?")[0].split("/"));
  return { status: r.status, body: (await r.json()) as any };
};
const m = goi(xuLyM, "m"), dv = goi(xuLyMay, "device");
const KHAY_CU = "aiigrow.tray.exe.cu-623a59b6.exe";

test("laAppAiiGrow: đúng tên exe của AiiGrow (kể cả khay cũ «.cu-») + bundle / gói vn.aiilab.aiigrow*; game đổi tên «aiigrow.*» không lọt", () => {
  for (const x of [KHAY_CU, "AiiGrow.Tray.exe.cu-623A59B6", "aiigrow.tray.exe", "aiigrow.kid.exe", "aiigrow.service.exe", "aiigrow.setup.exe.cu-0a1b2c3d.exe",
    "vn.aiilab.aiigrow", "vn.aiilab.aiigrow.tray", "vn.aiilab.aiigrow.con", " Vn.Aiilab.AiiGrow.Tray "])
    assert.equal(la.laAppAiiGrow(x), true, x);
  for (const x of ["aiigrow.game.exe", "aiigrow.tray.exe.cu-roblox.exe", "roblox.exe", "aiigrow.aiilab.vn", "vn.aiilab.aiigrowx", "com.vn.aiilab.aiigrow", "", null])
    assert.equal(la.laAppAiiGrow(x), false, String(x));
  assert.equal(la.phanLoaiTu([], "c", KHAY_CU), "he_thong");
  assert.equal(la.phanLoaiTu([], "c", "vn.aiilab.aiigrow.tray"), "he_thong");
  assert.equal(la.phanLoaiTu([], "c", "roblox.exe"), "chua_phan_loai");
  // dòng sổ trừ sao gắn với app AiiGrow: theo ref (mục) hoặc lý do «Chơi Aiigrow tray exe cu …»
  assert.equal(don.laTruNham(`choi:2026-11-19:${KHAY_CU}`, "Chơi X 1 phút"), true);
  assert.equal(don.laTruNham(null, "Chơi Aiigrow tray exe cu 623a59b6 1 phút"), true);
  assert.equal(don.laTruNham("choi:2026-11-19:roblox.exe", "Chơi Roblox 5 phút"), false);
  assert.equal(don.laTruNham("choi:2026-11-19:", "Chơi Tính phút 3 phút"), false);
});

test("đồng bộ agent: khay cũ «aiigrow.tray.exe.cu-…» (máy chưa cập nhật) không ghi đã dùng, không «app mới», không trừ sao; app thật vẫn trừ", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Tú Linh" });
  await luonChoiDuoc(con);
  await v.dieuChinhTay(fam, con, 20, "Thưởng", bm);
  await la.datLuat(fam, { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" });
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "TULINH");
  await dv(may.token, "dong-bo", { usage: [{ muc: KHAY_CU, phut: 3 }, { muc: "aiigrow.tray.exe", phut: 2 }, { muc: "roblox.exe", phut: 4 }] });
  assert.equal(await v.soDu(con), 16, "chỉ 4 phút Roblox trừ sao");
  assert.deepEqual((await q<{ muc: string }>(`select muc from usage where child_id = $1 order by muc`, [con])).map((r) => r.muc), ["roblox.exe"]);
  const tok = await taoPhien(bm);
  const l = (await m(tok, "luat")).body;
  assert.equal(l.chuaXep.some((x: any) => /aiigrow/.test(x.muc)), false, "không «app mới chờ Ba Mẹ xếp»");
  assert.equal((await homNayDung(fam, con)).dung.some((x) => /aiigrow/.test(x.muc)), false);
});

test("script hoàn sao #418: xem trước không ghi; chạy hoàn đúng dòng trừ nhầm + xoá «app mới»; chạy lại không hoàn đôi", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Tú Linh" });
  await v.dieuChinhTay(fam, con, 20, "Thưởng", bm);
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "TULINH");
  // dữ liệu như bản máy chủ cũ đã ghi: «app mới» chưa xếp + một dòng trừ sao gắn mục khay cũ + một dòng trừ đúng (Roblox)
  await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut) values ($1,$2,'2026-11-19',$3,'chua_phan_loai',1),
           ($1,$2,'2026-11-19','roblox.exe','giai_tri',5)`, [may.deviceId, con, KHAY_CU]);
  await q(`insert into app_rules(family_id, child_id, muc, ten, loai, nhom) values ($1,'',$2,'Aiigrow tray exe cu 623a59b6','giai_tri','khac')`, [fam, KHAY_CU]);
  const truNham = newId(), truDung = newId(), truLyDo = newId();
  await q(`insert into points(id, child_id, delta, loai, ly_do, ref) values ($1,$2,-1,'choi','Chơi Aiigrow tray exe cu 623a59b6 1 phút',$3),
           ($4,$2,-5,'choi','Chơi Roblox 5 phút','choi:2026-11-19:roblox.exe'),
           ($5,$2,-2,'choi','Chơi Aiigrow tray exe cu 623a59b6 2 phút',null)`,
    [truNham, con, `choi:2026-11-19:${KHAY_CU}`, truDung, truLyDo]);
  assert.equal(await v.soDu(con), 12);

  const xem = await don.donAppAiiGrow();
  assert.deepEqual([xem.chay, xem.hoan.map((h) => h.points_id).sort(), xem.tongSao, xem.usage.map((u) => u.muc), xem.luat.map((x) => x.muc)],
    [false, [truNham, truLyDo].sort(), 3, [KHAY_CU], [KHAY_CU]]);
  assert.equal(await v.soDu(con), 12, "xem trước không ghi");
  assert.ok(await one(`select 1 from usage where muc = $1`, [KHAY_CU]));

  const kq = await don.donAppAiiGrow({ chay: true });
  assert.deepEqual([kq.chay, kq.tongSao, kq.usage.length, kq.luat.length], [true, 3, 1, 1]);
  assert.equal(await v.soDu(con), 15, "hoàn 1 + 2 sao, giữ phần trừ đúng của Roblox");
  assert.equal(await one(`select 1 from usage where muc = $1`, [KHAY_CU]), undefined);
  assert.ok(await one(`select 1 from usage where muc = 'roblox.exe' and child_id = $1`, [con]));
  assert.equal(await one(`select 1 from app_rules where muc = $1`, [KHAY_CU]), undefined);
  assert.deepEqual((await q<{ ref: string; delta: number }>(`select ref, delta from points where child_id = $1 and loai = 'hoan' order by delta`, [con]))
    .map((r) => [r.ref, r.delta]), [[`hoan-418:${truNham}`, 1], [`hoan-418:${truLyDo}`, 2]]);

  const lai = await don.donAppAiiGrow({ chay: true });
  assert.deepEqual([lai.hoan.length, lai.tongSao, lai.usage.length, lai.luat.length], [0, 0, 0, 0]);
  assert.equal(await v.soDu(con), 15, "chạy lại không hoàn đôi");
});
