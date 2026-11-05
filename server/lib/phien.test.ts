// Phiên giải trí (05/11: không trừ sao — đếm phút vào quỹ; FR-04.02, FR-02.04, FR-02.05, BRD 6.3, Phụ lục A.3). Mốc giờ cố định (giờ VN = UTC+7).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const ph = await import("./phien.ts");
const la = await import("./luat-app.ts");
const g = await import("./gia-dinh.ts");
const v = await import("./vi.ts");
const tre = await import("./choi-tre.ts");
const tt = await import("./tuan-thu.ts");
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

test("05/11: phiên KHÔNG trừ sao; còn quỹ 60 phút ⇒ được tối đa 60; dừng sớm không bị bắt nghỉ", async () => {
  const { con } = await nha(25);
  const t0 = VN("2026-10-21T18:00:00");               // thứ Tư, quỹ ngày thường 60
  const p = await ph.moPhien(con, "may-a", "roblox.exe", {}, t0);
  assert.equal(p.phutToiDa, 60);
  assert.equal(p.giaPhanNghin, 0);
  const k = await choi(con, p.id, t0, 10);
  assert.equal(k.soDu, 25, "không trừ sao theo phút");
  assert.equal(k.trangThai, "chay");
  assert.equal(k.conPhut, 50);
  await ph.dungPhien(con, p.id, "con_dung", sau(t0, 10));
  assert.equal(await v.soDu(con), 25);
  const x = await ph.xetMoPhien(con, "roblox.exe", {}, sau(t0, 11));
  assert.equal(x.duoc, true, "không còn nghỉ giữa hai phiên");
  assert.equal(x.phutToiDa, 50, "quỹ còn 60 − 10");
});

test("hết quỹ ⇒ kết thúc het_thoi_gian, cảnh báo 5 / 1 phút; Ba Mẹ cho thêm ⇒ chơi tiếp; khoá màn hình tạm dừng; im 3 phút ⇒ đóng", async () => {
  const { fam, bm, con } = await nha(100);
  await q(`update children set cau_hinh = '{"quy_ngay_thuong": 30}'::jsonb where id = $1`, [con]);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, "may-b", "roblox.exe", {}, t0);
  assert.equal(p.phutToiDa, 30);
  const k25 = await choi(con, p.id, t0, 25);
  assert.equal(k25.canhBao, 5);
  const k29 = await choi(con, p.id, sau(t0, 25), 4);
  assert.equal(k29.canhBao, 1);
  const k30 = await ph.nhip(con, p.id, true, sau(t0, 30));
  assert.equal(k30.trangThai, "ket_thuc");
  assert.equal(k30.lyDoKet, "het_thoi_gian");
  assert.equal(k30.nghiDen, undefined);
  assert.equal(await v.soDu(con), 100);
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", {}, sau(t0, 31))).lyDo, "het_gio");
  // Ba Mẹ cho thêm 30 phút ⇒ mở lại được; khoá máy giữa chừng — không tính; im quá 3 phút ⇒ tự đóng
  const { baMeThemGio } = await import("./quy-gio.ts");
  await baMeThemGio(fam, con, 30, bm, sau(t0, 32));
  const t1 = sau(t0, 33);
  const p2 = await ph.moPhien(con, "may-b", "roblox.exe", {}, t1);
  assert.equal(p2.phutToiDa, 30);
  await choi(con, p2.id, t1, 5);
  const tam = await ph.nhip(con, p2.id, false, sau(t1, 6));
  assert.equal(tam.trangThai, "tam");
  const dong = await ph.nhip(con, p2.id, false, sau(t1, 10));
  assert.equal(dong.trangThai, "ket_thuc");
  assert.equal(dong.lyDoKet, "khong_hoat_dong");
  assert.equal((await one<{ p: number }>(`select phut_dung as p from play_sessions where id = $1`, [p2.id]))!.p, 5, "chỉ tính 5 phút dùng thật");
  // nhịp tạm dừng MỖI PHÚT vẫn đóng sau 3 phút tính từ lúc bắt đầu tạm dừng; dùng lại thì đếm lại
  const t2 = sau(t1, 20);
  const p3 = await ph.moPhien(con, "may-b", "roblox.exe", {}, t2);
  await choi(con, p3.id, t2, 2);
  assert.equal((await ph.nhip(con, p3.id, false, sau(t2, 3))).trangThai, "tam");
  assert.equal((await ph.nhip(con, p3.id, false, sau(t2, 4))).trangThai, "tam");
  assert.equal((await ph.nhip(con, p3.id, true, sau(t2, 5))).trangThai, "chay");      // dùng lại trước 3 phút
  assert.equal((await ph.nhip(con, p3.id, false, sau(t2, 6))).trangThai, "tam");
  assert.equal((await ph.nhip(con, p3.id, false, sau(t2, 7))).trangThai, "tam");
  assert.equal((await ph.nhip(con, p3.id, false, sau(t2, 8))).trangThai, "tam");
  const dong3 = await ph.nhip(con, p3.id, false, sau(t2, 9));
  assert.equal(dong3.trangThai, "ket_thuc");
  assert.equal(dong3.lyDoKet, "khong_hoat_dong");
});

