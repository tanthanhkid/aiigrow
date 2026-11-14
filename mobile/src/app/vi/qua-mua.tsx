// «Quà Ba Mẹ mua» (thiết kế 14/11 MỚI bm-sao-qua/03 them-sp8ijd1b; cùng ý bm-thiet-lap-con/26 them-hn2754ce): một voucher AiiGrow — tên, giá tiền,
// con đổi bằng N sao, «<Con> đang tích sao · Đang có X · Còn thiếu Y», cách dùng (QR khi đổi xong · 60 ngày · đưa mã ở quầy).
// Chưa có trong kho ⇒ «Thêm vào kho quà của <Con>» (POST qua/thu-vien {mau, con}); đã có ⇒ «Để con tự tích sao».
// Đã chọn (PR #236): CHƯA có cổng thanh toán trong app (màn «Thanh toán» bm-thiet-lap-con/27 cần cổng tiền thật — việc của Thanh/Nghi quyết) ⇒
// «Mua» = cho quà vào kho của con như voucher 06/11 (trao tay, không thu tiền trong app); màn ghi rõ chưa thu tiền.
// «Trao luôn cho <Con>» (quà đã ở kho của con) ⇒ POST qua/:id/trao-luon {con} (PR #253: trao ngay, không trừ sao). Voucher AiiCafe máy chủ chặn
// 409 `voucher_can_thanh_toan` (cần thanh toán — chưa có) ⇒ ẩn nút, ghi một câu; lỗi khác ⇒ câu dễ hiểu (lib/noi-1411 › loiTraoLuon).
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, LoiApi, type GiaDinh } from "@/lib/api";
import { loiTraoLuon, quaTrongKho, traoLuonDuoc, type DongQua } from "@/lib/noi-1411";
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
    const [tv, g, vi, quyen, kho] = await Promise.all([
      bm.goi<{ nhom: NhomThuVien[] }>(`qua/thu-vien${tham}`), bm.goi<GiaDinh>("gia-dinh"),
      con ? bm.goi<{ soDu: number; sao?: number }>(`con/${con}/vi`).catch(() => null) : null, quyenToi(),
      con ? bm.goi<{ ds: DongQua[] }>("qua").catch(() => null) : null,
    ]);
    const m = tv.nhom.flatMap((x) => x.ds).find((x) => x.ma === ma) ?? null;
    // quà (dòng rewards) đã ở kho của con ⇒ id để «Trao luôn»
    const trongKho = m && kho ? quaTrongKho(kho.ds, m.ma, m.ten, con, m.loai) : null;
    return { m, c: g.con.find((x) => x.id === con) ?? null, sao: vi ? vi.sao ?? vi.soDu : null, baMe: quyen === "ba_me", trongKho };
  });
  const { lam, loi: loiLam, dangChay, setLoi } = useLam();
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
  const qk = d.trongKho;
  // «Trao luôn»: chỉ Ba Mẹ, quà đã ở kho của con, không phải voucher (máy chủ 409 voucher_can_thanh_toan)
  const traoDuoc = d.baMe && m.daCo && !!con && !!qk && traoLuonDuoc(qk.loai);
  const voucherCho = d.baMe && m.daCo && !!con && !!qk && !traoLuonDuoc(qk.loai);
  const trao = () => lam(async () => {
    try {
      const r = await bm.goi<{ phut?: number }>(`qua/${qk!.id}/trao-luon`, { con });
      baoKhiVe(`Đã trao ${tenVoucher(m.ten)} cho ${ten}${r.phut ? ` · +${r.phut} phút chơi hôm nay` : ""}`);
      router.back();
    } catch (e) {
      const cau = e instanceof LoiApi ? loiTraoLuon(e.ma, ten) : null;
      if (cau) { setLoi(cau); return; }
      throw e;
    }
  });
  return (
    <Man lui={{ chu: "" }} tieu={tieu} day={
      traoDuoc ? (
        <>
          <BaoLoi loi={loiLam} />
          <Nut chu={`Trao luôn cho ${ten}`} rong dangChay={dangChay} bam={trao} />
          <Nut chu="Để con tự tích sao" loai="vien" rong bam={() => router.back()} />
        </>
      ) : m.daCo || !d.baMe ? (
        <>
          {voucherCho ? <Chu co={13} mau={M.chu3} style={{ textAlign: "center" }}>Voucher cần Ba Mẹ thanh toán trong app mới trao luôn được — phần này sắp có.</Chu> : null}
          <Nut chu="Để con tự tích sao" rong bam={() => router.back()} />
        </>
      ) : (
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
