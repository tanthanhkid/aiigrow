// them-canktzlq «Xoá hồ sơ <Con>?» (thiết kế chốt 14/11, bm-gio-ho-so/07 — màn riêng, thay bảng trượt 05/11): «Xoá rồi không lấy lại được.»
// + 3 hậu quả (máy của Con · Mất N sao, cả quà đang chờ trao · Mất báo cáo và cài đặt), «Xoá hồ sơ X» / «Giữ lại».
// «Xoá hồ sơ X» ⇒ POST con/:id/xoa {xacNhan: true} (PR #253 — xoá HẲN). Máy chủ KHÔNG gỡ máy: máy đã ghép của Con thành máy dùng chung
// (`mayChuyenDungChung`) ⇒ màn kết quả gợi ý từng máy «Máy của <Con khác>» (POST may/:id/gan-con) hoặc «Gỡ máy này» (⇒ /may/<id>?mo=go).
// Lỗi 409 `con_may` (bé cuối, nhà còn máy) / `con_thiet_bi_mang` (TV, console lọc mạng) ⇒ câu dễ hiểu + lối đi tiếp (lib/noi-1411 › loiXoaCon).
import { useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm, LoiApi, type GiaDinh } from "@/lib/api";
import { CAU_TRONG_GIUP, ManKetQua, quyenToi, type ConCt } from "@/lib/hang-ngay";
import { loiXoaCon } from "@/lib/noi-1411";
import { Bao, BaoLoi, CanhGiua, ChoTai, Chu, M, Man, Nut, The, TickDong, useHoanTac, useLam, useTai } from "@/lib/ui";

type KqXoa = { ok: true; ten: string; mayChuyenDungChung: { id: string; ten: string }[] };

export default function XoaHoSo() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { d, loi, matMang, tai } = useTai(async () => {
    const [con, q, g] = await Promise.all([bm.goi<ConCt>(`con/${id}`), quyenToi(), bm.goi<GiaDinh>("gia-dinh").catch(() => null)]);
    return { con, xem: q === "trong_giup", conKhac: (g?.con ?? []).filter((x) => x.id !== id).map((x) => ({ id: x.id, ten: x.ten })) };
  });
  const { lam, loi: loiLam, dangChay } = useLam();
  const [loiXoa, setLoiXoa] = useState<{ cau: string; loi: "may" | "ho_tro" | null } | null>(null);
  const [kq, setKq] = useState<KqXoa | null>(null);
  const ve = () => (router.canGoBack() ? router.back() : router.replace(`/ho-so/${id}` as never));
  if (kq) return <KetQua kq={kq} conKhac={d?.conKhac ?? []} />;
  if (!d) return <Man lui={{ chu: "Hồ sơ", ve: `/ho-so/${id}` }} tieu="Xoá hồ sơ"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const c = d.con;
  const sao = c.sao ?? c.soDu;
  const tenMay = c.may.map((m) => m.ten.replace(/ của .*$/, ""));
  const xoa = () => lam(async () => {
    setLoiXoa(null);
    try {
      setKq(await bm.goi<KqXoa>(`con/${id}/xoa`, { xacNhan: true }));
    } catch (e) {
      const l = e instanceof LoiApi ? loiXoaCon(e.ma, c.ten) : null;
      if (l) { setLoiXoa(l); return; }
      throw e;
    }
  });
  return (
    // lỗi 409 ⇒ khung lỗi + lối đi tiếp nằm ở ĐÁY (luôn thấy, không bị cuộn khuất); bấm xoá lại vô ích tới khi gỡ xong ⇒ ẩn nút xoá
    <Man lui={{ chu: "Hồ sơ", ve: `/ho-so/${id}` }} day={d.xem ? <Chu co={13.5} mau={M.chu3}>{CAU_TRONG_GIUP}</Chu> : loiXoa ? <>
      <Bao loai="loi" tieu={`Chưa xoá được hồ sơ ${c.ten}`} loi={loiXoa.cau}>
        {loiXoa.loi === "may" ? <Nut chu="Xem các máy" loai="vien" nho bam={() => router.push("/may")} /> : null}
        {loiXoa.loi === "may" ? <Nut chu="Thêm con" loai="vien" nho bam={() => router.push("/ho-so/them")} /> : null}
        {loiXoa.loi === "ho_tro" ? <Nut chu="Nhắn AiiGrow" loai="vien" nho bam={() => router.push("/ho-tro")} /> : null}
        {loiXoa.loi === null ? <Nut chu="Thử lại" loai="vien" nho bam={xoa} /> : null}
      </Bao>
      <Nut chu="Giữ lại" loai="ma" rong bam={ve} />
    </> : <>
      <BaoLoi loi={loiLam} />
      <Nut chu={`Xoá hồ sơ ${c.ten}`} loai="huy" rong dangChay={dangChay} bam={xoa} />
      <Nut chu="Giữ lại" loai="ma" rong bam={ve} />
    </>}>
      <CanhGiua lv="nghi" tieu={`Xoá hồ sơ ${c.ten}?`} loi="Xoá rồi không lấy lại được." />
      <View style={{ paddingHorizontal: 8 }}>
        {/* máy chủ không gỡ máy — máy thành «dùng chung», Ba Mẹ gắn cho con khác hoặc gỡ ở bước sau */}
        {c.may.length ? <TickDong trang="x" chu={`Grow thôi trông ${c.may.length} máy cho ${c.ten}`} phu={`${tenMay.join(" và ")} thành máy dùng chung`} /> : null}
        <TickDong trang="x" chu={`Mất ${sao} sao`} phu="Cả quà đang chờ trao" />
        <TickDong trang="x" chu="Mất báo cáo và cài đặt" phu="Nhiệm vụ, giờ chơi đã đặt" />
      </View>
    </Man>
  );
}

