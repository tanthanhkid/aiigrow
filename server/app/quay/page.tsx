"use client";
// Màn quầy AiiCafe (M5, BRD 8.2, thiết kế cafe-quet / cafe-da-dung): một nút quét QR bằng camera trình duyệt (getUserMedia + jsQR),
// hoặc gõ mã; kết quả to rõ Hợp lệ / Đã dùng / Hết hạn kèm âm báo. Máy chủ quyết «dùng một lần» (quetVoucher nguyên tử).
// Giao diện Clay gương (docs/THIET-KE-CLAY.md): kết quả bật vào (lò xo), hợp lệ thì pháo giấy ngọc/vàng; reduced motion ⇒ chỉ fade.
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import jsQR from "jsqr";
import { phaoGiay } from "../_clay/Dong";
import { I3d, Ph } from "../_clay/Icon";

type Nv = { ten: string; vai: string; quay: string };
type Kq = { ketQua: "hop_le" | "da_dung" | "het_han" | "chua_phat_hanh" | "thu_hoi" | "khong_thay"; ma: string; menhGia?: number; tenCon?: string;
  tenGiaDinh?: string; dungLuc?: string; quayDung?: string; hetHan?: string; luc: string };
type Hien = { loai: "cho" } | { loai: "dang"; ma: string } | { loai: "kq"; kq: Kq } | { loai: "mang"; ma: string } | { loai: "loi"; ma: string; cau: string };

const KHOA = "aiig_quay";
const tien = (n?: number) => (n ?? 0).toLocaleString("vi-VN") + "đ";
const gio = (s?: string) => (s ? new Date(s).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }) : "");
const ngay = (s?: string) => (s ? new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }) : "");
const homNay = (s?: string) => !!s && ngay(s) === ngay(new Date().toISOString());
const hienMa = (ma: string) => ma.replace(/(.{4})(?=.)/g, "$1-");
const docToken = () => { try { return localStorage.getItem(KHOA); } catch { return null; } };
const ghiToken = (t: string | null) => { try { if (t) localStorage.setItem(KHOA, t); else localStorage.removeItem(KHOA); } catch { /* chế độ riêng tư */ } };

/** Âm báo: hợp lệ = hai tiếng lên cao; không hợp lệ = một tiếng trầm dài. */
function amBao(ok: boolean) {
  try {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return;
    const ctx = new C();
    const tieng = (hz: number, bd: number, dai: number, kieu: OscillatorType) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = kieu; o.frequency.value = hz; o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0.0001, ctx.currentTime + bd);
      g.gain.exponentialRampToValueAtTime(0.35, ctx.currentTime + bd + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + bd + dai);
      o.start(ctx.currentTime + bd); o.stop(ctx.currentTime + bd + dai + 0.05);
    };
    if (ok) { tieng(880, 0, 0.16, "sine"); tieng(1320, 0.18, 0.22, "sine"); } else tieng(220, 0, 0.6, "square");
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch { /* trình duyệt chặn âm thanh */ }
}

