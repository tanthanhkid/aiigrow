// Cửa vào màn Con: đã có phiên Con (hoặc ?phien=… do agent mở khung Kid) ⇒ Hôm nay (lần đầu ⇒ Rob chào); chưa ⇒ máy khoá, chọn tên + PIN
// (PIN theo bé 06/11); máy chưa ghép ⇒ /tre/ghep (màn chọn tên tự chuyển).
import { Redirect } from "expo-router";
import { ChoD, ManD } from "@/lib/ui-diu";
import { useTre } from "@/lib/ui-tre";

export default function VaoTre() {
  const { san, co, daChao } = useTre();
  if (!san) return <ManD><ChoD tai={() => {}} /></ManD>;
  return <Redirect href={!co ? "/tre/chon-ten" : daChao ? "/tre/nha" : "/tre/chao"} />;
}
