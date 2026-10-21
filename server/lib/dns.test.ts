// M4b kiểm soát MẠNG: hồ sơ DNS gia đình (mobileconfig / Private DNS / DoH Windows), chính sách DNS + xét truy vấn, adapter nhà cung cấp
// (tự host, NextDNS chế độ giả), máy con loại mạng (TV, console): nhật ký tóm tắt, vượt giờ, mất truy vấn; cách ly gia đình. Không cần thiết bị.
import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
delete process.env.NEXTDNS_API_KEY;
process.env.AIIGROW_DNS_GOC = "dns.thu.vn";
process.env.AIIGROW_DNS_IPV4 = "203.0.113.10";
const hs = await import("./ho-so-dns.ts");
const hd = await import("./huong-dan-mang.ts");
const dns = await import("./dns-gia-dinh.ts");
const g = await import("./gia-dinh.ts");
const la = await import("./luat-app.ts");
const { dungChinhSach } = await import("./chinh-sach.ts");
const { thamSo } = await import("./cau-hinh.ts");
const { tongHop } = await import("./tuan-thu.ts");
const { taoPhien } = await import("./auth.ts");
const { xuLyM } = await import("./api-m.ts");
const { xuLyMay } = await import("./api-may.ts");
const { xuLyDns } = await import("./api-dns.ts");
const { q } = await import("./db.ts");
const { taoNha, taoBaMe } = await import("./test-fixtures/nha.ts");

const VN = (s: string) => new Date(`${s}+07:00`);
const sau = (d: Date, phut: number) => new Date(d.getTime() + phut * 60000);

async function goi(f: (r: Request, p: string[]) => Promise<Response>, goc: string, duong: string, o: { tok?: string; body?: unknown } = {}) {
  const req = new Request(`http://x.test/api/${goc}/${duong}`, {
    method: o.body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", ...(o.tok ? { authorization: `Bearer ${o.tok}` } : {}) },
    body: o.body === undefined ? undefined : JSON.stringify(o.body),
  });
  const r = await f(req, duong.split("?")[0].split("/"));
  const text = await r.text();
  let body: any = text;
  try { body = JSON.parse(text); } catch { /* không phải JSON */ }
  return { status: r.status, body, type: r.headers.get("content-type") };
}
const m = (d: string, o?: { tok?: string; body?: unknown }) => goi(xuLyM, "m", d, o);
const rs = (d: string, o?: { tok?: string; body?: unknown }) => goi(xuLyDns, "dns", d, o);

function csThuan(o: { khoaNgay?: boolean } = {}) {
  const p = {
    serverTime: VN("2026-10-21T18:00:00").toISOString(), nextCheckSec: 300, gioMaySai: false, con: { id: "c", ten: "Ken", nhom: "nhi" },
    canChonCon: false, allowlistHeThong: ["explorer.exe", "aiilab.vn", "com.android.settings"],
    luat: [{ muc: "youtube.com", loai: "giai_tri" as const, nhom: "video_ngan", giaPhanNghin: 2000 }, { muc: "tiktok.com", loai: "chan" as const, nhom: null, giaPhanNghin: null },
      { muc: "scratch.mit.edu", loai: "hoc" as const, nhom: null, giaPhanNghin: null }, { muc: "roblox.exe", loai: "giai_tri" as const, nhom: "game", giaPhanNghin: 1000 }],
    lich: { ngayThuong: [{ tu: "17:00", den: "20:00" }], cuoiTuan: [{ tu: "09:00", den: "21:00" }], ngu: { tu: "21:00", den: "06:30" } },
    khoaNgay: o.khoaNgay === true, soDu: 0, phien: null, tz: "Asia/Ho_Chi_Minh", lechGioPhut: 10, phienToiDa: 30,
  };
  return dungChinhSach(p, { ts: thamSo(), may: { id: "x", name: "TV", platform: "android", dung_chung: false }, tuanThu: tongHop([], 80, null, new Date()), phutThem: 0, mucTamThoi: [] });
}

