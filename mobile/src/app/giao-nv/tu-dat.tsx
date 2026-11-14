// «Ba Mẹ tự thêm» (thiết kế 14/11 bm-viec-duyet/04 them-6pjz1stu — thay «Tự đặt việc» them-0qial10f): Con sẽ làm gì? (ô lõm + gợi ý),
// Hình (6 ô), Nằm trong mục (Học · Vận động · Giúp Ba Mẹ), Con nhận ⭐5/10/15/20, Con nộp bằng (Chụp ảnh · Ghi âm · Bấm «Xong», mỗi cách có ví dụ),
// ghi chú «Con nộp xong, Ba Mẹ nhận thông báo. Ba Mẹ duyệt thì con mới nhận sao.» ⇒ «Thêm vào mục đã chọn» = POST nhiem-vu {…, bo: mục, giao_cho: id[]}.
// Mở từ «Giao việc» (mục đang xem chọn sẵn) hoặc từ Nhiệm vụ trống. Nhà > 1 con ⇒ «Áp cho» (N9), con đang xem chọn sẵn.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { BONG } from "@/lib/clay";
import { BaoLoi, baoKhiVe, Chips, ChoTai, Chu, Icon3D, M, Man, Nut, ONhap, The, useLam, useTai, type TenIcon } from "@/lib/ui";
import { hinhNv } from "@/lib/hang-ngay";
import { tenHopLe } from "@/lib/form-viec";
import { ChonO, OLomIcon } from "@/lib/ui-viec";
import { MucTieu } from "@/lib/ui-bm3";

const GOI_Y = ["Tưới cây", "Tập đàn 15 phút", "Cho cún ăn", "Vẽ 1 bức tranh", "Tự tắm"];
const HINH = ["choi", "sach", "day", "but", "cay", "bat"];
type Muc = "hoc" | "van_dong" | "giup_ba_me";
const MUC: { gia: Muc; chu: string; ic: TenIcon }[] = [{ gia: "hoc", chu: "Học", ic: "sach" }, { gia: "van_dong", chu: "Vận động", ic: "chay" }, { gia: "giup_ba_me", chu: "Giúp Ba Mẹ", ic: "nha" }];
const NHOM: Record<Muc, string> = { hoc: "hoc_tap", van_dong: "van_dong", giup_ba_me: "viec_nha" };
const NOP: { gia: string; tieu: string; phu: string; ic: TenIcon }[] = [
  { gia: "anh", tieu: "Chụp ảnh", phu: "Dọn dẹp, vẽ tranh, nấu ăn", ic: "camera" },
  { gia: "ghi_am", tieu: "Ghi âm", phu: "Đọc sách, tiếng Anh, học thuộc", ic: "sach" },
  { gia: "xong", tieu: "Bấm «Xong»", phu: "Việc nhỏ, Ba Mẹ thấy tận mắt", ic: "tick" },
];

