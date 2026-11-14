// Khớp thiết kế 14/11 — phần máy chủ còn lệch: xoá hồ sơ Con (con/:id/xoa), khoá riêng một máy (may/:id/khoa ⇒ Policy.khoaNgay),
// «Sáng mai» = 6:30, «Trao luôn cho con» (qua/:id/trao-luon), hộp thư hỗ trợ quản trị (admin/ho-tro ?loc, soCho, soGap, nguoi_gui, cho_phut).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const { taoPhien } = await import("./auth.ts");
const { xuLyM } = await import("./api-m.ts");
const { xuLyMay } = await import("./api-may.ts");
const { q, one, newId } = await import("./db.ts");
const { taoNha, taoBaMe } = await import("./test-fixtures/nha.ts");
const mc = await import("./may-con.ts");
const { gioDiaPhuong } = await import("./gio.ts");
const { soDu } = await import("./vi.ts");

type Kq = { status: number; body: any };
async function goi(f: typeof xuLyM, goc: string, duong: string, o: { tok?: string; body?: unknown } = {}): Promise<Kq> {
  const r = await f(new Request(`http://app.test/api/${goc}/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  }), duong.split("?")[0].split("/"));
  return { status: r.status, body: await r.json() };
}
const m = (d: string, o?: { tok?: string; body?: unknown }) => goi(xuLyM, "m", d, o);
const dv = (d: string, o?: { tok?: string; body?: unknown }) => goi(xuLyMay, "device", d, o);

async function nha() {
  const { fam, bm } = await taoNha("Mẹ Lan");
  const a = await g.taoCon(fam, { ten: "Bảo Anh" });
  const b = await g.taoCon(fam, { ten: "Bảo Minh" });
  const tok = await taoPhien(bm);
  const tg = await taoPhien(await taoBaMe(fam, "Bà Hoa", "trong_giup"));
  return { fam, bm, a, b, tok, tg };
}
async function ghepMay(fam: string, con: string | null, ten: string, nen = "windows") {
  return g.ghepMay(await g.taoMaGhep(fam, con, nen), nen, ten);
}

// ---------------------------------------------------------------- 3. «Sáng mai» = 6:30
test("«Sáng mai» = 6:30 kế tiếp theo múi giờ gia đình (cả ngày đổi giờ mùa hè)", () => {
  assert.equal(mc.SANG_MAI_PHUT, 390);
  assert.equal(mc.sangMaiCua("Asia/Ho_Chi_Minh", new Date("2026-10-24T14:00:00Z")).toISOString(), "2026-10-24T23:30:00.000Z");   // 21:00 VN ⇒ 6:30 hôm sau
  assert.equal(mc.sangMaiCua("Asia/Ho_Chi_Minh", new Date("2026-10-24T20:00:00Z")).toISOString(), "2026-10-24T23:30:00.000Z");   // 3:00 VN ⇒ 6:30 cùng ngày
  assert.equal(mc.sangMaiCua("Asia/Ho_Chi_Minh", new Date("2026-10-24T23:45:00Z")).toISOString(), "2026-10-25T23:30:00.000Z");   // 6:45 VN ⇒ mai
  const d = mc.sangMaiCua("Europe/Berlin", new Date("2026-10-24T20:00:00Z"));
  assert.equal(gioDiaPhuong(d, "Europe/Berlin").phut, 390);
});

// ---------------------------------------------------------------- 2. khoá riêng một máy
test("may/:id/khoa: khoá MỘT máy ⇒ Policy.khoaNgay của máy đó, máy khác của Con không khoá; mở lại; hạn «sang»", async () => {
  const { fam, a, tok } = await nha();
  const m1 = await ghepMay(fam, a, "Laptop");
  const m2 = await ghepMay(fam, a, "iPad", "ios");
  const k = await m(`may/${m1.deviceId}/khoa`, { tok, body: { khoa: true, den: "sang" } });
  assert.equal(k.status, 200);
  assert.equal(k.body.khoa, true);
  assert.ok(Date.parse(k.body.den) > Date.now());
  const p1 = (await dv("dong-bo", { tok: m1.token, body: {} })).body;
  assert.equal(p1.khoaNgay, true);
  assert.equal(p1.khoaHetLuc, k.body.den);
  assert.equal(p1.windows.locked, true, "agent Windows đọc locked từ khoaNgay — không cần phát lại");
  assert.equal((await dv("dong-bo", { tok: m2.token, body: {} })).body.khoaNgay, false, "máy khác của Con không khoá");
  // con/:id hiện trạng thái từng máy
  const ct = (await m(`con/${a}`, { tok })).body;
  assert.deepEqual(ct.may.find((x: any) => x.id === m1.deviceId).khoaMay, { khoa: true, den: k.body.den });
  assert.deepEqual(ct.may.find((x: any) => x.id === m2.deviceId).khoaMay, { khoa: false, den: null });
  // nhật ký cả nhà
  const nk = (await m("nhat-ky?ca-nha=1", { tok })).body;
  assert.ok(JSON.stringify(nk).includes("khoá Laptop"));
  // mở lại
  assert.deepEqual((await m(`may/${m1.deviceId}/khoa`, { tok, body: { khoa: false } })).body, { khoa: false, den: null });
  assert.equal((await dv("dong-bo", { tok: m1.token, body: {} })).body.khoaNgay, false);
});

test("may/:id/khoa: hạn đã qua tự hết; giờ sai ⇒ 400; máy nhà khác ⇒ 404; Người trông giúp khoá được; chưa đăng nhập ⇒ 401", async () => {
  const { fam, a, tok, tg } = await nha();
  const m1 = await ghepMay(fam, a, "Laptop");
  assert.equal((await m(`may/${m1.deviceId}/khoa`, { tok, body: { khoa: true, den: new Date(Date.now() - 60_000).toISOString() } })).status, 400);
  assert.equal((await m(`may/${m1.deviceId}/khoa`, { tok, body: { khoa: true, den: "abc" } })).status, 400);
  const khac = await nha();
  assert.equal((await m(`may/${m1.deviceId}/khoa`, { tok: khac.tok, body: { khoa: true } })).status, 404);
  assert.equal((await m(`may/${m1.deviceId}/khoa`, { body: { khoa: true } })).status, 401);
  const r = await m(`may/${m1.deviceId}/khoa`, { tok: tg, body: { khoa: true } });
  assert.deepEqual([r.status, r.body.khoa, r.body.den], [200, true, null], "Người trông giúp được khoá máy");
  // hạn đã qua (ghi thẳng) ⇒ Policy không khoá
  await q(`update devices set khoa_may = $2::text::jsonb where id = $1`, [m1.deviceId, JSON.stringify({ khoa_ngay: true, khoa_den: new Date(Date.now() - 1000).toISOString() })]);
  assert.equal((await dv("dong-bo", { tok: m1.token, body: {} })).body.khoaNgay, false);
});

test("khoá riêng máy dùng chung (chưa bé nào) vẫn khoá; Ba Mẹ đang dùng máy bằng mã ⇒ không khoá; khoá Con vẫn thắng hạn", async () => {
  const { fam, a, tok } = await nha();
  const chung = await ghepMay(fam, null, "PC phòng khách");
  await q(`update devices set dung_chung = true where id = $1`, [chung.deviceId]);
  await m(`may/${chung.deviceId}/khoa`, { tok, body: { khoa: true } });
  assert.equal((await dv("dong-bo", { tok: chung.token, body: {} })).body.khoaNgay, true);
  await q(`update devices set ba_me_den = now() + interval '10 minutes' where id = $1`, [chung.deviceId]);
  const may = (await one<any>(`select * from devices where id = $1`, [chung.deviceId]))!;
  assert.equal((await mc.taoPolicy(may, null, { gioMaySai: false })).khoaNgay, false, "Ba Mẹ đang dùng máy");
  // máy riêng: Con khoá có hạn + máy khoá không hạn ⇒ không hạn (khoá máy giữ tới khi Ba Mẹ mở); máy có hạn muộn hơn ⇒ hạn của máy
  const rieng = await ghepMay(fam, a, "Laptop");
  const den = new Date(Date.now() + 3600_000);
  await mc.khoaNgay(fam, a, true, "x", den);
  await m(`may/${rieng.deviceId}/khoa`, { tok, body: { khoa: true } });
  const p = (await dv("dong-bo", { tok: rieng.token, body: {} })).body;
  assert.deepEqual([p.khoaNgay, p.khoaHetLuc], [true, null]);
  const denMay = new Date(Date.now() + 2 * 3600_000);
  await m(`may/${rieng.deviceId}/khoa`, { tok, body: { khoa: true, den: denMay.toISOString() } });
  assert.equal((await dv("dong-bo", { tok: rieng.token, body: {} })).body.khoaHetLuc, denMay.toISOString());
  const denSom = new Date(Date.now() + 1800_000);
  await m(`may/${rieng.deviceId}/khoa`, { tok, body: { khoa: true, den: denSom.toISOString() } });
  assert.equal((await dv("dong-bo", { tok: rieng.token, body: {} })).body.khoaHetLuc, den.toISOString(), "hạn Con muộn hơn");
});

// ---------------------------------------------------------------- 1. xoá hồ sơ Con
test("con/:id/xoa: xoá hẳn Con + dữ liệu; máy riêng ⇒ dùng chung; sự kiện + kiểm toán; quà riêng của Con bị xoá", async () => {
  const { fam, a, b, tok } = await nha();
  const may = await ghepMay(fam, a, "Laptop của Anh");
  await q(`insert into app_rules(family_id, child_id, muc, ten, loai) values ($1,$2,'roblox.exe','Roblox','chan')`, [fam, a]);
  const quaRieng = newId(), quaChung = newId();
  await q(`insert into rewards(id, family_id, ten, loai, diem, ap_cho) values ($1,$2,'Lego','qua',100,$3::text::jsonb)`, [quaRieng, fam, JSON.stringify([a])]);
  await q(`insert into rewards(id, family_id, ten, loai, diem, ap_cho) values ($1,$2,'Kem','qua',50,$3::text::jsonb)`, [quaChung, fam, JSON.stringify([a, b])]);

  assert.equal((await m(`con/${a}/xoa`, { tok, body: {} })).status, 400, "thiếu xacNhan");
  const r = await m(`con/${a}/xoa`, { tok, body: { xacNhan: true } });
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true, ten: "Bảo Anh", mayChuyenDungChung: [{ id: may.deviceId, ten: "Laptop của Anh" }] });
  assert.equal((await m(`con/${a}`, { tok })).status, 404);
  assert.deepEqual((await m("gia-dinh", { tok })).body.con.map((c: any) => c.ten), ["Bảo Minh"]);
  const d = (await one<{ child_id: string | null; dung_chung: boolean }>(`select child_id, dung_chung from devices where id = $1`, [may.deviceId]))!;
  assert.deepEqual([d.child_id, d.dung_chung], [null, true]);
  assert.equal((await dv("dong-bo", { tok: may.token, body: {} })).body.canChonCon, true, "máy về màn chọn tên");
  assert.equal((await q(`select 1 from app_rules where child_id = $1`, [a])).length, 0);
  assert.equal((await q(`select 1 from rewards where id = $1`, [quaRieng])).length, 0);
  assert.deepEqual((await one<{ ap_cho: string[] }>(`select ap_cho from rewards where id = $1`, [quaChung]))!.ap_cho, [b]);
  const ev = (await one<{ chi_tiet: any; child_id: string | null }>(`select chi_tiet, child_id from events where family_id = $1 and loai = 'xoa_con'`, [fam]))!;
  assert.deepEqual([ev.chi_tiet.ten, ev.child_id], ["Bảo Anh", null]);
  const au = (await one<{ chi_tiet: any }>(`select chi_tiet from audit where family_id = $1 and hanh_dong = 'xoa_con'`, [fam]))!;
  assert.equal(au.chi_tiet.con, a);
  assert.equal((await m(`con/${a}/xoa`, { tok, body: { xacNhan: true } })).status, 404, "xoá lần hai");
});

test("con/:id/xoa: Người trông giúp ⇒ 403; nhà khác ⇒ 404; Con cuối còn máy ⇒ 409, gỡ máy rồi xoá được", async () => {
  const { fam, a, b, tok, tg } = await nha();
  assert.equal((await m(`con/${a}/xoa`, { tok: tg, body: { xacNhan: true } })).status, 403);
  const khac = await nha();
  assert.equal((await m(`con/${a}/xoa`, { tok: khac.tok, body: { xacNhan: true } })).status, 404);
  assert.equal((await m(`con/${a}/xoa`, { tok, body: { xacNhan: true } })).status, 200);
  const may = await ghepMay(fam, b, "PC");
  const r = await m(`con/${b}/xoa`, { tok, body: { xacNhan: true } });
  assert.deepEqual([r.status, r.body.error], [409, "con_may"]);
  await q(`delete from devices where id = $1`, [may.deviceId]);
  assert.equal((await m(`con/${b}/xoa`, { tok, body: { xacNhan: true } })).status, 200, "không còn máy ⇒ xoá được Con cuối");
});

// ---------------------------------------------------------------- 4. «Trao luôn cho con»
test("qua/:id/trao-luon: voucher Ba Mẹ mua ⇒ phát mã QR ngay, không trừ sao, trừ tồn kho; quà phút ⇒ cộng quỹ", async () => {
  const { fam, a, b, tok, tg } = await nha();
  const vc = newId();
  await q(`insert into rewards(id, family_id, ten, loai, diem, menh_gia, ton_kho, ap_cho) values ($1,$2,'AiiCafe 20k','voucher',200,20000,1,$3::text::jsonb)`,
    [vc, fam, JSON.stringify([a])]);
  const sao = await soDu(a);
  assert.equal((await m(`qua/${vc}/trao-luon`, { tok: tg, body: { con: a } })).status, 403, "Người trông giúp không trao luôn (quyết chi quà)");
  assert.equal((await m(`qua/${vc}/trao-luon`, { tok, body: { con: b } })).status, 404, "quà không áp cho Con này");
  const r = await m(`qua/${vc}/trao-luon`, { tok, body: { con: a } });
  assert.equal(r.status, 200);
  assert.equal(r.body.saoTru, 0);
  assert.equal(r.body.trangThai, "xong");
  assert.ok(r.body.voucher?.ma && r.body.voucher.qr === r.body.voucher.ma && Date.parse(r.body.voucher.hetHan) > Date.now());
  assert.equal(await soDu(a), sao, "không trừ sao");
  assert.equal((await one<{ ton_kho: number }>(`select ton_kho from rewards where id = $1`, [vc]))!.ton_kho, 0);
  assert.equal((await one<{ trang_thai: string }>(`select trang_thai from vouchers where ma = $1`, [r.body.voucher.ma]))!.trang_thai, "da_phat_hanh");
  assert.equal((await m(`qua/${vc}/trao-luon`, { tok, body: { con: a } })).status, 409, "hết tồn kho");
  // quà phút ⇒ +phút vào quỹ hôm nay
  const qp = newId();
  await q(`insert into rewards(id, family_id, ten, loai, diem, phut) values ($1,$2,'Thêm 30 phút','phut',30,30)`, [qp, fam]);
  const r2 = await m(`qua/${qp}/trao-luon`, { tok, body: { con: b } });
  assert.deepEqual([r2.status, r2.body.trangThai, r2.body.phut], [200, "da_trao", 30]);
  const ev = await q<{ chi_tiet: any }>(`select chi_tiet from events where family_id = $1 and loai = 'xac_nhan_qua'`, [fam]);
  assert.ok(ev.every((e) => e.chi_tiet.trao_luon === true));
  assert.equal((await m(`qua/khong-co/trao-luon`, { tok, body: { con: a } })).status, 404);
});

// ---------------------------------------------------------------- 5. hộp thư hỗ trợ quản trị
test("admin/ho-tro: lọc cho / da_tra_loi / cua_toi, soCho, soGap, người gửi, phút chờ; Ba Mẹ thường 403", async () => {
  const cu = process.env.AIIGROW_ADMIN_ID;
  try {
    const ad = await nha(), x = await nha(), y = await nha();
    process.env.AIIGROW_ADMIN_ID = ad.bm;
    const ins = (fam: string, tu: string, nguoi: string, phutTruoc: number) => q(`insert into ho_tro(id, family_id, tu, nguoi, noi_dung, created_at) values ($1,$2,$3,$4,'x', now() - ($5 || ' minutes')::interval)`,
      [newId(), fam, tu, nguoi, String(phutTruoc)]);
    await ins(x.fam, "ba_me", x.bm, 42); await ins(x.fam, "ba_me", x.bm, 5);          // nhà x: chờ 42′ ⇒ gấp
    await ins(y.fam, "ba_me", y.bm, 60); await ins(y.fam, "aiilab", `admin-app:${ad.bm}`, 50);   // nhà y: mình đã trả lời
    assert.equal((await m("admin/ho-tro", { tok: x.tok })).status, 403);
    const all = (await m("admin/ho-tro", { tok: ad.tok })).body;
    assert.equal(all.soCho, 1);
    assert.equal(all.soGap, 1);
    const dx = all.ds.find((d: any) => d.family_id === x.fam);
    assert.equal(dx.nguoi_gui, "Mẹ Lan");
    assert.ok(dx.cho_phut >= 41 && dx.cho_phut <= 43 && dx.gap === true);
    assert.equal(all.ds[0].family_id, x.fam, "đang chờ lên đầu");
    const cho = (await m("admin/ho-tro?loc=cho", { tok: ad.tok })).body.ds.map((d: any) => d.family_id);
    assert.deepEqual(cho, [x.fam]);
    const da = (await m("admin/ho-tro?loc=da_tra_loi", { tok: ad.tok })).body.ds.map((d: any) => d.family_id);
    assert.ok(da.includes(y.fam) && !da.includes(x.fam));
    const toi = (await m("admin/ho-tro?loc=cua_toi", { tok: ad.tok })).body.ds;
    assert.deepEqual(toi.map((d: any) => [d.family_id, d.cua_toi, d.cho_tu]), [[y.fam, true, null]]);
    // trả lời ⇒ hết chờ; chi tiết có tên người gửi
    assert.equal((await m(`admin/ho-tro/${x.fam}`, { tok: ad.tok, body: { noiDung: "Đã xử lý ạ" } })).status, 200);
    assert.equal((await m("admin/ho-tro", { tok: ad.tok })).body.soCho, 0);
    const ct = (await m(`admin/ho-tro/${x.fam}`, { tok: ad.tok })).body;
    assert.deepEqual(ct.tin.map((t: any) => t.ten_nguoi), ["Mẹ Lan", "Mẹ Lan", null]);
  } finally {
    if (cu === undefined) delete process.env.AIIGROW_ADMIN_ID; else process.env.AIIGROW_ADMIN_ID = cu;
  }
});

// ---------------------------------------------------------------- vòng review 1
test("khoá riêng máy thắng ngoại lệ cả máy đang mở của Con (chỉ máy đó); phiên chơi trên máy khoá bị từ chối", async () => {
  const { fam, a, tok } = await nha();
  const m1 = await ghepMay(fam, a, "Laptop");
  const m2 = await ghepMay(fam, a, "PC");
  await q(`insert into grants(id, child_id, phut, ngoai_le, ngay, nguon, den) values ($1,$2,60,true,$3,'ngoai_le', now() + interval '1 hour')`,
    [newId(), a, gioDiaPhuong(new Date(), "Asia/Ho_Chi_Minh").ngay]);
  assert.equal((await dv("dong-bo", { tok: m1.token, body: {} })).body.windows.mode, "tu_do", "ngoại lệ cả máy mở");
  await m(`may/${m1.deviceId}/khoa`, { tok, body: { khoa: true } });
  const p1 = (await dv("dong-bo", { tok: m1.token, body: {} })).body;
  assert.deepEqual([p1.khoaNgay, p1.ngoaiLe, p1.khoaLaiLuc, p1.windows.locked, p1.windows.mode], [true, [], null, true, "khoa"]);
  assert.equal((await dv("dong-bo", { tok: m2.token, body: {} })).body.windows.mode, "tu_do", "máy khác vẫn theo ngoại lệ");
  const { xetMoPhien } = await import("./phien.ts");
  await q(`insert into app_rules(family_id, child_id, muc, ten, loai) values ($1,'','roblox.exe','Roblox','giai_tri')`, [fam]);
  assert.equal((await xetMoPhien(a, "roblox.exe", { mayId: m1.deviceId })).lyDo, "ba_me_khoa");
});

test("Trao luôn không tính vào «tối đa / tháng» của con; xoá Con dọn khoá PIN; Con cuối còn máy dùng chung ⇒ 409", async () => {
  const { fam, a, b, tok } = await nha();
  const qd = newId();
  await q(`insert into rewards(id, family_id, ten, loai, diem, toi_da_thang) values ($1,$2,'Kem','dac_quyen',1,1)`, [qd, fam]);
  assert.equal((await m(`qua/${qd}/trao-luon`, { tok, body: { con: a } })).status, 200);
  const { doiQua } = await import("./phan-thuong.ts");
  const { dieuChinhTay } = await import("./vi.ts");
  await dieuChinhTay(fam, a, 5, "test", "x");
  assert.equal((await doiQua(a, qd)).trang_thai, "cho_trao", "con vẫn đổi được lần của mình");
  await q(`insert into pin_sai(khoa, so_lan) values ($1, 3)`, [`pin:may1:${a}`]);
  assert.equal((await m(`con/${a}/xoa`, { tok, body: { xacNhan: true } })).status, 200);
  assert.equal((await q(`select 1 from pin_sai where khoa = $1`, [`pin:may1:${a}`])).length, 0);
  const chung = await ghepMay(fam, null, "PC chung");
  await q(`update devices set dung_chung = true where id = $1`, [chung.deviceId]);
  const r = await m(`con/${b}/xoa`, { tok, body: { xacNhan: true } });
  assert.deepEqual([r.status, r.body.error], [409, "con_may"]);
});
