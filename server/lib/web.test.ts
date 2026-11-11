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
const { q } = await import("./db.ts");
const { laWebCam } = await import("./chan-co-ban.ts");
const { luonChoiDuoc } = await import("./test-fixtures/nha.ts");

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
  assert.equal(tk.cheDoWeb, "chi_cho_phep", "Con mới «Chỉ app được phép» (L4) ⇒ web chỉ cho phép");
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

test("dong-bo trả windows.web: chặn gamek.vn ⇒ nằm trong chan; giải trí chỉ mở khi còn quỹ / có phiên / đang mở; chỉ-cho-phép bật bằng web_chi_cho_phep", async () => {
  const { tok, con, tokBm } = await nha();
  await goiBm(`con/${con}/cau-hinh`, tokBm, { quy_ngay_thuong: 0, quy_cuoi_tuan: 0 });     // hết quỹ ⇒ trang Giải trí bị chặn
  await goiBm(`con/${con}/web/trang`, tokBm, { muc: "gamek.vn", trangThai: "chan" });
  await goiBm(`con/${con}/web/trang`, tokBm, { muc: "khanacademy.org", trangThai: "cho_phep" });
  await goiBm("luat", tokBm, { con, muc: "youtube.com", loai: "giai_tri", nhom: "video_ngan" });
  const db = (await goiMay("dong-bo", tok, {})).body;
  // L4: Con mới «Chỉ app được phép» ⇒ web chỉ cho phép; web luôn chặn (người lớn / cờ bạc / bạo lực) có trong chan ở mọi chế độ
  assert.equal(db.windows.web.cheDo, "chi_cho_phep");
  assert.equal(db.cheDoChan, "chi_app_duoc_phep");
  const rieng = (ds: string[]) => ds.filter((m) => !laWebCam(m));
  assert.deepEqual(rieng(db.windows.web.chan), ["gamek.vn", "youtube.com"]);
  assert.ok(db.windows.web.chan.includes("xnxx.com"));
  assert.ok(db.windows.web.cho.includes("khanacademy.org") && db.windows.web.cho.includes("classroom.google.com"));
  assert.ok(!db.windows.web.cho.includes("explorer.exe"), "chỉ tên miền, không .exe");
  // phiên điểm đang chạy cho youtube.com ⇒ youtube.com chuyển sang danh sách mở
  const co = chinhSachWindows({ ...db, phien: { id: "p", muc: "youtube.com", conPhut: 10 } });
  assert.deepEqual(rieng(co.web.chan), ["gamek.vn"]);
  assert.ok(co.web.cho.includes("youtube.com"));
  assert.equal(co.web.choKhiMo, undefined, "mở nhờ phiên điểm ⇒ không phải choKhiMo");
  // 05/11: còn quỹ (ngoài giờ ngủ) ⇒ trang Giải trí mở, không cần phiên
  const quy = chinhSachWindows({ ...db, serverTime: "2026-10-22T03:00:00.000Z", quy: { ...db.quy, conPhut: 20, dangNgu: false, dangHoc: false } });
  assert.ok(quy.web.cho.includes("youtube.com") && !quy.web.chan.includes("youtube.com"));
  // đang «mở» có hạn ⇒ youtube.com mở nhờ cửa sổ ⇒ có trong choKhiMo (agent chặn lại khi hết hạn lúc mất mạng)
  // giờ cố định 10:00 (VN): ngoài giờ ngủ thì «mở» mới có hiệu lực — không phụ thuộc lúc chạy test
  const trua = "2026-10-22T03:00:00.000Z";
  const mo = chinhSachWindows({ ...db, serverTime: trua }, undefined, undefined, { moDen: new Date(new Date(trua).getTime() + 30 * 60000) });
  assert.ok(mo.web.cho.includes("youtube.com"));
  // tên miền đi kèm của youtube.com (googlevideo, ytimg…) cũng chỉ mở theo cửa sổ có hạn
  assert.ok(mo.web.choKhiMo?.includes("youtube.com") && mo.web.choKhiMo.includes("googlevideo.com") && mo.web.choKhiMo.includes("ytimg.com"));
  assert.equal((await goiBm(`con/${con}/web`, tokBm)).body.cheDoWeb, "chi_cho_phep");
  // Ba Mẹ chọn «Mở hết» ⇒ web mở (chỉ chặn trang Ba Mẹ chặn + web luôn chặn), trang Giải trí mở
  assert.equal((await goiBm(`con/${con}/che-do-chan`, tokBm, { cheDo: "mo_het" })).status, 200);
  await luonChoiDuoc(con);                                           // route dùng đồng hồ thật — tránh giờ ngủ
  const mh = (await goiMay("dong-bo", tok, {})).body;
  assert.equal(mh.windows.web.cheDo, "mo");
  assert.equal(mh.windows.mode, "tu_do");
  // Nghi 07/11: «Mở hết» = dùng như bình thường — hết quỹ (đặt 0 ở đầu test) cũng KHÔNG chặn trang Giải trí.
  // Nghi 11/11: trang Ba Mẹ từng «Chặn» (gamek.vn) cũng mở — chỉ còn web luôn chặn
  assert.deepEqual(rieng(mh.windows.web.chan), [], "«Mở hết» hết quỹ vẫn xem youtube.com, trang Ba Mẹ từng chặn cũng mở");
  assert.ok(mh.windows.web.chan.includes("xnxx.com"), "web luôn chặn vẫn chặn");
  assert.deepEqual([mh.windows.appTinhGio, mh.windows.quyConPhut, mh.quy], [undefined, undefined, null], "«Mở hết»: không quỹ giờ");
  // giờ ngủ + giờ học đang diễn ra cũng không chặn ở «Mở hết»
  const caNgay = { tu: "00:00", den: "23:59" };
  await q(`update children set lich = lich || $2::jsonb where id = $1`, [con, JSON.stringify({ ngu: caNgay, hoc: { ...caNgay, thu: [0, 1, 2, 3, 4, 5, 6] } })]);
  const dem = (await goiMay("dong-bo", tok, {})).body;
  assert.deepEqual([dem.windows.mode, dem.windows.locked, dem.windows.dangGioHoc, dem.windows.gioHoc], ["tu_do", false, undefined, null]);
  assert.deepEqual(rieng(dem.windows.web.chan), []);
  // «Khoá ngay» của Ba Mẹ vẫn khoá
  assert.equal((await goiBm(`con/${con}/khoa`, tokBm, {})).status, 200);
  assert.equal((await goiMay("dong-bo", tok, {})).body.windows.mode, "khoa");
  await goiBm(`con/${con}/khoa`, tokBm, { khoa: false });
  await luonChoiDuoc(con);
  assert.equal((await goiBm(`con/${con}/web`, tokBm)).body.cheDoWeb, "mo");
  // về «Chỉ app Ba Mẹ chọn» ⇒ luật «Chặn» vẫn lưu nên chặn lại ngay
  assert.equal((await goiBm(`con/${con}/che-do-chan`, tokBm, { cheDo: "chi_app_duoc_phep" })).status, 200);
  assert.ok((await goiMay("dong-bo", tok, {})).body.windows.web.chan.includes("gamek.vn"), "về Chỉ app Ba Mẹ chọn: gamek.vn chặn lại");
  await goiBm(`con/${con}/che-do-chan`, tokBm, { cheDo: "mo_het" });
  // Con cũ (che_do_chan null) ⇒ vẫn theo tham số web_chi_cho_phep như trước
  await q(`update children set che_do_chan = null where id = $1`, [con]);
  assert.equal((await goiMay("dong-bo", tok, {})).body.windows.web.cheDo, "mo");
  await goiBm(`con/${con}/cau-hinh`, tokBm, { web_chi_cho_phep: 1 });
  assert.equal((await goiMay("dong-bo", tok, {})).body.windows.web.cheDo, "chi_cho_phep");
  assert.equal((await goiBm(`con/${con}/web`, tokBm)).body.cheDoWeb, "chi_cho_phep");
});

test("Chỉ app được phép + cho youtube.com ⇒ kèm tên miền video/ảnh (googlevideo, ytimg…); Ba Mẹ chặn đích danh thì không kèm", () => {
  const luat = (muc: string, loai: string) => ({ muc, loai }) as never;
  const p = { luat: [luat("youtube.com", "hoc"), luat("gstatic.com", "chan")], allowlistHeThong: ["classroom.google.com", "explorer.exe"], phien: null, webChiChoPhep: true } as never;
  const w = web.chinhSachWebCho(p);
  for (const m of ["youtube.com", "googlevideo.com", "ytimg.com", "ggpht.com", "accounts.google.com", "googleapis.com"]) assert.ok(w.cho.includes(m), m);
  assert.ok(!w.cho.includes("gstatic.com"), "Ba Mẹ chặn gstatic.com ⇒ không tự mở lại");
  assert.ok(!w.cho.includes("google.com"), "không mở cả google.com");
  assert.deepEqual(web.tenMienDiKem(["scratch.mit.edu"]), []);
});
