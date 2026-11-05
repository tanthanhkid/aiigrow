// Đường cũ /tre/choi («Dùng điểm để chơi?» — phiên chơi trừ điểm theo từng app). Thiết kế 05/11 (L2) bỏ: mọi app Ba Mẹ cho phép dùng chung
// quỹ phút hôm nay, cần thêm thì «Thêm giờ» (dùng sao / xin Ba Mẹ). Giữ đường cho link sâu của bản agent cũ ⇒ chuyển sang màn Thêm giờ.
import { Redirect } from "expo-router";

export default function ChoiCu() {
  return <Redirect href="/tre/them-gio" />;
}
