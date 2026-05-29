## Upload demo qua AI Chat

Tài liệu này dùng khi user hỏi **cách upload demo**, **upload demo như thế nào**, **hướng dẫn upload demo**, hoặc tương tự trong **AI Chat** (không phải lệnh thực thi upload).

### Tổng quan

Trong **AI Chat**, bạn có thể upload demo HTML hoặc video lên SFTP (`/script/demo/...`) mà không cần mở trang Build Demo. Chat sẽ:

1. Nhận diện ý định upload demo.
2. Kiểm tra đủ thông tin: **brand**, **format** (với demo HTML), và **file đính kèm**.
3. Chạy pipeline convert (HTML) hoặc upload video + tạo VAST (video).
4. Trả về đường dẫn remote và link preview.

### Thông tin bắt buộc

| Tham số | Bắt buộc | Mô tả |
|--------|----------|--------|
| **brand** | Có | Brand trong cấu hình Build Demo (ví dụ: `Yomedia`, `Romano`, `Maxkleen`). Viết trong tin nhắn: `brand: yomedia` hoặc `brand yomedia`. |
| **format** | Có (HTML) | Kích thước hoặc loại placement, ví dụ `300x250`, `480x270`, `masthead`, `instream`, `outstream`. Viết: `format: 300x250` hoặc `format instream`. **Không bắt buộc** với upload **chỉ video** (hệ thống tự tạo preview outstream/instream). |
| **File đính kèm** | Có | Nút đính kèm (paperclip) trên ô chat: folder, zip, hoặc file lẻ. |

Nếu thiếu thông tin, chat trả lời dạng:

> Còn thiếu: brand, format, file đính kèm. Ví dụ: `brand: yomedia`, `format: 300x250`, đính kèm folder/file demo.

Bạn có thể bổ sung từng phần trong tin nhắn tiếp theo (ví dụ chỉ gửi `brand: yomedia` rồi gửi format và file sau).

### Hai loại upload

#### 1. Demo HTML (banner / rich media)

**File cần có:**

- Đúng **1 file HTML** (`.html` / `.htm`) — sẽ upload thành `index.html`.
- Đúng **1 file JS** — script chính của demo.
- **Ảnh** (png, jpg, …): tùy chọn; hệ thống nhúng base64 vào HTML/JS khi convert.
- **Video** (mp4, webm, mov): tùy chọn, tối đa 1 file.

**Ví dụ tin nhắn đầy đủ:**

```text
upload demo brand: yomedia format: 300x250
```

(kèm đính kèm folder hoặc zip chứa `index.html` + `main.js` + assets)

**Đường dẫn remote (mặc định):** `YYYY/MM/<brand>/all/html/<tên-file>` — tự tăng suffix nếu folder đã tồn tại.

**Tùy chọn:** chỉ định sẵn path:

```text
upload demo brand: romano path: 2026/05/romano/all/html/my-creative
```

#### 2. Demo video (TVC / VAST)

**File cần có:**

- Đúng **1 video** MP4, WebM hoặc MOV — **không** kèm HTML/JS.

**Ví dụ tin nhắn:**

```text
upload demo brand: yomedia
```

(kèm 1 file video)

Hệ thống upload `tvc.mp4`, tạo `make-vast.xml`, và sinh link preview **outstream** + **instream**. Không cần `format:` trong tin nhắn.

### Các bước thực hiện (checklist)

1. Mở **AI Chat** trên dashboard.
2. Bấm **đính kèm** → chọn folder demo, file zip, hoặc từng file.
3. Gõ lệnh có **brand** (và **format** nếu là HTML), ví dụ:
   - `upload demo brand: yomedia format: 480x270`
   - `upload demo brand: yomedia format: instream` + 1 video
4. Gửi tin nhắn. Nếu còn thiếu, làm theo gợi ý chat rồi gửi tiếp.
5. Chờ thanh tiến trình upload. Khi xong, copy **link preview** từ phản hồi.

### Câu hỏi thường gặp

**Hỏi:** Upload demo như thế nào?  
**Trả lời:** Dùng AI Chat, đính kèm file demo, gõ `upload demo` kèm `brand:` và `format:` (HTML). Xem bảng thông tin bắt buộc và ví dụ ở trên.

**Hỏi:** Brand không hợp lệ?  
**Trả lời:** Brand phải khớp danh sách trong cấu hình (ví dụ Yomedia, Romano, Maxkleen, Enchanteur, …). Dùng đúng tên hoặc gần đúng để chat gợi ý.

**Hỏi:** Thiếu format?  
**Trả lời:** Với HTML, thêm `format: 300x250` hoặc tên placement (`instream`, `outstream`, `masthead`, …). Video-only không cần format trong tin nhắn.

**Hỏi:** Upload demo qua trang Build Demo?  
**Trả lời:** Vào menu **Build Demo**, chọn brand/năm/tháng/format, kéo thả file, rồi upload SFTP — phù hợp khi cần chỉnh sửa chi tiết trước khi đẩy lên server.

### Lưu ý kỹ thuật

- Chỉ file `.html`, `.htm`, `.js` và video được đẩy lên SFTP; file khác trong folder có thể bị bỏ qua (log trong phản hồi).
- HTML pipeline: convert ảnh sang base64 trong nội dung text trước khi upload.
- Video lớn có thể mất vài phút (nén trên server).
- Sau khi cập nhật tài liệu RAG, **restart server** để re-index embeddings.

### Từ khóa tìm kiếm (RAG)

upload demo, upload demo như thế nào, hướng dẫn upload demo, cách upload demo, brand format đính kèm, AI chat build demo, convert base64 upload SFTP, video demo tvc make-vast
