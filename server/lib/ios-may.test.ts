import { test } from "node:test";
import assert from "node:assert/strict";

(process.env as Record<string, string>).NODE_ENV = "test";
delete process.env.DATABASE_URL;
const { xuLyMay } = await import("./api-may.ts");
const yc = await import("./yeu-cau.ts");
const tt = await import("./tuan-thu.ts");
const g = await import("./gia-dinh.ts");
const cd = await import("./chuyen-doi.ts");
const lk = await import("./ios-link.ts");
const { dsCanhBao } = await import("./nhat-ky.ts");
const { q, one } = await import("./db.ts");
const { taoNha } = await import("./test-fixtures/nha.ts");

const T = new Date("2026-10-24T11:00:00Z");
const nhip = async (tok: string, ios?: Record<string, unknown>) => {
  const r = await xuLyMay(new Request("http://x/api/device/nhip", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
    body: JSON.stringify({ clientTime: new Date().toISOString(), appQuanLyBat: true, ...(ios ? { ios } : {}) }) }), ["nhip"]);
  return { status: r.status, body: await r.json() as any };
};
const ios = (o: Record<string, unknown> = {}) => ({ soAppHoc: 4, soAppGiaiTri: 6, soAppChan: 9, soDanhMucGiaiTri: 2, phutDaDung: 55, uyQuyen: "child", ...o });

test("AASA: appID theo APPLE_TEAM_ID (mặc định ADUL7HT969), chỉ /cai/*; token trang cài được lọc", () => {
  assert.deepEqual(lk.aasa({}), { applinks: { details: [{ appIDs: ["ADUL7HT969.vn.aiilab.aiigrow.con"], components: [{ "/": "/cai/*" }] }] } });
  assert.equal(lk.aasa({ APPLE_TEAM_ID: "ABCDE12345" }).applinks.details[0].appIDs[0], "ABCDE12345.vn.aiilab.aiigrow.con");
  assert.equal(lk.teamId({ APPLE_TEAM_ID: "  " }), "ADUL7HT969");
  assert.equal(lk.chuanToken('ab-C_9"><script>'), "ab-C_9script");
  assert.equal(lk.lienKetApp("tok1"), "aiigrowcon://cai/tok1");
});

test("next.config: /.well-known/... và /cai/... không bị rewrite fallback nuốt (fallback chỉ chạy khi không có trang), không bị redirect", async () => {
  const cfg = (await import("../next.config.ts")).default;
  const re = (await cfg.redirects!()).map((r) => r.source);
  assert.ok(!re.some((s) => s.includes("cai") || s.includes("well-known")));
  const rw = await cfg.rewrites!() as { beforeFiles: { source: string }[]; afterFiles: { source: string }[] };
  assert.ok(![...rw.beforeFiles, ...rw.afterFiles].some((r) => /cai|well-known/.test(r.source)));
});

test("thêm giờ cho máy iOS ⇒ cua_so_den + nhịp trả grantEndsAt/moDen; máy iOS vẫn KHÔNG phải «có tác tử»; Khoá lại ngay đóng cửa sổ", async () => {
  assert.ok(cd.coCuaSoThemGio("ios") && cd.coCuaSoThemGio("mac") && cd.coCuaSoThemGio("android") && !cd.coCuaSoThemGio("tvos"));
  assert.equal(cd.coTacTu("android"), false);
  assert.equal(cd.coTacTu("ios"), false);
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Mi" });
  const r = await g.ghepMay(await g.taoMaGhep(fam, con, "ios"), "ios", "iPhone của Mi");
  const may = (await g.mayTuToken(r.token))!;
  const truoc = await nhip(r.token, ios());
  assert.equal(truoc.status, 200);
  assert.equal(truoc.body.grantEndsAt, null);
  const a = await yc.guiYeuCau(con, may.id, { loai: "them_gio", phut: 30, lyDo: "Để làm bài tập" }, T);
  await yc.dongY(fam, a.id, bm, { truDiem: false, phut: 30 }, T);
  assert.ok((await one<{ cua_so_den: Date | null }>(`select cua_so_den from grants where request_id = $1`, [a.id]))?.cua_so_den, "iOS phải có cửa sổ mở");
  const den = new Date(Date.now() + 30 * 60000);
  await q(`update grants set cua_so_den = $2 where request_id = $1`, [a.id, den]);
  const sau = await nhip(r.token, ios());
  assert.equal(sau.body.grantEndsAt, den.toISOString());
  assert.equal(sau.body.moDen, den.toISOString());
  assert.equal((await tt.dsTuanThu(fam, new Date())).find((x) => x.id === may.id)?.moDen, den.toISOString());
  await tt.huyMoKhanCap(fam, may.id, bm, new Date());
  assert.equal((await nhip(r.token, ios())).body.grantEndsAt, null);
  // mã mở offline vẫn chỉ cho máy tính có tác tử
  await assert.rejects(tt.maOfflineChoMay(fam, may.id, bm, new Date()), (e: { ma?: string }) => e.ma === "sai_nen_tang");
});

