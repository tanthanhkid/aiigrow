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
const { moPhien, xetMoPhien } = await import("./phien.ts");
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
  await q(`insert into points(id, child_id, delta, loai, ly_do) values ($1,$2,50,'thuong','thử')`, [newId(), con]).catch(() => {});
  let ph: { id: string } | null = null;
  try { ph = await moPhien(con, may.deviceId, "roblox.exe"); } catch { /* chưa đủ điều kiện mở ⇒ chèn tay bên dưới */ }
  if (!ph) {
    const id = newId();
    await q(`insert into play_sessions(id, child_id, device_id, muc, nhom, gia_phan_nghin, toi_da_phut) values ($1,$2,$3,'roblox.exe','game',1000,30)`, [id, con, may.deviceId]);
    ph = { id };
  }
  const ds = (await m("phien-dang", { tok })).body.ds;
  assert.equal(ds.length, 1);
  assert.deepEqual([ds[0].tenCon, ds[0].may, ds[0].tenApp], ["Ken", "PC của Ken", "Roblox"]);
  assert.ok(ds[0].conPhut > 0);
  const khac = await nha();
  assert.equal((await m("phien-dang", { tok: khac.tok })).body.ds.length, 0);
  assert.equal((await m(`phien/${ph.id}/dung`, { tok: khac.tok, body: {} })).status, 404);
  assert.equal((await m(`phien/${ph.id}/dung`, { tok, body: {} })).status, 200);
  assert.equal((await m("phien-dang", { tok })).body.ds.length, 0);
  // Dừng của Ba Mẹ có tác dụng: Con không mở phiên mới ngay mà phải nghỉ giữa giờ
  const xet = await xetMoPhien(con, "roblox.exe", { mayId: may.deviceId });
  assert.deepEqual([xet.duoc, xet.lyDo], [false, "dang_nghi"]);
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
