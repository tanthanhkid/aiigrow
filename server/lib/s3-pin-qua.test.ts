// Thiết kế chốt 06/11 (S3 — docs/KE-HOACH-KHOP-THIET-KE-0611.md L13 L14 L19): PIN theo bé trên máy dùng chung, Ba Mẹ mở máy bằng mã,
// quà bảng giá (7 quà mặc định, thư viện, giữ / trao / huỷ / xoá hoàn sao, voucher QR + hạn, điều kiện), mã mở máy 15/30/60 phút,
// máy mất mạng hôm nay, chuông = số mục «Cần Ba Mẹ để ý».
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyM } = await import("./api-m.ts");
const { xuLyCon } = await import("./api-con.ts");
const { xuLyMay } = await import("./api-may.ts");
const g = await import("./gia-dinh.ts");
const v = await import("./vi.ts");
const pt = await import("./phan-thuong.ts");
const qb = await import("./qua-bang-gia.ts");
const mo = await import("./ma-offline.ts");
const cdy = await import("./can-de-y.ts");
const tt = await import("./tuan-thu.ts");
const { q, one } = await import("./db.ts");
const { gioDiaPhuong } = await import("./gio.ts");
const { taoNha, taoBaMe } = await import("./test-fixtures/nha.ts");
const { taoPhien } = await import("./auth.ts");

const VN = (s: string) => new Date(`${s}+07:00`);
const loi = async (p: Promise<unknown>, ma: string) => assert.rejects(p, (e: { ma?: string }) => e.ma === ma);

const goi = (xuLy: (r: Request, p: string[]) => Promise<Response>, goc: string) =>
  async (tok: string, duong: string, body?: unknown, hdr: Record<string, string> = {}) => {
    const r = await xuLy(new Request(`http://x/api/${goc}/${duong}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${tok}`, ...hdr },
      body: body === undefined ? undefined : JSON.stringify(body),
    }), duong.split("?")[0].split("/"));
    return { status: r.status, body: (await r.json()) as any };
  };
const m = goi(xuLyM, "m"), k = goi(xuLyCon, "kid"), dv = goi(xuLyMay, "device");

/** Nhà có 2 bé (Bảo Anh có PIN 4821, Bảo Minh chưa có PIN) + PC dùng chung + laptop riêng của Bảo Anh. */
async function nha() {
  const { fam, bm } = await taoNha();
  const tokBm = await taoPhien(bm);
  const anh = (await m(tokBm, "con", { ten: "Bảo Anh", pin: "4821" })).body.id as string;
  const minh = (await m(tokBm, "con", { ten: "Bảo Minh" })).body.id as string;
  const chung = await g.ghepMay(await g.taoMaGhep(fam, null, "windows"), "windows", "PC phòng khách");
  const rieng = await g.ghepMay(await g.taoMaGhep(fam, anh, "windows"), "windows", "Laptop của Bảo Anh");
  return { fam, bm, tokBm, anh, minh, chung: { id: chung.deviceId as string, tok: chung.token as string }, rieng: { id: rieng.deviceId as string, tok: rieng.token as string } };
}

// ================================================================ L13 — PIN theo bé

test("L13 Ba Mẹ: đặt PIN lúc Thêm con, xem / đặt lại ở Hồ sơ; sai dạng ⇒ pin_sai_dang; Người trông giúp không đặt được", async () => {
  const { fam, tokBm, anh, minh } = await nha();
  assert.equal((await m(tokBm, `con/${anh}`)).body.coPin, true);
  assert.equal((await m(tokBm, `con/${minh}`)).body.coPin, false);
  const xem = (await m(tokBm, `con/${anh}/pin`)).body;
  assert.deepEqual([xem.coPin, xem.pin, xem.ten], [true, "4821", "Bảo Anh"]);
  assert.ok(xem.pinDatLuc);
  assert.equal((await m(tokBm, `con/${anh}/pin`, { pin: "12a4" })).body.error, "pin_sai_dang");
  assert.equal((await m(tokBm, "con", { ten: "Khang", pin: "123" })).body.error, "pin_sai_dang");
  const dat = (await m(tokBm, `con/${minh}/pin`, { pin: "0707" })).body;
  assert.deepEqual([dat.coPin, dat.ten], [true, "Bảo Minh"]);
  assert.equal((await m(tokBm, `con/${minh}/pin`)).body.pin, "0707");
  const tg = await taoPhien(await taoBaMe(fam, "Bà", "trong_giup"));
  assert.equal((await m(tg, `con/${minh}/pin`, { pin: "1111" })).status, 403);
  assert.equal((await m(tg, `con/${minh}/pin`)).body.pin, "0707", "Người trông giúp vẫn xem được");
  // bỏ PIN ⇒ bé chọn tên vào thẳng
  assert.equal((await m(tokBm, `con/${minh}/pin`, { pin: null })).body.coPin, false);
});

