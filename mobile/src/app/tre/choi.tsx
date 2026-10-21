// con-bat-dau-choi «Dùng điểm để chơi?» (FR-04.02): hỏi trước khi trừ điểm — nói rõ số điểm, phút tối đa, giá điểm/phút. Không trừ «ngầm».
// Nhiều trò chơi được phép ⇒ chọn một (≤ 3 hiện sẵn). Chưa được chơi (nghỉ, ngoài giờ, hết trần, hết điểm) ⇒ đưa tới màn giải thích.
import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BaoLoi, CanhGiua, Chu, M, Nut, OChon, cauLoi, useLam, useTai } from "@/lib/ui";
import { AppIc, ManTre, NenChoi, useTre } from "@/lib/ui-tre";
import { kid, tenMuc, type TroChoi, type XetChoi } from "@/lib/api-tre";
import { LoiApi } from "@/lib/api";

const DI_KHI_CHUA: Record<string, string> = { gio_ngu: "/tre/gio-ngu?ly=gio_ngu", ngoai_khung: "/tre/gio-ngu?ly=ngoai_khung",
  dat_tran_ngay: "/tre/gio-ngu?ly=dat_tran_ngay", dat_tran_tuan: "/tre/gio-ngu?ly=dat_tran_tuan" };

export default function BatDauChoi() {
  const { muc } = useLocalSearchParams<{ muc?: string }>();
  const { ten } = useTre();
  const ds = useTai(() => kid.goi<{ ds: TroChoi[] }>("tro-choi"));
  const [chon, setChon] = useState<string | null>(muc ?? null);
  const dangChon = chon ?? (ds.d?.ds.length === 1 ? ds.d.ds[0].muc : null);
  const [xet, setXet] = useState<XetChoi | null>(null);
  const [loiXet, setLoiXet] = useState<string | null>(null);
  const { dangChay, loi, lam } = useLam();
  useEffect(() => {
    if (!dangChon) return;
    let huy = false;
    kid.goi<XetChoi>("phien/xet", { muc: dangChon }).then((x) => {
      if (huy) return;
      if (!x.duoc && x.lyDo === "dang_nghi") return router.replace(`/tre/het-phien?nghiDen=${encodeURIComponent(x.nghiDen ?? "")}`);
      if (!x.duoc && x.lyDo && DI_KHI_CHUA[x.lyDo]) return router.replace(DI_KHI_CHUA[x.lyDo] as never);
      setXet(x);
    }).catch((e) => { if (!huy) setLoiXet(cauLoi(e)); });
    return () => { huy = true; };
  }, [dangChon]);
  const tc = ds.d?.ds.find((x) => x.muc === dangChon);
  const tenTc = tenMuc(dangChon ?? "", tc?.ten);
  const batDau = () => lam(async () => {
    try {
      const p = await kid.goi<{ id: string }>("phien/mo", { muc: dangChon });
      router.replace(`/tre/phien/${p.id}?muc=${encodeURIComponent(dangChon ?? "")}`);
    } catch (e) {
      if (e instanceof LoiApi && e.ma === "khong_mo_duoc") { setXet({ duoc: false, cau: e.message }); return; }
      throw e;
    }
  });
  if (ds.d && !ds.d.ds.length && !muc) {
    return (
      <ManTre lui={{ chu: "Nhà", ve: "/tre/nha" }}>
        <CanhGiua lv="canh-trong" tieu="Chưa có trò chơi nào" loi={`Ba Mẹ chưa thêm trò chơi cho ${ten}. Xin phép Ba Mẹ nhé?`}>
          <Nut chu="Xin phép Ba Mẹ" ic="tin" bam={() => router.replace("/tre/xin-phep?loai=cai_app")} />
        </CanhGiua>
      </ManTre>
    );
  }
  const hop = !dangChon ? (
    <>
      <Chu kieu="rat" co={21}>Chơi trò gì nào?</Chu>
      <View style={{ gap: 8 }}>
        {(ds.d?.ds ?? []).slice(0, 3).map((x) => (
          <OChon key={x.muc} chon={false} bam={() => setChon(x.muc)} trai={<AppIc muc={x.muc} ten={x.ten} co={40} />} tieu={tenMuc(x.muc, x.ten)}
            phu={`${String(x.giaPhut).replace(".", ",")} điểm/phút`} />
        ))}
      </View>
      {!ds.d ? <ActivityIndicator color={M.chinh} /> : null}
      <Nut chu="Để sau" loai="ma" rong bam={() => router.replace("/tre/nha")} />
    </>
  ) : !xet ? (
    <>
      {loiXet ? <BaoLoi loi={loiXet} /> : <ActivityIndicator color={M.chinh} />}
      <Nut chu="Để sau" loai="ma" rong bam={() => router.replace("/tre/nha")} />
    </>
  ) : xet.duoc ? (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <AppIc muc={dangChon} ten={tc?.ten} />
        <Chu kieu="rat" co={21} style={{ flex: 1 }}>{`Chơi ${tenTc}?`}</Chu>
      </View>
      <Chu co={16}>
        {`${ten} có `}<Chu kieu="rat" co={16}>{`${xet.soDu} điểm`}</Chu>{". Chơi tối đa "}<Chu kieu="rat" co={16}>{`${xet.phutToiDa} phút`}</Chu>
        {", "}<Chu kieu="rat" co={16}>{`${String((xet.giaPhanNghin ?? 1000) / 1000).replace(".", ",")} điểm/phút`}</Chu>{"."}
      </Chu>
      <Chu co={13} mau={M.chu3}>{`Chỉ trừ khi ${ten} đang chơi thật. Dừng sớm thì giữ lại điểm.`}</Chu>
      <BaoLoi loi={loi} />
      <Nut chu="Bắt đầu chơi" rong bam={batDau} dangChay={dangChay} />
      <Nut chu="Để sau" loai="ma" rong bam={() => router.replace("/tre/nha")} />
    </>
  ) : (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <AppIc muc={dangChon} ten={tc?.ten} />
        <Chu kieu="rat" co={21} style={{ flex: 1 }}>{`Chưa chơi ${tenTc} được`}</Chu>
      </View>
      <Chu co={16}>{xet.cau ?? "Chưa mở được giờ chơi"}</Chu>
      {xet.lyDo === "het_diem" ? <Nut chu="Làm nhiệm vụ" ic="sao" rong bam={() => router.replace("/tre/nhiem-vu")} />
        : <Nut chu="Xin phép Ba Mẹ" ic="tin" rong bam={() => router.replace(`/tre/xin-phep?loai=${xet.lyDo === "chua_phan_loai" ? "cai_app" : "them_gio"}&gia=${encodeURIComponent(tenTc)}`)} />}
      <Nut chu="Để sau" loai="ma" rong bam={() => router.replace("/tre/nha")} />
    </>
  );
  return (
    <NenChoi>
      <SafeAreaView style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "rgba(16,35,31,.38)" }}>
        <View style={{ backgroundColor: "#fff", borderRadius: 28, padding: 20, gap: 12, maxWidth: 460, width: "100%", alignSelf: "center",
          shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 40, shadowOffset: { width: 0, height: 30 }, elevation: 8 }}>
          {hop}
        </View>
      </SafeAreaView>
    </NenChoi>
  );
}
