// M4b kiểm soát MẠNG — dữ liệu hướng dẫn cho thiết bị KHÔNG cài được agent (TV, console): đặt DNS ở router MỘT lần (phủ cả nhà) hoặc
// đổi DNS trong phần Mạng của TV. Chỉ là dữ liệu mô tả để app Ba Mẹ dắt tay từng màn; đường menu có thể khác theo đời máy / bản phần mềm
// ⇒ mỗi mục có `luuY`. Tự cấu hình router CHỈ khi hãng có API chính thức VÀ Ba Mẹ tự nhập mật khẩu router trong app (dùng một lần, không
// lưu); AiiGrow không dò, không đoán, không thử mật khẩu. Ở mốc này chưa hãng nào được tự cấu hình (`tuCauHinh: false`).

export type HuongDanRouter = {
  ma: string; hang: string; dong: string; diaChiQuanTri: string[]; buoc: string[];
  apiChinhThuc: boolean; tuCauHinh: false; luuY: string;
};

export type HuongDanTv = { ma: string; hang: string; nen: string; buoc: string[]; luuY: string };

const DNS = "Nhập DNS chính = IP resolver AiiGrow của gia đình (hiện trong app); DNS phụ để trống hoặc nhập IP thứ hai của AiiGrow — KHÔNG để DNS của nhà mạng làm DNS phụ (thiết bị sẽ đi vòng qua)";

export const HUONG_DAN_ROUTER: HuongDanRouter[] = [
  { ma: "tplink", hang: "TP-Link", dong: "Archer / TL-WR (giao diện web)", diaChiQuanTri: ["http://tplinkwifi.net", "http://192.168.0.1"],
    buoc: ["Mở trình duyệt, vào địa chỉ quản trị, đăng nhập bằng mật khẩu quản trị router của Ba Mẹ", "Nâng cao › Mạng › Internet (hoặc DHCP Server)",
      "Mục DNS: chọn «Sử dụng địa chỉ DNS sau»", DNS, "Lưu, khởi động lại Wi-Fi của TV / console"],
    apiChinhThuc: false, tuCauHinh: false, luuY: "Router TP-Link dùng app Tether / Deco: Thêm › Nâng cao › DHCP Server / IPv4 › DNS" },
  { ma: "tplink_deco", hang: "TP-Link Deco (mesh)", dong: "Deco qua app Deco", diaChiQuanTri: ["App Deco"],
    buoc: ["Mở app Deco", "Thêm › Nâng cao › DHCP Server", "DNS chính / DNS phụ", DNS, "Lưu"],
    apiChinhThuc: false, tuCauHinh: false, luuY: "Không có API công khai cho người dùng ⇒ làm tay một lần" },
  { ma: "viettel", hang: "Viettel", dong: "Modem quang Viettel (ZTE / Huawei / Viettel)", diaChiQuanTri: ["http://192.168.1.1"],
    buoc: ["Đăng nhập trang quản trị modem bằng tài khoản quản trị của Ba Mẹ", "Mạng LAN (Network › LAN) › DHCP Server", "Mục DNS Server", DNS, "Áp dụng"],
    apiChinhThuc: false, tuCauHinh: false, luuY: "Một số modem nhà mạng khoá mục DNS: gọi tổng đài nhà mạng nhờ mở, hoặc đặt DNS trên router riêng của gia đình phía sau modem" },
  { ma: "fpt", hang: "FPT Telecom", dong: "Modem FPT (G-97 / AC1000F…), app Hi FPT", diaChiQuanTri: ["http://192.168.1.1", "App Hi FPT"],
    buoc: ["Đăng nhập trang quản trị modem (hoặc app Hi FPT › Internet › Quản lý modem)", "LAN › DHCP", "DNS", DNS, "Lưu"],
    apiChinhThuc: false, tuCauHinh: false, luuY: "Như Viettel: nếu mục DNS bị khoá thì nhờ tổng đài hoặc dùng router riêng" },
  { ma: "vnpt", hang: "VNPT", dong: "Modem iGate (GW040 / GW240…), app My VNPT", diaChiQuanTri: ["http://192.168.1.1"],
    buoc: ["Đăng nhập trang quản trị modem iGate", "Network Settings › LAN › DHCP", "Primary DNS / Secondary DNS", DNS, "Apply / Save"],
    apiChinhThuc: false, tuCauHinh: false, luuY: "Như Viettel: nếu mục DNS bị khoá thì nhờ tổng đài hoặc dùng router riêng" },
  { ma: "tenda", hang: "Tenda", dong: "Tenda AC / Nova", diaChiQuanTri: ["http://tendawifi.com", "http://192.168.0.1"],
    buoc: ["Đăng nhập trang quản trị", "Cài đặt nâng cao › DHCP Server (hoặc Cài đặt Internet › DNS)", DNS, "Lưu"],
    apiChinhThuc: false, tuCauHinh: false, luuY: "Đường menu khác theo đời máy" },
  { ma: "asus", hang: "ASUS", dong: "RT / ZenWiFi (ASUSWRT)", diaChiQuanTri: ["http://router.asus.com", "App ASUS Router"],
    buoc: ["Đăng nhập trang quản trị", "Mạng LAN › Máy chủ DHCP › DNS Server", DNS, "Áp dụng"],
    apiChinhThuc: false, tuCauHinh: false, luuY: "ASUSWRT có thêm «DNS Director» (gán DNS theo thiết bị) — hữu ích cho TV" },
];

