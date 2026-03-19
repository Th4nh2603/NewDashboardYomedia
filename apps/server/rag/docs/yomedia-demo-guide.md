## Yomedia Demo Guide (sample)

### Build Demo

- Demo HTML/JS thường nằm trong thư mục theo cấu trúc `YYYY/MM/brand/size/`.
- Khi cần tìm đường dẫn demo từ một URL có dạng `...?b=<path>index.html`, hãy decode URL và lấy phần giữa `b=` và `index.html`.

#### Quy tắc trích xuất từ URL demo

- **Mục tiêu**: Trả về **đường dẫn** nằm **sau `b=`** và **trước `index.html`**.
- **Bước làm**:
  - Decode URL (vì `b=` thường bị encode như `%2F`).
  - Tìm đoạn `b=` rồi cắt đến trước `index.html`.

**Ví dụ**

- Input:
  - `https://demo.yomedia.vn/yomedia/site/tt247mb/index.html?f=masthead-mb&b=2026%2F03%2Fromano%2F480x270%2Findex.html&l=lt&c=media`
- Decode `b=`:
  - `b=2026/03/romano/480x270/index.html`
- Output (cần trả lời):
  - `2026/03/romano/480x270/`

### SFTP

- Server hỗ trợ thao tác SFTP: connect, list, read, write qua các endpoint `/api/sftp/*`.
- Khi gặp lỗi quyền truy cập, kiểm tra user/password và quyền thư mục trên host.

### Banner formats

- Common formats: `firstview`, `inpage`, `video`.

## Truyền URL content vào code Yo (pub)

### Mục tiêu

- Pub truyền **URL bài viết/content** vào tag Yo để hệ thống nhận đúng trang đang gắn code.

### Cách làm

- Trong đoạn code pub, tìm vị trí tham số **`[yo_page_url]`** trong `_avlVar.push(...)`.
- Pub **replace** `[yo_page_url]` bằng **link content thật** (URL của bài đang gắn code).

### Ví dụ

Code mẫu pub nhận từ Yo:

```html
<script type="text/javascript">
/* load placement: Tiin-Balloon, for account: Viettel, site: tiin.vn, size: 1x1 - display */
var _avlVar = _avlVar || [];
_avlVar.push(["f681e5a34b534465bdd482b72bde2f2b","[yo_page_url]","[width]","[height]"]);
</script>
<script type="text/javascript" src="//ss.yomedia.vn/js/yomedia-sdk.js?v=3" id="s-f681e5a34b534465bdd482b72bde2f2b"></script>
```

Pub truyền URL content bằng cách thay `[yo_page_url]`:

```html
<script type="text/javascript">
/* load placement: Tiin-Balloon, for account: Viettel, site: tiin.vn, size: 1x1 - display */
var _avlVar = _avlVar || [];
_avlVar.push(["f681e5a34b534465bdd482b72bde2f2b","https://tiin.vn/chuyen-muc/hoc/cong-bo-lich-thi-tot-nghiep-thpt-nam-2021.html","[width]","[height]"]);
</script>
<script type="text/javascript" src="//ss.yomedia.vn/js/yomedia-sdk.js?v=3" id="s-f681e5a34b534465bdd482b72bde2f2b"></script>
```

### Lưu ý

- Pub phải truyền **đúng link content** của bài đang gắn code.
