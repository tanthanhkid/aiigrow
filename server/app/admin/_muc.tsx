"use client";
// Các mục của cổng admin. Không mục nào hiện ảnh bằng chứng của Con (Admin không xem ảnh — KE-HOACH 5.5).
import { useState, type FormEvent } from "react";
import { api, hienMa, luc, ngay, NhanPhieu, so, Tai, tien, Tieu, TT_PHIEU, useTai } from "./_lib";
import { I3d } from "../_clay/Icon";

const LOAI_GD: Record<string, string> = { nap: "Nạp quỹ", phat_hanh: "Phát hành phiếu", hoan: "Hoàn quỹ" };
const VAI_BM: Record<string, string> = { chu: "Chủ gia đình", duyet: "Được duyệt", xem: "Chỉ xem" };

// ---------------------------------------------------------------- tổng quan
type TQ = { soGiaDinh: number; soCon: number; soMay: number; quyDangGiu: number; napThang: number; dungThang: number; hoTroChoTraLoi: number;
  phieu: Record<string, { n: number; tien: number }> };
export function TongQuan() {
  const t = useTai<TQ>("tong-quan");
  return (<>
    <Tieu ten="Tổng quan" mo="Số liệu toàn hệ thống AiiGrow, cập nhật mỗi lần mở." />
    <Tai t={t}>{(d) => (<>
      <div className="luoi-so">
        <div className="o-so"><I3d ten="house-with-garden" mau="xanh" /><small>Gia đình</small><b>{so(d.soGiaDinh)}</b><em>{so(d.soCon)} Con · {so(d.soMay)} máy</em></div>
        <div className="o-so"><I3d ten="money-bag" mau="vang" /><small>Quỹ phiếu quà đang giữ</small><b>{tien(d.quyDangGiu)}</b><em>tổng quỹ trả trước của các gia đình</em></div>
        <div className="o-so"><I3d ten="inbox-tray" mau="lam" /><small>Nạp quỹ tháng này</small><b>{tien(d.napThang)}</b></div>
        <div className="o-so"><I3d ten="hot-beverage" mau="cam" /><small>Phiếu quà đã dùng tháng này</small><b>{tien(d.dungThang)}</b></div>
        <a className={`o-so ${d.hoTroChoTraLoi ? "noi" : ""}`} href="#ho-tro">
          <I3d ten="speech-balloon" mau="tim" className={d.hoTroChoTraLoi ? "rung" : ""} /><small>Tin hỗ trợ chờ trả lời</small><b>{so(d.hoTroChoTraLoi)}</b><em>mở mục Hỗ trợ</em></a>
      </div>
      <h2>Phiếu quà AiiCafe</h2>
      <div className="luoi-so">
        {Object.entries(TT_PHIEU).map(([k, [ten]]) => (
          <div className="o-so" key={k}><small>{ten}</small><b>{so(d.phieu[k]?.n)}</b><em>{tien(d.phieu[k]?.tien)}</em></div>))}
      </div>
    </>)}</Tai>
  </>);
}

// ---------------------------------------------------------------- gia đình + nạp quỹ
type GdDong = { id: string; ten: string; quy_voucher: number; so_con: number; chu: string | null; dinh_danh: string | null; created_at: string };
export function GiaDinh() {
  const [tim, setTim] = useState(""), [timGui, setTimGui] = useState("");
  const t = useTai<{ ds: GdDong[] }>(`gia-dinh?tim=${encodeURIComponent(timGui)}`);
  return (<>
    <Tieu ten="Gia đình" mo="Tìm theo tên gia đình, tên Ba Mẹ, số điện thoại hoặc email. Chọn một gia đình để ghi nạp quỹ phiếu quà." />
    <form className="hang" onSubmit={(e) => { e.preventDefault(); setTimGui(tim.trim()); }}>
      <label><span className="sr">Tìm gia đình</span><span className="o-nhap">
        <input aria-label="Tìm gia đình" placeholder="Tên, số điện thoại hoặc email" value={tim} onChange={(e) => setTim(e.target.value)} /></span></label>
      <button className="nut" type="submit">Tìm</button>
    </form>
    <Tai t={t}>{(d) => d.ds.length ? (
      <div className="nhom">{d.ds.map((g) => (
        <a className="dong" key={g.id} href={`#gia-dinh/${g.id}`} style={{ textDecoration: "none", color: "inherit" }}>
          <div className="gi"><b>{g.ten}</b><small>{g.chu ?? "—"} · {g.dinh_danh ?? "—"} · {g.so_con} Con · từ {ngay(g.created_at)}</small></div>
          <span className="nhan diem">Quỹ {tien(g.quy_voucher)}</span>
        </a>))}</div>
    ) : <p className="trong">{timGui ? `Không có gia đình nào khớp «${timGui}».` : "Chưa có gia đình nào đăng ký."}</p>}</Tai>
  </>);
}

