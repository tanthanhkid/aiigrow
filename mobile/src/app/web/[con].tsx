// bm-web: web của Con — thống kê (hôm nay, 7 ngày, trang vào nhiều nhất) + quyết định từng trang: Cho phép / Chặn / Mặc định,
// hoặc chế độ «Chỉ cho phép». Máy Windows ở chế độ «Chặn thật» áp thẳng vào Chrome/Edge (server/lib/web.ts → agent-win WebGuard);
// chế độ Giám sát chỉ ghi lại. Chỉ ghi tên miền + thời gian, không ghi địa chỉ đầy đủ hay nội dung.
import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, type ConChiTiet, type ThongKeWeb, type TrangThaiWeb } from "@/lib/api";
import {
  BangTruot, Bao, BaoLoi, BieuTron, CanhGiua, ChoTai, ChonMot, Chu, CongTac, Dong, Luoi2, M, Man, Nhan, Nhom, NhomTieu, Nut, OChon, ONhap, OSo, truoc, useHoanTac, useLam, useTai,
} from "@/lib/ui";

type Chon = "cho_phep" | "chan" | "mac_dinh";
const NHAN: Record<TrangThaiWeb, [string, "ok" | "loi" | "diem" | "lam" | "xam"]> = {
  cho_phep: ["Cho phép", "ok"], chan: ["Chặn", "loi"], giai_tri: ["Giải trí", "diem"], he_thong: ["Luôn mở", "lam"], chua_xep: ["Chưa xếp", "xam"],
};
const THU = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** 3720 giây → «1 giờ 2 phút»; dưới 1 phút → «< 1 phút». */
function thoiLuong(giay: number): string {
  const p = Math.round(giay / 60);
  if (giay <= 0) return "0 phút";
  if (p < 1) return "< 1 phút";
  return p >= 60 ? `${Math.floor(p / 60)} giờ${p % 60 ? ` ${p % 60} phút` : ""}` : `${p} phút`;
}
const thuCua = (ngay: string) => THU[new Date(`${ngay}T12:00:00`).getDay()] ?? "";

