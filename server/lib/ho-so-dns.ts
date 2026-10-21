// M4b kiểm soát MẠNG — phần THUẦN (không DB, không gọi mạng trong test):
//   · chính sách DNS theo thiết bị (chặn tên miền, khung giờ) dựng từ chính sách chung + hàm xét một truy vấn (resolver tự host dùng);
//   · sinh «hồ sơ DNS gia đình»: .mobileconfig (iOS / macOS, payload com.apple.dnsSettings.managed), hostname Private DNS (Android), mẫu DoH
//     cho Windows (Add-DnsClientDohServerAddress / netsh dns add encryption);
//   · lớp «nhà cung cấp DNS» có adapter: tự host (resolver kéo chính sách + gửi nhật ký kiểu webhook) và NextDNS (API công khai). Không có
//     khoá API ⇒ chạy CHẾ ĐỘ GIẢ: trả các yêu cầu sẽ gửi, không gửi gì. AiiGrow không đăng ký tài khoản / tạo khoá NextDNS nào.
// Giới hạn của DNS (ghi rõ cho Ba Mẹ): chỉ lọc được TÊN MIỀN; không thấy / lọc nội dung bên trong app hay trang; app dùng DNS riêng hoặc
// kết nối thẳng IP thì không qua; TV / console đổi DNS tay (hoặc đặt lại gốc) là vượt được ⇒ máy chủ báo khi thiết bị «mất truy vấn».
import { createHash } from "node:crypto";
import type { ChinhSachChung } from "./chinh-sach.ts";
import { lichMo } from "./chuyen-doi.ts";
import { gioDiaPhuong, laCuoiTuan, trongKhung, type Khung } from "./gio.ts";

export const LOAI_THIET_BI_DNS = ["agent", "tv", "console", "khac"] as const;
export type LoaiThietBiDns = (typeof LOAI_THIET_BI_DNS)[number];

export type ChinhSachDns = {
  phienBan: 1;
  thietBi: { nhan: string; ten: string; loai: LoaiThietBiDns };
  tz: string;
  chan: string[];            // luôn chặn
  giaiTri: string[];         // chỉ mở trong lịch
  choPhep: string[];         // luôn mở (hệ thống + học)
  lichMo: { ngayThuong: Khung[]; cuoiTuan: Khung[] };
  /** «máy con loại mạng» (TV, console): ngoài lịch chặn MỌI tên miền trừ danh sách cho phép (giờ chơi thực thi ở tầng DNS). */
  chanTatCaNgoaiGio: boolean;
  khoaNgay: boolean;
  giaiTriDuocMo: boolean;    // hiệu lực tổng hợp (khoá ngay / không tuân thủ…)
};

const laTenMienWeb = (m: string) => /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(m) && !m.endsWith(".exe") && !/^(com|vn|org|net|io|me|app|dev)\.[a-z0-9_-]+\.[a-z0-9_.-]+$/.test(m);

export function chinhSachDns(cs: ChinhSachChung, tb: { nhan: string; ten: string; loai: LoaiThietBiDns }): ChinhSachDns {
  const web = (ds: { muc: string; kieu: string }[]) => ds.filter((x) => x.kieu === "web").map((x) => x.muc);
  return {
    phienBan: 1, thietBi: tb, tz: cs.tz,
    chan: web(cs.ungDung.chan), giaiTri: web(cs.ungDung.giaiTri),
    choPhep: [...new Set([...cs.ungDung.heThong.filter(laTenMienWeb), ...web(cs.ungDung.hoc)])],
    lichMo: lichMo(cs), chanTatCaNgoaiGio: tb.loai !== "agent", khoaNgay: cs.khoaNgay,
    giaiTriDuocMo: cs.hieuLuc.giaiTriDuocMo,
  };
}

/** Chuẩn tên miền truy vấn: chữ thường, bỏ dấu chấm cuối. */
export const chuanTenMien = (s: unknown) => String(s ?? "").trim().toLowerCase().replace(/\.+$/, "").slice(0, 253);
const khop = (ten: string, ds: string[]) => ds.some((d) => ten === d || ten.endsWith(`.${d}`));

export function trongLichMo(c: ChinhSachDns, now: Date) {
  const g = gioDiaPhuong(now, c.tz);
  return (laCuoiTuan(g.thu) ? c.lichMo.cuoiTuan : c.lichMo.ngayThuong).some((k) => trongKhung(g.phut, k));
}

export type KetXet = { chan: boolean; lyDo: "cho_phep" | "bi_chan" | "ngoai_gio" | "khoa" | "mo"; ngoaiGio: boolean };

