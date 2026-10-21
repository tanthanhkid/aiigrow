// con-gio-may «Giờ máy không đúng» (Teen, FR-01.05, BRD 6.7): lệch giờ ⇒ khoá trò chơi, app học vẫn dùng; nói rõ quy tắc nào, giọng trung tính,
// tôn trọng riêng tư («chỉ kiểm đồng hồ»). Nút «Nhắn Ba Mẹ» gửi yêu cầu kèm số phút lệch.
import { useState } from "react";
import { Linking, Platform, View, useWindowDimensions } from "react-native";
import { BangTruot, Bao, BaoLoi, Chu, M, Nhan, Nut, Rob, useLam } from "@/lib/ui";
import { ManTre } from "@/lib/ui-tre";
import { kid } from "@/lib/api-tre";
import { useLocalSearchParams } from "expo-router";

export default function GioMay() {
  const { lech } = useLocalSearchParams<{ lech?: string }>();
  const phut = Math.abs(Math.round(Number(lech) || 0));
  const { width } = useWindowDimensions();
  const rong = width >= 760;
  const [huongDan, setHuongDan] = useState(false);
  const [daNhan, setDaNhan] = useState(false);
  const { dangChay, loi, lam } = useLam();
  const chinh = () => {
    if (Platform.OS === "android") Linking.sendIntent("android.settings.DATE_SETTINGS").catch(() => setHuongDan(true));
    else setHuongDan(true);
  };
  const nhan = () => lam(async () => {
    await kid.goi("yeu-cau", { loai: "khac", giaTri: phut ? `Giờ máy lệch ${phut} phút — nhờ Ba Mẹ kiểm tra` : "Giờ máy không đúng — nhờ Ba Mẹ kiểm tra", lyDo: "Giờ máy không đúng" });
    setDaNhan(true);
  });
  return (
    <ManTre>
      <View style={{ flexDirection: rong ? "row" : "column", alignItems: "center", gap: rong ? 40 : 12, paddingVertical: rong ? 40 : 8, maxWidth: 980, alignSelf: "center" }}>
        <Rob ten="trong-loi" co={rong ? 320 : 180} />
        <View style={{ flex: rong ? 1 : undefined, gap: 8, alignSelf: "stretch" }}>
          <Nhan chu="Quy tắc: giờ máy phải đúng giờ thật" loai="canh" />
          <Chu kieu="rat" co={rong ? 34 : 26} style={{ letterSpacing: -0.6 }}>Giờ máy không đúng, hãy nhờ Ba Mẹ</Chu>
          <Chu co={rong ? 18 : 16} mau={M.chu2}>
            {`${phut ? `Đồng hồ máy lệch ${phut} phút. ` : ""}AiiGrow tạm khoá trò chơi — Word, AiiRob, trình duyệt học tập vẫn dùng bình thường.`}
          </Chu>
          <Chu co={15} mau={M.chu3}>AiiGrow không đọc nội dung của bạn — chỉ kiểm đồng hồ.</Chu>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
            <Nut chu="Chỉnh lại giờ tự động" bam={chinh} />
            {daNhan ? null : <Nut chu="Nhắn Ba Mẹ" loai="vien" bam={nhan} dangChay={dangChay} />}
          </View>
          {daNhan ? <Bao loai="ok" ic="tick" tieu="Đã báo Ba Mẹ" loi="Ba Mẹ xem trong mục Chờ duyệt và trả lời sớm." /> : null}
          <BaoLoi loi={loi} />
        </View>
      </View>
      <BangTruot mo={huongDan} dong={() => setHuongDan(false)} tieu="Chỉnh giờ tự động">
        <Chu co={15} mau={M.chu2}>Windows: Cài đặt → Thời gian và ngôn ngữ → Ngày và giờ → bật «Đặt giờ tự động», rồi bấm «Đồng bộ ngay».</Chu>
        <Chu co={15} mau={M.chu2}>Máy tính bảng / điện thoại: Cài đặt → Ngày và giờ → bật «Tự động».</Chu>
        <Chu co={15} mau={M.chu2}>Giờ đúng lại thì trò chơi tự mở trong vài phút.</Chu>
        <Nut chu="Đã hiểu" rong bam={() => setHuongDan(false)} />
      </BangTruot>
    </ManTre>
  );
}
