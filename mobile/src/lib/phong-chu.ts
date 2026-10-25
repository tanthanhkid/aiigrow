// Bản native: Inter đã NHÚNG sẵn trong app lúc build (plugin expo-font trong app.json) ⇒ không tải gì lúc mở app, vẽ ngay khung đầu.
// Bản web: phong-chu.web.ts nạp @font-face lúc chạy.
export function useNapPhongChu() {}
