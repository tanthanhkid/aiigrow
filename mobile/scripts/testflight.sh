#!/bin/bash
# Build iOS app Expo này rồi đưa lên TestFlight, không mở Xcode (skill app-store-connect).
# Ký tay bằng cert "Apple Distribution" trong goblin-build.keychain + profile "<bundle> AppStore" do
# ~/.claude/skills/app-store-connect/scripts/bootstrap-distribution.sh <bundle> tạo. Khoá ASC: ~/.goblinrun-asc.env.
# Mỗi lần upload phải tăng ios.buildNumber trong app.json. Máy 16 GB: chỉ build một app một lúc.
#   ./scripts/testflight.sh              prebuild + archive + export + validate + upload
#   ./scripts/testflight.sh --khong-up   dừng sau validate
set -euo pipefail
GOC="$(cd "$(dirname "$0")/.." && pwd)"; cd "$GOC"
TEAM=ADUL7HT969
read -r TEN BUNDLE <<<"$(python3 -c "import json;e=json.load(open('app.json'))['expo'];print(e['name'],e['ios']['bundleIdentifier'])")"
RA="$GOC/build-ios"; ARCHIVE="$RA/$TEN.xcarchive"
buoc() { printf '\n==> %s\n' "$1"; }
dung() { printf '\nDỪNG: %s\n' "$1" >&2; exit 1; }
set -a; . "$HOME/.goblinrun-asc.env"; set +a
# Bản native gọi thẳng máy chủ prod (src/lib/api.ts mặc định localhost cho dev)
export EXPO_PUBLIC_API="${EXPO_PUBLIC_API:-https://aiigrow.aiilab.vn}"
: "${ASC_KEY_ID:?}"; : "${ASC_ISSUER_ID:?}"

buoc "prebuild $TEN ($BUNDLE)"
CI=1 npx expo prebuild --platform ios --clean >/dev/null
(cd ios && pod install >/dev/null)

buoc "mở keychain phân phối"
security unlock-keychain -p "${BUILD_KEYCHAIN_PASS:-goblin}" goblin-build.keychain || dung "chưa chạy bootstrap-distribution.sh"
grep -qal "<string>$BUNDLE AppStore</string>" "$HOME/Library/MobileDevice/Provisioning Profiles/"* 2>/dev/null \
  || dung "thiếu profile '$BUNDLE AppStore' — chạy bootstrap-distribution.sh $BUNDLE"

buoc "archive Release"
rm -rf "$RA"; mkdir -p "$RA"
WS=$(ls -d ios/*.xcworkspace | head -1); SCHEME=$(basename "$WS" .xcworkspace)
xcodebuild -workspace "$WS" -scheme "$SCHEME" -configuration Release -destination 'generic/platform=iOS' \
  -archivePath "$ARCHIVE" -jobs 4 archive \
  DEVELOPMENT_TEAM=$TEAM CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY="Apple Distribution" \
  PROVISIONING_PROFILE_SPECIFIER="$BUNDLE AppStore" OTHER_CODE_SIGN_FLAGS="--keychain goblin-build.keychain" > "$RA/archive.log" 2>&1 \
  || { grep -E "error:" "$RA/archive.log" | head -10; dung "archive lỗi — log $RA/archive.log"; }

buoc "export .ipa (ký tay)"
cat > "$RA/ExportOptions.plist" <<PL
<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>method</key><string>app-store-connect</string><key>teamID</key><string>$TEAM</string>
<key>destination</key><string>export</string><key>signingStyle</key><string>manual</string>
<key>signingCertificate</key><string>Apple Distribution</string>
<key>provisioningProfiles</key><dict><key>$BUNDLE</key><string>$BUNDLE AppStore</string></dict>
<key>manageAppVersionAndBuildNumber</key><false/></dict></plist>
PL
xcodebuild -exportArchive -archivePath "$ARCHIVE" -exportPath "$RA/export" -exportOptionsPlist "$RA/ExportOptions.plist" > "$RA/export.log" 2>&1 \
  || { tail -15 "$RA/export.log"; dung "export lỗi"; }
IPA=$(ls "$RA"/export/*.ipa | head -1)

buoc "validate $IPA"
xcrun altool --validate-app -f "$IPA" -t ios --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID" 2>&1 | tail -8
[ "${1:-}" = "--khong-up" ] && exit 0
buoc "upload TestFlight"
xcrun altool --upload-app -f "$IPA" -t ios --apiKey "$ASC_KEY_ID" --apiIssuer "$ASC_ISSUER_ID" 2>&1 | tail -8
echo "Xong. Theo dõi: python3 ~/.claude/skills/app-store-connect/scripts/asc.py GET /v1/builds --params 'sort=-uploadedDate' 'limit=3'"
