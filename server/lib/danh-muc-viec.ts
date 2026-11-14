// Danh mục việc «Giao việc» (thiết kế 14/11 bm-viec-duyet/03 them-1jii7k19 «Giao việc»): ba mục Học (7) · Vận động (10) · Giúp Ba Mẹ (100 việc,
// 10 chủ đề — file «100 Công Việc Phụ Giúp Ba Mẹ» Nghi đưa 10/11). Ba Mẹ chạm ＋ từng việc (hoặc «Chọn tất cả» một nhóm) rồi «Thêm vào ngày của <Con>»:
// mỗi việc thành một nhiệm vụ giao riêng Con đó (tasks.bo = mã mục). Việc Con đã có cùng tên ⇒ bỏ qua; «Học 1 bài với AiiRob» là việc tự chấm dùng
// chung cả nhà (như bo-nhiem-vu.ts). Tên + số sao lấy đúng màn; «12+» = việc nặng, nên giao cho bé từ 12 tuổi (chỉ là nhãn).
// Cách con nộp mặc định theo màn «Ba Mẹ tự thêm» (them-6pjz1stu): Ghi âm cho đọc / tiếng Anh / học thuộc, Bấm «Xong» cho vận động và việc nhỏ 5 sao,
// còn lại Chụp ảnh. Hợp đồng: docs/API.md «Danh mục việc».
import { q, tx } from "./db.ts";
import { LoiNghiepVu } from "./loi.ts";
import { taoNv } from "./nhiem-vu.ts";

type Dong = [ten: string, sao: number, tuoi?: number];
type ChuDe = { ma: string; ten: string; viec: Dong[] };
type Muc = { ma: "hoc" | "van_dong" | "giup_ba_me"; ten: string; chuDe: ChuDe[] };

