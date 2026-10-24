// Yêu cầu + phê duyệt + ngoại lệ (FR-05, FR-07.01, BRD 6.4, 6.6, Phụ lục A.2).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const yc = await import("./yeu-cau.ts");
const nl = await import("./ngoai-le.ts");
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
  assert.equal((await nl.demNgoaiLe(fam, con, T)).tuan, 0, "phân loại vĩnh viễn không phải ngoại lệ");
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
  await loi(yc.guiYeuCau(con, null, { loai: "them_gio", phut: 15 }, T), "thieu_ly_do");
  const nha2 = await taoNha("Hoa");
  await loi(yc.dongY(nha2.fam, ids[1], bm, { truDiem: false }, T), "khong_thay");
  await yc.tuChoiYc(fam, ids[1], bm, "Hôm nay chơi đủ rồi", T);
  await loi(yc.dongY(fam, ids[1], ba, {}, T), "da_xu_ly");
  await q(`update requests set het_han = $2 where id = $1`, [ids[2], new Date(T.getTime() - 60000)]);
  await loi(yc.dongY(fam, ids[2], bm, {}, T), "het_han");
  for (let i = 0; i < 7; i++) { const x = await yc.guiYeuCau(con, null, { loai: "khac", giaTri: "x", lyDo: "y" }, T); await yc.huyYeuCau(con, x.id); }
  await loi(yc.guiYeuCau(con, null, { loai: "khac", giaTri: "x", lyDo: "y" }, T), "qua_nhieu_ngay");
});

test("thêm giờ: «Trừ 15 điểm» (thiếu điểm bị chặn) hoặc «Ngoại lệ – không trừ»; phút thêm dùng được trong phiên không trừ điểm", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  await la.datLuat(fam, { muc: "roblox.exe", loai: "giai_tri", nhom: "game" });
  const a = await yc.guiYeuCau(con, null, { loai: "them_gio", phut: 15, lyDo: "Hôm nay con ngoan" }, T);
  await loi(yc.dongY(fam, a.id, bm, { truDiem: true }, T), "khong_du_diem");
  await v.dieuChinhTay(fam, con, 20, "Điểm thử", bm);
  const du0 = await v.soDu(con);
  await yc.dongY(fam, a.id, bm, { truDiem: true }, T);
  assert.equal(await v.soDu(con), du0 - 15);
  const b = await yc.guiYeuCau(con, null, { loai: "them_gio", phut: 30, lyDo: "Hôm nay con ngoan" }, T);
  const r = await yc.dongY(fam, b.id, bm, { truDiem: false }, T);
  assert.equal(r.ngoaiLe, true);
  // 45 phút thưởng hôm nay: phiên mở được dù chỉ còn 5 điểm, 45 phút đầu không trừ
  const p = await ph.moPhien(con, "may1", "roblox.exe", {}, T);
  assert.equal(p.phutToiDa, 50, "5 điểm + 45 phút thưởng, trong giới hạn 30 + 45");
  for (let i = 1; i <= 10; i++) await ph.nhip(con, p.id, true, new Date(T.getTime() + i * 60000));
  assert.equal(await v.soDu(con), 5, "10 phút đầu dùng phút thưởng");
});

test("ngoại lệ thứ 4 trong tuần ⇒ cảnh báo mềm (xem trước khi xác nhận); thứ 7 ⇒ cảnh báo mạnh; không chặn phê duyệt", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  for (let i = 0; i < 3; i++) {
    const r = await yc.guiYeuCau(con, null, { loai: "them_gio", phut: 15, lyDo: "x" }, T);
    await yc.dongY(fam, r.id, bm, { truDiem: false }, T);
  }
  const r4 = await yc.guiYeuCau(con, null, { loai: "them_gio", phut: 15, lyDo: "x" }, T);
  const xt = await nl.xemTruoc(fam, con, "Ken", T);
  assert.equal(xt.mucCanhBao, "mem");
  assert.match(xt.cau!, /ngoại lệ 4 lần/);
  await yc.dongY(fam, r4.id, bm, { truDiem: false }, T);
  assert.ok(await one(`select 1 from alerts where family_id = $1 and loai = 'ngoai_le_mem'`, [fam]));
  for (let i = 0; i < 3; i++) {
    const r = await yc.guiYeuCau(con, null, { loai: "them_gio", phut: 15, lyDo: "x" }, T);
    if (i === 2) assert.equal((await nl.xemTruoc(fam, con, "Ken", T)).mucCanhBao, "manh");
    await yc.dongY(fam, r.id, bm, { truDiem: false }, T);
  }
  assert.ok(await one(`select 1 from alerts where family_id = $1 and loai = 'ngoai_le_manh'`, [fam]));
  assert.equal((await q(`select 1 from alerts where family_id = $1 and loai = 'ngoai_le_mem'`, [fam])).length, 1, "cảnh báo mềm một lần mỗi tuần");
});

