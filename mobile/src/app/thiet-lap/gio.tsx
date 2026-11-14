// bm1-ob-gio «X chơi máy bao lâu mỗi ngày?» (bước 4/5 Lần đầu, thiết kế chốt 14/11): chip 30p · 60p · 90p (cuối tuần +30) + «Tự chọn»
// (hai dòng Ngày thường / Cuối tuần, mỗi lần bấm ±15 phút), «Giờ đi ngủ» hai ô giờ ⇒ bảng them-hijzsz0z (bánh xe), câu tóm tắt.
// «Tiếp: chọn app cho con» ⇒ them-35vyl4cx «X dùng được gì?» (/thiet-lap/che-do) ⇒ App ⇒ Web ⇒ lưu một lần (POST thiet-lap) ⇒ Ghép máy.
// Khối chặn app cũ (bản 04/11) đã tách sang màn che-do + app + web. Quỹ giờ tính chung mọi máy (L2); hết giờ máy tự khoá.
import { useCallback, useState } from "react";
import { router, useFocusEffect } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { BONG, KHOI } from "@/lib/clay";
import { cuoiTuanCua, napCaiDatCon, NGU_MAC_DINH, QUY_CHIP, QUY_MAC_DINH } from "@/lib/ghep-may";
import { BanhXeGio, DauMan, gioGon } from "@/lib/lan-dau";
import { ThanhBuoc5 } from "@/lib/ui-s3";
import { datTl, layTl } from "@/lib/thiet-lap";
import { BangTruot, Chu, F, Icon3D, M, Man, Nut } from "@/lib/ui";

const BUOC = 15, TOI_DA = 480;
const kep = (p: number) => Math.max(0, Math.min(TOI_DA, p));

