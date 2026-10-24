// bm-web «Trang web» (một màn một tính năng, mở từ Trang chủ): việc chính ở trên — chế độ, gõ tên trang rồi «Chặn» là xong (có Hoàn tác),
// nút nhanh cho trang hay gặp, danh sách «Đang chặn» có «Bỏ chặn» ngay trên dòng, trang Con vào nhiều nhất có «Chặn» ngay trên dòng;
// thống kê ở dưới. Chạm một dòng = bảng đủ lựa chọn Cho phép / Chặn / Mặc định / áp cả nhà. Máy Windows ở chế độ «Chặn thật» áp thẳng vào Chrome/Edge (server/lib/web.ts → agent-win WebGuard);
// chế độ Giám sát chỉ ghi lại. Chỉ ghi tên miền + thời gian, không ghi địa chỉ đầy đủ hay nội dung.
import { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { bm, type ConChiTiet, type ThongKeWeb, type TrangThaiWeb } from "@/lib/api";
import {
  BangTruot, Bao, BaoLoi, BieuTron, CanhGiua, ChoTai, ChonMot, Chu, CongTac, Dong, HaiNut, Icon, Luoi2, M, Man, Nhan, Nhom, NhomTieu, Nut, OChon, ONhap, OSo, truoc, useHoanTac, useLam, useTai,
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
/** Trang hay gặp — nút nhanh trên đầu màn. */
const NHANH = [{ muc: "youtube.com", ten: "YouTube" }, { muc: "tiktok.com", ten: "TikTok" }, { muc: "facebook.com", ten: "Facebook" }, { muc: "roblox.com", ten: "Roblox" }];
const tenMien = (t: string) => t.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").split(/[/?#]/)[0];

/** Nút nhỏ ngay trên dòng danh sách (Chặn / Bỏ chặn) — vùng chạm ≥ 44. */
function NutDong({ chu, loai, bam, tat }: { chu: string; loai: "do" | "vien"; bam: () => void; tat?: boolean }) {
  return (
    <Pressable onPress={bam} disabled={tat} accessibilityRole="button" accessibilityLabel={chu} hitSlop={6}
      style={{ minHeight: 44, paddingHorizontal: 12, borderRadius: 10, justifyContent: "center", borderWidth: 1, opacity: tat ? 0.5 : 1,
        borderColor: loai === "do" ? "#f3c9c4" : M.vien2, backgroundColor: loai === "do" ? M.loiSoft : "#fff" }}>
      <Chu kieu="dam" co={13.5} mau={loai === "do" ? M.loi : M.chu}>{chu}</Chu>
    </Pressable>
  );
}

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
  if (!d) return <Man lui={{ chu: "Trang chủ" }} tieu="Trang web"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;

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
    const m = tenMien(them);
    if (m) { setThem(""); mo(m); }
  };
  // Một chạm: chặn / bỏ chặn ngay, có Hoàn tác đưa về đúng luật cũ của Con
  const datNhanh = (muc: string, trangThai: Chon, caNhaLuat: boolean, hoan: { trangThai: Chon; caNha: boolean }, chu: string) => lam(async () => {
    await bm.goi(`con/${con}/web/trang`, { muc, trangThai, caNha: caNhaLuat });
    bao(chu, () => { bm.goi(`con/${con}/web/trang`, { muc, ...hoan }).then(() => tai(), () => tai()); });
    await tai();
  });
  /** luật riêng của Con trước khi đổi — Hoàn tác trả về đúng nó */
  const truocCua = (muc: string): Chon => {
    const cu = d.luat.find((l) => l.tenMien === muc && l.nguon === "con");
    return cu?.trangThai === "cho_phep" ? "cho_phep" : cu?.trangThai === "chan" ? "chan" : "mac_dinh";
  };
  const chanNgay = (muc: string) => {
    datNhanh(muc, "chan", false, { trangThai: truocCua(muc), caNha: false }, `Đã chặn ${muc} — áp lên máy trong vài phút`);
  };
  const boChan = (muc: string, nguon: string) =>
    datNhanh(muc, "mac_dinh", nguon === "gia_dinh", { trangThai: "chan", caNha: nguon === "gia_dinh" }, `Đã bỏ chặn ${muc}${nguon === "gia_dinh" ? " cho cả nhà" : ""}`);
  const dangChan = d.luat.filter((l) => l.trangThai === "chan");
  const biChan = (muc: string) => dangChan.some((l) => l.tenMien === muc);

  const lonNhat = Math.max(60, ...d.theoNgay.map((x) => x.giay));
  const chanThat = d.mayLoc.filter((m) => m.cheDo === "chan");
  const giamSat = d.mayLoc.filter((m) => m.cheDo !== "chan");
  const chuaCoSo = d.tongGiay === 0 && d.top.length === 0;
  return (
    <Man lui={{ chu: "Trang chủ" }} tieu="Trang web" noi={noi}>
      {!d.mayLoc.length ? (
        <Bao loai="canh" tieu="Chưa có máy Windows nào" ic="canh_bao" loi={`Chỉ máy Windows của ${ten} có AiiGrow mới ghi và chặn được web. Ghép máy ở Trang chủ › Máy tính & điện thoại.`} />
      ) : giamSat.length ? (
        <Bao loai="canh" tieu={`${giamSat.map((m) => m.ten).join(", ")} đang ở chế độ Giám sát`} ic="canh_bao"
          loi={`Máy chỉ ghi lại trang ${ten} vào, chưa chặn thật. Muốn chặn: Trang chủ › Máy tính & điện thoại › chọn «Chặn thật».`} />
      ) : null}

      <ChonMot ds={[{ gia: "mo" as const, chu: "Chặn từng trang" }, { gia: "chi_cho_phep" as const, chu: "Chỉ trang đã duyệt" }]} gia={d.cheDoWeb} doi={doiCheDo} />
      <Chu co={13} mau={M.chu3}>
        {d.cheDoWeb === "chi_cho_phep"
          ? `${ten} chỉ vào được trang bạn cho phép (và các trang học như Google Classroom, Zoom). Mọi trang khác bị chặn.`
          : `${ten} vào được mọi trang, trừ trang bạn chặn.`}
      </Chu>

      <ONhap nhan={d.cheDoWeb === "chi_cho_phep" ? "Thêm trang được vào" : "Chặn một trang"} value={them} onChangeText={setThem} placeholder="youtube.com"
        autoCapitalize="none" autoCorrect={false} keyboardType="url" onSubmitEditing={() => { const m = tenMien(them); if (m) { setThem(""); if (d.cheDoWeb === "chi_cho_phep") mo(m); else chanNgay(m); } }} />
      {tenMien(them) ? (
        <HaiNut>
          {d.cheDoWeb === "chi_cho_phep"
            ? <Nut chu={`Cho phép ${tenMien(them)}`} ic="tick" nho dangChay={dangChay} bam={() => { const m = tenMien(them); setThem(""); datNhanh(m, "cho_phep", false, { trangThai: truocCua(m), caNha: false }, `Đã cho phép ${m}`); }} />
            : <Nut chu={`Chặn ${tenMien(them)}`} ic="khoa" loai="huy" nho dangChay={dangChay} bam={() => { const m = tenMien(them); setThem(""); chanNgay(m); }} />}
          <Nut chu="Lựa chọn khác" nho loai="vien" bam={themTrang} />
        </HaiNut>
      ) : null}
      {sua ? null : <BaoLoi loi={loiLam} />}
      {d.cheDoWeb === "mo" ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {NHANH.map((x) => {
            const chan = biChan(x.muc);
            return (
              <Pressable key={x.muc} disabled={dangChay} accessibilityRole="button" accessibilityState={{ selected: chan }}
                accessibilityLabel={chan ? `${x.ten} đang chặn — chạm để bỏ chặn` : `Chặn ${x.ten}`}
                onPress={() => (chan ? boChan(x.muc, d.luat.find((l) => l.tenMien === x.muc && l.trangThai === "chan")?.nguon ?? "con") : chanNgay(x.muc))}
                style={{ flexDirection: "row", alignItems: "center", gap: 6, minHeight: 44, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1,
                  borderColor: chan ? "#f3c9c4" : M.vien2, backgroundColor: chan ? M.loiSoft : "#fff" }}>
                <Icon ten={chan ? "khoa" : "cong"} co={16} mau={chan ? M.loi : M.chu2} />
                <Chu kieu="dam" co={14} mau={chan ? M.loi : M.chu2}>{x.ten}</Chu>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {dangChan.length ? (
        <>
          <NhomTieu chu={`Đang chặn · ${dangChan.length}`} />
          <Nhom>
            {dangChan.map((l, i) => (
              <Dong key={`${l.nguon}-${l.tenMien}`} dau={i === 0} tieu={l.tenMien} phu={l.nguon === "gia_dinh" ? "Cả gia đình" : `Chỉ ${ten}`}
                trai={<BieuTron ic="khoa" mau="do" />} phai={<NutDong chu="Bỏ chặn" loai="vien" tat={dangChay} bam={() => boChan(l.tenMien, l.nguon)} />}
                bam={() => mo(l.tenMien)} />
            ))}
          </Nhom>
        </>
      ) : null}
      {d.luat.some((l) => l.trangThai !== "chan") ? (
        <>
          <NhomTieu chu="Luôn cho phép" />
          <Nhom>
            {d.luat.filter((l) => l.trangThai !== "chan").map((l, i) => (
              <Dong key={`${l.nguon}-${l.tenMien}`} dau={i === 0} tieu={l.tenMien} phu={l.nguon === "gia_dinh" ? "Cả gia đình" : `Chỉ ${ten}`}
                trai={<BieuTron ic="tick" />} phai={<Nhan chu={NHAN[l.trangThai][0]} loai={NHAN[l.trangThai][1]} />} bam={() => mo(l.tenMien)} />
            ))}
          </Nhom>
        </>
      ) : null}

      <NhomTieu chu={`${ten} vào nhiều nhất · ${d.soNgay} ngày`} />
      {d.top.length ? (
        <Nhom>
          {d.top.map((x, i) => (
            <Dong key={x.tenMien} dau={i === 0} tieu={x.tenMien}
              phu={`${thoiLuong(x.giay)} · ${x.soLan} lượt${x.lanCuoi ? ` · ${truoc(x.lanCuoi)}` : ""}`}
              trai={<BieuTron ic="web" mau={x.trangThai === "chan" ? "do" : x.trangThai === "cho_phep" ? "xanh" : "lam"} />}
              phai={x.trangThai === "he_thong" || x.trangThai === "chan" || x.trangThai === "cho_phep" || d.cheDoWeb === "chi_cho_phep"
                ? <Nhan chu={NHAN[x.trangThai][0]} loai={NHAN[x.trangThai][1]} />
                : <NutDong chu="Chặn" loai="do" tat={dangChay} bam={() => chanNgay(x.tenMien)} />}
              bam={x.trangThai === "he_thong" ? undefined : () => mo(x.tenMien)} />
          ))}
        </Nhom>
      ) : chuaCoSo ? (
        <CanhGiua lv="cho" tieu="Chưa có trang nào được ghi" loi={`Khi ${ten} dùng Chrome, Edge, Brave hoặc Cốc Cốc trên máy Windows có AiiGrow, các trang sẽ hiện ở đây sau khoảng 5 phút.`} />
      ) : <Chu co={14} mau={M.chu3}>Hôm nay chưa vào trang nào.</Chu>}
      {d.tatCa > d.top.length ? <Chu co={13} mau={M.chu3}>{`Hiện ${d.top.length} trang vào nhiều nhất, còn ${d.tatCa - d.top.length} trang nữa.`}</Chu> : null}

      <NhomTieu chu="Thời gian trên web" />
      <Luoi2>
        <OSo nho="Hôm nay" so={thoiLuong(d.homNay.giay)} phu={`${d.homNay.soTrang} trang · ${d.homNay.soLan} lượt mở`} />
        <OSo nho={`${d.soNgay} ngày qua`} so={thoiLuong(d.tongGiay)} phu={`${d.tatCa} trang khác nhau`} />
      </Luoi2>
      <View accessibilityLabel={`Biểu đồ thời gian trên web ${d.soNgay} ngày`} style={{ flexDirection: "row", alignItems: "flex-end", gap: 8, height: 96, paddingHorizontal: 4 }}>
        {d.theoNgay.map((x, i) => (
          <View key={x.ngay} style={{ flex: 1, alignItems: "center", gap: 4, height: "100%", justifyContent: "flex-end" }}>
            <View style={{ width: "100%", maxWidth: 34, height: Math.max(3, (x.giay / lonNhat) * 64), borderRadius: 6, backgroundColor: i === d.theoNgay.length - 1 ? M.chinh : M.chinhSoft }} />
            <Chu co={12} mau={M.chu3}>{thuCua(x.ngay)}</Chu>
          </View>
        ))}
      </View>

      <Chu co={13} mau={M.chu3}>
        {chanThat.length ? `Đang chặn thật trên ${chanThat.map((m) => m.ten).join(", ")}: trang bị chặn hiện «bị chặn» trong Chrome, Edge, Brave, Cốc Cốc (trình duyệt khác như Firefox chưa được lọc). Luật áp cho mọi tài khoản Windows trên máy. ` : ""}
        Luật lên máy trong vài phút khi máy online; tab đang mở cần tải lại. Chỉ ghi tên miền và thời gian, không ghi địa chỉ đầy đủ hay nội dung.
      </Chu>

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
