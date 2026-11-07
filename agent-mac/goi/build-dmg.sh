#!/bin/bash
# Bọc gói cài vào AiiGrow-<BAN>.dmg cho trang tải (thiết kế con-cai-mac màn 01–02, 06/11): Ba Mẹ mở .dmg → bấm đúp «AiiGrow.pkg»
# (Tiếp tục → Cài đặt → mật khẩu Mac) → AiiGrow mở cửa sổ Ghép máy. GIỮ .pkg (daemon root + tự cập nhật chỉ nhận .pkg ký Developer ID
# Installer — README mục Tự cập nhật); .dmg chỉ là vỏ tải về cho quen tay Mac, kèm lối tắt Applications để Ba Mẹ thấy app nằm đâu.
# Chỉ build, KHÔNG cài, không mount.
#   Thử:      THU=1 BAN=0.1.10 ./build-dmg.sh            (cần ra/AiiGrow-0.1.10.pkg — chạy build-pkg.sh trước)
#   Phát hành: BAN=0.1.10 KY_APP="Developer ID Application: TAN THANH TRAN (ADUL7HT969)" NOTARY=1 ./build-dmg.sh
set -euo pipefail
GOI="$(cd "$(dirname "$0")" && pwd)"; MAC="$(dirname "$GOI")"; RA="$MAC/ra"
: "${BAN:?đặt BAN=<bản>, vd BAN=0.1.10}"
PKG="$RA/AiiGrow-$BAN.pkg"
[ -f "$PKG" ] || { echo "Chưa có $PKG — chạy build-pkg.sh trước." >&2; exit 1; }
if [ "${NOTARY:-}" != 1 ] && [ "${THU:-}" != 1 ]; then
  echo ".dmg phát hành phải ký + notarize: KY_APP=… NOTARY=1 $0. Chỉ build thử: THU=1 $0" >&2; exit 1
fi
if [ "${NOTARY:-}" = 1 ] && [ -z "${KY_APP:-}" ]; then echo "NOTARY=1 cần KY_APP (Developer ID Application)" >&2; exit 1; fi
TMP="$(mktemp -d "${TMPDIR:-/tmp}/aiigrow-dmg.XXXXXX")"; trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/AiiGrow"
cp "$PKG" "$TMP/AiiGrow/AiiGrow.pkg"            # tên trong .dmg đúng chữ màn 01 «Bấm đúp AiiGrow.pkg»
ln -s /Applications "$TMP/AiiGrow/Applications"
cat > "$TMP/AiiGrow/Cách cài.txt" <<'TXT'
Cài AiiGrow lên Mac của con

1. Bấm đúp AiiGrow.pkg
2. Bấm «Tiếp tục», rồi «Cài đặt»
3. Ba Mẹ tự gõ mật khẩu Mac (AiiGrow không xem, không lưu)
4. Cài xong, AiiGrow mở cửa sổ Ghép máy: gõ mã 6 số trong app AiiGrow của Ba Mẹ.

Mac hỏi «AiiGrow là ứng dụng tải từ Internet»: bấm «Mở».
Không thấy «Mở»? Cài đặt hệ thống › Quyền riêng tư & Bảo mật › bấm «Vẫn mở».
TXT
OUT="$RA/AiiGrow-$BAN.dmg"; rm -f "$OUT"
hdiutil create -volname "AiiGrow" -srcfolder "$TMP/AiiGrow" -fs HFS+ -format UDZO -ov "$OUT" >/dev/null
if [ -n "${KY_APP:-}" ]; then codesign --sign "$KY_APP" --timestamp "$OUT"; fi
if [ "${NOTARY:-}" = 1 ]; then
  set -a; . "$HOME/.goblinrun-asc.env"; set +a
  xcrun notarytool submit "$OUT" --key "$HOME/.appstoreconnect/private_keys/AuthKey_$ASC_KEY_ID.p8" \
    --key-id "$ASC_KEY_ID" --issuer "$ASC_ISSUER_ID" --wait
  xcrun stapler staple "$OUT"
  spctl -a -vv -t open --context context:primary-signature "$OUT"
fi
echo "Xong: $OUT"
