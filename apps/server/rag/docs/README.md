## RAG Docs

Thêm tài liệu vào folder này (`.md`, `.txt`, `.json`) để chatbot trả lời dựa trên nội dung.

- Files được chia nhỏ (chunk) và tạo embeddings khi server khởi động.
- Endpoint: `POST /api/rag/query` body `{ "question": "..." }`

### Gợi ý

- Mỗi file nên tập trung 1 chủ đề (SOP, guideline, format banner, quy trình build demo, v.v.)
- Nếu cập nhật docs, restart server để re-index.

