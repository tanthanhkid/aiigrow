// #565: cron dọn phiên / OTP / bộ đếm hết hạn và giữ hạn sự kiện / cảnh báo 180 ngày — chỉ xoá dòng đã quá mốc, dòng còn hạn giữ nguyên.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const { donHetHan, GIU_SU_KIEN_NGAY } = await import("./don-het-han.ts");
const { chayDonKiemToan, donBoDemXoaTk, XOA_KHOA_PHUT } = await import("./xoa-tai-khoan.ts");
const { donBoDemPinMay } = await import("./pin-be.ts");
const { donBoDemGo } = await import("./may-con.ts");
const { q, newId } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

const NOW = new Date("2026-10-21T03:00:00Z");                 // đồng hồ cố định
const truoc = (ngay: number, gio = 0) => new Date(NOW.getTime() - ngay * 86_400_000 - gio * 3_600_000);
const co = async (bang: string, cot: string, gt: string) => (await q(`select 1 from ${bang} where ${cot} = $1`, [gt])).length === 1;

async function duLieu() {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Su" });
  const may = (await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Máy Su")).deviceId;
  const id = () => newId();
  const ss = { cu: id(), moi: id() }, ks = { cu: id(), moi: id() };
  await q(`insert into sessions(id, parent_id, expires_at) values ($1, $3, $4), ($2, $3, $5)`, [ss.cu, ss.moi, bm, truoc(8), truoc(6)]);
  await q(`insert into kid_sessions(id, child_id, expires_at) values ($1, $3, $4), ($2, $3, $5)`, [ks.cu, ks.moi, con, truoc(8), truoc(6)]);
  const otp = { cu: `0900${id().slice(0, 6)}`, moi: `0901${id().slice(0, 6)}` };
  await q(`insert into otp(dinh_danh, ma_hash, muc_dich, het) values ($1, 'x', 'dang_ky', $3), ($2, 'x', 'dang_ky', $4)`, [otp.cu, otp.moi, truoc(1, 1), truoc(0, 1)]);
  const ev = { cu: id(), moi: id() }, al = { cu: id(), moi: id() };
  await q(`insert into events(id, family_id, loai, created_at) values ($1, $3, 'thu', $4), ($2, $3, 'thu', $5)`, [ev.cu, ev.moi, fam, truoc(GIU_SU_KIEN_NGAY + 1), truoc(GIU_SU_KIEN_NGAY - 1)]);
  await q(`insert into alerts(id, family_id, loai, muc, noi_dung, created_at) values ($1, $3, 'thu', 'chu_y', 'x', $4), ($2, $3, 'thu', 'chu_y', 'x', $5)`,
    [al.cu, al.moi, fam, truoc(GIU_SU_KIEN_NGAY + 1), truoc(GIU_SU_KIEN_NGAY - 1)]);
  const k = id(), khung = (d: Date) => Math.floor(d.getTime() / (XOA_KHOA_PHUT * 60_000));
  const ps = {
    xoa: [`pin:${k}:a`, `bmdung:${k}:1`, `go:${k}`, `xoa_tk:${k}:${khung(truoc(2))}`],
    giu: [`pin:${k}:dang-khoa`, `pin:${k}:vua-thu`, `bmdung:${k}:2`, `go:${may}`, `xoa_tk:${k}:${khung(truoc(0, 2))}`, `la:${k}`],
  };
  await q(`insert into pin_sai(khoa, so_lan, khoa_den, cap_nhat) values
    ($1, 3, null, $11), ($2, 1, $11, null), ($3, 5, $11, null), ($4, 1, null, null),
    ($5, 5, $12, $11), ($6, 2, null, $13), ($7, 1, $12, null), ($8, 2, null, $13), ($9, 1, null, null), ($10, 1, null, null)`,
    [...ps.xoa, ...ps.giu, truoc(2), new Date(NOW.getTime() + 600_000), truoc(0, 3)]);
  // ngoại lệ events: khoá chống làm lại «ma» (giữ 400 ngày), «doi_nguoi_may» mới nhất của (máy, Con) giữ mãi
  const evGiu = { ma: id(), doiMoiNhat: id() }, evXoa = { maRatCu: id(), doiCu: id() };
  await q(`insert into events(id, family_id, device_id, child_id, loai, chi_tiet, created_at) values
    ($1, $5, $6, $7, 'bu_phien', '{"ma":"m1"}', $8), ($2, $5, $6, $7, 'bu_phien', '{"ma":"m0"}', $9),
    ($3, $5, $6, $7, 'doi_nguoi_may', '{}', $10), ($4, $5, $6, $7, 'doi_nguoi_may', '{}', $11)`,
    [evGiu.ma, evXoa.maRatCu, evXoa.doiCu, evGiu.doiMoiNhat, fam, may, con, truoc(300), truoc(401), truoc(250), truoc(200)]);
  // «ma» không do máy gửi (huy_hieu) theo mốc 180 ngày; doi_nguoi_may của máy đã không còn xoá
  const evXoa2 = { huyHieu: id(), doiMayGo: id() };
  await q(`insert into events(id, family_id, device_id, child_id, loai, chi_tiet, created_at) values
    ($1, $3, null, $4, 'huy_hieu', '{"ma":"sao_1"}', $5), ($2, $3, 'may-da-go', $4, 'doi_nguoi_may', '{}', $5)`,
    [evXoa2.huyHieu, evXoa2.doiMayGo, fam, con, truoc(GIU_SU_KIEN_NGAY + 1)]);
  Object.assign(evXoa, evXoa2);
  // alerts có khoá chống báo trùng: khoá theo ngày / máy đã gỡ ⇒ xoá; khoá theo đợt của máy còn ⇒ giữ (xoá thì báo lại cùng đợt)
  const alGiu = { dot: id() }, alXoa = { ngay: id(), mayGo: id() };
  await q(`insert into alerts(id, family_id, device_id, loai, muc, noi_dung, khoa, created_at) values
    ($1, $4, $5, 'may_ngoai_vong', 'nghiem_trong', 'x', $6, $9), ($2, $4, $5, 'tuan_thu', 'chu_y', 'x', $7, $9), ($3, $4, 'may-da-go', 'may_ngoai_vong', 'chu_y', 'x', $8, $9)`,
    [alGiu.dot, alXoa.ngay, alXoa.mayGo, fam, may, `ngoai_vong:${may}:1700000000000`, `tuan_thu:lech:${may}:2026-04-01`, `ngoai_vong:may-da-go:1`, truoc(GIU_SU_KIEN_NGAY + 1)]);
  // khoá theo đợt: chỉ cảnh báo mới nhất của (nhà, máy, loại) chặn báo lại ⇒ đợt cũ hơn (kể cả không gắn máy: nhac:<bài nộp>) xoá
  const alGiu2 = { nhacMoi: id() }, alXoa2 = { dotCu: id(), nhacCu: id() };
  await q(`insert into alerts(id, family_id, device_id, loai, muc, noi_dung, khoa, created_at) values
    ($1, $4, $5, 'may_ngoai_vong', 'nghiem_trong', 'x', $6, $9), ($2, $4, null, 'nhac_duyet', 'thong_tin', 'x', 'nhac:s1', $10),
    ($3, $4, null, 'nhac_duyet', 'thong_tin', 'x', $7, $8)`,
    [alXoa2.dotCu, alXoa2.nhacCu, alGiu2.nhacMoi, fam, may, `ngoai_vong:${may}:1600000000000`, "nhac:s2", truoc(GIU_SU_KIEN_NGAY + 2), truoc(GIU_SU_KIEN_NGAY + 20), truoc(GIU_SU_KIEN_NGAY + 30)]);
  Object.assign(alGiu, alGiu2); Object.assign(alXoa, alXoa2);
  await q(`insert into pin_sai(khoa, so_lan, cap_nhat) values ($1, 2, $2), ($3, 2, $4)`, [`bmma:${k}`, truoc(2), `bmma:${k}x`, truoc(0, 3)]);
  ps.xoa.push(`bmma:${k}`); ps.giu.push(`bmma:${k}x`);
  return { ss, ks, otp, ev, al, ps, evGiu, evXoa, alGiu, alXoa };
}

test("#565: donHetHan xoá phiên / kid_sessions quá hạn 7 ngày, OTP quá 1 ngày, sự kiện / cảnh báo quá 180 ngày; giữ dòng còn trong hạn", async () => {
  const d = await duLieu();
  const kq = await donHetHan(NOW);
  for (const [bang, cot, x] of [["sessions", "id", d.ss], ["kid_sessions", "id", d.ks], ["otp", "dinh_danh", d.otp], ["events", "id", d.ev], ["alerts", "id", d.al]] as const) {
    assert.equal(await co(bang, cot, x.cu), false, `${bang}: dòng quá hạn phải bị xoá`);
    assert.equal(await co(bang, cot, x.moi), true, `${bang}: dòng còn hạn phải giữ`);
    assert.ok(kq[bang] >= 1, bang);
  }
});

test("#565: events giữ khoá chống làm lại «ma» 400 ngày và «doi_nguoi_may» mới nhất; alerts giữ khoá chống báo trùng theo đợt của máy còn", async () => {
  const d = await duLieu();
  await donHetHan(NOW);
  for (const x of Object.values(d.evGiu)) assert.equal(await co("events", "id", x), true, `phải giữ ${x}`);
  for (const x of Object.values(d.evXoa)) assert.equal(await co("events", "id", x), false, `phải xoá ${x}`);
  for (const x of Object.values(d.alGiu)) assert.equal(await co("alerts", "id", x), true, `phải giữ cảnh báo ${x}`);
  for (const x of Object.values(d.alXoa)) assert.equal(await co("alerts", "id", x), false, `phải xoá cảnh báo ${x}`);
});

test("#565: pin_sai chỉ xoá bộ đếm đã quá hạn của khoá đã biết (pin, bmdung, go, xoa_tk); khoá đang khoá / vừa thử / máy còn / khoá lạ giữ nguyên", async () => {
  const d = await duLieu();
  await donBoDemPinMay(NOW);
  await donBoDemGo(NOW);
  await donBoDemXoaTk(NOW.getTime());
  for (const k of d.ps.xoa) assert.equal(await co("pin_sai", "khoa", k), false, `phải xoá ${k}`);
  for (const k of d.ps.giu) assert.equal(await co("pin_sai", "khoa", k), true, `phải giữ ${k}`);
});

test("#565: cron hằng ngày (chayDonKiemToan) gọi donHetHan", async () => {
  const d = await duLieu();
  await q(`delete from he_thong where khoa = 'don_kiem_toan'`).catch(() => undefined);
  await chayDonKiemToan(NOW);
  assert.equal(await co("sessions", "id", d.ss.cu), false);
  assert.equal(await co("events", "id", d.ev.moi), true);
  assert.equal(await co("pin_sai", "khoa", d.ps.xoa[0]), false);
});
