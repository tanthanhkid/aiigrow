// «Con đang xin» bản «Dịu» (con-dt-xin 02 cdt-yeu-cau, 03 «Ba Mẹ cho rồi!», 04 «Ba Mẹ chưa cho» — FR-05.02): lời xin mới nhất đã có trả lời ⇒
// thẻ kết quả lên đầu (✓ Đã mở / +20 phút · giờ chơi 18 → 38 / chưa cho + lời Ba Mẹ); còn chờ ⇒ «Đã gửi Ba Mẹ! Ba Mẹ trả lời là máy báo con
// ngay.». Mỗi lời xin một thẻ (⏳ Đang chờ / ✓ Được / Chưa cho / Hết hạn); chạm lời đang chờ ⇒ huỷ. Tự hỏi lại mỗi 15 giây khi còn chờ.
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { kid, type NhaTreSao, type YcTre } from "@/lib/api-tre";
import { D } from "@/lib/diu";
import { gioPhut, useLam } from "@/lib/ui";
import { CamXuc, ChoD, ChuD, LoiD, ManD, NutD, PillD, TamTruot, TheD, TieuD } from "@/lib/ui-diu";
import { useTaiTre } from "@/lib/ui-tre";

const tieuYc = (y: YcTre) => y.loai === "mo_web" || y.loai === "cai_app" ? `${y.gia_tri ?? "App"}` : y.loai === "them_gio" ? `Thêm ${y.phut} phút`
  : y.loai === "ngoai_le" ? (y.pham_vi === "app" && y.gia_tri ? `Mở ${y.gia_tri} ${y.phut} phút` : `Mở máy ${y.phut} phút`)
    : y.loai === "ngoai_gio" ? `Mở máy ${y.phut} phút` : y.gia_tri || y.ly_do;

function nhanYc(y: YcTre): [string, "cho" | "xanh" | "loi" | "xam"] {
  switch (y.trang_thai) {
    case "dong_y": return ["✓ Được", "xanh"];
    case "tu_choi": return ["Chưa cho", "loi"];
    case "het_han": return ["Hết hạn", "xam"];
    case "huy": return ["Đã huỷ", "xam"];
    default: return ["⏳ Đang chờ", "cho"];
  }
}

