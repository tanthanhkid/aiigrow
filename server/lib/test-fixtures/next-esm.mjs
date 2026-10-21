// Chỉ cho `node --test`: Node ESM đòi đuôi tệp, mà mã Next viết `import … from "next/headers"` (bundler của Next tự giải). Hook này
// thêm ".js" cho `next/<tên>` để test nhập được lib/data.ts, lib/thao-tac.ts (qua auth.ts). Không chạy trong app thật.
import { registerHooks } from "node:module";

registerHooks({
  resolve(spec, ctx, next) {
    if (/^next\/[a-z-]+$/.test(spec)) return next(`${spec}.js`, ctx);
    return next(spec, ctx);
  },
});
