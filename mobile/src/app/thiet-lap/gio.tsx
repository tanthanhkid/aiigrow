// bm-ob-gio (bước 5/5) — biến thể appllama: giờ giải trí ngày thường / cuối tuần, giờ ngủ = DateTimePicker native (compact, bánh xe giờ
// của iOS), trần mỗi ngày = SegmentedControl native. Lưu và gửi xuống máy Con (FR-02.04, 02.05). Lưu xong ⇒ replace sang Xong.
import { useState } from "react";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { bm, type Khung as KhungGio, type Lich } from "@/lib/api";
import { layTl } from "@/lib/thiet-lap";
import { useLam } from "@/lib/ui";
import { C, Ch, haptic, Hang, Khung, LoiTaiCho, Nhom, NutChinh, OIcon, TienDo, TieuDe, useMauChuoi , Seg } from "@/lib/ob";

const MD: Lich = { ngayThuong: [{ tu: "17:00", den: "20:00" }], cuoiTuan: [{ tu: "09:00", den: "21:00" }], ngu: { tu: "21:00", den: "06:30" } };
type Sua = "ngayThuong" | "cuoiTuan" | "ngu";
const TRAN = [60, 90, 120] as const;
const raNgay = (hm: string) => { const [h, m] = hm.split(":").map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d; };
const raChu = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

function ChonGio({ gia, doi, nhan }: { gia: string; doi: (v: string) => void; nhan: string }) {
  const { nhan: mauNhan } = useMauChuoi();
  return (
    <DateTimePicker value={raNgay(gia)} mode="time" display="compact" minuteInterval={5} locale="vi-VN" accentColor={mauNhan} accessibilityLabel={nhan}
      onChange={(e, d) => { if (e.type === "set" && d) { haptic.chon(); doi(raChu(d)); } }} />
  );
}

export default function ObGio() {
  const tl = layTl();
  const [lich, setLich] = useState<Lich>(MD);
  const [tran, setTran] = useState<(typeof TRAN)[number]>(90);
  const { lam, loi, dangChay } = useLam();
  const k = (x: Sua): KhungGio => (x === "ngu" ? lich.ngu : lich[x][0]);
  const dat = (x: Sua, dau: "tu" | "den", v: string) => setLich((l) => {
    const moi = { ...k(x), [dau]: v };
    return x === "ngu" ? { ...l, ngu: moi } : { ...l, [x]: [moi] };
  });
  const luu = () => lam(async () => {
    if (!tl.conId) throw new Error("Chưa biết đặt giờ cho Con nào — mở hồ sơ Con rồi đặt giờ ở mục Giờ chơi.");
    await bm.goi(`con/${tl.conId}/lich`, lich);
    await bm.goi(`con/${tl.conId}/cau-hinh`, { tran_ngay: tran });
    haptic.ok();
    router.replace("/thiet-lap/xong");
  }, { hangDoi: true });
  const ten = tl.tenCon ?? "Con";
  const hang = (x: Sua, ic: string, tieu: string) => (
    <Hang key={x} trai={<OIcon ten={ic} />} tieu={tieu} a11y={`${tieu} từ ${k(x).tu} đến ${k(x).den}`}
      phai={<View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        <ChonGio nhan={`${tieu}, bắt đầu`} gia={k(x).tu} doi={(v) => dat(x, "tu", v)} />
        <Ch k="body" mau={C.chu3}>–</Ch>
        <ChonGio nhan={`${tieu}, kết thúc`} gia={k(x).den} doi={(v) => dat(x, "den", v)} />
      </View>} />
  );
  return (
    <Khung dau={<TienDo n={5} tong={5} />} day={<NutChinh chu={`Lưu và gửi xuống máy ${ten}`} dangChay={dangChay} bam={luu} />}>
      <StatusBar style="auto" />
      <TieuDe tieu={`Khi nào ${ten} được chơi?`} loi="Ngoài giờ này, có điểm cũng không mở được." />
      <Nhom tieu="Khung giờ" chuThich="Giờ đi ngủ khoá mọi trò chơi.">
        {hang("ngayThuong", "calendar", "Ngày thường")}
        {hang("cuoiTuan", "sun.max.fill", "Cuối tuần")}
        {hang("ngu", "moon.fill", "Đi ngủ")}
      </Nhom>
      <Nhom tieu="Trần giải trí mỗi ngày" chuThich="Tuần: tối đa 420 phút · tính gộp mọi máy.">
        <View style={{ padding: 12 }}>
          <Seg values={TRAN.map((p) => `${p} phút`)} selectedIndex={TRAN.indexOf(tran)} style={{ height: 36 }}
            onChange={(e) => { haptic.chon(); setTran(TRAN[e.nativeEvent.selectedSegmentIndex]); }} />
        </View>
      </Nhom>
      <LoiTaiCho loi={loi} />
    </Khung>
  );
}
