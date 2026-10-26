// Ẩn góp ý «Đã xử lý» + đề xuất đã Accept/Từ chối — dùng chung cho bàn chính (gop-y.js) và trang /r/ (review.js).
// Mặc định ẩn; công tắc «Hiện đã xử lý (N)» ở đầu danh sách (nhớ trong localStorage, lỗi storage thì vẫn chạy mặc định).
// Góp ý đã xử lý mà có trả lời MỚI sau lúc xử lý (t > tXl) KHÔNG tự mở lại — chỉ có chấm báo trên công tắc tới khi bật xem.
const doc = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const ghi = (k, v) => { try { localStorage.setItem(k, v); } catch { /* chế độ riêng tư / chặn storage: chỉ nhớ trong phiên */ } };

// trả lời đến sau lúc đánh dấu xử lý (góp ý cũ chưa có tXl thì không tính); boQua(t): trả lời của chính mình thì không tính
export const traLoiMoiSauXl = (g, boQua = () => false) => (g.tt === 'xong' && g.tXl ? (g.tl || []).filter((t) => t.t > g.tXl && !boQua(t)) : []);
export const daXuLyGy = (g) => g.tt === 'xong';
export const daXuLyDx = (x) => x.tt !== 'cho';

// khoa: tên khoá localStorage riêng của trang; veLai(): vẽ lại danh sách khi đổi
export function taoAnXuLy(khoa, veLai, boQua = () => false) {
  let hien = doc(khoa) === '1';
  // id các trả lời-sau-xử-lý đã xem (theo từng trả lời, không theo mốc giờ: xem màn/hành trình này không «nuốt» trả lời ở chỗ khác)
  let daXem; try { daXem = new Set(JSON.parse(doc(`${khoa}.xem`) || '[]')); } catch { daXem = new Set(); }
  const S = {
    get hien() { return hien; },
    moiSauXl: (g) => traLoiMoiSauXl(g, boQua),
    traLoiChuaXem(g) { return traLoiMoiSauXl(g, boQua).filter((t) => !daXem.has(t.id)); },
    // ds: các góp ý đang thật sự hiện trên màn (công tắc bật) — chỉ đánh dấu những trả lời đó
    danhDauDaXem(ds) {
      let doi = false;
      for (const g of ds) for (const t of S.traLoiChuaXem(g)) { daXem.add(t.id); doi = true; }
      if (doi) ghi(`${khoa}.xem`, JSON.stringify([...daXem].slice(-5000)));
    },
    // công tắc: soXl = số mục đã xử lý (đang ẩn hoặc đang hiện), coMoi = có trả lời mới chưa xem
    congTac(soXl, coMoi) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cong-tac-xl' + (hien ? ' bat' : '');
      b.setAttribute('role', 'switch'); b.setAttribute('aria-checked', String(hien));
      const nut = document.createElement('span'); nut.className = 'ct-nut'; nut.setAttribute('aria-hidden', 'true');
      const chu = document.createElement('span'); chu.textContent = `Hiện đã xử lý (${soXl})`;
      b.append(nut, chu);
      if (coMoi && !hien) {
        const c = document.createElement('span'); c.className = 'ct-cham'; c.title = 'Có trả lời mới ở góp ý đã xử lý'; b.append(c);
        b.setAttribute('aria-label', `Hiện đã xử lý (${soXl}) — có trả lời mới`);
      }
      b.disabled = !soXl && !hien;
      b.onclick = () => { hien = !hien; ghi(khoa, hien ? '1' : '0'); veLai(); document.querySelector('.cong-tac-xl')?.focus(); }; // vẽ lại thay nút: giữ focus bàn phím
      return b;
    },
  };
  return S;
}

// thẻ trượt ra mượt rồi mới bỏ (giảm chuyển động: bỏ ngay); trả Promise khi xong
export function truotRa(el) {
  if (!el?.isConnected) return Promise.resolve();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.style.display = 'none'; return Promise.resolve(); }
  el.style.height = `${el.offsetHeight}px`; void el.offsetHeight; // cố định chiều cao để thu lại mượt
  el.classList.add('truot-ra');
  return new Promise((xong) => setTimeout(xong, 370)); // khớp thời gian transition trong CSS (.truot-ra)
}
export function huyTruot(el) { if (!el) return; el.classList.remove('truot-ra'); el.style.height = ''; el.style.display = ''; }
