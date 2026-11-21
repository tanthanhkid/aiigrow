// #302 mục 4: giới hạn tối đa mỗi ngày (chơi bằng sao — không phải phút miễn phí) + mỗi lượt tối đa N phút rồi nghỉ N phút.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyM } = await import("./api-m.ts");
const g = await import("./gia-dinh.ts");
const la = await import("./luat-app.ts");
const v = await import("./vi.ts");
const qg = await import("./quy-gio.ts");
const ph = await import("./phien.ts");
const mc = await import("./may-con.ts");
const ss = await import("./so-sao.ts");
const gh = await import("./gioi-han-choi.ts");
const { one, q } = await import("./db.ts");
const tre = await import("./choi-tre.ts");
const { xuLyConSao } = await import("./api-sao.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const { taoPhien } = await import("./auth.ts");

const VN = (s: string) => new Date(`${s}+07:00`);
const sau = (d: Date, phut: number) => new Date(d.getTime() + phut * 60000);

const m = async (tok: string, duong: string, body?: unknown) => {
  const r = await xuLyM(new Request(`http://x/api/m/${duong}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), duong.split("?")[0].split("/"));
  return { status: r.status, body: (await r.json()) as any };
};

async function nha(sao: number) {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  if (sao) await v.dieuChinhTay(fam, con, sao, "Sao thử", bm);
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop của Bảo Anh");
  await la.datLuat(fam, { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" });
  return { fam, bm, con, mayId: may.deviceId as string, tokBm: await taoPhien(bm) };
}

/** Chơi «Tính phút» liên tục `phut` phút kể từ `tu` (mỗi phút một lần báo, như agent) ⇒ trừ sao theo đồng hồ máy chủ. */
async function choi(con: string, tu: Date, phut: number) {
  for (let i = 1; i <= phut; i++) await ss.truPhutChoi(con, 1, sau(tu, i), { muc: "roblox.exe" });
  return sau(tu, phut);
}

test("tinhLuot (thuần): đủ lượt ⇒ nghỉ đúng N phút; tự dừng ≥ N phút = đã nghỉ; Ba Mẹ cho vay ⇒ hết nghỉ", () => {
  const t0 = VN("2026-11-16T15:00:00");
  const doan = (tu: Date, n: number) => Array.from({ length: n }, (_, i) => ({ luc: sau(tu, i + 1), phut: 1 }));
  // chơi 20 / lượt 30 ⇒ còn 10
  let l = gh.tinhLuot(doan(t0, 20), [], 30, sau(t0, 20));
  assert.deepEqual([l.dangNghi, l.luotDaChoi, l.conLuot, l.luotBatDau?.toISOString()], [false, 20, 10, t0.toISOString()]);
  // chơi đủ 30 ⇒ nghỉ tới 16:00
  l = gh.tinhLuot(doan(t0, 30), [], 30, sau(t0, 31));
  assert.deepEqual([l.dangNghi, l.nghiDen?.toISOString(), l.conLuot], [true, sau(t0, 60).toISOString(), 0]);
  // hết nghỉ ⇒ lượt mới đủ 30
  l = gh.tinhLuot(doan(t0, 30), [], 30, sau(t0, 60));
  assert.deepEqual([l.dangNghi, l.luotDaChoi, l.conLuot], [false, 0, 30]);
  // chơi 10, dừng 35 phút (≥ 30) rồi chơi 5 ⇒ lượt mới 5
  l = gh.tinhLuot([...doan(t0, 10), ...doan(sau(t0, 45), 5)], [], 30, sau(t0, 50));
  assert.deepEqual([l.luotDaChoi, l.conLuot], [5, 25]);
  // chơi 10, dừng 10 (< 30) rồi chơi 5 ⇒ vẫn lượt cũ 15
  l = gh.tinhLuot([...doan(t0, 10), ...doan(sau(t0, 20), 5)], [], 30, sau(t0, 25));
  assert.deepEqual([l.luotDaChoi, l.conLuot], [15, 15]);
  // đang nghỉ, Ba Mẹ cho vay lúc 15:40 ⇒ hết nghỉ, lượt mới
  l = gh.tinhLuot(doan(t0, 30), [sau(t0, 40)], 30, sau(t0, 41));
  assert.deepEqual([l.dangNghi, l.conLuot], [false, 30]);
  // phút báo trễ rơi vào giờ nghỉ không kéo dài nghỉ
  l = gh.tinhLuot([...doan(t0, 30), { luc: sau(t0, 35), phut: 1 }], [], 30, sau(t0, 40));
  assert.equal(l.nghiDen?.toISOString(), sau(t0, 60).toISOString());
});

test("API Giờ chơi: lưu giới hạn ngày + mỗi lượt, dòng giải thích; giá trị sai ⇒ 400; ô cũ không đụng", async () => {
  const { con, tokBm } = await nha(10);
  let r = await m(tokBm, `con/${con}/gio-choi`);
  assert.deepEqual([r.body.gioiHanNgayThuong, r.body.gioiHanCuoiTuan, r.body.phutMoiLuot],
    [0, 0, 0], "Con cũ: không giới hạn");
  assert.equal("moTaGioiHan" in r.body || "mucGioiHan" in r.body, false, "#306: bỏ chip + dòng giải thích");
  r = await m(tokBm, `con/${con}/gio-choi`, { gioiHanNgayThuong: 60, gioiHanCuoiTuan: 90, phutMoiLuot: 30 });
  assert.equal(r.status, 200);
  assert.deepEqual([r.body.gioiHanNgayThuong, r.body.gioiHanCuoiTuan, r.body.phutMoiLuot], [60, 90, 30]);
  r = await m(tokBm, `con/${con}/gio-choi`, { phutMoiLuot: 0 });
  assert.deepEqual([r.body.gioiHanNgayThuong, r.body.phutMoiLuot], [60, 0], "chỉ đổi khoá có gửi");
  assert.equal((await m(tokBm, `con/${con}/gio-choi`, { phutMoiLuot: 2 })).status, 400);
  assert.equal((await m(tokBm, `con/${con}/gio-choi`, { gioiHanNgayThuong: 9999 })).status, 400);
  assert.equal((await one<{ c: any }>(`select cau_hinh as c from children where id = $1`, [con]))!.c.gh_ngay_thuong, 60);
});

test("Giới hạn ngày: chơi được min(giới hạn còn, sao); hết giới hạn ⇒ khoá dù còn sao; cho vay = cho thêm; hôm sau mở lại", async () => {
  const { fam, bm, con, mayId } = await nha(100);
  await qg.datGioChoi(fam, con, { gioiHanNgayThuong: 30, gioiHanCuoiTuan: 60 }, bm);
  const t0 = VN("2026-11-16T15:00:00");     // Thứ Hai
  let qy = await qg.quyHomNay(con, t0);
  assert.deepEqual([qy.conPhut, qy.soSao.phutCon, qy.gioiHan.conNgay, qy.gioiHan.cau], [30, 100, 30, "Còn 30 phút hôm nay"]);
  const t1 = await choi(con, t0, 30);
  qy = await qg.quyHomNay(con, t1);
  assert.deepEqual([qy.conPhut, qy.soSao.phutCon, qy.gioiHan.lyDoKhoa, qy.gioiHan.hetNgay], [0, 70, "het_gio_ngay", true], "còn 70 sao mà hết giới hạn");
  assert.equal(qy.gioiHan.cau, "Hôm nay đã chơi đủ 30 phút — mai chơi tiếp nhé");
  // policy agent: cờ khoá có sẵn (sao.hetSao, quy.conPhut) đã theo giới hạn; số dư giữ nguyên
  const may = (await one<any>(`select * from devices where id = $1`, [mayId]))!;
  const p = await mc.taoPolicy(may, con, { gioMaySai: false }, t1);
  assert.deepEqual([p.sao?.phutCon, p.sao?.hetSao, p.sao?.sao, p.sao?.saoTieuDuoc, p.quy?.conPhut, p.gioiHan?.lyDoKhoa],
    [0, true, 70, 70, 0, "het_gio_ngay"]);
  assert.equal(p.sao?.cau.phut, "Hôm nay đã chơi đủ 30 phút — mai chơi tiếp nhé");
  // số phút gửi máy Con là số nguyên (agent iOS / Mac giải mã Int)
  for (const k of ["daChoi", "conNgay", "luotDaChoi", "phutToiDa"] as const) {
    const x = (p.gioiHan as Record<string, unknown>)[k];
    assert.ok(x === null || Number.isInteger(x), `${k} = ${x}`);
  }
  // mở phiên: lý do riêng
  const x = await ph.xetMoPhien(con, "roblox.exe", {}, t1);
  assert.deepEqual([x.duoc, x.lyDo, ph.lyDoChu(x)], [false, "dat_tran_ngay", "Hôm nay con đã chơi đủ giờ rồi — mai chơi tiếp nhé"]);
  // Ba Mẹ cho vay 15 sao (chơi) ⇒ thêm 15 phút hôm nay; vay đổi quà không cộng
  await ss.choVay(fam, con, 15, bm, { mucDich: "qua" }, undefined, sau(t1, 1));
  assert.equal((await qg.quyHomNay(con, sau(t1, 2))).conPhut, 0);
  await ss.choVay(fam, con, 15, bm, { mucDich: "choi" }, undefined, sau(t1, 3));
  qy = await qg.quyHomNay(con, sau(t1, 4));
  assert.deepEqual([qy.conPhut, qy.gioiHan.ngayPhut, qy.gioiHan.themHomNay], [15, 45, 15]);
  // hết cả giới hạn ngày lẫn sao ⇒ vẫn «Hôm nay chơi đủ» (sao có cũng không chơi được hôm nay)
  const c = await nha(30);
  await qg.datGioChoi(c.fam, c.con, { gioiHanNgayThuong: 30, phutMoiLuot: 15 }, c.bm);
  await choi(c.con, t0, 15);
  let qc = await qg.quyHomNay(c.con, sau(t0, 16));
  assert.deepEqual([qc.gioiHan.lyDoKhoa, qc.soSao.phutCon], ["dang_nghi", 15], "còn sao ⇒ đang nghỉ");
  await choi(c.con, sau(t0, 31), 15);
  qc = await qg.quyHomNay(c.con, sau(t0, 47));
  assert.deepEqual([qc.gioiHan.lyDoKhoa, qc.soSao.hetSao], ["het_gio_ngay", true], "hết ngày thắng hết sao");
  const d = await nha(15);
  await qg.datGioChoi(d.fam, d.con, { gioiHanNgayThuong: 120, phutMoiLuot: 15 }, d.bm);
  await choi(d.con, t0, 15);
  qc = await qg.quyHomNay(d.con, sau(t0, 16));
  assert.deepEqual([qc.gioiHan.lyDoKhoa, qc.gioiHan.dangNghi, qc.soSao.hetSao], [null, true, true], "hết sao đúng lúc hết lượt ⇒ «Hết sao», không «Nghỉ»");
  // hôm sau: giới hạn mới; T7 dùng giới hạn cuối tuần
  assert.equal((await qg.quyHomNay(con, VN("2026-11-17T09:00:00"))).conPhut, 30);
  assert.equal((await qg.quyHomNay(con, VN("2026-11-21T09:00:00"))).conPhut, 60);
  // ít sao hơn giới hạn ⇒ theo sao
  const b = await nha(10);
  await qg.datGioChoi(b.fam, b.con, { gioiHanNgayThuong: 60 }, b.bm);
  qy = await qg.quyHomNay(b.con, t0);
  assert.deepEqual([qy.conPhut, qy.gioiHan.lyDoKhoa], [10, null]);
});

test("Mỗi lượt 30 phút (2h/ngày): chơi 30 ⇒ nghỉ 30 không trừ sao, màn khoá «chơi tiếp lúc HH:MM»; hết nghỉ chơi tiếp", async () => {
  const { fam, bm, con, mayId } = await nha(200);
  await qg.datGioChoi(fam, con, { gioiHanNgayThuong: 120, gioiHanCuoiTuan: 120, phutMoiLuot: 30 }, bm);
  const t0 = VN("2026-11-16T15:00:00");
  let t = await choi(con, t0, 20);
  let qy = await qg.quyHomNay(con, t);
  assert.deepEqual([qy.conPhut, qy.gioiHan.luotDaChoi, qy.gioiHan.conLuot, qy.gioiHan.conNgay], [10, 20, 10, 100], "còn 10 phút của lượt");
  t = await choi(con, t, 10);
  qy = await qg.quyHomNay(con, sau(t, 1));
  assert.deepEqual([qy.conPhut, qy.gioiHan.dangNghi, qy.gioiHan.nghiDenGio, qy.gioiHan.lyDoKhoa], [0, true, "16:00", "dang_nghi"]);
  assert.equal(qy.gioiHan.cau, "Nghỉ một chút · chơi tiếp lúc 16:00");
  const saoNghi = qy.soSao.phutCon;
  assert.equal(saoNghi, 170);
  const may = (await one<any>(`select * from devices where id = $1`, [mayId]))!;
  const p = await mc.taoPolicy(may, con, { gioMaySai: false }, sau(t, 1));
  assert.deepEqual([p.sao?.hetSao, p.gioiHan?.dangNghi, p.gioiHan?.nghiDen, p.sao?.cau.phut],
    [true, true, VN("2026-11-16T16:00:00").toISOString(), "Nghỉ một chút · chơi tiếp lúc 16:00"]);
  const x = await ph.xetMoPhien(con, "roblox.exe", {}, sau(t, 1));
  assert.deepEqual([x.lyDo, ph.lyDoChu(x)], ["dang_nghi", "Nghỉ một chút · chơi tiếp lúc 16:00"]);
  // giữa giờ nghỉ: không phút nào bị trừ
  qy = await qg.quyHomNay(con, VN("2026-11-16T15:50:00"));
  assert.deepEqual([qy.soSao.phutCon, qy.conPhut], [170, 0]);
  // 16:00 hết nghỉ ⇒ lượt mới 30 phút (ngày còn 90)
  qy = await qg.quyHomNay(con, VN("2026-11-16T16:00:00"));
  assert.deepEqual([qy.gioiHan.dangNghi, qy.conPhut, qy.gioiHan.conNgay], [false, 30, 90]);
});

test("Phiên (khay / app Con): lượt đủ ⇒ phiên kết thúc kèm nghiDen; «Mở hết» không giới hạn", async () => {
  const { fam, bm, con, mayId } = await nha(100);
  await qg.datGioChoi(fam, con, { gioiHanNgayThuong: 120, phutMoiLuot: 15 }, bm);
  const t0 = VN("2026-11-16T15:00:00");
  const pm = await ph.moPhien(con, mayId, "roblox.exe", {}, t0);
  assert.equal(pm.phutToiDa, 15);
  let k: Awaited<ReturnType<typeof ph.nhip>> | null = null;
  for (let i = 1; i <= 16 && k?.trangThai !== "ket_thuc"; i++) k = await ph.nhip(con, pm.id, true, sau(t0, i));
  assert.equal(k!.trangThai, "ket_thuc");
  assert.equal(k!.nghiDen, VN("2026-11-16T15:30:00").toISOString());
  // «Mở hết»: không chặn, không đếm ⇒ giới hạn không áp dụng
  const { datCheDoChan } = await import("./che-do-chan.ts");
  await datCheDoChan(fam, con, "mo_het", bm);
  const qy = await qg.quyHomNay(con, sau(t0, 20));
  assert.deepEqual([qy.gioiHan.apDung, qy.gioiHan.lyDoKhoa, qy.conPhut], [false, null, qy.soSao.phutCon]);
});

test("Lần đầu (POST thiet-lap): gửi giới hạn ngày + mỗi lượt ⇒ lưu theo Con, tóm tắt trả lại", async () => {
  const { fam, bm } = await taoNha();
  const tok = await taoPhien(bm);
  const r = await m(tok, "thiet-lap", { con: { ten: "Kim Nghi" }, saoKhoiDau: 30, gioiHanNgayThuong: 60, gioiHanCuoiTuan: 90, phutMoiLuot: 30 });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual([r.body.gioiHanNgayThuong, r.body.gioiHanCuoiTuan, r.body.phutMoiLuot], [60, 90, 30]);
  assert.equal((await m(tok, "thiet-lap", { con: { ten: "Bé 2" }, phutMoiLuot: 1 })).status, 400);
  assert.equal((await one<{ n: number }>(`select count(*)::int as n from children where family_id = $1`, [fam]))!.n, 1, "lỗi giới hạn không tạo Con");
});

test("review: còn < 1 phút = hết (lý do + nghiDen); phút «Mở hết» không đếm; vay theo muc_dich + hoàn tác; kid/sao kẹp; nhaTre hết nghỉ khi cho vay", async () => {
  const t0 = VN("2026-11-16T15:00:00");
  // lượt 15, chơi 14,5 phút ⇒ còn 0,5 < 1 ⇒ đang nghỉ (không phải «khoá không lý do»)
  const a = await nha(100);
  await qg.datGioChoi(a.fam, a.con, { gioiHanNgayThuong: 120, phutMoiLuot: 15 }, a.bm);
  await choi(a.con, t0, 14);
  await ss.truPhutChoi(a.con, 0.5, sau(t0, 14.5), { muc: "roblox.exe" });
  let qy = await qg.quyHomNay(a.con, sau(t0, 14.6));
  assert.deepEqual([qy.conPhut, qy.gioiHan.lyDoKhoa, !!qy.gioiHan.nghiDen], [0, "dang_nghi", true]);
  // ngày 30, đã chơi 29,5 ⇒ hết hôm nay
  const b = await nha(100);
  await qg.datGioChoi(b.fam, b.con, { gioiHanNgayThuong: 30 }, b.bm);
  await choi(b.con, t0, 29);
  await ss.truPhutChoi(b.con, 0.5, sau(t0, 29.5), { muc: "roblox.exe" });
  qy = await qg.quyHomNay(b.con, sau(t0, 29.6));
  assert.deepEqual([qy.conPhut, qy.gioiHan.lyDoKhoa], [0, "het_gio_ngay"]);
  // phút ở «Mở hết» (usage giai_tri, không có choi_tru) không ăn vào giới hạn ngày
  const c = await nha(100);
  await qg.datGioChoi(c.fam, c.con, { gioiHanNgayThuong: 30 }, c.bm);
  await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut) values ($1,$2,'2026-11-16','roblox.exe','giai_tri',40)`, [c.mayId, c.con]);
  qy = await qg.quyHomNay(c.con, t0);
  assert.deepEqual([qy.gioiHan.daChoi, qy.conPhut], [0, 30]);
  // vay: muc_dich có cấu trúc; hoàn tác trừ đúng khoản gốc
  const v = await ss.choVay(c.fam, c.con, 10, c.bm, { mucDich: "choi" }, undefined, t0);
  assert.equal((await one<{ m: string }>(`select muc_dich as m from points where id = $1`, [v.id]))!.m, "choi");
  assert.equal((await qg.quyHomNay(c.con, sau(t0, 0.2))).gioiHan.ngayPhut, 40);
  await qg.hoanTacThemGio(c.fam, v.id, c.bm, sau(t0, 0.3));
  assert.equal((await qg.quyHomNay(c.con, sau(t0, 0.4))).gioiHan.ngayPhut, 30, "hoàn tác ⇒ bỏ phần cộng");
  await ss.choVay(c.fam, c.con, 10, c.bm, { mucDich: "qua" }, undefined, sau(t0, 1));
  assert.equal((await qg.quyHomNay(c.con, sau(t0, 1.1))).gioiHan.ngayPhut, 30, "vay đổi quà không cộng");
  // kid/sao: phutCon kẹp, saoTieuDuoc thật, có gioiHan
  const r = await xuLyConSao(b.con, null, new Request("http://x/api/kid/sao"), ["sao"], {}, { now: sau(t0, 29.6) });
  const body = (await r!.json()) as any;
  // mốc giờ truyền vào route (thứ Hai, trong ngày đặt giới hạn) ⇒ không phụ thuộc đồng hồ thật / thứ trong tuần
  assert.deepEqual([typeof body.saoTieuDuoc, body.gioiHan?.apDung, body.phutCon <= body.saoTieuDuoc], ["number", true, true]);
  // nhaTre: đang nghỉ ⇒ nghiDen; cho vay ⇒ hết nghỉ ngay
  let n = await tre.nhaTre({ id: a.con, family_id: a.fam, device_id: null }, sau(t0, 15));
  assert.ok(n.nghiDen);
  await ss.choVay(a.fam, a.con, 10, a.bm, { mucDich: "choi" }, undefined, sau(t0, 15.5));
  n = await tre.nhaTre({ id: a.con, family_id: a.fam, device_id: null }, sau(t0, 16));
  assert.deepEqual([n.nghiDen, n.gioiHan.dangNghi], [null, false]);
});
