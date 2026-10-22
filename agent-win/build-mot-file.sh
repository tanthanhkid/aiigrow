#!/usr/bin/env bash
# Dựng bộ cài MỘT FILE AiiGrow-Setup.exe (Windows x64, tự chứa .NET — máy Con không cần cài gì thêm).
# Chạy được trên Mac/Linux/Windows có .NET 8 SDK:  agent-win/build-mot-file.sh [thư mục ra]   (mặc định agent-win/ra)
# 1) Service + Tray: publish một tệp, tự chứa, nén  →  ra/goi/
# 2) Setup: publish một tệp, tự chứa, nén, nhúng hai exe trên làm tài nguyên (-p:GoiDir)  →  ra/AiiGrow-Setup.exe
set -euo pipefail
cd "$(dirname "$0")"
RA="${1:-ra}"; RA="$(mkdir -p "$RA" && cd "$RA" && pwd)"
CHUNG=(-c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:EnableCompressionInSingleFile=true
       -p:IncludeNativeLibrariesForSelfExtract=true -p:EnableWindowsTargeting=true -p:DebugType=none)
rm -rf "${RA:?}/goi" "${RA:?}/setup"
# Sentry: DSN project aiigrow-agent lấy từ biến môi trường (Keychain «AiiGrow Sentry DSN agent») — không ghi vào repo
dotnet publish src/AiiGrow.Service "${CHUNG[@]}" -p:SentryDsn="${AIIGROW_SENTRY_DSN:-}" -o "$RA/goi"
dotnet publish src/AiiGrow.Tray "${CHUNG[@]}" -o "$RA/goi"
dotnet publish src/AiiGrow.Setup "${CHUNG[@]}" -p:GoiDir="$RA/goi" -o "$RA/setup"
cp "$RA/setup/AiiGrow.Setup.exe" "$RA/AiiGrow-Setup.exe"
ls -l "$RA/AiiGrow-Setup.exe"
shasum -a 256 "$RA/AiiGrow-Setup.exe"
