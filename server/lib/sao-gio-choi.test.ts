// Thiết kế chốt 05/11 (S1 — docs/KE-HOACH-KHOP-THIET-KE-0511.md L1 L2 L3 L9 L10): sao, quỹ giờ chơi + đổi sao, ngoại lệ, nhiệm vụ theo bộ,
// bằng chứng ghi âm / viết / bấm xong, «Nhờ làm lại», duyệt cả loạt, quà trao tay + quà phút, ngừng phát voucher.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyM } = await import("./api-m.ts");
const { xuLyCon } = await import("./api-con.ts");
const { xuLyMay } = await import("./api-may.ts");
const g = await import("./gia-dinh.ts");
const la = await import("./luat-app.ts");
const v = await import("./vi.ts");
const qg = await import("./quy-gio.ts");
const ph = await import("./phien.ts");
const mc = await import("./may-con.ts");
const aw = await import("./agent-windows.ts");
const { q, one, newId } = await import("./db.ts");
const { taoNha, anhGia, luonChoiDuoc } = await import("./test-fixtures/nha.ts");
const { taoPhien } = await import("./auth.ts");

const VN = (s: string) => new Date(`${s}+07:00`);
const sau = (d: Date, phut: number) => new Date(d.getTime() + phut * 60000);
const loi = async (p: Promise<unknown>, ma: string) => assert.rejects(p, (e: { ma?: string }) => e.ma === ma);

const goi = (xuLy: (r: Request, p: string[]) => Promise<Response>, goc: string) => async (tok: string, duong: string, body?: unknown) => {
  const r = await xuLy(new Request(`http://x/api/${goc}/${duong}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), duong.split("?")[0].split("/"));
  return { status: r.status, body: (await r.json()) as any };
};
const m = goi(xuLyM, "m"), k = goi(xuLyCon, "kid"), dv = goi(xuLyMay, "device");

async function nha(sao = 0) {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  if (sao) await v.dieuChinhTay(fam, con, sao, "Sao thử", bm);
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop của Bảo Anh");
  await la.datLuat(fam, { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" });
  await la.datLuat(fam, { muc: "youtube.com", ten: "YouTube", loai: "giai_tri", nhom: "video_ngan" });
  await la.datLuat(fam, { muc: "tudien.exe", ten: "Từ điển", loai: "hoc" });
  return { fam, bm, con, tokMay: may.token as string, mayId: may.deviceId as string, tokBm: await taoPhien(bm) };
}

test("quỹ hôm nay: phút Giải trí mọi máy (usage + web + phiên cũ, lấy lớn hơn theo máy); app Học không tính; thêm giờ cộng vào", async () => {
  const { fam, bm, con, mayId } = await nha();
  const t = VN("2026-10-21T19:30:00");                       // thứ Tư, quỹ ngày thường 60
  let qy = await qg.quyHomNay(con, t);
  assert.deepEqual([qy.quyNgayPhut, qy.daDung, qy.conPhut, qy.dangNgu, qy.tyLe.phut], [60, 0, 60, false, 10]);
  await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut) values ($1,$2,'2026-10-21','roblox.exe','giai_tri',30),
           ($1,$2,'2026-10-21','tudien.exe','hoc',10)`, [mayId, con]);
  await q(`insert into web_nhat_ky(device_id, child_id, ngay, ten_mien, so_lan, giay) values ($1,$2,'2026-10-21','m.youtube.com',3,720),
           ($1,$2,'2026-10-21','vnexpress.net',1,600)`, [mayId, con]);
  qy = await qg.quyHomNay(con, t);
  assert.equal(qy.daDung, 42, "Roblox 30 + YouTube 12; Từ điển + trang chưa xếp không tính");
  assert.equal(qy.conPhut, 18);
  // phiên cũ trên CÙNG máy (35 phút) < usage + web (42) ⇒ không cộng đôi; phiên trên máy khác ⇒ cộng
  await q(`insert into play_sessions(id, child_id, device_id, muc, nhom, gia_phan_nghin, toi_da_phut, phut_dung, trang_thai, bat_dau)
           values ($1,$2,$3,'roblox.exe','game',0,60,35,'ket_thuc',$4)`, [newId(), con, mayId, VN("2026-10-21T18:00:00")]);
  assert.equal((await qg.quyHomNay(con, t)).daDung, 42);
  await q(`insert into play_sessions(id, child_id, device_id, muc, nhom, gia_phan_nghin, toi_da_phut, phut_dung, trang_thai, bat_dau)
           values ($1,$2,'ipad','roblox.exe','game',0,60,5,'ket_thuc',$3)`, [newId(), con, VN("2026-10-21T18:00:00")]);
  assert.equal((await qg.quyHomNay(con, t)).daDung, 47);
  const them = await qg.baMeThemGio(fam, con, 20, bm, t);
  assert.deepEqual([them.quy.themPhut, them.quy.tongPhut, them.quy.conPhut], [20, 80, 33], "Chỉ hôm nay: 60 + 20 = 80 phút");
  assert.equal((await qg.quyHomNay(con, VN("2026-10-22T19:30:00"))).themPhut, 0, "thêm giờ chỉ tính cho hôm nay");
  // cuối tuần dùng quỹ riêng
  assert.equal((await qg.quyHomNay(con, VN("2026-10-24T10:00:00"))).quyNgayPhut, 90);
  // hoàn tác: 60 giây, đúng người
  await loi(qg.hoanTacThemGio(fam, them.id, "nguoi-khac", t), "het_hoan_tac");
  await loi(qg.hoanTacThemGio(fam, them.id, bm, sau(t, 2)), "het_hoan_tac");
  await qg.hoanTacThemGio(fam, them.id, bm, sau(t, 0.5));
  assert.equal((await qg.quyHomNay(con, t)).themPhut, 0);
});