async function goi(duong: string, token: string | null, body?: unknown) {
  const r = await fetch(`/api/quay/${duong}`, {
    method: body === undefined ? "GET" : "POST", cache: "no-store",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const d = await r.json().catch(() => ({}));
  return { status: r.status, d };
}

function DangNhap({ vao }: { vao: (t: string) => void }) {
  const [ten, setTen] = useState(""), [mk, setMk] = useState(""), [loi, setLoi] = useState(""), [dang, setDang] = useState(false);
  const gui = async (e: FormEvent) => {
    e.preventDefault();
    if (!ten.trim() || !mk) { setLoi("Nhập tên đăng nhập và mật khẩu"); return; }
    setDang(true); setLoi("");
    try {
      const r = await goi("dang-nhap", null, { tenDangNhap: ten, matKhau: mk });
      if (r.status === 200) vao(r.d.token); else setLoi(r.d.message ?? "Chưa đăng nhập được");
    } catch { setLoi("Mất kết nối — kiểm tra Wi-Fi của quầy rồi thử lại"); }
    setDang(false);
  };
  return (
    <main className="dn">
      <form className="the" onSubmit={gui} noValidate>
        <div className="dau-dn"><I3d ten="hot-beverage" mau="vang" /><div><h1>Quầy AiiCafe</h1><p className="mo">Đăng nhập nhân viên để quét phiếu quà</p></div></div>
        <label><span className="nhan-o">Tên đăng nhập</span>
          <span className="o-nhap"><input aria-label="Tên đăng nhập" autoComplete="username" value={ten} onChange={(e) => setTen(e.target.value)} /></span></label>
        <label><span className="nhan-o">Mật khẩu</span>
          <span className="o-nhap"><input aria-label="Mật khẩu" type="password" autoComplete="current-password" value={mk} onChange={(e) => setMk(e.target.value)} /></span></label>
        {loi ? <p className="ghi-loi" role="alert">{loi}</p> : null}
        <button className="nut rong" type="submit" disabled={dang}>{dang ? "Đang vào…" : "Vào quầy"}</button>
      </form>
    </main>
  );
}

export default function Quay() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [nv, setNv] = useState<Nv | null>(null);
  const [hien, setHien] = useState<Hien>({ loai: "cho" });
  const [ma, setMa] = useState("");
  const [cam, setCam] = useState<"tat" | "mo" | "loi">("tat");
  const [camLoi, setCamLoi] = useState("");
  const video = useRef<HTMLVideoElement>(null);
  const luong = useRef<MediaStream | null>(null);
  const dangQuet = useRef(false);
  const oKq = useRef<HTMLElement>(null);

  useEffect(() => { setToken(docToken()); }, []);
  useEffect(() => {
    if (!token) return;
    goi("toi", token).then((r) => {
      if (r.status === 200) setNv(r.d.nhanVien);
      else if (r.status === 401) { ghiToken(null); setToken(null); }
    }).catch(() => setNv((x) => x ?? { ten: "", vai: "quay", quay: "Quầy AiiCafe" }));
  }, [token]);

  const tatCam = useCallback(() => {
    luong.current?.getTracks().forEach((t) => t.stop());
    luong.current = null;
    if (video.current) video.current.srcObject = null;
    setCam((c) => (c === "mo" ? "tat" : c));
  }, []);
  useEffect(() => tatCam, [tatCam]);
  const hopLe = hien.loai === "kq" && hien.kq.ketQua === "hop_le" ? hien.kq : null;
  useEffect(() => { if (hopLe) phaoGiay(oKq.current); }, [hopLe]);

  const kiem = useCallback(async (maVao: string) => {
    const m = maVao.trim();
    if (!m || dangQuet.current) return;
    dangQuet.current = true;
    setHien({ loai: "dang", ma: m });
    try {
      const r = await goi("quet", token ?? null, { ma: m });
      if (r.status === 401) { ghiToken(null); setToken(null); return; }
      if (r.status !== 200) { setHien({ loai: "loi", ma: m, cau: r.d.message ?? "Chưa kiểm tra được mã này" }); amBao(false); return; }
      setHien({ loai: "kq", kq: r.d });
      setMa("");
      amBao(r.d.ketQua === "hop_le");
    } catch {
      setHien({ loai: "mang", ma: m }); amBao(false);
    } finally { dangQuet.current = false; }
  }, [token]);

  const moCam = useCallback(async () => {
    setCamLoi("");
    if (!navigator.mediaDevices?.getUserMedia) { setCam("loi"); setCamLoi("Trình duyệt này không mở được camera — gõ mã trên phiếu quà ở ô bên cạnh."); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      luong.current = s;
      setHien({ loai: "cho" });
      setCam("mo");
      const v = video.current!;
      v.srcObject = s;
      await v.play().catch(() => {});
      const cv = document.createElement("canvas"), g = cv.getContext("2d", { willReadFrequently: true })!;
      const vong = () => {
        if (!luong.current) return;
        if (v.readyState >= 2 && v.videoWidth) {
          const k = Math.min(1, 640 / v.videoWidth);
          cv.width = Math.round(v.videoWidth * k); cv.height = Math.round(v.videoHeight * k);
          g.drawImage(v, 0, 0, cv.width, cv.height);
          const anh = g.getImageData(0, 0, cv.width, cv.height);
          const qr = jsQR(anh.data, anh.width, anh.height, { inversionAttempts: "dontInvert" });
          if (qr?.data) { tatCam(); kiem(qr.data); return; }
        }
        setTimeout(vong, 180);
      };
      vong();
    } catch (e) {
      setCam("loi");
      setCamLoi((e as Error)?.name === "NotAllowedError" ? "Quầy chưa cho phép dùng camera — bấm biểu tượng camera trên thanh địa chỉ để cho phép, hoặc gõ mã."
        : "Không mở được camera — gõ mã trên phiếu quà ở ô bên cạnh.");
    }
  }, [kiem, tatCam]);

  if (token === undefined) return <div className="ag quay" />;
  if (!token) return <div className="ag quay"><DangNhap vao={(t) => { ghiToken(t); setToken(t); }} /></div>;

  const tiep = () => { setHien({ loai: "cho" }); setMa(""); };
  const dangXuat = async () => { tatCam(); try { await goi("dang-xuat", token, {}); } catch { /* vẫn xoá phiên máy này */ } ghiToken(null); setToken(null); setNv(null); };
  const tenQuay = nv?.quay || "Quầy AiiCafe";

  const goMa = (
    <form className="go-ma" onSubmit={(e) => { e.preventDefault(); kiem(ma); }}>
      <label className="o-nhap"><span className="sr">Mã phiếu quà</span>
        <input aria-label="Mã phiếu quà" placeholder="Gõ mã, vd AG7K-2Q91-MXYZ" autoComplete="off" spellCheck={false} value={ma} onChange={(e) => setMa(e.target.value)} /></label>
      <button className="nut" type="submit" disabled={!ma.trim()}>Kiểm tra mã</button>
    </form>
  );

  let kq;
  if (hien.loai === "cho") {
    kq = (
      <section className="kq cho bat" key="cho" aria-live="polite">
        <img src="/linh-vat/so-tay.webp" alt="" />
        <b className="lon">Sẵn sàng quét</b>
        <span className="vua">Đưa mã QR trong ví quà của Con vào khung, hoặc gõ mã bên dưới.</span>
        {goMa}
      </section>
    );
  } else if (hien.loai === "dang") {
    kq = (
      <section className="kq cho bat" key="dang" aria-live="polite" aria-busy="true">
        <img src="/linh-vat/cho.webp" alt="" />
        <b className="lon">Đang kiểm tra…</b>
        <span className="vua ma-phieu">{hienMa(hien.ma.toUpperCase())}</span>
      </section>
    );
  } else if (hien.loai === "mang" || hien.loai === "loi") {
    const h = hien;
    kq = (
      <section className="kq canh bat" key={h.loai} role="alert">
        <img src="/linh-vat/trong-loi.webp" alt="" />
        <b className="lon">{h.loai === "mang" ? "Chưa kiểm tra được" : "Mã chưa đúng"}</b>
        <span className="vua">{h.loai === "mang" ? "Quầy đang mất kết nối." : h.cau}</span>
        <span className="nho">{h.loai === "mang" ? "Chưa nhận phiếu cho tới khi có kết quả. Kiểm tra Wi-Fi rồi thử lại." : "Quét lại, hoặc gõ đúng mã in dưới mã QR."}</span>
        <div className="hai-nut">
          {h.loai === "mang" ? <button className="nut" onClick={() => kiem(h.ma)}>Thử lại</button> : null}
          <button className="nut vien" onClick={tiep}>Quét phiếu quà khác</button>
        </div>
      </section>
    );
  } else {
    const k = hien.kq;
    const maHien = hienMa(k.ma);
    if (k.ketQua === "hop_le") {
      kq = (
        <section className="kq ok bat" key={`ok-${k.luc}`} ref={oKq} role="status">
          <img src="/linh-vat/xong.webp" alt="" />
          <b className="lon">Hợp lệ<br />{tien(k.menhGia)}</b>
          <span className="vua"><span className="ma-phieu">{maHien}</span> · {k.tenCon}{k.tenGiaDinh ? ` (${k.tenGiaDinh.replace(/^Nhà /, "gia đình ")})` : ""}</span>
          <span className="nho">Đã đánh dấu “Đã dùng” lúc {gio(k.luc)}</span>
          <button className="nut" onClick={tiep}>Quét phiếu quà tiếp</button>
        </section>
      );
    } else {
      const T: Record<string, [string, string, string]> = {
        da_dung: ["Phiếu quà đã dùng", `dùng lúc ${gio(k.dungLuc)}${homNay(k.dungLuc) ? " hôm nay" : ` ngày ${ngay(k.dungLuc)}`}${k.quayDung ? `, ${k.quayDung}` : ""}`,
          "Không tính tiền phiếu quà này. Khách thắc mắc → Ba Mẹ nhắn AiiLab trong app AiiGrow."],
        het_han: ["Phiếu quà đã hết hạn", `hết hạn ngày ${ngay(k.hetHan)}`, "Không tính tiền phiếu quà này. Ba Mẹ xem lại trong app AiiGrow."],
        chua_phat_hanh: ["Phiếu chưa được Ba Mẹ xác nhận", "đang chờ Ba Mẹ xác nhận trong app", "Chưa tính tiền. Nhờ Ba Mẹ bấm xác nhận rồi quét lại."],
        thu_hoi: ["Phiếu quà đã bị huỷ", "Ba Mẹ đã huỷ phiếu này", "Không tính tiền phiếu quà này."],
        khong_thay: ["Không tìm thấy phiếu quà", "mã này không có trong AiiGrow", "Kiểm tra lại mã trên ví quà của Con rồi quét lại."],
      };
      const [tieu, phu, buoc] = T[k.ketQua] ?? T.khong_thay;
      const vuaQuayNay = k.ketQua === "da_dung" && k.quayDung === nv?.quay && k.dungLuc && Date.parse(k.luc) - Date.parse(k.dungLuc) < 2 * 60_000;
      kq = (
        <section className="kq loi bat" key={`loi-${k.ketQua}-${k.luc}`} role="alert">
          <img src="/linh-vat/trong-loi.webp" alt="" />
          <b className="lon">{tieu}</b>
          <span className="vua"><span className="ma-phieu">{maHien}</span> · {phu}</span>
          {vuaQuayNay ? <span className="nho">Lượt quét vừa rồi ở quầy này đã nhận phiếu — không nhận lại lần nữa.</span> : null}
          <span className="nho">{buoc}</span>
          <button className="nut vien" onClick={tiep}>Quét phiếu quà khác</button>
        </section>
      );
    }
  }

  return (
    <div className="ag quay">
      <header className="tren">
        <I3d ten="hot-beverage" mau="vang" co={44} />
        <b className="ten-quay">AiiCafe · {tenQuay}</b>
        <div className="phai">
          {nv?.ten ? <span className="nhan ok">Nhân viên: {nv.ten}</span> : null}
          <button className="nut ma nho" onClick={dangXuat}><Ph ten="sign-out" co={18} />Đăng xuất</button>
        </div>
      </header>
      <main className={`giua vao ${hien.loai === "cho" ? "" : "co-kq"}`}>
        <section className="may-quet" aria-label="Máy quét mã QR">
          <div className="khung"><video ref={video} muted playsInline hidden={cam !== "mo"} aria-label="Hình camera" /></div>
          {cam === "mo" ? <span className="ghi">Đưa mã QR vào giữa khung — quét được là tự kiểm tra.</span>
            : camLoi ? <span className="ghi" role="alert">{camLoi}</span> : null}
          <button className="nut vang" onClick={() => (cam === "mo" ? tatCam() : moCam())}>
            <Ph ten="qr-code" co={24} />
            {cam === "mo" ? "Dừng quét" : "Quét phiếu quà"}
          </button>
        </section>
        {kq}
      </main>
    </div>
  );
}
