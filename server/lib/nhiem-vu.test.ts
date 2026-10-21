// Nhiệm vụ + bằng chứng + phê duyệt (FR-03.01–03.04, BRD 6.2, Phụ lục A.1).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const nv = await import("./nhiem-vu.ts");
const g = await import("./gia-dinh.ts");
const v = await import("./vi.ts");
const th = await import("./thanh-tich.ts");
const { q, one } = await import("./db.ts");
const { taoNha, anhGia } = await import("./test-fixtures/nha.ts");

const loi = async (p: Promise<unknown>, ma: string) => assert.rejects(p, (e: { ma?: string }) => e.ma === ma);
const tt = async (id: string) => (await one<{ trang_thai: string }>(`select trang_thai from submissions where id = $1`, [id]))!.trang_thai;

test("mẫu «Gia đình có con tiểu học» tạo 8–12 nhiệm vụ; áp lại không tạo trùng", async () => {
  const { fam } = await taoNha();
  const n = await nv.apDungMau(fam, "nhi");
  assert.ok(n >= 8 && n <= 12, String(n));
  assert.equal(await nv.apDungMau(fam, "nhi"), 0);
  assert.ok((await nv.apDungMau(fam, "teen")) > 0);
});

test("BRD 6.2: rửa chén — bắt đầu, nộp ảnh, Ba Mẹ duyệt kèm lời khen ⇒ +10; tối đa 3 lần/ngày thì «Hôm nay đã đủ»", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const rc = await nv.taoNv(fam, { ten: "Rửa chén sau bữa ăn", diem: 10, nhom: "viec_nha", bang_chung: "anh", toi_da_ngay: 3 });
  for (let i = 1; i <= 3; i++) {
    const s = await nv.batDau(con, rc);
    assert.equal(await nv.batDau(con, rc), s, "bấm Bắt đầu lại không tạo lượt mới");
    await loi(nv.nop(con, s, {}), "thieu_anh");
    assert.deepEqual(await nv.nop(con, s, { anh: [anhGia(`chen-${i}`)] }), { trang_thai: "cho_duyet", nghi_trung: false });
    await loi(nv.nop(con, s, { anh: [anhGia("x")] }), "da_nop");
    const r = await nv.duyet(fam, s, bm, { loiKhen: i === 1 ? "Giỏi lắm!" : undefined });
    assert.equal(r.soDu, 10 * i);
    await loi(nv.duyet(fam, s, bm), "da_xu_ly");
  }
  await loi(nv.batDau(con, rc), "du_hom_nay");
  const ds = await nv.nvCuaCon(con);
  assert.equal(ds.find((x) => x.id === rc)!.trang_thai_con, "du_hom_nay");
  assert.equal((await one<{ noi_dung: string }>(`select noi_dung from messages where child_id = $1`, [con]))!.noi_dung, "Giỏi lắm!");
  const ls = await v.lichSu(con);
  assert.equal(ls[0].ly_do, "Nhiệm vụ Rửa chén sau bữa ăn");
  assert.equal(ls[0].nguoi, bm);
});

test("thời gian tối thiểu: đọc sách ≥ 20 phút từ lúc Bắt đầu mới nộp được", async () => {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const ds = await nv.taoNv(fam, { ten: "Đọc sách", diem: 10, nhom: "doc_sach", phut_toi_thieu: 20 });
  const s = await nv.batDau(con, ds);
  await loi(nv.nop(con, s, { anh: [anhGia("bia")] }), "chua_du_gio");
  await q(`update submissions set bat_dau_luc = now() - interval '21 minutes' where id = $1`, [s]);
  assert.equal((await nv.nop(con, s, { anh: [anhGia("bia")] })).trang_thai, "cho_duyet");
});

test("ảnh trùng ảnh đã nộp trước ⇒ gắn cờ nghi trùng + cảnh báo Ba Mẹ (không tự từ chối)", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Bill" });
  const t = await nv.taoNv(fam, { ten: "Lau sàn", diem: 10, nhom: "viec_nha" });
  const s1 = await nv.batDau(con, t);
  await nv.nop(con, s1, { anh: [anhGia("san")] });
  await nv.duyet(fam, s1, bm);
  const s2 = await nv.batDau(con, t);
  assert.deepEqual(await nv.nop(con, s2, { anh: [anhGia("san")] }), { trang_thai: "cho_duyet", nghi_trung: true });
  const cho = await nv.choDuyet(fam);
  assert.equal(cho.find((x) => x.id === s2)!.nghi_trung, true);
  assert.ok(await one(`select 1 from alerts where family_id = $1 and loai = 'bang_chung_trung'`, [fam]));
});

test("từ chối có lý do (không trừ điểm, làm lại được); cần bổ sung ⇒ nộp lại; ảnh quá lớn / sai dạng bị chặn", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Na" });
  const t = await nv.taoNv(fam, { ten: "Gấp quần áo", diem: 5 });
  const s = await nv.batDau(con, t);
  await nv.nop(con, s, { anh: [anhGia("a1")] });
  await loi(nv.tuChoi(fam, s, bm, ""), "thieu_ly_do");
  await nv.tuChoi(fam, s, bm, "Ảnh chưa rõ", true);
  assert.equal(await tt(s), "can_bo_sung");
  await nv.nop(con, s, { anh: [anhGia("a2")] });
  await nv.tuChoi(fam, s, bm, "Chưa gấp xong");
  assert.equal(await tt(s), "tu_choi");
  assert.equal(await v.soDu(con), 0);
  const s2 = await nv.batDau(con, t);
  assert.notEqual(s2, s);
  await loi(nv.nop(con, s2, { anh: [{ mime: "image/gif", base64: "AAAA" }] }), "anh_sai");
  await loi(nv.nop(con, s2, { anh: [{ mime: "image/jpeg", base64: Buffer.alloc(nv.ANH_TOI_DA + 1).toString("base64") }] }), "anh_qua_lon");
  // gia đình khác không duyệt / xem ảnh được
  const nha2 = await taoNha("Hoa");
  await nv.nop(con, s2, { anh: [anhGia("a3")] });
  await loi(nv.duyet(nha2.fam, s2, bm), "khong_thay");
  assert.equal((await nv.anhBangChung(nha2.fam, s2)).length, 0);
  assert.equal((await nv.anhBangChung(fam, s2)).length, 1);
});

