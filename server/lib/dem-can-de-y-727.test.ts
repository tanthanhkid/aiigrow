// #727 (phần A): một hàm đếm cho «Cần Ba Mẹ để ý» / chuông / chấm tab; tên app qua một hàm; tiến trình nền lọc lúc HIỂN THỊ.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const { q, newId } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const cdy = await import("./can-de-y.ts");
const la = await import("./luat-app.ts");
const { tenAppDep } = await import("./ten-app.ts");
const { thoiGianManHinh } = await import("./man-hinh.ts");
const { dsThongBao } = await import("./thong-bao.ts");

async function nha() {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Phi" });
  return { fam, bm, con };
}
const xin = (con: string, giaTri: string, tenApp: string | null = null, loai = "cai_app") =>
  q(`insert into requests(id, child_id, loai, gia_tri, ten_app, ly_do, het_han) values ($1,$2,$3,$4,$5,'', now() + interval '1 day')`, [newId(), con, loai, giaTri, tenApp]);

test("tenAppDep: tên thật agent gửi thắng; tên tệp lạ viết đẹp; mã gói lạ ⇒ App lạ; không lộ .exe", () => {
  assert.equal(tenAppDep("solitaire.exe"), "Solitaire");
  assert.equal(tenAppDep("microsoft.photos.exe"), "Ảnh");
  assert.equal(tenAppDep("zzz.exe", "Trình ghi hình Zzz"), "Trình ghi hình Zzz");
  assert.equal(tenAppDep("zzz.exe", "zzz.exe"), "Zzz");
  assert.equal(tenAppDep("com.snapchat.android"), "App lạ");
});

test("tiến trình nền: bảng đủ các tên trong #727, lời xin của nó không hiện", () => {
  for (const m of ["Applicationframehost", "shellexperiencehost.exe", "Lockapp", "Searchapp", "Dax3api.exe", "Filecoauth.exe", "Rsappui.exe", "hxtsr.exe", "sdxhelper.exe"])
    assert.ok(la.laTienTrinhNenWindows(m), m);
  assert.ok(!la.laTienTrinhNenWindows("solitaire.exe"));
  assert.equal(la.loiXinHienDuoc({ loai: "cai_app", gia_tri: "hxtsr.exe" }), false);
  assert.equal(la.loiXinHienDuoc({ loai: "cai_app", gia_tri: "solitaire.exe" }), true);
});

test("chuông = thẻ = Chờ duyệt: mỗi lời xin một dòng, hxtsr bị lọc, tên đã qua tenAppDep; demCanDeY khớp ds", async () => {
  const { fam, con } = await nha();
  const yc = await import("./yeu-cau.ts");
  await xin(con, "solitaire.exe"); await xin(con, "microsoft.photos.exe"); await xin(con, "hxtsr.exe"); await xin(con, "sdxhelper.exe");
  const cho = await yc.dsChoYc(fam);
  assert.deepEqual(cho.map((x) => x.gia_tri).sort(), ["microsoft.photos.exe", "solitaire.exe"], "Chờ duyệt đã lọc tiến trình nền");
  const c = await cdy.canDeY(fam);
  const rows = c.ds.filter((x) => x.loai === "con_xin");
  assert.equal(rows.length, cho.length, "chuông đếm đúng số lời xin hiện ở Chờ duyệt");
  assert.deepEqual(rows.map((x) => x.tieu).sort(), ["Xin mở Solitaire", "Xin mở Ảnh"]);
  assert.ok(rows.every((x) => !/\.exe/i.test(`${x.tieu} ${x.phu}`)));
  assert.equal(c.soChuong, cdy.demCanDeY(c.ds));
  assert.equal(c.soChuong, c.ds.length);
  assert.equal(cdy.demCanDeY(c.ds, { con }), c.ds.length);
  assert.equal(cdy.demCanDeY(c.ds, { con: "khac" }), c.ds.filter((x) => !x.con).length);
  assert.equal(cdy.demCanDeY([{ loai: "nop_bai", con }, { loai: "con_xin", con }], { boNopBai: true }), 1);
  assert.equal(c.soTab, cdy.demCanDeY(c.ds, { boNopBai: true }));
});

test("thông báo «Để biết»: lời xin của tiến trình nền không báo, tên app không lộ .exe", async () => {
  const { fam, con } = await nha();
  const bm = (await q<{ id: string }>(`select id from parents where family_id = $1`, [fam]))[0]!.id;
  for (const [gt, ta] of [["hxtsr.exe", null], ["solitaire.exe", null]] as const)
    await q(`insert into events(id, family_id, loai, child_id, chi_tiet) values ($1,$2,'gui_yeu_cau',$3,$4::text::jsonb)`, [newId(), fam, con, JSON.stringify({ loai: "cai_app", gia_tri: gt, ten_app: ta })]);
  const r = await dsThongBao({ id: bm, family_id: fam } as never);
  const tieu = r.ds.map((x: { tieu: string }) => x.tieu);
  assert.ok(tieu.some((t: string) => /Solitaire/.test(t)) && !tieu.some((t: string) => /hxtsr|\.exe/i.test(t)), tieu.join(" | "));
});

test("Màn Hình Cả tuần: tiến trình nền lọc lúc hiển thị (dữ liệu cũ), app thật còn; luật riêng của Ba Mẹ thì giữ", async () => {
  const { fam, con } = await nha();
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Máy Phi");
  const now = new Date("2026-11-26T10:00:00+07:00");
  for (const [muc, phut] of [["applicationframehost.exe", 30], ["searchapp.exe", 20], ["dax3api.exe", 5], ["solitaire.exe", 10]] as const)
    await q(`insert into usage(child_id, device_id, ngay, muc, loai, phut) values ($1,$2,'2026-11-26',$3,'chua_phan_loai',$4)`, [con, may.deviceId, muc, phut]);
  const r = await thoiGianManHinh(fam, con, 0, now);
  assert.deepEqual(r.ds.map((x) => x.id), ["solitaire.exe"]);
  assert.equal(r.tongGiay, 600);
});
