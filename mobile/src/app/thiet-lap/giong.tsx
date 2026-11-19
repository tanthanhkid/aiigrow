// #420 «Giống <con trước>» — bàn bm-thiet-lap-con (chốt 19/11, docs/thiet-ke-chot/bm-thiet-lap-con/03-them-s84hkh82 · 04-them-5t1kazz5):
//  · một nguồn (Con thứ 2, them-s84hkh82): «A → B», «B dùng luật giống A?», thẻ «Sẽ chép từ A» (App & web · Tính phút · Việc mỗi ngày · Chơi bằng sao);
//  · nhiều nguồn (nhà ≥3 con, them-5t1kazz5): «B dùng luật giống ai?», chọn một bé (ô lõm, bé chọn nổi + viền vàng + tick navy), «Sẽ chép: …».
// «Giống A» ⇒ POST con/:con/chep-tu {tu} (máy chủ chép trong một giao dịch — server/lib/chep-thiet-lap.ts) ⇒ thẳng Ghép máy.
// «Thiết lập riêng» ⇒ luồng cũ: Lần đầu (`nguon=lan-dau`, từ «Thiết lập tiếp cho …» ở màn Xong rồi) ⇒ «Một ngày của B»; «Thêm con» (`nguon=them`) ⇒
// «Đã tạo hồ sơ B · bước tiếp». Nhà chưa có con nào khác ⇒ đi thẳng nhánh riêng. Tham số: con (Con đích), nguon, tu (bé chọn sẵn).
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { bm } from "@/lib/api";
import { BONG, KHOI } from "@/lib/clay";
import { dongChep, locNguon, tomTatNguon, type DsNguon } from "@/lib/chep-con";
import { tenGoi } from "@/lib/hang-ngay";
import { DauMan } from "@/lib/lan-dau";
import { layTl, xoaTl } from "@/lib/thiet-lap";
import { Avt, BaoLoi, ChoTai, Chu, F, Icon, Icon3D, M, Man, Nut, useLam, useTai, type TenIcon } from "@/lib/ui";

const IC: TenIcon[] = ["may_tinh", "dongho", "lich", "sao"];

