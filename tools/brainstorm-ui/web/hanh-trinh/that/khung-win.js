// Khung + mảnh dùng chung cho các màn Windows dựng KHỚP ẢNH CHỤP THẬT (aiigrow-thiet-ke/man-win-2510/100, 100% DPI).
// Số đo lấy từ ảnh (PIL) + agent-win/src (Clay.cs, SetupForm.cs). Font: Segoe UI (máy Windows) → Helvetica Neue trên Mac
// (đo: cùng bề rộng dòng với Segoe UI ±0,5%) → Arial.
// Asset thật: /assets/win/fluent/<ten>.png, /assets/win/mascot/<ten>.png (agent-win/src/AiiGrow.Tray/Assets).

export const FONT_WIN = "'Segoe UI','Helvetica Neue',Arial,sans-serif";

export const MAU = {
  nen: '#ecebe7', the: '#f7f6f3', lom: '#e9e8e3', chu: '#0f1312', chu2: '#3a403d', chu3: '#565c59',
  ngoc: '#0f6b5c', ngocInk: '#0a5246', ngocSoft: '#dcebe6', diemInk: '#6e4300', loi: '#b42318', canh: '#8a3c0c',
};

export const CSS_WIN = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:transparent;overflow:hidden}
body{font-family:${FONT_WIN};color:${MAU.chu};-webkit-font-smoothing:antialiased}
.w{position:relative;overflow:hidden;background:${MAU.nen};border:1px solid #3c3c3c;border-top-color:#4e4e4e}
.tb{position:absolute;left:0;right:0;top:0;height:30px;background:#f3f3f3;display:flex;align-items:center;font:400 12px/16px ${FONT_WIN};color:#1a1a1a}
.tb .ico{position:absolute;left:7px;top:7px;width:16px;height:16px}
.tb .ten{position:absolute;left:30px;top:7px;white-space:nowrap}
.tb svg{position:absolute;top:0;width:46px;height:30px}
.abs{position:absolute;white-space:nowrap}
.nut{position:absolute;border:0;padding:0;height:44px;border-radius:22px;display:flex;align-items:center;justify-content:center;font:700 15.33px/20px ${FONT_WIN};white-space:nowrap}
.nut.ngoc{color:#fff;background:linear-gradient(180deg,#1a665a 0,#135448 75%,#2a5a4f 88%,#2f5650 100%);box-shadow:0 2px 0 -0.5px #4d6e66,0 3px 4px rgba(40,50,45,.22)}
.nut.ngoc::before{content:'';position:absolute;left:3px;right:3px;top:0;height:12px;border-radius:22px 22px 8px 8px/12px 12px 6px 6px;background:linear-gradient(180deg,rgba(255,255,255,.62),rgba(255,255,255,.36))}
.nut.trang{color:${MAU.chu};background:linear-gradient(180deg,#fefefe 0,#f7f6f3 35%,#f7f6f3 55%,#eeede9 100%);box-shadow:0 2px 0 -0.5px #d2d2cf,0 3px 4px rgba(40,40,35,.16)}
.nut .ic{width:20px;height:20px;margin-right:12px}
`;

const icoApp = '<img class="ico" src="/assets/win/mascot/rob-goc.png" alt="" style="border-radius:3px;background:#2f6f63;object-fit:cover">';
// nút tiêu đề Windows 11: —  ☐  ✕ (ô 46×30); toiDa=false ⇒ ô phóng to mờ (FixedDialog/MaximizeBox=false)
export function thanhTieuDe(ten, rong, o = {}) {
  const x = (i) => rong - 2 - 46 * (3 - i);
  const mo = o.toiDaMo ? '#b8b8b8' : '#1a1a1a';
  return `<div class="tb">${o.coIcon === false ? '' : (o.icon || icoApp)}<span class="ten">${ten}</span>
  ${o.anNut ? '' : `<svg style="left:${x(0)}px" viewBox="0 0 46 30"><path d="M18 15.5h10" stroke="#1a1a1a" stroke-width="1"/></svg>
  ${o.boToiDa ? '' : `<svg style="left:${x(1)}px" viewBox="0 0 46 30"><rect x="18.5" y="10.5" width="9" height="9" fill="none" stroke="${mo}" stroke-width="1"/></svg>`}
  <svg style="left:${x(2)}px" viewBox="0 0 46 30"><path d="M18.2 10.2l9.6 9.6M27.8 10.2l-9.6 9.6" stroke="#1a1a1a" stroke-width="1.05"/></svg>`}</div>`;
}

export const tai = (body, w, h, css = '') => `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<style>${CSS_WIN}.w{width:${w}px;height:${h}px}${css}</style></head><body><div class="w">${body}</div></body></html>`;

// chữ đặt tuyệt đối: t(x, y, html, kieu) — y là đỉnh hộp dòng
export const t = (x, y, html, st = '') => `<div class="abs" style="left:${x}px;top:${y}px;${st}">${html}</div>`;
export const nut = (x, y, w, chu, loai = 'ngoc', st = '') => `<button class="nut ${loai}" style="left:${x}px;top:${y}px;width:${w}px;${st}">${chu}</button>`;