test("chính sách DNS + xét truy vấn: học luôn mở, chặn luôn chặn, giải trí chỉ trong lịch; TV ngoài giờ chặn mọi tên miền trừ danh sách cho phép", () => {
  const tv = hs.chinhSachDns(csThuan(), { nhan: "abc", ten: "TV", loai: "tv" });
  assert.deepEqual(tv.chan, ["tiktok.com"]);
  assert.deepEqual(tv.giaiTri, ["youtube.com"]);
  assert.ok(tv.choPhep.includes("aiilab.vn") && tv.choPhep.includes("scratch.mit.edu") && !tv.choPhep.includes("com.android.settings"));
  const trong = VN("2026-10-21T18:00:00"), ngoai = VN("2026-10-21T15:00:00");
  assert.deepEqual(hs.xetTruyVan(tv, "M.YouTube.com.", trong), { chan: false, lyDo: "mo", ngoaiGio: false });
  assert.deepEqual(hs.xetTruyVan(tv, "www.youtube.com", ngoai), { chan: true, lyDo: "ngoai_gio", ngoaiGio: true });
  assert.equal(hs.xetTruyVan(tv, "netflix.com", ngoai).lyDo, "ngoai_gio", "TV: ngoài giờ chặn cả tên miền chưa xếp");
  assert.equal(hs.xetTruyVan(tv, "vt.tiktok.com", trong).lyDo, "bi_chan");
  assert.equal(hs.xetTruyVan(tv, "scratch.mit.edu", VN("2026-10-21T23:00:00")).lyDo, "cho_phep");
  const may = hs.chinhSachDns(csThuan(), { nhan: "m", ten: "Laptop", loai: "agent" });
  assert.equal(hs.xetTruyVan(may, "netflix.com", ngoai).chan, false, "máy có agent: tên miền chưa xếp do agent xử, DNS không chặn");
  assert.equal(hs.xetTruyVan(hs.chinhSachDns(csThuan({ khoaNgay: true }), { nhan: "abc", ten: "TV", loai: "tv" }), "youtube.com", trong).lyDo, "khoa");
});