type CtGd = { id: string; ten: string; quy_voucher: number; created_at: string; soMay: number;
  baMe: { ten: string; vai: string; dinh_danh: string }[]; con: { id: string; ten: string; nhom: string; nam_sinh: number | null; soDu: number }[];
  giaoDich: { so_tien: number; loai: string; ghi_chu: string; ref: string | null; created_at: string }[];
  voucher: { ma: string; menh_gia: number; trang_thai: string; het_han: string; dung_luc: string | null; quay: string | null; ten_con: string | null }[] };
export function ChiTietGd({ id }: { id: string }) {
  const t = useTai<CtGd>(`gia-dinh/${id}`);
  const [soTien, setSoTien] = useState(""), [ghiChu, setGhiChu] = useState(""), [loi, setLoi] = useState(""), [bao, setBao] = useState(""), [dang, setDang] = useState(false);
  const nap = async (e: FormEvent) => {
    e.preventDefault();
    const n = Number(soTien.replace(/[^\d]/g, ""));
    if (!(n >= 1000)) { setLoi("Nhập số tiền từ 1.000đ"); return; }
    setDang(true); setLoi(""); setBao("");
    try {
      const r = await api<{ soDu: number }>(`gia-dinh/${id}/nap-quy`, { soTien: n, ghiChu });
      setBao(`Đã ghi nạp ${tien(n)}. Quỹ mới: ${tien(r.soDu)}`); setSoTien(""); setGhiChu(""); t.nap();
    } catch (er) { setLoi((er as Error).message); }
    setDang(false);
  };
  return (<>
    <a className="lui" href="#gia-dinh">‹ Danh sách gia đình</a>
    <Tai t={t}>{(d) => (<>
      <Tieu ten={d.ten} mo={`Đăng ký ${ngay(d.created_at)} · ${d.con.length} Con · ${d.soMay} máy đã ghép`} phai={<span className="nhan diem">Quỹ {tien(d.quy_voucher)}</span>} />
      <div className="hai-cot">
        <form className="the dem" onSubmit={nap}>
          <h2>Ghi nạp quỹ phiếu quà</h2>
          <p className="ghi-chu">Ghi khi Ba Mẹ đã trả tiền mặt / chuyển khoản tại AiiCafe. Mỗi lần ghi đều vào nhật ký kiểm toán.</p>
          <label><span className="nhan-o">Số tiền (đồng)</span><span className="o-nhap">
            <input aria-label="Số tiền nạp" inputMode="numeric" placeholder="vd 200000" value={soTien} onChange={(e) => setSoTien(e.target.value)} /></span></label>
          <label><span className="nhan-o">Ghi chú</span><span className="o-nhap">
            <input aria-label="Ghi chú nạp quỹ" placeholder="vd Chuyển khoản VCB 21/10" value={ghiChu} onChange={(e) => setGhiChu(e.target.value)} /></span></label>
          {loi ? <p className="ghi-loi" role="alert">{loi}</p> : null}
          {bao ? <p className="bao ok-b" role="status">{bao}</p> : null}
          <button className="nut" type="submit" disabled={dang}>{dang ? "Đang ghi…" : "Ghi nạp quỹ"}</button>
        </form>
        <div className="the dem">
          <h2>Ba Mẹ</h2>
          <div className="nhom">{d.baMe.map((b, i) => (
            <div className="dong" key={i}><div className="gi"><b>{b.ten}</b><small>{b.dinh_danh}</small></div><span className="nhan xam">{VAI_BM[b.vai] ?? b.vai}</span></div>))}</div>
          <h2>Con</h2>
          {d.con.length ? <div className="nhom">{d.con.map((c) => (
            <div className="dong" key={c.id}><div className="gi"><b>{c.ten}</b><small>{c.nhom === "teen" ? "Teen (11–16)" : "Nhí (6–10)"}{c.nam_sinh ? ` · sinh ${c.nam_sinh}` : ""}</small></div>
              <span className="nhan diem">{so(c.soDu)} điểm</span></div>))}</div> : <p className="ghi-chu">Chưa tạo hồ sơ Con.</p>}
        </div>
      </div>
      <h2>Giao dịch quỹ</h2>
      {d.giaoDich.length ? <div className="bang"><table><thead><tr><th>Lúc</th><th>Loại</th><th>Ghi chú</th><th className="so">Số tiền</th></tr></thead><tbody>
        {d.giaoDich.map((g, i) => <tr key={i}><td className="nw">{luc(g.created_at)}</td><td className="nw">{LOAI_GD[g.loai] ?? g.loai}</td>
          <td>{g.ghi_chu}{g.ref ? ` · ${hienMa(g.ref)}` : ""}</td><td className="so">{g.so_tien > 0 ? "+" : ""}{tien(g.so_tien)}</td></tr>)}
      </tbody></table></div> : <p className="ghi-chu">Chưa có giao dịch.</p>}
      <h2>Phiếu quà của gia đình</h2>
      {d.voucher.length ? <BangPhieu ds={d.voucher.map((v) => ({ ...v, ten_gd: d.ten }))} /> : <p className="ghi-chu">Chưa đổi phiếu quà nào.</p>}
    </>)}</Tai>
  </>);
}

