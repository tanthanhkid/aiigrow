// Hồ sơ Con, ghép máy, máy dùng chung + PIN, cách ly gia đình, ví điểm không âm (FR-01.02, FR-01.03, FR-03.05).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const v = await import("./vi.ts");
const th = await import("./thanh-tich.ts");
const { tx, q } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

const loi = async (p: Promise<unknown>, ma: string) => assert.rejects(p, (e: { ma?: string }) => e.ma === ma);

test("tạo hồ sơ Con: đề xuất Nhí/Teen theo tuổi, PIN 4–6 số, nhiều Con mỗi gia đình", async () => {
  const { fam } = await taoNha();
  const nam = new Date().getFullYear();
  const ken = await g.taoCon(fam, { ten: "Ken", namSinh: nam - 9, pin: "1234" });
  const bill = await g.taoCon(fam, { ten: "Bill", namSinh: nam - 13 });
  const ds = await g.dsCon(fam);
  assert.deepEqual(ds.map((c) => [c.ten, c.nhom]), [["Ken", "nhi"], ["Bill", "teen"]]);
  await loi(g.taoCon(fam, { ten: "X", pin: "12" }), "pin_sai_dang");
  await loi(g.taoCon(fam, { ten: "" }), "thieu_ten");
  await g.suaCon(fam, bill, { nhom: "nhi", avatar: "rob-sao" });
  assert.equal((await g.conCua(fam, bill)).nhom, "nhi");
  const nha2 = await taoNha("Hoa");
  await loi(g.conCua(nha2.fam, ken), "khong_thay");
});

test("ghép máy: mã 6 số dùng một lần, đúng nền tảng, còn hạn; token chỉ lưu băm; gỡ máy là token chết", async () => {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Na" });
  const ma = await g.taoMaGhep(fam, con, "windows");
  assert.match(ma, /^\d{6}$/);
  await loi(g.ghepMay(ma, "android", "Máy lạ"), "sai_nen_tang");
  const r = await g.ghepMay(ma, "windows", "Laptop của Na");
  assert.equal(r.dungChung, false);
  await loi(g.ghepMay(ma, "windows", "Laptop 2"), "ma_da_dung");
  const m = (await g.mayTuToken(r.token))!;
  assert.equal(m.child_id, con);
  assert.equal(g.mucBaoVe(m), "chua");
  assert.equal(g.mucBaoVe({ ...m, status: { quyen: { dich_vu: true, appLocker: false } } }), "mot_phan");
  assert.equal(g.mucBaoVe({ ...m, status: { quyen: { dich_vu: true, appLocker: true } } }), "day_du");
  // máy cũ chưa gửi `quyen` mà chỉ gửi trạng thái thô ⇒ suy ra, không còn «Chưa bảo vệ» oan; thiếu gì nói rõ
  const thô = { agent: "windows", cheDo: "giam-sat", mode: "hoc", appLockerApplied: false, trayAlive: true, childSessionActive: true };
  const gs = g.chiTietBaoVe({ ...m, status: thô });
  assert.equal(gs.muc, "mot_phan");
  assert.deepEqual(gs.thieu.map((x) => x.ma), ["chanThat"]);
  assert.match(gs.thieu[0].cach, /Chặn thật/);
  assert.equal(g.chiTietBaoVe({ ...m, status: { ...thô, cheDo: "chan", appLockerApplied: true } }).muc, "day_du");
  const khongLocker = g.chiTietBaoVe({ ...m, status: { ...thô, cheDo: "chan" } });
  assert.deepEqual(khongLocker.thieu.map((x) => x.ma), ["appLocker"]);
  assert.equal(g.chiTietBaoVe({ ...m, status: { ...thô, cheDo: "chan", appLockerApplied: true, trayAlive: false, childSessionActive: true } }).thieu[0].ma, "khay");
  assert.equal(g.chiTietBaoVe({ ...m, status: { ...thô, cheDo: "chan", appLockerApplied: false, mode: "tu_do", childSessionActive: false } }).muc, "day_du", "đang mở / Con chưa đăng nhập: không tính thiếu");
  assert.equal(g.chiTietBaoVe({ ...m, last_seen: null }).muc, "chua");
  const het = await g.taoMaGhep(fam, con, "windows");
  await q(`update pair_codes set expires_at = now() - interval '1 minute' where code = $1`, [het]);
  await loi(g.ghepMay(het, "windows", "X"), "ma_het_han");
  const nha2 = await taoNha("Hoa");
  await loi(g.goMay(nha2.fam, r.deviceId), "khong_thay");
  await g.goMay(fam, r.deviceId);
  assert.equal(await g.mayTuToken(r.token), undefined);
});

