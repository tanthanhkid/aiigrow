// M5 quầy AiiCafe + cổng admin, M6 webhook AiiRob — qua đúng bộ định tuyến API (lib/api-quay.ts, api-admin.ts, aiirob.ts).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyQuay, tachMa } = await import("./api-quay.ts");
const { xuLyAdmin } = await import("./api-admin.ts");
const { xuLyM } = await import("./api-m.ts");
const { xuLyMay } = await import("./api-may.ts");
const { xuLyAiiRob, kyAiiRob } = await import("./aiirob.ts");
const ad = await import("./admin.ts");
const pt = await import("./phan-thuong.ts");
const g = await import("./gia-dinh.ts");
const v = await import("./vi.ts");
const { taoPhien } = await import("./auth.ts");
const { q, one } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const { thamSo } = await import("./cau-hinh.ts");

type Kq = { status: number; body: any };
type F = (req: Request, p: string[]) => Promise<Response>;
const goi = async (f: F, duong: string, o: { tok?: string; body?: unknown } = {}): Promise<Kq> => {
  const [duongChinh] = duong.split("?");
  const req = new Request(`http://x/api/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const r = await f(req, duongChinh.split("/"));
  return { status: r.status, body: await r.json() };
};
const quay = (d: string, o?: Parameters<typeof goi>[2]) => goi(xuLyQuay, d, o);
const adm = (d: string, o?: Parameters<typeof goi>[2]) => goi(xuLyAdmin, d, o);
const m = (d: string, o?: Parameters<typeof goi>[2]) => goi(xuLyM, d, o);

const MK = "mat-khau-thu-" + Math.random().toString(36).slice(2);     // khoá giả chỉ sống trong test
await ad.datTaiKhoan({ tenDangNhap: "quay1", matKhau: MK, ten: "Thu", vai: "quay", quay: "Quầy 1" });
await ad.datTaiKhoan({ tenDangNhap: "quay2", matKhau: MK, ten: "Lan", vai: "quay", quay: "Quầy 2" });
await ad.datTaiKhoan({ tenDangNhap: "admin", matKhau: MK, ten: "AiiLab", vai: "admin" });
const vao = async (f: F, ten: string) => { const r = await goi(f, "dang-nhap", { body: { tenDangNhap: ten, matKhau: MK } }); assert.equal(r.status, 200, JSON.stringify(r.body)); return r.body.token as string; };

/** Gia đình có Con đã đổi một phiếu quà 50k (quỹ 200k). */
async function nhaCoPhieu(ten = "Lan") {
  const { fam, bm } = await taoNha(ten);
  const con = await g.taoCon(fam, { ten: "Ken" });
  await v.dieuChinhTay(fam, con, 1000, "Điểm thử", bm);
  const qua = await pt.taoQua(fam, { ten: "Phiếu quà AiiCafe 50.000đ", loai: "voucher", diem: 500, menh_gia: 50_000 });
  await pt.napQuy(fam, 200_000, "", "admin");
  const r = await pt.doiQua(con, qua, new Date("2026-10-21T11:00:00Z"));
  return { fam, bm, con, qua, ma: r.voucher!.ma };
}

test("quầy: hai lượt quét cùng lúc ở hai quầy ⇒ đúng MỘT lượt Hợp lệ; quét lại báo Đã dùng kèm quầy; gõ mã có gạch vẫn nhận", async () => {
  const [t1, t2] = [await vao(xuLyQuay, "quay1"), await vao(xuLyQuay, "QUAY2")];
  assert.equal((await quay("toi", { tok: t1 })).body.nhanVien.quay, "Quầy 1");
  const { fam, ma } = await nhaCoPhieu();
  const coGach = ma.replace(/(.{4})(?=.)/g, "$1-").toLowerCase();
  const [a, b] = await Promise.all([quay("quet", { tok: t1, body: { ma } }), quay("quet", { tok: t2, body: { ma: coGach } })]);
  assert.deepEqual([a.body.ketQua, b.body.ketQua].sort(), ["da_dung", "hop_le"]);
  const ok = a.body.ketQua === "hop_le" ? a.body : b.body;
  assert.equal(ok.menhGia, 50_000);
  assert.equal(ok.tenCon, "Ken");
  assert.equal(ok.tenGiaDinh, "Nhà Lan");
  const lai = await quay("quet", { tok: t1, body: { ma: `https://aiigrow.vn/phieu/${ma}` } });
  assert.equal(lai.body.ketQua, "da_dung");
  assert.ok(["Quầy 1", "Quầy 2"].includes(lai.body.quayDung));
  assert.ok(lai.body.dungLuc);
  const dung = await q(`select 1 from vouchers where ma = $1 and trang_thai = 'da_dung'`, [ma]);
  assert.equal(dung.length, 1);
  const nk = await q<{ chi_tiet: { ketQua: string } }>(`select chi_tiet from audit where hanh_dong = 'quet_voucher' and family_id = $1`, [fam]);
  assert.equal(nk.length, 3, "mỗi lượt quét đều vào nhật ký kiểm toán");
  assert.equal(nk.filter((x) => x.chi_tiet.ketQua === "hop_le").length, 1);
});

