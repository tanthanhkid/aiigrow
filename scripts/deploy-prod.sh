#!/usr/bin/env bash
# Đưa một LÔ tính năng lên prod (Thanh 24/10: «làm một lô tính năng thì dựng trên localhost coi ok chưa rồi mới đưa lên hosting»).
# Push/merge vào main KHÔNG tự deploy nữa (server/vercel.json git.deploymentEnabled=false) — prod chỉ đổi khi chạy script này.
#   scripts/deploy-prod.sh            # cổng kiểm trên localhost rồi deploy prod
#   scripts/deploy-prod.sh --chi-kiem # chỉ chạy cổng kiểm, không deploy
# Cổng: test máy chủ + tsc (server, mobile) + bản web Expo chạy trên máy chủ localhost (pha.mjs: kịch bản luồng + cổng giao diện).
# Tăng tốc (25/10) — không bỏ kiểm nào:
#   · bỏ pnpm install / npm ci khi lockfile + package.json + bản node không đổi so với lần cài trước (băm ở node_modules/.lock-hash);
#   · nhánh máy chủ (test + tsc) chạy SONG SONG nhánh app (tsc + expo export → pha luồng ∥ pha giao diện); nhánh nào lỗi ⇒ cổng lỗi, in log nhánh đó;
#   · expo export không --clear: cache Metro RIÊNG của cổng ở ~/Library/Caches/aiigrow-cong/metro-<băm .lock-hash + cấu hình dựng> (TMPDIR riêng
#     ⇒ không dùng chung $TMPDIR/metro-cache với bản dựng khác/EXPO_PUBLIC_API khác; cài lại node_modules hoặc đổi babel/metro/app config ⇒ cache mới);
#   · bản web xuất với EXPO_PUBLIC_API=/ (gọi /api cùng nguồn — y như bản prod server/scripts/build-app.mjs) ⇒ các lượt pha.mjs chạy song song
#     ở cổng riêng (luồng 8191/9499; giao diện chia ba lượt 8195–8197/9503–9505), mỗi lượt Chrome headless + hồ sơ tạm riêng, chặn /api của chính nguồn mình.
set -euo pipefail
cd "$(dirname "$0")/.."
CHI_KIEM=0; [ "${1:-}" = "--chi-kiem" ] && CHI_KIEM=1

git fetch -q origin
[ -z "$(git status --porcelain)" ] || { echo "Cây git bẩn — commit/stash trước"; exit 1; }
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "HEAD khác origin/main — git checkout --detach origin/main"; exit 1; }
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
T="$(mktemp -d)"; D="$T/web"
trap 'kill $(jobs -p) 2>/dev/null || true; rm -rf "${T:?}"' EXIT
BAT_DAU=$SECONDS

bam() { { cat "$@" 2>/dev/null || true; } | shasum -a 256 | cut -c1-16; }   # tệp vắng (babel/metro config) bỏ qua
# cai <thư mục> <lockfile> <lệnh…>: cài khi băm (lockfile + package.json + node -v) khác lần cài trước. Băm ghi SAU khi cài xong.
cai() {
  local dir=$1 lock=$2; shift 2
  local h; h="$( { cat "$dir/$lock" "$dir/package.json"; node -v; } | shasum -a 256 | cut -c1-16)"
  if [ "$(cat "$dir/node_modules/.lock-hash" 2>/dev/null)" = "$h" ]; then echo "  $dir: lockfile không đổi — bỏ cài"; return 0; fi
  rm -f "$dir/node_modules/.lock-hash"
  (cd "$dir" && "$@") || return 1
  echo "$h" > "$dir/node_modules/.lock-hash"
}
# pnpm 10 trả mã lỗi ERR_PNPM_IGNORED_BUILDS (@sentry/cli) dù đã cài xong ⇒ không coi là lỗi, kiểm node_modules thay
npm_ci() { npm ci >/dev/null; }
cai_server() { { pnpm install --frozen-lockfile >/dev/null 2>&1 || true; }; [ -d node_modules/next ] || { echo "pnpm install máy chủ lỗi"; return 1; }; }