test("duyệt hàng loạt, chỉnh điểm ±, quá 72 giờ hết hạn (hoặc tự duyệt khi bật); nhắc sau 24 giờ", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const t = await nv.taoNv(fam, { ten: "Đổ rác", diem: 5 });
  const ids: string[] = [];
  for (let i = 0; i < 3; i++) { const s = await nv.batDau(con, t); await nv.nop(con, s, { anh: [anhGia(`r${i}`)] }); ids.push(s); }
  assert.equal(await nv.duyetHangLoat(fam, ids.slice(0, 2), bm), 2);
  await q(`update submissions set nop_luc = now() - interval '73 hours' where id = $1`, [ids[2]]);
  await nv.xuLyQuaHan(fam);
  assert.equal(await tt(ids[2]), "het_han");
  const s4 = await nv.batDau(con, t);
  await nv.nop(con, s4, { anh: [anhGia("r4")] });
  await q(`update submissions set nop_luc = now() - interval '25 hours' where id = $1`, [s4]);
  await nv.choDuyet(fam);
  await nv.choDuyet(fam);
  assert.equal((await q(`select 1 from alerts where family_id = $1 and loai = 'nhac_duyet'`, [fam])).length, 1, "nhắc một lần");
  await q(`update families set cau_hinh = '{"nv_tu_duyet_qua_han": 1}'::jsonb where id = $1`, [fam]);
  await q(`update submissions set nop_luc = now() - interval '80 hours' where id = $1`, [s4]);
  await nv.xuLyQuaHan(fam);
  assert.equal(await tt(s4), "duoc_duyet");
  const s5 = await nv.batDau(con, t);
  await nv.nop(con, s5, { anh: [anhGia("r5")] });
  assert.equal((await nv.duyet(fam, s5, bm, { diem: 8 })).diem, 8);
  await loi(nv.duyet(fam, (await (async () => { const x = await nv.batDau(con, t); await nv.nop(con, x, { anh: [anhGia("r6")] }); return x; })()), bm, { diem: 0 }), "diem_sai");
});

test("AiiRob: bài đạt ngưỡng tự cộng 20 điểm, mỗi bài một lần; dưới ngưỡng không cộng", async () => {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  assert.equal(await nv.ketQuaAiiRob(con, { maBai: "EN-1", tenBai: "Chào hỏi", diemSo: 70 }), null);
  const r = await nv.ketQuaAiiRob(con, { maBai: "EN-1", tenBai: "Chào hỏi", diemSo: 90 });
  assert.equal(r!.diem, 20);
  assert.equal(await nv.ketQuaAiiRob(con, { maBai: "EN-1", tenBai: "Chào hỏi", diemSo: 100 }), null, "làm lại không cộng thêm");
  assert.equal(await v.soDu(con), 20);
  // nhiệm vụ tự động không hiện cho Con tự bấm
  assert.ok(!(await nv.nvCuaCon(con)).some((x) => x.bang_chung === "tu_dong"));
});

test("huy hiệu + chuỗi ngày: nhiệm vụ đầu được duyệt ⇒ «Khởi đầu»; 7 ngày liền ⇒ «Bền bỉ 7 ngày»", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const t = await nv.taoNv(fam, { ten: "Dọn phòng", diem: 5 });
  const ids: string[] = [];
  for (let i = 0; i < 7; i++) { const s = await nv.batDau(con, t); await nv.nop(con, s, { anh: [anhGia(`p${i}`)] }); await nv.duyet(fam, s, bm); ids.push(s); }
  for (let i = 0; i < 7; i++) await q(`update submissions set duyet_luc = now() - make_interval(days => $2) where id = $1`, [ids[i], i]);
  assert.equal(await th.chuoiNgay(con), 7);
  assert.deepEqual(await th.sauKhiDuyet(fam, con), ["chuoi_7"]);
  const tt2 = await th.thanhTich(con);
  assert.ok(tt2.huyHieu.find((h) => h.ma === "khoi_dau")!.dat);
});

test("hoàn tác duyệt trong 30 giây: trừ lại điểm, về chờ duyệt; quá hạn hoặc người khác thì không", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const t = await nv.taoNv(fam, { ten: "Rửa chén", diem: 10 });
  const s = await nv.batDau(con, t);
  await nv.nop(con, s, { anh: [anhGia("ht")] });
  const ct = await nv.chiTietLuot(fam, s);
  assert.equal(ct.lanHomNay, 1);
  await nv.duyet(fam, s, bm, { loiKhen: "Giỏi lắm!" });
  assert.equal(await v.soDu(con), 10);
  await nv.hoanTacDuyet(fam, s, bm);
  assert.equal(await v.soDu(con), 0);
  assert.equal(await tt(s), "cho_duyet");
  assert.equal(await one(`select 1 from messages where child_id = $1`, [con]), undefined);
  await nv.duyet(fam, s, bm);
  await q(`update submissions set duyet_luc = now() - interval '31 seconds' where id = $1`, [s]);
  await loi(nv.hoanTacDuyet(fam, s, bm), "het_hoan_tac");
});
