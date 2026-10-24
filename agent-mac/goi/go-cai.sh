#!/bin/bash
# Gỡ AiiGrow khỏi máy Mac. Chạy: sudo bash go-cai.sh
set -u
if [ "$(id -u)" -ne 0 ]; then echo "Cần quyền quản trị: sudo bash $0" >&2; exit 1; fi
# Chạy từ BẢN SAO: lúc chờ bộ tự cập nhật (tới 5 phút) installer có thể ghi đè tệp này trong app — bash đọc theo vị trí byte, tệp đổi là chạy lệnh rác.
if [ -z "${AIIGROW_GO_BAN_SAO:-}" ]; then
  BAN_SAO=$(/usr/bin/mktemp /var/tmp/aiigrow-go-cai.XXXXXX) && /bin/cp "$0" "$BAN_SAO" && \
    AIIGROW_GO_BAN_SAO="$BAN_SAO" exec /bin/bash "$BAN_SAO" "$@"
  [ -n "${BAN_SAO:-}" ] && /bin/rm -f "$BAN_SAO"     # chép không được ($0 không phải tệp, vd chạy qua ống): chạy tiếp bản gốc, không để tệp rỗng sót
fi
[ -n "${AIIGROW_GO_BAN_SAO:-}" ] && [ "$AIIGROW_GO_BAN_SAO" != 1 ] && /bin/rm -f "$AIIGROW_GO_BAN_SAO"   # bash đã mở tệp, xoá vẫn chạy tiếp

DAEMON_PLIST="/Library/LaunchDaemons/vn.aiilab.aiigrow.daemon.plist"
TRAY_PLIST="/Library/LaunchAgents/vn.aiilab.aiigrow.tray.plist"

# Dấu «máy đã gỡ» ghi NGAY ĐẦU (trước vòng chờ và mọi bootout): bộ cập nhật + postinstall cài tự động thấy là dừng.
GOC="${AIIGROW_GOC:-}"
LC="${AIIGROW_LAUNCHCTL:-/bin/launchctl}"
DA_GO="$GOC/var/db/aiigrow-da-go"
/bin/mkdir -p "$(/usr/bin/dirname "$DA_GO")" "$GOC/var/run" 2>/dev/null
# PID của trình gỡ (cả khi chạy tay bằng sudo): daemon không cho ghép và postinstall không nạp lại máy trong lúc gỡ.
GO_PID="$GOC/var/run/aiigrow-go-cai"
echo $$ > "$GO_PID" 2>/dev/null
# chỉ xoá khi tệp còn là PID của lượt này (lượt go-cai chạy chồng ghi đè thì để lượt đó tự dọn)
trap '[ "$(/bin/cat "$GO_PID" 2>/dev/null)" = "$$" ] && /bin/rm -f "$GO_PID"' EXIT
# Bị ngắt (Ctrl-C…) TRƯỚC khi gỡ thật ⇒ trả lại dấu như cũ (máy vẫn ghép, daemon vẫn chạy — đừng để dấu «đã gỡ» chặn tự cập nhật mãi).
# Dấu có sẵn từ trước (daemon gỡ từ xa ghi) thì giữ nguyên.
if [ ! -f "$DA_GO" ]; then
  # Trong lúc chờ bộ tự cập nhật: postinstall thấy dấu có thể đã dọn app ⇒ chỉ trả dấu khi app còn nguyên (máy vẫn chạy bình thường).
  trap 'if [ -d "$GOC/Applications/AiiGrow.app" ]; then /bin/rm -f "$DA_GO"; echo "Đã dừng — chưa gỡ gì."; else echo "Đã dừng giữa lúc cập nhật — chạy lại go-cai.sh để gỡ nốt."; fi; exit 130' INT TERM HUP
fi
echo "da-go" > "$DA_GO" 2>/dev/null && /bin/chmod 0600 "$DA_GO"

# Đang tự cập nhật (installer chạy trong job vn.aiilab.aiigrow.capnhat): chờ xong (tối đa ~5 phút) rồi mới gỡ, kẻo installer nạp lại daemon sau khi ta gỡ.
i=0
while "$LC" list vn.aiilab.aiigrow.capnhat 2>/dev/null | /usr/bin/grep -q '"PID"' && [ "$i" -lt 150 ]; do
  [ "$i" -eq 0 ] && echo "AiiGrow đang tự cập nhật — chờ cài xong rồi gỡ (tối đa 5 phút, đừng ngắt)…"
  [ "$i" -gt 0 ] && [ $((i % 15)) -eq 0 ] && echo "  vẫn đang chờ… ($((i * 2)) giây)"
  /bin/sleep 2; i=$((i + 1))
