// «🔗 Dùng chung»: gộp nhiều màn ở các hành trình khác nhau vào MỘT nội dung chung (sửa một nơi → mọi luồng cập nhật),
// còn liên kết sang màn kế (data-toi) giữ riêng từng luồng. Bảng: gợi ý gộp (tự dò, chỉ gợi ý — không tự gộp), nhóm đang có, gộp thủ công.
// Máy chủ: /api/dung-chung (ung-dung.mjs). Lớp liên kết tính bằng DOM ở đây (gan-toi.js layLop/apLop), máy chủ không phân tích HTML.
import { layLop, apLop } from './gan-toi.js';
import { goiYDungChung } from './dung-chung.js';
import { dauChuQuan } from './gop-y.js';

const $ = (s) => document.querySelector(s);
const tao = (tag, lop, chu) => { const e = document.createElement(tag); if (lop) e.className = lop; if (chu != null) e.textContent = chu; return e; };

export function ganDungChung(c) {
  const { MAN, PB, timLan, coMan, daXoa, thoCua, toast, laChuQuan, phien, tenNguoi, dongBoPhienBan, toi: toiMan } = c;
  const tenLuong = (k) => timLan(MAN[k]?.lan)?.ten || MAN[k]?.lan || '';
  const nhan = (k) => `${tenLuong(k)} › ${MAN[k]?.ten || k}`;
  const lucCua = (k) => { const pb = PB[k]; const m = pb?.ds?.find((x) => x.v === pb.hien); return m?.tep ? Date.parse(m.t) || 0 : 0; }; // v0 (bản trong mã) = cũ nhất
  const moiNhat = (ds) => ds.slice().sort((a, b) => lucCua(b) - lucCua(a))[0];
  let goiY = [], cq = false, dangMo = false, tapTrung = '', henGy = 0;

  function tinhGoiY() {
    goiY = goiYDungChung(Object.keys(MAN).map((k) => ({ key: k, ten: MAN[k].ten, lan: MAN[k].lan, w: MAN[k].w, h: MAN[k].h, html: thoCua(k), goc: MAN[k].goc0.tho, w0: MAN[k].goc0.w, h0: MAN[k].goc0.h, nhom: MAN[k].dc?.id || '', xoa: daXoa(k) })));
    const n = goiY.length; const b = $('#nut-dc'); if (b) { b.querySelector('.dem').textContent = n ? String(n) : ''; b.title = `Màn dùng chung giữa các luồng — ${n ? `${n} gợi ý gộp` : 'không có gợi ý mới'}`; }
    return goiY;
  }
  const nhomDangCo = () => { const g = new Map(); for (const k of Object.keys(MAN)) { const d = MAN[k].dc; if (d && !g.has(d.id)) g.set(d.id, d.ds.filter(coMan)); } return [...g.entries()].map(([id, ds]) => ({ id, ds })); };

  async function goi(duong, than) {
    const r = await fetch(`/api/dung-chung/${duong}`, { method: 'POST', body: JSON.stringify(than), headers: { 'content-type': 'application/json', 'x-bs-phien': phien, 'x-bs-nguoi': encodeURIComponent(tenNguoi()), ...dauChuQuan() } });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.canMa ? 'Cần mã chủ quản (mở 🔑 trong Góp ý)' : j.loi || `HTTP ${r.status}`);
    return j;
  }
  // lớp liên kết của mỗi màn lúc gộp: màn chưa có data-toi trong nội dung (liên kết tự gắn theo nhãn bước) giữ «tự động»,
  // màn khác chụp liên kết đang hiệu lực (kể cả sửa tay #163) để áp lên nội dung chung
  // màn đã ở nhóm khác: giữ lớp liên kết đang có của nó (nội dung lưu của màn được lan tới không còn data-toi)
  const lopKhiGop = (k) => (MAN[k].dc ? MAN[k].dc.lop || { tuDong: true } : /data-toi=|data-lk-sua/.test(thoCua(k)) ? layLop(MAN[k].html) : { tuDong: true });
  async function gop(ds, nguon) {
    if (!(await laChuQuan(true))) { toast('Chỉ chủ quản gộp được màn dùng chung (mở 🔑 trong Góp ý).', true); return false; }
    const m = MAN[nguon]; const lop = Object.fromEntries(ds.map((k) => [k, lopKhiGop(k)]));
    try {
      const j = await goi('gop', { ds, nguon, html: thoCua(nguon), w: m.w, h: m.h, lop });
      await dongBoPhienBan();
      toast(`Đã gộp ${j.nhom.ds.length} màn thành nội dung dùng chung (theo «${nhan(nguon)}»). Liên kết sang màn kế giữ riêng từng luồng.${j.loi?.length ? ` Lỗi: ${j.loi.join('; ')}` : ''}`, !!j.loi?.length);
      return true;
    } catch (e) { toast(`Không gộp được: ${e.message}`, true); dongBoPhienBan(); return false; }
  }
  async function tach(key) {
    if (!(await laChuQuan(true))) { toast('Chỉ chủ quản tách được màn dùng chung.', true); return false; }
    const d = MAN[key]?.dc; if (!d) return false;
    // giữ bản hiện tại + liên kết riêng của luồng làm bản riêng — gửi cho MỌI màn trong nhóm, máy chủ quyết màn nào rời (nhóm còn 1 màn thì giải tán)
    const con = d.ds.filter((k) => k !== key && coMan(k)); const roi = con.length < 2 ? d.ds.filter(coMan) : [key]; // cùng cách tính với máy chủ
    const html = Object.fromEntries(roi.filter((k) => !daXoa(k)).map((k) => [k, apLop(thoCua(k), MAN[k].dc?.lop)]));
    try {
      const j = await goi('tach', { key, html });
      await dongBoPhienBan();
      toast(j.giaiTan ? `Đã tách — nhóm chỉ còn một màn nên giải tán; ${(j.roi || []).filter(coMan).map((k) => `«${nhan(k)}»`).join(', ')} giờ là màn riêng.` : `Đã tách «${nhan(key)}» khỏi nhóm dùng chung — giữ bản hiện tại làm bản riêng.`);
      return true;
    } catch (e) { toast(`Không tách được: ${e.message}`, true); dongBoPhienBan(); return false; }
  }

  // ---------- bảng ----------
  function xemTruoc(k) {
    const o = tao('div', 'dc-xem'); const m = MAN[k]; const z = Math.min(1, 150 / (m.w || 390));
    const vo = tao('div', 'dc-vo'); vo.style.width = `${Math.round(m.w * z)}px`; vo.style.height = `${Math.round(Math.min(m.h, 844) * z)}px`;
    const f = document.createElement('iframe'); f.setAttribute('sandbox', ''); f.setAttribute('referrerpolicy', 'no-referrer'); f.title = `Xem trước ${m.ten}`;
    f.width = m.w; f.height = m.h; f.style.transform = `scale(${z})`; f.srcdoc = m.html; vo.append(f); o.append(vo);
    return o;
  }
  function theGop(ds, tieu, lyDo, chiXem) {
    const the = tao('div', 'dc-the'); const nguonMd = moiNhat(ds); const ten = `dc-n-${Math.random().toString(36).slice(2, 8)}`;
    the.append(tao('b', 'dc-tieu', tieu)); if (lyDo) the.append(tao('span', 'phu', lyDo));
    const luoi = tao('div', 'dc-cac');
    for (const k of ds) {
      const o = tao('label', 'dc-man'); const cb = tao('input'); cb.type = 'checkbox'; cb.checked = true; cb.value = k; cb.className = 'dc-cb';
      const r = tao('input'); r.type = 'radio'; r.name = ten; r.value = k; r.checked = k === nguonMd; r.className = 'dc-nguon'; r.title = 'Dùng nội dung của màn này làm gốc';
      const dau = tao('div', 'dc-dau'); dau.append(cb, tao('span', 'dc-ten', nhan(k)));
      const pb = PB[k]; const v = pb?.hien || 0;
      const chan = tao('div', 'dc-chan'); chan.append(r, tao('span', '', `làm gốc · v${v}${lucCua(k) ? ` · ${new Date(lucCua(k)).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}` : ' · bản trong mã'}${k === nguonMd ? ' (mới nhất)' : ''}`));
      const toi = tao('button', 'dc-toi', 'Tới'); toi.type = 'button'; toi.onclick = (e) => { e.preventDefault(); dong(); toiMan(k); };
      chan.append(toi);
      o.append(dau, xemTruoc(k), chan); luoi.append(o);
    }
    the.append(luoi);
    if (!chiXem) {
      const nut = tao('button', 'nut-chinh', 'Gộp thành màn dùng chung'); nut.type = 'button'; nut.disabled = !cq;
      if (!cq) nut.title = 'Chỉ chủ quản gộp được (mở 🔑 trong Góp ý)';
      nut.onclick = async () => {
        const chon = [...the.querySelectorAll('.dc-cb:checked')].map((x) => x.value); const ng = the.querySelector('.dc-nguon:checked')?.value;
        if (chon.length < 2) { toast('Chọn ít nhất 2 màn để gộp.', true); return; }
        if (!chon.includes(ng)) { toast('Màn làm gốc phải nằm trong các màn được chọn.', true); return; }
        if (!confirm(`Gộp ${chon.length} màn, dùng nội dung của «${nhan(ng)}» cho tất cả?\nCác màn khác nhận bản mới (bản cũ vẫn trong Lịch sử); liên kết sang màn kế giữ riêng từng luồng.`)) return;
        nut.disabled = true; if (await gop(chon, ng)) ve(); else nut.disabled = false;
      };
      the.append(tao('p', 'phu', 'Bản mới nhất được chọn làm gốc sẵn — đổi bằng nút tròn «làm gốc». Bỏ chọn màn nào không muốn gộp.'), nut);
    }
    return the;
  }
  function ve() {
    if (!dangMo || $('#lop-dc').hidden) return;
    tinhGoiY();
    const L = $('#dc-luoi'); L.textContent = '';
    const nhom = nhomDangCo();
    const tt = tapTrung && MAN[tapTrung]?.dc ? nhom.find((g) => g.id === MAN[tapTrung].dc.id) : null;
    $('#dc-tieu').textContent = tt ? `🔗 «${MAN[tapTrung].ten}» dùng chung với` : '🔗 Màn dùng chung giữa các luồng';
    const cot = (tieu) => { const s = tao('section', 'dc-muc'); s.append(tao('h3', '', tieu)); L.append(s); return s; };
    const veNhom = (g, s) => {
      const the = tao('div', 'dc-the dc-nhom');
      the.append(tao('b', 'dc-tieu', `${g.ds.length} màn · ${new Set(g.ds.map((k) => MAN[k].lan)).size} luồng`));
      for (const k of g.ds) {
        const d = tao('div', 'dc-dong'); d.append(tao('span', 'dc-ten', nhan(k) + (daXoa(k) ? ' (đã xoá khỏi luồng này)' : '') + (k === tapTrung ? ' — đang xem' : '')));
        if (MAN[k].lkMat) d.append(tao('span', 'lk-nhan', `⚠ ${MAN[k].lkMat} liên kết chưa khớp`));
        const toi = tao('button', 'dc-toi', 'Tới'); toi.type = 'button'; toi.onclick = () => { dong(); toiMan(k); };
        const t = tao('button', 'dc-tach', 'Tách ra'); t.type = 'button'; t.disabled = !cq; t.title = cq ? 'Tách màn này khỏi nhóm — giữ bản hiện tại làm bản riêng' : 'Chỉ chủ quản tách được';
        t.onclick = async () => { if (!confirm(`Tách «${nhan(k)}» khỏi nhóm dùng chung? Màn giữ bản hiện tại làm bản riêng; sửa về sau không lan sang luồng khác nữa.`)) return; t.disabled = true; if (await tach(k)) ve(); else t.disabled = false; };
        d.append(toi, t); the.append(d);
      }
      the.append(tao('p', 'phu', 'Sửa nội dung ở bất kỳ màn nào trong nhóm (Thay màn, Sửa, Khôi phục, Accept, MCP) thì cả nhóm cập nhật. Nút sang màn kế giữ riêng từng luồng (🔗 Liên kết trên khung).'));
      s.append(the);
    };
    if (tt) { veNhom(tt, cot('Nhóm của màn này')); }
    const sg = cot(`Gợi ý gộp (${goiY.length})`);
    if (!goiY.length) sg.append(tao('p', 'phu', 'Không thấy màn trùng/giống nhau giữa các luồng chưa gộp.'));
    goiY.forEach((g, i) => sg.append(theGop(g.ds, `Gợi ý ${i + 1}: ${[...new Set(g.ds.map((k) => MAN[k].ten))].join(' / ')}`, g.lyDo)));
    const khac = nhom.filter((g) => g !== tt);
    if (khac.length || !tt) { const s = cot(`Nhóm đang dùng chung (${khac.length})`); if (!khac.length) s.append(tao('p', 'phu', 'Chưa có nhóm nào.')); khac.forEach((g) => veNhom(g, s)); }
    // gộp thủ công: chọn 2 màn bất kỳ (khác luồng hoặc cùng luồng)
    const s = cot('Gộp thủ công'); const hang = tao('div', 'dc-tay');
    const chonMan = () => { const sl = tao('select'); sl.append(new Option('— chọn màn —', '')); for (const l of c.LAN_GOC) { const og = document.createElement('optgroup'); og.label = l.ten; for (const k of l.buoc) if (!daXoa(k)) og.append(new Option(MAN[k].ten + (MAN[k].dc ? ' 🔗' : ''), k)); sl.append(og); } return sl; };
    const a = chonMan(), b = chonMan(); const xem = tao('button', '', 'Xem trước'); xem.type = 'button';
    const cho = tao('div');
    xem.onclick = () => { const ds = [...new Set([a.value, b.value].filter(Boolean))]; cho.textContent = ''; if (ds.length < 2) { toast('Chọn 2 màn khác nhau.', true); return; } cho.append(theGop(ds, 'Gộp thủ công', '')); };
    hang.append(a, b, xem); s.append(hang, cho);
    if (!cq) L.prepend(tao('p', 'dc-cq', 'Chỉ chủ quản gộp/tách được (mở 🔑 trong Góp ý). Bạn vẫn xem được gợi ý và nhóm.'));
  }
  function dong() { dangMo = false; $('#lop-dc').hidden = true; $('#dc-luoi').textContent = ''; }
  async function mo(key = '') {
    tapTrung = coMan(key) ? key : ''; dangMo = true; $('#lop-dc').hidden = false; cq = CQ0(); ve();
    const la = await laChuQuan(true); if (la !== cq) { cq = la; ve(); }
  }
  let cqNho = false; const CQ0 = () => cqNho;
  $('#dc-dong').onclick = dong;
  $('#lop-dc').addEventListener('click', (e) => { if (e.target.id === 'lop-dc') dong(); });
  $('#nut-dc').onclick = () => mo('');
  return {
    mo, dong, gop, tach, tinhGoiY, goiY: () => goiY, nhom: nhomDangCo,
    khiDoi() { if (dangMo && !$('#lop-dc').hidden) { ve(); return; } clearTimeout(henGy); henGy = setTimeout(tinhGoiY, 1500); }, // đóng bảng: chỉ đếm lại gợi ý (gộp nhiều lần đổi thành một)
    datCq(la) { cqNho = !!la; },
  };
}
