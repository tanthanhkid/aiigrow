// #433 phần B — việc & quà · báo cáo: mỗi test tái hiện một mục B (B1–B12) trên Postgres (PGlite trong tiến trình, như các test khác).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const nv = await import("./nhiem-vu.ts");
const g = await import("./gia-dinh.ts");
const v = await import("./vi.ts");
const ss = await import("./so-sao.ts");
const pt = await import("./phan-thuong.ts");
const bc = await import("./bao-cao.ts");
const { csvBaoCao } = await import("./xuat-csv.ts");
const { q, one } = await import("./db.ts");
const { taoNha, anhGia } = await import("./test-fixtures/nha.ts");

const loi = async (p: Promise<unknown>, ma: string) => assert.rejects(p, (e: { ma?: string }) => e.ma === ma);
const tt = async (id: string) => (await one<{ trang_thai: string }>(`select trang_thai from submissions where id = $1`, [id]))!.trang_thai;
const coHuyHieu = async (con: string, ma: string) => !!(await one(`select 1 from badges where child_id = $1 and ma = $2`, [con, ma]));
const gioTruoc = (h: number) => new Date(Date.now() - h * 3600_000);

async function nopXong(con: string, task: string) {
  const s = await nv.batDau(con, task);
  await nv.nop(con, s, { anh: [anhGia(`${s}-${Math.random()}`)], ghiChu: "con làm xong rồi" });
  return s;
}

test("B1+B4: hoàn tác duyệt ⇒ sao kiếm (ví, 7 ngày), cấp độ trừ lại; huy hiệu cap_5 / khoi_dau do lần duyệt đó trao bị thu hồi", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const t = await nv.taoNv(fam, { ten: "Dọn nhà to", diem: 1000, nhom: "viec_nha", bang_chung: "anh" });
  const s = await nopXong(con, t);
  await nv.duyet(fam, s, bm, { diem: 1500 });
  assert.equal((await v.tomTatVi(con)).tongKiem, 1500);
  assert.ok((await v.tomTatVi(con)).capDo.cap >= 5);
  assert.ok(await coHuyHieu(con, "cap_5"));
  await nv.hoanTacDuyet(fam, s, bm);
  const vi = await v.tomTatVi(con);
  assert.equal(vi.tongKiem, 0, "sao đã hoàn tác không còn trong «tổng kiếm»");
  assert.equal(vi.capDo.cap, 1);
  const tuan = await ss.thongKeSao(con, gioTruoc(24 * 7), new Date(Date.now() + 1000));
  assert.equal(tuan.saoKiem, 0, "sao kiếm 7 ngày trừ phần hoàn tác");
  assert.equal(await coHuyHieu(con, "cap_5"), false, "cap_5 trao bởi lần duyệt đã hoàn tác ⇒ thu hồi");
  assert.equal(await coHuyHieu(con, "khoi_dau"), false);
  // duyệt lại ⇒ trao lại
  await nv.duyet(fam, s, bm, { diem: 1500 });
  assert.ok(await coHuyHieu(con, "cap_5"));
});

test("B1: huỷ phiếu quà ⇒ «sao tiêu đổi quà» không còn tính quà đã huỷ", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  await v.dieuChinhTay(fam, con, 200, "thưởng", bm);
  const qua = await pt.taoQua(fam, { ten: "Đi ăn kem", loai: "dac_quyen", diem: 100 });
  const r = await pt.doiQua(con, qua);
  const tu = gioTruoc(1), den = new Date(Date.now() + 1000);
  assert.equal((await ss.thongKeSao(con, tu, den)).saoTieuQua, 100);
  await pt.huyPhieu(fam, (r as { phieu: string }).phieu, bm);
  const tk = await ss.thongKeSao(con, tu, den);
  assert.equal(tk.saoTieuQua, 0);
  assert.equal(tk.saoTieu, 0);
  assert.equal(tk.saoKiem, 0, "hoàn quà không phải sao kiếm; thưởng tay của Ba Mẹ cũng không (#658)");
});

