#!/bin/bash
# Dựng agent-mac/ra/AiiGrow-<BAN>.pkg. Chỉ build, không cài.
# Dùng: BAN=0.1.0 ./build-pkg.sh      (ARCH=native để chỉ build kiến trúc máy này)
set -euo pipefail
cd "$(dirname "$0")"
GOI="$PWD"; MAC="$(cd .. && pwd)"
BAN="${BAN:-0.1.0}"
# Bản trong mã (PhienBan.hienTai — gửi lên máy chủ) phải khớp bản gói, lệch thì dừng.
grep -q "hienTai = \"$BAN\"" ../Sources/AiiGrowCore/MoHinh.swift || { echo "BAN=$BAN lệch PhienBan.hienTai trong MoHinh.swift" >&2; exit 1; }
# Phát hành (NOTARY=1) phải ký thật cả app lẫn gói.
if [ "${NOTARY:-}" = 1 ] || [ -n "${KY_PKG:-}" ]; then
  [ -n "${KY_APP:-}" ] && [ -n "${KY_PKG:-}" ] || { echo "NOTARY/KY_PKG cần đủ KY_APP + KY_PKG" >&2; exit 1; }
fi
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
cp vn.aiilab.aiigrow.daemon.plist vn.aiilab.aiigrow.tray.plist go-cai.sh "$APP/Contents/Resources/"
chmod 755 "$APP/Contents/Resources/go-cai.sh"   # daemon tự chạy khi nhận lệnh gỡ từ xa
plutil -lint "$APP/Contents/Info.plist" vn.aiilab.aiigrow.*.plist >/dev/null

# Ký: KY_APP="Developer ID Application: …" (+ KY_PKG="Developer ID Installer: …") ⇒ ký thật, hardened runtime + timestamp (đủ để notarize);
# không đặt ⇒ ký ad-hoc (chỉ dùng thử, Gatekeeper chặn). Notarize: NOTARY=1 (khoá ASC ở ~/.goblinrun-asc.env).
if [ -n "${KY_APP:-}" ]; then
  codesign --force --options runtime --timestamp -s "$KY_APP" --identifier vn.aiilab.aiigrow "$APP/Contents/MacOS/aiigrow-daemon"
  codesign --force --options runtime --timestamp -s "$KY_APP" "$APP"
  codesign --verify --strict --deep "$APP"
else
  codesign --force --deep -s - --identifier vn.aiilab.aiigrow "$APP/Contents/MacOS/aiigrow-daemon"
  codesign --force --deep -s - --identifier vn.aiilab.aiigrow "$APP"
fi

mkdir -p "$TMP/scripts"
cp scripts/preinstall scripts/postinstall "$TMP/scripts/"
chmod 755 "$TMP/scripts/"*

# App KHÔNG được «relocatable»: có bản AiiGrow.app ở chỗ khác (cùng bundle id) thì Installer sẽ cài đè vào đó, còn plist/postinstall trỏ /Applications.
pkgbuild --analyze --root "$TMP/root" "$TMP/thanh-phan.plist" >/dev/null
/usr/libexec/PlistBuddy -c "Set :0:BundleIsRelocatable false" "$TMP/thanh-phan.plist"
pkgbuild --root "$TMP/root" --component-plist "$TMP/thanh-phan.plist" --identifier vn.aiilab.aiigrow.pkg --version "$BAN" \
  --install-location / --scripts "$TMP/scripts" --ownership recommended \
  "$TMP/aiigrow-thanh-phan.pkg"

mkdir -p "$TMP/res"; cp chao.html dieu-khoan.html "$TMP/res/"
sed "s/@BAN@/$BAN/g" distribution.xml.in > "$TMP/distribution.xml"
productbuild --distribution "$TMP/distribution.xml" --resources "$TMP/res" \
  --package-path "$TMP" ${KY_PKG:+--sign "$KY_PKG" --timestamp} "$RA/AiiGrow-$BAN.pkg"
if [ "${NOTARY:-}" = 1 ]; then
  set -a; . "$HOME/.goblinrun-asc.env"; set +a
  xcrun notarytool submit "$RA/AiiGrow-$BAN.pkg" --key "$HOME/.appstoreconnect/private_keys/AuthKey_$ASC_KEY_ID.p8" \
    --key-id "$ASC_KEY_ID" --issuer "$ASC_ISSUER_ID" --wait
  xcrun stapler staple "$RA/AiiGrow-$BAN.pkg"
  spctl -a -vv -t install "$RA/AiiGrow-$BAN.pkg"
fi
rm -rf "$TMP"
echo "Xong: $RA/AiiGrow-$BAN.pkg"
