#!/usr/bin/env bash
# Chạy trong android-emulator-runner (từng dòng script là một lệnh sh riêng ⇒ gom vào tệp này). Chạy ở thư mục gốc repo.
set -uo pipefail
OUT="$PWD/mobile/.maestro/out"; mkdir -p "$OUT/anh"
adb install -r apk-in/ba-me.apk || exit 1
adb shell pm list packages | grep vn.aiilab.aiigrow
adb logcat -c
rc=0
cd mobile/.maestro/android
maestro test --format junit --output "$OUT/junit.xml" --debug-output "$OUT/debug" . 2>&1 | tee "$OUT/maestro.txt"
rc=${PIPESTATUS[0]}
cd - >/dev/null
adb logcat -d -v time > "$OUT/logcat.txt" 2>&1 || true
grep -E "FATAL EXCEPTION|ReactNativeJS.*(Error|ERROR)|AndroidRuntime" "$OUT/logcat.txt" | head -40 > "$OUT/loi-app.txt" || true
adb exec-out screencap -p > "$OUT/cuoi.png" 2>/dev/null || true
{
  echo "### Maestro Android — mã thoát $rc · $(find "$OUT/anh" -name '*.png' | wc -l) ảnh"
  echo '```'; tail -40 "$OUT/maestro.txt"; echo '```'
  if [ -s "$OUT/loi-app.txt" ]; then echo '**logcat — crash/JS error:**'; echo '```'; cat "$OUT/loi-app.txt"; echo '```'; fi
} >> "${GITHUB_STEP_SUMMARY:-/dev/null}"
exit $rc
