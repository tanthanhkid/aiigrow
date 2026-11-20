// Duyệt xong (bàn 17/11 bm-viec-duyet them-493dqo4i@v6 một việc · them-zj9gmh7t@v3 cả loạt; #263 sao nhiệm vụ trả nợ trước):
// chưa nợ ⇒ «+10 sao cho <Con>!», ví a → b sao, «= b phút chơi» (1 sao = 1 phút). Đang nợ ⇒ «+10 sao của <Con> / đã trả nợ trước», «−15 → −5 sao»,
// «Trả nợ 10 sao · còn nợ Ba Mẹ 5 sao»; cả loạt trả hết ⇒ «<Con> nhận 20 sao / và đã hết nợ!», «Trả nợ 15 sao trước · còn 5 sao = 5 phút chơi», từng việc
// «Trả nợ 10 · còn nợ 5» / «Trả nợ 5 · cộng 5 sao cho con». Một việc: thẻ «Còn n việc chờ duyệt» + «Duyệt tiếp» và toast «Hoàn tác» (luot/:id/hoan-tac).
// Params một việc: luot, con, ten, diem, nv, khen · cả loạt: loat=1, con, ten, sao, khen, ids («,»), ds (JSON [{t, s}]) · cả hai: saoTruoc, noTruoc
// (sổ sao TRƯỚC khi duyệt — không có ⇒ suy từ ví sau duyệt: số dư luôn tăng đúng số sao kiếm, phần trả nợ = min(sao, nợ trước)).
import { useEffect } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { bm } from "@/lib/api";
import { BONG, KHOI } from "@/lib/clay";
import { HangViec, SaoVien, hinhNv, type ChoDuyetMoi } from "@/lib/hang-ngay";
import { cauLoiHoanTac } from "@/lib/hoan-tac";
import { Anh3D } from "@/lib/lan-dau";
import { MAU_NO, soVN, traNoLanLuot } from "@/lib/so-sao";
import { Chu, gioPhut, Icon, Icon3D, M, Man, Nut, Rob, The, useHoanTac, useTai } from "@/lib/ui";

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
      try { await bm.goi(`luot/${p.luot}/hoan-tac`, {}); router.replace(`/duyet/${p.luot}` as never); } catch (e) { bao(cauLoiHoanTac(e, p.ten)); }
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

  const noAm = coNo && saoSau !== null && saoSau < 0;
  return (
    <Man noi={noi} day={loat ? (
      <>
        <Nut chu="Về Hôm nay" rong bam={veTrangChu} />
        <Nut chu="Xem việc chờ duyệt" loai="ma" rong bam={() => router.replace(`/duyet${p.con ? `?con=${p.con}` : ""}` as never)} />
      </>
    ) : (
      <>
        {tiep ? <Nut chu={`Duyệt tiếp: ${tiep.ten}`} rong bam={() => router.replace(`/duyet/${tiep.id}` as never)} /> : null}
        <Nut chu="Về Hôm nay" loai={tiep ? "ma" : "chinh"} rong bam={veTrangChu} />
      </>
    )}>
      {/* thiết kế 493dqo4i / zj9gmh7t: Grow tung giấy màu giữa pháo hoa (trái) và lấp lánh (phải), tiêu đề 26/900 hai dòng */}
      <View style={{ alignItems: "center", gap: 10, paddingTop: 8 }}>
        <View style={{ width: 260, alignItems: "center" }}>
          <Rob ten="xong" co={190} />
          <View pointerEvents="none" style={{ position: "absolute", left: 6, top: 30 }}><Anh3D ten="phao_hoa" co={46} /></View>
          <View pointerEvents="none" style={{ position: "absolute", right: 10, top: 92 }}><Anh3D ten="lap_lanh" co={46} /></View>
        </View>
        <Chu kieu="den" co={26} style={{ textAlign: "center", letterSpacing: -0.6, maxWidth: 330 }}>
          {coNo ? (loat ? `${p.ten} nhận ${cong} sao\n${noSau ? "đã trả nợ trước" : "và đã hết nợ!"}` : `+${cong} sao của ${p.ten}\nđã trả nợ trước`)
            : loat ? `${p.ten} nhận ${cong} sao hôm nay!` : `+${cong} sao cho ${p.ten}!`}</Chu>

        {/* ví trước → sau: viên xám «⭐ −15» → viên nổi «⭐ −5 sao» (đào khi còn âm, vàng khi dương) + dòng giải thích */}
        {truoc !== null && saoSau !== null ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 46, paddingHorizontal: 14, borderRadius: 23, backgroundColor: M.xamSoft, boxShadow: BONG.lom }}>
              <Icon3D ten="sao" co={26} /><Chu kieu="rat" co={18} mau={M.chu3} so>{soVN(truoc)}</Chu>
            </View>
            <Icon ten="phai" co={20} mau={M.chinhInk} />
            <View style={[{ flexDirection: "row", alignItems: "center", gap: 6, height: 52, paddingHorizontal: 16, borderRadius: 26, backgroundColor: noAm ? MAU_NO.nen : M.diemSoft }, KHOI.the]}>
              <Icon3D ten="sao" co={30} /><Chu kieu="rat" co={20} mau={noAm ? MAU_NO.chu : M.diemInk} so>{`${soVN(saoSau)} sao`}</Chu>
            </View>
          </View>
        ) : <SaoVien n={cong} dau />}
        <Chu kieu="dam7" co={13} mau={M.chu3} style={{ textAlign: "center" }}>
          {coNo ? (noSau ? <>{`Trả nợ ${soVN(traNo)} sao · `}<Chu kieu="rat" co={13} mau={MAU_NO.chu}>{`còn nợ Ba Mẹ ${soVN(noSau)} sao`}</Chu></>
            : `Trả nợ ${soVN(traNo)} sao trước · còn ${soVN(conCong)} sao = ${soVN(conCong)} phút chơi`)
            : saoSau !== null ? `= ${soVN(Math.max(0, saoSau))} phút chơi` : ""}</Chu>
      </View>

      {/* một việc: dải ngọc nhạt + tim «Đã duyệt «Dọn phòng» và gửi con «Giỏi lắm con!»» */}
      {!loat ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 22, backgroundColor: M.chinhSoft }}>
          <Icon3D ten="tim" co={26} />
          <Chu kieu="dam7" co={14} mau={M.chinhInk} style={{ flex: 1 }}>{p.khen ? `Đã duyệt «${p.nv}» và gửi con «${p.khen}»` : `Đã duyệt «${p.nv}»`}</Chu>
        </View>
      ) : null}

      {loat && tung.length ? (
        <The>
          {tung.map((x, k) => {
            const [ic, mau] = hinhNv({ nhom: /đọc/i.test(x.t) ? "doc_sach" : "" });
            const phu = x.tra ? (x.conNo ? `Trả nợ ${x.tra} · còn nợ ${x.conNo}` : x.cong ? `Trả nợ ${x.tra} · cộng ${x.cong} sao cho con` : `Trả nợ ${x.tra} · hết nợ`)
              : p.khen ? `Đã gửi «${p.khen}»` : undefined;
            return <HangViec key={`${x.t}${k}`} dau={k === 0} ic={ic} mau={mau} tieu={x.t} phu={phu} phai={<NhanSao chu={`+${soVN(x.s)} sao`} />} />;
          })}
        </The>
      ) : null}

      {/* một việc: thẻ gọn «Còn n việc chờ duyệt · <việc kế> · ghi âm 17:15 · 10 sao» — chạm để duyệt tiếp */}
      {!loat && tiep && d ? (() => {
        const [ic, mau] = hinhNv(tiep);
        return (
          <The>
            <HangViec dau ic={tiep.so_ghi_am ? "sach" : ic} mau={mau} tieu={`Còn ${d.con.length} việc chờ duyệt`}
              phu={`${tiep.ten} · ${tiep.so_ghi_am ? "ghi âm" : tiep.so_anh ? `${tiep.so_anh} ảnh` : "bấm Xong"} ${gioPhut(tiep.nop_luc)}`}
              phai={<NhanSao chu={`${soVN(tiep.sao ?? tiep.diem)} sao`} />} bam={() => router.replace(`/duyet/${tiep.id}` as never)} nhanDoc={`Duyệt tiếp ${tiep.ten}`} />
          </The>
        );
      })() : null}
    </Man>
  );
}

/** Nhãn sao không icon (thiết kế .diem trong thẻ kết quả: «+10 sao» / «10 sao» nền vàng nhạt). */
const NhanSao = ({ chu }: { chu: string }) => (
  <View style={{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: M.diemSoft }}><Chu kieu="rat" co={13} mau={M.diemInk} so>{chu}</Chu></View>
);
