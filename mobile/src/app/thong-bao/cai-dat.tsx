// «Cài đặt thông báo» (thiết kế 14/11 bm-ca-nha/12 them-2ru3t5iw) của RIÊNG Ba Mẹ đang dùng:
// «Báo ngay» (con xin · con nộp ảnh nhiệm vụ · máy mất bảo vệ & cảnh báo nội dung xấu — Luôn bật), «Để biết» (con đổi sao lấy quà),
// «Giờ yên lặng» (không rung, cảnh báo vẫn báo ngay; chạm để đổi giờ). Ghi GET/POST thong-bao/cai-dat {yenLang, tat[]}.
// Nhóm `canh_bao` luôn bật (không gửi vào `tat`). 14/11 bỏ khỏi màn: huy hiệu, việc người lớn khác làm, người nhà vào/rời (thiết kế không còn — giữ lựa chọn cũ
// ở máy chủ). «Con sắp hết giờ chơi», «Báo cáo tuần» của thiết kế chưa có nhóm thông báo ở máy chủ — chưa hiện (không để công tắc chết).
import { useEffect, useState } from "react";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { MucTieu, NhanLuon, OIcon } from "@/lib/ui-bm3";
import { BangTruot, BaoLoi, ChoTai, Chu, CongTac, Dong, M, Man, Nhom, Nut, ONhap, type TenIcon, useHoanTac, useLam, useTai } from "@/lib/ui";

type CaiDat = { yenLang: { bat: boolean; tu: string; den: string }; tat: string[] };
type Hang = { ma: string; ten: string; phu?: string; ic: TenIcon };
const BAO_NGAY: Hang[] = [
  { ma: "yeu_cau", ten: "Con xin dùng app, web, thêm giờ", ic: "game" },
  { ma: "nhiem_vu", ten: "Con nộp ảnh nhiệm vụ", ic: "camera" },
];
const DE_BIET: Hang[] = [
  { ma: "qua", ten: "Con đổi sao lấy quà", ic: "qua" },
];
const GIO = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function CaiDatThongBao() {
  const { d, loi, matMang, tai, setD } = useTai(() => bm.goi<CaiDat>("thong-bao/cai-dat"));
  const { lam, loi: loiLam, dangChay } = useLam();
  const { bao, noi } = useHoanTac();
  const [mo, setMo] = useState(false);
  const [tu, setTu] = useState("22:00");
  const [den, setDen] = useState("06:00");
  // «Cảnh báo» giờ luôn bật: tài khoản cũ từng tắt nhóm canh_bao ⇒ gỡ khỏi `tat` một lần khi mở màn
  const coTatCanhBao = !!d?.tat.includes("canh_bao");
  useEffect(() => {
    if (!coTatCanhBao || !d) return;
    bm.goi<CaiDat>("thong-bao/cai-dat", { yenLang: d.yenLang, tat: d.tat.filter((x) => x !== "canh_bao") }).then(setD, () => {});
  }, [coTatCanhBao]);     // eslint-disable-line react-hooks/exhaustive-deps
  if (!d) return <Man lui={{ chu: "" }} tieu="Cài đặt thông báo"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const luu = (moi: Partial<CaiDat>, chu: string) => lam(async () => {
    const tat = (moi.tat ?? d.tat).filter((x) => x !== "canh_bao");
    const r = await bm.goi<CaiDat>("thong-bao/cai-dat", { yenLang: moi.yenLang ?? d.yenLang, tat });
    setD(r);
    bao(chu);
  }, { hangDoi: true });
  const hang = (x: Hang, i: number) => {
    const bat = !d.tat.includes(x.ma);
    return <Dong key={x.ma} dau={i === 0} tieu={x.ten} phu={x.phu} trai={<OIcon ic={x.ic} />}
      phai={<CongTac bat={bat} nhan={x.ten} doi={(v) => luu({ tat: v ? d.tat.filter((y) => y !== x.ma) : [...d.tat, x.ma] }, `${v ? "Bật" : "Tắt"}: ${x.ten}`)} />} />;
  };
  const yl = d.yenLang;
  return (
    <Man lui={{ chu: "" }} tieu="Cài đặt thông báo" noi={noi}>
      <MucTieu chu="Báo ngay" />
      <Nhom>
        {BAO_NGAY.map(hang)}
        <Dong tieu="Máy của con mất bảo vệ" phu="Để con an toàn" trai={<OIcon ic="khien" />} phai={<NhanLuon />} />
        <Dong tieu="Cảnh báo nội dung xấu" phu="Con mở trang bị chặn" trai={<OIcon ic="khien" />} phai={<NhanLuon />} />
      </Nhom>
      <MucTieu chu="Để biết" />
      <Nhom>{DE_BIET.map(hang)}</Nhom>
      <MucTieu chu="Giờ yên lặng" />
      <Nhom>
        <Dong dau tieu={`Không rung ${yl.tu} – ${yl.den}`} phu="Cảnh báo vẫn báo ngay · chạm để đổi giờ" trai={<OIcon ic="trang_ngu" />}
          bam={() => { setTu(yl.tu); setDen(yl.den); setMo(true); }}
          phai={<CongTac bat={yl.bat} nhan="Giờ yên lặng" doi={(v) => luu({ yenLang: { ...yl, bat: v } }, v ? "Đã bật giờ yên lặng" : "Đã tắt giờ yên lặng")} />} />
      </Nhom>
      <BaoLoi loi={loiLam} />
      <BangTruot mo={mo} dong={() => setMo(false)} tieu="Giờ yên lặng">
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <View style={{ flex: 1, minWidth: 120 }}><ONhap nhan="Từ" value={tu} onChangeText={setTu} placeholder="22:00" maxLength={5} keyboardType="numbers-and-punctuation" /></View>
          <View style={{ flex: 1, minWidth: 120 }}><ONhap nhan="Đến" value={den} onChangeText={setDen} placeholder="06:00" maxLength={5} keyboardType="numbers-and-punctuation" /></View>
        </View>
        <Chu co={13} mau={M.chu3}>Giờ dạng 24 giờ, ví dụ 22:00 – 06:00 (qua nửa đêm được).</Chu>
        <BaoLoi loi={loiLam} />
        <Nut chu="Lưu giờ yên lặng" rong dangChay={dangChay} tat={!GIO.test(tu) || !GIO.test(den) || tu === den}
          bam={async () => { if (await luu({ yenLang: { bat: true, tu, den } }, `Giờ yên lặng ${tu} – ${den}`)) setMo(false); }} />
      </BangTruot>
    </Man>
  );
}
