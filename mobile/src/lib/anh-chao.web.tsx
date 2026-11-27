// Bản web của nền màn Chào: phát đoạn intro (tắt tiếng, một lần, dừng ở khung cuối), ảnh tĩnh làm poster khi chưa tải / không tự phát được.
// Ảnh + video là con TRỰC TIẾP của khung nền, nội dung màn (nút, liên kết) cũng nằm trong khung ⇒ ảnh là nền của khung chứa chữ (thiết kế
// bm1-welcome đặt nút lên ảnh phủ kín màn), không phải hình nổi đè chữ.
// #564: video (~460 KB) chỉ gắn SAU khi trang tải xong (sự kiện load + lúc rảnh) ⇒ không tranh băng thông với JS / font / ảnh LCP; trước đó ảnh tĩnh
// (cũng là poster, trùng khung đầu) đứng nguyên chỗ nên nhìn không đổi.
import { useEffect, useState, type ReactNode } from "react";
import { View } from "react-native";
// @ts-ignore — react-native-web không kèm kiểu; chỉ dùng hàm tạo thẻ DOM <img> / <video>
import { unstable_createElement } from "react-native-web";

const ANH = require("../../assets/chao/welcome-03.webp");
const VIDEO = require("../../assets/chao/welcome-03-intro.mp4");
const nguon = (x: unknown) => (typeof x === "string" ? x : (x as { uri?: string; default?: string })?.uri ?? (x as { default?: string })?.default ?? "");
// #775: «contain» + nền cùng màu ảnh ⇒ chữ «AiiGrow» của ảnh nằm trong vùng ảnh, nút / câu giới thiệu xếp DƯỚI ảnh, không đè lên
const PHU = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" } as const;

/** true khi trang đã tải xong và trình duyệt rảnh (tối đa chờ 1,5 s sau load). */
function useSauTai() {
  const [xong, setXong] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (i: number) => void };
    let huy: (() => void) | undefined;
    const bat = () => {
      const lam = () => setXong(true);
      if (w.requestIdleCallback && w.cancelIdleCallback) { const id = w.requestIdleCallback(lam, { timeout: 1500 }); huy = () => w.cancelIdleCallback?.(id); }
      else { const id = window.setTimeout(lam, 1000); huy = () => window.clearTimeout(id); }
    };
    if (document.readyState === "complete") bat(); else window.addEventListener("load", bat, { once: true });
    return () => { window.removeEventListener("load", bat); huy?.(); };
  }, []);
  return xong;
}

export function NenChao({ children }: { children?: ReactNode }) {
  const coVideo = useSauTai();
  return (
    <View style={{ flex: 1, backgroundColor: "#E6DFCF" }}>
      <View style={{ flex: 1, minHeight: 0 }}>
        {unstable_createElement("img", { src: nguon(ANH), alt: "AiiGrow · Ươm mầm thói quen số", style: PHU })}
        {coVideo ? unstable_createElement("video", {
          src: nguon(VIDEO), poster: nguon(ANH), autoPlay: true, muted: true, playsInline: true, preload: "auto",
          style: { ...PHU, pointerEvents: "none" },
        }) : null}
      </View>
      <View>{children}</View>
    </View>
  );
}
