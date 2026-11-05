// Thẻ nghe ghi âm bằng chứng — bản NATIVE. Dự án chưa có thư viện phát âm thanh (expo-audio / expo-av chưa cài, cần bản dựng mới) ⇒ hiện thẻ ghi âm,
// nút nghe bị khoá kèm câu dẫn sang web. Bản web (nghe-ghi-am.web.tsx) phát thật. Cùng chữ ký export.
import { View } from "react-native";
import { KHOI } from "./clay";
import { Chu, M, Nut } from "./ui";
import { SongAm, phutGiay, type NgheGhiAmProps } from "./song-am";

export { SongAm, phutGiay, type NgheGhiAmProps };

export function NgheGhiAm({ nhan }: NgheGhiAmProps) {
  return (
    <View style={[{ padding: 16, borderRadius: 28, backgroundColor: M.chinhSoft, gap: 12 }, KHOI.the]}>
      {nhan ? <Chu kieu="dam" co={13.5} mau={M.chinhInk}>{nhan}</Chu> : null}
      <SongAm />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        <Nut chu="▶ Nghe từ đầu" nho tat bam={() => {}} />
        <Nut chu="Nghe nhanh x2" nho loai="vien" tat bam={() => {}} />
      </View>
      <Chu co={13} mau={M.chu3}>Nghe ghi âm trên bản app mới — tạm thời mở trên web aiigrow.</Chu>
    </View>
  );
}
