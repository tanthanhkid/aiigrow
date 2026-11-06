// «Nhiệm vụ» bản «Dịu» (con-dt-ngay 03 cdt-nhiem-vu): nhóm «Ba Mẹ nhờ làm lại» → «Chờ Ba Mẹ duyệt (n)» → «Chưa làm (n)» → «Xong hôm nay»;
// mỗi việc: ô icon + tên + cách nộp («Ảnh» / «Ghi âm» / «Viết» / «Tự chấm trong app») + «+10» sao; cuối màn thẻ vàng «Ba Mẹ duyệt là sao vào ví».
import { router } from "expo-router";
import { View } from "react-native";
import { NHOM_NV } from "@/lib/api";
import { kid, type NhaTre, type NvTre, type NvTreSao } from "@/lib/api-tre";
import { D } from "@/lib/diu";
import { Icon3D } from "@/lib/ui";
import { CamXuc, ChoD, ChuD, DongD, ManD, MatMangD, NutD, PillD, SaoD, TheD } from "@/lib/ui-diu";
import { phuNv, useTaiTre, useTre } from "@/lib/ui-tre";

const CACH: Record<string, string> = { anh: "Chụp ảnh", video: "Chụp ảnh", ghi_am: "Ghi âm", van_ban: "Viết kể lại", xong: "Bấm «Xong»", tu_dong: "Tự chấm trong app" };

const NhomTieu = ({ chu, so }: { chu: string; so: number }) => (
  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
    <ChuD kieu="den" co={15}>{chu}</ChuD>
    <View style={{ minWidth: 24, height: 24, borderRadius: 12, backgroundColor: D.xamNhat, alignItems: "center", justifyContent: "center", paddingHorizontal: 6 }}>
      <ChuD kieu="den" co={12.5} mau={D.chu2}>{String(so)}</ChuD>
    </View>
  </View>
);

export default function NhiemVu() {
  const { ten } = useTre();
  const { d, loi, matMang, tai, cu } = useTaiTre("nhiem-vu", async () => ({
    nha: await kid.goi<NhaTre & { sao?: number }>("nha"), ds: (await kid.goi<{ ds: NvTreSao[] }>("nhiem-vu?tuCham=1")).ds,
  }));
  if (!d) return <ManD tab="nhiem-vu" tieu="Nhiệm vụ"><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  const sao = d.nha.sao ?? d.nha.soDu;
  if (!d.ds.length) {
    return (
      <ManD tab="nhiem-vu" tieu="Nhiệm vụ" giua>
        <CamXuc lv="canh-trong" co={140} tieu="Chưa có nhiệm vụ nào" phu={`Nhờ Ba Mẹ thêm nhiệm vụ cho ${ten} nhé.`}>
          <NutD chu="Xin Ba Mẹ thêm nhiệm vụ" ic="tin" bam={() => router.push(`/tre/xin-phep?loai=khac&gia=${encodeURIComponent("Thêm nhiệm vụ mới")}`)} />
        </CamXuc>
      </ManD>
    );
  }
  const laiDs = d.ds.filter((x) => x.trang_thai_con === "can_bo_sung");
  const choDs = d.ds.filter((x) => x.trang_thai_con !== "can_bo_sung" && x.dang_cho > 0);
  const lamDs = d.ds.filter((x) => (x.trang_thai_con === "san_sang" || x.trang_thai_con === "dang_lam") && !x.dang_cho);
  const xongDs = d.ds.filter((x) => (x.trang_thai_con === "du_hom_nay" || x.trang_thai_con === "du_tuan" || x.trang_thai_con === "da_xong") && !x.dang_cho);
  const mo = (x: NvTreSao) => x.trang_thai_con === "can_bo_sung" ? router.push(`/tre/chup-lai/${x.luot_dang}?nv=${x.id}`)
    : x.trang_thai_con === "dang_lam" ? router.push(`/tre/dang/${x.luot_dang}?nv=${x.id}`) : router.push(`/tre/nv/${x.id}`);
  const dong = (x: NvTreSao, kieu: "lai" | "cho" | "lam" | "xong") => {
    const ic = NHOM_NV[x.nhom]?.ic ?? NHOM_NV.khac.ic;
    const tuCham = x.tu_cham || x.bang_chung === "tu_dong";
    const phu = kieu === "cho" ? `Chờ duyệt · ${CACH[x.bang_chung] ?? "Ảnh"}` : kieu === "lai" || kieu === "xong" ? phuNv(x as NvTre)
      : x.trang_thai_con === "dang_lam" ? "Đang làm — chạm để làm tiếp" : CACH[tuCham ? "tu_dong" : x.bang_chung] ?? "Chụp ảnh";
    return (
      <DongD key={x.id} ic={ic} tieu={x.ten} phu={phu} mo={kieu === "xong"} bam={kieu === "xong" || kieu === "cho" ? undefined : () => mo(x)}
        nhan={kieu === "lai" ? <PillD chu="↺ Làm lại" loai="loi" /> : kieu === "cho" ? <PillD chu="⏳ Chờ duyệt" loai="cho" /> : undefined}
        phai={<SaoD chu={`+${x.sao ?? x.diem}`} mo={kieu === "xong"} />} />
    );
  };
  return (
    <ManD tab="nhiem-vu" tieu="Nhiệm vụ" phai={<PillD chu={`${d.ds.length} việc`} ic="sach" />}>
      {matMang || cu ? <MatMangD chu="Mất mạng rồi — vẫn làm và chụp được, bài tự gửi khi có mạng." /> : null}
      {laiDs.length ? <><NhomTieu chu="Ba Mẹ nhờ làm lại" so={laiDs.length} />{laiDs.map((x) => dong(x, "lai"))}</> : null}
      {choDs.length ? <><NhomTieu chu="Chờ Ba Mẹ duyệt" so={choDs.length} />{choDs.map((x) => dong(x, "cho"))}</> : null}
      {lamDs.length ? <><NhomTieu chu="Chưa làm" so={lamDs.length} />{lamDs.map((x) => dong(x, "lam"))}</> : null}
      {xongDs.length ? <><NhomTieu chu="Xong hôm nay" so={xongDs.length} />{xongDs.map((x) => dong(x, "xong"))}</> : null}
      <TheD vang>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon3D ten="sao" co={44} />
          <View style={{ flex: 1 }}>
            <ChuD kieu="den" co={16} mau={D.saoInk}>Ba Mẹ duyệt là sao vào ví</ChuD>
            <ChuD kieu="rat" co={13.5} mau={D.saoInk}>{`Đang có ${sao} sao`}</ChuD>
          </View>
        </View>
      </TheD>
    </ManD>
  );
}
