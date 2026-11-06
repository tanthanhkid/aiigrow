// them-z2fyhohj «PIN vào máy» (thiết kế chốt 06/11, L13): thẻ «PIN của Bảo Anh · Đặt lần cuối 06/11» (ổ khoá góc trên phải), «PIN đang dùng» ẩn/hiện,
// «Đặt PIN mới» 4 ô, «Lưu xong, Bảo Anh dùng PIN mới trên mọi máy.», «Lưu PIN mới». GET / POST con/:id/pin (docs/API.md «S3»).
// Đường /ho-so/<con>/pin cũng là `den` của mục «quên PIN» trong «Cần Ba Mẹ để ý». Người trông giúp: chỉ xem (máy chủ 403 khi đặt).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm } from "@/lib/api";
import { CAU_TRONG_GIUP, quyenToi, type ConCt } from "@/lib/hang-ngay";
import { Anh3D, mauHoSo } from "@/lib/lan-dau";
import { cauDatPin, kiemPin, type PinCon } from "@/lib/s3";
import { Avt, BaoLoi, baoKhiVe, ChoTai, Chu, Icon, M, Man, Nut, Rob, The, useLam, useTai } from "@/lib/ui";
import { OPin } from "@/lib/ui-s3";

export default function PinCuaCon() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [p, con, quyen] = await Promise.all([bm.goi<PinCon>(`con/${id}/pin`), bm.goi<ConCt>(`con/${id}`).catch(() => null), quyenToi()]);
    return { p, con, xem: quyen === "trong_giup" };
  });
  const [hien, setHien] = useState(false);
  const [moi, setMoi] = useState("");
  const { lam, loi: loiLam, dangChay } = useLam();
  const tieu = "PIN vào máy";
  if (!d) return <Man lui={{ chu: "Hồ sơ con" }} tieu={tieu}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const ten = d.p.ten;
  const loiPin = moi ? kiemPin(moi, null, d.con?.namSinh) : null;
  const luu = () => lam(async () => {
    await bm.goi(`con/${id}/pin`, { pin: moi });
    baoKhiVe(`Đã lưu PIN mới cho ${ten}`);
    if (router.canGoBack()) router.back(); else router.replace(`/ho-so/${id}` as never);
  });
  return (
    <Man lui={{ chu: "Hồ sơ con", ve: `/ho-so/${id}` }} tieu={tieu}
      day={d.xem ? undefined : <><BaoLoi loi={loiLam} /><Nut chu={d.p.coPin ? "Lưu PIN mới" : `Đặt PIN cho ${ten}`} rong dangChay={dangChay} tat={moi.length !== 4 || !!loiPin} bam={luu} /></>}>
      {/* thẻ màu của con (như thẻ hồ sơ Lần đầu): ảnh chữ cái to, «PIN của X», nhãn «Đặt lần cuối», ổ khoá nhỏ góc trên phải */}
      <The dem style={{ gap: 10, minHeight: 150, backgroundColor: mauHoSo(d.con?.avatar)[1] }}>
        <Avt ten={ten} mau={mauHoSo(d.con?.avatar)[0]} co={72} />
        <Chu kieu="rat" co={22} style={{ paddingRight: 44 }}>{`PIN của ${ten}`}</Chu>
        <View style={{ alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.75)" }}>
          <Chu kieu="rat" co={12.5} mau={M.chu2}>{cauDatPin(d.p.pinDatLuc)}</Chu>
        </View>
        <View style={{ position: "absolute", right: 14, top: 12 }}><Anh3D ten="khoa" co={30} /></View>
      </The>

      {/* Người trông giúp không xem PIN của bé (chỉ Ba Mẹ đặt / xem) */}
      {d.p.coPin && !d.xem ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 4 }}>
            <Chu kieu="rat" co={15}>PIN đang dùng</Chu>
            <Pressable onPress={() => setHien((x) => !x)} accessibilityRole="button" hitSlop={8} style={{ minHeight: 40, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Icon ten="mat" co={18} mau={M.chinhInk} /><Chu kieu="rat" co={14} mau={M.chinhInk}>{hien ? "Ẩn" : "Hiện"}</Chu>
            </Pressable>
          </View>
          <OPin gia={d.p.pin ?? "••••"} an={!hien} nhan={hien && d.p.pin ? `PIN ${d.p.pin.split("").join(" ")}` : "PIN đang ẩn"} />
        </View>
      ) : d.xem ? null : (
        <Chu co={14} mau={M.chu2} style={{ marginHorizontal: 4 }}>{`${ten} chưa có PIN — trên máy dùng chung, chạm tên là vào thẳng. Đặt PIN để chỉ ${ten} vào được.`}</Chu>
      )}

      {d.xem ? <Chu co={13.5} mau={M.chu3} style={{ marginHorizontal: 4 }}>{CAU_TRONG_GIUP}</Chu> : (
        <View style={{ gap: 8 }}>
          <Chu kieu="rat" co={15} style={{ paddingHorizontal: 4 }}>{d.p.coPin ? "Đặt PIN mới" : "PIN 4 số"}</Chu>
          <OPin gia={moi} doi={setMoi} nhan="Đặt PIN mới 4 số" />
          {loiPin && moi.length === 4 ? <Chu kieu="dam" co={13} mau={M.loi}>{loiPin}</Chu> : null}
        </View>
      )}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, backgroundColor: M.chinhSoft }}>
        <Rob ten="chi" co={40} />
        <Chu kieu="dam" co={13.5} mau={M.chinhInk} style={{ flex: 1 }}>{`Lưu xong, ${ten} dùng PIN mới trên mọi máy.`}</Chu>
      </View>
    </Man>
  );
}
