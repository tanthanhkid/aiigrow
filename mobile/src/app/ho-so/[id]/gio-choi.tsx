// #302 «Giờ chơi của <Con>» trong hồ sơ Con: GIỚI HẠN TỐI ĐA mỗi ngày (ngày thường / T7–CN) + «Mỗi lượt tối đa» (chơi đủ lượt thì máy nghỉ
// đúng chừng đó phút) — chơi vẫn trả bằng sao (1 sao = 1 phút). GET / POST con/:id/gio-choi {gioiHanNgayThuong, gioiHanCuoiTuan, phutMoiLuot}.
// Bàn thiết kế chưa có màn này (màn bm2-gio cũ đã bỏ 15/11) — dựng bằng cùng khối ChonGioiHan của Lần đầu. Người trông giúp: chỉ xem.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { bm } from "@/lib/api";
import { CAU_TRONG_GIUP, quyenToi } from "@/lib/hang-ngay";
import { thanGioiHan, type GioiHan } from "@/lib/gioi-han";
import { ChonGioiHan } from "@/lib/gioi-han-ui";
import { BaoLoi, baoKhiVe, ChoTai, Chu, M, Man, Nut, useLam, useTai } from "@/lib/ui";

type GioChoi = { gioiHanNgayThuong?: number; gioiHanCuoiTuan?: number; phutMoiLuot?: number; moTaGioiHan?: string;
  homNay?: { gioiHan?: { cau: string | null } } };

export default function GioChoiCon() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [g, con, quyen] = await Promise.all([bm.goi<GioChoi>(`con/${id}/gio-choi`), bm.goi<{ ten: string }>(`con/${id}`).catch(() => null), quyenToi()]);
    return { g, ten: con?.ten ?? "con", xem: quyen === "trong_giup" };
  });
  const [moi, setMoi] = useState<GioiHan | null>(null);
  const [loiO, setLoiO] = useState<string | null>(null);
  const { lam, loi: loiLam, dangChay } = useLam();
  const tieu = "Giờ chơi";
  if (!d) return <Man lui={{ chu: "Hồ sơ con" }} tieu={tieu}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const cu: GioiHan = { ngayThuong: d.g.gioiHanNgayThuong ?? 0, cuoiTuan: d.g.gioiHanCuoiTuan ?? 0, moiLuot: d.g.phutMoiLuot ?? 0 };
  const gt = moi ?? cu;
  const doi = JSON.stringify(gt) !== JSON.stringify(cu);
  const luu = () => lam(async () => {
    await bm.goi(`con/${id}/gio-choi`, thanGioiHan(gt));
    baoKhiVe(`Đã lưu giờ chơi của ${d.ten}`);
    if (router.canGoBack()) router.back(); else router.replace(`/ho-so/${id}` as never);
  });
  return (
    <Man lui={{ chu: "Hồ sơ con", ve: `/ho-so/${id}` }} tieu={tieu}
      day={d.xem ? undefined : <><BaoLoi loi={loiLam} /><Nut chu="Lưu giờ chơi" rong dangChay={dangChay} tat={!doi || !!loiO} bam={luu} /></>}>
      <Chu kieu="rat" co={22}>{`${d.ten} chơi máy bao lâu mỗi ngày?`}</Chu>
      {d.xem ? <Chu co={13.5} mau={M.chu3} style={{ marginHorizontal: 4 }}>{CAU_TRONG_GIUP}</Chu> : null}
      <ChonGioiHan gt={gt} doi={(g, l) => { setMoi(g); setLoiO(l); }} />
      {d.g.homNay?.gioiHan?.cau ? <Chu kieu="dam" co={13.5} mau={M.chu3} style={{ marginHorizontal: 4 }}>{`Hôm nay: ${d.g.homNay.gioiHan.cau}`}</Chu> : null}
    </Man>
  );
}