test("B2: quét quá hạn toàn hệ thống (không cần Ba Mẹ mở Chờ duyệt) — nhắc 24h, hết hạn ghi sự kiện + báo Ba Mẹ; lượt dở của việc đã tắt được đóng", async () => {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const t = await nv.taoNv(fam, { ten: "Gấp quần áo", diem: 5, nhom: "viec_nha", bang_chung: "anh" });
  const cu = await nopXong(con, t), vua = await nopXong(con, t);
  await q(`update submissions set nop_luc = $2 where id = $1`, [cu, gioTruoc(80)]);
  await q(`update submissions set nop_luc = $2 where id = $1`, [vua, gioTruoc(30)]);
  const t2 = await nv.taoNv(fam, { ten: "Tưới cây", diem: 5, nhom: "viec_nha", bang_chung: "anh" });
  const do_ = await nv.batDau(con, t2);
  await q(`update tasks set bat = false where id = $1`, [t2]);
  await q(`update submissions set bat_dau_luc = $2 where id = $1`, [do_, gioTruoc(25)]);
  const kq = await nv.quetQuaHan();
  assert.ok(kq.giaDinh >= 1);
  assert.equal(await tt(cu), "het_han");
  assert.equal(await tt(vua), "cho_duyet");
  assert.equal(await tt(do_), "het_han", "lượt đang làm của việc đã tắt không kẹt mãi");
  assert.ok(await one(`select 1 from events where family_id = $1 and loai = 'het_han_nhiem_vu'`, [fam]), "ghi sự kiện hết hạn");
  assert.ok(await one(`select 1 from alerts where family_id = $1 and loai = 'het_han_nhiem_vu'`, [fam]), "báo Ba Mẹ việc hết hạn");
  assert.ok(await one(`select 1 from alerts where family_id = $1 and loai = 'nhac_duyet'`, [fam]), "nhắc lượt chờ quá 24 giờ");
  // chạy lại không ghi đôi
  await nv.quetQuaHan();
  assert.equal((await one<{ n: number }>(`select count(*)::int as n from alerts where family_id = $1 and loai = 'het_han_nhiem_vu'`, [fam]))!.n, 1);
});

test("B4: chuỗi ngày tính theo ngày Con làm (nộp), không theo ngày Ba Mẹ duyệt", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const t = await nv.taoNv(fam, { ten: "Đọc sách 20 trang", diem: 5, nhom: "doc_sach", bang_chung: "anh" });
  const { chuoiNgay } = await import("./thanh-tich.ts");
  // nộp hôm qua, hôm kia; Ba Mẹ duyệt dồn hôm nay
  for (const h of [24, 48]) {
    const s = await nopXong(con, t);
    await q(`update submissions set nop_luc = $2, bat_dau_luc = $2 where id = $1`, [s, gioTruoc(h)]);
    await nv.duyet(fam, s, bm);
  }
  assert.equal(await chuoiNgay(con), 2);
});

test("B5: việc «Bấm Xong» tự duyệt không đặt giới hạn ⇒ vẫn có trần mỗi ngày", async () => {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const t = await nv.taoNv(fam, { ten: "Đánh răng", diem: 5, nhom: "ky_nang", bang_chung: "xong", tu_duyet: true });
  for (let i = 0; i < nv.TU_DUYET_TOI_DA_NGAY; i++) {
    const s = await nv.batDau(con, t);
    assert.equal((await nv.nop(con, s, {})).trang_thai, "duoc_duyet");
  }
  await loi(nv.batDau(con, t), "du_hom_nay");
  assert.equal(await v.soDu(con), 5 * nv.TU_DUYET_TOI_DA_NGAY);
  assert.equal((await nv.nvCuaCon(con)).find((x) => x.id === t)?.trang_thai_con, "du_hom_nay");
});

test("B6: «Áp cho» việc một lần của cả nhà ⇒ Con đã làm không làm lại để nhận sao thêm", async () => {
  const { fam, bm } = await taoNha();
  const a = await g.taoCon(fam, { ten: "An" }), b = await g.taoCon(fam, { ten: "Bin" });
  const t = await nv.taoNv(fam, { ten: "Dọn tủ sách", diem: 20, nhom: "viec_nha", bang_chung: "anh", lap_lai: "mot_lan" });
  await nv.duyet(fam, await nopXong(a, t), bm);
  const r = await nv.luuNv(fam, t, { apCho: [a, b] }, bm);
  assert.equal(r.taoMoi, 2);
  assert.equal((await nv.nvCuaCon(a)).some((x) => x.ten === "Dọn tủ sách"), false, "An đã làm việc một lần này");
  const banB = (await nv.nvCuaCon(b)).find((x) => x.ten === "Dọn tủ sách");
  assert.equal(banB?.trang_thai_con, "san_sang");
});

test("B7: AiiRob không tạo lại việc Ba Mẹ đã tắt, không dùng việc giao cho Con khác", async () => {
  const { fam } = await taoNha();
  const a = await g.taoCon(fam, { ten: "An" }), b = await g.taoCon(fam, { ten: "Bin" });
  assert.ok(await nv.ketQuaAiiRob(a, { maBai: "B1", tenBai: "Bài 1", diemSo: 90 }));
  const t = (await one<{ id: string }>(`select id from tasks where family_id = $1 and bang_chung = 'tu_dong'`, [fam]))!.id;
  await q(`update tasks set giao_cho = $2 where id = $1`, [t, a]);
  assert.equal(await nv.ketQuaAiiRob(b, { maBai: "B2", tenBai: "Bài 2", diemSo: 90 }), null, "việc AiiRob chỉ giao cho An");
  await q(`update tasks set bat = false where id = $1`, [t]);
  assert.equal(await nv.ketQuaAiiRob(a, { maBai: "B3", tenBai: "Bài 3", diemSo: 90 }), null, "Ba Mẹ đã tắt việc AiiRob");
  assert.equal((await one<{ n: number }>(`select count(*)::int as n from tasks where family_id = $1 and bang_chung = 'tu_dong'`, [fam]))!.n, 1);
});