test("nhịp không có `ios` hoặc máy không phải iOS: không ghi status.ios (Android có grantEndsAt riêng)", async () => {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Bo" });
  const m = await g.ghepMay(await g.taoMaGhep(fam, con, "android"), "android", "Android của Bo");
  assert.equal((await nhip(m.token, ios())).body.grantEndsAt, null);
  assert.equal((await g.mayTuToken(m.token))!.status.ios, undefined);
  const i = await g.ghepMay(await g.taoMaGhep(fam, con, "ios"), "ios", "iPad của Bo");
  await nhip(i.token);
  assert.equal((await g.mayTuToken(i.token))!.status.ios, undefined);
});

test("lưu status.ios; số app giải trí / chặn GIẢM ⇒ cảnh báo Ba Mẹ; tăng hoặc giữ nguyên thì không", async () => {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Su" });
  const r = await g.ghepMay(await g.taoMaGhep(fam, con, "ios"), "ios", "iPhone của Su");
  await nhip(r.token, ios());
  const st = (await g.mayTuToken(r.token))!.status.ios;
  assert.equal(st.soAppGiaiTri, 6); assert.equal(st.phutDaDung, 55); assert.equal(st.uyQuyen, "child");
  await nhip(r.token, ios({ soAppGiaiTri: 7, soAppChan: 9, phutDaDung: 80 }));
  assert.equal((await dsCanhBao(fam)).filter((x) => x.loai === "ios_giam_app").length, 0);
  await nhip(r.token, ios({ soAppGiaiTri: 3, soAppChan: 9 }));
  const cb = (await dsCanhBao(fam)).filter((x) => x.loai === "ios_giam_app");
  assert.equal(cb.length, 1);
  assert.match(cb[0].noi_dung, /app giải trí.*giảm từ 7 xuống 3/);
  await nhip(r.token, ios({ soAppGiaiTri: 3, soAppChan: 2 }));
  assert.equal((await dsCanhBao(fam)).filter((x) => x.loai === "ios_giam_app").length, 2);
  assert.equal((await g.mayTuToken(r.token))!.status.ios.soAppChan, 2);
});