test("L13 máy dùng chung: danh sách bé + vân PIN; sai 5 lần ⇒ chờ 15 giây (đếm ở máy chủ); đúng ⇒ bé đang dùng, nhịp / đồng bộ tính theo bé", async () => {
  const { anh, minh, chung } = await nha();
  const hs = (await dv(chung.tok, "ho-so")).body;
  assert.deepEqual(hs.con.map((c: any) => [c.ten, c.coPin]), [["Bảo Anh", true], ["Bảo Minh", false]]);
  const bm = (await one<{ offline_secret: string }>(`select offline_secret from devices where id = $1`, [chung.id]))!.offline_secret;
  assert.equal(hs.con[0].vanPin, createHmac("sha256", bm).update(`${anh}:4821`).digest("hex"), "agent kiểm PIN khi mất mạng");
  assert.equal(hs.con[1].vanPin, undefined);
  assert.deepEqual([hs.dangDung, hs.baMeDung, hs.mayRieng], [null, null, false]);
  // sai 4 lần: còn 4 → 1 lần thử; lần 5 ⇒ khoá 15 giây; đang khoá thì PIN đúng cũng chờ
  for (let i = 4; i >= 1; i--) {
    const r = await dv(chung.tok, "dang-nhap-be", { con: anh, pin: "0000" });
    assert.deepEqual([r.status, r.body.error, r.body.conLan], [401, "pin_sai", i]);
  }
  const khoa = await dv(chung.tok, "dang-nhap-be", { con: anh, pin: "0000" });
  assert.deepEqual([khoa.status, khoa.body.error, khoa.body.choGiay], [429, "pin_tam_khoa", 15]);
  assert.equal((await dv(chung.tok, "dang-nhap-be", { con: anh, pin: "4821" })).body.error, "pin_tam_khoa");
  assert.ok((await dv(chung.tok, "ho-so")).body.con[0].choGiay > 0, "màn đếm ngược 0:15");
  assert.equal((await dv(chung.tok, "dang-nhap-be", { con: anh })).status, 429);
  await q(`update pin_sai set khoa_den = now() - interval '1 second' where khoa = $1`, [`pin:${chung.id}:${anh}`]);   // hết 15 giây
  assert.equal((await dv(chung.tok, "dang-nhap-be", { con: anh })).body.error, "can_pin");
  const vao = (await dv(chung.tok, "dang-nhap-be", { con: anh, pin: "4821" })).body;
  assert.ok(vao.phienCon);
  assert.deepEqual([vao.con.ten, vao.coPin], ["Bảo Anh", true]);
  // không kèm X-Phien-Con: đồng bộ / nhịp vẫn của Bảo Anh
  const db = (await dv(chung.tok, "dong-bo", {})).body;
  assert.deepEqual([db.con?.id, db.windows.childName, db.nguoiDung.loai, db.nguoiDung.con.ten], [anh, "Bảo Anh", "con", "Bảo Anh"]);
  assert.equal((await dv(chung.tok, "nhip", {})).body.nguoiDung.con.id, anh);
  assert.equal((await dv(chung.tok, "hoc-vien/tong-quan")).status, 200, "khay chạy không cần header");
  assert.equal((await dv(chung.tok, "ho-so")).body.dangDung.id, anh);
  // Bảo Minh chưa có PIN ⇒ chọn tên vào thẳng (đổi bé)
  const vm = (await dv(chung.tok, "dang-nhap-be", { con: minh })).body;
  assert.deepEqual([vm.con.ten, vm.canDatPin], ["Bảo Minh", true]);
  assert.equal((await dv(chung.tok, "dong-bo", {})).body.con.id, minh);
  // Đăng xuất ⇒ máy về màn chọn tên, không bé nào
  assert.deepEqual((await dv(chung.tok, "dang-xuat", {})).body, { ok: true, khoa: true });
  assert.equal((await dv(chung.tok, "dong-bo", {})).body.nguoiDung.loai, "chua");
  assert.equal((await dv(chung.tok, "hoc-vien/tong-quan")).body.error, "chua_chon_con");
});

test("L13 máy riêng vẫn hỏi PIN; agent cũ chọn tên (chon-con) vẫn chạy; Quên PIN ⇒ báo Ba Mẹ, đặt PIN mới thì báo xong", async () => {
  const { fam, tokBm, anh, minh, chung, rieng } = await nha();
  assert.deepEqual((await dv(rieng.tok, "ho-so")).body.con.map((c: any) => c.ten), ["Bảo Anh"]);
  assert.equal((await dv(rieng.tok, "dang-nhap-be", { con: minh })).status, 404);
  assert.equal((await dv(rieng.tok, "dang-nhap-be", { con: anh, pin: "1111" })).body.error, "pin_sai");
  assert.ok((await dv(rieng.tok, "dang-nhap-be", { con: anh, pin: "4821" })).body.phienCon);
  // agent cũ: chon-con / pin không PIN ⇒ vẫn ra phiên như trước; không header ⇒ không bé nào (nghĩa cũ)
  const pc = (await dv(chung.tok, "pin", { con: anh, pin: "bỏ qua" })).body.phienCon;
  assert.ok(pc);
  assert.equal((await dv(chung.tok, "dong-bo", {}, { "x-phien-con": pc })).body.con.id, anh);
  assert.equal((await dv(chung.tok, "dong-bo", {})).body.con, null);
  await dv(chung.tok, "dang-nhap-be", { con: anh, pin: "4821" });
  assert.equal((await m(tokBm, `con/${anh}`)).body.may.find((x: any) => x.id === chung.id).dangDung, anh);
  // Quên PIN
  const qp = (await dv(chung.tok, "quen-pin", { con: anh })).body;
  assert.deepEqual(qp, { daGui: true, lapLai: false });
  assert.equal((await dv(chung.tok, "quen-pin", { con: anh })).body.lapLai, true, "bấm lại không báo trùng");
  let c = (await m(tokBm, "can-de-y")).body;
  const muc = c.ds.find((x: any) => x.loai === "quen_pin");
  assert.ok(muc && /Bảo Anh quên PIN/.test(muc.tieu) && muc.den === `/ho-so/${anh}/pin`);
  await m(tokBm, `con/${anh}/pin`, { pin: "5555" });
  c = (await m(tokBm, "can-de-y")).body;
  assert.ok(!c.ds.some((x: any) => x.loai === "quen_pin"), "đặt PIN mới ⇒ mục quên PIN xong");
  assert.equal((await dv(chung.tok, "dang-nhap-be", { con: anh, pin: "4821" })).body.error, "pin_sai");
  assert.ok((await dv(chung.tok, "dang-nhap-be", { con: anh, pin: "5555" })).body.phienCon);
  void fam;
});