nhanh_server() (
  set -eE; trap 'echo "LỖI nhánh máy chủ — lệnh: $BASH_COMMAND"' ERR
  echo "== Máy chủ: cài + test + tsc"
  cai server pnpm-lock.yaml cai_server
  rm -f server/pnpm-workspace.yaml
  cd server
  node --import ./lib/test-fixtures/next-esm.mjs --test lib/*.test.ts > "$T/test.txt" 2>&1 || true
  grep -E "^ℹ (pass|fail)" "$T/test.txt"; grep -q "^ℹ fail 0" "$T/test.txt" || { echo "Test máy chủ lỗi:"; grep -B2 -A20 "^not ok" "$T/test.txt" | head -80; exit 1; }
  npx tsc --noEmit -p .
  echo "== Máy chủ: đạt ($((SECONDS - BAT_DAU))s)"
)

nhanh_app() (
  set -eE; trap 'echo "LỖI nhánh app — lệnh: $BASH_COMMAND"' ERR
  echo "== App: cài + tsc + bản web"
  cai mobile package-lock.json npm_ci
  cd mobile
  npx tsc --noEmit -p .
  # Cache Metro ngoài repo (không lọt vào gói vercel deploy); khoá = băm lần cài node_modules + cấu hình dựng; thư mục cũ >7 ngày tự dọn.
  local goc_cache="${HOME}/Library/Caches/aiigrow-cong" tm
  tm="$goc_cache/metro-$(bam node_modules/.lock-hash babel.config.js metro.config.js app.json app.config.ts)"
  mkdir -p "$tm"; touch "$tm"   # touch: thư mục đang dùng không bị dọn dưới đây
  find "$goc_cache" -mindepth 1 -maxdepth 1 -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
  TMPDIR="$tm" EXPO_PUBLIC_API=/ npx expo export --platform web --output-dir "$D" >/dev/null
  echo "== App: pha.mjs luồng ∥ giao diện ×3 (export xong $((SECONDS - BAT_DAU))s)"
  # Cổng giao diện (~7 phút một lượt) chia ba lượt theo tên màn bằng PHA_MAN (lọc sẵn có trong pha.mjs). Lượt cuối là PHẦN BÙ của hai lượt
  # đầu ⇒ màn mới/đổi tên luôn rơi vào một lượt, không màn nào bị bỏ. Mỗi lượt cổng tĩnh + cổng CDP + hồ sơ Chrome riêng
  # (tránh 8191–8193/9499–9501 của pha.mjs/pha-tre.mjs chạy tay).
  local -a ten=(luong gd-a gd-b gd-c) pid=()
  node scripts/pha.mjs "$D" "$CHROME" > "$T/pha-luong.txt" 2>&1 & pid+=($!)
  PHA_MAN='^bm-[a-h]' PHA_CONG=8195 PHA_CDP=9503 node scripts/pha.mjs "$D" "$CHROME" --giao-dien > "$T/pha-gd-a.txt" 2>&1 & pid+=($!)
  PHA_MAN='^bm-[i-t]' PHA_CONG=8196 PHA_CDP=9504 node scripts/pha.mjs "$D" "$CHROME" --giao-dien > "$T/pha-gd-b.txt" 2>&1 & pid+=($!)
  PHA_MAN='^(?!bm-[a-t])' PHA_CONG=8197 PHA_CDP=9505 node scripts/pha.mjs "$D" "$CHROME" --giao-dien > "$T/pha-gd-c.txt" 2>&1 & pid+=($!)
  local loi=0 i
  for i in 0 1 2 3; do
    wait "${pid[$i]}" || { loi=1; echo "pha.mjs ${ten[$i]} LỖI:"; }
    cat "$T/pha-${ten[$i]}.txt"
  done
  [ $loi = 0 ]
  echo "== App: đạt ($((SECONDS - BAT_DAU))s)"
)

nhanh_server > "$T/server.txt" 2>&1 & PS=$!
nhanh_app > "$T/app.txt" 2>&1 & PA=$!
LOI=0
wait $PS || LOI=1; cat "$T/server.txt"
wait $PA || LOI=1; cat "$T/app.txt"
[ $LOI = 0 ] || { echo "Cổng kiểm LỖI (log nhánh lỗi ở trên) — $((SECONDS - BAT_DAU))s"; exit 1; }
echo "Cổng kiểm đạt — $((SECONDS - BAT_DAU))s"

[ $CHI_KIEM = 1 ] && { echo "(không deploy)"; exit 0; }
echo "== Deploy prod $(git rev-parse --short HEAD)"
[ -f .vercel/project.json ] || vercel link --yes --project aiigrow >/dev/null
rm -rf mobile/ios mobile/android mobile/build-ios   # thư mục native do expo prebuild/testflight sinh, không cần lên Vercel
vercel deploy --prod --yes --archive=tgz   # >15000 file (node_modules mobile) ⇒ Vercel đòi gói tgz
