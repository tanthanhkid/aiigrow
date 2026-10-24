#!/bin/bash
# In uid các phiên GUI cần tray AiiGrow — MỘT quy tắc chung cho preinstall, postinstall, job tự cập nhật (napLai) và go-cai.sh:
# người dùng console + chủ tiến trình loginwindow + chủ tiến trình AiiGrowTray (uid >= 500, mỗi uid một dòng).
{
  u=$(/usr/bin/stat -f %u /dev/console 2>/dev/null) && echo "$u"
  /bin/ps -axo uid=,comm= | /usr/bin/awk '/\/loginwindow$/ || /\/AiiGrowTray$/ {print $1}'
} | /usr/bin/awk '$1 ~ /^[0-9]+$/ && $1 >= 500' | /usr/bin/sort -un
