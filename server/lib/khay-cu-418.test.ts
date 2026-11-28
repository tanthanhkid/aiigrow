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

test("laAppAiiGrow: đúng tên khay / app Con của AiiGrow (kể cả khay cũ «.cu-») + bundle / gói AiiGrow; game đổi tên «aiigrow.*» không lọt", () => {
  for (const x of [KHAY_CU, "AiiGrow.Tray.exe.cu-623A59B6.exe", "aiigrow.tray.exe", "aiigrow.kid.exe",
    "vn.aiilab.aiigrow", "vn.aiilab.aiigrow.con", " Vn.Aiilab.AiiGrow.Con "])
    assert.equal(la.laAppAiiGrow(x), true, x);
  for (const x of ["aiigrow.game.exe", "aiigrow.setup.exe", "aiigrow.tray.exe.cu-roblox.exe", "aiigrow.tray.exe.exe", "aiigrow.tray", "roblox.exe",
    "aiigrow.aiilab.vn", "vn.aiilab.aiigrow.game", "vn.aiilab.aiigrow.tray", "com.vn.aiilab.aiigrow", "", null])
    assert.equal(la.laAppAiiGrow(x), false, String(x));
  assert.equal(la.phanLoaiTu([], "c", KHAY_CU), "he_thong");
  assert.equal(la.phanLoaiTu([], "c", "vn.aiilab.aiigrow.con"), "he_thong");
  assert.deepEqual([KHAY_CU, "aiigrow.tray.exe", "vn.aiilab.aiigrow"].map(la.laKhayCuAiiGrow), [true, false, false]);
  assert.equal(la.phanLoaiTu([], "c", "roblox.exe"), "chua_phan_loai");
});

test("đồng bộ agent: khay cũ «aiigrow.tray.exe.cu-…» (máy chưa cập nhật) không ghi đã dùng, không «app mới», không trừ sao; #780: khay thường cũng không ghi; app thật vẫn trừ", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Tú Linh" });
  await luonChoiDuoc(con);
  await v.dieuChinhTay(fam, con, 20, "Thưởng", bm);
  await la.datLuat(fam, { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" });
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "TULINH");
  await dv(may.token, "dong-bo", { usage: [{ muc: KHAY_CU, phut: 3 }, { muc: "aiigrow.tray.exe", phut: 2 }, { muc: "roblox.exe", phut: 4 }] });
  assert.equal(await v.soDu(con), 16, "chỉ 4 phút Roblox trừ sao");
  // #780: dòng khay thường (phut-da-dem.json bản cũ còn giữ) cũng bỏ — không còn «AiiGrow.Tray N phút» trong «đã dùng»
  assert.deepEqual((await q<{ muc: string }>(`select muc from usage where child_id = $1 order by muc`, [con])).map((r) => r.muc), ["roblox.exe"]);
  const tok = await taoPhien(bm);
  const l = (await m(tok, "luat")).body;
  assert.equal(l.chuaXep.some((x: any) => /aiigrow/.test(x.muc)), false, "không «app mới chờ Ba Mẹ xếp»");
  assert.equal((await homNayDung(fam, con)).dung.some((x) => /\.cu-/.test(x.muc)), false);
});

