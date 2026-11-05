// Đích quay về của Facebook trên iOS / Android: `fb<APP_ID>://authorize` — expo-router đọc thành đường /authorize. Cùng cách xử lý với
// /oauthredirect (Google): thư viện đọc token từ link, màn này chỉ trả về màn trước để không rơi vào «không thấy trang».
export { default } from "./oauthredirect";
