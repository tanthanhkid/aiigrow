// Máy đang khoá giải trí (thiết kế 05/11 con-het-gio «Đến giờ ngủ rồi» / «Ba Mẹ khoá máy» / giờ học — L3): mở lại lúc nào, sao giữ nguyên.
// Lúc này KHÔNG thêm giờ được (không đổi sao, không xin thêm giờ) — chỉ «Xin Ba Mẹ mở ngoại lệ» (1 app hoặc cả máy, có hạn phút).
// Đường cũ `?ly=ngoai_khung | dat_tran_ngay | dat_tran_tuan` (bản trước) ⇒ hết quỹ ⇒ màn Thêm giờ.
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { BangMang, CanhGiua, ChoTai, Nut } from "@/lib/ui";
import { DiemTren, ManTre, useTaiTre, useTre } from "@/lib/ui-tre";
import { kid, lyDoKhoa, type NhaTreSao } from "@/lib/api-tre";

export default function GioNgu() {
  const p = useLocalSearchParams<{ ly?: string }>();
  const { ten } = useTre();
  const { d, loi, matMang, tai, cu } = useTaiTre("nha", () => kid.goi<NhaTreSao>("nha"));
  if (!d) return <ManTre tab="nha"><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  const q = d.quy;
  // lý do thật lúc này (máy chủ) thắng; không có ⇒ tin tham số (màn Thêm giờ chuyển sang đây theo quỹ của nó — không chuyển ngược lại, tránh vòng)
  const ly = lyDoKhoa(q) ?? p.ly;
  if (ly !== "gio_ngu" && ly !== "ba_me_khoa" && ly !== "gio_hoc") return <Redirect href="/tre/them-gio" />;
  const sao = d.sao ?? d.soDu;
  const tieu = ly === "gio_ngu" ? "Đến giờ ngủ rồi" : ly === "ba_me_khoa" ? "Ba Mẹ đang khoá máy" : "Đang giờ học";
  const loiCanh = ly === "gio_ngu" ? `Máy mở lại lúc ${q?.gioNgu.den ?? "sáng mai"}. Chúc ${ten} ngủ ngon! ${sao} sao vẫn giữ nguyên.`
    : ly === "ba_me_khoa" ? `Trò chơi tạm khoá. Cần gấp thì xin Ba Mẹ mở ngoại lệ nhé.`
      : `App học vẫn dùng được.${q?.gioHoc ? ` Chơi lại sau ${q.gioHoc.den}.` : ""}`;
  return (
    <ManTre tab="nha">
      <DiemTren n={sao} chuoi={d.chuoiNgay} />
      {matMang || cu ? <BangMang chu="Mất mạng — máy vẫn giữ giờ ngủ và giờ chơi như Ba Mẹ đặt." /> : null}
      <CanhGiua lv={ly === "gio_ngu" ? "ngu" : ly === "gio_hoc" ? "hoc" : "nghi"} tieu={tieu} loi={loiCanh}>
        <Nut chu="Xin Ba Mẹ mở ngoại lệ" ic="tin" bam={() => router.push(`/tre/ngoai-le?ly=${ly}`)} />
        <Nut chu="Về Hôm nay" loai="ma" bam={() => router.replace("/tre/nha")} />
      </CanhGiua>
    </ManTre>
  );
}
