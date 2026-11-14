// S2 thiết kế chốt 05/11 (docs/KE-HOACH-KHOP-THIET-KE-0511.md L4 L5 L7 L8) qua API như app / agent gọi:
// chế độ chặn theo Con + web luôn chặn + Con «Xin Ba Mẹ duyệt»; thiết lập lần đầu; phiên ghép máy (mã 10 phút + link bộ cài tự ghép,
// không gắn loại máy) + «Cài giống máy trước»; app cho phép theo tên khớp khi máy gửi danh sách app.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyM } = await import("./api-m.ts");
const { xuLyCon } = await import("./api-con.ts");
const { xuLyMay } = await import("./api-may.ts");
const { q } = await import("./db.ts");
const { luonChoiDuoc } = await import("./test-fixtures/nha.ts");

type Kq = { status: number; body: any };
const goi = async (f: typeof xuLyM, duong: string, o: { tok?: string; body?: unknown; hdr?: Record<string, string> } = {}): Promise<Kq> => {
  const req = new Request(`http://app.vidu/api/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}), ...(o.hdr ?? {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const r = await f(req, duong.split("?")[0].split("/"));
  return { status: r.status, body: await r.json() };
};
const m = (d: string, o?: Parameters<typeof goi>[2]) => goi(xuLyM, d, o);
const k = (d: string, o?: Parameters<typeof goi>[2]) => goi(xuLyCon, d, o);
const dv = (d: string, o?: Parameters<typeof goi>[2]) => goi(xuLyMay, d, o);

let so = 0;
async function dangKy(ten: string) {
  const sdt = `0944${String(++so).padStart(6, "0")}`;
  const otp = await m("otp", { body: { dinhDanh: sdt } });
  const r = await m("dang-ky", { body: { dinhDanh: sdt, ma: otp.body.ma, ten, matKhau: "matkhau123" } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.token as string;
}

test("L7 thiết lập lần đầu: tên Con + giờ chơi + giờ ngủ + chế độ chặn + app (lưới + «thêm app khác») trong một lệnh; gửi lại với con.id không tạo Con thứ hai", async () => {
  const bm = await dangKy("Mẹ Lan");
  const luoi = (await m("app-goi-y", { tok: bm })).body.ds;
  assert.ok(luoi.some((a: any) => a.ma === "roblox" && a.chon === true));
  assert.ok(luoi.some((a: any) => a.ma === "aiirob" && a.tinhGio === false));
  const body = {
    con: { ten: "Bảo Anh", namSinh: new Date().getFullYear() - 9, avatar: "cam" },
    gioChoi: { ngayThuong: 60, cuoiTuan: 90 }, ngu: { tu: "21:30", den: "06:30" }, cheDoChan: "chi_app_duoc_phep",
    apps: [{ ma: "roblox" }, { ma: "aiirob" }, { ma: "youtube_kids", tinhGio: false }, { ten: "Duolingo ABC", tinhGio: false }, { ten: "抖音" }],
  };
  const r = await m("thiet-lap", { tok: bm, body });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const con = r.body.conId;
  assert.deepEqual([r.body.ten, r.body.cheDoChan, r.body.gioChoi, r.body.ngu], ["Bảo Anh", "chi_app_duoc_phep", { ngayThuong: 60, cuoiTuan: 90 }, { tu: "21:30", den: "06:30" }]);
  assert.deepEqual(r.body.app.choKhop, ["Duolingo ABC", "抖音"]);
  assert.equal(r.body.soApp, 4, "Roblox + YouTube Kids (AiiRob là mục hệ thống, luôn mở) + Duolingo ABC chờ khớp");
  const luat = await q<{ muc: string; loai: string; nhom: string }>(`select muc, loai, nhom from app_rules where child_id = $1 order by muc`, [con]);
  assert.ok(luat.some((l) => l.muc === "robloxplayerbeta.exe" && l.loai === "giai_tri" && l.nhom === "game"));
  assert.ok(luat.some((l) => l.muc === "com.roblox.client" && l.loai === "giai_tri"));
  assert.ok(luat.some((l) => l.muc === "youtubekids.com" && l.loai === "hoc"), "tinhGio false ⇒ không tính giờ (hoc)");
  assert.ok(!luat.some((l) => l.muc === "aiirob.aiilab.vn"));
  const c = (await q<{ cau_hinh: any; lich: any }>(`select cau_hinh, lich from children where id = $1`, [con]))[0];
  assert.deepEqual([c.cau_hinh.quy_ngay_thuong, c.cau_hinh.quy_cuoi_tuan, c.lich.ngu], [60, 90, { tu: "21:30", den: "06:30" }]);
  // gửi lại (mất phản hồi) với con.id ⇒ sửa, không tạo Con thứ hai
  const lai = await m("thiet-lap", { tok: bm, body: { ...body, con: { id: con, ten: "Bảo Anh" }, cheDoChan: "mo_het" } });
  assert.equal(lai.body.conId, con);
  assert.equal(lai.body.cheDoChan, "mo_het");
  assert.equal((await m("gia-dinh", { tok: bm })).body.con.length, 1);
  assert.equal((await m(`con/${con}`, { tok: bm })).body.cheDoChan, "mo_het");
  assert.equal((await m(`con/${con}`, { tok: bm })).body.coPin, false);
  // dữ liệu sai
  assert.equal((await m("thiet-lap", { tok: bm, body: { con: { ten: "X" }, gioChoi: { ngayThuong: 999 } } })).body.error, "phut_sai");
  assert.equal((await m("thiet-lap", { tok: bm, body: { con: { ten: "Y" }, apps: [{ ma: "khong-co" }] } })).body.error, "app_sai");
  assert.equal((await m("gia-dinh", { tok: bm })).body.con.length, 1, "lỗi dữ liệu không để lại Con");
  assert.equal((await m("thiet-lap", { tok: bm, body: { con: { id: con }, ngu: { tu: "25:00", den: "06:00" } } })).body.error, "gio_sai");
  assert.equal((await m("thiet-lap", { tok: bm, body: { con: { id: con }, cheDoChan: "tu_do" } })).body.error, "che_do_chan_sai");
  assert.equal((await m("thiet-lap", { tok: bm, body: { con: { id: con }, apps: [{ ma: "khong-co" }] } })).body.error, "app_sai");
  // tóm tắt cho màn «Đã ghép máy»
  assert.equal((await m(`con/${con}/thiet-lap`, { tok: bm })).body.gioChoi.ngayThuong, 60);
});

test("L8 phiên ghép: mã 6 số 10 phút + link bộ cài (không gắn loại máy) + QR + chia sẻ; máy mở link tự ghép ⇒ mã cũng hết dùng; «Đang chờ» thấy đã ghép", async () => {
  const bm = await dangKy("Ba Tuấn");
  const con = (await m("con", { tok: bm, body: { ten: "Ken" } })).body.id;
  const pg = (await m("ghep-may", { tok: bm, body: { con } })).body;
  assert.match(pg.ma, /^\d{6}$/);
  assert.equal(pg.maHien, `${pg.ma.slice(0, 3)} ${pg.ma.slice(3)}`);
  assert.equal(pg.hanPhut, 10);
  assert.ok(pg.conGiay > 590 && pg.conGiay <= 600, String(pg.conGiay));
  assert.ok(pg.lienKet.startsWith("http://app.vidu/tai?g=") && pg.lienKet.includes(`ma=${pg.ma}`));
  assert.equal(pg.qr, pg.lienKet);
  assert.ok(pg.chiaSe.noiDung.includes(pg.lienKet) && pg.chiaSe.noiDung.includes(pg.maHien));
  let tt = (await m(`ghep-may/${pg.ma}`, { tok: bm })).body;
  assert.deepEqual([tt.daGhep, tt.hetHan, tt.may], [false, false, null]);
  // bộ cài (Mac) đổi token trong link ⇒ máy của Ken, chặn thật ngay
  const g = (await dv("ghep-goi", { body: { token: pg.tokenGoi, nen: "mac", tenMay: "MacBook của Ken" } })).body;
  assert.ok(g.token, JSON.stringify(g));
  assert.equal(g.childName, "Ken");
  tt = (await m(`ghep-may/${pg.ma}`, { tok: bm })).body;
  assert.deepEqual([tt.daGhep, tt.may.ten, tt.may.nen], [true, "MacBook của Ken", "mac"]);
  assert.equal((await dv("ghep", { body: { ma: pg.ma, nen: "windows", tenMay: "PC" } })).body.error, "ma_da_dung", "cùng phiên ghép: mã hết dùng");
  // ngược lại: ghép bằng mã ⇒ link hết dùng; mã không gắn loại máy nhận Windows
  const pg2 = (await m("ghep-may", { tok: bm, body: { con } })).body;
  const w = (await dv("ghep", { body: { ma: pg2.ma, nen: "windows", tenMay: "PC của Ken" } })).body;
  assert.ok(w.token);
  assert.equal((await dv("ghep-goi", { body: { token: pg2.tokenGoi, nen: "windows", tenMay: "PC 2" } })).body.error, "ma_da_dung");
  assert.equal((await dv("dong-bo", { tok: w.token, body: {} })).body.windows.cheDo, "chan");
  // loại máy lạ bị từ chối; mã nhà khác không xem được
  const pg3 = (await m("ghep-may", { tok: bm, body: { con } })).body;
  assert.equal((await dv("ghep", { body: { ma: pg3.ma, nen: "tv", tenMay: "TV" } })).body.error, "sai_nen_tang");
  const khac = await dangKy("Nhà khác");
  assert.equal((await m(`ghep-may/${pg3.ma}`, { tok: khac })).status, 404);
  // mã hết hạn ⇒ «Đang chờ» báo hết hạn
  await q(`update pair_codes set expires_at = now() - interval '1 second' where code = $1`, [pg3.ma]);
  tt = (await m(`ghep-may/${pg3.ma}`, { tok: bm })).body;
  assert.deepEqual([tt.daGhep, tt.hetHan, tt.maHetHan, tt.linkConHan, tt.conGiay], [false, false, true, true, 0], "mã hết nhưng link còn ⇒ còn chờ");
  await q(`update goi_cai set expires_at = now() - interval '1 second' where ma_ghep = $1`, [pg3.ma]);
  assert.equal((await m(`ghep-may/${pg3.ma}`, { tok: bm })).body.hetHan, true);
  // đường cũ ma-ghep vẫn chạy, hạn 10 phút
  assert.equal((await m("ma-ghep", { tok: bm, body: { con, nen: "windows" } })).body.hanPhut, 10);
});

test("L8 «Cài giống máy trước»: máy mới của Con khác nhận chế độ chặn, giờ, quỹ phút, luật app của Con dùng máy trước; Con đích giữ luật riêng của mình", async () => {
  const bm = await dangKy("Mẹ Hà");
  const anh = (await m("thiet-lap", { tok: bm, body: { con: { ten: "Bảo Anh" }, gioChoi: { ngayThuong: 60, cuoiTuan: 120 }, ngu: { tu: "21:30", den: "06:30" },
    cheDoChan: "mo_het", apps: [{ ma: "minecraft" }, { ten: "Sách Điện Tử", tinhGio: false }] } })).body.conId;
  await m("luat", { tok: bm, body: { con: anh, muc: "tiktok.com", loai: "chan" } });
  const minh = (await m("con", { tok: bm, body: { ten: "Bảo Minh" } })).body.id;
  await m("luat", { tok: bm, body: { con: minh, muc: "tiktok.com", loai: "hoc" } });
  const pgA = (await m("ghep-may", { tok: bm, body: { con: anh } })).body;
  const mayA = (await dv("ghep", { body: { ma: pgA.ma, nen: "windows", tenMay: "Laptop của Bảo Anh" } })).body;
  // ghép máy mới cho Bảo Minh, giống Laptop của Bảo Anh
  const pgM = (await m("ghep-may", { tok: bm, body: { con: minh, giongMay: mayA.deviceId } })).body;
  assert.equal(pgM.giongMay, mayA.deviceId);
  await dv("ghep-goi", { body: { token: pgM.tokenGoi, nen: "windows", tenMay: "PC của Bảo Minh" } });
  const c = (await q<{ che_do_chan: string; lich: any; cau_hinh: any }>(`select che_do_chan, lich, cau_hinh from children where id = $1`, [minh]))[0];
  assert.deepEqual([c.che_do_chan, c.lich.ngu, c.cau_hinh.quy_ngay_thuong, c.cau_hinh.quy_cuoi_tuan], ["mo_het", { tu: "21:30", den: "06:30" }, 60, 120]);
  const luat = await q<{ muc: string; loai: string }>(`select muc, loai from app_rules where child_id = $1`, [minh]);
  assert.ok(luat.some((l) => l.muc === "minecraft.exe" && l.loai === "giai_tri"));
  assert.equal(luat.find((l) => l.muc === "tiktok.com")!.loai, "hoc", "luật riêng của Con đích giữ nguyên");
  assert.equal((await q(`select 1 from app_theo_ten where child_id = $1 and ten = 'Sách Điện Tử'`, [minh])).length, 1);
  assert.equal((await q(`select 1 from events where loai = 'sao_chep_cai_dat' and child_id = $1`, [minh])).length, 1);
  // máy để giống không thuộc nhà ⇒ 404
  const khac = await dangKy("Nhà khác");
  assert.equal((await m("ghep-may", { tok: khac, body: { giongMay: mayA.deviceId } })).status, 404);
});

test("L7 «Thêm app khác» theo tên: máy gửi danh sách app thật ⇒ khớp tên (không dấu, không phân biệt hoa) ⇒ ghi luật; không đè luật Ba Mẹ đã đặt", async () => {
  const bm = await dangKy("Mẹ Ngọc");
  const con = (await m("thiet-lap", { tok: bm, body: { con: { ten: "Su" }, apps: [{ ten: "sach dien tu", tinhGio: false }, { ten: "Game Lạ" }] } })).body.conId;
  await m("luat", { tok: bm, body: { con, muc: "gamela.exe", loai: "chan" } });
  const pg = (await m("ghep-may", { tok: bm, body: { con } })).body;
  const may = (await dv("ghep", { body: { ma: pg.ma, nen: "windows", tenMay: "PC của Su" } })).body.token;
  const ds = [{ khoa: "exe:c:/sach/sach.exe", muc: "sachdientu.exe", ten: "Sách Điện Tử" }, { khoa: "exe:c:/g/gamela.exe", muc: "gamela.exe", ten: "Game lạ" },
    { khoa: "exe:c:/x/x.exe", muc: "x.exe", ten: "Khác" }];
  assert.equal((await dv("ung-dung", { tok: may, body: { du: true, bam: "a".repeat(64), ds } })).status, 200);
  const luat = await q<{ muc: string; loai: string }>(`select muc, loai from app_rules where child_id = $1 order by muc`, [con]);
  assert.deepEqual(luat.map((l) => [l.muc, l.loai]), [["gamela.exe", "chan"], ["sachdientu.exe", "hoc"]]);
  assert.equal((await q(`select 1 from app_theo_ten where child_id = $1 and khop_luc is not null`, [con])).length, 2);
  // thêm app sau thiết lập: app thật đã có trên máy ⇒ khớp ngay
  const them = (await m(`con/${con}/app-cho-phep`, { tok: bm, body: { apps: [{ ten: "KHÁC" }] } })).body;
  assert.deepEqual(them.daDat, [{ ten: "KHÁC", muc: ["x.exe"] }]);
});

test("L4 chế độ chặn theo Con + web luôn chặn + Con «Xin Ba Mẹ duyệt» (lý do không bắt buộc, bấm lại không trùng); Policy mang chế độ", async () => {
  const bm = await dangKy("Ba Khoa");
  const con = (await m("con", { tok: bm, body: { ten: "Na" } })).body.id;
  assert.equal((await m(`con/${con}`, { tok: bm })).body.cheDoChan, "chi_app_duoc_phep", "Con mới: Chặn app & web");
  const pg = (await m("ghep-may", { tok: bm, body: { con } })).body;
  const may = (await dv("ghep", { body: { ma: pg.ma, nen: "windows", tenMay: "PC của Na" } })).body.token;
  await luonChoiDuoc(con);
  let p = (await dv("dong-bo", { tok: may, body: {} })).body;
  assert.deepEqual([p.cheDoChan, p.windows.mode, p.windows.web.cheDo], ["chi_app_duoc_phep", "hoc", "chi_cho_phep"]);
  assert.ok(p.webLuonChan.includes("pornhub.com") && p.windows.web.chan.includes("pornhub.com"));
  assert.equal((await m(`con/${con}/che-do-chan`, { tok: bm, body: { cheDo: "mo_het" } })).body.cheDoChan, "mo_het");
  p = (await dv("dong-bo", { tok: may, body: {} })).body;
  assert.deepEqual([p.cheDoChan, p.windows.mode, p.windows.web.cheDo], ["mo_het", "tu_do", "mo"]);
  assert.ok(p.windows.web.chan.includes("bet365.com"), "Mở hết vẫn chặn cờ bạc");
  assert.equal((await m(`con/${con}/che-do-chan`, { tok: bm, body: { cheDo: "giam_sat" } })).body.error, "che_do_chan_sai");
  assert.equal((await q(`select 1 from events where loai = 'doi_che_do_chan' and child_id = $1`, [con])).length, 1);
  // Ba Mẹ không cho phép được web luôn chặn
  assert.equal((await m("luat", { tok: bm, body: { con, muc: "www.pornhub.com", loai: "hoc" } })).body.error, "web_cam");
  assert.equal((await m("luat", { tok: bm, body: { con, muc: "pornhub.com", loai: "chan" } })).status, 200);
  // Con xin duyệt app lạ từ màn chặn (agent) — không lý do
  const x = (await dv("xin-duyet", { tok: may, body: { muc: "CapCut.exe" } })).body;
  assert.deepEqual([x.trang_thai, x.daCo, x.loai, x.muc], ["cho", false, "cai_app", "capcut.exe"]);
  assert.equal((await dv("xin-duyet", { tok: may, body: { muc: "capcut.exe" } })).body.id, x.id, "bấm lại không gửi trùng");
  const w = (await k("xin-duyet", { tok: may, body: { muc: "https://www.youtube.com/watch?v=1", lyDo: "Con xem video hướng dẫn vẽ ạ" } })).body;
  assert.deepEqual([w.loai, w.muc], ["mo_web", "youtube.com"]);
  assert.equal((await dv("xin-duyet", { tok: may, body: { muc: "m.xvideos.com" } })).body.error, "web_cam");
  const cho = (await m("cho-duyet", { tok: bm })).body.yeuCau;
  assert.equal(cho.length, 2);
  // Ba Mẹ đồng ý app ⇒ luật cho phép (không dùng điểm)
  assert.equal((await m(`yeu-cau/${x.id}/dong-y`, { tok: bm, body: { phanLoai: "giai_tri", phamVi: "vinh_vien" } })).status, 200);
  assert.equal((await q<{ loai: string }>(`select loai from app_rules where child_id = $1 and muc = 'capcut.exe'`, [con]))[0].loai, "giai_tri");
});
