// «Sao & quà» (ví) bản «Dịu» (con-dt-ngay 14 cdt-vi-qua, Nghi chốt 06/11 — L14): thẻ vàng «Con đang có 0 sao · Đang giữ 50 sao cho quà
// chờ trao» + thanh tới quà gần nhất + «Đổi sao lấy phút chơi»; «Quà của con»: quà đang giữ sao chờ Ba Mẹ trao (⏳), voucher AiiCafe đã nhận
// (mã QR — chạm để hiện cho quầy quét, «Còn 49 ngày»), quà đã trao; «Huy hiệu»; «Xem quà đổi được».
import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { kid, type NhaTreSao, type QuaTre, type ViQua } from "@/lib/api-tre";
import { quaGanNhat } from "@/lib/con-diu";
import { D } from "@/lib/diu";
import { MaQr } from "@/lib/qr";
import { Icon3D, tien } from "@/lib/ui";
import { ChoD, ChuD, DongD, ManD, MatMangD, NutD, PillD, TamTruot, TheD, ThanhD } from "@/lib/ui-diu";
import { ngayCua, useTaiTre } from "@/lib/ui-tre";

type VoucherCon = ViQua["voucher"][number] & { qr?: string | null; conNgay?: number; ten?: string | null };
type ThanhTichNgan = { huyHieu: { dat: boolean }[] };

export default function ViQuaTre() {
  const { d, loi, matMang, tai, cu } = useTaiTre("vi-qua", async () => {
    const [vi, ch, nha, tt] = await Promise.all([kid.goi<ViQua>("vi-qua"), kid.goi<{ sao?: number; soDu: number; saoGiu?: number; qua: QuaTre[] }>("cua-hang"),
      kid.goi<NhaTreSao>("nha"), kid.goi<ThanhTichNgan>("thanh-tich").catch(() => ({ huyHieu: [] }))]);
    return { vi, ch, nha, tt };
  });
  const [qr, setQr] = useState<VoucherCon | null>(null);
  if (!d) return <ManD tab="vi-qua" tieu="Sao & quà"><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  const sao = d.ch.sao ?? d.ch.soDu;
  const giu = d.ch.saoGiu ?? 0;
  const gan = quaGanNhat(d.ch.qua.filter((x) => x.loai !== "phut"), sao);
  const q = d.nha.quy;
  const vouchers = (d.vi.voucher as VoucherCon[]).filter((v) => v.trang_thai === "da_phat_hanh");
  const daTrao = d.vi.daTrao ?? [];
  const coHH = d.tt.huyHieu.filter((h) => h.dat).length;
  return (
    <ManD tab="vi-qua" tieu="Sao & quà">
      {matMang || cu ? <MatMangD chu="Mất mạng rồi — xem được quà nhưng chưa đổi được; sao không bị trừ." /> : null}
      <TheD vang>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon3D ten="sao" co={64} />
          <View style={{ flex: 1 }}>
            <ChuD kieu="rat" co={13.5} mau={D.saoInk}>Con đang có</ChuD>
            <ChuD kieu="den" co={36} mau={D.saoInk} so>{`${sao} sao`}</ChuD>
          </View>
        </View>
        {giu ? <ChuD kieu="rat" co={13.5} mau={D.saoInk}>{`Đang giữ ${giu} sao cho quà chờ trao`}</ChuD> : null}
        {gan && gan.conThieu > 0 ? (
          <View style={{ gap: 6 }}>
            <ThanhD ti={gan.diem ? sao / gan.diem : 0} />
            <ChuD kieu="rat" co={13} mau={D.saoInk}>{`Tới ${gan.ten} ${gan.diem} sao · còn ${gan.conThieu}`}</ChuD>
          </View>
        ) : null}
        {q?.doiSao.bat ? <NutD chu="Đổi sao lấy phút chơi" loai="phu" ic="dongho" nho bam={() => router.push("/tre/choi")} /> : null}
      </TheD>
      <ChuD kieu="den" co={15} style={{ marginTop: 4 }}>Quà của con</ChuD>
      {!d.vi.phieu.length && !vouchers.length && !daTrao.length ? <ChuD co={14} mau={D.chu2}>Chưa có quà nào — đổi sao trong «Xem quà đổi được» nhé.</ChuD> : null}
      {d.vi.phieu.map((p) => (
        <DongD key={p.id} ic={p.loai === "voucher" ? "the_qua" : "qua"} tieu={p.ten} phu={`Đổi ${ngayCua(p.created_at).slice(0, 5)} · đang giữ ${p.diem} sao`}
          nhan={<PillD chu="⏳ Chờ Ba Mẹ trao" loai="cho" />} />
      ))}
      {vouchers.map((v) => (
        <DongD key={v.ma} ic="qr" tieu={v.ten || `Voucher AiiCafe ${tien(v.menh_gia).replace(".000đ", "k")}`}
          phu={`Đã nhận · đưa mã ở quầy · hạn ${ngayCua(v.het_han).slice(0, 5)}`} bam={() => setQr(v)}
          nhan={v.conNgay != null ? <PillD chu={`Còn ${v.conNgay} ngày`} loai="xanh" /> : undefined} />
      ))}
      {daTrao.slice(0, 5).map((p) => (
        <DongD key={p.id} ic="qua" tieu={p.ten} phu={`Ba Mẹ đã trao ${ngayCua(p.xu_ly_luc).slice(0, 5)}`} nhan={<PillD chu="Đã trao" loai="xanh" ic="tick" />} />
      ))}
      <DongD ic="ngoi_sao_nho" tieu="Huy hiệu" phu={coHH ? `Có ${coHH} · làm nhiệm vụ để có thêm` : "Làm nhiệm vụ để có huy hiệu"} bam={() => router.push("/tre/huy-hieu")} />
      <NutD chu="Xem quà đổi được" loai="phu" ic="qua" bam={() => router.push("/tre/cua-hang")} />
      <TamTruot mo={!!qr} dong={() => setQr(null)} nhan="Mã voucher AiiCafe">
        {qr ? (
          <View style={{ alignItems: "center", gap: 10 }}>
            <ChuD kieu="den" co={18}>{qr.ten || "Voucher AiiCafe"}</ChuD>
            <MaQr noiDung={qr.qr || qr.ma} co={220} />
            <ChuD kieu="den" co={20} so>{qr.ma}</ChuD>
            <ChuD co={14} mau={D.chu2}>{`Đưa mã này ở quầy AiiCafe · hạn ${ngayCua(qr.het_han)}`}</ChuD>
          </View>
        ) : null}
        <NutD chu="Xong" bam={() => setQr(null)} />
      </TamTruot>
    </ManD>
  );
}
