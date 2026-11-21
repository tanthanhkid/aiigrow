// Khối DÙNG CHUNG của «App & web» Hằng ngày (bm-ung-dung) và Lần đầu · bước 5 (bm-thiet-lap-con) — issue #490, bàn 20/11:
// hai hành trình cùng một kiểu giao diện, khác nhau chỉ ở thanh bước 5 trên đầu và nguồn dữ liệu (Hằng ngày: máy chủ; Lần đầu: trạng thái lib/thiet-lap).
//  · TheCheDo        — thẻ navy «Máy của <con> đang ở chế độ» + công tắc Mở hết | Theo danh sách (bm2-ung-dung-may@v21 · them-mdujxlg2@v19)
//  · HaiNhomMuc      — «● Tính phút (trả bằng sao)» TRƯỚC, «● Không tính phút (vào thoải mái)» SAU, mỗi dòng icon tròn + tên (+ dòng phụ) + › (them-g7g1cel5@v11)
//  · ChiTietMuc      — chi tiết một app / web: icon tròn to, «<mục> có tính phút không?», 2 thẻ nhóm, «Lưu: …», «Bỏ … khỏi danh sách»
//                      (bm2-app-web@v20 · them-2nupeqju · Lần đầu them-qjgsxgos@v1 · them-4glrqqlq@v2)
//  · KetQuaThem      — «Kết quả cho «…»», dòng kết quả + ✓ navy, câu hỏi nhóm ngay dưới dòng vừa chọn (them-vw103x88@v13 · them-at57ypdc@v9 · them-ubomxl31@v8)
import { useState } from "react";
import { Text, View } from "react-native";
import { TEN_NHOM, type CheDo, type Nhom } from "./app-web";
import { BONG, HERO, KHOI, KHOI_HERO, MEN } from "./clay";
import { ChonNhom, ChonNhomNgang, DongDen, KhoiNhom, MucNhom, NutChon, OIconTrang } from "./ui-bm3";
import { ThanhTimGia } from "./lan-dau-ds";
import { BaoLoi, Chu, DauSach, F, Icon, Icon3D, IconNet, LogoTron, M, NhanMen, Nut, type TenIcon } from "./ui";

const TEN_CHE_DO: Record<CheDo, string> = { mo_het: "Mở hết", theo_danh_sach: "Theo danh sách" };
const IC_CHE_DO = { mo_het: "mo_khoa", theo_danh_sach: "khien" } as const;

/** Một dòng ✓ / ? trong thẻ chế độ: vòng tròn vàng mật mờ, viền vàng, dấu vàng. */
export function DongY({ ic, kyTu, chu, co = 13.5 }: { ic?: TenIcon; kyTu?: string; chu: string; co?: number }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(244,199,106,0.16)", boxShadow: "inset 0px 0px 0px 1px rgba(244,199,106,0.5)" }}>
        {ic ? <Icon ten={ic} mau={HERO.phu} co={12} /> : <Chu kieu="rat" co={12} mau={HERO.phu}>{kyTu ?? ""}</Chu>}
      </View>
      <Chu kieu="rat" co={co} mau={HERO.chu} style={{ flex: 1 }}>{chu}</Chu>
    </View>
  );
}

/** Công tắc «Mở hết | Theo danh sách» trên thẻ navy: mục đang bật là viên vàng kim chữ navy. */
function CongTat({ cheDo, doi, tat, cao }: { cheDo: CheDo; doi: (v: CheDo) => void; tat?: boolean; cao: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 4, padding: 4, borderRadius: 20, backgroundColor: HERO.vien, boxShadow: "inset 0px 3px 7px rgba(0,0,0,0.4)" }}
      accessibilityRole="radiogroup" accessibilityLabel="Chế độ app và web">
      {(["mo_het", "theo_danh_sach"] as const).map((k) => {
        const on = k === cheDo;
        return (
          <NhanMen key={k} onPress={() => doi(k)} disabled={tat} accessibilityRole="radio" accessibilityState={{ checked: on, disabled: tat }} aria-checked={on}
            accessibilityLabel={TEN_CHE_DO[k]} muc="chip" sang={on} men={on ? MEN.vang : undefined}
            style={[{ flex: k === "mo_het" ? 1 : 1.25, minWidth: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, height: cao, borderRadius: 16 },
              on && { backgroundColor: M.diem, boxShadow: BONG.vang }]}>
            <IconNet ten={IC_CHE_DO[k]} co={cao > 44 ? 21 : 20} mau={on ? M.chu : HERO.chu} />
            <Chu kieu="rat" co={cao > 44 ? 14.5 : 14} mau={on ? M.chu : HERO.chu} dong={1}>{TEN_CHE_DO[k]}</Chu>
          </NhanMen>
        );
      })}
    </View>
  );
}

