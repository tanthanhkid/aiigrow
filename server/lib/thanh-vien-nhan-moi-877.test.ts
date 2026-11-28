// #877 — tài khoản đã có nhà (Con / máy / người lớn khác) vẫn nhận được lời mời: «Mang các bé theo» / «Bỏ nhà cũ» / chỉ rời. Qua API /api/m/* trên PGlite thật.
// Dữ liệu nhà cũ gieo TỰ ĐỘNG vào MỌI bảng có cột family_id (đọc information_schema) ⇒ thêm bảng mới mà quên chuyển thì test đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyM } = await import("./api-m.ts");
const { q } = await import("./db.ts");
const { sha } = await import("./auth.ts");
const tv = await import("./thanh-vien.ts");
const { bangM4b } = await import("./tuan-thu.ts");
const { bangMang } = await import("./dns-gia-dinh.ts");
const { bangLog } = await import("./log-may.ts");
const { damBaoBang } = await import("./admin.ts");

type Kq = { status: number; body: any };
let soIp = 0;
const m = async (duong: string, o: { tok?: string; body?: unknown } = {}): Promise<Kq> => {
  const req = new Request(`http://app.vidu/api/m/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", "x-real-ip": `10.7.0.${++soIp % 250}`, ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
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
  return { tok: r.body.token as string, so };
}
const famCua = async (tok: string) => {
  const id = (await m("toi", { tok })).body.baMe.id;
  return { id, fam: (await q<{ family_id: string }>(`select family_id from parents where id = $1`, [id]))[0].family_id };
};
/** Mời `so` vào nhà của `tok` ⇒ id lời mời. */
const moi = async (tok: string, so: string, quyen = "ba_me") => (await m("thanh-vien/moi", { tok, body: { dinhDanh: so, quyen, tenGoi: "Người nhà" } })).body.id as string;
async function vaoBangLoiMoi(ma: string, ten: string) {
  const so = sdt(), otp = await m("otp", { body: { dinhDanh: so } });
  const r = await m("moi/dang-ky", { body: { ma, dinhDanh: so, otp: otp.body.ma, ten, matKhau: "matkhau123" } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.token as string;
}

const BANG_NGOAI_TRU = new Set<string>([...tv.BANG_KHONG_CHUYEN]);
async function bangCoFamilyId() {
  await tv.bangTvTb(); await bangM4b(); await bangMang(); await bangLog(); await damBaoBang();
  return (await q<{ table_name: string }>(`select table_name from information_schema.columns where column_name = 'family_id' and table_schema = 'public' order by 1`)).map((x) => x.table_name);
}

/** Gieo MỘT dòng vào mọi bảng có family_id (trừ parents / loi_moi đã có sẵn), tự điền cột bắt buộc theo kiểu + khoá ngoại. → số dòng mỗi bảng. */
async function gieo(fam: string, conId: string, mayId: string, nguoiId: string) {
  const bang = await bangCoFamilyId();
  const thuTu = ["children", "devices", ...bang.filter((b) => !["children", "devices", "parents", "loi_moi"].includes(b))];
  const dem: Record<string, number> = {};
  for (const b of thuTu) {
    const cot = await q<{ column_name: string; data_type: string; is_nullable: string; column_default: string | null }>(
      `select column_name, data_type, is_nullable, column_default from information_schema.columns where table_name = $1 and table_schema = 'public' order by ordinal_position`, [b]);
    const fk = Object.fromEntries((await q<{ col: string; bang: string }>(
      `select a.attname as col, c.confrelid::regclass::text as bang from pg_constraint c join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
        where c.contype = 'f' and c.conrelid = $1::regclass`, [b])).map((x) => [x.col, x.bang]));
    const ten: string[] = [], val: unknown[] = [];
    const them = (c: string, v: unknown) => { ten.push(c); val.push(v); };
    for (const c of cot) {
      const goi = c.column_name;
      if (goi === "family_id") { them(goi, fam); continue; }
      if (b === "children" && goi === "id") { them(goi, conId); continue; }
      if (b === "devices" && goi === "id") { them(goi, mayId); continue; }
      if (goi === "child_id" && b !== "children") { them(goi, conId); continue; }
      if (goi === "device_id" && b !== "devices" && (c.is_nullable === "NO" || b === "tuan_thu_may" || b === "device_children" || b === "dns_thiet_bi")) { them(goi, mayId); continue; }
      if (fk[goi] === "parents") { them(goi, nguoiId); continue; }
      if (c.is_nullable === "YES" || c.column_default !== null) continue;
      const k = `${b}_${goi}_${Math.random().toString(36).slice(2, 8)}`;
      if (c.data_type === "text") them(goi, goi === "token_hash" ? sha(k) : k);
      else if (["integer", "bigint", "smallint", "double precision", "numeric"].includes(c.data_type)) them(goi, 0);
      else if (c.data_type === "boolean") them(goi, false);
      else if (c.data_type === "jsonb") them(goi, "{}");
      else if (c.data_type.startsWith("timestamp")) them(goi, new Date().toISOString());
      else throw new Error(`gieo: chưa biết kiểu ${c.data_type} của ${b}.${goi}`);
    }
    if (b !== "children") await q(`insert into ${b}(${ten.join(",")}) values (${ten.map((_, i) => `$${i + 1}${["jsonb"].includes(cot.find((c) => c.column_name === ten[i])?.data_type ?? "") ? "::text::jsonb" : ""}`).join(",")})`, val);
    dem[b] = Number((await q<{ n: string }>(`select count(*) as n from ${b} where family_id = $1`, [fam]))[0].n);
  }
  return dem;
}
const demBang = async (fam: string) => Object.fromEntries(await Promise.all((await bangCoFamilyId()).map(async (b) =>
  [b, Number((await q<{ n: string }>(`select count(*) as n from ${b} where family_id = $1`, [fam]))[0].n)] as const)));

test("#877 mọi bảng có family_id đều được liệt kê: chuyển hoặc có lý do không chuyển", async () => {
  const bang = (await bangCoFamilyId()).filter((b) => b !== "families");
  const biet = new Set<string>([...tv.BANG_CHUYEN_NHA, ...tv.BANG_KHONG_CHUYEN]);
  assert.deepEqual(bang.filter((b) => !biet.has(b)), [], "bảng mới có family_id mà chưa khai báo trong BANG_CHUYEN_NHA / BANG_KHONG_CHUYEN");
  assert.deepEqual([...biet].filter((b) => !bang.includes(b)), [], "khai báo bảng không còn tồn tại");
});

test("#877 nhánh 1 «Mang các bé theo»: Con + máy + dữ liệu của MỌI bảng sang nhà mời, token máy giữ nguyên, nhà cũ xoá", async () => {
  const a = await dangKy("Mẹ Anh"), b = await dangKy("Bà Bình");
  const { fam: famA } = await famCua(a.tok), { id: idB, fam: famB } = await famCua(b.tok);
  const conA = (await m("con", { tok: a.tok, body: { ten: "Bé Anh" } })).body.id;
  const conB = (await m("con", { tok: b.tok, body: { ten: "Bé Bình" } })).body.id;
  const mayB = `may-${idB}`;
  const dem = await gieo(famB, conB, mayB, idB);
  for (const t of tv.BANG_CHUYEN_NHA) assert.ok(dem[t] >= 1, `gieo thiếu ${t}`);
  // sao / nhiệm vụ của Con theo child_id (không có family_id) phải còn nguyên
  await q(`insert into points(id, child_id, delta, loai, ly_do) values ('p877', $1, 7, 'nhiem_vu', 'x')`, [conB]);
  const tokenHash = (await q<{ token_hash: string }>(`select token_hash from devices where id = $1`, [mayB]))[0].token_hash;
  const truoc = { A: await demBang(famA) };
  const id = await moi(a.tok, b.so);

  // bước xác nhận: hiện nhà cũ có gì
  const nc = (await m("moi/nha-cu", { tok: b.tok })).body;
  assert.deepEqual([nc.soBe, nc.soMay, nc.soNguoiLon, nc.laNguoiLonDuyNhat, nc.tenBe], [1, 1, 1, true, ["Bé Bình"]]);
  // không chọn hướng ⇒ 409, chưa đổi gì
  const chua = await m("moi/nhan", { tok: b.tok, body: { id } });
  assert.deepEqual([chua.status, chua.body.error], [409, "can_chon_nha_cu"]);
  assert.equal((await famCua(b.tok)).fam, famB);
  assert.equal((await m("moi/nhan", { tok: b.tok, body: { id, huong: "la" } })).body.error, "huong_sai");

  const r = await m("moi/nhan", { tok: b.tok, body: { id, huong: "mang_theo" } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(r.body.mangTheo, { soBe: 1, soMay: 1 });
  assert.equal((await famCua(b.tok)).fam, famA);
  // MỌI bảng: không còn dòng nào ở nhà cũ (trừ audit mốc xoá), nhà mời nhận đủ
  const sau = await demBang(famA);
  for (const t of tv.BANG_CHUYEN_NHA) {
    if (t === "audit") continue;
    const them = sau[t] - (truoc.A[t] ?? 0);
    if (t === "events") assert.ok(them >= dem[t], "events chuyển thiếu");      // thêm sự kiện mời / «vào nhà» của chính lượt nhận
    else assert.equal(them, dem[t], `bảng ${t} chuyển thiếu/thừa`);
    assert.equal(Number((await q<{ n: string }>(`select count(*) as n from ${t} where family_id = $1`, [famB]))[0].n), 0, `${t} còn ở nhà cũ`);
  }
  assert.ok(sau.audit - truoc.A.audit >= dem.audit, "audit chuyển");
  assert.equal((await q(`select 1 from families where id = $1`, [famB])).length, 0, "nhà cũ phải bị xoá");
  assert.deepEqual((await q<{ hanh_dong: string }>(`select hanh_dong from audit where family_id = $1`, [famB])).map((x) => x.hanh_dong), ["xoa_gia_dinh"]);
  // máy Con: cùng token ⇒ tra ra nhà mời; Con vẫn gắn máy; sao còn
  const may = (await q<{ family_id: string; token_hash: string; child_id: string | null }>(`select family_id, token_hash, child_id from devices where id = $1`, [mayB]))[0];
  assert.deepEqual([may.family_id, may.token_hash, may.child_id], [famA, tokenHash, conB]);
  assert.equal((await q(`select 1 from device_children where device_id = $1 and child_id = $2 and family_id = $3`, [mayB, conB, famA])).length, 1);
  assert.equal((await q(`select 1 from points where child_id = $1 and delta = 7`, [conB])).length, 1);
  // nhà mời thấy cả hai bé
  const g = (await m("gia-dinh", { tok: a.tok })).body;
  assert.deepEqual(g.con.map((c: any) => c.ten).sort(), ["Bé Anh", "Bé Bình"]);
  assert.equal(conA === conB, false);
  // B (không còn là chủ nhà) thấy cả hai bé, quyền như lời mời
  assert.equal((await m("gia-dinh", { tok: b.tok })).body.con.length, 2);
  assert.equal((await m("toi", { tok: b.tok })).body.baMe.laChuNha, false);
  // sự kiện «vào nhà» ghi mang theo
  assert.ok((await q(`select 1 from events where family_id = $1 and loai = 'thanh_vien_vao' and chi_tiet->'mangTheo'->>'soBe' = '1'`, [famA])).length >= 1);
});

test("#877 nhánh 2 «Bỏ nhà cũ»: xoá nhà cũ + dữ liệu, vào nhà mời; còn máy đã ghép ⇒ phải gỡ máy trước", async () => {
  const a = await dangKy("Mẹ Cúc"), b = await dangKy("Bà Dung"), c = await dangKy("Bà Em");
  const { fam: famA } = await famCua(a.tok), { id: idB, fam: famB } = await famCua(b.tok), { id: idC, fam: famC } = await famCua(c.tok);
  const conB = (await m("con", { tok: b.tok, body: { ten: "Bé Dung" } })).body.id;
  const conC = (await m("con", { tok: c.tok, body: { ten: "Bé Em" } })).body.id;
  await gieo(famB, conB, `may-${idB}`, idB);
  const idMoiB = await moi(a.tok, b.so), idMoiC = await moi(a.tok, c.so);
  // B còn máy ⇒ không bỏ được, giữ nguyên
  const r0 = await m("moi/nhan", { tok: b.tok, body: { id: idMoiB, huong: "bo_nha_cu" } });
  assert.deepEqual([r0.status, r0.body.error], [409, "con_may"]);
  assert.equal((await famCua(b.tok)).fam, famB);
  assert.equal((await q(`select 1 from children where id = $1`, [conB])).length, 1);
  // C không máy ⇒ bỏ được
  await gieo(famC, conC, `may-${idC}`, idC);
  await q(`delete from devices where family_id = $1`, [famC]);
  const r = await m("moi/nhan", { tok: c.tok, body: { id: idMoiC, huong: "bo_nha_cu" } });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await famCua(c.tok)).fam, famA);
  assert.equal((await q(`select 1 from families where id = $1`, [famC])).length, 0);
  for (const t of await bangCoFamilyId()) if (t !== "audit") assert.equal(Number((await q<{ n: string }>(`select count(*) as n from ${t} where family_id = $1`, [famC]))[0].n), 0, `${t} còn dữ liệu nhà đã bỏ`);
  assert.equal((await q(`select 1 from children where id = $1`, [conC])).length, 0, "Con của nhà bỏ phải xoá");
  assert.deepEqual((await q<{ hanh_dong: string }>(`select hanh_dong from audit where family_id = $1`, [famC])).filter((x) => x.hanh_dong === "xoa_gia_dinh").length, 1);
  assert.equal((await m("gia-dinh", { tok: a.tok })).body.con.length, 0, "nhà mời không nhận Con của nhà bỏ");
});

test("#877 nhánh 3 nhà cũ còn người lớn khác: chỉ mình rời, Con / máy ở lại với người còn lại, chủ nhà chuyển đúng", async () => {
  const a = await dangKy("Mẹ Lan"), b = await dangKy("Bà Hoa");
  const { fam: famA } = await famCua(a.tok), { id: idB, fam: famB } = await famCua(b.tok);
  const conB = (await m("con", { tok: b.tok, body: { ten: "Bé Hoa" } })).body.id;
  await gieo(famB, conB, `may-${idB}`, idB);
  // C vào nhà B (Người trông giúp) — người lớn khác
  const mc = (await m("thanh-vien/moi", { tok: b.tok, body: { quyen: "trong_giup" } })).body;
  const tokC = await vaoBangLoiMoi(mc.ma, "Chú Cường");
  const idC = (await famCua(tokC)).id;
  const truocB = await demBang(famB);
  assert.deepEqual((({ soNguoiLon, laNguoiLonDuyNhat, laChu }) => ({ soNguoiLon, laNguoiLonDuyNhat, laChu }))((await m("moi/nha-cu", { tok: b.tok })).body), { soNguoiLon: 2, laNguoiLonDuyNhat: false, laChu: true });
  const r = await m("moi/nhan", { tok: b.tok, body: { id: await moi(a.tok, b.so, "ba_me") } });   // không cần huong
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.equal((await famCua(b.tok)).fam, famA);
  // nhà B còn nguyên; C là chủ + Ba Mẹ
  assert.deepEqual(await demBang(famB), { ...truocB, parents: 1, events: truocB.events + 1 });
  const f = (await q<{ chu_id: string }>(`select chu_id from families where id = $1`, [famB]))[0];
  assert.equal(f.chu_id, idC);
  assert.equal((await q<{ vai: string }>(`select vai from parents where id = $1`, [idC]))[0].vai, "ba_me");
  assert.equal((await m("toi", { tok: tokC })).body.baMe.laChuNha, true);
  assert.equal((await m("gia-dinh", { tok: tokC })).body.con.length, 1);
  assert.equal((await q(`select 1 from devices where family_id = $1`, [famB])).length, 1);
  // nhà mời không nhận Con của nhà B
  assert.equal((await m("gia-dinh", { tok: a.tok })).body.con.length, 0);
});

test("#877 quá giới hạn thành viên: lỗi du_thanh_vien, không đổi gì (Con / máy nhà cũ còn nguyên)", async () => {
  const a = await dangKy("Mẹ Đầy"), b = await dangKy("Bà Gần");
  const { fam: famA } = await famCua(a.tok), { id: idB, fam: famB } = await famCua(b.tok);
  const idMoiB = await moi(a.tok, b.so, "trong_giup");
  for (let i = 0; i < 7; i++) await vaoBangLoiMoi((await m("thanh-vien/moi", { tok: a.tok, body: { quyen: "trong_giup" } })).body.ma, `Người ${i}`);
  assert.equal((await q(`select 1 from parents where family_id = $1 and vai <> 'roi'`, [famA])).length, 8);
  const conB = (await m("con", { tok: b.tok, body: { ten: "Bé Gần" } })).body.id;
  await gieo(famB, conB, `may-${idB}`, idB);
  const truoc = await demBang(famB);
  const id = idMoiB;
  const r = await m("moi/nhan", { tok: b.tok, body: { id, huong: "mang_theo" } });
  assert.deepEqual([r.status, r.body.error], [409, "du_thanh_vien"]);
  assert.equal((await famCua(b.tok)).fam, famB);
  assert.deepEqual(await demBang(famB), truoc);
});

test("#877 không nhận lời mời của chính nhà mình; giao dịch đổi nhà không rơi dở khi lỗi giữa chừng", async () => {
  const a = await dangKy("Mẹ Tự");
  const { fam } = await famCua(a.tok);
  const ma = (await m("thanh-vien/moi", { tok: a.tok, body: { quyen: "ba_me" } })).body.ma;
  assert.equal((await m("moi/nhan", { tok: a.tok, body: { ma } })).body.error, "da_trong_gia_dinh");
  assert.equal((await famCua(a.tok)).fam, fam);
});

test("#877 lời mời «Chỉ trông con» không cho mang Con theo; thiết bị DNS không agent tính là máy", async () => {
  const a = await dangKy("Mẹ Quân"), b = await dangKy("Bà Sáu");
  const { fam: famA } = await famCua(a.tok), { id: idB, fam: famB } = await famCua(b.tok);
  const conB = (await m("con", { tok: b.tok, body: { ten: "Bé Sáu" } })).body.id;
  await gieo(famB, conB, `may-${idB}`, idB);
  await q(`delete from devices where family_id = $1`, [famB]);
  await q(`update dns_thiet_bi set device_id = null where family_id = $1`, [famB]);
  assert.equal((await m("moi/nha-cu", { tok: b.tok })).body.soMay, 1, "thiết bị DNS không agent là máy");
  const id = await moi(a.tok, b.so, "trong_giup");
  const r = await m("moi/nhan", { tok: b.tok, body: { id, huong: "mang_theo" } });
  assert.deepEqual([r.status, r.body.error], [409, "mang_theo_can_ba_me"]);
  assert.equal((await famCua(b.tok)).fam, famB);
  const r2 = await m("moi/nhan", { tok: b.tok, body: { id, huong: "bo_nha_cu" } });
  assert.deepEqual([r2.status, r2.body.error], [409, "con_may"]);      // còn thiết bị DNS ⇒ gỡ trước
  assert.equal((await q(`select 1 from families where id = $1`, [famB])).length, 1);
  assert.equal(famA === famB, false);
});
