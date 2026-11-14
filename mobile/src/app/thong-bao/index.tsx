// «Thông báo» (thiết kế chốt bm-hang-ngay/33 them-0xf9hrgn — bm-cai-dat/14 đã gộp vào đây): «Cần Ba Mẹ để ý · N» (việc mới phải làm: cảnh báo,
// con xin, con nộp bài — thẻ trắng vạch cam + «Xem ›/Trả lời ›/Duyệt ›») rồi «Để biết» (quà, người nhà, việc người lớn khác làm…).
// Mở màn là đánh dấu đã đọc (thẻ «mới» vẫn hiện tới lần mở sau). Bấm một thẻ ⇒ tới đúng chỗ xử lý (`den` của máy chủ). Nút «Cài đặt» ở đầu màn.
import { useEffect, type ReactNode } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { BONG, KHOI } from "@/lib/clay";
import { TieuMuc } from "@/lib/hang-ngay";
import { OLomIcon } from "@/lib/ui-viec";
import { bm } from "@/lib/api";
import { type MucCanDeY } from "@/lib/s3";
import { CanhGiua, ChoTai, Chu, Icon3D, M, Man, gioPhut, type TenIcon, useTai } from "@/lib/ui";

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
  // thiết kế .cai: nút tròn sáng 44 với bánh răng 3D
  const phai = (
    <Pressable onPress={() => router.push("/thong-bao/cai-dat")} accessibilityRole="button" accessibilityLabel="Cài đặt thông báo"
      style={[{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#f7f6f3", alignItems: "center", justifyContent: "center" }, KHOI.nho]}>
      <Icon3D ten="banhrang" co={24} />
    </Pressable>
  );
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
  const dongTb = (x: ThongBao, deY: boolean, k: number) => {
    const kk = KIEU[x.nhom];
    return <DongTb key={x.id} k={k} deY={deY} luc={ngayCua(x.luc)} ic={kk.ic} tieu={x.tieu}
      phu={[x.phu, x.imLang ? "trong giờ yên lặng" : null].filter(Boolean).join(" · ")} lam={deY ? kk.lam ?? "Xem ›" : undefined} bam={() => router.push(x.den as never)} />;
  };
  return (
    <Man lui={{ chu: "" }} tieu="Thông báo" phai={phai} tai={tai} vongTai>
      {mayChu?.length ? <><TieuMuc chu="Cần Ba Mẹ để ý" so={mayChu.length} /><NhomTb deY>{mayChu.map((x, k) => (
        <DongTb key={x.id} k={k} deY luc={ngayCua(x.luc)} ic={IC_CAN[x.loai] ?? "chuong"} tieu={x.tieu} phu={x.phu} lam={`${x.nut} ›`} bam={() => router.push(x.den as never)} />
      ))}</NhomTb></> : null}
      {can.length ? <><TieuMuc chu="Cần Ba Mẹ để ý" so={can.length} /><NhomTb deY>{can.map((x, k) => dongTb(x, true, k))}</NhomTb></> : null}
      {biet.length ? <><TieuMuc chu="Để biết" /><NhomTb>{biet.map((x, k) => dongTb(x, false, k))}</NhomTb></> : null}
    </Man>
  );
}

/** Thẻ nhóm (thiết kế .de-y đào / .ds sáng): các dòng cách nhau bằng vạch mảnh. */
function NhomTb({ deY, children }: { deY?: boolean; children: ReactNode }) {
  return <View style={[{ paddingVertical: 4, paddingHorizontal: 12, borderRadius: 28, backgroundColor: deY ? "#f9e7d2" : "#f7f6f3" }, KHOI.the]}>{children}</View>;
}

/** Một dòng thông báo (.lg): giờ (cột 40) · ô icon lõm · tiêu đề + dòng phụ · hành động («Trả lời» viên than chì, còn lại chữ «Xem ›»). */
function DongTb({ k, deY, luc, ic, tieu, phu, lam, bam }: { k: number; deY?: boolean; luc: string; ic: TenIcon; tieu: string; phu?: string; lam?: string; bam: () => void }) {
  const traLoi = !!lam && /^Trả lời/.test(lam);
  return (
    <Pressable onPress={bam} accessibilityRole="button" accessibilityLabel={[tieu, phu, luc].filter(Boolean).join(", ")}
      style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 64, paddingVertical: 8, borderTopWidth: k ? 1.5 : 0, borderTopColor: deY ? "#f3d6b8" : "#ecebe7" }}>
      <Chu kieu="rat" co={13} mau="#565c59" style={{ width: 40 }} dong={1}>{luc}</Chu>
      <OLomIcon ic={ic} nen={deY ? "#f3d6b8" : "#ecebe7"} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={15} dong={2}>{tieu}</Chu>
        {phu ? <Chu kieu="dam" co={12.5} mau={deY ? "#8a3c0c" : "#565c59"} dong={2}>{phu}</Chu> : null}
      </View>
      {lam ? traLoi ? (
        <View style={{ height: 36, paddingHorizontal: 11, borderRadius: 18, backgroundColor: M.nut, justifyContent: "center", boxShadow: BONG.toi }}>
          <Chu kieu="rat" co={13} mau="#fff">{lam.replace(/ ›$/, "")}</Chu>
        </View>
      ) : <Chu kieu="rat" co={13.5} mau={deY ? "#8a3c0c" : M.chinhInk}>{lam}</Chu> : null}
    </Pressable>
  );
}
