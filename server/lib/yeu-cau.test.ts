// Yêu cầu + phê duyệt (FR-05, BRD 6.4, Phụ lục A.2). 15/11 (#263/#265): lời xin thêm giờ / ngoại lệ = xin VAY sao; «ngoại lệ» bỏ hẳn.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const yc = await import("./yeu-cau.ts");
const la = await import("./luat-app.ts");
const ph = await import("./phien.ts");
const g = await import("./gia-dinh.ts");
const v = await import("./vi.ts");
const { q, one } = await import("./db.ts");
const { taoNha, taoBaMe } = await import("./test-fixtures/nha.ts");

const VN = (s: string) => new Date(`${s}+07:00`);
const loi = async (p: Promise<unknown>, ma: string) => assert.rejects(p, (e: { ma?: string }) => e.ma === ma);
const T = VN("2026-10-21T18:00:00");

test("BRD 6.4: xin mở scratch.mit.edu «Để làm bài tập» ⇒ Ba Mẹ đồng ý Học tập – Vĩnh viễn ⇒ mở được, không tính điểm", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const r = await yc.guiYeuCau(con, "may1", { loai: "mo_web", giaTri: "https://scratch.mit.edu/projects/1", lyDo: "Để làm bài tập" }, T);
  assert.equal((await yc.dsChoYc(fam, T))[0].gia_tri, "scratch.mit.edu");
  await yc.dongY(fam, r.id, bm, { phanLoai: "hoc", phamVi: "vinh_vien" }, T);
  assert.equal((await la.phanLoai(fam, con, "scratch.mit.edu")).loai, "hoc");
  await loi(yc.dongY(fam, r.id, bm, {}, T), "da_xu_ly");
  assert.equal((await q(`select 1 from exceptions where child_id = $1`, [con])).length, 0, "không còn ghi ngoại lệ");
});

test("giới hạn 3 đang chờ / 10 mỗi ngày; huỷ được; hết hạn sau 24 giờ; nhà khác không duyệt được; người đầu tiên quyết", async () => {
  const { fam, bm } = await taoNha();
  const ba = await taoBaMe(fam);
  const con = await g.taoCon(fam, { ten: "Bill" });
  const ids = [];
  for (let i = 0; i < 3; i++) ids.push((await yc.guiYeuCau(con, null, { loai: "them_gio", phut: 15, lyDo: "Bạn rủ chơi" }, T)).id);
  await loi(yc.guiYeuCau(con, null, { loai: "them_gio", phut: 15, lyDo: "x" }, T), "qua_nhieu_cho");
  await yc.huyYeuCau(con, ids[0]);
  await loi(yc.huyYeuCau(con, ids[0]), "da_xu_ly");
  // 05/11: lời nhắn không bắt buộc
  const khongLyDo = await yc.guiYeuCau(con, null, { loai: "them_gio", phut: 15 }, T);
  await yc.huyYeuCau(con, khongLyDo.id);
  const nha2 = await taoNha("Hoa");
  await loi(yc.dongY(nha2.fam, ids[1], bm, { truDiem: false }, T), "khong_thay");
  await yc.tuChoiYc(fam, ids[1], bm, "Hôm nay chơi đủ rồi", T);
  await loi(yc.dongY(fam, ids[1], ba, {}, T), "da_xu_ly");
  await q(`update requests set het_han = $2 where id = $1`, [ids[2], new Date(T.getTime() - 60000)]);
  await loi(yc.dongY(fam, ids[2], bm, {}, T), "het_han");
  for (let i = 0; i < 6; i++) { const x = await yc.guiYeuCau(con, null, { loai: "khac", giaTri: "x", lyDo: "y" }, T); await yc.huyYeuCau(con, x.id); }
  await loi(yc.guiYeuCau(con, null, { loai: "khac", giaTri: "x", lyDo: "y" }, T), "qua_nhieu_ngay");
});

