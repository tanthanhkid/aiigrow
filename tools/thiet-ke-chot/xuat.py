#!/usr/bin/env python3
"""Xuất bản thiết kế ĐÃ CHỐT trên bàn aiigrow-figma (bản sao lưu repo aiigrow-thiet-ke) ra docs/thiet-ke-chot/.
Chạy: python3 tools/thiet-ke-chot/xuat.py <thư mục aiigrow-thiet-ke/brainstorm-ui> <thư mục ra>"""
import json, os, re, sys, glob, html
src, out = sys.argv[1], sys.argv[2]
pb = os.path.join(src, 'phien-ban')
them = json.load(open(os.path.join(pb, 'man-them.json')))
# tên màn gốc từ mã bàn (bm-*.js, con-*.js)
ten_goc = {}
here = os.path.dirname(os.path.abspath(__file__))
for f in glob.glob(os.path.join(here, '..', 'brainstorm-ui', 'web', 'hanh-trinh', '*.js')) + glob.glob(os.path.join(here, '..', 'brainstorm-ui', 'web', 'hanh-trinh', 'that', '*.js')):
    s = open(f, encoding='utf-8').read()
    for m in re.finditer(r"key:\s*'([^']+)'[^\n]{0,200}?(?:ten|nhan|tieuDe):\s*'([^']+)'", s):
        ten_goc.setdefault(m.group(1), m.group(2))
TEN_HT = {'bm-lan-dau': 'Ba Mẹ · Lần đầu dùng', 'bm-ghep-may': 'Ba Mẹ · Ghép thêm máy', 'bm-hang-ngay': 'Ba Mẹ · Hằng ngày',
          'bm-duyet': 'Ba Mẹ · Duyệt', 'bm-ung-dung': 'Ba Mẹ · Ứng dụng & web', 'bm-cai-dat': 'Ba Mẹ · Cài đặt & hỗ trợ',
          'con-cai-win': 'Con Windows · Bộ cài', 'con-ngay-thuong': 'Con Windows · Ngày thường', 'con-xin': 'Con Windows · Xin thêm giờ / xin mở',
          'con-bi-chan': 'Con Windows · Bị chặn', 'con-het-gio': 'Con Windows · Hết giờ / khoá', 'con-mat-mang': 'Con Windows · Mất mạng / sự cố',
          'con-cai-mac': 'Con Mac (giữ nguyên)'}
os.makedirs(out, exist_ok=True)
idx = ['# Thiết kế đã chốt — xuất từ aiigrow-figma', '',
       'Nguồn: bàn https://aiigrow-figma.aiilab.vn (Nghi chốt 03–04/11/2026), bản sao lưu `tanthanhkid/aiigrow-thiet-ke` brainstorm-ui.',
       'Mỗi màn = HTML phiên bản hiện hành. `data-toi="<key>"` trên nút = màn đích khi bấm. Mở file .html trong trình duyệt để xem.', '']
tong = 0
for ht, ds in them['thuTu'].items():
    d = os.path.join(out, ht); os.makedirs(d, exist_ok=True)
    idx += [f'## {TEN_HT.get(ht, ht)} (`{ht}`)', '', '| # | key | tên | kích thước | ý đồ thiết kế (ghi chú của lần thay cuối) |', '|---|---|---|---|---|']
    n = 0
    for k in ds:
        mf = os.path.join(pb, k, 'manifest.json')
        if not os.path.exists(mf): continue
        m = json.load(open(mf))
        if m.get('xoa'): continue
        cur = next((x for x in m['ds'] if x['v'] == m['hien']), m['ds'][-1])
        tep = os.path.join(pb, k, f"v{cur['tep']}.html")
        if not os.path.exists(tep): continue
        n += 1
        ten = (them['man'].get(k) or {}).get('ten') or ten_goc.get(k) or cur.get('nhan', '')
        fn = f'{n:02d}-{k}.html'
        body = open(tep, encoding='utf-8').read()
        # bọc tối thiểu để mở trực tiếp được
        if '<html' not in body[:500].lower():
            body = f'<!doctype html><meta charset="utf-8"><title>{html.escape(ten)}</title><meta name="viewport" content="width={cur.get("w")}"><body style="margin:0;width:{cur.get("w")}px;min-height:{cur.get("h")}px">' + body
        open(os.path.join(d, fn), 'w', encoding='utf-8').write(body)
        yt = next((x.get('yTuong') for x in reversed(m['ds']) if x['v'] <= m['hien'] and (x.get('yTuong') or '').strip() and not x['yTuong'].startswith('✎')), '')
        y = ' '.join((yt or '').split()).replace('|', '/')[:500]
        idx.append(f'| {n} | [`{k}`]({ht}/{fn}) | {ten.replace("|","/")} | {cur.get("w")}×{cur.get("h")} | {y} |')
        tong += 1
    idx.append('')
idx.insert(4, f'Tổng {tong} màn, {len(them["thuTu"])} hành trình.\n')
open(os.path.join(out, 'INDEX.md'), 'w', encoding='utf-8').write('\n'.join(idx))
print('xong', tong)