/** Resolver xét một truy vấn: cho phép (hệ thống / học) → chặn → ngoài giờ / khoá → mở. */
export function xetTruyVan(c: ChinhSachDns, tenMienTho: unknown, now: Date): KetXet {
  const ten = chuanTenMien(tenMienTho);
  const ngoaiGio = !trongLichMo(c, now);
  if (khop(ten, c.choPhep)) return { chan: false, lyDo: "cho_phep", ngoaiGio };
  if (khop(ten, c.chan)) return { chan: true, lyDo: "bi_chan", ngoaiGio };
  const dong = c.khoaNgay || !c.giaiTriDuocMo;
  if (khop(ten, c.giaiTri) || c.chanTatCaNgoaiGio) {
    if (dong) return { chan: true, lyDo: "khoa", ngoaiGio };
    if (ngoaiGio) return { chan: true, lyDo: "ngoai_gio", ngoaiGio };
  }
  return { chan: false, lyDo: "mo", ngoaiGio };
}

// ---------------------------------------------------------------- nhà cung cấp DNS (adapter)
export type DiemCuoiDns = { dohUrl: string; dotHost: string; ipv4: string[]; ghiChu: string | null };
export type YeuCauHttp = { method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"; url: string; body?: unknown };
export type KetDay = { cheDo: "that" | "gia" | "khong_can"; yeuCau: YeuCauHttp[]; loi?: string };

export interface NhaCungCapDns {
  loai: "tu_host" | "nextdns";
  diemCuoi(tb: { nhan: string }): DiemCuoiDns;
  /** Đẩy chính sách lên nhà cung cấp (tự host: resolver tự kéo ⇒ khong_can). */
  dayChinhSach(c: ChinhSachDns): Promise<KetDay>;
}

/** Resolver tự host nhẹ: DoH `https://<gốc>/dns-query/<nhãn>`, DoT `<nhãn>.<gốc>`; kéo GET /api/dns/chinh-sach/<nhãn>, gửi POST /api/dns/nhat-ky. */
export function tuHost(o: { goc?: string; ipv4?: string[] } = {}): NhaCungCapDns {
  const goc = (o.goc ?? process.env.AIIGROW_DNS_GOC ?? "dns.aiigrow.vn").replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const ipv4 = o.ipv4 ?? (process.env.AIIGROW_DNS_IPV4 ?? "").split(",").map((x) => x.trim()).filter(Boolean);
  return {
    loai: "tu_host",
    diemCuoi: (tb) => ({ dohUrl: `https://${goc}/dns-query/${tb.nhan}`, dotHost: `${tb.nhan}.${goc}`, ipv4,
      ghiChu: ipv4.length ? null : "Chưa đặt IP resolver (AIIGROW_DNS_IPV4) — DNS thường (TV / router) cần IP" }),
    dayChinhSach: async () => ({ cheDo: "khong_can", yeuCau: [] }),
  };
}

const API_NEXTDNS = "https://api.nextdns.io";

/** NextDNS (API công khai, https://nextdns.github.io/api/): hồ sơ do Ba Mẹ tự tạo trong tài khoản của mình. Thiếu khoá ⇒ chế độ giả. */
export function nextDns(o: { hoSo: string; khoa?: string | null; fetch?: typeof fetch }): NhaCungCapDns {
  const hoSo = String(o.hoSo ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 20);
  const khoa = o.khoa === undefined ? process.env.NEXTDNS_API_KEY ?? null : o.khoa;
  return {
    loai: "nextdns",
    diemCuoi: (tb) => {
      const ten = `aiigrow-${tb.nhan}`;
      return { dohUrl: `https://dns.nextdns.io/${hoSo}/${ten}`, dotHost: `${ten}-${hoSo}.dns.nextdns.io`, ipv4: [],
        ghiChu: "DNS thường (TV / router): dùng IP «liên kết» trong trang NextDNS của Ba Mẹ" };
    },
    dayChinhSach: async (c) => {
      const yeuCau: YeuCauHttp[] = [
        ...c.chan.map((id) => ({ method: "POST" as const, url: `${API_NEXTDNS}/profiles/${hoSo}/denylist`, body: { id, active: true } })),
        ...c.choPhep.map((id) => ({ method: "POST" as const, url: `${API_NEXTDNS}/profiles/${hoSo}/allowlist`, body: { id, active: true } })),
      ];
      if (!khoa || !hoSo) return { cheDo: "gia", yeuCau };
      const f = o.fetch ?? fetch;
      for (const y of yeuCau) {
        const r = await f(y.url, { method: y.method, headers: { "X-Api-Key": khoa, "content-type": "application/json" }, body: JSON.stringify(y.body) });
        if (!r.ok) return { cheDo: "that", yeuCau, loi: `NextDNS trả ${r.status}` };
      }
      return { cheDo: "that", yeuCau };
    },
  };
}

export type DongNhatKy = { tenMien: string; soLan: number; soLanChan: number; ngoaiGio: number };

/** Nhật ký NextDNS (mỗi dòng: domain, status, device.name) ⇒ tóm tắt theo thiết bị (nhãn) + tên miền. Chỉ tên miền + đếm. */
export function tomTatNhatKyNextDns(ds: { domain?: unknown; status?: unknown; device?: { name?: unknown } | null }[]) {
  const ra = new Map<string, Map<string, DongNhatKy>>();
  for (const x of Array.isArray(ds) ? ds.slice(0, 10000) : []) {
    const ten = String(x?.device?.name ?? "");
    const nhan = ten.startsWith("aiigrow-") ? ten.slice(8) : null;
    const tm = chuanTenMien(x?.domain);
    if (!nhan || !tm) continue;
    const m = ra.get(nhan) ?? new Map<string, DongNhatKy>();
    const d = m.get(tm) ?? { tenMien: tm, soLan: 0, soLanChan: 0, ngoaiGio: 0 };
    d.soLan++;
    if (x.status === "blocked") d.soLanChan++;
    m.set(tm, d);
    ra.set(nhan, m);
  }
  return [...ra].map(([nhan, m]) => ({ nhan, ds: [...m.values()] }));
}

// ---------------------------------------------------------------- hồ sơ cho từng OS
const uuidTu = (s: string) => {
  const h = createHash("sha256").update(s).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`.toUpperCase();
};
const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** .mobileconfig (iOS 14+ / macOS 11+): payload com.apple.dnsSettings.managed, DoH. Ba Mẹ / Con gỡ được trong Cài đặt (không khoá gỡ). */
export function taoMobileconfig(o: { nhan: string; tenThietBi: string; tenGiaDinh: string; dohUrl: string }) {
  const id = `vn.aiilab.aiigrow.dns.${o.nhan}`;
  const moTa = `DNS gia đình AiiGrow cho ${o.tenThietBi} (${o.tenGiaDinh}). Lọc tên miền theo quy tắc Ba Mẹ đặt. Gỡ được trong Cài đặt › Cài đặt chung › VPN & Quản lý thiết bị.`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <array>
    <dict>
      <key>DNSSettings</key>
      <dict>
        <key>DNSProtocol</key>
        <string>HTTPS</string>
        <key>ServerURL</key>
        <string>${xml(o.dohUrl)}</string>
      </dict>
      <key>PayloadDescription</key>
      <string>${xml(moTa)}</string>
      <key>PayloadDisplayName</key>
      <string>AiiGrow — DNS gia đình</string>
      <key>PayloadIdentifier</key>
      <string>${id}.dnsSettings</string>
      <key>PayloadType</key>
      <string>com.apple.dnsSettings.managed</string>
      <key>PayloadUUID</key>
      <string>${uuidTu(`${id}.dnsSettings`)}</string>
      <key>PayloadVersion</key>
      <integer>1</integer>
    </dict>
  </array>
  <key>PayloadDescription</key>
  <string>${xml(moTa)}</string>
  <key>PayloadDisplayName</key>
  <string>AiiGrow — DNS gia đình (${xml(o.tenThietBi)})</string>
  <key>PayloadIdentifier</key>
  <string>${id}</string>
  <key>PayloadOrganization</key>
  <string>AiiLab</string>
  <key>PayloadRemovalDisallowed</key>
  <false/>
  <key>PayloadType</key>
  <string>Configuration</string>
  <key>PayloadUUID</key>
  <string>${uuidTu(id)}</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>
`;
}

/** Windows 11: DoH cần IP resolver đăng ký kèm mẫu DoH. Agent-win chạy các lệnh này bằng quyền SYSTEM khi cài (một chạm). */
export function mauDohWindows(d: DiemCuoiDns) {
  const ip = d.ipv4;
  return {
    mauDoh: d.dohUrl, ipv4: ip,
    powerShell: ip.length ? [
      ...ip.map((x) => `Add-DnsClientDohServerAddress -ServerAddress '${x}' -DohTemplate '${d.dohUrl}' -AllowFallbackToUdp $False -AutoUpgrade $True`),
      `Get-NetAdapter -Physical | Set-DnsClientServerAddress -ServerAddresses ${ip.map((x) => `'${x}'`).join(",")}`,
    ] : null,
    netsh: ip.length ? ip.map((x) => `netsh dns add encryption server=${x} dohtemplate=${d.dohUrl} autoupgrade=yes udpfallback=no`) : null,
    ghiChu: ip.length ? "Windows 11 (22H2+): DoH bật theo từng IP; agent-win đặt và báo lại trong nhịp" : "Chưa có IP resolver ⇒ chưa đặt được DoH trên Windows (CẦN ANH)",
  };
}

export function hoSoAndroid(d: DiemCuoiDns) {
  return {
    privateDns: d.dotHost,
    buoc: ["Cài đặt › Mạng và Internet › DNS riêng tư", "Chọn «Tên máy chủ của nhà cung cấp DNS riêng tư»", `Nhập ${d.dotHost} › Lưu`],
    deviceOwner: "Máy có AiiGrow Device Owner: DPC tự đặt bằng setGlobalPrivateDnsModeSpecifiedHost — không cần làm tay",
  };
}
