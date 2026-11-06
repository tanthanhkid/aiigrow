// them-s416tfdj «Sao đổi được quà gì?» (bước 3/5 Lần đầu, thiết kế chốt 06/11 — L14 L15): Rob chọn sẵn 7 quà theo bảng giá (GET qua/mac-dinh),
// Ba Mẹ bỏ tick món không hợp; «Lưu N quà, sang giờ chơi» ⇒ POST qua/mac-dinh {chon} (tạo món được tick còn thiếu, bỏ món bị bỏ tick chưa ai đổi) ⇒ Giờ chơi.
// Quay lại màn này: tick theo quà nhà đang có (`daCo`). Giá sửa sau ở Hồ sơ › Quà.
import { useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type GiaDinh } from "@/lib/api";
import { BONG } from "@/lib/clay";
import { DauMan, TieuDe } from "@/lib/lan-dau";
import { cauLuuQuaLanDau, icQua, phuQua, type MauQua } from "@/lib/s3";
import { layTl } from "@/lib/thiet-lap";
import { BaoLoi, ChoTai, Chu, Icon, M, Man, Nut, The, useLam, useTai } from "@/lib/ui";
import { GiaSao, OHinhQua, ThanhBuoc5 } from "@/lib/ui-s3";

export default function ObQua() {
  const tl = layTl();
  const ten = tl.tenCon ?? "con";
  const { d, loi: loiTai, matMang, tai } = useTai(async () => {
    const [m, g] = await Promise.all([bm.goi<{ ds: MauQua[] }>("qua/mac-dinh"), bm.goi<GiaDinh>("gia-dinh").catch(() => null)]);
    return { ds: m.ds, nhieuCon: (g?.con.length ?? 1) > 1 };
  });
  const [bo, setBo] = useState<Record<string, boolean> | null>(null);          // mã ⇒ true = bỏ tick (null = theo dữ liệu máy chủ)
  const { lam, loi, dangChay } = useLam();
  const ds = d?.ds ?? [];
  const coSan = ds.some((m) => m.daCo);
  const boTick = bo ?? Object.fromEntries(ds.map((m) => [m.ma, coSan && !m.daCo]));
  const chon = ds.filter((m) => !boTick[m.ma]);
  const luu = () => lam(async () => {
    // quà mặc định dùng chung cả nhà: nhà đã có con khác ⇒ bỏ tick KHÔNG xoá quà anh chị em đang dùng (chỉ thêm món được tick còn thiếu)
    const giu = d!.nhieuCon ? ds.filter((m) => m.daCo).map((m) => m.ma) : [];
    await bm.goi("qua/mac-dinh", { chon: [...new Set([...chon.map((m) => m.ma), ...giu])] });
    router.push("/thiet-lap/gio");
  });
  const dau = <DauMan ve="/thiet-lap/mau" phai={<ThanhBuoc5 dang={2} />} />;
  if (!d) {
    return (
      <Man dau={dau} day={matMang || loiTai ? <Nut chu="Bỏ qua, sang giờ chơi" loai="vien" rong bam={() => router.push("/thiet-lap/gio")} /> : undefined}>
        <TieuDe chu="Sao đổi được quà gì?" />
        <ChoTai loi={loiTai} matMang={matMang} tai={tai} />
      </Man>
    );
  }
  return (
    <Man dau={dau}
      day={<><BaoLoi loi={loi} />
        <Chu kieu="dam" co={13.5} mau={M.chu2} style={{ textAlign: "center" }}>Con chọn quà → Ba Mẹ trao → mới trừ sao</Chu>
        <Nut chu={cauLuuQuaLanDau(chon.length)} rong dangChay={dangChay} bam={luu} /></>}>
      <TieuDe chu="Sao đổi được quà gì?" phu={`Rob chọn sẵn ${ds.length} quà cho ${ten}. Bỏ tick món không hợp, sửa giá sau cũng được.`} />
      <The sat>
        {ds.map((m, i) => {
          const co = !boTick[m.ma];
          // dòng phụ chỉ khi có điều kiện cần biết (Ba Mẹ trao / Chỉ cuối tuần / Còn 1 bộ) — đúng màn thiết kế
          const p = phuQua({ moTa: m.moTa, chiCuoiTuan: m.chiCuoiTuan, tonKho: m.tonKho, toiDaThang: null, canXacNhan: !!m.canXacNhan, laVoucher: m.loai === "voucher", menhGia: m.menhGia });
          return (
            <Pressable key={m.ma} onPress={() => setBo({ ...boTick, [m.ma]: co })} accessibilityRole="checkbox" accessibilityState={{ checked: co }}
              accessibilityLabel={`${m.ten}, ${m.sao} sao`}
              style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 14, minHeight: 64, borderTopWidth: i ? 1 : 0, borderTopColor: "#efefec" }}>
              <OHinhQua ic={icQua(m)} co={44} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Chu kieu="rat" co={15.5}>{m.loai === "voucher" && !/^Voucher/i.test(m.ten) ? `Voucher ${m.ten}` : m.ten}</Chu>
                {p.nhan ? <Chu co={13} mau={M.chu3}>{p.chu}</Chu> : null}
              </View>
              <GiaSao n={m.sao} chu={String(m.sao)} />
              <View style={{ width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", backgroundColor: co ? M.chinh : "#e6e5e1", boxShadow: co ? BONG.ngoc : BONG.lom }}>
                {co ? <Icon ten="tick" mau="#fff" co={16} /> : null}
              </View>
            </Pressable>
          );
        })}
      </The>
    </Man>
  );
}
