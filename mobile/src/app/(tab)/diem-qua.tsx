// Tab «Nhiệm vụ» (thiết kế chốt 05/11 bm-hang-ngay/36, trống 37): chip đổi Con → ví sao (đổi được bao nhiêu phút) → việc chờ Ba Mẹ duyệt
// (mỗi việc mở THẲNG màn bằng chứng) → quà con đã đổi chờ trao (bảng trượt «Đã trao … chưa?», them-5otw85h4 — 06/11: sao GIỮ, trao mới trừ, huỷ hoàn; lib/trao-qua) → việc mỗi ngày theo bộ
// (bấm một việc để sửa) → «Giao thêm việc». Người trông giúp: duyệt + trao quà được; giao / sửa việc ẩn (đổi cài đặt — quyen.ts).
import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { bm } from "@/lib/api";
import { KHOI } from "@/lib/clay";
import {
  BieuTron, ChoTai, Chu, gioPhut, Icon, M, Man, Nut, The, useHoanTac, useTai,
} from "@/lib/ui";
import { cachBao, cauLapLai, ChipCon, HangViec, hinhNv, SaoVien, TieuMuc, tuoiCua, type LuotChoMoi, type PhieuCho } from "@/lib/hang-ngay";
import { KHOA_NV_TAB, napNvTab, TEN_BO, viecCuaCon } from "@/lib/nv-tab";
import { BangTraoQua } from "@/lib/trao-qua";

/** «hôm nay 18:40» / «hôm qua» / «3/11». */
const khiNao = (iso: string) => {
  const t = new Date(iso), h = new Date();
  if (t.toDateString() === h.toDateString()) return `hôm nay ${gioPhut(t)}`;
  h.setDate(h.getDate() - 1);
  return t.toDateString() === h.toDateString() ? "hôm qua" : `${t.getDate()}/${t.getMonth() + 1}`;
};
/** «2 ảnh · nộp lúc 18:40» / «Ghi âm · nộp lúc 17:15». */
const phuLuot = (x: LuotChoMoi) => {
  const bc = x.so_ghi_am ? "Ghi âm" : x.so_anh ? `${x.so_anh} ảnh` : x.bang_chung === "xong" ? "Bấm «Xong»" : x.ghi_chu ? "Con viết" : "";
  return [bc, `nộp lúc ${gioPhut(x.nop_luc)}`].filter(Boolean).join(" · ");
};

