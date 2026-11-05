// Trang tải công khai /tai (thiết kế bm1-web-* + L8, 05/11): MỘT nút tải đúng máy đang mở trang, 3 bước bằng hình, mã 6 số dự phòng.
// Link «Ghép máy» trong app Ba Mẹ là /tai?g=<token gói cài>&ma=<mã 6 số> (lib/ghep-may.ts): trang hiện sẵn mã ở bước 3 (gõ vào bộ cài);
// iPhone/iPad mở link ⇒ nút «Mở app AiiGrow Con» mang token (tự ghép, không gõ mã). Không có ?g ⇒ hướng dẫn lấy mã trong app Ba Mẹ.
// Nhận diện máy theo User-Agent (Thanh 24/10: mở bằng MacBook vẫn thấy nút Windows). Giao diện Clay gương (docs/THIET-KE-CLAY.md).
export const metadata = { title: "Tải AiiGrow — AiiGrow", robots: { index: false } };
export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import { headers } from "next/headers";
import { BAN_AGENT_MAC, BAN_AGENT_WINDOWS } from "@/lib/ban-agent.ts";
import { heDieuHanh } from "@/lib/he-dieu-hanh.ts";
import { oMa, thamSoTai, type NenTai } from "@/lib/trang-tai.ts";
import { F3, I3d, Ph, type Ten3d } from "../_clay/Icon";

const LINK_APK = "/tai/aiigrow.apk";
const LINK_APK_CON = "/tai/aiigrow-con.apk";

const MAY: Record<NenTai, { ten: string; ic: Ten3d; mau: "lam" | "xam" | "xanh" | "tim"; nut: string; link: string; tep: string }> = {
  windows: { ten: "Máy Windows của con", ic: "desktop-computer", mau: "lam", nut: "Tải AiiGrow cho Windows", link: BAN_AGENT_WINDOWS.url,
    tep: `AiiGrow-Setup.exe · bản ${BAN_AGENT_WINDOWS.version} · ~182 MB · Windows 10/11` },
  mac: { ten: "Máy Mac của con", ic: "laptop", mau: "xam", nut: "Tải AiiGrow cho máy Mac", link: BAN_AGENT_MAC.url,
    tep: `AiiGrow-${BAN_AGENT_MAC.version}.pkg · macOS 13 trở lên` },
  android: { ten: "Điện thoại Android của con", ic: "mobile-phone", mau: "xanh", nut: "Tải AiiGrow Con", link: LINK_APK_CON,
    tep: "AiiGrow-Con-android.apk · cài trên điện thoại của con" },
  ios: { ten: "iPhone / iPad của con", ic: "mobile-phone", mau: "tim", nut: "Mở app AiiGrow Con", link: "", tep: "" },
};

/** 2 bước đầu theo máy (bước 3 luôn là ghép máy). */
const BUOC: Record<NenTai, [Ten3d, ReactNode, ReactNode?][]> = {
  windows: [
    ["inbox-tray", <>Mở tệp <b>AiiGrow-Setup.exe</b> vừa tải</>, <>Hiện «Windows protected your PC»: bấm <b>More info → Run anyway</b>.</>],
    ["key", <>Bấm <b>Yes</b> khi Windows hỏi quyền</>, <>Máy đã cài AiiGrow: bộ cài cập nhật đè, giữ nguyên ghép máy.</>],
  ],
  mac: [
    ["inbox-tray", <>Mở tệp <b>.pkg</b> bằng tài khoản quản trị của Ba Mẹ</>, <>Máy Mac cần một tài khoản riêng cho con.</>],
    ["key", <>Bấm <b>Tiếp tục</b>, nhập mật khẩu quản trị</>, <>macOS báo «Đã thêm mục nền» là bình thường — đừng tắt.</>],
  ],
  android: [
    ["inbox-tray", <>Mở tệp <b>AiiGrow-Con.apk</b> vừa tải</>, <>Android hỏi thì cho phép «Cài ứng dụng không rõ nguồn gốc».</>],
    ["key", <>Mở app <b>AiiGrow Con</b>, cấp các quyền app xin</>, <>Quyền giúp AiiGrow tính giờ và chặn app lạ.</>],
  ],
  ios: [
    ["inbox-tray", <>Cài app <b>AiiGrow Con</b> trên máy của con</>, <>Đang thử qua TestFlight — nhắn AiiLab để nhận lời mời.</>],
    ["key", <>Quay lại trang này, bấm <b>Mở app AiiGrow Con</b></>, <>Máy mở thẳng app và tự ghép, không cần nhập mã.</>],
  ],
};

