// Seed dữ liệu thử cho CI / máy dev (lib/seed-ci.ts, docs/CI-RA-LOI.md). In JSON {dinhDanh, matKhau, token, con, may, …} ra stdout
// (hoặc ghi tệp SEED_CI_RA=<tệp>). Bị chặn trên production / CSDL ngoài máy — xem lyDoChanSeedCi.
//   AIIGROW_CI_LOGIN=1 DATABASE_URL=postgres://postgres:postgres@localhost:5432/aiigrow node --import ./lib/test-fixtures/next-esm.mjs scripts/seed-ci.ts
//   AIIGROW_CI_LOGIN=1 PGLITE_DIR=.data/pg-ci node --import ./lib/test-fixtures/next-esm.mjs scripts/seed-ci.ts
// Tuỳ chọn: SEED_CI_SDT (mặc định 0900000001), SEED_CI_MAT_KHAU (mặc định aiigrow-ci-123).
import { writeFileSync } from "node:fs";
import { lyDoChanSeedCi, seedCi } from "../lib/seed-ci.ts";

const chan = lyDoChanSeedCi();
if (chan) { console.error(`seed-ci: KHÔNG chạy — ${chan}`); process.exit(2); }
const kq = await seedCi({ dinhDanh: process.env.SEED_CI_SDT, matKhau: process.env.SEED_CI_MAT_KHAU });
const ra = JSON.stringify(kq, null, 2);
if (process.env.SEED_CI_RA) { writeFileSync(process.env.SEED_CI_RA, ra); console.log(`seed-ci: đã ghi ${process.env.SEED_CI_RA}`); }
else console.log(ra);
process.exit(0);