done
if [ "$i" -ge 150 ]; then
  echo "Cảnh báo: bộ tự cập nhật chạy quá 5 phút — dừng nó để gỡ tiếp."
  /usr/bin/logger -t AiiGrow "go-cai: job vn.aiilab.aiigrow.capnhat chạy quá 5 phút, bị dừng để gỡ" 2>/dev/null || true
fi
# Từ đây là gỡ thật: không trả dấu nữa dù bị ngắt.
trap - INT TERM HUP
# Xong hay hết 5 phút: gỡ hẳn nhãn capnhat + dấu đang-cập-nhật (installer treo thì giết luôn, không để nó nạp lại daemon sau khi gỡ).
"$LC" remove vn.aiilab.aiigrow.capnhat >/dev/null 2>&1 || true
/bin/rm -f "$GOC/var/run/aiigrow-capnhat"

/bin/launchctl bootout system/vn.aiilab.aiigrow.daemon >/dev/null 2>&1 || true
# Daemon đã dừng ⇒ không ai submit job cài được nữa; gỡ lần nữa phòng job vừa được submit đúng lúc ta kiểm ở trên.
"$LC" remove vn.aiilab.aiigrow.capnhat >/dev/null 2>&1 || true
for uid in $(/bin/ps -axo uid=,comm= | /usr/bin/awk '/AiiGrowTray/ {print $1}' | /usr/bin/sort -u); do
  /bin/launchctl bootout "gui/$uid/vn.aiilab.aiigrow.tray" >/dev/null 2>&1 || true
done
/usr/bin/pkill -x AiiGrowTray >/dev/null 2>&1 || true

# Đọc cấu hình trước khi xoá (token, máy chủ, tài khoản đã bị hạ quyền admin lúc ghép). Biến AIIGROW_* chỉ để thử trên thư mục tạm.
CFG="${AIIGROW_CONFIG:-/Library/Application Support/AiiGrow/config.json}"
CURL="${AIIGROW_CURL:-/usr/bin/curl}"
DSEDIT="${AIIGROW_DSEDIT:-/usr/sbin/dseditgroup}"
PLUTIL=/usr/bin/plutil
if [ -f "$CFG" ]; then
  TOKEN=$($PLUTIL -extract token raw -o - "$CFG" 2>/dev/null || true)
  SERVER=$($PLUTIL -extract mayChu raw -o - "$CFG" 2>/dev/null || true)
  # Báo máy chủ «đã gỡ tại máy» (máy rời gia đình ngay, Ba Mẹ không phải chờ) TRƯỚC khi xoá token; lỗi mạng thì bỏ qua.
  if [ -n "${TOKEN:-}" ] && [ -n "${SERVER:-}" ]; then
    "$CURL" -s -m 8 -o /dev/null -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      -d "{\"may\":\"$(/bin/hostname -s)\"}" "${SERVER%/}/api/device/da-go" >/dev/null 2>&1 || echo "Không báo được máy chủ (bỏ qua)."
  fi
  # Trả quyền quản trị cho tài khoản đã bị hạ lúc ghép máy.
  n=$($PLUTIL -extract daHaQuyen raw -o - "$CFG" 2>/dev/null || echo 0)
  case "$n" in ''|*[!0-9]*) n=0 ;; esac
  i=0
  while [ "$i" -lt "$n" ]; do
    tk=$($PLUTIL -extract "daHaQuyen.$i" raw -o - "$CFG" 2>/dev/null || true)
    if [ -n "$tk" ]; then "$DSEDIT" -o edit -a "$tk" -t user admin >/dev/null 2>&1 && echo "Đã trả quyền admin cho $tk" || echo "Không trả được quyền admin cho $tk"; fi
    i=$((i + 1))
  done
fi

# Khối /etc/hosts có mốc «# AiiGrow»: dòng mốc mở (không có END/kết thúc/hết) bắt đầu khối, dòng mốc đóng kết thúc khối.
if /usr/bin/grep -q '# AiiGrow' /etc/hosts 2>/dev/null; then
  tmp=$(/usr/bin/mktemp)
  /usr/bin/awk '
    /^#.*AiiGrow/ && /(END|end|kết thúc|hết)/ { skip=0; next }
    /^#.*AiiGrow/ { skip=1; next }
    skip { next }
    /# AiiGrow/ { next }
    { print }' /etc/hosts > "$tmp" && /bin/cp /etc/hosts /etc/hosts.aiigrow-sao-luu && /bin/cat "$tmp" > /etc/hosts
  /bin/rm -f "$tmp"
  /usr/bin/dscacheutil -flushcache >/dev/null 2>&1 || true
