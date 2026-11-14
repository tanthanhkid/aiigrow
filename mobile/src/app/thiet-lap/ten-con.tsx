// bm1-ob-ten-con (bước 1/5, thiết kế chốt 04/11 + PIN 06/11 L13): thẻ hồ sơ (chữ cái + màu + «9 tuổi · khoảng lớp 4»), tên gọi ở nhà, năm sinh, màu của con.
// «Lưu hồ sơ X» ⇒ POST thiet-lap {con} (tạo Con; gửi lại có con.id ⇒ sửa, không tạo trùng) ⇒ Giao việc. «Thêm con khác» (them-4sujddkb):
// lưu Con này rồi điền Con tiếp theo; màn Con thứ hai có «Xong, giao việc cho <Con đầu> trước». Bỏ chọn nhóm Nhí/Teen (máy chủ tự tính theo tuổi).
// PIN 06/11 (đảo L5): «Mã PIN vào máy · 4 số» — bỏ trống = chưa đặt (máy hỏi Ba Mẹ đặt sau); có PIN ⇒ POST con/:id/pin sau khi lưu hồ sơ.
// Thiết kế chốt 14/11 (bm1-ob-ten-con «Sửa tay», them-hjjdppuw, them-4sujddkb): thẻ hồ sơ «Bảo Anh · 🐓 9 tuổi» (con giáp theo năm sinh — N11),
// ô năm sinh là nút mở bảng «Năm sinh» (bánh xe năm, «Chọn 2017»); PIN một ô (thiết kế bỏ «Nhập lại PIN» — PIN hiện số khi gõ nên không cần gõ lại).
import { useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { bm } from "@/lib/api";
import { BO_CLAY, BONG, KHOI, MEN } from "@/lib/clay";
import { Anh3D, BanhXe, DauMan, LienKet, MAU_HO_SO, OLom } from "@/lib/lan-dau";
import { kiemPin } from "@/lib/s3";
import { OPin, ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl } from "@/lib/thiet-lap";
import { BangTruot, BaoLoi, Chu, chuTren, Icon, LopMen, M, Man, Nut, Rob, useLam } from "@/lib/ui";

/** Con giáp theo năm sinh (âm lịch xấp xỉ theo năm dương — đủ cho thẻ hồ sơ): 2020 ⇒ Tý 🐭, 2017 ⇒ Dậu 🐓. */
const GIAP = [["Tý", "🐭"], ["Sửu", "🐃"], ["Dần", "🐯"], ["Mão", "🐱"], ["Thìn", "🐲"], ["Tỵ", "🐍"], ["Ngọ", "🐴"], ["Mùi", "🐐"], ["Thân", "🐵"], ["Dậu", "🐓"], ["Tuất", "🐶"], ["Hợi", "🐷"]] as const;
const conGiap = (nam: number) => GIAP[(((nam - 2020) % 12) + 12) % 12];
/** Năm chọn được: bé 2–18 tuổi. */
const namDs = () => { const y = new Date().getFullYear(); return Array.from({ length: 17 }, (_, k) => String(y - 18 + k)); };

type KqThietLap = { conId: string; ten: string };

export default function ObCon() {
  const tl0 = layTl();
  // Mở lại màn (Quay lại từ bước sau) ⇒ điền lại Con đang thiết lập; vào từ «Thêm Con» ở Trang chủ ⇒ form trống (daLuu rỗng, không có conId)
  const sua = !!tl0.conId && !!tl0.daLuu?.some((c) => c.id === tl0.conId);
  const [ten, setTen] = useState(sua ? tl0.tenCon ?? "" : "");
  const [nam, setNam] = useState(sua && tl0.namSinh ? String(tl0.namSinh) : "");
  const [mau, setMau] = useState(sua ? tl0.mau ?? 0 : (tl0.daLuu?.length ?? 0) % MAU_HO_SO.length);
  const [conId, setConId] = useState<string | undefined>(sua ? tl0.conId : undefined);
  const [pin, setPin] = useState("");
  const [chonNam, setChonNam] = useState<string | null>(null);      // bảng «Năm sinh» đang mở (giá trị đang xoay)
  const daLuu = (tl0.daLuu ?? []).filter((c) => c.id !== conId);
  const { lam, loi, dangChay, setLoi } = useLam();
  const namSo = /^\d{4}$/.test(nam) ? Number(nam) : null;
  const tuoiSo = namSo ? new Date().getFullYear() - namSo : null;
  const tuoi = tuoiSo && tuoiSo >= 1 && tuoiSo <= 25 ? `${tuoiSo} tuổi` : null;
  const tenGon = ten.trim();
  const loiPin = kiemPin(pin, null, namSo);
  // không mắng lúc đang gõ: PIN đủ 4 số mà sai luật ⇒ báo lỗi; PIN dở dang ⇒ nút Lưu tắt + câu nhắc «Gõ đủ 4 số»
  const hienLoiPin = !!loiPin && pin.length === 4;
  const luu = async () => {
    const r = await bm.goi<KqThietLap>("thiet-lap", { con: { ...(conId ? { id: conId } : {}), ten: tenGon, namSinh: namSo, avatar: `mau-${mau}` } });
    // nhớ Con vừa tạo TRƯỚC khi đặt PIN: lời đặt PIN lỗi ⇒ bấm lại chỉ sửa Con này (gửi con.id), không tạo Con thứ hai
    setConId(r.conId);
    if (pin) await bm.goi(`con/${r.conId}/pin`, { pin });
    const ds = [...(layTl().daLuu ?? []).filter((c) => c.id !== r.conId), { id: r.conId, ten: r.ten, mau, namSinh: namSo }];
    return { r, ds };
  };
  const tiep = () => lam(async () => {
    const { r, ds } = await luu();
    datTl({ conId: r.conId, tenCon: r.ten, namSinh: namSo, mau, daLuu: ds, nhom: namSo && new Date().getFullYear() - namSo >= 11 ? "teen" : "nhi",
      apps: undefined, webs: undefined, cheDoChan: undefined, quy: undefined, cuoiTuan: undefined, ngu: undefined });
    router.push("/thiet-lap/mau");
  });
  const themCon = () => lam(async () => {
    const { ds } = await luu();
    datTl({ daLuu: ds, conId: undefined });
    setTen(""); setNam(""); setConId(undefined); setPin(""); setMau(ds.length % MAU_HO_SO.length);
  });
  const conDau = daLuu[0];
  const [dam, nhat] = MAU_HO_SO[mau];
  return (
    <Man dau={<DauMan ve="/" phai={<ThanhBuoc5 dang={0} />} />}
      day={<><BaoLoi loi={loi} /><Nut chu={`Lưu hồ sơ ${tenGon || "của con"}`} rong dangChay={dangChay} tat={!tenGon || (nam !== "" && !namSo) || !!loiPin} bam={tiep} />
        {conDau ? <LienKet chu={`Xong, giao việc cho ${conDau.ten} trước`} bam={() => lam(async () => {
          if (tenGon) { if (loiPin) throw new Error(loiPin); const { ds } = await luu(); datTl({ daLuu: ds }); }        // Con đang điền dở vẫn được lưu, không mất lặng lẽ
          datTl({ conId: conDau.id, tenCon: conDau.ten, mau: conDau.mau, namSinh: conDau.namSinh, apps: undefined, webs: undefined, cheDoChan: undefined, quy: undefined, cuoiTuan: undefined, ngu: undefined });
          router.push("/thiet-lap/mau");
        })} />
          : <LienKet chu="+ Thêm con khác" bam={() => (!tenGon ? setLoi("Nhập tên con này trước, rồi thêm con khác.") : loiPin ? setLoi(loiPin) : themCon())} />}</>}>
      <View style={{ minHeight: 170, borderRadius: 30, backgroundColor: nhat, padding: 18, flexDirection: "row", alignItems: "center", ...KHOI.the }}>
        <LopMen men={MEN.vien} bo={30} />
        {/* cột trái ≤ 44%: tên dài xuống dòng trước khi chạm Rob bên phải (cổng DE-ANH) */}
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
      <OLom nhan="Tên gọi ở nhà" value={ten} onChangeText={setTen} placeholder="Bảo Anh" maxLength={30} autoComplete="off" />
      <View style={{ gap: 6 }}>
        <Chu kieu="rat" co={14} style={{ paddingHorizontal: 4 }}>Năm sinh</Chu>
        <Pressable onPress={() => setChonNam(nam || String(new Date().getFullYear() - 9))} accessibilityRole="button" accessibilityLabel={`Chọn năm sinh của con${nam ? `, đang là ${nam}` : ""}`}
          style={{ minHeight: 54, borderRadius: 27, backgroundColor: "#e9e8e4", boxShadow: BONG.lom, flexDirection: "row", alignItems: "center", paddingHorizontal: 18 }}>
          <Chu kieu={nam ? "rat" : "dam"} co={16} mau={nam ? M.chu : M.chu3} so style={{ flex: 1 }}>{nam || "Chọn năm sinh"}</Chu>
          <Icon ten="lich" mau={M.chu3} co={18} />
        </Pressable>
      </View>
      <View style={{ gap: 8 }}>
        <Chu kieu="rat" co={14} style={{ paddingHorizontal: 4 }}>Màu của con</Chu>
        <View style={{ flexDirection: "row", gap: 12, paddingHorizontal: 4 }} accessibilityRole="radiogroup">
          {MAU_HO_SO.map(([m], i) => (
            <Pressable key={m} onPress={() => setMau(i)} accessibilityRole="radio" accessibilityState={{ checked: i === mau }} accessibilityLabel={`Màu ${i + 1}`}
              style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", ...(i === mau ? { boxShadow: `0px 0px 0px 3px ${M.chu}` } : {}) }}>
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: m, boxShadow: BONG.nho, alignItems: "center", justifyContent: "center" }}>
                {i === mau ? <Icon ten="tick" mau="#fff" co={16} /> : null}
              </View>
            </Pressable>
          ))}
        </View>
      </View>
      {/* PIN vào máy (06/11): bé chạm tên + PIN để vào máy dùng chung */}
      <View style={{ gap: 10, padding: 16, borderRadius: BO_CLAY.the, backgroundColor: M.the, ...KHOI.the }} accessibilityLabel={`Mã PIN vào máy của ${tenGon || "con"}`}>
        <LopMen men={MEN.the} bo={BO_CLAY.the} />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Anh3D ten="khoa" co={22} /><Chu kieu="rat" co={15} style={{ flex: 1 }}>Mã PIN vào máy</Chu><Chu kieu="dam" co={13} mau={M.chu3}>4 số</Chu>
        </View>
        <OPin gia={pin} doi={setPin} nhan="Đặt PIN 4 số" />
        <Chu co={13} mau={M.chu2}><Chu kieu="rat" co={13}>Bé dùng PIN này để vào máy</Chu> · không dùng ngày sinh</Chu>
        {hienLoiPin ? <Chu kieu="dam" co={13} mau={M.loi}>{loiPin}</Chu> : pin.length > 0 && pin.length < 4 ? <Chu kieu="dam" co={13} mau={M.chu3}>Gõ đủ 4 số, hoặc xoá hết để đặt sau</Chu> : null}
      </View>
      <BangTruot mo={chonNam !== null} dong={() => setChonNam(null)} tieu="Năm sinh">
        <View style={{ alignItems: "center" }}>
          <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 80, height: 40, borderRadius: 14, backgroundColor: "#e3efeb" }} />
          {chonNam !== null ? <BanhXe ds={namDs()} gia={chonNam} doi={setChonNam} nhan="Năm sinh" /> : null}
        </View>
        <Nut chu={`Chọn ${chonNam ?? ""}`} rong bam={() => { if (chonNam) setNam(chonNam); setChonNam(null); }} />
      </BangTruot>
    </Man>
  );
}
