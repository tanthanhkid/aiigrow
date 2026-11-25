// #659: tên hiển thị thân thiện + gộp trùng cho app Windows / Mac. Máy báo tên kỹ thuật («BingWeather», «microsoft.photos.exe»,
// «Microsoft OneDrive» và «OneDrive»…) — bảng này đổi sang tên người đọc hiểu và đưa các tên cùng một app về MỘT mục.
// Khoá bảng = chữ thường, bỏ «.exe» và tiền tố «microsoft.» / «microsoft » (xem `khoaTen`).

const TEN_APP: Record<string, string> = {
  bingweather: "Thời tiết", windowsalarms: "Báo thức & Đồng hồ", zunemusic: "Groove Music", zunevideo: "Phim & TV",
  mixedrealityportal: "Cổng thực tế hỗn hợp", stickynotes: "Sticky Notes",
  "3dviewer": "3D Viewer", xboxapp: "Xbox", windowscamera: "Máy ảnh", windowscalculator: "Máy tính", calculatorapp: "Máy tính",
  solitairecollection: "Solitaire Collection", photos: "Ảnh",
  onedrive: "OneDrive", mspaint: "Paint", paint: "Paint", notepad: "Notepad", snippingtool: "Snipping Tool", taskmgr: "Task Manager",
  onenote: "OneNote", msteams: "Teams", teams: "Teams", msedge: "Edge", edge: "Edge", explorer: "File Explorer",
  winword: "Word", excel: "Excel", powerpnt: "PowerPoint", graphstudionext: "GraphStudioNext", graphstudionext64: "GraphStudioNext",
};

/** Cùng một app, nhiều tên kỹ thuật ⇒ một mục «gốc» (khoá `khoaTen` → mục chuẩn dùng làm khoá gộp). */
const GOC_GOP: Record<string, string> = {
  onedrive: "onedrive.exe", mspaint: "mspaint.exe", paint: "mspaint.exe", graphstudionext: "graphstudionext.exe", graphstudionext64: "graphstudionext.exe",
  photos: "photos.exe",
};

export function khoaTen(mucTho: unknown): string {
  return String(mucTho ?? "").trim().toLowerCase().replace(/\.exe$/, "").replace(/[^a-z0-9]+/g, "").replace(/^(microsoft)+/, "");
}

/** Tên thân thiện của app, hoặc undefined nếu bảng chưa biết. */
export function tenThanThien(mucTho: unknown): string | undefined {
  const k = khoaTen(mucTho);
  return Object.hasOwn(TEN_APP, k) ? TEN_APP[k] : undefined;
}

/** Mục chuẩn để GỘP các dòng trùng (OneDrive / Microsoft OneDrive, Paint / MSPaint, GraphStudioNext ×2). Không biết ⇒ giữ nguyên `muc`. */
export function mucGop(muc: string): string {
  const k = khoaTen(muc);
  return Object.hasOwn(GOC_GOP, k) ? GOC_GOP[k] : muc;
}