/** Đã xoá: máy của Con thành máy dùng chung ⇒ mỗi máy một thẻ: «Máy của <Con khác>» (gan-con) / «Gỡ máy này». */
function KetQua({ kq, conKhac }: { kq: KqXoa; conKhac: { id: string; ten: string }[] }) {
  const { bao, noi } = useHoanTac();
  const { lam, loi, dangChay } = useLam();
  const [daGan, setDaGan] = useState<Record<string, string>>({});
  const xong = () => router.replace("/hom-nay");
  const ganCon = (may: string, con: { id: string; ten: string }) => lam(async () => {
    await bm.goi(`may/${may}/gan-con`, { con: con.id });
    setDaGan((s) => ({ ...s, [may]: con.ten }));
    bao(`Đã gắn máy cho ${con.ten}`);
  });
  const may = kq.mayChuyenDungChung;
  return (
    <ManKetQua lv="rob-goc" tieu={`Đã xoá hồ sơ ${kq.ten}`} noi={noi}
      loi={may.length ? `${may.length} máy của ${kq.ten} thành máy dùng chung — gắn cho con khác hoặc gỡ máy.` : "Báo cáo, sao và cài đặt của con đã xoá."}
      chinh={{ chu: may.length ? "Xong" : "Về trang chủ", bam: xong }}>
      <BaoLoi loi={loi} />
      {may.map((m) => (
        <The key={m.id} style={{ gap: 8 }}>
          <Chu kieu="rat" co={16}>{m.ten}</Chu>
          <Chu co={13.5} mau={M.chu2}>{daGan[m.id] ? `Giờ là máy của ${daGan[m.id]}` : "Máy dùng chung · bé dùng máy chọn tên mình khi vào"}</Chu>
          {daGan[m.id] ? null : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {conKhac.map((c) => <Nut key={c.id} chu={`Máy của ${c.ten}`} loai="vien" nho dangChay={dangChay} bam={() => ganCon(m.id, c)} />)}
              <Nut chu="Gỡ máy này" loai="huy" nho bam={() => router.push({ pathname: "/may/[id]", params: { id: m.id, mo: "go" } })} />
            </View>
          )}
        </The>
      ))}
    </ManKetQua>
  );
}
