// them-9ozp26pq «Thêm con» từ tab Cả nhà (thiết kế chốt 14/11 bm-ca-nha/02): cùng form hồ sơ với bước Lần đầu (lib/form-ho-so.tsx) — thẻ hồ sơ
// «K · Khang · 🐓 9 tuổi» + Grow, «Tên gọi ở nhà», «Năm sinh» (bảng bánh xe, «2017 · tuổi Dậu»), «Màu của con», thẻ «Mã PIN vào máy · 4 số»,
// «Lưu hồ sơ <tên>» ⇒ POST con {ten, namSinh, avatar, pin?} ⇒ «Đã tạo hồ sơ · bước tiếp» (bm-ca-nha/03, ho-so/[id]/tiep). PIN bỏ trống = chưa đặt (máy hỏi Ba Mẹ đặt sau).
// Grow cài sẵn giờ chơi + bộ việc theo tuổi (tuổi tính từ năm sinh; chưa chọn năm ⇒ bộ Tự lập).
import { useState } from "react";
import { router } from "expo-router";
import { bm } from "@/lib/api";
import { cuoiTuanCua, NGU_MAC_DINH, QUY_MAC_DINH, type AppGoiY } from "@/lib/ghep-may";
import { appsRobChonSan, thanThietLap } from "@/lib/thiet-lap";
import { ChonMauCon, namCua, ONamSinh, TheHoSoCon, ThePinCon } from "@/lib/form-ho-so";
import { OLom } from "@/lib/lan-dau";
import { boTheoTuoi, kiemPin } from "@/lib/s3";
import { BaoLoi, Chu, Man, Nut, useLam } from "@/lib/ui";

/** Tuổi ⇒ chỉ số chip tuổi của bộ việc (4–5 · 6–7 · 8–9 · 10–12 · 13+); chưa có năm sinh ⇒ null. */
const chipTuNam = (nam: number | null) => {
  if (!nam) return null;
  const t = new Date().getFullYear() - nam;
  return t <= 5 ? 0 : t <= 7 ? 1 : t <= 9 ? 2 : t <= 12 ? 3 : 4;
};

export default function ThemCon() {
  const [ten, setTen] = useState("");
  const [nam, setNam] = useState("");
  const [mau, setMau] = useState(0);
  const [pin, setPin] = useState("");
  const { lam, loi, dangChay } = useLam();
  const tenGon = ten.trim();
  const goi = tenGon.split(/\s+/).pop() ?? "";
  const namSinh = namCua(nam);
  const tuoi = chipTuNam(namSinh);
  const loiPin = kiemPin(pin, null, namSinh);
  const [conId, setConId] = useState<string | null>(null);   // đã tạo (lời đáp lỗi sau đó) ⇒ bấm lại chỉ sửa Con này, không tạo Con thứ hai
  const tao = () => lam(async () => {
    // POST con tạo Con + PIN trong MỘT lời (PIN sai ⇒ không tạo gì). Đã tạo (lỗi ở bước sau) ⇒ bấm lại không tạo Con thứ hai.
    const id = conId ?? (await bm.goi<{ id: string }>("con", { ten: tenGon, ...(namSinh ? { namSinh } : {}), avatar: `mau-${mau}`, ...(pin ? { pin } : {}) })).id;
    setConId(id);
    // «Grow cài sẵn giờ chơi, nhiệm vụ theo tuổi»: mặc định như bước Lần đầu + bộ việc hợp chip tuổi; lỗi không chặn (Ba Mẹ chỉnh ở Hồ sơ)
    // Thiết kế không có bước Chọn app ⇒ áp sẵn app Grow gợi ý hợp tuổi (như Lần đầu) để máy ghép xong không phải xin duyệt từng app; Ba Mẹ sửa ở App & web.
    const layApps = () => bm.goi<{ ds: AppGoiY[] }>(`app-goi-y?con=${encodeURIComponent(id)}`).then((r) => appsRobChonSan(r.ds));
    // Lỗi lấy app gợi ý KHÔNG nuốt: Con đã tạo (conId) nên báo lỗi, Ba Mẹ bấm lại chỉ làm tiếp bước này — không để Con nằm không có app nào mà im lặng.
    const apps = await layApps().catch(() => new Promise((r) => setTimeout(r, 600)).then(layApps));
    const mac = { quy: QUY_MAC_DINH, cuoiTuan: cuoiTuanCua, ngu: NGU_MAC_DINH };
    await Promise.allSettled([
      bm.goi("thiet-lap", thanThietLap({ conId: id, ...(apps ? { apps } : {}) }, mac)),
      bm.goi("nhiem-vu/bo", { bo: boTheoTuoi(tuoi), con: id }),
    ]);
    router.replace(`/ho-so/${id}/tiep` as never);
  });
  return (
    <Man lui={{ chu: "", ve: "/cai-dat" }} tieu="Thêm con"
      day={<><BaoLoi loi={loi} />
        <Nut chu={`Lưu hồ sơ ${tenGon || "con"}`} rong dangChay={dangChay} tat={!tenGon || !!loiPin} bam={tao} /></>}>
      <TheHoSoCon ten={ten} nam={nam} mau={mau} />
      <OLom nhan="Tên gọi ở nhà" value={ten} onChangeText={setTen} placeholder="Khang" maxLength={30} autoComplete="off" />
      <ONamSinh nam={nam} doi={setNam} />
      <ChonMauCon mau={mau} doi={setMau} />
      <ThePinCon pin={pin} doi={setPin} loi={loiPin} cau={<><Chu kieu="rat" co={13} mau={M_CHU_NGOC}>{`${goi || "Con"} dùng PIN này để vào máy.`}</Chu> Không dùng ngày sinh.</>} />
    </Man>
  );
}

/** Chữ đậm ngọc trong câu PIN (thiết kế: «Khang dùng PIN này để vào máy.» màu #0a5246). */
const M_CHU_NGOC = "#0a5246";
