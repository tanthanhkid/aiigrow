// «Ba Mẹ tự thêm» (bàn 17/11 them-6pjz1stu@v4 — bảng trượt trên «Giao việc», cùng nhóm dùng chung với them-bwlkjyw5 của Lần đầu): Con sẽ làm gì?
// (ô lõm + gợi ý), Hình (6 ô), Nằm trong mục (Học · Vận động · Giúp Ba Mẹ), Con nhận ⭐5/10/15/20, Con nộp bằng (Chụp ảnh · Ghi âm · Bấm «Xong»),
// #302: «Nằm trong mục» có chip «+ Khác» (Ba Mẹ gõ tên mục mới — lưu tasks.bo = «khac:<tên>»), «Con nhận» có ô tự nhập số sao (1–1000);
// ghi chú «Con nộp xong, Ba Mẹ nhận thông báo…» ⇒ «Thêm vào mục đã chọn» = POST nhiem-vu {…, bo: mục, giao_cho: id[]}. Nhà > 1 con ⇒ «Áp cho» (N9).
// Dùng ở bảng trượt của app/giao-nv/index.tsx và màn dự phòng app/giao-nv/tu-dat.tsx.
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { bm, type GiaDinh } from "./api";
import { BONG } from "./clay";
import { useSaoTu } from "./sao-tu-nhap";
import { BaoLoi, Chips, Chu, F, Icon3D, M, Nut, ONhap, useLam, type TenIcon } from "./ui";
import { hinhNv } from "./hang-ngay";
import { tenHopLe } from "./form-viec";
import { ChonO } from "./ui-viec";
import { TheDs } from "./lan-dau-ds";

const GOI_Y = ["Tưới cây", "Tập đàn 15 phút", "Cho cún ăn", "Vẽ 1 bức tranh", "Tự tắm"];
// thiết kế 6pjz1stu: lau · sach · chay · but · tim · camera (mã tasks.hinh → icon qua hinhNv)
const HINH = ["choi", "sach", "day", "but", "tim", "camera"];
type Muc = "hoc" | "van_dong" | "giup_ba_me" | "khac";
const SAO_TOI_DA = 1000;
const TEN_MUC_TOI_DA = 30;
const MUC: { gia: Muc; chu: string; ic: TenIcon }[] = [{ gia: "hoc", chu: "Học", ic: "sach" }, { gia: "van_dong", chu: "Vận động", ic: "chay" }, { gia: "giup_ba_me", chu: "Giúp Ba Mẹ", ic: "nha" }, { gia: "khac", chu: "+ Khác", ic: "tia" }];
const NHOM: Record<Muc, string> = { hoc: "hoc_tap", van_dong: "van_dong", giup_ba_me: "viec_nha", khac: "khac" };
const NOP: { gia: string; tieu: string; phu: string; ic: TenIcon }[] = [
  { gia: "anh", tieu: "Chụp ảnh", phu: "Dọn dẹp, vẽ tranh, nấu ăn", ic: "camera" },
  { gia: "ghi_am", tieu: "Ghi âm", phu: "Đọc sách, tiếng Anh, học thuộc", ic: "sach" },
  { gia: "xong", tieu: "Bấm «Xong»", phu: "Việc nhỏ, Ba Mẹ thấy tận mắt", ic: "tick" },
];


const Nhan = ({ chu }: { chu: string }) => <Chu kieu="rat" co={15} mau={M.chu2} style={{ marginHorizontal: 4 }}>{chu}</Chu>;

