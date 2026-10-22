// «Điểm & quà»: hai thẻ Nhiệm vụ (bm-nhiem-vu) / Phần thưởng (bm-qua) + quỹ phiếu quà AiiCafe. Chạm nhiệm vụ để bật/tắt hoặc sửa điểm.
import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { bm, NHOM_NV, type NhiemVu, type Qua } from "@/lib/api";
import {
  BangTruot, BaoLoi, BieuTron, Canh, CanhGiua, ChoTai, ChonMot, Chu, CongTac, Dong, Man, Nhan, Nhom, Nut, ONhap, tien, useBaoKhiVe, useHoanTac, useLam, useTai,
} from "@/lib/ui";

const tanSuat = (x: NhiemVu) => [x.bang_chung === "tu_dong" ? "Tự động · không cần duyệt" : x.bang_chung === "anh" ? "Ảnh" : "Viết vài câu",
  x.toi_da_ngay ? `tối đa ${x.toi_da_ngay} lần/ngày` : x.toi_da_tuan ? `${x.toi_da_tuan} lần/tuần` : "", x.kieu === "thu_thach" ? "thử thách" : ""].filter(Boolean).join(" · ");
type Phieu = { id: string; ten: string; loai: keyof typeof IC_QUA; diem: number; ten_con: string; created_at: string };
const IC_QUA = { voucher: ["coc", "cam"], qua: ["qua", "lam"], dac_quyen: ["ban", "tim"], tiet_kiem: ["xu", "vang"] } as const;