test("quầy: hết hạn / chưa phát hành / không có mã báo rõ, không đánh dấu dùng", async () => {
  const t = await vao(xuLyQuay, "quay1");
  const { ma } = await nhaCoPhieu("Hoa");
  await q(`update vouchers set het_han = now() - interval '1 minute' where ma = $1`, [ma]);
  const r = await quay("quet", { tok: t, body: { ma } });
  assert.equal(r.body.ketQua, "het_han");
  assert.ok(r.body.hetHan);
  assert.equal((await quay("quet", { tok: t, body: { ma: "AGKHONGCOMA1" } })).body.ketQua, "khong_thay");
  assert.equal((await quay("quet", { tok: t, body: { ma: "" } })).status, 400);
  assert.equal(tachMa("ag7k-2q91 mxyz"), "AG7K2Q91MXYZ");
});

test("quyền: Ba Mẹ / thiết bị không vào quầy hay admin; nhân viên quầy không vào admin; token nội bộ không gọi được API Ba Mẹ", async () => {
  const { fam, bm } = await taoNha("Mai");
  const tokBm = await taoPhien(bm);
  const ma = await g.taoMaGhep(fam, null, "windows");
  const may = (await goi(xuLyMay, "ghep", { body: { ma, nen: "windows", tenMay: "PC" } })).body.token;
  const tq = await vao(xuLyQuay, "quay1"), ta = await vao(xuLyAdmin, "admin");
  for (const tok of [undefined, tokBm, may, "rac"]) {
    assert.equal((await quay("quet", { tok, body: { ma: "AGKHONGCOMA1" } })).status, 401);
    assert.equal((await adm("tong-quan", { tok })).status, 401);
  }
  assert.equal((await adm("tong-quan", { tok: tq })).status, 403, "nhân viên quầy không vào admin");
  assert.equal((await adm("gia-dinh", { tok: tq })).status, 403);
  assert.equal((await adm("dang-nhap", { body: { tenDangNhap: "quay1", matKhau: MK } })).status, 403);
  assert.equal((await quay("toi", { tok: ta })).status, 200, "admin dùng được màn quầy");
  assert.equal((await m("gia-dinh", { tok: tq })).status, 401);
  assert.equal((await m("gia-dinh", { tok: ta })).status, 401);
  // đăng xuất ⇒ token hết dùng
  await quay("dang-xuat", { tok: tq, body: {} });
  assert.equal((await quay("toi", { tok: tq })).status, 401);
});

test("đăng nhập nội bộ: sai 5 lần ⇒ khoá 15 phút, kể cả mật khẩu đúng; mật khẩu ngắn không tạo được", async () => {
  await ad.datTaiKhoan({ tenDangNhap: "quay-khoa", matKhau: MK, ten: "K", vai: "quay" });
  for (let i = 0; i < 5; i++) assert.equal((await quay("dang-nhap", { body: { tenDangNhap: "quay-khoa", matKhau: "sai-roi-nhe" } })).status, 401);
  const r = await quay("dang-nhap", { body: { tenDangNhap: "quay-khoa", matKhau: MK } });
  assert.equal(r.status, 429);
  assert.equal((await quay("dang-nhap", { body: { tenDangNhap: "khong-co-ai", matKhau: MK } })).body.error, "sai_dang_nhap");
  await assert.rejects(ad.datTaiKhoan({ tenDangNhap: "ngan", matKhau: "123", ten: "N", vai: "quay" }), (e: { ma?: string }) => e.ma === "mk_ngan");
});

