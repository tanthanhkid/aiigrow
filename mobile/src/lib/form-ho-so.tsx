// Phần form hồ sơ con dùng chung cho «Lần đầu · bước 1» (bm-thiet-lap-con/01 bm1-ob-ten-con, them-hjjdppuw) và «Thêm con» từ Cả nhà
// (bm-ca-nha/02 them-9ozp26pq): thẻ hồ sơ (chữ cái + màu + «🐓 9 tuổi» theo con giáp — N11, Grow bên phải), «Tên gọi ở nhà», ô «Năm sinh» mở bảng
// bánh xe năm, «Màu của con», thẻ «Mã PIN vào máy · 4 số». Logic lưu nằm ở từng màn.
import { useState } from "react";
import { Pressable, View } from "react-native";
import { BO_CLAY, BONG, KHOI, MEN } from "./clay";
import { Anh3D, BanhXe, MAU_HO_SO } from "./lan-dau";
import { OPin } from "./ui-s3";
import { BangTruot, Chu, chuTren, Icon, LopMen, M, Nut, Rob } from "./ui";

/** Con giáp theo năm sinh (âm lịch xấp xỉ theo năm dương — đủ cho thẻ hồ sơ): 2020 ⇒ Tý 🐭, 2017 ⇒ Dậu 🐓. */
const GIAP = [["Tý", "🐭"], ["Sửu", "🐃"], ["Dần", "🐯"], ["Mão", "🐱"], ["Thìn", "🐲"], ["Tỵ", "🐍"], ["Ngọ", "🐴"], ["Mùi", "🐐"], ["Thân", "🐵"], ["Dậu", "🐓"], ["Tuất", "🐶"], ["Hợi", "🐷"]] as const;
export const conGiap = (nam: number) => GIAP[(((nam - 2020) % 12) + 12) % 12];
/** Năm chọn được: bé 2–18 tuổi. */
const namDs = () => { const y = new Date().getFullYear(); return Array.from({ length: 17 }, (_, k) => String(y - 18 + k)); };
/** «2017» ⇒ 2017; chuỗi khác ⇒ null. */
export const namCua = (nam: string) => (/^\d{4}$/.test(nam) ? Number(nam) : null);

/** Thẻ hồ sơ đầu màn: avatar chữ cái viền trắng, tên 22/800, chip «🐓 9 tuổi»; Grow 150 bên phải. */
export function TheHoSoCon({ ten, nam, mau }: { ten: string; nam: string; mau: number }) {
  const [dam, nhat] = MAU_HO_SO[mau];
  const namSo = namCua(nam);
  const tuoiSo = namSo ? new Date().getFullYear() - namSo : null;
  const tuoi = tuoiSo && tuoiSo >= 1 && tuoiSo <= 25 ? `${tuoiSo} tuổi` : null;
  const tenGon = ten.trim();
  return (
    <View style={{ minHeight: 170, borderRadius: 30, backgroundColor: nhat, padding: 18, flexDirection: "row", alignItems: "center", ...KHOI.the }}>
      <LopMen men={MEN.vien} bo={30} />
      {/* cột trái ≤ 44%: tên dài xuống dòng trước khi chạm Grow bên phải (cổng DE-ANH) */}
      <View style={{ gap: 10, alignItems: "flex-start", maxWidth: "44%" }}>
        <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: dam, alignItems: "center", justifyContent: "center", borderWidth: 4, borderColor: "#fff", boxShadow: BONG.nho }}>
          <Chu kieu="rat" co={38} mau={chuTren(dam)}>{(tenGon.split(/\s+/).pop() ?? "").charAt(0).toUpperCase() || "?"}</Chu>
        </View>
        <Chu kieu="rat" co={22}>{tenGon || "Con nhà mình"}</Chu>
        {tuoi && namSo ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3, boxShadow: BONG.nho }}
            accessibilityLabel={`${tuoi}, tuổi ${conGiap(namSo)[0]}, theo năm sinh ${namSo}`}>
            <Chu co={13}>{conGiap(namSo)[1]}</Chu><Chu kieu="rat" co={12.5}>{tuoi}</Chu>
          </View>
        ) : null}
      </View>
      <View pointerEvents="none" style={{ position: "absolute", right: 6, bottom: 0, top: 6, width: "48%", alignItems: "flex-end", justifyContent: "flex-end" }}><Rob ten="chi" co={150} /></View>
    </View>
  );
}

