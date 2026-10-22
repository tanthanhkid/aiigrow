// bm-vi: ví điểm của Con (FR-03.05) — số dư (Con và Ba Mẹ thấy cùng một số), chờ duyệt, cấp độ, chuỗi ngày, kiếm/tiêu tuần, lịch sử;
// «± Điều chỉnh» tay phải kèm lý do (tính vào ngoại lệ). «Giữ chuỗi ngày» = đóng băng streak 1 lần/tuần (FR-03.06).
import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type Diem } from "@/lib/api";
import {
  BangTruot, BaoLoi, BieuTron, Canh, CanhGiua, ChoTai, ChonMot, Chu, Dong, gioPhut, Luoi2, M, Man, Nhan, Nhom, NhomTieu, Nut, ONhap, OSo,
  useHoanTac, useLam, useTai, type TenIcon, type MauBt,
} from "@/lib/ui";

type Vi = { soDu: number; diemChoDuyet: number; tongKiem: number; capDo: { cap: number }; lichSu: Diem[] };
type TT = { chuoiNgay: number; dongBang?: { ngay: string | null; duocDung: boolean; daDung: string[] } };
const ngayNgan = (n: string) => n.split("-").reverse().slice(0, 2).join("/");
const IC: Record<string, [TenIcon, MauBt]> = { nhiem_vu: ["sao", "xanh"], phien: ["game", "vang"], doi_qua: ["qua", "cam"], voucher: ["coc", "cam"],
  hoan: ["tro_lai", "lam"], tay: ["but", "tim"], chao_mung: ["cuoi", "vang"], ngoai_le: ["qua", "cam"] };

