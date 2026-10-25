// Cửa vào (bản web: trang chủ /): có phiên Ba Mẹ ⇒ trang Hôm nay; chưa ⇒ hiện luôn màn Chào ở /, không đổi đường.
// App native trên máy của Con (đã ghép máy hoặc còn phiên Con, không có phiên Ba Mẹ) ⇒ vào thẳng màn Con /tre.
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { Redirect } from "expo-router";
import { usePhien } from "@/lib/phien";
import { XuongTai } from "@/lib/ui";
import { kid, may } from "@/lib/api-tre";
import Chao from "./chao";

export default function Vao() {
  const { san, co } = usePhien();
  const [mayCon, setMayCon] = useState<boolean | null>(Platform.OS === "web" ? false : null);
  useEffect(() => {
    if (Platform.OS === "web") return;
    Promise.all([may.nap(), kid.nap()]).then(([m, k]) => setMayCon(!!m || !!k), () => setMayCon(false));
  }, []);
  if (!san || mayCon === null) return <XuongTai />;
  if (co) return <Redirect href="/hom-nay" />;
  return mayCon ? <Redirect href="/tre" /> : <Chao />;
}
