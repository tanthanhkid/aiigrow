// «Chọn bộ nhiệm vụ» (thiết kế chốt 05/11 bm-hang-ngay/41, L9): chip bộ (Tự lập · Phụ việc nhà · Học tập · Khoẻ mạnh — GET nhiem-vu/bo),
// Grow chọn sẵn cả bộ, Ba Mẹ bỏ tick việc không muốn giao rồi «Giao N việc cho <Con>» = POST nhiem-vu/bo {bo, con, chon}.
// Việc trùng tên Con đã có / việc AiiRob tự chấm đã có thì máy chủ bỏ qua. «+ Tự đặt việc khác» → /giao-nv/tu-dat.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { BONG, MEN } from "@/lib/clay";
import { BaoLoi, baoKhiVe, ChoTai, Chips, Chu, Icon, M, Man, Nut, The, useLam, useTai } from "@/lib/ui";
import { cachBao, cauLapLai, HangViec, hinhNv, SaoVien, type BoNv } from "@/lib/hang-ngay";

export default function ChonBo() {
  const { con: conXem } = useLocalSearchParams<{ con?: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [bo, g] = await Promise.all([bm.goi<{ ds: BoNv[] }>("nhiem-vu/bo"), bm.goi<GiaDinh>("gia-dinh")]);
    return { bo: bo.ds, con: g.con };
  });
  const [ma, setMa] = useState<string | null>(null);
  const [bo, setBo] = useState<Record<string, string[]>>({});         // tên việc BỎ tick theo bộ
  const { lam, loi: loiLam, dangChay } = useLam();
  if (!d) return <Man lui={{ chu: "Nhiệm vụ" }} tieu="Chọn bộ nhiệm vụ"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const c = d.con.find((x) => x.id === conXem) ?? d.con[0];
  const b = d.bo.find((x) => x.ma === ma) ?? d.bo[0];
  if (!b || !c) return <Man lui={{ chu: "Nhiệm vụ" }} tieu="Chọn bộ nhiệm vụ"><The><Chu mau={M.chu2}>Chưa có bộ nhiệm vụ hoặc hồ sơ con.</Chu></The></Man>;
  const bot = bo[b.ma] ?? [];
  const chon = b.viec.filter((v) => !bot.includes(v.ten));
  const doi = (ten: string) => setBo((x) => ({ ...x, [b.ma]: bot.includes(ten) ? bot.filter((t) => t !== ten) : [...bot, ten] }));
  const giao = () => lam(async () => {
    const r = await bm.goi<{ taoMoi: number }>("nhiem-vu/bo", { bo: b.ma, con: c.id, chon: chon.map((v) => v.ten) });
    baoKhiVe(r.taoMoi ? `Đã giao ${r.taoMoi} việc cho ${c.ten}` : `${c.ten} đã có sẵn các việc này`);
    router.back();
  });
  return (
    <Man lui={{ chu: "Nhiệm vụ" }} tieu="Chọn bộ nhiệm vụ"
      day={<><BaoLoi loi={loiLam} /><Nut chu={`Giao ${chon.length} việc cho ${c.ten}`} rong dangChay={dangChay} tat={!chon.length} bam={giao} /></>}>
      <Chips ds={d.bo.map((x) => ({ gia: x.ma, chu: `${x.ten} · ${x.soViec} việc` }))} chon={[b.ma]} doi={setMa} />
      <Chu co={14.5} mau={M.chu2}>{`Grow chọn sẵn việc hợp với ${b.tuoi}. Bỏ tick việc nào không muốn giao.`}</Chu>
      <The>
        <Chu kieu="rat" co={15}>{`Bộ ${b.ten} tối đa ${b.saoToiDaNgay} sao/ngày`}</Chu>
        {b.viec.map((v, i) => {
          const [ic, mau] = hinhNv({ hinh: v.hinh, bang_chung: v.tuCham ? "tu_dong" : v.bangChung });
          const on = !bot.includes(v.ten);
          return (
            <HangViec key={v.ten} dau={i === 0} ic={ic} mau={mau} tieu={v.ten}
              phu={v.tuCham ? "Tự chấm" : v.nhan ?? `${cauLapLai(v.lapLai)} · ${cachBao(v.bangChung)}`}
              phai={<View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <SaoVien n={v.sao} nho />
                <Pressable onPress={() => doi(v.ten)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`Giao ${v.ten}`} hitSlop={8}
                  style={[{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
                    on ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc, backgroundImage: MEN.ngoc } : { borderWidth: 2, borderColor: M.oNhap, boxShadow: BONG.lom }]}>
                  {on ? <Icon ten="tick" mau="#fff" co={15} /> : null}
                </Pressable>
              </View>} />
          );
        })}
        <Pressable onPress={() => router.push(`/giao-nv/tu-dat?con=${c.id}` as never)} accessibilityRole="button" style={{ minHeight: 48, justifyContent: "center", marginTop: 4 }}>
          <Chu kieu="rat" co={15} mau={M.chinhInk}>+ Tự đặt việc khác</Chu>
        </Pressable>
      </The>
    </Man>
  );
}
