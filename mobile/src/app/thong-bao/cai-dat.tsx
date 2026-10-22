// Cài đặt thông báo của RIÊNG Ba/Mẹ này (FR-08.01): giờ yên lặng (không đẩy, trừ cảnh báo nghiêm trọng) + tắt từng nhóm thông báo.
// Thông báo vẫn nằm trong danh sách trong app; chỉ không đẩy lên màn khoá. Push thật chờ bản cài trên điện thoại (KE-HOACH: chờ thiết bị).
import { useState } from "react";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { Bao, BangTruot, BaoLoi, BieuTron, ChoTai, Chu, CongTac, Dong, M, Man, Nhom, NhomTieu, Nut, ONhap, useHoanTac, useLam, useTai } from "@/lib/ui";

type CaiDat = { yenLang: { bat: boolean; tu: string; den: string }; tat: string[] };
const NHOM: { ma: string; ten: string; phu: string }[] = [
  { ma: "nhiem_vu", ten: "Con nộp nhiệm vụ", phu: "Nộp liền nhau gộp một thông báo" },
  { ma: "yeu_cau", ten: "Con xin phép", phu: "Thêm giờ, mở web, cài app" },
  { ma: "qua", ten: "Đổi quà, phiếu quà", phu: "Kèm số dư quỹ phiếu quà" },
  { ma: "thanh_tich", ten: "Huy hiệu, AiiRob", phu: "Có cớ khen Con" },
  { ma: "ba_me_khac", ten: "Việc Ba Mẹ khác làm", phu: "Duyệt, từ chối, mở khẩn cấp" },
  { ma: "gia_dinh", ten: "Thành viên gia đình", phu: "Người mới vào, đổi quyền" },
  { ma: "canh_bao", ten: "Cảnh báo", phu: "Cảnh báo nghiêm trọng luôn được báo" },
];
const GIO = /^([01]\d|2[0-3]):[0-5]\d$/;

export default function CaiDatThongBao() {
  const { d, loi, matMang, tai, setD } = useTai(() => bm.goi<CaiDat>("thong-bao/cai-dat"));
  const { lam, loi: loiLam, dangChay } = useLam();
  const { bao, noi } = useHoanTac();
  const [mo, setMo] = useState(false);
  const [tu, setTu] = useState("22:00");
  const [den, setDen] = useState("06:30");
  if (!d) return <Man lui={{ chu: "Thông báo" }} tieu="Cài đặt thông báo"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const luu = (moi: Partial<CaiDat>, chu: string) => lam(async () => {
    const r = await bm.goi<CaiDat>("thong-bao/cai-dat", { yenLang: moi.yenLang ?? d.yenLang, tat: moi.tat ?? d.tat });
    setD(r);
    bao(chu);
  }, { hangDoi: true });
  const yl = d.yenLang;
  return (
    <Man lui={{ chu: "Thông báo" }} tieu="Cài đặt thông báo" noi={noi}>
      <NhomTieu chu="Giờ yên lặng" />
      <Nhom>
        <Dong dau tieu="Giờ yên lặng" phu={`${yl.tu} – ${yl.den} · trừ cảnh báo nghiêm trọng`} trai={<BieuTron ic="trang_ngu" mau="tim" />}
          phai={<CongTac bat={yl.bat} nhan="Giờ yên lặng" doi={(v) => luu({ yenLang: { ...yl, bat: v } }, v ? "Đã bật giờ yên lặng" : "Đã tắt giờ yên lặng")} />} />
        <Dong tieu="Đổi giờ" phu="Mặc định 22:00 – 06:30" trai={<BieuTron ic="dongho" />} bam={() => { setTu(yl.tu); setDen(yl.den); setMo(true); }} />
      </Nhom>
      <NhomTieu chu="Báo cho Ba/Mẹ khi" />
      <Nhom>
        {NHOM.map((x, i) => {
          const bat = !d.tat.includes(x.ma);
          return (
            <Dong key={x.ma} dau={i === 0} tieu={x.ten} phu={x.phu}
              phai={<CongTac bat={bat} nhan={x.ten} doi={(v) => luu({ tat: v ? d.tat.filter((y) => y !== x.ma) : [...d.tat, x.ma] }, `${v ? "Bật" : "Tắt"}: ${x.ten}`)} />} />
          );
        })}
      </Nhom>
      <BaoLoi loi={loiLam} />
      <Bao loai="lam" ic="chuong" tieu="Thông báo trên màn khoá" loi="Mọi việc vẫn hiện trong danh sách Thông báo của app. Giờ yên lặng và các nhóm đã tắt chỉ không đẩy lên màn khoá điện thoại." />
      <BangTruot mo={mo} dong={() => setMo(false)} tieu="Giờ yên lặng">
        <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
          <View style={{ flex: 1, minWidth: 120 }}><ONhap nhan="Từ" value={tu} onChangeText={setTu} placeholder="22:00" maxLength={5} keyboardType="numbers-and-punctuation" /></View>
          <View style={{ flex: 1, minWidth: 120 }}><ONhap nhan="Đến" value={den} onChangeText={setDen} placeholder="06:30" maxLength={5} keyboardType="numbers-and-punctuation" /></View>
        </View>
        <Chu co={13} mau={M.chu3}>Giờ dạng 24 giờ, ví dụ 22:00 – 06:30 (qua nửa đêm được).</Chu>
        <BaoLoi loi={loiLam} />
        <Nut chu="Lưu giờ yên lặng" rong dangChay={dangChay} tat={!GIO.test(tu) || !GIO.test(den) || tu === den}
          bam={async () => { if (await luu({ yenLang: { bat: true, tu, den } }, `Giờ yên lặng ${tu} – ${den}`)) setMo(false); }} />
      </BangTruot>
    </Man>
  );
}
