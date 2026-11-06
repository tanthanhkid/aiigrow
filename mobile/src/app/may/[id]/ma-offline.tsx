// them-rz77kk45 «Mã mở máy cho Bảo Anh» + them-s8nltlaa «Bảo Anh đã mở máy bằng mã» (thiết kế chốt 06/11, L19). Chip «Laptop · mất mạng», 6 số to,
// «Máy không cần mạng vẫn nhập được», «Mã đổi sau N phút», «Mở máy trong 15 / 30 / 60 phút» (số phút nằm trong mã — máy tự kiểm khi offline),
// «Gửi mã cho con» (chia sẻ Zalo / Tin nhắn…), «Sao chép mã». GET may/:id/ma-offline?phut= (docs/API.md «S3»).
// Khi máy có mạng lại và báo đã mở bằng mã (sự kiện may_mo_ma_offline sau lúc mở màn) ⇒ bảng «đã mở máy bằng mã» (kiểm mỗi 30 giây khi màn đang mở).
// Đây cũng là `den` của mục «máy mất mạng» trong «Cần Ba Mẹ để ý».
import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Pressable, Share, View } from "react-native";
import { bm, type ChiTietTuanThu, type GiaDinh } from "@/lib/api";
import { BONG, KHOI } from "@/lib/clay";
import { IC_MAY } from "@/lib/hang-ngay";
import { saoChep } from "@/lib/luu-tep";
import { cauDoiSau, chiaMa, loiGuiMa, PHUT_MO, suKienMoMa, type MaOfflineS3 } from "@/lib/s3";
import { BangTruot, BaoLoi, cauLoi, ChoTai, Chu, gioPhut, Icon3D, M, Man, Nut, useHoanTac, useTai } from "@/lib/ui";
import { OMa6 } from "@/lib/ui-s3";