test("máy dùng chung: Con chọn hồ sơ bằng PIN; sai 5 lần ⇒ tạm khoá; đặt lại PIN ⇒ phiên cũ chết; Con nhà khác không vào được", async () => {
  const { fam } = await taoNha();
  const a = await g.taoCon(fam, { ten: "An", pin: "1111" });
  const b = await g.taoCon(fam, { ten: "Bin", pin: "2222" });
  const r = await g.ghepMay(await g.taoMaGhep(fam, null, "windows"), "windows", "Máy chung");
  assert.equal(r.dungChung, true);
  const may = (await g.mayTuToken(r.token))!;
  const tok = await g.dangNhapPin(may, a, "1111");
  assert.equal((await g.conTuPhien(tok))!.ten, "An");
  for (let i = 0; i < 5; i++) await loi(g.dangNhapPin(may, b, "0000"), "pin_sai");
  await loi(g.dangNhapPin(may, b, "2222"), "pin_tam_khoa");
  await g.suaCon(fam, a, { pin: "3333" });
  assert.equal(await g.conTuPhien(tok), undefined, "đặt lại PIN ⇒ đăng xuất Con");
  const nha2 = await taoNha("Hoa");
  const la = await g.taoCon(nha2.fam, { ten: "Lạ", pin: "1111" });
  await loi(g.dangNhapPin(may, la, "1111"), "khong_thay");
  // máy riêng của An: Bin không đăng nhập được trên máy đó
  const rieng = (await g.mayTuToken((await g.ghepMay(await g.taoMaGhep(fam, a, "windows"), "windows", "Laptop An")).token))!;
  await loi(g.dangNhapPin(rieng, b, "2222"), "khong_thay");
});

test("ví điểm: không âm, trừ song song không vượt số dư; điều chỉnh tay cần lý do và tính là ngoại lệ", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  await v.dieuChinhTay(fam, con, 30, "Thưởng sinh nhật", bm);
  assert.equal(await v.soDu(con), 30);
  await loi(v.dieuChinhTay(fam, con, 5, "  ", bm), "thieu_ly_do");
  const tru = () => tx(async (t) => { await v.khoaCon(t, con); return v.ghiDiem(t, con, -20, "phien", "Chơi"); });
  const kq = await Promise.allSettled([tru(), tru()]);
  assert.equal(kq.filter((x) => x.status === "fulfilled").length, 1, "chỉ một lần trừ 20 thành công khi còn 30");
  assert.equal(await v.soDu(con), 10);
  await loi(v.dieuChinhTay(fam, con, -50, "Phạt", bm), "khong_du_diem");
  const ngoaiLe = await q(`select 1 from exceptions where child_id = $1 and loai = 'dieu_chinh_tay'`, [con]);
  assert.equal(ngoaiLe.length, 1);
  const nha2 = await taoNha("Hoa");
  await loi(v.dieuChinhTay(nha2.fam, con, 10, "lạ", bm), "khong_thay");
});

test("cấp độ theo điểm kiếm được trọn đời, không theo số dư; điểm chào mừng chỉ một lần", async () => {
  assert.deepEqual(v.capDo(0), { cap: 1, diemCapSau: 100, conThieu: 100 });
  assert.equal(v.capDo(100).cap, 2);
  assert.equal(v.capDo(299).cap, 2);
  assert.equal(v.capDo(300).cap, 3);
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Mai" });
  assert.equal(await th.chaoMung(con), 10);
  assert.equal(await th.chaoMung(con), 0);
  assert.equal(await v.soDu(con), 10);
});
