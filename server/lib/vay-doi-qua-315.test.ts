// #315: Ba Mẹ cho vay sao để đổi quà ⇒ máy chủ đưa đủ trường để màn Con đổi được đúng quà đã xin (#263: sao vay dùng cho cả đổi quà lẫn chơi).
// `sao` = SỐ DƯ (tiêu được − nợ, âm khi nợ) — giữ nghĩa; sao DÙNG ĐƯỢC để đổi quà = `soDu` / `soSao.saoTieuDuoc` (gồm sao vay chưa tiêu).
// Lỗi gốc ở máy Con: khay Windows 0.2.20 chặn «còn thiếu» theo `sao` ⇒ không gửi đổi quà (agent-win sửa trong cùng PR).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const ss = await import("./so-sao.ts");
const g = await import("./gia-dinh.ts");
const nv = await import("./nhiem-vu.ts");
const pt = await import("./phan-thuong.ts");
const yc = await import("./yeu-cau.ts");
const qg = await import("./quy-gio.ts");
const la = await import("./luat-app.ts");
const { xuLyM } = await import("./api-m.ts");
const { xuLyMay } = await import("./api-may.ts");
const { xuLyConSao } = await import("./api-sao.ts");
const { taoPhien } = await import("./auth.ts");
const { taoNha, anhGia } = await import("./test-fixtures/nha.ts");