export function FormTuThem({ dsCon, con, mucSan, xong }: { dsCon: GiaDinh["con"]; con?: string; mucSan?: string;
  /** đã tạo việc: tên việc + tên các con được giao */ xong: (ten: string, tenCon: string) => void }) {
  const [ten, setTen] = useState("");
  const [hinh, setHinh] = useState("choi");
  const [muc, setMuc] = useState<Muc>(MUC.some((x) => x.gia === mucSan) ? (mucSan as Muc) : "giup_ba_me");
  const [sao, setSao] = useState(10);
  const st = useSaoTu(SAO_TOI_DA);                       // ô «Số sao khác» (rỗng = dùng chip)
  const [tenMuc, setTenMuc] = useState("");
  const [nop, setNop] = useState("anh");
  const [apCho, setApCho] = useState<string[] | null>(null);
  const { lam, loi: loiLam, dangChay } = useLam();
  const giao = apCho ?? [dsCon.find((c) => c.id === con)?.id ?? dsCon[0]?.id].filter(Boolean) as string[];
  const ngan = ten.trim().length > 0 && !tenHopLe(ten);
  const mucKhac = muc === "khac";
  const tenMucGon = tenMuc.trim().replace(/\s+/g, " ");
  const saoDung = st.dung(sao);
  const duDieuKien = tenHopLe(ten) && giao.length > 0 && !st.loi && (!mucKhac || tenMucGon.length > 0);
  const them = () => lam(async () => {
    await bm.goi("nhiem-vu", { ten: ten.trim(), hinh, diem: saoDung, nhom: NHOM[muc], bo: mucKhac ? `khac:${tenMucGon}` : muc, bang_chung: nop, lap_lai: "hang_ngay", toi_da_ngay: 1, tu_duyet: false, giao_cho: giao });
    xong(ten.trim(), dsCon.filter((c) => giao.includes(c.id)).map((c) => c.ten).join(", "));
  });
  return (
    <View style={{ gap: 10 }}>
      <Nhan chu="Con sẽ làm gì?" />
      <TextInput value={ten} onChangeText={setTen} placeholder="Ví dụ: Tưới cây" placeholderTextColor={M.chu3} maxLength={90} accessibilityLabel="Con sẽ làm gì?"
        style={{ minHeight: 50, borderRadius: 25, paddingHorizontal: 18, backgroundColor: "#ecebe7", boxShadow: BONG.lom, fontFamily: F.dam7, fontSize: 16, color: M.chu }} />
      {ngan ? <Chu kieu="dam" co={13.5} mau={M.loi} style={{ marginHorizontal: 4 }}>Tên cần ít nhất 3 ký tự để con hiểu việc cần làm</Chu> : null}
      <Chips ds={GOI_Y.map((x) => ({ gia: x, chu: x }))} chon={[ten.trim()]} doi={setTen} />

      <Nhan chu="Hình" />
      <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup">
        {HINH.map((h) => {
          const on = h === hinh;
          return (
            <Pressable key={h} onPress={() => setHinh(h)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`Hình ${h}`}
              style={[{ flex: 1, height: 50, borderRadius: 17, alignItems: "center", justifyContent: "center" },
                on ? { backgroundColor: "#dcebe6", borderWidth: 2, borderColor: M.chinh } : { backgroundColor: "#ecebe7", boxShadow: BONG.lom }]}>
              <Icon3D ten={hinhNv({ hinh: h })[0]} co={30} />
            </Pressable>
          );
        })}
      </View>

      <Nhan chu="Nằm trong mục" />
      <ChonO ds={MUC} chon={muc} doi={setMuc} />
      {mucKhac ? <ONhap nhan="Tên mục mới" value={tenMuc} onChangeText={(t) => setTenMuc(t.slice(0, TEN_MUC_TOI_DA))} placeholder="Ví dụ: Âm nhạc" maxLength={TEN_MUC_TOI_DA} autoFocus /> : null}

      <Nhan chu="Con nhận" />
      <ChonO ds={[5, 10, 15, 20].map((x) => ({ gia: x, chu: `${x}` }))} chon={st.chu === "" ? sao : null} doi={(x) => { st.xoa(); setSao(x); }} sao />
      <ONhap nhan="Hoặc tự nhập số sao" value={st.chu} onChangeText={st.nhap} placeholder="Ví dụ: 25" keyboardType="number-pad" maxLength={st.maxLength}
        loi={st.thongBao} />

      <Nhan chu="Con nộp bằng" />
      {/* thiết kế: một thẻ danh sách, mỗi cách một dòng icon 3D · tên + ví dụ · nút tròn chọn */}
      <TheDs>
        {NOP.map((x, i) => {
          const on = x.gia === nop;
          return (
            <Pressable key={x.gia} onPress={() => setNop(x.gia)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={x.tieu}
              style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 56, paddingLeft: 4, borderTopWidth: i ? 1 : 0, borderTopColor: "#e9e8e3" }}>
              <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "#ecebe7", alignItems: "center", justifyContent: "center" }}><Icon3D ten={x.ic} co={24} /></View>
              <View style={{ flex: 1 }}><Chu kieu="rat" co={15}>{x.tieu}</Chu><Chu kieu="dam" co={12.5} mau={M.chu3}>{x.phu}</Chu></View>
              <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: on ? M.chinh : "#e6e5e1", boxShadow: on ? BONG.ngoc : BONG.lom }}>
                {on ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" }} /> : null}
              </View>
            </Pressable>
          );
        })}
      </TheDs>

      {dsCon.length > 1 ? (
        <>
          <Nhan chu="Áp cho" />
          <Chips ds={dsCon.map((c) => ({ gia: c.id, chu: c.ten }))} chon={giao}
            doi={(id) => setApCho(giao.includes(id) ? giao.filter((x) => x !== id) : [...giao, id])} />
        </>
      ) : null}

      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 4 }}>
        <Icon3D ten="chuong" co={22} />
        <Chu kieu="dam" co={13} mau={M.chu2} style={{ flex: 1 }}>Con nộp xong, Ba Mẹ nhận thông báo. Ba Mẹ duyệt thì con mới nhận sao.</Chu>
      </View>
      <BaoLoi loi={loiLam} />
      <Nut chu="Thêm vào mục đã chọn" rong dangChay={dangChay} tat={!duDieuKien} bam={them} />
    </View>
  );
}
