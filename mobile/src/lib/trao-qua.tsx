// Bảng trượt «Trao quà cho con» (them-5otw85h4, Nghi chốt 06/11 — L14): quà chờ trao đang GIỮ sao (chưa trừ). «Đã trao, trừ N sao» = POST phieu/:id/trao
// (trừ hẳn; voucher AiiCafe ⇒ máy chủ phát mã: hiện QR + hạn dùng để Ba Mẹ đưa con / chụp lại), «Chưa, để tối mai» = đóng, «Huỷ & hoàn sao» =
// POST phieu/:id/huy (hoàn sao cho con). Dùng ở tab Nhiệm vụ và Chờ duyệt.
import { useState } from "react";
import { View } from "react-native";
import { bm } from "./api";
import { type PhieuCho } from "./hang-ngay";
import { MaQr } from "./qr";
import { cauHanVoucher, icQua, type KqTrao, type VoucherPhat } from "./s3";
import { BangTruot, BaoLoi, Chu, M, Nut, tien, useLam } from "./ui";
import { GiaSao, OHinhQuaTo } from "./ui-s3";

const khiNao = (iso: string) => {
  const t = new Date(iso), h = new Date();
  if (t.toDateString() === h.toDateString()) return "hôm nay";
  h.setDate(h.getDate() - 1);
  return t.toDateString() === h.toDateString() ? "hôm qua" : `ngày ${t.getDate()}/${t.getMonth() + 1}`;
};

export function BangTraoQua({ p, dong, xong }: {
  p: (PhieuCho & { hinh?: string | null }) | null; dong: () => void;
  /** sau trao / huỷ: câu báo + tải lại màn */ xong: (chu: string) => void;
}) {
  const { lam, loi, dangChay, setLoi } = useLam();
  const [vc, setVc] = useState<{ v: VoucherPhat; ten: string; con: string } | null>(null);
  const dongHet = () => { setLoi(null); setVc(null); dong(); };
  const trao = (x: PhieuCho) => lam(async () => {
    const r = await bm.goi<KqTrao>(`phieu/${x.id}/trao`, {});
    if (r.voucher) setVc({ v: r.voucher, ten: x.ten, con: x.ten_con });
    else dong();
    xong(`Đã trao «${x.ten}» — trừ ${r.saoTru ?? x.diem} sao, Rob đã báo ${x.ten_con}`);
  });
  const huy = (x: PhieuCho) => lam(async () => {
    await bm.goi(`phieu/${x.id}/huy`, {});
    dong();
    xong(`Đã huỷ «${x.ten}» — hoàn ${x.diem} sao cho ${x.ten_con}`);
  });
  if (vc) {
    return (
      <BangTruot mo dong={dongHet} tieu={`Voucher ${vc.ten} cho ${vc.con}`}>
        <View style={{ alignItems: "center", gap: 10 }}>
          <MaQr noiDung={vc.v.qr} co={200} />
          <Chu kieu="rat" co={22} so>{vc.v.ma}</Chu>
          <Chu kieu="dam" co={14} mau={M.chu2}>{`${tien(vc.v.menhGia)} · ${cauHanVoucher(vc.v.hetHan)}`}</Chu>
          <Chu co={13.5} mau={M.chu3} style={{ textAlign: "center" }}>{`Quầy AiiCafe quét mã này. ${vc.con} cũng thấy voucher trong «Quà của con».`}</Chu>
        </View>
        <Nut chu="Xong" rong bam={dongHet} />
      </BangTruot>
    );
  }
  return (
    <BangTruot mo={!!p} dong={dongHet} tieu={p ? `Đã trao «${p.ten}» cho ${p.ten_con} chưa?` : ""} giua
      dauBang={p ? <OHinhQuaTo ic={icQua({ hinh: p.hinh ?? null, loai: p.loai, ten: p.ten })} /> : null}>
      {p ? <>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 6 }}>
          <Chu co={15} mau={M.chu2}>{`Con chọn ${khiNao(p.created_at)} · đang giữ`}</Chu>
          <GiaSao n={p.diem} />
        </View>
        <View style={{ padding: 12, borderRadius: 18, backgroundColor: M.chinhSoft }}>
          <Chu kieu="dam" co={13.5} mau={M.chinhInk}>{`Bấm «Đã trao» thì mới trừ ${p.diem} sao, Rob báo con và chúc mừng con.`}</Chu>
        </View>
        <BaoLoi loi={loi} />
        <Nut chu={`Đã trao, trừ ${p.diem} sao`} ic="qua" rong dangChay={dangChay} bam={() => trao(p)} />
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Nut chu="Chưa, để tối mai" loai="vien" bam={dongHet} />
          <Nut chu="Huỷ & hoàn sao" loai="huy" dangChay={dangChay} bam={() => huy(p)} nhanDoc={`Huỷ quà, hoàn ${p.diem} sao cho ${p.ten_con}`} />
        </View>
      </> : null}
    </BangTruot>
  );
}
