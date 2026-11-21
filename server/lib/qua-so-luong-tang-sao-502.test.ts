// #502: quà «Ba Mẹ mua» có số lượng (giữ chỗ khi Con chọn, hết thì ẩn bên Con, «Hết» + «Mua thêm» bên Ba Mẹ; quà nhà không đếm)
// và API tặng sao (không nợ, trả nợ trước, bắt buộc lý do, ≤100 sao/ngày/Con, «Chỉ trông con» không được tặng).
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyM } = await import("./api-m.ts");
const { xuLyCon } = await import("./api-con.ts");
const { xuLyMay } = await import("./api-may.ts");
const g = await import("./gia-dinh.ts");
const v = await import("./vi.ts");
const ss = await import("./so-sao.ts");
const { q, one } = await import("./db.ts");
const { taoNha, taoBaMe } = await import("./test-fixtures/nha.ts");
const { taoPhien } = await import("./auth.ts");

const goi = (xuLy: (r: Request, p: string[]) => Promise<Response>, goc: string) =>
  async (tok: string, duong: string, body?: unknown) => {
    const r = await xuLy(new Request(`http://x/api/${goc}/${duong}`, {
      method: body === undefined ? "GET" : "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
      body: body === undefined ? undefined : JSON.stringify(body),
    }), duong.split("?")[0].split("/"));
    return { status: r.status, body: (await r.json()) as any };
  };
const m = goi(xuLyM, "m"), k = goi(xuLyCon, "kid"), dv = goi(xuLyMay, "device");

async function nha() {
  const { fam, bm } = await taoNha();
  const tokBm = await taoPhien(bm);
  const anh = (await m(tokBm, "con", { ten: "Bảo Anh", saoKhoiDau: 0 })).body.id as string;
  const rieng = await g.ghepMay(await g.taoMaGhep(fam, anh, "windows"), "windows", "Laptop của Bảo Anh");
  return { fam, bm, tokBm, anh, rieng: { id: rieng.deviceId as string, tok: rieng.token as string } };
}
const dsQua = async (tok: string) => (await m(tok, "qua")).body.ds as any[];
const thuVien = async (tok: string, con: string) => (await m(tok, `qua/thu-vien?con=${con}`)).body.nhom.flatMap((x: any) => x.ds) as any[];

