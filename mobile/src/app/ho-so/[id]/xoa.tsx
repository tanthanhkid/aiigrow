// them-canktzlq @v5 «Xoá hồ sơ <Con>?» (thiết kế bm-gio-ho-so): ô hình đào (nguoi), «Xoá rồi không lấy lại được.», thẻ 3 hậu quả có icon
// (laptop: máy của Con · sao: Mất N sao, cả quà đang chờ trao · lich: Mất báo cáo và cài đặt), «Xoá hồ sơ X» đỏ đặc / «Giữ lại» viền. Bàn vẽ dạng bảng trượt
// trên Hồ sơ con; app giữ màn riêng (màn kết quả sau khi xoá cần chỗ) — nội dung canh đáy như bảng.
// «Xoá hồ sơ X» ⇒ POST con/:id/xoa {xacNhan: true} (PR #253 — xoá HẲN). Máy chủ KHÔNG gỡ máy: máy đã ghép của Con thành máy dùng chung
// (`mayChuyenDungChung`) ⇒ màn kết quả gợi ý từng máy «Máy của <Con khác>» (POST may/:id/gan-con) hoặc «Gỡ máy này» (⇒ /may/<id>?mo=go).
// Lỗi 409 `con_may` (bé cuối, nhà còn máy) / `con_thiet_bi_mang` (TV, console lọc mạng) ⇒ câu dễ hiểu + lối đi tiếp (lib/noi-1411 › loiXoaCon).
import { useCallback, useEffect, useRef, useState } from "react";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { BackHandler, View } from "react-native";
import { bm, LoiApi, type GiaDinh } from "@/lib/api";
import { CAU_TRONG_GIUP, ManKetQua, quyenToi, type ConCt } from "@/lib/hang-ngay";
import { loiXoaCon } from "@/lib/noi-1411";
import { BONG, KHOI } from "@/lib/clay";
import { keDau, TheDs } from "@/lib/may-nhieu-con";
import { Bao, BaoLoi, ChoTai, Chu, Icon3D, M, Man, Nut, The, useHoanTac, useLam, useTai } from "@/lib/ui";

/** Hồ sơ đã xoá ⇒ bỏ cả ngăn xếp (không «quay lại» về /ho-so/<id> đã mất) rồi về Trang chủ. */
const veTrangChu = () => { if (router.canDismiss()) router.dismissAll(); router.replace("/hom-nay"); };

type KqXoa = { ok: true; ten: string; mayChuyenDungChung: { id: string; ten: string }[] };

