#!/bin/zsh
# vong.sh bm|con '<regex key>' [chi-so] — chụp DOM app Expo thật + so pixel với ảnh chụp iPhone (xem ../DO-KHOP.md)
# Cần: $CHUP_TAM/dist = bản `npx expo export --platform web` của mobile/ (EXPO_PUBLIC_API=http://localhost:8291),
#      node_modules ở thư mục này (npm i --no-save pixelmatch@5.3.0 pngjs@7.0.0), python3 có Pillow + numpy ($PY).
CC=${0:A:h}; W=${CC:h:h:h}; R=${BS_THIET_KE:-$HOME/OFFLINE_FILES/Code/aiigrow-thiet-ke}
S=${CHUP_TAM:-/tmp/aiig-chup}; mkdir -p $S/ra; cd $CC
LOAI=$1; RE=$2
if [ $LOAI = bm ]; then GOC=pha.mjs; THEM=them-bm.mjs; else GOC=pha-tre.mjs; THEM=them-con.mjs; export KHONG_GIONG=1; fi
export PY=${PY:-python3} THANH_PY=$CC/thanh.py
if [ "$3" != chi-so ]; then
node dung.mjs $W/mobile/scripts/$GOC $THEM $S/chup-$LOAI.mjs || exit 1
: > $S/log-chup.txt
NHOM="A:$(node -e 'console.log(new Date("2026-10-25T07:19:00+07:00").getTime())')"
[ $LOAI = bm ] && NHOM="$NHOM B:$(node -e 'console.log(new Date("2026-10-25T10:00:00+07:00").getTime())')" # màn Con chỉ có nhóm A
for NB in ${=NHOM}; do
 NH=${NB%%:*}; BAY=${NB##*:}
 (CHUP_NHOM=$NH PHA_CONG=8291 PHA_CDP=9591 PHA_BAY=$BAY CHUP_CHUNG=$CC/chup-chung.mjs REF_DIR=$R/chinchu-ios REF_GOC=$R CHUP_RA=$S/ra CHUP_MAN="^($RE)$" node $S/chup-$LOAI.mjs $S/dist >> $S/log-chup.txt 2>&1 & P=$!; for i in $(seq 800); do kill -0 $P 2>/dev/null || break; sleep 1; done; kill $P 2>/dev/null)
 pkill -f "remote-debugging-port=9591"
done
grep -E "chưa thấy|LỖI|KHÔNG|Error|chưa giả: [A-Z]" $S/log-chup.txt
fi
[ -f $S/ra/refs.json ] || { echo "chưa có $S/ra/refs.json — chạy chụp trước (bỏ chi-so)"; exit 1; }
ARGS=$(RE="$RE" REFS=$S/ra/refs.json python3 -c "
import json,os,re
r=json.load(open(os.environ['REFS']))
print(' '.join(f'{k}={v}' for k,v in r.items() if v and re.fullmatch(os.environ['RE'],k)))")
[ -n "$ARGS" ] || { echo "không màn nào khớp «$RE» có ảnh thật"; exit 1; }
(node so.mjs $S/ra/html $S/ra/a $R/chinchu-ios $S/ra/so $S/ra/bang.json ${=ARGS} > $S/log-so.txt 2>&1 & P=$!; for i in $(seq 800); do kill -0 $P 2>/dev/null || break; sleep 1; done; kill $P 2>/dev/null)
pkill -f "remote-debugging-port=9691"
cat $S/log-so.txt
# đưa vào bàn: TOI_TAY="$(cat toi-tay.json)" node gen.mjs $CC/.. $S/ra   (đo HTML dựng tay cũ: chạy server.mjs của thư mục này rồi CONG=<cổng> node cu.mjs $CC/.. $S/ra)
