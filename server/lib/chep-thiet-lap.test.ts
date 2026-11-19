// #420 «Giống <con trước>»: GET/POST con/:id/chep-tu — chép App & web + việc mỗi ngày + chơi bằng sao trong một giao dịch, thay luật cũ của Con đích.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyM } = await import("./api-m.ts");
const g = await import("./gia-dinh.ts");
const { one, q } = await import("./db.ts");
const { taoNha, taoBaMe } = await import("./test-fixtures/nha.ts");
const { taoPhien } = await import("./auth.ts");

const m = async (tok: string, duong: string, body?: unknown) => {
  const r = await xuLyM(new Request(`http://x/api/m/${duong}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), duong.split("?")[0].split("/"));
  return { status: r.status, body: (await r.json()) as any };
};

/** Nhà có Bảo Anh đã thiết lập đủ (Theo danh sách, 2 app + 1 app theo tên + 2 web, giới hạn, 40 sao khởi đầu, 2 việc riêng) + Bảo Minh mới tạo. */
async function nha() {
  const { fam, bm } = await taoNha();
  const tok = await taoPhien(bm);
  const r = await m(tok, "thiet-lap", { con: { ten: "Bảo Anh" }, saoKhoiDau: 40, cheDo: "theo_danh_sach", gioiHanNgayThuong: 60, gioiHanCuoiTuan: 90, phutMoiLuot: 30,
    apps: [{ ma: "roblox" }, { ma: "youtube_kids" }, { ten: "Vẽ Tranh", tinhGio: false, nhom: "khong_tinh_phut" }],
    web: [{ muc: "vioedu.vn", nhom: "khong_tinh_phut" }, { muc: "youtube.com", nhom: "tinh_phut" }] });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const a = r.body.conId as string;
  for (const [ten, nhom] of [["Đọc sách 15 phút", "hoc_tap"], ["Nhảy dây", "van_dong"]])
    assert.equal((await m(tok, "nhiem-vu", { ten, diem: 5, nhom, giao_cho: a, lap_lai: "hang_ngay" })).status, 200);
  const b = await g.taoCon(fam, { ten: "Bảo Minh", saoKhoiDau: 0 }, bm);
  return { fam, bm, tok, a, b };
}
const luat = async (fam: string, con: string) =>
  (await q<{ muc: string; loai: string }>(`select muc, loai from app_rules where family_id = $1 and child_id = $2 and het is null order by muc`, [fam, con])).map((x) => `${x.muc}:${x.loai}`);
const viec = async (con: string) => (await q<{ ten: string; bat: boolean }>(`select ten, bat from tasks where giao_cho = $1 order by ten`, [con]));
const khoiDau = async (con: string) => (await one<{ s: number }>(`select coalesce(sum(delta), 0)::int as s from points where child_id = $1 and loai = 'khoi_dau'`, [con]))!.s;

test("GET chep-tu: liệt kê Con khác trong nhà + tóm tắt (chế độ, số app/web, Tính phút, số việc, nhóm việc)", async () => {
  const { fam, tok, a, b } = await nha();
  assert.equal((await m(tok, "nhiem-vu", { ten: "Việc chung cả nhà", diem: 5 })).status, 200);       // việc chung không tính vào «Sẽ chép»
  await q(`insert into app_rules(family_id, child_id, muc, ten, loai) values ($1, $2, 'roblox2.exe', 'Roblox', 'giai_tri')`, [fam, a]);   // trùng tên app
  const r = await m(tok, `con/${b}/chep-tu`);
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal(r.body.ds.length, 1);
  assert.equal(r.body.thu, 2, "Bảo Minh là con thứ 2");
  const x = r.body.ds[0];
  assert.equal(x.id, a);
  assert.equal(x.ten, "Bảo Anh");
  assert.equal(x.cheDo, "theo_danh_sach");
  assert.equal(x.soApp, 3);
  assert.equal(x.soWeb, 2);
  assert.equal(x.soViec, 2);
  assert.deepEqual(x.nhomViec, ["hoc_tap", "van_dong"]);
  assert.ok(x.tinhPhut.includes("Roblox") && x.tinhPhut.includes("youtube.com"), JSON.stringify(x.tinhPhut));
  assert.equal(new Set(x.tinhPhut).size, x.tinhPhut.length, "không trùng tên");
  assert.equal(x.saoKhoiDau, 40);
});

test("POST chep-tu: chép chế độ, app/web (giữ nhóm Tính phút), app theo tên, giới hạn, việc riêng, sao khởi đầu; thay luật cũ của Con đích; sau đó sửa riêng được", async () => {
  const { fam, tok, a, b } = await nha();
  // Con đích đã có luật / việc riêng cũ (vd «Thêm con» đã áp bộ mặc định) ⇒ bị thay
  await q(`insert into app_rules(family_id, child_id, muc, ten, loai) values ($1, $2, 'minecraft.exe', 'Minecraft', 'giai_tri')`, [fam, b]);
  assert.equal((await m(tok, "nhiem-vu", { ten: "Việc cũ", diem: 3, giao_cho: b })).status, 200);
  await q(`update children set cau_hinh = cau_hinh || '{"khoa_ngay": "2026-11-19"}'::jsonb where id = $1`, [b]);
  await q(`update children set cau_hinh = cau_hinh || '{"khoa_ngay": "2026-11-18"}'::jsonb where id = $1`, [a]);
  const r = await m(tok, `con/${b}/chep-tu`, { tu: a });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual([r.body.conId, r.body.cheDo, r.body.soApp, r.body.soWeb, r.body.soViec, r.body.soViecChep, r.body.daTangSao], [b, "theo_danh_sach", 3, 2, 2, 2, 40]);
  assert.deepEqual([r.body.gioiHanNgayThuong, r.body.gioiHanCuoiTuan, r.body.phutMoiLuot], [60, 90, 30]);
  assert.deepEqual(await luat(fam, b), await luat(fam, a), "luật app/web giống hệt (cả Tính phút / Không tính phút)");
  assert.ok(!(await luat(fam, b)).includes("minecraft.exe:giai_tri"), "luật cũ của Con đích bị thay");
  assert.deepEqual((await q<{ ten: string; tinh_gio: boolean }>(`select ten, tinh_gio from app_theo_ten where child_id = $1`, [b])).map((x) => [x.ten, x.tinh_gio]), [["Vẽ Tranh", false]]);
  assert.deepEqual((await viec(b)).map((x) => x.ten), ["Nhảy dây", "Đọc sách 15 phút"].sort());
  const thuTu = async (con: string) => (await q<{ ten: string }>(`select ten from tasks where giao_cho = $1 and bat order by created_at, id`, [con])).map((x) => x.ten);
  assert.deepEqual(await thuTu(b), await thuTu(a), "việc chép giữ đúng thứ tự như Con nguồn");
  assert.equal(await khoiDau(b), 40);
  const cfg = (await one<{ cau_hinh: Record<string, unknown>; che_do_chan: string }>(`select cau_hinh, che_do_chan from children where id = $1`, [b]))!;
  assert.equal(cfg.cau_hinh.khoa_ngay, "2026-11-19", "khoá máy của Con đích không bị chép đè");
  // chép lại lần nữa: không nhân đôi việc, không tặng sao lần hai
  const r2 = await m(tok, `con/${b}/chep-tu`, { tu: a });
  assert.equal(r2.status, 200);
  assert.equal((await viec(b)).length, 2);
  assert.equal(await khoiDau(b), 40);
  // sau đó sửa riêng Con đích không đụng Con nguồn
  assert.equal((await m(tok, `con/${b}/che-do`, { cheDo: "mo_het" })).status, 200);
  assert.notEqual((await one<{ c: string }>(`select che_do_chan as c from children where id = $1`, [a]))!.c, "mo_het", "Con nguồn vẫn Theo danh sách");
  const vb = await one<{ id: string }>(`select id from tasks where giao_cho = $1 limit 1`, [b]);
  assert.equal((await m(tok, `nhiem-vu/${vb!.id}`, { ten: "Việc mới của Minh", diem: 7 })).status, 200);
  assert.ok(!(await viec(a)).some((x) => x.ten === "Việc mới của Minh"));
});

test("POST chep-tu: việc cũ đã có bài nộp ⇒ tắt (giữ lịch sử), không xoá", async () => {
  const { tok, a, b } = await nha();
  const id = (await m(tok, "nhiem-vu", { ten: "Việc có bài nộp", diem: 3, giao_cho: b })).body.id;
  await q(`insert into submissions(id, task_id, child_id) values ('s-420', $1, $2)`, [id, b]);
  assert.equal((await m(tok, `con/${b}/chep-tu`, { tu: a })).status, 200);
  assert.deepEqual((await viec(b)).find((x) => x.ten === "Việc có bài nộp"), { ten: "Việc có bài nộp", bat: false });
});

test("POST chep-tu: kiểm quyền cùng nhà, cùng Con, thiếu nguồn, người trông giúp; lỗi không đổi gì", async () => {
  const { fam, tok, a, b } = await nha();
  const khac = await nha();
  assert.equal((await m(tok, `con/${b}/chep-tu`, { tu: khac.a })).status, 404, "nguồn nhà khác");
  assert.equal((await m(tok, `con/${khac.b}/chep-tu`, { tu: a })).status, 404, "đích nhà khác");
  assert.equal((await m(tok, `con/${b}/chep-tu`, { tu: b })).status, 400);
  assert.equal((await m(tok, `con/${b}/chep-tu`, {})).status, 400);
  assert.equal((await m(tok, `con/${khac.b}/chep-tu`)).status, 404);
  const tg = await taoPhien(await taoBaMe(fam, "Bà", "trong_giup"));
  assert.equal((await m(tg, `con/${b}/chep-tu`, { tu: a })).status, 403);
  assert.deepEqual(await luat(fam, b), [], "lỗi / bị chặn ⇒ Con đích chưa có luật nào");
  assert.equal((await viec(b)).length, 0);
});
