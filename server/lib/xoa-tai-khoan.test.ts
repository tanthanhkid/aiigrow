// Xoá tài khoản trong app Ba Mẹ (Apple 5.1.1(v)) — POST /api/m/xoa-tai-khoan {matKhau}, qua API như app gọi.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const nv = await import("./nhiem-vu.ts");
const { taoPhien, bamMatKhau } = await import("./auth.ts");
const { xuLyM } = await import("./api-m.ts");
const { xuLyMay } = await import("./api-may.ts");
const { q } = await import("./db.ts");
const { taoNha, taoBaMe, anhGia } = await import("./test-fixtures/nha.ts");

type Kq = { status: number; body: any };
async function goi(f: typeof xuLyM, goc: string, duong: string, o: { tok?: string; body?: unknown } = {}): Promise<Kq> {
  const req = new Request(`http://app.test/api/${goc}/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const r = await f(req, duong.split("/"));
  return { status: r.status, body: await r.json() };
}
const m = (d: string, o?: { tok?: string; body?: unknown }) => goi(xuLyM, "m", d, o);
const dv = (d: string, o?: { tok?: string; body?: unknown }) => goi(xuLyMay, "device", d, o);
const datMk = async (id: string) => q(`update parents set pass_hash = $2 where id = $1`, [id, await bamMatKhau("matkhau123")]);

async function nha(ten = "Lan") {
  const { fam, bm } = await taoNha(ten);
  await datMk(bm);
  return { fam, bm, tok: await taoPhien(bm) };
}

/** Số dòng còn lại của gia đình trong MỌI bảng (đọc information_schema: cột family_id / child_id / device_id / parent_id …). */
async function demConLai(ids: { fam: string; con: string[]; may: string[]; baMe: string[] }) {
  const cot = await q<{ table_name: string; column_name: string }>(
    `select table_name, column_name from information_schema.columns where table_schema = 'public'
       and column_name in ('family_id', 'child_id', 'device_id', 'parent_id', 'giao_cho')`);
  const theoCot: Record<string, string[]> = { family_id: [ids.fam], child_id: ids.con, giao_cho: ids.con, device_id: ids.may, parent_id: ids.baMe };
  const kq: Record<string, number> = {};
  for (const c of cot) {
    if (c.table_name === "audit") continue;                     // nhật ký nhân viên AiiLab — giữ id gia đình tối đa 90 ngày (test cuối file)
    const gt = theoCot[c.column_name];
    if (!gt.length) continue;
    const n = (await q<{ n: number }>(`select count(*)::int as n from ${c.table_name} where ${c.column_name} = any($1::text[])`, [gt]))[0].n;
    if (n) kq[`${c.table_name}.${c.column_name}`] = n;
  }
  for (const [bang, cotId, gt] of [["families", "id", [ids.fam]], ["children", "id", ids.con], ["devices", "id", ids.may], ["parents", "id", ids.baMe]] as const) {
    const n = (await q<{ n: number }>(`select count(*)::int as n from ${bang} where ${cotId} = any($1::text[])`, [gt as readonly string[]]))[0].n;
    if (n) kq[`${bang}.${cotId}`] = n;
  }
  return kq;
}

test("sai mật khẩu ⇒ 401 sai_mat_khau, không xoá gì; sai 5 lần liền ⇒ tạm khoá 429", async () => {
  const { fam, bm, tok } = await nha();
  const r = await m("xoa-tai-khoan", { tok, body: { matKhau: "sai-roi" } });
  assert.deepEqual([r.status, r.body.error], [401, "sai_mat_khau"]);
  assert.equal((await q(`select 1 from families where id = $1`, [fam])).length, 1);
  assert.equal((await q(`select 1 from parents where id = $1`, [bm])).length, 1);
  assert.equal((await m("toi", { tok })).status, 200, "phiên còn nguyên");
  for (let i = 0; i < 4; i++) await m("xoa-tai-khoan", { tok, body: { matKhau: "sai" } });
  const khoa = await m("xoa-tai-khoan", { tok, body: { matKhau: "matkhau123" } });
  assert.deepEqual([khoa.status, khoa.body.error], [429, "tam_khoa"]);
  assert.equal((await m("xoa-tai-khoan", { tok, body: {} })).body.error, "tam_khoa");
  // khung 15 phút sau ⇒ đếm lại từ đầu (gõ nhầm lẻ tẻ không cộng dồn)
  await q(`update pin_sai set khoa = khoa || '-cu' where khoa like $1`, [`xoa_tk:${bm}:%`]);
  assert.equal((await m("xoa-tai-khoan", { tok, body: { matKhau: "go-nham" } })).body.error, "sai_mat_khau");
  await q(`delete from pin_sai where khoa like $1`, [`xoa_tk:${bm}:%`]);
  // gửi song song: giữ chỗ lượt trước khi kiểm ⇒ không quá 5 lượt được kiểm mật khẩu
  const ss = await Promise.all(Array.from({ length: 9 }, (_, i) => m("xoa-tai-khoan", { tok, body: { matKhau: `doan-${i}` } })));
  assert.equal(ss.filter((x) => x.body.error === "sai_mat_khau").length, 5);
  assert.equal(ss.filter((x) => x.body.error === "tam_khoa").length, 4);
  // bộ đếm riêng: người cầm phiên mượn không khoá được chính chủ khỏi đăng nhập
  const dn = (await q<{ dinh_danh: string }>(`select dinh_danh from parents where id = $1`, [bm]))[0].dinh_danh;
  assert.equal((await m("dang-nhap", { body: { dinhDanh: dn, matKhau: "matkhau123" } })).status, 200);
});

test("chủ gia đình còn Ba/Mẹ khác ⇒ 409 con_thanh_vien, không xoá gì; mời ra hết rồi thì xoá được", async () => {
  const { fam, bm, tok } = await nha();
  const ba = await taoBaMe(fam, "Ba", "duyet");
  const con = await g.taoCon(fam, { ten: "Ken" });
  const hoi = await m("xoa-tai-khoan", { tok, body: { kiemTra: true } });
  assert.deepEqual([hoi.status, hoi.body.error], [409, "con_thanh_vien"], "app hỏi trước, không cần mật khẩu");
  const r = await m("xoa-tai-khoan", { tok, body: { matKhau: "matkhau123" } });
  assert.deepEqual([r.status, r.body.error], [409, "con_thanh_vien"]);
  assert.match(r.body.message, /mời/);
  assert.equal((await q(`select 1 from children where id = $1`, [con])).length, 1);
  assert.equal((await q(`select 1 from parents where id = $1`, [bm])).length, 1);
  // người đã bị mời ra (vai roi) không tính là «còn người khác»
  assert.equal((await m(`thanh-vien/${ba}/moi-ra`, { tok, body: {} })).status, 200);
  assert.deepEqual((await m("xoa-tai-khoan", { tok, body: { kiemTra: true } })).body, { duoc: true });
  const ok = await m("xoa-tai-khoan", { tok, body: { matKhau: "matkhau123" } });
  assert.deepEqual([ok.status, ok.body.xoa], [200, "gia_dinh"]);
  assert.deepEqual(await demConLai({ fam, con: [con], may: [], baMe: [bm, ba] }), {});
});

test("chủ là người lớn cuối: còn máy ⇒ 409 con_may; gỡ máy xong ⇒ xoá sạch gia đình: Con, nhiệm vụ, ảnh, điểm, luật, lệnh, log máy, phiên — mọi bảng về 0; nhà khác nguyên vẹn", async () => {
  const { fam, bm, tok } = await nha();
  const khac = await nha("Mai");
  const conKhac = await g.taoCon(khac.fam, { ten: "Bin" });
  const con = await g.taoCon(fam, { ten: "Ken" });
  const con2 = await g.taoCon(fam, { ten: "Na" });
  // nhiệm vụ + bài nộp có ảnh + duyệt (điểm)
  const rc = await nv.taoNv(fam, { ten: "Rửa chén", diem: 10, nhom: "viec_nha", bang_chung: "anh" });
  const s = await nv.batDau(con, rc);
  await nv.nop(con, s, { anh: [anhGia("xoa-1")] });
  await nv.duyet(fam, s, bm, { loiKhen: "Giỏi" });
  // luật app, lời khen, quà, sự kiện / cảnh báo (qua API)
  assert.equal((await m("luat", { tok, body: { muc: "youtube.com", loai: "chan" } })).status, 200);
  assert.equal((await m(`con/${con}/loi-khen`, { tok, body: { noiDung: "Con giỏi" } })).status, 200);
  // máy đã ghép + đồng bộ + log máy + lệnh gỡ đang chờ
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "PC của Ken");
  assert.equal((await dv("dong-bo", { tok: may.token, body: {} })).status, 200);
  assert.equal((await dv("log", { tok: may.token, body: { ds: [{ luc: new Date().toISOString(), muc: "tin", noiDung: "chạy" }] } })).status, 200);
  assert.ok((await q(`select 1 from may_log where family_id = $1`, [fam])).length);
  const lenh = await m(`may/${may.deviceId}/go-tu-xa`, { tok, body: { matKhau: "matkhau123" } });
  assert.equal(lenh.status, 200);
  assert.ok((await q(`select 1 from lenh_may where family_id = $1`, [fam])).length);
  // còn máy ⇒ chưa xoá (lệnh gỡ không tới được agent sau khi xoá gia đình) — nêu tên máy
  const conMay = await m("xoa-tai-khoan", { tok, body: { matKhau: "matkhau123" } });
  assert.deepEqual([conMay.status, conMay.body.error], [409, "con_may"]);
  assert.match(conMay.body.message, /PC của Ken/);
  // agent nhận lệnh gỡ, báo xong ⇒ máy rời gia đình
  assert.equal((await dv(`lenh/${lenh.body.id}/xong`, { tok: may.token, body: {} })).status, 200);
  assert.equal((await q(`select 1 from devices where family_id = $1`, [fam])).length, 0);
  assert.ok((await q(`select 1 from evidence where child_id = $1`, [con])).length);
  assert.ok((await q(`select 1 from points where child_id = $1`, [con])).length);
  // khoá đếm sai gắn với máy / Con (PIN «<máy>:<con>», gỡ tại máy «go:<máy>»)
  await q(`insert into pin_sai(khoa, so_lan) values ($1, 2), ($2, 1), ($3, 1)`, [`${may.deviceId}:${con}`, `go:${may.deviceId}`, `may-cu:${con2}`]);
  // thiết bị lọc mạng (TV) cũng là máy phải gỡ trước
  await q(`insert into dns_thiet_bi(id, family_id, ten, loai, nhan) values ($1, $2, 'TV phòng khách', 'tv', $3)`, [`tv-${fam}`, fam, `tv${fam}`]);
  const conTv = await m("xoa-tai-khoan", { tok, body: { kiemTra: true } });
  assert.deepEqual([conTv.status, conTv.body.error], [409, "con_may"]);
  assert.match(conTv.body.message, /TV phòng khách/);
  await q(`delete from dns_thiet_bi where id = $1`, [`tv-${fam}`]);
  // otp của người đã «mời ra» (định danh gốc)
  const cu = await taoBaMe(fam, "Cô", "duyet");
  const dnCu = (await q<{ dinh_danh: string }>(`select dinh_danh from parents where id = $1`, [cu]))[0].dinh_danh;
  assert.equal((await m(`thanh-vien/${cu}/moi-ra`, { tok, body: {} })).status, 200);
  await q(`insert into otp(dinh_danh, ma_hash, muc_dich, het) values ($1, 'x', 'quen_mk', now() + interval '5 minutes')`, [dnCu]);
  const tok2 = await taoPhien(bm);                              // phiên trên máy thứ hai

  const r = await m("xoa-tai-khoan", { tok, body: { matKhau: "matkhau123" } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body, { xoa: "gia_dinh", soCon: 2 });
  assert.deepEqual(await demConLai({ fam, con: [con, con2], may: [may.deviceId], baMe: [bm] }), {});
  assert.equal((await q(`select 1 from sessions where parent_id = $1`, [bm])).length, 0);
  // mọi phiên mất hiệu lực, agent máy con bị từ chối token
  assert.equal((await m("toi", { tok })).status, 401);
  assert.equal((await m("toi", { tok: tok2 })).status, 401);
  // AiiLab giữ dấu vết kiểm toán (không có dữ liệu cá nhân)
  assert.equal((await q(`select 1 from audit where family_id = $1 and hanh_dong = 'xoa_gia_dinh'`, [fam])).length, 1);
  // nhà khác không bị đụng
  assert.equal((await m("toi", { tok: khac.tok })).status, 200);
  assert.equal((await q(`select 1 from children where id = $1`, [conKhac])).length, 1);
  assert.equal((await q(`select 1 from parents where family_id = $1`, [fam])).length, 0);
  assert.equal((await q(`select 1 from otp where dinh_danh = $1`, [dnCu])).length, 0, "otp của người đã mời ra");
  for (const id of [bm, con, con2, may.deviceId])
    assert.equal((await q(`select 1 from pin_sai where khoa like $1`, [`%${id}%`])).length, 0, `pin_sai còn khoá chứa ${id}`);
});

test("Ba Mẹ không phải chủ (Phê duyệt / Chỉ xem) ⇒ chỉ xoá tài khoản mình; gia đình, Con, chủ còn nguyên", async () => {
  const { fam, bm, tok } = await nha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  for (const vai of ["xem", "duyet"] as const) {
    const id = await taoBaMe(fam, vai === "xem" ? "Bà" : "Ba", vai);
    await datMk(id);
    const t = await taoPhien(id);
    assert.equal((await m(`con/${con}/loi-khen`, { tok: vai === "duyet" ? t : tok, body: { noiDung: `khen ${vai}` } })).status, 200);
    await q(`insert into ho_tro(id, family_id, tu, nguoi, noi_dung) values ($1, $2, 'ba_me', $3, 'tin riêng')`, [`ht-${id}`, fam, id]);
    const sai = await m("xoa-tai-khoan", { tok: t, body: { matKhau: "x" } });
    assert.deepEqual([sai.status, sai.body.error], [401, "sai_mat_khau"]);
    const r = await m("xoa-tai-khoan", { tok: t, body: { matKhau: "matkhau123" } });
    assert.deepEqual([r.status, r.body], [200, { xoa: "tai_khoan" }], `vai ${vai}`);
    // như «mời ra»: giữ tên cho lịch sử «ai duyệt», bỏ SĐT/email + mật khẩu
    const p = await q<{ vai: string; dinh_danh: string; pass_hash: string | null; ten: string }>(`select vai, dinh_danh, pass_hash, ten from parents where id = $1`, [id]);
    assert.deepEqual([p[0].vai, p[0].dinh_danh, p[0].pass_hash], ["roi", `xoa:${id}`, null]);
    assert.equal((await q(`select 1 from sessions where parent_id = $1`, [id])).length, 0);
    assert.equal((await q(`select 1 from pin_sai where khoa like $1`, [`xoa_tk:${id}%`])).length, 0);
    assert.equal((await q(`select 1 from ho_tro where nguoi = $1`, [id])).length, 0, "xoá tin hỗ trợ mình viết");
    assert.equal((await q(`select 1 from messages where parent_id = $1`, [id])).length, 0, "xoá lời khen mình gửi");
    assert.ok(!(await m("thanh-vien", { tok })).body.ds.some((x: any) => x.id === id), "không còn trong danh sách thành viên");
    assert.equal((await m("toi", { tok: t })).status, 401);
  }
  assert.equal((await q(`select 1 from families where id = $1`, [fam])).length, 1);
  assert.equal((await q(`select 1 from children where id = $1`, [con])).length, 1);
  assert.equal((await m("toi", { tok })).status, 200);
  assert.equal((await q(`select 1 from messages where parent_id = $1`, [bm])).length, 1, "tin của chủ còn nguyên");
  assert.equal((await q(`select 1 from events where family_id = $1 and loai = 'thanh_vien_xoa_tai_khoan'`, [fam])).length, 2);
  // chủ giờ là người cuối ⇒ xoá được cả gia đình
  assert.equal((await m("xoa-tai-khoan", { tok, body: { matKhau: "matkhau123" } })).body.xoa, "gia_dinh");
  assert.equal((await q(`select 1 from parents where id = $1`, [bm])).length, 0);
});

test("audit của gia đình đã xoá: giữ 90 ngày rồi xoá hẳn; gia đình chưa xoá không bị đụng; cron giãn 1 giờ", async () => {
  const { ghiKiemToan } = await import("./admin.ts");
  const { donKiemToanGiaDinhDaXoa, chayDonKiemToan } = await import("./xoa-tai-khoan.ts");
  const now = new Date();
  const lui = (ngay: number) => new Date(now.getTime() - ngay * 86_400_000);
  /** gia đình xoá qua API, có 2 dòng audit cũ (nạp quỹ, quét phiếu) + dòng mốc «xoa_gia_dinh»; lùi mốc về «ngay» ngày trước */
  async function daXoa(ten: string, ngay: number) {
    const { fam, tok } = await nha(ten);
    await ghiKiemToan({ id: "nv1", vai: "quay" }, "nap_quy", { soTien: 100_000, ghiChu: "nạp tại quầy" }, fam);
    await ghiKiemToan({ id: "nv1", vai: "quay" }, "quet_voucher", { ma: "AB12CD" }, fam);
    assert.equal((await m("xoa-tai-khoan", { tok, body: { matKhau: "matkhau123" } })).body.xoa, "gia_dinh");
    await q(`update audit set created_at = $2 where family_id = $1`, [fam, lui(ngay)]);
    return fam;
  }
  const dem = async (fam: string) => (await q<{ n: number }>(`select count(*)::int as n from audit where family_id = $1`, [fam]))[0].n;
  const f89 = await daXoa("Mai", 89), f91 = await daXoa("Cuc", 91);
  // gia đình còn dùng: dòng audit cũ 200 ngày vẫn giữ (chỉ dọn gia đình đã xoá)
  const { fam: fCon } = await nha("Dao");
  await ghiKiemToan({ id: "nv1", vai: "quay" }, "nap_quy", { soTien: 50_000 }, fCon);
  await q(`update audit set created_at = $2 where family_id = $1`, [fCon, lui(200)]);
  // dòng mốc «xoa_gia_dinh» lạ của gia đình vẫn còn trong families ⇒ không đụng
  await ghiKiemToan(null, "xoa_gia_dinh", { soCon: 0 }, fCon);
  await q(`update audit set created_at = $2 where family_id = $1`, [fCon, lui(200)]);
  // gia đình bỏ đi không qua «xoá tài khoản» (không có mốc), dòng cuối 120 ngày ⇒ vẫn dọn; quét mã không gắn gia đình 91 ngày ⇒ dọn, 10 ngày ⇒ còn
  await ghiKiemToan({ id: "nv1", vai: "admin" }, "tra_loi_ho_tro", { doDai: 5 }, "gd_khong_con");
  await q(`update audit set created_at = $1 where family_id = 'gd_khong_con'`, [lui(120)]);
  await ghiKiemToan({ id: "nv1", vai: "quay" }, "quet_voucher", { ma: "CU91" }, null);
  await ghiKiemToan({ id: "nv1", vai: "quay" }, "quet_voucher", { ma: "MOI10" }, null);
  await q(`update audit set created_at = $1 where chi_tiet->>'ma' = 'CU91'`, [lui(91)]);
  await q(`update audit set created_at = $1 where chi_tiet->>'ma' = 'MOI10'`, [lui(10)]);
  const quet = async () => (await q<{ ma: string }>(`select chi_tiet->>'ma' as ma from audit where family_id is null and chi_tiet->>'ma' in ('CU91', 'MOI10')`)).map((x) => x.ma);
  assert.deepEqual([await dem(f89), await dem(f91), await dem(fCon)], [3, 3, 2]);

  assert.equal(await donKiemToanGiaDinhDaXoa(now), 5);
  assert.equal(await dem("gd_khong_con"), 0);
  assert.deepEqual(await quet(), ["MOI10"]);
  assert.deepEqual([await dem(f89), await dem(f91), await dem(fCon)], [3, 0, 2], "89 ngày còn, 91 ngày xoá hẳn kể cả dòng mốc");
  assert.equal(await donKiemToanGiaDinhDaXoa(now), 0, "gọi lặp vô hại");
  // 2 ngày sau gia đình 89 ngày quá hạn
  await q(`delete from he_thong where khoa = 'don_kiem_toan'`);
  const sau = new Date(now.getTime() + 2 * 86_400_000);
  assert.equal(await chayDonKiemToan(sau), 3);
  assert.equal(await chayDonKiemToan(new Date(sau.getTime() + 30 * 60_000)), null, "chưa đủ 1 giờ ⇒ bỏ qua");
  assert.deepEqual([await dem(f89), await dem(fCon)], [0, 2]);
});