test("L13 Ba Mẹ nhập mã mở máy ⇒ «Ba Mẹ đang dùng máy» theo số phút của mã: máy mở hết, không tính giờ con; Khoá lại ⇒ về chọn tên", async () => {
  const { tokBm, anh, chung, rieng } = await nha();
  await dv(chung.tok, "dang-nhap-be", { con: anh, pin: "4821" });
  const sai = await dv(chung.tok, "ba-me-mo", { ma: "000000" });
  assert.deepEqual([sai.status, sai.body.error, sai.body.conLan], [401, "ma_sai", 4]);
  const ma30 = (await m(tokBm, `may/${chung.id}/ma-offline?phut=30`)).body;
  assert.deepEqual([ma30.phutMo, ma30.maHien.length, ma30.may.ten], [30, 7, "PC phòng khách"]);
  const t0 = Date.now();
  const r = (await dv(chung.tok, "ba-me-mo", { ma: ma30.ma })).body;
  assert.equal(r.phut, 30);
  assert.ok(Math.abs(Date.parse(r.baMeDung.den) - t0 - 30 * 60_000) < 5000);
  // máy mở hết, không bé nào, quỹ của con không gửi; phút dùng gửi lúc này bỏ
  const db = (await dv(chung.tok, "dong-bo", { usage: [{ muc: "roblox.exe", phut: 25 }] })).body;
  assert.deepEqual([db.windows.mode, db.windows.locked, db.nguoiDung.loai, db.con], ["tu_do", false, "ba_me", null]);
  assert.equal(db.windows.grantEndsAt, r.baMeDung.den);
  assert.equal(db.windows.quyConPhut, undefined);
  assert.equal((await q(`select 1 from usage where device_id = $1`, [chung.id])).length, 0);
  assert.equal((await dv(chung.tok, "nhip", {})).body.baMeDung.den, r.baMeDung.den);
  assert.equal((await dv(chung.tok, "ho-so")).body.baMeDung.den, r.baMeDung.den);
  assert.equal((await m(tokBm, `may/${chung.id}/nguoi-dung`)).body.baMeDung.den, r.baMeDung.den);
  // máy riêng, đang giờ ngủ / khoá: Ba Mẹ mở bằng mã vẫn mở hết
  await m(tokBm, `con/${anh}/khoa`, { khoa: true });
  const ma15 = (await m(tokBm, `may/${rieng.id}/ma-offline?phut=15`)).body.ma;
  assert.equal((await dv(rieng.tok, "ba-me-mo", { ma: ma15 })).body.phut, 15);
  const dr = (await dv(rieng.tok, "dong-bo", {})).body;
  assert.deepEqual([dr.windows.mode, dr.windows.locked], ["tu_do", false]);
  // Khoá lại; mã đã dùng không dùng lại được (Con thấy mã Ba Mẹ gõ)
  await dv(chung.tok, "khoa-lai", {});
  await dv(chung.tok, "ba-me-mo", { ma: "000000" });
  assert.deepEqual([(await dv(chung.tok, "ba-me-mo", { ma: ma30.ma })).status, (await dv(chung.tok, "ba-me-mo", { ma: ma30.ma })).body.error], [409, "ma_da_dung"]);
  assert.equal((await dv(chung.tok, "ba-me-mo", { ma: "000000" })).body.conLan, 1, "gõ lại mã đã dùng không xoá bộ đếm sai");
  assert.equal((await dv(rieng.tok, "nhip", {})).body.nguoiDung.loai, "ba_me", "máy riêng lúc Ba Mẹ dùng: không bé nào");
  const sau = (await dv(chung.tok, "dong-bo", {})).body;
  assert.equal(sau.nguoiDung.loai, "chua");
  assert.ok(!sau.baMeDung);
  // lượt sai thứ 5 (2 lần sai + 2 lượt mã đã dùng ở trên) ⇒ chờ
  assert.equal((await dv(chung.tok, "ba-me-mo", { ma: "111111" })).body.error, "ma_tam_khoa");
});

