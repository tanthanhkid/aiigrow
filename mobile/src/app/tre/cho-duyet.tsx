// con-cho-duyet «Đã nộp — chờ Ba Mẹ»: Ba Mẹ duyệt xong là có điểm; trong lúc chờ làm việc khác cũng được.
// Mất mạng lúc nộp ⇒ ảnh nằm trong hàng chờ trên máy, tự gửi khi có mạng (thử lại mỗi 5 giây) — Con không cần chụp lại.
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { BangMang, CanhGiua, ChoTai, Nut } from "@/lib/ui";
import { DiemTren, ManTre, useTaiTre, useTre } from "@/lib/ui-tre";
import { guiHangCho, kid, soViecCho, type NhaTre } from "@/lib/api-tre";

export default function ChoDuyet() {
  const { diem, xep } = useLocalSearchParams<{ diem?: string; xep?: string }>();
  const { ten } = useTre();
  const { d, loi, matMang, tai } = useTaiTre("nha", () => kid.goi<NhaTre>("nha"));
  const [cho, setCho] = useState(xep ? Math.max(1, soViecCho()) : 0);
  useEffect(() => {
    if (!cho) return;
    const t = setInterval(() => { guiHangCho().then((n) => { setCho(n); if (!n) tai(); }).catch(() => {}); }, 5000);
    return () => clearInterval(t);
  }, [cho, tai]);
  if (!d && !cho) return <ManTre tab="nhiem-vu"><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  return (
    <ManTre tab="nhiem-vu">
      {d ? <DiemTren n={d.soDu} chuoi={d.chuoiNgay} /> : null}
      {cho ? <BangMang chu={`Mất mạng — ảnh nằm trong hàng chờ trên máy, tự gửi cho Ba Mẹ khi có mạng. ${ten} không cần chụp lại.`} /> : null}
      <CanhGiua lv="cho" tieu={cho ? "Rob giữ ảnh cho Ba Mẹ rồi!" : "Đã gửi cho Ba Mẹ rồi!"}
        loi={`Ba Mẹ duyệt xong là ${ten} có ${diem ? `+${diem}` : "thêm"} điểm. Trong lúc chờ, làm việc khác cũng được.`}>
        <Nut chu="Làm nhiệm vụ khác" loai="vien" bam={() => router.replace("/tre/nhiem-vu")} />
      </CanhGiua>
    </ManTre>
  );
}
