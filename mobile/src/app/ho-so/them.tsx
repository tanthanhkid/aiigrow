// them-9ozp26pq «Thêm con» từ tab Cả nhà (thiết kế chốt 06/11, L13): vòng tròn chữ cái theo màu, «Tên gọi của con», «Con mấy tuổi?» chip 4–5 … 13+
// (thay ô năm sinh của bước Lần đầu), «Màu của con», «PIN để <tên> vào máy · 4 số» có Ẩn/Hiện, lời Rob, «Tạo hồ sơ cho <tên>» ⇒ POST con
// {ten, namSinh, avatar, pin?} ⇒ Hồ sơ con (bm2-ho-so). PIN bỏ trống = chưa đặt (máy hỏi Ba Mẹ đặt sau). Luồng Lần đầu vẫn ở thiet-lap/ten-con.
import { useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { bm } from "@/lib/api";
import { cuoiTuanCua, NGU_MAC_DINH, QUY_MAC_DINH, type AppGoiY } from "@/lib/ghep-may";
import { appsRobChonSan } from "@/lib/thiet-lap";
import { BONG, KHOI } from "@/lib/clay";
import { MAU_HO_SO, OLom } from "@/lib/lan-dau";
import { boTheoTuoi, CHIP_TUOI, kiemPin, namTuChipTuoi } from "@/lib/s3";
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
  const [conId, setConId] = useState<string | null>(null);   // đã tạo (lời đáp lỗi sau đó) ⇒ bấm lại chỉ sửa Con này, không tạo Con thứ hai
  const tao = () => lam(async () => {
    // POST con tạo Con + PIN trong MỘT lời (PIN sai ⇒ không tạo gì). Đã tạo (lỗi ở bước sau) ⇒ bấm lại không tạo Con thứ hai.
    const id = conId ?? (await bm.goi<{ id: string }>("con", { ten: tenGon, ...(namSinh ? { namSinh } : {}), avatar: `mau-${mau}`, ...(pin ? { pin } : {}) })).id;
    setConId(id);
    // «Rob cài sẵn giờ chơi, nhiệm vụ theo tuổi»: mặc định như bước Lần đầu + bộ việc hợp chip tuổi; lỗi không chặn (Ba Mẹ chỉnh ở Hồ sơ)
    // Thiết kế không có bước Chọn app ⇒ áp sẵn app Rob gợi ý hợp tuổi (như Lần đầu) để máy ghép xong không phải xin duyệt từng app; Ba Mẹ sửa ở App & web.
    const apps = await bm.goi<{ ds: AppGoiY[] }>(`app-goi-y?con=${encodeURIComponent(id)}`).then((r) => appsRobChonSan(r.ds)).catch(() => undefined);
    await Promise.allSettled([
      bm.goi("thiet-lap", { con: { id }, gioChoi: { ngayThuong: QUY_MAC_DINH, cuoiTuan: cuoiTuanCua(QUY_MAC_DINH) }, ngu: NGU_MAC_DINH,
        ...(apps ? { apps: apps.map((a) => ("ma" in a ? { ma: a.ma } : { ten: a.ten, tinhGio: a.tinhGio })) } : {}) }),
      bm.goi("nhiem-vu/bo", { bo: boTheoTuoi(tuoi), con: id }),
    ]);
    router.replace(`/ho-so/${id}` as never);
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
