// «Tin nhắn» (con-dt-ngay 01 cdt-nha, bản «Dịu»): lời nhắn / lời khen Ba Mẹ gửi (GET /api/kid/toi › loiKhen), mỗi tin một thẻ; tin chưa trả lời
// có «Trả lời nhanh» (2 câu sẵn) ⇒ `POST loi-khen/:id/phan-hoi`. Muốn xin gì thì sang «Xin phép».
import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { kid, type ToiTre } from "@/lib/api-tre";
import { D } from "@/lib/diu";
import { CamXuc, ChoD, ChuD, LoiD, ManD, NutD, PillD, TheD } from "@/lib/ui-diu";
import { gioCua, useTaiTre, useTre } from "@/lib/ui-tre";
import { Rob } from "@/lib/ui";

const NHANH = ["Dạ, con làm ngay!", "Con cảm ơn Ba Mẹ"];

export default function Tin() {
  const { nap } = useTre();
  const { d, loi, matMang, tai } = useTaiTre("toi", () => kid.goi<ToiTre>("toi"));
  const [chon, setChon] = useState<Record<string, string>>({});
  const [dang, setDang] = useState<string | null>(null);
  const [loiGui, setLoiGui] = useState<string | null>(null);
  if (!d) return <ManD tab="tin" tieu="Tin nhắn"><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  const gui = async (id: string, cau: string) => {
    setDang(id); setLoiGui(null);
    try { await kid.goi(`loi-khen/${id}/phan-hoi`, { phanHoi: cau }); await tai(); await nap(); }
    catch { setLoiGui("Chưa gửi được — thử lại nhé."); } finally { setDang(null); }
  };
  return (
    <ManD tab="tin" tieu="Tin nhắn">
      {!d.loiKhen.length ? (
        <View style={{ paddingTop: 30 }}>
          <CamXuc lv="canh-trong" co={130} tieu="Chưa có tin nào" phu="Ba Mẹ nhắn là tin hiện ở đây nhé." />
        </View>
      ) : d.loiKhen.map((t) => (
        <TheD key={t.id}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Rob ten="so-tay" co={40} />
            <View style={{ flex: 1 }}>
              <ChuD kieu="rat" co={16}>Ba Mẹ</ChuD>
              <ChuD co={13} mau={D.chu2}>{gioCua(t.created_at)}</ChuD>
            </View>
            {t.phan_hoi ? <PillD chu="Đã trả lời" loai="xanh" /> : null}
          </View>
          <ChuD kieu="rat" co={17}>{`«${t.noi_dung}»`}</ChuD>
          {t.phan_hoi ? <ChuD co={14} mau={D.chu2}>{`Con: ${t.phan_hoi}`}</ChuD> : (
            <>
              <ChuD kieu="rat" co={13} mau={D.chu2}>Trả lời nhanh</ChuD>
              <View style={{ gap: 8 }}>
                {NHANH.map((c) => (
                  <NutD key={c} chu={c} loai={chon[t.id] === c ? "chinh" : "phu"} nho bam={() => setChon((x) => ({ ...x, [t.id]: c }))} />
                ))}
              </View>
              {chon[t.id] ? <NutD chu={`Gửi «${chon[t.id]}»`} ic="gui" bam={() => gui(t.id, chon[t.id])} dangChay={dang === t.id} /> : null}
            </>
          )}
        </TheD>
      ))}
      <LoiD loi={loiGui} />
      <NutD chu="Xin phép Ba Mẹ ›" loai="chu" bam={() => router.push("/tre/xin-phep")} />
    </ManD>
  );
}
