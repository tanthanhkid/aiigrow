// bm-ung-dung-may: «Ứng dụng trên máy <tên>» — danh sách APP ĐÃ CÀI THẬT do agent trên máy Con gửi lên (Windows: registry + Start Menu + Store;
// Mac: /Applications; Android: app có biểu tượng). Ba Mẹ chọn Cho phép / Học tập / Giải trí / Chặn cho đúng app của máy — máy chủ lấy định danh
// thật (tên exe chính / gói Store / bundle id / package) từ danh sách, không đoán tên (Thanh 25/10). «Làm mới» ⇒ máy gửi lại ở lần đồng bộ kế.
// Gọi GET may/:id/ung-dung, POST may/:id/ung-dung/dat, POST may/:id/ung-dung/lam-moi; Hoàn tác qua luat / luat/xoa (docs/API.md).
import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { Image, View } from "react-native";
import { bm } from "@/lib/api";
import {
  Avt, BangTruot, BaoLoi, BieuTron, CanhGiua, MAU_CON, ChoTai, ChonMot, Chu, Dong, gioPhut, Icon, M, Man, Nhan, Nhom, NhomTieu, Nut, OChon, ONhap, truoc, useHoanTac, useLam, useTai,
} from "@/lib/ui";

type TrangThai = "he_thong" | "cho_phep" | "hoc" | "giai_tri" | "chan" | "chua_xep";
type AppMay = {
  khoa: string; muc: string; ten: string; nguon: string | null; nhaPhatHanh: string | null; teamId: string | null; duongDan: string | null;
  phienBan: string | null; icon: string | null; trangThai: TrangThai; nhom: string | null; theoCaNha: boolean; tamThoi?: boolean;
};
type DsMay = { may: { id: string; ten: string; nen: string; dungChung: boolean; con: string | null }; capNhatLuc: string | null; yeuCauLuc: string | null; ds: AppMay[] };
type LuatCu = { con: string; muc: string; ten: string; loai: string; nhom: string; het: string | null } | null;

const TT: Record<TrangThai, { chu: string; nhan: "ok" | "lam" | "diem" | "loi" | "xam" | "canh" }> = {
  he_thong: { chu: "Hệ thống", nhan: "xam" }, cho_phep: { chu: "Cho phép", nhan: "ok" }, hoc: { chu: "Học tập", nhan: "lam" },
  giai_tri: { chu: "Giải trí", nhan: "diem" }, chan: { chu: "Chặn", nhan: "loi" }, chua_xep: { chu: "Chưa xếp", nhan: "canh" },
};
const NHOM = [{ gia: "game", chu: "Trò chơi" }, { gia: "video_ngan", chu: "Video ngắn" }, { gia: "mxh", chu: "Mạng xã hội" }, { gia: "phim_gd", chu: "Phim giáo dục" }];
const NGUON: Record<string, string> = {
  registry: "Đã cài", start: "Menu Start", store: "Microsoft Store", applications: "Thư mục Ứng dụng", "user-applications": "Ứng dụng của Con", launcher: "Màn hình chính",
};
type Loc = "tat_ca" | TrangThai;
type Dat = "cho_phep" | "hoc" | "giai_tri" | "chan";
const CHO_MAY_MS = 5000, CHO_MAY_TOI_DA = 90_000;

/** Icon THẬT của app (PNG 96 px agent trích từ máy: exe/AppxManifest, .icns, PackageManager) — nhìn logo là nhận ra app.
 *  Chỉ khi máy không trích được icon mới dùng chữ cái đầu của tên app. */
function IconApp({ a }: { a: AppMay }) {
  return (
    <View style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center",
      boxShadow: "inset 0px 1px 0px rgba(255,255,255,0.9), 0px 2px 4px -1px rgba(0,0,0,0.18)" }}>
      {a.icon ? <Image source={{ uri: `data:image/png;base64,${a.icon}` }} style={{ width: 40, height: 40 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        : <Avt ten={a.ten} mau={MAU_CON[[...a.ten].reduce((n, c) => n + c.charCodeAt(0), 0) % MAU_CON.length]} co={40} />}
      {a.trangThai === "chan" ? (
        <View style={{ position: "absolute", right: -4, bottom: -4, width: 20, height: 20, borderRadius: 10, backgroundColor: M.loi, alignItems: "center", justifyContent: "center" }}>
          <Icon ten="khoa" mau="#fff" co={12} />
        </View>
      ) : null}
    </View>
  );
}

const phuCua = (a: AppMay) => [a.nhaPhatHanh, a.nguon ? NGUON[a.nguon] : null, a.phienBan ? `bản ${a.phienBan}` : null].filter(Boolean).join(" · ") || a.muc;

