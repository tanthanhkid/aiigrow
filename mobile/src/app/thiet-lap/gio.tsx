// bm-ob-gio (bước 5/5): giờ giải trí ngày thường / cuối tuần, giờ ngủ, trần mỗi ngày (FR-02.04, 02.05) — lưu và gửi xuống máy Con.
import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { bm, type Khung, type Lich } from "@/lib/api";
import { layTl } from "@/lib/thiet-lap";
import { SuaKhung } from "@/lib/sua-gio";
import { BaoLoi, BieuTron, Buoc, Canh, Chu, Dong, M, Man, Nhan, Nhom, Nut, The, Tien, useLam } from "@/lib/ui";

const MD: Lich = { ngayThuong: [{ tu: "17:00", den: "20:00" }], cuoiTuan: [{ tu: "09:00", den: "21:00" }], ngu: { tu: "21:00", den: "06:30" } };
type Sua = "ngayThuong" | "cuoiTuan" | "ngu";

export default function ObGio() {
  const tl = layTl();
  const [lich, setLich] = useState<Lich>(MD);
  const [tran, setTran] = useState(90);
  const [sua, setSua] = useState<Sua | null>(null);
  const { lam, loi, dangChay } = useLam();
  const k = (x: Sua): Khung => (x === "ngu" ? lich.ngu : lich[x][0]);
  const luu = () => lam(async () => {
    if (tl.conId) {
      await bm.goi(`con/${tl.conId}/lich`, lich);
      await bm.goi(`con/${tl.conId}/cau-hinh`, { tran_ngay: tran });
    }
    router.push("/thiet-lap/xong");
  }, { hangDoi: true });
  const ten = tl.tenCon ?? "Con";
  return (
    <Man dau={<Buoc n={5} tong={5} nhan="Bước 5/5 · Giờ chơi" />} day={<><BaoLoi loi={loi} /><Nut chu={`Lưu và gửi xuống máy ${ten}`} rong dangChay={dangChay} bam={luu} /></>}>
      <Canh lv="cho" thap tieu={`Khi nào ${ten} được chơi?`} loi="Ngoài giờ này, có điểm cũng không mở được." />
      <Nhom>
        <Dong dau tieu="Giờ giải trí ngày thường" phu={`${k("ngayThuong").tu} – ${k("ngayThuong").den}`} trai={<BieuTron ic="dongho" />} phai={<Nhan chu="Sửa" />} bam={() => setSua("ngayThuong")} />
        <Dong tieu="Giờ giải trí cuối tuần" phu={`${k("cuoiTuan").tu} – ${k("cuoiTuan").den}`} trai={<BieuTron ic="lich" />} phai={<Nhan chu="Sửa" />} bam={() => setSua("cuoiTuan")} />
        <Dong tieu="Giờ đi ngủ" phu={`${lich.ngu.tu} – ${lich.ngu.den} · khoá mọi trò chơi`} trai={<BieuTron ic="trang_ngu" mau="tim" />} phai={<Nhan chu="Sửa" />} bam={() => setSua("ngu")} />
      </Nhom>
      <The dem>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <Chu kieu="rat">Trần giải trí mỗi ngày</Chu>
          <Chu kieu="rat" co={22} so>{`${tran} phút`}</Chu>
        </View>
        <View style={{ marginVertical: 10 }}><Tien ti={tran / 180} /></View>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {[60, 90, 120].map((p) => <Nut key={p} nho loai={p === tran ? "chinh" : "vien"} chu={`${p} phút`} bam={() => setTran(p)} />)}
        </View>
        <Chu co={13} mau={M.chu3} style={{ marginTop: 8 }}>Tuần: tối đa 420 phút · tính gộp mọi máy</Chu>
      </The>
      {sua ? <SuaKhung mo tieu={sua === "ngu" ? "Giờ đi ngủ" : sua === "ngayThuong" ? "Giờ chơi ngày thường" : "Giờ chơi cuối tuần"} khung={k(sua)} dong={() => setSua(null)}
        luu={(x) => setLich((l) => (sua === "ngu" ? { ...l, ngu: x } : { ...l, [sua]: [x] }))} /> : null}
    </Man>
  );
}