export default function GiongCon() {
  const p = useLocalSearchParams<{ con?: string; nguon?: string; tu?: string }>();
  const con = String(p.con ?? "");
  const them = p.nguon === "them";
  const [boQua] = useState(() => (them ? [] : (layTl().daLuu ?? []).map((x) => x.id)));     // Lần đầu: bé còn chờ thiết lập chưa có luật để chép
  const { d, loi: loiTai, matMang, tai } = useTai(async () => {
    const [ds, c] = await Promise.all([bm.goi<DsNguon>(`con/${con}/chep-tu`), bm.goi<{ ten: string; avatar?: string }>(`con/${con}`)]);
    return { ...ds, ten: c.ten, avatar: c.avatar ?? null };
  });
  const nguon = d ? locNguon(d.ds, boQua, p.tu) : [];
  const [chon, setChon] = useState<string | null>(null);
  const tu = nguon.find((x) => x.id === chon) ?? nguon[0];
  const { lam, loi, dangChay } = useLam();
  const rieng = () => (them ? router.replace(`/ho-so/${con}/tiep` as never) : router.push("/thiet-lap/mau"));
  useEffect(() => { if (d && !d.ds.length) rieng(); }, [d]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!d || !tu) return <Man><ChoTai loi={loiTai} matMang={matMang} tai={tai} /></Man>;
  const ten = tenGoi(d.ten), tenTu = tenGoi(tu.ten);
  const nhieu = nguon.length > 1;
  const giong = () => lam(async () => {
    await bm.goi(`con/${con}/chep-tu`, { tu: tu.id });
    if (them) xoaTl();
    router.replace({ pathname: "/thiet-lap/ghep", params: { con, nguon: them ? "them" : "lan-dau" } });
  });
  return (
    <Man dau={<DauMan ve={them ? "/cai-dat" : "/hom-nay"} phai={<View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, boxShadow: BONG.lom }}>
        <Chu kieu="rat" co={13} mau={M.chu2} dong={1}>{nhieu ? `Con thứ ${d.thu} · ${ten}` : `Con thứ ${d.thu}`}</Chu></View>} />}
      day={<View style={{ gap: 10 }}>
        <BaoLoi loi={loi} />
        <Nut chu={`Giống ${tenTu}`} rong dangChay={dangChay} bam={giong} />
        <Chu co={12.5} mau={M.chu3} style={{ textAlign: "center", marginTop: -2 }}>Xong đi thẳng tới Ghép máy</Chu>
        <Nut chu="Thiết lập riêng" loai="vien" rong tat={dangChay} bam={rieng} />
      </View>}>
      {nhieu ? null : (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 8 }}>
          <View style={{ alignItems: "center", gap: 8, width: 96 }}><Avt ten={tu.ten} con={tu} co={52} /><Chu kieu="dam" co={13} mau={M.chu2} dong={1}>{tenTu}</Chu></View>
          <View style={{ marginBottom: 24 }}><Icon ten="phai" mau={M.dauSach} co={30} /></View>
          <View style={{ alignItems: "center", gap: 8, width: 96 }}><Avt ten={d.ten} con={{ id: con, avatar: d.avatar }} co={52} chon /><Chu kieu="dam" co={13} mau={M.chu2} dong={1}>{ten}</Chu></View>
        </View>
      )}
      <View style={{ gap: 8 }}>
        <Text accessibilityRole="header" style={{ fontFamily: F.tieu, fontSize: 25, lineHeight: 32, letterSpacing: -0.4, color: M.chu }}>
          {nhieu ? `${ten} dùng luật giống ai?` : `${ten} dùng luật giống ${tenTu}?`}</Text>
        <Chu co={14.5} mau={M.chu2} style={{ lineHeight: 21 }}>{nhieu ? `Chọn một con để chép luật sang. Sau này vẫn sửa riêng cho ${ten} được.`
          : `Chép luật của ${tenTu} sang, khỏi điền lại. Sau này vẫn sửa riêng từng con được.`}</Chu>
      </View>
      {nhieu ? (
        <View style={{ gap: 12 }} accessibilityRole="radiogroup">
          {nguon.map((x) => {
            const on = x.id === tu.id;
            return (
              <Pressable key={x.id} onPress={() => setChon(x.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${tenGoi(x.ten)}, ${tomTatNguon(x)}`}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 72, paddingHorizontal: 14, borderRadius: 20, backgroundColor: M.the,
                  boxShadow: on ? `${BONG.nho}, inset 0px 0px 0px 1.5px ${M.dauSach}` : BONG.lom }}>
                <Avt ten={x.ten} con={x} co={44} chon={on} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Chu kieu="rat" co={15.5} dong={1}>{tenGoi(x.ten)}</Chu>
                  <Chu co={12.5} mau={M.chu3} dong={2}>{tomTatNguon(x)}</Chu>
                </View>
                <View style={{ width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", backgroundColor: on ? M.chinh : M.the, boxShadow: on ? "none" : BONG.lom }}>
                  {on ? <Icon ten="tick" mau={M.diem} co={16} /> : null}
                </View>
              </Pressable>
            );
          })}
          <Chu co={13} mau={M.chu2} style={{ lineHeight: 19, paddingHorizontal: 4 }}>Sẽ chép: <Chu kieu="rat" co={13}>App & web</Chu> · <Chu kieu="rat" co={13}>Tính phút</Chu> · <Chu kieu="rat" co={13}>Việc mỗi ngày</Chu> · <Chu kieu="rat" co={13}>Chơi bằng sao</Chu></Chu>
        </View>
      ) : (
        <View style={{ paddingVertical: 6, paddingHorizontal: 14, borderRadius: 24, backgroundColor: M.the, ...KHOI.the }}>
          <Chu kieu="rat" co={12.5} mau={M.chu2} style={{ paddingTop: 10, paddingBottom: 2, letterSpacing: 0.3, textTransform: "uppercase" }}>{`Sẽ chép từ ${tenTu}`}</Chu>
          {dongChep(tu).map(([tieu, phu], k) => (
            <View key={tieu} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 58, paddingVertical: 6, borderTopWidth: k ? 1 : 0, borderTopColor: "rgba(120,98,70,0.14)" }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: M.the, boxShadow: BONG.lom }}><Icon3D ten={IC[k]} co={24} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Chu kieu="rat" co={15} style={{ lineHeight: 20 }}>{tieu}</Chu>
                <Chu co={12.5} mau={M.chu3} style={{ lineHeight: 17 }}>{phu}</Chu>
              </View>
            </View>
          ))}
        </View>
      )}
    </Man>
  );
}
