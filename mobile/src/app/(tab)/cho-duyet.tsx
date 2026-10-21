// bm-cho-duyet: hộp thư chờ duyệt gom theo Con, duyệt hàng loạt (FR-03.03, FR-05.02).
import { router } from "expo-router";
import { View } from "react-native";
import { bm, LOAI_YC, NHOM_NV, tieuYc, type LuotCho, type YeuCau } from "@/lib/api";
import {
  Avt, BieuTron, Canh, CanhGiua, ChoTai, Dong, gioPhut, MAU_CON, Man, Nhan, Nhom, NhomTieu, Nut, useHoanTac, useLam, useTai, BaoLoi, useBaoKhiVe,
} from "@/lib/ui";


export default function ChoDuyet() {
  const { d, loi, matMang, tai, dangTai } = useTai(() => bm.goi<{ nhiemVu: LuotCho[]; yeuCau: YeuCau[] }>("cho-duyet"));
  const hl = useLam();
  const { bao, noi } = useHoanTac();
  useBaoKhiVe(bao);
  if (!d) return <Man tieuLon="Chờ duyệt" chat><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const tong = d.nhiemVu.length + d.yeuCau.length;
  if (!tong) {
    return (
      <Man tieuLon="Chờ duyệt" chat noi={noi}>
        <CanhGiua lv="canh-trong" tieu="Không có việc nào chờ" loi="Khi Con nộp nhiệm vụ hoặc xin phép, Rob báo Ba Mẹ ngay.">
          <Nut chu="Giao một nhiệm vụ" ic="cong" bam={() => router.push("/giao-nv")} />
        </CanhGiua>
      </Man>
    );
  }
  const con = [...new Map([...d.nhiemVu, ...d.yeuCau].map((x) => [x.child_id, x.ten_con])).entries()];
  const cuNhat = [...d.nhiemVu.map((x) => x.nop_luc), ...d.yeuCau.map((x) => x.created_at)].sort()[0];
  const phut = Math.max(1, Math.round((Date.now() - new Date(cuNhat).getTime()) / 60000));
  return (
    <Man tieuLon="Chờ duyệt" chat tai={tai} dangTai={dangTai} noi={noi}>
      <Canh lv="cho" thap tieu={`${tong} việc đang chờ`} loi={`Cũ nhất ${phut < 60 ? `${phut} phút` : `${Math.round(phut / 60)} giờ`}. Duyệt xong là điểm vào ví Con ngay.`} />
      <BaoLoi loi={hl.loi} />
      {con.map(([id, ten], ci) => {
        const nv = d.nhiemVu.filter((x) => x.child_id === id), yc = d.yeuCau.filter((x) => x.child_id === id);
        return (
          <View key={id} style={{ gap: 12 }}>
            {nv.length ? (
              <>
                <NhomTieu chu={`${ten} · ${nv.length} nhiệm vụ`} phai={nv.length > 1 ? { chu: `Duyệt cả ${nv.length}`, bam: () => hl.lam(async () => {
                  const r = await bm.goi<{ daDuyet: number }>("duyet-hang-loat", { ids: nv.map((x) => x.id) });
                  bao(`Đã duyệt ${r.daDuyet} nhiệm vụ của ${ten}`);
                  await tai();
                }) } : undefined} />
                <Nhom>
                  {nv.map((x, i) => (
                    <Dong key={x.id} dau={i === 0} tieu={x.ten} phu={`Nộp ${gioPhut(x.nop_luc)} · ${x.so_anh ? `${x.so_anh} ảnh` : "không ảnh"}${x.nghi_trung ? " · ảnh giống lần trước" : ""}`}
                      trai={<BieuTron ic={(NHOM_NV[x.nhom] ?? NHOM_NV.khac).ic} mau={x.nghi_trung ? "cam" : (NHOM_NV[x.nhom] ?? NHOM_NV.khac).mau} />} phai={<Nhan loai="diem" chu={`+${x.diem}`} />}
                      bam={() => router.push(`/duyet/${x.id}`)} />
                  ))}
                </Nhom>
              </>
            ) : null}
            {yc.length ? (
              <>
                <NhomTieu chu={`${ten} · ${yc.length} yêu cầu`} />
                <Nhom>
                  {yc.map((y, i) => (
                    <Dong key={y.id} dau={i === 0} tieu={tieuYc(y)} phu={`“${y.ly_do}” · ${gioPhut(y.created_at)}`} trai={<Avt ten={ten} mau={MAU_CON[ci % MAU_CON.length]} />}
                      phai={<Nhan loai="canh" chu={LOAI_YC[y.loai]} />} bam={() => router.push(`/yeu-cau/${y.id}`)} />
                  ))}
                </Nhom>
              </>
            ) : null}
          </View>
        );
      })}
    </Man>
  );
}
