// them-ux0c23p4 «Chào (được mời)» — nhánh «Tôi được mời vào nhà» (thiết kế chốt 04/11, L6): không nhập mã nữa.
//   · Mở từ link mời …/moi?ma=<token>: xem trước lời mời (GET moi/:ma) ⇒ thẻ «Mẹ Lan mời bạn vào nhà», tạo tài khoản bằng link (moi/dang-ky).
//   · Bấm từ màn Chào (không link): tạo tài khoản bằng ĐÚNG số người nhà đã mời ⇒ lời mời tự hiện (moi/cho-toi) ở màn /moi/vao.
//   · Google / Facebook (lib/dang-nhap-mxh.tsx): email khớp lời mời ⇒ lời mời tự hiện; có link ⇒ /moi/vao?ma= nhận bằng link.
//   · Đã đăng nhập ⇒ sang thẳng /moi/vao.
import { useEffect } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { bm } from "@/lib/api";
import { usePhien } from "@/lib/phien";
import { Text, View } from "react-native";
import { DauMan, INK2 } from "@/lib/lan-dau";
import { ChonCachTaoTk } from "@/lib/dang-nhap-mxh";
import { cauTrong, ma0, SanMoi, type XemMoi } from "@/lib/moi";
import { F, M, Man, useHoanTac, useTai } from "@/lib/ui";

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
  const tre = d?.tenCon ?? [];
  const tenAi = ai ?? "Người nhà";
  return (
    <Man noi={noi} dau={<DauMan ve="/chao" tieu="Tạo tài khoản" />} dayStyle={{ paddingTop: 0, paddingBottom: 18 }}
      day={<ChonCachTaoTk bien="moi" sdt={sdt} bao={bao} nc={m ? { moi: m } : { duocMoi: true }} />}>
      {/* bàn them-ux0c23p4 (sửa 19/11): sân tối 372 + thẻ lời mời + tiêu đề «Vào nhà cùng …» dưới sân; đáy chỉ có 3 nút MXH / SĐT + điều khoản (bàn không còn «Tôi đã có tài khoản» — quay lại màn Chào để đăng nhập) */}
      {d ? <SanMoi ai={tenAi} dong1={`${tenAi} mời bạn vào nhà`} dong2={tre.length ? (tre.length > 2 ? `Cùng trông ${tre.length} bé` : cauTrong(tre)) : d.tenGiaDinh} tre={tre} />
        : <SanMoi ai={tenAi} dong1="Được người nhà mời?" dong2="Lời mời sẽ tự hiện" tre={[]} />}
      <View style={{ marginTop: 6, alignItems: "center", paddingHorizontal: 4 }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.tieu, fontSize: 28, lineHeight: 34, letterSpacing: -0.6, color: M.chu, textAlign: "center" }}>{ai ? `Vào nhà cùng ${ai}` : "Vào nhà cùng người nhà"}</Text>
        <Text style={{ marginTop: 6, fontFamily: F.thuong, fontSize: 15, lineHeight: 21, color: INK2, textAlign: "center" }}>Chọn một cách để tạo tài khoản, chưa tới 1 phút.</Text>
      </View>
    </Man>
  );
}
