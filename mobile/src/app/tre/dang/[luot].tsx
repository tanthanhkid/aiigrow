// «Đang làm» bản «Dịu» (con-dt-ngay 05 cdt-dang-lam): «Đang dọn phòng» + vòng phút + lời nhắc nộp bài + các ô cần nộp («Chưa chụp») +
// «Dọn xong · chụp ảnh nộp» / «Làm tiếp sau». Việc có thời gian tối thiểu chỉ cho nộp khi đủ giờ (FR-03.02). Mất mạng: đồng hồ vẫn chạy.
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { LoiApi } from "@/lib/api";
import { kid, nopBai, type NvTreSao } from "@/lib/api-tre";
import { D } from "@/lib/diu";
import { useLam } from "@/lib/ui";
import { ChoD, ChuD, LoiD, ManD, MatMangD, NutD, PillD, TheD, TieuD, VongD } from "@/lib/ui-diu";
import { batDauLuc, docTo, useTaiTre, useTre } from "@/lib/ui-tre";

const thuong = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const NOP: Record<string, [string, string]> = {
  anh: ["chụp ảnh nộp", "Làm xong thì chụp ảnh cho Ba Mẹ nhé!"], video: ["chụp ảnh nộp", "Làm xong thì chụp ảnh cho Ba Mẹ nhé!"],
  ghi_am: ["ghi âm nộp", "Làm xong thì ghi âm cho Ba Mẹ nghe nhé!"], van_ban: ["viết nộp", "Làm xong thì viết vài câu kể lại nhé!"],
  xong: ["bấm Xong", "Làm xong bấm «Xong» là được!"],
};

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
  if (!d) return <ManD lui="/tre/nhiem-vu"><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  const giay = Math.max(0, (bay - dau) / 1000);
  const toiThieu = d.phut_toi_thieu * 60;
  const conGiay = Math.max(0, toiThieu - giay);
  const phut = Math.floor((toiThieu && conGiay > 0 ? conGiay : giay) / 60);
  const ti = toiThieu ? giay / toiThieu : Math.min(1, giay / 900);
  const [chuNop, nhac] = NOP[d.bang_chung] ?? NOP.anh;
  const xong = () => lam(async () => {
    const r = await nopBai(luot, {});
    router.replace(r.trang_thai === "duoc_duyet" ? `/tre/duoc-duyet/${luot}` : `/tre/cho-duyet?${new URLSearchParams({ diem: String(d.sao ?? d.diem), ten: d.ten, ...(r.daXepHang ? { xep: "1" } : {}) })}`);
  });
  const nop = () => (conGiay > 0 ? docTo(`Làm thêm ${Math.ceil(conGiay / 60)} phút nữa nhé`) : d.bang_chung === "xong" ? xong() : router.push(`/tre/chup/${luot}?nv=${d.id}`));
  return (
    <ManD lui={`/tre/nv/${d.id}`} day={<>
      {conGiay > 0 ? <ChuD kieu="rat" co={14} mau={D.chu2} giua>{`Làm thêm ${Math.ceil(conGiay / 60)} phút nữa là nộp được nhé`}</ChuD> : null}
      <LoiD loi={loiNop} />
      <NutD chu={`Xong · ${chuNop}`} bam={nop} dangChay={dangChay} tat={conGiay > 0} />
      <NutD chu="Làm tiếp sau" loai="chu" bam={() => router.replace("/tre/nhiem-vu")} />
    </>}>
      {matMang || cu ? <MatMangD chu={`Mất mạng rồi — đồng hồ vẫn chạy, ${ten} cứ làm tiếp.`} /> : null}
      <TieuD chu={`Đang ${thuong(d.ten)}`} giua />
      <View style={{ alignItems: "center", paddingVertical: 6 }}>
        <VongD ti={ti} so={String(phut)} don={toiThieu && conGiay > 0 ? "phút còn lại" : "phút"} co={170} day={14} />
      </View>
      <ChuD kieu="rat" co={15} mau={D.chu2} giua>{nhac}</ChuD>
      {d.bang_chung !== "xong" ? (
        <TheD mong>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: D.xanhN, alignItems: "center", justifyContent: "center" }}>
              <ChuD kieu="den" co={14} mau={D.xanhD}>1</ChuD>
            </View>
            <ChuD kieu="rat" co={16} style={{ flex: 1 }}>{d.mo_ta || d.ten}</ChuD>
            <PillD chu={d.bang_chung === "ghi_am" ? "Chưa ghi" : d.bang_chung === "van_ban" ? "Chưa viết" : "Chưa chụp"} />
          </View>
        </TheD>
      ) : null}
    </ManD>
  );
}
