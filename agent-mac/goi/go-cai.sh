#!/bin/bash
# Gỡ AiiGrow khỏi máy Mac. Chạy: sudo bash go-cai.sh
set -u
if [ "$(id -u)" -ne 0 ]; then echo "Cần quyền quản trị: sudo bash $0" >&2; exit 1; fi

DAEMON_PLIST="/Library/LaunchDaemons/vn.aiilab.aiigrow.daemon.plist"
TRAY_PLIST="/Library/LaunchAgents/vn.aiilab.aiigrow.tray.plist"

/bin/launchctl bootout system/vn.aiilab.aiigrow.daemon >/dev/null 2>&1 || true
for uid in $(/bin/ps -axo uid=,comm= | /usr/bin/awk '/AiiGrowTray/ {print $1}' | /usr/bin/sort -u); do
  /bin/launchctl bootout "gui/$uid/vn.aiilab.aiigrow.tray" >/dev/null 2>&1 || true
done
/usr/bin/pkill -x AiiGrowTray >/dev/null 2>&1 || true

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

/bin/rm -f "$DAEMON_PLIST" "$TRAY_PLIST"
/bin/rm -rf "/Applications/AiiGrow.app" "/Library/Application Support/AiiGrow" "/Library/Logs/AiiGrow"
/bin/rm -f /var/run/aiigrow.sock
/usr/sbin/pkgutil --forget vn.aiilab.aiigrow.pkg >/dev/null 2>&1 || true
echo "Đã gỡ AiiGrow."
