#!/usr/bin/env bash
# Phát hành APK app Ba Mẹ (Android) từ commit hiện tại — một lệnh.
#   bash mobile/scripts/phat-hanh-apk.sh          build + đăng
#   bash mobile/scripts/phat-hanh-apk.sh --thu    chỉ build + kiểm, không đăng
# Đăng lên tanthanhkid/aiigrow-tai: release riêng android-<versionName>-<versionCode> (prerelease)
# và release cuộn android-moi-nhat (asset AiiGrow-android.apk) — link /tai/aiigrow.apk trỏ vào đó.
# Ký bằng debug.keystore của template Expo (giống bản 0.1.0) để cài đè được; KHÔNG tạo keystore mới.
set -euo pipefail

THU=0; [ "${1:-}" = "--thu" ] && THU=1
REPO_TAI="tanthanhkid/aiigrow-tai"
API="https://aiigrow.aiilab.vn"
export JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
export ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
BT="$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)"

M="$(cd "$(dirname "$0")/.." && pwd)"
cd "$M"
SHA="$(git rev-parse --short HEAD)"
CODE="$(git rev-list --count HEAD)"
VER="$(node -p "require('./package.json').version")"
VNAME="$VER+$SHA"
TAG="android-$VER-$SHA-$CODE"
echo "== $VNAME (versionCode $CODE), tag $TAG"
[ -z "$(git status --porcelain -- . ':!android')" ] || echo "!! cảnh báo: mobile/ có thay đổi chưa commit — bản build không khớp commit $SHA"

echo "load: $(uptime | sed 's/.*load averages*: //')"

# 1. prebuild sạch + chỉnh phiên bản
EXPO_PUBLIC_API="$API" npx expo prebuild --platform android --clean --no-install
G=android/app/build.gradle
sed -i '' -E "s/versionCode [0-9]+/versionCode $CODE/; s/versionName \"[^\"]*\"/versionName \"$VNAME\"/" "$G"
grep -nE "versionCode|versionName" "$G"

# 2. build release arm64
(cd android && EXPO_PUBLIC_API="$API" ./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a --no-daemon -q)
APK="$M/android/app/build/outputs/apk/release/app-release.apk"
[ -f "$APK" ] || { echo "không thấy $APK"; exit 1; }

# 3. kiểm phiên bản + chữ ký trùng bản 0.1.0
"$BT/aapt" dump badging "$APK" | grep -E "^package:"
CERT_MOI="$("$BT/apksigner" verify --print-certs "$APK" | grep "SHA-256 digest" | head -1)"
D="$(mktemp -d)"
gh release download android-0.1.0 -R "$REPO_TAI" -p '*.apk' -D "$D"
CERT_CU="$("$BT/apksigner" verify --print-certs "$D"/*.apk | grep "SHA-256 digest" | head -1)"
rm -rf "${D:?}"
echo "chứng chỉ mới: $CERT_MOI"; echo "chứng chỉ 0.1.0: $CERT_CU"
[ "$CERT_MOI" = "$CERT_CU" ] || { echo "CHỮ KÝ KHÁC bản 0.1.0 — dừng, bản mới sẽ không cài đè được"; exit 1; }

OUT="$(mktemp -d)"
cp "$APK" "$OUT/AiiGrow-android.apk"
SUM="$(shasum -a 256 "$OUT/AiiGrow-android.apk" | cut -d' ' -f1)"
echo "sha256 $SUM"
if [ "$THU" = 1 ]; then echo "--thu: bản ở $OUT/AiiGrow-android.apk (không đăng)"; exit 0; fi

# 4. đăng
NGAY="$(date '+%d/%m/%Y %H:%M')"
NOTE="App Ba Mẹ cho Android, bản $VNAME (versionCode $CODE), commit $SHA, build $NGAY. sha256 $SUM. Cài đè bản cũ được, không cần gỡ."
gh release create "$TAG" "$OUT/AiiGrow-android.apk#AiiGrow-android-$VER-$SHA.apk" -R "$REPO_TAI" \
  --prerelease --latest=false --title "AiiGrow Android $VNAME" --notes "$NOTE"
if gh release view android-moi-nhat -R "$REPO_TAI" >/dev/null 2>&1; then
  gh release edit android-moi-nhat -R "$REPO_TAI" --prerelease --latest=false --title "AiiGrow Android (mới nhất): $VNAME" --notes "$NOTE"
else
  gh release create android-moi-nhat -R "$REPO_TAI" --prerelease --latest=false --title "AiiGrow Android (mới nhất): $VNAME" --notes "$NOTE"
fi
gh release upload android-moi-nhat "$OUT/AiiGrow-android.apk" -R "$REPO_TAI" --clobber
rm -rf "${OUT:?}"
echo "== xong: https://github.com/$REPO_TAI/releases/download/android-moi-nhat/AiiGrow-android.apk"