export const DANH_MUC_VIEC: Muc[] = [
  { ma: "hoc", ten: "Học", chuDe: [
    { ma: "hoc", ten: "Học", viec: [
      ["Đọc sách 20 phút", 10],
      ["Luyện chữ 1 trang", 10],
      ["Học 10 từ tiếng Anh", 15],
      ["1 bài toán tư duy", 15],
      ["Học 1 bài với AiiRob", 20],
      ["Làm xong bài tập về nhà", 20],
      ["Ôn bài trước ngày mai", 10],
    ] },
  ] },
  { ma: "van_dong", ten: "Vận động", chuDe: [
    { ma: "van_dong", ten: "Vận động", viec: [
      ["Nhảy dây 100 cái", 10],
      ["Đạp xe 15 phút", 15],
      ["Tập thể dục sáng 10 phút", 5],
      ["Chạy bộ 15 phút", 10],
      ["Đi bộ cùng Ba Mẹ 20 phút", 10],
      ["Đá cầu, cầu lông 20 phút", 10],
      ["Đá bóng với bạn 30 phút", 15],
      ["Bơi 30 phút (có người lớn)", 20],
      ["Yoga trẻ em 10 phút", 10],
      ["Hít đất, gập bụng 3 hiệp", 10],
    ] },
  ] },
  { ma: "giup_ba_me", ten: "Giúp Ba Mẹ", chuDe: [
    { ma: "bep_nuc", ten: "Bếp núc", viec: [
      ["Nhặt rau, lặt rau phụ ba mẹ", 5],
      ["Rửa sạch các loại rau củ và trái cây", 5],
      ["Nấu cơm bằng nồi cơm điện (đong gạo, vo gạo, bấm nút)", 15],
      ["Chuẩn bị gia vị (bóc vỏ tỏi, hành khô, gọt vỏ gừng)", 10],
      ["Đập trứng và khuấy đều trứng để chiên/hấp", 10],
      ["Khuấy hoặc canh nồi canh/nước dùng khi được hướng dẫn", 10],
      ["Chuẩn bị bát đũa, muỗng và sắp lên bàn ăn trước bữa cơm", 5],
      ["Soạn món ăn ra đĩa và bưng ra bàn ăn", 10],
      ["Rót nước lọc hoặc nước ấm sẵn cho ba mẹ khi vào bữa", 5],
      ["Dọn mâm cơm và dọn thức ăn thừa sau khi ăn xong", 15],
    ] },
    { ma: "don_bep", ten: "Dọn bếp", viec: [
      ["Rửa chén bát sau bữa ăn của gia đình", 15],
      ["Tráng sạch xà phòng và lau khô bát đĩa", 10],
      ["Xếp chén đĩa, nồi chảo ngay ngắn lên kệ/tủ bếp", 10],
      ["Lau sạch mặt bàn ăn sau khi dùng bữa", 10],
      ["Lau bề mặt bếp gas hoặc bếp từ sau khi nấu nướng", 15],
      ["Vệ sinh bồn rửa chén và cọ sạch lưới chặn rác", 15],
      ["Lau sạch bên ngoài tủ lạnh, lò vi sóng, nồi chiên không dầu", 10],
      ["Thay khăn lau bếp mới và đem giặt khăn cũ", 10],
      ["Gom rác hữu cơ/thức ăn thừa trong bếp bỏ vào thùng rác", 5],
      ["Phân loại rác tái chế (chai lọ nhựa, lon nhôm, bìa carton)", 10],
    ] },
    { ma: "phong_khach", ten: "Phòng khách", viec: [
      ["Quét bụi sàn phòng khách", 10],
      ["Lau sàn phòng khách sạch sẽ", 15],
      ["Lau bàn trà và xếp lại khay chén uống nước gọn gàng", 10],
      ["Sắp xếp lại gối tựa lưng trên ghế sofa", 5],
      ["Hút bụi thảm phòng khách hoặc đệm ghế", 15],
      ["Lau bụi trên kệ tivi, mặt bàn trang trí", 10],
      ["Sắp xếp remote tivi, quạt, máy lạnh vào đúng khay/vị trí", 5],
      ["Lau sạch tay nắm cửa chính và cửa sổ phòng khách", 10],
      ["Xếp gọn gàng dép đi trong nhà ở cửa ra vào", 5],
      ["Vệ sinh và lau sạch cánh quạt đứng/quạt bàn", 10],
    ] },
    { ma: "giat_giu", ten: "Giặt giũ", viec: [
      ["Phân loại quần áo màu và đồ trắng trước khi giặt", 10],
      ["Cho quần áo vào máy giặt, đong bột giặt/nước xả vải", 15],
      ["Phơi quần áo lên dây phơi hoặc giá phơi đồ", 15],
      ["Treo đồ vào móc và cố định bằng kẹp tránh gió thổi bay", 10],
      ["Thu gom quần áo khô vào nhà khi trời nắng ráo hoặc sắp mưa", 10],
      ["Gấp gọn gàng quần áo của bản thân và các thành viên", 10],
      ["Xếp quần áo vào từng ngăn tủ tương ứng", 10],
      ["Ghép đôi các đôi tất/vớ và cuộn gọn lại", 5],
      ["Phụ ủi/là phẳng các loại áo sơ mi đơn giản (với sự giám sát)", 15, 12],
      ["Mang chăn màn, ga gối định kỳ đem đi giặt", 15],
    ] },
    { ma: "phong_ngu", ten: "Phòng ngủ", viec: [
      ["Gấp gọn chăn màn ngay sau khi thức dậy", 5],
      ["Kéo phẳng ga giường và chỉnh lại gối nằm", 5],
      ["Quét và lau sàn phòng ngủ", 15],
      ["Dọn dẹp bàn học/bàn làm việc gọn gàng", 10],
      ["Sắp xếp sách vở, tài liệu ngăn nắp lên kệ sách", 10],
      ["Lau sạch bụi bàn học, kệ sách và đèn học", 10],
      ["Mở cửa sổ đón nắng và thông gió cho phòng ngủ mỗi sáng", 5],
      ["Đóng kín cửa sổ và rèm cửa khi trời mưa hoặc nắng gắt", 5],
      ["Thay vỏ gối, drap giường định kỳ 1–2 tuần/lần", 15],
      ["Dọn rác nhỏ trong phòng ngủ đem bỏ vào thùng rác chung", 5],
    ] },
    { ma: "nha_tam", ten: "Nhà tắm", viec: [
      ["Cọ rửa bồn rửa mặt (lavabo) và lau gương soi", 15],
      ["Chà sạch sàn nhà tắm để tránh trơn trượt", 15],
      ["Cọ rửa bồn cầu định kỳ", 15, 12],
      ["Sắp xếp gọn gàng dầu gội, sữa tắm, bàn chải đánh răng trên kệ", 5],
      ["Gom khăn tắm bẩn đem bỏ vào giỏ giặt", 5],
      ["Phơi khăn mặt ra nơi thoáng mát sau khi dùng", 5],
      ["Thay cuộn giấy vệ sinh mới khi hết", 5],
      ["Dọn sạch tóc rụng tại miệng cống thoát nước sàn", 15],
      ["Đổ rác trong thùng rác nhà vệ sinh", 5],
      ["Châm thêm nước rửa tay vào chai đựng", 5],
    ] },
    { ma: "cay_thu_cung", ten: "Cây & thú cưng", viec: [
      ["Tưới cây cảnh, luống hoa ngoài ban công hoặc sân vườn", 10],
      ["Nhặt lá vàng úa và tỉa bớt cành khô trên cây kiểng", 15],
      ["Nhổ cỏ dại trong bồn hoa, chậu cây", 15],
      ["Quét sạch lá rụng ở sân trước, sân sau hoặc ban công", 15],
      ["Cho thú cưng (chó, mèo, cá, chim) ăn đúng giờ", 5],
      ["Thay khay nước sạch mới cho thú cưng mỗi ngày", 5],
      ["Chải lông cho chó, mèo để giảm rụng lông trong nhà", 10],
      ["Vệ sinh và thay cát mới cho mèo", 15],
      ["Rửa sạch khay/bát đựng thức ăn của thú cưng", 10],
      ["Dắt chó đi dạo và tập thể dục quanh khuôn viên", 15],
    ] },
    { ma: "mua_sam", ten: "Mua sắm", viec: [
      ["Đi chợ hoặc ghé cửa hàng tiện lợi mua đồ lặt vặt (hành, trứng, muối)", 15, 12],
      ["Phụ ba mẹ mang vác, xách túi đồ sau khi đi siêu thị về", 10],
      ["Kiểm tra hạn sử dụng của đồ hộp, gia vị còn trong bếp", 10],
      ["Viết sẵn danh sách những món đồ gia đình đã hết cần mua bổ sung", 10],
      ["Nhận bưu phẩm, đơn hàng giao tận nhà khi ba mẹ vắng mặt", 10],
      ["Đem rác lớn ra xe rác hoặc điểm tập kết rác công cộng", 15, 12],
      ["Phụ ba mẹ đem đồ đi sửa (sửa giày dép, quần áo, ổ khóa)", 10],
      ["Mua bữa sáng hoặc bánh mì cho cả nhà", 15],
      ["Đi mua thuốc tây đơn giản theo đơn của ba mẹ khi cần", 15, 12],
      ["Phụ xách nước đóng bình hoặc đổi bình ga", 15, 12],
    ] },
    { ma: "cham_ba_me", ten: "Chăm Ba Mẹ", viec: [
      ["Rót nước ấm, nước mát mời ba mẹ khi ba mẹ vừa đi làm về", 5],
      ["Đấm lưng, bóp vai xoa dịu mệt mỏi cho ba mẹ lúc nghỉ ngơi", 10],
      ["Lấy giúp đồ dùng khi ba mẹ đang bận tay (kính lão, điện thoại, bấm móng tay)", 5],
      ["Nhổ tóc sâu, tóc bạc cho ba mẹ", 10],
      ["Hỗ trợ ba mẹ sử dụng tính năng trên điện thoại, tivi hoặc máy tính", 10],
      ["Trông nom, chơi đùa hoặc dạy em nhỏ học bài khi ba mẹ bận việc", 15, 12],
      ["Chuẩn bị quần áo, cặp sách sẵn cho các em nhỏ đi học", 15],
      ["Nhắc nhở ba mẹ uống thuốc đúng giờ theo toa bác sĩ", 5],
      ["Giữ gìn không gian yên tĩnh khi ba mẹ cần nghỉ ngơi hoặc làm việc", 5],
      ["Pha trà, pha cà phê hoặc nước chanh mời ba mẹ thưởng thức", 10],
    ] },
    { ma: "lat_vat", ten: "Lặt vặt", viec: [
      ["Giúp ba mẹ xịt nước, lau rửa xe máy hoặc xe đạp", 15],
      ["Giặt và phơi sạch thảm lau chân trước cửa", 15],
      ["Xếp ngay ngắn kệ giày dép, đánh xi hoặc lau bụi giày dép", 10],
      ["Gom và buộc gọn các loại thùng giấy, bìa carton không dùng đến", 10],
      ["Cuộn và cố định gọn gàng các dây điện, cáp sạc trong nhà", 10],
      ["Kiểm tra và tắt toàn bộ quạt, bóng đèn khi ra khỏi phòng", 5],
      ["Khóa van nước, kiểm tra kỹ vòi nước để tránh rò rỉ thất thoát", 10, 12],
      ["Khóa then cài cửa sổ và chốt cửa cổng an toàn vào buổi tối", 10],
      ["Phụ sắp xếp lại đồ đạc trong kho hoặc gác lửng cho ngăn nắp", 15],
      ["Thu dọn đồ đạc ngoài trời/sân thượng cất vào nhà mỗi khi trời đổ mưa", 10],
    ] },
  ] },

];

