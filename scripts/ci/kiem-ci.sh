#!/usr/bin/env bash
# Cổng phát hành: không phát bản từ commit mà CI đã ĐỎ. Không chờ CI.
#   scripts/ci/kiem-ci.sh [--bo-kiem-ci] <workflow>...      vd: scripts/ci/kiem-ci.sh mobile
#   - commit HEAD có run kết luận failure ở workflow nêu tên  ⇒ DỪNG (thoát 1), in link run
#   - đang chạy / chưa có run (path filter không khớp, chưa push…) ⇒ cảnh báo, cho qua
#   - không có run ở commit này nhưng run gần nhất trên main của workflow đó đỏ ⇒ cảnh báo, cho qua
#   - --bo-kiem-ci (hoặc BO_KIEM_CI=1): bỏ cổng, cho sửa gấp
#   - không có gh / không gọi được API ⇒ cảnh báo, cho qua
# Script phát hành gọi: "$(git rev-parse --show-toplevel)/scripts/ci/kiem-ci.sh" ${BO_KIEM_CI:+--bo-kiem-ci} mobile || exit 1
set -uo pipefail
REPO="${KIEM_CI_REPO:-tanthanhkid/aiigrow}"
BO="${BO_KIEM_CI:-0}"; WF=()
for a in "$@"; do
  case "$a" in
    --bo-kiem-ci) BO=1 ;;
    *) WF+=("$a") ;;
  esac
done
[ ${#WF[@]} -gt 0 ] || { echo "dùng: $0 [--bo-kiem-ci] <workflow>..." >&2; exit 2; }
SHA="${KIEM_CI_SHA:-$(git rev-parse HEAD)}"
if [ "$BO" = 1 ]; then echo "!! kiểm CI: BỎ QUA (--bo-kiem-ci) cho ${SHA:0:8}"; exit 0; fi
command -v gh >/dev/null || { echo "!! kiểm CI: không có gh — cho qua, không kiểm được"; exit 0; }

DO=0
for w in "${WF[@]}"; do
  RUNS="$(gh run list -R "$REPO" --commit "$SHA" -w "$w" -L 20 --json databaseId,status,conclusion,url,event 2>/dev/null)" \
    || { echo "!! kiểm CI [$w]: không gọi được GitHub — cho qua"; continue; }
  # Lượt đêm (dem.yml) gọi lại workflow này: job con tên «<w> / …». Chỉ CẢNH BÁO (job continue-on-error như chụp màn/emulator
  # vẫn hiện failure dù workflow xanh ⇒ không đủ chắc để chặn).
  DEM_DO="$(gh run list -R "$REPO" --commit "$SHA" -w dem -L 3 --json databaseId --jq '.[].databaseId' 2>/dev/null \
    | while read -r D; do gh api "repos/$REPO/actions/runs/$D/jobs?per_page=100" 2>/dev/null \
        | jq -r --arg p "$w / " '.jobs[] | select((.name | startswith($p)) and .conclusion == "failure") | .html_url'; done | head -1)"
  [ -n "$DEM_DO" ] && echo "!! kiểm CI [$w]: lượt đêm ở ${SHA:0:8} có job đỏ (có thể là job không chặn): $DEM_DO"
  FAIL="$(jq -r '[.[] | select(.conclusion == "failure")][0].url // empty' <<<"$RUNS")"
  OK="$(jq -r '[.[] | select(.conclusion == "success")][0].url // empty' <<<"$RUNS")"
  CHAY="$(jq -r '[.[] | select(.status != "completed")][0].url // empty' <<<"$RUNS")"
  if [ -n "$FAIL" ] && [ -z "$OK" ]; then
    echo "DỪNG — CI [$w] ĐỎ ở commit ${SHA:0:8}: $FAIL" >&2
    DO=1
  elif [ -n "$FAIL" ]; then
    echo "!! kiểm CI [$w]: có run đỏ nhưng run khác xanh (chạy lại?) — cho qua. Đỏ: $FAIL"
  elif [ -n "$OK" ]; then
    echo "kiểm CI [$w]: xanh ở ${SHA:0:8}"
  elif [ -n "$CHAY" ]; then
    echo "!! kiểm CI [$w]: đang chạy ở ${SHA:0:8} — không chờ, cho qua: $CHAY"
  else
    GAN="$(gh run list -R "$REPO" -b main -w "$w" -s completed -L 1 --json conclusion,url,headSha \
           --jq '.[0] | select(.conclusion == "failure") | "\(.url) (commit \(.headSha[0:8]))"' 2>/dev/null || true)"
    if [ -n "$GAN" ]; then
      echo "!! kiểm CI [$w]: commit ${SHA:0:8} chưa có run; run gần nhất trên main ĐỎ: $GAN — kiểm lại trước khi phát"
    else
      echo "!! kiểm CI [$w]: commit ${SHA:0:8} chưa có run — cho qua"
    fi
  fi
done
if [ "$DO" = 1 ]; then
  echo "Sửa CI trước khi phát, hoặc sửa gấp: chạy lại với --bo-kiem-ci (BO_KIEM_CI=1)." >&2
  exit 1
fi
exit 0