test("đổi sao giữa phiên ⇒ phiên tự dài ra theo quỹ mới", async () => {
  const { con } = await nha(100);
  await q(`update children set cau_hinh = '{"quy_ngay_thuong": 20}'::jsonb where id = $1`, [con]);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, "may-c", "roblox.exe", {}, t0);
  assert.equal(p.phutToiDa, 20);
  await choi(con, p.id, t0, 15);
  const { doiSaoLayGio } = await import("./quy-gio.ts");
  const r = await doiSaoLayGio(con, 10, null, sau(t0, 15));
  assert.deepEqual([r.sao, r.soDu], [10, 90]);
  const k = await ph.nhip(con, p.id, true, sau(t0, 16));
  assert.equal(k.trangThai, "chay");
  assert.equal(k.conPhut, 14, "quỹ 20 + 10 − 16");
});

test("giá 0 với mọi nhóm: Con 0 sao vẫn chơi bằng quỹ", async () => {
  const { con } = await nha(0);
  const t0 = VN("2026-10-21T18:00:00");
  const p = await ph.moPhien(con, "may-d", "youtube.com", {}, t0);
  assert.equal(p.giaPhanNghin, 0);
  assert.equal(p.phutToiDa, 60);
  const k = await choi(con, p.id, t0, 4);
  assert.deepEqual([k.trangThai, k.diemTru, k.soDu], ["chay", 0, 0]);
});

test("quỹ 90 phút cuối tuần gộp mọi thiết bị; một phiên cùng lúc; không còn khung giờ; giờ ngủ, giờ học, Ba Mẹ khoá", async () => {
  const { fam, con } = await nha(1000);
  const t0 = VN("2026-10-24T09:00:00");               // thứ Bảy, quỹ cuối tuần 90
  const p1 = await ph.moPhien(con, "tablet", "roblox.exe", {}, t0);
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", { mayId: "laptop" }, sau(t0, 1))).lyDo, "phien_khac");
  await choi(con, p1.id, t0, 60);
  await ph.dungPhien(con, p1.id, "con_dung", sau(t0, 60));
  const t1 = sau(t0, 61);
  const p2 = await ph.moPhien(con, "laptop", "roblox.exe", {}, t1);
  assert.equal(p2.phutToiDa, 30, "60 trên tablet + 30 trên laptop = quỹ 90");
  const k = await choi(con, p2.id, t1, 30);
  assert.equal(k.trangThai, "ket_thuc");
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", { mayId: "tablet" }, sau(t1, 31))).lyDo, "het_gio");
  // không còn khung giờ chơi: 10:00 thứ Hai vẫn chơi được (quỹ ngày thường 60)
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", {}, VN("2026-10-26T10:00:00"))).phutToiDa, 60);
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", {}, VN("2026-10-26T21:30:00"))).lyDo, "gio_ngu");
  await q(`update children set lich = '{"hoc": {"tu": "17:00", "den": "18:00", "thu": [1]}}'::jsonb where id = $1`, [con]);
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", {}, VN("2026-10-26T17:10:00"))).lyDo, "gio_hoc");
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", {}, VN("2026-10-26T16:30:00"))).phutToiDa, 30, "tới giờ học 17:00 là dừng");
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", {}, VN("2026-10-27T17:10:00"))).duoc, true, "thứ Ba không có giờ học");
  await q(`update children set cau_hinh = cau_hinh || '{"khoa_ngay": true}'::jsonb where id = $1`, [con]);
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", {}, VN("2026-10-26T18:00:00"))).lyDo, "ba_me_khoa");
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", { gioMaySai: true }, VN("2026-10-26T18:00:00"))).lyDo, "ba_me_khoa");
  await q(`update children set cau_hinh = cau_hinh - 'khoa_ngay' where id = $1`, [con]);
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", { gioMaySai: true }, VN("2026-10-26T18:00:00"))).lyDo, "gio_may_sai");
  void fam;
});