test("admin: tổng quan, tìm gia đình, ghi nạp quỹ (vào nhật ký), kho + đối soát voucher", async () => {
  const ta = await vao(xuLyAdmin, "admin");
  const { fam, ma } = await nhaCoPhieu("Phương");
  const tq = (await adm("tong-quan", { tok: ta })).body;
  assert.ok(tq.soGiaDinh >= 1 && tq.soCon >= 1);
  assert.ok(tq.phieu.da_phat_hanh.n >= 1);
  const ds = (await adm("gia-dinh?tim=phương", { tok: ta })).body.ds;
  assert.equal(ds.length, 1);
  assert.equal(ds[0].quy_voucher, 150_000);
  const nap = await adm(`gia-dinh/${fam}/nap-quy`, { tok: ta, body: { soTien: 100_000, ghiChu: "Chuyển khoản VCB" } });
  assert.equal(nap.body.soDu, 250_000);
  assert.equal((await adm(`gia-dinh/${fam}/nap-quy`, { tok: ta, body: { soTien: -5 } })).status, 400);
  assert.equal((await adm(`gia-dinh/khongco/nap-quy`, { tok: ta, body: { soTien: 10_000 } })).status, 404);
  const ct = (await adm(`gia-dinh/${fam}`, { tok: ta })).body;
  assert.equal(ct.quy_voucher, 250_000);
  assert.equal(ct.con[0].soDu, 500);
  assert.equal(ct.voucher[0].ma, ma);
  const kho = (await adm(`voucher?trangThai=da_phat_hanh&tim=${ma.slice(2, 8)}`, { tok: ta })).body.ds;
  assert.equal(kho.length, 1);
  const ngay = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const dsoat = (await adm(`doi-soat?tu=${ngay}&den=${ngay}`, { tok: ta })).body;
  const dong = dsoat.ds.find((x: { family_id: string }) => x.family_id === fam);
  assert.deepEqual([dong.nap, dong.phat_hanh], [300_000, 50_000]);
  assert.ok(dsoat.tong.nap >= 300_000);
  assert.equal((await adm(`doi-soat?tu=2026-10-30&den=2026-10-01`, { tok: ta })).status, 400);
  const nk = (await adm("nhat-ky?loai=nap_quy", { tok: ta })).body.ds;
  assert.equal(nk[0].ten_nv, "AiiLab");
  assert.equal(nk[0].chi_tiet.soTien, 100_000);
});

test("admin trả lời chat hỗ trợ ⇒ app Ba Mẹ thấy tin «aiilab»; cách ly: gia đình khác không thấy", async () => {
  const ta = await vao(xuLyAdmin, "admin");
  const a = await taoNha("Ánh"), b = await taoNha("Bình");
  const ta1 = await taoPhien(a.bm), tb1 = await taoPhien(b.bm);
  await m("ho-tro", { tok: ta1, body: { noiDung: "Quỹ chưa thấy cộng ạ" } });
  const ds = (await adm("ho-tro", { tok: ta })).body.ds;
  assert.equal(ds[0].family_id, a.fam, "tin Ba Mẹ chờ trả lời lên đầu");
  assert.ok((await adm("tong-quan", { tok: ta })).body.hoTroChoTraLoi >= 1);
  assert.equal((await adm(`ho-tro/${a.fam}`, { tok: ta, body: { noiDung: "AiiLab đã cộng quỹ rồi ạ" } })).status, 200);
  assert.equal((await adm(`ho-tro/${a.fam}`, { tok: ta, body: { noiDung: "  " } })).status, 400);
  const tin = (await m("ho-tro", { tok: ta1 })).body.tin;
  assert.deepEqual(tin.map((x: { tu: string }) => x.tu), ["ba_me", "aiilab"]);
  assert.equal((await m("ho-tro", { tok: tb1 })).body.tin.length, 0);
  assert.equal((await adm(`ho-tro/${a.fam}`, { tok: ta })).body.tin.length, 2);
});

test("admin không xem ảnh bằng chứng: chi tiết gia đình không có ảnh, không có đường đọc ảnh", async () => {
  const ta = await vao(xuLyAdmin, "admin");
  const { fam, con } = await nhaCoPhieu("Quân");
  const anh = Buffer.from("anh-bi-mat-cua-con");
  await q(`insert into tasks(id, family_id, ten, diem) values ('t-anh', $1, 'Rửa chén', 10)`, [fam]);
  await q(`insert into submissions(id, task_id, child_id, trang_thai) values ('s-anh', 't-anh', $1, 'cho_duyet')`, [con]);
  await q(`insert into evidence(id, submission_id, child_id, mime, du_lieu, bam) values ('e-anh', 's-anh', $1, 'image/png', $2, 'x')`, [con, anh]);
  const ct = JSON.stringify((await adm(`gia-dinh/${fam}`, { tok: ta })).body);
  assert.doesNotMatch(ct, /base64|du_lieu|evidence|"anh"/i);
  assert.ok(!ct.includes(anh.toString("base64")));
  for (const d of [`gia-dinh/${fam}/anh`, "luot/x/anh", "anh", "bang-chung"]) assert.equal((await adm(d, { tok: ta })).status, 404);
});

