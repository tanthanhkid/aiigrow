// «Thông báo» (thiết kế chốt bm-hang-ngay/33 them-0xf9hrgn — bm-cai-dat/14 đã gộp vào đây): «Cần Ba Mẹ để ý · N» (việc mới phải làm: cảnh báo,
// con xin, con nộp bài — thẻ trắng vạch cam + «Xem ›/Trả lời ›/Duyệt ›») rồi «Để biết» (quà, người nhà, việc người lớn khác làm…).
// Mở màn là đánh dấu đã đọc (thẻ «mới» vẫn hiện tới lần mở sau). Bấm một thẻ ⇒ tới đúng chỗ xử lý (`den` của máy chủ). Nút «Cài đặt» ở đầu màn.
import { useEffect } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { type MucCanDeY } from "@/lib/s3";
import { MucTieu, NutVien, OIcon, TheDong } from "@/lib/ui-bm3";
import { CanhGiua, ChoTai, M, Man, gioPhut, type TenIcon, useTai } from "@/lib/ui";

type Nhom = "nhiem_vu" | "yeu_cau" | "qua" | "thanh_tich" | "ba_me_khac" | "canh_bao" | "gia_dinh";
type ThongBao = {
  id: string; nhom: Nhom; muc: "thong_tin" | "chu_y" | "nghiem_trong";
  tieu: string; phu: string; luc: string; con: string | null; den: string; so: number; moi: boolean; day: boolean; imLang: boolean;
};
type DsThongBao = { ds: ThongBao[]; chuaDoc: number; /** S3 06/11: mục «Cần Ba Mẹ để ý» do máy chủ gom + số chuông */ canDeY?: MucCanDeY[]; soChuong?: number; caiDat: { yenLang: { bat: boolean; tu: string; den: string }; tat: string[] } };

/** icon + nền ô icon (.ic · .ic.cam · .ic.vang) + chữ hành động của thẻ cần để ý */
const KIEU: Record<Nhom, { ic: TenIcon; nen?: string; lam?: string }> = {
  canh_bao: { ic: "khien", nen: "#fdeedd", lam: "Xem ›" }, yeu_cau: { ic: "web", lam: "Trả lời ›" }, nhiem_vu: { ic: "sao", nen: M.diemSoft, lam: "Duyệt ›" },
  qua: { ic: "coc", nen: M.diemSoft }, thanh_tich: { ic: "sao", nen: M.diemSoft }, ba_me_khac: { ic: "nguoi" }, gia_dinh: { ic: "nguoi" },
};
/** icon của mục «Cần Ba Mẹ để ý» theo loại (can-de-y.ts) */
const IC_CAN: Record<string, TenIcon> = { mat_mang: "wifi", quen_pin: "mo_khoa", canh_bao: "khien", con_xin: "web", nop_bai: "sao", chua_bao_ve: "tablet" };
/** Dòng «moi» mà «Cần Ba Mẹ để ý» của máy chủ ĐANG có mục cùng loại cho cùng Con (con xin / nộp bài / cảnh báo) ⇒ không lặp ở «Để biết».
 *  Dòng khác (con nhắn lại, lời xin Ba/Mẹ kia đã trả lời, cảnh báo đã đọc) vẫn ở «Để biết». */
const LOAI_GOM: Partial<Record<Nhom, string>> = { yeu_cau: "con_xin", nhiem_vu: "nop_bai", canh_bao: "canh_bao" };
const daGom = (x: ThongBao, gom: MucCanDeY[]) => x.moi && !!LOAI_GOM[x.nhom] && gom.some((g) => g.loai === LOAI_GOM[x.nhom] && (!x.con || g.con === x.con));
const canDeY = (x: ThongBao) => x.muc === "nghiem_trong" || (x.moi && (x.nhom === "canh_bao" || x.nhom === "yeu_cau" || x.nhom === "nhiem_vu"));

const ngayCua = (s: string) => {
  const t = new Date(s), h = new Date();
  const hq = new Date(h.getFullYear(), h.getMonth(), h.getDate() - 1);
  if (t.toDateString() === h.toDateString()) return gioPhut(s);
  if (t.toDateString() === hq.toDateString()) return "Hôm qua";
  return `${String(t.getDate()).padStart(2, "0")}/${String(t.getMonth() + 1).padStart(2, "0")}`;
};

export default function DsThongBaoMan() {
  const { d, loi, matMang, tai } = useTai(() => bm.goi<DsThongBao>("thong-bao"));
  const chuaDoc = d?.chuaDoc ?? 0;
  useEffect(() => { if (chuaDoc) bm.goi("thong-bao/doc", {}).catch(() => {}); }, [chuaDoc]);
  const phai = <NutVien chu="Cài đặt" bam={() => router.push("/thong-bao/cai-dat")} />;
  if (!d) return <Man lui={{ chu: "" }} tieu="Thông báo" phai={phai}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  if (!d.ds.length && !d.canDeY?.length) {
    return (
      <Man lui={{ chu: "" }} tieu="Thông báo" phai={phai}>
        <CanhGiua lv="ngu" tieu="Chưa có gì mới" loi="Khi con xin, nộp bài hay đổi quà, Grow báo Ba Mẹ ở đây." />
      </Man>
    );
  }
  // máy chủ mới gom «Cần Ba Mẹ để ý» (mất mạng, quên PIN, cảnh báo, con xin, nộp bài, máy chưa bảo vệ) ⇒ dùng nguyên; «Để biết» = các dòng còn lại
  const mayChu = d.canDeY;
  const can = mayChu ? [] : d.ds.filter(canDeY), biet = d.ds.filter((x) => !(mayChu ? daGom(x, mayChu) : canDeY(x)));
  const the = (x: ThongBao, deY: boolean) => {
    const k = KIEU[x.nhom];
    return (
      <TheDong key={x.id} vach={deY ? "#e2660f" : undefined} trai={<OIcon ic={k.ic} nen={x.muc === "nghiem_trong" ? M.loiSoft : k.nen} />} tieu={x.tieu}
        phu={[ngayCua(x.luc), x.phu, x.imLang ? "trong giờ yên lặng" : null].filter(Boolean).join(" · ")} phai={deY ? k.lam ?? "Xem ›" : undefined}
        bam={() => router.push(x.den as never)} />
    );
  };
  return (
    <Man lui={{ chu: "" }} tieu="Thông báo" phai={phai} tai={tai} vongTai>
      {mayChu?.length ? <><MucTieu chu={`Cần Ba Mẹ để ý · ${mayChu.length}`} /><View style={{ gap: 10 }}>{mayChu.map((x) => (
        <TheDong key={x.id} vach="#e2660f" trai={<OIcon ic={IC_CAN[x.loai] ?? "chuong"} nen={x.loai === "mat_mang" || x.loai === "canh_bao" ? "#fdeedd" : undefined} />}
          tieu={x.tieu} phu={x.phu || ngayCua(x.luc)}
          phai={`${x.nut} ›`} bam={() => router.push(x.den as never)} />
      ))}</View></> : null}
      {can.length ? <><MucTieu chu={`Cần Ba Mẹ để ý · ${can.length}`} /><View style={{ gap: 10 }}>{can.map((x) => the(x, true))}</View></> : null}
      {biet.length ? <><MucTieu chu="Để biết" /><View style={{ gap: 10 }}>{biet.map((x) => the(x, false))}</View></> : null}
    </Man>
  );
}
