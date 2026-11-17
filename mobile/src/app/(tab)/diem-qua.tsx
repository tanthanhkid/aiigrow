// Tab «Việc & quà» (bàn 17/11 them-e91jg28j@v13, trống them-e44cwmvu@v8): «+ Việc» (→ Giao việc) · «+ Quà» (→ Thêm quà) cạnh tiêu đề, dải các con
// (nhà > 1 con, số việc chờ góc trên) → ví sao (đổi được bao nhiêu phút) → việc chờ Ba Mẹ duyệt (mỗi việc mở THẲNG màn bằng chứng) → quà con đã đổi
// chờ trao (bảng trượt «Đã trao … chưa?», them-5otw85h4 — sao GIỮ, trao mới trừ, huỷ hoàn; lib/trao-qua) → «Việc mỗi ngày · N việc».
// Người trông giúp (dữ liệu cũ): duyệt + trao quà được; giao / sửa việc ẩn.
// 15/11 (#263/#266, them-e91jg28j): viên sao dưới từng con (âm = viên cảnh báo); đang nợ ⇒ thẻ cảnh báo «<Con> đang nợ Ba Mẹ 20 sao · −20 sao ·
// Duyệt 2 việc chờ là hết nợ ›», việc chờ duyệt ghi «trả nợ 10 sao». 1 sao = 1 phút chơi (bỏ «đổi ra phút»).
import { useMemo, useState } from "react";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { KHOI, HERO, KHOI_HERO } from "@/lib/clay";
import {
  ChoTai, Chu, gioPhut, Icon, Icon3D, M, Man, NhanMen, Nut, Rob, The, useHoanTac, useTai, type TenIcon,
} from "@/lib/ui";
import { cachBao, cauLapLai, HangViec, hinhNv, SaoVien, tenGoi, TieuMuc, type LuotChoMoi, type PhieuCho } from "@/lib/hang-ngay";
import { KHOA_NV_TAB, napNvTab, viecCuaCon } from "@/lib/nv-tab";
import { DaiCon, OLomIcon } from "@/lib/ui-viec";
import { BangTraoQua } from "@/lib/trao-qua";
import { icQua } from "@/lib/s3";
import { kieuSao, saoTu, soChinh, soVN, VienSao, traNoLanLuot } from "@/lib/so-sao";