test("đổi sao lấy giờ: 10 sao = 10 phút; thiếu sao / vượt tối đa ngày / tắt / giờ ngủ ⇒ từ chối; phút vào quỹ hôm nay", async () => {
  const { fam, con } = await nha(30);
  const t = VN("2026-10-21T19:30:00");
  await loi(qg.doiSaoLayGio(con, 40, null, t), "vuot_toi_da_doi");     // mặc định tối đa 30 phút / ngày
  await q(`update children set cau_hinh = cau_hinh || '{"doi_sao_toi_da_ngay": 60}'::jsonb where id = $1`, [con]);
  await assert.rejects(qg.doiSaoLayGio(con, 40, null, t), (e: { ma?: string; message?: string }) => e.ma === "khong_du_sao" && /thiếu 10 sao/.test(e.message!));
  const r = await qg.doiSaoLayGio(con, 10, null, t);
  assert.deepEqual([r.sao, r.soDu, r.conPhut], [10, 20, 70], "Đã đổi 10 sao · +10 phút · còn 20 sao");
  const qy = await qg.quyHomNay(con, t);
  assert.deepEqual([qy.doiSaoPhut, qy.tongPhut], [10, 70]);
  assert.equal((await one<{ loai: string; delta: number }>(`select loai, delta from points where child_id = $1 and loai = 'doi_gio'`, [con]))!.delta, -10);
  // tỷ lệ cấu hình được: 10 sao = 20 phút ⇒ 20 phút chỉ tốn 10 sao
  await q(`update children set cau_hinh = cau_hinh || '{"phut_10_sao": 20}'::jsonb where id = $1`, [con]);
  assert.equal((await qg.doiSaoLayGio(con, 20, null, t)).sao, 10);
  await loi(qg.doiSaoLayGio(con, 5, null, VN("2026-10-21T21:30:00")), "khong_them_gio");   // giờ ngủ: chỉ ngoại lệ
  await q(`update children set cau_hinh = cau_hinh || '{"doi_sao_bat": 0}'::jsonb where id = $1`, [con]);
  await loi(qg.doiSaoLayGio(con, 5, null, t), "khong_cho_doi");
  void fam;
});