export default function TabNhiemVu() {
  const { d, loi, matMang, tai } = useTai(napNvTab, KHOA_NV_TAB);
  const [chon, setChon] = useState<string | null>(null);
  const [trao, setTrao] = useState<PhieuCho | null>(null);
  const { bao, noi } = useHoanTac();
  const c = d ? d.g.con.find((x) => x.id === chon) ?? d.g.con[0] : undefined;
  const cua = useMemo(() => {
    if (!d || !c) return null;
    const viec = viecCuaCon(d.nv, c.id);
    const bo = viec.find((x) => x.bo)?.bo ?? null;
    return {
      viec, bo,
      cho: d.cd.nhiemVu.filter((x) => x.child_id === c.id),
      phieu: (d.cd.phieu ?? []).filter((x) => x.child_id === c.id),
    };
  }, [d, c]);
  if (!d) return <Man tieuLon="Nhiệm vụ" chat><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  if (!c || !cua) {
    return (
      <Man tieuLon="Nhiệm vụ" chat>
        <The><Chu mau={M.chu2}>Chưa có hồ sơ con nào. Thêm con ở «Cả nhà» để giao việc.</Chu></The>
      </Man>
    );
  }
  const baMe = d.quyen === "ba_me";
  const sao = (c as { sao?: number }).sao ?? c.soDu;
  return (
    <Man tieuLon="Nhiệm vụ" chat tai={tai} vongTai noi={noi}>
      <ChipCon ds={d.g.con} chon={c.id} doi={(x) => setChon(x.id)} />

      <Pressable onPress={() => router.push(`/vi/${c.id}` as never)} accessibilityRole="button" accessibilityLabel={`Ví sao của ${c.ten}`}
        style={[{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 28, backgroundColor: M.diemSoft }, KHOI.the]}>
        <BieuTron ic="sao" mau="vang" lon />
        <View style={{ flex: 1 }}>
          <Chu kieu="rat" co={17} mau={M.diemInk}>{`${c.ten} đang có ${sao} sao`}</Chu>
          <Chu co={13.5} mau={M.diemInk}>{c.phutDoiDuoc !== undefined ? `Đổi được ${c.phutDoiDuoc} phút chơi` : "Xem ví sao"}</Chu>
        </View>
        <Icon ten="phai" mau={M.diemInk} co={18} />
      </Pressable>

      {cua.cho.length ? (
        <>
          <TieuMuc chu="Chờ Ba Mẹ duyệt" so={cua.cho.length} />
          <The>
            {cua.cho.map((x, i) => {
              const [ic, mau] = hinhNv(x);
              return <HangViec key={x.id} dau={i === 0} ic={x.so_ghi_am ? "tin" : ic} mau={mau} tieu={x.ten} phu={phuLuot(x)}
                phai={<SaoVien n={x.sao ?? x.diem} nho />} bam={() => router.push(`/duyet/${x.id}` as never)} nhanDoc={`Xem bằng chứng ${x.ten}`} />;
            })}
            <View style={{ marginTop: 10 }}>
              <Nut chu={`Xem bằng chứng, duyệt ${cua.cho.length} việc`} ic="tick" rong bam={() => router.push(`/duyet?con=${c.id}` as never)} />
            </View>
          </The>
        </>
      ) : null}

      {cua.phieu.length ? (
        <>
          <TieuMuc chu="Con đã đổi quà, chờ trao" phai={{ chu: "Quà ›", bam: () => router.push("/vi/qua" as never) }} />
          <The>
            {cua.phieu.map((p, i) => (
              <HangViec key={p.id} dau={i === 0} ic="qua" mau="cam" tieu={p.ten} phu={`Đang giữ ${p.diem} sao · ${khiNao(p.created_at)}`}
                phai={<View><Nut chu="Trao quà" nho bam={() => setTrao(p)} nhanDoc={`Trao ${p.ten} cho ${p.ten_con}`} /></View>} />
            ))}
          </The>
        </>
      ) : null}

      {cua.viec.length ? (
        <>
          <TieuMuc chu={`Việc mỗi ngày · ${cua.viec.length} việc`} phai={baMe ? { chu: "Đổi bộ ›", bam: () => router.push(`/giao-nv?con=${c.id}` as never) } : undefined} />
          <The>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
              <Chu kieu="rat" co={15}>{cua.bo ? `Bộ ${TEN_BO[cua.bo] ?? cua.bo}` : "Việc riêng của nhà"}</Chu>
              {baMe ? <Chu co={13} mau={M.chu3}>Bấm một việc để sửa</Chu> : null}
            </View>
            {cua.viec.map((x, i) => {
              const [ic, mau] = hinhNv(x);
              const tu = x.bang_chung === "tu_dong";
              return <HangViec key={x.id} dau={i === 0} ic={ic} mau={mau} tieu={x.ten}
                phu={tu ? "Tự chấm · không cần duyệt" : `${cauLapLai(x.lap_lai)} · ${cachBao(x.bang_chung)}${x.tu_duyet ? " · tự cộng sao" : ""}`}
                phai={<SaoVien n={x.diem} nho />} bam={baMe ? () => router.push(`/giao-nv/sua?id=${x.id}` as never) : undefined} />;
            })}
          </The>
          {baMe ? <Nut chu={`Giao thêm việc cho ${c.ten}`} ic="cong" loai="vien" rong bam={() => router.push(`/giao-nv?con=${c.id}` as never)} /> : null}
        </>
      ) : (
        <ViecTrong con={c.id} ten={c.ten} baMe={baMe} />
      )}

      <BangTraoQua p={trao} dong={() => setTrao(null)} xong={(chu) => { bao(chu); tai(); }} />
    </Man>
  );
}

/** Con chưa có việc nào (37): hai lối — chọn bộ có sẵn / tự đặt một việc. */
function ViecTrong({ con, ten, baMe }: { con: string; ten: string; baMe: boolean }) {
  const ct = useTai(() => bm.goi<{ namSinh: number | null }>(`con/${con}`).catch(() => null));
  const t = tuoiCua(ct.d?.namSinh);
  return (
    <The>
      <View style={{ alignItems: "center", gap: 6, paddingVertical: 6 }}>
        <BieuTron ic="sao" mau="vang" lon />
        <Chu kieu="rat" co={18} style={{ textAlign: "center" }}>{`${ten} chưa có việc nào`}</Chu>
        <Chu co={14} mau={M.chu2} style={{ textAlign: "center" }}>Giao vài việc nhỏ. Con làm xong nhận sao, đổi ra phút chơi.</Chu>
      </View>
      {baMe ? (
        <View style={{ marginTop: 8 }}>
          <HangViec dau ic="luoi" mau="tim" tieu="Chọn bộ việc có sẵn" phu={t ? `Rob gợi ý hợp với ${t} tuổi` : "Rob gợi ý hợp với tuổi của con"}
            bam={() => router.push(`/giao-nv?con=${con}` as never)} />
          <HangViec ic="but" mau="xanh" tieu="Tự đặt một việc" phu="Tên việc, số sao, ngày làm" bam={() => router.push(`/giao-nv/tu-dat?con=${con}` as never)} />
        </View>
      ) : <Chu co={13} mau={M.chu3} style={{ marginTop: 8, textAlign: "center" }}>Nhờ Ba Mẹ giao việc cho con.</Chu>}
    </The>
  );
}
