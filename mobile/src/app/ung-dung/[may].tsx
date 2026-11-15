// «Mọi app trên máy» (mở từ màn Máy — may/[id]): danh sách APP ĐÃ CÀI THẬT do agent trên máy Con gửi lên (Thanh 25/10: chọn đúng app của máy,
// không đoán tên) — GET may/:id/ung-dung; tìm, «Làm mới», thêm từng app vào danh sách «Tính phút» / «Không tính phút» hoặc bỏ khỏi danh sách
// (15/11 — #262: POST may/:id/ung-dung/dat {trangThai: tinh_phut | khong_tinh_phut | bo}; không còn «Chặn»). Màn tóm tắt theo con ở tab «App & web».
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Image, View } from "react-native";
import { bm } from "@/lib/api";
import { MAU_NHOM } from "@/lib/app-web";
import {
  Avt, BangTruot, BaoLoi, CanhGiua, MAU_CON, ChoTai, ChonMot, Chu, Dong, gioPhut, Icon, M, Man, Nhan, Nhom, NhomTieu, Nut, OChon, ONhap, truoc, useHoanTac, useLam, useTai,
} from "@/lib/ui";

type TrangThai = "he_thong" | "cho_phep" | "hoc" | "giai_tri" | "chan" | "chua_xep";
type AppMay = {
  khoa: string; muc: string; ten: string; nguon: string | null; nhaPhatHanh: string | null; teamId: string | null; duongDan: string | null;
  phienBan: string | null; icon: string | null; trangThai: TrangThai; nhom: string | null; theoCaNha: boolean; tamThoi?: boolean;
};
type DsMay = { may: { id: string; ten: string; nen: string; dungChung: boolean; con: string | null }; capNhatLuc: string | null; yeuCauLuc: string | null; ds: AppMay[] };
type LuatCu = { con: string; muc: string; ten: string; loai: string; nhom: string; het: string | null } | null;

const TT: Record<TrangThai, { chu: string; nhan: "ok" | "lam" | "diem" | "loi" | "xam" | "canh" }> = {
  he_thong: { chu: "Hệ thống", nhan: "xam" }, cho_phep: { chu: "Không tính phút", nhan: "ok" }, hoc: { chu: "Không tính phút", nhan: "ok" },
  giai_tri: { chu: "Tính phút", nhan: "diem" }, chan: { chu: "Chưa thêm", nhan: "canh" }, chua_xep: { chu: "Chưa thêm", nhan: "canh" },
};
const NGUON: Record<string, string> = {
  registry: "Đã cài", start: "Menu Start", store: "Microsoft Store", applications: "Thư mục Ứng dụng", "user-applications": "Ứng dụng của Con", launcher: "Màn hình chính",
};
type Loc = "tat_ca" | TrangThai;
type Dat = "tinh_phut" | "khong_tinh_phut";
const LOAI_DAT: Record<Dat, string> = { tinh_phut: "giai_tri", khong_tinh_phut: "hoc" };
const TEN_DAT: Record<Dat, string> = { tinh_phut: "Tính phút", khong_tinh_phut: "Không tính phút" };
const CHO_MAY_MS = 5000, CHO_MAY_TOI_DA = 90_000;

/** Icon THẬT của app (PNG 96 px agent trích từ máy: exe/AppxManifest, .icns, PackageManager) — nhìn logo là nhận ra app.
 *  Chỉ khi máy không trích được icon mới dùng chữ cái đầu của tên app. */
function IconApp({ a }: { a: AppMay }) {
  return (
    <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
      boxShadow: "inset 0px 1px 0px rgba(255,255,255,0.9), 0px 2px 4px -1px rgba(0,0,0,0.18)" }}>
      {a.icon ? <Image source={{ uri: `data:image/png;base64,${a.icon}` }} style={{ width: 40, height: 40 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        : <Avt ten={a.ten} mau={MAU_CON[[...a.ten].reduce((n, c) => n + c.charCodeAt(0), 0) % MAU_CON.length]} co={40} />}
      {a.trangThai === "giai_tri" || a.trangThai === "hoc" || a.trangThai === "cho_phep" ? (
        <View style={{ position: "absolute", right: -3, bottom: -3, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: "#fff",
          backgroundColor: MAU_NHOM[a.trangThai === "giai_tri" ? "tinh_phut" : "khong_tinh_phut"] }} />
      ) : null}
    </View>
  );
}

const phuCua = (a: AppMay) => [a.nhaPhatHanh, a.nguon ? NGUON[a.nguon] : null, a.phienBan ? `bản ${a.phienBan}` : null].filter(Boolean).join(" · ") || a.muc;