// ---------------------------------------------------------------- máy Con Android (agent-android/CAN-SERVER.md)
const nhipAnd = async (tok: string, o: Record<string, unknown>) => {
  const r = await xuLyMay(new Request("http://x/api/device/nhip", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${tok}` },
    body: JSON.stringify({ clientTime: new Date().toISOString(), appQuanLyBat: true, ...o }) }), ["nhip"]);
  return { status: r.status, body: await r.json() as any };
};

test("QR Device Owner Android: component + APK của tác tử máy Con, giữ Chrome/Camera; redirect /tai/aiigrow-con.apk; APK app Ba Mẹ giữ nguyên", async () => {
  const a = cd.huongDanCai("android", "TOK1", "https://app.test/");
  const qr = a.chiTiet.qrCaiDat as Record<string, unknown>;
  assert.equal(qr["android.app.extra.PROVISIONING_DEVICE_ADMIN_COMPONENT_NAME"], "vn.aiilab.aiigrow.con/vn.aiilab.aiigrow.maycon.QuanTri");
  assert.equal(qr["android.app.extra.PROVISIONING_DEVICE_ADMIN_PACKAGE_DOWNLOAD_LOCATION"], "https://app.test/tai/aiigrow-con.apk");
  assert.equal(qr["android.app.extra.PROVISIONING_LEAVE_ALL_SYSTEM_APPS_ENABLED"], true);
  assert.match(String(qr["android.app.extra.PROVISIONING_DEVICE_ADMIN_SIGNATURE_CHECKSUM"]), /^[A-Za-z0-9_-]{43}$/, "base64url SHA-256 chứng chỉ ký");
  assert.doesNotMatch(JSON.stringify(a), /\/tai\/aiigrow\.apk/);
  const cfg = (await import("../next.config.ts")).default;
  const rd = (await cfg.redirects!()) as { source: string; destination: string }[];
  assert.equal(rd.find((r) => r.source === "/tai/aiigrow-con.apk")?.destination,
    "https://github.com/tanthanhkid/aiigrow-tai/releases/download/con-android-0.2.0/AiiGrow-Con-android.apk");
});

test("máy Android: duyệt thêm giờ ⇒ cua_so_den + nhịp trả grantEndsAt/moDen; không phải «có tác tử» (không mã offline)", async () => {
  const { fam, bm } = await taoNha();
  const con = await g.taoCon(fam, { ten: "An" });
  const r = await g.ghepMay(await g.taoMaGhep(fam, con, "android"), "android", "Android của An");
  const may = (await g.mayTuToken(r.token))!;
  assert.equal((await nhipAnd(r.token, {})).body.grantEndsAt, null);
  await q(`update devices set status = coalesce(status, '{}'::jsonb) || '{"android": {}}'::jsonb where id = $1`, [may.id]);   // tác tử mới đã gửi nhịp
  const a = await yc.guiYeuCau(con, may.id, { loai: "them_gio", phut: 120, lyDo: "Để làm bài tập" }, T);
  await yc.dongY(fam, a.id, bm, { truDiem: false, phut: 120 }, T);
  assert.ok((await one<{ cua_so_den: Date | null }>(`select cua_so_den from grants where request_id = $1`, [a.id]))?.cua_so_den);
  const den = new Date(Date.now() + 45 * 60000);
  await q(`update grants set cua_so_den = $2 where request_id = $1`, [a.id, den]);
  const sau = await nhipAnd(r.token, {});
  assert.equal(sau.body.grantEndsAt, den.toISOString());
  assert.equal(sau.body.moDen, den.toISOString());
  await assert.rejects(tt.maOfflineChoMay(fam, may.id, bm, new Date()), (e: { ma?: string }) => e.ma === "sai_nen_tang");
});

test("nhịp Android lưu status.android (phút dùng theo app + quyền); deviceOwner=false / troNang=false trên Device Owner KHÔNG bị tính app_tat, usageStats=false thì có", async () => {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Ti" });
  const r = await g.ghepMay(await g.taoMaGhep(fam, con, "android"), "android", "Android của Ti");
  const k1 = await nhipAnd(r.token, { phutDungHomNay: { "com.google.android.youtube": 25, "com.x": 0, "com.bad": -3 },
    thanhPhan: { dichVu: true, quyenQuanLy: true, deviceOwner: true, troNang: false, usageStats: true } });
  assert.equal(k1.status, 200);
  const st = (await g.mayTuToken(r.token))!.status.android as any;
  assert.deepEqual(st.phutDungHomNay, { "com.google.android.youtube": 25 });
  assert.equal(st.thanhPhan.deviceOwner, true);
  assert.equal(k1.body.tuanThu.vanDe?.some?.((v: any) => v.loai === "app_tat") ?? false, false);
  // đường không reset: deviceOwner=false là bình thường; thiếu usageStats ⇒ app_tat
  const k2 = await nhipAnd(r.token, { thanhPhan: { dichVu: true, quyenQuanLy: true, deviceOwner: false, troNang: true, usageStats: false } });
  const vd = JSON.stringify(k2.body.tuanThu);
  assert.match(vd, /app_tat/); assert.match(vd, /usageStats/); assert.doesNotMatch(vd, /deviceOwner/);
  // máy không phải Android: không ghi status.android
  const i = await g.ghepMay(await g.taoMaGhep(fam, con, "ios"), "ios", "iPad của Ti");
  await nhipAnd(i.token, { phutDungHomNay: { a: 1 } });
  assert.equal((await g.mayTuToken(i.token))!.status.android, undefined);
});

test("xin thêm giờ 30/60/120 đều hợp lệ; ngoài 5–240 báo câu lỗi đúng (không còn «15, 30 hoặc 60»)", async () => {
  const { fam } = await taoNha();
  const con = await g.taoCon(fam, { ten: "Vu" });
  for (const p of [30, 60, 120]) {
    const a = await yc.guiYeuCau(con, null, { loai: "them_gio", phut: p, lyDo: "Để làm bài tập" }, new Date(T.getTime() + p * 1000));
    assert.ok(a.id);
    await q(`update requests set trang_thai = 'het_han' where id = $1`, [a.id]);
  }
  await assert.rejects(yc.guiYeuCau(con, null, { loai: "them_gio", phut: 300, lyDo: "x" }, T), (e: { ma?: string; message?: string }) => e.ma === "phut_sai" && /5 đến 240.*30, 60 hoặc 120/.test(String(e.message)));
});
