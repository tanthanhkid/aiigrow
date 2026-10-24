// Issue #68 / #70 (QA 24/10, phần web Ba Mẹ + máy chủ): một nguồn mức bảo vệ, chọn app đã thấy, tên nhiệm vụ tối thiểu, thẻ «Đang chơi», «≈ X phút chơi».
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const g = await import("./gia-dinh.ts");
const nv = await import("./nhiem-vu.ts");
const { taoPhien } = await import("./auth.ts");
const { xuLyM } = await import("./api-m.ts");
const { q, newId } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");
const { tenApp } = await import("./ten-app.ts");
const { moPhien } = await import("./phien.ts");
const { dieuChinhTay } = await import("./vi.ts");
const { datLuat } = await import("./luat-app.ts");

type Kq = { status: number; body: any };
async function m(duong: string, o: { tok: string; body?: unknown }): Promise<Kq> {
  const req = new Request(`http://app.test/api/m/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${o.tok}` },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const r = await xuLyM(req, duong.split("?")[0].split("/"));
  return { status: r.status, body: await r.json() };
}
const bmId = async (fam: string) => (await q<{ id: string }>(`select id from parents where family_id = $1 limit 1`, [fam]))[0]!.id;
async function nha() {
  const { fam, bm } = await taoNha("Lan");
  const con = await g.taoCon(fam, { ten: "Ken" });
  return { fam, con, tok: await taoPhien(bm) };
}
const ghep = async (fam: string, con: string) => g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "PC của Ken");

test("BUG-010: An toàn thiết bị và Hồ sơ Con dùng CÙNG một mức bảo vệ; câu giải thích không lặp tên quyền thiếu", async () => {
  const { fam, con, tok } = await nha();
  const may = await ghep(fam, con);
  await q(`update devices set last_seen = now(), status = $2::jsonb where id = $1`, [may.deviceId, JSON.stringify({ agent: "windows", quyen: { dichVu: true, chanThat: false } })]);
  const tuanThu = (await m("tuan-thu", { tok })).body.ds.find((x: any) => x.id === may.deviceId);
  const hoSo = (await m(`con/${con}`, { tok })).body.may.find((x: any) => x.id === may.deviceId);
  assert.equal(tuanThu.baoVe, "mot_phan");
  assert.deepEqual([tuanThu.baoVe, tuanThu.baoVeCau, tuanThu.baoVeThieu], [hoSo.baoVe, hoSo.baoVeCau, hoSo.baoVeThieu]);
  assert.ok(!/Còn thiếu/.test(tuanThu.baoVeCau) && !tuanThu.baoVeCau.includes(tuanThu.baoVeThieu[0].ten), tuanThu.baoVeCau);
});

