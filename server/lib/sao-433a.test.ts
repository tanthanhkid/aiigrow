// #433 phần A (sao & phút chơi) — A4 nhiều app một lượt, A6 trừ tay quá số sao, A10 đổi chế độ giữa chừng, A11 phút trước 0h báo sau 0h.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const ss = await import("./so-sao.ts");
const v = await import("./vi.ts");
const g = await import("./gia-dinh.ts");
const la = await import("./luat-app.ts");
const cd = await import("./che-do-chan.ts");
const { dongBo } = await import("./may-con.ts");
const { appHomNayCon } = await import("./hom-nay-dung.ts");
const { q, one } = await import("./db.ts");
const { gioDiaPhuong } = await import("./gio.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

const VN = (s: string) => new Date(`${s}+07:00`);
type MayRow = Parameters<typeof dongBo>[0];

async function nha(sao = 30) {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  if (sao) await v.dieuChinhTay(fam, con, sao, "Sao thử", bm);
  const ghep = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop của Bảo Anh");
  await la.datLuat(fam, { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" });
  await la.datLuat(fam, { muc: "youtube.com", ten: "YouTube", loai: "giai_tri", nhom: "video_ngan" });
  const may = async () => (await q<Record<string, unknown>>(`select * from devices where id = $1`, [ghep.deviceId]))[0] as MayRow;
  return { fam, bm, con, may };
}

const choiTheoRef = async (con: string) => new Map((await q<{ ref: string; s: number }>(
  `select ref, (-sum(delta))::int as s from points where child_id = $1 and loai = 'choi' group by ref`, [con])).map((r) => [r.ref, Number(r.s)]));

test("A4: một lượt đồng bộ có nhiều app «Tính phút» ⇒ sổ sao + «đã dùng gì» ghi đúng từng app", async () => {
  const { con, may } = await nha(30);
  const now = new Date();
  const ngay = gioDiaPhuong(now, "Asia/Ho_Chi_Minh").ngay;
  await dongBo(await may(), { usage: [{ muc: "roblox.exe", phut: 5, day: ngay }, { muc: "youtube.com", phut: 3, day: ngay }] }, now);
  assert.equal(await v.soDu(con), 22, "trừ đủ 8 sao");
  const r = await choiTheoRef(con);
  assert.equal(r.get(`choi:${ngay}:roblox.exe`), 5);
  assert.equal(r.get(`choi:${ngay}:youtube.com`), 3, "YouTube có dòng sổ riêng (trước đây gom hết vào Roblox)");
  const app = await appHomNayCon(con, now);
  assert.equal(app.find((x) => x.muc === "roblox.exe")?.sao, 5);
  assert.equal(app.find((x) => x.muc === "youtube.com")?.sao, 3);
  // lượt sau xen kẽ hai app vẫn gom vào đúng dòng của app (không đẻ dòng mới mỗi lượt)
  await dongBo(await may(), { usage: [{ muc: "roblox.exe", phut: 7, day: ngay }, { muc: "youtube.com", phut: 4, day: ngay }] }, new Date(now.getTime() + 3 * 60_000));
  const r2 = await choiTheoRef(con);
  assert.deepEqual([r2.get(`choi:${ngay}:roblox.exe`), r2.get(`choi:${ngay}:youtube.com`)], [7, 4]);
  assert.equal((await q(`select 1 from points where child_id = $1 and loai = 'choi'`, [con])).length, 2);
});

test("A4: chiaTheoMuc chia đủ tổng theo tỉ lệ phút", () => {
  assert.deepEqual(ss.chiaTheoMuc(8, new Map([["a", 5], ["b", 3]]), null), [["a", 5], ["b", 3]]);
  const ra = ss.chiaTheoMuc(5, new Map([["a", 5], ["b", 3], ["c", 2]]), null);
  assert.equal(ra.reduce((s, [, n]) => s + n, 0), 5);
  assert.deepEqual(ss.chiaTheoMuc(4, undefined, "x"), [["x", 4]]);
  assert.deepEqual(ss.chiaTheoMuc(0, new Map([["a", 1], ["b", 1]]), null), []);
});

test("A6: Ba Mẹ trừ tay quá số sao ⇒ chặn với câu rõ (tên Con, trừ tối đa bao nhiêu), không ghi gì", async () => {
  const { fam, bm, con } = await nha(0);
  await assert.rejects(v.dieuChinhTay(fam, con, -5, "Phạt nói dối", bm), (e: any) => e.ma === "khong_du_diem" && e.message === "Bảo Anh đang hết sao — chưa trừ thêm được");
  await v.dieuChinhTay(fam, con, 3, "Thưởng", bm);
  await assert.rejects(v.dieuChinhTay(fam, con, -10, "Phạt", bm), (e: any) => e.ma === "khong_du_diem" && e.message === "Bảo Anh chỉ còn 3 sao — trừ tối đa 3 sao");
  const st = await ss.trangThaiSao(con);
  assert.deepEqual([st.sao, st.no], [3, 0], "chặn thì không ghi nợ, không trừ");
  assert.equal(await v.dieuChinhTay(fam, con, -3, "Phạt", bm), 0, "trừ đúng số đang có thì được");
});

test("A10: đổi chế độ giữa chừng ⇒ phút chưa báo tính theo chế độ của từng đoạn", async () => {
  // Theo danh sách → Mở hết: 10 phút báo 4 phút sau lúc đổi ⇒ 6 phút trước lúc đổi vẫn trừ (trước đây: 0)
  const a = await nha(30);
  await cd.datCheDoChan(a.fam, a.con, "mo_het", a.bm);
  const e1 = (await one<{ luc: Date }>(`select created_at as luc from events where child_id = $1 and loai = 'doi_che_do_chan'`, [a.con]))!.luc;
  const kq1 = await ss.truPhutChoi(a.con, 10, new Date(new Date(e1).getTime() + 4 * 60_000));
  assert.equal(kq1.tru, 6);
  assert.equal(await v.soDu(a.con), 24);
  // không đổi trong cửa sổ, đang Mở hết ⇒ 0 như cũ
  assert.equal((await ss.truPhutChoi(a.con, 3, new Date(new Date(e1).getTime() + 30 * 60_000))).tru, 0);

  // Mở hết → Theo danh sách: 10 phút báo 4 phút sau lúc đổi ⇒ chỉ 4 phút sau lúc đổi bị trừ (trước đây: 10)
  const b = await nha(30);
  await cd.datCheDoChan(b.fam, b.con, "mo_het", b.bm);
  await q(`update events set created_at = created_at - interval '2 hours' where child_id = $1`, [b.con]);
  await cd.datCheDoChan(b.fam, b.con, "theo_danh_sach", b.bm);
  const e2 = (await one<{ luc: Date }>(`select created_at as luc from events where child_id = $1 and loai = 'doi_che_do_chan' order by created_at desc limit 1`, [b.con]))!.luc;
  const kq2 = await ss.truPhutChoi(b.con, 10, new Date(new Date(e2).getTime() + 4 * 60_000));
  assert.equal(kq2.tru, 4);
  assert.equal(await v.soDu(b.con), 26);
});

test("A11: phút trước 0h báo sau 0h ⇒ vẫn trừ sao, ghi vào hôm qua; ngày cũ gửi bù muộn ⇒ chỉ ghi báo cáo", async () => {
  const { con, may } = await nha(30);
  await dongBo(await may(), { usage: [{ muc: "roblox.exe", phut: 10, day: "2026-11-18" }] }, VN("2026-11-18T23:50:00"));
  assert.equal(await v.soDu(con), 20);
  // 00:05 hôm sau: hôm qua thêm 4 phút (23:50 → 0h), hôm nay 3 phút
  await dongBo(await may(), { usage: [{ muc: "roblox.exe", phut: 14, day: "2026-11-18" }, { muc: "roblox.exe", phut: 3, day: "2026-11-19" }] },
    VN("2026-11-19T00:05:00"));
  assert.equal(await v.soDu(con), 13, "trừ 4 (hôm qua) + 3 (hôm nay)");
  const r = await choiTheoRef(con);
  assert.deepEqual([r.get("choi:2026-11-18:roblox.exe"), r.get("choi:2026-11-19:roblox.exe")], [14, 3]);
  const homQua = await one<{ s: number }>(`select (-sum(delta))::int as s from points where child_id = $1 and loai = 'choi' and created_at < $2`,
    [con, VN("2026-11-19T00:00:00")]);
  assert.equal(Number(homQua!.s), 14, "phần báo trễ nằm trong ngày hôm qua của sổ");
  // 2 giờ sáng: hôm qua lại «thêm» phút (máy gửi bù sau mất mạng) ⇒ không trừ
  await dongBo(await may(), { usage: [{ muc: "roblox.exe", phut: 20, day: "2026-11-18" }] }, VN("2026-11-19T02:00:00"));
  assert.equal(await v.soDu(con), 13);
  assert.equal((await one<{ phut: number }>(`select phut from usage where child_id = $1 and ngay = '2026-11-18'`, [con]))!.phut, 20);
});
