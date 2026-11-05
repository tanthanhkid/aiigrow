// bm2-gio «Giờ chơi của <Con>» (thiết kế chốt 05/11, bm-hang-ngay/12 — L2): quỹ phút ngày thường (ô số + chip 30/60/90), tỷ lệ sao đổi phút,
// giờ máy tự khoá (giờ ngủ, giờ học — màn riêng), ngày nghỉ T7–CN, «Khi hết giờ» (cho xin thêm giờ, cho tự đổi sao). Lưu = POST con/:id/gio-choi.
// Khoá máy / Cho thêm giờ nằm ở Hôm nay. Người trông giúp: chỉ xem (máy chủ trả 403 khi lưu).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { TextInput, View } from "react-native";
import { bm, type ConChiTiet } from "@/lib/api";
import { BONG, KHOI } from "@/lib/clay";
import { CAU_TRONG_GIUP, cauThu, gioGon, HangViec, quyenToi, type GioChoi } from "@/lib/hang-ngay";
import { BaoLoi, baoKhiVe, ChoTai, Chu, ChonMot, CongTac, F, Icon3D, M, Man, Nut, The, useLam, useTai } from "@/lib/ui";

/** Ô nhập số phút (thiết kế: ô lõm «60» + chữ «phút»). */
function OPhut({ gia, doi, nhan, tat }: { gia: string; doi: (v: string) => void; nhan: string; tat?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <TextInput value={gia} onChangeText={(t) => doi(t.replace(/\D/g, "").slice(0, 3))} keyboardType="number-pad" editable={!tat} accessibilityLabel={nhan}
        style={{ width: 76, minHeight: 48, borderRadius: 16, backgroundColor: "#fff", borderWidth: 1.5, borderColor: M.oNhap, boxShadow: BONG.lom, textAlign: "center",
          fontFamily: F.rat, fontSize: 22, color: M.chu }} />
      <Chu kieu="dam" co={15} mau={M.chu2}>phút</Chu>
    </View>
  );
}

export default function GioChoiCon() {
  const { con } = useLocalSearchParams<{ con: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [g, c, q] = await Promise.all([bm.goi<GioChoi>(`con/${con}/gio-choi`), bm.goi<ConChiTiet>(`con/${con}`), quyenToi()]);
    return { g, ten: c.ten, trongGiup: q === "trong_giup" };
  });
  const [thuong, setThuong] = useState<string | null>(null);
  const [cuoi, setCuoi] = useState<string | null>(null);
  const [xin, setXin] = useState<boolean | null>(null);
  const [doiSao, setDoiSao] = useState<boolean | null>(null);
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Hồ sơ con" }} tieu="Giờ chơi"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const g = d.g;
  const t = thuong ?? String(g.quyNgayThuong), cn = cuoi ?? String(g.quyCuoiTuan);
  const x = xin ?? g.choXinThemGio, ds = doiSao ?? g.doiSaoBat;
  const xem = d.trongGiup;
  const luu = () => lam(async () => {
    await bm.goi(`con/${con}/gio-choi`, { quyNgayThuong: t, quyCuoiTuan: cn, choXinThemGio: x, doiSaoBat: ds });
    baoKhiVe(`Đã lưu giờ chơi cho ${d.ten} — máy nhận ở lần đồng bộ kế`);
    router.back();
  }, { hangDoi: true });
  return (
    <Man lui={{ chu: "Hồ sơ con" }} tieu={`Giờ chơi của ${d.ten}`} tai={tai} day={xem ? <Chu co={13.5} mau={M.chu3}>{CAU_TRONG_GIUP}</Chu> : <>
      <BaoLoi loi={loiLam} />
      <Nut chu={`Lưu giờ chơi cho ${d.ten}`} rong dangChay={dangChay} tat={!t || !cn} bam={luu} />
    </>}>
      <The dem style={{ gap: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Chu kieu="rat" co={16} style={{ flex: 1 }}>Ngày thường được chơi</Chu>
          <OPhut gia={t} doi={setThuong} nhan="Phút chơi ngày thường" tat={xem} />
        </View>
        {xem ? null : <ChonMot ds={[30, 60, 90].map((p) => ({ gia: String(p), chu: String(p) }))} gia={t} doi={setThuong} />}
        <Chu co={13.5} mau={M.chu3}>Hết giờ, máy tự khoá app chơi. App học không tính giờ.</Chu>
      </The>

      <View style={[{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 26, backgroundColor: M.diemSoft }, KHOI.vien]}>
        <Icon3D ten="sao" co={34} mau={M.diemInk} />
        <View style={{ flex: 1 }}>
          <Chu kieu="rat" co={18} mau={M.diemInk}>{`10 sao = ${g.phut10Sao} phút`}</Chu>
          <Chu co={13.5} mau={M.diemInk}>Làm nhiệm vụ được sao, đổi ra phút chơi</Chu>
        </View>
      </View>

      <Chu kieu="rat" co={17} style={{ marginTop: 6, marginHorizontal: 4 }}>Giờ máy tự khoá</Chu>
      <The dem style={{ paddingVertical: 4 }}>
        <HangViec dau ic="trang_ngu" mau="tim" tieu="Giờ ngủ" phu={`${gioGon(g.gioNgu.tu)} – ${gioGon(g.gioNgu.den)} · mỗi ngày`}
          bam={() => router.push(`/gio/ngu?con=${con}` as never)} />
        <HangViec ic="mu" mau="xanh" tieu="Giờ học, chỉ mở app học" phu={g.gioHoc ? `${gioGon(g.gioHoc.tu)} – ${gioGon(g.gioHoc.den)} · ${cauThu(g.gioHoc.thu)}` : "Chưa đặt"}
          bam={() => router.push(`/gio/hoc?con=${con}` as never)} />
      </The>

      <Chu kieu="rat" co={17} style={{ marginTop: 6, marginHorizontal: 4 }}>Ngày nghỉ</Chu>
      <The dem style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Chu kieu="rat" co={15.5}>Thứ 7, Chủ nhật chơi</Chu>
          <Chu co={13.5} mau={M.chu3}>{Number(cn) > Number(t) ? "Nhiều hơn ngày thường" : Number(cn) < Number(t) ? "Ít hơn ngày thường" : "Bằng ngày thường"}</Chu>
        </View>
        <OPhut gia={cn} doi={setCuoi} nhan="Phút chơi Thứ 7, Chủ nhật" tat={xem} />
      </The>

      <Chu kieu="rat" co={17} style={{ marginTop: 6, marginHorizontal: 4 }}>Khi hết giờ</Chu>
      <The dem style={{ paddingVertical: 4 }}>
        <HangViec dau ic="tin" mau="cam" tieu="Cho con xin thêm giờ" phu="Điện thoại Ba Mẹ sẽ báo"
          phai={<CongTac bat={x} doi={(v) => !xem && setXin(v)} nhan="Cho con xin thêm giờ" />} />
        <HangViec ic="sao" mau="vang" tieu="Cho con tự đổi sao" phu={`Tối đa ${g.doiSaoToiDaNgay} phút mỗi ngày`}
          phai={<CongTac bat={ds} doi={(v) => !xem && setDoiSao(v)} nhan="Cho con tự đổi sao" />} />
      </The>
    </Man>
  );
}
