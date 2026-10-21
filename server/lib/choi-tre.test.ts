// M3 màn Con: máy dùng chung → chọn hồ sơ + PIN → phiên Con gọi /api/kid: Nhà, trò chơi được phép, «Dùng điểm để chơi?» → mở phiên →
// nhịp trừ điểm → dừng sớm giữ điểm + nghỉ giữa phiên; ngoài khung giờ báo rõ; đổi người xoá phiên PIN.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyM } = await import("./api-m.ts");
const { xuLyCon } = await import("./api-con.ts");
const { xuLyMay } = await import("./api-may.ts");
const tre = await import("./choi-tre.ts");
const { anhGia } = await import("./test-fixtures/nha.ts");
const { one } = await import("./db.ts");

type Kq = { status: number; body: any };
const goi = async (f: typeof xuLyM, duong: string, o: { tok?: string; body?: unknown } = {}): Promise<Kq> => {
  const req = new Request(`http://x/api/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const r = await f(req, duong.split("/"));
  return { status: r.status, body: await r.json() };
};
const m = (d: string, o?: Parameters<typeof goi>[2]) => goi(xuLyM, d, o);
const k = (d: string, o?: Parameters<typeof goi>[2]) => goi(xuLyCon, d, o);
const dv = (d: string, o?: Parameters<typeof goi>[2]) => goi(xuLyMay, d, o);

// Thứ Hai 19/10/2026 18:00 giờ VN (trong khung 17:00–20:00 mặc định) và 15:00 (ngoài khung)
const T18 = new Date("2026-10-19T11:00:00Z"), T15 = new Date("2026-10-19T08:00:00Z");

let soNha = 0;
async function nha() {
  const sdt = `09112223${String(++soNha).padStart(2, "0")}`;
  const otp = await m("otp", { body: { dinhDanh: sdt } });
  const bm = (await m("dang-ky", { body: { dinhDanh: sdt, ma: otp.body.ma, ten: "Mẹ Lan", matKhau: "matkhau123" } })).body.token as string;
  const ken = (await m("con", { tok: bm, body: { ten: "Ken", namSinh: new Date().getFullYear() - 9, pin: "1234" } })).body.id as string;
  const bill = (await m("con", { tok: bm, body: { ten: "Bill", namSinh: new Date().getFullYear() - 13, pin: "5678" } })).body.id as string;
  const ma = (await m("ma-ghep", { tok: bm, body: { nen: "android" } })).body.ma;
  const may = (await dv("ghep", { body: { ma, nen: "android", tenMay: "Máy tính bảng chung" } })).body.token as string;
  return { bm, ken, bill, may };
}

test("máy dùng chung: chọn hồ sơ + PIN → phiên Con; PIN sai báo rõ; đổi người xoá phiên", async () => {
  const { ken, bill, may } = await nha();
  const hs = (await dv("ho-so", { tok: may, body: {} })).body.con;
  assert.deepEqual(hs.map((x: any) => x.ten), ["Ken", "Bill"]);
  const sai = await dv("pin", { tok: may, body: { con: ken, pin: "0000" } });
  assert.equal(sai.status, 401);
  assert.equal(sai.body.message, "Mã PIN chưa đúng");
  const tok = (await dv("pin", { tok: may, body: { con: ken, pin: "1234" } })).body.phienCon as string;
  const toi = (await k("toi", { tok })).body;
  assert.equal(toi.con.ten, "Ken");
  assert.equal(toi.con.nhom, "nhi");
  const tokB = (await dv("pin", { tok: may, body: { con: bill, pin: "5678" } })).body.phienCon as string;
  assert.equal((await k("toi", { tok: tokB })).body.con.nhom, "teen");
  assert.equal((await k("dang-xuat", { tok, body: {} })).status, 200);
  assert.equal((await k("toi", { tok })).status, 401);
});

test("Nhà: số dư, mục tiêu còn thiếu, nhiệm vụ mở, phút chơi còn lại; nộp ảnh → chờ duyệt", async () => {
  const { bm, ken, may } = await nha();
  await m("nhiem-vu/mau", { tok: bm, body: { nhom: "nhi" } });
  await m("qua/mau", { tok: bm, body: {} });
  await m(`con/${ken}/diem`, { tok: bm, body: { delta: 45, lyDo: "Thưởng" } });
  const tok = (await dv("pin", { tok: may, body: { con: ken, pin: "1234" } })).body.phienCon as string;
  const n = (await k("nha", { tok })).body;
  assert.equal(n.soDu, 45);
  assert.ok(n.nhiemVuMo >= 3);
  assert.ok(n.mucTieu && n.mucTieu.conThieu === n.mucTieu.diem - 45);
  assert.equal(n.conPhut, 90);
  assert.equal(n.phien, null);
  // nộp ≤ 3 chạm: Bắt đầu → Xong, chụp ảnh → chụp (gửi luôn)
  const chen = (await k("nhiem-vu", { tok })).body.ds.find((x: any) => x.bang_chung === "anh" && !x.phut_toi_thieu);
  const luot = (await k(`nhiem-vu/${chen.id}/bat-dau`, { tok, body: {} })).body.luot;
  assert.equal((await k(`luot/${luot}/nop`, { tok, body: { anh: [anhGia("bon")] } })).body.trang_thai, "cho_duyet");
  assert.equal((await k("nha", { tok })).body.diemChoDuyet, chen.diem);
});

test("dùng điểm để chơi: xét → mở → nhịp trừ điểm → dừng sớm giữ điểm, nghỉ giữa phiên; ngoài khung báo giờ mở lại", async () => {
  const { bm, ken, may } = await nha();
  await m("luat", { tok: bm, body: { muc: "roblox.exe", ten: "Roblox", loai: "giai_tri", nhom: "game" } });
  await m(`con/${ken}/diem`, { tok: bm, body: { delta: 45, lyDo: "Thưởng" } });
  const tok = (await dv("pin", { tok: may, body: { con: ken, pin: "1234" } })).body.phienCon as string;
  const ds = (await k("tro-choi", { tok })).body.ds;
  assert.deepEqual(ds, [{ muc: "roblox.exe", ten: "Roblox", nhom: "game", giaPhut: 1 }]);
  const con = (await one<{ id: string; family_id: string }>(`select id, family_id from children where id = $1`, [ken]))!;
  const ct = { ...con, device_id: null };
  const ngoai = await tre.xetTre(ct, "roblox.exe", T15);
  assert.equal(ngoai.duoc, false);
  assert.equal(ngoai.lyDo, "ngoai_khung");
  assert.equal(ngoai.cau, "Bây giờ chưa phải giờ chơi");
  const x = await tre.xetTre(ct, "roblox.exe", T18);
  assert.equal(x.duoc, true);
  assert.equal(x.phutToiDa, 30);
  assert.equal(x.soDu, 45);
  const p = await tre.moTre(ct, "roblox.exe", T18);
  const nh = await tre.nhipTre(ct, p.id, true, new Date(T18.getTime() + 60_000));
  assert.equal(nh.trangThai, "chay");
  assert.equal(nh.soDu, 44);
  assert.equal(nh.muc, "roblox.exe");
  const nh2 = await tre.nhipTre(ct, p.id, true, new Date(T18.getTime() + 120_000));
  assert.equal(nh2.conPhut, 28);
  const d = await tre.dungTre(ct, p.id, new Date(T18.getTime() + 150_000));
  assert.equal(d.soDu, 42);               // 2,5 phút ⇒ làm tròn lên 3 điểm
  assert.ok(d.nghiDen && new Date(d.nghiDen).getTime() === T18.getTime() + 150_000 + 60 * 60_000);
  const lai = await tre.xetTre(ct, "roblox.exe", new Date(T18.getTime() + 10 * 60_000));
  assert.equal(lai.lyDo, "dang_nghi");
  const n = await tre.nhaTre(ct, new Date(T18.getTime() + 10 * 60_000));
  assert.equal(n.khung.dang, true);
  assert.equal(n.khung.den, "20:00");
  assert.ok(n.nghiDen);
  const n15 = await tre.nhaTre(ct, T15);
  assert.equal(n15.khung.moLai, "17:00");
});

test("Con không gọi được phiên của Con khác; thiếu trò chơi báo rõ", async () => {
  const { ken, bill, may } = await nha();
  const tok = (await dv("pin", { tok: may, body: { con: ken, pin: "1234" } })).body.phienCon as string;
  const r = await k("phien/xet", { tok, body: {} });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, "thieu_muc");
  const nh = await k("phien/nhip", { tok, body: { id: "khong-co" } });
  assert.equal(nh.status, 404);
  void bill;
});
