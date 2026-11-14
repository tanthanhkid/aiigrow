// node --test src/lib/thiet-lap.test.ts — thân POST thiet-lap không được tự đổi chế độ chặn của Con (B1 06/11).
import { test } from "node:test";
import assert from "node:assert/strict";
import { appsRobChonSan, thanThietLap } from "./thiet-lap.ts";

const MAC = { quy: 60, cuoiTuan: (p: number) => p + 30, ngu: { tu: "21:30", den: "06:30" } };

test("chưa chọn chế độ ⇒ KHÔNG gửi cheDoChan (máy chủ giữ chế độ đang có, Con mới = Chặn app & web)", () => {
  const b = thanThietLap({ conId: "c1", tenCon: "Phát" }, MAC);
  assert.equal("cheDoChan" in b, false);
  assert.deepEqual(b.gioChoi, { ngayThuong: 60, cuoiTuan: 90 });
  assert.deepEqual(b.ngu, MAC.ngu);
});

test("Ba Mẹ đã chọn «Mở hết» ⇒ gửi đúng mo_het; app theo mã / theo tên", () => {
  const b = thanThietLap({ conId: "c1", tenCon: "Phát", cheDoChan: "mo_het", quy: 30, apps: [{ ma: "roblox", ten: "Roblox" }, { ten: "Sách", tinhGio: false }] }, MAC);
  assert.equal(b.cheDoChan, "mo_het");
  assert.deepEqual(b.gioChoi, { ngayThuong: 30, cuoiTuan: 60 });
  assert.deepEqual(b.apps, [{ ma: "roblox" }, { ten: "Sách", tinhGio: false }]);
});

test("quỹ cuối tuần đã nạp từ máy chủ được giữ; Ba Mẹ chọn quỹ khác (cuoiTuan xoá) ⇒ tính lại +30", () => {
  assert.deepEqual(thanThietLap({ conId: "c1", quy: 30, cuoiTuan: 120 }, MAC).gioChoi, { ngayThuong: 30, cuoiTuan: 120 });
  assert.deepEqual(thanThietLap({ conId: "c1", quy: 90, cuoiTuan: undefined }, MAC).gioChoi, { ngayThuong: 90, cuoiTuan: 120 });
});

test("Thêm con: áp sẵn app Grow gợi ý hợp tuổi, chỉ lấy app `chon`; không có thì không gửi apps", () => {
  const ds = [{ ma: "a", ten: "A", chon: true }, { ma: "b", ten: "B", chon: false }, { ma: "c", ten: "C", chon: true }];
  const apps = appsRobChonSan(ds);
  assert.deepEqual(apps, [{ ma: "a", ten: "A" }, { ma: "c", ten: "C" }]);
  assert.deepEqual(thanThietLap({ conId: "c1", apps }, MAC).apps, [{ ma: "a" }, { ma: "c" }]);
  assert.equal(appsRobChonSan([{ ma: "b", ten: "B", chon: false }]), undefined);
  assert.equal("apps" in thanThietLap({ conId: "c1", apps: appsRobChonSan([]) }, MAC), false);
});
