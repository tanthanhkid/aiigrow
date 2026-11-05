// con-nv-dang «Đang làm nhiệm vụ»: vòng tròn màu đếm giờ (FR-03.02 — việc có thời gian tối thiểu chỉ cho nộp khi đủ giờ). Mất mạng: đồng hồ vẫn chạy.
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { BangMang, BaoLoi, Canh, ChoTai, Nut, useLam } from "@/lib/ui";
import { GhiChu, ManTre, Vong, batDauLuc, docTo, useTaiTre, useTre } from "@/lib/ui-tre";
import { kid, nopBai, type NvTreSao } from "@/lib/api-tre";
import { LoiApi } from "@/lib/api";

const hai = (n: number) => String(Math.floor(n)).padStart(2, "0");
const thuong = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

export default function DangLam() {
  const { luot, nv } = useLocalSearchParams<{ luot: string; nv?: string }>();
  const { ten } = useTre();
  const { d, loi, matMang, tai, cu } = useTaiTre(`nv-${nv}`, async () => {
    const x = (await kid.goi<{ ds: NvTreSao[] }>("nhiem-vu?tuCham=1")).ds.find((n) => n.id === nv);
    if (!x) throw new LoiApi("khong_thay", "Nhiệm vụ này không còn nữa — chọn việc khác nhé.", 404);
    return x;
  });
  const [bay, setBay] = useState(() => new Date().getTime());
  const [dau] = useState(() => batDauLuc(luot));
  useEffect(() => { const t = setInterval(() => setBay(new Date().getTime()), 1000); return () => clearInterval(t); }, []);
  const { dangChay, loi: loiNop, lam } = useLam();
  if (!d) return <ManTre><ChoTai loi={loi} matMang={matMang} tai={tai} /></ManTre>;
  const giay = Math.max(0, (bay - dau) / 1000);
  const toiThieu = d.phut_toi_thieu * 60;
  const conGiay = Math.max(0, toiThieu - giay);
  const chu = toiThieu && conGiay > 0 ? `${hai(conGiay / 60)}:${hai(conGiay % 60)}` : `${hai(giay / 60)}:${hai(giay % 60)}`;
  const ti = toiThieu ? giay / toiThieu : Math.min(1, giay / 900);
  // 05/11: nộp theo cách Ba Mẹ chọn — ảnh, ghi âm, viết kể lại (màn chup) hoặc chỉ bấm «Xong» (nộp luôn, không kèm gì)
  const bc = d.bang_chung;
  const [chuNut, ic] = bc === "van_ban" ? ["Xong, kể lại", "but"] as const : bc === "ghi_am" ? ["Xong, ghi âm", "tin"] as const
    : bc === "xong" ? ["Xong rồi!", "tick"] as const : ["Xong, chụp ảnh", "camera"] as const;
  const xong = () => lam(async () => {
    const r = await nopBai(luot, {});
    router.replace(r.trang_thai === "duoc_duyet" ? `/tre/duoc-duyet/${luot}` : `/tre/cho-duyet?${new URLSearchParams({ diem: String(d.sao ?? d.diem), ...(r.daXepHang ? { xep: "1" } : {}) })}`);
  });
  return (
    <ManTre day={
      <>
        {conGiay > 0 ? <GhiChu giua>{`Làm thêm ${Math.ceil(conGiay / 60)} phút nữa là nộp được nhé`}</GhiChu> : null}
        <BaoLoi loi={loiNop} />
        <Nut chu={chuNut} ic={ic} rong loai={conGiay > 0 ? "vien" : "chinh"} dangChay={dangChay}
          bam={() => (conGiay > 0 ? docTo(`Làm thêm ${Math.ceil(conGiay / 60)} phút nữa nhé`) : bc === "xong" ? xong() : router.push(`/tre/chup/${luot}?nv=${d.id}`))} />
        <Nut chu="Để sau" loai="ma" rong bam={() => router.replace("/tre/nhiem-vu")} />
      </>
    }>
      {matMang || cu ? <BangMang chu={`Mất mạng — đồng hồ vẫn chạy trên máy, ${ten} cứ làm tiếp.`} /> : null}
      <Canh lv="cho" mau="vang" tieu={`${ten} đang ${thuong(d.ten)}`} loi="Xong thì quay lại bấm nút xanh nhé!" thap />
      <View style={{ alignItems: "center" }}>
        <Vong ti={ti} chu={chu} phu={toiThieu && conGiay > 0 ? "còn lại" : "đang làm"} />
      </View>
    </ManTre>
  );
}