// ================================================================ L19 — mã mở máy 15/30/60, mất mạng, chuông

test("L19 mã mở máy mang số phút: 60 = mã cũ (agent cũ hiểu), 15 / 30 biến thể riêng; agent nhận bí mật qua đồng bộ / nhịp", async () => {
  const s = mo.taoBiMatOffline(), t = new Date("2026-11-06T12:00:00Z");
  assert.equal(mo.maOfflinePhut(s, 60, t), mo.maOffline(s, t));
  for (const p of [60, 30, 15] as const) assert.equal(mo.kiemMaOfflinePhut(s, mo.maOfflinePhut(s, p, t), t), p);
  assert.equal(mo.kiemMaOfflinePhut(s, mo.maOfflinePhut(s, 30, t), new Date(t.getTime() + 20 * 60_000)), null, "hết hạn");
  const { fam, bm, chung } = await nha();
  const r = await tt.maOfflineChoMay(fam, chung.id, bm, t, "45");
  assert.equal(r.phutMo, 60, "giá trị lạ ⇒ 60");
  assert.ok(r.doiSauGiay > 0 && r.doiSauGiay <= 300);
  assert.ok((await dv(chung.tok, "dong-bo", {})).body.windows.maOfflineBiMat);
});

test("L19 máy con mất mạng hôm nay + chuông = số mục «Cần Ba Mẹ để ý» (Hôm nay, Thông báo)", async () => {
  const { fam, tokBm, anh, rieng, chung } = await nha();
  const now = VN("2026-11-06T19:40:00");
  await q(`update devices set last_seen = $2 where id = $1`, [rieng.id, VN("2026-11-06T19:20:00")]);
  await q(`update devices set last_seen = $2 where id = $1`, [chung.id, VN("2026-11-05T19:20:00")]);   // hôm qua ⇒ không tính
  let mm = await cdy.mayMatMang(fam, now);
  assert.deepEqual(mm.map((x) => [x.ten, x.conId, x.phut]), [["Laptop của Bảo Anh", anh, 20]]);
  // tắt máy sạch (agent báo trước) ⇒ không phải mất mạng
  await q(`insert into tuan_thu_may(device_id, family_id, tat_luc) values ($1,$2,$3) on conflict (device_id) do update set tat_luc = excluded.tat_luc`,
    [rieng.id, fam, VN("2026-11-06T19:20:00")]);
  assert.equal((await cdy.mayMatMang(fam, now)).length, 0);
  await q(`update tuan_thu_may set tat_luc = null where device_id = $1`, [rieng.id]);
  const c = await cdy.canDeY(fam, now);
  const mat = c.ds.find((x) => x.loai === "mat_mang")!;
  assert.deepEqual([mat.tieu, mat.phu, mat.nut, mat.den], ["Laptop của Bảo Anh mất mạng", "19:20 · Con cần mã để mở máy", "Lấy mã", `/may/${rieng.id}/ma-offline`]);
  assert.equal(c.soChuong, c.ds.length);
  // qua API (đồng hồ thật): máy im 15 phút trong hôm nay (bỏ qua 20 phút đầu ngày ⇒ không lấn sang hôm qua)
  if (gioDiaPhuong(new Date(), "Asia/Ho_Chi_Minh").phut >= 20) {
    await q(`update devices set last_seen = now() - interval '15 minutes' where id = $1`, [rieng.id]);
    await q(`insert into alerts(id, family_id, child_id, loai, muc, noi_dung) values ('a1', $1, $2, 'web_cam', 'chu_y', 'Bảo Anh mở trang bị chặn')`, [fam, anh]);
    const gd = (await m(tokBm, "gia-dinh")).body;
    assert.equal(gd.con.find((x: any) => x.id === anh).matMang[0].ten, "Laptop của Bảo Anh");
    const tb = (await m(tokBm, "thong-bao")).body;
    const cd = (await m(tokBm, "can-de-y")).body;
    assert.deepEqual([gd.soChuong, tb.soChuong], [cd.soChuong, cd.soChuong]);
    assert.ok(cd.ds.some((x: any) => x.loai === "canh_bao" && /trang bị chặn/.test(x.tieu)));
    assert.equal(cd.ds[0].loai, "mat_mang", "mất mạng đứng đầu");
    assert.equal((await m(tokBm, `con/${anh}`)).body.may.find((x: any) => x.id === rieng.id).matMang, true);
    assert.equal((await m(tokBm, "may-mat-mang")).body.ds.length, 1);
  }
});

// ================================================================ L14 — quà bảng giá

