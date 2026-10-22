// Service worker TỰ HUỶ (kill-switch). AiiGrow không dùng service worker. Máy nào còn service worker cũ của tên miền này (cache
// index.html + chunk cũ ⇒ màn trắng sau mỗi lần deploy) thì lần F5 kế tiếp trình duyệt tải tệp này: xoá hết cache, tự gỡ, tải lại tab.
// Cùng nội dung ở /service-worker.js và /app/sw.js (next.config.ts). Không có trình nghe «fetch» ⇒ không chặn yêu cầu nào.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) await caches.delete(k);
    await self.registration.unregister();
    for (const c of await self.clients.matchAll({ type: "window" })) c.navigate(c.url);
  })());
});
