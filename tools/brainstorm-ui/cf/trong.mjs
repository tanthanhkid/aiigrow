// Thay cho «puppeteer-core» trong gói Worker (wrangler alias): bản Cloudflare mở trình duyệt bằng Browser Rendering (móc moTrinh), không bao giờ gọi tới đây.
export default { launch() { throw new Error('puppeteer-core không có trên Cloudflare'); } };
