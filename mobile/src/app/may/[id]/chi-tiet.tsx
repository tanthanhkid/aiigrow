// them-1016dwpz «Máy cả nhà · chi tiết» (thiết kế chốt 15/11, #267): một máy chung nhiều bé — thẻ «<bé> đang dùng» (app · phút hôm nay trên máy
// này · sao còn = phút chơi, nút «Đổi người» — cách đổi trên máy), «Sao của từng bé · luật đi theo bé» (số dư từng bé, âm = đang nợ), «Khoá»:
// theo máy (POST may/:id/khoa — mọi bé, them-tmezw761) · theo bé (POST con/:id/khoa — mọi máy của bé, máy chung chỉ khoá phần của bé, them-sll7clha).
// Dữ liệu: GET may/:id/con + GET tuan-thu (máy khác) + GET phien-dang (app đang mở). Mở từ thẻ sân của màn máy (bm2-may-m1).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type PhienDang, type TuanThuMay } from "@/lib/api";
import { KHOI } from "@/lib/clay";
import { BangKhoaMay, quyenToi, tenGoi } from "@/lib/hang-ngay";
import { datKhoaMay } from "@/lib/khoa-may";
import {
  AvtCon, BangKhoaTheoMay, conCuaMay, DauHaiDong, keDau, laMayChung, MucPhai, SaoNho, TheDs, type ConCuaMay, type ConMay,
} from "@/lib/may-nhieu-con";
import { cauKhoaMay, mayDangKhoa } from "@/lib/noi-1411";
import { BangTruot, BaoLoi, ChoTai, Chu, gioPhut, Icon3D, M, Man, Nut, TickDong, useHoanTac, useLam, useTai } from "@/lib/ui";

const ngan = (t: string) => t.replace(/ · .*$/, "");