fi

# Managed Preferences do AiiGrow đặt: chỉ xoá tệp có chữ AiiGrow bên trong (không đụng chính sách của người khác).
for f in /Library/Managed\ Preferences/*.plist; do
  [ -f "$f" ] || continue
  if /usr/bin/grep -aq 'AiiGrow' "$f"; then /bin/rm -f "$f"; echo "Đã xoá $f"; fi
done

# Chính sách trình duyệt daemon ghi: /Library/Managed Preferences/<tài khoản>/<bundleId>.plist (Chrome, Edge, Brave, Cốc Cốc).
# Tệp có khoá dấu «AiiGrowManaged» là của AiiGrow: gỡ các khoá AiiGrow sở hữu; còn rỗng thì xoá tệp (khoá của người khác giữ nguyên).
KHOA_TA="AiiGrowManaged URLBlocklist URLAllowlist IncognitoModeAvailability InPrivateModeAvailability AllowDeletingBrowserHistory BrowserGuestModeEnabled"
# Trả giá trị gốc của khoá $1 (cất ở AiiGrowGoc trong tệp $2) theo đúng kiểu; không có bản gốc ⇒ trả 1 (để xoá khoá).
khoi_phuc() {
  local k="$1" f="$2" t v
  t=$(/usr/bin/plutil -type "AiiGrowGoc.$k" "$f" 2>/dev/null) || return 1
  case "$t" in
    array|dictionary) v=$(/usr/bin/plutil -extract "AiiGrowGoc.$k" json -o - "$f") && /usr/bin/plutil -replace "$k" -json "$v" "$f" ;;
    integer|float|bool|string) v=$(/usr/bin/plutil -extract "AiiGrowGoc.$k" raw -o - "$f") && /usr/bin/plutil -replace "$k" "-$t" "$v" "$f" ;;
    *) return 1 ;;
  esac
}
MP="${AIIGROW_MANAGED_PREFS:-/Library/Managed Preferences}"      # đổi được để thử trên thư mục tạm
for thumuc in "$MP"/*/; do
  [ -d "$thumuc" ] || continue
  for bundle in com.google.Chrome com.microsoft.Edge com.brave.Browser com.coccoc.Coccoc; do
    f="${thumuc%/}/${bundle}.plist"
    [ -f "$f" ] || continue
    /usr/bin/plutil -extract AiiGrowManaged raw "$f" >/dev/null 2>&1 || continue
    # Khoá AiiGrow ghi đè: trả lại giá trị gốc (cất ở AiiGrowGoc) nếu có, không thì xoá.
    for k in $KHOA_TA; do
      khoi_phuc "$k" "$f" || /usr/bin/plutil -remove "$k" "$f" >/dev/null 2>&1 || true
    done
    /usr/bin/plutil -remove AiiGrowGoc "$f" >/dev/null 2>&1 || true
    if [ "$(/usr/bin/plutil -convert json -o - "$f" 2>/dev/null)" = "{}" ]; then /bin/rm -f "$f"; fi
    echo "Đã dọn chính sách AiiGrow trong $f"
  done
done
/usr/bin/killall cfprefsd >/dev/null 2>&1 || true

/bin/rm -f "$DAEMON_PLIST" "$TRAY_PLIST"
/bin/rm -rf "/Applications/AiiGrow.app" "/Library/Application Support/AiiGrow" "/Library/Logs/AiiGrow"
/bin/rm -f /var/run/aiigrow.sock
/usr/sbin/pkgutil --forget vn.aiilab.aiigrow.pkg >/dev/null 2>&1 || true
/bin/rm -f "$DA_GO"                 # gỡ xong (job cập nhật đã bị dừng ở trên): không để dấu ngoài thư mục AiiGrow quyết định lần cài sau
echo "Đã gỡ AiiGrow."
# Công việc launchd chạy một lần do daemon đăng ký khi gỡ từ xa (launchctl submit): xoá nhãn để không tồn tại tới lúc khởi động lại
# và lần gỡ từ xa sau không bị trùng nhãn. Việc CUỐI CÙNG của tập lệnh (remove có thể gửi SIGTERM cho chính tiến trình này).
"${AIIGROW_LAUNCHCTL:-/bin/launchctl}" remove vn.aiilab.aiigrow.go >/dev/null 2>&1 || true
