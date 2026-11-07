#!/usr/bin/env python3
"""Gửi MỘT yêu cầu JSON tới socket daemon (/var/run/aiigrow.sock) như tray: một dòng vào, một dòng ra. In JSON trả lời. (Harness e2e, không phải mã sản phẩm.)"""
import json, socket, sys
yc = sys.argv[1]
s = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
s.settimeout(float(sys.argv[2]) if len(sys.argv) > 2 else 20)
s.connect("/var/run/aiigrow.sock")
s.sendall(yc.encode() + b"\n")
buf = b""
while True:
    d = s.recv(65536)
    if not d: break
    buf += d
    if b"\n" in buf: break
print(buf.decode().strip())
