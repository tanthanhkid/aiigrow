#!/usr/bin/env bash
# Chụp các màn demo của app AiiGrow Con trên giả lập: chup-ios.sh <UDID> <thư mục ra> <app>
set -euo pipefail
udid="$1"; ra="$2"; app="$3"; tien="${4:-man}"
mkdir -p "$ra"
xcrun simctl boot "$udid" 2>/dev/null || true
xcrun simctl bootstatus "$udid" -b
xcrun simctl install "$udid" "$app"
for m in chao chuaGhep nhapMa quyen chinh xinThem nhiemVu saoQua; do
  xcrun simctl terminate "$udid" vn.aiilab.aiigrow.con 2>/dev/null || true
  xcrun simctl launch "$udid" vn.aiilab.aiigrow.con -demo "$m" >/dev/null
  sleep 4
  xcrun simctl io "$udid" screenshot "$ra/$tien-$m.png"
done
ls -la "$ra"
