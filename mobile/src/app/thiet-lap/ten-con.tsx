// bm-ob-con (bước 1/5) — biến thể appllama: tên gọi, năm sinh, PIN; nhóm Nhí/Teen = SegmentedControl native (tự đề xuất theo tuổi).
// Bấm Tiếp TẠO hồ sơ Con trên máy chủ (một sự kiện) ⇒ replace sang bước 2: lùi không quay lại form để tạo trùng Con.
import { useState } from "react";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { datTl } from "@/lib/thiet-lap";
import { useLam } from "@/lib/ui";
import { C, Ch, haptic, Khung, LoiTaiCho, NutChinh, ONhap, TienDo, TieuDe, useO, useOFocusSauChuyen, Seg } from "@/lib/ob";

const NHOM = [
  { gia: "nhi", chu: "Nhí · 6–10 tuổi", mo: "Giao diện hình to, Rob đọc to" },
  { gia: "teen", chu: "Teen · 11–16 tuổi", mo: "Gọn, đủ số liệu, bảng giá chi tiết" },
] as const;

export default function ObCon() {
  const [ten, setTen] = useState("");
  const [nam, setNam] = useState("");
  const [pin, setPin] = useState("");
  const oTen = useOFocusSauChuyen(); const oNam = useO(); const oPin = useO();
  const tuoi = Number(nam) && nam.length === 4 ? new Date().getFullYear() - Number(nam) : null;
  const deXuat: "nhi" | "teen" = tuoi !== null && tuoi >= 11 ? "teen" : "nhi";
  const [nhom, setNhom] = useState<"nhi" | "teen" | null>(null);
  const chon = nhom ?? deXuat;
  const [roiPin, setRoiPin] = useState(false);
  const pinSai = pin !== "" && !/^\d{4,6}$/.test(pin);
  const { lam, loi, dangChay } = useLam();
  const tiep = () => lam(async () => {
    const r = await bm.goi<{ id: string }>("con", { ten, namSinh: Number(nam) || null, pin: pin || null, nhom: chon });
    datTl({ conId: r.id, tenCon: ten.trim(), nhom: chon });
    router.replace("/thiet-lap/may");
  });
  const mo = NHOM.find((x) => x.gia === chon)!;
  return (
    <Khung dau={<TienDo n={1} tong={5} />} day={<NutChinh chu="Tiếp" dangChay={dangChay} tat={!ten.trim() || pinSai} bam={tiep} />}>
      <StatusBar style="auto" />
      <TieuDe tieu="Con tên gì?" loi="Rob gợi ý trải nghiệm theo tuổi." />
      <ONhap ref={oTen} nhan="Tên gọi" value={ten} onChangeText={setTen} placeholder="Ken" maxLength={30} returnKeyType="next" onSubmitEditing={() => oNam.current?.focus()} />
      <View style={{ flexDirection: "row", gap: 12, flexWrap: "wrap" }}>
        <View style={{ flex: 1, minWidth: 140 }}>
          <ONhap ref={oNam} nhan="Năm sinh" value={nam} onChangeText={(t) => setNam(t.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" placeholder="2017" style={{ fontVariant: ["tabular-nums"] }} />
        </View>
        <View style={{ flex: 1, minWidth: 140 }}>
          <ONhap ref={oPin} nhan="PIN (tuỳ chọn)" value={pin} onChangeText={(t) => setPin(t.replace(/\D/g, "").slice(0, 6))} keyboardType="number-pad"
            secureTextEntry textContentType="oneTimeCode" placeholder="4–6 số" onBlur={() => setRoiPin(true)} loi={roiPin && pinSai ? "PIN gồm 4–6 số." : null} />
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Ch k="footnote" mau={C.chu2} style={{ paddingHorizontal: 4 }}>Nhóm tuổi{tuoi ? ` · ${ten.trim() || "Con"} ${tuoi} tuổi, Rob đề xuất ${deXuat === "teen" ? "Teen" : "Nhí"}` : ""}</Ch>
        <Seg values={NHOM.map((x) => x.chu)} selectedIndex={chon === "nhi" ? 0 : 1}
          onChange={(e) => { haptic.chon(); setNhom(NHOM[e.nativeEvent.selectedSegmentIndex].gia); }} style={{ height: 36 }} />
        <Ch k="footnote" mau={C.chu2} style={{ paddingHorizontal: 4 }}>{mo.mo}</Ch>
      </View>
      <LoiTaiCho loi={loi} />
      <Ch k="footnote" mau={C.chu2} style={{ paddingHorizontal: 4 }}>Không hỏi trường học, địa chỉ — chỉ thu thập điều AiiGrow cần để chạy.</Ch>
    </Khung>
  );
}
