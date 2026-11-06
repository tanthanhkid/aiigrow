#!/usr/bin/env bash
# Đưa máy chủ AiiGrow (server/, Next.js) lên VPS của Thanh — thay Vercel từ 06/11/2026 (team Hobby bị Vercel chặn mềm vì vượt fair-use CPU).
#   scripts/deploy-vps.sh             # dựng trên Mac (standalone) rồi đẩy tar qua ssh + pm2 chạy bản mới (kiểm sức khoẻ, hỏng thì tự quay lại bản cũ)
#   scripts/deploy-vps.sh --chi-dung  # chỉ dựng, không đẩy
#   scripts/deploy-vps.sh --ep        # cho đẩy cả khi cây bẩn / HEAD khác origin/main (sửa gấp — Thanh bảo)
# Trước khi đẩy một lô: scripts/deploy-prod.sh --chi-kiem trên bản sạch origin/main (cổng kiểm localhost).
# KHÔNG dựng trên VPS (1 vCPU / 2 GB — next build từng OOM). Bản dựng: server/.next/standalone + .next/static + public.
# Trên VPS (ssh host VPS_HOST, mặc định trinity-crm):
#   /opt/aiigrow/releases/<sha>-<giờ>/   bản đã đẩy (giữ 3 bản gần nhất), /opt/aiigrow/current → bản đang chạy
#   /etc/aiigrow/aiigrow.env       biến môi trường (root, chmod 600; KHÔNG nằm trong git) — node --env-file đọc lúc khởi động
#   pm2 «aiigrow» (cổng 3320, 127.0.0.1) · nginx /etc/nginx/sites-enabled/aiigrow.conf · cron /etc/cron.d/aiigrow (thay crons của vercel.json)
#   CSDL: Postgres 16 cục bộ (127.0.0.1:5432, db/role aiigrow; thay Neon us-east-1 từ 06/11 — mỗi câu SQL ~250 ms từ VN làm API 5–12 s)
#   sao lưu 02:30 /var/backups/aiigrow (scripts/vps/aiigrow-sao-luu) · logrotate scripts/vps/aiigrow.logrotate · tệp mẫu: scripts/vps/
# Quay lại bản cũ trên VPS (pm2 reload KHÔNG đổi bản — pm2 giữ đường thật của server.js):
#   B=/opt/aiigrow/releases/<bản>; ln -sfn "$B" /opt/aiigrow/current; pm2 delete aiigrow; PORT=3320 HOSTNAME=127.0.0.1 pm2 start "$B/server.js" \
#     --name aiigrow --cwd "$B" --node-args="--env-file=/etc/aiigrow/aiigrow.env --max-old-space-size=384" --max-memory-restart 450M; pm2 save
set -euo pipefail
cd "$(dirname "$0")/.."
VPS="${VPS_HOST:-trinity-crm}"
CHI_DUNG=0; EP=0
for a in "$@"; do case "$a" in --chi-dung) CHI_DUNG=1;; --ep) EP=1;; *) echo "Cờ lạ: $a"; exit 2;; esac; done
SHA="$(git rev-parse --short HEAD)"
if [ $CHI_DUNG = 0 ] && [ $EP = 0 ]; then
  git fetch -q origin
  [ -z "$(git status --porcelain -- server mobile)" ] || { echo "server/ hoặc mobile/ có thay đổi chưa commit — commit/stash trước (hoặc --ep)"; exit 1; }
  [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || { echo "HEAD khác origin/main — git checkout --detach origin/main (hoặc --ep)"; exit 1; }
fi

echo "== Dựng $SHA"
( cd server
  # pnpm 10 trả mã lỗi IGNORED_BUILDS (@sentry/cli) dù cài xong ⇒ chỉ bỏ qua đúng lỗi đó (cùng luật với deploy-prod.sh)
  o="$(pnpm install --frozen-lockfile 2>&1)" || { grep -oE 'ERR_PNPM_[A-Z_]+' <<<"$o" | grep -vq '^ERR_PNPM_IGNORED_BUILDS$' && { tail -20 <<<"$o"; exit 1; }; }
  rm -f pnpm-workspace.yaml; [ -d node_modules/next ] || { echo "pnpm install lỗi"; exit 1; }
  [ -d ../mobile/node_modules ] || (cd ../mobile && npm ci)
  # Bản web Expo lấy client OAuth từ mobile/.env.local (gitignore) — thiếu thì nút Google/Facebook biến mất lặng lẽ
  for k in EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID EXPO_PUBLIC_FACEBOOK_APP_ID; do grep -q "^$k=." ../mobile/.env.local 2>/dev/null || { echo "Thiếu $k trong mobile/.env.local (chép từ ~/OFFLINE_FILES/Code/aiigrow/mobile/.env.local)"; exit 1; }; done
  node scripts/build-app.mjs                                   # app Expo web ⇒ public/app (gọi pnpm build:app bị kiểm deps của pnpm chặn)
  rm -rf .next
  AIIGROW_STANDALONE=1 NEXT_TELEMETRY_DISABLED=1 ./node_modules/.bin/next build )
GOI=server/.next/standalone
[ -f "$GOI/server.js" ] || { echo "Không thấy $GOI/server.js — next.config.ts chưa bật output standalone?"; exit 1; }
cp -R server/.next/static "$GOI/.next/static"                   # standalone không tự chép .next/static và public/
# public/ chỉ lấy tệp có trong git + bản web Expo vừa dựng (public/app) — không mang tệp lạ trên máy (gói cài .exe/.pkg/.apk…) lên VPS đĩa nhỏ
rm -rf "$GOI/public"; mkdir -p "$GOI/public"
git ls-files server/public | sed "s|^server/public/||" | COPYFILE_DISABLE=1 tar cf - -C server/public -T - | tar xf - -C "$GOI/public"
cp -R server/public/app "$GOI/public/app"
# sharp (tối ưu ảnh) bị trace bản darwin — app không dùng next/image; bỏ để không mang nhị phân macOS sang Linux
rm -rf "$GOI"/node_modules/.pnpm/@img+sharp-*darwin*
echo "$SHA" > "$GOI/BAN"
du -sh "$GOI"
[ $CHI_DUNG = 1 ] && { echo "(chỉ dựng, không đẩy)"; exit 0; }

BAN="$SHA-$(date +%Y%m%d%H%M%S)"   # tên bản luôn mới ⇒ không bao giờ ghi đè thư mục đang chạy
echo "== Đẩy lên $VPS:/opt/aiigrow/releases/$BAN"
# một kết nối dùng chung (ControlMaster): sshd VPS chặn khi mở nhiều kết nối liền nhau
SSH=(ssh -o ConnectTimeout=30 -o ControlMaster=auto -o "ControlPath=$HOME/.ssh/cm-%r@%h:%p" -o ControlPersist=10m "$VPS")
# 755: nginx (www-data) đọc thẳng tệp tĩnh /_expo, /assets, /_next/static từ current/ (scripts/vps/aiigrow.nginx.conf)
"${SSH[@]}" "mkdir -p /opt/aiigrow/releases && chmod 755 /opt/aiigrow /opt/aiigrow/releases && test -f /etc/aiigrow/aiigrow.env" || { echo "Thiếu /etc/aiigrow/aiigrow.env trên VPS"; exit 1; }
# tar qua ssh (rsync của macOS là openrsync, lỗi cờ vẫn thoát 0 — memory macos-openrsync-nuot-rsync); tar giữ symlink node_modules/.pnpm
COPYFILE_DISABLE=1 tar czf - --no-xattrs --no-mac-metadata -C "$GOI" . | "${SSH[@]}" "mkdir /opt/aiigrow/releases/$BAN.tam && tar xzf - -C /opt/aiigrow/releases/$BAN.tam && mv /opt/aiigrow/releases/$BAN.tam /opt/aiigrow/releases/$BAN"
"${SSH[@]}" "test -f /opt/aiigrow/releases/$BAN/server.js" || { echo "Đẩy lỗi: thiếu server.js trên VPS"; exit 1; }
"${SSH[@]}" bash -s "$BAN" <<'TREN_VPS'
set -uo pipefail
BAN=$1; cd /opt/aiigrow
CU="$(readlink current || true)"   # bản đang chạy (để quay lại nếu bản mới hỏng)
chay() {   # chay <thư mục bản>: delete + start (pm2 reload không đổi được bản, xem đầu tệp). PORT/HOSTNAME đặt ở đây ⇒ luôn chỉ nghe 127.0.0.1:3320
  pm2 delete aiigrow >/dev/null 2>&1 || true
  AIIGROW_BAN="$(basename "$1" | cut -d- -f1)" PORT=3320 HOSTNAME=127.0.0.1 pm2 start "$1/server.js" --name aiigrow --cwd "$1" \
    --node-args="--env-file=/etc/aiigrow/aiigrow.env --max-old-space-size=384" --max-memory-restart 450M >/dev/null
}
# /api/suc-khoe chạy `select 1` ⇒ bản thiếu/sai DATABASE_URL không qua được cổng
khoe() { for i in $(seq 30); do curl -fsS -o /dev/null http://127.0.0.1:3320/api/suc-khoe && return 0; sleep 1; done; return 1; }
chay "/opt/aiigrow/releases/$BAN"
if ! khoe; then
  echo "Bản mới KHÔNG lên (log dưới) — quay lại ${CU:-<không có bản cũ>}"; pm2 logs aiigrow --lines 30 --nostream 2>&1 | tail -30
  if [ -n "$CU" ]; then chay "$CU"; khoe && pm2 save >/dev/null; else pm2 delete aiigrow >/dev/null 2>&1 || true; fi
  rm -rf "releases/$BAN"; exit 1
fi
ln -sfn "/opt/aiigrow/releases/$BAN" current
pm2 save >/dev/null
# giữ 3 bản gần nhất (đĩa VPS nhỏ); không xoá bản đang chạy
ls -1t releases | tail -n +4 | while read -r b; do [ "/opt/aiigrow/releases/$b" = "$(readlink current)" ] || rm -rf "releases/$b"; done
curl -fsS http://127.0.0.1:3320/api/m/cau-hinh-dang-nhap; echo; curl -fsS http://127.0.0.1:3320/api/suc-khoe; echo
TREN_VPS
echo "== Xong: https://aiigrow.aiilab.vn ($BAN)"
