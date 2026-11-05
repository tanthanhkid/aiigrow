// them-ux0c23p4 «Chào (được mời)» — nhánh «Tôi được mời vào nhà» (thiết kế chốt 04/11, L6): không nhập mã nữa.
//   · Mở từ link mời …/moi?ma=<token>: xem trước lời mời (GET moi/:ma) ⇒ thẻ «Mẹ Lan mời bạn vào nhà», tạo tài khoản bằng link (moi/dang-ky).
//   · Bấm từ màn Chào (không link): tạo tài khoản bằng ĐÚNG số người nhà đã mời ⇒ lời mời tự hiện (moi/cho-toi) ở màn /moi/vao.
//   · Đã đăng nhập ⇒ sang thẳng /moi/vao.
import { useEffect } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { usePhien } from "@/lib/phien";
import { ChonCachTaoTk, DauMan, KhoiRob, LienKet } from "@/lib/lan-dau";
import { ma0, TheLoiMoi, type XemMoi } from "@/lib/moi";
import { Chu, M, Man, The, useHoanTac, useTai } from "@/lib/ui";

export default function DuocMoi() {
  const { ma } = useLocalSearchParams<{ ma?: string }>();
  const m = ma0(ma);
  const { co } = usePhien();
  const { bao, noi } = useHoanTac();
  const { d, loi } = useTai(() => (m ? bm.goi<XemMoi>(`moi/${encodeURIComponent(m)}`) : Promise.resolve(null)));
  useEffect(() => { if (loi && m) bao(loi); }, [loi]);          // eslint-disable-line react-hooks/exhaustive-deps
  if (co) return <Redirect href={m ? `/moi/vao?ma=${m}` : "/moi/vao"} />;
  const ai = d ? d.nguoiMoi ?? d.tenGiaDinh : null;
  const sdt = () => router.push({ pathname: "/dang-ky", params: m && d ? { moi: m, tenNha: ai ?? "", tenGoi: d.tenGoi ?? "" } : { duocMoi: "1" } });
  return (
    <Man noi={noi} dau={<DauMan ve="/chao" />}>
      <KhoiRob lv="chi" cao={330} tren={d ? <TheLoiMoi x={d} /> : (
        <The><Chu kieu="rat" co={15}>Được người nhà mời?</Chu><Chu co={13} mau={M.chu3}>Tạo tài khoản bằng đúng số điện thoại người nhà đã mời — lời mời sẽ tự hiện.</Chu></The>
      )} />
      <ChonCachTaoTk tieu={ai ? `Vào nhà cùng ${ai}` : "Vào nhà cùng người nhà"} loi="Chọn một cách để tạo tài khoản, chưa tới 1 phút." sdt={sdt} bao={bao} />
      <LienKet chu="Tôi đã có tài khoản" bam={() => router.push({ pathname: "/dang-nhap", params: { moi: m || "1" } })} />
    </Man>
  );
}
