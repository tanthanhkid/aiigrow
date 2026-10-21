"use client";
// Cổng quản trị AiiLab (M5): đăng nhập Admin → các mục theo #mục trên địa chỉ (giữ được khi tải lại, mở thẳng một gia đình / cuộc chat).
import { useEffect, useState, type FormEvent } from "react";
import { api, docToken, ghiToken } from "./_lib";
import * as M from "./_muc";

const MUC: [string, string][] = [
  ["tong-quan", "Tổng quan"], ["gia-dinh", "Gia đình & nạp quỹ"], ["phieu", "Kho phiếu quà"], ["doi-soat", "Đối soát"], ["ho-tro", "Hỗ trợ Ba Mẹ"],
  ["mau", "Thư viện mẫu"], ["allowlist", "Allowlist hệ thống"], ["tham-so", "Tham số"], ["nhat-ky", "Nhật ký kiểm toán"],
];

function DangNhap({ vao }: { vao: () => void }) {
  const [ten, setTen] = useState(""), [mk, setMk] = useState(""), [loi, setLoi] = useState(""), [dang, setDang] = useState(false);
  const gui = async (e: FormEvent) => {
    e.preventDefault();
    if (!ten.trim() || !mk) { setLoi("Nhập tên đăng nhập và mật khẩu"); return; }
    setDang(true); setLoi("");
    try { const r = await api<{ token: string }>("dang-nhap", { tenDangNhap: ten, matKhau: mk }); ghiToken(r.token); vao(); }
    catch (er) { setLoi((er as Error).message); }
    setDang(false);
  };
  return (
    <main className="dn">
      <form className="the" onSubmit={gui} noValidate>
        <div className="dau-dn"><img src="/logo.svg" alt="" /><div><h1>Quản trị AiiLab</h1><p className="mo">Cổng nội bộ AiiGrow — chỉ tài khoản Admin</p></div></div>
        <label><span className="nhan-o">Tên đăng nhập</span>
          <span className="o-nhap"><input aria-label="Tên đăng nhập" autoComplete="username" value={ten} onChange={(e) => setTen(e.target.value)} /></span></label>
        <label><span className="nhan-o">Mật khẩu</span>
          <span className="o-nhap"><input aria-label="Mật khẩu" type="password" autoComplete="current-password" value={mk} onChange={(e) => setMk(e.target.value)} /></span></label>
        {loi ? <p className="ghi-loi" role="alert">{loi}</p> : null}
        <button className="nut rong" type="submit" disabled={dang}>{dang ? "Đang vào…" : "Đăng nhập"}</button>
      </form>
    </main>
  );
}

export default function Admin() {
  const [co, setCo] = useState<boolean | undefined>(undefined);
  const [ten, setTen] = useState("");
  const [hash, setHash] = useState("");
  const [cho, setCho] = useState(0);
  useEffect(() => {
    const doc = () => setHash(decodeURIComponent(location.hash.replace(/^#/, "")));
    doc();
    setCo(!!docToken());
    const het = () => setCo(false);
    window.addEventListener("hashchange", doc);
    window.addEventListener("aiig-het-phien", het);
    return () => { window.removeEventListener("hashchange", doc); window.removeEventListener("aiig-het-phien", het); };
  }, []);
  useEffect(() => {
    if (!co) return;
    api<{ admin: { ten: string } }>("toi").then((r) => setTen(r.admin.ten)).catch(() => {});
    api<{ hoTroChoTraLoi: number }>("tong-quan").then((r) => setCho(r.hoTroChoTraLoi)).catch(() => {});
  }, [co, hash]);

  if (co === undefined) return <div className="ag ad" />;
  if (!co) return <div className="ag ad"><DangNhap vao={() => setCo(true)} /></div>;

  const [muc, con] = hash.split("/");
  const dang = MUC.some(([k]) => k === muc) ? muc : "tong-quan";
  const dangXuat = async () => { try { await api("dang-xuat", {}); } catch { /* vẫn xoá phiên máy này */ } ghiToken(null); setCo(false); };
  let than;
  if (dang === "gia-dinh") than = con ? <M.ChiTietGd id={con} key={con} /> : <M.GiaDinh />;
  else if (dang === "phieu") than = <M.KhoPhieu />;
  else if (dang === "doi-soat") than = <M.DoiSoat />;
  else if (dang === "ho-tro") than = con ? <M.LuongHoTro fam={con} key={con} /> : <M.HoTro />;
  else if (dang === "mau") than = <M.ThuVienMau />;
  else if (dang === "allowlist") than = <M.Allowlist />;
  else if (dang === "tham-so") than = <M.ThamSo />;
  else if (dang === "nhat-ky") than = <M.NhatKy />;
  else than = <M.TongQuan />;

  return (
    <div className="ag ad">
      <header className="dau-ad">
        <img src="/logo.svg" alt="" />
        <b className="ten">AiiGrow · Quản trị AiiLab</b>
        <div className="phai">
          {ten ? <span className="nhan ok">{ten}</span> : null}
          <button className="nut ma nho" onClick={dangXuat}>Đăng xuất</button>
        </div>
      </header>
      <div className="khung-ad">
        <nav className="muc" aria-label="Mục quản trị">
          {MUC.map(([k, c]) => (
            <a key={k} href={`#${k}`} aria-current={dang === k ? "page" : undefined}>{c}{k === "ho-tro" && cho ? <span className="so" aria-label={`${cho} chờ trả lời`}>{cho}</span> : null}</a>))}
        </nav>
        <main className="noi-dung">{than}</main>
      </div>
    </div>
  );
}