const ROB_CO = 84, ROB_PHAI = 14, CHUA_ROB = ROB_CO + ROB_PHAI - 16;

/** Thẻ navy chế độ app & web.
 *  `lon` (tab App & web — bm2-ung-dung-may): dấu sách vàng, «Máy của <con> đang ở chế độ», tên chế độ 24, logo tròn, hai dòng ✓ / ?, công tắc.
 *  mặc định (Lần đầu — them-mdujxlg2): nhãn «App và web trên máy <con> sẽ ở chế độ», công tắc, hai dòng ✓ / ? — cùng chất liệu thẻ. */
export function TheCheDo({ ten, cheDo, doi, tat, lon }: { ten: string; cheDo: CheDo; doi: (v: CheDo) => void; tat?: boolean; lon?: boolean }) {
  const moHet = cheDo === "mo_het";
  const dong = moHet
    ? [{ ic: "tick" as TenIcon, chu: "Con mở mọi app, mọi trang web" }, { ic: "tick" as TenIcon, chu: "Không tính phút" }]
    : [{ ic: "tick" as TenIcon, chu: "Chỉ mở app, web Ba Mẹ đã thêm" }, { kyTu: "?", chu: "App, web mới: con xin Ba Mẹ" }];
  if (!lon) {
    return (
      <View style={{ padding: 12, borderRadius: 24, ...KHOI_HERO }}>
        <Chu kieu="dam7" co={12.5} mau={HERO.phu} style={{ marginHorizontal: 4, marginBottom: 8 }}>{`App và web trên máy ${ten} sẽ ở chế độ`}</Chu>
        <CongTat cheDo={cheDo} doi={doi} tat={tat} cao={44} />
        <View style={{ gap: 8, marginTop: 8, marginHorizontal: 4 }}>{dong.map((x) => <DongY key={x.chu} {...x} co={12.5} />)}</View>
      </View>
    );
  }
  return (
    <View style={{ borderRadius: 34, overflow: "hidden", ...KHOI_HERO }}>
      <View style={{ paddingTop: 18, paddingHorizontal: 16, paddingBottom: 16 }}>
        <View pointerEvents="none" style={{ position: "absolute", left: 24, top: 0 }}><DauSach mau={HERO.phu} rong={16} cao={22} /></View>
        <Chu kieu="dam7" co={13} mau={HERO.phu} style={{ marginTop: 10 }}>{`Máy của ${ten} đang ở chế độ`}</Chu>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4, marginRight: CHUA_ROB + 6 }} accessibilityRole="header">
          <View pointerEvents="none" style={{ position: "absolute", right: -(CHUA_ROB + 22 - ROB_PHAI), top: -8 }}><LogoTron co={ROB_CO} /></View>
          <IconNet ten={IC_CHE_DO[cheDo]} co={30} mau={HERO.phu} />
          <Chu kieu="rat" co={24} mau={HERO.chu} style={{ letterSpacing: -0.6, flexShrink: 1 }}>{TEN_CHE_DO[cheDo]}</Chu>
        </View>
        <View style={{ marginTop: 12, marginRight: 96, gap: 8 }}>{dong.map((x) => <DongY key={x.chu} {...x} />)}</View>
        <View style={{ marginTop: 16 }}><CongTat cheDo={cheDo} doi={doi} tat={tat} cao={48} /></View>
      </View>
    </View>
  );
}

/** Một dòng trong danh sách hai nhóm. `phu` = dòng phụ (Hằng ngày: «Hôm nay N phút»; Lần đầu không có số liệu dùng). */
export type MucDs = { k: string; ten: string; phu?: string; nhom: Nhom; ic: TenIcon; anh?: string | null; bam?: () => void };

