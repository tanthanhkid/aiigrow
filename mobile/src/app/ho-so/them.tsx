// them-9ozp26pq «Thêm con» từ tab Cả nhà (thiết kế chốt 06/11, L13): vòng tròn chữ cái theo màu, «Tên gọi của con», «Con mấy tuổi?» chip 4–5 … 13+
// (thay ô năm sinh của bước Lần đầu), «Màu của con», «PIN để <tên> vào máy · 4 số» có Ẩn/Hiện, lời Rob, «Tạo hồ sơ cho <tên>» ⇒ POST con
// {ten, namSinh, avatar, pin?} ⇒ Hồ sơ con (bm2-ho-so). PIN bỏ trống = chưa đặt (máy hỏi Ba Mẹ đặt sau). Luồng Lần đầu vẫn ở thiet-lap/ten-con.
import { useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { bm } from "@/lib/api";
import { cuoiTuanCua, NGU_MAC_DINH, QUY_MAC_DINH } from "@/lib/ghep-may";
import { BONG, KHOI } from "@/lib/clay";
import { MAU_HO_SO, OLom } from "@/lib/lan-dau";
import { CHIP_TUOI, kiemPin, namTuChipTuoi } from "@/lib/s3";
import { OPin } from "@/lib/ui-s3";
import { BaoLoi, Chu, chuTren, Icon, M, Man, Nut, Rob, useLam } from "@/lib/ui";

export default function ThemCon() {
  const [ten, setTen] = useState("");
  const [tuoi, setTuoi] = useState<number | null>(null);
  const [mau, setMau] = useState(0);
  const [pin, setPin] = useState("");
  const [hien, setHien] = useState(true);
  const { lam, loi, dangChay } = useLam();
  const tenGon = ten.trim();
  const goi = tenGon.split(/\s+/).pop() ?? "";
  const namSinh = namTuChipTuoi(tuoi);
  const loiPin = kiemPin(pin, null, namSinh);
  const [dam] = MAU_HO_SO[mau];
  const tao = () => lam(async () => {
    const r = await bm.goi<{ id: string }>("con", { ten: tenGon, ...(namSinh ? { namSinh } : {}), avatar: `mau-${mau}`, ...(pin ? { pin } : {}) });
    // «Rob cài sẵn giờ chơi, nhiệm vụ»: cùng mặc định các bước Lần đầu (bộ việc đầu = Tự lập, 60 phút / ngày, ngủ 21:30–06:30). Hồ sơ đã tạo ⇒
    // lỗi phần cài sẵn không chặn (Ba Mẹ chỉnh ở Hồ sơ), không tạo lại Con.
    await Promise.allSettled([
      bm.goi("nhiem-vu/bo", { bo: "tu_lap", con: r.id }),
      bm.goi("thiet-lap", { con: { id: r.id }, gioChoi: { ngayThuong: QUY_MAC_DINH, cuoiTuan: cuoiTuanCua(QUY_MAC_DINH) }, ngu: NGU_MAC_DINH }),
    ]);
    router.replace(`/ho-so/${r.id}` as never);
  });
  return (
    <Man lui={{ chu: "", ve: "/cai-dat" }} tieu="Thêm con"
      day={<><BaoLoi loi={loi} />
        <Nut chu={`Tạo hồ sơ cho ${goi || "con"}`} rong dangChay={dangChay} tat={!tenGon || !!loiPin} bam={tao} /></>}>
      <View style={{ alignSelf: "center", width: 96, height: 96, borderRadius: 48, backgroundColor: dam, alignItems: "center", justifyContent: "center", boxShadow: BONG.nho }}>
        <Chu kieu="rat" co={38} mau={chuTren(dam)}>{goi.charAt(0).toUpperCase() || "?"}</Chu>
      </View>
      <OLom nhan="Tên gọi của con" value={ten} onChangeText={setTen} placeholder="Khang" maxLength={30} autoComplete="off" />
      <View style={{ gap: 8 }}>
        <Chu kieu="rat" co={14} style={{ paddingHorizontal: 4 }}>Con mấy tuổi?</Chu>
        <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup">
          {CHIP_TUOI.map((c, i) => {
            const on = i === tuoi;
            return (
              <Pressable key={c.chu} onPress={() => setTuoi(on ? null : i)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${c.chu} tuổi`}
                style={[{ flex: 1, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center" }, on ? { backgroundColor: M.chinh } : { backgroundColor: M.the, ...KHOI.nho }]}>
                <Chu kieu="rat" co={16} so mau={on ? "#fff" : M.chu}>{c.chu}</Chu>
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <Chu kieu="rat" co={14} style={{ paddingHorizontal: 4 }}>Màu của con</Chu>
        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4 }} accessibilityRole="radiogroup">
          {MAU_HO_SO.map(([m], i) => (
            <Pressable key={m} onPress={() => setMau(i)} accessibilityRole="radio" accessibilityState={{ checked: i === mau }} accessibilityLabel={`Màu ${i + 1}`}
              style={{ width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", ...(i === mau ? { boxShadow: `0px 0px 0px 3px ${M.chinh}` } : {}) }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: m, alignItems: "center", justifyContent: "center" }}>
                {i === mau ? <Icon ten="tick" mau="#fff" co={16} /> : null}
              </View>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 4 }}>
          <Chu kieu="rat" co={14} style={{ flex: 1 }}>{`PIN để ${goi || "con"} vào máy · 4 số`}</Chu>
          <Pressable onPress={() => setHien((x) => !x)} accessibilityRole="button" accessibilityLabel={hien ? "Ẩn PIN" : "Hiện PIN"} hitSlop={10}>
            <Chu kieu="rat" co={13.5} mau={M.chinhInk}>{hien ? "Ẩn" : "Hiện"}</Chu>
          </Pressable>
        </View>
        <OPin gia={pin} doi={setPin} an={!hien} nhan={`PIN để ${goi || "con"} vào máy`} />
        {/* đang gõ dở: nhắc nhẹ (nút tắt vì sao); đủ 4 số mà sai (năm sinh) mới báo đỏ — như ten-con */}
        {pin && pin.length < 4 ? <Chu co={13} mau={M.chu3}>PIN cần đủ 4 số — hoặc xoá trống để đặt sau.</Chu>
          : loiPin && pin ? <Chu kieu="dam" co={13} mau={M.loi}>{loiPin}</Chu> : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, backgroundColor: M.chinhSoft }}>
        <Rob ten="chi" co={40} />
        <Chu kieu="dam" co={13.5} mau={M.chinhInk} style={{ flex: 1 }}>{`Rob cài sẵn giờ chơi, nhiệm vụ theo tuổi. ${goi || "Con"} chạm tên + PIN để vào máy.`}</Chu>
      </View>
    </Man>
  );
}
