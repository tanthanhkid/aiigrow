// «Quà con đổi bằng sao» (thiết kế chốt 05/11 bm-hang-ngay/50, L10): quà Ba Mẹ trao ngoài đời — con thấy trên máy, đủ sao thì tự đổi.
// Không còn phiếu AiiCafe (loai voucher ẩn). Bấm một quà để sửa (/vi/qua-sua?id=), «+ Thêm quà». Người trông giúp: chỉ xem.
import { router } from "expo-router";
import { Pressable } from "react-native";
import { bm, type Qua } from "@/lib/api";
import { BaoLoi, ChoTai, Chu, M, Man, Nut, The, useBaoKhiVe, useHoanTac, useLam, useTai } from "@/lib/ui";
import { CAU_TRONG_GIUP, HangViec, quyenToi, SaoVien } from "@/lib/hang-ngay";

export default function QuaDoiSao() {
  const { d, loi, matMang, tai } = useTai(async () => {
    const [qua, quyen] = await Promise.all([bm.goi<{ ds: (Qua & { phut?: number | null })[] }>("qua"), quyenToi()]);
    return { qua: qua.ds.filter((x) => x.bat && x.loai !== "voucher"), baMe: quyen === "ba_me" };
  });
  const { lam, loi: loiLam, dangChay } = useLam();
  const { bao, noi } = useHoanTac();
  useBaoKhiVe(bao);
  if (!d) return <Man lui={{ chu: "Quay lại" }} tieu="Quà con đổi bằng sao"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  return (
    <Man lui={{ chu: "Quay lại" }} tieu="Quà con đổi bằng sao" noi={noi} tai={tai}
      day={!d.qua.length && d.baMe ? <><BaoLoi loi={loiLam} /><Nut chu="Dùng 4 quà gợi ý" rong dangChay={dangChay} bam={() => lam(async () => { await bm.goi("qua/mau", {}); await tai(); })} /></> : undefined}>
      <Chu co={14.5} mau={M.chu2} style={{ marginHorizontal: 4 }}>Con thấy các quà này trên máy, đủ sao thì tự đổi. Ba Mẹ trao quà ngoài đời.</Chu>
      <The>
        {d.qua.length ? d.qua.map((x, i) => (
          <HangViec key={x.id} dau={i === 0} ic={x.loai === ("phut" as string) ? "dongho" : "qua"} mau={x.loai === ("phut" as string) ? "xanh" : "cam"} tieu={x.ten}
            phu={x.toi_da_thang ? `Tối đa ${x.toi_da_thang} lần mỗi tháng` : undefined}
            phai={<SaoVien n={x.diem} nho />} bam={d.baMe ? () => router.push(`/vi/qua-sua?id=${x.id}` as never) : undefined} />
        )) : <Chu co={14} mau={M.chu2}>Chưa có quà nào.</Chu>}
        {d.baMe ? (
          <Pressable onPress={() => router.push("/vi/qua-sua" as never)} accessibilityRole="button" style={{ minHeight: 48, justifyContent: "center", marginTop: 4 }}>
            <Chu kieu="rat" co={15} mau={M.chinhInk}>+ Thêm quà</Chu>
          </Pressable>
        ) : null}
      </The>
      {!d.baMe ? <Chu co={13} mau={M.chu3}>{CAU_TRONG_GIUP}</Chu> : null}
    </Man>
  );
}