export default function MayChiTiet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [cm, tt, ph, quyen] = await Promise.all([bm.goi<ConMay>(`may/${id}/con`), bm.goi<{ ds: TuanThuMay[] }>("tuan-thu").catch(() => null),
      bm.goi<{ ds: PhienDang[] }>("phien-dang").catch(() => null), quyenToi()]);
    return { cm, may: tt?.ds ?? [], phien: ph?.ds ?? [], xem: quyen === "trong_giup" };
  });
  const [mo, setMo] = useState<"may" | "be" | "doi" | null>(null);
  const [beKhoa, setBeKhoa] = useState<string | null>(null);
  const { bao, noi } = useHoanTac();
  const { lam, loi: loiLam, dangChay } = useLam();
  const lui = () => (router.canGoBack() ? router.back() : router.replace({ pathname: "/may/[id]", params: { id } }));
  if (!d) return <Man dau={<DauHaiDong tieu="Máy" lui={lui} />}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const { cm } = d;
  const ten = ngan(cm.may.ten), tenNgan = ten.replace(/ của .*$/, "");
  const gan = cm.ds.filter((c) => c.gan);
  const dangDung = cm.dangDung ? gan.find((c) => c.id === cm.dangDung!.id) ?? null : null;
  const goc = (t: string) => ngan(t).replace(/ của .*$/, "");
  const app = d.phien.find((p) => p.may && goc(p.may) === goc(cm.may.ten) && (!dangDung || p.con === dangDung.id)) ?? null;
  const caNha = cm.ds.map((c) => ({ id: c.id, ten: c.ten, avatar: c.avatar }));
  const khac = d.may.filter((x) => x.id !== id).map((x) => ({ id: x.id, ten: ngan(x.ten), nen: x.nen, rieng: !laMayChung(x) }));
  const be = gan.find((c) => c.id === beKhoa) ?? dangDung ?? gan[0] ?? null;
  const tenBe = be ? tenGoi(be.ten) : "";
  const mayCuaBe = be ? d.may.filter((x) => (x.conDs ? x.conDs.some((c) => c.id === be.id) : x.id === id || x.con === be.id)) : [];
  const khoaMay = mayDangKhoa(cm.khoaMay);
  const xong = (chu: string, hoan: () => Promise<unknown>) => { bao(chu, () => { hoan().then(tai, tai); }); tai(); };
  const dongBe = (c: ConCuaMay, k: number) => {
    const no = c.sao < 0;
    const phu = c.phutHomNay ? `${c.phutHomNay} phút trên máy này hôm nay` : c.lanCuoi ? `dùng máy này lúc ${gioPhut(c.lanCuoi)}` : "chưa dùng máy này";
    return (
      <View key={c.id} style={[{ flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10, paddingRight: 4 }, keDau(k)]}>
        <View style={{ marginTop: 2 }}><AvtCon c={c} co={36} /></View>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Chu kieu="rat" dong={1} style={{ flex: 1 }}>{tenGoi(c.ten)}</Chu>
            <SaoNho n={c.sao} co={12.5} />
          </View>
          {no ? <Chu kieu="dam7" co={12} mau="#8a3c0c" style={{ lineHeight: 16 }}>{`Đang nợ Ba Mẹ ${-c.sao} sao · sao nhiệm vụ trả nợ trước`}</Chu> : null}
          <Chu kieu="dam" co={12} mau="#565c59" style={{ lineHeight: 16 }}>{`${c.dangDung ? "Đang dùng · " : ""}${phu}`}</Chu>
        </View>
      </View>
    );
  };
  const theKhoa = (ic: "may_tinh" | "nguoi", tieu: string, phu: string, nut: React.ReactNode) => (
    <View style={[{ flex: 1, padding: 12, borderRadius: 24, backgroundColor: "#f7f6f3", gap: 4 }, KHOI.the]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><Icon3D ten={ic} co={20} /><Chu kieu="rat" co={14}>{tieu}</Chu></View>
      <Chu kieu="dam" co={12} mau="#565c59" style={{ lineHeight: 16, flex: 1 }}>{phu}</Chu>
      <View style={{ marginTop: 6 }}>{nut}</View>
    </View>
  );
  return (
    <Man noi={noi} tai={tai} dau={<DauHaiDong tieu={ten} phu={`${gan.length >= 2 ? "Máy chung" : gan.length === 1 ? "Máy riêng" : "Chưa bé nào"}${gan.length ? ` · ${gan.map((c) => tenGoi(c.ten)).join(", ")}` : ""}`} lui={lui} />}>
      {/* thẻ «<bé> đang dùng» (.dangd) */}
      <View style={{ padding: 16, borderRadius: 28, backgroundColor: "#e2efea", backgroundImage: "linear-gradient(#d6e9e2, #eef4f1)", gap: 10, ...KHOI.the }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {dangDung ? <AvtCon c={dangDung} co={36} /> : <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}><Icon3D ten="nguoi" co={22} /></View>}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Chu kieu="rat" co={16} dong={2}>{dangDung ? `${tenGoi(dangDung.ten)} đang dùng` : "Chưa bé nào đang dùng"}</Chu>
            <Chu kieu="dam7" co={12.5} mau={M.chinhInk} dong={2}>
              {dangDung ? `● ${app ? `${app.tenApp} · Tính phút` : cm.dangDung?.tu ? `vào máy lúc ${gioPhut(cm.dangDung.tu)}` : "đang dùng"}` : "Bé chọn tên + nhập PIN để vào máy"}
            </Chu>
          </View>
          {gan.length >= 2 ? (
            <Pressable onPress={() => setMo("doi")} accessibilityRole="button" style={{ minHeight: 44, justifyContent: "center" }}>
              <View style={{ paddingVertical: 7, paddingHorizontal: 11, borderRadius: 16, backgroundColor: "#fff", ...KHOI.nho }}><Chu kieu="rat" co={13} mau={M.chinhInk}>Đổi người</Chu></View>
            </Pressable>
          ) : null}
        </View>
        {dangDung ? (
          <View style={{ flexDirection: "row", gap: 8 }}>
            <View style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.75)" }}>
              <Chu kieu="rat" co={20} so style={{ lineHeight: 24 }}>{`${cm.dangDung?.phutHomNay ?? dangDung.phutHomNay} phút`}</Chu>
              <Chu kieu="dam7" co={12} mau="#3a403d">hôm nay trên máy này</Chu>
            </View>
            <View style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.75)" }}>
              <Chu kieu="rat" co={20} so mau={dangDung.sao < 0 ? "#8a3c0c" : "#6e4300"} style={{ lineHeight: 24 }}>{`${dangDung.sao < 0 ? "−" : ""}${Math.abs(dangDung.sao)} sao`}</Chu>
              <Chu kieu="dam7" co={12} mau="#3a403d">{dangDung.sao < 0 ? "đang nợ Ba Mẹ" : `còn = ${dangDung.sao} phút chơi`}</Chu>
            </View>
          </View>
        ) : null}
      </View>

      {gan.length ? <>
        <MucPhai chu="Sao của từng bé" phai="luật đi theo bé" />
        <TheDs>{gan.map(dongBe)}</TheDs>
      </> : null}

      <MucPhai chu="Khoá" />
      {khoaMay ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 24, backgroundColor: "#ecebe7" }}>
          <Icon3D ten="khoa" co={24} />
          <Chu kieu="rat" co={13.5} mau="#3a403d" style={{ flex: 1 }}>{`${tenNgan} ${(cauKhoaMay(cm.khoaMay) ?? "đang khoá").replace(/^./, (x) => x.toLowerCase())} · mọi bé`}</Chu>
          {d.xem ? null : <Nut chu="Mở khoá" ic="mo_khoa" loai="vien" nho dangChay={dangChay} bam={() => lam(async () => {
            await datKhoaMay(id, false); xong(`Đã mở khoá ${tenNgan}`, () => datKhoaMay(id, true, cm.khoaMay.den ? new Date(cm.khoaMay.den) : null));
          })} />}
        </View>
      ) : null}
      <BaoLoi loi={loiLam} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        {theKhoa("may_tinh", "Theo máy", `${gan.length >= 2 ? `Cả ${gan.length} bé` : gan[0] ? tenGoi(gan[0].ten) : "Bé"} không vào được ${tenNgan}. Máy riêng vẫn dùng.`,
          <Nut chu="Khoá máy này" nho rong tat={khoaMay || !gan.length} bam={() => setMo("may")} />)}
        {theKhoa("nguoi", "Theo bé", be ? `${tenBe} không vào được mọi máy.${gan.length >= 2 ? ` ${gan.filter((c) => c.id !== be.id).map((c) => tenGoi(c.ten)).join(", ")} vẫn dùng.` : ""}` : "Chưa có bé dùng máy này.",
          <Nut chu={be ? `Khoá ${tenBe}` : "Khoá bé"} nho rong loai="vien" tat={!be} bam={() => setMo("be")} />)}
      </View>
      {gan.length >= 2 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginHorizontal: 4 }}>
          {gan.map((c) => (
            <Pressable key={c.id} onPress={() => setBeKhoa(c.id)} accessibilityRole="radio" accessibilityState={{ checked: be?.id === c.id }} accessibilityLabel={`Khoá theo bé: ${tenGoi(c.ten)}`}
              style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: 10, borderRadius: 18, backgroundColor: be?.id === c.id ? "#dcebe6" : "#ecebe7" }}>
              <AvtCon c={c} co={22} /><Chu kieu="rat" co={12.5} mau={be?.id === c.id ? M.chinhInk : "#3a403d"}>{tenGoi(c.ten)}</Chu>
            </Pressable>
          ))}
        </View>
      ) : null}
      <Chu kieu="dam" co={12.5} mau="#565c59" style={{ marginHorizontal: 8, lineHeight: 18 }}>Một bé mở 2 máy cùng lúc: phút tính theo đồng hồ thật một lần, không trừ sao gấp đôi.</Chu>

      <BangKhoaTheoMay mo={mo === "may"} dong={() => setMo(null)} may={{ id, ten: tenNgan, nen: cm.may.nen }} con={gan} dangDung={dangDung?.id ?? null} app={app?.tenApp ?? null}
        khac={khac} xong={xong} />
      {be ? (
        <BangKhoaMay mo={mo === "be"} dong={() => setMo(null)} con={be.id} ten={tenBe}
          may={mayCuaBe.map((x) => ({ id: x.id, ten: ngan(x.ten), nen: x.nen, truc: x.trangThai === "tuan_thu" || x.trangThai === "lech_chuan", khoaMay: x.khoaMay,
            dungChung: laMayChung(x), conKhac: conCuaMay(x, caNha).filter((c) => c.id !== be.id).map((c) => tenGoi(c.ten)) }))}
          dang={app && dangDung?.id === be.id ? { [id]: { chu: `● ${app.tenApp} · đang mở`, mo: true } } : undefined} xong={xong} />
      ) : null}
      <BangTruot mo={mo === "doi"} dong={() => setMo(null)} tieu="Đổi người trên máy" hinh="nguoi">
        <View style={{ paddingHorizontal: 4 }}>
          <TickDong chu={`Trên ${tenNgan}, bấm tên bé ở góc màn hình › «Đổi người»`} />
          <TickDong chu="Bé kia chọn tên mình, nhập PIN" />
          <TickDong chu="Phút của bé trước dừng tính ngay, sao trừ đúng bé đang dùng" />
        </View>
        <Chu co={13} mau={M.chu3}>Bé quên PIN thì xin Ba Mẹ đặt lại trong hồ sơ bé.</Chu>
        <Nut chu="Đã hiểu" loai="vien" rong bam={() => setMo(null)} />
      </BangTruot>
    </Man>
  );
}