/** Hai nhóm danh sách: Tính phút ĐỨNG TRƯỚC, Không tính phút sau (mọi màn danh sách). Nhóm trống thì bỏ qua. */
export function HaiNhomMuc({ ds }: { ds: MucDs[] }) {
  return (
    <>
      {(["tinh_phut", "khong_tinh_phut"] as const).map((n) => {
        const d = ds.filter((h) => h.nhom === n);
        return d.length ? (
          <View key={n} style={{ gap: 8 }}>
            <MucNhom nhom={n} />
            <KhoiNhom>
              {d.map((h, i) => <DongDen key={h.k} dau={i === 0} tieu={h.ten} phu={h.phu} trai={<OIconTrang ic={h.ic} anh={h.anh} />} bam={h.bam} />)}
            </KhoiNhom>
          </View>
        ) : null;
      })}
    </>
  );
}

/** Nhóm «Gợi ý cho <con>» (Lần đầu): dòng icon + tên + nút ＋ tròn. #508: chạm ＋ mở NGAY tại dòng «<app> có tính phút không?» (2 ô nhóm) — chọn nhóm là thêm luôn,
 *  không qua màn tìm kiếm. */
export function NhomGoiY({ tieu, ds, them }: { tieu: string; ds: { k: string; ten: string; ic: TenIcon; bam?: () => void }[]; them?: (ten: string, nhom: Nhom) => void }) {
  const [mo, setMo] = useState<string | null>(null);
  if (!ds.length) return null;
  return (
    <View style={{ gap: 8 }}>
      <Chu kieu="rat" co={15} style={{ marginTop: 10, marginHorizontal: 6 }}>{tieu}</Chu>
      <KhoiNhom>
        {ds.map((h, i) => (
          <View key={h.k} style={{ paddingBottom: mo === h.k ? 12 : 0 }}>
            <DongDen dau={i === 0} tieu={h.ten} trai={<OIconTrang ic={h.ic} />} bam={them ? () => setMo(mo === h.k ? null : h.k) : h.bam}
              phai={<View accessibilityRole="button" accessibilityLabel={`Thêm ${h.ten}`} accessibilityState={{ expanded: mo === h.k }}><NutChon chon={mo === h.k} /></View>} />
            {them && mo === h.k ? (
              <View style={{ gap: 8, marginTop: 2 }}>
                <Chu kieu="rat" co={13.5} mau={M.chu} style={{ marginHorizontal: 2 }}>{`${h.ten} có tính phút không?`}</Chu>
                <ChonNhomNgang gia={null} doi={(n) => { setMo(null); them(h.ten, n); }} />
              </View>
            ) : null}
          </View>
        ))}
      </KhoiNhom>
    </View>
  );
}

/** Chi tiết MỘT app / web (Hằng ngày: «App của <con>» · Lần đầu: «Đổi app đã thêm»). `ic`/`anh` = hình đầu màn; `luu` luôn có; `bo` chỉ khi mục đã nằm trong danh sách. */
export function ChiTietMuc({ ten, phu, ic, anh, nhom, doi, tat, luu, bo, ghiChu, loi, dangChay }: {
  ten: string; phu: string; ic: TenIcon; anh?: string | null; nhom: Nhom | null; doi: (n: Nhom) => void; tat?: boolean;
  luu: () => void; bo?: () => void; ghiChu?: string | null; loi?: string | null; dangChay?: boolean;
}) {
  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 4, paddingTop: 4 }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: M.the, alignItems: "center", justifyContent: "center", ...KHOI.the }}>
          {anh ? <OIconTrang anh={anh} /> : <Icon3D ten={ic} co={36} />}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Chu kieu="rat" co={24} dong={2}>{ten}</Chu>
          <Chu kieu="dam" co={13.5} mau={M.chu2} dong={2}>{phu}</Chu>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 14, marginHorizontal: 6 }}>
        <DauSach mau="#D9AE57" />
        <Chu kieu="rat" co={15} style={{ flex: 1 }}>{`${ten} có tính phút không?`}</Chu>
      </View>
      <ChonNhom gia={nhom} doi={doi} tat={tat} />
      {ghiChu ? <Chu kieu="dam" co={12.5} mau={M.chu3} style={{ marginHorizontal: 6 }}>{ghiChu}</Chu> : null}
      {tat ? null : (
        <View style={{ gap: 10, marginTop: 6 }}>
          <BaoLoi loi={loi ?? null} />
          <Nut thu chu={nhom ? `Lưu: ${ten} ${nhom === "tinh_phut" ? "tính phút" : "không tính phút"}` : "Chọn Tính phút hoặc Không tính phút"} rong dangChay={dangChay} tat={!nhom} bam={luu} />
          {bo ? (
            <>
              <NutBo chu={`Bỏ ${ten} khỏi danh sách`} tat={dangChay} bam={bo} />
              <Chu kieu="dam" co={12.5} mau={M.chu2} style={{ textAlign: "center" }}>Bỏ rồi thì con xin lại được.</Chu>
            </>
          ) : null}
        </View>
      )}
    </>
  );
}

