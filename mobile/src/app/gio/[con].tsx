// bm2-gio «Giờ chơi của <Con>» (thiết kế chốt 14/11, bm-gio-ho-so/01): thẻ HÔM NAY (Còn N phút trong M phút · vạch · Đã dùng / Còn),
// «Mỗi ngày chơi bao lâu?» 2 hàng nút −/+ 15 phút (Thứ 2 – Thứ 6 · Thứ 7, CN; hàng của hôm nay ghi «Hôm nay áp mức này»),
// Nút «Lưu giờ chơi». (15/11 #262: bỏ khối Giờ ngủ / câu Giờ học.)
// N3: một QUỸ giờ chơi chung mọi máy, mọi app «Tính giờ» — không có phút riêng từng app.
// Đã chọn GIỮ «Khi hết giờ» (cho xin thêm giờ / cho tự đổi sao) dạng gọn cuối màn dù thiết kế 14/11 bỏ: thiết kế không nói tắt ⇒ giữ hành vi,
// và nhà đã tắt thì không còn chỗ bật lại. Giờ học đặt ở Hồ sơ con (dòng «Giờ học») như thiết kế. Người trông giúp: chỉ xem (máy chủ 403 khi lưu).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type ConChiTiet } from "@/lib/api";
import { BONG, KHOI } from "@/lib/clay";
import { CAU_TRONG_GIUP, HangViec, quyenToi, type GioChoi } from "@/lib/hang-ngay";
import { BaoLoi, baoKhiVe, ChoTai, Chu, CongTac, Icon, Icon3D, M, Man, Nut, The, useLam, useTai } from "@/lib/ui";

const THU_DAI = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
// giới hạn như máy chủ (server/lib/cau-hinh.ts): quy_ngay_thuong 0–600, quy_cuoi_tuan 0–720
const BUOC = 15, MIN = 0, MAX_THUONG = 600, MAX_CUOI = 720;
/** ± bám bội 15: 50 → «−» 45, «+» 60 (không thành 35 / 65). */
const giam = (p: number) => Math.max(MIN, Math.ceil(p / BUOC) * BUOC - BUOC);
const tang = (p: number, max: number) => Math.min(max, Math.floor(p / BUOC) * BUOC + BUOC);

/** Nút tròn lõm −/+ (thiết kế `.st`). */
function NutSo({ ic, bam, tat, nhan }: { ic: "tru" | "cong"; bam: () => void; tat?: boolean; nhan: string }) {
  return (
    <Pressable onPress={bam} disabled={tat} accessibilityRole="button" accessibilityLabel={nhan} hitSlop={4}
      style={({ pressed }) => [{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#ecebe7", boxShadow: BONG.lom, alignItems: "center", justifyContent: "center",
        opacity: tat ? 0.4 : pressed ? 0.7 : 1 }]}>
      <Icon ten={ic} co={18} mau={M.chinhInk} />
    </Pressable>
  );
}

/** Hàng «Thứ 2 – Thứ 6: 60 phút» + dòng nhỏ + nút −/+. */
function HangQuy({ tieu, phut, phu, nay, doi, xem, dau, max }: { tieu: string; phut: number; phu: string; nay?: boolean; doi: (p: number) => void; xem?: boolean; dau?: boolean; max: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 64, borderTopWidth: dau ? 0 : 1.5, borderTopColor: "#ecebe7" }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={15} so>{`${tieu}: ${phut} phút`}</Chu>
        <Chu kieu={nay ? "rat" : "dam"} co={12.5} mau={nay ? M.chinhInk : M.chu2}>{phu}</Chu>
      </View>
      {xem ? null : <>
        <NutSo ic="tru" nhan={`Giảm ${BUOC} phút ${tieu}`} tat={phut <= MIN} bam={() => doi(giam(phut))} />
        <NutSo ic="cong" nhan={`Tăng ${BUOC} phút ${tieu}`} tat={phut >= max} bam={() => doi(tang(phut, max))} />
      </>}
    </View>
  );
}

