// bm1-ob-gio «Giờ chơi» (bước 3/4, thiết kế chốt 04/11 — Nghi: «Giờ chơi phải có lại phần chặn app»):
//   · khối «Chặn app» 2 chế độ (L4): Chỉ app được phép (mặc định, Rob gợi ý) / Mở hết (chỉ tính giờ) + 4 app đầu + «Thêm hoặc bớt app» ⇒ Chọn app;
//   · Giờ chơi mỗi ngày: chip 30 / 60 / 90 phút, cuối tuần +30 (L2 — quỹ phút, hết giờ máy tự khoá);
//   · Giờ ngủ: hai ô giờ, bấm mở bánh xe (them-hijzsz0z).
// «Lưu và ghép máy của X» ⇒ POST thiet-lap (một lần) ⇒ Ghép máy.
import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Pressable, View } from "react-native";
import { BONG, KHOI } from "@/lib/clay";
import { coMa, cuoiTuanCua, luuThietLap, napAppGoiY, NGU_MAC_DINH, QUY_CHIP, QUY_MAC_DINH } from "@/lib/ghep-may";
import { BanhXeGio, DauMan, gioGon, OApp, ThanhBuoc, TieuDe } from "@/lib/lan-dau";
import { datTl, layTl } from "@/lib/thiet-lap";
import { BangTruot, BaoLoi, Chu, Icon, Icon3D, M, Man, Nut, Rob, The, useLam } from "@/lib/ui";

