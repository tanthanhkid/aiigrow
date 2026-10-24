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

test("ghép máy: sai mã 10 lần trong khung 15 phút từ một IP ⇒ khoá tới hết khung; song song không lọt; IP khác không ảnh hưởng", async () => {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Bo" });
  const T = Date.UTC(2026, 9, 23, 3, 0);                                  // đầu một khung 15 phút
  const ma = await g.taoMaGhep(fam, con, "windows");
  const sai = ma === "000000" ? "000001" : "000000";
  for (let i = 0; i < 10; i++) await loi(g.ghepMay(sai, "windows", "X", "1.2.3.4", T + i * 1000), "ma_sai");
  await loi(g.ghepMay(ma, "windows", "X", "1.2.3.4", T + 60_000), "ghep_tam_khoa");     // khoá cả mã đúng
  await loi(g.ghepMay(ma, "windows", "X", "1.2.3.4", T + 14 * 60_000), "ghep_tam_khoa");
  const r = await g.ghepMay(ma, "windows", "PC của Bo", "1.2.3.4", T + 15 * 60_000);    // khung mới ⇒ ghép được
  assert.ok(r.token);
  await loi(g.ghepMay(sai, "windows", "X", "5.6.7.8", T + 60_000), "ma_sai");            // IP khác đếm riêng
  // ghép đúng / mã đã dùng không tính là lượt sai
  for (let i = 0; i < 12; i++) await loi(g.ghepMay(ma, "windows", "X", "7.7.7.7", T), "ma_da_dung");
  // dò song song: 30 lượt cùng lúc ⇒ chỉ 10 lượt được thử, còn lại bị khoá
  const kq = await Promise.allSettled(Array.from({ length: 30 }, (_, i) => g.ghepMay(String(i).padStart(6, "9"), "windows", "X", "8.8.8.8", T)));
  assert.equal(kq.filter((x) => x.status === "rejected" && (x.reason as { ma?: string }).ma === "ghep_tam_khoa").length, 20);
});