// ---------------------------------------------------------------- kho phiếu quà + đối soát
type Phieu = { ma: string; menh_gia: number; trang_thai: string; het_han: string; dung_luc: string | null; quay: string | null; ten_con: string | null; ten_gd?: string };
function BangPhieu({ ds }: { ds: Phieu[] }) {
  return (<div className="bang"><table><thead><tr><th>Mã</th><th>Trạng thái</th><th className="so">Mệnh giá</th><th>Gia đình · Con</th><th>Hạn</th><th>Đã dùng</th></tr></thead><tbody>
    {ds.map((v) => <tr key={v.ma}><td className="nw tnum">{hienMa(v.ma)}</td><td><NhanPhieu tt={v.trang_thai} /></td><td className="so">{tien(v.menh_gia)}</td>
      <td>{v.ten_gd ?? ""}{v.ten_con ? ` · ${v.ten_con}` : ""}</td><td className="nw">{ngay(v.het_han)}</td>
      <td className="nw">{v.dung_luc ? `${luc(v.dung_luc)}${v.quay ? ` · ${v.quay}` : ""}` : "—"}</td></tr>)}
  </tbody></table></div>);
}

export function KhoPhieu() {
  const [tt, setTt] = useState(""), [tim, setTim] = useState(""), [timGui, setTimGui] = useState("");
  const t = useTai<{ ds: Phieu[] }>(`voucher?trangThai=${tt}&tim=${encodeURIComponent(timGui)}`);
  return (<>
    <Tieu ten="Kho phiếu quà" mo="Mọi phiếu quà AiiCafe đã phát hành. Phiếu quá hạn tự chuyển «Hết hạn» khi mở trang này." />
    <div className="vien-chip" role="group" aria-label="Lọc theo trạng thái">
      {[["", "Tất cả"], ...Object.entries(TT_PHIEU).map(([k, [c]]) => [k, c])].map(([k, c]) => (
        <button key={k} className="chip" aria-pressed={tt === k} onClick={() => setTt(k)}>{c}</button>))}
    </div>
    <form className="hang" onSubmit={(e) => { e.preventDefault(); setTimGui(tim.trim()); }}>
      <label><span className="sr">Tìm mã phiếu</span><span className="o-nhap">
        <input aria-label="Tìm mã phiếu" placeholder="Một phần mã, vd 7K2Q" value={tim} onChange={(e) => setTim(e.target.value)} /></span></label>
      <button className="nut vien" type="submit">Tìm mã</button>
    </form>
    <Tai t={t}>{(d) => d.ds.length ? <BangPhieu ds={d.ds} /> : <p className="trong">Không có phiếu quà nào khớp.</p>}</Tai>
  </>);
}