export default function ObGio() {
  const tl = layTl();
  const ten = tl.tenCon ?? "con";
  const [cheDo, setCheDo] = useState(tl.cheDoChan ?? "chi_app_duoc_phep");
  const [quy, setQuy] = useState(tl.quy ?? QUY_MAC_DINH);
  const [ngu, setNgu] = useState(tl.ngu ?? NGU_MAC_DINH);
  const [apps, setApps] = useState(tl.apps);
  const [suaNgu, setSuaNgu] = useState<"tu" | "den" | null>(null);
  const { lam, loi, dangChay } = useLam();
  // quay về từ màn Chọn app ⇒ đọc lại lựa chọn; lần đầu chưa có ⇒ lấy lựa chọn sẵn của Rob (app-goi-y)
  useFocusEffect(useCallback(() => {
    const t = layTl();
    setApps(t.apps);
    if (t.conId && !t.apps) napAppGoiY(t.conId).then(() => setApps(layTl().apps)).catch(() => {});
  }, []));
  const doi = (x: Parameters<typeof datTl>[0]) => datTl(x);
  const luu = () => lam(async () => {
    const con = await luuThietLap();
    router.push({ pathname: "/thiet-lap/ghep", params: { con, nguon: "lan-dau" } });
  }, { hangDoi: true });
  const chiApp = cheDo === "chi_app_duoc_phep";
  const soApp = apps?.length ?? 0;
  return (
    <Man dau={<DauMan ve="/thiet-lap/mau" phai={<ThanhBuoc dang={2} />} />}
      day={<><BaoLoi loi={loi} /><Nut chu={`Lưu và ghép máy của ${ten}`} rong dangChay={dangChay} bam={luu} /></>}>
      <TieuDe chu={`${ten} được dùng app nào?`} phu={chiApp ? "Ngoài các app này, máy của con sẽ bị chặn." : "Mọi app đều mở, chỉ tính vào giờ chơi."} />
      <View style={{ borderRadius: 30, backgroundColor: "#f7faf8", padding: 12, gap: 12, boxShadow: `0px 0px 0px 2px ${M.chinh}, ${BONG.the}` }}>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
          <View style={{ alignItems: "center", gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: M.chinh, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 }}>
              <Icon ten="khien" mau="#fff" co={13} /><Chu kieu="rat" co={12} mau="#fff">Chặn app</Chu>
            </View>
            <Rob ten="hoc" co={78} />
          </View>
          <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 18, padding: 12, ...KHOI.nho }}>
            <Chu co={13.5} mau={M.chu2}>{chiApp
              ? <>Rob chọn sẵn <Chu kieu="rat" co={13.5} mau={M.chinhInk}>{`${soApp} app`}</Chu> hợp tuổi con. App mới con tải sẽ <Chu kieu="rat" co={13.5} mau={M.chinhInk}>xin Ba Mẹ duyệt</Chu> trước.</>
              : "Mở hết: con dùng được mọi app, chỉ tính giờ chơi. Web cờ bạc / người lớn vẫn luôn chặn."}</Chu>
          </View>
        </View>
        <View style={{ flexDirection: "row", gap: 6, padding: 5, borderRadius: 24, backgroundColor: "#ebeae6", boxShadow: BONG.lom }} accessibilityRole="radiogroup">
          {([["chi_app_duoc_phep", "Chỉ app được phép", "Rob gợi ý · nên chọn"], ["mo_het", "Mở hết", "Chỉ tính giờ"]] as const).map(([v, t, p]) => (
            <Pressable key={v} onPress={() => { setCheDo(v); doi({ cheDoChan: v }); }} accessibilityRole="radio" accessibilityState={{ checked: cheDo === v }}
              style={{ flex: 1, minHeight: 54, borderRadius: 20, alignItems: "center", justifyContent: "center", paddingHorizontal: 6,
                ...(cheDo === v ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc } : {}) }}>
              <Chu kieu="rat" co={14.5} mau={cheDo === v ? "#fff" : M.chu}>{t}</Chu>
              <Chu co={11.5} mau={cheDo === v ? "#d8efe9" : M.chu3}>{p}</Chu>
            </Pressable>
          ))}
        </View>
        {chiApp ? (
          <>
            <View style={{ flexDirection: "row" }}>
              {(apps ?? []).slice(0, 4).map((a) => <OApp key={a.ten} ma={coMa(a) ? a.ma : undefined} ten={a.ten} />)}
            </View>
            <Pressable onPress={() => router.push("/thiet-lap/app")} accessibilityRole="button"
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 48, paddingHorizontal: 14, borderRadius: 18, backgroundColor: "#fff", ...KHOI.nho }}>
              <Chu kieu="rat" co={14.5} mau={M.chinhInk}>{`Thêm hoặc bớt app · ${soApp} app`}</Chu>
              <Icon ten="phai" mau={M.chinhInk} co={18} />
            </Pressable>
          </>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
        <Icon3D ten="dongho" co={24} /><Chu kieu="rat" co={16}>Giờ chơi mỗi ngày</Chu>
        <Chu co={12.5} mau={M.chu3} style={{ marginLeft: "auto" }}>Hết giờ, máy tự khoá</Chu>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }} accessibilityRole="radiogroup">
        {QUY_CHIP.map((p) => (
          <Pressable key={p} onPress={() => { setQuy(p); doi({ quy: p }); }} accessibilityRole="radio" accessibilityState={{ checked: quy === p }}
            style={{ flex: 1, minHeight: 60, borderRadius: 20, alignItems: "center", justifyContent: "center",
              backgroundColor: quy === p ? "#fff" : "#ebeae6", boxShadow: quy === p ? `0px 0px 0px 2.5px ${M.chinh}, ${BONG.nho}` : BONG.lom }}>
            <Chu kieu="rat" co={16}>{`${p} phút`}</Chu>
            <Chu co={11.5} mau={M.chu3}>{`T7, CN: ${cuoiTuanCua(p)} phút`}</Chu>
          </Pressable>
        ))}
      </View>

      <The>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Icon3D ten="trang_ngu" co={30} />
          <View style={{ flex: 1 }}><Chu kieu="rat" co={15.5}>Giờ ngủ</Chu><Chu co={12.5} mau={M.chu3}>Máy khoá · mọi ngày</Chu></View>
          {(["tu", "den"] as const).map((k, i) => (
            <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              {i ? <Chu co={14} mau={M.chu3}>–</Chu> : null}
              <Pressable onPress={() => setSuaNgu(k)} accessibilityRole="button" accessibilityLabel={k === "tu" ? `Máy khoá lúc ${ngu.tu}` : `Mở lại lúc ${ngu.den}`}
                style={{ minHeight: 44, minWidth: 64, paddingHorizontal: 10, borderRadius: 14, backgroundColor: "#ebeae6", alignItems: "center", justifyContent: "center", boxShadow: BONG.lom }}>
                <Chu kieu="rat" co={17} so>{gioGon(ngu[k])}</Chu>
              </Pressable>
            </View>
          ))}
        </View>
      </The>

      <BangTruot mo={!!suaNgu} dong={() => setSuaNgu(null)} tieu={`Giờ ngủ của ${ten}`}>
        <View style={{ flexDirection: "row", gap: 6, padding: 5, borderRadius: 22, backgroundColor: "#ebeae6", boxShadow: BONG.lom }}>
          {(["tu", "den"] as const).map((k) => (
            <Pressable key={k} onPress={() => setSuaNgu(k)} accessibilityRole="tab" accessibilityState={{ selected: suaNgu === k }}
              style={{ flex: 1, minHeight: 56, borderRadius: 18, alignItems: "center", justifyContent: "center", ...(suaNgu === k ? { backgroundColor: "#fff", ...KHOI.nho } : {}) }}>
              <Chu co={12.5} mau={M.chu3}>{k === "tu" ? "Máy khoá lúc" : "Mở lại lúc"}</Chu>
              <Chu kieu="rat" co={19} so>{gioGon(ngu[k])}</Chu>
            </Pressable>
          ))}
        </View>
        {suaNgu ? <BanhXeGio key={suaNgu} gio={ngu[suaNgu]} doi={(g) => setNgu((x) => (suaNgu ? { ...x, [suaNgu]: g } : x))} /> : null}
        <Nut chu={`Lưu giờ ngủ ${gioGon(ngu.tu)} – ${gioGon(ngu.den)}`} rong tat={ngu.tu === ngu.den} bam={() => { doi({ ngu }); setSuaNgu(null); }} />
      </BangTruot>
    </Man>
  );
}
