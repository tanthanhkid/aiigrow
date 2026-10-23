// bm-cho-duyet: hộp thư chờ duyệt gom theo Con, duyệt hàng loạt (FR-03.03, FR-05.02).
import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { bm, LOAI_YC, NHOM_NV, tieuYc, type LuotCho, type YeuCau } from "@/lib/api";
import {
  Avt, BangTruot, BieuTron, Canh, Chu, CanhGiua, ChoTai, Dong, gioPhut, MAU_CON, Man, Nhan, Nhom, NhomTieu, Nut, useHoanTac, useLam, useTai, BaoLoi, useBaoKhiVe,
} from "@/lib/ui";


type Phieu = { id: string; child_id: string; ten_con: string; ten: string; loai: string; diem: number; created_at: string };
const IC_QUA: Record<string, readonly ["coc" | "qua" | "ban" | "xu", "cam" | "lam" | "tim" | "vang"]> = { voucher: ["coc", "cam"], qua: ["qua", "lam"], dac_quyen: ["ban", "tim"], tiet_kiem: ["xu", "vang"] };
type TuDong = { id: string; ten_con: string; ten: string; diem: number; nguon: string; ghi_chu: string | null };

export default function ChoDuyet() {
  const { d, loi, matMang, tai, dangTai } = useTai(() => bm.goi<{ nhiemVu: LuotCho[]; yeuCau: YeuCau[]; phieu?: Phieu[]; tuDong?: TuDong[] }>("cho-duyet"));
  const [huy, setHuy] = useState<Phieu | null>(null);
  const hl = useLam();
  const { bao, noi } = useHoanTac();
  useBaoKhiVe(bao);
  const phieu = d?.phieu ?? [];
  const xuLyPhieu = (x: Phieu, viec: "xac-nhan" | "huy") => hl.lam(async () => {
    await bm.goi(`phieu/${x.id}/${viec}`, {});
    bao(viec === "huy" ? `Đã huỷ «${x.ten}», hoàn ${x.diem} điểm cho ${x.ten_con}`
      : x.loai === "voucher" ? `Đã xác nhận «${x.ten}» cho ${x.ten_con}` : `Đã trao «${x.ten}» cho ${x.ten_con}`);
    await tai();
  });
  if (!d) return <Man tieuLon="Chờ duyệt" chat><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const tong = d.nhiemVu.length + d.yeuCau.length + phieu.length;
  if (!tong) {
    return (
      <Man tieuLon="Chờ duyệt" chat noi={noi}>
        <CanhGiua lv="canh-trong" tieu="Không có việc nào chờ" loi="Khi Con nộp nhiệm vụ hoặc xin phép, Rob báo Ba Mẹ ngay.">
          <Nut chu="Giao một nhiệm vụ" ic="cong" bam={() => router.push("/giao-nv")} />
        </CanhGiua>
      </Man>
    );
  }
  const con = [...new Map([...d.nhiemVu, ...d.yeuCau, ...phieu].map((x) => [x.child_id, x.ten_con])).entries()];
  const cuNhat = [...d.nhiemVu.map((x) => x.nop_luc), ...d.yeuCau.map((x) => x.created_at), ...phieu.map((x) => x.created_at)].sort()[0];
  const phut = Math.max(1, Math.round((Date.now() - new Date(cuNhat).getTime()) / 60000));
  return (
    <Man tieuLon="Chờ duyệt" chat tai={tai} dangTai={dangTai} noi={noi}>
      <Canh lv="cho" thap tieu={`${tong} việc đang chờ`} loi={`Cũ nhất ${phut < 60 ? `${phut} phút` : `${Math.round(phut / 60)} giờ`}. ${d.nhiemVu.length || d.yeuCau.length ? "Duyệt xong là điểm vào ví Con ngay." : "Con đã đổi điểm, chờ Ba Mẹ trao quà."}`} />
      <BaoLoi loi={hl.loi} />
      {con.map(([id, ten], ci) => {
        const nv = d.nhiemVu.filter((x) => x.child_id === id), yc = d.yeuCau.filter((x) => x.child_id === id), qa = phieu.filter((x) => x.child_id === id);
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
            {qa.length ? (
              <>
                <NhomTieu chu={`${ten} · ${qa.length} ${qa.every((x) => x.loai === "voucher") ? "phiếu quà chờ xác nhận" : qa.some((x) => x.loai === "voucher") ? "quà chờ trao hoặc xác nhận" : "quà chờ trao"}`} />
                <Nhom>
                  {qa.map((x, i) => (
                    <Dong key={x.id} dau={i === 0} tieu={x.ten} phu={`Đổi ${x.diem} điểm · ${gioPhut(x.created_at)}`} trai={<BieuTron ic={(IC_QUA[x.loai] ?? IC_QUA.qua)[0]} mau={(IC_QUA[x.loai] ?? IC_QUA.qua)[1]} />}
                      phai={<View style={{ flexDirection: "row", gap: 6 }}>
                        <Nut chu={x.loai === "voucher" ? "Xác nhận" : "Đã trao"} nho dangChay={hl.dangChay} bam={() => xuLyPhieu(x, "xac-nhan")} />
                        <Nut chu="Huỷ" loai="vien" nho dangChay={hl.dangChay} bam={() => setHuy(x)} />
                      </View>} />
                  ))}
                </Nhom>
              </>
            ) : null}
          </View>
        );
      })}
      {huy ? (
        <BangTruot mo dong={() => setHuy(null)} tieu={`Huỷ «${huy.ten}»?`}>
          <Chu>{`${huy.ten_con} được hoàn ${huy.diem} điểm. Không hoàn tác được.`}</Chu>
          <BaoLoi loi={hl.loi} />
          <Nut chu="Huỷ phiếu, hoàn điểm" loai="huy" rong dangChay={hl.dangChay} bam={async () => { if (await xuLyPhieu(huy, "huy")) setHuy(null); }} />
          <View style={{ marginTop: 8 }}><Nut chu="Giữ lại" loai="ma" rong bam={() => setHuy(null)} /></View>
        </BangTruot>
      ) : null}
      {d.tuDong?.length ? (
        <>
          <NhomTieu chu="Tự động duyệt hôm nay" />
          <Nhom>
            {d.tuDong.map((x, i) => (
              <Dong key={x.id} dau={i === 0} tieu={x.ghi_chu ? `${x.ten}: ${x.ghi_chu}` : x.ten}
                phu={`${x.ten_con} · +${x.diem} điểm · ${x.nguon === "aiirob" ? "AiiRob tự cộng" : "tự duyệt"}`}
                trai={<BieuTron ic="mu" mau="tim" />} phai={<Nhan loai="xam" chu="Đã duyệt" />} />
            ))}
          </Nhom>
        </>
      ) : null}
    </Man>
  );
}