export default function UngDungMay() {
  const { may } = useLocalSearchParams<{ may: string }>();
  const { d, loi, matMang, tai } = useTai(() => bm.goi<DsMay>(`may/${may}/ung-dung`));
  const [tim, setTim] = useState("");
  const [loc, setLoc] = useState<Loc>("tat_ca");
  const [chon, setChon] = useState<AppMay | null>(null);
  const [dat, setDat] = useState<Dat>("tinh_phut");
  const [nhom, setNhom] = useState("game");
  const [choMay, setChoMay] = useState<number | null>(null);      // đã bấm Làm mới lúc này, đang chờ máy gửi
  const { lam, loi: loiLam, dangChay } = useLam();
  const lamMoi = useLam();
  const { bao, noi } = useHoanTac();
  const capTruoc = useRef<string | null>(null);

  // Chờ máy gửi danh sách mới sau «Làm mới»: tải lại mỗi 5 giây tới khi capNhatLuc đổi (tối đa 90 giây) — dừng khi rời màn.
  useFocusEffect(useCallback(() => {
    if (choMay === null) return;
    const t = setInterval(() => { if (Date.now() - choMay > CHO_MAY_TOI_DA) setChoMay(null); else tai(); }, CHO_MAY_MS);
    return () => clearInterval(t);
  }, [choMay, tai]));
  useEffect(() => {
    // so với mốc MÁY CHỦ trước khi bấm (không so đồng hồ điện thoại — lệch giờ làm hỏng phép so)
    if (choMay !== null && d?.capNhatLuc && d.capNhatLuc !== capTruoc.current) {
      setChoMay(null);
      bao(`Đã có danh sách mới từ ${d.may.ten}`);
    }
  }, [d, choMay, bao]);

  if (!d) return <Man lui={{ chu: "" }} tieu="App trên máy"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;

  const q = tim.trim().toLowerCase();
  // «Chặn» cũ = chưa có trong danh sách; «cho_phep» cũ = Không tính phút
  const tt = (a: AppMay): TrangThai => (a.trangThai === "chan" ? "chua_xep" : a.trangThai === "cho_phep" ? "hoc" : a.trangThai);
  const dem = (t: TrangThai) => d.ds.filter((a) => tt(a) === t).length;
  const ds = d.ds.filter((a) => (loc === "tat_ca" || tt(a) === loc)
    && (!q || a.ten.toLowerCase().includes(q) || a.muc.toLowerCase().includes(q) || (a.nhaPhatHanh ?? "").toLowerCase().includes(q)));
  const choLoc: { gia: Loc; chu: string }[] = [
    { gia: "tat_ca", chu: `Tất cả (${d.ds.length})` },
    ...(["chua_xep", "hoc", "giai_tri"] as TrangThai[]).filter((t) => dem(t) > 0).map((t) => ({ gia: t as Loc, chu: `${TT[t].chu} (${dem(t)})` })),
  ];
  const cho = d.may.dungChung ? "mọi con dùng máy này" : "con trên máy này";

  const moChon = (a: AppMay) => {
    setChon(a);
    setDat(a.trangThai === "hoc" || a.trangThai === "cho_phep" ? "khong_tinh_phut" : "tinh_phut");
    setNhom(a.nhom ?? "game");
  };
  const luu = () => lam(async () => {
    const a = chon!;
    const kq = await bm.goi<{ muc: string; con: string; truoc: LuatCu }>(`may/${may}/ung-dung/dat`, { khoa: a.khoa, trangThai: dat, nhom });
    setChon(null);
    await tai();
    bao(`Đã thêm ${a.ten} · ${TEN_DAT[dat]}`, () => {
      const t = kq.truoc;
      // neuLoai: chỉ hoàn tác khi luật vẫn đúng loại vừa đặt — người khác đổi trong lúc đó ⇒ máy chủ trả 409, không đè
      const neuLoai = LOAI_DAT[dat];
      (t ? bm.goi("luat", { con: kq.con, muc: t.muc, ten: t.ten, loai: t.loai, nhom: t.nhom, het: t.het, neuLoai }) : bm.goi("luat/xoa", { con: kq.con, muc: kq.muc, neuLoai }))
        .then(() => tai(), () => tai());
    });
  });
  const boXep = () => lam(async () => {
    const a = chon!;
    await bm.goi(`may/${may}/ung-dung/dat`, { khoa: a.khoa, trangThai: "bo" });
    setChon(null);
    await tai();
    bao(`Đã bỏ ${a.ten} khỏi danh sách`);
  });
  const yeuCauGui = () => lamMoi.lam(async () => {
    capTruoc.current = d.capNhatLuc;
    await bm.goi(`may/${may}/ung-dung/lam-moi`, {});
    setChoMay(Date.now());
  });

  const capNhat = d.capNhatLuc ? `Cập nhật lúc ${gioPhut(d.capNhatLuc)} (${truoc(d.capNhatLuc)})` : "Máy chưa gửi danh sách ứng dụng";
  return (
    <Man lui={{ chu: "" }} tieu="Mọi app trên máy" noi={noi} tai={tai} vongTai>
      <View style={{ gap: 4 }}>
        <Chu kieu="dam" co={22}>Ứng dụng trên máy {d.may.ten}</Chu>
        <Chu co={14} mau={M.chu3}>Danh sách lấy thẳng từ máy — chọn đúng app để thêm vào danh sách của con.</Chu>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1, minWidth: 0, flexGrow: 1 }}>
          <Icon ten="dongho" mau={M.chu3} co={16} />
          <Chu co={13.5} mau={M.chu3} style={{ flexShrink: 1 }}>{choMay !== null ? "Đang chờ máy gửi danh sách mới…" : capNhat}</Chu>
        </View>
        <Nut chu="Làm mới" nho loai="vien" ic="tro_lai" dangChay={lamMoi.dangChay || choMay !== null} bam={yeuCauGui} nhanDoc="Yêu cầu máy gửi lại danh sách ứng dụng" />
      </View>
      <BaoLoi loi={lamMoi.loi} />

      {!d.ds.length ? (
        <CanhGiua lv="cho" tieu={d.capNhatLuc ? "Máy chưa có ứng dụng nào để xếp" : "Chưa có danh sách ứng dụng"}
          loi={d.capNhatLuc ? "Các app hệ thống không cần xếp. Cài app mới trên máy Con rồi bấm Làm mới."
            : "Máy cần mở và có mạng; bản AiiGrow trên máy phải là bản mới nhất. Bấm Làm mới — danh sách hiện sau ít phút."} />
      ) : (
        <>
          <ONhap nhan="Tìm theo tên app hoặc nhà phát hành" value={tim} onChangeText={setTim} placeholder="Roblox, Zalo, Minecraft…" autoCapitalize="none" />
          <ChonMot ds={choLoc} gia={loc} doi={setLoc} />
          {ds.length ? (
            <>
              <NhomTieu chu={`${ds.length} ứng dụng`} />
              <Nhom>
                {ds.map((a, i) => (
                  <Dong key={a.khoa} dau={i === 0} tieu={a.ten} phu={phuCua(a)} trai={<IconApp a={a} />}
                    phai={<Nhan loai={TT[tt(a)].nhan} chu={TT[tt(a)].chu} />} bam={() => moChon(a)} />
                ))}
              </Nhom>
            </>
          ) : <Chu co={14} mau={M.chu3}>{q ? "Không có app nào khớp — thử tên khác, hoặc bấm Làm mới nếu Con vừa cài app." : "Không có app nào ở mục này."}</Chu>}
          <Chu co={13} mau={M.chu3}>Ở chế độ «Theo danh sách», app chưa thêm thì con chưa mở được — con bấm «Xin Ba Mẹ mở» trên máy. Thay đổi tới máy ở lần đồng bộ kế (≤ 2 phút khi online).</Chu>
        </>
      )}

      <BangTruot mo={!!chon} dong={() => setChon(null)} tieu={chon?.ten ?? ""}>
        {chon ? (
          <View style={{ gap: 4 }}>
            <Chu co={13} mau={M.chu3}>{[chon.nhaPhatHanh, chon.teamId ? `Team ID ${chon.teamId}` : null].filter(Boolean).join(" · ") || "Nhà phát hành chưa rõ"}</Chu>
            <Chu co={12.5} mau={M.chu3} dong={2}>{chon.duongDan ?? chon.muc}</Chu>
            {chon.theoCaNha ? <Chu co={13} mau={M.chu3}>Đang theo luật chung của cả nhà — chọn ở đây sẽ áp riêng cho {cho}.</Chu> : null}
            {chon.tamThoi ? <Chu co={13} mau={M.chu3}>Đang được mở tạm (Lần này / Hôm nay).</Chu> : null}
          </View>
        ) : null}
        {chon?.trangThai === "he_thong" ? (
          <Chu co={14.5}>App hệ thống luôn được dùng, không trừ sao — Ba Mẹ không cần làm gì.</Chu>
        ) : (
          <>
            {/* cùng các bước, cùng chữ với luồng xếp loại cũ (màn Ứng dụng / thẻ «app mới chờ xếp loại») — chỉ khác nguồn danh sách là app thật của máy */}
            <View style={{ gap: 8 }}>
              {(["tinh_phut", "khong_tinh_phut"] as const).map((k) => (
                <OChon key={k} chon={dat === k} bam={() => setDat(k)} tieu={TEN_DAT[k]} phu={k === "tinh_phut" ? "Trả bằng sao · 1 sao = 1 phút" : "Vào thoải mái"}
                  trai={<View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: MAU_NHOM[k] }} />} />
              ))}
            </View>
            <BaoLoi loi={loiLam} />
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}><Icon ten="dongho" mau={M.chu3} co={16} />
              <Chu co={13} mau={M.chu3} style={{ flexShrink: 1 }}>Có hiệu lực trên máy Con ở lần đồng bộ kế (≤ 2 phút khi online).</Chu></View>
            <Nut chu={`Thêm ${chon?.ten ?? "app này"} · ${TEN_DAT[dat]}`} rong dangChay={dangChay} bam={luu} />
            {chon && chon.trangThai !== "chua_xep" && chon.trangThai !== "chan" ? <Nut chu={`Bỏ ${chon.ten} khỏi danh sách`} rong loai="huy" tat={dangChay} bam={boXep} /> : null}
          </>
        )}
      </BangTruot>
    </Man>
  );
}
