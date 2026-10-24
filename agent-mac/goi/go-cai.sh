#!/bin/bash
# Gỡ AiiGrow khỏi máy Mac. Chạy: sudo bash go-cai.sh
set -u
if [ "$(id -u)" -ne 0 ]; then echo "Cần quyền quản trị: sudo bash $0" >&2; exit 1; fi
# Chạy từ BẢN SAO: lúc chờ bộ tự cập nhật (tới 5 phút) installer có thể ghi đè tệp này trong app — bash đọc theo vị trí byte, tệp đổi là chạy lệnh rác.
case "$0" in
  /var/tmp/aiigrow-go-cai.*) /bin/rm -f "$0" ;;      # đang chạy bản sao: bash đã mở tệp, xoá vẫn chạy tiếp
  *)
    BAN_SAO=$(/usr/bin/mktemp /var/tmp/aiigrow-go-cai.XXXXXX) && /bin/cp "$0" "$BAN_SAO" && exec /bin/bash "$BAN_SAO" "$@"
    [ -n "${BAN_SAO:-}" ] && /bin/rm -f "$BAN_SAO"   # chép không được ($0 không phải tệp, vd chạy qua ống): chạy tiếp bản gốc, không để tệp rỗng sót
    ;;
esac

DAEMON_PLIST="/Library/LaunchDaemons/vn.aiilab.aiigrow.daemon.plist"
TRAY_PLIST="/Library/LaunchAgents/vn.aiilab.aiigrow.tray.plist"

# Dấu «máy đã gỡ» ghi NGAY ĐẦU (trước vòng chờ và mọi bootout): bộ cập nhật + postinstall cài tự động thấy là dừng.
# Chạy bằng root: không nhận biến môi trường nào để đổi đường dẫn/lệnh (sudo -E không biến được trình gỡ thành chạy tệp lạ).
LC=/bin/launchctl
DA_GO=/var/db/aiigrow-da-go
/bin/mkdir -p /var/db /var/run 2>/dev/null
# PID của trình gỡ (cả khi chạy tay bằng sudo): daemon không cho ghép và postinstall không nạp lại máy trong lúc gỡ.
# Dòng 2 = giờ bắt đầu của tiến trình (ps lstart): nhận ra đúng trình gỡ kể cả khi chạy qua ống (`curl … | sudo bash`, dòng lệnh chỉ là «bash»)
# và không nhầm PID sót đã bị tiến trình khác dùng lại. LC_ALL=C: daemon/postinstall đọc lại bằng cùng định dạng, không theo ngôn ngữ của sudo.
GO_PID=/var/run/aiigrow-go-cai
{ echo $$; LC_ALL=C /bin/ps -p $$ -o lstart=; } > "$GO_PID" 2>/dev/null
# chỉ xoá khi tệp còn là PID của lượt này (lượt go-cai chạy chồng ghi đè thì để lượt đó tự dọn)
trap '[ "$(/usr/bin/head -n 1 "$GO_PID" 2>/dev/null)" = "$$" ] && /bin/rm -f "$GO_PID"' EXIT
# Bị ngắt (Ctrl-C…) TRƯỚC khi gỡ thật ⇒ trả lại dấu như cũ (máy vẫn ghép, daemon vẫn chạy — đừng để dấu «đã gỡ» chặn tự cập nhật mãi).
# Dấu có sẵn từ trước (daemon gỡ từ xa ghi) thì giữ nguyên.
if [ ! -f "$DA_GO" ]; then
  # Trong lúc chờ bộ tự cập nhật: postinstall thấy dấu có thể đã dọn app ⇒ chỉ trả dấu khi app còn nguyên (máy vẫn chạy bình thường).
  trap 'if [ -d /Applications/AiiGrow.app ]; then /bin/rm -f "$DA_GO"; echo "Đã dừng — chưa gỡ gì."; else echo "Đã dừng giữa lúc cập nhật — chạy lại go-cai.sh để gỡ nốt."; fi; exit 130' INT TERM HUP
fi
echo "da-go" > "$DA_GO" 2>/dev/null && /bin/chmod 0600 "$DA_GO"

