// «Chơi bằng sao» bản «Dịu» (con-dt-gio 02 cdt-choi, sổ sao 15/11 #264): «Con đang có 40 sao · = 40 phút chơi · 1 sao = 1 phút», nhóm app
// «Tính phút · trừ sao» / «Không tính phút», «Chơi app Tính phút · 40 sao → 40 phút · Hết sao thì dừng · không cần đổi», «Chơi ngay · còn
// 40 phút», «Hết sao? Làm nhiệm vụ hoặc xin Ba Mẹ cho vay sao». Thay màn «Đổi sao lấy giờ» cũ (sao chính là phút — không còn đổi);
// agent-android cũ vẫn mở đường /tre/choi. Hết sao ⇒ «Hết sao rồi»; Ba Mẹ khoá máy ⇒ màn khoá.
import { Redirect, router } from "expo-router";
import { View } from "react-native";
import { kid, taiCheDo, taiSao, tenMuc, type TroChoi } from "@/lib/api-tre";
import { soSao, soVN } from "@/lib/con-diu";
import { D } from "@/lib/diu";
import { Icon3D } from "@/lib/ui";
import { ChoD, ChuD, ManD, MatMangD, NutD, TheD } from "@/lib/ui-diu";
import { useTaiTre } from "@/lib/ui-tre";

function Nhom({ tieu, ds, phu }: { tieu: string; ds: string[]; phu: string }) {
  return (
    <TheD style={{ gap: 6 }}>
      <ChuD kieu="den" co={14} mau={D.chu2}>{tieu}</ChuD>
      {ds.length ? ds.map((a) => (
        <View key={a} style={{ flexDirection: "row", alignItems: "center", minHeight: 36 }}>
          <ChuD kieu="rat" co={16} style={{ flex: 1 }} dong={1}>{a}</ChuD>
          <ChuD kieu="rat" co={13} mau={D.chu2}>{phu}</ChuD>
        </View>
      )) : <ChuD co={14} mau={D.chu2}>Ba Mẹ chưa thêm app nào.</ChuD>}
    </TheD>
  );
}

export default function ChoiBangSao() {
  const { d, loi, matMang, tai, cu } = useTaiTre("choi-sao", async () => {
    const [s, tc, cheDo] = await Promise.all([taiSao(), kid.goi<{ ds: TroChoi[] }>("tro-choi").catch(() => ({ ds: [] as TroChoi[] })), taiCheDo()]);
    return { s, tc: tc.ds, moHet: cheDo === "mo_het" };
  });
  if (!d) return <ManD lui={true} tieu="Chơi bằng sao"><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  const { s } = d;
  if (s.khoa) return <Redirect href="/tre/gio-ngu?ly=ba_me_khoa" />;
  if (d.moHet) {
    return (
      <ManD lui={true} tieu="Chơi bằng sao" day={<NutD chu="Đổi quà bằng sao" ic="qua" bam={() => router.replace("/tre/cua-hang")} />}>
        <TheD>
          <ChuD kieu="den" co={20}>Hôm nay Mở hết · không tính phút</ChuD>
          <ChuD co={14.5} mau={D.chu2}>{`Ba Mẹ để mở hết: chơi không trừ sao. ${soSao(s.sao)} để dành đổi quà.`}</ChuD>
        </TheD>
      </ManD>
    );
  }
  // tro-choi = app «Tính phút» trong danh sách của Con (luật giai_tri); «Không tính phút» = app học + AiiRob
  const tinh = [...new Set(d.tc.map((x) => tenMuc(x.muc, x.ten)))];
  const khong = ["App học", "AiiRob"];
  return (
    <ManD lui={true} tieu="Chơi bằng sao" day={<>
      <NutD chu={s.hetSao ? "Hết sao rồi" : `Chơi ngay · còn ${soVN(s.phutCon)} phút`} ic="game" bam={() => router.replace(s.hetSao ? "/tre/het-phien" : "/tre/gio")} />
      <NutD chu="Hết sao? Làm nhiệm vụ hoặc xin Ba Mẹ cho vay sao" loai="chu" bam={() => router.push("/tre/them-gio")} />
    </>}>
      {matMang || cu ? <MatMangD chu="Mất mạng rồi — phút chơi vẫn tính, sao trừ khi có mạng lại." /> : null}
      <TheD vang>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon3D ten="sao" co={56} />
          <View style={{ flex: 1 }}>
            <ChuD kieu="rat" co={13.5} mau={D.saoInk}>Con đang có</ChuD>
            <ChuD kieu="den" co={32} mau={D.saoInk} so>{soSao(s.sao)}</ChuD>
            <ChuD kieu="rat" co={13} mau={D.saoInk}>{`= ${soVN(s.phutCon)} phút chơi · 1 sao = 1 phút`}</ChuD>
          </View>
        </View>
      </TheD>
      <Nhom tieu="Tính phút · trừ sao" ds={tinh} phu="1 sao = 1 phút" />
      <Nhom tieu="Không tính phút" ds={khong} phu="không trừ sao" />
      <TheD mong>
        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
          <ChuD kieu="rat" co={15} style={{ flex: 1 }}>Chơi app Tính phút</ChuD>
          <ChuD kieu="den" co={18} mau={D.saoInk} so>{soSao(Math.max(0, s.phutCon))}</ChuD>
          <ChuD kieu="den" co={16} mau={D.chu3}>→</ChuD>
          <ChuD kieu="den" co={18} mau={D.xanhD} so>{`${soVN(s.phutCon)} phút`}</ChuD>
        </View>
        <ChuD kieu="rat" co={13.5} mau={D.xanhD}>Hết sao thì dừng · không cần đổi</ChuD>
      </TheD>
    </ManD>
  );
}
