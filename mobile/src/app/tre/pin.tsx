// Đường cũ /tre/pin (agent / link bản trước): bỏ PIN từ 05/11 ⇒ chuyển sang «Ai đang dùng máy?» chọn tên.
import { Redirect } from "expo-router";

export default function PinCu() {
  return <Redirect href="/tre/chon-ten" />;
}