/** Ô «Năm sinh» (lõm, «2017 · tuổi Dậu ›») + bảng bánh xe năm «Chọn 2017». */
export function ONamSinh({ nam, doi }: { nam: string; doi: (nam: string) => void }) {
  const [chon, setChon] = useState<string | null>(null);
  const namSo = namCua(nam);
  return (
    <View style={{ gap: 6 }}>
      <Chu kieu="rat" co={14} style={{ paddingHorizontal: 4 }}>Năm sinh</Chu>
      <Pressable onPress={() => setChon(nam || String(new Date().getFullYear() - 9))} accessibilityRole="button" accessibilityLabel={`Chọn năm sinh của con${nam ? `, đang là ${nam}` : ""}`}
        style={{ minHeight: 54, borderRadius: 27, backgroundColor: "#e9e8e4", boxShadow: BONG.lom, flexDirection: "row", alignItems: "center", paddingHorizontal: 18 }}>
        <Chu kieu={nam ? "rat" : "dam"} co={nam ? 18 : 16} mau={nam ? M.chu : M.chu3} so style={{ flex: 1 }}>
          {nam || "Chọn năm sinh"}{namSo ? <Chu kieu="dam" co={14} mau={M.chu2}>{` · tuổi ${conGiap(namSo)[0]}`}</Chu> : null}
        </Chu>
        <Icon ten="phai" mau={M.chinhInk} co={18} />
      </Pressable>
      <BangTruot mo={chon !== null} dong={() => setChon(null)} tieu="Năm sinh">
        <View style={{ alignItems: "center" }}>
          <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 80, height: 40, borderRadius: 14, backgroundColor: "#e3efeb" }} />
          {chon !== null ? <BanhXe ds={namDs()} gia={chon} doi={setChon} nhan="Năm sinh" /> : null}
        </View>
        <Nut chu={`Chọn ${chon ?? ""}`} rong bam={() => { if (chon) doi(chon); setChon(null); }} />
      </BangTruot>
    </View>
  );
}

/** «Màu của con»: 5 chấm tròn 44, chấm đang chọn có vòng ngọc ngoài (thiết kế .mau i.chon). */
export function ChonMauCon({ mau, doi }: { mau: number; doi: (i: number) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <Chu kieu="rat" co={14} style={{ paddingHorizontal: 4 }}>Màu của con</Chu>
      <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 4 }} accessibilityRole="radiogroup">
        {MAU_HO_SO.map(([m], i) => (
          <Pressable key={m} onPress={() => doi(i)} accessibilityRole="radio" accessibilityState={{ checked: i === mau }} accessibilityLabel={`Màu ${i + 1}`}
            style={{ width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center", ...(i === mau ? { borderWidth: 3, borderColor: M.chinh } : {}) }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: m, boxShadow: BONG.nho }} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Thẻ «Mã PIN vào máy · 4 số»: ô icon lõm khoá, 4 ô PIN lõm, câu dưới; lỗi / nhắc gõ đủ. */
export function ThePinCon({ pin, doi, cau, loi }: { pin: string; doi: (p: string) => void; cau: React.ReactNode; loi: string | null }) {
  return (
    <View style={{ gap: 10, padding: 14, borderRadius: BO_CLAY.the, backgroundColor: M.the, ...KHOI.the }} accessibilityLabel="Mã PIN vào máy">
      <LopMen men={MEN.the} bo={BO_CLAY.the} />
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "#ecebe7", boxShadow: BONG.lom, alignItems: "center", justifyContent: "center" }}><Anh3D ten="khoa" co={24} /></View>
        <Chu kieu="rat" co={15} style={{ flex: 1 }}>Mã PIN vào máy</Chu><Chu kieu="dam" co={12.5} mau={M.chu2}>4 số</Chu>
      </View>
      <OPin gia={pin} doi={doi} nhan="Đặt PIN 4 số" />
      <Chu co={13} mau={M.chu2}>{cau}</Chu>
      {loi && pin.length === 4 ? <Chu kieu="dam" co={13} mau={M.loi}>{loi}</Chu> : pin.length > 0 && pin.length < 4 ? <Chu kieu="dam" co={13} mau={M.chu3}>Gõ đủ 4 số, hoặc xoá hết để đặt sau</Chu> : null}
    </View>
  );
}
