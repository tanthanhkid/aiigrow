// #267 «một Con một máy, một Con nhiều máy, một máy nhiều Con» — bảng nối device_children (lib/may-nhieu-con.ts).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const { taoPhien } = await import("./auth.ts");
const { xuLyM } = await import("./api-m.ts");
const { xuLyMay } = await import("./api-may.ts");
const { q, one } = await import("./db.ts");
const { taoNha, taoBaMe } = await import("./test-fixtures/nha.ts");
const { SCHEMA_MAY_NHIEU_CON } = await import("./schema.ts");
const mnc = await import("./may-nhieu-con.ts");
const v = await import("./vi.ts");

type Kq = { status: number; body: any };
async function goi(f: typeof xuLyM, goc: string, duong: string, o: { tok?: string; body?: unknown; hdr?: Record<string, string> } = {}): Promise<Kq> {
  const r = await f(new Request(`http://app.test/api/${goc}/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}), ...(o.hdr ?? {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  }), duong.split("?")[0].split("/"));
  return { status: r.status, body: await r.json() };
}
const m = (d: string, o?: { tok?: string; body?: unknown }) => goi(xuLyM, "m", d, o);
const dv = (d: string, o?: { tok?: string; body?: unknown; hdr?: Record<string, string> }) => goi(xuLyMay, "device", d, o);

async function nha() {
  const { fam, bm } = await taoNha("Mẹ Lan");
  const a = await g.taoCon(fam, { ten: "Bảo Anh" });
  const b = await g.taoCon(fam, { ten: "Bảo Minh" });
  return { fam, bm, a, b, tok: await taoPhien(bm) };
}
const ghep = async (fam: string, con: string | null, ten: string, nen = "windows", conDs?: string[]) =>
  g.ghepMay(await g.taoMaGhep(fam, con, nen, { conDs }), nen, ten);
const cot = (id: string) => one<{ child_id: string | null; dung_chung: boolean }>(`select child_id, dung_chung from devices where id = $1`, [id]);
const noi = async (id: string) => (await mnc.idConMay(id)).sort();
const { CHUYEN_DOI_MAY_NHIEU_CON } = await import("./schema.ts");
/** Chạy lại khối lược đồ #267; `moi` = xoá dấu «đã chuyển» trước (giả lập DB chưa chuyển). */
const chay = async (moi = true) => {
  if (moi) await q(`delete from _chuyen_doi where ten = $1`, [CHUYEN_DOI_MAY_NHIEU_CON]);
  for (const c of SCHEMA_MAY_NHIEU_CON) await q(c);
};

// ---------------------------------------------------------------- chuyển dữ liệu
test("chuyển dữ liệu: máy riêng cũ ⇒ nối child_id; máy dùng chung cũ ⇒ mọi Con; iPad dùng chung cũ ⇒ một Con; chạy lại không đổi; Ba Mẹ sửa rồi chạy lại vẫn giữ", async () => {
  const { fam, a, b, tok } = await nha();
  const rieng = await ghep(fam, a, "Laptop");
  const chung = await ghep(fam, null, "PC phòng khách");
  const ipad = await ghep(fam, a, "iPad", "ios");
  // dựng lại dữ liệu kiểu cũ (trước #267): không dòng nối, chỉ cột child_id / dung_chung
  await q(`delete from device_children where family_id = $1`, [fam]);
  await q(`update devices set child_id = null, dung_chung = true where id = $1`, [chung.deviceId]);
  await q(`update devices set child_id = null, dung_chung = true, con_dang_dung = $2 where id = $1`, [ipad.deviceId, b]);
  await chay();
  assert.deepEqual(await noi(rieng.deviceId), [a]);
  assert.deepEqual(await noi(chung.deviceId), [a, b].sort());
  assert.deepEqual(await noi(ipad.deviceId), [b], "iPad dùng chung cũ ⇒ bé đang dùng");
  assert.deepEqual(await cot(rieng.deviceId), { child_id: a, dung_chung: false });
  assert.deepEqual(await cot(chung.deviceId), { child_id: null, dung_chung: true });
  assert.deepEqual(await cot(ipad.deviceId), { child_id: b, dung_chung: false });
  // chạy lại: không đổi
  await chay();
  assert.deepEqual(await noi(chung.deviceId), [a, b].sort());
  assert.equal((await q(`select 1 from device_children where family_id = $1`, [fam])).length, 4);
  // Ba Mẹ đổi máy chung thành máy riêng của Bảo Minh ⇒ chạy lại lược đồ không nối lại cả nhà
  assert.equal((await m(`may/${chung.deviceId}/con`, { tok, body: { ds: [b] } })).status, 200);
  await chay();
  assert.deepEqual(await noi(chung.deviceId), [b]);
  assert.deepEqual(await cot(chung.deviceId), { child_id: b, dung_chung: false });
  // đã đánh dấu chuyển ⇒ mở DB lại không quét nữa (máy 0 Con đang chờ gán không bị nối lại cả nhà)
  await q(`delete from device_children where device_id = $1`, [chung.deviceId]);
  await chay(false);
  assert.deepEqual(await noi(chung.deviceId), []);
  assert.equal((await one(`select 1 from _chuyen_doi where ten = $1`, [CHUYEN_DOI_MAY_NHIEU_CON])) !== undefined, true);
  await m(`may/${chung.deviceId}/con`, { tok, body: { ds: [b] } });
  // máy cũ vẫn đồng bộ được, không phải ghép lại
  assert.equal((await dv("dong-bo", { tok: rieng.token, body: {} })).body.con.id, a);
});

// ---------------------------------------------------------------- gán / bỏ gán
test("gán / bỏ gán: POST may/:id/con {ds}, con/:con/gan, con/:con/bo; ≥ 1 Con; bỏ bé đang dùng ⇒ thả ra; Người trông giúp không đổi được", async () => {
  const { fam, a, b, tok } = await nha();
  const may = await ghep(fam, a, "Laptop");
  assert.deepEqual([may.dungChung, may.conDs.map((c: any) => c.id)], [false, [a]]);
  // gán thêm ⇒ máy chung
  const r1 = await m(`may/${may.deviceId}/con/${b}/gan`, { tok, body: {} });
  assert.equal(r1.status, 200);
  assert.deepEqual([r1.body.may.mayChung, r1.body.may.soCon, r1.body.them], [true, 2, [b]]);
  assert.deepEqual(await cot(may.deviceId), { child_id: null, dung_chung: true });
  assert.equal((await dv("dong-bo", { tok: may.token, body: {} })).body.canChonCon, true, "máy chung chưa ai vào ⇒ màn chọn tên");
  // gán lại cùng bé: không đổi
  assert.deepEqual((await m(`may/${may.deviceId}/con/${b}/gan`, { tok, body: {} })).body.them, []);
  // Bảo Minh vào máy, rồi Ba Mẹ bỏ gán Bảo Minh ⇒ thả ra, phiên Con mất
  const vao = await dv("dang-nhap-be", { tok: may.token, body: { con: b } });
  assert.equal(vao.status, 200);
  assert.equal((await m(`may/${may.deviceId}/con`, { tok })).body.dangDung.id, b);
  const r2 = await m(`may/${may.deviceId}/con/${b}/bo`, { tok, body: {} });
  assert.deepEqual([r2.status, r2.body.bo, r2.body.may.mayRieng], [200, [b], true]);
  assert.equal((await one<{ con_dang_dung: string | null }>(`select con_dang_dung from devices where id = $1`, [may.deviceId]))!.con_dang_dung, null);
  assert.equal((await q(`select 1 from kid_sessions where device_id = $1 and child_id = $2`, [may.deviceId, b])).length, 0);
  assert.deepEqual(await cot(may.deviceId), { child_id: a, dung_chung: false });
  // bỏ bé cuối ⇒ 400 can_mot_con
  const r3 = await m(`may/${may.deviceId}/con/${a}/bo`, { tok, body: {} });
  assert.deepEqual([r3.status, r3.body.error], [400, "can_mot_con"]);
  assert.equal((await m(`may/${may.deviceId}/con`, { tok, body: { ds: [] } })).body.error, "can_mot_con");
  // đặt cả danh sách; Con nhà khác ⇒ 404
  const khac = await nha();
  assert.equal((await m(`may/${may.deviceId}/con`, { tok, body: { ds: [a, khac.a] } })).status, 404);
  assert.equal((await m(`may/${may.deviceId}/con`, { tok, body: { ds: [a, b] } })).body.may.mayChung, true);
  // máy nhà khác ⇒ 404; Người trông giúp ⇒ 403
  assert.equal((await m(`may/${may.deviceId}/con`, { tok: khac.tok })).status, 404);
  const tg = await taoPhien(await taoBaMe(fam, "Bà", "trong_giup"));
  assert.equal((await m(`may/${may.deviceId}/con`, { tok: tg, body: { ds: [a] } })).status, 403);
  assert.equal((await m(`may/${may.deviceId}/con`, { tok: tg })).status, 200, "Người trông giúp xem được");
  // nhật ký
  assert.ok((await q(`select 1 from events where device_id = $1 and loai = 'doi_con_may'`, [may.deviceId])).length >= 3);
});

test("GET may/:id/con: mọi Con trong nhà kèm gán / đang dùng / sao / máy khác / khoá Con; danh sách máy kèm conDs + dangDung + khoaMay", async () => {
  const { fam, a, b, tok } = await nha();
  await v.dieuChinhTay(fam, b, 25, "Thưởng", (await one<{ id: string }>(`select id from parents where family_id = $1`, [fam]))!.id);
  const lap = await ghep(fam, a, "Laptop của Anh");
  const chung = await ghep(fam, null, "Máy cả nhà", "windows", [a, b]);
  assert.deepEqual([chung.dungChung, chung.conDs.length, "childName" in chung], [true, 2, false]);
  await dv("dang-nhap-be", { tok: chung.token, body: { con: b } });
  const ct = (await m(`may/${chung.deviceId}/con`, { tok })).body;
  assert.deepEqual([ct.may.mayChung, ct.may.soCon, ct.dangDung.id, ct.khoaMay.khoa], [true, 2, b, false]);
  const minh = ct.ds.find((c: any) => c.id === b), anh = ct.ds.find((c: any) => c.id === a);
  assert.deepEqual([minh.gan, minh.dangDung, minh.sao], [true, true, 25]);
  assert.ok(minh.lanCuoi);
  assert.deepEqual(anh.mayKhac, [{ id: lap.deviceId, ten: "Laptop của Anh", nen: "windows", rieng: true }]);
  assert.deepEqual(anh.khoaCon, { khoa: false, den: null });
  // danh sách tuân thủ: trường cũ + mới
  const ds = (await m("tuan-thu", { tok })).body.ds;
  const x = ds.find((d: any) => d.id === chung.deviceId), y = ds.find((d: any) => d.id === lap.deviceId);
  assert.deepEqual([x.con, x.dungChung, x.soCon, x.dangDung.id, x.khoaMay], [null, true, 2, b, { khoa: false, den: null }]);
  assert.deepEqual([y.con, y.dungChung, y.conDs.map((c: any) => c.id), y.dangDung.id], [a, false, [a], a]);
  // chi tiết tuân thủ: khoaMay + từng Con đã gán
  const tt = (await m(`may/${chung.deviceId}/tuan-thu`, { tok })).body;
  assert.deepEqual(tt.khoaMay, { khoa: false, den: null });
  assert.deepEqual(tt.tungCon.map((c: any) => c.id).sort(), [a, b].sort());
  // hồ sơ Con: chỉ máy nối với Con
  assert.deepEqual((await m(`con/${a}`, { tok })).body.may.map((d: any) => d.id).sort(), [lap.deviceId, chung.deviceId].sort());
  assert.deepEqual((await m(`con/${b}`, { tok })).body.may.map((d: any) => d.id), [chung.deviceId]);
  // trạng thái ghép trả conDs
  const p = await m("ghep-may", { tok, body: { conDs: [a, b] } });
  assert.deepEqual([p.status, p.body.mayChung, p.body.conDs], [200, true, [a, b]]);
  assert.deepEqual((await m(`ghep-may/${p.body.ma}`, { tok })).body.conDs, [a, b]);
});

// ---------------------------------------------------------------- iPhone / iPad một Con
test("iPhone/iPad chỉ một Con: gán thêm / ds 2 Con ⇒ 409 ios_mot_con; ghép mã nhiều Con phải chọn một; đổi sang Con khác được", async () => {
  const { fam, a, b, tok } = await nha();
  const ipad = await ghep(fam, a, "iPad", "ios");
  const r = await m(`may/${ipad.deviceId}/con/${b}/gan`, { tok, body: {} });
  assert.deepEqual([r.status, r.body.error], [409, "ios_mot_con"]);
  assert.match(r.body.message, /một bé/);
  assert.equal((await m(`may/${ipad.deviceId}/con`, { tok, body: { ds: [a, b] } })).body.error, "ios_mot_con");
  assert.equal((await m(`may/${ipad.deviceId}/gan-con`, { tok, body: { con: [a, b] } })).body.error, "ios_mot_con");
  assert.deepEqual(await noi(ipad.deviceId), [a]);
  // «Máy này ai dùng?» trên iPad: Bảo Minh không gán được, kèm lý do
  const ct = (await m(`may/${ipad.deviceId}/con`, { tok })).body;
  assert.equal(ct.may.motCon, true);
  const minh = ct.ds.find((c: any) => c.id === b);
  assert.deepEqual([minh.gan, minh.ganDuoc, typeof minh.lyDo], [false, false, "string"]);
  // phiên ghép gắn loại iOS cho 2 Con ⇒ từ chối
  assert.equal((await m("ghep-may", { tok, body: { conDs: [a, b], nen: "ios" } })).body.error, "ios_mot_con");
  // mã không gắn loại cho 2 Con, máy hoá ra iPhone: thiếu `con` ⇒ 409 kèm conChon; có `con` ⇒ nối đúng Con đó; mã không bị đốt khi lỗi
  const ma = await g.taoMaGhep(fam, null, "", { conDs: [a, b] });
  const loi = await dv("ghep", { body: { ma, nen: "ios", tenMay: "iPhone" } });
  assert.deepEqual([loi.status, loi.body.error, loi.body.conChon.map((c: any) => c.id)], [409, "ios_mot_con", [a, b]]);
  const ok = await dv("ghep", { body: { ma, nen: "ios", tenMay: "iPhone của Minh", con: b } });
  assert.equal(ok.status, 200);
  assert.deepEqual([ok.body.dungChung, ok.body.childName], [false, "Bảo Minh"]);
  assert.deepEqual(await noi(ok.body.deviceId), [b]);
  // cùng mã cho Windows thì nối cả 2 (mã khác)
  const ma2 = await g.taoMaGhep(fam, null, "", { conDs: [a, b] });
  assert.deepEqual(await noi((await dv("ghep", { body: { ma: ma2, nen: "windows", tenMay: "PC" } })).body.deviceId), [a, b].sort());
  // gói cài nhiều Con + iPhone
  const p = (await m("ghep-may", { tok, body: { conDs: [a, b] } })).body;
  assert.equal((await dv("ghep-goi", { body: { token: p.tokenGoi, nen: "ios", tenMay: "iPad 2" } })).body.error, "ios_mot_con");
  const g2 = await dv("ghep-goi", { body: { token: p.tokenGoi, nen: "ios", tenMay: "iPad 2", con: a } });
  assert.equal(g2.status, 200);
  assert.deepEqual(await noi(g2.body.deviceId), [a]);
  // đổi iPad sang Con khác (một Con) vẫn được
  assert.equal((await m(`may/${ipad.deviceId}/con`, { tok, body: { ds: [b] } })).status, 200);
  assert.deepEqual(await cot(ipad.deviceId), { child_id: b, dung_chung: false });
});

// ---------------------------------------------------------------- máy chung: chỉ Con được gán, đổi người
test("máy chung: chỉ Con được gán hiện ở «Ai đang dùng máy?» (kèm sao) và vào được; X-Phien-Con của Con không gán bị bỏ qua; «Đổi người» kết thúc phiên bé trước", async () => {
  const { fam, a, b, tok } = await nha();
  const c = await g.taoCon(fam, { ten: "Bé Ba" });
  const chung = await ghep(fam, null, "Máy cả nhà", "windows", [a, b]);
  const hs = (await dv("ho-so", { tok: chung.token })).body;
  assert.deepEqual(hs.con.map((x: any) => x.id).sort(), [a, b].sort());
  assert.deepEqual([hs.mayChung, hs.soCon, hs.tenMay, hs.motCon, typeof hs.con[0].sao], [true, 2, "Máy cả nhà", false, "number"]);
  assert.equal((await dv("dang-nhap-be", { tok: chung.token, body: { con: c } })).status, 404, "Con không gán không vào được");
  assert.equal((await dv("chon-con", { tok: chung.token, body: { con: c } })).status, 404, "agent cũ chọn tên cũng vậy");
  assert.equal((await dv("quen-pin", { tok: chung.token, body: { con: c } })).status, 404);
  // phiên Con của bé không gán (lấy từ máy khác) ⇒ không tính trên máy chung
  const rieng = await ghep(fam, c, "Laptop Bé Ba");
  const pc = (await dv("dang-nhap-be", { tok: rieng.token, body: { con: c } })).body.phienCon;
  assert.equal((await dv("dong-bo", { tok: chung.token, body: {}, hdr: { "x-phien-con": pc } })).body.con, null);
  // Bảo Anh vào, mở phiên chơi trên máy; Bảo Minh vào ⇒ phiên Con + phiên chơi của Bảo Anh trên máy kết thúc
  const pa = (await dv("dang-nhap-be", { tok: chung.token, body: { con: a } })).body.phienCon;
  assert.equal((await dv("dong-bo", { tok: chung.token, body: {}, hdr: { "x-phien-con": pa } })).body.con.id, a);
  await q(`insert into play_sessions(id, child_id, device_id, muc, nhom, gia_phan_nghin, toi_da_phut) values ('ps-a', $1, $2, 'roblox.exe', 'game', 0, 60)`, [a, chung.deviceId]);
  await dv("dang-nhap-be", { tok: chung.token, body: { con: b } });
  assert.equal((await q(`select 1 from kid_sessions where device_id = $1 and child_id = $2`, [chung.deviceId, a])).length, 0);
  assert.equal((await one<{ trang_thai: string }>(`select trang_thai from play_sessions where id = 'ps-a'`))!.trang_thai, "ket_thuc");
  assert.equal((await dv("dong-bo", { tok: chung.token, body: {} })).body.con.id, b, "bé đang dùng = Bảo Minh");
  assert.equal((await dv("dong-bo", { tok: chung.token, body: {}, hdr: { "x-phien-con": pa } })).body.con.id, b, "phiên cũ của Bảo Anh hết hiệu lực");
  // đăng xuất ⇒ khoá (chưa ai vào), phiên chơi của Bảo Minh dừng
  await q(`insert into play_sessions(id, child_id, device_id, muc, nhom, gia_phan_nghin, toi_da_phut) values ('ps-b', $1, $2, 'roblox.exe', 'game', 0, 60)`, [b, chung.deviceId]);
  assert.equal((await dv("dang-xuat", { tok: chung.token, body: {} })).status, 200);
  assert.equal((await one<{ trang_thai: string }>(`select trang_thai from play_sessions where id = 'ps-b'`))!.trang_thai, "ket_thuc");
  const p = (await dv("dong-bo", { tok: chung.token, body: {} })).body;
  assert.deepEqual([p.con, p.canChonCon], [null, true]);
});

// ---------------------------------------------------------------- khoá theo máy vs theo Con
test("khoá theo máy (máy chung) khoá mọi Con trên máy đó, máy riêng vẫn dùng; khoá theo Con khoá mọi máy của Con, máy chung chỉ khi Con đó đang dùng", async () => {
  const { fam, a, b, tok } = await nha();
  const lap = await ghep(fam, a, "Laptop của Anh");
  const chung = await ghep(fam, null, "Máy cả nhà", "windows", [a, b]);
  const khoaNgay = async (tk: string, hdr?: Record<string, string>) => (await dv("dong-bo", { tok: tk, body: {}, hdr })).body.khoaNgay;
  const pa = (await dv("dang-nhap-be", { tok: chung.token, body: { con: a } })).body.phienCon;
  // khoá máy chung
  assert.equal((await m(`may/${chung.deviceId}/khoa`, { tok, body: { khoa: true } })).body.khoa, true);
  assert.equal(await khoaNgay(chung.token, { "x-phien-con": pa }), true, "Bảo Anh trên máy chung bị khoá");
  const pb = (await dv("dang-nhap-be", { tok: chung.token, body: { con: b } })).body.phienCon;
  assert.equal(await khoaNgay(chung.token, { "x-phien-con": pb }), true, "Bảo Minh trên máy chung cũng khoá");
  assert.equal(await khoaNgay(lap.token), false, "máy riêng của Bảo Anh vẫn dùng");
  assert.deepEqual((await m(`may/${chung.deviceId}/tuan-thu`, { tok })).body.khoaMay.khoa, true, "may/:id/tuan-thu trả khoaMay");
  await m(`may/${chung.deviceId}/khoa`, { tok, body: { khoa: false } });
  // khoá theo Con: Bảo Anh
  assert.equal((await m(`con/${a}/khoa`, { tok, body: { khoa: true } })).status, 200);
  assert.equal(await khoaNgay(lap.token), true, "máy riêng của Bảo Anh khoá");
  assert.equal(await khoaNgay(chung.token, { "x-phien-con": pb }), false, "Bảo Minh đang dùng máy chung ⇒ không khoá");
  const pa2 = (await dv("dang-nhap-be", { tok: chung.token, body: { con: a } })).body.phienCon;
  assert.equal(await khoaNgay(chung.token, { "x-phien-con": pa2 }), true, "Bảo Anh vào máy chung ⇒ khoá phần Bảo Anh");
  const ct = (await m(`may/${chung.deviceId}/con`, { tok })).body;
  assert.deepEqual([ct.ds.find((c: any) => c.id === a).khoaCon.khoa, ct.ds.find((c: any) => c.id === b).khoaCon.khoa, ct.khoaMay.khoa], [true, false, false]);
});

// ---------------------------------------------------------------- tương thích trường cũ
test("tương thích: gan-con {con} chuỗi = máy riêng; ghép mã không Con = cả nhà (dungChung true); xoá Con khỏi máy chung còn 2 Con giữ máy chung; cột cũ luôn khớp bảng nối", async () => {
  const { fam, a, b, tok } = await nha();
  const c = await g.taoCon(fam, { ten: "Bé Ba" });
  const chung = await ghep(fam, null, "PC");
  assert.deepEqual([chung.dungChung, (await noi(chung.deviceId)).length], [true, 3]);
  // đường cũ gan-con {con}: thành máy riêng của đúng Con đó
  assert.equal((await m(`may/${chung.deviceId}/gan-con`, { tok, body: { con: b } })).status, 200);
  assert.deepEqual([await noi(chung.deviceId), await cot(chung.deviceId)], [[b], { child_id: b, dung_chung: false }]);
  assert.equal((await dv("dong-bo", { tok: chung.token, body: {} })).body.con.id, b);
  // gan-con {con: [..]} = danh sách
  await m(`may/${chung.deviceId}/gan-con`, { tok, body: { con: [a, b, c] } });
  assert.deepEqual(await cot(chung.deviceId), { child_id: null, dung_chung: true });
  // xoá Bé Ba: máy chung còn 2 Con ⇒ vẫn máy chung, không nằm trong «mayChuyenDungChung»
  const x = await m(`con/${c}/xoa`, { tok, body: { xacNhan: true } });
  assert.deepEqual([x.status, x.body.mayChuyenDungChung], [200, []]);
  assert.deepEqual([await noi(chung.deviceId), await cot(chung.deviceId)], [[a, b].sort(), { child_id: null, dung_chung: true }]);
  // xoá Bảo Minh: còn Bảo Anh ⇒ máy riêng Bảo Anh
  await m(`con/${b}/xoa`, { tok, body: { xacNhan: true } });
  assert.deepEqual(await cot(chung.deviceId), { child_id: a, dung_chung: false });
  // iPad riêng của bé bị xoá, nhà còn ≥ 2 Con ⇒ chưa nối ai (khoá, Ba Mẹ chọn lại)
  const n = await nha();
  await g.taoCon(n.fam, { ten: "Út" });
  const ipad = await ghep(n.fam, n.a, "iPad", "ios");
  const r = await m(`con/${n.a}/xoa`, { tok: n.tok, body: { xacNhan: true } });
  assert.deepEqual(r.body.mayChuyenDungChung, [{ id: ipad.deviceId, ten: "iPad" }]);
  assert.deepEqual([await noi(ipad.deviceId), await cot(ipad.deviceId)], [[], { child_id: null, dung_chung: true }]);
  const pi = (await dv("dong-bo", { tok: ipad.token, body: {} })).body;
  assert.deepEqual([pi.con, pi.canChonCon], [null, true], "máy 0 Con không chạy tự do: chờ chọn, không bé nào vào được");
  assert.deepEqual((await dv("ho-so", { tok: ipad.token })).body.con, []);
});

test("máy 0 Con (ghép mã cũ khi nhà chưa có Con) khoá chờ; Con mới tự nối vào máy chung / máy 0 Con (không iPhone, không máy riêng); Ba Mẹ bỏ gán được", async () => {
  const { fam, bm } = await taoNha("Ba Tùng");
  const tok = await taoPhien(bm);
  const pc = await ghep(fam, null, "PC");
  assert.deepEqual([pc.dungChung, await cot(pc.deviceId)], [true, { child_id: null, dung_chung: true }]);
  assert.deepEqual([(await dv("dong-bo", { tok: pc.token, body: {} })).body.canChonCon, (await dv("dong-bo", { tok: pc.token, body: {} })).body.con], [true, null]);
  const a = await g.taoCon(fam, { ten: "An" });
  assert.deepEqual(await cot(pc.deviceId), { child_id: a, dung_chung: false }, "bé đầu tiên ⇒ máy riêng của bé");
  const lap = await ghep(fam, a, "Laptop An");
  const ipad = await ghep(fam, a, "iPad An", "ios");
  const b = await g.taoCon(fam, { ten: "Bình" });
  assert.deepEqual([await noi(pc.deviceId), await noi(lap.deviceId), await noi(ipad.deviceId)], [[a], [a], [a]], "máy riêng không tự thêm bé");
  await m(`may/${pc.deviceId}/con`, { tok, body: { ds: [a, b] } });
  const c = await g.taoCon(fam, { ten: "Chi" });
  assert.deepEqual(await noi(pc.deviceId), [a, b, c].sort(), "máy chung tự có bé mới");
  assert.equal((await m(`may/${pc.deviceId}/con/${c}/bo`, { tok, body: {} })).status, 200);
  assert.deepEqual(await noi(pc.deviceId), [a, b].sort());
});

test("gán song song không mất lần nào; roiMay máy riêng dừng phiên chơi; ghep-may conDs rỗng ⇒ dùng con; xoá Con dọn mã / gói cài nhiều Con", async () => {
  const { fam, a, b, tok } = await nha();
  const c = await g.taoCon(fam, { ten: "Bé Ba" });
  const pc = await ghep(fam, a, "PC");
  await Promise.all([m(`may/${pc.deviceId}/con/${b}/gan`, { tok, body: {} }), m(`may/${pc.deviceId}/con/${c}/gan`, { tok, body: {} })]);
  assert.deepEqual(await noi(pc.deviceId), [a, b, c].sort());
  // máy riêng: đăng xuất khi chưa ghi con_dang_dung vẫn dừng phiên chơi của Con của máy
  const lap = await ghep(fam, a, "Laptop");
  await q(`insert into play_sessions(id, child_id, device_id, muc, nhom, gia_phan_nghin, toi_da_phut) values ('ps-r', $1, $2, 'roblox.exe', 'game', 0, 60)`, [a, lap.deviceId]);
  await dv("dang-xuat", { tok: lap.token, body: {} });
  assert.equal((await one<{ trang_thai: string }>(`select trang_thai from play_sessions where id = 'ps-r'`))!.trang_thai, "ket_thuc");
  // conDs rỗng ⇒ con
  const p = (await m("ghep-may", { tok, body: { conDs: [], con: b } })).body;
  assert.deepEqual([p.con, p.conDs, p.mayChung], [b, [b], false]);
  // mã / gói cài cho [a, c] và [b, c]: xoá c ⇒ còn 1 Con ⇒ về child_id
  const p1 = (await m("ghep-may", { tok, body: { conDs: [a, c] } })).body;
  const p2 = (await m("ghep-may", { tok, body: { conDs: [b, c] } })).body;
  assert.equal((await m(`con/${c}/xoa`, { tok, body: { xacNhan: true } })).status, 200);
  const r1 = (await one<{ child_id: string | null; con_ds: unknown }>(`select child_id, con_ds from pair_codes where code = $1`, [p1.ma]))!;
  assert.deepEqual([r1.child_id, r1.con_ds], [a, null]);
  assert.equal((await one<{ child_id: string | null }>(`select child_id from pair_codes where code = $1`, [p2.ma]))!.child_id, b);
  assert.equal((await q(`select 1 from goi_cai where family_id = $1 and con_ds ? $2`, [fam, c])).length, 0);
  // ghép bằng mã p1 ⇒ máy riêng của a
  const gh = await dv("ghep", { body: { ma: p1.ma, nen: "windows", tenMay: "PC 2" } });
  assert.deepEqual(await noi(gh.body.deviceId), [a]);
});