test("L14 7 quà mặc định gieo MỘT lần khi tạo Con (đúng tên + sao trong màn); bước «Chọn quà» bỏ tick thì bỏ", async () => {
  const { fam, tokBm } = await nha();
  const ds = (await m(tokBm, "qua")).body.ds;
  assert.deepEqual(ds.map((x: any) => [x.ten, x.sao]), [["Chọn món bữa tối", 50], ["Đi ăn kem", 100], ["AiiCafe 20k", 200], ["Đồ chơi nhỏ", 200],
    ["Đi xem phim", 300], ["AiiCafe 50k", 500], ["Bộ Lego", 800]]);
  const phim = ds.find((x: any) => x.mau === "xem_phim"), lego = ds.find((x: any) => x.mau === "lego"), v20 = ds.find((x: any) => x.mau === "aiicafe_20k");
  assert.deepEqual([phim.chiCuoiTuan, lego.tonKho, v20.laVoucher, v20.menhGia, v20.moTa], [true, 1, true, 20000, "Voucher QR · 60 ngày"]);
  assert.equal((await m(tokBm, "qua/mac-dinh")).body.ds.every((x: any) => x.daCo), true);
  // Con thứ ba không gieo thêm
  await m(tokBm, "con", { ten: "Khang" });
  assert.equal((await m(tokBm, "qua")).body.ds.length, 7);
  // bỏ tick Lego + AiiCafe 50k ⇒ còn 5
  const sau = (await m(tokBm, "qua/mac-dinh", { chon: ["bua_toi", "an_kem", "aiicafe_20k", "do_choi_nho", "xem_phim"] })).body.ds;
  assert.equal(sau.length, 5);
  assert.equal((await m(tokBm, "qua/mac-dinh", { chon: ["khong_co"] })).body.error, "mau_sai");
  // xoá hết rồi tạo Con mới ⇒ không gieo lại (Ba Mẹ chủ ý)
  await q(`delete from rewards where family_id = $1`, [fam]);
  await m(tokBm, "con", { ten: "Tí" });
  assert.equal((await m(tokBm, "qua")).body.ds.length, 0);
});

test("L14 thư viện (14/11: Ba Mẹ mua · Quà nhà) + «Đã có»; thêm từ thư viện; quà áp cho riêng một Con; tự đặt quà riêng (voucher được tạo lại)", async () => {
  const { tokBm, anh, minh, rieng } = await nha();
  const tv = (await m(tokBm, "qua/thu-vien")).body;
  assert.deepEqual(tv.nhom.map((x: any) => x.ma), ["ba_me_mua", "qua_nha"]);
  const tat = tv.nhom.flatMap((x: any) => x.ds);
  assert.deepEqual(tat.filter((x: any) => x.daCo).map((x: any) => x.ma).sort(), ["aiicafe_20k", "aiicafe_50k", "an_kem", "bua_toi", "do_choi_nho", "lego", "xem_phim"]);
  assert.equal(tat.find((x: any) => x.ma === "aiicafe_100k").sao, 1000);
  assert.equal(tat.find((x: any) => x.ma === "sach_aiilab").menhGia, 60_000);
  assert.ok(!tat.some((x: any) => x.ma === "sach_moi"), "mẫu 06/11 bỏ khỏi màn — vẫn nhận mã (app cũ)");
  const them = (await m(tokBm, "qua/thu-vien", { mau: ["sach_moi", "ngu_nuong", "bua_toi"], con: minh })).body;
  assert.equal(them.taoMoi, 2, "đã có thì bỏ qua");
  assert.equal((await m(tokBm, "qua/thu-vien", { mau: ["xx"] })).body.error, "mau_sai");
  // quà áp cho Bảo Minh: Bảo Anh không thấy, không đổi được
  const sach = them.ids[0];
  assert.ok(!(await dv(rieng.tok, "hoc-vien/cua-hang")).body.qua.some((x: any) => x.id === sach));
  assert.equal((await pt.doiQua(anh, sach).catch((e) => e.ma)), "khong_thay");
  assert.ok((await m(tokBm, `qua?con=${minh}`)).body.ds.some((x: any) => x.id === sach));
  assert.ok(!(await m(tokBm, `qua?con=${anh}`)).body.ds.some((x: any) => x.id === sach));
  // tự đặt + sửa (camelCase)
  const id = (await m(tokBm, "qua", { ten: "AiiCafe 30k", loai: "voucher", sao: 300, menhGia: 30000, moTa: "Voucher QR", apCho: [anh] })).body.id;
  const sua = (await m(tokBm, `qua/${id}`, { sao: 280, toiDaThang: 2, chiCuoiTuan: true, hinh: "aiicafe" })).body.qua;
  assert.deepEqual([sua.sao, sua.toiDaThang, sua.chiCuoiTuan, sua.hinh, sua.apCho], [280, 2, true, "aiicafe", [anh]]);
  assert.equal((await m(tokBm, `qua/${id}`, { apCho: ["khong-co"] })).status, 404);
});

test("L13 khoá PIN chịu được gửi song song: 20 lượt cùng lúc chỉ 5 lượt được so", async () => {
  const { anh, chung } = await nha();
  const ds = await Promise.all(Array.from({ length: 20 }, (_, i) => dv(chung.tok, "dang-nhap-be", { con: anh, pin: String(1000 + i) })));
  assert.equal(ds.filter((r) => r.status === 401).length, 4);
  assert.equal(ds.filter((r) => r.status === 429).length, 16);
  assert.equal((await dv(chung.tok, "dang-nhap-be", { con: anh, pin: "4821" })).status, 429, "đúng PIN cũng chờ");
});