/** «hôm nay 18:40» / «hôm qua» / «3/11». */
const khiNao = (iso: string) => {
  const t = new Date(iso), h = new Date();
  if (t.toDateString() === h.toDateString()) return `hôm nay ${gioPhut(t)}`;
  h.setDate(h.getDate() - 1);
  return t.toDateString() === h.toDateString() ? "hôm qua" : `${t.getDate()}/${t.getMonth() + 1}`;
};
/** «2 ảnh · 18:40» / «Ghi âm · 17:15» (14/11); đang nợ (15/11) ⇒ «2 ảnh · trả nợ 10 sao». */
const phuLuot = (x: LuotChoMoi, traNo = 0) => {
  const bc = x.so_ghi_am ? "Ghi âm" : x.so_anh ? `${x.so_anh} ảnh` : x.bang_chung === "xong" ? "Bấm «Xong»" : x.ghi_chu ? "Con viết" : "";
  return [bc, traNo > 0 ? `trả nợ ${soVN(traNo)} sao` : gioPhut(x.nop_luc)].filter(Boolean).join(" · ");
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
    return {
      viec,
      cho: d.cd.nhiemVu.filter((x) => x.child_id === c.id),
      phieu: (d.cd.phieu ?? []).filter((x) => x.child_id === c.id),
    };
  }, [d, c]);
  if (!d) return <Man tieuLon="Việc & quà"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;
  if (!c || !cua) {
    return (
      <Man tieuLon="Việc & quà">
        <The><Chu mau={M.chu2}>Chưa có hồ sơ con nào. Thêm con ở «Cả nhà» để giao việc.</Chu></The>
      </Man>
    );
  }
  const baMe = d.quyen === "ba_me";
  const soCho: Record<string, number> = {};
  for (const x of d.cd.nhiemVu) soCho[x.child_id] = (soCho[x.child_id] ?? 0) + 1;
  const ss = saoTu(c), sao = ss.sao, k = kieuSao(ss);
  // sao việc chờ trả nợ lần lượt (theo thứ tự hiện)
  const traNo = traNoLanLuot(ss.no, cua.cho.map((x) => x.sao ?? x.diem)).map((x) => x.tra);
  const tongCho = cua.cho.reduce((n, x) => n + (x.sao ?? x.diem), 0);
  // them-e44cwmvu: Con chưa có việc nào (và không có gì chờ) ⇒ chỉ dải con + «Ngày của <Con> còn trống», không thẻ ví, không nút «+ Việc / + Quà».
  // Đang nợ (#263) thì vẫn hiện thẻ ví (cảnh báo nợ) và «+ Quà» — không giấu nợ chỉ để giống hình.
  const trong = !cua.viec.length && !cua.cho.length && !cua.phieu.length;
  const anVi = trong && ss.no <= 0;
  const ten = tenGoi(c.ten);
  return (
    <Man tieuLon="Việc & quà" tai={tai} vongTai noi={noi}
      phaiTieu={baMe && !anVi ? (
        // thiết kế .them (them-e91jg28j@v13): hai viên sáng 44 — «✅ + Việc» (→ Giao việc) · «🎁 + Quà» (→ Thêm quà), icon 3D 22, chữ 14/800 ngọc
        <View style={{ flexDirection: "row", gap: 8 }}>
          {trong ? null : <NutThem ic="tick" chu="+ Việc" nhan="Thêm việc" bam={() => router.push(`/giao-nv?con=${c.id}` as never)} />}
          <NutThem ic="qua" chu="+ Quà" nhan="Thêm quà" bam={() => router.push({ pathname: "/vi/qua-thu-vien", params: { con: c.id } })} />
        </View>
      ) : undefined}>
      {d.g.con.length > 1 ? <DaiCon ds={d.g.con.map((x) => ({ ...x, ten: tenGoi(x.ten) }))} chon={c.id} doi={(x) => setChon(x.id)} so={soCho}
        duoi={Object.fromEntries(d.g.con.map((x) => [x.id, <VienSao key={x.id} s={saoTu(x)} nho />]))} /> : null}

      {/* Thẻ hero navy (bàn Navy 17/11 .vi, Ánh kim): «<Con> đang có» · ⭐ 30 sao (Fraunces 40) vàng mật khi chưa nợ / còn sao vay (`vay`); đang nợ hết sao (`am`) ⇒ tiêu đề «<Con> đang nợ Ba Mẹ 20 sao» và số + chữ «sao» cam san hô M.noHero. Viên bấm luôn vàng M.diem chữ navy: «= 30 phút chơi ›» khi chưa nợ, còn lại «Duyệt … việc chờ …» / «Xem ví sao ›». */}
      {anVi ? null : <Pressable onPress={() => router.push(`/vi/${c.id}` as never)} accessibilityRole="button" accessibilityLabel={`Ví sao của ${ten}: ${soChinh(ss)}`}
        style={[{ paddingVertical: 16, paddingHorizontal: 18, borderRadius: 28, overflow: "hidden" },
          KHOI_HERO]}>
        <View pointerEvents="none" style={{ position: "absolute", right: -4, bottom: -18 }}><Rob ten="xong" co={112} /></View>
        <Chu kieu="dam7" co={13.5} mau={HERO.chu} style={{ marginRight: 116 }}>
          {k === "thuong" ? `${ten} đang có` : `${ten} đang nợ Ba Mẹ ${soVN(ss.no)} sao`}</Chu>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2, marginRight: 100 }}>
          <Icon3D ten="sao" co={38} />
          {k === "vay" ? <Chu kieu="rat" co={20} mau={HERO.phu} so style={{ flexShrink: 1 }}>{soChinh(ss)}</Chu> : <>
            <Chu kieu="tieu7" co={40} so mau={k === "am" ? M.noHero : HERO.phu} style={{ lineHeight: 46, letterSpacing: -1 }}>{soVN(k === "am" ? -ss.no : sao)}</Chu>
            <Chu kieu="rat" co={18} mau={k === "am" ? M.noHero : HERO.phu} style={{ marginTop: 8 }}>sao</Chu>
          </>}
        </View>
        <View style={{ alignSelf: "flex-start", marginTop: 6, minHeight: 32, paddingHorizontal: 12, borderRadius: 16, backgroundColor: M.diem, backgroundImage: "linear-gradient(#f8d68e, #F4C76A)", justifyContent: "center", marginRight: 100 }}>
          <Chu kieu="rat" co={13} mau={M.chu}>
            {k === "thuong" ? `= ${soVN(sao)} phút chơi ›`
              : cua.cho.length ? (tongCho >= ss.no ? `Duyệt ${cua.cho.length} việc chờ là hết nợ ›` : `Duyệt ${cua.cho.length} việc chờ để trả nợ ›`)
                : "Xem ví sao ›"}</Chu>
        </View>
      </Pressable>}

      {cua.cho.length ? (
        <>
          <TieuMuc ic="tick" chu="Việc chờ Ba Mẹ duyệt" so={cua.cho.length} />
          <The>
            {cua.cho.map((x, i) => {
              const [ic, mau] = hinhNv(x);
              return <HangViec key={x.id} dau={i === 0} ic={ic} mau={mau} tieu={x.ten} phu={phuLuot(x, traNo[i])}
                phai={<SaoVien n={x.sao ?? x.diem} nho />} bam={() => router.push(`/duyet/${x.id}` as never)} nhanDoc={`Xem bằng chứng ${x.ten}`} />;
            })}
            <View style={{ marginTop: 10 }}>
              <Nut chu={`Xem và duyệt ${cua.cho.length} việc`} ic="sao" ic3d rong bam={() => router.push(`/duyet?con=${c.id}` as never)} />
            </View>
          </The>
        </>
      ) : null}

      {cua.phieu.length ? (
        <>
          <TieuMuc ic="qua" chu="Quà chờ trao" so={cua.phieu.length} phai={{ chu: "Danh sách quà ›", bam: () => router.push("/vi/qua" as never) }} />
          {/* thiết kế .qua: mỗi quà một thẻ vàng — ô icon 48 nền #fff8e4 · tên 15.5/800 · «Đổi 50 sao · hôm qua» · nút đen «Trao quà» */}
          {cua.phieu.map((p) => (
            <View key={p.id} style={[{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 12, paddingRight: 16, borderRadius: 28,
              backgroundColor: "#fcefc6", backgroundImage: "linear-gradient(#fdf3d6, #fbf0d6)" }, KHOI.the]}>
              <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: "#fff8e4", alignItems: "center", justifyContent: "center" }}><Icon3D ten={icQua({ hinh: p.hinh ?? null, loai: p.loai, ten: p.ten }) as TenIcon} co={30} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Chu kieu="rat" co={15.5} dong={1}>{p.ten}</Chu>
                <Chu kieu="dam" co={13} mau={M.diemInk}>{`Đổi ${soVN(p.diem)} sao · ${khiNao(p.created_at)}`}</Chu>
              </View>
              <View><Nut chu="Trao quà" nho bam={() => setTrao(p)} nhanDoc={`Trao ${p.ten} cho ${p.ten_con}`} /></View>
            </View>
          ))}
        </>
      ) : null}

      {cua.viec.length ? (
        <>
          <TieuMuc ic="lich" chu={`Việc mỗi ngày · ${cua.viec.length} việc`} />
          <The>
            {cua.viec.map((x, i) => {
              const [ic, mau] = hinhNv(x);
              const tu = x.bang_chung === "tu_dong";
              return <HangViec key={x.id} dau={i === 0} ic={ic} mau={mau} tieu={x.ten}
                phu={tu ? "Tự chấm · không cần duyệt" : `${cauLapLai(x.lap_lai)} · ${cachBao(x.bang_chung)}${x.tu_duyet ? " · tự cộng sao" : ""}`}
                phai={<SaoVien n={x.diem} nho />} bam={baMe ? () => router.push(`/giao-nv/sua?id=${x.id}` as never) : undefined} />;
            })}
          </The>
        </>
      ) : (
        <ViecTrong con={c.id} ten={ten} baMe={baMe} />
      )}

      <BangTraoQua p={trao} dong={() => setTrao(null)} xong={(chu) => { bao(chu); tai(); }} />
    </Man>
  );
}

