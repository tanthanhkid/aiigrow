#!/bin/bash
# Dựng agent-mac/ra/AiiGrow-<BAN>.pkg. Chỉ build, không cài.
# Dùng: BAN=0.1.0 ./build-pkg.sh      (ARCH=native để chỉ build kiến trúc máy này)
set -euo pipefail
cd "$(dirname "$0")"
GOI="$PWD"; MAC="$(cd .. && pwd)"
BAN="${BAN:-0.1.0}"
TMP="${GOI}/.dung"; RA="$MAC/ra"
rm -rf "$TMP"; mkdir -p "$TMP" "$RA"

cd "$MAC"
if [ "${ARCH:-universal}" = "native" ]; then ARCHS=(); else ARCHS=(--arch arm64 --arch x86_64); fi
swift build -c release --scratch-path .build-goi -j 2 ${ARCHS[@]+"${ARCHS[@]}"}
BIN="$(swift build -c release --scratch-path .build-goi ${ARCHS[@]+"${ARCHS[@]}"} --show-bin-path)"
cd "$GOI"

APP="$TMP/root/Applications/AiiGrow.app"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"
cp "$BIN/AiiGrowTray" "$APP/Contents/MacOS/AiiGrowTray"
cp "$BIN/aiigrow-daemon" "$APP/Contents/MacOS/aiigrow-daemon"
sed "s/@BAN@/$BAN/g" Info.plist.in > "$APP/Contents/Info.plist"
cp vn.aiilab.aiigrow.daemon.plist vn.aiilab.aiigrow.tray.plist "$APP/Contents/Resources/"
plutil -lint "$APP/Contents/Info.plist" vn.aiilab.aiigrow.*.plist >/dev/null

# Ký ad-hoc (chưa có Developer ID). Xem README: ký + notarize thật.
codesign --force --deep -s - --identifier vn.aiilab.aiigrow "$APP/Contents/MacOS/aiigrow-daemon"
codesign --force --deep -s - --identifier vn.aiilab.aiigrow "$APP"

mkdir -p "$TMP/scripts"
cp scripts/preinstall scripts/postinstall "$TMP/scripts/"
chmod 755 "$TMP/scripts/"*

pkgbuild --root "$TMP/root" --identifier vn.aiilab.aiigrow.pkg --version "$BAN" \
  --install-location / --scripts "$TMP/scripts" --ownership recommended \
  "$TMP/aiigrow-thanh-phan.pkg"

mkdir -p "$TMP/res"; cp chao.html dieu-khoan.html "$TMP/res/"
sed "s/@BAN@/$BAN/g" distribution.xml.in > "$TMP/distribution.xml"
productbuild --distribution "$TMP/distribution.xml" --resources "$TMP/res" \
  --package-path "$TMP" "$RA/AiiGrow-$BAN.pkg"
rm -rf "$TMP"
echo "Xong: $RA/AiiGrow-$BAN.pkg"
