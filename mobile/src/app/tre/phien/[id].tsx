// Đường cũ /tre/phien/:id (đồng hồ phiên chơi trừ điểm). Thiết kế 05/11 bỏ phiên điểm — giờ chơi đếm theo quỹ phút ⇒ màn «Giờ chơi».
// Giữ redirect (#572): link cũ (thông báo đã phát, app/agent bản cũ) có thể còn trỏ tới đây.
import { Redirect } from "expo-router";

export default function PhienCu() {
  return <Redirect href="/tre/gio" />;
}