const GHI_AM = new Set(["Đọc sách 20 phút", "Học 10 từ tiếng Anh", "Ôn bài trước ngày mai"]);
const HINH_MUC: Record<Muc["ma"], string> = { hoc: "sach", van_dong: "day", giup_ba_me: "choi" };
const NHOM_MUC: Record<Muc["ma"], string> = { hoc: "hoc_tap", van_dong: "van_dong", giup_ba_me: "viec_nha" };
export const TEN_AIIROB = "Học 1 bài với AiiRob";

export type ViecDm = { ma: string; ten: string; sao: number; tu12: boolean; bangChung: string; hinh: string; nhom: string; muc: Muc["ma"] };

/** Mọi việc trong danh mục, mã ổn định `<chủ đề>:<thứ tự>` (thứ tự = thứ tự trên màn). */
export const VIEC_DM: ViecDm[] = DANH_MUC_VIEC.flatMap((m) => m.chuDe.flatMap((c) => c.viec.map(([ten, sao, tuoi], i) => ({
  ma: `${c.ma}:${i + 1}`, ten, sao, tu12: tuoi === 12, muc: m.ma, nhom: NHOM_MUC[m.ma],
  hinh: ten === TEN_AIIROB ? "rob" : HINH_MUC[m.ma],
  bangChung: ten === TEN_AIIROB ? "tu_dong" : GHI_AM.has(ten) ? "ghi_am" : m.ma === "van_dong" || sao <= 5 ? "xong" : "anh",
}))));
const theoMa = new Map(VIEC_DM.map((v) => [v.ma, v]));

