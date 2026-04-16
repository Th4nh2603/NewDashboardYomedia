import React from "react";

interface RouteInfo {
  path: string;
  name: string;
  group: string;
  description: string;
  usage: string;
  note?: string;
}

const routes: RouteInfo[] = [
  {
    path: "/login",
    name: "Login",
    group: "Auth",
    description:
      "Màn hình đăng nhập bằng Google OAuth, kiểm tra role và tạo phiên truy cập trước khi vào dashboard.",
    usage:
      "Dùng khi bắt đầu phiên làm việc hoặc khi token hết hạn. Nếu không đăng nhập, các route trong dashboard sẽ bị chặn bởi PrivateRoute.",
    note: "Route public duy nhất; không nằm trong Sidebar.",
  },
  {
    path: "/",
    name: "Dashboard",
    group: "Core",
    description:
      "Trang tổng quan chính, hiển thị giới thiệu và các lối tắt đến những tính năng AI quan trọng.",
    usage:
      "Dùng để mở nhanh các module chính trong buổi demo, xem high-level overview trước khi đi sâu vào từng tính năng.",
  },
  {
    path: "/chat",
    name: "AI Chat",
    group: "AI Intelligence",
    description:
      "Giao diện chat với AI, dùng để hỏi đáp, brainstorm ý tưởng, viết nội dung hoặc hỗ trợ code.",
    usage:
      "Nhập prompt bằng tiếng Việt/Anh, có thể yêu cầu viết proposal, idea campaign, script TVC, email… Dùng khi cần tương tác linh hoạt, realtime với AI.",
  },
  {
    path: "/vision",
    name: "Vision AI",
    group: "AI Intelligence",
    description:
      "Xử lý/generative hình ảnh từ mô tả text hoặc upload ảnh để phân tích, chỉnh sửa.",
    usage:
      "Dùng khi cần AI hiểu nội dung trong ảnh (phân tích layout, text, vật thể) hoặc sinh thêm biến thể từ một hình gốc để phục vụ đề xuất creative.",
  },
  {
    path: "/image-generator",
    name: "Image Generator",
    group: "AI Intelligence",
    description:
      "Sinh ảnh sáng tạo phục vụ demo chiến dịch, banner, key visual.",
    usage:
      "Nhập mô tả chi tiết (brand, mood, màu sắc, đối tượng, kênh hiển thị) rồi generate 2–4 option để chọn. Thích hợp cho phần trình bày idea/visual nhanh trong meeting.",
  },
  {
    path: "/cinema",
    name: "Cinema AI",
    group: "AI Intelligence",
    description:
      "Sinh video dạng cinematic, mô phỏng TVC hoặc motion demo cho chiến dịch.",
    usage:
      "Chuẩn bị script ngắn + mô tả cảnh, cho AI sinh video preview. Dùng để minh họa concept TVC, motion banner, intro clip trong buổi pitching.",
  },
  {
    path: "/live",
    name: "Live Stream",
    group: "AI Intelligence",
    description:
      "Trò chuyện realtime với AI bằng giọng nói (voice), mô phỏng tư vấn trực tiếp.",
    usage:
      "Dùng micro để nói chuyện trực tiếp với AI, phù hợp demo khả năng tư vấn realtime, Q&A live trong workshop hoặc event nội bộ.",
  },
  {
    path: "/ai-gmail",
    name: "AI Gmail",
    group: "AI Intelligence",
    description:
      "Trợ lý email thông minh: hỗ trợ đọc/tóm tắt nội dung, phân loại và gợi ý phản hồi nhanh.",
    usage:
      "Dùng cho các tác vụ xử lý email số lượng lớn hoặc cần trả lời nhanh theo ngữ cảnh chiến dịch.",
  },
  {
    path: "/creative-showcase",
    name: "Creative Showcase",
    group: "Data Management",
    description:
      "Thư viện các demo/creative đã có sẵn để tham khảo và trình bày với client.",
    usage:
      "Dùng trước buổi gặp khách để chọn sẵn các demo phù hợp ngành hàng/format. Trong demo, mở nhanh từng entry để show case study hoặc ví dụ minh họa.",
  },
  {
    path: "/manage-demo",
    name: "Manage Demo",
    group: "Data Management",
    description:
      "Quản lý danh sách demo (thêm/sửa/xóa, gán brand, trạng thái, phân loại).",
    usage:
      "Dùng cho team nội bộ (không demo cho khách) để dọn dẹp, đặt tên chuẩn, tag brand/campaign, ẩn các demo cũ và giữ thư viện luôn sạch, dễ tìm.",
  },
  {
    path: "/build-demo",
    name: "Build Demo",
    group: "Data Management",
    description:
      "Pipeline ingest asset HTML/JS/ảnh, replace script & base64, upload sang SFTP và generate bundle.",
    usage:
      "Dùng khi cần onboard một demo creative mới: upload file HTML/JS/ảnh nguồn, điền thông tin mapping, để hệ thống render & deploy thành demo hoàn chỉnh sẵn sàng dùng trong showcase.",
  },
  {
    path: "/documentation",
    name: "Documentation",
    group: "Data Management",
    description:
      "Trang hướng dẫn tính năng theo module (User Guide), phục vụ onboarding user mới và training nội bộ.",
    usage:
      "Dùng làm tài liệu tham chiếu khi cần hiểu nhanh khả năng của từng module trong hệ thống.",
  },
  {
    path: "/bar",
    name: "Performance (Bar)",
    group: "Analytics",
    description:
      "Trang biểu đồ cột, dùng để visualize performance (view, CTR, v.v.) theo nhiều chiều.",
    usage:
      "Dùng để kể câu chuyện số liệu: chọn khoảng thời gian, loại chiến dịch, đối tượng… rồi dùng biểu đồ để giải thích hiệu quả media cho khách/management.",
  },
  {
    path: "/history",
    name: "History",
    group: "Core",
    description:
      "Lịch sử các tương tác/giao dịch (ví dụ: prompt, request, job chạy gần đây).",
    usage:
      "Dùng để kiểm tra lại prompt, job đã chạy, hoặc truy vết khi có issue trong quá trình demo (nhìn lại xem lần chạy trước đã làm gì).",
  },
];

const DocumentPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto pt-8 pb-12 space-y-8">
      <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#141b2d]/70 backdrop-blur-xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-[#4cceac]/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 w-56 h-56 rounded-full bg-indigo-500/10 blur-3xl" />
        <h1 className="relative text-3xl md:text-4xl font-black mb-3 bg-gradient-to-r from-white via-[#d7fff4] to-[#9ca3af] bg-clip-text text-transparent tracking-tight">
          Router Documentation
        </h1>
        <p className="relative text-[#a3a3a3] text-sm md:text-base max-w-2xl leading-relaxed">
          Trang này liệt kê toàn bộ các router (đường dẫn) đang dùng trong
          dashboard YomediaAI, kèm mô tả chức năng và gợi ý cách sử dụng cho
          team nội bộ.
        </p>
      </header>

      <section className="space-y-4 rounded-3xl border border-white/5 bg-[#141b2d]/40 p-6 shadow-xl">
        <h2 className="text-xl font-black text-white tracking-tight">
          1. Cách truy cập router
        </h2>
        <ul className="list-disc list-inside text-sm md:text-base text-[#cbd5e1] space-y-2 leading-relaxed">
          <li>
            <span className="font-semibold">Qua Sidebar</span>: mỗi mục trong
            sidebar được map 1–1 với một router (ví dụ: &quot;AI Chat&quot; →
            <code className="ml-1 px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              /chat
            </code>
            ).
          </li>
          <li>
            <span className="font-semibold">Gõ URL trực tiếp</span>: vì app dùng{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              HashRouter
            </code>
            , bạn có thể truy cập dạng{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              #/chat
            </code>
            ,{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              #/build-demo
            </code>{" "}
            trong URL.
          </li>
          <li>
            <span className="font-semibold">Bảo mật</span>: mọi router bên trong
            layout chính đều nằm sau{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              PrivateRoute
            </code>
            , nên cần login thành công mới truy cập được.
          </li>
          <li>
            <span className="font-semibold">Phân quyền theo role</span>: một số
            menu được ẩn theo role (ví dụ{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              /build-demo
            </code>{" "}
            có thể bị ẩn với adsop/adsopmanager), nhưng route vẫn tồn tại trong app.
          </li>
        </ul>
      </section>

      <section className="space-y-4 rounded-3xl border border-white/5 bg-[#141b2d]/40 p-6 shadow-xl">
        <h2 className="text-xl font-black text-white tracking-tight">
          2. Danh sách router & chức năng
        </h2>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220]/80 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
          <div className="grid grid-cols-12 px-4 py-3 text-[11px] md:text-xs font-black uppercase tracking-wide text-[#94a3b8] bg-[#0f172a]/90 border-b border-white/5">
            <div className="col-span-3 md:col-span-2">Router</div>
            <div className="hidden md:block md:col-span-2">Nhóm</div>
            <div className="col-span-9 md:col-span-8">Mô tả</div>
          </div>
          <div className="divide-y divide-white/5">
            {routes.map((route) => (
              <div
                key={route.path}
                className="grid grid-cols-12 px-4 py-3 text-xs md:text-sm text-[#e5e7eb] hover:bg-white/5 transition-colors"
              >
                <div className="col-span-3 md:col-span-2 flex flex-col">
                  <span className="font-bold text-white">{route.name}</span>
                  <code className="text-[11px] text-[#7dd3fc] mt-0.5">
                    {route.path}
                  </code>
                </div>
                <div className="hidden md:flex md:col-span-2 items-center">
                  <span className="text-[10px] uppercase tracking-widest text-[#93c5fd] bg-[#1e3a8a]/30 border border-[#1e40af]/40 px-2 py-1 rounded-full">
                    {route.group}
                  </span>
                </div>
                <div className="col-span-9 md:col-span-8">
                  <p>{route.description}</p>
                  <p className="mt-1 text-[11px] md:text-xs text-[#94a3b8]">
                    <span className="font-semibold text-[#cbd5e1]">Cách dùng nhanh:</span>{" "}
                    {route.usage}
                  </p>
                  {route.note && (
                    <p className="mt-1 text-[11px] text-[#fda4af]">
                      Ghi chú: {route.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3 rounded-3xl border border-white/5 bg-[#141b2d]/40 p-6 shadow-xl">
        <h2 className="text-xl font-black text-white tracking-tight">
          3. Cách thêm router mới
        </h2>
        <ol className="list-decimal list-inside text-sm md:text-base text-[#cbd5e1] space-y-2 leading-relaxed">
          <li>
            Tạo file page mới trong thư mục{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              apps/web/pages
            </code>{" "}
            (ví dụ: <code className="text-xs">NewFeature.tsx</code>).
          </li>
          <li>
            Import page đó trong{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              App.tsx
            </code>{" "}
            và thêm{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              {"<Route path=\"/new-feature\" element={<NewFeature />} />"}
            </code>{" "}
            bên trong khối <code className="text-xs">{"<Routes>"}</code> của{" "}
            <code className="text-xs">DashboardLayout</code>.
          </li>
          <li>
            Thêm navigation tương ứng trong{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              components/Sidebar.tsx
            </code>{" "}
            để user có thể click vào.
          </li>
        </ol>
      </section>

      <section className="space-y-3 rounded-3xl border border-white/5 bg-[#141b2d]/40 p-6 shadow-xl">
        <h2 className="text-xl font-black text-white tracking-tight">
          4. API backend quan trọng theo chức năng
        </h2>
        <ul className="list-disc list-inside text-sm md:text-base text-[#cbd5e1] space-y-2 leading-relaxed">
          <li>
            <span className="font-semibold">RAG Chat</span>{" "}
            <code className="text-xs">POST /api/rag/query</code>: nhận{" "}
            <code className="text-xs">question</code>, trả về{" "}
            <code className="text-xs">answer + sources</code>. Dùng cho trang{" "}
            <code className="text-xs">/chat</code>.
          </li>
          <li>
            <span className="font-semibold">Creative Demos</span>{" "}
            <code className="text-xs">GET /api/creative-demos</code>: trả danh
            sách demo theo dữ liệu server (đang lọc theo status active), dùng ở{" "}
            <code className="text-xs">/creative-showcase</code> và logic match format.
          </li>
          <li>
            <span className="font-semibold">SFTP Connect</span>{" "}
            <code className="text-xs">GET /api/sftp/connect</code>: test kết
            nối SFTP, dùng tại <code className="text-xs">/manage-demo</code>.
          </li>
          <li>
            <span className="font-semibold">SFTP List</span>{" "}
            <code className="text-xs">GET /api/sftp/list?path=...</code>: liệt
            kê file/thư mục từ đường dẫn SFTP.
          </li>
          <li>
            <span className="font-semibold">SFTP Read/Write</span>{" "}
            <code className="text-xs">GET /api/sftp/read</code>,{" "}
            <code className="text-xs">POST /api/sftp/write</code>: đọc/sửa file
            trực tiếp trên SFTP.
          </li>
          <li>
            <span className="font-semibold">SFTP Exists</span>{" "}
            <code className="text-xs">GET /api/sftp/exists?path=...</code>: kiểm
            tra thư mục có tồn tại hay không (được dùng trong Chat để check path).
          </li>
          <li>
            <span className="font-semibold">SFTP Download Directory</span>{" "}
            <code className="text-xs">
              GET /api/sftp/download-directory?path=...
            </code>
            : tải toàn bộ thư mục thành file zip (nút Download ở showcase).
          </li>
          <li>
            <span className="font-semibold">GET /api/upload</span>: (đã xoá/không còn dùng)
          </li>
          <li>
            <span className="font-semibold">
              GET /api/upload?name=&lt;file&gt;
            </span>
            : (đã xoá/không còn dùng)
          </li>
          <li>
            <span className="font-semibold">POST /api/upload</span>: nhận body
            gồm <code className="text-xs">name</code>,{" "}
            <code className="text-xs">content</code> (HTML/JS) và optional
            mảng <code className="text-xs">images[]</code> (base64) để lưu
            file & asset lên thư mục <code className="text-xs">uploads</code>{" "}
            trên server. (đã xoá/không còn dùng)
          </li>
          <li>
            <span className="font-semibold">DELETE /api/upload</span>: (đã xoá/không còn dùng)
          </li>
        </ul>
      </section>

      <section className="space-y-3 rounded-3xl border border-white/5 bg-[#141b2d]/40 p-6 shadow-xl">
        <h2 className="text-xl font-black text-white tracking-tight">
          5. Checklist khi thêm chức năng mới
        </h2>
        <ol className="list-decimal list-inside text-sm md:text-base text-[#cbd5e1] space-y-2 leading-relaxed">
          <li>Thêm route trong App.tsx và menu trong Sidebar.tsx (nếu cần).</li>
          <li>Ghi 1 dòng vào trang này: path, mục đích, cách dùng nhanh.</li>
          <li>Kiểm tra role nào được thấy/chạy chức năng đó.</li>
          <li>Liệt kê API backend liên quan (method + endpoint + input/output chính).</li>
          <li>Test lại end-to-end trước khi merge/push.</li>
        </ol>
      </section>
    </div>
  );
};

export default DocumentPage;