export default function XoaHoSo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // đã xoá ⇒ thôi tải lại hồ sơ (useTai tải lại mỗi lần màn hiện — hồ sơ không còn ⇒ 404 vô ích)
  const daXoa = useRef<{ con: ConCt; xem: boolean; conLai: GiaDinh["con"] | null } | null>(null);
  const { d, loi, matMang, tai } = useTai(async () => {
    if (daXoa.current) return daXoa.current;
    // #340: số bé còn lại quyết máy riêng của bé này thành gì (server/lib/xoa-con.ts): còn 1 bé ⇒ máy riêng của bé đó, ≥ 2 ⇒ máy dùng chung
    const [con, q, g] = await Promise.all([bm.goi<ConCt>(`con/${id}`), quyenToi(), bm.goi<GiaDinh>("gia-dinh").catch(() => null)]);
    return { con, xem: q === "trong_giup", conLai: g ? g.con.filter((x) => x.id !== id) : null };
  });
  const { lam, loi: loiLam, dangChay } = useLam();
  const [loiXoa, setLoiXoa] = useState<{ cau: string; loi: "may" | "ho_tro" | "ve" | null } | null>(null);
  const [kq, setKq] = useState<KqXoa | null>(null);
  // quay lại màn (vd sau «Thêm con» / gỡ máy) ⇒ bỏ lỗi 409 cũ, hiện lại nút xoá
  useFocusEffect(useCallback(() => { setLoiXoa(null); }, []));
  const ve = () => (router.canGoBack() ? router.back() : router.replace(`/ho-so/${id}` as never));
  if (kq) return <KetQua kq={kq} />;
  if (!d) return <Man lui={{ chu: "Hồ sơ", ve: `/ho-so/${id}` }} tieu="Xoá hồ sơ"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const c = d.con;
  // chỉ máy RIÊNG của bé đổi chủ (máy chung chỉ bỏ bé khỏi danh sách) — câu theo đúng việc máy chủ làm (xoa-con.ts)
  const mayRieng = c.may.filter((m) => !m.dungChung);
  const tenGon = (ds: typeof mayRieng) => ds.map((m) => m.ten.replace(/ của .*$/, "")).join(" và ");
  const conLai = d.conLai;
  // iPhone / iPad chỉ một bé: còn nhiều con ⇒ chưa gán ai, chờ Ba Mẹ chọn
  const ios = mayRieng.filter((m) => m.nen === "ios"), khac = mayRieng.filter((m) => m.nen !== "ios");
  const phuMay = conLai == null ? `${tenGon(mayRieng)} chuyển cho các con còn lại hoặc chờ Ba Mẹ chọn` // không đọc được gia đình ⇒ câu trung tính
    : conLai.length === 1 ? `${tenGon(mayRieng)} thành máy riêng của ${conLai[0].ten}`
    : conLai.length > 1 ? [khac.length ? `${tenGon(khac)} thành máy dùng chung` : "", ios.length ? `${tenGon(ios)} chờ Ba Mẹ chọn con dùng` : ""].filter(Boolean).join(" · ")
    : `${tenGon(mayRieng)} chờ Ba Mẹ chọn con dùng`;
  // máy chung có bé này: chỉ bỏ bé khỏi danh sách, các con khác vẫn dùng
  const mayChung = c.may.filter((m) => m.dungChung);
  const xoa = () => lam(async () => {
    setLoiXoa(null);
    try {
      const r = await bm.goi<KqXoa>(`con/${id}/xoa`, { xacNhan: true });
      daXoa.current = d;
      setKq(r);
    } catch (e) {
      const l = e instanceof LoiApi ? loiXoaCon(e.ma, c.ten) : null;
      if (l) { setLoiXoa(l); return; }
      throw e;
    }
  });
  return (
    // lỗi 409 ⇒ khung lỗi + lối đi tiếp nằm ở ĐÁY (luôn thấy, không bị cuộn khuất); bấm xoá lại vô ích tới khi gỡ xong ⇒ ẩn nút xoá
    <Man lui={{ chu: "Hồ sơ", ve: `/ho-so/${id}` }} day={d.xem ? <Chu co={13.5} mau={M.chu3}>{CAU_TRONG_GIUP}</Chu> : loiXoa ? <>
      <Bao loai="loi" tieu={`Chưa xoá được hồ sơ ${c.ten}`} loi={loiXoa.cau}>
        {loiXoa.loi === "may" ? <Nut chu="Xem các máy" loai="vien" nho bam={() => router.push("/may")} /> : null}
        {loiXoa.loi === "may" ? <Nut chu="Thêm con" loai="vien" nho bam={() => router.push("/ho-so/them")} /> : null}
        {loiXoa.loi === "ho_tro" ? <Nut chu="Nhắn AiiGrow" loai="vien" nho bam={() => router.push("/ho-tro")} /> : null}
        {loiXoa.loi === "ve" ? <Nut chu="Về trang chủ" loai="vien" nho bam={veTrangChu} /> : null}
        {loiXoa.loi === null ? <Nut chu="Thử lại" loai="vien" nho bam={xoa} /> : null}
      </Bao>
      <Nut chu="Giữ lại" loai="ma" rong bam={ve} />
    </> : <>
      <BaoLoi loi={loiLam} />
      <Nut chu={`Xoá hồ sơ ${c.ten}`} loai="do" rong dangChay={dangChay} bam={xoa} />
      <Nut chu="Giữ lại" loai="vien" rong bam={ve} />
    </>}>
      <View style={{ flexGrow: 1, minHeight: 120 }} />
      <View style={{ alignSelf: "center", width: 76, height: 76, borderRadius: 26, alignItems: "center", justifyContent: "center", backgroundColor: M.the, ...KHOI.the }}><Icon3D ten="nguoi" co={48} /></View>
      <View style={{ gap: 4 }}>
        <Chu kieu="rat" co={23} style={{ textAlign: "center", letterSpacing: -0.4 }}>{`Xoá hồ sơ ${c.ten}?`}</Chu>
        <Chu kieu="dam" co={14} mau={M.chu2} style={{ textAlign: "center" }}>Xoá rồi không lấy lại được.</Chu>
      </View>
      <TheDs>
        {/* máy chủ không gỡ máy — máy riêng của bé: còn 1 con ⇒ máy riêng của con đó, ≥ 2 ⇒ dùng chung; máy chung chỉ bỏ bé khỏi danh sách; Ba Mẹ đổi / gỡ ở bước sau */}
        {([...(mayRieng.length ? [["laptop", `Grow thôi trông ${mayRieng.length} máy cho ${c.ten}`, phuMay] as const] : []),
          ...(mayChung.length ? [["laptop", `${c.ten} rời ${mayChung.length} máy dùng chung`, `${tenGon(mayChung)} vẫn cho các con khác dùng`] as const] : []),
          ["sao", "Xoá số sao và quà", "Cả quà đang chờ trao"] as const, ["lich", "Mất báo cáo và cài đặt", "Nhiệm vụ, phút chơi đã đặt"] as const]).map(([ic, tieu, phu], k) => (
          <View key={tieu} style={[{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 58 }, keDau(k)]}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: M.xamSoft, boxShadow: BONG.lom, alignItems: "center", justifyContent: "center" }}><Icon3D ten={ic} co={24} /></View>
            <View style={{ flex: 1, minWidth: 0 }}><Chu kieu="rat" co={14.5}>{tieu}</Chu><Chu kieu="dam" co={12.5} mau={M.chu3}>{phu}</Chu></View>
          </View>
        ))}
      </TheDs>
    </Man>
  );
}

