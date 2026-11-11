// «Cảnh báo» (thiết kế chốt 05/11, bm-duyet/04 — chữ «sao»): «Ba Mẹ cần sửa · n» (máy mất bảo vệ, bị gỡ, ngoài vòng…) / «AiiGrow đã tự xử lý · n»
// (giờ máy bị đổi đã khoá trò chơi, ảnh trùng…) / «Rob gợi ý · Ba Mẹ chọn» khi ngoại lệ tăng (giao thêm nhiệm vụ, cho con tự đổi sao khi hết giờ).
// Bấm một cảnh báo ⇒ chi tiết (canh-bao/[id]). AiiGrow không đọc tin nhắn hay nội dung trang web.
import { useState } from "react";
import { router } from "expo-router";
import { View } from "react-native";
import { bm, type CanhBao, type GiaDinh } from "@/lib/api";
import { HangViec, quyenToi } from "@/lib/hang-ngay";
import { BaoLoi, CanhGiua, ChoTai, Chu, gioPhut, HaiNut, M, Man, Nhan, Nut, The, useHoanTac, useLam, useTai, type TenIcon } from "@/lib/ui";

/** Loại cảnh báo AiiGrow đã tự xử lý (máy tự khoá / tự ghi nhận) — còn lại Ba Mẹ cần xem / sửa. */
const TU_XU_LY = ["lech_gio", "bang_chung_trung", "doi_che_do", "mo_khan_cap", "nhac_duyet", "dns_vuot_gio"];
const IC: Record<string, TenIcon> = { lech_gio: "dongho", offline_lau: "wifi", may_ngoai_vong: "wifi", bang_chung_trung: "camera", go_may: "thoat", may_thu_go: "thoat", may_chuyen_nha: "thoat" };

export default function DsCanhBao() {
  const { d, loi, matMang, tai } = useTai(async () => {
    const [cb, g, q] = await Promise.all([bm.goi<{ ds: CanhBao[] }>("canh-bao"), bm.goi<GiaDinh>("gia-dinh"), quyenToi()]);
    return { ds: cb.ds, g, xem: q === "trong_giup" };
  });
  const { lam, loi: loiLam } = useLam();
  const { bao, noi } = useHoanTac();
  const [boQua, setBoQua] = useState<string[]>([]);       // «Bỏ qua» gợi ý — chỉ ẩn trên màn này, không đổi cấu hình
  if (!d) return <Man lui={{ chu: "Quay lại" }} tieu="Cảnh báo"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  const ten = (id: string | null) => d.g.con.find((c) => c.id === id)?.ten ?? "";
  const ngoaiLe = d.ds.filter((x) => x.loai.startsWith("ngoai_le") || x.loai === "lech_nguoi_duyet");
  const tuXuLy = d.ds.filter((x) => TU_XU_LY.includes(x.loai));
  const canSua = d.ds.filter((x) => !ngoaiLe.includes(x) && !tuXuLy.includes(x));
  if (!d.ds.length) {
    return (
      <Man lui={{ chu: "Quay lại" }} tieu="Cảnh báo">
        <CanhGiua lv="ngu" tieu="Tuần này yên ả" loi="Máy nào cũng được bảo vệ, không có gì cần Ba Mẹ sửa.">
          <Nut chu="Xem báo cáo tuần" bam={() => router.push("/bao-cao")} />
        </CanhGiua>
      </Man>
    );
  }
  const conNl = ngoaiLe.find((x) => x.child_id)?.child_id ?? null;
  const dong = (x: CanhBao, k: number, xong?: boolean) => (
    <HangViec key={x.id} dau={k === 0} ic={IC[x.loai] ?? "canh_bao"} mau={xong ? "xanh" : x.muc === "nghiem_trong" ? "do" : "cam"} tieu={x.noi_dung}
      phu={`${ten(x.child_id) ? `${ten(x.child_id)} · ` : ""}${gioPhut(x.created_at)}`}
      phai={xong ? <Nhan chu={x.loai === "lech_gio" ? "Đã khoá trò chơi" : "Đã xử lý"} loai="ok" /> : <Nhan chu="Sửa" loai="canh" />}
      bam={() => router.push(`/canh-bao/${x.id}` as never)} />
  );
  return (
    <Man lui={{ chu: "Quay lại" }} tieu="Cảnh báo" noi={noi} tai={tai}>
      {canSua.length ? (
        <>
          <Chu kieu="rat" co={17} style={{ marginHorizontal: 4 }}>{`Ba Mẹ cần sửa · ${canSua.length}`}</Chu>
          <The dem style={{ paddingVertical: 4 }}>{canSua.map((x, k) => dong(x, k))}</The>
        </>
      ) : null}
      {tuXuLy.length ? (
        <>
          <Chu kieu="rat" co={17} style={{ marginTop: 6, marginHorizontal: 4 }}>{`AiiGrow đã tự xử lý · ${tuXuLy.length}`}</Chu>
          <The dem style={{ paddingVertical: 4 }}>{tuXuLy.map((x, k) => dong(x, k, true))}</The>
        </>
      ) : null}
      {ngoaiLe.length && conNl ? (
        <>
          <Chu kieu="rat" co={17} style={{ marginTop: 6, marginHorizontal: 4 }}>Rob gợi ý · Ba Mẹ chọn</Chu>
          <Chu co={13.5} mau={M.chu2} style={{ marginHorizontal: 4 }}>{ngoaiLe[0].noi_dung}</Chu>
          {boQua.includes("giao") ? null : (
            <The dem style={{ gap: 8 }}>
              <Chu kieu="rat">{`Giao thêm nhiệm vụ cho ${ten(conNl)}`}</Chu>
              <Chu co={13.5} mau={M.chu3}>Con tự kiếm sao, rồi đổi sao lấy phút chơi — bớt phải xin Ba Mẹ.</Chu>
              {d.xem ? null : <HaiNut><Nut chu="Giao nhiệm vụ" nho bam={() => router.push(`/giao-nv?con=${conNl}` as never)} />
                <Nut chu="Bỏ qua" nho loai="vien" bam={() => setBoQua((x) => [...x, "giao"])} /></HaiNut>}
            </The>
          )}
          {boQua.includes("doi") ? null : (
            <The dem style={{ gap: 8 }}>
              <Chu kieu="rat">Cho con tự đổi sao khi hết giờ</Chu>
              <Chu co={13.5} mau={M.chu3}>10 sao = 10 phút, không cần hỏi Ba Mẹ. Mọi lần đổi vẫn hiện trong Báo cáo.</Chu>
              {d.xem ? null : <HaiNut>
                <Nut chu="Bật" nho loai="vien" bam={() => lam(async () => { await bm.goi(`con/${conNl}/gio-choi`, { doiSaoBat: true }); setBoQua((x) => [...x, "doi"]); bao(`Đã cho ${ten(conNl)} tự đổi sao khi hết giờ`); })} />
                <Nut chu="Bỏ qua" nho loai="ma" bam={() => setBoQua((x) => [...x, "doi"])} /></HaiNut>}
            </The>
          )}
          <BaoLoi loi={loiLam} />
        </>
      ) : null}
      <View style={{ paddingHorizontal: 8 }}>
        <Chu co={13} mau={M.chu3}>AiiGrow chỉ biết giờ máy và app đang mở, không đọc tin nhắn hay nội dung trang web.</Chu>
      </View>
    </Man>
  );
}
