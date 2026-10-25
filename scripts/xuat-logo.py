#!/usr/bin/env python3
"""Xuất logo chuẩn AiiGrow «Rob tưới mầm» (mobile/assets/icon.png, Thanh chọn 23/10) ra mọi nền tảng.
Chạy từ gốc repo:  python3 scripts/xuat-logo.py   (cần Pillow; macOS có iconutil để đóng .icns).
Đổi logo = thay mobile/assets/icon.png (1024×1024, không alpha) rồi chạy lại — không sửa tay từng tệp."""
import os, subprocess, tempfile, statistics
from PIL import Image, ImageDraw, ImageFilter, ImageOps

os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
SRC = Image.open("mobile/assets/icon.png").convert("RGB")
assert SRC.size == (1024, 1024), "icon.png phải 1024×1024"
canh = [SRC.getpixel((x, y)) for x in range(0, 1024, 8) for y in (0, 1023)] + [SRC.getpixel((x, y)) for y in range(0, 1024, 8) for x in (0, 1023)]
NEN = tuple(int(statistics.mean(c[i] for c in canh)) for i in range(3))   # màu teal mép logo (#16776F)

def bo_goc(im, r):
    m = Image.new("L", im.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, im.width - 1, im.height - 1), r, fill=255)
    o = im.convert("RGBA"); o.putalpha(m); return o

def mo_mep(im, mep):
    """Alpha mờ dần ở mép (ô vuông teal của logo tan vào nền teal, không lộ đường viền ô vuông lồng ô vuông)."""
    w, h = im.size; m = Image.new("L", (w, h), 0); d = ImageDraw.Draw(m)
    for i in range(mep):
        d.rounded_rectangle((i, i, w - 1 - i, h - 1 - i), max(1, w // 5 - i), fill=int(255 * (i + 1) / mep))
    o = im.convert("RGBA"); o.putalpha(m); return o

def giua(ti, co=1024):
    """Logo co về `ti` khung, mép mờ, nằm giữa nền trong suốt."""
    c = Image.new("RGBA", (co, co), (0, 0, 0, 0)); n = int(co * ti)
    c.alpha_composite(mo_mep(SRC.resize((n, n), Image.LANCZOS), n // 8), ((co - n) // 2, (co - n) // 2)); return c

# Android adaptive: vùng an toàn là vòng 66/108 ⇒ logo co 0.58 (ăng-ten và chậu nằm trong vòng), nền = dải teal của logo
fg = giua(0.58)
nen = SRC.resize((64, 64)).filter(ImageFilter.GaussianBlur(6)).resize((1024, 1024), Image.BICUBIC)
fg.save("mobile/assets/adaptive-icon.png"); nen.save("mobile/assets/adaptive-icon-nen.png")
# Splash app Ba Mẹ: logo mép mờ trên nền NEN (app.json splash backgroundColor phải bằng màu này)
giua(0.86).save("mobile/assets/splash-icon.png")
for k, f in {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}.items():
    d = f"agent-android/app/src/main/res/mipmap-{k}"; os.makedirs(d, exist_ok=True); a = int(108 * f)
    fg.resize((a, a), Image.LANCZOS).save(f"{d}/ic_launcher_foreground.png")
    nen.resize((a, a), Image.LANCZOS).save(f"{d}/ic_launcher_background.png")
# iOS Con: AppIcon 1024 không alpha
SRC.save("agent-ios/TaiNguyen/Fluent.xcassets/AppIcon.appiconset/AppIcon-1024.png")
# Mac: khung macOS (824/1024 bo góc, lề + bóng nhẹ) → AppIcon.icns
mac = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
b = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0)); ImageDraw.Draw(b).rounded_rectangle((100, 112, 924, 936), 185, fill=(0, 0, 0, 90))
mac.alpha_composite(b.filter(ImageFilter.GaussianBlur(14))); mac.alpha_composite(bo_goc(SRC.resize((824, 824), Image.LANCZOS), 185), (100, 100))
with tempfile.TemporaryDirectory() as t:
    it = os.path.join(t, "AppIcon.iconset"); os.makedirs(it)
    for s in [16, 32, 128, 256, 512]:
        mac.resize((s, s), Image.LANCZOS).save(f"{it}/icon_{s}x{s}.png"); mac.resize((2 * s, 2 * s), Image.LANCZOS).save(f"{it}/icon_{s}x{s}@2x.png")
    subprocess.run(["iconutil", "-c", "icns", it, "-o", "agent-mac/goi/AppIcon.icns"], check=True)
# Windows: khay + exe + bộ cài = logo bo góc; mất kết nối = xám + chấm đỏ
CO = [(16, 16), (20, 20), (24, 24), (32, 32), (40, 40), (48, 48), (64, 64), (128, 128), (256, 256)]
bo_goc(SRC, 200).save("agent-win/src/AiiGrow.Tray/Assets/aiigrow-khay.ico", sizes=CO)
g = bo_goc(ImageOps.grayscale(SRC).convert("RGB"), 200)
ImageDraw.Draw(g).ellipse((600, 600, 1000, 1000), fill=(220, 38, 38, 255), outline=(255, 255, 255, 255), width=40)
g.save("agent-win/src/AiiGrow.Tray/Assets/aiigrow-khay-mat-ket-noi.ico", sizes=CO)
# Web
SRC.resize((512, 512), Image.LANCZOS).save("server/public/logo.png")
SRC.resize((180, 180), Image.LANCZOS).save("server/public/apple-touch-icon.png")
for p in ("server/public/favicon.png", "mobile/assets/favicon.png"): SRC.resize((64, 64), Image.LANCZOS).save(p)
SRC.save("server/public/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])
print("Đã xuất logo · màu nền splash/adaptive = #%02X%02X%02X" % NEN)