test("hồ sơ Apple .mobileconfig: payload com.apple.dnsSettings.managed + DoH, gỡ được, UUID ổn định, thoát ký tự XML", () => {
  const a = hs.taoMobileconfig({ nhan: "ab12", tenThietBi: "iPad <Ken> & Bin", tenGiaDinh: "Nhà Lan", dohUrl: "https://dns.thu.vn/dns-query/ab12" });
  const b = hs.taoMobileconfig({ nhan: "ab12", tenThietBi: "iPad <Ken> & Bin", tenGiaDinh: "Nhà Lan", dohUrl: "https://dns.thu.vn/dns-query/ab12" });
  assert.equal(a, b, "cùng thiết bị ⇒ cùng UUID (cài lại thay thế, không nhân bản)");
  assert.match(a, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
  assert.match(a, /<key>PayloadType<\/key>\s*<string>com\.apple\.dnsSettings\.managed<\/string>/);
  assert.match(a, /<key>DNSProtocol<\/key>\s*<string>HTTPS<\/string>/);
  assert.match(a, /<key>ServerURL<\/key>\s*<string>https:\/\/dns\.thu\.vn\/dns-query\/ab12<\/string>/);
  assert.match(a, /<key>PayloadType<\/key>\s*<string>Configuration<\/string>/);
  assert.match(a, /<key>PayloadRemovalDisallowed<\/key>\s*<false\/>/, "minh bạch: gỡ được");
  assert.match(a, /iPad &lt;Ken&gt; &amp; Bin/);
  assert.ok(!a.includes("<Ken>"));
  const uuids = [...a.matchAll(/<key>PayloadUUID<\/key>\s*<string>([0-9A-F-]{36})<\/string>/g)].map((x) => x[1]);
  assert.equal(new Set(uuids).size, 2);
});

test("Android Private DNS + mẫu DoH Windows; thiếu IP resolver ⇒ nói rõ chưa đặt được", () => {
  const d = hs.tuHost({ goc: "dns.thu.vn", ipv4: ["203.0.113.10"] }).diemCuoi({ nhan: "ab12" });
  assert.deepEqual([d.dohUrl, d.dotHost], ["https://dns.thu.vn/dns-query/ab12", "ab12.dns.thu.vn"]);
  assert.equal(hs.hoSoAndroid(d).privateDns, "ab12.dns.thu.vn");
  const w = hs.mauDohWindows(d);
  assert.deepEqual(w.powerShell![0], "Add-DnsClientDohServerAddress -ServerAddress '203.0.113.10' -DohTemplate 'https://dns.thu.vn/dns-query/ab12' -AllowFallbackToUdp $False -AutoUpgrade $True");
  assert.match(w.netsh![0], /^netsh dns add encryption server=203\.0\.113\.10 dohtemplate=https:\/\/dns\.thu\.vn\/dns-query\/ab12 autoupgrade=yes udpfallback=no$/);
  const khong = hs.mauDohWindows(hs.tuHost({ goc: "dns.thu.vn", ipv4: [] }).diemCuoi({ nhan: "x" }));
  assert.equal(khong.powerShell, null);
  assert.match(khong.ghiChu, /Chưa có IP/);
});

test("adapter NextDNS: thiếu khoá ⇒ chế độ giả (chỉ trả yêu cầu, không gửi); có khoá ⇒ gửi đúng API với X-Api-Key; nhật ký NextDNS ⇒ tóm tắt", async () => {
  const c = hs.chinhSachDns(csThuan(), { nhan: "ab12", ten: "TV", loai: "tv" });
  let goiMang = 0;
  const gia = hs.nextDns({ hoSo: "abc123", khoa: null, fetch: (async () => { goiMang++; return new Response("{}"); }) as typeof fetch });
  const kq = await gia.dayChinhSach(c);
  assert.equal(kq.cheDo, "gia");
  assert.equal(goiMang, 0, "không có khoá ⇒ không gọi mạng");
  assert.deepEqual(kq.yeuCau[0], { method: "POST", url: "https://api.nextdns.io/profiles/abc123/denylist", body: { id: "tiktok.com", active: true } });
  assert.deepEqual(gia.diemCuoi({ nhan: "ab12" }).dotHost, "aiigrow-ab12-abc123.dns.nextdns.io");
  assert.equal(gia.diemCuoi({ nhan: "ab12" }).dohUrl, "https://dns.nextdns.io/abc123/aiigrow-ab12");
  const da: { url: string; key: string | null }[] = [];
  const that = hs.nextDns({ hoSo: "abc123", khoa: "khoa-thu", fetch: (async (u: string, i: RequestInit) => { da.push({ url: u, key: new Headers(i.headers).get("x-api-key") }); return new Response("{}"); }) as unknown as typeof fetch });
  assert.equal((await that.dayChinhSach(c)).cheDo, "that");
  assert.equal(da.length, c.chan.length + c.choPhep.length);
  assert.ok(da.every((x) => x.key === "khoa-thu"));
  const t = hs.tomTatNhatKyNextDns([{ domain: "youtube.com", status: "blocked", device: { name: "aiigrow-ab12" } },
    { domain: "youtube.com", status: "default", device: { name: "aiigrow-ab12" } }, { domain: "x.com", device: { name: "iphone-cua-ba" } }]);
  assert.deepEqual(t, [{ nhan: "ab12", ds: [{ tenMien: "youtube.com", soLan: 2, soLanChan: 1, ngoaiGio: 0 }] }]);
});

test("hướng dẫn router / TV: đủ hãng phổ biến ở VN, «chỉ làm 1 lần», chưa hãng nào tự cấu hình (không có API chính thức), có giới hạn DNS", () => {
  const ma = hd.HUONG_DAN_ROUTER.map((r) => r.ma);
  for (const x of ["tplink", "viettel", "fpt", "vnpt"]) assert.ok(ma.includes(x), x);
  assert.ok(hd.HUONG_DAN_ROUTER.every((r) => r.buoc.length >= 3 && !r.tuCauHinh && !hd.coTheTuCauHinh(r.ma)));
  for (const x of ["samsung", "lg", "google_tv", "apple_tv", "ps5", "xbox", "switch"]) assert.ok(hd.HUONG_DAN_TV.some((t) => t.ma === x), x);
  assert.match(hd.CHI_MOT_LAN, /1 lần, phủ cả nhà/);
  assert.ok(hd.GIOI_HAN_DNS.some((x) => /TÊN MIỀN/.test(x)) && hd.GIOI_HAN_DNS.some((x) => /đổi DNS tay/.test(x)));
  const tatCa = JSON.stringify(hd.HUONG_DAN_ROUTER);
  assert.ok(!/admin\/admin|mật khẩu mặc định/i.test(tatCa), "không ghi / gợi ý mật khẩu router");
});

test("máy con loại mạng qua API: thêm TV, lấy hồ sơ + .mobileconfig; resolver kéo chính sách, gửi nhật ký tóm tắt; vượt giờ báo một lần / ngày", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ken" });
  await la.datLuat(fam, { muc: "tiktok.com", loai: "chan" });
  const tok = await taoPhien(bm);
  const id = (await m("dns/thiet-bi", { tok, body: { con, ten: "TV phòng khách", loai: "tv", mac: "AA-BB-CC-DD-EE-01" } })).body.id;
  const h = (await m(`dns/thiet-bi/${id}/ho-so`, { tok })).body;
  assert.equal(h.nhaCungCap, "tu_host");
  assert.equal(h.android.privateDns, `${h.thietBi.nhan}.dns.thu.vn`);
  assert.deepEqual(h.dnsThuong.ipv4, ["203.0.113.10"]);
  assert.match(h.dnsThuong.chiMotLan, /phủ cả nhà/);
  const mc = await m(`dns/thiet-bi/${id}/mobileconfig`, { tok });
  assert.equal(mc.type, "application/x-apple-aspen-config");
  assert.match(mc.body, /com\.apple\.dnsSettings\.managed/);
  // resolver
  delete process.env.AIIGROW_DNS_BI_MAT;
  assert.equal((await rs(`chinh-sach/${h.thietBi.nhan}`, { tok: "x" })).status, 503);
  process.env.AIIGROW_DNS_BI_MAT = "bi-mat-resolver-thu";
  assert.equal((await rs(`chinh-sach/${h.thietBi.nhan}`, { tok: "sai" })).status, 401);
  const cs = (await rs(`chinh-sach/${h.thietBi.nhan}`, { tok: "bi-mat-resolver-thu" })).body;
  assert.deepEqual([cs.thietBi.loai, cs.chanTatCaNgoaiGio, cs.chan], ["tv", true, ["tiktok.com"]]);
  assert.equal((await rs("chinh-sach/khong-co", { tok: "bi-mat-resolver-thu" })).status, 404);
  const n = await rs("nhat-ky", { tok: "bi-mat-resolver-thu", body: { nhan: h.thietBi.nhan, ds: [
    { tenMien: "YouTube.com", soLan: 12, soLanChan: 12, ngoaiGio: 12 }, { tenMien: "khong hop le", soLan: 1 }] } });
  assert.equal(n.body.nhan, 1);
  assert.equal((await q(`select 1 from alerts where family_id = $1 and loai = 'dns_vuot_gio'`, [fam])).length, 0, "12 < ngưỡng 20");
  await rs("nhat-ky", { tok: "bi-mat-resolver-thu", body: { nhan: h.thietBi.nhan, ds: [{ tenMien: "youtube.com", soLan: 10, soLanChan: 10, ngoaiGio: 10 }] } });
  await rs("nhat-ky", { tok: "bi-mat-resolver-thu", body: { nhan: h.thietBi.nhan, ds: [{ tenMien: "netflix.com", soLan: 5, soLanChan: 5, ngoaiGio: 5 }] } });
  assert.equal((await q(`select 1 from alerts where family_id = $1 and loai = 'dns_vuot_gio'`, [fam])).length, 1, "vượt ngưỡng ⇒ một cảnh báo / ngày");
  const tt = (await m(`dns/thiet-bi/${id}/nhat-ky`, { tok })).body;
  assert.deepEqual(tt.ds[0], { tenMien: "youtube.com", soLan: 22, soLanChan: 22, ngoaiGio: 22 });
  assert.equal(tt.tong, 27);
  assert.ok(Object.keys(tt.ds[0]).every((k) => ["tenMien", "soLan", "soLanChan", "ngoaiGio"].includes(k)), "chỉ tên miền + đếm");
  const ds = (await m("dns", { tok })).body;
  assert.equal(ds.thietBi[0].trangThai, "qua_bo_loc");
  assert.ok(ds.huongDan.router.length && ds.huongDan.tv.length);
  // đẩy chính sách: tự host ⇒ không cần (resolver kéo); NextDNS không khoá ⇒ chế độ giả
  assert.equal((await m(`dns/thiet-bi/${id}/day`, { tok, body: {} })).body.cheDo, "khong_can");
  assert.equal((await m("dns/nha-cung-cap", { tok, body: { loai: "nextdns", hoSo: "abc123" } })).body.hoSo, "abc123");
  assert.equal((await m(`dns/thiet-bi/${id}/day`, { tok, body: {} })).body.cheDo, "gia");
  assert.match((await m(`dns/thiet-bi/${id}/ho-so`, { tok })).body.android.privateDns, /\.dns\.nextdns\.io$/);
  assert.equal((await m("dns/nha-cung-cap", { tok, body: { loai: "nextdns" } })).status, 400);
  // vai Chỉ xem không thêm / xoá được
  const xem = await taoPhien(await taoBaMe(fam, "Bà", "xem"));
  assert.equal((await m("dns/thiet-bi", { tok: xem, body: { ten: "TV 2" } })).status, 403);
});