test("DX-028: danh sách «đã thấy trên máy Con» có tên dễ hiểu, kèm loại hiện tại, bỏ mục hệ thống", async () => {
  const { fam, con, tok } = await nha();
  const may = await ghep(fam, con);
  const ngay = new Date().toISOString().slice(0, 10);
  for (const [muc, loai, phut] of [["msedge.exe", "chua_phan_loai", 30], ["roblox.exe", "giai_tri", 20], ["notepad.exe", "he_thong", 5], ["la-la.exe", "chua_phan_loai", 3]] as const)
    await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut) values ($1,$2,$3,$4,$5,$6)`, [may.deviceId, con, ngay, muc, loai, phut]);
  await datLuat(fam, { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" });
  assert.equal((await m("luat", { tok })).body.daThay, undefined, "Trang chủ / Chờ duyệt không phải gộp 30 ngày usage");
  const r = (await m("luat?thay=1", { tok })).body;
  const edge = r.daThay.find((x: any) => x.muc === "msedge.exe");
  assert.deepEqual([edge.ten, edge.loai], ["Microsoft Edge", "chua_xep"]);
  assert.equal(r.daThay.find((x: any) => x.muc === "roblox.exe").loai, "giai_tri");
  assert.ok(!r.daThay.some((x: any) => x.muc === "notepad.exe"), "mục hệ thống không liệt kê");
  assert.equal(r.chuaXep.find((x: any) => x.muc === "msedge.exe").ten, "Microsoft Edge");
  assert.equal(tenApp("la-la.exe"), "La la");
  assert.equal(tenApp("youtube.com"), "youtube.com");
});

test("Tên nhiệm vụ: tối thiểu 3 ký tự sau trim, server báo ten_ngan (tạo và sửa)", async () => {
  const { fam } = await nha();
  for (const ten of ["1", "  ab  ", " "]) await assert.rejects(nv.taoNv(fam, { ten, diem: 5 }), (e: { ma?: string }) => e.ma === "ten_ngan" || e.ma === "thieu_ten");
  const id = await nv.taoNv(fam, { ten: " Đọc ", diem: 5 });
  await assert.rejects(nv.suaNv(fam, id, { ten: "x" }), (e: { ma?: string }) => e.ma === "ten_ngan");
  // nhiệm vụ cũ tên «1» (có trước luật): vẫn đổi điểm / tắt được mà không bắt đổi tên; đổi tên thì phải đủ dài
  await q(`update tasks set ten = '1' where id = $1`, [id]);
  await nv.suaNv(fam, id, { diem: 7 });
  await nv.suaNv(fam, id, { ten: "1", bat: false });
  const sau = (await q<{ diem: number; bat: boolean }>(`select diem, bat from tasks where id = $1`, [id]))[0];
  assert.deepEqual([sau.diem, sau.bat], [7, false]);
  await assert.rejects(nv.suaNv(fam, id, { ten: "2" }), (e: { ma?: string }) => e.ma === "ten_ngan");
});

test("Thẻ «Đang chơi»: liệt kê phiên chạy (Con, máy, app, phút còn lại); Ba Mẹ bấm Dừng thì phiên đóng; phiên nhà khác không thấy", async () => {
  const { fam, con, tok } = await nha();
  const may = await ghep(fam, con);
  await datLuat(fam, { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" });
  await dieuChinhTay(fam, con, 50, "Điểm thử", await bmId(fam));
  // phiên THẬT qua moPhien, giờ cố định trong khung chơi (thứ Tư 18:00 giờ VN) — không chèn tay
  const ph = await moPhien(con, may.deviceId, "roblox.exe", {}, new Date("2026-10-21T18:00:00+07:00"));
  assert.equal((await m("phien-dang", { tok })).body.ds.length, 0, "phiên mất nhịp lâu (máy ngủ) không hiện «đang chơi»");
  await q(`update play_sessions set nhip_cuoi = now() where id = $1`, [ph.id]);                // nhịp vừa tới
  const ds = (await m("phien-dang", { tok })).body.ds;
  assert.equal(ds.length, 1);
  assert.deepEqual([ds[0].tenCon, ds[0].may, ds[0].tenApp], ["Ken", "PC của Ken", "Roblox"]);
  assert.ok(ds[0].conPhut > 0);
  const khac = await nha();
  assert.equal((await m("phien-dang", { tok: khac.tok })).body.ds.length, 0);
  assert.equal((await m(`phien/${ph.id}/dung`, { tok: khac.tok, body: {} })).status, 404);
  assert.equal((await m(`phien/${ph.id}/dung`, { tok, body: {} })).status, 200);
  assert.equal((await m("phien-dang", { tok })).body.ds.length, 0);
  // Dừng của Ba Mẹ có tác dụng: đặt giờ nghỉ (Con không mở phiên mới ngay); tính nốt tối đa một nhịp (2 phút), không «bù» cả quãng trôi
  const sau = (await q<{ nghi_den: Date | null; phut_dung: number; ly_do_ket: string }>(`select nghi_den, phut_dung, ly_do_ket from play_sessions where id = $1`, [ph.id]))[0];
  assert.ok(sau.nghi_den && new Date(sau.nghi_den).getTime() > Date.now(), "có giờ nghỉ sau Dừng");
  assert.ok(sau.phut_dung <= 2, String(sau.phut_dung));
  assert.equal(sau.ly_do_ket, "ba_me_khoa");
});

test("«≈ X phút chơi»: điểm đổi ra phút trò chơi theo giá của nhà", async () => {
  const { fam, con, tok } = await nha();
  await q(`insert into points(id, child_id, delta, loai, ly_do) values ($1,$2,30,'thuong','thử')`, [newId(), con]);
  const c = (await m("gia-dinh", { tok })).body.con[0];
  assert.deepEqual([c.soDu, c.phutDoiDuoc], [30, 30]);
  void fam;
});

test("Hoàn tác xếp app ở Trang chủ: POST luat trả luật cũ; khôi phục đúng như cũ (kể cả hạn), chưa có thì luat/xoa đưa về chưa xếp", async () => {
  const { fam, con, tok } = await nha();
  const { phanLoai } = await import("./luat-app.ts");
  // chưa có luật ⇒ truoc = null; luat/xoa đưa app về «chưa phân loại»
  const r1 = await m("luat", { tok, body: { muc: "Roblox.exe", loai: "giai_tri" } });
  assert.equal(r1.status, 200);
  assert.equal(r1.body.truoc, null);
  assert.equal((await phanLoai(fam, con, "roblox.exe")).loai, "giai_tri");
  assert.equal((await m("luat/xoa", { tok, body: { muc: r1.body.muc } })).status, 200);
  assert.equal((await phanLoai(fam, con, "roblox.exe")).loai, "chua_phan_loai");
  // đã có luật có hạn ⇒ truoc mang đủ loại/nhóm/hạn; gửi lại truoc khôi phục y nguyên
  const het = new Date(Date.now() + 3600_000);
  await datLuat(fam, { muc: "minecraft.exe", ten: "Minecraft", loai: "giai_tri", nhom: "game", het });
  const r2 = await m("luat", { tok, body: { muc: "minecraft.exe", loai: "chan" } });
  assert.equal(r2.body.truoc.loai, "giai_tri");
  assert.equal((await phanLoai(fam, con, "minecraft.exe")).loai, "chan");
  await m("luat", { tok, body: r2.body.truoc });
  const sau = (await q<{ loai: string; nhom: string; ten: string; het: Date }>(`select loai, nhom, ten, het from app_rules where family_id = $1 and muc = 'minecraft.exe'`, [fam]))[0];
  assert.deepEqual([sau.loai, sau.nhom, sau.ten, +new Date(sau.het)], ["giai_tri", "game", "Minecraft", +het]);
  // luat/xoa chỉ xoá trong nhà mình
  const khac = await nha();
  await datLuat(khac.fam, { muc: "minecraft.exe", loai: "chan" });
  await m("luat/xoa", { tok, body: { muc: "minecraft.exe" } });
  assert.equal((await phanLoai(khac.fam, khac.con, "minecraft.exe")).loai, "chan");
});

test("DX-028: «loại hiện tại» theo luật cả nhà cụ thể nhất — luật riêng một Con hay luật có hạn không làm sai nhãn", async () => {
  const { fam, con, tok } = await nha();
  const may = await ghep(fam, con);
  const ngay = new Date().toISOString().slice(0, 10);
  for (const muc of ["m.youtube.com", "zing.vn", "tiktok.com"])
    await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut) values ($1,$2,$3,$4,'chua_phan_loai',5)`, [may.deviceId, con, ngay, muc]);
  await datLuat(fam, { muc: "youtube.com", ten: "A youtube", loai: "giai_tri" });
  await datLuat(fam, { muc: "m.youtube.com", ten: "Z youtube di động", loai: "chan" });   // cụ thể hơn ⇒ thắng dù xếp tên sau
  await datLuat(fam, { con, muc: "zing.vn", ten: "Zing", loai: "chan" });                  // riêng một Con ⇒ không là loại cả nhà
  await datLuat(fam, { muc: "tiktok.com", ten: "TikTok", loai: "giai_tri", het: new Date(Date.now() + 3600_000) }); // có hạn
  const r = (await m("luat?thay=1", { tok })).body.daThay;
  const loai = (muc: string) => r.find((x: any) => x.muc === muc).loai;
  assert.deepEqual([loai("m.youtube.com"), loai("zing.vn"), loai("tiktok.com")], ["chan", "chua_xep", "chua_xep"]);
});

