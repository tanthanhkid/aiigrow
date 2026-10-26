# thanh.py <ảnh thật> <ra.png> [cao_pt=50] — tách thanh trạng thái iOS khỏi nền thành PNG trong suốt (giữ đúng pixel chữ/biểu tượng)
import sys, numpy as np
from PIL import Image
src, ra = sys.argv[1], sys.argv[2]
cao = float(sys.argv[3]) if len(sys.argv) > 3 else 50
im = Image.open(src).convert('RGB'); W = im.width; s = W / 375
h = round(cao * s)
a = np.asarray(im.crop((0, 0, W, h))).astype(np.float32)
# nền: trung vị theo từng hàng của cột giữa trống (x 40%–60%)
nen = np.median(a[:, int(W*.4):int(W*.6)], axis=1, keepdims=True)
d = np.abs(a - nen).max(axis=2)
alpha = np.clip(d / 90.0, 0, 1)
alpha[d < 6] = 0
mau = np.where(alpha[..., None] > 0, nen + (a - nen) / np.maximum(alpha[..., None], 1e-3), 0)
o = np.dstack([np.clip(mau, 0, 255), alpha * 255]).astype(np.uint8)
Image.fromarray(o, 'RGBA').save(ra, optimize=True)
