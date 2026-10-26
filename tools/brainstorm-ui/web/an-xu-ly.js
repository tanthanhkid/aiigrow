// Ẩn góp ý «Đã xử lý» + đề xuất đã Accept/Từ chối — dùng chung cho bàn chính (gop-y.js) và trang /r/ (review.js).
// Mặc định ẩn; công tắc «Hiện đã xử lý (N)» ở đầu danh sách (nhớ trong localStorage, lỗi storage thì vẫn chạy mặc định).
// Góp ý đã xử lý mà có trả lời MỚI sau lúc xử lý (t > tXl) KHÔNG tự mở lại — chỉ có chấm báo trên công tắc tới khi bật xem.
const doc = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const ghi = (k, v) => { try { localStorage.setItem(k, v); } catch { /* chế độ riêng tư / chặn storage: chỉ nhớ trong phiên */ } };

// trả lời đến sau lúc đánh dấu xử lý (góp ý cũ chưa có tXl thì không tính)
export const traLoiMoiSauXl = (g) => (g.tt === 'xong' && g.tXl ? (g.tl || []).filter((t) => t.t > g.tXl) : []);
export const daXuLyGy = (g) => g.tt === 'xong';
export const daXuLyDx = (x) => x.tt !== 'cho';

// khoa: tên khoá localStorage riêng của trang; veLai(): vẽ lại danh sách khi đổi
export function taoAnXuLy(khoa, veLai) {
  let hien = doc(khoa) === '1';
  // mốc «đã xem» của chấm báo: trả lời mới hơn mốc này mới nháy
  let daXem = doc(`${khoa}.xem`) || '';
  const S = {
    get hien() { return hien; },
    // id của trả lời mới chưa xem (để đánh dấu thẻ khi đang hiện)
    traLoiChuaXem(g) { return traLoiMoiSauXl(g).filter((t) => t.t > daXem); },
    // ghi mốc đã xem = trả lời mới nhất trong các mục đang hiện
    danhDauDaXem(ds) {
      const moi = ds.flatMap((g) => traLoiMoiSauXl(g).map((t) => t.t)).sort().at(-1) || '';
      if (moi > daXem) { daXem = moi; ghi(`${khoa}.xem`, daXem); }
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
      b.onclick = () => { hien = !hien; ghi(khoa, hien ? '1' : '0'); veLai(); };
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
  return new Promise((xong) => setTimeout(xong, 340)); // khớp thời gian transition trong CSS (.truot-ra)
}
export function huyTruot(el) { if (!el) return; el.classList.remove('truot-ra'); el.style.height = ''; el.style.display = ''; }