export const HUONG_DAN_TV: HuongDanTv[] = [
  { ma: "samsung", hang: "Samsung", nen: "Tizen", buoc: ["Cài đặt › Chung › Mạng › Trạng thái mạng › Cài đặt IP", "Cài đặt DNS › Nhập thủ công", DNS, "OK"],
    luuY: "Tên mục có thể là «Mạng › Cài đặt mạng nâng cao» ở đời TV mới" },
  { ma: "lg", hang: "LG", nen: "webOS", buoc: ["Cài đặt › Tất cả cài đặt › Mạng (hoặc Chung › Mạng)", "Kết nối Wi-Fi › Cài đặt Wi-Fi nâng cao › Chỉnh sửa", "Bỏ chọn «Đặt tự động», nhập Máy chủ DNS", DNS, "Kết nối"],
    luuY: "Một số đời yêu cầu đặt IP tĩnh khi nhập DNS tay" },
  { ma: "google_tv", hang: "Sony / TCL / Xiaomi (Google TV / Android TV)", nen: "Android TV", buoc: ["Cài đặt › Mạng và Internet › chọn Wi-Fi đang dùng", "Cài đặt IP › Tĩnh (giữ địa chỉ gợi ý)", "DNS 1 / DNS 2", DNS, "Lưu"],
    luuY: "Android TV thường không có mục DNS riêng tư ⇒ dùng DNS thường (IP)" },
  { ma: "apple_tv", hang: "Apple TV", nen: "tvOS", buoc: ["Cài đặt › Mạng › Wi-Fi › chọn mạng", "Định cấu hình DNS › Thủ công", DNS, "Xong"], luuY: "—" },
  { ma: "ps5", hang: "PlayStation 5", nen: "PS5", buoc: ["Cài đặt › Mạng › Cài đặt › Thiết lập kết nối Internet", "Chọn mạng › Cài đặt nâng cao › Cài đặt DNS › Thủ công", DNS, "OK"], luuY: "—" },
  { ma: "xbox", hang: "Xbox", nen: "Xbox", buoc: ["Cài đặt › Chung › Cài đặt mạng › Cài đặt nâng cao", "Cài đặt DNS › Thủ công", DNS], luuY: "—" },
  { ma: "switch", hang: "Nintendo Switch", nen: "Switch", buoc: ["Cài đặt hệ thống › Internet › Cài đặt Internet", "Chọn mạng › Thay đổi cài đặt › Cài đặt DNS › Thủ công", DNS, "Lưu"], luuY: "—" },
];

export const GIOI_HAN_DNS = [
  "Chỉ lọc được TÊN MIỀN (vd youtube.com); không thấy, không lọc nội dung bên trong app hay trang (một video cụ thể, một kênh).",
  "Không đếm được phút dùng thật: giờ chơi của TV / console thực thi bằng chặn tên miền ngoài lịch mở.",
  "App dùng DNS riêng hoặc kết nối thẳng địa chỉ IP thì không qua bộ lọc.",
  "TV / console đổi DNS tay, đặt lại gốc, hoặc dùng mạng khác (4G phát từ điện thoại) là vượt được ⇒ AiiGrow báo Ba Mẹ khi thiết bị không còn đi qua resolver.",
  "DNS thường (IP, cổng 53) ở router / TV nhận diện theo địa chỉ IP công cộng của nhà ⇒ phủ cả nhà, không tách được từng TV; muốn tách thì dùng router có gán DNS theo thiết bị.",
];

export const CHI_MOT_LAN = "Chỉ làm 1 lần, phủ cả nhà: đặt DNS ở router thì mọi thiết bị dùng Wi-Fi nhà (kể cả TV, console) đi qua bộ lọc gia đình.";

/** Có tự cấu hình được router hãng này không — chỉ khi có API chính thức. Hiện: chưa hãng nào. */
export const coTheTuCauHinh = (ma: string) => HUONG_DAN_ROUTER.some((r) => r.ma === ma && r.apiChinhThuc && r.tuCauHinh);