# Đang tự cập nhật (installer chạy trong job vn.aiilab.aiigrow.capnhat): chờ xong (tối đa ~5 phút) rồi mới gỡ, kẻo installer nạp lại daemon sau khi ta gỡ.
i=0
while "$LC" list vn.aiilab.aiigrow.capnhat 2>/dev/null | /usr/bin/grep -q '"PID"' && [ "$i" -lt 150 ]; do
  [ "$i" -eq 0 ] && echo "AiiGrow đang tự cập nhật — chờ cài xong rồi gỡ (tối đa 5 phút, đừng ngắt)…"
  [ "$i" -gt 0 ] && [ $((i % 15)) -eq 0 ] && echo "  vẫn đang chờ… ($((i * 2)) giây)"
  /bin/sleep 2; i=$((i + 1))
done
DUNG_CAP_NHAT=0
if [ "$i" -ge 150 ]; then
  DUNG_CAP_NHAT=1
  echo "Cảnh báo: bộ tự cập nhật chạy quá 5 phút — dừng nó để gỡ tiếp."
  /usr/bin/logger -t AiiGrow "go-cai: job vn.aiilab.aiigrow.capnhat chạy quá 5 phút, bị dừng để gỡ" 2>/dev/null || true
fi
# Từ đây là gỡ thật: không trả dấu nữa dù bị ngắt.
trap - INT TERM HUP
# Xong hay hết 5 phút: gỡ hẳn nhãn capnhat + dấu đang-cập-nhật (installer treo thì giết luôn, không để nó nạp lại daemon sau khi gỡ).
"$LC" remove vn.aiilab.aiigrow.capnhat >/dev/null 2>&1 || true
/bin/rm -f /var/run/aiigrow-capnhat

"$LC" bootout system/vn.aiilab.aiigrow.daemon >/dev/null 2>&1 || true
# Daemon đã dừng ⇒ không ai submit job cài được nữa; gỡ lần nữa phòng job vừa được submit đúng lúc ta kiểm ở trên.
# Job đó đang chạy thì cũng là «đã phải dừng cập nhật giữa chừng» (installd có thể cài nốt) ⇒ giữ dấu dung-cap-nhat ở cuối.
if "$LC" list vn.aiilab.aiigrow.capnhat 2>/dev/null | /usr/bin/grep -q '"PID"'; then DUNG_CAP_NHAT=1; fi
"$LC" remove vn.aiilab.aiigrow.capnhat >/dev/null 2>&1 || true
PG=/Applications/AiiGrow.app/Contents/Resources/phien-gui.sh      # cùng quy tắc phiên GUI với preinstall/postinstall; thiếu thì pkill bên dưới vẫn đóng tray
for uid in $([ -f "$PG" ] && /bin/bash "$PG"); do
  "$LC" bootout "gui/$uid/vn.aiilab.aiigrow.tray" >/dev/null 2>&1 || true
done
/usr/bin/pkill -x AiiGrowTray >/dev/null 2>&1 || true

# Đọc cấu hình trước khi xoá (token, máy chủ, tài khoản đã bị hạ quyền admin lúc ghép).
CFG="/Library/Application Support/AiiGrow/config.json"
CURL=/usr/bin/curl
DSEDIT=/usr/sbin/dseditgroup
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
MP="/Library/Managed Preferences"
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
if [ "$DUNG_CAP_NHAT" -eq 1 ]; then
  # Đã phải dừng job cập nhật giữa chừng: installd có thể vẫn cài nốt rồi chạy postinstall SAU khi ta xong. Giữ dấu (đánh dấu loại) để
  # postinstall đó dọn thay vì nạp lại máy vừa gỡ; postinstall chỉ tin dấu loại này trong 10 phút rồi tự xoá (cài tay sau đó bình thường).
  echo "dung-cap-nhat" > "$DA_GO" 2>/dev/null
else
  /bin/rm -f "$DA_GO"               # gỡ xong: không để dấu ngoài thư mục AiiGrow quyết định lần cài sau
fi
echo "Đã gỡ AiiGrow."
# Công việc launchd chạy một lần do daemon đăng ký khi gỡ từ xa (launchctl submit): xoá nhãn để không tồn tại tới lúc khởi động lại
# và lần gỡ từ xa sau không bị trùng nhãn. Việc CUỐI CÙNG của tập lệnh (remove có thể gửi SIGTERM cho chính tiến trình này).
"$LC" remove vn.aiilab.aiigrow.go >/dev/null 2>&1 || true
