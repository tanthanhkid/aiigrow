// V1 (07/11): GET /api/device/vi-qua — ví quà của bé đang đăng nhập trên máy con (sao, quà + điều kiện, phiếu chờ, đã trao + voucher QR, huy hiệu).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyM } = await import("./api-m.ts");
const { xuLyMay } = await import("./api-may.ts");
const g = await import("./gia-dinh.ts");
const v = await import("./vi.ts");
const { q } = await import("./db.ts");
const { viQuaMay } = await import("./vi-qua-may.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const { taoPhien } = await import("./auth.ts");

const goi = (xuLy: (r: Request, p: string[]) => Promise<Response>, goc: string) =>
  async (tok: string, duong: string, body?: unknown) => {
    const r = await xuLy(new Request(`http://x/api/${goc}/${duong}`, { method: body === undefined ? "GET" : "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${tok}` }, body: body === undefined ? undefined : JSON.stringify(body) }), duong.split("?")[0].split("/"));
    return { status: r.status, body: (await r.json()) as any };
  };
const m = goi(xuLyM, "m"), dv = goi(xuLyMay, "device");

test("device/vi-qua: bé theo phiên máy — quà, điều kiện, phiếu chờ, đã trao + voucher QR, huy hiệu", async () => {
  const { fam, bm } = await taoNha();
  const tokBm = await taoPhien(bm);
  const anh = (await m(tokBm, "con", { ten: "Bảo Anh", pin: "4821" })).body.id as string;
  const minh = (await m(tokBm, "con", { ten: "Bảo Minh" })).body.id as string;
  const chung = await g.ghepMay(await g.taoMaGhep(fam, null, "windows"), "windows", "PC chung");
  const tok = chung.token as string;
  // chưa ai đăng nhập ⇒ 409
  assert.equal((await dv(tok, "vi-qua")).status, 409);
  await v.dieuChinhTay(fam, anh, 700, "Sao thử", bm);
  await v.dieuChinhTay(fam, minh, 10, "Sao thử", bm);
  assert.equal((await dv(tok, "dang-nhap-be", { con: anh, pin: "4821" })).status, 200);
  const ds = (await m(tokBm, "qua")).body.ds;
  const id = (ma: string) => ds.find((x: any) => x.mau === ma).id as string;
  // quà riêng của Bảo Minh không hiện cho Bảo Anh
  await m(tokBm, "qua", { ten: "Riêng Minh", sao: 20, loai: "qua", apCho: [minh] });
  const d1 = (await dv(tok, `hoc-vien/doi/${id("bua_toi")}`, {})).body;
  const d2 = (await dv(tok, `hoc-vien/doi/${id("aiicafe_20k")}`, {})).body;
  const tr = (await m(tokBm, `phieu/${d2.phieu}/trao`, {})).body;
  await q(`insert into badges(child_id, ma) values ($1, 'khoi_dau')`, [anh]);

  const r = (await dv(tok, "vi-qua")).body;
  assert.deepEqual([r.con.ten, r.sao, r.saoGiu], ["Bảo Anh", 450, 50]);
  assert.ok(!r.qua.some((x: any) => x.ten === "Riêng Minh"));
  const phim = r.qua.find((x: any) => x.ten === "Đi xem phim");
  assert.deepEqual([phim.sao, phim.dieuKien.chiCuoiTuan, phim.du], [300, true, true]);
  assert.equal(phim.conHopLe, phim.lyDoKhong === null);
  assert.equal(r.qua.find((x: any) => x.ten === "Chọn món bữa tối").choTraoTu !== null, true);
  assert.deepEqual(r.phieuCho.map((p: any) => [p.id, p.sao]), [[d1.phieu, 50]]);
  const da = r.daTrao.find((p: any) => p.id === d2.phieu);
  assert.deepEqual([da.sao, da.voucher.qr, da.voucher.ma, da.voucher.menhGia, da.voucher.conNgay], [200, tr.voucher.ma, tr.voucher.ma, 20000, 60]);
  assert.equal(r.voucher[0].ma, tr.voucher.ma);
  assert.deepEqual(r.huyHieu.map((h: any) => [h.ma, h.ten]), [["khoi_dau", "Khởi đầu"]]);

  // điều kiện theo thời điểm: thứ Tư không hợp lệ, thứ Bảy hợp lệ; tối đa X lần / tháng
  const thuTu = await viQuaMay(anh, new Date("2026-11-04T03:00:00Z"));
  const thuBay = await viQuaMay(anh, new Date("2026-11-07T03:00:00Z"));
  assert.deepEqual([thuTu.qua.find((x: any) => x.ten === "Đi xem phim")!.lyDoKhong, thuBay.qua.find((x: any) => x.ten === "Đi xem phim")!.conHopLe], ["chi_cuoi_tuan", true]);
  await m(tokBm, `qua/${id("an_kem")}`, { toiDaThang: 1 });
  await dv(tok, `hoc-vien/doi/${id("an_kem")}`, {});
  const kem = (await dv(tok, "vi-qua")).body.qua.find((x: any) => x.ten === "Đi ăn kem");
  assert.deepEqual([kem.lyDoKhong, kem.doiDuoc, kem.dieuKien.daDoiThang], ["du_thang", false, 1]);

  // đổi bé ⇒ ví của bé mới (không lẫn)
  await dv(tok, "dang-xuat", {});
  assert.equal((await dv(tok, "vi-qua")).status, 409);
  await dv(tok, "dang-nhap-be", { con: minh });
  const rm = (await dv(tok, "vi-qua")).body;
  assert.deepEqual([rm.con.ten, rm.sao, rm.phieuCho.length, rm.daTrao.length, rm.huyHieu.length], ["Bảo Minh", 10, 0, 0, 0]);
  assert.ok(rm.qua.some((x: any) => x.ten === "Riêng Minh"));
});