test("L14 đổi quà ⇒ sao GIỮ chờ trao; Ba Mẹ trao (trừ hẳn) / huỷ (hoàn); xoá quà ⇒ hoàn mọi phiếu đang giữ", async () => {
  const { fam, bm, tokBm, anh, rieng } = await nha();
  await v.dieuChinhTay(fam, anh, 400, "Sao thử", bm);
  const ds = (await m(tokBm, "qua")).body.ds;
  const bua = ds.find((x: any) => x.mau === "bua_toi"), kem = ds.find((x: any) => x.mau === "an_kem"), dc = ds.find((x: any) => x.mau === "do_choi_nho");
  const d1 = (await dv(rieng.tok, `hoc-vien/doi/${bua.id}`, {})).body;
  assert.deepEqual([d1.trangThai, d1.saoGiu], ["cho_trao", 50]);
  const vi = (await m(tokBm, `con/${anh}/vi`)).body;
  assert.deepEqual([vi.sao, vi.saoGiu], [350, 50], "«Con đang có 350 sao · Đang giữ 50 sao»");
  const ph = (await m(tokBm, `phieu/${d1.phieu}`)).body;
  assert.deepEqual([ph.ten, ph.sao, ph.dangGiu, ph.con.ten], ["Chọn món bữa tối", 50, true, "Bảo Anh"]);
  const tr = (await m(tokBm, `phieu/${d1.phieu}/trao`, {})).body;
  assert.deepEqual([tr.trangThai, tr.saoTru], ["da_trao", 50]);
  assert.deepEqual([(await v.tomTatVi(anh)).sao, (await v.tomTatVi(anh)).saoGiu], [350, 0]);
  // huỷ ⇒ hoàn
  const d2 = (await k(rieng.tok, `doi/${kem.id}`, {})).body;
  assert.equal(d2.saoGiu, 100, "tổng sao đang giữ");
  await m(tokBm, `phieu/${d2.phieu}/huy`, {});
  assert.equal(await v.soDu(anh), 350);
  // xoá quà ⇒ hoàn sao phiếu đang giữ, «Sao con đã có không bị mất»
  await k(rieng.tok, `doi/${dc.id}`, {});
  assert.equal(await v.soDu(anh), 150);
  const xoa = (await m(tokBm, `qua/${dc.id}/xoa`, {})).body;
  assert.deepEqual([xoa.hoanPhieu, xoa.hoanSao], [1, 200]);
  assert.equal(await v.soDu(anh), 350);
  assert.ok(!(await m(tokBm, "qua")).body.ds.some((x: any) => x.id === dc.id));
  assert.equal((await m(tokBm, `qua/${dc.id}/xoa`, {})).status, 404);
});

test("L14 voucher AiiCafe bật lại: đổi ⇒ giữ sao, chưa có mã; Ba Mẹ trao ⇒ mã QR + hạn 60 ngày; quầy quét được một lần", async () => {
  const { fam, bm, tokBm, anh, rieng } = await nha();
  await v.dieuChinhTay(fam, anh, 500, "Sao thử", bm);
  const v20 = (await m(tokBm, "qua")).body.ds.find((x: any) => x.mau === "aiicafe_20k");
  assert.ok((await k(rieng.tok, "cua-hang")).body.qua.some((x: any) => x.id === v20.id), "voucher hiện ở cửa hàng Con");
  const d = (await dv(rieng.tok, `hoc-vien/doi/${v20.id}`, {})).body;
  assert.deepEqual([d.trangThai, d.voucher], ["cho_trao", null]);
  assert.equal((await k(rieng.tok, "vi-qua")).body.voucher.length, 0, "chưa trao ⇒ chưa có mã");
  assert.equal((await one<{ quy_voucher: number }>(`select quy_voucher from families where id = $1`, [fam]))!.quy_voucher, 0, "không cần quỹ phiếu");
  const t0 = Date.now();
  const tr = (await m(tokBm, `phieu/${d.phieu}/trao`, {})).body;
  assert.equal(tr.voucher.qr, tr.voucher.ma);
  assert.ok(Math.abs(Date.parse(tr.voucher.hetHan) - t0 - 60 * 86_400_000) < 10_000);
  const vq = (await k(rieng.tok, "vi-qua")).body.voucher[0];
  assert.deepEqual([vq.qr, vq.menh_gia, vq.conNgay, vq.ten], [tr.voucher.ma, 20000, 60, "AiiCafe 20k"]);
  assert.equal((await pt.quetVoucher(tr.voucher.ma, "Q1")).ketQua, "hop_le");
  assert.equal((await pt.quetVoucher(tr.voucher.ma, "Q1")).ketQua, "da_dung");
  assert.equal(await v.soDu(anh), 300);
  // huỷ voucher đang giữ ⇒ hoàn, thu hồi
  const d2 = (await k(rieng.tok, `doi/${v20.id}`, {})).body;
  assert.equal(d2.trang_thai, "cho_trao");
  await m(tokBm, `phieu/${d2.phieu}/huy`, {});
  assert.equal(await v.soDu(anh), 300);
  assert.equal((await one<{ trang_thai: string }>(`select trang_thai from vouchers where redemption_id = $1`, [d2.phieu]))!.trang_thai, "thu_hoi");
});