export default function GioChoiCon() {
  const { con } = useLocalSearchParams<{ con: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [g, c, q] = await Promise.all([bm.goi<GioChoi>(`con/${con}/gio-choi`), bm.goi<ConChiTiet>(`con/${con}`), quyenToi()]);
    return { g, ten: c.ten, trongGiup: q === "trong_giup" };
  });
  const [thuong, setThuong] = useState<number | null>(null);
  const [cuoi, setCuoi] = useState<number | null>(null);
  const [xin, setXin] = useState<boolean | null>(null);
  const [doiSao, setDoiSao] = useState<boolean | null>(null);
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Hồ sơ con" }} tieu="Giờ chơi"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const g = d.g, nay = g.homNay;
  const t = thuong ?? g.quyNgayThuong, cn = cuoi ?? g.quyCuoiTuan;
  const x = xin ?? g.choXinThemGio, ds = doiSao ?? g.doiSaoBat;
  const xem = d.trongGiup;
  const cuoiTuan = nay?.cuoiTuan ?? [0, 6].includes(new Date().getDay());
  const tong = nay?.tongPhut ?? (cuoiTuan ? g.quyCuoiTuan : g.quyNgayThuong);
  const daDung = nay?.daDung ?? 0, con0 = nay?.conPhut ?? Math.max(0, tong - daDung);
  const ti = tong > 0 ? Math.min(1, daDung / tong) : 1;
  const luu = () => lam(async () => {
    await bm.goi(`con/${con}/gio-choi`, { quyNgayThuong: t, quyCuoiTuan: cn, choXinThemGio: x, doiSaoBat: ds });
    baoKhiVe(`Đã lưu giờ chơi cho ${d.ten} — máy nhận ở lần đồng bộ kế`);
    router.back();
  }, { hangDoi: true });
  return (
    <Man lui={{ chu: "Hồ sơ con" }} tieu={`Giờ chơi của ${d.ten}`} tai={tai} day={xem ? <Chu co={13.5} mau={M.chu3}>{CAU_TRONG_GIUP}</Chu> : <>
      <BaoLoi loi={loiLam} />
      <Nut chu="Lưu giờ chơi" rong dangChay={dangChay} bam={luu} />
    </>}>
      {/* thẻ hôm nay (.quy) — lề thẻ 16 (cổng LE-THE: icon cách mép ≥ 15.5) */}
      <View style={[{ padding: 16, borderRadius: 28, backgroundColor: M.chinhSoft, gap: 4 }, KHOI.the]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon3D ten="dongho" co={24} mau={M.chinhInk} />
          <Chu kieu="dam" co={13.5} mau={M.chu2}>{`Hôm nay · ${THU_DAI[new Date().getDay()]}`}</Chu>
        </View>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <Chu kieu="rat" co={26} so mau={M.chinhInk}>{`Còn ${con0} phút`}</Chu>
          <Chu kieu="dam" co={14} mau={M.chu2}>{`trong ${tong} phút`}</Chu>
        </View>
        <View accessibilityLabel={`Đã dùng ${daDung} trên ${tong} phút`} style={{ marginTop: 6, height: 10, borderRadius: 5, backgroundColor: "#e3e2de", boxShadow: BONG.lom, overflow: "hidden" }}>
          <View style={{ width: `${Math.round(ti * 100)}%`, height: "100%", borderRadius: 5, backgroundColor: M.chinh }} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
          <Chu kieu="dam" co={12.5} mau={M.chu2}>Đã dùng <Chu kieu="rat" co={12.5} mau={M.chinhInk}>{`${daDung} phút`}</Chu></Chu>
          <Chu kieu="dam" co={12.5} mau={M.chu2}>Còn <Chu kieu="rat" co={12.5} mau={M.chinhInk}>{`${con0} phút`}</Chu></Chu>
        </View>
      </View>

      <Chu kieu="rat" co={17} style={{ marginTop: 6, marginHorizontal: 4 }}>Mỗi ngày chơi bao lâu?</Chu>
      <The dem style={{ paddingVertical: 4 }}>
        <HangQuy dau tieu="Thứ 2 – Thứ 6" max={MAX_THUONG} phut={t} doi={setThuong} xem={xem} nay={!cuoiTuan} phu={!cuoiTuan ? "Hôm nay áp mức này" : "Ngày đi học"} />
        <HangQuy tieu="Thứ 7, CN" max={MAX_CUOI} phut={cn} doi={setCuoi} xem={xem} nay={cuoiTuan}
          phu={cuoiTuan ? "Hôm nay áp mức này" : cn > t ? "Cuối tuần chơi thêm" : cn < t ? "Cuối tuần chơi ít hơn" : "Bằng ngày thường"} />
      </The>

      <Chu kieu="rat" co={15} mau={M.chu2} style={{ marginTop: 6, marginHorizontal: 4 }}>Khi hết giờ</Chu>
      <The dem style={{ paddingVertical: 4 }}>
        <HangViec dau ic="tin" mau="cam" tieu="Cho con xin thêm giờ" phu="Điện thoại Ba Mẹ sẽ báo"
          phai={<CongTac bat={x} doi={(v) => !xem && setXin(v)} nhan="Cho con xin thêm giờ" />} />
        <HangViec ic="sao" mau="vang" tieu="Cho con tự đổi sao" phu={`10 sao = ${g.phut10Sao} phút · tối đa ${g.doiSaoToiDaNgay} phút mỗi ngày`}
          phai={<CongTac bat={ds} doi={(v) => !xem && setDoiSao(v)} nhan="Cho con tự đổi sao" />} />
      </The>
    </Man>
  );
}