test("lệch người duyệt: một người cho ngoại lệ ≥ 3 lần người kia ⇒ gợi ý thống nhất", async () => {
  const { fam, bm } = await taoNha();
  const ba = await taoBaMe(fam);
  const con = await g.taoCon(fam, { ten: "Ken" });
  const duyet = async (ai: string) => { const r = await yc.guiYeuCau(con, null, { loai: "them_gio", phut: 15, lyDo: "x" }, T); await yc.dongY(fam, r.id, ai, { truDiem: false }, T); };
  await duyet(ba);
  for (let i = 0; i < 3; i++) await duyet(bm);
  assert.ok(await one(`select 1 from alerts where family_id = $1 and loai = 'lech_nguoi_duyet'`, [fam]));
});

test("quy tắc tự động: tự đồng ý thêm 15 phút nếu đủ điểm, một lần mỗi ngày", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  await q(`update children set cau_hinh = '{"tu_dong_15": true}'::jsonb where id = $1`, [con]);
  await v.dieuChinhTay(fam, con, 40, "Điểm thử", bm);
  const a = await yc.guiYeuCau(con, null, { loai: "them_gio", phut: 15, lyDo: "x" }, T);
  assert.equal(await yc.apQuyTacTuDong(fam, a.id, T), true);
  assert.equal((await one<{ tu_dong: boolean; trang_thai: string }>(`select tu_dong, trang_thai from requests where id = $1`, [a.id]))!.trang_thai, "dong_y");
  const b = await yc.guiYeuCau(con, null, { loai: "them_gio", phut: 15, lyDo: "x" }, T);
  assert.equal(await yc.apQuyTacTuDong(fam, b.id, T), false, "lần thứ hai trong ngày để Ba Mẹ quyết");
});

test("thêm giờ cho lời xin từ máy WINDOWS ⇒ cửa sổ mở tới hạn (cộng dồn), agent nhận qua hanMoCuaMay; phút đó không còn là «thưởng» phiên", async () => {
  const tt = await import("./tuan-thu.ts");
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Phi" });
  const r = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "PC của Phi");
  const may = (await g.mayTuToken(r.token))!;
  assert.equal(await tt.hanMoCuaMay(may, con, T), null);
  const a = await yc.guiYeuCau(con, may.id, { loai: "them_gio", phut: 30, lyDo: "Để làm bài tập" }, T);
  await yc.dongY(fam, a.id, bm, { truDiem: false, phut: 30 }, T);
  const den1 = (await tt.hanMoCuaMay(may, con, T))!;
  assert.equal(den1.getTime(), T.getTime() + 30 * 60000);
  assert.equal(await ph.thuongConLai(con, T), 0, "cửa sổ không phải thưởng phiên (tránh dùng hai lần)");
  // duyệt thêm 15 phút khi đang mở ⇒ cộng dồn
  const b = await yc.guiYeuCau(con, may.id, { loai: "them_gio", phut: 15, lyDo: "Bạn rủ chơi" }, T);
  await yc.dongY(fam, b.id, bm, { truDiem: false, phut: 15 }, T);
  assert.equal((await tt.hanMoCuaMay(may, con, T))!.getTime(), T.getTime() + 45 * 60000);
  // hết hạn ⇒ null
  assert.equal(await tt.hanMoCuaMay(may, con, new Date(T.getTime() + 46 * 60000)), null);
  // mở khẩn cấp của máy cũng là «mở»
  await tt.moKhanCap(fam, may.id, { phut: 60 }, bm, T);
  assert.equal((await tt.hanMoCuaMay(may, con, T))!.getTime(), T.getTime() + 60 * 60000);
  // lời xin từ thiết bị KHÔNG phải Windows ⇒ giữ nguyên cách «thưởng»
  const c2 = await g.taoCon(fam, { ten: "Mai" });
  const dt = await g.ghepMay(await g.taoMaGhep(fam, c2, "android"), "android", "Điện thoại Mai");
  const yd = await yc.guiYeuCau(c2, (await g.mayTuToken(dt.token))!.id, { loai: "them_gio", phut: 20, lyDo: "Bạn rủ chơi" }, T);
  await yc.dongY(fam, yd.id, bm, { truDiem: false, phut: 20 }, T);
  assert.equal(await ph.thuongConLai(c2, T), 20);
  assert.equal(await tt.hanMoCuaMay((await g.mayTuToken(dt.token))!, c2, T), null);
});