/** Đã xoá: máy của Con thành máy dùng chung ⇒ mỗi máy một thẻ: «Máy của <Con khác>» (gan-con) / «Gỡ máy này». */
function KetQua({ kq }: { kq: KqXoa }) {
  const { bao, noi } = useHoanTac();
  // Con còn lại (tải SAU khi xoá — đúng danh sách mới); lỗi ⇒ chỉ thiếu nút gắn, vẫn gỡ được
  const g = useTai(() => bm.goi<GiaDinh>("gia-dinh"));
  const conKhac = (g.d?.con ?? []).map((x) => ({ id: x.id, ten: x.ten }));
  // hồ sơ đã mất ⇒ Back Android về Trang chủ (không về /ho-so/<id>); iOS tắt vuốt lui (Stack.Screen dưới)
  useEffect(() => { const h = BackHandler.addEventListener("hardwareBackPress", () => { veTrangChu(); return true; }); return () => h.remove(); }, []);
  const { lam, loi, dangChay } = useLam();
  const [daGan, setDaGan] = useState<Record<string, string>>({});
  // đã bấm «Gỡ máy này» ⇒ thôi mời gắn máy đó cho Con khác (máy đang / đã gỡ)
  const [daGo, setDaGo] = useState<ReadonlySet<string>>(new Set());
  const xong = veTrangChu;
  const ganCon = (may: string, con: { id: string; ten: string }) => lam(async () => {
    await bm.goi(`may/${may}/gan-con`, { con: con.id });
    setDaGan((s) => ({ ...s, [may]: con.ten }));
    bao(`Đã gắn máy cho ${con.ten}`);
  });
  const may = kq.mayChuyenDungChung;
  return (
    <ManKetQua lv="rob-goc" tieu={`Đã xoá hồ sơ ${kq.ten}`} noi={noi}
      loi={may.length ? `${may.length} máy của ${kq.ten} thành máy dùng chung — gắn cho con khác hoặc gỡ máy.` : "Báo cáo, sao và cài đặt của con đã xoá."}
      chinh={{ chu: may.length ? "Xong" : "Về trang chủ", bam: xong }}>
      <Stack.Screen options={{ gestureEnabled: false }} />
      <BaoLoi loi={loi ?? (g.loi && may.length ? `Chưa tải được danh sách con để gắn máy — ${g.loi}` : null)} />
      {may.map((m) => (
        <The key={m.id} style={{ gap: 8 }}>
          <Chu kieu="rat" co={16}>{m.ten}</Chu>
          <Chu co={13.5} mau={M.chu2}>{daGan[m.id] ? `Giờ là máy của ${daGan[m.id]}` : daGo.has(m.id) ? "Đang gỡ — xem ở màn của máy này"
            : "Máy dùng chung · bé dùng máy chọn tên mình khi vào"}</Chu>
          {daGan[m.id] || daGo.has(m.id) ? null : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {conKhac.map((c) => <Nut key={c.id} chu={`Máy của ${c.ten}`} loai="vien" nho dangChay={dangChay} bam={() => ganCon(m.id, c)} />)}
              <Nut chu="Gỡ máy này" loai="huy" nho bam={() => { setDaGo((s) => new Set(s).add(m.id)); router.push({ pathname: "/may/[id]", params: { id: m.id, mo: "go" } }); }} />
            </View>
          )}
        </The>
      ))}
    </ManKetQua>
  );
}
