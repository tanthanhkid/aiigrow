#!/bin/bash
# E2E agent macOS AiiGrow trên máy Mac thật (GitHub Actions macos-15, người chạy `runner` có sudo không mật khẩu).
# KHÔNG phải mã sản phẩm: chỉ điều khiển gói cài / launchd / IPC / API như Ba Mẹ và quản trị viên, rồi kiểm kết quả.
# Mỗi kiểm tra in PASS / FAIL / BỎ; cuối cùng ghi bảng vào $GITHUB_STEP_SUMMARY và e2e-logs/ket-qua.md. Có FAIL ⇒ exit 1.
# Dùng: agent-mac/e2e/chay.sh <AiiGrow-x.y.z.pkg> <số bản>      (xem agent-mac/e2e/README.md)
set -u
PKG="${1:?cần đường dẫn .pkg}"; BAN="${2:?cần số bản}"
GOC="$(cd "$(dirname "$0")/../.." && pwd)"
LOG="${THU_MUC_LOG:-$GOC/e2e-logs}"; mkdir -p "$LOG"; LOG="$(cd "$LOG" && pwd)"
IPC="python3 $GOC/agent-mac/e2e/ipc.py"
NEXT="http://127.0.0.1:3310"
DATA="/Library/Application Support/AiiGrow"
TEN_CON=aiicon
KQ="$LOG/ket-qua.tsv"; : > "$KQ"
FAILS=0

log() { printf '[%s] %s\n' "$(date +%H:%M:%S)" "$*"; }
ghi() { # ma ten ketqua chitiet
  printf '%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "${4//$'\n'/ }" >> "$KQ"
  printf '%-4s %s %s — %s\n' "$3" "$1" "$2" "$4"
  if [ "$3" = FAIL ]; then FAILS=$((FAILS+1)); [ -n "${GITHUB_ACTIONS:-}" ] && echo "::error title=E2E $1::$2 — ${4//$'\n'/ }"; fi
}
dat() { if [ "$3" = 1 ]; then ghi "$1" "$2" PASS "$4"; else ghi "$1" "$2" FAIL "$4"; fi; }   # dat ma ten 0|1 chitiet
bo() { ghi "$1" "$2" 'BỎ' "$3"; }

# chờ điều kiện (lệnh) tối đa $1 giây, nhịp $2
cho() { local het=$((SECONDS+$1)) buoc=$2; shift 2; while [ $SECONDS -lt $het ]; do if "$@" >/dev/null 2>&1; then return 0; fi; sleep "$buoc"; done; "$@" >/dev/null 2>&1; }

api() { # method path [json] [token]  → in thân; mã HTTP ở $API_MA
  local m="$1" p="$2" b="${3:-}" t="${4:-}" out
  local args=(-sS -m 120 -X "$m" -w '\n%{http_code}' -H 'Content-Type: application/json')
  [ -n "$t" ] && args+=(-H "Authorization: Bearer $t")
  [ -n "$b" ] && args+=(--data "$b")
  out=$(curl "${args[@]}" "$NEXT$p" 2>&1); API_MA="${out##*$'\n'}"; API_THAN="${out%$'\n'*}"
  [[ "$API_MA" =~ ^2 ]]
}
jqr() { printf '%s' "$1" | jq -r "$2" 2>/dev/null; }

# trạng thái daemon qua IPC: tìm dict đầu tiên có khoá cheDo
trang_thai() { $IPC '{"trangThai":{}}' 2>&1 | jq -c '[.. | objects | select(has("cheDo"))][0] // empty' 2>/dev/null; }
tt_truong() { trang_thai | jq -r ".$1 // empty" 2>/dev/null; }
cho_che_do() { [ "$(tt_truong cheDo)" = "$1" ]; }
daemon_chay() { sudo launchctl print system/vn.aiilab.aiigrow.daemon 2>/dev/null | grep -q 'state = running'; }

TOKEN_BM=""; CON_ID=""; MAY_ID=""

