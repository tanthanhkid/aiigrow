#!/usr/bin/env bash
# Đưa máy chủ AiiGrow (server/, Next.js) lên VPS của Thanh — thay Vercel từ 06/11/2026 (team Hobby bị Vercel chặn mềm vì vượt fair-use CPU).
#   scripts/deploy-vps.sh             # dựng trên Mac (standalone) rồi rsync + pm2 reload trên VPS
#   scripts/deploy-vps.sh --chi-dung  # chỉ dựng, không đẩy
# KHÔNG dựng trên VPS (1 vCPU / 2 GB — next build từng OOM). Bản dựng: server/.next/standalone + .next/static + public.
# Trên VPS (ssh host VPS_HOST, mặc định trinity-crm):
#   /opt/aiigrow/releases/<sha>/   bản đã đẩy (giữ 3 bản gần nhất), /opt/aiigrow/current → bản đang chạy
#   /etc/aiigrow/aiigrow.env       biến môi trường (root, chmod 600; KHÔNG nằm trong git) — node --env-file đọc lúc khởi động
#   pm2 «aiigrow» (cổng 3320, 127.0.0.1) · nginx /etc/nginx/sites-enabled/aiigrow.conf · cron /etc/cron.d/aiigrow (thay crons của vercel.json)
# Muốn dựng lại bản cũ: git checkout <sha> rồi chạy script; hoặc trên VPS: ln -sfn releases/<sha> /opt/aiigrow/current && pm2 reload aiigrow.
set -euo pipefail
cd "$(dirname "$0")/.."
VPS="${VPS_HOST:-trinity-crm}"
CHI_DUNG=0; [ "${1:-}" = "--chi-dung" ] && CHI_DUNG=1
SHA="$(git rev-parse --short HEAD)"
[ -z "$(git status --porcelain -- server mobile)" ] || echo "CẢNH BÁO: server/ hoặc mobile/ có thay đổi chưa commit — bản dựng sẽ mang theo"

echo "== Dựng $SHA"
( cd server
  [ -d node_modules/next ] || { pnpm install --frozen-lockfile || true; rm -f pnpm-workspace.yaml; }   # pnpm 10 trả lỗi IGNORED_BUILDS dù cài xong
  [ -d ../mobile/node_modules ] || (cd ../mobile && npm ci)
  node scripts/build-app.mjs                                   # app Expo web ⇒ public/app (gọi pnpm build:app bị kiểm deps của pnpm chặn)
  rm -rf .next
  AIIGROW_STANDALONE=1 NEXT_TELEMETRY_DISABLED=1 ./node_modules/.bin/next build )
GOI=server/.next/standalone
[ -f "$GOI/server.js" ] || { echo "Không thấy $GOI/server.js — next.config.ts chưa bật output standalone?"; exit 1; }
cp -R server/.next/static "$GOI/.next/static"                   # standalone không tự chép .next/static và public/
rm -rf "$GOI/public"; cp -R server/public "$GOI/public"
echo "$SHA" > "$GOI/BAN"
du -sh "$GOI"
[ $CHI_DUNG = 1 ] && { echo "(chỉ dựng, không đẩy)"; exit 0; }

echo "== Đẩy lên $VPS:/opt/aiigrow/releases/$SHA"
SSH=(ssh -o ConnectTimeout=30 "$VPS")
"${SSH[@]}" "mkdir -p /opt/aiigrow/releases && test -f /etc/aiigrow/aiigrow.env" || { echo "Thiếu /etc/aiigrow/aiigrow.env trên VPS"; exit 1; }
# tar qua ssh (rsync của macOS là openrsync, lỗi cờ vẫn thoát 0 — memory macos-openrsync-nuot-rsync); tar giữ symlink node_modules/.pnpm
COPYFILE_DISABLE=1 tar czf - --no-xattrs --no-mac-metadata -C "$GOI" . | "${SSH[@]}" "rm -rf /opt/aiigrow/releases/$SHA && mkdir -p /opt/aiigrow/releases/$SHA && tar xzf - -C /opt/aiigrow/releases/$SHA"
"${SSH[@]}" "test -f /opt/aiigrow/releases/$SHA/server.js" || { echo "Đẩy lỗi: thiếu server.js trên VPS"; exit 1; }
"${SSH[@]}" bash -s "$SHA" <<'TREN_VPS'
set -euo pipefail
SHA=$1; cd /opt/aiigrow
ln -sfn "releases/$SHA" current
# delete + start (không reload): pm2 giữ đường thật của script lúc start ⇒ reload sẽ chạy lại bản cũ sau khi đổi symlink current
pm2 delete aiigrow >/dev/null 2>&1 || true
pm2 start "/opt/aiigrow/releases/$SHA/server.js" --name aiigrow --cwd "/opt/aiigrow/releases/$SHA" \
  --node-args="--env-file=/etc/aiigrow/aiigrow.env --max-old-space-size=384" --max-memory-restart 450M
pm2 save >/dev/null
# giữ 3 bản gần nhất (đĩa VPS nhỏ)
ls -1t releases | tail -n +4 | while read -r b; do [ "releases/$b" = "$(readlink current)" ] || rm -rf "releases/$b"; done
for i in $(seq 30); do curl -fsS -o /dev/null http://127.0.0.1:3320/api/m/cau-hinh-dang-nhap && break; sleep 1; done
curl -fsS http://127.0.0.1:3320/api/m/cau-hinh-dang-nhap; echo
TREN_VPS
echo "== Xong: https://aiigrow.aiilab.vn ($SHA)"
