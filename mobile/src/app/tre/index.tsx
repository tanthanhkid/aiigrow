// Cửa vào màn Con: đã có phiên PIN (hoặc ?phien=… do agent Windows mở khung Kid) ⇒ Nhà (lần đầu ⇒ Rob chào); chưa ⇒ chọn hồ sơ + PIN.
import { Redirect } from "expo-router";
import { ManTre, useTre } from "@/lib/ui-tre";
import { XuongTai } from "@/lib/ui";

export default function VaoTre() {
  const { san, co, daChao } = useTre();
  if (!san) return <ManTre><XuongTai /></ManTre>;
  return <Redirect href={!co ? "/tre/pin" : daChao ? "/tre/nha" : "/tre/chao"} />;
}