const goi = (xuLy: (r: Request, p: string[]) => Promise<Response>, goc: string) => async (tok: string, duong: string, body?: unknown) => {
  const r = await xuLy(new Request(`http://x/api/${goc}/${duong}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), duong.split("?")[0].split("/"));
  return { status: r.status, body: (await r.json()) as any };
};
const m = goi(xuLyM, "m"), dv = goi(xuLyMay, "device");
/** màn Con điện thoại (/tre) — kid/<duong> */
const kid = async (con: string, duong: string, body?: unknown) => {
  const r = (await xuLyConSao(con, null, new Request(`http://x/api/kid/${duong}`, { method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) }), duong.split("?")[0].split("/"), (body ?? {}) as Record<string, unknown>))!;
  return { status: r.status, body: (await r.json()) as any };
};

async function lamNv(fam: string, con: string, bm: string, diem: number) {
  const id = await nv.taoNv(fam, { ten: `Việc ${diem} ${Math.random()}`, diem, bang_chung: "anh" });
  const luot = await nv.batDau(con, id);
  await nv.nop(con, luot, { anh: [anhGia(`${id}-${diem}`)] });
  return nv.duyet(fam, luot, bm, {});
}

async function nha() {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Tú Linh", saoKhoiDau: 0 });
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop của Tú Linh");
  const qua = await pt.taoQua(fam, { ten: "Chọn món bữa tối", loai: "dac_quyen", diem: 30 });
  return { fam, bm, con, qua, tok: may.token as string, tokBm: await taoPhien(bm) };
}

test("nghiệm thu #315 (khay Windows + màn Con điện thoại): 0 sao xin quà 30 → vay 30 → thấy 30 sao + đổi được → −30 → nhiệm vụ +10 → −20", async () => {
  const { fam, bm, con, qua, tok, tokBm } = await nha();
  assert.equal((await dv(tok, "hoc-vien/tong-quan")).body.sao, 0);
  // Con xin vay 30 sao để đổi quà (đường khay: POST device/yeu-cau) → Ba Mẹ đồng ý
  const xin = await dv(tok, "yeu-cau", { loai: "vay_sao", soSao: 30, mucDich: "qua", quaId: qua });
  assert.equal(xin.status, 200);
  await yc.dongY(fam, xin.body.id, bm);

  // khay: số dư 0 (thẻ Sao), dùng được 30 (`soDu` — khay chặn đổi quà theo số này), nợ 30
  let tq = (await dv(tok, "hoc-vien/tong-quan")).body;
  assert.deepEqual([tq.sao, tq.soDu, tq.soSao.sao, tq.soSao.no, tq.soSao.saoTieuDuoc], [0, 30, 0, 30, 30]);
  const ch = (await dv(tok, "hoc-vien/cua-hang")).body;
  assert.equal(ch.qua.find((x: any) => x.id === qua).du, true);
  assert.equal((await dv(tok, "vi-qua")).body.qua.find((x: any) => x.id === qua).doiDuoc, true);
  assert.equal(ch.soDu, 30, "cửa hàng: sao dùng được để đổi quà");
  // màn Con điện thoại: kid/sao — số dư 0, dùng được 30, nợ 30
  const s = (await kid(con, "sao")).body;
  assert.deepEqual([s.sao, s.no, s.saoTieuDuoc], [0, 30, 30]);

  // đổi đúng quà đã xin
  const doi = await dv(tok, `hoc-vien/doi/${qua}`, {});
  assert.equal(doi.status, 200, JSON.stringify(doi.body));
  tq = (await dv(tok, "hoc-vien/tong-quan")).body;
  assert.deepEqual([tq.sao, tq.soDu, tq.soSao.no, tq.soSao.saoTieuDuoc], [-30, 0, 30, 0], "tiêu hết ⇒ số dư âm đúng số nợ");
  assert.equal((await kid(con, "sao")).body.sao, -30);
  // Ba Mẹ thấy nợ
  let vi = (await m(tokBm, `con/${con}/vi-sao`)).body;
  assert.deepEqual([vi.sao, vi.no], [-30, 30]);

  // nhiệm vụ +10 ⇒ trả nợ trước ⇒ −20
  await lamNv(fam, con, bm, 10);
  tq = (await dv(tok, "hoc-vien/tong-quan")).body;
  assert.deepEqual([tq.sao, tq.soSao.no], [-20, 20]);
  assert.equal((await kid(con, "sao")).body.sao, -20);
  vi = (await m(tokBm, `con/${con}/vi-sao`)).body;
  assert.deepEqual([vi.sao, vi.no], [-20, 20]);
});

test("#315: Con còn sao riêng + vay phần thiếu (30 có, quà 50, vay 20) ⇒ dùng được 50, đổi được; số dư 30 → −20", async () => {
  const { fam, bm, con, tok, tokBm } = await nha();
  await ss.tangSaoKhoiDau(con, 30, bm);
  const qua = await pt.taoQua(fam, { ten: "Đi xem phim", loai: "qua", diem: 50 });
  const xin = await dv(tok, "yeu-cau", { loai: "vay_sao", soSao: 20, mucDich: "qua", quaId: qua });
  await yc.dongY(fam, xin.body.id, bm);
  const tq = (await dv(tok, "hoc-vien/tong-quan")).body;
  assert.deepEqual([tq.sao, tq.soDu, tq.soSao.no], [30, 50, 20], "khay 0.2.20 chặn theo sao=30 ⇒ «còn thiếu 20 sao» và xin vay lại mãi");
  assert.equal((await m(tokBm, `con/${con}/vi-sao`)).body.sao, 30);
  assert.equal((await dv(tok, `hoc-vien/doi/${qua}`, {})).status, 200);
  assert.equal((await dv(tok, "hoc-vien/tong-quan")).body.sao, -20);
});

test("#315 + #302: Con có giới hạn ngày / lượt đã chơi đủ ⇒ vay cho quà vẫn hiện sao và đổi được quà (giới hạn chỉ chặn chơi)", async () => {
  const VN = (x: string) => new Date(`${x}+07:00`);
  const sau = (d: Date, p: number) => new Date(d.getTime() + p * 60000);
  for (const cfg of [{ gioiHanNgayThuong: 30 }, { gioiHanNgayThuong: 60, phutMoiLuot: 30 }]) {
    const { fam, bm, con, qua } = await nha();
    await la.datLuat(fam, { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" });
    await qg.datGioChoi(fam, con, cfg, bm);
    await ss.tangSaoKhoiDau(con, 30, bm);
    const t0 = VN("2026-11-16T15:00:00");          // Thứ Hai
    for (let i = 1; i <= 30; i++) await ss.truPhutChoi(con, 1, sau(t0, i), { muc: "roblox.exe" });
    const t1 = sau(t0, 31);
    let qy = await qg.quyHomNay(con, t1);
    assert.equal(qy.conPhut, 0);
    assert.equal(qy.soSao.phutCon, 0, "đã tiêu hết 30 sao khởi đầu");
    // Con 0 sao, xin vay 30 để đổi quà 30 — vay đổi quà không cộng giới hạn chơi
    const r = await yc.guiYeuCau(con, null, { loai: "vay_sao", soSao: 30, mucDich: "qua", quaId: qua }, sau(t1, 1));
    await yc.dongY(fam, r.id, bm, {}, sau(t1, 2));
    qy = await qg.quyHomNay(con, sau(t1, 3));
    const st = qg.saoKepGioiHan(qy);
    assert.deepEqual([st.sao, st.saoTieuDuoc, st.no, st.phutCon], [0, 30, 30, 0], `${JSON.stringify(cfg)}: dùng được 30 (không kẹp), chơi vẫn khoá`);
    const ch = await pt.cuaHang(con);
    assert.equal(ch.qua.find((x) => x.id === qua)!.du, true);
    await pt.doiQua(con, qua, sau(t1, 4));
    qy = await qg.quyHomNay(con, sau(t1, 5));
    assert.deepEqual([qg.saoKepGioiHan(qy).sao, qy.soSao.no], [-30, 30]);
    await lamNv(fam, con, bm, 10);
    qy = await qg.quyHomNay(con, sau(t1, 6));
    assert.deepEqual([qg.saoKepGioiHan(qy).sao, qy.soSao.no], [-20, 20]);
  }
});
