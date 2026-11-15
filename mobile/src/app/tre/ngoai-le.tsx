// Đường cũ /tre/ngoai-le («Xin Ba Mẹ mở ngoại lệ»). 15/11 (#265) bỏ hẳn ngoại lệ: muốn chơi thêm ⇒ «Xin Ba Mẹ cho vay sao»; app ngoài danh sách
// ⇒ «Xin Ba Mẹ mở» (xin thêm vào danh sách). Giữ đường để link cũ (agent, thông báo) không vỡ.
import { Redirect, useLocalSearchParams } from "expo-router";

export default function NgoaiLeCu() {
  const { app } = useLocalSearchParams<{ app?: string }>();
  if (app) return <Redirect href={`/tre/xin-phep?loai=cai_app&gia=${encodeURIComponent(app)}`} />;
  return <Redirect href="/tre/them-gio" />;
}