export default function ObGio() {
  const tl = layTl();
  const ten = tl.tenCon ?? "con";
  const [quy, setQuy] = useState(tl.quy ?? QUY_MAC_DINH);
  const [ct, setCt] = useState(tl.cuoiTuan ?? cuoiTuanCua(tl.quy ?? QUY_MAC_DINH));
  const [tu, setTu] = useState(() => tl.quy != null && (!(QUY_CHIP as readonly number[]).includes(tl.quy) || (tl.cuoiTuan != null && tl.cuoiTuan !== cuoiTuanCua(tl.quy))));
  const [ngu, setNgu] = useState(tl.ngu ?? NGU_MAC_DINH);
  const [suaNgu, setSuaNgu] = useState<"tu" | "den" | null>(null);
  // 06/11 (B1): đi lại Lần đầu cho Con đã có cài đặt ⇒ hiện đúng quỹ / giờ ngủ đang có (mục Ba Mẹ đã chọn giữ nguyên; lỗi thì lần sau nạp lại)
  useFocusEffect(useCallback(() => {
    napCaiDatCon().then(() => {
      const n = layTl();
      if (n.quy != null) {
        const c = n.cuoiTuan ?? cuoiTuanCua(n.quy);
        setQuy(n.quy); setCt(c);
        setTu(!(QUY_CHIP as readonly number[]).includes(n.quy) || c !== cuoiTuanCua(n.quy));
      }
      if (n.ngu) setNgu(n.ngu);
    }).catch(() => {});
  }, [setQuy, setCt, setTu, setNgu]));
  const dat = (q: number, c: number) => { setQuy(q); setCt(c); datTl({ quy: q, cuoiTuan: c }); };
  const chip = (p: number) => { setTu(false); dat(p, cuoiTuanCua(p)); };
  const tiep = () => { datTl({ quy, cuoiTuan: ct, ngu }); router.push("/thiet-lap/che-do"); };
  const oChip = (on: boolean) => ({ flex: 1, minHeight: 60, borderRadius: 20, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: 2,
    backgroundColor: on ? "#fff" : "#ebeae6", boxShadow: on ? `0px 0px 0px 2.5px ${M.chinh}, ${BONG.nho}` : BONG.lom });
  const dongTu = (tieu: string, phu: string, gia: number, doi: (p: number) => void, nhan: string) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 56 }}>
      <View style={{ flex: 1 }}><Chu kieu="rat" co={15}>{tieu}</Chu><Chu co={12} mau={M.chu3}>{phu}</Chu></View>
      {(["−", "＋"] as const).map((k, i) => {
        const moi = kep(gia + (i ? BUOC : -BUOC));
        const nut = (
          <Pressable key={k} onPress={() => doi(moi)} disabled={moi === gia} accessibilityRole="button" accessibilityLabel={`${i ? "Tăng" : "Giảm"} 15 phút ${nhan}`}
            style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: "#ecebe7", boxShadow: BONG.nho, opacity: moi === gia ? 0.4 : 1 }}>
            <Chu kieu="rat" co={20} mau={M.chinhInk}>{k}</Chu>
          </Pressable>
        );
        return i ? [<Text key="so" style={{ minWidth: 74, textAlign: "center", fontFamily: F.rat, fontSize: 20, color: M.chu }}>{gia} <Text style={{ fontSize: 13, color: M.chu3 }}>phút</Text></Text>, nut] : nut;
      })}
    </View>
  );
  return (
    <Man dau={<DauMan ve="/thiet-lap/qua" phai={<ThanhBuoc5 dang={3} />} />}
      day={<Nut chu="Tiếp: chọn app cho con" rong bam={tiep} />}>
      <Text accessibilityRole="header" style={{ fontFamily: F.rat, fontSize: 26, lineHeight: 32, letterSpacing: -0.5, color: M.chu }}>{`${ten} chơi máy\nbao lâu mỗi ngày?`}</Text>
      <View style={{ borderRadius: 28, backgroundColor: "#f7f6f3", padding: 14, gap: 12, ...KHOI.the }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><Icon3D ten="dongho" co={22} /><Chu kieu="rat" co={14.5} mau={M.chu2}>Hết giờ, máy tự khoá</Chu></View>
        <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="radiogroup">
          {QUY_CHIP.map((p) => {
            const on = !tu && quy === p && ct === cuoiTuanCua(p);
            return (
              <Pressable key={p} onPress={() => chip(p)} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${p} phút, thứ 7 chủ nhật ${cuoiTuanCua(p)} phút`} style={oChip(on)}>
                <Chu kieu="rat" co={17}>{`${p}p`}</Chu><Chu co={11} mau={M.chu3} dong={1}>{`T7, CN ${cuoiTuanCua(p)}p`}</Chu>
              </Pressable>
            );
          })}
          <Pressable onPress={() => setTu(true)} accessibilityRole="radio" accessibilityState={{ checked: tu }} style={oChip(tu)}>
            <Chu kieu="rat" co={15} dong={1}>Tự chọn</Chu><Chu co={11} mau={M.chu3} dong={1}>{`${quy}p · ${ct}p`}</Chu>
          </Pressable>
        </View>
        {tu ? (
          <View style={{ borderRadius: 22, backgroundColor: "#fff", paddingHorizontal: 12, paddingVertical: 4, ...KHOI.nho }}>
            {dongTu("Ngày thường", "Thứ 2 – Thứ 6", quy, (p) => dat(p, ct), "ngày thường")}
            <View style={{ height: 1, backgroundColor: "#ecebe7" }} />
            {dongTu("Cuối tuần", "Thứ 7, Chủ nhật", ct, (p) => dat(quy, p), "cuối tuần")}
          </View>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 24, backgroundColor: "#f7f6f3", padding: 12, ...KHOI.the }}>
        <Icon3D ten="trang_ngu" co={28} />
        <View style={{ flex: 1 }}><Chu kieu="rat" co={15}>Giờ đi ngủ</Chu><Chu co={12} mau={M.chu3}>Máy khoá cả đêm</Chu></View>
        {(["tu", "den"] as const).map((k, i) => (
          <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {i ? <Chu kieu="rat" co={14} mau={M.chu2}>→</Chu> : null}
            <Pressable onPress={() => setSuaNgu(k)} accessibilityRole="button" accessibilityLabel={k === "tu" ? `Máy khoá lúc ${ngu.tu}` : `Mở lại lúc ${ngu.den}`}
              style={{ minHeight: 44, minWidth: 62, paddingHorizontal: 8, borderRadius: 14, backgroundColor: "#ebeae6", alignItems: "center", justifyContent: "center", boxShadow: BONG.lom }}>
              <Chu kieu="rat" co={17} so>{gioGon(ngu[k])}</Chu>
            </Pressable>
          </View>
        ))}
      </View>
      <Chu co={13.5} mau={M.chu2} style={{ paddingHorizontal: 4 }}>
        Thứ 2 – Thứ 6: chơi <Chu kieu="rat" co={13.5}>{`${quy} phút`}</Chu>, cuối tuần <Chu kieu="rat" co={13.5}>{`${ct} phút`}</Chu>.
        {tu ? " Mỗi lần bấm tăng/giảm 15 phút;" : ""} Ba Mẹ đổi lại được bất cứ lúc nào trong mục Giờ chơi.
      </Chu>

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
        {suaNgu ? <BanhXeGio key={suaNgu} gio={ngu[suaNgu]} doi={(g) => { if (suaNgu) setNgu({ ...ngu, [suaNgu]: g }); }} /> : null}
        <Nut chu={`Lưu giờ ngủ ${gioGon(ngu.tu)} – ${gioGon(ngu.den)}`} rong tat={ngu.tu === ngu.den} bam={() => { datTl({ ngu }); setSuaNgu(null); }} />
      </BangTruot>
    </Man>
  );
}
