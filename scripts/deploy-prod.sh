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
#     ở cổng riêng (luồng 8194/9502; giao diện chia ba lượt 8195–8197/9503–9505), mỗi lượt Chrome headless + hồ sơ tạm riêng, chặn /api của chính nguồn mình;
#     tải máy cao ⇒ ba lượt giao diện nối tiếp.
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
# Lỗi khác (mạng, lockfile lệch…) ⇒ cổng lỗi, KHÔNG ghi băm (lần sau cài lại) — tránh kiểm trên node_modules cũ.
cai_server() {
  local o rc=0; o="$(pnpm install --frozen-lockfile 2>&1)" || rc=$?
  [ $rc = 0 ] || { grep -q ERR_PNPM_IGNORED_BUILDS <<<"$o" && ! grep -v ERR_PNPM_IGNORED_BUILDS <<<"$o" | grep -q "ERR_PNPM_"; } \
    || { echo "pnpm install máy chủ lỗi:"; tail -30 <<<"$o"; return 1; }
  [ -d node_modules/next ] || { echo "pnpm install máy chủ lỗi (thiếu node_modules/next)"; return 1; }
}

nhanh_server() (
  set -eE; trap 'echo "LỖI nhánh máy chủ — lệnh: $BASH_COMMAND"' ERR
  echo "== Máy chủ: cài + test + tsc"
  cai server pnpm-lock.yaml cai_server
  rm -f server/pnpm-workspace.yaml
  cd server
  node --import ./lib/test-fixtures/next-esm.mjs --test lib/*.test.ts > "$T/test.txt" 2>&1 || true
  grep -E "^ℹ (pass|fail)" "$T/test.txt" || true
  if ! grep -q "^ℹ fail 0" "$T/test.txt"; then
    local giu; giu="$(mktemp -t aiigrow-test)"; cp "$T/test.txt" "$giu"   # $T bị xoá lúc thoát ⇒ giữ bản log đầy đủ
    echo "Test máy chủ lỗi — log đầy đủ: $giu"; { grep -E -A15 "^ *✖|^not ok" "$T/test.txt" || tail -60 "$T/test.txt"; } | head -120; exit 1
  fi
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
  tm="$goc_cache/metro-$( { env | grep '^EXPO_PUBLIC_' | grep -v '^EXPO_PUBLIC_API=' | sort || true; bam node_modules/.lock-hash babel.config.js metro.config.js app.json app.config.ts .env .env.local .env.production; } | shasum -a 256 | cut -c1-16)"
  mkdir -p "$tm"; touch "$tm"   # touch: thư mục đang dùng không bị dọn dưới đây
  find "$goc_cache" -mindepth 1 -maxdepth 1 -type d -mtime +7 -exec rm -rf {} + 2>/dev/null || true
  TMPDIR="$tm" EXPO_PUBLIC_API=/ npx expo export --platform web --output-dir "$D" >/dev/null
  echo "== App: pha.mjs luồng ∥ giao diện ×3 (export xong $((SECONDS - BAT_DAU))s)"
  # Cổng giao diện (~7 phút một lượt) chia ba lượt theo tên màn bằng PHA_MAN (lọc sẵn có trong pha.mjs). Lượt cuối là PHẦN BÙ của hai lượt
  # đầu ⇒ màn mới/đổi tên luôn rơi vào một lượt, không màn nào bị bỏ. Mỗi lượt cổng tĩnh + cổng CDP + hồ sơ Chrome riêng
  # (cổng 8194–8197/9502–9505, tránh 8191–8193/9499–9501 của pha.mjs/pha-tre.mjs chạy tay; hai cổng kiểm cùng lúc: đặt CONG_PHA=<cổng gốc khác>).
  # Máy 16 GB: tải 1 phút > TAI_TOI_DA (mặc định 8) ⇒ ba lượt giao diện chạy NỐI TIẾP (2 Chrome thay vì 4) — chờ hẹn giờ của pha.mjs không bị trễ.
  local c=${CONG_PHA:-8194} k=$(( ${CONG_PHA:-8194} + 1308 )) tai; tai="$(sysctl -n vm.loadavg 2>/dev/null | awk '{print int($2)}')"
  local -a ten=(luong gd-a gd-b gd-c) man=('' '^bm-[a-h]' '^bm-[i-t]' '^(?!bm-[a-t])') pid=()
  # lượt <i>: 0 = kịch bản luồng, 1–3 = giao diện; mã thoát ghi ra $T/rc-<tên> để báo đúng lượt lỗi.
  luot() { local rc=0; PHA_MAN="${man[$1]}" PHA_CONG=$((c + $1)) PHA_CDP=$((k + $1)) node scripts/pha.mjs "$D" "$CHROME" \
             ${man[$1]:+--giao-dien} > "$T/pha-${ten[$1]}.txt" 2>&1 || rc=$?; echo $rc > "$T/rc-${ten[$1]}"; }
  luot 0 & pid+=($!)
  if [ "${tai:-0}" -gt "${TAI_TOI_DA:-8}" ]; then
    echo "  tải máy $tai > ${TAI_TOI_DA:-8} ⇒ ba lượt giao diện nối tiếp"
    ( luot 1; luot 2; luot 3 ) & pid+=($!)
  else
    for i in 1 2 3; do luot $i & pid+=($!); done
  fi
  wait "${pid[@]}" || true
  local loi=0 i
  for i in 0 1 2 3; do
    local rc; rc="$(cat "$T/rc-${ten[$i]}" 2>/dev/null || echo '?')"
    [ "$rc" = 0 ] || { loi=1; echo "pha.mjs ${ten[$i]} LỖI (mã $rc$( [ "$rc" != '?' ] && [ "$rc" -gt 128 ] && echo " — bị giết bằng tín hiệu $((rc - 128))")):"; }
    cat "$T/pha-${ten[$i]}.txt" 2>/dev/null || true
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