test("#502 quà Ba Mẹ mua: thêm từ thư viện với số lượng, Con chọn giữ chỗ, hết thì ẩn bên Con, Ba Mẹ thấy «Hết», Mua thêm", async () => {
  const { fam, bm, tokBm, anh, rieng } = await nha();
  await v.dieuChinhTay(fam, anh, 1000, "Sao thử", bm);
  // thêm sách AiiLab (Ba Mẹ mua) với số lượng 2; quà nhà không đếm dù có gửi số
  const r = await m(tokBm, "qua/thu-vien", { mau: ["sach_aiilab", "game_cung_ba"], con: anh, soLuong: { sach_aiilab: 2, game_cung_ba: 5 } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  let ds = await dsQua(tokBm);
  const sach = ds.find((x) => x.mau === "sach_aiilab"), game = ds.find((x) => x.mau === "game_cung_ba");
  assert.deepEqual([sach.tonKho, sach.dangCo, sach.het, sach.dem], [2, 2, false, true]);
  assert.deepEqual([game.tonKho, game.dangCo, game.dem], [null, null, false], "quà nhà không đếm");
  assert.equal((await thuVien(tokBm, anh)).find((x) => x.ma === "sach_aiilab").dangCo, 2);
  // Con chọn 1 ⇒ giữ chỗ: Con còn 1 để chọn, Ba Mẹ vẫn «Đang có 2» (chưa trao)
  const d1 = await dv(rieng.tok, `hoc-vien/doi/${sach.id}`, {});
  assert.equal(d1.status, 200, JSON.stringify(d1.body));
  ds = await dsQua(tokBm);
  let s = ds.find((x) => x.id === sach.id);
  assert.deepEqual([s.tonKho, s.dangCo, s.dangGiu, s.het], [1, 2, 1, false]);
  // Ba Mẹ huỷ phiếu ⇒ trả lại chỗ
  await m(tokBm, `phieu/${d1.body.phieu}/huy`, {});
  assert.equal((await dsQua(tokBm)).find((x) => x.id === sach.id).tonKho, 2);
  // chọn 2 lần ⇒ hết
  const a = (await dv(rieng.tok, `hoc-vien/doi/${sach.id}`, {})).body;
  await dv(rieng.tok, `hoc-vien/doi/${sach.id}`, {});
  assert.equal((await dv(rieng.tok, `hoc-vien/doi/${sach.id}`, {})).body.error, "het_hang");
  s = (await dsQua(tokBm)).find((x) => x.id === sach.id);
  assert.deepEqual([s.tonKho, s.dangCo, s.het], [0, 2, true], "bên Ba Mẹ vẫn thấy, ghi Hết");
  assert.ok(!(await k(rieng.tok, "cua-hang")).body.qua.some((x: any) => x.id === sach.id), "hết ⇒ ẩn bên Con");
  assert.equal((await thuVien(tokBm, anh)).find((x) => x.ma === "sach_aiilab").het, true);
  // trao một phiếu ⇒ tồn thật trừ 1 (Đang có 2 → 1), vẫn Hết cho Con chọn
  await m(tokBm, `phieu/${a.phieu}/trao`, {});
  s = (await dsQua(tokBm)).find((x) => x.id === sach.id);
  assert.deepEqual([s.dangCo, s.tonKho, s.het], [1, 0, true]);
  // Mua thêm 3 ⇒ Con thấy lại
  const mt = await m(tokBm, `qua/${sach.id}/mua-them`, { them: 3 });
  assert.equal(mt.body.tonKho, 3);
  assert.ok((await k(rieng.tok, "cua-hang")).body.qua.some((x: any) => x.id === sach.id), "có hàng lại ⇒ hiện bên Con");
  // đặt số «Đang có» tuyệt đối (+/−): đang giữ 1 phiếu ⇒ tồn cho Con chọn = N − giữ
  const e = await m(tokBm, `qua/${sach.id}/so-luong`, { soLuong: 5 });
  assert.deepEqual([e.body.dangCo, e.body.tonKho], [5, 4]);
  // quà nhà không đếm
  assert.equal((await m(tokBm, `qua/${game.id}/so-luong`, { soLuong: 3 })).body.error, "khong_dem");
  assert.equal((await m(tokBm, `qua/${game.id}/mua-them`, { them: 1 })).body.error, "khong_dem");
});

test("#502 thêm lại quà đã có kèm số lượng ⇒ đặt đúng số (Lần đầu / Hằng ngày dùng chung)", async () => {
  const { tokBm, anh } = await nha();
  await m(tokBm, "qua/thu-vien", { mau: ["lego"], con: anh, soLuong: { lego: 4 } });
  assert.equal((await dsQua(tokBm)).find((x) => x.mau === "lego").dangCo, 4);
  await m(tokBm, "qua/thu-vien", { mau: ["lego"], con: anh, soLuong: { lego: 0 } });
  const lego = (await dsQua(tokBm)).find((x) => x.mau === "lego");
  assert.deepEqual([lego.tonKho, lego.het], [0, true]);
  // không gửi số ⇒ mẫu mới mặc định 1
  await m(tokBm, "qua/thu-vien", { mau: ["workshop_aiilab"], con: anh });
  assert.equal((await dsQua(tokBm)).find((x) => x.mau === "workshop_aiilab").dangCo, 1);
});

test("#502 tặng sao: cộng thẳng, không nợ, lý do bắt buộc, hiện trong nhật ký sao + báo Con", async () => {
  const { fam, tokBm, anh, rieng } = await nha();
  assert.equal((await m(tokBm, `con/${anh}/tang-sao`, { soSao: 20 })).body.error, "thieu_ly_do");
  assert.equal((await m(tokBm, `con/${anh}/tang-sao`, { soSao: 20, lyDo: "  " })).body.error, "thieu_ly_do");
  for (const sao of [0, -5, 2.5, "x"]) assert.equal((await m(tokBm, `con/${anh}/tang-sao`, { soSao: sao, lyDo: "Thưởng" })).body.error, "sao_sai", String(sao));
  const r = await m(tokBm, `con/${anh}/tang-sao`, { soSao: 20, lyDo: "Thưởng điểm 10" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual([r.body.soSao, r.body.sao, r.body.no, r.body.traNo], [20, 20, 0, 0]);
  const vi = (await m(tokBm, `con/${anh}/vi-sao`)).body;
  assert.ok(JSON.stringify(vi).includes("Thưởng điểm 10"), "lý do trong nhật ký sao");
  const tin = (await dv(rieng.tok, "hoc-vien/tin")).body;
  assert.ok(JSON.stringify(tin).includes("Thưởng điểm 10"), JSON.stringify(tin));
  const loiNhan = await q(`select noi_dung from messages where child_id = $1`, [anh]);
  assert.ok(loiNhan.some((x: any) => String(x.noi_dung).includes("Thưởng điểm 10")));
  const ev = await one<{ n: number }>(`select count(*)::int as n from events where family_id = $1 and loai = 'tang_sao'`, [fam]);
  assert.equal(ev!.n, 1);
});

test("#502 tặng sao khi Con đang nợ: trả nợ trước, phần còn lại vào số dư; không tạo nợ mới", async () => {
  const { fam, bm, tokBm, anh } = await nha();
  await ss.choVay(fam, anh, 30, bm, { mucDich: "choi" });
  const r = await m(tokBm, `con/${anh}/tang-sao`, { soSao: 50, lyDo: "Đạt điểm cao" });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual([r.body.traNo, r.body.no], [30, 0]);
  const st = await ss.trangThaiSao(anh);
  assert.equal(st.no, 0);
  assert.equal(await v.soDu(anh), 50, "tổng sổ cái = 30 vay + 50 tặng − 30 trả nợ");
  assert.equal(st.sao, 50);
});

test("#502 tặng sao: tối đa 100 sao / ngày / Con (tính theo từng Con)", async () => {
  const { fam, tokBm, anh } = await nha();
  const em = (await m(tokBm, "con", { ten: "Bảo Minh", saoKhoiDau: 0 })).body.id as string;
  assert.equal((await m(tokBm, `con/${anh}/tang-sao`, { soSao: 60, lyDo: "A" })).status, 200);
  const qua = await m(tokBm, `con/${anh}/tang-sao`, { soSao: 50, lyDo: "B" });
  assert.deepEqual([qua.status, qua.body.error], [409, "qua_han_muc_tang"]);
  assert.match(qua.body.message ?? qua.body.error_description ?? JSON.stringify(qua.body), /còn tặng được 40 sao/);
  assert.equal((await m(tokBm, `con/${anh}/tang-sao`, { soSao: 40, lyDo: "C" })).status, 200);
  assert.equal((await m(tokBm, `con/${anh}/tang-sao`, { soSao: 1, lyDo: "D" })).body.error, "qua_han_muc_tang");
  assert.equal(await v.soDu(anh), 100, "lần bị chặn không ghi gì");
  assert.equal((await m(tokBm, `con/${em}/tang-sao`, { soSao: 100, lyDo: "Bé kia" })).status, 200, "hạn mức riêng từng Con");
  // sang ngày mới (giờ gia đình) ⇒ tặng lại được
  const bmId = (await q<{ id: string }>(`select id from parents where family_id = $1 limit 1`, [fam]))[0].id;
  const mai = await ss.tangSao(fam, anh, 100, "Hôm sau", bmId, new Date(Date.now() + 36 * 3_600_000));
  assert.equal(mai.soSao, 100);
});

test("#502 tặng sao: «Chỉ trông con» bị chặn 403, «Như Ba Mẹ» được; Con khác nhà 404", async () => {
  const { fam, tokBm, anh } = await nha();
  const trong = await taoBaMe(fam, "Bà Hoa", "trong_giup");
  const tokTrong = await taoPhien(trong);
  const r = await m(tokTrong, `con/${anh}/tang-sao`, { soSao: 10, lyDo: "Thưởng" });
  assert.deepEqual([r.status, r.body.error], [403, "chi_xem"]);
  assert.equal(await v.soDu(anh), 0);
  const ba = await taoBaMe(fam, "Ba Nam", "ba_me");
  assert.equal((await m(await taoPhien(ba), `con/${anh}/tang-sao`, { soSao: 10, lyDo: "Thưởng" })).status, 200);
  const khac = await nha();
  assert.equal((await m(khac.tokBm, `con/${anh}/tang-sao`, { soSao: 10, lyDo: "Thưởng" })).status, 404);
});
