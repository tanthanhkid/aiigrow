#!/usr/bin/env bash
# Cổng trước khi mở PR (chạy ở gốc repo hoặc đâu cũng được):  bash mobile/scripts/cong-pr.sh [origin/main]
#   1. mobile: lint (npm run lint — đúng lệnh CI) + tsc
#   2. server: tsc + test liên quan (server/** đổi ⇒ test cùng tên / cùng thư mục / import file đó; đổi cấu hình, lockfile, fixture ⇒ test đủ)
#   3. pha-theo-diff: pha.mjs trên màn / kịch bản liên quan ở 320px + 390px
# Lượt --giao-dien ĐỦ không chạy ở đây: chạy trên CI (workflow mobile, chia 6 shard) — xem CLAUDE.md.
# Thoát ≠ 0 nếu bất kỳ bước nào đỏ; in tóm tắt cuối. Bỏ bước pha: CONG_PR_KHONG_PHA=1.
set -uo pipefail
GOC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
CO="${1:-origin/main}"
cd "$GOC"
TOM=(); XAU=0
buoc() {   # buoc <nhãn> <lệnh...>
  local nhan="$1"; shift; local t0=$SECONDS
  echo; echo "=== $nhan ==="
  if "$@"; then TOM+=("đạt  $nhan ($((SECONDS - t0))s)"); else TOM+=("ĐỎ   $nhan ($((SECONDS - t0))s)"); XAU=1; fi
}
bo() { echo; echo "=== $1 === (bỏ: $2)"; TOM+=("bỏ   $1 ($2)"); }

DOI="$( { git diff --name-only "$CO"...HEAD; git status --porcelain | cut -c4-; } | sort -u )"
echo "so với $CO: $(echo "$DOI" | grep -c .) file đổi"

[ -d mobile/node_modules ] || { echo "thiếu mobile/node_modules (cp -cR từ repo gốc hoặc npm ci)"; exit 2; }
buoc "mobile lint" bash -c 'cd mobile && npm run lint'
buoc "mobile tsc"  bash -c 'cd mobile && npm run typecheck'

if [ -d server/node_modules ]; then
  buoc "server tsc" bash -c 'cd server && pnpm run typecheck'
  # test server liên quan
  if echo "$DOI" | grep -q '^server/'; then
    TESTS=()
    TOAN=0
    while IFS= read -r f; do
      case "$f" in
        server/lib/*.test.ts) TESTS+=("lib/$(basename "$f")") ;;
        server/lib/test-fixtures/*|server/package.json|server/pnpm-lock.yaml|server/tsconfig.json) TOAN=1 ;;
        server/lib/*.ts)
          b="$(basename "$f" .ts)"
          [ -f "server/lib/$b.test.ts" ] && TESTS+=("lib/$b.test.ts")
          while IFS= read -r t; do TESTS+=("lib/$(basename "$t")"); done < <(grep -lE "from ['\"]\\./$b(\\.ts)?['\"]" server/lib/*.test.ts 2>/dev/null) ;;
        server/*) b="$(basename "$f" | sed 's/\.[a-z]*$//')"; d="$(dirname "$f")"
          # cùng thư mục: test cùng tên nếu có; không có thì test đủ (file route/script không có test riêng)
          if [ -f "$d/$b.test.ts" ]; then TESTS+=("${d#server/}/$b.test.ts"); else TOAN=1; fi ;;
      esac
    done < <(echo "$DOI" | grep '^server/')
    if [ "$TOAN" = 1 ]; then
      buoc "server test (đủ)" bash -c 'cd server && pnpm test'
    elif [ "${#TESTS[@]}" -gt 0 ]; then
      U="$(printf '%s\n' "${TESTS[@]}" | sort -u | tr '\n' ' ')"
      echo "test liên quan: $U"
      # shellcheck disable=SC2086
      buoc "server test (liên quan)" bash -c "cd server && node --import ./lib/test-fixtures/next-esm.mjs --test $U"
    fi
  else
    bo "server test" "không đổi server/**"
  fi
else
  bo "server tsc + test" "thiếu server/node_modules — chạy: cd server && pnpm install --frozen-lockfile"
  echo "$DOI" | grep -q '^server/' && XAU=1
fi

if [ -n "${CONG_PR_KHONG_PHA:-}" ]; then bo "pha-theo-diff" "CONG_PR_KHONG_PHA"
else buoc "pha-theo-diff" node mobile/scripts/pha-theo-diff.mjs "--co-so=$CO"; fi

echo; echo "================ TÓM TẮT cong-pr ================"
printf '%s\n' "${TOM[@]}"
[ "$XAU" = 0 ] && echo "=> ĐẠT" || echo "=> ĐỎ — sửa rồi chạy lại"
exit "$XAU"
