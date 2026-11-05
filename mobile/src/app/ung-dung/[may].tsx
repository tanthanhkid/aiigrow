// bm2-ung-dung-may «App trên <máy> của <con>» (thiết kế chốt bm-ung-dung/01): chế độ đang chạy + «Đổi chế độ», hàng vàng «Con đang xin», «Được dùng ·
// N app · x/y phút giờ chơi» (nhãn «Tính vào giờ chơi» / «Không tính giờ»), «Trang web & luôn chặn», nút «Thêm app cho <con>».
// Danh sách là APP ĐÃ CÀI THẬT do agent trên máy Con gửi lên (Thanh 25/10: chọn đúng app của máy, không đoán tên) — GET may/:id/ung-dung.
// «Mọi app trên máy» mở danh sách đủ (tìm, Làm mới, xếp từng app) cho máy dùng chung / app chưa xếp. Không còn «Học tập / Giải trí — trừ điểm».
import { useCallback, useEffect, useRef, useState } from "react";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Image, View } from "react-native";
import { bm, laChiXem, type ConChiTiet, type GiaDinh, type ThongKeWeb, type YeuCau } from "@/lib/api";
import { HangVang, MucTieu, NhanGio, OIcon, TheCheDoNgan, gioChoi, icCuaApp, napQuyCon, phuXin, tieuXin, type CheDoChan } from "@/lib/ui-bm3";
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
  he_thong: { chu: "Hệ thống", nhan: "xam" }, cho_phep: { chu: "Cho phép", nhan: "ok" }, hoc: { chu: "Không tính giờ", nhan: "ok" },
  giai_tri: { chu: "Tính vào giờ chơi", nhan: "diem" }, chan: { chu: "Không cho dùng", nhan: "loi" }, chua_xep: { chu: "Chưa xếp", nhan: "canh" },
};
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
  const { d, loi, matMang, tai } = useTai(() => bm.goi<DsMay>(`may/${may}/ung-dung`));
  // phần đầu màn: con dùng máy (chế độ chặn, quỹ giờ chơi hôm nay, lời xin đang chờ, số trang web được phép)
  const conId = d?.may.con ?? null;
  const conRef = useRef(conId);
  const ph = useTai(async () => {
    const conId = conRef.current;
    if (!conId) return null;
    const [ct, g, cd, web, xem] = await Promise.all([
      bm.goi<ConChiTiet & { cheDoChan?: CheDoChan }>(`con/${conId}`), bm.goi<GiaDinh>("gia-dinh"),
      bm.goi<{ yeuCau: YeuCau[] }>("cho-duyet").catch(() => ({ yeuCau: [] as YeuCau[] })), bm.goi<ThongKeWeb>(`con/${conId}/web?ngay=1`).catch(() => null), laChiXem(),
    ]);
    const quy = await napQuyCon(conId);
    return { ct, quy, ngan: g.con.find((c) => c.id === conId), xin: cd.yeuCau.filter((y) => y.child_id === conId && (y.loai === "cai_app" || y.loai === "mo_web")),
      soWeb: web ? web.luat.filter((l) => l.trangThai === "cho_phep" || l.trangThai === "giai_tri").length : null, xem };
  });
  // useTai giữ hàm tải của lần dựng đầu ⇒ hàm tải đọc con qua ref; đổi con thì cập nhật ref rồi tải lại
  useEffect(() => { conRef.current = conId; if (conId) ph.tai(); }, [conId]);      // eslint-disable-line react-hooks/exhaustive-deps
  const [tatCa, setTatCa] = useState(false);
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

  if (!d) return <Man lui={{ chu: "" }} tieu="App trên máy"><ChoTai loi={loi} matMang={matMang} tai={tai} /></Man>;

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
    bao(dat === "chan" ? `Đã chặn ${a.ten}` : `${a.ten}: ${TT[dat].chu}`, () => {
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

  const capNhatNgan = d.capNhatLuc ? `Máy gửi lúc ${gioPhut(d.capNhatLuc)} · tìm, làm mới, xếp từng app` : "Máy chưa gửi danh sách ứng dụng";
  const p = conId && ph.d?.ct.id === conId ? ph.d : null;
  if (!tatCa && conId) {
    const duoc = d.ds.filter((a) => a.trangThai === "cho_phep" || a.trangThai === "hoc" || a.trangThai === "giai_tri");
    const tenCon = p?.ct.ten ?? "con";
    return (
      <Man lui={{ chu: "" }} tieu={`App trên ${d.may.ten}${p ? ` của ${tenCon}` : ""}`} noi={noi} tai={tai} vongTai
        day={p?.xem ? undefined : <Nut chu={`Thêm app cho ${tenCon}`} rong bam={() => router.push({ pathname: "/ung-dung/them", params: { may, con: conId } })} />}>
        {p ? <TheCheDoNgan cheDo={p.ct.cheDoChan ?? "chi_app_duoc_phep"} doi={p.xem ? undefined : () => router.push(`/app-web?con=${conId}`)} /> : null}
        {p?.xin.map((y) => <HangVang key={y.id} tieu={tieuXin(y)} phu={phuXin(y)} bam={() => router.push({ pathname: "/yeu-cau-web/[id]", params: { id: y.id } })} />)}
        <MucTieu chu={`Được dùng · ${duoc.length} app${p?.ngan ? ` · ${gioChoi(p.ngan, p.quy).da}/${gioChoi(p.ngan, p.quy).tong} phút giờ chơi` : ""}`} />
        <Nhom>
          {duoc.map((a, i) => (
            <Dong key={a.khoa} dau={i === 0} tieu={a.ten} phu={a.theoCaNha ? "Luật cả nhà" : a.nhaPhatHanh ?? undefined} trai={<OIcon ic={icCuaApp(`${a.ten} ${a.muc}`)} anh={a.icon} />}
              phai={<View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><NhanGio tinh={a.trangThai === "giai_tri"} /><Icon ten="phai" mau="#b3b5b1" co={18} /></View>}
              bam={() => router.push({ pathname: "/ung-dung/app", params: { con: conId, muc: a.muc, ten: a.ten } })} />
          ))}
          <Dong dau={!duoc.length} tieu={`Mọi app trên máy (${d.ds.length})`} phu={choMay !== null ? "Đang chờ máy gửi danh sách mới…" : capNhatNgan} trai={<OIcon ic="luoi" />}
            bam={() => setTatCa(true)} />
        </Nhom>
        <MucTieu chu="Trang web & luôn chặn" />
        <Nhom>
          <Dong dau tieu="Trang web" phu={p?.soWeb === null || p?.soWeb === undefined ? "Trang được phép, trang đã chặn" : `${p.soWeb} trang được phép`} trai={<OIcon ic="web" />}
            bam={() => router.push(`/web/${conId}`)} />
          <Dong tieu="Luôn chặn" phu="Web người lớn, cờ bạc, bạo lực" trai={<OIcon ic="khien" />} bam={() => router.push("/web/luon-chan")} />
        </Nhom>
      </Man>
    );
  }

  const capNhat = d.capNhatLuc ? `Cập nhật lúc ${gioPhut(d.capNhatLuc)} (${truoc(d.capNhatLuc)})` : "Máy chưa gửi danh sách ứng dụng";
  return (
    <Man lui={{ chu: "", bam: conId ? () => setTatCa(false) : undefined }} tieu="Mọi app trên máy" noi={noi} tai={tai} vongTai>
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
          <Chu co={13} mau={M.chu3}>Ở chế độ «Chỉ app được phép», app «Chưa xếp» chưa mở được — con bấm «Xin Ba Mẹ» trên máy. Thay đổi tới máy ở lần đồng bộ kế (≤ 2 phút khi online).</Chu>
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
          <Chu co={14.5}>App hệ thống luôn được dùng, không tính giờ — Ba Mẹ không cần làm gì.</Chu>
        ) : (
          <>
            {/* cùng các bước, cùng chữ với luồng xếp loại cũ (màn Ứng dụng / thẻ «app mới chờ xếp loại») — chỉ khác nguồn danh sách là app thật của máy */}
            <View style={{ gap: 8 }}>
              <OChon chon={dat === "hoc"} bam={() => setDat("hoc")} trai={<BieuTron ic="sach" />} tieu="Cho dùng, không tính giờ" phu="Học, tra cứu — dùng cả ngoài giờ chơi" />
              <OChon chon={dat === "giai_tri"} bam={() => setDat("giai_tri")} trai={<BieuTron ic="game" mau="vang" />} tieu="Cho dùng, tính vào giờ chơi" phu="Chỉ trong giờ chơi của ngày" />
              <OChon chon={dat === "chan"} bam={() => setDat("chan")} trai={<BieuTron ic="khoa" mau="do" />} tieu="Không cho dùng" phu="Con không mở được" />
            </View>
            <BaoLoi loi={loiLam} />
            <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}><Icon ten="dongho" mau={M.chu3} co={16} />
              <Chu co={13} mau={M.chu3} style={{ flexShrink: 1 }}>Có hiệu lực trên máy Con ở lần đồng bộ kế (≤ 2 phút khi online).</Chu></View>
            <Nut chu={`Lưu cho ${chon?.ten ?? "app này"}`} rong dangChay={dangChay} bam={luu} />
            {chon && chon.trangThai !== "chua_xep" && !chon.theoCaNha ? <Nut chu="Bỏ xếp loại" rong loai="vien" tat={dangChay} bam={boXep} /> : null}
          </>
        )}
      </BangTruot>
    </Man>
  );
}