test("admin: tham số mục 10 kẹp min–max + ghi kiểm toán; Allowlist thêm/bỏ; thư viện mẫu thêm/tắt", async () => {
  const ta = await vao(xuLyAdmin, "admin");
  const ts = (await adm("tham-so", { tok: ta })).body.ds;
  assert.equal(ts.length, Object.keys(thamSo()).length);
  assert.ok(ts.every((x: { ten: string }) => x.ten));
  const r = await adm("tham-so", { tok: ta, body: { phien_toi_da: 500, voucher_han_ngay: 90, khong_co: 1 } });
  assert.deepEqual(r.body.heThong, { phien_toi_da: 120, voucher_han_ngay: 90 });
  assert.deepEqual(thamSo(await ad.thamSoHeThong()).phien_toi_da, 120);
  assert.deepEqual((await adm("tham-so", { tok: ta, body: { phien_toi_da: null } })).body.heThong, { voucher_han_ngay: 90 });
  const nk = (await adm("nhat-ky?loai=doi_tham_so", { tok: ta })).body.ds;
  assert.equal(nk.length, 2);
  assert.deepEqual(nk[1].chi_tiet.doi.find((x: { khoa: string }) => x.khoa === "phien_toi_da"), { khoa: "phien_toi_da", cu: null, moi: 120 });

  assert.deepEqual((await adm("allowlist", { tok: ta, body: { muc: "https://www.KhanAcademy.org/math" } })).body.them, ["khanacademy.org"]);
  assert.equal((await adm("allowlist", { tok: ta, body: { muc: "khanacademy.org" } })).status, 409);
  assert.equal((await adm("allowlist", { tok: ta, body: { muc: "winword.exe", bo: true } })).status, 409, "mục mặc định không bỏ được");
  assert.ok((await ad.allowlistHieuLuc()).includes("khanacademy.org"));
  assert.deepEqual((await adm("allowlist", { tok: ta, body: { muc: "khanacademy.org", bo: true } })).body.them, []);

  const id = (await adm("mau", { tok: ta, body: { loai: "nhiem_vu", nhom: "teen", ten: "Tưới cây", diem: 5, nhomNv: "viec_nha" } })).body.id;
  assert.equal((await adm("mau", { tok: ta, body: { loai: "qua", ten: "Phiếu 10k", diem: 100, loaiQua: "voucher" } })).status, 400);
  const tv = (await adm("mau", { tok: ta })).body;
  assert.ok(tv.nhiemVu.nhi.length >= 8 && tv.qua.length >= 6);
  assert.equal(tv.rieng[0].du_lieu.ten, "Tưới cây");
  assert.equal((await ad.mauRiengDangBat()).teen.length, 1);
  await adm(`mau/${id}`, { tok: ta, body: { bat: false } });
  assert.equal((await ad.mauRiengDangBat()).teen.length, 0);
});

// ---------------------------------------------------------------- M6 webhook AiiRob
const KHOA_GIA = "khoa-gia-chi-de-test";
const guiAiiRob = async (than: unknown, o: { khoa?: string; ts?: number; chuKy?: string } = {}) => {
  const s = JSON.stringify(than), ts = String(o.ts ?? Math.floor(Date.now() / 1000));
  const req = new Request("http://x/api/aiirob", { method: "POST", body: s, headers: { "content-type": "application/json",
    "x-aiirob-timestamp": ts, "x-aiirob-signature": o.chuKy ?? kyAiiRob(o.khoa ?? KHOA_GIA, ts, s) } });
  const r = await xuLyAiiRob(req);
  return { status: r.status, body: await r.json() };
};