/** «Bỏ <mục> khỏi danh sách» (.bo): viên kem nổi cao 48, dấu ✕ + chữ đỏ. Tên dài thì co chữ, không xuống dòng. */
export function NutBo({ chu, tat, bam }: { chu: string; tat?: boolean; bam: () => void }) {
  return (
    <NhanMen onPress={bam} disabled={tat} accessibilityRole="button" accessibilityLabel={chu} accessibilityState={{ disabled: !!tat }} muc="nut" sang men={MEN.sang}
      style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 48, paddingHorizontal: 16, borderRadius: 16, backgroundColor: M.the, ...KHOI.the }}>
      <Icon ten="x" mau={M.loi} co={16} />
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ flexShrink: 1, minWidth: 0, fontFamily: F.rat, fontSize: 15, lineHeight: 22, color: M.loi }}>{chu}</Text>
    </NhanMen>
  );
}

/** Một mục trong kết quả tìm của màn Thêm app / Thêm web. */
export type MucThem = { k: string; ten: string; phu: string; ic?: TenIcon; anh?: string | null; e?: string; nhom: Nhom; luuY?: string };
export type ChonThem = Map<string, { m: MucThem; nhom: Nhom }>;

/** Chữ nút đáy màn Thêm: «Thêm Duolingo ABC · Không tính phút» / «Thêm 3 app» / «Chọn app để thêm». `loai` = «app» | «trang». */
export function chuNutThem(chon: ChonThem, loai: "app" | "trang") {
  const so = chon.size, mot = so === 1 ? [...chon.values()][0] : null;
  return mot ? `Thêm ${mot.m.ten} · ${TEN_NHOM[mot.nhom]}` : so ? `Thêm ${so} ${loai}` : `Chọn ${loai} để thêm`;
}

/** Danh sách kết quả màn Thêm: khối «Đã chọn» (đã chọn nhưng không khớp chữ đang gõ) + «Kết quả cho «…»» ; chạm dòng ⇒ chọn / bỏ, ngay dưới dòng hiện câu hỏi nhóm. */
export function KetQuaThem({ go, kq, chon, doi, datNhom, trong, chuaGo }: {
  go: string; kq: MucThem[]; chon: ChonThem; doi: (m: MucThem) => void; datNhom: (m: MucThem, n: Nhom) => void; trong: string; chuaGo: string;
}) {
  const ngoai = [...chon.values()].filter((x) => !kq.some((u) => u.k === x.m.k)).map((x) => x.m);
  const dong = (u: MucThem, i: number) => {
    const c = chon.get(u.k);
    return (
      <View key={u.k} style={{ paddingBottom: c ? 12 : 0 }}>
        <DongDen dau={i === 0} tieu={u.ten} phu={u.phu} trai={<OIconTrang ic={u.ic} anh={u.anh} e={u.e} />}
          phai={<View accessibilityRole="checkbox" accessibilityState={{ checked: !!c }}><NutChon chon={!!c} /></View>} bam={() => doi(u)} />
        {c ? (
          <View style={{ gap: 8, marginTop: 2 }}>
            <Chu kieu="rat" co={13.5} mau={M.chu} style={{ marginHorizontal: 2 }}>{`${u.ten} có tính phút không?`}</Chu>
            <ChonNhomNgang gia={c.nhom} doi={(x) => datNhom(u, x)} />
            {u.luuY ? <View style={{ marginTop: 2, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, backgroundColor: M.canhSoft }}><Chu kieu="dam" co={12.5} mau={M.canh}>{u.luuY}</Chu></View> : null}
          </View>
        ) : null}
      </View>
    );
  };
  const hoi = go.trim().length >= 2;
  return (
    <>
      {ngoai.length ? (
        <>
          <Chu kieu="rat" co={15} mau={M.chu2} style={{ marginHorizontal: 6 }}>Đã chọn</Chu>
          <KhoiNhom>{ngoai.map(dong)}</KhoiNhom>
        </>
      ) : null}
      {hoi ? (
        <>
          <Chu kieu="dam" co={14} mau={M.chu2} style={{ marginHorizontal: 6 }}>Kết quả cho <Chu kieu="rat" co={14}>{`«${go.trim()}»`}</Chu></Chu>
          {kq.length ? <KhoiNhom>{kq.map(dong)}</KhoiNhom> : <Chu kieu="dam" co={14} mau={M.chu3} style={{ marginHorizontal: 6 }}>{trong}</Chu>}
        </>
      ) : !ngoai.length ? <Chu kieu="dam" co={14} mau={M.chu3} style={{ marginHorizontal: 6 }}>{chuaGo}</Chu> : null}
    </>
  );
}