type DongDs = { family_id: string; ten: string; nap: number; phat_hanh: number; da_dung: number; het_han: number; thu_hoi: number };
export function DoiSoat() {
  const homNay = new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
  const [tu, setTu] = useState(`${homNay.slice(0, 8)}01`), [den, setDen] = useState(homNay), [gui, setGui] = useState({ tu: `${homNay.slice(0, 8)}01`, den: homNay });
  const t = useTai<{ tu: string; den: string; ds: DongDs[]; tong: Omit<DongDs, "family_id" | "ten"> }>(`doi-soat?tu=${gui.tu}&den=${gui.den}`);
  const cot = ["nap", "phat_hanh", "da_dung", "het_han", "thu_hoi"] as const;
  const TEN = { nap: "Nạp quỹ", phat_hanh: "Phát hành", da_dung: "Đã dùng", het_han: "Hết hạn", thu_hoi: "Huỷ" };
  return (<>
    <Tieu ten="Đối soát phiếu quà" mo="Theo từng gia đình trong khoảng ngày (giờ Việt Nam): tiền nạp, phiếu phát hành, đã dùng ở quầy, hết hạn, đã huỷ." />
    <form className="hang" onSubmit={(e) => { e.preventDefault(); setGui({ tu, den }); }}>
      <label><span className="nhan-o">Từ ngày</span><span className="o-nhap"><input aria-label="Từ ngày" type="date" value={tu} onChange={(e) => setTu(e.target.value)} /></span></label>
      <label><span className="nhan-o">Đến ngày</span><span className="o-nhap"><input aria-label="Đến ngày" type="date" value={den} onChange={(e) => setDen(e.target.value)} /></span></label>
      <button className="nut" type="submit">Xem đối soát</button>
    </form>
    <Tai t={t}>{(d) => d.ds.length ? (
      <div className="bang"><table><thead><tr><th>Gia đình</th>{cot.map((c) => <th className="so" key={c}>{TEN[c]}</th>)}</tr></thead><tbody>
        {d.ds.map((r) => <tr key={r.family_id}><td>{r.ten}</td>{cot.map((c) => <td className="so" key={c}>{tien(r[c])}</td>)}</tr>)}
        <tr className="tong"><td>Tổng {ngay(d.tu)} – {ngay(d.den)}</td>{cot.map((c) => <td className="so" key={c}>{tien(d.tong[c])}</td>)}</tr>
      </tbody></table></div>) : <p className="trong">Không có giao dịch nào trong khoảng này.</p>}</Tai>
  </>);
}

// ---------------------------------------------------------------- hỗ trợ (chat với Ba Mẹ)
type Luong = { family_id: string; ten: string; tu: string; noi_dung: string; created_at: string };
export function HoTro() {
  const t = useTai<{ ds: Luong[] }>("ho-tro");
  return (<>
    <Tieu ten="Hỗ trợ Ba Mẹ" mo="Tin Ba Mẹ gửi từ app AiiGrow (mục Chat với AiiLab). Cuộc trò chuyện đang chờ AiiLab trả lời nằm trên cùng." />
    <Tai t={t}>{(d) => d.ds.length ? (
      <div className="nhom">{d.ds.map((x) => (
        <a className="dong" key={x.family_id} href={`#ho-tro/${x.family_id}`} style={{ textDecoration: "none", color: "inherit" }}>
          <div className="gi"><b>{x.ten}</b><small>{x.tu === "aiilab" ? "AiiLab: " : ""}{x.noi_dung.slice(0, 120)}</small></div>
          {x.tu === "ba_me" ? <span className="nhan canh-n">Chờ trả lời</span> : <span className="nhan xam">{luc(x.created_at)}</span>}
        </a>))}</div>) : <p className="trong">Chưa có tin hỗ trợ nào.</p>}</Tai>
  </>);
}

