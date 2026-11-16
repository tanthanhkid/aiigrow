#!/usr/bin/env bash
# In ra UDID một giả lập iOS CÓ THẬT trên runner theo loại (iPhone | iPad), chọn iOS mới nhất; chưa có thì tạo.
# Dùng: UDID=$(scripts/ci/chon-gia-lap.sh iPhone)
set -euo pipefail
loai="${1:?iPhone|iPad}"
xcrun simctl list devices available -j | python3 -c '
import json, sys
loai = sys.argv[1]
d = json.load(sys.stdin)["devices"]
def ver(k):
    try: return tuple(int(x) for x in k.split("iOS-")[1].split("-"))
    except Exception: return ()
ung = []
for k, ds in d.items():
    if "iOS-" not in k: continue
    for x in ds:
        if x["name"].startswith(loai):
            ung.append((ver(k), x["name"], x["udid"]))
if not ung: sys.exit(3)
# ưu tiên bản iOS mới nhất, rồi tên không "Pro Max"/"Plus" cho nhẹ
ung.sort(key=lambda t: (t[0], "Pro" not in t[1] and "Plus" not in t[1], t[1]))
print(ung[-1][2])
' "$loai" || { echo "không có giả lập $loai" >&2; xcrun simctl list devices available >&2; exit 3; }
