#!/bin/bash
# Xếp hàng việc nặng (test/build) giữa các sub agent trên máy 16 GB: một việc nặng một lúc. Chờ khoá tối đa 15 phút.
# Dùng: tools/thiet-ke-chot/nang.sh npm test
KHOA=/tmp/aiigrow-viec-nang.lock
for i in $(seq 90); do
  if mkdir "$KHOA" 2>/dev/null; then echo $$ > "$KHOA/pid"; break; fi
  # khoá mồ côi (tiến trình giữ khoá đã chết) ⇒ gỡ
  p=$(cat "$KHOA/pid" 2>/dev/null); if [ -n "$p" ] && ! kill -0 "$p" 2>/dev/null; then rm -rf "$KHOA"; continue; fi
  [ "$i" = 90 ] && { echo "nang.sh: chờ khoá quá 15 phút, bỏ" >&2; exit 75; }
  sleep 10
done
trap 'rm -rf "$KHOA"' EXIT
"$@"