test("Review lượt 2: Hoàn tác không hồi sinh luật đã hết hạn; app có luật hết hạn quay lại «chưa xếp»; mẫu riêng tên ngắn không làm gãy áp mẫu", async () => {
  const { fam, con, tok } = await nha();
  const may = await ghep(fam, con);
  const ngay = new Date().toISOString().slice(0, 10);
  await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut) values ($1,$2,$3,'capcut.exe','chua_phan_loai',9)`, [may.deviceId, con, ngay]);
  await datLuat(fam, { muc: "capcut.exe", loai: "giai_tri", het: new Date(Date.now() - 60_000) });   // «Hôm nay» đã qua
  assert.ok((await m("luat", { tok })).body.chuaXep.some((x: any) => x.muc === "capcut.exe"), "luật hết hạn ⇒ app hiện lại ở chờ xếp");
  const r = await m("luat", { tok, body: { muc: "capcut.exe", loai: "chan" } });
  assert.equal(r.body.truoc, null, "luật hết hạn không phải luật cũ để khôi phục");
  // «Đã thấy»: mục hệ thống lọc trong SQL trước limit 100
  for (let k = 0; k < 100; k++)
    await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut) values ($1,$2,$3,$4,'he_thong',500)`, [may.deviceId, con, ngay, `sys${k}.exe`]);
  assert.ok((await m("luat?thay=1", { tok })).body.daThay.some((x: any) => x.muc === "capcut.exe"));
  // mẫu riêng admin tên ngắn
  await q(`insert into mau_he_thong(id, loai, nhom, du_lieu) values ($1,'nhiem_vu','nhi',$2::text::jsonb)`, [newId(), JSON.stringify({ ten: "Ăn", diem: 5 })]);
  const fam2 = (await nha()).fam;
  await nv.apDungMau(fam2, "nhi");
  assert.ok((await q(`select 1 from tasks where family_id = $1 and ten = 'Ăn'`, [fam2])).length);
});