export default function UngDungMay() {
  const { may } = useLocalSearchParams<{ may: string }>();
  const { d, loi, matMang, tai, dangTai } = useTai(() => bm.goi<DsMay>(`may/${may}/ung-dung`));
  const [tim, setTim] = useState("");
  const [loc, setLoc] = useState<Loc>("tat_ca");
  const [chon, setChon] = useState<AppMay | null>(null);
  const [dat, setDat] = useState<Dat>("giai_tri");
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

  if (!d) return <Man lui={{ chu: "Máy" }} tieu="Ứng dụng"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;

  const q = tim.trim().toLowerCase();
  const dem = (t: TrangThai) => d.ds.filter((a) => a.trangThai === t).length;
  const ds = d.ds.filter((a) => (loc === "tat_ca" || a.trangThai === loc)
    && (!q || a.ten.toLowerCase().includes(q) || a.muc.toLowerCase().includes(q) || (a.nhaPhatHanh ?? "").toLowerCase().includes(q)));
  const choLoc: { gia: Loc; chu: string }[] = [
    { gia: "tat_ca", chu: `Tất cả (${d.ds.length})` },
    ...(["chua_xep", "chan", "cho_phep", "hoc", "giai_tri"] as TrangThai[]).filter((t) => dem(t) > 0 || t === "chan").map((t) => ({ gia: t as Loc, chu: `${TT[t].chu} (${dem(t)})` })),
  ];
  const cho = d.may.dungChung ? "mọi Con dùng máy này" : "Con trên máy này";

  const moChon = (a: AppMay) => {
    setChon(a);
    setDat(a.trangThai === "he_thong" || a.trangThai === "chua_xep" ? "giai_tri" : a.trangThai === "cho_phep" ? "hoc" : (a.trangThai as Dat));
    setNhom(a.nhom ?? "game");
  };
  const luu = () => lam(async () => {
    const a = chon!;
    const kq = await bm.goi<{ muc: string; con: string; truoc: LuatCu }>(`may/${may}/ung-dung/dat`, { khoa: a.khoa, trangThai: dat, nhom });
    setChon(null);
    await tai();
    bao(`Đã xếp ${a.ten} vào ${dat === "chan" ? "Chặn" : TT[dat].chu}`, () => {
      const t = kq.truoc;
      // neuLoai: chỉ hoàn tác khi luật vẫn đúng loại vừa đặt — người khác đổi trong lúc đó ⇒ máy chủ trả 409, không đè
      const neuLoai = dat === "cho_phep" ? "hoc" : dat;
      (t ? bm.goi("luat", { con: kq.con, muc: t.muc, ten: t.ten, loai: t.loai, nhom: t.nhom, het: t.het, neuLoai }) : bm.goi("luat/xoa", { con: kq.con, muc: kq.muc, neuLoai }))
        .then(() => tai(), () => tai());
    });
  });
  const boXep = () => lam(async () => {
    const a = chon!;
    await bm.goi(`may/${may}/ung-dung/dat`, { khoa: a.khoa, trangThai: "bo" });
    setChon(null);
    await tai();
    bao(`${a.ten} về «Chưa xếp»`);
  });
  const yeuCauGui = () => lamMoi.lam(async () => {
    capTruoc.current = d.capNhatLuc;
    await bm.goi(`may/${may}/ung-dung/lam-moi`, {});
    setChoMay(Date.now());
  });

  const capNhat = d.capNhatLuc ? `Cập nhật lúc ${gioPhut(d.capNhatLuc)} (${truoc(d.capNhatLuc)})` : "Máy chưa gửi danh sách ứng dụng";
  return (
    <Man lui={{ chu: "Máy" }} tieu="Ứng dụng" noi={noi} tai={tai} dangTai={dangTai}>
      <View style={{ gap: 4 }}>
        <Chu kieu="dam" co={22}>Ứng dụng trên máy {d.may.ten}</Chu>
        <Chu co={14} mau={M.chu3}>Danh sách lấy thẳng từ máy — chọn đúng app để chặn hoặc cho phép.</Chu>
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
                    phai={<Nhan loai={TT[a.trangThai].nhan} chu={TT[a.trangThai].chu} />} bam={() => moChon(a)} />
                ))}
              </Nhom>
            </>
          ) : <Chu co={14} mau={M.chu3}>{q ? "Không có app nào khớp — thử tên khác, hoặc bấm Làm mới nếu Con vừa cài app." : "Không có app nào ở mục này."}</Chu>}
          <Chu co={13} mau={M.chu3}>App «Chưa xếp» chưa mở được trên máy Con cho tới khi Ba Mẹ xếp loại. Thay đổi tới máy ở lần đồng bộ kế (≤ 2 phút khi online).</Chu>
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
          <Chu co={14.5}>App hệ thống luôn được dùng (không tính điểm) — Ba Mẹ không cần làm gì.</Chu>
        ) : (
          <>
            {/* cùng các bước, cùng chữ với luồng xếp loại cũ (màn Ứng dụng / thẻ «app mới chờ xếp loại») — chỉ khác nguồn danh sách là app thật của máy */}
            <View style={{ gap: 8 }}>
              <OChon chon={dat === "hoc"} bam={() => setDat("hoc")} trai={<BieuTron ic="mu" />} tieu="Học tập — miễn phí" phu="Không trừ điểm, dùng cả giờ học" />
              <OChon chon={dat === "giai_tri"} bam={() => setDat("giai_tri")} trai={<BieuTron ic="game" mau="vang" />} tieu="Giải trí — trừ điểm" phu="Chỉ trong giờ chơi" />
              <OChon chon={dat === "chan"} bam={() => setDat("chan")} trai={<BieuTron ic="khoa" mau="do" />} tieu="Chặn hoàn toàn" phu="Con không mở được" />
            </View>
            {dat === "giai_tri" ? <ChonMot ds={NHOM} gia={nhom} doi={setNhom} /> : null}
            <BaoLoi loi={loiLam} />
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}><Icon ten="dongho" mau={M.chu3} co={16} />
              <Chu co={13} mau={M.chu3} style={{ flexShrink: 1 }}>Có hiệu lực trên máy Con ở lần đồng bộ kế (≤ 2 phút khi online).</Chu></View>
            <Nut chu="Lưu phân loại" rong dangChay={dangChay} bam={luu} />
            {chon && chon.trangThai !== "chua_xep" && !chon.theoCaNha ? <Nut chu="Bỏ xếp loại" rong loai="vien" tat={dangChay} bam={boXep} /> : null}
          </>
        )}
      </BangTruot>
    </Man>
  );
}