export function LuongHoTro({ fam }: { fam: string }) {
  const t = useTai<{ ten: string; tin: { id: string; tu: string; noi_dung: string; created_at: string }[] }>(`ho-tro/${fam}`);
  const [nd, setNd] = useState(""), [loi, setLoi] = useState(""), [dang, setDang] = useState(false);
  const gui = async (e: FormEvent) => {
    e.preventDefault();
    if (!nd.trim()) { setLoi("Viết câu trả lời trước khi gửi"); return; }
    setDang(true); setLoi("");
    try { await api(`ho-tro/${fam}`, { noiDung: nd }); setNd(""); t.nap(); } catch (er) { setLoi((er as Error).message); }
    setDang(false);
  };
  return (<>
    <a className="lui" href="#ho-tro">‹ Mọi cuộc trò chuyện</a>
    <Tai t={t}>{(d) => (<>
      <Tieu ten={d.ten} mo="Trả lời ở đây hiện ngay trong app của Ba Mẹ, ký tên AiiLab." />
      <div className="the dem">
        <div className="tin-ds">{d.tin.map((x) => (
          <div key={x.id} className={`tin ${x.tu === "aiilab" ? "aiilab" : ""}`}>{x.noi_dung}<small>{x.tu === "aiilab" ? "AiiLab" : "Ba Mẹ"} · {luc(x.created_at)}</small></div>))}
          {!d.tin.length ? <p className="trong">Chưa có tin nào.</p> : null}</div>
        <form onSubmit={gui} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label><span className="nhan-o">Trả lời Ba Mẹ</span><span className="o-nhap">
            <textarea aria-label="Trả lời Ba Mẹ" rows={3} value={nd} onChange={(e) => setNd(e.target.value)} /></span></label>
          {loi ? <p className="ghi-loi" role="alert">{loi}</p> : null}
          <button className="nut" type="submit" disabled={dang}>{dang ? "Đang gửi…" : "Gửi trả lời"}</button>
        </form>
      </div>
    </>)}</Tai>
  </>);
}

// ---------------------------------------------------------------- thư viện mẫu
type MauNv = { ten: string; diem: number; nhom: string; bang_chung?: string };
type MauQua = { ten: string; diem: number; loai: string; menh_gia?: number };
type TV = { nhiemVu: { nhi: MauNv[]; teen: MauNv[] }; qua: MauQua[];
  rieng: { id: string; loai: string; nhom: string; du_lieu: MauNv & MauQua; bat: boolean }[] };