test("Review lượt 3: «chưa xếp» theo luật hiệu lực của chính Con (tên miền cha, luật riêng Con khác không che), 30 ngày; het sai ⇒ 400", async () => {
  const { fam, con, tok } = await nha();
  const con2 = await g.taoCon(fam, { ten: "Bill" });
  const may = await ghep(fam, con);
  const may2 = await ghep(fam, con2);
  const ngay = new Date().toISOString().slice(0, 10), cu = new Date(Date.now() - 40 * 86400_000).toISOString().slice(0, 10);
  const dung = (m2: string, c: string, muc: string, d = ngay) =>
    q(`insert into usage(device_id, child_id, ngay, muc, loai, phut) values ($1,$2,$3,$4,'chua_phan_loai',5)`, [m2, c, d, muc]);
  await dung(may.deviceId, con, "m.youtube.com");
  await dung(may2.deviceId, con2, "zing.vn");
  await dung(may.deviceId, con, "cu.exe", cu);
  await datLuat(fam, { muc: "youtube.com", loai: "giai_tri" });          // tên miền cha ⇒ m.youtube.com đã xếp
  await datLuat(fam, { con, muc: "zing.vn", loai: "chan" });             // luật riêng Ken không che việc Bill dùng zing.vn
  const ds = (await m("luat", { tok })).body.chuaXep.map((x: any) => x.muc);
  assert.ok(!ds.includes("m.youtube.com"), "khớp tên miền cha");
  assert.ok(ds.includes("zing.vn"), "Bill vẫn cần Ba Mẹ xếp zing.vn");
  assert.ok(!ds.includes("cu.exe"), "quá 30 ngày không còn là app mới");
  const r = await m("luat", { tok, body: { muc: "a.exe", loai: "giai_tri", het: "không-phải-ngày" } });
  assert.deepEqual([r.status, r.body.error], [400, "het_sai"]);
  assert.equal(tenApp("javaw.exe"), "Java (thường là Minecraft)");
});

test("Review lượt 6: Hoàn tác không đè luật người khác vừa đổi; mục hệ thống không nằm ở «chờ xếp»", async () => {
  const { fam, con, tok } = await nha();
  const may = await ghep(fam, con);
  const ngay = new Date().toISOString().slice(0, 10);
  await q(`insert into usage(device_id, child_id, ngay, muc, loai, phut) values ($1,$2,$3,'notepad.exe','chua_phan_loai',4)`, [may.deviceId, con, ngay]);
  assert.ok(!(await m("luat", { tok })).body.chuaXep.some((x: any) => x.muc === "notepad.exe"));
  const r = await m("luat", { tok, body: { muc: "capcut.exe", loai: "hoc" } });
  await datLuat(fam, { muc: "capcut.exe", loai: "chan" });                          // người khác đổi trong lúc chờ Hoàn tác
  const h = await m("luat/xoa", { tok, body: { muc: r.body.muc, neuLoai: "hoc" } });
  assert.deepEqual([h.status, h.body.error], [409, "da_doi"]);
  assert.equal((await q<{ loai: string }>(`select loai from app_rules where family_id = $1 and muc = 'capcut.exe'`, [fam]))[0].loai, "chan");
  assert.equal((await m("luat/xoa", { tok, body: { muc: r.body.muc, neuLoai: "chan" } })).status, 200);
});