test("Windows: «Khoá lại ngay» đóng cả cửa sổ thêm giờ đã duyệt; mở khẩn cấp rồi tắt máy lâu KHÔNG thành «ngoài vòng»", async () => {
  const tt = await import("./tuan-thu.ts");
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Phi" });
  const r = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "PC của Phi");
  const may = (await g.mayTuToken(r.token))!;
  const a = await yc.guiYeuCau(con, may.id, { loai: "them_gio", phut: 60, lyDo: "Làm bài" }, T);
  await yc.dongY(fam, a.id, bm, { truDiem: false, phut: 60 }, T);
  assert.ok(await tt.hanMoCuaMay(may, con, T));
  assert.equal((await tt.dsTuanThu(fam, T)).find((x) => x.id === may.id)?.moDen, new Date(T.getTime() + 60 * 60000).toISOString());
  await tt.huyMoKhanCap(fam, may.id, bm, T);
  assert.equal(await tt.hanMoCuaMay(may, con, T), null, "Khoá lại ngay ⇒ hết mở");
  // mở khẩn cấp (tạo dòng tuan_thu_may) rồi im 60' ⇒ không cảnh báo, không khoá giải trí
  await tt.moKhanCap(fam, may.id, { phut: 30 }, bm, T);
  const sau = new Date(T.getTime() + 60 * 60000);
  assert.deepEqual(await tt.quetMatNhip(fam, sau), []);
  const t1 = (await tt.dsTuanThu(fam, sau)).find((x) => x.id === may.id)!;
  assert.equal(t1.trangThai, "chua_co_nhip");
  assert.equal(t1.khoaGiaiTri, false);
});