const NHOM_NV: Record<string, string> = { doc_sach: "Đọc sách", viec_nha: "Việc nhà", hoc_tap: "Học tập", van_dong: "Vận động", ky_nang: "Kỹ năng", khac: "Khác" };
const LOAI_QUA: Record<string, string> = { voucher: "Phiếu quà AiiCafe", qua: "Quà", dac_quyen: "Đặc quyền", tiet_kiem: "Tiết kiệm" };
export function ThuVienMau() {
  const t = useTai<TV>("mau");
  const [loai, setLoai] = useState<"nhiem_vu" | "qua">("nhiem_vu"), [nhom, setNhom] = useState("nhi"), [ten, setTen] = useState(""), [diem, setDiem] = useState("10");
  const [nhomNv, setNhomNv] = useState("viec_nha"), [loaiQua, setLoaiQua] = useState("dac_quyen"), [menhGia, setMenhGia] = useState(""), [loi, setLoi] = useState("");
  const them = async (e: FormEvent) => {
    e.preventDefault(); setLoi("");
    try { await api("mau", { loai, nhom, ten, diem: Number(diem), nhomNv, loaiQua, menhGia: Number(menhGia) }); setTen(""); t.nap(); }
    catch (er) { setLoi((er as Error).message); }
  };
  const batTat = async (id: string, bat: boolean) => { try { await api(`mau/${id}`, { bat }); t.nap(); } catch (er) { setLoi((er as Error).message); } };
  const DsMac = ({ ds, phu }: { ds: { ten: string; diem: number }[]; phu: (x: never) => string }) => (
    <div className="nhom">{ds.map((x, i) => <div className="dong" key={i}><div className="gi"><b>{x.ten}</b><small>{phu(x as never)}</small></div>
      <span className="nhan diem">{x.diem} điểm</span></div>)}</div>);
  return (<>
    <Tieu ten="Thư viện mẫu" mo="Mẫu nhiệm vụ theo độ tuổi và mẫu quà Ba Mẹ chọn nhanh khi thiết lập. Mẫu mặc định nằm trong mã; mẫu AiiLab thêm bật / tắt được." />
    <form className="the dem" onSubmit={them}>
      <h2>Thêm mẫu</h2>
      <div className="vien-chip" role="group" aria-label="Loại mẫu">
        <button type="button" className="chip" aria-pressed={loai === "nhiem_vu"} onClick={() => setLoai("nhiem_vu")}>Nhiệm vụ</button>
        <button type="button" className="chip" aria-pressed={loai === "qua"} onClick={() => setLoai("qua")}>Quà</button>
      </div>
      <div className="hang">
        <label><span className="nhan-o">Tên mẫu</span><span className="o-nhap"><input aria-label="Tên mẫu" value={ten} onChange={(e) => setTen(e.target.value)} /></span></label>
        <label style={{ flex: "0 1 140px" }}><span className="nhan-o">Điểm</span><span className="o-nhap"><input aria-label="Điểm" inputMode="numeric" value={diem} onChange={(e) => setDiem(e.target.value)} /></span></label>
        {loai === "nhiem_vu" ? (<>
          <label><span className="nhan-o">Độ tuổi</span><span className="o-nhap"><select aria-label="Độ tuổi" value={nhom} onChange={(e) => setNhom(e.target.value)}>
            <option value="nhi">Nhí (6–10)</option><option value="teen">Teen (11–16)</option></select></span></label>
          <label><span className="nhan-o">Nhóm</span><span className="o-nhap"><select aria-label="Nhóm nhiệm vụ" value={nhomNv} onChange={(e) => setNhomNv(e.target.value)}>
            {Object.entries(NHOM_NV).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></span></label>
        </>) : (<>
          <label><span className="nhan-o">Loại quà</span><span className="o-nhap"><select aria-label="Loại quà" value={loaiQua} onChange={(e) => setLoaiQua(e.target.value)}>
            {Object.entries(LOAI_QUA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></span></label>
          {loaiQua === "voucher" ? <label><span className="nhan-o">Mệnh giá (đồng)</span><span className="o-nhap">
            <input aria-label="Mệnh giá" inputMode="numeric" value={menhGia} onChange={(e) => setMenhGia(e.target.value)} /></span></label> : null}
        </>)}
      </div>
      {loi ? <p className="ghi-loi" role="alert">{loi}</p> : null}
      <button className="nut" type="submit">Thêm vào thư viện</button>
    </form>
    <Tai t={t}>{(d) => (<>
      {d.rieng.length ? (<><h2>Mẫu AiiLab thêm</h2>
        <div className="nhom">{d.rieng.map((x) => (
          <div className="dong" key={x.id}><div className="gi"><b>{x.du_lieu.ten}</b>
            <small>{x.loai === "qua" ? LOAI_QUA[x.du_lieu.loai] ?? "Quà" : `Nhiệm vụ ${x.nhom === "teen" ? "Teen" : "Nhí"} · ${NHOM_NV[x.du_lieu.nhom] ?? ""}`} · {x.du_lieu.diem} điểm</small></div>
            <button className="cong-tac" role="switch" aria-checked={x.bat} aria-label={`Bật mẫu ${x.du_lieu.ten}`} onClick={() => batTat(x.id, !x.bat)} /></div>))}</div></>) : null}
      <div className="ba-cot">
        <div className="the dem"><h2>Nhiệm vụ Nhí (6–10)</h2><DsMac ds={d.nhiemVu.nhi} phu={(x: MauNv) => NHOM_NV[x.nhom] ?? x.nhom} /></div>
        <div className="the dem"><h2>Nhiệm vụ Teen (11–16)</h2><DsMac ds={d.nhiemVu.teen} phu={(x: MauNv) => NHOM_NV[x.nhom] ?? x.nhom} /></div>
        <div className="the dem"><h2>Quà</h2><DsMac ds={d.qua} phu={(x: MauQua) => (LOAI_QUA[x.loai] ?? x.loai) + (x.menh_gia ? ` · ${tien(x.menh_gia)}` : "")} /></div>
      </div>
    </>)}</Tai>
  </>);
}

// ---------------------------------------------------------------- Allowlist hệ thống
export function Allowlist() {
  const t = useTai<{ macDinh: string[]; them: string[] }>("allowlist");
  const [muc, setMuc] = useState(""), [loi, setLoi] = useState("");
  const sua = async (m: string, bo: boolean) => {
    setLoi("");
    try { await api("allowlist", { muc: m, bo }); if (!bo) setMuc(""); t.nap(); } catch (er) { setLoi((er as Error).message); }
  };
  return (<>
    <Tieu ten="Allowlist hệ thống" mo="App và web luôn được dùng trên mọi máy Con (học tập, hệ thống). Ba Mẹ không bỏ được các mục này." />
    <form className="the dem" onSubmit={(e) => { e.preventDefault(); sua(muc, false); }}>
      <h2>Thêm mục</h2>
      <div className="hang">
        <label><span className="nhan-o">Tên miền hoặc tên app</span><span className="o-nhap">
          <input aria-label="Tên miền hoặc tên app" placeholder="vd khanacademy.org hoặc scratch.exe" value={muc} onChange={(e) => setMuc(e.target.value)} /></span></label>
        <button className="nut" type="submit">Thêm vào Allowlist</button>
      </div>
      {loi ? <p className="ghi-loi" role="alert">{loi}</p> : null}
    </form>
    <Tai t={t}>{(d) => (<>
      <h2>AiiLab thêm ({d.them.length})</h2>
      {d.them.length ? <div className="vien-chip">{d.them.map((m) => <span className="chip-x" key={m}><span>{m}</span>
        <button aria-label={`Bỏ ${m}`} onClick={() => sua(m, true)}>×</button></span>)}</div> : <p className="ghi-chu">Chưa thêm mục nào.</p>}
      <h2>Mặc định trong hệ thống ({d.macDinh.length})</h2>
      <div className="vien-chip">{d.macDinh.map((m) => <span className="chip-x md" key={m}><span>{m}</span></span>)}</div>
    </>)}</Tai>
  </>);
}

// ---------------------------------------------------------------- tham số mục 10
type Ts = { khoa: string; ten: string; donVi: string; macDinh: number; min: number; max: number; heThong: number | null };
export function ThamSo() {
  const t = useTai<{ ds: Ts[] }>("tham-so");
  const [sua, setSua] = useState<Record<string, string>>({}), [loi, setLoi] = useState(""), [bao, setBao] = useState("");
  const luu = async () => {
    setLoi(""); setBao("");
    const b = Object.fromEntries(Object.entries(sua).map(([k, v]) => [k, v.trim() === "" ? null : Number(v)]));
    try { await api("tham-so", b); setSua({}); setBao("Đã lưu. Giá trị ngoài phạm vi được kẹp về min–max."); t.nap(); } catch (er) { setLoi((er as Error).message); }
  };
  return (<>
    <Tieu ten="Tham số hệ thống" mo="Mặc định toàn hệ thống (BRD mục 10). Ba Mẹ vẫn chỉnh được cho gia đình / từng Con trong phạm vi cho phép. Để trống = theo mặc định trong mã."
      phai={<button className="nut" onClick={luu} disabled={!Object.keys(sua).length}>Lưu thay đổi</button>} />
    {loi ? <p className="ghi-loi" role="alert">{loi}</p> : null}
    {bao ? <p className="bao ok-b" role="status">{bao}</p> : null}
    <Tai t={t}>{(d) => (
      <div className="bang"><table><thead><tr><th>Tham số</th><th className="so">Mặc định</th><th className="so">Phạm vi</th><th>Hệ thống</th></tr></thead><tbody>
        {d.ds.map((x) => <tr key={x.khoa}><td>{x.ten}{x.donVi ? <span className="mo"> ({x.donVi})</span> : null}</td><td className="so">{so(x.macDinh)}</td>
          <td className="so">{so(x.min)} – {so(x.max)}</td>
          <td><input aria-label={x.ten} inputMode="numeric" placeholder={so(x.macDinh)} value={sua[x.khoa] ?? (x.heThong ?? "").toString()}
            onChange={(e) => setSua((s) => ({ ...s, [x.khoa]: e.target.value }))} /></td></tr>)}
      </tbody></table></div>)}</Tai>
  </>);
}

// ---------------------------------------------------------------- nhật ký kiểm toán
const HANH_DONG: Record<string, string> = {
  dang_nhap: "Đăng nhập", dang_nhap_sai: "Đăng nhập sai", nap_quy: "Ghi nạp quỹ", quet_voucher: "Quét phiếu quà", tra_loi_ho_tro: "Trả lời hỗ trợ",
  doi_tham_so: "Đổi tham số", them_allowlist: "Thêm Allowlist", bo_allowlist: "Bỏ Allowlist", them_mau: "Thêm mẫu", bat_mau: "Bật mẫu", tat_mau: "Tắt mẫu",
};
const KQ_QUET: Record<string, string> = { hop_le: "Hợp lệ", da_dung: "Đã dùng", het_han: "Hết hạn", chua_phat_hanh: "Chưa xác nhận", thu_hoi: "Đã huỷ", khong_thay: "Không có mã" };
type Nk = { id: string; hanh_dong: string; vai: string | null; ten_nv: string | null; ten_gd: string | null; chi_tiet: Record<string, any>; created_at: string }; // eslint-disable-line @typescript-eslint/no-explicit-any
function moTa(x: Nk) {
  const c = x.chi_tiet;
  switch (x.hanh_dong) {
    case "nap_quy": return `${tien(c.soTien)}${c.ghiChu ? ` · ${c.ghiChu}` : ""} · quỹ mới ${tien(c.soDuMoi)}`;
    case "quet_voucher": return `${hienMa(String(c.ma ?? ""))} · ${KQ_QUET[c.ketQua] ?? c.ketQua}${c.menhGia ? ` · ${tien(c.menhGia)}` : ""} · ${c.quay ?? ""}`;
    case "doi_tham_so": return (c.doi ?? []).map((d: { khoa: string; cu: number | null; moi: number | null }) => `${d.khoa}: ${d.cu ?? "mặc định"} → ${d.moi ?? "mặc định"}`).join(" · ");
    case "dang_nhap_sai": return `tên «${c.tenDangNhap ?? ""}»`;
    case "dang_nhap": return c.man === "admin" ? "cổng quản trị" : "màn quầy";
    default: return c.muc ?? c.ten ?? "";
  }
}
export function NhatKy() {
  const [loai, setLoai] = useState("");
  const t = useTai<{ ds: Nk[] }>(`nhat-ky?loai=${loai}`);
  return (<>
    <Tieu ten="Nhật ký kiểm toán" mo="Ai làm gì, lúc nào: đăng nhập, nạp quỹ, quét phiếu ở quầy, đổi tham số / Allowlist / mẫu, trả lời hỗ trợ. 200 dòng mới nhất." />
    <label style={{ maxWidth: 320 }}><span className="nhan-o">Loại việc</span><span className="o-nhap">
      <select aria-label="Loại việc" value={loai} onChange={(e) => setLoai(e.target.value)}><option value="">Tất cả</option>
        {Object.entries(HANH_DONG).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></span></label>
    <Tai t={t}>{(d) => d.ds.length ? (
      <div className="bang"><table><thead><tr><th>Lúc</th><th>Việc</th><th>Người làm</th><th>Gia đình</th><th>Chi tiết</th></tr></thead><tbody>
        {d.ds.map((x) => <tr key={x.id}><td className="nw">{luc(x.created_at)}</td><td className="nw">{HANH_DONG[x.hanh_dong] ?? x.hanh_dong}</td>
          <td className="nw">{x.ten_nv ?? "—"}{x.vai ? <span className="mo"> · {x.vai === "admin" ? "Admin" : "Quầy"}</span> : null}</td>
          <td>{x.ten_gd ?? "—"}</td><td>{moTa(x)}</td></tr>)}
      </tbody></table></div>) : <p className="trong">Chưa có dòng nhật ký nào.</p>}</Tai>
  </>);
}