/** Viên «+ Việc» / «+ Quà» cạnh tiêu đề (.them: cao 44, đệm 10 · 14, icon 3D 22, chữ 14/800 #0A1629). */
function NutThem({ ic, chu, nhan, bam }: { ic: "tick" | "qua"; chu: string; nhan: string; bam: () => void }) {
  return (
    <NhanMen onPress={bam} accessibilityRole="button" accessibilityLabel={nhan} muc="chip" sang
      style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 44, paddingLeft: 10, paddingRight: 14, borderRadius: 22, backgroundColor: M.the, ...KHOI.nho }}>
      <Icon3D ten={ic} co={22} /><Chu kieu="rat" co={14} mau={M.chinhInk}>{chu}</Chu>
    </NhanMen>
  );
}

/** Con chưa có việc nào (them-e44cwmvu 14/11): Grow + «Ngày của <Con> còn trống», hai lối — chọn từ danh sách / tự đặt một việc. */
function ViecTrong({ con, ten, baMe }: { con: string; ten: string; baMe: boolean }) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ alignItems: "center", gap: 4, marginTop: 8 }}>
        <Rob ten="chi" co={150} />
        <Chu kieu="rat" co={22} style={{ textAlign: "center", lineHeight: 28 }}>{`Ngày của ${ten} còn trống`}</Chu>
        <Chu kieu="dam" co={15} mau={M.chu2} style={{ textAlign: "center" }}>Con làm xong nhận sao. 1 sao = 1 phút chơi, hoặc để dành đổi quà.</Chu>
      </View>
      {baMe ? (
        <View style={{ gap: 12 }}>
          <ChonLoi ic="qua" tieu="Chọn từ danh sách" phu="Học · Vận động · Giúp Ba Mẹ" bam={() => router.push(`/giao-nv?con=${con}` as never)} />
          <ChonLoi ic="but" tieu="Tự đặt một việc" phu="Tên việc, số sao, ngày làm" bam={() => router.push(`/giao-nv?con=${con}&tuThem=1` as never)} />
        </View>
      ) : <Chu co={13} mau={M.chu3} style={{ textAlign: "center" }}>Nhờ Ba Mẹ giao việc cho con.</Chu>}
    </View>
  );
}

/** Thẻ lựa chọn (.chon): ô icon lõm 52 · tên + dòng phụ · ›. */
function ChonLoi({ ic, tieu, phu, bam }: { ic: "qua" | "but"; tieu: string; phu: string; bam: () => void }) {
  return (
    <Pressable onPress={bam} accessibilityRole="button" accessibilityLabel={tieu}
      style={[{ flexDirection: "row", alignItems: "center", gap: 12, padding: 12, paddingRight: 14, borderRadius: 28, backgroundColor: M.the }, KHOI.the]}>
      <OLomIcon ic={ic} co={52} nen={ic === "but" ? M.chinhSoft : M.xamSoft} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Chu kieu="rat" co={16}>{tieu}</Chu>
        <Chu kieu="dam" co={13} mau={M.chu3}>{phu}</Chu>
      </View>
      <Icon ten="phai" mau={M.chu3} co={18} />
    </Pressable>
  );
}
