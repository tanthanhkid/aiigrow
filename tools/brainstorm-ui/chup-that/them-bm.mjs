// ---------------------------------------------------------------- CHỤP DOM màn Ba Mẹ cho bàn brainstorm
{
  console.log("bắt đầu chụp"); const { chayChup } = await import(process.env.CHUP_CHUNG);
  const { statSync: st } = await import("node:fs");
  const REF = process.env.REF_DIR;
  const gioAnh = (f) => { try { return st(`${REF}/${f}`).mtime; } catch { return null; } };
  const MOI = { "sau-bm-trang.png": "hieu-nang-2/sau/1-trang-chu.png", "sau-bm-cho-duyet.png": "hieu-nang-2/sau/3-cho-duyet.png",
    "sau-bm-nhiem-vu-qua.png": "hieu-nang-2/sau/4-diem-qua.png", "sau-bm-gia-dinh.png": "hieu-nang-2/sau/5-gia-dinh.png", "sau-bm-bao-cao.png": "hieu-nang-2/sau/6-bao-cao.png",
    "sau-bm-man-hinh.png": "hieu-nang-2/sau/7-man-hinh.png", "sau-bm-may-ds.png": "hieu-nang-2/sau/8-ds-may.png", "sau-bm-may-m1.png": "hieu-nang-2/sau/9-may.png" };
  const M = (key, ref0, duong, cho, tc = {}) => { const ref = MOI[ref0] ?? ref0; const moi = !!MOI[ref0];
    return { key, ref, duong, cho, nhom: moi ? "B" : "A", refPath: ref ? `${REF}/${ref}` : null,
      gio: moi ? new Date("2026-10-25T10:00:00+07:00") : ref ? gioAnh(ref) : null, ...tc }; };
  // UIKit bẻ từ dài (tên miền) theo ký tự khi không vừa dòng; Chrome bẻ ở dấu chấm ⇒ bọc tên miền khối inline + break-all
  const BE_TU = `(() => { const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT); let n; const ds = [];
    while ((n = w.nextNode())) if (n.textContent.includes('scratch.')) ds.push(n);
    for (const t of ds) { const i = t.textContent.indexOf('scratch.'); const sau = t.splitText(i); const m = sau.textContent.match(/^[a-z.\\u200b]+/);
      if (m) sau.splitText(m[0].length); sau.textContent = sau.textContent.replace(/\\u200b/g, '');
      const sp = document.createElement('span'); sp.style.cssText = 'display:inline-block;word-break:break-all;max-width:100%'; sau.replaceWith(sp); sp.appendChild(sau); } return ds.length; })()`;
  const ds = [
    M("bm1-chao", "sau-bm-chao.png", "/chao", "Bắt đầu bằng số điện thoại", { token: null }),
    M("bm1-dang-ky", "sau-bm-dang-ky.png", "/dang-ky", "Số điện thoại của Ba Mẹ", { token: null }),
    M("bm1-otp", "sau-bm-otp.png", "/otp", "Nhập mã 6 số", { truoc: dangKyToiOtp }),
    M("bm1-ob-ten-con", "sau-bm-ob-ten-con.png", "/thiet-lap/ten-con", "Con tên gì?"),
    M("bm1-ob-may", "sau-bm-ob-may.png", "/thiet-lap/may", "dùng máy nào?"),
    M("bm1-ob-ghep", "sau-bm-ob-ghep.png", "/thiet-lap/ghep", "Tạo mã mới"),
    M("bm1-ob-mau", "sau-bm-ob-mau.png", "/thiet-lap/mau", "Dùng mẫu này"),
    M("bm1-ob-gio", "sau-bm-ob-gio.png", "/thiet-lap/gio", "Trần giải trí mỗi ngày"),
    M("bm1-ob-xong", "sau-bm-ob-xong.png", "/thiet-lap/xong", "Xong rồi!"),
    M("bm1-dang-nhap", "sau-bm-dang-nhap.png", "/dang-nhap", "Chào Ba Mẹ quay lại", { token: null }),
    M("bm1-moi", "sau-bm-moi.png", "/moi?ma=ABCD2345", "Nhận lời mời bằng tài khoản này"),
    M("bm1-may-ds", "sau-bm-may-ds.png", "/may?con=c1", "Máy của"),
    M("bm1-may-chon-loai", "sau-bm-ob-may.png", "/thiet-lap/may", "dùng máy nào?"),
    M("bm1-may-ghep", "sau-bm-ob-ghep.png", "/thiet-lap/ghep", "Tạo mã mới"),
    M("bm1-may-moi", "sau-bm-may-m1.png", "/may/m1", "Đổi tên máy"),
    M("bm2-trang-chu", "sau-bm-trang.png", "/hom-nay", "việc chờ Ba Mẹ"),
    M("bm2-may-ds", "sau-bm-may-ds.png", "/may?con=c1", "Máy của"),
    M("bm2-may-m1", "sau-bm-may-m1.png", "/may/m1", "Đổi tên máy"),
    M("bm2-may-m2", "sau-bm-may-m2.png", "/may/m2", "CÁCH SỬA"),
    M("bm2-gio", "sau-bm-gio.png", "/gio/c1", "Trần mỗi ngày"),
    M("bm2-ho-so", "sau-bm-ho-so-con.png", "/ho-so/c1", "Ghép thêm máy"),
    M("bm2-ung-dung-may", null, "/ung-dung/m1", "Roblox Player"),
    M("bm2-app-web", "sau-bm-app-web.png", "/app-web", "LUÔN ĐƯỢC DÙNG"),
    M("bm2-web", "sau-bm-web.png", "/web/c1", "ĐANG CHẶN · 3"),
    M("bm2-yeu-cau-web", "sau-bm-yeu-cau-web.png", "/yeu-cau/y1", "Học tập — miễn phí", { sau: () => js(BE_TU) }),
    M("bm2-bao-cao", "sau-bm-bao-cao.png", "/bao-cao", "DÙNG NHIỀU NHẤT"),
    M("bm2-man-hinh", "sau-bm-man-hinh.png", "/man-hinh/c1", "THEO MỤC"),
    M("bm2-vi", "sau-bm-vi.png", "/vi/c1", "Tuần này kiếm"),
    M("bm2-gia-dinh", "sau-bm-gia-dinh.png", "/cai-dat", "Chat với AiiLab"),
    M("bm2-thanh-vien", "sau-bm-thanh-vien.png", "/thanh-vien", "Ông ngoại"),
    M("bm2-thong-bao", "sau-bm-thong-bao.png", "/thong-bao", "vừa nộp 3 nhiệm vụ"),
    M("bm2-thong-bao-cai-dat", "sau-bm-thong-bao-cai-dat.png", "/thong-bao/cai-dat", "Việc Ba Mẹ khác làm"),
    M("bm2-ho-tro", "sau-bm-ho-tro.png", "/ho-tro", "đã cộng vào quỹ"),
    M("bm2-quy", "sau-bm-quy.png", "/quy", "Quỹ còn"),
    M("bm2-admin-ho-tro", "sau-bm-admin-ho-tro.png", "/admin-ho-tro", "", { cho2: 3000 }),
    M("bm3-duyet-thong-bao", "sau-bm-thong-bao.png", "/thong-bao", "vừa nộp 3 nhiệm vụ"),
    M("bm3-duyet-cho-duyet", "sau-bm-cho-duyet.png", "/cho-duyet", "4 việc đang chờ"),
    M("bm3-duyet-canh-bao", "sau-bm-canh-bao.png", "/canh-bao", "ROB GỢI Ý"),
    M("bm3-duyet-canh-bao-chi-tiet", "sau-bm-canh-bao-chi-tiet.png", "/canh-bao/a1", "AiiGrow không đọc nội dung"),
    M("bm3-duyet-them-gio", "sau-bm-yeu-cau-them-gio.png", "/yeu-cau/y2", "Ngoại lệ thứ 4"),
    M("bm3-duyet-nhiem-vu", "sau-bm-duyet-nv.png", "/duyet/l1", "Không trùng ảnh cũ"),
    M("bm3-duyet-xong", "sau-bm-duyet-xong.png", "/duyet-xong?luot=l1&con=c1&ten=Ken&diem=10&nv=R%E1%BB%ADa%20ch%C3%A9n&khen=Gi%E1%BB%8Fi%20l%E1%BA%AFm!", "Hoàn tác"),
    M("bm3-duyet-trong", null, "/cho-duyet", "Không có việc nào chờ", { kb: { "GET cho-duyet": { nhiemVu: [], yeuCau: [] }, "GET luat": { ...coBan["GET luat"], chuaXep: [] } } }),
    M("bm3-duyet-mat-mang", null, "/cho-duyet", "Đang chờ mạng", { matMang: true }),
    M("bm3-nv-qua", "sau-bm-nhiem-vu-qua.png", "/diem-qua", "Nhiệm vụ của nhà mình"),
    M("bm3-nv-giao", "sau-bm-giao-nv.png", "/giao-nv", "Việc cần làm"),
    M("bm3-nv-duyet", "sau-bm-duyet-nv.png", "/duyet/l1", "Không trùng ảnh cũ"),
    M("bm3-nv-loi-khen", "sau-bm-loi-khen.png", "/loi-khen/c1", "Khen"),
    M("bm3-nv-vi", "sau-bm-vi.png", "/vi/c1", "Tuần này kiếm"),
    M("bm3-nv-trao-qua", null, "/diem-qua", "Quỹ phiếu quà AiiCafe", { truoc: async () => { await di("/diem-qua"); await doi("Phần thưởng (3)"); await bam("Phần thưởng (3)"); } }),
    M("bm3-nv-trong", null, "/diem-qua", "Chưa có nhiệm vụ", { kb: { "GET nhiem-vu": { ds: [] } }, cho2: 2500 }),
  ];
  const loc = process.env.CHUP_MAN ? new RegExp(process.env.CHUP_MAN) : null;
  const vao = async (m) => {
    kb = { ...coBan, ...(m.kb ?? {}) };
    matMang = !!m.matMang;
    if (m.truoc) await m.truoc(); else await di(m.duong, m.token === undefined ? "tok-thu" : m.token);
    const ok = m.cho ? await doi(m.cho, 9000) : true;
    if (!ok) console.log(`    chưa thấy «${m.cho}»: ${(await chu())?.replace(/\s+/g, " ").slice(0, 160)}`);
    return ok; // không thấy chữ chờ ⇒ bỏ qua, giữ bản chụp cũ (khỏi ghi đè bằng màn đang tải/lỗi)
  };
  await chayChup({ goi, js, sleep, ds: ds.filter((m) => (!loc || loc.test(m.key)) && (!process.env.CHUP_NHOM || m.nhom === process.env.CHUP_NHOM || (!m.ref && process.env.CHUP_NHOM === "A"))), vao, ra: process.env.CHUP_RA, dist: DIR, goc: GOC });
  console.log("chưa giả:", [...new Set(nhatKy.filter((x) => !kb[`${x.m} ${x.d}`]).map((x) => `${x.m} ${x.d}`))].join(", "));
  ws.close(); chrome.kill(); may.close();
  await sleep(500);
  try { rmSync(hoSo, { recursive: true, force: true }); } catch { /* */ }
  process.exit(0);
}
