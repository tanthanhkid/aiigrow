// Đóng băng chuỗi ngày (FR-03.06, 1 lần/tuần) + xuất CSV báo cáo tuần (FR-06.02).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const db = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const g = await import("./gia-dinh.ts");
const dbg = await import("./dong-bang.ts");
const { chuoiNgay, thanhTich } = await import("./thanh-tich.ts");
const { csvBaoCao, xuatCsvBaoCao } = await import("./xuat-csv.ts");
const { xuLyM } = await import("./api-m.ts");
const { taoPhien } = await import("./auth.ts");

const loi = async (p: Promise<unknown>, ma: string) => assert.rejects(p, (e: { ma?: string }) => e.ma === ma);
/** Một lượt được duyệt lúc 12:00 giờ VN của ngày `ngay`. */
async function duyetNgay(fam: string, con: string, ngay: string) {
  let t = await db.one<{ id: string }>(`select id from tasks where family_id = $1 limit 1`, [fam]);
  if (!t) { t = { id: db.newId() }; await db.q(`insert into tasks(id, family_id, ten, diem) values ($1, $2, 'Rửa chén', 10)`, [t.id, fam]); }
  await db.q(`insert into submissions(id, task_id, child_id, trang_thai, duyet_luc) values ($1,$2,$3,'duoc_duyet',$4::timestamptz)`,
    [db.newId(), t.id, con, `${ngay}T05:00:00Z`]);
}

test("demChuoi: ngày đóng băng giữ chuỗi, không cộng thêm ngày; hôm nay chưa làm vẫn tính tới hôm qua", () => {
  const lam = new Set(["2026-10-17", "2026-10-18", "2026-10-20", "2026-10-21"]);
  assert.equal(dbg.demChuoi(lam, new Set(), "2026-10-22"), 2);
  assert.equal(dbg.demChuoi(lam, new Set(["2026-10-19"]), "2026-10-22"), 4);
  assert.equal(dbg.demChuoi(lam, new Set(["2026-10-19", "2026-10-22"]), "2026-10-22"), 4);
  assert.equal(dbg.demChuoi(new Set(), new Set(), "2026-10-22"), 0);
});

test("đóng băng: giữ hôm qua bị bỏ lỡ; tối đa 1 lần/tuần; hôm nay đã làm thì không cần; cách ly gia đình", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  // Thứ Năm 22/10/2026 19:00 giờ VN; Con làm T2–T3, bỏ T4
  const bay = new Date("2026-10-22T12:00:00Z");
  for (const n of ["2026-10-19", "2026-10-20"]) await duyetNgay(fam, con, n);
  assert.equal(await chuoiNgay(con, bay), 0, "bỏ hôm qua ⇒ đứt");
  const tt = await dbg.trangThaiDongBang(con, "Asia/Ho_Chi_Minh", bay);
  assert.deepEqual([tt.ngay, tt.duocDung], ["2026-10-21", true]);
  assert.deepEqual(await dbg.dongBangChuoi(fam, con, bm, bay), { ngay: "2026-10-21" });
  assert.equal(await chuoiNgay(con, bay), 2, "đóng băng hôm qua ⇒ giữ chuỗi 2 ngày");
  // lần thứ hai cùng tuần (giữ hôm nay) ⇒ từ chối
  await loi(dbg.dongBangChuoi(fam, con, bm, bay), "da_dong_bang_tuan");
  // hôm nay đã làm ⇒ không cần
  await duyetNgay(fam, con, "2026-10-22");
  await loi(dbg.dongBangChuoi(fam, con, bm, bay), "khong_can_dong_bang");
  assert.equal(await chuoiNgay(con, bay), 3);
  // tuần sau dùng lại được
  const tuanSau = new Date("2026-10-27T12:00:00Z");          // T3 tuần sau; bỏ T6 23 → CN 25, T2 26
  const tt2 = await dbg.trangThaiDongBang(con, "Asia/Ho_Chi_Minh", tuanSau);
  assert.equal(tt2.ngay, "2026-10-27", "hôm qua bỏ lỡ nhưng chuỗi trước đó đã đứt ⇒ chỉ giữ hôm nay");
  assert.equal(tt2.duocDung, true);
  const nha2 = await taoNha("Hoa");
  await loi(dbg.dongBangChuoi(nha2.fam, con, nha2.bm, bay), "khong_thay");
  assert.ok("dongBang" in (await thanhTich(con)));
});

test("API: Ba Mẹ đóng băng qua /api/m; Chỉ xem không đóng băng được; CSV báo cáo tuần có BOM + đúng cột", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  const tok = await taoPhien(bm);
  const goi = async (d: string, body?: unknown, t = tok) => {
    const r = await xuLyM(new Request(`http://x/api/m/${d}`, { method: body === undefined ? "GET" : "POST", headers: { authorization: `Bearer ${t}`, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body) }), d.split("/"));
    return { status: r.status, body: await r.json() };
  };
  const r = await goi(`con/${con}/dong-bang-chuoi`, {});
  assert.equal(r.status, 200, JSON.stringify(r.body));
  const xem = await db.one<{ id: string }>(`insert into parents(id, family_id, dinh_danh, ten, vai) values ($1,$2,$3,'Bà','xem') returning id`, [db.newId(), fam, `${db.newId()}@vd.vn`]);
  assert.equal((await goi(`con/${con}/dong-bang-chuoi`, {}, await taoPhien(xem!.id))).status, 403);
  const csv = await goi(`con/${con}/bao-cao/csv`);
  assert.equal(csv.status, 200);
  assert.match(csv.body.tenTep, /^aiigrow-bao-cao-Bao-Anh-\d{4}-\d{2}-\d{2}\.csv$/);
  assert.ok(csv.body.noiDung.startsWith("﻿Báo cáo tuần AiiGrow,Bảo Anh\r\n"));
  assert.ok(csv.body.noiDung.includes("Ngày,Phút giải trí,Phút học\r\n"));
  const nha2 = await taoNha("Hoa");
  assert.equal((await goi(`con/${con}/bao-cao/csv`, undefined, await taoPhien(nha2.bm))).status, 404);
  assert.ok((await xuatCsvBaoCao(fam, con)).noiDung.includes("Tổng tuần này"));
});

test("csvBaoCao: ô có dấu phẩy / ngoặc kép được bọc đúng chuẩn CSV", () => {
  const tuan = { dau: "2026-10-19", giaiTriTheoNgay: [{ ngay: "2026-10-19", phut: 30 }], hocTheoNgay: [{ ngay: "2026-10-19", phut: 45 }], tongGiaiTri: 30, phutHoc: 45,
    diemKiemTheoNhom: [{ nhom: "doc_sach", diem: 20, n: 2 }], diemTieuTheoLoai: [], duyet: { duoc: 2, tu_choi: 1 }, ngoaiLe: 0, top: [],
    dungNhieu: [{ muc: 'game "vui", hay', loai: "giai_tri", phut: 30, lech: null }] };
  const { noiDung } = csvBaoCao({ ten: "Ken", tuanNay: tuan, tuanTruoc: { ...tuan, dungNhieu: [] }, chuGiai: [] } as never);
  assert.ok(noiDung.includes('"game ""vui"", hay",Giải trí,30,mới'));
  assert.ok(noiDung.includes("2026-10-19,30,45"));
  assert.ok(noiDung.includes("Đọc sách,2,20"));
});