ket_thuc() {
  local f="$LOG/ket-qua.md" pass fail bo
  pass=$(awk -F'\t' '$3=="PASS"' "$KQ" | wc -l | tr -d ' '); fail=$(awk -F'\t' '$3=="FAIL"' "$KQ" | wc -l | tr -d ' '); bo=$(awk -F'\t' '$3=="BỎ"' "$KQ" | wc -l | tr -d ' ')
  {
    echo "## E2E agent macOS — bản $BAN · $(sw_vers -productName) $(sw_vers -productVersion) $(uname -m)"
    echo; echo "PASS $pass · FAIL $fail · BỎ $bo"; echo
    echo '| Mã | Kiểm tra | Kết quả | Chi tiết |'; echo '|---|---|---|---|'
    awk -F'\t' '{ gsub(/\|/, "/", $4); printf "| %s | %s | %s | %s |\n", $1, $2, $3, substr($4, 1, 300) }' "$KQ"
  } > "$f"
  cat "$f"
  [ -n "${GITHUB_STEP_SUMMARY:-}" ] && cat "$f" >> "$GITHUB_STEP_SUMMARY"
  sudo cp -R "/Library/Logs/AiiGrow" "$LOG/aiigrow-logs" 2>/dev/null; sudo chmod -R a+r "$LOG" 2>/dev/null
  [ -n "${PID_SERVER:-}" ] && { pkill -P "$PID_SERVER" 2>/dev/null; kill "$PID_SERVER" 2>/dev/null; }
  [ "$fail" -gt 0 ] && exit 1; exit 0
}

# ------------------------------------------------------------------ KB0 — máy chủ thử (Next + PGlite, OTP chế độ thử)
log "Máy: $(sw_vers -productName) $(sw_vers -productVersion) $(uname -m) · người chạy $(id -un) uid $(id -u)"
export PGLITE_DIR="${RUNNER_TEMP:-/tmp}/aiigrow-pg"; rm -rf "$PGLITE_DIR"; export NEXT_TELEMETRY_DISABLED=1
( cd "$GOC/server" && exec pnpm dev > "$LOG/server.log" 2>&1 ) &
PID_SERVER=$!
if ! cho 300 5 curl -fsS -m 60 "$NEXT/api/suc-khoe"; then ghi KB0 'Máy chủ Next lên' FAIL "không lên ở $NEXT sau 300 giây"; ket_thuc; fi
ghi KB0 'Máy chủ Next + PGlite lên' PASS "$NEXT/api/suc-khoe = 200"
# hâm nóng các đường agent gọi (next dev biên dịch lần đầu chậm, agent chỉ chờ 20 giây mỗi yêu cầu)
for d in "POST /api/device/ghep-goi" "POST /api/device/dong-bo" "GET /api/device/cho-thay-doi" "GET /api/device/ung-dung" "POST /api/device/ung-dung" "GET /api/device/ho-so" "POST /api/device/nhat-ky" "GET /api/agent/ban-moi?platform=mac"; do
  curl -s -m 120 -X "${d% *}" -H 'Content-Type: application/json' --data '{}' -o /dev/null "$NEXT${d#* }" || true
done