test("API Ba Mẹ: Giờ chơi (quỹ ngày thường / cuối tuần, giờ ngủ, giờ học, khi hết giờ), quỹ hôm nay, Cho thêm giờ + Hoàn tác", async () => {
  const { con, tokBm, tokMay } = await nha(30);
  let r = await m(tokBm, `con/${con}/gio-choi`);
  assert.equal(r.status, 200);
  assert.deepEqual([r.body.quyNgayThuong, r.body.quyCuoiTuan, r.body.phut10Sao, r.body.doiSaoBat, r.body.doiSaoToiDaNgay, r.body.choXinThemGio, r.body.gioHoc],
    [60, 90, 10, true, 30, true, null]);
  r = await m(tokBm, `con/${con}/gio-choi`, { quyNgayThuong: 45, quyCuoiTuan: 120, gioNgu: { tu: "21:30", den: "06:30" },
    gioHoc: { tu: "17:00", den: "18:00", thu: [1, 2, 3, 4, 5] }, doiSaoToiDaNgay: 9999, choXinThemGio: false });
  assert.equal(r.status, 200);
  assert.deepEqual([r.body.quyNgayThuong, r.body.quyCuoiTuan, r.body.doiSaoToiDaNgay, r.body.choXinThemGio], [45, 120, 480, false], "kẹp min–max");
  assert.deepEqual([r.body.gioNgu, r.body.gioHoc], [{ tu: "21:30", den: "06:30" }, { tu: "17:00", den: "18:00", thu: [1, 2, 3, 4, 5] }]);
  assert.equal((await m(tokBm, `con/${con}/gio-choi`, { gioNgu: { tu: "25:00", den: "06:00" } })).status, 400);
  assert.equal((await m(tokBm, `con/${con}/gio-choi`, { gioHoc: null })).body.gioHoc, null);
  // lịch cũ (khung giờ chơi) vẫn còn trong lịch sau khi lưu
  assert.ok((await one<{ lich: any }>(`select lich from children where id = $1`, [con]))!.lich.ngu.tu === "21:30");
  // tắt «xin thêm giờ» ⇒ Con không gửi được
  await luonChoiDuoc(con);
  assert.equal((await k(tokMay, "yeu-cau", { loai: "them_gio", phut: 30 })).body.error, "khong_cho_xin");
  // Cho thêm giờ + Hoàn tác
  const them = await m(tokBm, `con/${con}/them-gio`, { phut: 30 });
  assert.equal(them.status, 200);
  assert.equal(them.body.quy.themPhut, 30);
  assert.equal((await m(tokBm, `con/${con}/quy`)).body.quy.themPhut, 30);
  assert.equal((await m(tokBm, `them-gio/${them.body.id}/hoan-tac`, {})).status, 200);
  assert.equal((await m(tokBm, `con/${con}/quy`)).body.quy.themPhut, 0);
  assert.equal((await m(tokBm, `con/${con}/them-gio`, { phut: 1 })).status, 400);
});