export default function MaMoMay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [moLuc] = useState(() => Date.now());
  const thongTin = useTai(async () => {
    const [m, g] = await Promise.all([bm.goi<ChiTietTuanThu>(`may/${id}/tuan-thu`), bm.goi<GiaDinh>("gia-dinh").catch(() => null)]);
    const con = g?.con.find((c) => c.id === m.con) ?? g?.con.find((c) => c.matMang?.some((x) => x.mayId === id));
    const mm = g?.con.flatMap((c) => c.matMang ?? []).find((x) => x.mayId === id) ?? null;
    return { m, tenCon: con?.ten ?? null, matMang: !!mm };
  });
  const [phut, setPhut] = useState<number>(30);
  const [ma, setMa] = useState<MaOfflineS3 | null>(null);
  const [loiMa, setLoiMa] = useState<string | null>(null);
  const [het, setHet] = useState(0);                 // lúc mã hiện tại đổi (ms)
  const [bayGio, setBayGio] = useState(() => Date.now());
  const [lan, setLan] = useState(0);
  const [daMo, setDaMo] = useState<{ luc: string; coMangLuc: string; phut: number | null } | null>(null);
  const [daBao, setDaBao] = useState(false);
  const { bao, noi } = useHoanTac();
  // tải mã theo số phút đang chọn; hết hạn bước mã (doiSauGiay) ⇒ tải mã mới
  useEffect(() => {
    let bo = false;
    bm.goi<MaOfflineS3>(`may/${id}/ma-offline?phut=${phut}`).then((v) => { if (!bo) { setLoiMa(null); setMa(v); setHet(Date.now() + (v.doiSauGiay ?? v.conGiay) * 1000); } },
      (e) => { if (!bo) { setMa(null); setLoiMa(cauLoi(e)); } });   // lỗi ⇒ bỏ mã cũ (đã/sắp hết hạn), hiện «Thử lại» — không để Ba Mẹ gửi mã hết hạn
    return () => { bo = true; };
  }, [id, phut, lan]);
  useFocusEffect(useCallback(() => {
    const t = setInterval(() => setBayGio(Date.now()), 1000);
    return () => clearInterval(t);
  }, []));
  const conGiay = Math.max(0, Math.round((het - bayGio) / 1000));
  // bước mã hết ⇒ tải mã mới (một lần mỗi bước: `het` đổi khi mã mới về)
  const [daXin, setDaXin] = useState(0);
  if (ma && het && conGiay === 0 && daXin !== het) { setDaXin(het); setLan((n) => n + 1); }
  // máy báo «đã mở bằng mã» (khi có mạng lại) ⇒ bảng them-s8nltlaa — một lần mỗi lượt mở màn
  useFocusEffect(useCallback(() => {
    if (daBao) return;
    const kiem = () => bm.goi<ChiTietTuanThu>(`may/${id}/tuan-thu`).then((m) => {
      const x = suKienMoMa(m.suKien, moLuc);
      if (x) { setDaMo(x); setDaBao(true); thongTin.tai(); }
    }, () => {});
    const t = setInterval(kiem, 30_000);
    return () => clearInterval(t);
  }, [id, daBao, moLuc]));    // eslint-disable-line react-hooks/exhaustive-deps -- thongTin.tai ổn định (useCallback trong useTai)
  const tt = thongTin.d;
  const tenCon = tt?.tenCon ?? null;
  const tieu = tenCon ? `Mã mở máy cho ${tenCon}` : "Mã mở máy";
  if (!tt) return <Man lui={{ chu: "" }} tieu={tieu}><ChoTai loi={thongTin.loi} matMang={thongTin.matMang} tai={thongTin.tai} /></Man>;
  const m = tt.m;
  const ngan = m.ten.replace(/ của .*$/, "");
  const so = ma ? chiaMa(ma.ma) : [];
  const gui = async () => {
    if (!ma) return;
    try { await Share.share({ message: loiGuiMa(ma.ma, ma.phutMo, tenCon, ngan) }); } catch { /* người dùng đóng bảng chia sẻ */ }
  };
  return (
    <Man lui={{ chu: "", ve: `/may/${id}` }} tieu={tieu} noi={noi}
      day={<>
        <BaoLoi loi={loiMa} />
        <Nut chu="Gửi mã cho con" ic="chuong" ic3d rong tat={!ma} bam={gui} />
        <Nut chu="Sao chép mã" loai="vien" rong tat={!ma} bam={() => ma && saoChep(ma.ma).then((ok) => ok && bao("Đã sao chép mã — dán vào Zalo cho con"))} />
      </>}>
      <View style={{ alignItems: "center", gap: 14, paddingVertical: 20, paddingHorizontal: 12, borderRadius: 28, backgroundColor: M.chinhSoft, ...KHOI.the }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, minHeight: 36, paddingLeft: 8, paddingRight: 14, borderRadius: 18, backgroundColor: M.the, boxShadow: BONG.nho }}>
          <Icon3D ten={IC_MAY[m.nen]} co={22} />
          {tt.matMang ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: M.huy }} /> : null}
          <Chu kieu="dam" co={14}>{`${ngan}${tt.matMang ? " · mất mạng" : ""}`}</Chu>
        </View>
        {ma ? <OMa6 so={so} /> : <ChoTai loi={loiMa} tai={() => setLan((n) => n + 1)} />}
        <Chu kieu="dam" co={14.5} mau={M.chinhInk}>Máy không cần mạng vẫn nhập được</Chu>
        {ma ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 14, backgroundColor: M.the }}>
            <Icon3D ten="dongho" co={18} /><Chu kieu="dam" co={13.5} mau={M.chu2}>{cauDoiSau(conGiay)}</Chu>
          </View>
        ) : null}
      </View>

      <Chu kieu="rat" co={15} style={{ paddingHorizontal: 4, marginTop: 4 }}>Mở máy trong</Chu>
      <View style={{ flexDirection: "row", gap: 10 }} accessibilityRole="radiogroup">
        {(ma?.chonPhut ?? [...PHUT_MO]).map((p) => {
          const on = p === phut;
          return (
            <Pressable key={p} onPress={() => { if (p !== phut) { setMa(null); setPhut(p); } }} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={`${p} phút`}
              style={[{ flex: 1, minHeight: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },
                on ? { backgroundColor: M.chinh, boxShadow: BONG.ngoc } : { backgroundColor: M.the, ...KHOI.nho }]}>
              <Chu kieu="rat" co={24} so mau={on ? "#fff" : M.chu}>{String(p)}</Chu>
              <Chu kieu="dam" co={12.5} mau={on ? "#fff" : M.chu3}>phút</Chu>
            </Pressable>
          );
        })}
      </View>

      <BangTruot mo={!!daMo} dong={() => setDaMo(null)} tieu={`${tenCon ?? "Con"} đã mở máy bằng mã`}>
        {daMo ? <>
          <View style={{ alignItems: "center", gap: 6 }}>
            <View><Icon3D ten={IC_MAY[m.nen]} co={64} /><View style={{ position: "absolute", right: -6, bottom: -4 }}><Icon3D ten="tick" co={28} /></View></View>
            <Chu kieu="dam" co={14} mau={M.chu2}>{`lúc ${gioPhut(daMo.luc)}${daMo.phut ? ` · ${daMo.phut} phút` : ""}`}</Chu>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 20, backgroundColor: M.the, ...KHOI.nho }}>
            <Icon3D ten="khoa" co={30} />
            <View style={{ flex: 1 }}>
              <Chu kieu="rat" co={15}>{`${ngan}${tenCon ? ` của ${tenCon}` : ""}`}</Chu>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: M.chinh }} />
                <Chu co={13} mau={M.chinhInk}>{`Có mạng lại · ${gioPhut(daMo.coMangLuc)}`}</Chu>
              </View>
            </View>
          </View>
          <Nut chu="Xem máy" ic="laptop" rong bam={() => { setDaMo(null); router.replace(`/may/${id}` as never); }} />
          <Nut chu="Đóng" loai="ma" rong bam={() => setDaMo(null)} />
        </> : null}
      </BangTruot>
    </Man>
  );
}
