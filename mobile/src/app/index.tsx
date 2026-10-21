// Cửa vào: có phiên Ba Mẹ ⇒ trang Hôm nay; chưa ⇒ màn Chào.
import { Redirect } from "expo-router";
import { usePhien } from "@/lib/phien";
import { XuongTai } from "@/lib/ui";

export default function Vao() {
  const { san, co } = usePhien();
  if (!san) return <XuongTai />;
  return <Redirect href={co ? "/hom-nay" : "/chao"} />;
}
