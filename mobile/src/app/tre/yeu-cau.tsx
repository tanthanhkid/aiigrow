// con-yeu-cau «Yêu cầu của Ken» (FR-05.02): trạng thái rõ ràng từng yêu cầu — Được / Chờ / Chưa được (kèm lời Ba Mẹ). Yêu cầu đang chờ huỷ được.
import { useState } from "react";
import { router } from "expo-router";
import { BangTruot, BaoLoi, BieuTron, Canh, CanhGiua, ChoTai, Dong, Nhan, Nhom, Nut, gioPhut, useLam } from "@/lib/ui";
import { DiemTren, ManTre, useTaiTre, useTre } from "@/lib/ui-tre";
import { kid, type NhaTre, type YcTre } from "@/lib/api-tre";

const tieuYc = (y: YcTre) => y.loai === "mo_web" ? `Mở ${y.gia_tri}` : y.loai === "them_gio" ? `Thêm ${y.phut} phút chơi` : y.loai === "cai_app" ? `Cài ${y.gia_tri}`
  : y.loai === "ngoai_le" ? `Chơi ${y.phut} phút dù chưa đủ điểm` : y.loai === "ngoai_gio" ? `Chơi ngoài giờ ${y.phut} phút` : y.gia_tri || y.ly_do;
const IC = { mo_web: ["web", "xanh"], them_gio: ["dongho", "vang"], cai_app: ["game", "cam"], ngoai_le: ["sao", "vang"], ngoai_gio: ["trang_ngu", "tim"], khac: ["tin", "tim"] } as const;

function trangThai(y: YcTre): { phu: string; nhan: [string, "ok" | "canh" | "xam" | "loi"] } {
  const luc = gioPhut(y.xu_ly_luc ?? y.created_at);
  switch (y.trang_thai) {
    case "dong_y": return { phu: `Ba Mẹ đồng ý ${luc}`, nhan: ["Được", "ok"] };
    case "tu_choi": return { phu: y.ly_do_tu_choi ? `Ba Mẹ: “${y.ly_do_tu_choi}”` : `Ba Mẹ chưa đồng ý · ${luc}`, nhan: ["Chưa được", "xam"] };
    case "het_han": return { phu: "Hết hạn — gửi lại nếu cần", nhan: ["Hết hạn", "xam"] };
    case "huy": return { phu: `Đã huỷ ${luc}`, nhan: ["Đã huỷ", "xam"] };
    default: return { phu: `Gửi ${gioPhut(y.created_at)} · đang chờ`, nhan: ["Chờ", "canh"] };
  }
}

export default function YeuCau() {
  const { ten } = useTre();
  const { d, loi, matMang, tai } = useTaiTre("yeu-cau", async () => ({
    nha: await kid.goi<NhaTre>("nha"), ds: (await kid.goi<{ ds: YcTre[] }>("yeu-cau")).ds,
  }));
  const [huy, setHuy] = useState<YcTre | null>(null);
  const { dangChay, loi: loiHuy, lam } = useLam();
  if (!d) return <ManTre tab="xin-phep"><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  if (!d.ds.length) {
    return (
      <ManTre tab="xin-phep">
        <DiemTren n={d.nha.soDu} chuoi={d.nha.chuoiNgay} />
        <CanhGiua lv="canh-trong" tieu={`${ten} chưa xin gì cả`} loi="Muốn mở trang mới hay thêm giờ? Xin ở đây nhé.">
          <Nut chu="Xin phép Ba Mẹ" ic="tin" bam={() => router.replace("/tre/xin-phep")} />
        </CanhGiua>
      </ManTre>
    );
  }
  const dau = d.ds[0];
  const canh = dau.trang_thai === "dong_y" ? { lv: "xong" as const, tieu: "Ba Mẹ đồng ý rồi!", loi: `${tieuYc(dau)} — dùng thoải mái nhé.` }
    : dau.trang_thai === "tu_choi" ? { lv: "chi" as const, tieu: "Ba Mẹ chưa đồng ý", loi: dau.ly_do_tu_choi ? `Ba Mẹ nhắn: “${dau.ly_do_tu_choi}”` : "Lần sau xin kèm lý do rõ hơn nhé." }
      : dau.trang_thai === "cho" ? { lv: "cho" as const, tieu: "Đã gửi cho Ba Mẹ", loi: `Ba Mẹ trả lời là ${ten} biết liền.` }
        : { lv: "so-tay" as const, tieu: `Yêu cầu của ${ten}`, loi: "Xin gì thì xem trạng thái ở đây nhé." };
  const xacNhanHuy = () => lam(async () => { await kid.goi(`yeu-cau/${huy!.id}/huy`, {}); setHuy(null); await tai(); });
  return (
    <ManTre tab="xin-phep" tai={tai} vongTai>
      <DiemTren n={d.nha.soDu} chuoi={d.nha.chuoiNgay} />
      <Canh lv={canh.lv} mau="vang" tieu={canh.tieu} loi={canh.loi} thap />
      <Nhom>
        {d.ds.map((y, i) => {
          const t = trangThai(y);
          return (
            <Dong key={y.id} dau={i === 0} tieu={tieuYc(y)} phu={t.phu} trai={<BieuTron ic={IC[y.loai][0]} mau={IC[y.loai][1]} />}
              phai={<Nhan chu={t.nhan[0]} loai={t.nhan[1]} />} bam={y.trang_thai === "cho" ? () => setHuy(y) : undefined} />
          );
        })}
      </Nhom>
      <Nut chu="Xin phép mới" ic="tin" loai="vien" rong bam={() => router.push("/tre/xin-phep")} />
      <BangTruot mo={!!huy} dong={() => setHuy(null)} tieu="Huỷ yêu cầu này?">
        <Dong dau tieu={huy ? tieuYc(huy) : ""} phu={huy?.ly_do} />
        <BaoLoi loi={loiHuy} />
        <Nut chu="Huỷ yêu cầu" loai="huy" rong bam={xacNhanHuy} dangChay={dangChay} />
        <Nut chu="Giữ lại" loai="ma" rong bam={() => setHuy(null)} />
      </BangTruot>
    </ManTre>
  );
}