export default function YeuCau() {
  const { d, loi, matMang, tai } = useTaiTre("yeu-cau", async () => ({
    nha: await kid.goi<NhaTreSao>("nha"), ds: (await kid.goi<{ ds: YcTre[] }>("yeu-cau")).ds,
  }));
  const [huy, setHuy] = useState<YcTre | null>(null);
  const { dangChay, loi: loiHuy, lam } = useLam();
  const coCho = !!d?.ds.some((y) => y.trang_thai === "cho");
  useEffect(() => {
    if (!coCho) return;
    const t = setInterval(() => { tai(); }, 15_000);
    return () => clearInterval(t);
  }, [coCho, tai]);
  if (!d) return <ManD lui="/tre/nha" tieu="Con đang xin"><ChoD loi={loi} matMang={matMang} tai={tai} /></ManD>;
  const q = d.nha.quy;
  const conPhut = q?.conPhut ?? d.nha.conPhut;
  if (!d.ds.length) {
    return (
      <ManD lui="/tre/nha" giua day={<NutD chu="Xin phép Ba Mẹ" ic="tin" bam={() => router.replace("/tre/xin-phep")} />}>
        <CamXuc lv="canh-trong" co={140} tieu="Con chưa xin gì cả" phu="Muốn mở app mới hay thêm giờ? Xin ở đây nhé." />
      </ManD>
    );
  }
  const dau = d.ds[0];
  const vuaTraLoi = dau.trang_thai === "dong_y" || dau.trang_thai === "tu_choi";
  const xacNhanHuy = () => lam(async () => { await kid.goi(`yeu-cau/${huy!.id}/huy`, {}); setHuy(null); await tai(); });
  const day = dau.trang_thai === "dong_y"
    ? <><NutD chu={conPhut > 0 ? `Chơi ${conPhut} phút` : "Về trang chính"} bam={() => router.replace("/tre/nha")} />
      <NutD chu="Cảm ơn Ba Mẹ ›" loai="chu" bam={() => router.push("/tre/tin")} /></>
    : dau.trang_thai === "tu_choi"
      ? <><NutD chu="Làm nhiệm vụ kiếm sao" ic="sao" bam={() => router.replace("/tre/nhiem-vu")} />
        <NutD chu="Nhắn lại Ba Mẹ" loai="phu" bam={() => router.push("/tre/tin")} />
        <NutD chu="Về trang chính" loai="chu" bam={() => router.replace("/tre/nha")} /></>
      : <><NutD chu={conPhut > 0 ? `Chơi tiếp ${conPhut} phút còn lại` : "Về trang chính"} bam={() => router.replace("/tre/nha")} />
        {q?.doiSao.bat ? <NutD chu="Không muốn chờ? Đổi sao lấy giờ ›" loai="chu" bam={() => router.push("/tre/choi")} /> : null}</>;
  return (
    <ManD lui="/tre/nha" day={day}>
      {vuaTraLoi ? (
        <View style={{ gap: 8 }}>
          <TieuD chu={dau.trang_thai === "dong_y" ? "Ba Mẹ cho rồi!" : "Ba Mẹ chưa cho"} />
          <TheD>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <ChuD kieu="den" co={17} style={{ flex: 1 }}>{tieuYc(dau)}</ChuD>
              <PillD chu={dau.trang_thai === "dong_y" ? (dau.loai === "them_gio" ? `+${dau.phut} phút` : "✓ Đã mở") : "Chưa cho"} loai={dau.trang_thai === "dong_y" ? "xanh" : "loi"} />
            </View>
            <ChuD co={14} mau={D.chu2}>{dau.trang_thai === "dong_y" && dau.loai === "them_gio" && q ? `Giờ chơi còn ${q.conPhut} phút`
              : `Trả lời lúc ${gioPhut(dau.xu_ly_luc ?? dau.created_at)}`}</ChuD>
            {dau.ly_do_tu_choi ? <ChuD kieu="rat" co={16}>{`Ba Mẹ: «${dau.ly_do_tu_choi}»`}</ChuD> : null}
          </TheD>
        </View>
      ) : (
        <View style={{ gap: 4 }}>
          <TieuD chu="Con đang xin" />
          <ChuD kieu="rat" co={15} mau={D.xanhD}>Đã gửi Ba Mẹ!</ChuD>
          <ChuD co={14.5} mau={D.chu2}>Ba Mẹ trả lời là máy báo con ngay.</ChuD>
        </View>
      )}
      {d.ds.slice(vuaTraLoi ? 1 : 0, 8).map((y) => {
        const [chu, loai] = nhanYc(y);
        return (
          <TheD key={y.id} mong bam={y.trang_thai === "cho" ? () => setHuy(y) : undefined} nhanDoc={`${tieuYc(y)}. ${chu}`}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ flex: 1 }}>
                <ChuD kieu="rat" co={16} dong={1}>{tieuYc(y)}</ChuD>
                <ChuD co={13.5} mau={D.chu2}>{`Gửi lúc ${gioPhut(y.created_at)}`}</ChuD>
              </View>
              <PillD chu={chu} loai={loai} />
            </View>
          </TheD>
        );
      })}
      <TamTruot mo={!!huy} dong={() => setHuy(null)} nhan="Huỷ lời xin này?">
        <ChuD kieu="den" co={18}>Huỷ lời xin này?</ChuD>
        <ChuD co={15} mau={D.chu2}>{huy ? tieuYc(huy) : ""}</ChuD>
        <LoiD loi={loiHuy} />
        <NutD chu="Huỷ lời xin" loai="phu" bam={xacNhanHuy} dangChay={dangChay} />
        <NutD chu="Giữ lại" loai="chu" bam={() => setHuy(null)} />
      </TamTruot>
    </ManD>
  );
}
