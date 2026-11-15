// Duyệt xong (thiết kế chốt 15/11 bm-viec-duyet them-493dqo4i một việc · them-zj9gmh7t cả loạt; #263 sao nhiệm vụ trả nợ trước):
// chưa nợ ⇒ «+10 sao cho <Con>!», ví a → b sao, «= b phút chơi» (1 sao = 1 phút). Đang nợ ⇒ «+10 sao của <Con> / đã trả nợ trước», «−15 → −5 sao»,
// «Trả nợ 10 sao · còn nợ Ba Mẹ 5 sao»; cả loạt trả hết ⇒ «<Con> nhận 20 sao / và đã hết nợ!», «Trả nợ 15 sao trước · còn 5 sao = 5 phút chơi», từng việc
// «Trả nợ 10 · còn nợ 5» / «Trả nợ 5 · cộng 5 sao cho con». Một việc: thẻ «Còn n việc chờ duyệt» + «Duyệt tiếp» và toast «Hoàn tác» (luot/:id/hoan-tac).
// Params một việc: luot, con, ten, diem, nv, khen · cả loạt: loat=1, con, ten, sao, khen, ids («,»), ds (JSON [{t, s}]) · cả hai: saoTruoc, noTruoc
// (sổ sao TRƯỚC khi duyệt — không có ⇒ suy từ ví sau duyệt: số dư luôn tăng đúng số sao kiếm, phần trả nợ = min(sao, nợ trước)).
import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { KHOI } from "@/lib/clay";
import { HangViec, SaoVien, hinhNv, type ChoDuyetMoi } from "@/lib/hang-ngay";
import { MAU_NO, soVN, traNoLanLuot } from "@/lib/so-sao";
import { CanhGiua, Chu, Icon3D, M, Man, Nut, The, useHoanTac, useTai } from "@/lib/ui";

type P = { luot?: string; con: string; ten: string; diem?: string; nv?: string; khen?: string; loat?: string; sao?: string; ids?: string; ds?: string;
  saoTruoc?: string; noTruoc?: string };

export default function DuyetXong() {
  const p = useLocalSearchParams<P>();
  const loat = p.loat === "1";
  const cong = Number(loat ? p.sao : p.diem) || 0;
  const { d } = useTai(async () => {
    const [vi, cho] = await Promise.all([
      p.con ? bm.goi<{ soDu: number; sao?: number; no?: number }>(`con/${p.con}/vi`).catch(() => null) : Promise.resolve(null),
      bm.goi<ChoDuyetMoi>("cho-duyet").catch(() => null),
    ]);
    return { sao: vi ? (vi.sao ?? vi.soDu) : null, no: vi?.no ?? 0, con: cho?.nhiemVu.filter((x) => !p.con || x.child_id === p.con) ?? [] };
  });
  const { bao, noi } = useHoanTac();
  useEffect(() => {
    if (loat || !p.luot) return;
    bao(`Đã cộng ${p.diem} sao cho ${p.ten}`, async () => {
      try { await bm.goi(`luot/${p.luot}/hoan-tac`, {}); router.replace(`/duyet/${p.luot}` as never); } catch { bao("Đã quá thời gian hoàn tác"); }
    });
  }, [bao, loat, p.diem, p.ten, p.luot]);
  const sau = d?.sao ?? null;
  const ds: { t: string; s: number }[] = (() => { try { return loat && p.ds ? JSON.parse(p.ds) : []; } catch { return []; } })();
  // sổ sao trước duyệt: tham số (đọc ngay trước khi duyệt) hoặc suy từ sau: nợ sau > 0 ⇒ cả số sao đã trả nợ
  const truoc = p.saoTruoc !== undefined && p.saoTruoc !== "" ? Number(p.saoTruoc) : sau !== null ? sau - cong : null;
  const noTruoc = p.noTruoc !== undefined && p.noTruoc !== "" ? Number(p.noTruoc)
    : d ? (d.no > 0 ? d.no + cong : truoc !== null && truoc < 0 ? Math.min(cong, -truoc) : 0) : 0;
  const traNo = Math.min(cong, noTruoc), noSau = noTruoc - traNo, conCong = cong - traNo;
  const saoSau = sau ?? (truoc !== null ? truoc + cong : null);
  const coNo = noTruoc > 0;
  // từng việc (cả loạt): trả nợ lần lượt
  const lanLuot = traNoLanLuot(noTruoc, ds.map((x) => x.s));
  const tung = ds.map((x, i) => ({ ...x, tra: lanLuot[i].tra, conNo: lanLuot[i].conNo, cong: x.s - lanLuot[i].tra }));
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
      <CanhGiua lv="sao"
        tieu={coNo ? (loat ? `${p.ten} nhận ${cong} sao\n${noSau ? "đã trả nợ trước" : "và đã hết nợ!"}` : `+${cong} sao của ${p.ten}\nđã trả nợ trước`)
          : loat ? `${p.ten} nhận ${cong} sao hôm nay!` : `+${cong} sao cho ${p.ten}!`}
        loi={loat ? undefined : p.khen ? `Đã duyệt «${p.nv}» và gửi con «${p.khen}»` : `Đã duyệt «${p.nv}»`} />

      <View style={[{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderRadius: 28, backgroundColor: coNo && saoSau !== null && saoSau < 0 ? MAU_NO.nen : M.diemSoft }, KHOI.the]}>
        <Icon3D ten="sao" co={40} mau={M.diemInk} />
        <View style={{ flex: 1 }}>
          <Chu kieu="rat" co={22} mau={coNo && saoSau !== null && saoSau < 0 ? MAU_NO.chu : M.diemInk} so>
            {truoc !== null && saoSau !== null ? `${soVN(truoc)} → ${soVN(saoSau)} sao` : `+${cong} sao`}</Chu>
          <Chu kieu="dam" co={14} mau={coNo && saoSau !== null && saoSau < 0 ? MAU_NO.chu : M.diemInk}>
            {coNo ? (noSau ? `Trả nợ ${soVN(traNo)} sao · còn nợ Ba Mẹ ${soVN(noSau)} sao` : `Trả nợ ${soVN(traNo)} sao trước · còn ${soVN(conCong)} sao = ${soVN(conCong)} phút chơi`)
              : saoSau !== null ? `= ${soVN(Math.max(0, saoSau))} phút chơi` : ""}</Chu>
        </View>
      </View>

      {loat && tung.length ? (
        <The>
          {tung.map((x, k) => {
            const [ic, mau] = hinhNv({ nhom: /đọc/i.test(x.t) ? "doc_sach" : "" });
            const phu = x.tra ? (x.conNo ? `Trả nợ ${x.tra} · còn nợ ${x.conNo}` : x.cong ? `Trả nợ ${x.tra} · cộng ${x.cong} sao cho con` : `Trả nợ ${x.tra} · hết nợ`)
              : p.khen ? `Đã gửi «${p.khen}»` : undefined;
            return <HangViec key={`${x.t}${k}`} dau={k === 0} ic={ic} mau={mau} tieu={x.t} phu={phu} phai={<SaoVien n={x.s} dau nho />} />;
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
