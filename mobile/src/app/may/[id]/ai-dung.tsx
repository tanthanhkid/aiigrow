// them-okpa735o «Máy này ai dùng?» (thiết kế chốt 15/11, #267): chọn bé dùng một máy. Windows / Mac / Android: đánh dấu một hay nhiều bé
// (≥ 2 = máy dùng chung, bé chọn tên + PIN; 1 = máy riêng, vào thẳng). iPhone / iPad: chỉ một bé — bé khác khoá «Không thêm được» kèm lý do.
// Máy dùng chung: thêm mục từng iPhone / iPad trong nhà (bé của máy «Máy riêng», bé khác «Không thêm được») — chỉ để xem (thiết kế them-okpa735o).
// Lưu = POST may/:id/con {ds} (thay toàn bộ; máy chủ chặn [] — 400 can_mot_con, iPhone/iPad > 1 — 409 ios_mot_con). Người trông giúp chỉ xem.
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type TuanThuMay } from "@/lib/api";
import { quyenToi, tenGoi } from "@/lib/hang-ngay";
import { AvtCon, conCuaMay, datConMay, laMotCon, DauHaiDong, HopChu, keDau, MucPhai, ODanhDau, SaoNho, TEN_NEN, TheDs, type ConCuaMay, type ConMay } from "@/lib/may-nhieu-con";
import { BaoLoi, baoKhiVe, ChoTai, Chu, M, Man, Nut, useLam, useTai } from "@/lib/ui";

