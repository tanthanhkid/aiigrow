// «Quà Ba Mẹ mua» (thiết kế 14/11 MỚI bm-sao-qua/03 them-sp8ijd1b; cùng ý bm-thiet-lap-con/26 them-hn2754ce): một voucher AiiGrow — tên, giá tiền,
// con đổi bằng N sao, «<Con> đang tích sao · Đang có X · Còn thiếu Y», cách dùng (QR khi đổi xong · 60 ngày · đưa mã ở quầy).
// Chưa có trong kho ⇒ «Thêm vào kho quà của <Con>» (POST qua/thu-vien {mau, con}); đã có ⇒ «Để con tự tích sao».
// Đã chọn (PR #236): CHƯA có cổng thanh toán trong app (màn «Thanh toán» bm-thiet-lap-con/27 cần cổng tiền thật — việc của Thanh/Nghi quyết) ⇒
// «Mua» = cho quà vào kho của con như voucher 06/11 (trao tay, không thu tiền trong app); màn ghi rõ chưa thu tiền. «Trao luôn cho con» chưa làm
// (máy chủ chưa có lệnh trao quà không qua phiếu con đổi).
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { KHOI } from "@/lib/clay";
import { quyenToi } from "@/lib/hang-ngay";
import { icQua, tenVoucher, type NhomThuVien } from "@/lib/s3";
import { OIcon } from "@/lib/ui-bm3";
import { BaoLoi, baoKhiVe, ChoTai, Chu, Dong, Icon3D, M, Man, Nhom, Nut, tien, useLam, useTai, type TenIcon } from "@/lib/ui";
import { GiaSao } from "@/lib/ui-s3";

export default function QuaBaMeMua() {
  const { ma, con } = useLocalSearchParams<{ ma: string; con?: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const tham = con ? `?con=${encodeURIComponent(con)}` : "";
    const [tv, g, vi, quyen] = await Promise.all([
      bm.goi<{ nhom: NhomThuVien[] }>(`qua/thu-vien${tham}`), bm.goi<GiaDinh>("gia-dinh"),
      con ? bm.goi<{ soDu: number; sao?: number }>(`con/${con}/vi`).catch(() => null) : null, quyenToi(),
    ]);
    return { m: tv.nhom.flatMap((x) => x.ds).find((x) => x.ma === ma) ?? null, c: g.con.find((x) => x.id === con) ?? null,
      sao: vi ? vi.sao ?? vi.soDu : null, baMe: quyen === "ba_me" };
  });
  const { lam, loi: loiLam, dangChay } = useLam();
  const tieu = "Quà Ba Mẹ mua";
  if (!d) return <Man lui={{ chu: "" }} tieu={tieu}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const m = d.m;
  if (!m) return <Man lui={{ chu: "" }} tieu={tieu}><ChoTai loi="Quà này không còn bán." tai={() => router.back()} /></Man>;
  const ten = d.c?.ten ?? "con";
  const thieu = d.sao !== null ? Math.max(0, m.sao - Math.max(0, d.sao)) : null;
  const cafe = /AiiCafe/i.test(m.ten);
  const them = () => lam(async () => {
    await bm.goi("qua/thu-vien", { mau: [m.ma], ...(con ? { con } : {}) });
    baoKhiVe(`Đã cho ${tenVoucher(m.ten)} vào kho quà của ${ten}`);
    router.back();
  });
  return (
    <Man lui={{ chu: "" }} tieu={tieu} day={
      m.daCo || !d.baMe ? <Nut chu="Để con tự tích sao" rong bam={() => router.back()} /> : (
        <>
          <BaoLoi loi={loiLam} />
          <Nut chu={`Cho vào kho quà của ${ten}`} rong dangChay={dangChay} tat={!con} bam={them} />
        </>
      )}>
      <View style={{ alignItems: "center", gap: 6, paddingTop: 6 }}>
        <View style={[{ width: 96, height: 96, borderRadius: 30, backgroundColor: "#fdeab0", alignItems: "center", justifyContent: "center" }, KHOI.the]}>
          <Icon3D ten={icQua(m) as TenIcon} co={60} />
        </View>
        <Chu kieu="rat" co={22} style={{ textAlign: "center" }}>{tenVoucher(m.ten)}</Chu>
        <Chu kieu="dam" co={13.5} mau={M.chu3}>{m.daCo ? `Của ${ten} · nằm sẵn trong kho quà` : m.moTa ?? `Quà AiiGrow cho ${ten}`}</Chu>
      </View>

      <Nhom>
        <Dong dau tieu={`Giá ${tien(m.menhGia ?? 0)}`} phu={m.daCo ? "Đã ở trong kho của con" : "Chưa thu tiền trong app — thanh toán đang được làm"} trai={<OIcon ic="the_qua" />} />
        <Dong tieu="Con đổi bằng" trai={<OIcon ic="sao" />} phai={<GiaSao n={m.sao} />} />
      </Nhom>

      {d.sao !== null ? (
        <View style={[{ padding: 16, borderRadius: 24, backgroundColor: M.diemSoft, gap: 2 }, KHOI.nho]}>
          <Chu kieu="rat" co={15} mau={M.diemInk}>{thieu ? `${ten} đang tích sao` : `${ten} đủ sao rồi`}</Chu>
          <Chu kieu="dam" co={13.5} mau={M.diemInk}>{thieu ? `Đang có ${Math.max(0, d.sao)} sao · Còn thiếu ${thieu} sao` : "Con tự đổi trên máy, Ba Mẹ nhận thông báo"}</Chu>
        </View>
      ) : null}

      <Chu kieu="rat" co={16} style={{ paddingHorizontal: 4 }}>Cách dùng</Chu>
      <Nhom>
        <Dong dau tieu="Mã QR hiện khi con đổi xong" trai={<OIcon ic="qr" />} />
        <Dong tieu="Dùng được 60 ngày từ lúc đổi" trai={<OIcon ic="dongho" />} />
        <Dong tieu={cafe ? "Đưa mã ở quầy AiiCafe" : "Đưa mã cho AiiLab"} trai={<OIcon ic="coc" />} />
      </Nhom>
    </Man>
  );
}