test("script hoàn sao #418: xem trước không ghi; hoàn theo (Con, ngày) = min(phút AiiGrow «Tính phút», sao đã trừ − phút app Tính phút khác); xoá «app mới»; chạy lại không hoàn đôi", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Tú Linh" });
  const be2 = await g.taoCon(fam, { ten: "Bi" });
  await v.dieuChinhTay(fam, con, 30, "Thưởng", bm);
  await v.dieuChinhTay(fam, be2, 30, "Thưởng", bm);
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "TULINH");
  // dữ liệu như bản máy chủ cũ đã ghi. Ngày 18: Ba Mẹ lỡ xếp khay cũ vào «Tính phút» ⇒ 3 phút khay + 2 phút Roblox cùng một dòng trừ −5
  // (ghi tên app nhiều phút nhất = khay), nhịp sau Roblox 4 + khay 1 gộp dòng Roblox −5 ⇒ hoàn đúng 4, không 5 hay 10.
  // Ngày 19 (Tú Linh): khay «chưa xếp» 1 phút — chỉ hiện «−1 sao», không trừ ⇒ không hoàn. Bé Bi: dùng 2 phút khay giai_tri, chưa bị trừ ⇒ 0.
  await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut) values
           ($1,$2,'2026-11-18',$3,'giai_tri',4), ($1,$2,'2026-11-18','roblox.exe','giai_tri',6),
           ($1,$2,'2026-11-19',$3,'chua_phan_loai',1), ($1,$4,'2026-11-18',$3,'giai_tri',2),
           ($1,$2,'2026-11-18','aiigrow.tray.exe','he_thong',7)`, [may.deviceId, con, KHAY_CU, be2]);
  await q(`insert into app_rules(family_id, child_id, muc, ten, loai, nhom) values ($1,'',$2,'Aiigrow tray exe cu 623a59b6','giai_tri','khac')`, [fam, KHAY_CU]);
  await q(`insert into points(id, child_id, delta, loai, ly_do, ref) values
           ($1,$3,-5,'choi','Chơi Aiigrow tray exe cu 623a59b6 5 phút',$4), ($2,$3,-5,'choi','Chơi Roblox 5 phút','choi:2026-11-18:roblox.exe'),
           ($5,$3,-1,'choi','Chơi Roblox 1 phút','choi:2026-11-19:roblox.exe')`,
    [newId(), newId(), con, `choi:2026-11-18:${KHAY_CU}`, newId()]);
  assert.equal(await v.soDu(con), 19);

  const xem = await don.donAppAiiGrow();
  assert.deepEqual([xem.chay, xem.hoan, xem.tongSao, xem.usage.length, xem.luat.map((x) => x.muc)],
    [false, [{ child_id: con, ngay: "2026-11-18", sao: 4, phutAiiGrow: 4, saoDaTru: 10, phutAppKhac: 6 }], 4, 3, [KHAY_CU]]);
  assert.equal(await v.soDu(con), 19, "xem trước không ghi");
  assert.ok(await one(`select 1 from usage where muc = $1`, [KHAY_CU]));

  const kq = await don.donAppAiiGrow({ chay: true });
  assert.deepEqual([kq.chay, kq.tongSao, kq.usage.length, kq.luat.length], [true, 4, 3, 1]);
  assert.deepEqual([await v.soDu(con), await v.soDu(be2)], [23, 30], "hoàn 4 sao phút khay; giữ phần Roblox; bé chưa bị trừ không được cộng");
  assert.equal(await one(`select 1 from usage where muc = $1`, [KHAY_CU]), undefined);
  assert.ok(await one(`select 1 from usage where muc = 'roblox.exe' and child_id = $1`, [con]));
  assert.ok(await one(`select 1 from usage where muc = 'aiigrow.tray.exe' and child_id = $1`, [con]), "khay thường (hệ thống) giữ nguyên");
  assert.equal(await one(`select 1 from app_rules where muc = $1`, [KHAY_CU]), undefined);
  assert.deepEqual((await q<{ ref: string; delta: number }>(`select ref, delta from points where child_id = $1 and loai = 'hoan'`, [con]))
    .map((r) => [r.ref, r.delta]), [[`hoan-418:${con}:2026-11-18`, 4]]);

  // chạy lại (kể cả khi usage còn — vd máy chưa cập nhật gửi lại trước lúc chạy) không hoàn đôi
  await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut) values ($1,$2,'2026-11-18',$3,'giai_tri',4)`, [may.deviceId, con, KHAY_CU]);
  const lai = await don.donAppAiiGrow({ chay: true });
  assert.deepEqual([lai.hoan.length, lai.tongSao, lai.usage.length, lai.luat.length], [0, 0, 1, 0]);
  assert.equal(await v.soDu(con), 23, "chạy lại không hoàn đôi");
});