test("B8: nộp lượt của việc Ba Mẹ đã tắt ⇒ báo rõ + đóng lượt (không kẹt «đang làm»)", async () => {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const t = await nv.taoNv(fam, { ten: "Lau bàn học", diem: 5, nhom: "viec_nha", bang_chung: "anh" });
  const s = await nv.batDau(con, t);
  await q(`update tasks set bat = false where id = $1`, [t]);
  await loi(nv.nop(con, s, { anh: [anhGia("lau")] }), "viec_da_tat");
  assert.equal(await tt(s), "het_han");
  assert.equal((await one<{ d: Date | null }>(`select duyet_luc as d from submissions where id = $1`, [s]))!.d, null, "chưa từng chờ duyệt ⇒ báo cáo không đếm");
});

test("B9: duyệt lấy số sao lúc Con nộp, không lấy số sao Ba Mẹ sửa sau", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const t = await nv.taoNv(fam, { ten: "Rửa chén", diem: 10, nhom: "viec_nha", bang_chung: "anh" });
  const s = await nopXong(con, t);
  await nv.suaNv(fam, t, { diem: 50 });
  assert.equal((await nv.choDuyet(fam)).find((x) => x.id === s)?.sao, 10);
  assert.equal((await nv.chiTietLuot(fam, s)).diem_md, 10, "màn duyệt hiện / gửi số sao lúc nộp");
  assert.equal((await v.tomTatVi(con)).saoChoDuyet, 10);
  assert.equal((await nv.duyet(fam, s, bm)).diem, 10);
});

test("B10: báo cáo — sao tiêu không gom trả nợ / hoàn; duyệt đếm cả nhờ làm lại + hết hạn; CSV cột «Không tính phút»", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  await ss.choVay(fam, con, 30, bm);
  const t = await nv.taoNv(fam, { ten: "Rửa chén", diem: 10, nhom: "viec_nha", bang_chung: "anh" });
  await nv.duyet(fam, await nopXong(con, t), bm);           // +10, trả nợ −10
  const s2 = await nopXong(con, t);
  await nv.duyet(fam, s2, bm);
  await nv.hoanTacDuyet(fam, s2, bm);                         // hoàn −10
  await nv.nhoLamLai(fam, s2, bm, { lyDo: "Chưa sạch" });
  const t3 = await nv.taoNv(fam, { ten: "Dọn phòng", diem: 10, nhom: "viec_nha", bang_chung: "anh" });
  const s3 = await nopXong(con, t3);
  await nv.tuChoi(fam, s3, bm, "Không đúng nhiệm vụ");
  const r = await bc.baoCaoTuan(fam, con, new Date(), true);
  const loai = r.tuanNay.diemTieuTheoLoai.map((x: { loai: string }) => x.loai);
  for (const l of ["tra_no", "hoan", "vay"]) assert.ok(!loai.includes(l), `tiêu không gom ${l}: ${loai}`);
  assert.equal(r.tuanNay.duyet.tu_choi, 1);
  assert.equal(r.tuanNay.duyet.lam_lai, 1);
  const csv = csvBaoCao(r).noiDung;
  assert.ok(csv.includes("Phút giải trí,Không tính phút"), "cột thứ ba là «Không tính phút»");
  assert.ok(!csv.includes("Phút học"));
});

test("B12: Ba Mẹ từ chối «Không đúng nhiệm vụ» ⇒ Con thấy lý do trên việc đó", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const t = await nv.taoNv(fam, { ten: "Dọn phòng", diem: 10, nhom: "viec_nha", bang_chung: "anh" });
  const s = await nopXong(con, t);
  await nv.tuChoi(fam, s, bm, "Không đúng nhiệm vụ");
  const x = (await nv.nvCuaCon(con)).find((y) => y.id === t)!;
  assert.equal(x.trang_thai_con, "san_sang");
  assert.equal(x.tu_choi?.ly_do, "Không đúng nhiệm vụ");
  // nộp lượt mới ⇒ lý do cũ không còn hiện
  await nopXong(con, t);
  assert.equal((await nv.nvCuaCon(con)).find((y) => y.id === t)!.tu_choi, null);
});

test("B11: mẫu quà (MAU_QUA) khớp tên + số sao quà mặc định, không còn quà phút", async () => {
  const { QUA_MAC_DINH } = await import("./qua-bang-gia.ts");
  for (const m of pt.MAU_QUA) {
    const md = QUA_MAC_DINH.find((x) => x.ten === m.ten);
    assert.ok(md, m.ten);
    assert.equal(m.diem, md!.diem, m.ten);
  }
  assert.ok(!pt.MAU_QUA.some((m) => m.loai === "phut"));
});