test("xin vay sao (vay_sao: chơi / đổi quà) và lời xin cũ (them_gio / ngoai_le / ngoai_gio) ⇒ Ba Mẹ cho vay N sao; không còn trừ điểm / ngoại lệ / cửa sổ", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const a = await yc.guiYeuCau(con, null, { loai: "vay_sao", soSao: 15, lyDo: "Con muốn chơi thêm" }, T);
  assert.deepEqual([a.soSao, a.mucDich], [15, "choi"]);
  const xt = await yc.xemTruocDongY(fam, a.id);
  assert.deepEqual([xt.mucCanhBao, (xt as any).noSau, (xt as any).cau], ["khong", 15, "= 15 phút chơi hoặc đổi quà · Ken sẽ nợ 15 sao"]);
  const r = await yc.dongY(fam, a.id, bm, { truDiem: true }, T);     // truDiem (app cũ) bỏ qua
  assert.equal(r.ngoaiLe, false);
  assert.deepEqual([r.vay!.soSao, r.vay!.sao, r.vay!.no, r.vay!.phutCon], [15, 0, 15, 15]);
  const yr = (await one<{ trang_thai: string; tru_diem: boolean | null; ngoai_le: boolean }>(`select trang_thai, tru_diem, ngoai_le from requests where id = $1`, [a.id]))!;
  assert.deepEqual([yr.trang_thai, yr.tru_diem, yr.ngoai_le], ["dong_y", null, false]);
  // lời xin cũ: them_gio / ngoai_le (kèm phạm vi app) / ngoai_gio ⇒ cùng là xin vay `phut` sao, giữ loai cũ
  for (const [loai, them] of [["them_gio", {}], ["ngoai_le", { phamVi: "app", giaTri: "roblox.exe" }], ["ngoai_gio", {}]] as const) {
    const x = await yc.guiYeuCau(con, null, { loai, phut: 10, ...them }, T);
    assert.equal(x.soSao, 10, loai);
    await yc.dongY(fam, x.id, bm, {}, T);
  }
  assert.equal(await one(`select 1 from grants where child_id = $1`, [con]), undefined, "không còn grants (quỹ / ngoại lệ)");
  assert.equal((await q(`select 1 from exceptions where child_id = $1`, [con])).length, 0);
  assert.deepEqual([await v.soDu(con), await v.noCua(con)], [45, 45]);
  // xin vay để đổi quà: quaId phải thuộc nhà; chi tiết kèm quà; vay xong đổi được
  const { taoQua, doiQua } = await import("./phan-thuong.ts");
  const qua = await taoQua(fam, { ten: "Voucher 20k", loai: "dac_quyen", diem: 50 });
  await loi(yc.guiYeuCau(con, null, { loai: "vay_sao", soSao: 50, quaId: "khong-co" }, T), "khong_thay");
  const b = await yc.guiYeuCau(con, null, { loai: "vay_sao", soSao: 50, mucDich: "qua", quaId: qua }, T);
  const ct = await yc.chiTietYc(fam, b.id);
  assert.deepEqual([ct.laVay, ct.mucDich, ct.qua?.ten, ct.soSao, ct.sao, ct.no], [true, "qua", "Voucher 20k", 50, 0, 45]);
  await yc.dongY(fam, b.id, bm, {}, T);
  await doiQua(con, qua, T);
  const vi = await v.tomTatVi(con);
  assert.deepEqual([vi.soDu, vi.no, vi.sao], [45, 95, -50]);
  // quy tắc tự động cũ (tu_dong_15) không còn tự cho
  await q(`update children set cau_hinh = cau_hinh || '{"tu_dong_15": true}'::jsonb where id = $1`, [con]);
  const c = await yc.guiYeuCau(con, null, { loai: "them_gio", phut: 15 }, T);
  assert.equal(await yc.apQuyTacTuDong(fam, c.id, T), false);
});

test("mở khẩn cấp rồi tắt máy lâu KHÔNG thành «ngoài vòng»; «Khoá lại ngay» đóng mở khẩn cấp", async () => {
  const tt = await import("./tuan-thu.ts");
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Phi" });
  const r = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "PC của Phi");
  const may = (await g.mayTuToken(r.token))!;
  await tt.moKhanCap(fam, may.id, { phut: 30 }, bm, T);
  assert.ok(await tt.hanMoCuaMay(may, con, T));
  const sau = new Date(T.getTime() + 60 * 60000);
  assert.deepEqual(await tt.quetMatNhip(fam, sau), []);
  const t1 = (await tt.dsTuanThu(fam, sau)).find((x) => x.id === may.id)!;
  assert.equal(t1.trangThai, "chua_co_nhip");
  assert.equal(t1.khoaGiaiTri, false);
  await tt.huyMoKhanCap(fam, may.id, bm, T);
  assert.equal(await tt.hanMoCuaMay(may, con, T), null, "Khoá lại ngay ⇒ hết mở");
});

test("14/11: xin mở web — «Cho 30 phút» (lan_nay + phút) mở đúng 30 phút; «Không cho» hoàn tác được trong 10 phút", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  const a = await yc.guiYeuCau(con, null, { loai: "mo_web", giaTri: "youtube.com", phut: 30, lyDo: "Xem video vẽ" }, T);
  await yc.dongY(fam, a.id, bm, { phanLoai: "hoc", phamVi: "lan_nay", phut: 30 }, T);
  const l = await one<{ het: Date }>(`select het from app_rules where family_id = $1 and child_id = $2 and muc = 'youtube.com'`, [fam, con]);
  assert.equal(new Date(l!.het).getTime(), T.getTime() + 30 * 60_000);
  const b = await yc.guiYeuCau(con, null, { loai: "mo_web", giaTri: "tiktok.com" }, T);
  await loi(yc.dongY(fam, b.id, bm, { phanLoai: "hoc", phamVi: "lan_nay", phut: 1 }, T), "phut_sai");
  await yc.tuChoiYc(fam, b.id, bm, "Ba Mẹ chưa cho mở lúc này", T);
  await yc.moLaiYc(fam, b.id, bm, new Date(T.getTime() + 60_000));
  assert.equal((await yc.dsChoYc(fam, new Date(T.getTime() + 60_000))).some((x) => x.id === b.id), true);
  await yc.tuChoiYc(fam, b.id, bm, "Ba Mẹ chưa cho mở lúc này", new Date(T.getTime() + 60_000));
  await loi(yc.moLaiYc(fam, b.id, bm, new Date(T.getTime() + 30 * 60_000)), "khong_mo_lai");
});