/** Bấm chọn / bỏ một mục ở màn Thêm (giữ thứ tự chọn). */
export const bamChonThem = (m: MucThem) => (c: ChonThem): ChonThem => {
  const n = new Map(c);
  if (n.has(m.k)) n.delete(m.k); else n.set(m.k, { m, nhom: m.nhom });
  return n;
};
export const datNhomThem = (m: MucThem, nhom: Nhom) => (c: ChonThem): ChonThem => new Map(c).set(m.k, { m, nhom });


/** Lần đầu · bước 5, màn Web: dòng navy «Chế độ: Theo danh sách · Đổi ›» — chế độ chọn MỘT lần ở màn app, bấm «Đổi ›» quay lại đó (không có công tắc thứ hai). */
export function DongCheDo({ cheDo, doi }: { cheDo: CheDo; doi: () => void }) {
  return (
    <NhanMen onPress={doi} accessibilityRole="button" accessibilityLabel={`Chế độ: ${TEN_CHE_DO[cheDo]}. Đổi`} muc="nut" sang
      style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 52, paddingHorizontal: 16, borderRadius: 26, ...KHOI_HERO }}>
      <IconNet ten={IC_CHE_DO[cheDo]} co={22} mau={HERO.phu} />
      <Chu kieu="rat" co={14.5} mau={HERO.chu} style={{ flex: 1 }} dong={1}>{`Chế độ: ${TEN_CHE_DO[cheDo]}`}</Chu>
      <Chu kieu="rat" co={14} mau={HERO.phu}>Đổi ›</Chu>
    </NhanMen>
  );
}

/** Danh sách Lần đầu (app / web), MỘT khối cho cả hai màn: thanh tìm lõm dẫn sang Thêm, hai nhóm (Tính phút trước, KHÔNG số liệu dùng, KHÔNG chip trong dòng),
 *  «Gợi ý cho <con>» với nút ＋ tròn. Dòng đã thêm bấm ⇒ màn Đổi. */
export function DsLanDau({ kieu, ten, da, goiY, timChu, tim, mo, them }: {
  kieu: "app" | "web"; ten: string; da: MucDs[]; goiY: { k: string; ten: string; ic: TenIcon }[]; timChu: string; tim: () => void; mo: (k: string) => void; them: (ten: string, nhom: Nhom) => void;
}) {
  return (
    <>
      <ThanhTimGia chu={timChu} ic={kieu === "web" ? "web" : "tim_kiem"} nhan={kieu === "web" ? "Thêm trang web bằng tên hoặc đường link" : "Tìm hoặc thêm app trên máy con"} bam={tim} />
      <HaiNhomMuc ds={da.map((x) => ({ ...x, bam: () => mo(x.k) }))} />
      {da.length ? null : <Chu kieu="dam" co={13.5} mau={M.chu3} style={{ marginHorizontal: 6 }}>{`Chưa thêm ${kieu === "web" ? "trang" : "app"} nào. ${kieu === "web" ? "Trang" : "App"} chưa thêm thì ${ten} chưa mở được — con xin Ba Mẹ.`}</Chu>}
      <NhomGoiY tieu={`Gợi ý cho ${ten}`} ds={goiY} them={them} />
    </>
  );
}