test("mất truy vấn quá ngưỡng ⇒ báo MỘT lần mỗi lần mất (TV tắt hoặc DNS bị đổi tay); có truy vấn lại ⇒ ghi sự kiện; lần mất sau báo lại", async () => {
  const { fam } = await taoNha("Hoa");
  const id = await dns.themThietBiMang(fam, { ten: "PS5", loai: "console" });
  const t = (await q<{ nhan: string }>(`select nhan from dns_thiet_bi where id = $1`, [id]))[0];
  const t0 = VN("2026-10-21T10:00:00");
  assert.equal((await dns.quetMatTruyVan(fam, sau(t0, 600))).length, 0, "chưa từng thấy truy vấn ⇒ không báo");
  await dns.nhanNhatKy(t.nhan, [{ tenMien: "playstation.net", soLan: 3 }], t0);
  assert.equal((await dns.quetMatTruyVan(fam, sau(t0, 120))).length, 0, "120 < 180 phút");
  assert.equal((await dns.quetMatTruyVan(fam, sau(t0, 200))).length, 1);
  assert.equal((await dns.quetMatTruyVan(fam, sau(t0, 400))).length, 0, "không báo trùng");
  assert.equal((await dns.dsThietBiDns(fam, sau(t0, 400)))[0].trangThai, "mat_truy_van");
  await dns.nhanNhatKy(t.nhan, [{ tenMien: "playstation.net", soLan: 1 }], sau(t0, 500));
  assert.equal((await q(`select 1 from events where family_id = $1 and loai = 'dns_tro_lai'`, [fam])).length, 1);
  assert.equal((await dns.quetMatTruyVan(fam, sau(t0, 700))).length, 1, "lần mất sau ⇒ báo lại");
  assert.equal((await q(`select 1 from alerts where family_id = $1 and loai = 'dns_mat_truy_van'`, [fam])).length, 2);
});

