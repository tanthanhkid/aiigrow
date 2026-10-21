// Phiên giải trí trừ điểm theo phút (FR-04.02, FR-02.04, FR-02.05, BRD 6.3, Phụ lục A.3). Mốc giờ cố định (giờ VN = UTC+7).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const ph = await import("./phien.ts");
const la = await import("./luat-app.ts");
const g = await import("./gia-dinh.ts");
const v = await import("./vi.ts");
const { q, one } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

const VN = (s: string) => new Date(`${s}+07:00`);
const sau = (d: Date, phut: number) => new Date(d.getTime() + phut * 60000);
const loi = async (p: Promise<unknown>, ma: string) => assert.rejects(p, (e: { ma?: string }) => e.ma === ma);

async function nha(diem: number) {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  if (diem) await v.dieuChinhTay(fam, con, diem, "Điểm thử", bm);
  await la.datLuat(fam, { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" });
  await la.datLuat(fam, { muc: "youtube.com", ten: "YouTube", loai: "giai_tri", nhom: "video_ngan" });
  await la.datLuat(fam, { muc: "khanacademy.org", ten: "Khan Academy", loai: "hoc" });
  return { fam, bm, con };
}

async function choi(con: string, phien: string, tu: Date, phut: number, dangDung = true) {
  let k: Awaited<ReturnType<typeof ph.nhip>> | undefined;
  for (let i = 1; i <= phut; i++) k = await ph.nhip(con, phien, dangDung, sau(tu, i));
  return k!;
}

test("phân loại: Allowlist hệ thống luôn dùng; chưa phân loại bị chặn; tên miền con khớp; Office không tính điểm", async () => {
  const { fam, con } = await nha(0);
  assert.equal((await la.phanLoai(fam, con, "WINWORD.EXE")).loai, "he_thong");
  assert.equal((await la.phanLoai(fam, con, "https://www.youtube.com/watch?v=1")).loai, "giai_tri");
  assert.equal((await la.phanLoai(fam, con, "m.youtube.com")).nhom, "video_ngan");
  assert.equal((await la.phanLoai(fam, con, "tiktok.com")).loai, "chua_phan_loai");
  await loi(la.datLuat(fam, { muc: "explorer.exe", loai: "chan" }), "he_thong");
  assert.equal((await ph.xetMoPhien(con, "tiktok.com", {}, VN("2026-10-21T18:00:00"))).lyDo, "chua_phan_loai");
  assert.equal((await ph.xetMoPhien(con, "khanacademy.org", {}, VN("2026-10-21T18:00:00"))).lyDo, "khong_phai_giai_tri");
});

test("BRD 4.4: có 25 điểm, mở Roblox ⇒ được 25 phút; chơi 10 phút rồi dừng ⇒ còn 15 điểm, nghỉ 60 phút", async () => {
  const { con } = await nha(25);
  const t0 = VN("2026-10-21T18:00:00");
  const p = await ph.moPhien(con, "may1", "roblox.exe", {}, t0);
  assert.equal(p.phutToiDa, 25);
  const k = await choi(con, p.id, t0, 10);
  assert.equal(k.soDu, 15);
  assert.equal(k.trangThai, "chay");
  await ph.dungPhien(con, p.id, "con_dung", sau(t0, 10));
  assert.equal(await v.soDu(con), 15);
  const x = await ph.xetMoPhien(con, "roblox.exe", {}, sau(t0, 30));
  assert.equal(x.lyDo, "dang_nghi");
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", {}, sau(t0, 71))).duoc, true);
});

test("hết 30 phút tối đa ⇒ kết thúc, nghỉ 60 phút, cảnh báo 5 phút / 1 phút; khoá màn hình thì tạm dừng không trừ; im 3 phút ⇒ đóng", async () => {
  const { con } = await nha(100);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, "may1", "roblox.exe", {}, t0);
  assert.equal(p.phutToiDa, 30);
  const k25 = await choi(con, p.id, t0, 25);
  assert.equal(k25.canhBao, 5);
  const k29 = await choi(con, p.id, sau(t0, 25), 4);
  assert.equal(k29.canhBao, 1);
  const k30 = await ph.nhip(con, p.id, true, sau(t0, 30));
  assert.equal(k30.trangThai, "ket_thuc");
  assert.equal(k30.lyDoKet, "het_thoi_gian");
  assert.equal(await v.soDu(con), 70);
  assert.ok(new Date(k30.nghiDen!).getTime() === sau(t0, 90).getTime());
  // phiên mới sau giờ nghỉ: khoá máy giữa chừng — không trừ; im quá 3 phút ⇒ tự đóng, chỉ trừ phút đã dùng
  const t1 = sau(t0, 91);
  const p2 = await ph.moPhien(con, "may1", "roblox.exe", {}, t1);
  await choi(con, p2.id, t1, 5);
  const tam = await ph.nhip(con, p2.id, false, sau(t1, 6));
  assert.equal(tam.trangThai, "tam");
  const dong = await ph.nhip(con, p2.id, false, sau(t1, 10));
  assert.equal(dong.trangThai, "ket_thuc");
  assert.equal(dong.lyDoKet, "khong_hoat_dong");
  assert.equal(await v.soDu(con), 65, "chỉ trừ 5 phút dùng thật; phút khoá máy và lúc tạm dừng không tính");
});

test("video ngắn 2 điểm/phút; hết điểm thì dừng; phần lẻ làm tròn lên", async () => {
  const { con } = await nha(7);
  const t0 = VN("2026-10-21T18:00:00");
  const p = await ph.moPhien(con, "may1", "youtube.com", {}, t0);
  assert.equal(p.giaPhanNghin, 2000);
  assert.equal(p.phutToiDa, 3, "7 điểm / 2 điểm mỗi phút = 3 phút");
  const k = await choi(con, p.id, t0, 4);
  assert.equal(k.trangThai, "ket_thuc");
  assert.ok(["het_diem", "het_thoi_gian"].includes(k.lyDoKet!));
  assert.ok((await v.soDu(con)) >= 0 && (await v.soDu(con)) <= 1);
});

test("BRD 4.2: trần 90 phút/ngày gộp mọi thiết bị; một phiên cùng lúc; khung giờ, giờ ngủ, Ba Mẹ khoá ngay", async () => {
  const { fam, con } = await nha(1000);
  await q(`update children set cau_hinh = '{"phien_toi_da": 120, "nghi_giua": 0}'::jsonb where id = $1`, [con]);
  const t0 = VN("2026-10-24T09:00:00");               // thứ Bảy, khung 09:00–21:00
  const p1 = await ph.moPhien(con, "tablet", "roblox.exe", {}, t0);
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", { mayId: "laptop" }, sau(t0, 1))).lyDo, "phien_khac");
  await choi(con, p1.id, t0, 60);
  await ph.dungPhien(con, p1.id, "con_dung", sau(t0, 60));
  const t1 = sau(t0, 61);
  const p2 = await ph.moPhien(con, "laptop", "roblox.exe", {}, t1);
  assert.equal(p2.phutToiDa, 30, "60 trên tablet + 30 trên laptop = trần 90");
  const k = await choi(con, p2.id, t1, 30);
  assert.equal(k.trangThai, "ket_thuc");
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", { mayId: "tablet" }, sau(t1, 31))).lyDo, "dat_tran_ngay");
  // ngoài khung / giờ ngủ / khoá ngay
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", {}, VN("2026-10-22T10:00:00"))).lyDo, "ngoai_khung");
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", {}, VN("2026-10-22T21:30:00"))).lyDo, "gio_ngu");
  await q(`update children set cau_hinh = cau_hinh || '{"khoa_ngay": true}'::jsonb where id = $1`, [con]);
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", {}, VN("2026-10-22T18:00:00"))).lyDo, "ba_me_khoa");
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", { gioMaySai: true }, VN("2026-10-22T18:00:00"))).lyDo, "ba_me_khoa");
  await q(`update children set cau_hinh = cau_hinh - 'khoa_ngay' where id = $1`, [con]);
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", { gioMaySai: true }, VN("2026-10-22T18:00:00"))).lyDo, "gio_may_sai");
  void fam;
});

test("đến giờ ngủ giữa phiên ⇒ tự kết thúc, điểm chưa dùng giữ lại", async () => {
  const { con } = await nha(100);
  const t0 = VN("2026-10-21T20:50:00");
  await q(`update children set lich = '{"ngayThuong":[{"tu":"17:00","den":"22:00"}]}'::jsonb where id = $1`, [con]);
  const p = await ph.moPhien(con, "may1", "roblox.exe", {}, t0);
  const k = await choi(con, p.id, t0, 11);
  assert.equal(k.trangThai, "ket_thuc");
  assert.equal(k.lyDoKet, "gio_ngu");
  assert.ok((await v.soDu(con)) >= 89);
  assert.equal((await one<{ n: number }>(`select count(*)::int as n from play_sessions where child_id = $1 and trang_thai <> 'ket_thuc'`, [con]))!.n, 0);
});
