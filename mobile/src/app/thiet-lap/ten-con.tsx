// bm-ob-con (bước 1/5): tên gọi, năm sinh, PIN — nhóm Nhí/Teen tự đề xuất theo tuổi (FR-01.02). Không hỏi trường, địa chỉ.
import { useRef, useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { bm, catTen, chuanHoaTen } from "@/lib/api";
import { datTl } from "@/lib/thiet-lap";
import { BaoLoi, BieuTron, Buoc, Canh, Chu, M, Man, Nut, OChon, ONhap, useLam } from "@/lib/ui";

export default function ObCon() {
  const [ten, setTen] = useState("");
  const [nam, setNam] = useState("");
  const [pin, setPin] = useState("");
  const tuoi = Number(nam) ? new Date().getFullYear() - Number(nam) : null;
  const deXuat: "nhi" | "teen" = tuoi !== null && tuoi >= 11 ? "teen" : "nhi";
  const [nhom, setNhom] = useState<"nhi" | "teen" | null>(null);
  const chon = nhom ?? deXuat;
  const { lam, loi, dangChay } = useLam();
  // Con đã tạo ở lần bấm trước (quay lại / thử lại sau lỗi ở bước sau) — nhớ id để SỬA chứ không tạo lại (tạo lại ⇒ ten_trung với chính Con vừa tạo)
  const daTao = useRef<string | null>(null);
  const tiep = () => lam(async () => {
    const tenMoi = chuanHoaTen(ten);
    if (daTao.current) {
      await bm.goi(`con/${daTao.current}/sua`, { ten: tenMoi, nhom: chon, ...(pin ? { pin } : {}) });
    } else {
      const r = await bm.goi<{ id: string }>("con", { ten: tenMoi, namSinh: Number(nam) || null, pin: pin || null, nhom: chon });
      daTao.current = r.id;
    }
    datTl({ conId: daTao.current, tenCon: tenMoi, nhom: chon });
    router.push("/thiet-lap/may");
  });
  return (
    <Man dau={<Buoc n={1} tong={5} nhan="Bước 1/5 · Con" />} day={<><BaoLoi loi={loi} />
      <Nut chu="Tiếp: chọn thiết bị" rong dangChay={dangChay} tat={!ten.trim() || (pin !== "" && !/^\d{4,6}$/.test(pin))} bam={tiep} /></>}>
      <Canh lv="so-tay" thap tieu="Con tên gì?" loi="Rob gợi ý trải nghiệm theo tuổi." />
      <ONhap nhan="Tên gọi" value={ten} onChangeText={(t) => setTen(catTen(t, 30))} placeholder="Ken" />
      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <View style={{ flex: 1, minWidth: 140 }}><ONhap nhan="Năm sinh" value={nam} onChangeText={(t) => setNam(t.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" placeholder="2017" /></View>
        <View style={{ flex: 1, minWidth: 140 }}><ONhap nhan="Mã PIN của Con" value={pin} onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad" secureTextEntry placeholder="4–6 số" /></View>
      </View>
      <OChon chon={chon === "nhi"} bam={() => setNhom("nhi")} trai={<BieuTron ic="cuoi" mau="vang" />} tieu="Nhóm Nhí (6–10 tuổi)"
        phu={`${ten.trim() || "Con"}${tuoi ? ` ${tuoi} tuổi` : ""} · giao diện hình to, Rob đọc to`} />
      <OChon chon={chon === "teen"} bam={() => setNhom("teen")} trai={<BieuTron ic="sao" mau="lam" />} tieu="Nhóm Teen (11–16 tuổi)"
        phu="Gọn, đủ số liệu, bảng giá chi tiết" />
      <Chu co={13} mau={M.chu3}>Không hỏi trường học, địa chỉ — chỉ thu thập điều AiiGrow cần để chạy.</Chu>
    </Man>
  );
}