test("nguồn gọi ghép máy: ưu tiên x-real-ip, IPv6 gộp /64", () => {
  assert.equal(g.nguonGoi(new Headers({ "x-real-ip": "1.1.1.1", "x-forwarded-for": "6.6.6.6, 1.1.1.1" })), "1.1.1.1");
  assert.equal(g.nguonGoi(new Headers({ "x-forwarded-for": "2.2.2.2, 10.0.0.1" })), "2.2.2.2");
  assert.equal(g.nguonGoi(new Headers({ "x-real-ip": "2001:db8:1:2:aaaa::1" })), "2001:db8:1:2");
  assert.equal(g.nguonGoi(new Headers()), "?");
  assert.equal(g.nguonGoi(new Headers({ "x-real-ip": "2001:db8::5:6:7:8" })), "2001:db8:0:0");
  assert.equal(g.nguonGoi(new Headers({ "x-real-ip": "2001:db8:0:0:1::9" })), "2001:db8:0:0");
  assert.equal(g.nguonGoi(new Headers({ "x-real-ip": "::1" })), "0:0:0:0");
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
  const gc = "Win Home: chặn bằng cách đóng app";
  assert.match(g.chiTietBaoVe({ ...m, status: { ...thô, cheDo: "chan", appLockerApplied: true, ghiChuBaoVe: gc } }).cau, /Win Home/);
  assert.match(g.chiTietBaoVe({ ...m, status: { ...thô, ghiChuBaoVe: gc } }).cau, /Còn thiếu.*Win Home/);   // ghi chú hiện cả khi còn thiếu quyền
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

test("đổi tên Con và máy: chuẩn hoá, chặn rỗng/quá dài/trùng tên trong nhà, ghi nhật ký, cách ly gia đình", async () => {
  const { fam } = await taoNha();
  const ken = await g.taoCon(fam, { ten: "Ken" });
  const bill = await g.taoCon(fam, { ten: "Bill" });
  await g.suaCon(fam, ken, { ten: "  Kenny   Vũ " });
  assert.equal((await g.conCua(fam, ken)).ten, "Kenny Vũ");
  await loi(g.suaCon(fam, ken, { ten: "   " }), "thieu_ten");
  await loi(g.suaCon(fam, ken, { ten: "x".repeat(31) }), "ten_qua_dai");
  await loi(g.suaCon(fam, bill, { ten: "kenny vũ" }), "ten_trung");
  await g.suaCon(fam, ken, { ten: "KENNY VŨ" });                      // tự đổi hoa thường tên mình thì được
  assert.equal((await g.conCua(fam, ken)).ten, "KENNY VŨ");
  assert.equal((await q(`select 1 from events where family_id = $1 and loai = 'doi_ten_con'`, [fam])).length, 2);
  const r = await g.ghepMay(await g.taoMaGhep(fam, ken, "windows"), "windows", "Laptop");
  const dt = await g.doiTenMay(fam, r.deviceId, "  Máy   học bài ");
  assert.equal(dt.ten, "Máy học bài");
  assert.equal((await q<{ name: string }>(`select name from devices where id = $1`, [r.deviceId]))[0].name, "Máy học bài");
  const dns = await import("./dns-gia-dinh.ts");
  const may = (await g.mayTuToken(r.token))!;
  assert.equal((await dns.thietBiChoMay(may)).ten, "Máy học bài");          // dòng DNS đã tạo, mang tên máy
  await g.doiTenMay(fam, r.deviceId, "Máy mới");
  assert.equal((await q<{ ten: string }>(`select ten from dns_thiet_bi where device_id = $1`, [r.deviceId]))[0].ten, "Máy mới");
  const tuEv = (await q<{ d: { tu: string; den: string } | string }>(`select chi_tiet as d from events where family_id = $1 and loai = 'doi_ten_may' and device_id = $2 order by created_at desc, id desc limit 1`, [fam, r.deviceId]))[0].d;
  assert.equal((typeof tuEv === "string" ? JSON.parse(tuEv) : tuEv).tu, "Máy học bài");
  await g.doiTenMay(fam, r.deviceId, "Máy học bài");
  await loi(g.doiTenMay(fam, r.deviceId, ""), "thieu_ten");
  await loi(g.doiTenMay(fam, r.deviceId, "m".repeat(81)), "ten_qua_dai");
  assert.equal((await q(`select 1 from events where family_id = $1 and loai = 'doi_ten_may' and device_id = $2 and child_id = $3`, [fam, r.deviceId, ken])).length, 3);   // 1 lần đổi đầu + 2 lần đổi trong khối DNS ở trên
  const nha2 = await taoNha("Hoa");
  await loi(g.doiTenMay(nha2.fam, r.deviceId, "Của người khác"), "khong_thay");
  assert.equal((await q<{ name: string }>(`select name from devices where id = $1`, [r.deviceId]))[0].name, "Máy học bài");
});

test("tên Con/máy: taoCon gộp khoảng trắng + NFC và CHO PHÉP trùng tên (chỉ đổi tên mới chặn); đổi tên máy tới 80 ký tự; không đổi gì thì doi=false", async () => {
  const { fam } = await taoNha();
  const ken = await g.taoCon(fam, { ten: "  Kenny   Vũ " });
  assert.equal((await g.conCua(fam, ken)).ten, "Kenny Vũ");
  const trung = await g.taoCon(fam, { ten: "kenny   vũ" });                       // tạo mới: trùng tên vẫn được (bước thiết lập thử lại không kẹt)
  assert.equal((await g.conCua(fam, trung)).ten, "kenny vũ");
  await loi(g.taoCon(fam, { ten: "x".repeat(31) }), "ten_qua_dai");
  // NFC: «ũ» dạng tổ hợp (u + dấu ngã) = «ũ» dựng sẵn; độ dài tính sau NFC
  const nfd = await g.taoCon(fam, { ten: "Vi\u0323\u0302t".repeat(5) });             // 15 ký tự tổ hợp, 5×(V,i,ệ,t)
  assert.equal((await g.conCua(fam, nfd)).ten, "Vi\u0323\u0302t".repeat(5).normalize("NFC"));
  assert.equal((await g.conCua(fam, nfd)).ten.normalize("NFC"), (await g.conCua(fam, nfd)).ten);
  assert.equal(g.chuanHoaTen("  A \t B\n"), "A B");
  // dữ liệu cũ chưa chuẩn hoá (nhiều khoảng trắng) vẫn bị bắt trùng
  await q(`insert into children(id, family_id, ten) values ('cu1', $1, ' Bé   Na ')`, [fam]);
  await loi(g.suaCon(fam, ken, { ten: "BÉ  NA" }), "ten_trung");
  // song song cùng tên: cả hai được tạo
  const kq = await Promise.allSettled([g.taoCon(fam, { ten: "Song Song" }), g.taoCon(fam, { ten: "song song" })]);
  assert.equal(kq.filter((x) => x.status === "fulfilled").length, 2);
  // máy: 80 ký tự được (ghepMayGd lưu tới 80), 81 thì không
  const r = await g.ghepMay(await g.taoMaGhep(fam, ken, "windows"), "windows", "m".repeat(80));
  const t80 = "n".repeat(80);
  assert.deepEqual(await g.doiTenMay(fam, r.deviceId, t80), { ok: true, ten: t80, doi: true });
  await loi(g.doiTenMay(fam, r.deviceId, "n".repeat(81)), "ten_qua_dai");
  assert.equal((await g.doiTenMay(fam, r.deviceId, `  ${t80}  `)).doi, false);          // chỉ khác khoảng trắng ⇒ không đổi
  assert.equal((await q(`select 1 from events where family_id = $1 and loai = 'doi_ten_may'`, [fam])).length, 1);
});

test("suaCon: tên không đổi (sau chuẩn hoá) không kiểm trùng; đọc tên cũ trong khoá nên nhật ký `tu` đúng khi đổi song song", async () => {
  const { fam } = await taoNha();
  const a = await g.taoCon(fam, { ten: "Mon" });
  // dữ liệu cũ trùng tên sẵn (tạo trước khi có luật chặn trùng)
  await q(`insert into children(id, family_id, ten) values ('trung1', $1, 'Mon')`, [fam]);
  await g.suaCon(fam, a, { ten: "  Mon ", avatar: "rob-sao", nhom: "teen" });      // tên không đổi + sửa avatar/nhóm ⇒ không ten_trung
  const c = await g.conCua(fam, a);
  assert.equal(c.avatar, "rob-sao");
  assert.equal(c.nhom, "teen");
  assert.equal((await q(`select 1 from events where family_id = $1 and loai = 'doi_ten_con'`, [fam])).length, 0);
  // tên mới trùng Con khác vẫn bị chặn
  await loi(g.suaCon(fam, a, { ten: "mon", avatar: "rob" }), "ten_trung");
  // hai lần đổi song song: nhật ký tạo chuỗi nhất quán (tu của lần sau = den của lần trước)
  const b = await g.taoCon(fam, { ten: "Bo" });
  await Promise.all([g.suaCon(fam, b, { ten: "Bo Mot" }), g.suaCon(fam, b, { ten: "Bo Hai" })]);
  const ev = await q<{ d: { tu: string; den: string } | string }>(`select chi_tiet as d from events where family_id = $1 and loai = 'doi_ten_con' and child_id = $2 order by created_at, id`, [fam, b]);
  const ds = ev.map((e) => (typeof e.d === "string" ? JSON.parse(e.d) : e.d));
  assert.equal(ds.length, 2);
  const cuoi = (await g.conCua(fam, b)).ten;
  const dau = ds.find((x) => x.tu === "Bo")!;
  const sau = ds.find((x) => x.tu !== "Bo")!;
  assert.equal(sau.tu, dau.den);
  assert.equal(sau.den, cuoi);
});

test("tên không đổi sau chuẩn hoá nhưng lưu thô khác: ghi lại dạng chuẩn, không nhật ký, doi=false; bằng hẳn thì không ghi", async () => {
  const { fam } = await taoNha();
  await q(`insert into children(id, family_id, ten) values ('thoc1', $1, ' Bé   Na ')`, [fam]);
  await g.suaCon(fam, "thoc1", { ten: "Bé Na" });
  assert.equal((await g.conCua(fam, "thoc1")).ten, "Bé Na");
  assert.equal((await q(`select 1 from events where family_id = $1 and loai = 'doi_ten_con'`, [fam])).length, 0);
  const ken = await g.taoCon(fam, { ten: "Ken" });
  const r = await g.ghepMay(await g.taoMaGhep(fam, ken, "windows"), "windows", "Laptop");
  await q(`update devices set name = '  Máy   Ken ' where id = $1`, [r.deviceId]);
  assert.equal((await g.doiTenMay(fam, r.deviceId, "Máy Ken")).doi, false);
  assert.equal((await q<{ name: string }>(`select name from devices where id = $1`, [r.deviceId]))[0].name, "Máy Ken");
  assert.equal((await g.doiTenMay(fam, r.deviceId, "Máy Ken")).doi, false);
  assert.equal((await q(`select 1 from events where family_id = $1 and loai = 'doi_ten_may'`, [fam])).length, 0);
});
