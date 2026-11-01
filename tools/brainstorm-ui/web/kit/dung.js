// Bộ dựng màn AiiGrow (Clay gương) dùng chung cho mọi tệp hanh-trinh/*.js.
// Mỗi màn là một tài liệu HTML đầy đủ dùng /assets/clay-kit.css; ảnh: /assets/icon3d/<ten>.webp, /assets/rob/<ten>.webp, /assets/logo.png.
const I = (t) => `<img class="ic" src="/assets/icon3d/${t}.webp" alt="">`;
const P = {
  nha: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 10.6 12 3l9 7.6V21h-6.2v-6.2H9.2V21H3z"/></svg>',
  chuong: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22a2.6 2.6 0 0 0 2.6-2.4H9.4A2.6 2.6 0 0 0 12 22Zm7-6.2V11a7 7 0 0 0-5-6.7V3.6a2 2 0 0 0-4 0v.7A7 7 0 0 0 5 11v4.8l-2 2.1V19h18v-1.1z"/></svg>',
  sao: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2.2 3 6.6 7.2.8-5.4 4.9 1.5 7.1L12 18l-6.3 3.6 1.5-7.1-5.4-4.9 7.2-.8z"/></svg>',
  nguoi: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm8.2-.3a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM1.5 21v-.8A6.2 6.2 0 0 1 7.7 14h2.6a6.2 6.2 0 0 1 6.2 6.2v.8Zm16.6 0v-.8c0-2-.7-3.9-2-5.3a5.2 5.2 0 0 1 7.4 4.6V21Z"/></svg>',
  trai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  phai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" style="color:#8a8f8c"><path d="M9 5l7 7-7 7"/></svg>',
  cong: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
};

const sb = (gio) => `<div class="sb"><span class="so">${gio}</span><span style="display:flex;gap:6px;align-items:center"><svg viewBox="0 0 24 24" fill="currentColor" style="width:18px"><path d="M12 18.5a1.8 1.8 0 1 0 0 3.6 1.8 1.8 0 0 0 0-3.6Zm-4.6-2.7 1.6 1.7a4.3 4.3 0 0 1 6 0l1.6-1.7a6.6 6.6 0 0 0-9.2 0ZM3.8 12.2l1.6 1.6a9.4 9.4 0 0 1 13.2 0l1.6-1.6a11.7 11.7 0 0 0-16.4 0Z"/></svg><svg viewBox="0 0 28 14" style="width:27px"><rect x=".5" y=".5" width="23" height="13" rx="4" fill="none" stroke="currentColor" opacity=".45"/><rect x="2.5" y="2.5" width="19" height="9" rx="2.5" fill="currentColor"/><rect x="25" y="4.5" width="2" height="5" rx="1" fill="currentColor" opacity=".45"/></svg></span></div>`;

const tab = (dang, cho = 4) => {
  const muc = [['nha', 'Trang chủ'], ['chuong', 'Chờ duyệt'], ['sao', 'Nhiệm vụ & quà'], ['nguoi', 'Gia đình']];
  return `<nav class="tab">${muc.map(([ic, ten], i) => `<a class="${i === dang ? 'dang' : ''}">${P[ic]}<span>${ten}</span>${i === 1 && cho ? `<b class="so-cho">${cho}</b>` : ''}</a>`).join('')}</nav>`;
};

const chipCon = (dang = 0) => `<div class="hang" style="gap:10px;margin:0 2px">
  <div class="chip ${dang === 0 ? 'dang' : ''}" style="flex:1;min-width:0"><span class="avt" style="background-color:#c2410c">A</span><span class="mot">Nguyễn Ngọc Bảo Anh</span></div>
  <div class="chip ${dang === 1 ? 'dang' : ''}"><span class="avt" style="background-color:#4b5bd6">B</span>Bill</div></div>`;

const viec = (ten, phu, nut1 = 'Duyệt') => `<div class="viec"><div class="hang" style="align-items:flex-start"><div style="flex:1;min-width:0"><div class="ten">${ten}</div><div class="phu">${phu}</div></div>${P.phai}</div>
  <div class="nuts"><button class="nut ngoc nho">${nut1}</button><button class="nut vien nho">Từ chối</button></div></div>`;

const doc = (body, cls, css = '') => `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<link rel="stylesheet" href="/assets/clay-kit.css">${css ? `<style>${css}</style>` : ''}</head><body><div class="${cls}">${body}</div></body></html>`;

const dt = (body, css = '') => doc(body, 'dt', css);

// máy Con (app Windows/Mac 1100×720): ben(dang, rob) = thanh bên; desk(dang, chinh, rob, css)
const ben = (dang, rob = 'rob-goc') => `<aside class="ben"><img class="rob" src="/assets/rob/${rob}.webp" alt=""><div class="ten-con">Minh Khôi</div>
  <div class="ket-noi"><span class="cham"></span>Đã kết nối · đồng bộ lúc 12:58</div>
  ${[['dongho', 'Hôm nay'], ['but', 'Nhiệm vụ (4)'], ['qua', 'Phần quà & điểm'], ['tin', 'Tin nhắn (2)']].map(([ic, t], i) => `<a class="${i === dang ? 'dang' : ''}">${I(ic)}${t}</a>`).join('')}
  <div class="chan">Máy này do Ba Mẹ quản lý bằng AiiGrow</div></aside>`;
const desk = (dang, chinh, rob, css = '') => doc(`${ben(dang, rob)}<main class="chinh">${chinh}</main>`, 'desk', css);

const nv = (ten, diem, mo, them, nut, nutCls = 'vien') => `<section class="the"><div style="font:700 19px Inter">${ten} <span class="nhan-diem">· ${diem}</span></div><div class="c3 s15" style="margin-top:6px">${mo}</div>${them}<button class="nut ${nutCls}" style="margin-top:12px;width:240px">${nut}</button></section>`;
const tin = (ai, chu, gio, cua = false) => `<div style="display:flex;${cua ? 'justify-content:flex-end' : ''}"><div style="max-width:70%;padding:14px 18px;border-radius:24px;${cua ? 'background:linear-gradient(180deg,#14826f,#0a5246);color:#fff;box-shadow:var(--clayNho)' : 'background:var(--the);box-shadow:var(--clayNho)'}"><div class="s13 b" style="opacity:.8">${ai} · ${gio}</div><div class="s16" style="margin-top:4px;line-height:22px">${chu}</div></div></div>`;

export { I, P, sb, tab, chipCon, viec, doc, dt, ben, desk, nv, tin };