export default function DiemQua() {
  const [the, setThe] = useState<"nv" | "qua">("nv");
  const { d, loi, matMang, tai } = useTai(async () => ({
    nv: (await bm.goi<{ ds: NhiemVu[] }>("nhiem-vu")).ds, qua: (await bm.goi<{ ds: Qua[] }>("qua")).ds, quy: await bm.goi<{ soDu: number }>("quy"),
    phieu: (await bm.goi<{ ds: Phieu[] }>("phieu")).ds,
    xem: (await bm.goi<{ baMe: { vai: string } }>("toi")).baMe.vai === "xem",
  }));
  const [sua, setSua] = useState<NhiemVu | null>(null);
  const [huy, setHuy] = useState<Phieu | null>(null);
  const [diem, setDiem] = useState("");
  const { lam, loi: loiLam, dangChay } = useLam();
  const { bao, noi } = useHoanTac();
  useBaoKhiVe(bao);
  if (!d) return <Man tieuLon="Điểm & quà" chat><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const nv = d.nv.filter((x) => x.bang_chung !== "tu_dong" || x.bat);
  const xuLy = (x: Phieu, viec: "xac-nhan" | "huy") => lam(async () => {
    await bm.goi(`phieu/${x.id}/${viec}`, {}); bao(viec === "huy" ? `Đã huỷ «${x.ten}», hoàn ${x.diem} điểm cho ${x.ten_con}` : `Đã trao «${x.ten}» cho ${x.ten_con}`); await tai();
  });
  const luu = (x: NhiemVu, them: Partial<NhiemVu>) => lam(async () => { await bm.goi(`nhiem-vu/${x.id}`, them); await tai(); });
  return (
    <Man tieuLon="Điểm & quà" chat noi={noi} day={the === "nv" ? <Nut chu="Giao nhiệm vụ mới" ic="cong" rong bam={() => router.push("/giao-nv")} /> : undefined}>
      {d.phieu.length ? (
        <>
          <Canh lv="so-tay" thap tieu={`Phiếu chờ trao (${d.phieu.length})`} loi="Con đã đổi điểm, chờ Ba Mẹ trao quà. Huỷ thì hoàn điểm cho Con." />
          <Nhom>
            {d.phieu.map((x, i) => (
              <Dong key={x.id} dau={i === 0} tieu={`${x.ten_con} · ${x.ten}`} phu={`${x.diem} điểm`} trai={<BieuTron ic={IC_QUA[x.loai]?.[0] ?? "qua"} mau={IC_QUA[x.loai]?.[1] ?? "lam"} />}
                phai={d.xem ? <Nhan loai="xam" chu="Chờ trao" /> : <View style={{ flexDirection: "row", gap: 6 }}>
                  <Nut chu="Đã trao" nho dangChay={dangChay} bam={() => xuLy(x, "xac-nhan")} />
                  <Nut chu="Huỷ" loai="vien" nho dangChay={dangChay} bam={() => setHuy(x)} />
                </View>} />
            ))}
          </Nhom>
        </>
      ) : null}
      <ChonMot ds={[{ gia: "nv" as const, chu: `Nhiệm vụ (${nv.length})` }, { gia: "qua" as const, chu: `Phần thưởng (${d.qua.length})` }]} gia={the} doi={setThe} />
      {the === "nv" ? (nv.length ? (
        <>
          <Canh lv="so-tay" thap tieu="Nhiệm vụ của nhà mình" loi="Chạm một nhiệm vụ để sửa điểm hoặc tạm tắt." />
          <Nhom>
            {nv.map((x, i) => (
              <Dong key={x.id} dau={i === 0} tieu={x.ten} phu={tanSuat(x)} trai={<BieuTron ic={(NHOM_NV[x.nhom] ?? NHOM_NV.khac).ic} mau={(NHOM_NV[x.nhom] ?? NHOM_NV.khac).mau} />}
                phai={x.bat ? <Nhan loai="diem" chu={`+${x.diem}`} /> : <Nhan loai="xam" chu="Đang tắt" />} bam={() => { setSua(x); setDiem(String(x.diem)); }} />
            ))}
          </Nhom>
        </>
      ) : (
        <CanhGiua lv="canh-trong" tieu="Chưa có nhiệm vụ nào" loi="Chọn mẫu theo tuổi, có sẵn 8–10 nhiệm vụ.">
          <Nut chu="Dùng mẫu nhiệm vụ" bam={() => lam(async () => { await bm.goi("nhiem-vu/mau", { nhom: "nhi" }); await tai(); })} />
        </CanhGiua>
      )) : (
        <>
          <View style={{ borderRadius: 26, backgroundColor: "#4e2e15", padding: 18, gap: 4 }}>
            <Chu kieu="dam" co={13} mau="#f3e7da">Quỹ phiếu quà AiiCafe</Chu>
            <Chu kieu="rat" co={26} mau="#fff" so>{tien(d.quy.soDu)}</Chu>
            <Chu co={14} mau="#f3e7da">{d.quy.soDu >= 50_000 ? `Đủ cho ${Math.floor(d.quy.soDu / 50_000)} phiếu quà 50k` : "Chưa đủ cho một phiếu quà 50k — nạp thêm để Con đổi được"}</Chu>
            <View style={{ marginTop: 10, alignSelf: "flex-start" }}><Nut chu="Nạp thêm" loai="vang" nho bam={() => router.push("/quy")} /></View>
          </View>
          {d.qua.length ? (
            <Nhom>
              <Dong dau tieu="1 phút chơi trò chơi" phu="Video ngắn 2 điểm/phút · tự trừ khi chơi" trai={<BieuTron ic="game" mau="vang" />} phai={<Nhan loai="xam" chu="1 điểm" />} />
              {d.qua.map((x) => (
                <Dong key={x.id} tieu={x.ten} phu={[x.loai === "voucher" ? "Hạn 60 ngày · dùng 1 lần" : "", x.chi_cuoi_tuan ? "Chỉ thứ 7, CN" : "",
                  x.toi_da_thang ? `Tối đa ${x.toi_da_thang} lần/tháng` : "", x.ton_kho !== null ? `Còn ${x.ton_kho}` : ""].filter(Boolean).join(" · ") || "Ba Mẹ xác nhận khi trao"}
                  trai={<BieuTron ic={IC_QUA[x.loai][0]} mau={IC_QUA[x.loai][1]} />} phai={<Nhan loai="xam" chu={`${x.diem}`} />} />
              ))}
            </Nhom>
          ) : (
            <CanhGiua lv="canh-trong" tieu="Chưa có phần thưởng" loi="Thêm phiếu quà AiiCafe hoặc đặc quyền để Con có mục tiêu.">
              <Nut chu="Dùng mẫu phần thưởng" bam={() => lam(async () => { await bm.goi("qua/mau", {}); await tai(); })} />
            </CanhGiua>
          )}
        </>
      )}
      <BaoLoi loi={!sua && !huy ? loiLam : null} />
      {huy ? (
        <BangTruot mo dong={() => setHuy(null)} tieu={`Huỷ «${huy.ten}»?`}>
          <Chu>{`${huy.ten_con} được hoàn ${huy.diem} điểm. Không hoàn tác được.`}</Chu>
          <BaoLoi loi={loiLam} />
          <Nut chu="Huỷ phiếu, hoàn điểm" loai="huy" rong dangChay={dangChay} bam={async () => { if (await xuLy(huy, "huy")) setHuy(null); }} />
          <View style={{ marginTop: 8 }}><Nut chu="Giữ lại" loai="ma" rong bam={() => setHuy(null)} /></View>
        </BangTruot>
      ) : null}
      {sua ? (
        <BangTruot mo dong={() => setSua(null)} tieu={sua.ten}>
          <ONhap nhan="Điểm thưởng" value={diem} onChangeText={(t) => setDiem(t.replace(/\D/g, "").slice(0, 4))} keyboardType="number-pad" />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Chu kieu="rat" style={{ flex: 1 }}>Đang bật cho Con</Chu>
            <CongTac nhan="Bật nhiệm vụ" bat={sua.bat} doi={(v) => setSua({ ...sua, bat: v })} />
          </View>
          <BaoLoi loi={loiLam} />
          <Nut chu="Lưu" rong dangChay={dangChay} tat={!(Number(diem) >= 1)} bam={async () => { if (await luu(sua, { diem: Number(diem), bat: sua.bat })) { setSua(null); bao("Đã lưu nhiệm vụ"); } }} />
        </BangTruot>
      ) : null}
    </Man>
  );
}