test("đang «Khoá ngay» mà Ba Mẹ duyệt thêm giờ ⇒ mở TẠM đúng phần giờ đã cho rồi khoá lại; quy tắc tự động không vượt khoá (Khang 24/10)", async () => {
  const { khoaNgay } = await import("./may-con.ts");
  const { dangKhoa } = await import("./cau-hinh.ts");
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const r = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "LAPTOP-KAG");
  const may = (await g.mayTuToken(r.token))!;
  const now = new Date();
  await khoaNgay(fam, con, true, bm, new Date(now.getTime() + 3 * 3600_000));
  const cfg = async () => (await one<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from children where id = $1`, [con]))!.cau_hinh;
  assert.equal(dangKhoa(await cfg(), now), true);
  // tự đồng ý 15 phút bật sẵn — Con đang bị khoá thì không được tự mở
  await q(`update children set cau_hinh = cau_hinh || '{"tu_dong_15": true}' where id = $1`, [con]);
  const tu = await yc.guiYeuCau(con, may.id, { loai: "them_gio", phut: 15, lyDo: "xin" }, now);
  assert.equal(await yc.apQuyTacTuDong(fam, tu.id, now), false);
  assert.equal(dangKhoa(await cfg(), now), true);
  // Ba Mẹ duyệt tay 30 phút ⇒ mở trong 30 phút, sau đó khoá lại; hạn khoá cũ còn nguyên
  const a = await yc.guiYeuCau(con, may.id, { loai: "them_gio", phut: 30, lyDo: "xin" }, now);
  await yc.dongY(fam, a.id, bm, { truDiem: false, phut: 30 }, now);
  assert.equal(dangKhoa(await cfg(), new Date(now.getTime() + 10 * 60_000)), false);
  assert.equal(dangKhoa(await cfg(), new Date(now.getTime() + 31 * 60_000)), true);
  assert.ok((await cfg()).khoa_den);
  assert.ok(await one(`select 1 from events where family_id = $1 and child_id = $2 and loai = 'mo_tam'`, [fam, con]));
  // đang mở tạm, tự đồng ý vẫn không chạy (khoá gốc còn)
  const tu2 = await yc.guiYeuCau(con, may.id, { loai: "them_gio", phut: 15, lyDo: "xin" }, new Date(now.getTime() + 5 * 60_000));
  assert.equal(await yc.apQuyTacTuDong(fam, tu2.id, new Date(now.getTime() + 5 * 60_000)), false);
  await yc.tuChoiYc(fam, tu2.id, bm, "không", new Date(now.getTime() + 5 * 60_000));
  // duyệt lần 2 lúc đang mở tạm (phút 10, thêm 20') ⇒ cộng từ hạn mở tạm cũ: 30 + 20 = 50 — không lấy cửa sổ grant Windows (đã 30+20 từ lần trước ⇒ dễ dài hơn)
  const t10 = new Date(now.getTime() + 10 * 60_000);
  const b = await yc.guiYeuCau(con, may.id, { loai: "them_gio", phut: 20, lyDo: "xin" }, t10);
  await yc.dongY(fam, b.id, bm, { truDiem: false, phut: 20 }, t10);
  assert.equal((await cfg()).khoa_mo_tam_den, new Date(now.getTime() + 50 * 60_000).toISOString());
  assert.equal(dangKhoa(await cfg(), new Date(now.getTime() + 49 * 60_000)), false);
  assert.equal(dangKhoa(await cfg(), new Date(now.getTime() + 51 * 60_000)), true);
  // khoá lại ⇒ phần mở tạm bị xoá
  await khoaNgay(fam, con, true, bm);
  assert.equal((await cfg()).khoa_mo_tam_den, undefined);
  assert.equal(dangKhoa(await cfg(), new Date(now.getTime() + 10 * 60_000)), true);
});

test("mở tạm: grant giữ nghĩa cũ (điện thoại = thưởng, Windows = cửa sổ), cộng dồn, không vượt hạn khoá; Hoàn tác «Mở lại» giữ mốc", async () => {
  const { khoaNgay } = await import("./may-con.ts");
  const { dangKhoa, moTamDen } = await import("./cau-hinh.ts");
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Lam" });
  const pc = (await g.mayTuToken((await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "PC")).token))!;
  const dt = (await g.mayTuToken((await g.ghepMay(await g.taoMaGhep(fam, con, "android"), "android", "ĐT")).token))!;
  const now = new Date(), phut = (n: number) => new Date(now.getTime() + n * 60_000);
  const cfg = async () => (await one<{ cau_hinh: Record<string, unknown> }>(`select cau_hinh from children where id = $1`, [con]))!.cau_hinh;
  await khoaNgay(fam, con, true, bm, phut(180), now);
  // duyệt từ ĐIỆN THOẠI lúc khoá ⇒ gỡ khoá 30' và 30' là thưởng (không mất, không tính hai lần)
  const a = await yc.guiYeuCau(con, dt.id, { loai: "them_gio", phut: 30, lyDo: "xin" }, now);
  await yc.dongY(fam, a.id, bm, { truDiem: false, phut: 30 }, now);
  assert.equal(dangKhoa(await cfg(), phut(5)), false);
  assert.equal(await ph.thuongConLai(con, now), 30);
  // duyệt tiếp từ PC lúc phút 10 ⇒ mốc cộng từ mốc cũ: 50
  const b = await yc.guiYeuCau(con, pc.id, { loai: "them_gio", phut: 20, lyDo: "xin" }, phut(10));
  await yc.dongY(fam, b.id, bm, { truDiem: false, phut: 20 }, phut(10));
  assert.equal(moTamDen(await cfg(), phut(10)), phut(50).toISOString());
  // Mở lại rồi Hoàn tác ⇒ giữ mốc đang lưu
  await khoaNgay(fam, con, false, bm, null, phut(12));
  await khoaNgay(fam, con, true, bm, phut(180), phut(12), true);
  assert.equal(dangKhoa(await cfg(), phut(20)), false);
  assert.equal(dangKhoa(await cfg(), phut(51)), true);
  // khoá mới (không phải Hoàn tác) ⇒ mở tạm bị huỷ
  await khoaNgay(fam, con, true, bm, phut(75), phut(15));
  assert.equal(dangKhoa(await cfg(), phut(16)), true);
  // Windows (lỗi gốc Khang): lời xin từ PC lúc khoá ⇒ PC có cửa sổ mở + không còn khoá trong mốc; «Khoá lại ngay» trên PC ⇒ khoá lại ngay
  const tt = await import("./tuan-thu.ts");
  await khoaNgay(fam, con, true, bm, null, phut(20));
  const w = await yc.guiYeuCau(con, pc.id, { loai: "them_gio", phut: 15, lyDo: "xin" }, phut(20));
  await yc.dongY(fam, w.id, bm, { truDiem: false, phut: 15 }, phut(20));
  assert.ok(await tt.hanMoCuaMay(pc, con, phut(25)));
  assert.equal(dangKhoa(await cfg(), phut(25)), false);
  assert.equal(dangKhoa(await cfg(), phut(36)), true);
  await tt.huyMoKhanCap(fam, pc.id, bm, phut(26));
  assert.equal(dangKhoa(await cfg(), phut(27)), true, "Khoá lại ngay ⇒ huỷ mở tạm");
  await khoaNgay(fam, con, true, bm, phut(75), phut(30));
  // khoá còn 15 phút mà duyệt 60 ⇒ mở tạm dừng ở hạn khoá (rồi hết khoá hẳn); phút vẫn là thưởng, không mất
  const c = await yc.guiYeuCau(con, dt.id, { loai: "them_gio", phut: 60, lyDo: "xin" }, phut(60));
  await yc.dongY(fam, c.id, bm, { truDiem: false, phut: 60 }, phut(60));
  assert.equal((await cfg()).khoa_mo_tam_den, phut(75).toISOString());
  assert.equal(dangKhoa(await cfg(), phut(80)), false);
});
