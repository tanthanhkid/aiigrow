// Đường cũ «<Con> dùng được gì?» (them-35vyl4cx) — thiết kế 15/11 (#262) gộp chọn chế độ «Mở hết / Theo danh sách» vào màn them-mdujxlg2 (/thiet-lap/app).
// Giữ redirect (#572): link cũ trong lịch sử trình duyệt / phiên thiết lập dở có thể còn trỏ tới đây.
import { Redirect } from "expo-router";

export default function ObCheDo() {
  return <Redirect href="/thiet-lap/app" />;
}
