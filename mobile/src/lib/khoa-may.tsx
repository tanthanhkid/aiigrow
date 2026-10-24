// Bảng «Khoá máy ngay» (trang chủ + Giờ dùng máy): chọn khoá bao lâu — 15 phút / 1 giờ / tới sáng mai / tới khi Ba Mẹ mở.
// Server lưu hạn (`khoa_den`) và tự hết khi qua giờ đó (server/lib/cau-hinh.ts › dangKhoa); máy Con nhận ở lần đồng bộ kế.
import { useState } from "react";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { BangTruot, BaoLoi, BieuTron, Chu, M, Nut, OChon, gioPhut, useLam } from "@/lib/ui";

type Han = "15" | "60" | "sang" | "mo";
/** 7:00 sáng hôm sau theo giờ máy Ba Mẹ (đã qua nửa đêm mà chưa tới 7:00 thì là 7:00 hôm nay). */
function sangMai(now = new Date()) {
  const t = new Date(now);
  t.setHours(7, 0, 0, 0);
  if (t.getTime() <= now.getTime()) t.setDate(t.getDate() + 1);
  return t;
}
export function denCua(han: Han, now = new Date()): Date | null {
  return han === "15" ? new Date(now.getTime() + 15 * 60_000) : han === "60" ? new Date(now.getTime() + 3600_000) : han === "sang" ? sangMai(now) : null;
}
/** «Khoá tới 10:41» / «Khoá tới khi Ba Mẹ mở». */
export const cauKhoa = (den: string | null | undefined) => (den ? `Khoá tới ${gioPhut(den)}` : "Khoá tới khi Ba Mẹ mở");

/** Gọi API khoá (có hạn hoặc không) / mở lại. */
export async function datKhoa(con: string, khoa: boolean, den: Date | null) {
  await bm.goi(`con/${con}/khoa`, { khoa, ...(khoa && den ? { den: den.toISOString() } : {}) });
}

export function BangKhoa({ mo, dong, con, ten, xong }: {
  mo: boolean; dong: () => void; con: string; ten: string;
  /** sau khi khoá xong: chữ báo + hàm hoàn tác (mở lại) */
  xong: (chu: string, hoan: () => Promise<void>) => void;
}) {
  const [han, setHan] = useState<Han>("60");
  const { lam, loi, dangChay } = useLam();
  const now = new Date();
  const lua: { gia: Han; tieu: string; phu?: string; ic: "dongho" | "trang_ngu" | "khoa" }[] = [
    { gia: "15", tieu: "15 phút", phu: `tới ${gioPhut(denCua("15", now))}`, ic: "dongho" },
    { gia: "60", tieu: "1 giờ", phu: `tới ${gioPhut(denCua("60", now))}`, ic: "dongho" },
    { gia: "sang", tieu: "Tới sáng mai", phu: "mở lúc 7:00", ic: "trang_ngu" },
    { gia: "mo", tieu: "Cho tới khi tôi mở", ic: "khoa" },
  ];
  return (
    <BangTruot mo={mo} dong={dong} tieu={`Khoá máy của ${ten}`}>
      <Chu co={14} mau={M.chu2}>Máy khoá ở lần đồng bộ kế (thường dưới 2 phút). Con vẫn xem được nhiệm vụ và xin mở.</Chu>
      <View style={{ gap: 8 }}>
        {lua.map((x) => (
          <OChon key={x.gia} chon={han === x.gia} bam={() => setHan(x.gia)} trai={<BieuTron ic={x.ic} mau={x.gia === "mo" ? "do" : "xanh"} />} tieu={x.tieu} phu={x.phu} />
        ))}
      </View>
      <BaoLoi loi={loi} />
      <Nut chu="Khoá ngay" ic="khoa" loai="huy" rong dangChay={dangChay} bam={() => lam(async () => {
        const den = denCua(han);
        await datKhoa(con, true, den);
        dong();
        xong(`Đã khoá máy của ${ten}${den ? ` tới ${gioPhut(den)}` : ""}`, () => datKhoa(con, false, null));
      })} />
    </BangTruot>
  );
}