test("đến giờ ngủ giữa phiên ⇒ tự kết thúc, sao giữ nguyên", async () => {
  const { con } = await nha(100);
  const t0 = VN("2026-10-21T20:50:00");
  const p = await ph.moPhien(con, "may-f", "roblox.exe", {}, t0);
  assert.equal(p.phutToiDa, 10, "chỉ tới giờ ngủ 21:00");
  const k = await choi(con, p.id, t0, 11);
  assert.equal(k.trangThai, "ket_thuc");
  assert.ok(["gio_ngu", "het_thoi_gian"].includes(k.lyDoKet!));
  assert.equal(await v.soDu(con), 100);
  assert.equal((await one<{ n: number }>(`select count(*)::int as n from play_sessions where child_id = $1 and trang_thai <> 'ket_thuc'`, [con]))!.n, 0);
});

test("máy Windows (không gửi phien/nhip): nhịp dong-bo của chính máy mở phiên trừ điểm, hết giờ đóng; Con đăng xuất 3 phút ⇒ đóng; máy khác không đụng", async () => {
  const { con } = await nha(100);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, "pc1", "roblox.exe", {}, t0);
  assert.equal(await ph.nhipTuDongBo("pc2", con, true, sau(t0, 1)), null, "máy khác của Con không tính nhịp cho phiên này");
  let k = null as Awaited<ReturnType<typeof ph.nhipTuDongBo>>;
  for (let i = 1; i <= 10; i++) k = await ph.nhipTuDongBo("pc1", con, true, sau(t0, i));
  assert.equal(k!.trangThai, "chay");
  assert.equal(k!.phutDung, 10);
  assert.equal(await v.soDu(con), 100, "05/11: phiên không trừ sao");
  for (let i = 11; i <= 13; i++) k = await ph.nhipTuDongBo("pc1", con, false, sau(t0, i));
  assert.equal(k!.trangThai, "tam");
  k = await ph.nhipTuDongBo("pc1", con, false, sau(t0, 14));
  assert.equal(k!.trangThai, "ket_thuc");
  assert.equal(k!.lyDoKet, "khong_hoat_dong");
  assert.equal(await ph.nhipTuDongBo("pc1", con, true, sau(t0, 15)), null, "hết phiên ⇒ không còn gì để nhịp");
});

test("phiên Windows: trang khay gửi «không dùng» xen nhịp đồng bộ ⇒ không giành nhau, vẫn tính đủ phút; máy không tuân thủ ⇒ khay không mở được", async () => {
  const { fam, con } = await nha(100);
  const t0 = VN("2026-10-21T17:00:00");
  const pc = (await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "PC của Ken")).deviceId;
  const c = { id: con, family_id: fam, device_id: pc };
  const p = await ph.moPhien(con, pc, "roblox.exe", {}, t0);
  for (let i = 1; i <= 10; i++) {
    await ph.nhipTuDongBo(pc, con, true, sau(t0, i));
    await tre.nhipTre(c, p.id, false, new Date(sau(t0, i).getTime() + 30_000));     // trang thu nhỏ để chơi Roblox
  }
  const k = await ph.nhipTuDongBo(pc, con, true, sau(t0, 11));
  assert.equal(k!.trangThai, "chay");
  assert.equal(k!.phutDung, 11, "đủ 11 phút, không mất nửa vì trang báo «không dùng»");
  // agent báo giờ máy lệch 30 phút ⇒ không tuân thủ
  await tt.nhanNhip(await one<any>(`select * from devices where id = $1`, [pc]),
    { phienBan: "0.2.3", appQuanLyBat: true, taiKhoan: { ten: "ken", laAdmin: false }, taiKhoanAdmin: [], clientTime: sau(t0, 42).toISOString() }, sau(t0, 12));
  const may = await one<any>(`select * from devices where id = $1`, [pc]);
  assert.equal((await tt.khoaTuanThu(may, sau(t0, 12))).khoa, true);
  const x = await tre.xetTre(c, "roblox.exe", sau(t0, 12));
  assert.deepEqual([x.duoc, x.lyDo], [false, "khong_tuan_thu"]);
  await assert.rejects(tre.moTre(c, "roblox.exe", sau(t0, 12)), (e: { ma?: string }) => e.ma === "khong_mo_duoc");
});