export default function ViCon() {
  const { con } = useLocalSearchParams<{ con: string }>();
  const { d, loi, matMang, tai } = useTai(async () => ({
    bay: Date.now(), vi: await bm.goi<Vi>(`con/${con}/vi`), tt: await bm.goi<TT>(`con/${con}/thanh-tich`), c: await bm.goi<{ ten: string }>(`con/${con}`),
  }));
  const [mo, setMo] = useState(false);
  const [giu, setGiu] = useState(false);
  const [dau, setDau] = useState<1 | -1>(1);
  const [so, setSo] = useState("10");
  const [lyDo, setLyDo] = useState("");
  const { lam, loi: loiLam, dangChay } = useLam();
  const { bao, noi } = useHoanTac();
  if (!d) return <Man lui={{ chu: "Hôm nay" }} tieu="Ví điểm"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const tuan = d.vi.lichSu.filter((x) => d.bay - new Date(x.created_at).getTime() < 7 * 86_400_000);
  const kiem = tuan.filter((x) => x.delta > 0).reduce((a, x) => a + x.delta, 0), tieu = tuan.filter((x) => x.delta < 0).reduce((a, x) => a + x.delta, 0);
  const luu = () => lam(async () => {
    await bm.goi(`con/${con}/diem`, { delta: dau * Number(so), lyDo });
    setMo(false);
    bao(`Đã ${dau > 0 ? "cộng" : "trừ"} ${so} điểm cho ${d.c.ten}`);
    setLyDo("");
    await tai();
  });
  return (
    <Man lui={{ chu: "Hôm nay" }} tieu={`Ví của ${d.c.ten}`} noi={noi}
      phai={<Pressable onPress={() => setMo(true)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}><Nhan chu="± Điều chỉnh" /></Pressable>}>
      <Canh lv="canh-diem" mau="vang" tieu={`${d.c.ten} có ${d.vi.soDu} điểm`} loi={`${d.vi.diemChoDuyet} điểm đang chờ duyệt · cấp ${d.vi.capDo.cap}.`}>
        {d.tt.chuoiNgay ? <Nhan loai="diem" ic="lua" chu={`Chuỗi ${d.tt.chuoiNgay} ngày`} /> : null}
      </Canh>
      <Luoi2>
        <OSo nho="Tuần này kiếm" so={`+${kiem}`} />
        <OSo nho="Tuần này tiêu" so={`${tieu ? "−" : ""}${Math.abs(tieu)}`} />
      </Luoi2>
      {d.tt.dongBang?.ngay ? (
        <Nhom>
          <Dong dau tieu="Giữ chuỗi ngày" trai={<BieuTron ic="lua" mau="vang" />}
            phu={d.tt.dongBang.duocDung ? `Con nghỉ ${ngayNgan(d.tt.dongBang.ngay)} vẫn không đứt chuỗi · 1 lần mỗi tuần` : "Tuần này đã giữ chuỗi một lần rồi"}
            phai={d.tt.dongBang.duocDung ? <Nhan chu="Giữ" /> : <Nhan chu="Đã dùng" loai="xam" />}
            bam={d.tt.dongBang.duocDung ? () => setGiu(true) : undefined} />
        </Nhom>
      ) : null}
      <NhomTieu chu="Lịch sử" />
      {d.vi.lichSu.length ? (
        <Nhom>
          {d.vi.lichSu.slice(0, 40).map((x, i) => {
            const [ic, mau] = IC[x.loai] ?? ["xu", "vang"];
            return <Dong key={i} dau={i === 0} tieu={x.ly_do} phu={gioPhut(x.created_at)} trai={<BieuTron ic={ic} mau={mau} />}
              phai={<Chu kieu="rat" so mau={x.delta > 0 ? M.chinh : M.chu}>{`${x.delta > 0 ? "+" : "−"}${Math.abs(x.delta)}`}</Chu>} />;
          })}
        </Nhom>
      ) : <CanhGiua lv="canh-trong" tieu={`Ví của ${d.c.ten} còn trống`} loi="Điểm đầu tiên đến khi Con làm nhiệm vụ đầu tiên." />}
      <BangTruot mo={giu} dong={() => setGiu(false)} tieu={`Giữ chuỗi ngày của ${d.c.ten}?`}>
        <Chu mau={M.chu2}>{`Ngày ${ngayNgan(d.tt.dongBang?.ngay ?? "")} không có nhiệm vụ nào cũng không làm đứt chuỗi ${d.tt.chuoiNgay} ngày. Mỗi tuần giữ được một lần; không cộng điểm.`}</Chu>
        <BaoLoi loi={loiLam} />
        <Nut chu="Giữ chuỗi ngày" ic="lua" rong dangChay={dangChay} bam={() => lam(async () => {
          await bm.goi(`con/${con}/dong-bang-chuoi`, {}); setGiu(false); bao(`Đã giữ chuỗi ngày của ${d.c.ten}`); await tai();
        })} />
      </BangTruot>
      <BangTruot mo={mo} dong={() => setMo(false)} tieu={`Điều chỉnh điểm của ${d.c.ten}`}>
        <ChonMot ds={[{ gia: 1 as const, chu: "Cộng điểm" }, { gia: -1 as const, chu: "Trừ điểm" }]} gia={dau} doi={setDau} />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ width: 120 }}><ONhap nhan="Số điểm" value={so} onChangeText={(t) => setSo(t.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><ONhap nhan="Lý do" value={lyDo} onChangeText={setLyDo} placeholder={dau > 0 ? "Thưởng sinh nhật" : "Nói dối"} maxLength={120} /></View>
        </View>
        <Chu co={13} mau={M.chu3}>Mọi điều chỉnh tay được ghi nhật ký và tính vào thống kê ngoại lệ.</Chu>
        <BaoLoi loi={loiLam} />
        <Nut chu={`${dau > 0 ? "Cộng" : "Trừ"} ${so || 0} điểm`} rong dangChay={dangChay} tat={!lyDo.trim() || !(Number(so) >= 1)} bam={luu} />
      </BangTruot>
    </Man>
  );
}
