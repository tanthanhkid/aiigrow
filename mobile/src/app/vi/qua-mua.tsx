// «Quà Ba Mẹ mua» (bàn 17/11 them-sp8ijd1b@v2; cùng ý bm-thiet-lap-con/26 them-hn2754ce): một voucher AiiGrow — tên, giá tiền,
// con đổi bằng N sao, «<Con> đang tích sao · Đang có X · Còn thiếu Y», cách dùng (QR khi đổi xong · 60 ngày · đưa mã ở quầy).
// Chưa có trong kho ⇒ «Thêm vào kho quà của <Con>» (POST qua/thu-vien {mau, con}); đã có ⇒ «Để con tự tích sao».
// Đã chọn (PR #236): CHƯA có cổng thanh toán trong app (màn «Thanh toán» bm-thiet-lap-con/27 cần cổng tiền thật — việc của Thanh/Nghi quyết) ⇒
// «Mua» = cho quà vào kho của con như voucher 06/11 (trao tay, không thu tiền trong app); màn ghi rõ chưa thu tiền.
// «Trao luôn cho <Con>» (quà đã ở kho của con) ⇒ POST qua/:id/trao-luon {con} (PR #253: trao ngay, không trừ sao). Voucher AiiCafe máy chủ chặn
// 409 `voucher_can_thanh_toan` (cần thanh toán — chưa có) ⇒ ẩn nút, ghi một câu; lỗi khác ⇒ câu dễ hiểu (lib/noi-1411 › loiTraoLuon).
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, LoiApi, type GiaDinh } from "@/lib/api";
import { loiTraoLuon, quaTrongKho, type DongQua } from "@/lib/noi-1411";
import { D } from "@/lib/diu";
import { KHOI } from "@/lib/clay";
import { quyenToi, tenGoi } from "@/lib/hang-ngay";
import { icQua, tenVoucher, type NhomThuVien } from "@/lib/s3";
import { OIcon } from "@/lib/ui-bm3";
import { BaoLoi, baoKhiVe, ChoTai, Chu, Dong, Icon3D, M, Man, Nhom, Nut, tien, useLam, useTai, type TenIcon } from "@/lib/ui";
import { soVN } from "@/lib/so-sao";

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
  const ten = d.c ? tenGoi(d.c.ten) : "con";
  const thieu = d.sao !== null ? Math.max(0, m.sao - d.sao) : null;
  const cafe = /AiiCafe/i.test(m.ten);
  const them = () => lam(async () => {
    await bm.goi("qua/thu-vien", { mau: [m.ma], ...(con ? { con } : {}) });
    baoKhiVe(`Đã cho ${tenVoucher(m.ten)} vào kho quà của ${ten}`);
    router.back();
  });
  const qk = d.trongKho;
  // «Trao luôn»: chỉ Ba Mẹ, quà đã ở kho của con, không phải voucher (máy chủ 409 voucher_can_thanh_toan)
  // bàn sp8ijd1b@v2 vẽ «Trao luôn» cả cho voucher ⇒ hiện nút; voucher thì máy chủ vẫn chặn 409 voucher_can_thanh_toan (chưa có thanh toán)
  // và màn báo câu dễ hiểu (loiTraoLuon) — logic không đổi
  const traoDuoc = d.baMe && m.daCo && !!con && !!qk;
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
          <Nut chu="Để con tự tích sao" loai="ma" rong bam={() => router.back()} />
        </>
      ) : m.daCo || !d.baMe ? (
        <>
          <Nut chu="Để con tự tích sao" rong bam={() => router.back()} />
        </>
      ) : (
        <>
          <BaoLoi loi={loiLam} />
          <Nut chu={`Cho vào kho quà của ${ten}`} rong dangChay={dangChay} tat={!con} bam={them} />
        </>
      )}>
      <View style={{ alignItems: "center", gap: 6, paddingTop: 6 }}>
        <View style={[{ width: 96, height: 96, borderRadius: 30, backgroundColor: M.the, alignItems: "center", justifyContent: "center" }, KHOI.the]}>
          <Icon3D ten={icQua(m) as TenIcon} co={60} />
        </View>
        <Chu kieu="rat" co={22} style={{ textAlign: "center" }}>{tenVoucher(m.ten)}</Chu>
        <Chu kieu="dam" co={13.5} mau={M.chu3}>{m.daCo ? `Của ${ten} · nằm sẵn trong kho quà` : m.moTa ?? `Quà AiiGrow cho ${ten}`}</Chu>
      </View>

      {/* thiết kế sp8ijd1b@v2: hai ô — «Ba Mẹ đã trả 20.000đ» (xu) · «Con đổi bằng 200 sao» (ô vàng) */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <OSo ic="xu" nhan={m.daCo ? "Ba Mẹ đã trả" : "Giá"} so={tien(m.menhGia ?? 0)} />
        <OSo ic="sao" nhan="Con đổi bằng" so={`${soVN(m.sao)} sao`} vang />
      </View>
      {!m.daCo ? <Chu co={12.5} mau={M.chu3} style={{ paddingHorizontal: 4 }}>Chưa thu tiền trong app — thanh toán đang được làm.</Chu> : null}

      {d.sao !== null ? (
        // «<Con> đang tích sao» + thẻ thanh tiến độ «Đang có 30 sao · Còn thiếu 170 sao»
        <>
          <Chu kieu="rat" co={15} mau={M.chu2} style={{ paddingHorizontal: 4 }}>{thieu ? `${ten} đang tích sao` : `${ten} đủ sao rồi`}</Chu>
          <View style={[{ padding: 16, borderRadius: 24, backgroundColor: M.the, gap: 8 }, KHOI.nho]}>
            <View style={{ height: 12, borderRadius: 6, backgroundColor: M.xamSoft, overflow: "hidden" }}>
              <View style={{ width: `${Math.round(Math.min(1, Math.max(0, d.sao) / Math.max(1, m.sao)) * 100)}%`, height: 12, borderRadius: 6, backgroundColor: M.diem }} />
            </View>
            {thieu ? (
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
                <Chu kieu="dam7" co={13} mau={M.chu2}>{d.sao < 0 ? "Đang nợ" : "Đang có"} <Chu kieu="rat" co={13} mau={d.sao < 0 ? D.loi : M.diemInk}>{`${soVN(Math.abs(d.sao))} sao`}</Chu></Chu>
                <Chu kieu="dam7" co={13} mau={M.chu2}>Cần thêm <Chu kieu="rat" co={13} mau={M.diemInk}>{`${soVN(thieu)} sao`}</Chu></Chu>
              </View>
            ) : <Chu kieu="dam7" co={13} mau={M.chu2}>Con tự đổi trên máy, Ba Mẹ nhận thông báo</Chu>}
          </View>
        </>
      ) : null}

      <Chu kieu="rat" co={16} style={{ paddingHorizontal: 4 }}>Cách dùng</Chu>
      <Nhom>
        <Dong dau tieu="Mã QR hiện khi con đổi xong" trai={<OIcon ic="khoa" />} />
        <Dong tieu="Dùng được 60 ngày từ lúc đổi" trai={<OIcon ic="lich" />} />
        <Dong tieu={cafe ? "Đưa mã ở quầy AiiCafe" : "Đưa mã cho AiiLab"} trai={<OIcon ic="coc" />} />
      </Nhom>
    </Man>
  );
}

/** Ô số (sp8ijd1b): icon 3D trong ô sáng · nhãn nhỏ · số đậm; `vang` = ô vàng «Con đổi bằng». */
function OSo({ ic, nhan, so, vang }: { ic: TenIcon; nhan: string; so: string; vang?: boolean }) {
  return (
    <View style={[{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: 24, backgroundColor: vang ? M.diemSoft : M.the }, KHOI.nho]}>
      <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: vang ? M.chonSoft : M.xamSoft, alignItems: "center", justifyContent: "center" }}><Icon3D ten={ic} co={26} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="dam7" co={12.5} mau={vang ? M.diemInk : M.chu2}>{nhan}</Chu>
        <Chu kieu="rat" co={17} mau={vang ? M.diemInk : M.chu} so>{so}</Chu>
      </View>
    </View>
  );
}
