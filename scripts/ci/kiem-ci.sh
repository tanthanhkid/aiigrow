#!/usr/bin/env bash
# Cổng phát hành: không phát bản từ commit mà CI đã ĐỎ. Không chờ CI.
#   scripts/ci/kiem-ci.sh [--bo-kiem-ci] <workflow>...      vd: scripts/ci/kiem-ci.sh mobile
# Với mỗi workflow, xét run ĐÃ XONG gần nhất (bỏ run bị huỷ/bỏ qua):
#   - ở chính commit HEAD; chưa có thì ở commit tổ tiên gần nhất trên main (path filter ⇒ commit chỉ đụng chỗ khác không có run)
#   - run đó đỏ (failure / timed_out / startup_failure) ⇒ DỪNG (thoát 1), in link
#   - đang chạy / không tìm được run nào ⇒ cảnh báo, cho qua
#   - lượt đêm (dem.yml) đỏ ở commit này ⇒ chỉ cảnh báo (job continue-on-error vẫn hiện failure dù workflow xanh)
#   - --bo-kiem-ci (hoặc BO_KIEM_CI=1): bỏ cổng, cho sửa gấp
#   - không có gh/jq hoặc không gọi được API ⇒ cảnh báo rõ, cho qua
# Script phát hành gọi: "<gốc repo>/scripts/ci/kiem-ci.sh" $BO_CI mobile || exit 1   (BO_KIEM_CI=1 tự đọc trong script)
set -uo pipefail
REPO="${KIEM_CI_REPO:-tanthanhkid/aiigrow}"
BO=0; [ "${BO_KIEM_CI:-0}" = 1 ] && BO=1
WF=()
for a in "$@"; do
  case "$a" in
    --bo-kiem-ci) BO=1 ;;
    *) WF+=("$a") ;;
  esac
done
[ ${#WF[@]} -gt 0 ] || { echo "dùng: $0 [--bo-kiem-ci] <workflow>..." >&2; exit 2; }
SHA="${KIEM_CI_SHA:-$(git rev-parse HEAD)}"
if [ "$BO" = 1 ]; then echo "!! kiểm CI: BỎ QUA (--bo-kiem-ci) cho ${SHA:0:8}"; exit 0; fi
for c in gh jq; do
  command -v "$c" >/dev/null || { echo "!! kiểm CI: KHÔNG KIỂM ĐƯỢC — thiếu lệnh $c; cho qua"; exit 0; }
done
if [ -z "${KIEM_CI_SHA:-}" ] && [ -z "$(git branch -r --contains "$SHA" 2>/dev/null)" ]; then
  echo "!! kiểm CI: commit ${SHA:0:8} chưa có trên remote — CI chưa từng thấy mã này"
fi
[ -z "${KIEM_CI_SHA:-}" ] && [ -n "$(git status --porcelain --untracked-files=no 2>/dev/null)" ] \
  && echo "!! kiểm CI: cây git có thay đổi chưa commit — bản build không khớp commit ${SHA:0:8}"

DO_KL='["failure","timed_out","startup_failure"]'
# Một run «đã xong có kết luận» (không tính cancelled/skipped/neutral): in "kl<TAB>url<TAB>sha"
# Run «có kết luận» (bỏ cancelled/skipped/neutral) hoặc còn đang chạy; in "kl<TAB>url<TAB>sha" (kl = dang-chay nếu chưa xong)
LOC='.[] | select(.status != "completed" or (.conclusion | IN("success","failure","timed_out","startup_failure")))
     | "\(if .status == "completed" then .conclusion else "dang-chay" end)\t\(.url)\t\(.headSha)"'

# Job lượt đêm ở commit này (một lần cho mọi workflow)
DEM_JOBS="$(gh run list -R "$REPO" --commit "$SHA" -w dem -L 3 --json databaseId --jq '.[].databaseId' 2>/dev/null \
  | while read -r D; do gh api "repos/$REPO/actions/runs/$D/jobs?per_page=100" --jq '.jobs[] | "\(.conclusion)\t\(.name)\t\(.html_url)"' 2>/dev/null; done)"

DO=0
for w in "${WF[@]}"; do
  RUNS="$(gh run list -R "$REPO" --commit "$SHA" -w "$w" -L 20 --json status,conclusion,url,headSha 2>/dev/null)" \
    || { echo "!! kiểm CI [$w]: không gọi được GitHub — cho qua"; continue; }
  DEM_DO="$(awk -F'\t' -v p="$w / " '$1 == "failure" && index($2, p) == 1 { print $3; exit }' <<<"$DEM_JOBS")"
  [ -n "$DEM_DO" ] && echo "!! kiểm CI [$w]: lượt đêm ở ${SHA:0:8} có job đỏ (có thể là job không chặn): $DEM_DO"
  NGUON="commit ${SHA:0:8}"
  # run mới nhất ở chính commit này (đang chạy ⇒ cảnh báo, cho qua — không lùi về tổ tiên)
  KQ="$(jq -r "[$LOC][0] // empty" <<<"$RUNS")"
  if [ -z "$KQ" ]; then
    # commit này không có run (path filter) ⇒ run gần nhất trên main ở một commit TỔ TIÊN của SHA (đang chạy ⇒ cảnh báo, cho qua)
    while IFS=$'\t' read -r kl url sha; do
      [ -n "$sha" ] || continue
      if git merge-base --is-ancestor "$sha" "$SHA" 2>/dev/null; then KQ="$kl"$'\t'"$url"$'\t'"$sha"; NGUON="commit tổ tiên ${sha:0:8}"; break; fi
    done < <(gh run list -R "$REPO" -b main -w "$w" -L 40 --json status,conclusion,url,headSha --jq "$LOC" 2>/dev/null)
  fi
  KL="${KQ%%$'\t'*}"; URL="$(cut -f2 <<<"$KQ")"
  if [ -n "$KQ" ] && jq -e --arg k "$KL" 'index($k)' <<<"$DO_KL" >/dev/null; then
    echo "DỪNG — CI [$w] ĐỎ ($KL) ở $NGUON: $URL" >&2
    DO=1
  elif [ "$KL" = dang-chay ]; then
    echo "!! kiểm CI [$w]: đang chạy ở $NGUON — không chờ, cho qua: $URL"
  elif [ -n "$KQ" ]; then
    echo "kiểm CI [$w]: xanh ở $NGUON"
  else
    echo "!! kiểm CI [$w]: không tìm được run nào cho ${SHA:0:8} hay tổ tiên — cho qua"
  fi
done
if [ "$DO" = 1 ]; then
  echo "Sửa CI trước khi phát, hoặc sửa gấp: chạy lại với --bo-kiem-ci (BO_KIEM_CI=1)." >&2
  exit 1
fi
exit 0
