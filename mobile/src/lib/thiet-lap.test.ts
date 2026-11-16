// node --test src/lib/thiet-lap.test.ts — thân POST thiet-lap không được tự đổi chế độ App & web của Con (B1 06/11).
import { test } from "node:test";
import assert from "node:assert/strict";
import { appsRobChonSan, thanThietLap } from "./thiet-lap.ts";

test("chưa chọn chế độ ⇒ KHÔNG gửi cheDo (máy chủ giữ chế độ đang có, Con mới = Theo danh sách)", () => {
  const b = thanThietLap({ conId: "c1", tenCon: "Phát" });
  assert.equal("cheDo" in b, false);
  assert.equal("cheDoChan" in b, false);
  assert.equal("gioChoi" in b, false);
  assert.equal("saoKhoiDau" in b, false);
  assert.equal("ngu" in b, false);
});

test("Ba Mẹ đã chọn «Mở hết» ⇒ gửi đúng mo_het; app theo mã / theo tên", () => {
  const b = thanThietLap({ conId: "c1", tenCon: "Phát", cheDoChan: "mo_het", apps: [{ ma: "roblox", ten: "Roblox" }, { ten: "Sách", tinhGio: false }] });
  assert.equal(b.cheDo, "mo_het");
  assert.deepEqual(b.apps, [{ ma: "roblox" }, { ten: "Sách", tinhGio: false, nhom: "khong_tinh_phut" }]);
  // mã nội bộ cũ «chi_app_duoc_phep» ⇒ gửi «theo_danh_sach» (#262)
  assert.equal(thanThietLap({ conId: "c1", cheDoChan: "chi_app_duoc_phep" }).cheDo, "theo_danh_sach");
});

test("15/11 bm1-ob-gio: bỏ quỹ ngày; sao khởi đầu Ba Mẹ chọn (kể cả 0) gửi kèm", () => {
  assert.equal(thanThietLap({ conId: "c1", saoKhoiDau: 0 }).saoKhoiDau, 0);
  assert.equal(thanThietLap({ conId: "c1", saoKhoiDau: 60 }).saoKhoiDau, 60);
});

test("Thêm con: áp sẵn app Grow gợi ý hợp tuổi, chỉ lấy app `chon`; không có thì không gửi apps", () => {
  const ds = [{ ma: "a", ten: "A", chon: true }, { ma: "b", ten: "B", chon: false }, { ma: "c", ten: "C", chon: true }];
  const apps = appsRobChonSan(ds);
  assert.deepEqual(apps, [{ ma: "a", ten: "A" }, { ma: "c", ten: "C" }]);
  assert.deepEqual(thanThietLap({ conId: "c1", apps }).apps, [{ ma: "a" }, { ma: "c" }]);
  assert.equal(appsRobChonSan([{ ma: "b", ten: "B", chon: false }]), undefined);
  assert.equal("apps" in thanThietLap({ conId: "c1", apps: appsRobChonSan([]) }), false);
});

test("thiết kế 14/11: web Ba Mẹ chọn gửi kèm (muc + tinhGio); chưa vào màn Web thì không gửi", () => {
  assert.deepEqual(thanThietLap({ conId: "c1", webs: [{ muc: "olm.vn", tinhGio: false }, { muc: "poki.com", tinhGio: true }] }).web,
    [{ muc: "olm.vn", tinhGio: false, nhom: "khong_tinh_phut" }, { muc: "poki.com", tinhGio: true, nhom: "tinh_phut" }]);
  assert.equal("web" in thanThietLap({ conId: "c1" }), false);
});