test("L14 điều kiện quà: chỉ cuối tuần, tối đa X lần / tháng, số lượng có sẵn", async () => {
  const { fam, bm, tokBm, anh } = await nha();
  await v.dieuChinhTay(fam, anh, 3000, "Sao thử", bm);
  const ds = (await m(tokBm, "qua")).body.ds;
  const phim = ds.find((x: any) => x.mau === "xem_phim"), lego = ds.find((x: any) => x.mau === "lego"), kem = ds.find((x: any) => x.mau === "an_kem");
  await loi(pt.doiQua(anh, phim.id, VN("2026-11-04T10:00:00"), { voucherTraoTay: true }), "chi_cuoi_tuan");     // thứ Tư
  await pt.doiQua(anh, phim.id, VN("2026-11-07T10:00:00"), { voucherTraoTay: true });                            // thứ Bảy
  await pt.doiQua(anh, lego.id, VN("2026-11-07T10:00:00"), { voucherTraoTay: true });
  await loi(pt.doiQua(anh, lego.id, VN("2026-11-07T10:00:00"), { voucherTraoTay: true }), "het_hang");           // «Còn 1 bộ» ⇒ hết
  await m(tokBm, `qua/${kem.id}`, { toiDaThang: 1 });
  await pt.doiQua(anh, kem.id, new Date(), { voucherTraoTay: true });
  await loi(pt.doiQua(anh, kem.id, new Date(), { voucherTraoTay: true }), "du_thang");
});

// ================================================================ vá lệch #201 (M5)

test("M5 thư viện theo Con: mẫu đang áp riêng cho Con khác ⇒ áp thêm cho Con đang chọn (không còn «Đã thêm 0 quà»); quà đã cất ⇒ bật lại", async () => {
  const { tokBm, anh, minh, rieng } = await nha();
  const choMinh = (await m(tokBm, "qua/thu-vien", { mau: ["sach_aiilab"], con: minh })).body;
  assert.equal(choMinh.taoMoi, 1);
  const sach = choMinh.ids[0];
  // thư viện của Bảo Anh: sách chưa «có»
  const tvAnh = (await m(tokBm, `qua/thu-vien?con=${anh}`)).body.nhom.flatMap((x: any) => x.ds);
  assert.equal(tvAnh.find((x: any) => x.ma === "sach_aiilab").daCo, false);
  const choAnh = (await m(tokBm, "qua/thu-vien", { mau: ["sach_aiilab"], con: anh })).body;
  assert.deepEqual([choAnh.taoMoi, choAnh.ids], [1, [sach]], "một quà, áp thêm Bảo Anh — không nhân bản");
  assert.deepEqual((await one<{ ap_cho: string[] }>(`select ap_cho from rewards where id = $1`, [sach]))!.ap_cho.sort(), [anh, minh].sort());
  assert.ok((await m(tokBm, `qua?con=${anh}`)).body.ds.some((x: any) => x.id === sach));
  assert.ok((await dv(rieng.tok, "hoc-vien/cua-hang")).body.qua.some((x: any) => x.id === sach), "Bảo Anh đổi được");
  // thêm lại lần nữa ⇒ 0 (đã có thật)
  assert.equal((await m(tokBm, "qua/thu-vien", { mau: ["sach_aiilab"], con: anh })).body.taoMoi, 0);
  // quà mặc định đã cất ⇒ thêm từ thư viện bật lại
  const kem = (await m(tokBm, "qua")).body.ds.find((x: any) => x.mau === "an_kem");
  await m(tokBm, `qua/${kem.id}`, { bat: false });
  const lai = (await m(tokBm, "qua/thu-vien", { mau: ["an_kem"], con: anh })).body;
  assert.deepEqual([lai.taoMoi, lai.ids], [1, [kem.id]]);
  assert.deepEqual(Object.values((await one<{ bat: boolean; ap_cho: string[] }>(`select bat, ap_cho from rewards where id = $1`, [kem.id]))!), [true, [anh]],
    "bật lại chỉ cho Bảo Anh");
  // thư viện cả nhà khi chỉ có quà áp riêng ⇒ áp mọi Con (không «Đã thêm 0 quà»)
  const caNha = (await m(tokBm, "qua/thu-vien", { mau: ["sach_aiilab"] })).body;
  assert.deepEqual([caNha.taoMoi, caNha.ids], [1, [sach]]);
  assert.equal((await one<{ ap_cho: string[] | null }>(`select ap_cho from rewards where id = $1`, [sach]))!.ap_cho, null);
});

