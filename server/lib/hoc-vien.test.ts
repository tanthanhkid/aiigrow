// Khay học viên (agent-win Tray) hai chiều: Ba Mẹ giao ⇒ Con thấy + nhận thông báo ⇒ nhận việc, nộp ⇒ Ba Mẹ thấy, duyệt ⇒ Con thấy điểm, đổi quà.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyMay } = await import("./api-may.ts");
const g = await import("./gia-dinh.ts");
const nv = await import("./nhiem-vu.ts");
const pt = await import("./phan-thuong.ts");
const tb = await import("./thong-bao.ts");
const { q } = await import("./db.ts");
const { taoNha, anhGia } = await import("./test-fixtures/nha.ts");

const goi = async (tok: string, duong: string, body?: unknown) => {
  const r = await xuLyMay(new Request(`http://x/api/device/${duong}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  }), duong.split("?")[0].split("/"));
  return { status: r.status, body: (await r.json()) as any };
};

async function nha() {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  const may = await g.ghepMay(await g.taoMaGhep(fam, con, "windows"), "windows", "PC của Ken");
  return { fam, bm, con, tok: may.token as string };
}

test("khay học viên: giao việc ⇒ thấy việc + thông báo ⇒ nhận việc ⇒ nộp ⇒ Ba Mẹ duyệt ⇒ thấy điểm, lời khen; đổi quà", async () => {
  const { fam, bm, con, tok } = await nha();
  const mo = new Date(Date.now() - 60_000).toISOString();
  const han = new Date(Date.now() + 86_400_000);
  const riengId = await nv.taoNv(fam, { ten: "Dọn tủ sách", diem: 20, bang_chung: "van_ban", han: han.toISOString(), mo_ta: "Xếp sách theo cỡ", giao_cho: con }, bm);
  const chungId = await nv.taoNv(fam, { ten: "Rửa chén", diem: 10, bang_chung: "anh", toi_da_ngay: 1 }, bm);
  const khac = await g.taoCon(fam, { ten: "Bill" });
  await nv.taoNv(fam, { ten: "Việc của Bill", diem: 5, bang_chung: "van_ban", giao_cho: khac }, bm);

  const tq = (await goi(tok, "hoc-vien/tong-quan")).body;
  assert.equal(tq.con.ten, "Ken");
  assert.deepEqual(tq.nhiemVu.map((x: any) => x.ten).sort(), ["Dọn tủ sách", "Rửa chén"]);
  const rieng = tq.nhiemVu.find((x: any) => x.id === riengId);
  assert.equal(rieng.giaoRieng, true);
  assert.equal(rieng.diem, 20);
  assert.ok(rieng.han && Math.abs(new Date(rieng.han).getTime() - han.getTime()) < 1000);
  assert.equal(rieng.trangThai, "san_sang");

  // thông báo: việc giao riêng + việc mở cho cả nhà; hỏi lại với mốc `bay` ⇒ máy chủ lùi 5 phút nên trả lại đúng các dòng cũ (khay lọc trùng theo id)
  const tin = (await goi(tok, `hoc-vien/tin?sau=${encodeURIComponent(mo)}`)).body;
  assert.deepEqual(tin.ds.map((x: any) => x.loai).sort(), ["giao_nhiem_vu", "nhiem_vu_moi"]);
  assert.ok(tin.ds.every((x: any) => x.noi.includes("điểm")));
  const sauNua = (await goi(tok, `hoc-vien/tin?sau=${encodeURIComponent(tin.bay)}`)).body;
  assert.deepEqual(sauNua.ds.map((x: any) => x.id).sort(), tin.ds.map((x: any) => x.id).sort());
  const xa = (await goi(tok, `hoc-vien/tin?sau=${encodeURIComponent(new Date(Date.now() + 3_600_000).toISOString())}`)).body;
  assert.equal(xa.ds.length, 0);

  // nhận việc ⇒ nộp: việc viết cần ≥ 3 chữ; Ba Mẹ thấy «đã nhận» + «vừa nộp»
  const luot = (await goi(tok, `hoc-vien/nhiem-vu/${riengId}/bat-dau`, {})).body.luot;
  assert.ok(luot);
  assert.equal((await goi(tok, `hoc-vien/nhiem-vu/${riengId}/bat-dau`, {})).body.luot, luot, "bấm lại không tạo lượt mới");
  assert.equal((await goi(tok, "hoc-vien/tong-quan")).body.nhiemVu.find((x: any) => x.id === riengId).trangThai, "dang_lam");
  assert.equal((await goi(tok, `hoc-vien/luot/${luot}/nop`, { ghiChu: "x" })).body.error, "thieu_chu");
  assert.equal((await goi(tok, `hoc-vien/luot/${luot}/nop`, { ghiChu: "Con đã xếp xong 3 ngăn" })).body.trangThai, "cho_duyet");
  const tbBm = await tb.dsThongBao({ id: bm, family_id: fam } as never);
  const tieu = tbBm.ds.map((x) => x.tieu).join(" | ");
  assert.match(tieu, /Ken đã nhận «Dọn tủ sách»/);
  assert.match(tieu, /Ken vừa nộp «Dọn tủ sách»/);

  // Ba Mẹ duyệt kèm lời khen ⇒ Con thấy điểm, lượt gần đây, thông báo, lời khen; trả lời lời khen ⇒ Ba Mẹ nhận thông báo
  const mocDuyet = new Date().toISOString();
  await nv.duyet(fam, luot, bm, { loiKhen: "Giỏi lắm!" });
  const sau = (await goi(tok, "hoc-vien/tong-quan")).body;
  assert.equal(sau.soDu, 20);
  assert.equal(sau.gan[0].trangThai, "duoc_duyet");
  assert.equal(sau.loiKhen[0].noiDung, "Giỏi lắm!");
  assert.ok(!sau.nhiemVu.some((x: any) => x.id === riengId && x.kieu === "mot_lan"), "việc một lần đã xong thì ẩn");
  const tin2 = (await goi(tok, `hoc-vien/tin?sau=${encodeURIComponent(mocDuyet)}`)).body;
  assert.ok(tin2.ds.some((x: any) => x.loai === "duyet_nhiem_vu" && x.noi.includes("+20")));
  assert.equal((await goi(tok, `hoc-vien/loi-khen/${sau.loiKhen[0].id}/phan-hoi`, { phanHoi: "Con cảm ơn ạ" })).body.ok, true);
  assert.match((await tb.dsThongBao({ id: bm, family_id: fam } as never)).ds.map((x) => x.tieu).join("|"), /Ken nhắn lại Ba Mẹ/);

  // từ chối + yêu cầu bổ sung ⇒ Con thấy lý do
  const l2 = (await goi(tok, `hoc-vien/nhiem-vu/${chungId}/bat-dau`, {})).body.luot;
  await goi(tok, `hoc-vien/luot/${l2}/nop`, { anh: [anhGia("chen")] });
  await nv.tuChoi(fam, l2, bm, "Chụp rõ bồn rửa hơn nhé", true);
  const bs = (await goi(tok, "hoc-vien/tong-quan")).body.nhiemVu.find((x: any) => x.id === chungId);
  assert.deepEqual([bs.trangThai, bs.lyDo], ["can_bo_sung", "Chụp rõ bồn rửa hơn nhé"]);

  // phần quà: thiếu điểm ⇒ báo thiếu; đủ điểm ⇒ đổi, điểm bị trừ, phiếu chờ Ba Mẹ trao
  const qua = await pt.taoQua(fam, { ten: "Chọn món bữa tối", loai: "dac_quyen", diem: 15 });
  const dat = await pt.taoQua(fam, { ten: "Món đồ chơi", loai: "qua", diem: 400 });
  const ch = (await goi(tok, "hoc-vien/cua-hang")).body;
  assert.equal(ch.soDu, 20);
  assert.equal(ch.qua.find((x: any) => x.id === qua).du, true);
  assert.equal(ch.qua.find((x: any) => x.id === dat).conThieu, 380);
  assert.equal((await goi(tok, `hoc-vien/doi/${dat}`, {})).body.error, "khong_du_diem");
  assert.equal((await goi(tok, `hoc-vien/doi/${qua}`, {})).body.trangThai, "cho_trao");
  const sau2 = (await goi(tok, "hoc-vien/tong-quan")).body;
  assert.equal(sau2.soDu, 5);
  assert.equal(sau2.phieuCho[0].ten, "Chọn món bữa tối");
  const phieu = sau2.phieuCho[0].id;
  const mocQua = new Date().toISOString();
  await pt.xacNhanPhieu(fam, phieu, bm);
  assert.ok((await goi(tok, `hoc-vien/tin?sau=${encodeURIComponent(mocQua)}`)).body.ds.some((x: any) => x.loai === "xac_nhan_qua"));
});

test("khay học viên: token lạ bị chặn, đường lạ 404, không đụng việc của Con khác", async () => {
  const a = await nha(), b = await nha();
  assert.equal((await goi("khong-co", "hoc-vien/tong-quan")).status, 401);
  assert.equal((await goi(a.tok, "hoc-vien/khong-co")).status, 404);
  const viec = await nv.taoNv(b.fam, { ten: "Việc nhà khác", diem: 5, bang_chung: "van_ban" }, b.bm);
  assert.equal((await goi(a.tok, `hoc-vien/nhiem-vu/${viec}/bat-dau`, {})).status, 404);
  assert.equal((await goi(a.tok, "hoc-vien/tong-quan")).body.nhiemVu.length, 0);
  await q(`select 1`);
});
