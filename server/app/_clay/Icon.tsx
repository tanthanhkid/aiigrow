// Icon theo ngôn ngữ Clay gương (docs/THIET-KE-CLAY.md mục 2):
// - I3d: icon minh hoạ = PNG Fluent Emoji 3D (microsoft/fluentui-emoji, MIT, commit 1ffb34c) đóng gói ở public/icon3d/ — không gọi CDN lúc chạy.
// - Ph: icon điều hướng nhỏ = Phosphor Fill (@phosphor-icons/core 2.1.1, MIT © 2023 Phosphor Icons), chép nguyên path vào đây.
// Giấy phép: public/icon3d/NOTICE.txt.

export type Ten3d =
  | "desktop-computer" | "laptop" | "mobile-phone" | "inbox-tray" | "eyes" | "shield" | "key" | "office-building" | "card-index-dividers"
  | "bullseye" | "file-cabinet" | "house-with-garden" | "memo" | "envelope" | "bar-chart" | "ticket" | "balance-scale" | "speech-balloon"
  | "books" | "gear" | "scroll" | "money-bag" | "hot-beverage" | "child";

/** Icon 3D trong viên clay tròn (`mau` = màu viên: xanh/vang/cam/lam/tim/xam), ảnh chiếm ~62% viên. */
export function I3d({ ten, mau, co = 44, className }: { ten: Ten3d; mau?: "xanh" | "vang" | "cam" | "lam" | "tim" | "xam"; co?: number; className?: string }) {
  const c = Math.round(co * 0.62);
  return (
    <span className={`bt ${mau ?? "xam"} ${className ?? ""}`} style={{ width: co, height: co }} aria-hidden="true">
      <img className="f3" src={`/icon3d/${ten}.png`} alt="" width={c} height={c} decoding="async" />
    </span>
  );
}

const PH = {
  "arrow-left": "M224,128a8,8,0,0,1-8,8H120v64a8,8,0,0,1-13.66,5.66l-72-72a8,8,0,0,1,0-11.32l72-72A8,8,0,0,1,120,56v64h96A8,8,0,0,1,224,128Z",
  "download-simple": "M224,144v64a8,8,0,0,1-8,8H40a8,8,0,0,1-8-8V144a8,8,0,0,1,16,0v56H208V144a8,8,0,0,1,16,0Zm-101.66,5.66a8,8,0,0,0,11.32,0l40-40A8,8,0,0,0,168,96H136V32a8,8,0,0,0-16,0V96H88a8,8,0,0,0-5.66,13.66Z",
  "sign-out": "M120,216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H56V208h56A8,8,0,0,1,120,216Zm109.66-93.66-40-40A8,8,0,0,0,176,88v32H112a8,8,0,0,0,0,16h64v32a8,8,0,0,0,13.66,5.66l40-40A8,8,0,0,0,229.66,122.34Z",
  "qr-code": "M120,56v48a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V56A16,16,0,0,1,56,40h48A16,16,0,0,1,120,56Zm-16,80H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm96-96H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40ZM144,184a8,8,0,0,0,8-8V144a8,8,0,0,0-16,0v32A8,8,0,0,0,144,184Zm64-32H184v-8a8,8,0,0,0-16,0v56H144a8,8,0,0,0,0,16h32a8,8,0,0,0,8-8V168h24a8,8,0,0,0,0-16Zm0,32a8,8,0,0,0-8,8v16a8,8,0,0,0,16,0V192A8,8,0,0,0,208,184Z",
} as const;

export function Ph({ ten, co = 20 }: { ten: keyof typeof PH; co?: number }) {
  return <svg className="ph" width={co} height={co} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d={PH[ten]} /></svg>;
}