export default async function TrangTai({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const h = await headers();
  const t = thamSoTai(await searchParams, heDieuHanh(h.get("user-agent") ?? "", h.get("sec-ch-ua-platform") ?? ""));
  // iPhone/iPad không qua link ghép: chưa có bản máy Con tải tay ⇒ nút chính là Windows như trước, kèm lời báo
  const iosKhongLink = t.nen === "ios" && !t.moApp;
  const nen: NenTai = iosKhongLink ? "windows" : t.nen;
  const may = MAY[nen];
  const link = nen === "ios" ? t.moApp! : may.link;
  const khac = (["windows", "mac", "android"] as const).filter((x) => x !== nen);
  return (
    <div className="ag">
      <main className="trang vao">
        <header className="dau-trang">
          <img className="logo" src="/logo.png" alt="AiiGrow" width={76} height={76} />
          <h1>{t.g ? "Cài AiiGrow cho máy của con" : "Tải AiiGrow cho máy của con"}</h1>
          {t.g ? <p className="phu-de">Ba Mẹ vừa gửi link này để ghép máy vào gia đình. Làm 3 bước là xong.</p> : null}
        </header>

        {iosKhongLink ? (
          <div className="bao canh-b">
            <I3d ten="mobile-phone" mau="vang" />
            <div>Bạn đang mở trang bằng iPhone. Trên iPhone, AiiGrow là app của Ba Mẹ (đang thử qua TestFlight — nhắn AiiLab để nhận lời mời).
              Máy của con cài được trên Windows, máy Mac và điện thoại Android: mở trang này trên máy đó.</div>
          </div>
        ) : null}

        <section className="the the-tai">
          <div className="dau-tai"><I3d ten={may.ic} mau={may.mau} co={56} /><h2>{may.ten}</h2></div>
          <a className="nut" href={link}><Ph ten="download-simple" co={22} />{may.nut}</a>
          {may.tep ? <p className="ghi-tep">{may.tep}</p> : null}
        </section>

        <ol className="buoc-hinh">
          {BUOC[nen].map(([ic, chu, phu], i) => (
            <li key={i}>
              <span className="so">{i + 1}</span><F3 ten={ic} co={40} className="hinh" />
              <div><b className="t">{chu}</b>{phu ? <small>{phu}</small> : null}</div>
            </li>
          ))}
          <li>
            <span className="so">3</span><F3 ten="shield" co={40} className="hinh" />
            <div>
              <b className="t">{nen === "ios" ? "Ba Mẹ duyệt Screen Time bằng Apple ID (một lần)" : nen === "mac" ? "Cửa sổ Ghép máy tự mở: nhập mã" : "Nhập mã ghép máy"}</b>
              {nen === "ios" ? <small>Không mở được app? Nhập mã ghép máy dưới đây trong app AiiGrow Con.</small>
                : t.ma ? <small>Mã dưới đây — dùng được 10 phút.</small>
                  : <small>Lấy mã 6 số trong app Ba Mẹ: <b>Máy của con › Ghép thêm máy</b>.</small>}
            </div>
          </li>
        </ol>

        {t.ma ? (
          <section className="the ma-ghep" aria-label={`Mã ghép máy ${t.ma}`}>
            <p className="nhan-o">Mã ghép máy</p>
            <div className="o-ma">{oMa(t.ma).map((c, i) => <span key={i}>{c}</span>)}</div>
            <p className="ghi-tep">Mã hết hạn sau 10 phút. Hết hạn thì nhờ Ba Mẹ bấm «Lấy mã mới» trong app.</p>
          </section>
        ) : null}

        <div className="bao ok-b">
          <I3d ten="key" mau="xanh" />
          <div>Cài xong là máy được bảo vệ ngay: chỉ app Ba Mẹ cho phép mới mở được, hết giờ chơi hay tới giờ ngủ thì máy khoá. App lạ con muốn dùng thì <b>xin Ba Mẹ duyệt</b>.</div>
        </div>

        <p className="duong-phu">
          Máy khác: {khac.map((x, i) => <span key={x}>{i ? " · " : ""}<a href={MAY[x].link}>{x === "windows" ? "Windows (.exe)" : x === "mac" ? "Mac (.pkg)" : "Android (.apk)"}</a></span>)}
          {" · "}App Ba Mẹ cho Android: <a href={LINK_APK}>aiigrow.apk</a>
        </p>
        <a className="nut vien nho nut-lui" href="/"><Ph ten="arrow-left" co={18} />Về app AiiGrow</a>
      </main>
    </div>
  );
}
