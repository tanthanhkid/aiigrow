// Giám sát + lọc web: agent gửi tổng theo (ngày, tên miền) ⇒ thống kê cho Ba Mẹ; cho phép / chặn từng trang; dịch sang `windows.web` cho agent.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const web = await import("./web.ts");
const { xuLyMay } = await import("./api-may.ts");
const { xuLyM } = await import("./api-m.ts");
const { taoPhien } = await import("./auth.ts");
const { chinhSachWindows } = await import("./agent-windows.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const { gioDiaPhuong } = await import("./gio.ts");

const HOM = gioDiaPhuong(new Date(), "Asia/Ho_Chi_Minh").ngay;

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
async function nha() {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Phi" });
  const ghep = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop của Phi");
  return { fam, con, tok: ghep.token, mayId: ghep.deviceId, tokBm: await taoPhien(bm) };
}

test("tên miền sạch: bỏ www, chữ thường, từ chối IP / localhost / chuỗi lạ", () => {
  assert.equal(web.tenMienSach("WWW.GameK.vn"), "gamek.vn");
  assert.equal(web.tenMienSach("https://m.youtube.com/watch?v=1"), "m.youtube.com");
  for (const x of ["localhost", "192.168.1.1", "", "a b.com", "http://", "x"]) assert.equal(web.tenMienSach(x), null, x);
});

test("agent gửi lịch sử web: lưu tổng theo ngày, gửi lại không cộng đôi, bỏ dòng sai / ngày quá cũ", async () => {
  const { tok, con, tokBm } = await nha();
  const ds = [{ ngay: HOM, tenMien: "gamek.vn", soLan: 5, giay: 600, lanCuoi: new Date().toISOString() },
    { ngay: HOM, tenMien: "youtube.com", soLan: 2, giay: 1200 },
    { ngay: HOM, tenMien: "192.168.0.1", soLan: 1, giay: 10 },
    { ngay: "2020-01-01", tenMien: "cu.com", soLan: 1, giay: 10 }, { ngay: "sai", tenMien: "x.com" }];
  assert.deepEqual((await goiMay("web/lich-su", tok, { ds })).body, { nhan: 2 });
  await goiMay("web/lich-su", tok, { ds });                                               // gửi lại y hệt
  await goiMay("web/lich-su", tok, { ds: [{ ngay: HOM, tenMien: "gamek.vn", soLan: 4, giay: 300 }] });   // số nhỏ hơn không đè
  const tk = (await goiBm(`con/${con}/web`, tokBm)).body;
  assert.equal(tk.top.length, 2);
  assert.deepEqual(tk.top.map((x: any) => [x.tenMien, x.giay, x.soLan]), [["youtube.com", 1200, 2], ["gamek.vn", 600, 5]]);
  assert.equal(tk.homNay.giay, 1800);
  assert.equal(tk.theoNgay.length, 7);
  assert.equal(tk.theoNgay.at(-1).ngay, HOM);
  assert.equal(tk.top[0].trangThai, "chua_xep");
  assert.equal(tk.cheDoWeb, "mo");
  assert.equal(tk.mayLoc.length, 1);
});

test("Ba Mẹ cho phép / chặn / mặc định từng trang; thống kê phản ánh trạng thái; gia đình khác không đọc được", async () => {
  const { tok, con, tokBm } = await nha();
  await goiMay("web/lich-su", tok, { ds: [{ ngay: HOM, tenMien: "gamek.vn", soLan: 1, giay: 60 }, { ngay: HOM, tenMien: "scratch.mit.edu", soLan: 1, giay: 30 }] });
  assert.equal((await goiBm(`con/${con}/web/trang`, tokBm, { muc: "https://www.gamek.vn/", trangThai: "chan" })).status, 200);
  await goiBm(`con/${con}/web/trang`, tokBm, { muc: "scratch.mit.edu", trangThai: "cho_phep" });
  let tk = (await goiBm(`con/${con}/web`, tokBm)).body;
  const tt = Object.fromEntries(tk.top.map((x: any) => [x.tenMien, x.trangThai]));
  assert.deepEqual(tt, { "gamek.vn": "chan", "scratch.mit.edu": "cho_phep" });
  assert.deepEqual(tk.luat.map((x: any) => [x.tenMien, x.trangThai]), [["gamek.vn", "chan"], ["scratch.mit.edu", "cho_phep"]]);
  await goiBm(`con/${con}/web/trang`, tokBm, { muc: "gamek.vn", trangThai: "mac_dinh" });
  tk = (await goiBm(`con/${con}/web`, tokBm)).body;
  assert.equal(tk.top.find((x: any) => x.tenMien === "gamek.vn").trangThai, "chua_xep");
  assert.equal((await goiBm(`con/${con}/web/trang`, tokBm, { muc: "khong hop le", trangThai: "chan" })).status, 400);
  assert.equal((await goiBm(`con/${con}/web/trang`, tokBm, { muc: "zoom.us", trangThai: "chan" })).status, 409, "Allowlist hệ thống không chặn được");
  const lạ = await nha();
  assert.equal((await goiBm(`con/${con}/web`, lạ.tokBm)).status, 404);
});

test("dong-bo trả windows.web: chặn gamek.vn ⇒ nằm trong chan; giải trí chỉ mở khi có phiên điểm; chỉ-cho-phép bật bằng web_chi_cho_phep", async () => {
  const { tok, con, tokBm } = await nha();
  await goiBm(`con/${con}/web/trang`, tokBm, { muc: "gamek.vn", trangThai: "chan" });
  await goiBm(`con/${con}/web/trang`, tokBm, { muc: "khanacademy.org", trangThai: "cho_phep" });
  await goiBm("luat", tokBm, { con, muc: "youtube.com", loai: "giai_tri", nhom: "video_ngan" });
  const db = (await goiMay("dong-bo", tok, {})).body;
  assert.equal(db.windows.web.cheDo, "mo");
  assert.deepEqual(db.windows.web.chan, ["gamek.vn", "youtube.com"]);
  assert.ok(db.windows.web.cho.includes("khanacademy.org") && db.windows.web.cho.includes("classroom.google.com"));
  assert.ok(!db.windows.web.cho.includes("explorer.exe"), "chỉ tên miền, không .exe");
  // phiên điểm đang chạy cho youtube.com ⇒ youtube.com chuyển sang danh sách mở
  const co = chinhSachWindows({ ...db, phien: { id: "p", muc: "youtube.com", conPhut: 10 } });
  assert.deepEqual(co.web.chan, ["gamek.vn"]);
  assert.ok(co.web.cho.includes("youtube.com"));
  await goiBm(`con/${con}/cau-hinh`, tokBm, { web_chi_cho_phep: 1 });
  assert.equal((await goiMay("dong-bo", tok, {})).body.windows.web.cheDo, "chi_cho_phep");
  assert.equal((await goiBm(`con/${con}/web`, tokBm)).body.cheDoWeb, "chi_cho_phep");
});
