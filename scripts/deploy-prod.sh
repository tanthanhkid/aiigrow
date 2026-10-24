#!/usr/bin/env bash
# Đưa một LÔ tính năng lên prod (Thanh 24/10: «làm một lô tính năng thì dựng trên localhost coi ok chưa rồi mới đưa lên hosting»).
# Push/merge vào main KHÔNG tự deploy nữa (server/vercel.json git.deploymentEnabled=false) — prod chỉ đổi khi chạy script này.
#   scripts/deploy-prod.sh            # cổng kiểm trên localhost rồi deploy prod
#   scripts/deploy-prod.sh --chi-kiem # chỉ chạy cổng kiểm, không deploy
# Cổng: test máy chủ + tsc (server, mobile) + bản web Expo chạy trên máy chủ localhost (pha.mjs: kịch bản luồng + cổng giao diện).
set -euo pipefail
cd "$(dirname "$0")/.."
CHI_KIEM=0; [ "${1:-}" = "--chi-kiem" ] && CHI_KIEM=1

git fetch -q origin
[ -z "$(git status --porcelain)" ] || { echo "Cây git bẩn — commit/stash trước"; exit 1; }
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "HEAD khác origin/main — git checkout --detach origin/main"; exit 1; }
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
D="$(mktemp -d)/web"
trap 'rm -rf "${D:?}"' EXIT

echo "== Máy chủ: test + tsc"
# pnpm 10 trả mã lỗi ERR_PNPM_IGNORED_BUILDS (@sentry/cli) dù đã cài xong ⇒ không coi là lỗi, kiểm node_modules thay
(cd server && { pnpm install --frozen-lockfile >/dev/null 2>&1 || true; } && [ -d node_modules/next ] || { echo "pnpm install máy chủ lỗi"; exit 1; }
 node --import ./lib/test-fixtures/next-esm.mjs --test lib/*.test.ts > "$D.test.txt" 2>&1 || true
 grep -E "^ℹ (pass|fail)" "$D.test.txt"; grep -q "^ℹ fail 0" "$D.test.txt" || { echo "Test máy chủ lỗi — xem $D.test.txt"; exit 1; }
 npx tsc --noEmit -p .)
rm -f server/pnpm-workspace.yaml
echo "== App: tsc + bản web trên localhost"
(cd mobile && npm ci >/dev/null && npx tsc --noEmit -p . \
 && EXPO_PUBLIC_API=http://localhost:8191 npx expo export --platform web --output-dir "$D" --clear >/dev/null \
 && node scripts/pha.mjs "$D" "$CHROME" && node scripts/pha.mjs "$D" "$CHROME" --giao-dien)

[ $CHI_KIEM = 1 ] && { echo "Cổng kiểm đạt (không deploy)."; exit 0; }
echo "== Deploy prod $(git rev-parse --short HEAD)"
[ -f .vercel/project.json ] || vercel link --yes --project aiigrow >/dev/null
vercel deploy --prod --yes