export default function WebCon() {
  const { con } = useLocalSearchParams<{ con: string }>();
  const { d, loi, matMang, tai } = useTai(() => bm.goi<ThongKeWeb>(`con/${con}/web?ngay=7`));
  const ten = useTai(() => bm.goi<ConChiTiet>(`con/${con}`)).d?.ten ?? "Con";
  const [sua, setSua] = useState<string | null>(null);
  const [chon, setChon] = useState<Chon>("chan");
  const [caNha, setCaNha] = useState(false);
  const [them, setThem] = useState("");
  const { lam, loi: loiLam, dangChay } = useLam();
  const { bao, noi } = useHoanTac();
  if (!d) return <Man lui={{ chu: "Cài đặt" }} tieu={`Web của ${ten}`}><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;

  const hienTai = (muc: string) => d.luat.find((l) => l.tenMien === muc);
  const mo = (muc: string) => { setSua(muc); setChon(hienTai(muc)?.trangThai === "cho_phep" ? "cho_phep" : "chan"); setCaNha(hienTai(muc)?.nguon === "gia_dinh"); };
  const luu = () => lam(async () => {
    await bm.goi(`con/${con}/web/trang`, { muc: sua, trangThai: chon, caNha });
    bao(chon === "mac_dinh" ? `Đã bỏ luật cho ${sua}` : `Đã ${chon === "chan" ? "chặn" : "cho phép"} ${sua}${caNha ? " cho cả nhà" : ""}`);
    setSua(null);
    await tai();
  });
  const doiCheDo = (v: "mo" | "chi_cho_phep") => lam(async () => {
    await bm.goi(`con/${con}/cau-hinh`, { web_chi_cho_phep: v === "chi_cho_phep" ? 1 : 0 });
    bao(v === "chi_cho_phep" ? `${ten} chỉ vào được trang bạn cho phép` : `${ten} vào được mọi trang trừ trang bị chặn`);
    await tai();
  }, { hangDoi: true });
  const themTrang = () => {
    const m = them.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];
    if (m) { setThem(""); mo(m); }
  };

  const lonNhat = Math.max(60, ...d.theoNgay.map((x) => x.giay));
  const chanThat = d.mayLoc.filter((m) => m.cheDo === "chan");
  const giamSat = d.mayLoc.filter((m) => m.cheDo !== "chan");
  const chuaCoSo = d.tongGiay === 0 && d.top.length === 0;
  return (
    <Man lui={{ chu: "Cài đặt" }} tieu={`Web của ${ten}`} noi={noi}>
      {!d.mayLoc.length ? (
        <Bao loai="canh" tieu="Chưa có máy Windows nào" ic="canh_bao" loi={`Chỉ máy Windows của ${ten} có AiiGrow mới ghi và chặn được web. Ghép máy ở Hồ sơ Con.`} />
      ) : giamSat.length ? (
        <Bao loai="canh" tieu={`${giamSat.map((m) => m.ten).join(", ")} đang ở chế độ Giám sát`} ic="canh_bao"
          loi={`Máy chỉ ghi lại trang ${ten} vào, chưa chặn thật. Muốn chặn: Cài đặt › An toàn thiết bị › chọn «Chặn thật».`} />
      ) : (
        <Bao loai="ok" tieu={`Đang chặn thật trên ${chanThat.length} máy`} ic="khien"
          loi="Trang bị chặn hiện thông báo «bị chặn» trong Chrome, Edge, Brave. Trình duyệt khác (Firefox…) chưa được lọc. Luật áp cho mọi tài khoản Windows trên máy — Ba Mẹ dùng máy đó thì chuyển về Giám sát." />
      )}

      <Luoi2>
        <OSo nho="Hôm nay" so={thoiLuong(d.homNay.giay)} phu={`${d.homNay.soTrang} trang · ${d.homNay.soLan} lượt mở`} />
        <OSo nho={`${d.soNgay} ngày qua`} so={thoiLuong(d.tongGiay)} phu={`${d.tatCa} trang khác nhau`} />
      </Luoi2>

      <NhomTieu chu={`Thời gian trên web ${d.soNgay} ngày qua`} />
      <View accessibilityLabel={`Biểu đồ thời gian trên web ${d.soNgay} ngày`} style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: 96, paddingHorizontal: 4 }}>
        {d.theoNgay.map((x, i) => (
          <View key={x.ngay} style={{ flex: 1, alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
            <View style={{ width: "100%", maxWidth: 34, height: Math.max(3, (x.giay / lonNhat) * 64), borderRadius: 6, backgroundColor: i === d.theoNgay.length - 1 ? M.chinh : M.chinhSoft }} />
            <Chu co={12} mau={M.chu3}>{thuCua(x.ngay)}</Chu>
          </View>
        ))}
      </View>

      <NhomTieu chu="Chế độ web" />
      <ChonMot ds={[{ gia: "mo" as const, chu: "Mở, chặn từng trang" }, { gia: "chi_cho_phep" as const, chu: "Chỉ cho phép" }]} gia={d.cheDoWeb} doi={doiCheDo} />
      <Chu co={13} mau={M.chu3}>
        {d.cheDoWeb === "chi_cho_phep"
          ? `${ten} chỉ vào được trang bạn cho phép (và các trang học như Google Classroom, Zoom). Mọi trang khác bị chặn.`
          : `${ten} vào được mọi trang, trừ trang bạn chặn.`}
      </Chu>

      <NhomTieu chu="Trang đã vào" />
      <ONhap nhan="Thêm trang theo tên miền" value={them} onChangeText={setThem} placeholder="gamek.vn" autoCapitalize="none" autoCorrect={false} keyboardType="url" onSubmitEditing={themTrang} />
      {them.trim() ? <Nut chu={`Đặt luật cho «${them.trim()}»`} nho loai="vien" ic="cong" bam={themTrang} /> : null}
      {d.top.length ? (
        <Nhom>
          {d.top.map((x, i) => (
            <Dong key={x.tenMien} dau={i === 0} tieu={x.tenMien}
              phu={`${thoiLuong(x.giay)} · ${x.soLan} lượt${x.lanCuoi ? ` · ${truoc(x.lanCuoi)}` : ""}`}
              trai={<BieuTron ic="web" mau={x.trangThai === "chan" ? "do" : x.trangThai === "cho_phep" ? "xanh" : "cam"} />}
              phai={<Nhan chu={NHAN[x.trangThai][0]} loai={NHAN[x.trangThai][1]} />}
              bam={x.trangThai === "he_thong" ? undefined : () => mo(x.tenMien)} />
          ))}
        </Nhom>
      ) : chuaCoSo ? (
        <CanhGiua lv="cho" tieu="Chưa có trang nào được ghi" loi={`Khi ${ten} dùng Chrome, Edge hoặc Brave trên máy Windows có AiiGrow, các trang sẽ hiện ở đây sau khoảng 5 phút.`} />
      ) : null}
      {d.tatCa > d.top.length ? <Chu co={13} mau={M.chu3}>{`Hiện ${d.top.length} trang vào nhiều nhất, còn ${d.tatCa - d.top.length} trang nữa.`}</Chu> : null}

      {d.luat.length ? (
        <>
          <NhomTieu chu="Luật đang áp" />
          <Nhom>
            {d.luat.map((l, i) => (
              <Dong key={`${l.nguon}-${l.tenMien}`} dau={i === 0} tieu={l.tenMien} phu={l.nguon === "gia_dinh" ? "Cả gia đình" : `Chỉ ${ten}`}
                trai={<BieuTron ic={l.trangThai === "chan" ? "khoa" : "tick"} mau={l.trangThai === "chan" ? "do" : "xanh"} />}
                phai={<Nhan chu={NHAN[l.trangThai][0]} loai={NHAN[l.trangThai][1]} />} bam={() => mo(l.tenMien)} />
            ))}
          </Nhom>
        </>
      ) : null}

      <Chu co={13} mau={M.chu3}>Chỉ ghi tên miền và thời gian, không ghi địa chỉ đầy đủ hay nội dung. Thời gian tính theo lúc trang mở nên chỉ gần đúng. Luật có hiệu lực trên máy trong vòng 3 phút khi máy online; tab đang mở cần tải lại.</Chu>

      <BangTruot mo={!!sua} dong={() => setSua(null)} tieu={sua ?? ""}>
        <View style={{ gap: 8 }}>
          <OChon chon={chon === "chan"} bam={() => setChon("chan")} trai={<BieuTron ic="khoa" mau="do" />} tieu="Chặn" phu={`${ten} không mở được (gồm cả tên miền con)`} />
          <OChon chon={chon === "cho_phep"} bam={() => setChon("cho_phep")} trai={<BieuTron ic="tick" />} tieu="Cho phép" phu={d.cheDoWeb === "chi_cho_phep" ? `${ten} được vào trang này` : "Luôn mở được, kể cả khi chặn cả nhóm trang"} />
          <OChon chon={chon === "mac_dinh"} bam={() => setChon("mac_dinh")} trai={<BieuTron ic="luoi" mau="lam" />} tieu="Mặc định" phu="Bỏ luật, theo phân loại chung" />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <Chu co={14} mau={M.chu2} style={{ flex: 1 }}>{`Áp cho cả gia đình, không chỉ ${ten}`}</Chu>
          <CongTac bat={caNha} doi={setCaNha} nhan="Áp cho cả gia đình" />
        </View>
        <BaoLoi loi={loiLam} />
        <Nut chu="Lưu" rong dangChay={dangChay} bam={luu} />
      </BangTruot>
    </Man>
  );
}