test("máy có agent: trình cài lấy hồ sơ DNS của chính máy qua /api/device/ho-so-dns (cùng nhãn với app Ba Mẹ); cách ly gia đình", async () => {
  const { fam, bm } = await taoNha("Lan");
  const con = await g.taoCon(fam, { ten: "Ken" });
  const ghep = await g.ghepMay(await g.taoMaGhep(fam, con, "ios"), "ios", "iPad của Ken");
  const tu = (await goi(xuLyMay, "device", "ho-so-dns", { tok: ghep.token, body: {} })).body;
  assert.equal(tu.thietBi.loai, "agent");
  assert.match(tu.apple.mobileconfig, /DNSSettings/);
  const tok = await taoPhien(bm);
  assert.equal((await m(`may/${ghep.deviceId}/ho-so-dns`, { tok })).body.thietBi.nhan, tu.thietBi.nhan);
  const khac = await taoNha("Mai");
  const tokKhac = await taoPhien(khac.bm);
  const tv = await dns.themThietBiMang(fam, { ten: "TV", loai: "tv" });
  for (const d of [`may/${ghep.deviceId}/ho-so-dns`, `dns/thiet-bi/${tv}/ho-so`, `dns/thiet-bi/${tv}/mobileconfig`, `dns/thiet-bi/${tv}/nhat-ky`])
    assert.equal((await m(d, { tok: tokKhac })).status, 404, d);
  assert.equal((await m(`dns/thiet-bi/${tv}/xoa`, { tok: tokKhac, body: {} })).status, 404);
  assert.equal((await m("dns/thiet-bi", { tok: tokKhac, body: { con, ten: "TV lạ" } })).status, 404, "không gắn được Con nhà khác");
  assert.deepEqual((await m("dns", { tok: tokKhac })).body.thietBi, []);
});
