// Duyệt xong (thiết kế chốt bm-hang-ngay/29 một việc · 30 cả loạt): «+10 sao cho <Con>!», ví a → b sao, «= b phút chơi để con đổi»,
// lời khen đã gửi; một việc: thẻ «Còn n việc chờ duyệt» + «Duyệt tiếp: <việc>» và toast «Hoàn tác» (luot/:id/hoan-tac, máy chủ cho 30 giây);
// cả loạt (`loat=1`): danh sách việc + lời khen + sao, «Xong, về Trang chủ» / «Xem việc chờ duyệt».
// Params một việc: luot, con, ten, diem, nv, khen · cả loạt: loat=1, con, ten, sao, khen, ids («,»), ds (JSON [{t, s}]).
import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { KHOI } from "@/lib/clay";
import { HangViec, SaoVien, hinhNv, type ChoDuyetMoi } from "@/lib/hang-ngay";
import { CanhGiua, Chu, Icon3D, M, Man, Nut, The, useHoanTac, useTai } from "@/lib/ui";

type P = { luot?: string; con: string; ten: string; diem?: string; nv?: string; khen?: string; loat?: string; sao?: string; ids?: string; ds?: string };

export default function DuyetXong() {
  const p = useLocalSearchParams<P>();
  const loat = p.loat === "1";
  const cong = Number(loat ? p.sao : p.diem) || 0;
  const { d } = useTai(async () => {
    const [vi, cho, quy] = await Promise.all([
      p.con ? bm.goi<{ soDu: number; sao?: number }>(`con/${p.con}/vi`).catch(() => null) : Promise.resolve(null),
      bm.goi<ChoDuyetMoi>("cho-duyet").catch(() => null),
      p.con ? bm.goi<{ quy: { tyLe: { sao: number; phut: number } } }>(`con/${p.con}/quy`).catch(() => null) : Promise.resolve(null),
    ]);
    return { sao: vi ? (vi.sao ?? vi.soDu) : null, con: cho?.nhiemVu.filter((x) => !p.con || x.child_id === p.con) ?? [], tyLe: quy?.quy.tyLe ?? { sao: 10, phut: 10 } };
  });
  const { bao, noi } = useHoanTac();
  useEffect(() => {
    if (loat || !p.luot) return;
    bao(`Đã cộng ${p.diem} sao cho ${p.ten}`, async () => {
      try { await bm.goi(`luot/${p.luot}/hoan-tac`, {}); router.replace(`/duyet/${p.luot}` as never); } catch { bao("Đã quá thời gian hoàn tác"); }
    });
  }, [bao, loat, p.diem, p.ten, p.luot]);
  const sau = d?.sao ?? null;
  const phut = sau !== null && d ? Math.floor((sau * d.tyLe.phut) / d.tyLe.sao) : null;
  const ds: { t: string; s: number }[] = (() => { try { return loat && p.ds ? JSON.parse(p.ds) : []; } catch { return []; } })();
  const tiep = d?.con[0];
  const veTrangChu = () => router.replace("/hom-nay" as never);

  return (
    <Man noi={noi} day={loat ? (
      <>
        <Nut chu="Xong, về Trang chủ" rong bam={veTrangChu} />
        <Nut chu="Xem việc chờ duyệt" loai="vien" rong bam={() => router.replace(`/duyet${p.con ? `?con=${p.con}` : ""}` as never)} />
      </>
    ) : (
      <>
        {tiep ? <Nut chu={`Duyệt tiếp: ${tiep.ten}`} rong bam={() => router.replace(`/duyet/${tiep.id}` as never)} /> : null}
        <Nut chu="Về Trang chủ" loai={tiep ? "vien" : "chinh"} rong bam={veTrangChu} />
      </>
    )}>
      <CanhGiua lv="sao" tieu={loat ? `${p.ten} nhận ${cong} sao hôm nay!` : `+${cong} sao cho ${p.ten}!`}
        loi={loat ? undefined : p.khen ? `Đã duyệt «${p.nv}» và gửi con «${p.khen}»` : `Đã duyệt «${p.nv}»`} />

      <View style={[{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 28, backgroundColor: M.diemSoft }, KHOI.the]}>
        <Icon3D ten="sao" co={40} mau={M.diemInk} />
        <View style={{ flex: 1 }}>
          <Chu kieu="rat" co={22} mau={M.diemInk} so>{sau !== null ? `${sau - cong} → ${sau} sao` : `+${cong} sao`}</Chu>
          {phut !== null ? <Chu kieu="dam" co={14} mau={M.diemInk}>{`= ${phut} phút chơi để con đổi`}</Chu> : null}
        </View>
      </View>

      {loat && ds.length ? (
        <The>
          {ds.map((x, k) => {
            const [ic, mau] = hinhNv({ nhom: /đọc/i.test(x.t) ? "doc_sach" : "" });
            return <HangViec key={`${x.t}${k}`} dau={k === 0} ic={ic} mau={mau} tieu={x.t}
              phu={p.khen ? `Đã gửi «${p.khen}»` : undefined} phai={<SaoVien n={x.s} dau nho />} />;
          })}
        </The>
      ) : null}

      {!loat && d && d.con.length ? (
        <The>
          <Chu kieu="rat" co={16}>{`Còn ${d.con.length} việc chờ duyệt`}</Chu>
          {d.con.slice(0, 3).map((x) => {
            const [ic, mau] = hinhNv(x);
            return <HangViec key={x.id} ic={ic} mau={mau} tieu={x.ten} phu={x.so_ghi_am ? "ghi âm" : x.so_anh ? `${x.so_anh} ảnh` : "bấm Xong"}
              phai={<SaoVien n={x.sao ?? x.diem} nho />} bam={() => router.replace(`/duyet/${x.id}` as never)} />;
          })}
        </The>
      ) : null}
    </Man>
  );
}
