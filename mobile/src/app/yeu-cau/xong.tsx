// Kết quả trả lời lời xin của Con (thiết kế chốt 05/11 — bm-hang-ngay 20 «Đã cho mở YouTube», 21 «Đã cho thêm 20 phút», 22 «Đã không cho»).
// params: kieu (them_gio | ngoai_le | mo | khong), ten, con, phut, muc, may, grant. «Hoàn tác» chỉ khi có grant (thêm giờ — 60 giây, đúng người cho).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { bm } from "@/lib/api";
import { hoanTacThemGio, ManKetQua, type QuyCon } from "@/lib/hang-ngay";
import { BaoLoi, gioPhut, useLam, useTai } from "@/lib/ui";

const veHomNay = () => router.replace("/hom-nay" as never);

export default function XongYeuCau() {
  const p = useLocalSearchParams<{ kieu: string; ten: string; con: string; phut?: string; muc?: string; may?: string; grant?: string }>();
  const phut = Number(p.phut) || 0;
  const [luc] = useState(() => Date.now());          // mốc lúc trả lời — một lần, không đổi khi vẽ lại
  const { d } = useTai(() => (p.kieu === "them_gio" && p.con ? bm.goi<QuyCon>(`con/${p.con}/quy`) : Promise.resolve(null)));
  const { lam, loi, dangChay } = useLam();
  const baoMay = p.may ? `Đã báo cho ${p.ten} trên ${p.may}` : `Đã báo cho ${p.ten}`;
  const hoan = p.grant ? { chu: dangChay ? "Đang hoàn tác…" : "Hoàn tác", tat: dangChay,
    bam: () => lam(async () => { await hoanTacThemGio(p.grant!); router.back(); }) } : undefined;
  let tieu: string, loiChu: string, dong: string[];
  if (p.kieu === "them_gio") {
    tieu = `Đã cho ${p.ten} thêm ${phut} phút`;
    const q = d?.quy;
    loiChu = q ? `Chỉ hôm nay: ${q.quyNgayPhut} + ${q.themPhut} = ${q.tongPhut} phút chơi.` : "Chỉ tính cho hôm nay.";
    dong = [baoMay];
  } else if (p.kieu === "ngoai_le") {
    const den = new Date(luc + phut * 60000);
    tieu = `Đã cho ${p.ten} mở ${p.muc || "máy"} ${phut} phút`;
    loiChu = `Không trừ giờ chơi, không trừ sao — từ ${gioPhut(new Date(luc))} tới ${gioPhut(den)}.`;
    dong = [baoMay];
  } else if (p.kieu === "mo") {
    tieu = `Đã cho ${p.ten} dùng ${p.muc}`;
    loiChu = phut ? "Tính vào giờ chơi mỗi ngày của con." : "Dùng thoải mái, không tính giờ chơi.";
    dong = [baoMay];
  } else {
    tieu = "Đã không cho lần này";
    loiChu = `${p.ten} vẫn đổi sao ra phút được nếu muốn.`;
    dong = [`${baoMay}: «Ba Mẹ chưa cho lúc này»`];
  }
  return (
    <ManKetQua lv={p.kieu === "khong" ? "nghi" : "xong"} tieu={tieu} loi={loiChu} dong={dong} chinh={{ chu: "Về Hôm nay", bam: veHomNay }} phu={hoan}>
      <BaoLoi loi={loi} />
    </ManKetQua>
  );
}