export default function BaMeTuThem() {
  const p = useLocalSearchParams<{ con?: string; muc?: string }>();
  const { d, loi, matMang, tai } = useTai(() => bm.goi<GiaDinh>("gia-dinh"));
  const [ten, setTen] = useState("");
  const [hinh, setHinh] = useState("choi");
  const [muc, setMuc] = useState<Muc>(MUC.some((x) => x.gia === p.muc) ? (p.muc as Muc) : "giup_ba_me");
  const [sao, setSao] = useState(10);
  const [nop, setNop] = useState("anh");
  const [apCho, setApCho] = useState<string[] | null>(null);
  const { lam, loi: loiLam, dangChay } = useLam();
  const tieu = "Ba Mẹ tự thêm";
  if (!d) return <Man lui={{ chu: "" }} tieu={tieu}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const giao = apCho ?? [d.con.find((c) => c.id === p.con)?.id ?? d.con[0]?.id].filter(Boolean) as string[];
  const ngan = ten.trim().length > 0 && !tenHopLe(ten);
  const them = () => lam(async () => {
    await bm.goi("nhiem-vu", { ten: ten.trim(), hinh, diem: sao, nhom: NHOM[muc], bo: muc, bang_chung: nop, lap_lai: "hang_ngay", toi_da_ngay: 1, tu_duyet: false, giao_cho: giao });
    const tenCon = d.con.filter((c) => giao.includes(c.id)).map((c) => c.ten).join(", ");
    baoKhiVe(`Đã thêm «${ten.trim()}»${tenCon ? ` cho ${tenCon}` : ""}`);
    router.back();
  });
  return (
    <Man lui={{ chu: "" }} tieu={tieu}
      day={<><BaoLoi loi={loiLam} /><Nut chu="Thêm vào mục đã chọn" rong dangChay={dangChay} tat={!tenHopLe(ten) || !giao.length} bam={them} /></>}>
      <MucTieu chu="Con sẽ làm gì?" />
      <ONhap nhan="Tên việc" value={ten} onChangeText={setTen} placeholder="Ví dụ: Tưới cây" maxLength={90}
        loi={ngan ? "Tên cần ít nhất 3 ký tự để con hiểu việc cần làm" : null} />
      <Chips ds={GOI_Y.map((x) => ({ gia: x, chu: x }))} chon={[ten.trim()]} doi={setTen} />

      <MucTieu chu="Hình" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }} accessibilityRole="radiogroup">
        {HINH.map((h) => {
          const on = h === hinh;
          return (
            <Pressable key={h} onPress={() => setHinh(h)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`Hình ${h}`}
              style={[{ width: 50, height: 50, borderRadius: 17, alignItems: "center", justifyContent: "center" },
                on ? { backgroundColor: "#dcebe6", borderWidth: 2, borderColor: M.chinh } : { backgroundColor: "#ecebe7", boxShadow: BONG.lom }]}>
              <Icon3D ten={hinhNv({ hinh: h })[0]} co={30} />
            </Pressable>
          );
        })}
      </View>

      <MucTieu chu="Nằm trong mục" />
      <ChonO ds={MUC} chon={muc} doi={setMuc} />

      <MucTieu chu="Con nhận" />
      <ChonO ds={[5, 10, 15, 20].map((x) => ({ gia: x, chu: `${x}` }))} chon={sao} doi={setSao} sao />

      <MucTieu chu="Con nộp bằng" />
      <View style={{ gap: 8 }} accessibilityRole="radiogroup">
        {NOP.map((x) => {
          const on = x.gia === nop;
          return (
            <Pressable key={x.gia} onPress={() => setNop(x.gia)} accessibilityRole="radio" accessibilityState={{ checked: on }}
              style={[{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, padding: 10, borderRadius: 20 },
                on ? { backgroundColor: "#dcebe6", borderWidth: 2, borderColor: M.chinh } : { backgroundColor: "#f7f6f3", boxShadow: BONG.nho }]}>
              <OLomIcon ic={x.ic} />
              <View style={{ flex: 1 }}>
                <Chu kieu="rat" co={15}>{x.tieu}</Chu>
                <Chu kieu="dam" co={12.5} mau={M.chu3}>{x.phu}</Chu>
              </View>
            </Pressable>
          );
        })}
      </View>

      {d.con.length > 1 ? (
        <>
          <MucTieu chu="Áp cho" />
          <Chips ds={d.con.map((c) => ({ gia: c.id, chu: c.ten }))} chon={giao}
            doi={(id) => setApCho(giao.includes(id) ? giao.filter((x) => x !== id) : [...giao, id])} />
        </>
      ) : null}

      <The style={{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: M.chinhSoft }}>
        <Icon3D ten="chuong" co={26} />
        <Chu kieu="dam" co={13.5} mau={M.chinhInk} style={{ flex: 1 }}>Con nộp xong, Ba Mẹ nhận thông báo. Ba Mẹ duyệt thì con mới nhận sao.</Chu>
      </The>
    </Man>
  );
}
