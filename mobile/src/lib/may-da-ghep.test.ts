import { test } from "node:test";
import assert from "node:assert/strict";
import { mayDaGhepCuaCon } from "./may-da-ghep.ts";

test("#536: chỉ máy gán đúng Con (không máy chung chưa gán, không máy đang gỡ) mới tính là đã ghép", () => {
  assert.equal(mayDaGhepCuaCon([], "c1"), false);
  assert.equal(mayDaGhepCuaCon([{ con: "c1", conDs: undefined, dangGo: null }], "c1"), true);
  assert.equal(mayDaGhepCuaCon([{ con: null, conDs: [{ id: "c1" }, { id: "c2" }], dangGo: null }], "c2"), true);
  assert.equal(mayDaGhepCuaCon([{ con: null, conDs: [{ id: "c2" }], dangGo: null }], "c1"), false);
  assert.equal(mayDaGhepCuaCon([{ con: "c1", conDs: undefined, dangGo: { luc: "x" } }], "c1"), false);
});