test("API Con + khay: xem quỹ, đổi sao, xin thêm giờ (lời nhắn không bắt buộc) ⇒ Ba Mẹ cho ⇒ quỹ tăng; Policy thả app Giải trí theo quỹ", async () => {
  const { fam, con, tokMay, tokBm, mayId } = await nha(30);
  await luonChoiDuoc(con);
  await q(`update children set cau_hinh = cau_hinh || '{"quy_ngay_thuong": 60, "quy_cuoi_tuan": 60}'::jsonb where id = $1`, [con]);
  let r = await k(tokMay, "quy");
  assert.equal(r.status, 200);
  assert.deepEqual([r.body.sao, r.body.quy.conPhut, r.body.phutDoiDuoc, r.body.yeuCauCho.length], [30, 60, 30, 0]);
  assert.equal((await dv(tokMay, "hoc-vien/quy")).body.quy.tongPhut, 60, "khay dùng cùng đường");
  r = await dv(tokMay, "hoc-vien/doi-sao", { phut: 10 });
  assert.deepEqual([r.status, r.body.soDu, r.body.conPhut], [200, 20, 70]);
  const tq = (await dv(tokMay, "hoc-vien/tong-quan")).body;
  assert.deepEqual([tq.sao, tq.quy.tongPhut, tq.quy.doiSao.conDoiDuoc], [20, 70, 20]);
  // xin thêm giờ không cần lời nhắn ⇒ Ba Mẹ thấy, cho
  const yc = await k(tokMay, "yeu-cau", { loai: "them_gio", phut: 30 });
  assert.equal(yc.status, 200);
  assert.equal((await k(tokMay, "quy")).body.yeuCauCho.length, 1);
  const cho = (await m(tokBm, `yeu-cau/${yc.body.id}`)).body;
  assert.deepEqual([cho.sao, cho.phutDoiDuoc], [20, 20], "«Con có 20 sao, tự đổi được 20 phút»");
  const dy = await m(tokBm, `yeu-cau/${yc.body.id}/dong-y`, { phut: 30 });
  assert.equal(dy.status, 200);
  assert.ok(dy.body.grantId, "trả grantId để Hoàn tác");
  assert.equal((await k(tokMay, "quy")).body.quy.tongPhut, 100);
  // Hoàn tác duyệt ⇒ lời xin về «chờ»
  assert.equal((await m(tokBm, `them-gio/${dy.body.grantId}/hoan-tac`, {})).status, 200);
  assert.equal((await one<{ trang_thai: string }>(`select trang_thai from requests where id = $1`, [yc.body.id]))!.trang_thai, "cho");
  // Policy agent: còn quỹ ⇒ Roblox chạy được, có quyConPhut + appTinhGio; hết quỹ ⇒ rời danh sách
  const dong = (await dv(tokMay, "dong-bo", {})).body;
  assert.ok(dong.windows.allowedApps.includes("roblox.exe"));
  assert.deepEqual([dong.windows.quyConPhut, dong.windows.appTinhGio], [70, ["roblox.exe"]]);
  assert.ok(dong.windows.allowedApps.includes("tudien.exe"));
  await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut) values ($1,$2,$3,'roblox.exe','giai_tri',70)`,
    [mayId, con, (await qg.quyHomNay(con)).ngay]);
  const het = (await dv(tokMay, "dong-bo", { usage: [{ muc: "roblox.exe", phut: 70 }] })).body;
  assert.ok(!het.windows.allowedApps.includes("roblox.exe"), "hết quỹ ⇒ app Giải trí bị đóng");
  assert.deepEqual([het.windows.quyConPhut, het.windows.appTinhGio, het.quy.conPhut], [0, [], 0]);
  void fam;
});

test("Policy Windows: giờ học chỉ mở app Học; giờ ngủ khoá; giờ máy sai không thả app Giải trí", async () => {
  const { con, mayId } = await nha();
  const may = (await one<any>(`select * from devices where id = $1`, [mayId]))!;
  await q(`update children set lich = '{"hoc": {"tu": "17:00", "den": "18:00", "thu": [3]}}'::jsonb where id = $1`, [con]);
  const w = async (s: string, o: { gioMaySai?: boolean } = {}) => aw.chinhSachWindows(await mc.taoPolicy(may, con, { gioMaySai: !!o.gioMaySai }, VN(s)));
  let x = await w("2026-10-21T17:10:00");
  assert.deepEqual([x.mode, x.dangGioHoc, x.appTinhGio], ["hoc", true, []]);
  assert.ok(x.allowedApps.includes("tudien.exe") && !x.allowedApps.includes("roblox.exe"));
  assert.deepEqual(x.gioHoc, { tu: "17:00", den: "18:00", thu: [3] });
  x = await w("2026-10-21T18:10:00");
  assert.ok(x.allowedApps.includes("roblox.exe"));
  x = await w("2026-10-21T21:10:00");
  assert.deepEqual([x.mode, x.locked, x.lockReason], ["khoa", true, "ngu"]);
  x = await w("2026-10-21T18:10:00", { gioMaySai: true });
  assert.ok(!x.allowedApps.includes("roblox.exe"));
  void ph;
});

test("nhiệm vụ theo bộ: danh sách bộ, giao bộ «Tự lập» (bỏ tick một việc), không tạo trùng; thêm việc riêng cho 2 Con, lặp lại, giờ nhắc, hình", async () => {
  const { fam, con, tokBm, tokMay } = await nha();
  const ds = (await m(tokBm, "nhiem-vu/bo")).body.ds;
  const tuLap = ds.find((b: any) => b.ma === "tu_lap");
  assert.deepEqual([tuLap.soViec, tuLap.saoToiDaNgay], [5, 60], "Đủ 5 việc · 60 sao");
  assert.ok(tuLap.viec.some((x: any) => x.tuCham && x.ten === "Học 1 bài với AiiRob"));
  let r = await m(tokBm, "nhiem-vu/bo", { bo: "tu_lap", con, chon: ["Dọn phòng", "Tự đánh răng", "Tự xếp cặp", "Học 1 bài với AiiRob"] });
  assert.equal(r.body.taoMoi, 4);
  assert.equal((await m(tokBm, "nhiem-vu/bo", { bo: "tu_lap", con })).body.taoMoi, 1, "giao lại cả bộ: chỉ thêm việc còn thiếu (Đọc sách)");
  assert.equal((await m(tokBm, "nhiem-vu/bo", { bo: "khong-co" })).status, 400);
  const nv = await q<{ ten: string; bo: string; lap_lai: string; bang_chung: string; giao_cho: string | null; toi_da_ngay: number | null }>(
    `select ten, bo, lap_lai, bang_chung, giao_cho, toi_da_ngay from tasks where family_id = $1 order by ten`, [fam]);
  assert.ok(nv.every((x) => x.bo === "tu_lap"));
  assert.deepEqual(nv.find((x) => x.ten === "Tự xếp cặp")!.lap_lai, "ngay_thuong");
  assert.deepEqual(nv.find((x) => x.ten === "Đọc sách 20 phút")!.bang_chung, "ghi_am");
  assert.deepEqual([nv.find((x) => x.ten === "Tự đánh răng")!.bang_chung, nv.find((x) => x.ten === "Tự đánh răng")!.toi_da_ngay], ["xong", 2]);
  assert.equal(nv.find((x) => x.ten === "Học 1 bài với AiiRob")!.bang_chung, "tu_dong", "tu_cham lưu là tu_dong (webhook AiiRob)");
  // Con: «Tự xếp cặp» chỉ T2–T6; việc AiiRob chỉ hiện khi xin kèm tự chấm
  const nvCon = (await k(tokMay, "nhiem-vu")).body.ds.map((x: any) => x.ten);
  assert.ok(!nvCon.includes("Học 1 bài với AiiRob"));
  const kem = (await k(tokMay, "nhiem-vu?tuCham=1")).body.ds;
  assert.ok(kem.find((x: any) => x.ten === "Học 1 bài với AiiRob").tu_cham);
  assert.ok(kem.every((x: any) => x.sao === x.diem));
  const { nvCuaCon, lapHomNay } = await import("./nhiem-vu.ts");
  assert.ok(!(await nvCuaCon(con, VN("2026-10-24T10:00:00"))).some((x) => x.ten === "Tự xếp cặp"), "thứ Bảy không có Tự xếp cặp");
  assert.deepEqual([lapHomNay("thu:1,3", 3), lapHomNay("thu:1,3", 2), lapHomNay("cuoi_tuan", 0), lapHomNay(null, 4)], [true, false, true, true]);
  // thêm việc riêng cho cả 2 Con
  const con2 = await g.taoCon(fam, { ten: "Bảo Minh" });
  r = await m(tokBm, "nhiem-vu", { ten: "Tưới cây", diem: 10, giao_cho: [con, con2], lap_lai: "hang_ngay", gio_nhac: "17:30", hinh: "cay", bang_chung: "anh", tu_duyet: false });
  assert.equal(r.body.ids.length, 2);
  assert.equal((await one<{ gio_nhac: string; hinh: string }>(`select gio_nhac, hinh from tasks where id = $1`, [r.body.ids[1]]))!.gio_nhac, "17:30");
  assert.equal((await m(tokBm, "nhiem-vu", { ten: "Tưới cây 2", diem: 10, gio_nhac: "25:00" })).status, 400);
  assert.equal((await m(tokBm, "nhiem-vu", { ten: "Tưới cây 3", diem: 10, lap_lai: "moi_gio" })).status, 400);
  r = await m(tokBm, "nhiem-vu", { ten: "Viết kể lại", diem: 10, bang_chung: "viet", lap_lai: "mot_lan" });
  assert.deepEqual(Object.values((await one(`select bang_chung, kieu from tasks where id = $1`, [r.body.id]))!), ["van_ban", "mot_lan"]);
});

test("bằng chứng ghi âm / bấm Xong; Ba Mẹ «Nhờ làm lại» (lam_lai) ⇒ Con nộp bằng chứng mới ⇒ duyệt cả loạt kèm lời khen ⇒ +sao", async () => {
  const { fam, con, tokBm, tokMay } = await nha(30);
  const docSach = (await m(tokBm, "nhiem-vu", { ten: "Đọc sách 20 phút", diem: 10, bang_chung: "ghi_am" })).body.id;
  const danhRang = (await m(tokBm, "nhiem-vu", { ten: "Tự đánh răng", diem: 10, bang_chung: "xong" })).body.id;
  const ghiAm = { mime: "audio/mp4", base64: Buffer.from("am-thanh-gia-1").toString("base64") };
  let luot = (await k(tokMay, `nhiem-vu/${docSach}/bat-dau`, {})).body.luot;
  assert.equal((await k(tokMay, `luot/${luot}/nop`, {})).body.error, "thieu_ghi_am");
  assert.equal((await k(tokMay, `luot/${luot}/nop`, { ghiAm: { mime: "audio/x-midi", base64: "AA==" } })).body.error, "ghi_am_sai");
  assert.equal((await k(tokMay, `luot/${luot}/nop`, { ghiAm })).body.trang_thai, "cho_duyet");
  const luot2 = (await k(tokMay, `nhiem-vu/${danhRang}/bat-dau`, {})).body.luot;
  assert.equal((await k(tokMay, `luot/${luot2}/nop`, {})).body.trang_thai, "cho_duyet", "«Bấm Xong» không cần bằng chứng");
  const cho = (await m(tokBm, "cho-duyet")).body.nhiemVu;
  const c1 = cho.find((x: any) => x.id === luot);
  assert.deepEqual([c1.sao, c1.bang_chung, c1.so_ghi_am], [10, "ghi_am", 1]);
  const bc = (await m(tokBm, `luot/${luot}/bang-chung`)).body.ds;
  assert.deepEqual([bc.length, bc[0].loai, bc[0].mime], [1, "ghi_am", "audio/mp4"]);
  // Nhờ làm lại (lý do + lời nhắn không bắt buộc)
  assert.equal((await m(tokBm, `luot/${luot}/lam-lai`, { lyDo: "Nghe chưa rõ", loiNhan: "Con đọc to hơn một chút nhé!" })).body.trangThai, "lam_lai");
  const nvCon = (await k(tokMay, "nhiem-vu")).body.ds.find((x: any) => x.id === docSach);
  assert.deepEqual([nvCon.trang_thai_con, nvCon.lam_lai, nvCon.ly_do, nvCon.loi_nhan, nvCon.luot_dang],
    ["can_bo_sung", true, "Nghe chưa rõ", "Con đọc to hơn một chút nhé!", luot]);
  const tq = (await dv(tokMay, "hoc-vien/tong-quan")).body.nhiemVu.find((x: any) => x.id === docSach);
  assert.deepEqual([tq.trangThai, tq.lamLai, tq.loiNhan], ["can_bo_sung", true, "Con đọc to hơn một chút nhé!"]);
  assert.ok((await dv(tokMay, "hoc-vien/tin")).body.ds.some((x: any) => x.loai === "lam_lai_nhiem_vu"));
  assert.equal((await k(tokMay, `luot/${luot}/nop`, {})).body.error, "thieu_ghi_am", "làm lại phải nộp ghi âm mới");
  assert.equal((await k(tokMay, `luot/${luot}/nop`, { ghiAm: { mime: "audio/mp4", base64: Buffer.from("am-thanh-gia-2").toString("base64") } })).body.trang_thai, "cho_duyet");
  assert.equal((await m(tokBm, `luot/${luot}/lam-lai`, {})).body.trangThai, "lam_lai", "lý do không bắt buộc");
  await k(tokMay, `luot/${luot}/nop`, { ghiAm: { mime: "audio/webm", base64: Buffer.from("am-thanh-gia-3").toString("base64") } });
  // Duyệt cả 2 · +20 sao, cùng một lời khen
  const r = await m(tokBm, "duyet-hang-loat", { ids: [luot, luot2], loiKhen: "Giỏi lắm con!" });
  assert.deepEqual([r.body.daDuyet, r.body.sao], [2, 20]);
  assert.equal(await v.soDu(con), 50, "30 → 50 sao");
  assert.equal((await q(`select 1 from messages where child_id = $1 and noi_dung = 'Giỏi lắm con!'`, [con])).length, 2);
  void fam; void anhGia;
});

test("quà đổi bằng sao: chờ trao ⇒ Ba Mẹ «Đã trao» (quà phút ⇒ +phút vào quỹ); voucher AiiCafe ngừng phát; quỹ phiếu ẩn", async () => {
  const { fam, con, tokBm, tokMay } = await nha(100);
  await luonChoiDuoc(con);
  assert.equal((await m(tokBm, "qua/mau", {})).body.taoMoi, 4);
  const ds = (await m(tokBm, "qua")).body.ds;
  assert.deepEqual(ds.map((x: any) => x.ten).sort(), ["Thêm 30 phút chơi", "Xem phim cả nhà", "Đi ăn kem", "Đồ chơi nhỏ"].sort());
  assert.equal((await m(tokBm, "qua", { ten: "Phiếu 50k", loai: "voucher", diem: 500, menh_gia: 50000 })).body.error, "voucher_ngung");
  assert.equal((await m(tokBm, "qua", { ten: "Thêm 15 phút", loai: "phut", diem: 15 })).body.error, "phut_sai");
  assert.equal((await m(tokBm, "quy")).status, 410);
  // voucher cũ (tạo trực tiếp) không hiện ở cửa hàng, không đổi được qua API
  const { taoQua } = await import("./phan-thuong.ts");
  const vc = await taoQua(fam, { ten: "Phiếu AiiCafe cũ", loai: "voucher", diem: 20, menh_gia: 20_000 });
  assert.ok(!(await k(tokMay, "cua-hang")).body.qua.some((x: any) => x.id === vc));
  assert.ok(!(await dv(tokMay, "hoc-vien/cua-hang")).body.qua.some((x: any) => x.id === vc));
  assert.equal((await k(tokMay, `doi/${vc}`, {})).body.error, "voucher_ngung");
  assert.equal((await dv(tokMay, `hoc-vien/doi/${vc}`, {})).body.error, "voucher_ngung");
  // đổi «Thêm 30 phút chơi» ⇒ chờ trao ⇒ trao ⇒ +30 phút
  const phut = ds.find((x: any) => x.loai === "phut");
  const kem = ds.find((x: any) => x.ten === "Đi ăn kem");
  const d1 = (await k(tokMay, `doi/${phut.id}`, {})).body;
  assert.equal(d1.trang_thai, "cho_trao");
  const ch = (await k(tokMay, "cua-hang")).body;
  assert.ok(ch.qua.find((x: any) => x.id === phut.id).choTraoTu, "«Đã đổi · chờ Ba Mẹ trao»");
  assert.equal(ch.sao, 70);
  const truoc = (await k(tokMay, "quy")).body.quy.tongPhut;
  const tr = await m(tokBm, `phieu/${d1.phieu}/trao`, {});
  assert.deepEqual([tr.status, tr.body.trangThai, tr.body.phut], [200, "da_trao", 30]);
  assert.equal((await k(tokMay, "quy")).body.quy.tongPhut, truoc + 30, "18 → 48 phút");
  assert.equal((await m(tokBm, `phieu/${d1.phieu}/trao`, {})).body.error, "da_xu_ly");
  // quà thường: đổi ⇒ trao ⇒ «Quà của con»
  const d2 = (await dv(tokMay, `hoc-vien/doi/${kem.id}`, {})).body;
  assert.equal(d2.trangThai, "cho_trao");
  await m(tokBm, `phieu/${d2.phieu}/trao`, {});
  const vi = (await k(tokMay, "vi-qua")).body;
  assert.deepEqual(vi.daTrao.map((x: any) => x.ten).sort(), ["Thêm 30 phút chơi", "Đi ăn kem"].sort());
  assert.ok((await dv(tokMay, "hoc-vien/tin")).body.ds.some((x: any) => x.loai === "xac_nhan_qua" && /\+30 phút/.test(x.noi)));
});

test("rà PR: hoàn tác thêm giờ hoàn sao đã trừ; Khoá lại ngay / Khoá ngay đóng ngoại lệ; ngoại lệ trang web; quà phút chốt lúc đổi; làm lại phải bằng chứng mới; bỏ «Một lần»; ô trống không lưu 0", async () => {
  const yc = await import("./yeu-cau.ts");
  const tt = await import("./tuan-thu.ts");
  const nv = await import("./nhiem-vu.ts");
  const pt = await import("./phan-thuong.ts");
  const { fam, bm, con, mayId, tokBm, tokMay } = await nha(40);
  const may = (await one<any>(`select * from devices where id = $1`, [mayId]))!;
  const t = VN("2026-10-21T19:00:00");
  // hoàn tác lần duyệt «Trừ sao» ⇒ hoàn đúng số sao, duyệt lại chỉ trừ một lần
  const r = await yc.guiYeuCau(con, mayId, { loai: "them_gio", phut: 30 }, t);
  const d = await yc.dongY(fam, r.id, bm, { truDiem: true, phut: 30 }, t);
  assert.equal(await v.soDu(con), 10);
  await qg.hoanTacThemGio(fam, d.grantId!, bm, sau(t, 0.5));
  assert.equal(await v.soDu(con), 40, "hoàn 30 sao");
  await yc.dongY(fam, r.id, bm, { truDiem: true, phut: 30 }, sau(t, 1));
  assert.equal(await v.soDu(con), 10);
  // Khoá lại ngay (trên máy) đóng ngoại lệ một app; Ba Mẹ «Khoá ngay» đóng ngoại lệ cả máy
  const T2 = VN("2026-10-21T21:30:00");
  const n1 = await yc.guiYeuCau(con, mayId, { loai: "ngoai_le", phamVi: "app", giaTri: "tudien.exe", phut: 30 }, T2);
  await yc.dongY(fam, n1.id, bm, {}, T2);
  assert.equal((await qg.ngoaiLeDangMo(con, sau(T2, 1))).length, 1);
  await tt.huyMoKhanCap(fam, mayId, bm, sau(T2, 2));
  assert.equal((await qg.ngoaiLeDangMo(con, sau(T2, 3))).length, 0);
  const n2 = await yc.guiYeuCau(con, mayId, { loai: "ngoai_le", phut: 30 }, sau(T2, 4));
  await yc.dongY(fam, n2.id, bm, {}, sau(T2, 4));
  assert.equal((await qg.ngoaiLeDangMo(con, sau(T2, 5))).length, 1);
  await mc.khoaNgay(fam, con, true, bm, null, sau(T2, 6));
  assert.equal((await qg.ngoaiLeDangMo(con, sau(T2, 7))).length, 0);
  assert.equal(await tt.hanMoCuaMay(may, con, sau(T2, 7)), null);
  await mc.khoaNgay(fam, con, false, bm, null, sau(T2, 8));
  // ngoại lệ trang web lúc giờ ngủ ⇒ trình duyệt + chỉ trang đó (chế độ chỉ cho phép)
  const n3 = await yc.guiYeuCau(con, mayId, { loai: "ngoai_le", phamVi: "app", giaTri: "https://www.youtube.com/watch?v=1", phut: 15 }, sau(T2, 10));
  await yc.dongY(fam, n3.id, bm, {}, sau(T2, 10));
  const w = aw.chinhSachWindows(await mc.taoPolicy(may, con, { gioMaySai: false }, sau(T2, 11)));
  assert.deepEqual([w.locked, w.web.cheDo], [false, "chi_cho_phep"]);
  assert.ok(w.allowedApps.includes("msedge.exe") && w.web.cho.includes("youtube.com") && !w.web.chan.includes("youtube.com"));
  // quà phút: số phút chốt lúc đổi
  const qua = await pt.taoQua(fam, { ten: "Thêm 20 phút chơi", loai: "phut", diem: 5, phut: 20 });
  const doi = await pt.doiQua(con, qua, t);
  await pt.suaQua(fam, qua, { phut: 5 });
  assert.equal((await pt.xacNhanPhieu(fam, doi.phieu, bm, t)).phut, 20);
  // làm lại: nộp lại đúng ảnh cũ ⇒ từ chối
  const id = await nv.taoNv(fam, { ten: "Dọn phòng", diem: 10, bang_chung: "anh" });
  const luot = await nv.batDau(con, id);
  await nv.nop(con, luot, { anh: [anhGia("phong-1")] });
  await nv.nhoLamLai(fam, luot, bm, {});
  await loi(nv.nop(con, luot, { anh: [anhGia("phong-1")] }), "bang_chung_cu");
  assert.equal((await nv.nop(con, luot, { anh: [anhGia("phong-2")] })).trang_thai, "cho_duyet");
  // «Một lần» rồi sửa lặp lại ⇒ không còn một lần
  const motLan = await nv.taoNv(fam, { ten: "Gói quà", diem: 5, lap_lai: "mot_lan" });
  await nv.suaNv(fam, motLan, { lap_lai: "hang_ngay" });
  assert.equal((await one<{ kieu: string }>(`select kieu from tasks where id = $1`, [motLan]))!.kieu, "thuong");
  // ô bỏ trống không lưu thành 0
  await m(tokBm, `con/${con}/gio-choi`, { quyNgayThuong: "", doiSaoToiDaNgay: "  " });
  const gc = (await m(tokBm, `con/${con}/gio-choi`)).body;
  assert.deepEqual([gc.quyNgayThuong, gc.doiSaoToiDaNgay], [60, 30]);
  void tokMay;
});