# ------------------------------------------------------------------ KB1 — Ba Mẹ, Con, tài khoản macOS của Con, gói cài một chạm
SDT="09$((RANDOM%9000+1000))$((RANDOM%9000+1000))"
api POST /api/m/otp "{\"dinhDanh\":\"$SDT\",\"mucDich\":\"dang_ky\"}"; OTP=$(jqr "$API_THAN" .ma)
dat 1.1 'OTP chế độ thử trả mã' "$([[ "$OTP" =~ ^[0-9]{6}$ ]] && echo 1 || echo 0)" "mã HTTP $API_MA"
api POST /api/m/dang-ky "{\"dinhDanh\":\"$SDT\",\"ma\":\"$OTP\",\"ten\":\"Ba E2E\",\"matKhau\":\"MatKhau-E2e-$RANDOM$RANDOM\"}"; TOKEN_BM=$(jqr "$API_THAN" .token)
[ -n "$TOKEN_BM" ] && echo "::add-mask::$TOKEN_BM"
dat 1.2 'Đăng ký Ba Mẹ → token phiên' "$([ -n "$TOKEN_BM" ] && echo 1 || echo 0)" "mã HTTP $API_MA"
api POST /api/m/con "{\"ten\":\"Con E2E\",\"namSinh\":$(( $(date +%Y) - 10 )),\"pin\":\"1234\"}" "$TOKEN_BM"; CON_ID=$(jqr "$API_THAN" .id)
dat 1.3 'Tạo Con' "$([ -n "$CON_ID" ] && echo 1 || echo 0)" "con $CON_ID"
# giờ ngủ dời xa giờ hiện tại (+11h..+12h theo UTC+7) để kết quả không phụ thuộc lúc chạy
TU=$(TZ=Asia/Ho_Chi_Minh date -v+11H +%H:00); DEN=$(TZ=Asia/Ho_Chi_Minh date -v+12H +%H:00)
api POST "/api/m/con/$CON_ID/lich" "{\"ngu\":{\"tu\":\"$TU\",\"den\":\"$DEN\"}}" "$TOKEN_BM"; log "giờ ngủ thử ${TU}–${DEN} (HTTP $API_MA)"
MK_CON="Aa1!$(uuidgen | tr -d -)"
sudo sysadminctl -addUser "$TEN_CON" -fullName 'Con E2E' -password "$MK_CON" >"$LOG/sysadminctl.log" 2>&1
UID_CON=$(id -u "$TEN_CON" 2>/dev/null); LA_ADMIN=$(id -Gn "$TEN_CON" 2>/dev/null | grep -qw admin && echo 1 || echo 0)
dat 1.4 'Tài khoản macOS thường của Con' "$([ -n "$UID_CON" ] && [ "$LA_ADMIN" = 0 ] && echo 1 || echo 0)" "$TEN_CON uid=${UID_CON:-?} admin=$LA_ADMIN"
api POST /api/m/goi-cai "{\"con\":\"$CON_ID\",\"nen\":\"mac\"}" "$TOKEN_BM"; TOKEN_GOI=$(jqr "$API_THAN" .token)
[ -n "$TOKEN_GOI" ] && echo "::add-mask::$TOKEN_GOI"
dat 1.5 'Gói cài một chạm (goi-cai, nền mac)' "$([ "${#TOKEN_GOI}" = 43 ] && echo 1 || echo 0)" "độ dài token ${#TOKEN_GOI} (cần 43 để tên gói AiiGrow_<token>.pkg khớp postinstall) · HTTP $API_MA"

# App giả «ngoài danh sách» tạo TRƯỚC khi cài/ghép: daemon quét /Applications lúc ghép, sau đó chỉ quét lại khi Ba Mẹ bấm «Làm mới».
APP="/Applications/E2EChan.app"
sudo mkdir -p "$APP/Contents/MacOS"
# bản sao /bin/sleep bị SIGKILL (137) vì mất chữ ký nền tảng ⇒ biên dịch một tệp nhị phân nhỏ (linker tự ký ad-hoc trên arm64)
printf '#include <unistd.h>\nint main(void){for(;;)sleep(60);}\n' > /tmp/e2echan.c
cc -o /tmp/e2echan /tmp/e2echan.c && sudo cp /tmp/e2echan "$APP/Contents/MacOS/e2echan"
sudo tee "$APP/Contents/Info.plist" >/dev/null <<'PL'
<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>CFBundleIdentifier</key><string>vn.e2e.chan</string><key>CFBundleName</key><string>E2EChan</string><key>CFBundleExecutable</key><string>e2echan</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleShortVersionString</key><string>1.0</string></dict></plist>
PL
sudo codesign --force -s - "$APP" >/dev/null 2>&1

# ------------------------------------------------------------------ KB2 — cài gói chưa ký bằng installer
# Máy chủ thử: đặt mayChu = máy chủ cục bộ vào config.json TRƯỚC khi cài (ghép một chạm gọi api.mayChu; không có tuỳ chọn khác để đổi). Đây là đồ giả của harness.
sudo mkdir -p "$DATA"; sudo chmod 0700 "$DATA"
printf '{"mayChu":"%s"}' "$NEXT" | sudo tee "$DATA/config.json" >/dev/null; sudo chmod 0600 "$DATA/config.json"
GOI="$LOG/../e2e-goi"; mkdir -p "$GOI"; GOI="$(cd "$GOI" && pwd)"; cp "$PKG" "$GOI/AiiGrow_${TOKEN_GOI}.pkg"
sudo installer -pkg "$GOI/AiiGrow_${TOKEN_GOI}.pkg" -target / >"$LOG/installer.log" 2>&1; MA_CAI=$?
sed -E 's/AiiGrow_[A-Za-z0-9_-]{43}/AiiGrow_***/g' "$LOG/installer.log" > "$LOG/installer.log.an" && mv "$LOG/installer.log.an" "$LOG/installer.log"
dat 2.1 'sudo installer -pkg thoát 0' "$([ "$MA_CAI" = 0 ] && echo 1 || echo 0)" "mã $MA_CAI · $(tail -n 2 "$LOG/installer.log" | tr '\n' ' ')"
cho 60 3 daemon_chay; dat 2.2 'Daemon launchd (system/vn.aiilab.aiigrow.daemon) đang chạy' "$(daemon_chay && echo 1 || echo 0)" "$(sudo launchctl print system/vn.aiilab.aiigrow.daemon 2>&1 | grep -E 'state =|pid =|program =' | tr -s ' ' | tr '\n' ';')"
TEP_THIEU=""; for t in /Applications/AiiGrow.app/Contents/MacOS/aiigrow-daemon /Applications/AiiGrow.app/Contents/MacOS/AiiGrowTray /Applications/AiiGrow.app/Contents/Info.plist /Library/LaunchDaemons/vn.aiilab.aiigrow.daemon.plist /Library/LaunchAgents/vn.aiilab.aiigrow.tray.plist; do [ -e "$t" ] || TEP_THIEU="$TEP_THIEU $t"; done
dat 2.3 'Tệp cài (app, daemon, hai plist launchd)' "$([ -z "$TEP_THIEU" ] && echo 1 || echo 0)" "thiếu:${TEP_THIEU:- không}"
BAN_APP=$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' /Applications/AiiGrow.app/Contents/Info.plist 2>/dev/null)
dat 2.4 'Bản app = bản build' "$([ "$BAN_APP" = "$BAN" ] && echo 1 || echo 0)" "Info.plist $BAN_APP, mong $BAN"
dat 2.5 'Socket IPC /var/run/aiigrow.sock có' "$(cho 30 2 test -S /var/run/aiigrow.sock && echo 1 || echo 0)" "$(ls -l /var/run/aiigrow.sock 2>&1)"
QUYEN=$(sudo stat -f '%Sp %Su' "$DATA" 2>&1); dat 2.6 'Thư mục dữ liệu root 0700' "$([ "$QUYEN" = 'drwx------ root' ] && echo 1 || echo 0)" "$QUYEN"
dat 2.7 'Token gói cài (goi-cai-token) root 0600 trước khi ghép' "$([ "$(sudo stat -f '%Sp %Su' "$DATA/goi-cai-token" 2>/dev/null)" = '-rw------- root' ] && echo 1 || echo 0)" "$(sudo ls -l "$DATA" | tail -n +2 | awk '{print $1,$3,$9}' | tr '\n' ';')"

# ------------------------------------------------------------------ KB3 — ghép một chạm qua IPC (như nút «Ghép máy» của tray, người gọi là admin)
R=$($IPC "{\"ghep\":{\"ma\":\"\",\"taiKhoanCon\":\"$TEN_CON\"}}" 60 2>&1)
log "ghep → $(printf '%s' "$R" | cut -c1-300)"
OK_GHEP=$(printf '%s' "$R" | jq -r 'if (has("ok") or has("canhBao")) then "1" else "0" end' 2>/dev/null)
dat 3.1 'Ghép một chạm bằng token trong tên gói' "${OK_GHEP:-0}" "$(printf '%s' "$R" | sed -E 's/[A-Za-z0-9_-]{40,}/***/g' | cut -c1-250)"
CFG=$(sudo cat "$DATA/config.json" 2>/dev/null); TOK_MAY=$(jqr "$CFG" .token)
dat 3.2 'config.json có token máy, uid + tên Con, mayChu cục bộ' "$([ "${#TOK_MAY}" -ge 16 ] && [ "$(jqr "$CFG" .taiKhoanCon)" = "$TEN_CON" ] && [ "$(jqr "$CFG" .uidCon)" = "$UID_CON" ] && echo 1 || echo 0)" "token ${#TOK_MAY} ký tự · taiKhoanCon $(jqr "$CFG" .taiKhoanCon) · uidCon $(jqr "$CFG" .uidCon) (mong $UID_CON) · mayChu $(jqr "$CFG" .mayChu)"
dat 3.3 'Token gói cài đã xoá sau ghép' "$(sudo test ! -f "$DATA/goi-cai-token" && echo 1 || echo 0)" ""
T0=$SECONDS; MAY=""
while [ $((SECONDS-T0)) -lt 180 ]; do
  api GET /api/m/tuan-thu "" "$TOKEN_BM"; MAY=$(jqr "$API_THAN" '[.ds[]? | select(.nen=="mac")][0] // empty')
  [ -n "$MAY" ] && [ "$(jqr "$MAY" .lanCuoi)" != null ] && [ "$(jqr "$MAY" .phienBan)" != null ] && break; sleep 5
done
MAY_ID=$(jqr "$MAY" .id)
dat 3.4 'Máy Mac trong tuan-thu, đã đồng bộ' "$([ -n "$MAY_ID" ] && echo 1 || echo 0)" "sau $((SECONDS-T0)) giây · id $MAY_ID ten $(jqr "$MAY" .ten) lanCuoi $(jqr "$MAY" .lanCuoi)"
dat 3.5 'status.version = bản build' "$([ "$(jqr "$MAY" .phienBan)" = "$BAN" ] && echo 1 || echo 0)" "phienBan $(jqr "$MAY" .phienBan), mong $BAN"
dat 3.6 'Máy gắn đúng Con của gói cài' "$([ "$(jqr "$MAY" .con)" = "$CON_ID" ] && echo 1 || echo 0)" "con $(jqr "$MAY" .con)"
STT=$(trang_thai)
dat 3.7 'IPC trangThai: đã ghép, tên Con' "$([ "$(jqr "$STT" .daGhep)" = true ] && echo 1 || echo 0)" "$(printf '%s' "$STT" | jq -c '{daGhep,tenCon,cheDo,lyDoKhoa,matMang,banDaemon}' 2>/dev/null)"

# ------------------------------------------------------------------ KB4 — đồng bộ chính sách: chế độ máy, web chặn
api POST "/api/m/may/$MAY_ID/che-do" '{"cheDo":"chan"}' "$TOKEN_BM"
api POST "/api/m/con/$CON_ID/che-do-chan" '{"cheDo":"chi_app_duoc_phep"}' "$TOKEN_BM"; log "che-do-chan chi_app_duoc_phep HTTP $API_MA"
T0=$SECONDS; cho 60 1 cho_che_do hoc; G=$((SECONDS-T0))
dat 4.1 '«Chỉ app được phép» ⇒ daemon mode hoc (long-poll, không chờ chu kỳ)' "$(cho_che_do hoc && echo 1 || echo 0)" "mode $(tt_truong cheDo), sau $G giây (thiết kế ≤5 giây; ngưỡng chấp nhận 20)"
dat 4.1b 'Long-poll cho-thay-doi áp nhanh: ≤ 20 giây' "$([ "$G" -le 20 ] && [ "$(tt_truong cheDo)" = hoc ] && echo 1 || echo 0)" "$G giây"
TEN_CHAN="chan-thu-e2e.vn"
api POST "/api/m/con/$CON_ID/web/trang" "{\"muc\":\"$TEN_CHAN\",\"trangThai\":\"chan\"}" "$TOKEN_BM"
CO_CHAN() { trang_thai | jq -e --arg d "$TEN_CHAN" '(.trangChan // []) | map(select(contains($d))) | length > 0' >/dev/null; }
CO_DS() { trang_thai | jq -e '(.trangChan // []) | length > 0' >/dev/null; }
cho 60 2 CO_DS
dat 4.2 'Chính sách web về daemon: status.trangChan có danh sách web cấm luôn chặn' "$(CO_DS && echo 1 || echo 0)" "$(trang_thai | jq -c '(.trangChan // []) | {so: length, dau: .[0:3]}' 2>/dev/null) (ở «Chỉ app được phép» «*» nằm ở luật trình duyệt, không ở trangChan)"
sleep 8
if grep -q "$TEN_CHAN" /etc/hosts 2>/dev/null; then ghi 4.3 'Khối /etc/hosts có mốc # AiiGrow + tên miền chặn' PASS "$(grep -c '# AiiGrow' /etc/hosts) dòng"
else bo 4.3 'Khối /etc/hosts / chính sách trình duyệt áp cho Con' "daemon chỉ đặt hosts + Managed Preferences khi Con đang ở màn hình (phienConsole); runner không có phiên đăng nhập của Con"; fi

# ------------------------------------------------------------------ KB5 — chặn app thật: app ngoài danh sách đang chạy dưới uid Con bị đóng
# danh sách app: daemon quét /Applications ở lần đồng bộ kế ⇒ Ba Mẹ thấy E2EChan
KHOA_APP=""; T0=$SECONDS
while [ $((SECONDS-T0)) -lt 240 ]; do
  api GET "/api/m/may/$MAY_ID/ung-dung" "" "$TOKEN_BM"; KHOA_APP=$(jqr "$API_THAN" '[.ds[]? | select((.ten // "" | test("E2EChan")) or (.khoa // "" | test("e2e"; "i")))][0].khoa // empty')
  [ -n "$KHOA_APP" ] && break; sleep 10
done
dat 5.1 'App thật quét từ /Applications lên máy chủ (E2EChan)' "$([ -n "$KHOA_APP" ] && echo 1 || echo 0)" "khoa «${KHOA_APP}» · $(jqr "$API_THAN" '[.ds[]? | (.ten // .khoa)] | join(",")' | cut -c1-200) · sau $((SECONDS-T0)) giây"
if [ -n "$KHOA_APP" ]; then
  # chạy app dưới uid Con TRƯỚC, kiểm còn sống, rồi mới chặn (vòng áp 5 giây có thể đóng nó trước khi kịp kiểm)
  api POST "/api/m/con/$CON_ID/che-do-chan" '{"cheDo":"mo_het"}' "$TOKEN_BM"; cho 60 1 cho_che_do tu_do
  : > /tmp/e2echan.log; chmod 666 /tmp/e2echan.log
  sudo -u "$TEN_CON" "$APP/Contents/MacOS/e2echan" 3000 >>/tmp/e2echan.log 2>&1 &
  sleep 1
  DANG_CHAY() { ps -axo uid=,comm= 2>/dev/null | awk -v u="$UID_CON" '$1==u' | grep -q e2echan; }
  SONG0=$(DANG_CHAY && echo 1 || echo 0)
  [ "$SONG0" = 1 ] || { sudo -u "$TEN_CON" "$APP/Contents/MacOS/e2echan" >>/tmp/e2echan.log 2>&1 & DP=$!; sleep 2; kill "$DP" 2>/dev/null; wait "$DP" 2>/dev/null; echo "chạy thử 2 giây: mã $?" >>/tmp/e2echan.log; }
  log "E2EChan chạy dưới uid Con: $SONG0 · log: $(cat /tmp/e2echan.log | head -c 200) · ps: $(ps -u "$UID_CON" -o pid=,comm= | head -5 | tr '\n' ';')"
  api POST "/api/m/may/$MAY_ID/ung-dung/dat" "{\"khoa\":\"$KHOA_APP\",\"trangThai\":\"chan\"}" "$TOKEN_BM"; log "ung-dung/dat chan HTTP $API_MA"
  api POST "/api/m/con/$CON_ID/che-do-chan" '{"cheDo":"chi_app_duoc_phep"}' "$TOKEN_BM"
  T0=$SECONDS; cho 40 2 sh -c "! ps -axo uid=,comm= | awk -v u=$UID_CON '\$1==u' | grep -q e2echan"; G=$((SECONDS-T0))
  if [ "$SONG0" != 1 ]; then bo 5.2 'App chặn đang chạy dưới uid Con bị đóng' "không khởi chạy được tiến trình E2EChan dưới uid Con: $(head -c 200 /tmp/e2echan.log)"
  elif DANG_CHAY && [ "$(stat -f %Su /dev/console 2>/dev/null)" != "$TEN_CON" ]; then bo 5.2 'App chặn đang chạy dưới uid Con bị đóng' "daemon chỉ áp chính sách (đóng app) khi Con là người dùng console (BoMay.apChinhSachTho: laCon = phienConsole.uid == uidCon); console runner = $(stat -f %Su /dev/console), không đăng nhập phiên GUI của Con được trên runner · tiến trình còn chạy sau 40 giây (mode $(tt_truong cheDo))"
  elif DANG_CHAY; then ghi 5.2 'App chặn đang chạy dưới uid Con bị đóng' FAIL "E2EChan (uid Con) còn chạy sau 40 giây dù Con là console · mode $(tt_truong cheDo) · chanApp $(tt_truong chanApp)"
  else ghi 5.2 'App chặn đang chạy dưới uid Con bị đóng' PASS "bị đóng sau ~$G giây · chanApp $(tt_truong chanApp) chanLyDo $(tt_truong chanLyDo)"; fi
  pkill -u "$UID_CON" e2echan 2>/dev/null
  api POST "/api/m/may/$MAY_ID/ung-dung/dat" "{\"khoa\":\"$KHOA_APP\",\"trangThai\":\"bo\"}" "$TOKEN_BM" || true
else bo 5.2 'App chặn đang chạy dưới uid Con bị đóng' 'không thấy E2EChan trong danh sách app'; fi
bo 5.3 'Màn «chưa được mở» / thông báo cho Con' 'cần phiên GUI đăng nhập của Con (tray) + quyền Thông báo (TCC) — runner không có'
bo 5.4 'Thời gian dùng theo app (appTienCanh), Screen Time' 'cần phiên GUI + quyền TCC (Accessibility / Screen Recording) không cấp được trên runner'

# ------------------------------------------------------------------ KB6 — khoá ngay rồi mở lại
api POST "/api/m/con/$CON_ID/khoa" '{"khoa":true}' "$TOKEN_BM"; T0=$SECONDS
cho 60 1 cho_che_do khoa; G=$((SECONDS-T0))
dat 6.1 'Khoá ngay ⇒ daemon mode khoa (≤ 20 giây, long-poll)' "$([ "$(tt_truong cheDo)" = khoa ] && [ "$G" -le 20 ] && echo 1 || echo 0)" "mode $(tt_truong cheDo) lyDoKhoa $(tt_truong lyDoKhoa) sau $G giây"
api POST "/api/m/con/$CON_ID/khoa" '{"khoa":false}' "$TOKEN_BM"; T0=$SECONDS
khong_khoa() { local c; c=$(tt_truong cheDo); [ -n "$c" ] && [ "$c" != khoa ]; }
cho 60 1 khong_khoa; G=$((SECONDS-T0))
dat 6.2 'Mở lại ⇒ hết khoá' "$(khong_khoa && echo 1 || echo 0)" "mode $(tt_truong cheDo) sau $G giây"
bo 6.3 'Màn khoá toàn màn hình / ngắt phiên Con (dongPhien)' 'cần phiên đăng nhập của Con (loginwindow/tray) — runner không có'

# ------------------------------------------------------------------ KB7 — «Mở hết»
api POST "/api/m/con/$CON_ID/che-do-chan" '{"cheDo":"mo_het"}' "$TOKEN_BM"; T0=$SECONDS
cho 60 1 cho_che_do tu_do; G=$((SECONDS-T0))
dat 7.1 '«Mở hết» ⇒ daemon mode tu_do (≤ 20 giây)' "$([ "$(tt_truong cheDo)" = tu_do ] && [ "$G" -le 20 ] && echo 1 || echo 0)" "mode $(tt_truong cheDo) sau $G giây"
# 11/11 (#226) «Mở hết» mở THẬT hết: trang Ba Mẹ chặn bỏ khỏi trangChan, web cấm luôn chặn vẫn còn
het_chan_bm() { ! CO_CHAN && CO_DS; }
cho 60 2 het_chan_bm
dat 7.2 'Mở hết: trang Ba Mẹ chặn được mở, web cấm vẫn chặn' "$(het_chan_bm && echo 1 || echo 0)" "trangChan: $(trang_thai | jq -c '.trangChan' 2>/dev/null | cut -c1-200)"
api POST "/api/m/may/$MAY_ID/che-do" '{"cheDo":"giam-sat"}' "$TOKEN_BM"
dat 7.3 'Máy chủ từ chối «Giám sát» (409 che_do_bo)' "$([ "$API_MA" = 409 ] && printf '%s' "$API_THAN" | grep -q che_do_bo && echo 1 || echo 0)" "HTTP $API_MA $API_THAN"

# ------------------------------------------------------------------ KB8 — gỡ cài
sudo bash /Applications/AiiGrow.app/Contents/Resources/go-cai.sh >"$LOG/go-cai.log" 2>&1; MA_GO=$?
dat 8.1 'go-cai.sh thoát 0' "$([ "$MA_GO" = 0 ] && echo 1 || echo 0)" "mã $MA_GO · $(tail -n 3 "$LOG/go-cai.log" | tr '\n' ' ')"
cho 60 2 sh -c '! sudo launchctl print system/vn.aiilab.aiigrow.daemon'
CON_LAI=""; for t in /Applications/AiiGrow.app /Library/LaunchDaemons/vn.aiilab.aiigrow.daemon.plist /Library/LaunchAgents/vn.aiilab.aiigrow.tray.plist "$DATA/config.json"; do sudo test -e "$t" && CON_LAI="$CON_LAI $t"; done
sudo launchctl print system/vn.aiilab.aiigrow.daemon >/dev/null 2>&1 && CON_LAI="$CON_LAI (daemon còn trong launchd)"
dat 8.2 'Daemon rời launchd; app, plist, config.json đã xoá' "$([ -z "$CON_LAI" ] && echo 1 || echo 0)" "còn:${CON_LAI:- không}"
dat 8.3 'Khối # AiiGrow trong /etc/hosts đã gỡ' "$(grep -q '# AiiGrow' /etc/hosts && echo 0 || echo 1)" ""
sleep 5; api GET /api/m/tuan-thu "" "$TOKEN_BM"
sudo rm -rf "$APP" 2>/dev/null
ket_thuc