test("webhook AiiRob: thiếu khoá ⇒ 503; chữ ký sai / quá cũ ⇒ 401, không cộng điểm", async () => {
  const { fam } = await taoNha("Rob");
  const con = await g.taoCon(fam, { ten: "Su" });
  const bai = { suKien: "bai_dat", giaDinh: fam, con, maBai: "EN-1", tenBai: "Chào hỏi", diemSo: 95 };
  delete process.env.AIIROB_WEBHOOK_SECRET;
  assert.equal((await guiAiiRob(bai)).status, 503);
  process.env.AIIROB_WEBHOOK_SECRET = KHOA_GIA;
  assert.equal((await guiAiiRob(bai, { khoa: "khoa-khac" })).status, 401);
  assert.equal((await guiAiiRob(bai, { chuKy: "sha256=00" })).status, 401);
  assert.equal((await guiAiiRob(bai, { ts: Math.floor(Date.now() / 1000) - 3600 })).status, 401);
  // thân bị sửa sau khi ký
  const ts = String(Math.floor(Date.now() / 1000)), s = JSON.stringify(bai);
  const r = await xuLyAiiRob(new Request("http://x/api/aiirob", { method: "POST", body: s.replace("95", "99"),
    headers: { "x-aiirob-timestamp": ts, "x-aiirob-signature": kyAiiRob(KHOA_GIA, ts, s) } }));
  assert.equal(r.status, 401);
  assert.equal(await v.soDu(con), 0);
});

test("webhook AiiRob: bài đạt ⇒ +20 điểm tự duyệt; gửi trùng (kể cả cùng lúc) không cộng đôi; dưới ngưỡng không cộng", async () => {
  process.env.AIIROB_WEBHOOK_SECRET = KHOA_GIA;
  const { fam } = await taoNha("Rin");
  const con = await g.taoCon(fam, { ten: "Bin" });
  const bai = { suKien: "bai_dat", giaDinh: fam, con, maBai: "EN-2", tenBai: "Màu sắc", diemSo: 90 };
  const [a, b, c] = await Promise.all([guiAiiRob(bai), guiAiiRob(bai), guiAiiRob(bai)]);
  assert.deepEqual([a, b, c].map((x) => x.status), [200, 200, 200]);
  assert.deepEqual([a, b, c].map((x) => x.body.congDiem).sort(), [0, 0, 20]);
  assert.equal(await v.soDu(con), 20);
  assert.equal((await guiAiiRob(bai)).body.congDiem, 0);
  assert.equal((await guiAiiRob({ ...bai, maBai: "EN-3", diemSo: 60 })).body.congDiem, 0);
  assert.equal(await v.soDu(con), 20);
  const luot = await one<{ n: number }>(`select count(*)::int as n from submissions where child_id = $1 and nguon = 'aiirob' and trang_thai = 'duoc_duyet'`, [con]);
  assert.equal(luot!.n, 1);
  assert.equal((await guiAiiRob({ ...bai, con: "khongco" })).status, 404);
  assert.equal((await guiAiiRob({ suKien: "khac" })).body.boQua, true);
  assert.equal((await guiAiiRob({ suKien: "bai_dat", giaDinh: fam, con })).status, 400);
});

// ---------------------------------------------------------------- M6 liên kết AiiRob: mã «<family_id>.<child_id>»
test("webhook AiiRob + giaDinh: bắt buộc (thiếu / null / số / object / rỗng ⇒ 400); sai gia đình ⇒ 404 như không thấy; đúng ⇒ cộng", async () => {
  process.env.AIIROB_WEBHOOK_SECRET = KHOA_GIA;
  const { fam } = await taoNha("Lien");
  const { fam: famKhac } = await taoNha("Khac");
  const con = await g.taoCon(fam, { ten: "Na" });
  const bai = { suKien: "bai_dat", con, maBai: "LK-1", tenBai: "Đếm số", diemSo: 95 };
  // giaDinh bắt buộc: không có nhánh tương thích "thiếu giaDinh vẫn nhận"
  for (const giaDinh of [undefined, null, "", "   ", 123, { id: fam }, [fam]]) {
    const r = await guiAiiRob({ ...bai, giaDinh });
    assert.equal(r.status, 400, `giaDinh=${JSON.stringify(giaDinh)}`);
    assert.equal(r.body.error, "thieu_truong");
  }
  assert.equal(await v.soDu(con), 0);
  // sai gia đình: 404 giống hệt Con không tồn tại, không cộng
  const sai = await guiAiiRob({ ...bai, giaDinh: famKhac });
  const khongCo = await guiAiiRob({ ...bai, con: "khongco", giaDinh: fam });
  assert.equal(sai.status, 404);
  assert.deepEqual(sai.body, khongCo.body);
  assert.equal(await v.soDu(con), 0);
  // đúng gia đình nhưng dưới ngưỡng: 200, không cộng, có lyDo
  const thap = await guiAiiRob({ ...bai, maBai: "LK-0", diemSo: 40, giaDinh: fam });
  assert.equal(thap.status, 200);
  assert.equal(thap.body.congDiem, 0);
  assert.equal(thap.body.lyDo, "chua_dat_hoac_da_tinh");
  // đúng gia đình: cộng 20
  const dung = await guiAiiRob({ ...bai, giaDinh: fam });
  assert.equal(dung.status, 200);
  assert.equal(dung.body.congDiem, 20);
  assert.equal(dung.body.lyDo, null);
  assert.equal(await v.soDu(con), 20);
});

