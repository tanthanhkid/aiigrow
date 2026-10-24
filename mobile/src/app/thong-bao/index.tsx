// Thông báo trong app (FR-08.01): mọi việc mới của cả nhà theo thời gian — Con nộp nhiệm vụ (gộp «Ken vừa nộp 3 nhiệm vụ»), Con xin phép,
// đổi quà, huy hiệu, việc Ba Mẹ khác làm, cảnh báo. Chấm xanh = chưa đọc; mở màn là đánh dấu đã đọc. Bấm một dòng ⇒ tới đúng chỗ xử lý.
import { useEffect } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { BieuTron, CanhGiua, ChoTai, Chu, Dong, gioPhut, M, Man, Nhan, Nhom, NhomTieu, Nut, type MauBt, type TenIcon, useTai } from "@/lib/ui";

type ThongBao = {
  id: string; nhom: "nhiem_vu" | "yeu_cau" | "qua" | "thanh_tich" | "ba_me_khac" | "canh_bao" | "gia_dinh"; muc: "thong_tin" | "chu_y" | "nghiem_trong";
  tieu: string; phu: string; luc: string; con: string | null; den: string; so: number; moi: boolean; day: boolean; imLang: boolean;
};
type DsThongBao = { ds: ThongBao[]; chuaDoc: number; caiDat: { yenLang: { bat: boolean; tu: string; den: string }; tat: string[] } };

const IC: Record<ThongBao["nhom"], [TenIcon, MauBt]> = {
  nhiem_vu: ["tick", "xanh"], yeu_cau: ["tin", "lam"], qua: ["qua", "vang"], thanh_tich: ["sao", "vang"], ba_me_khac: ["nguoi", "tim"],
  canh_bao: ["canh_bao", "cam"], gia_dinh: ["nguoi", "xanh"],
};

const ngayCua = (s: string) => {
  const t = new Date(s), h = new Date();
  const hq = new Date(h.getFullYear(), h.getMonth(), h.getDate() - 1);
  if (t.toDateString() === h.toDateString()) return "Hôm nay";
  if (t.toDateString() === hq.toDateString()) return "Hôm qua";
  return `${String(t.getDate()).padStart(2, "0")}/${String(t.getMonth() + 1).padStart(2, "0")}`;
};

export default function DsThongBaoMan() {
  const { d, loi, matMang, tai, dangTai } = useTai(() => bm.goi<DsThongBao>("thong-bao"));
  // đã xem danh sách ⇒ đánh dấu đọc (chấm «mới» vẫn hiện tới lần mở sau để Ba Mẹ biết dòng nào vừa tới)
  const chuaDoc = d?.chuaDoc ?? 0;
  useEffect(() => { if (chuaDoc) bm.goi("thong-bao/doc", {}).catch(() => {}); }, [chuaDoc]);
  const phai = <Nut chu="Cài đặt" nho loai="ma" bam={() => router.push("/thong-bao/cai-dat")} />;
  if (!d) return <Man lui={{ chu: "Trang chủ" }} tieu="Thông báo" phai={phai}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  if (!d.ds.length) {
    return (
      <Man lui={{ chu: "Trang chủ" }} tieu="Thông báo" phai={phai}>
        <CanhGiua lv="ngu" tieu="Chưa có gì mới" loi="Khi Con nộp nhiệm vụ, xin phép hay đổi quà, Rob báo Ba Mẹ ở đây." />
      </Man>
    );
  }
  const nhom: { ngay: string; ds: ThongBao[] }[] = [];
  for (const x of d.ds) {
    const n = ngayCua(x.luc);
    if (nhom.at(-1)?.ngay !== n) nhom.push({ ngay: n, ds: [] });
    nhom.at(-1)!.ds.push(x);
  }
  const yl = d.caiDat.yenLang;
  return (
    <Man lui={{ chu: "Trang chủ" }} tieu="Thông báo" phai={phai} tai={tai} dangTai={dangTai}>
      <Chu co={13.5} mau={M.chu3}>{d.chuaDoc ? `${d.chuaDoc} thông báo mới` : "Đã xem hết thông báo"}{yl.bat ? ` · giờ yên lặng ${yl.tu}–${yl.den}` : ""}</Chu>
      {nhom.map((g) => (
        <View key={g.ngay} style={{ gap: 12 }}>
          <NhomTieu chu={g.ngay} />
          <Nhom>
            {g.ds.map((x, i) => (
              <Dong key={x.id} dau={i === 0} tieu={x.tieu} phu={`${gioPhut(x.luc)} · ${x.phu}${x.imLang ? " · trong giờ yên lặng" : ""}`}
                trai={<BieuTron ic={IC[x.nhom][0]} mau={x.muc === "nghiem_trong" ? "do" : x.muc === "chu_y" ? "cam" : IC[x.nhom][1]} />}
                phai={x.muc === "nghiem_trong" ? <Nhan chu="Nghiêm trọng" loai="loi" /> : x.moi ? <Nhan chu="Mới" loai="ok" cham /> : undefined}
                bam={() => router.push(x.den as never)} />
            ))}
          </Nhom>
        </View>
      ))}
    </Man>
  );
}
