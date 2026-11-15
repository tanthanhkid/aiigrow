// bm1-may-chon-loai «Ghép thêm máy» (thiết kế chốt 15/11, #267): «Máy mới cho bé nào? · chọn một hoặc nhiều bé» — dải avatar có dấu tick (chọn nhiều),
// «＋ Thêm con»; thẻ kết quả «Máy dùng chung · N bé» (bé chọn tên + PIN, chỉ trừ sao bé đang dùng) / «Máy riêng của <bé>»; hộp «iPhone, iPad: chỉ một bé»
// (máy hoá ra iPhone/iPad thì Grow hỏi chọn đúng một bé lúc quét); «Không cần cài riêng cho máy: sao và danh sách app đi theo từng bé» (bỏ «Cài giống
// máy trước» — luật đi theo bé). «Lấy mã ghép máy chung cho N bé» ⇒ màn Ghép máy (POST ghep-may {conDs}).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { BONG, KHOI } from "@/lib/clay";
import { Anh3D, DauMan } from "@/lib/lan-dau";
import { tenGoi } from "@/lib/hang-ngay";
import { AvtCon } from "@/lib/may-nhieu-con";
import { ChoTai, Chu, Icon, Icon3D, M, Man, Nut, Rob, useTai } from "@/lib/ui";

export default function GhepThemMay() {
  const { con: conVao } = useLocalSearchParams<{ con?: string }>();
  const { d, loi, matMang, tai } = useTai(() => bm.goi<GiaDinh>("gia-dinh").then((g) => g.con));
  // bé chọn: mặc định bé đang xem (?con) — không có thì bé đầu tiên; nhà một bé ⇒ bé đó
  const [chon, setChon] = useState<ReadonlySet<string> | null>(null);
  if (!d) return <Man dau={<DauMan tieu="Ghép thêm máy" ve="/may" />}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const macDinh = new Set([d.find((x) => x.id === conVao)?.id ?? d[0]?.id].filter(Boolean) as string[]);
  const dang = chon ?? macDinh;
  const ds = d.filter((x) => dang.has(x.id));
  const so = ds.length;
  const doi = (id: string) => { const n = new Set(dang); if (n.has(id)) n.delete(id); else n.add(id); setChon(n); };
  const lay = () => so && router.push({ pathname: "/thiet-lap/ghep", params: { con: ds[0].id, nguon: "them", moi: "1", ...(so > 1 ? { conDs: ds.map((x) => x.id).join(",") } : {}) } });
  return (
    <Man dau={<DauMan tieu="Ghép thêm máy" ve="/may" />}
      day={<Nut chu={so > 1 ? `Lấy mã ghép máy chung cho ${so} bé` : so ? `Lấy mã ghép máy mới cho ${tenGoi(ds[0].ten)}` : "Chọn bé dùng máy mới"} rong tat={!so} bam={lay} />}>
      <View style={{ flexDirection: "row", alignItems: "baseline", flexWrap: "wrap", gap: 6, paddingHorizontal: 6, marginTop: 4 }}>
        <Chu kieu="rat" co={15} mau="#3a403d">Máy mới cho bé nào?</Chu>
        {d.length > 1 ? <Chu kieu="dam7" co={12.5} mau="#565c59">· chọn một hoặc nhiều bé</Chu> : null}
      </View>
      {/* dải avatar tròn 54 (bé chọn: vòng ngọc + dấu tick), «＋ Thêm con» cuối dải */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 10, columnGap: 22, paddingHorizontal: 6 }}>
        {d.map((x) => {
          const on = dang.has(x.id);
          return (
            <Pressable key={x.id} onPress={() => doi(x.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={x.ten}
              style={{ width: 62, alignItems: "center", gap: 7 }}>
              <View style={{ width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", borderWidth: 2.5, borderColor: on ? M.chinh : "transparent" }}>
                <AvtCon c={x} co={52} />
              </View>
              {on ? (
                <View style={{ position: "absolute", top: 40, right: 0, width: 22, height: 22, borderRadius: 11, backgroundColor: M.chinh, alignItems: "center", justifyContent: "center",
                  borderWidth: 2.5, borderColor: M.nen }}><Icon ten="tick" mau="#fff" co={12} /></View>
              ) : null}
              <Chu kieu="rat" co={12.5} mau={on ? M.chinhInk : "#3a403d"} dong={1}>{tenGoi(x.ten)}</Chu>
            </Pressable>
          );
        })}
        <Pressable onPress={() => router.push("/thiet-lap/ten-con")} accessibilityRole="button" accessibilityLabel="Thêm con" style={{ width: 62, alignItems: "center", gap: 7 }}>
          <View style={{ margin: 5, width: 52, height: 52, borderRadius: 26, backgroundColor: "#f7f6f3", alignItems: "center", justifyContent: "center", ...KHOI.nho }}>
            <Icon ten="cong" mau={M.chinhInk} co={22} />
          </View>
          <Chu kieu="rat" co={12.5} mau="#3a403d" dong={1}>Thêm con</Chu>
        </Pressable>
      </View>
      {so ? (
        <View style={{ padding: 16, borderRadius: 24, backgroundColor: "#dcebe6", boxShadow: `0px 0px 0px 2.5px ${M.chinh}, ${BONG.nho}`, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon3D ten="nguoi" co={24} />
            <Chu kieu="rat" co={15} mau={M.chinhInk} style={{ flexShrink: 1 }}>{so > 1 ? `Máy dùng chung · ${so} bé` : `Máy riêng của ${tenGoi(ds[0].ten)}`}</Chu>
          </View>
          <Chu kieu="dam" co={13} style={{ lineHeight: 18 }}>
            {so > 1 ? "Khi mở máy, bé chọn tên + nhập PIN của mình. Chơi chỉ trừ sao của bé đang dùng."
              : `${tenGoi(ds[0].ten)} vào thẳng, không hỏi PIN. Windows, Mac, Android thêm bé khác dùng chung sau được.`}
          </Chu>
        </View>
      ) : null}
      <View style={{ flexDirection: "row", gap: 10, padding: 16, borderRadius: 24, backgroundColor: "#f7f6f3", ...KHOI.the }}>
        <Icon3D ten="tablet" co={30} />
        <View style={{ flex: 1 }}>
          <Chu kieu="rat" co={14}>iPhone, iPad: chỉ một bé</Chu>
          <Chu kieu="dam" co={13} mau="#3a403d" style={{ lineHeight: 18 }}>
            {`Hệ điều hành của Apple không đổi người dùng được, nên nếu máy mới là iPhone/iPad${so > 1 ? ", Grow sẽ hỏi chọn đúng một bé" : ", máy chỉ dành cho một bé"}. Windows, Mac, Android dùng chung được.`}
          </Chu>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 6 }}>
        <Anh3D ten="lap_lanh" co={24} /><Chu kieu="dam" co={13.5} mau="#3a403d" style={{ flex: 1 }}>Không cần cài riêng cho máy: sao và danh sách app đi theo từng bé.</Chu>
      </View>
      <View style={{ alignItems: "center" }}><Rob ten="chi" co={130} /></View>
    </Man>
  );
}
