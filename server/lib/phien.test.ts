// Phiên giải trí (15/11: trừ 1 sao mỗi phút «Tính phút», tới khi hết sao; FR-04.02, FR-02.04, FR-02.05, BRD 6.3, Phụ lục A.3). Mốc giờ cố định (giờ VN = UTC+7).
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

test("15/11: phiên trừ 1 sao / phút; 25 sao ⇒ tối đa 25 phút; dừng sớm không bị bắt nghỉ", async () => {
  const { con } = await nha(25);
  const t0 = VN("2026-10-21T18:00:00");
  const p = await ph.moPhien(con, "may-a", "roblox.exe", {}, t0);
  assert.equal(p.phutToiDa, 25, "25 sao = 25 phút");
  assert.equal(p.giaPhanNghin, 0);
  const k = await choi(con, p.id, t0, 10);
  assert.equal(k.soDu, 15, "10 phút = 10 sao");
  assert.equal(k.trangThai, "chay");
  assert.equal(k.conPhut, 15);
  await ph.dungPhien(con, p.id, "con_dung", sau(t0, 10));
  assert.equal(await v.soDu(con), 15);
  const x = await ph.xetMoPhien(con, "roblox.exe", {}, sau(t0, 11));
  assert.equal(x.duoc, true, "không còn nghỉ giữa hai phiên");
  assert.equal(x.phutToiDa, 15, "còn 15 sao");
  // lịch sử: một dòng «Chơi Roblox 10 phút» (gom các nhịp liền nhau)
  const choiDs = (await v.lichSu(con)).filter((x) => x.loai === "choi");
  assert.deepEqual(choiDs.map((x) => [x.delta, x.ly_do]), [[-10, "Chơi Roblox 10 phút"]]);
});