type CoSan = { ten: string; giao_cho: string | null; bang_chung: string };
const daCo = (co: CoSan[], v: ViecDm, con: string | null) =>
  v.bangChung === "tu_dong" ? co.some((x) => x.bang_chung === "tu_dong")
    : co.some((x) => x.ten === v.ten && (con === null || x.giao_cho === con || x.giao_cho === null));

/** GET nhiem-vu/danh-muc?con= — ba mục, mỗi việc kèm `daCo` (Con đã có việc cùng tên ⇒ màn hiện «Đã có», không ＋). */
export async function xemDanhMuc(fam: string, con: string | null) {
  const co = await q<CoSan>(`select ten, giao_cho, bang_chung from tasks where family_id = $1 and bat`, [fam]);
  return {
    muc: DANH_MUC_VIEC.map((m) => ({
      ma: m.ma, ten: m.ten, soViec: m.chuDe.reduce((n, c) => n + c.viec.length, 0),
      chuDe: m.chuDe.map((c) => ({ ma: c.ma, ten: c.ten, viec: VIEC_DM.filter((v) => v.ma.startsWith(`${c.ma}:`))
        .map((v) => ({ ma: v.ma, ten: v.ten, sao: v.sao, tu12: v.tu12, bangChung: v.bangChung, hinh: v.hinh, daCo: daCo(co, v, con) })) })),
    })),
  };
}

/** POST nhiem-vu/danh-muc {con, viec: mã[]} — thêm các việc đã chạm ＋ vào ngày của Con. → {taoMoi, ids, boQua}. */
export async function themTuDanhMuc(fam: string, b: { con?: unknown; viec?: unknown }, nguoi?: string) {
  const con = b.con ? String(b.con) : null;
  if (!con) throw new LoiNghiepVu("thieu_con", "Chọn con để giao việc");
  if (!(await q(`select 1 from children where id = $1 and family_id = $2`, [con, fam])).length) throw new LoiNghiepVu("khong_thay", "Không thấy hồ sơ Con", 404);
  if (!Array.isArray(b.viec) || !b.viec.length) throw new LoiNghiepVu("chua_chon", "Chạm ＋ ở ít nhất một việc");
  const ds = [...new Set(b.viec.map(String))].map((ma) => theoMa.get(ma)).filter((v): v is ViecDm => !!v);
  if (!ds.length) throw new LoiNghiepVu("viec_sai", "Việc đã chọn không còn trong danh sách");
  // một giao dịch: lỗi giữa chừng không để lại nửa số việc (review PR #243)
  return tx(async (t) => {
    const co = await t<CoSan>(`select ten, giao_cho, bang_chung from tasks where family_id = $1 and bat`, [fam]);
    const ids: string[] = [];
    let boQua = 0;
    for (const v of ds) {
      if (daCo(co, v, con)) { boQua++; continue; }
      const tu = v.bangChung === "tu_dong";
      ids.push(await taoNv(fam, { ten: v.ten, diem: v.sao, nhom: v.nhom, hinh: v.hinh, bang_chung: v.bangChung, lap_lai: "hang_ngay", toi_da_ngay: 1,
        tu_duyet: tu, giao_cho: tu ? null : con, bo: v.muc }, nguoi, t, true));
      co.push({ ten: v.ten, giao_cho: tu ? null : con, bang_chung: v.bangChung });
    }
    return { taoMoi: ids.length, ids, boQua };
  });
}
