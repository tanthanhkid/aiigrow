// Sổ sao (#263–#266, 15/11/2026): vay sao, số dư âm, trả nợ trước, 1 sao = 1 phút theo đồng hồ máy chủ, cảnh báo nợ > 1.000, tương thích agent cũ.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const ss = await import("./so-sao.ts");
const v = await import("./vi.ts");
const g = await import("./gia-dinh.ts");
const nv = await import("./nhiem-vu.ts");
const la = await import("./luat-app.ts");
const tb = await import("./thong-bao.ts");
const { xuLyM } = await import("./api-m.ts");
const { xuLyMay } = await import("./api-may.ts");
const { taoPhien } = await import("./auth.ts");
const { q, one, tx } = await import("./db.ts");
const { taoNha, anhGia, luonChoiDuoc } = await import("./test-fixtures/nha.ts");

const loi = async (p: Promise<unknown>, ma: string) => assert.rejects(p, (e: { ma?: string }) => e.ma === ma);
const goi = (xuLy: (r: Request, p: string[]) => Promise<Response>, goc: string) => async (tok: string, duong: string, body?: unknown) => {
  const r = await xuLy(new Request(`http://x/api/${goc}/${duong}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), duong.split("?")[0].split("/"));
  return { status: r.status, body: (await r.json()) as any };
};
const m = goi(xuLyM, "m"), dv = goi(xuLyMay, "device");

/** Duyệt một nhiệm vụ `diem` sao cho Con (đường thật: tạo → bắt đầu → nộp → Ba Mẹ duyệt). */
async function lamNv(fam: string, con: string, bm: string, diem: number, ten = `Việc ${diem}`) {
  const id = await nv.taoNv(fam, { ten: `${ten} ${Math.random()}`, diem, bang_chung: "anh" });
  const luot = await nv.batDau(con, id);
  await nv.nop(con, luot, { anh: [anhGia(`${id}-${diem}`)] });
  return nv.duyet(fam, luot, bm, {});
}

test("nghiệm thu #263: Con 0 sao, Ba Mẹ cho vay 30, tiêu hết ⇒ −30; nhiệm vụ +10 ⇒ −20 (trả nợ trước); thêm +30 ⇒ +10", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  const vay = await ss.choVay(fam, con, 30, bm, { mucDich: "choi" });
  assert.deepEqual([vay.soSao, vay.sao, vay.no, vay.phutCon, vay.saoVayChuaTieu, vay.hetSao], [30, 0, 30, 30, 30, false]);
  await tx(async (t) => { await v.khoaCon(t, con); await v.ghiDiem(t, con, -30, "doi_qua", "Đổi quà"); });
  let st = await ss.trangThaiSao(con);
  assert.deepEqual([st.sao, st.no, st.phutCon, st.hetSao], [-30, 30, 0, true]);
  await lamNv(fam, con, bm, 10, "Dọn phòng");
  st = await ss.trangThaiSao(con);
  assert.deepEqual([st.sao, st.no, st.phutCon], [-20, 20, 0], "+10 trả nợ trước, chưa cộng vào sao tiêu được");
  await lamNv(fam, con, bm, 30, "Tưới cây");
  st = await ss.trangThaiSao(con);
  assert.deepEqual([st.sao, st.no, st.phutCon, st.hetSao], [10, 0, 10, false], "trả nốt 20, cộng 10");
  // nhật ký: ai cho vay, bao nhiêu, lúc nào; dòng trả nợ
  const ls = await v.lichSu(con);
  const dongVay = ls.find((x) => x.loai === "vay")!;
  assert.deepEqual([dongVay.delta, dongVay.nguoi, dongVay.ten_nguoi, dongVay.ly_do], [30, bm, "Lan", "Ba Mẹ cho vay 30 sao · chơi"]);
  assert.ok(dongVay.created_at);
  assert.deepEqual(ls.filter((x) => x.loai === "tra_no").map((x) => x.delta).sort((a, b) => a - b), [-20, -10]);
  assert.ok(ls.some((x) => x.loai === "tra_no" && /^Trả nợ 10 sao · Nhiệm vụ Dọn phòng/.test(x.ly_do)));
  assert.ok(await one(`select 1 from events where child_id = $1 and loai = 'cho_vay' and (chi_tiet->>'so_sao')::int = 30`, [con]));
  // ví sao cho app Ba Mẹ: «vay 30 · đã trả 30»
  const vi = await ss.viSao(fam, con);
  assert.deepEqual([vi.sao, vi.no, vi.tongVay, vi.daTraNo, vi.bayNgay.saoVay, vi.bayNgay.saoTraNo], [10, 0, 30, 30, 30, 30]);
  assert.ok(vi.lichSu.some((x) => x.kieu === "vay") && vi.lichSu.some((x) => x.kieu === "tra_no"));
});

test("hoàn tác duyệt nhiệm vụ đã trả nợ ⇒ nợ quay lại đúng như trước; Ba Mẹ cộng tay khi nợ cũng trả nợ; hoàn quà không trả nợ", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  await ss.choVay(fam, con, 15, bm);
  await tx(async (t) => { await v.khoaCon(t, con); await v.ghiDiem(t, con, -15, "choi", "Chơi"); });
  const id = await nv.taoNv(fam, { ten: "Đọc sách", diem: 10, bang_chung: "anh" });
  const luot = await nv.batDau(con, id);
  await nv.nop(con, luot, { anh: [anhGia("doc")] });
  await nv.duyet(fam, luot, bm, {});
  assert.deepEqual([(await ss.trangThaiSao(con)).sao, await v.noCua(con)], [-5, 5]);
  await nv.hoanTacDuyet(fam, luot, bm);
  assert.deepEqual([(await ss.trangThaiSao(con)).sao, await v.noCua(con), await v.soDu(con)], [-15, 15, 0]);
  await v.dieuChinhTay(fam, con, 20, "Sinh nhật", bm);
  assert.deepEqual([(await ss.trangThaiSao(con)).sao, await v.noCua(con), await v.soDu(con)], [5, 0, 5]);
});

test("cho vay song song không lệch; số sao sai ⇒ lỗi; nhà khác không cho vay được; hoàn tác 60 giây, đúng người, chưa tiêu", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Minh" });
  await Promise.all(Array.from({ length: 5 }, () => ss.choVay(fam, con, 10, bm)));
  assert.deepEqual([await v.soDu(con), await v.noCua(con)], [50, 50]);
  await loi(ss.choVay(fam, con, 0, bm), "so_sao_sai");
  await loi(ss.choVay(fam, con, 1001, bm), "so_sao_sai");
  await loi(ss.choVay((await taoNha("Hoa")).fam, con, 10, bm), "khong_thay");
  const t0 = new Date();
  const vay = await ss.choVay(fam, con, 15, bm, {}, undefined, t0);
  await loi(ss.hoanTacVay(fam, vay.id, "nguoi-khac", t0), "het_hoan_tac");
  await loi(ss.hoanTacVay(fam, vay.id, bm, new Date(t0.getTime() + 61_000)), "het_hoan_tac");
  await tx(async (t) => { await v.khoaCon(t, con); await v.ghiDiem(t, con, -60, "choi", "Chơi"); });   // còn 5 < 15
  await loi(ss.hoanTacVay(fam, vay.id, bm, t0), "da_tieu");
});

test("cảnh báo nợ > 1.000 (#266): −990 vay 20 ⇒ −1.010 có cảnh báo; vay thêm 5 ⇒ nhắc lại, vẫn cho vay được; Thông báo nhóm «Cảnh báo nợ» tắt được", async () => {
  const { fam, bm } = await taoNha();
  const me2 = (await one<{ id: string }>(`select id from parents where family_id = $1`, [fam]))!.id;
  const con = await g.taoCon(fam, { ten: "Bảo Anh" });
  await ss.choVay(fam, con, 990, bm);
  await tx(async (t) => { await v.khoaCon(t, con); await v.ghiDiem(t, con, -990, "choi", "Chơi"); });
  assert.equal((await ss.trangThaiSao(con)).sao, -990);
  let xt = await ss.xemTruocVay(fam, con, 20);
  assert.deepEqual([xt.nhacNo, xt.seCanhBao, xt.noSau], [null, true, 1010], "chưa quá mốc ⇒ chưa nhắc trên bảng, nhưng vay xong sẽ cảnh báo");
  const a = await ss.choVay(fam, con, 20, bm);
  assert.deepEqual([a.no, a.canhBaoNo?.vuotMoc, a.canhBaoNo?.cau], [1010, true, "Bảo Anh đã nợ quá 1.000 sao (đang nợ 1.010)"]);
  xt = await ss.xemTruocVay(fam, con, 5);
  assert.equal(xt.nhacNo, "Bảo Anh đã nợ quá 1.000 sao (đang nợ 1.010)", "bảng cho vay hiện dòng nhắc");
  const b = await ss.choVay(fam, con, 5, bm);
  assert.deepEqual([b.no, b.canhBaoNo?.vuotMoc, b.canhBaoNo?.cau], [1015, false, "Bảo Anh đã nợ quá 1.000 sao (đang nợ 1.015)"]);
  const cb = await q<{ noi_dung: string; muc: string }>(`select noi_dung, muc from alerts where family_id = $1 and loai = 'no_qua_1000' order by created_at`, [fam]);
  assert.equal(cb.length, 2, "mỗi lần vượt mốc / cho vay thêm khi đang nợ > 1.000 một cảnh báo");
  assert.equal(cb[0].muc, "chu_y");
  // dòng Thông báo của Ba Mẹ: nhóm canh_bao_no, có đẩy; tắt «Cảnh báo nợ» ⇒ vẫn có dòng, không đẩy
  const bmObj = (await one<any>(`select * from parents where id = $1`, [me2]))!;
  let ds = (await tb.dsThongBao(bmObj)).ds.filter((x) => x.nhom === "canh_bao_no");
  assert.equal(ds.length, 2);
  assert.ok(ds.every((x) => x.day));
  assert.ok(tb.NHOM_TB.includes("canh_bao_no") && tb.TEN_NHOM_TB.canh_bao_no === "Cảnh báo nợ");
  await tb.luuCaiDatTb(me2, { tat: ["canh_bao_no"] });
  ds = (await tb.dsThongBao(bmObj)).ds.filter((x) => x.nhom === "canh_bao_no");
  assert.ok(ds.length === 2 && ds.every((x) => !x.day));
  // không vượt mốc ⇒ không cảnh báo
  const con2 = await g.taoCon(fam, { ten: "Bảo Minh" });
  assert.equal((await ss.choVay(fam, con2, 1000, bm)).canhBaoNo, null);
});

test("trừ phút song song 2 máy: cùng chơi 10 phút trên 2 máy chỉ trừ ~10 sao (theo đồng hồ máy chủ); hết sao ⇒ dừng, không âm", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  await v.dieuChinhTay(fam, con, 100, "Thưởng", bm);
  const t0 = new Date("2026-11-15T10:00:00Z");
  // hai máy báo mỗi 30 giây, mỗi lần 0,5 phút, lệch nhau 10 giây
  for (let i = 1; i <= 20; i++) {
    await ss.truPhutChoi(con, 0.5, new Date(t0.getTime() + i * 30_000), { muc: "roblox.exe" });
    await ss.truPhutChoi(con, 0.5, new Date(t0.getTime() + i * 30_000 + 10_000), { muc: "youtube.com" });
  }
  const tru = 100 - (await v.soDu(con));
  assert.ok(tru >= 10 && tru <= 11, `trừ ${tru} sao cho ~10 phút 10 giây đồng hồ`);
  // gọi đồng thời (2 máy cùng lúc) ⇒ khoá dòng Con, không trừ đôi
  const t1 = new Date(t0.getTime() + 3600_000);
  await Promise.all([ss.truPhutChoi(con, 1, t1), ss.truPhutChoi(con, 1, t1)]);
  assert.equal(100 - (await v.soDu(con)), tru + 1, "cùng một phút đồng hồ chỉ trừ 1 sao");
  // hết sao: không trừ quá, không ghi nợ
  await ss.truPhutChoi(con, 500, new Date(t1.getTime() + 600 * 60_000));
  assert.deepEqual([await v.soDu(con), await v.noCua(con), (await ss.trangThaiSao(con)).hetSao], [0, 0, true]);
  // «Mở hết» ⇒ không trừ sao
  await v.dieuChinhTay(fam, con, 10, "Thưởng", bm);
  await q(`update children set che_do_chan = 'mo_het' where id = $1`, [con]);
  await ss.truPhutChoi(con, 5, new Date(t1.getTime() + 700 * 60_000));
  assert.equal(await v.soDu(con), 10);
});

test("đồng bộ agent: phút app «Tính phút» báo thêm ⇒ trừ sao; app «Không tính phút» không trừ; 2 máy cùng chơi không trừ đôi; Ba Mẹ dùng máy (mã) không trừ", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "An" });
  await luonChoiDuoc(con);
  await v.dieuChinhTay(fam, con, 50, "Thưởng", bm);
  await la.datLuat(fam, { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" });
  await la.datLuat(fam, { muc: "tudien.exe", ten: "Từ điển", loai: "hoc" });
  const a = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop");
  const b = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "PC");
  await dv(a.token, "dong-bo", { usage: [{ muc: "roblox.exe", phut: 5 }, { muc: "tudien.exe", phut: 30 }] });
  assert.equal(await v.soDu(con), 45, "lần đầu: 5 phút Roblox = 5 sao; Từ điển không tính");
  // máy B báo 5 phút ngay sau (đồng hồ chưa trôi) ⇒ không trừ đôi
  await dv(b.token, "dong-bo", { usage: [{ muc: "roblox.exe", phut: 5 }] });
  assert.equal(await v.soDu(con), 45);
  // gửi lại cùng tổng ⇒ không tính lại
  await q(`update choi_dong_ho set phu_den = now() - interval '10 minutes' where child_id = $1`, [con]);
  await dv(a.token, "dong-bo", { usage: [{ muc: "roblox.exe", phut: 5 }] });
  assert.equal(await v.soDu(con), 45);
  await dv(a.token, "dong-bo", { usage: [{ muc: "roblox.exe", phut: 8 }] });
  assert.equal(await v.soDu(con), 42);
  // Ba Mẹ đang dùng máy bằng mã ⇒ phút không tính cho con
  await q(`update devices set ba_me_den = now() + interval '30 minutes' where id = $1`, [a.deviceId]);
  await q(`update choi_dong_ho set phu_den = now() - interval '10 minutes' where child_id = $1`, [con]);
  await dv(a.token, "dong-bo", { usage: [{ muc: "roblox.exe", phut: 15 }] });
  assert.equal(await v.soDu(con), 42);
});

test("tương thích agent cũ: Policy.quy (conPhut = sao, ngayPhut + themPhut − daDung = sao), soDu ≥ 0, ngoaiLe [], windows.quyConPhut; trường mới sao/no/hetSao", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Bi" });
  await luonChoiDuoc(con);
  await la.datLuat(fam, { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" });
  const a = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "Laptop");
  await v.dieuChinhTay(fam, con, 20, "Thưởng", bm);
  await dv(a.token, "dong-bo", { usage: [{ muc: "roblox.exe", phut: 12 }] });
  let p = (await dv(a.token, "dong-bo", {})).body;
  assert.deepEqual([p.quy.conPhut, p.quy.ngayPhut + p.quy.themPhut - p.quy.daDung, p.soDu, p.ngoaiLe], [8, 8, 8, []]);
  assert.deepEqual([p.windows.quyConPhut, p.windows.appTinhGio, p.windows.sao], [8, ["roblox.exe"], 8]);
  assert.deepEqual([p.sao.sao, p.sao.no, p.sao.phutCon, p.sao.hetSao, p.sao.cau.phut], [8, 0, 8, false, "còn 8 sao = 8 phút chơi"]);
  // tiêu hết, Ba Mẹ cho vay 15, tiêu 15 ⇒ số dư −15: trường cũ không âm (soDu 0, conPhut 0), trường mới âm
  await tx(async (t) => { await v.khoaCon(t, con); await v.ghiDiem(t, con, -8, "doi_qua", "Quà"); });
  await ss.choVay(fam, con, 15, bm);
  await tx(async (t) => { await v.khoaCon(t, con); await v.ghiDiem(t, con, -15, "choi", "Chơi"); });
  p = (await dv(a.token, "dong-bo", {})).body;
  assert.deepEqual([p.soDu, p.quy.conPhut, p.windows.quyConPhut, p.windows.appTinhGio, p.windows.allowedApps.includes("roblox.exe")], [0, 0, 0, [], false]);
  assert.deepEqual([p.sao.sao, p.sao.no, p.sao.hetSao, p.sao.cau.soDu, p.sao.cau.no, p.windows.sao], [-15, 15, true, "−15 sao", "Đang nợ Ba Mẹ 15 sao · sao nhiệm vụ trả nợ trước", -15]);
});

test("API Ba Mẹ: gia-dinh có số sao từng Con (âm được); ví sao; xem trước + cho vay; báo cáo theo sao; tạo Con tặng 30 sao (chọn 0/20/30/60)", async () => {
  const { fam, bm } = await taoNha();
  const tok = await taoPhien(bm);
  const anh = (await m(tok, "con", { ten: "Bảo Anh" })).body.id;
  const minh = (await m(tok, "con", { ten: "Bảo Minh", saoKhoiDau: 60 })).body.id;
  assert.equal((await m(tok, "con", { ten: "X", saoKhoiDau: 15 })).body.error, "sao_khoi_dau_sai");
  let gd = (await m(tok, "gia-dinh")).body.con;
  assert.deepEqual(gd.map((c: any) => [c.ten, c.sao, c.no]), [["Bảo Anh", 30, 0], ["Bảo Minh", 60, 0]]);
  const xt = (await m(tok, `con/${anh}/cho-vay/xem-truoc?soSao=30`)).body;
  assert.deepEqual([xt.mucVay, xt.macDinh, xt.cau], [[10, 15, 30], 15, "= 30 phút chơi hoặc đổi quà · Bảo Anh sẽ nợ 30 sao"]);
  const cv = await m(tok, `con/${anh}/cho-vay`, { soSao: 30, mucDich: "choi" });
  assert.deepEqual([cv.status, cv.body.no, cv.body.sao, cv.body.phutCon], [200, 30, 30, 60]);
  await tx(async (t) => { await v.khoaCon(t, anh); await v.ghiDiem(t, anh, -60, "choi", "Chơi YouTube 60 phút"); });
  gd = (await m(tok, "gia-dinh")).body.con;
  assert.deepEqual([gd[0].sao, gd[0].no, gd[0].hetSao], [-30, 30, true]);
  const vs = (await m(tok, `con/${anh}/vi-sao`)).body;
  assert.deepEqual([vs.sao, vs.no, vs.tongVay, vs.cau.soDu, vs.lichSu[0].kieu], [-30, 30, 30, "−30 sao", "choi"]);
  const bc = (await m(tok, `con/${anh}/bao-cao?bay=1`)).body.tuanNay;
  assert.deepEqual([bc.saoKiem, bc.saoVay, bc.lanVay, bc.saoTieu, bc.saoTieuChoi, bc.ngoaiLe], [0, 30, 1, 60, 60, 1]);
  assert.equal((await m(tok, `vay/${cv.body.id}/hoan-tac`, {})).body.error, "da_tieu");
  void minh;
});
