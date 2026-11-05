// Đường cũ /tre/het-phien («Hết phiên — nghỉ N phút»). Thiết kế 05/11 bỏ phiên điểm và nghỉ giữa hai phiên ⇒ màn Thêm giờ.
import { Redirect } from "expo-router";

export default function HetPhienCu() {
  return <Redirect href="/tre/them-gio" />;
}
