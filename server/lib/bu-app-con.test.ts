// Máy chủ bù cho app Con (#263/#264): iPhone/iPad trừ sao theo `ios.phutDaDung` của nhịp; `kid/sao` + `hoc-vien/sao` trả lichSu[] (sổ sao gần đây)
// và appHomNay[] (màn «Đang chơi»: «Roblox 30 phút · −30 sao»).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const ss = await import("./so-sao.ts");
const v = await import("./vi.ts");
const g = await import("./gia-dinh.ts");
const la = await import("./luat-app.ts");
const im = await import("./ios-may.ts");
const { appHomNayCon } = await import("./hom-nay-dung.ts");
const { xuLyMay } = await import("./api-may.ts");
const { xuLyCon } = await import("./api-con.ts");
const { q, one } = await import("./db.ts");
const { taoNha, luonChoiDuoc } = await import("./test-fixtures/nha.ts");

const goi = (xuLy: (r: Request, p: string[]) => Promise<Response>, goc: string) => async (tok: string, duong: string, body?: unknown) => {
  const r = await xuLy(new Request(`http://x/api/${goc}/${duong}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), duong.split("?")[0].split("/"));
  return { status: r.status, body: (await r.json()) as any };
};
const dv = goi(xuLyMay, "device"), k = goi(xuLyCon, "kid");
const ios = (phutDaDung: number) => ({ soAppHoc: 1, soAppGiaiTri: 3, soAppChan: 0, soDanhMucGiaiTri: 1, phutDaDung, uyQuyen: "child" });
const phut = (n: number) => n * 60_000;

async function nhaIos(ten = "Mi", sao = 50) {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten });
  await luonChoiDuoc(con);
  await v.dieuChinhTay(fam, con, sao, "Thưởng", bm);
  const r = await g.ghepMay(await g.taoMaGhep(fam, con, "ios"), "ios", `iPhone của ${ten}`);
  const nhip = async (n: number, now: Date, o: { phutBoiMa?: number } = {}) => im.luuIosNhip((await g.mayTuToken(r.token))!, ios(n), now, o);
  return { fam, bm, con, r, nhip };
}

// Thứ Bảy 24/10/2026 18:00 giờ VN
const T = new Date("2026-10-24T11:00:00Z");

test("iOS: phutDaDung tăng ⇒ trừ sao 1:1 (lần đầu chỉ lấy mốc); kẹp theo thời gian thật; sang ngày tính từ 0; số giảm chỉ lấy mốc", async () => {
  const { con, nhip } = await nhaIos("Mi", 200);
  await nhip(5, T);
  assert.equal(await v.soDu(con), 200, "lần đầu máy báo: chỉ lấy mốc, không trừ phút trước đó");
  await nhip(20, new Date(T.getTime() + phut(20)));
  assert.equal(await v.soDu(con), 185, "tăng 15 phút trong 20 phút thật ⇒ −15 sao");
  await nhip(25, new Date(T.getTime() + phut(60)));
  assert.equal(await v.soDu(con), 180);
  // nhảy 175 phút trong 40 phút thật ⇒ kẹp 41; đồng hồ cửa sổ (t59, t100] đã có 5 phút lần trước ⇒ trừ 36
  await nhip(200, new Date(T.getTime() + phut(100)));
  assert.equal(await v.soDu(con), 144);
  // sang ngày (giờ gia đình): mốc hôm qua không trừ, phút hôm nay tính từ 0
  const mai = new Date(T.getTime() + 86_400_000);
  await nhip(7, mai);
  assert.equal(await v.soDu(con), 137);
  // app cài lại đếm từ 0 ⇒ chỉ lấy mốc mới, rồi tăng tiếp mới trừ
  await nhip(3, new Date(mai.getTime() + phut(5)));
  assert.equal(await v.soDu(con), 137);
  await nhip(5, new Date(mai.getTime() + phut(15)));
  assert.equal(await v.soDu(con), 135);
  const dong = (await q<{ ly_do: string; delta: number }>(`select ly_do, delta from points where child_id = $1 and loai = 'choi' order by seq`, [con]));
  assert.equal(dong[0].ly_do, "Chơi iPhone của Mi 15 phút");
});

test("iOS: không trừ đôi với kênh khác (đồng hồ cửa sổ); Mở hết không trừ; phutBoiMa chỉ cộng dồn để hiện (phutDaDung đã bỏ phút mở bằng mã)", async () => {
  const { con, nhip, r } = await nhaIos("Na");
  await nhip(0, T);
  const t1 = new Date(T.getTime() + phut(10));
  await nhip(10, t1, { phutBoiMa: 8 });
  assert.equal(await v.soDu(con), 40, "10 phút Tính phút (đã bỏ 8 phút mở bằng mã ở máy) ⇒ −10, không trừ 8 lần nữa");
  // Windows của bé cùng báo 10 phút đúng khoảng đó ⇒ không trừ thêm
  assert.deepEqual(await ss.truPhutChoi(con, 10, t1), { tru: 0, tinh: 0 });
  assert.equal(await v.soDu(con), 40);
  await nhip(12, new Date(t1.getTime() + phut(5)), { phutBoiMa: 3 });
  let st = (await g.mayTuToken(r.token))!.status as any;
  assert.deepEqual([st.ios.phutDaDung, st.ios.boiMaHomNay], [12, 11]);
  assert.equal(await v.soDu(con), 38);
  await q(`update children set che_do_chan = 'mo_het' where id = $1`, [con]);
  await nhip(30, new Date(t1.getTime() + phut(25)));
  assert.equal(await v.soDu(con), 38, "Mở hết ⇒ không trừ sao");
  st = (await g.mayTuToken(r.token))!.status as any;
  assert.equal(st.ios.phutDaDung, 30, "vẫn lưu mốc ⇒ bỏ Mở hết không bị trừ bù");
});

test("iOS qua /api/device/nhip: phút tăng ⇒ chinhSach.sao trả về đã trừ ngay trong lượt đó", async () => {
  const { con, r } = await nhaIos("Su");
  const nhip = async (n: number) => (await dv(r.token, "nhip", { clientTime: new Date().toISOString(), appQuanLyBat: true, ios: ios(n) }));
  const a = await nhip(10);
  assert.equal(a.status, 200);
  assert.equal(await v.soDu(con), 50);
  const b = await nhip(11);   // +1 phút (kẹp tối thiểu 1 phút thật) ⇒ −1 sao
  assert.equal(await v.soDu(con), 49);
  assert.equal(b.body.chinhSach.sao.phutCon, 49);
});

test("kid/sao + hoc-vien/sao: lichSu[] (vay / trả nợ / chơi / nhiệm vụ / quà) và appHomNay[] (phút từng app hôm nay, nhóm, sao đã trừ), iPhone một dòng", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  await luonChoiDuoc(con);
  await v.dieuChinhTay(fam, con, 20, "Thưởng sinh nhật", bm);
  await la.datLuat(fam, { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" });
  await la.datLuat(fam, { muc: "tudien.exe", ten: "Từ điển", loai: "hoc" });
  const a = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop");
  await dv(a.token, "dong-bo", { usage: [{ muc: "roblox.exe", phut: 30 }, { muc: "tudien.exe", phut: 12 }] });
  assert.equal(await v.soDu(con), 0);
  await ss.choVay(fam, con, 15, bm, { mucDich: "choi" });
  await v.dieuChinhTay(fam, con, 5, "Dọn phòng", bm);   // đang nợ ⇒ trả nợ trước
  const kq = await dv(a.token, "hoc-vien/sao");
  assert.equal(kq.status, 200);
  const s = kq.body;
  assert.deepEqual([s.sao, s.no, s.phutCon, s.phutChoiHomNay], [5, 10, 15, 20]);
  assert.deepEqual(s.lichSu.slice(0, 4).map((x: any) => [x.kieu, x.sao]), [["tra_no", -5], ["ba_me", 5], ["vay", 15], ["choi", -20]]);
  assert.equal(s.lichSu[2].tenNguoi, "Lan");
  assert.match(s.lichSu[2].chuThich, /^Ba Mẹ cho vay 15 sao/);
  assert.ok(s.lichSu.every((x: any) => typeof x.luc === "string" && x.id));
  const rb = s.appHomNay.find((x: any) => x.ten === "Roblox"), td = s.appHomNay.find((x: any) => x.ten === "Từ điển");
  assert.deepEqual([rb.phut, rb.nhom, rb.sao, rb.kieu], [30, "tinh_phut", 20, "app"], "30 phút nhưng chỉ có 20 sao ⇒ trừ 20");
  assert.deepEqual([td.phut, td.nhom, td.sao], [12, "khong_tinh_phut", 0]);
  assert.equal(s.appHomNay[0].ten, "Roblox");
  // giới hạn số dòng
  assert.equal((await dv(a.token, "hoc-vien/sao?gioiHan=2")).body.lichSu.length, 2);
  // iPhone: một dòng «Tính phút trên <máy>» (Apple không cho biết tên app)
  await q(`update choi_tru set luc = luc - interval '40 minutes' where child_id = $1`, [con]);   // phút Windows ở khoảng trước, không trùng iPad
  const ip = await g.ghepMay(await g.taoMaGhep(fam, con, "ios"), "ios", "iPad của Bảo Anh");
  const may = await g.mayTuToken(ip.token);
  const now = new Date();
  await im.luuIosNhip(may!, ios(4), new Date(now.getTime() - phut(10)));
  await im.luuIosNhip((await g.mayTuToken(ip.token))!, ios(9), now);
  const ds = await appHomNayCon(con, now);
  const dIos = ds.find((x) => x.muc === `ios:${ip.deviceId}`)!;
  assert.deepEqual([dIos.ten, dIos.phut, dIos.nhom, dIos.sao], ["Tính phút trên iPad của Bảo Anh", 9, "tinh_phut", 5]);
  // kid/sao (phiên Con) cùng hợp đồng
  const tok = await phienCon(con);
  const kk = await k(tok, "sao");
  assert.equal(kk.status, 200);
  assert.ok(Array.isArray(kk.body.lichSu) && Array.isArray(kk.body.appHomNay));
  assert.equal(kk.body.lichSu[0].kieu, "choi");
});

/** Phiên Con như máy chung: ghép máy không gắn Con rồi «chọn tên». */
async function phienCon(con: string) {
  const fam = (await one<{ family_id: string }>(`select family_id from children where id = $1`, [con]))!.family_id;
  const r = await g.ghepMay(await g.taoMaGhep(fam, null, "android"), "android", "Máy chung");
  return (await dv(r.token, "chon-con", { con })).body.phienCon as string;
}
