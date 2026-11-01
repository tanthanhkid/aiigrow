// ---------------------------------------------------------------- CHỤP DOM màn Con (/tre) cho bàn brainstorm
{
  console.log("bắt đầu chụp con"); const { chayChup } = await import(process.env.CHUP_CHUNG);
  const { statSync: st } = await import("node:fs");
  const REF = process.env.REF_DIR;
  const gioAnh = (f) => { try { return st(`${REF}/${f}`).mtime; } catch { return null; } };
  const teen = { "GET toi": toi({ ten: BILL, nhom: "teen", id: "c2" }) };
  const M = (key, ref, duong, cho, tc = {}) => ({ key, ref, duong, cho, nhom: "A", refPath: ref ? `${REF}/${ref}` : null, gio: ref ? gioAnh(ref) : null, ...tc });
  const ds = [
    M("cdt-chao", "sau-con-chao.png", "/tre/chao", "Nhận 10 điểm"),
    M("cdt-cai", "sau-con-cai.png", "/tre/cai?tep=MinecraftInstaller.exe", "MinecraftInstaller.exe chưa được cài", { kb: teen }),
    M("cdt-nha", "sau-con-nha.png", "/tre/nha", "+10 điểm!", { daXem: [] }),
    M("cdt-nha-chinh", "sau-con-nha-cuon.png", "/tre/nha", `${KEN} có 45 điểm`, { sau: () => js(`(() => { window.__giuCuon = 1; for (const e of document.querySelectorAll("*")) if (e.scrollHeight > e.clientHeight + 5 && getComputedStyle(e).overflowY !== "visible") e.scrollTop = e.scrollHeight; return 1; })()`).then(() => sleep(400)) }),
    M("cdt-nhiem-vu", "sau-con-nhiem-vu.png", "/tre/nhiem-vu", "Hôm nay làm gì nào?"),
    M("cdt-nv-chi-tiet", "sau-con-nv-chi-tiet.png", "/tre/nv/t0", "Hôm nay đã làm 2/3 lần"),
    M("cdt-dang-lam", "sau-con-nv-dang.png", "/tre/dang/l9?nv=t1", "đang đọc sách"),
    M("cdt-chup", "sau-con-chup.png", "/tre/chup/l9?nv=t0", "Rob giữ ảnh này cho Ba Mẹ xem"),
    M("cdt-cho-duyet", "sau-con-cho-duyet.png", "/tre/cho-duyet?diem=10", "Đã gửi cho Ba Mẹ rồi!"),
    M("cdt-duoc-duyet", "sau-con-duoc-duyet.png", "/tre/duoc-duyet/l1", "+10 điểm!"),
    M("cdt-chup-lai", "sau-con-chup-lai.png", "/tre/chup-lai/l2?nv=t0", "không mất điểm nào"),
    M("cdt-vi-qua", "sau-con-vi-qua.png", "/tre/vi-qua", "Dùng trước"),
    M("cdt-cua-hang", "sau-con-cua-hang.png", "/tre/cua-hang", "đổi gì nào?"),
    M("cdt-doi-qua", "sau-con-doi-qua.png", "/tre/doi/q1", "Đổi 500 điểm"),
    M("cdt-huy-hieu", "sau-con-huy-hieu.png", "/tre/huy-hieu", "Cấp 4 · Mầm xanh"),
    M("cdt-gio-may", "sau-con-gio-may.png", "/tre/gio-may?lech=61", "Đồng hồ máy lệch 61 phút", { kb: teen }),
    M("cdt-choi", "sau-con-choi.png", "/tre/choi", "Chơi Roblox?"),
    M("cdt-phien", "sau-con-phien.png", "/tre/phien/p1?muc=roblox.exe", "Còn 5 phút nữa nhé!"),
    M("cdt-het-phien", "sau-con-het-phien.png", `/tre/het-phien?nghiDen=${encodeURIComponent(luc(-60))}`, "Hết phiên"),
    M("cdt-gio-ngu", "sau-con-gio-ngu.png", "/tre/gio-ngu?ly=dat_tran_ngay", "Hết giờ chơi hôm nay rồi"),
    M("cdt-xin-phep", "sau-con-xin-phep.png", "/tre/xin-phep?loai=mo_web&gia=scratch.mit.edu&tu=chan-web", "Xin mở trang web"),
    M("cdt-yeu-cau", "sau-con-yeu-cau.png", "/tre/yeu-cau", "Ba Mẹ đồng ý rồi!"),
    M("cdt-chan-web", "sau-con-chan-web.png", "/tre/chan-web?url=scratch.mit.edu", "Trang này Rob chưa biết"),
    M("cdt-quy-tac", "sau-con-quy-tac.png", "/tre/quy-tac", "Ai cũng thấy giống nhau"),
    M("cdt-pin-ghep", "sau-con-pin.png", "/tre/pin", "Ghép máy với AiiGrow", { con: null, mayTok: null, banPhim: 494 }),
    M("cdt-pin-ai", "../man-dienthoai-2510/expo-con-pin.jpg", "/tre/pin", "Ai đang dùng máy?", { con: null, khongAnToan: true, khongThanh: true }),
  ];
  const loc = process.env.CHUP_MAN ? new RegExp(process.env.CHUP_MAN) : null;
  const vao = async (m) => {
    kb = { ...coBan, ...(m.kb ?? {}) };
    matMang = !!m.matMang;
    await goi("Emulation.setSafeAreaInsetsOverride", { insets: m.khongAnToan ? { top: 0, bottom: 0, left: 0, right: 0 } : { top: 50, bottom: 34, left: 0, right: 0 } });
    await di(m.duong, { con: m.con === undefined ? "tok-con" : m.con, mayTok: m.mayTok === undefined ? "tok-may" : m.mayTok, daXem: m.daXem ?? ["l1"] });
    const ok = await doi(m.cho, 9000);
    if (!ok) console.log(`    chưa thấy «${m.cho}»: ${(await chu())?.replace(/\s+/g, " ").slice(0, 160)}`);
    return ok; // không thấy chữ chờ ⇒ bỏ qua, giữ bản chụp cũ
  };
  await chayChup({ goi, js, sleep, ds: ds.filter((m) => (!loc || loc.test(m.key)) && (!process.env.CHUP_NHOM || m.nhom === process.env.CHUP_NHOM)), vao, ra: process.env.CHUP_RA, dist: DIR, goc: GOC });
  console.log("chưa giả:", [...new Set(nhatKy.filter((x) => !kb[`${x.m} ${x.d}`]).map((x) => `${x.m} ${x.d}`))].join(", "));
  ws.close(); chrome.kill(); may.close();
  await sleep(500);
  try { rmSync(hoSo, { recursive: true, force: true }); } catch { /* */ }
  process.exit(0);
}
