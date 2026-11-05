// them-at57ypdc «Thêm app cho X» (thiết kế chốt 04/11): gõ tên ⇒ «Chọn đúng app» (app trong lưới khớp tên + đúng tên Ba Mẹ gõ),
// «Có tính vào giờ chơi?» (app học ⇒ Rob gợi ý không tính). App ngoài lưới gửi theo tên — máy chủ khớp với app thật máy của Con đã báo
// (docs/API.md › app-cho-phep). Xong ⇒ quay về Chọn app.
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { Pressable, TextInput, View } from "react-native";
import { BONG, KHOI } from "@/lib/clay";
import { coMa, napAppGoiY, type AppGoiY } from "@/lib/ghep-may";
import { DauMan, LienKet, OApp, TieuDe } from "@/lib/lan-dau";
import { datTl, layTl } from "@/lib/thiet-lap";
import { Chu, F, Icon3D, M, Man, Nut, Rob, The } from "@/lib/ui";

const bo = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").toLowerCase().trim();

export default function ThemApp() {
  const tl = layTl();
  const ten = tl.tenCon ?? "con";
  const [luoi, setLuoi] = useState<AppGoiY[]>([]);
  const [go, setGo] = useState("");
  const [chon, setChon] = useState<string | null>(null);          // mã app trong lưới, hoặc «#» = đúng tên Ba Mẹ gõ
  const [tinhGio, setTinhGio] = useState<boolean | null>(null);
  useEffect(() => { if (tl.conId) napAppGoiY(tl.conId).then(setLuoi).catch(() => {}); }, [tl.conId]);
  const k = bo(go);
  const khop = k ? luoi.filter((a) => bo(a.ten).includes(k)) : [];
  const trung = khop.some((a) => bo(a.ten) === k);
  const ds: { id: string; ma?: string; ten: string; phu: string }[] = [
    ...khop.map((a) => ({ id: a.ma, ma: a.ma, ten: a.ten, phu: a.tinhGio ? "Giải trí · tính giờ chơi" : "Học tập · không tính giờ" })),
    ...(k && !trung ? [{ id: "#", ten: go.trim(), phu: "Đúng tên Ba Mẹ gõ — khớp khi máy của con mở app này" }] : []),
  ];
  const c = ds.find((x) => x.id === chon) ?? (ds.length === 1 ? ds[0] : null);
  const goiY = c?.ma ? luoi.find((a) => a.ma === c.ma)?.tinhGio ?? true : !/hoc|learn|edu|dict|tu dien|math|toan|doc|read/.test(bo(c?.ten ?? ""));
  const tinh = tinhGio ?? goiY;
  const them = () => {
    if (!c) return;
    const cu = layTl().apps ?? [];
    const moi = c.ma ? (cu.some((x) => coMa(x) && x.ma === c.ma) ? cu : [...cu, { ma: c.ma, ten: c.ten }])
      : [...cu.filter((x) => coMa(x) || bo(x.ten) !== bo(c.ten)), { ten: c.ten, tinhGio: tinh }];
    datTl({ apps: moi });
    router.back();
  };
  return (
    <Man dau={<DauMan ve="/thiet-lap/app" />}
      day={<><Nut chu={c ? `Cho ${ten} dùng ${c.ten}` : "Gõ tên app để thêm"} rong tat={!c} bam={them} /><LienKet chu="Thôi, không thêm" bam={() => router.back()} /></>}>
      <TieuDe chu={`Thêm app cho ${ten}`} />
      <View style={{ flexDirection: "row", alignItems: "center", minHeight: 54, borderRadius: 27, backgroundColor: "#fff", paddingHorizontal: 18, boxShadow: `0px 0px 0px 2px ${M.chinh}, ${BONG.nho}` }}>
        <TextInput value={go} onChangeText={(t) => { setGo(t); setChon(null); setTinhGio(null); }} autoFocus placeholder="Duolingo, Zoom, Khan Academy…" placeholderTextColor={M.chu3}
          accessibilityLabel="Tên app" autoCorrect={false} style={{ flex: 1, fontFamily: F.dam, fontSize: 17, color: M.chu, paddingVertical: 12, outlineStyle: "none" } as never} />
        {k ? <Chu co={12.5} mau={M.chu3}>{`${ds.length} kết quả`}</Chu> : null}
      </View>
      {ds.length ? (
        <>
          <Chu kieu="rat" co={14} style={{ paddingHorizontal: 4 }}>Chọn đúng app</Chu>
          <The sat>
            {ds.map((x, i) => (
              <Pressable key={x.id} onPress={() => { setChon(x.id); setTinhGio(null); }} accessibilityRole="radio" accessibilityState={{ checked: c?.id === x.id }}
                style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 12, minHeight: 64, borderTopWidth: i ? 1 : 0, borderTopColor: "#efefec" }}>
                <OApp ma={x.ma} ten="" nhanDoc={x.ten} rong={60} />
                <View style={{ flex: 1, minWidth: 0 }}><Chu kieu="rat" co={15.5}>{x.ten}</Chu><Chu co={12.5} mau={M.chu3}>{x.phu}</Chu></View>
                <View style={{ width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", ...(c?.id === x.id ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc } : { backgroundColor: "#e6e5e1", boxShadow: BONG.lom }) }}>
                  {c?.id === x.id ? <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: "#fff" }} /> : null}
                </View>
              </Pressable>
            ))}
          </The>
        </>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 4 }}>
        <Icon3D ten="dau_hoi" co={20} /><Chu co={13} mau={M.chu2}>Không thấy? Gõ đúng tên app trên máy con.</Chu>
      </View>
      {c && !c.ma ? (
        <The>
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Icon3D ten="dongho" co={24} /><Chu kieu="rat" co={15}>Có tính vào giờ chơi?</Chu></View>
            <View style={{ flexDirection: "row", gap: 6, padding: 5, borderRadius: 22, backgroundColor: "#ebeae6", boxShadow: BONG.lom }}>
              {([[true, "Tính vào giờ chơi"], [false, "Không tính giờ"]] as const).map(([v, t]) => (
                <Pressable key={t} onPress={() => setTinhGio(v)} accessibilityRole="radio" accessibilityState={{ checked: tinh === v }}
                  style={{ flex: 1, minHeight: 48, borderRadius: 18, alignItems: "center", justifyContent: "center", ...(tinh === v ? { backgroundColor: "#fff", boxShadow: `0px 0px 0px 2px ${M.chinh}`, ...KHOI.nho } : {}) }}>
                  <Chu kieu="rat" co={14.5} mau={tinh === v ? M.chinhInk : M.chu2}>{t}</Chu>
                </Pressable>
              ))}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 18, backgroundColor: "#dcebe6", padding: 10 }}>
              <Rob ten="chi" co={36} />
              <Chu co={13} mau={M.chinhInk} style={{ flex: 1 }}>{goiY ? "App giải trí, Rob gợi ý tính vào giờ chơi." : "App học, Rob gợi ý không tính giờ."}</Chu>
            </View>
          </View>
        </The>
      ) : null}
    </Man>
  );
}
