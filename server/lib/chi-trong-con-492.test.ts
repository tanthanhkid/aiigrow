// #492 — vai «Chỉ trông con» (trong_giup) và «Như Ba Mẹ» (ba_me): máy chủ chặn THẬT, gọi API trực tiếp (không qua app).
// Chỉ trông con: xem con chơi, duyệt việc / lời xin, khoá máy, cho vay sao. KHÔNG: đổi luật, mua quà, mời người, ghép máy.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyM } = await import("./api-m.ts");
const { q } = await import("./db.ts");

type Kq = { status: number; body: any };
const m = async (duong: string, o: { tok?: string; body?: unknown; method?: string } = {}): Promise<Kq> => {
  const method = o.method ?? (o.body === undefined ? "GET" : "POST");
  const req = new Request(`http://app.vidu/api/m/${duong}`, {
    method,
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const r = await xuLyM(req, duong.split("/"));
  return { status: r.status, body: await r.json() };
};
let soDt = 0;
const sdt = () => `0944${String(++soDt).padStart(6, "0")}`;
async function dangKy(ten: string, so = sdt()) {
  const otp = await m("otp", { body: { dinhDanh: so } });
  const r = await m("dang-ky", { body: { dinhDanh: so, ma: otp.body.ma, ten, matKhau: "matkhau123" } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.token as string;
}
async function vaoNha(chuTok: string, quyen: "ba_me" | "trong_giup", ten: string) {
  const so = sdt();
  const moi = await m("thanh-vien/moi", { tok: chuTok, body: { dinhDanh: so, quyen, tenGoi: ten } });
  assert.equal(moi.status, 200, JSON.stringify(moi.body));
  const otp = await m("otp", { body: { dinhDanh: so } });
  const r = await m("moi/dang-ky", { body: { ma: moi.body.ma, dinhDanh: so, otp: otp.body.ma, ten, matKhau: "matkhau123" } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.token as string;
}
const dem = async (bang: string, fam: string) => Number((await q<{ n: string }>(`select count(*) n from ${bang} where family_id = $1`, [fam]))[0].n);

test("#492 Chỉ trông con: tên vai + việc được phép (xem, khoá máy, cho vay sao, hoàn tác vay)", async () => {
  const lan = await dangKy("Mẹ Lan");
  const hoa = await vaoNha(lan, "trong_giup", "Bà Hoa");
  const con = (await m("con", { tok: lan, body: { ten: "Bảo Anh" } })).body.id;
  const ds = (await m("thanh-vien", { tok: lan })).body.ds;
  assert.deepEqual(ds.map((x: any) => [x.ten, x.quyen, x.tenQuyen]), [["Mẹ Lan", "ba_me", "Như Ba Mẹ"], ["Bà Hoa", "trong_giup", "Chỉ trông con"]]);
  const toi = (await m("toi", { tok: hoa })).body.baMe;
  assert.deepEqual([toi.quyen, toi.laChuNha], ["trong_giup", false]);
  // xem được
  for (const d of ["gia-dinh", `con/${con}`, "thanh-vien", "qua", `con/${con}/vi-sao`, "cau-hinh"]) assert.equal((await m(d, { tok: hoa })).status, 200, d);
  // khoá máy
  assert.equal((await m(`con/${con}/khoa`, { tok: hoa, body: { khoa: true } })).status, 200);
  // cho vay sao
  const vayQua = await m(`con/${con}/cho-vay`, { tok: hoa, body: { soSao: 10, mucDich: "qua" } });
  assert.equal(vayQua.status, 403, "cho vay để mua quà thì «Chỉ trông con» không được");
  const vay = await m(`con/${con}/cho-vay`, { tok: hoa, body: { soSao: 10, mucDich: "choi" } });
  assert.equal(vay.status, 200, JSON.stringify(vay.body));
  assert.equal(vay.body.soSao, 10);
  const nd = (await m(`con/${con}/vi-sao`, { tok: lan })).body;
  assert.ok(JSON.stringify(nd).includes("Chỉ trông") === false);
  const hoanTac = await m(`vay/${vay.body.id}/hoan-tac`, { tok: hoa, body: {} });
  assert.ok([200, 409].includes(hoanTac.status), `hoàn tác vay → ${hoanTac.status} ${JSON.stringify(hoanTac.body)}`);
});

test("#492 Chỉ trông con: máy chủ chặn đổi luật (403 chi_xem, dữ liệu không đổi)", async () => {
  const lan = await dangKy("Mẹ Lan");
  const hoa = await vaoNha(lan, "trong_giup", "Bà Hoa");
  const fam = (await q<{ family_id: string }>(`select family_id from parents order by created_at desc limit 1`))[0]?.family_id;
  const con = (await m("con", { tok: lan, body: { ten: "Bảo Anh" } })).body.id;
  const truoc = (await m("cau-hinh", { tok: lan })).body;
  const chan = [
    ["cau-hinh", { tran_ngay: 30 }],
    [`con/${con}/che-do-chan`, { cheDo: "mo_het" }],
    [`con/${con}/che-do`, { cheDo: "mo_het" }],
    [`con/${con}/sua`, { ten: "Đổi tên" }],
    [`con/${con}/xoa`, {}],
    [`con/${con}/pin`, { pin: "1234" }],
    [`con/${con}/gioi-han`, { ngayThuong: 120 }],
    [`con/${con}/cau-hinh`, { gioiHan: 120 }],
    ["con", { ten: "Con lậu" }],
    ["nhiem-vu/bo", { bo: "hoc_tap", con: [con] }],
    ["nhiem-vu", { con, ten: "Việc lậu", sao: 5 }],
    ["thong-bao-gia-dinh", {}],
  ] as const;
  for (const [d, b] of chan) {
    const r = await m(d, { tok: hoa, body: b });
    assert.equal(r.status, 403, `${d} phải bị chặn: ${JSON.stringify(r.body)}`);
    assert.equal(r.body.error, "chi_xem", d);
  }
  assert.deepEqual((await m("cau-hinh", { tok: lan })).body, truoc, "cấu hình không đổi");
  assert.equal((await m(`con/${con}`, { tok: lan })).body.ten, "Bảo Anh");
  assert.ok(fam);
});

test("#492 Chỉ trông con: không mua quà / sửa quà / trao quà luôn", async () => {
  const lan = await dangKy("Mẹ Lan");
  const hoa = await vaoNha(lan, "trong_giup", "Bà Hoa");
  const con = (await m("con", { tok: lan, body: { ten: "Bảo Anh" } })).body.id;
  const qua = (await m("qua", { tok: lan, body: { ten: "Đi ăn kem", diem: 50, loai: "qua" } })).body.id;
  assert.ok(qua);
  const soQua = (await m("qua", { tok: lan })).body.ds.length;
  for (const [d, b] of [["qua", { ten: "Quà lậu", diem: 10, loai: "qua" }], ["qua/mau", {}], [`qua/${qua}`, { diem: 1 }], [`qua/${qua}/trao-luon`, { con }]] as const) {
    const r = await m(d, { tok: hoa, body: b });
    assert.deepEqual([r.status, r.body.error], [403, "chi_xem"], d);
  }
  const sau = (await m("qua", { tok: lan })).body.ds;
  assert.equal(sau.length, soQua, "không thêm quà");
  assert.equal(sau.find((x: any) => x.id === qua).diem, 50, "không sửa giá quà");
});

test("#492 Chỉ trông con: không mời người, không đổi quyền / mời ra, không huỷ lời mời", async () => {
  const lan = await dangKy("Mẹ Lan");
  const hoa = await vaoNha(lan, "trong_giup", "Bà Hoa");
  const ba = await vaoNha(lan, "ba_me", "Ba Tuấn");
  const ds = (await m("thanh-vien", { tok: lan })).body.ds;
  const idBa = ds.find((x: any) => x.ten === "Ba Tuấn").id, idHoa = ds.find((x: any) => x.ten === "Bà Hoa").id;
  const cho = (await m("thanh-vien/moi", { tok: lan, body: { dinhDanh: sdt(), quyen: "ba_me" } })).body;
  const soLoiMoi = (await m("thanh-vien", { tok: lan })).body.loiMoi.length;
  for (const [d, b] of [
    ["thanh-vien/moi", { dinhDanh: sdt(), quyen: "ba_me", tenGoi: "Người lạ" }],
    ["thanh-vien/moi", { dinhDanh: sdt(), quyen: "trong_giup" }],
    ["thanh-vien/moi", { vai: "duyet" }],                           // cách gọi của app bản cũ
    [`thanh-vien/${idHoa}/quyen`, { quyen: "ba_me" }],              // tự nâng quyền
    [`thanh-vien/${idHoa}/vai`, { vai: "duyet" }],
    [`thanh-vien/${idBa}/quyen`, { quyen: "trong_giup" }],
    [`thanh-vien/${idBa}/moi-ra`, {}],
    [`thanh-vien/moi/${cho.id}/huy`, {}],
    [`thanh-vien/moi/${cho.id}/gui-lai`, {}],
  ] as const) {
    const r = await m(d, { tok: hoa, body: b });
    assert.deepEqual([r.status, r.body.error], [403, "chi_xem"], d);
  }
  const sau = (await m("thanh-vien", { tok: lan })).body;
  assert.equal(sau.loiMoi.length, soLoiMoi, "không thêm / bớt lời mời");
  assert.deepEqual(sau.ds.map((x: any) => [x.ten, x.quyen]), [["Mẹ Lan", "ba_me"], ["Bà Hoa", "trong_giup"], ["Ba Tuấn", "ba_me"]]);
  assert.equal((await m("thanh-vien", { tok: ba })).status, 200);
});

test("#492 Chỉ trông con: không ghép máy / gỡ máy / đổi máy", async () => {
  const lan = await dangKy("Mẹ Lan");
  const hoa = await vaoNha(lan, "trong_giup", "Bà Hoa");
  const con = (await m("con", { tok: lan, body: { ten: "Bảo Anh" } })).body.id;
  const truoc = await dem("pairing_codes", (await q<{ family_id: string }>(`select family_id from children where id = $1`, [con]))[0].family_id).catch(() => -1);
  for (const [d, b] of [
    ["ma-ghep", { con, nen: "windows" }],
    ["ghep-may", { con, nen: "windows" }],
    ["may/khong-co/go", { matKhau: "matkhau123" }],
    ["may/khong-co/go-tu-xa", { matKhau: "matkhau123" }],
    ["may/khong-co/ten", { ten: "Máy lậu" }],
    ["may/khong-co/con", { ds: [con] }],
    [`con/${con}/gan`, { may: "x" }],
  ] as const) {
    const r = await m(d, { tok: hoa, body: b });
    assert.deepEqual([r.status, r.body.error], [403, "chi_xem"], d);
  }
  const sau = await dem("pairing_codes", (await q<{ family_id: string }>(`select family_id from children where id = $1`, [con]))[0].family_id).catch(() => -1);
  assert.equal(sau, truoc, "không sinh mã ghép");
  // Như Ba Mẹ thì ghép được
  assert.equal((await m("ma-ghep", { tok: lan, body: { con, nen: "windows" } })).status, 200);
});

test("#492 Chỉ trông con: PUT / DELETE / PATCH không lách được cổng; chưa đăng nhập 401; nhà khác không vay được", async () => {
  const lan = await dangKy("Mẹ Lan");
  const hoa = await vaoNha(lan, "trong_giup", "Bà Hoa");
  const con = (await m("con", { tok: lan, body: { ten: "Bảo Anh" } })).body.id;
  for (const method of ["PUT", "DELETE", "PATCH"]) {
    for (const d of ["thanh-vien/moi", "cau-hinh", "qua", "ma-ghep", `con/${con}/sua`]) {
      const r = await m(d, { tok: hoa, body: { ten: "x" }, method });
      assert.ok([403, 404, 405].includes(r.status), `${method} ${d} → ${r.status}`);
    }
  }
  assert.equal((await m(`con/${con}/cho-vay`, { body: { soSao: 10 } })).status, 401);
  const khac = await dangKy("Mẹ Khác");
  const khacHoa = await vaoNha(khac, "trong_giup", "Bà Khác");
  assert.equal((await m(`con/${con}/cho-vay`, { tok: khacHoa, body: { soSao: 10 } })).status, 404, "con nhà khác ⇒ không thấy");
  assert.equal((await m(`con/${con}/khoa`, { tok: khacHoa, body: { khoa: true } })).status, 404);
  assert.equal((await m("con", { tok: khacHoa, body: { ten: "x" } })).status, 403);
});

test("#492 Như Ba Mẹ: làm được mọi việc (đổi luật, mua quà, mời người, ghép máy, cho vay)", async () => {
  const lan = await dangKy("Mẹ Lan");
  const ba = await vaoNha(lan, "ba_me", "Ba Tuấn");
  const con = (await m("con", { tok: ba, body: { ten: "Bảo Anh" } })).body.id;
  assert.ok(con, "thêm con");
  assert.equal((await m("cau-hinh", { tok: ba, body: { tran_ngay: 30 } })).status, 200);
  assert.equal((await m("qua", { tok: ba, body: { ten: "Đi ăn kem", diem: 50, loai: "qua" } })).status, 200);
  assert.equal((await m("thanh-vien/moi", { tok: ba, body: { dinhDanh: sdt(), quyen: "trong_giup" } })).status, 200);
  assert.equal((await m("ma-ghep", { tok: ba, body: { con, nen: "windows" } })).status, 200);
  assert.equal((await m(`con/${con}/cho-vay`, { tok: ba, body: { soSao: 10 } })).status, 200);
  // đổi quyền một người thành Chỉ trông con ⇒ từ giờ bị chặn ngay (không cần đăng nhập lại)
  const idBa = (await m("thanh-vien", { tok: lan })).body.ds.find((x: any) => x.ten === "Ba Tuấn").id;
  assert.equal((await m(`thanh-vien/${idBa}/quyen`, { tok: lan, body: { quyen: "trong_giup" } })).body.quyen, "trong_giup");
  assert.equal((await m("qua", { tok: ba, body: { ten: "Quà lậu", diem: 10, loai: "qua" } })).body.error, "chi_xem");
  assert.equal((await m(`con/${con}/cho-vay`, { tok: ba, body: { soSao: 10 } })).status, 200, "vẫn cho vay được");
});