export default function MayNayAiDung() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [cm, quyen, tt] = await Promise.all([bm.goi<ConMay>(`may/${id}/con`), quyenToi(), bm.goi<{ ds: TuanThuMay[] }>("tuan-thu").catch(() => null)]);
    return { cm, xem: quyen === "trong_giup", ios: (tt?.ds ?? []).filter((x) => x.id !== id && laMotCon(x)) };
  });
  const [chon, setChon] = useState<ReadonlySet<string> | null>(null);
  const { lam, loi: loiLuu, dangChay } = useLam();
  const lui = () => (router.canGoBack() ? router.back() : router.replace({ pathname: "/may/[id]", params: { id } }));
  if (!d) return <Man dau={<DauHaiDong tieu="Máy này ai dùng?" lui={lui} />}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const { cm, xem } = d;
  const ten = cm.may.ten.replace(/ · .*$/, "");
  const tenNgan = ten.replace(/ của .*$/, "");
  const goc = new Set(cm.ds.filter((c) => c.gan).map((c) => c.id));
  const dang = chon ?? goc;
  const so = dang.size;
  const doi = (c: ConCuaMay) => {
    if (xem) return;
    if (cm.may.motCon) { setChon(new Set([c.id])); return; }       // iPhone / iPad: chọn MỘT bé (chỉ đổi được khi máy chưa nối ai)
    const n = new Set(dang); if (n.has(c.id)) n.delete(c.id); else n.add(c.id); setChon(n);
  };
  const doiChua = so !== goc.size || [...dang].some((x) => !goc.has(x));
  const tenChon = cm.ds.filter((c) => dang.has(c.id)).map((c) => tenGoi(c.ten));
  const luu = () => lam(async () => {
    const r = await datConMay(id, [...dang]);
    baoKhiVe(r.may.mayChung ? `${tenNgan} dùng chung ${r.may.soCon} bé` : `${tenNgan} là máy riêng của ${tenChon[0] ?? "bé"}`);
    lui();
  });
  const dong = (c: ConCuaMay, k: number) => {
    const khoa = !c.ganDuoc && !c.gan;
    const rieng = c.mayKhac.find((x) => x.rieng && x.id !== id);
    const on = dang.has(c.id);
    return (
      <Pressable key={c.id} onPress={khoa ? undefined : () => doi(c)} disabled={khoa || xem} accessibilityRole={cm.may.motCon ? "radio" : "checkbox"}
        accessibilityState={{ checked: on, disabled: khoa || xem }} accessibilityLabel={`${tenGoi(c.ten)}${khoa ? ", không thêm được" : ""}`}
        style={[{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 60 }, keDau(k)]}>
        <View style={khoa ? { opacity: 0.45, filter: "grayscale(1)" } : undefined}><AvtCon c={c} co={36} /></View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Chu kieu="rat" mau={khoa ? M.chu3 : M.chu} dong={1}>{tenGoi(c.ten)}</Chu>
          {cm.may.motCon ? (
            <Chu kieu="dam" co={12.5} mau={M.chu3}>{c.gan ? "Máy riêng" : khoa ? "Không thêm được" : "Chọn bé này"}</Chu>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
              {c.dangDung ? <Chu kieu="dam" co={12.5} mau={M.chu3}>Đang dùng ·</Chu> : null}
              <SaoNho n={c.sao} />
              {rieng ? <Chu kieu="dam" co={12.5} mau={M.chu3} dong={1} style={{ flexShrink: 1 }}>{`· có ${rieng.ten.replace(/ (của|·) .*$/, "")} riêng`}</Chu> : null}
            </View>
          )}
        </View>
        <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><ODanhDau chon={on} khoa={khoa} /></View>
      </Pressable>
    );
  };
  const nguoiKhac = cm.ds.find((c) => !c.gan);
  // bé đang dùng lên đầu (thiết kế them-okpa735o)
  const ds = [...cm.ds].sort((a, b) => Number(b.dangDung) - Number(a.dangDung));
  const caNha = cm.ds.map((c) => ({ id: c.id, ten: c.ten, avatar: c.avatar }));
  // mục iPhone / iPad (chỉ xem): bé của máy ✓ «Máy riêng», bé khác 🔒 «Không thêm được»
  const mucIos = (x: TuanThuMay) => {
    const tenX = x.ten.replace(/ · .*$/, ""), nganX = tenX.replace(/ của .*$/, "");
    const cua = conCuaMay(x, caNha)[0];
    const khac = cm.ds.find((c) => c.id !== cua?.id);
    return (
      <View key={x.id} style={{ gap: 12 }}>
        <MucPhai chu={tenX} phai="1 bé" />
        <TheDs>
          {[...(cua ? [cua] : []), ...cm.ds.filter((c) => c.id !== cua?.id)].map((c, k) => {
            const la = c.id === cua?.id;
            return (
              <View key={c.id} accessibilityLabel={`${tenGoi(c.ten)}, ${la ? "máy riêng" : "không thêm được"}`}
                style={[{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 60 }, keDau(k)]}>
                <View style={la ? undefined : { opacity: 0.45, filter: "grayscale(1)" }}><AvtCon c={c} co={36} /></View>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                  <Chu kieu="rat" mau={la ? M.chu : M.chu3} dong={1}>{tenGoi(c.ten)}</Chu>
                  <Chu kieu="dam" co={12.5} mau={M.chu3}>{la ? "Máy riêng" : "Không thêm được"}</Chu>
                </View>
                <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}><ODanhDau chon={la} khoa={!la} /></View>
              </View>
            );
          })}
        </TheDs>
        {cua && khac ? (
          <HopChu>
            <Chu kieu="rat" co={13} mau={M.chu2}>iPhone, iPad chỉ một bé: </Chu>
            {`hệ điều hành của Apple không cho đổi người dùng trên máy. Muốn ${tenGoi(khac.ten)} dùng ${nganX}, gỡ khỏi ${tenGoi(cua.ten)} rồi ghép lại cho ${tenGoi(khac.ten)}.`}
          </HopChu>
        ) : null}
      </View>
    );
  };
  const chuNut = so >= 2 ? `Lưu · ${so} bé dùng máy này` : so === 1 ? `Lưu · máy riêng của ${tenChon[0]}` : "Chọn ít nhất một bé";
  return (
    <Man dau={<DauHaiDong tieu="Máy này ai dùng?" phu={`${ten} · ${TEN_NEN[cm.may.nen] ?? cm.may.nen}`} lui={lui} />}
      day={xem ? <Chu co={13} mau={M.chu3} style={{ textAlign: "center" }}>Người trông giúp chỉ xem — đổi bé dùng máy thì nhờ Ba Mẹ.</Chu> : <>
        <BaoLoi loi={loiLuu} />
        <Nut chu={chuNut} rong dangChay={dangChay} tat={!so || !doiChua} bam={luu} />
      </>}>
      {cm.may.motCon ? <>
        <MucPhai chu={ten} phai="1 bé" />
        <TheDs>{cm.ds.map(dong)}</TheDs>
        <HopChu>
          <Chu kieu="rat" co={13} mau={M.chu2}>iPhone, iPad chỉ một bé: </Chu>
          {`hệ điều hành của Apple không cho đổi người dùng trên máy.${nguoiKhac && goc.size ? ` Muốn ${tenGoi(nguoiKhac.ten)} dùng ${tenNgan}, gỡ khỏi ${tenGoi(cm.ds.find((c) => c.gan)!.ten)} rồi ghép lại cho ${tenGoi(nguoiKhac.ten)}.` : ""}`}
        </HopChu>
      </> : <>
        <TheDs>{ds.map(dong)}</TheDs>
        {so >= 2 ? (
          <HopChu loai="ngoc"><Chu kieu="rat" co={13} mau={M.chinhInk}>{`${so} bé = máy dùng chung. `}</Chu>Mở máy, bé chọn tên + PIN. Chơi chỉ trừ sao của bé đang dùng.</HopChu>
        ) : so === 1 ? (
          <HopChu loai="ngoc"><Chu kieu="rat" co={13} mau={M.chinhInk}>1 bé = máy riêng. </Chu>{`${tenChon[0]} vào thẳng, không hỏi PIN.`}</HopChu>
        ) : (
          <HopChu loai="dao">Chọn ít nhất một bé. Muốn bỏ hẳn máy này thì gỡ máy (màn máy › «Gỡ máy này»).</HopChu>
        )}
        {cm.ds.length > 1 ? d.ios.map(mucIos) : null}
      </>}
    </Man>
  );
}