test("GET /api/m/con/:id/lien-ket-aiirob ⇒ {ma: <family_id>.<child_id>}; Con nhà khác ⇒ 404; chưa đăng nhập / token sai ⇒ 401", async () => {
  const { fam, bm } = await taoNha("Ma");
  const { fam: famKhac } = await taoNha("Xa");
  const con = await g.taoCon(fam, { ten: "Bo" });
  const conKhac = await g.taoCon(famKhac, { ten: "Bi" });
  const tok = await taoPhien(bm);
  const r = await m(`con/${con}/lien-ket-aiirob`, { tok });
  assert.equal(r.status, 200);
  assert.equal(r.body.ma, `${fam}.${con}`);
  assert.equal((await m(`con/${conKhac}/lien-ket-aiirob`, { tok })).status, 404);
  assert.equal((await m(`con/${con}/lien-ket-aiirob`)).status, 401);
  assert.equal((await m(`con/${con}/lien-ket-aiirob`, { tok: "token-khong-ton-tai" })).status, 401);
});

test("vai admin trong app: Ba Mẹ có cờ admin (env AIIGROW_ADMIN_DINH_DANH) xem hộp thư + trả lời; Ba Mẹ thường bị 403", async () => {
  const a = await taoNha("Ánh"), b = await taoNha("Bình");
  const ta = await taoPhien(a.bm), tb = await taoPhien(b.bm);
  const cu = process.env.AIIGROW_ADMIN_DINH_DANH;
  try {
    delete process.env.AIIGROW_ADMIN_DINH_DANH;
    assert.equal((await m("toi", { tok: tb })).body.laAdmin, false);
    assert.equal((await m("admin/ho-tro", { tok: tb })).status, 403, "không có env ⇒ không ai là admin");
    process.env.AIIGROW_ADMIN_DINH_DANH = ` ${a.bm.toUpperCase()}@VIDU.VN , khac@x.vn`;
    await m("ho-tro", { tok: tb, body: { noiDung: "Cần giúp" } });
    assert.equal((await m("toi", { tok: ta })).body.laAdmin, true);
    assert.equal((await m("toi", { tok: tb })).body.laAdmin, false);
    for (const [d, body] of [["admin/ho-tro", undefined], [`admin/ho-tro/${b.fam}`, undefined], [`admin/ho-tro/${b.fam}`, { noiDung: "x" }]] as const)
      assert.equal((await m(d, { tok: tb, body })).status, 403, d);
    const ds = (await m("admin/ho-tro", { tok: ta })).body.ds;
    assert.equal(ds[0].family_id, b.fam);
    assert.equal(ds[0].chua_tra_loi, true);
    assert.equal((await m(`admin/ho-tro/${b.fam}`, { tok: ta, body: { noiDung: "Đã xử lý ạ" } })).status, 200);
    assert.equal((await m(`admin/ho-tro/${b.fam}`, { tok: ta, body: { noiDung: " " } })).status, 400);
    assert.deepEqual((await m(`admin/ho-tro/${b.fam}`, { tok: ta })).body.tin.map((x: { tu: string }) => x.tu), ["ba_me", "aiilab"]);
    assert.equal((await m("admin/ho-tro", { tok: ta })).body.ds.find((x: { family_id: string }) => x.family_id === b.fam).chua_tra_loi, false);
    assert.equal((await m("ho-tro", { tok: tb })).body.tin[1].tu, "aiilab");
  } finally { if (cu === undefined) delete process.env.AIIGROW_ADMIN_DINH_DANH; else process.env.AIIGROW_ADMIN_DINH_DANH = cu; }
});