test("hết sao ⇒ kết thúc het_thoi_gian, cảnh báo 5 / 1 phút; Ba Mẹ cho vay ⇒ chơi tiếp (số dư âm); khoá màn hình tạm dừng; im 3 phút ⇒ đóng", async () => {
  const { fam, bm, con } = await nha(30);
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
  assert.equal(await v.soDu(con), 0);
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", {}, sau(t0, 31))).lyDo, "het_gio");
  assert.match(ph.lyDoChu({ duoc: false, lyDo: "het_gio" }), /0 sao.*cho vay sao/);
  // «Cho thêm 30 phút» (app cũ) = cho vay 30 sao ⇒ mở lại được; khoá máy giữa chừng — không tính; im quá 3 phút ⇒ tự đóng
  const { baMeThemGio } = await import("./quy-gio.ts");
  const vay = await baMeThemGio(fam, con, 30, bm, sau(t0, 32));
  assert.deepEqual([vay.soSao, vay.no, vay.sao, vay.phutCon], [30, 30, 0, 30]);
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
  const vi = await v.tomTatVi(con);
  assert.deepEqual([vi.soDu, vi.sao, vi.no], [25, 0, 30], "chơi 5 phút bằng sao vay ⇒ số dư kẹp 0 (không âm)");
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

test("Con kiếm thêm sao giữa phiên ⇒ phiên tự dài ra; «Đổi sao lấy giờ» (cũ) không trừ gì", async () => {
  const { fam, bm, con } = await nha(20);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, "may-c", "roblox.exe", {}, t0);
  assert.equal(p.phutToiDa, 20);
  await choi(con, p.id, t0, 15);
  const { doiSaoLayGio } = await import("./quy-gio.ts");
  const r = await doiSaoLayGio(con, 10, null, sau(t0, 15));
  assert.deepEqual([r.sao, r.soDu, r.daBo], [0, 5, true]);
  await v.dieuChinhTay(fam, con, 10, "Thưởng", bm);
  const k = await ph.nhip(con, p.id, true, sau(t0, 16));
  assert.equal(k.trangThai, "chay");
  assert.equal(k.conPhut, 14, "20 − 16 + 10");
});

test("hết sao (0 sao) ⇒ không mở được phiên «Tính phút»; sáng hôm sau vẫn không (không còn quỹ ngày)", async () => {
  const { con } = await nha(0);
  const x = await ph.xetMoPhien(con, "youtube.com", {}, VN("2026-10-21T18:00:00"));
  assert.deepEqual([x.duoc, x.lyDo], [false, "het_gio"]);
  assert.equal((await ph.xetMoPhien(con, "youtube.com", {}, VN("2026-10-22T09:00:00"))).lyDo, "het_gio");
  await loi(ph.moPhien(con, "may-d", "youtube.com", {}, VN("2026-10-21T18:00:00")), "khong_mo_duoc");
});

test("sao dùng chung mọi thiết bị; một phiên cùng lúc; không còn khung giờ; giờ ngủ, giờ học, Ba Mẹ khoá", async () => {
  const { fam, con } = await nha(90);
  const t0 = VN("2026-10-24T09:00:00");
  const p1 = await ph.moPhien(con, "tablet", "roblox.exe", {}, t0);
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", { mayId: "laptop" }, sau(t0, 1))).lyDo, "phien_khac");
  await choi(con, p1.id, t0, 60);
  await ph.dungPhien(con, p1.id, "con_dung", sau(t0, 60));
  const t1 = sau(t0, 61);
  const p2 = await ph.moPhien(con, "laptop", "roblox.exe", {}, t1);
  assert.equal(p2.phutToiDa, 30, "60 trên tablet + 30 trên laptop = 90 sao");
  const k = await choi(con, p2.id, t1, 30);
  assert.equal(k.trangThai, "ket_thuc");
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", { mayId: "tablet" }, sau(t1, 31))).lyDo, "het_gio");
  await v.dieuChinhTay(fam, con, 60, "Thưởng", (await one<{ id: string }>(`select id from parents where family_id = $1`, [fam]))!.id);
  // không còn khung giờ chơi: 10:00 thứ Hai vẫn chơi được (60 sao)
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", {}, VN("2026-10-26T10:00:00"))).phutToiDa, 60);
  // #258: bỏ giờ ngủ, giờ học — 21:30 vẫn chơi được; giờ học cũ còn lưu bị bỏ qua
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", {}, VN("2026-10-26T21:30:00"))).duoc, true);
  await q(`update children set lich = '{"hoc": {"tu": "17:00", "den": "18:00", "thu": [1]}}'::jsonb where id = $1`, [con]);
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", {}, VN("2026-10-26T17:10:00"))).duoc, true);
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", {}, VN("2026-10-26T16:30:00"))).phutToiDa, 60, "không còn mốc giờ học");
  await q(`update children set cau_hinh = cau_hinh || '{"khoa_ngay": true}'::jsonb where id = $1`, [con]);
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", {}, VN("2026-10-26T18:00:00"))).lyDo, "ba_me_khoa");
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", { gioMaySai: true }, VN("2026-10-26T18:00:00"))).lyDo, "ba_me_khoa");
  await q(`update children set cau_hinh = cau_hinh - 'khoa_ngay' where id = $1`, [con]);
  assert.equal((await ph.xetMoPhien(con, "roblox.exe", { gioMaySai: true }, VN("2026-10-26T18:00:00"))).lyDo, "gio_may_sai");
});

test("#258: không còn giờ ngủ — phiên lúc 20:50 không bị cắt ở 21:00", async () => {
  const { con } = await nha(100);
  const t0 = VN("2026-10-21T20:50:00");
  const p = await ph.moPhien(con, "may-f", "roblox.exe", {}, t0);
  assert.ok((p.phutToiDa ?? 0) > 10, "không dừng ở 21:00");
});

test("máy Windows (không gửi phien/nhip): nhịp dong-bo của chính máy mở phiên trừ sao, hết giờ đóng; Con đăng xuất 3 phút ⇒ đóng; máy khác không đụng", async () => {
  const { con } = await nha(100);
  const t0 = VN("2026-10-21T17:00:00");
  const p = await ph.moPhien(con, "pc1", "roblox.exe", {}, t0);
  assert.equal(await ph.nhipTuDongBo("pc2", con, true, sau(t0, 1)), null, "máy khác của Con không tính nhịp cho phiên này");
  let k = null as Awaited<ReturnType<typeof ph.nhipTuDongBo>>;
  for (let i = 1; i <= 10; i++) k = await ph.nhipTuDongBo("pc1", con, true, sau(t0, i));
  assert.equal(k!.trangThai, "chay");
  assert.equal(k!.phutDung, 10);
  assert.equal(await v.soDu(con), 90, "15/11: 10 phút = 10 sao");
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

test("#694: «chơi tiếp lúc» theo giờ Việt Nam dù máy chủ chạy UTC", () => {
  assert.equal(ph.lyDoChu({ duoc: false, lyDo: "dang_nghi", nghiDen: "2026-11-26T02:30:00Z" }), "Nghỉ một chút · chơi tiếp lúc 09:30");
});
