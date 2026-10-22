// Cửa vào (bản web: trang chủ /): có phiên Ba Mẹ ⇒ trang Hôm nay; chưa ⇒ hiện luôn màn Chào ở /, không đổi đường.
import { Redirect } from "expo-router";
import { usePhien } from "@/lib/phien";
import { XuongTai } from "@/lib/ui";
import Chao from "./chao";

export default function Vao() {
  const { san, co } = usePhien();
  if (!san) return <XuongTai />;
  return co ? <Redirect href="/hom-nay" /> : <Chao />;
}