test("M5 «Dùng 7 quà Grow gợi ý» theo Con: bật lại quà đã cất chỉ cho Con đó, không đụng quà Ba Mẹ cất cho anh chị em; thiết lập (không con) không bật lại", async () => {
  const { tokBm, anh, minh } = await nha();
  const ds = (await m(tokBm, "qua")).body.ds;
  for (const x of ds) await m(tokBm, `qua/${x.id}`, { bat: false });
  const lego = ds.find((x: any) => x.mau === "lego");
  await m(tokBm, `qua/${lego.id}`, { apCho: [minh] });
  assert.ok((await m(tokBm, `qua/thu-vien?con=${anh}`)).body.nhom.flatMap((x: any) => x.ds).every((x: any) => !x.daCo), "quà đã cất ⇒ thư viện hiện «+»");
  // bước «Chọn quà» lúc thiết lập (không con) ⇒ KHÔNG bật lại quà đã cất, không đổi «Áp cho»
  await m(tokBm, "qua/mac-dinh", { chon: ["bua_toi", "an_kem", "aiicafe_20k", "do_choi_nho", "xem_phim", "aiicafe_50k", "lego"] });
  assert.equal((await m(tokBm, "qua")).body.ds.filter((x: any) => x.bat).length, 0);
  assert.equal((await m(tokBm, "qua/mac-dinh", { con: [] })).status, 200, "con rỗng = cả nhà, không 500");
  // xoá «Đi xem phim» rồi «Dùng 7 quà» cho Bảo Anh ⇒ tạo lại CHỈ cho Bảo Anh
  const phim = ds.find((x: any) => x.mau === "xem_phim");
  await m(tokBm, `qua/${phim.id}/xoa`, {});
  const sau = (await m(tokBm, "qua/mac-dinh", { con: anh })).body.ds;
  assert.equal(sau.length, 7);
  assert.ok(sau.every((x: any) => x.bat), "cả 7 có lại cho Bảo Anh");
  // quà cả nhà đã cất ⇒ bật lại CHỈ cho Bảo Anh; Lego Ba Mẹ cất riêng cho Bảo Minh ⇒ dòng riêng mới cho Bảo Anh, Lego của Minh vẫn cất
  assert.deepEqual((await m(tokBm, `qua?con=${minh}`)).body.ds.filter((x: any) => x.bat), []);
  assert.deepEqual(Object.values((await one<{ bat: boolean; ap_cho: string[] }>(`select bat, ap_cho from rewards where id = $1`, [lego.id]))!), [false, [minh]]);
  assert.ok(sau.filter((x: any) => x.mau !== "lego").every((x: any) => x.apCho?.length === 1 && x.apCho[0] === anh));
  // gọi lại ⇒ không đổi gì, không tạo trùng
  assert.equal((await m(tokBm, "qua/mac-dinh", { con: anh })).body.ds.length, 7);
  assert.equal((await m(tokBm, "qua")).body.ds.length, 8, "7 + Lego cũ của Minh");
});

test("M5 màn Mã mở máy: đường nhẹ mo-bang-ma?sau= chỉ trả sự kiện mở bằng mã mới; xem lại cùng mã không ghi xem_ma_offline trùng", async () => {
  const { fam, tokBm, anh, rieng } = await nha();
  const { ghiSuKien } = await import("./nhat-ky.ts");
  const dem = async () => (await q(`select 1 from events where device_id = $1 and loai = 'xem_ma_offline'`, [rieng.id])).length;
  const a = (await m(tokBm, `may/${rieng.id}/ma-offline?phut=30`)).body;
  const b = (await m(tokBm, `may/${rieng.id}/ma-offline?phut=30`)).body;
  assert.equal(a.ma, b.ma);
  assert.equal(await dem(), 1, "cùng mã ⇒ một dòng");
  await m(tokBm, `may/${rieng.id}/ma-offline?phut=15`);
  await m(tokBm, `may/${rieng.id}/ma-offline?phut=30`);
  assert.equal(await dem(), 2, "15 phút là mã khác ⇒ thêm một dòng; quay lại 30 không ghi lại");
  const moLuc = new Date(Date.now() - 1000).toISOString();
  assert.deepEqual((await m(tokBm, `may/${rieng.id}/mo-bang-ma?sau=${encodeURIComponent(moLuc)}`)).body.suKien, []);
  await ghiSuKien(fam, "may_mo_ma_offline", { phut: 30, luc: moLuc }, { con: anh, may: rieng.id });
  await ghiSuKien(fam, "may_sai_ma_offline", {}, { con: anh, may: rieng.id });
  const r = (await m(tokBm, `may/${rieng.id}/mo-bang-ma?sau=${encodeURIComponent(moLuc)}`)).body;
  assert.equal(r.suKien.length, 1);
  assert.deepEqual([r.suKien[0].loai, r.suKien[0].chi_tiet.phut], ["may_mo_ma_offline", 30]);
  assert.ok(r.bayGio);
  // sau = mili giây sau sự kiện ⇒ rỗng; máy nhà khác ⇒ 404
  assert.deepEqual((await m(tokBm, `may/${rieng.id}/mo-bang-ma?sau=${Date.now() + 60_000}`)).body.suKien, []);
  assert.equal((await m(tokBm, `may/${rieng.id}/mo-bang-ma?sau=99999999999999999`)).status, 200, "sau ngoài tầm ⇒ 10 phút trước, không 500");
  const khac = await taoPhien((await taoNha()).bm);
  assert.equal((await m(khac, `may/${rieng.id}/mo-bang-ma`)).status, 404);
  assert.equal(await dem(), 2, "đường nhẹ không ghi gì");
});
