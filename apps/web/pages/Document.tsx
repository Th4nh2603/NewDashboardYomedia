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
    <div className="max-w-5xl mx-auto pt-8 pb-12 space-y-8">
      <header>
        <h1 className="text-3xl md:text-4xl font-extrabold mb-3 bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
          Router Documentation
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base max-w-2xl">
          Trang này liệt kê toàn bộ các router (đường dẫn) đang dùng trong
          dashboard YomediaAI, kèm mô tả chức năng và gợi ý cách sử dụng cho
          team nội bộ.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          1. Cách truy cập router
        </h2>
        <ul className="list-disc list-inside text-sm md:text-base text-slate-700 dark:text-slate-300 space-y-1">
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
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          2. Danh sách router & chức năng
        </h2>

        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 shadow-sm">
          <div className="grid grid-cols-12 px-4 py-3 text-[11px] md:text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-slate-900">
            <div className="col-span-3 md:col-span-2">Router</div>
            <div className="hidden md:block md:col-span-2">Nhóm</div>
            <div className="col-span-9 md:col-span-8">Mô tả</div>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {routes.map((route) => (
              <div
                key={route.path}
                className="grid grid-cols-12 px-4 py-3 text-xs md:text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors"
              >
                <div className="col-span-3 md:col-span-2 flex flex-col">
                  <span className="font-semibold">{route.name}</span>
                  <code className="text-[11px] text-slate-500 dark:text-slate-400">
                    {route.path}
                  </code>
                </div>
                <div className="hidden md:flex md:col-span-2 items-center text-[11px] uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {route.group}
                </div>
                <div className="col-span-9 md:col-span-8">
                  <p>{route.description}</p>
                  <p className="mt-1 text-[11px] md:text-xs text-slate-600 dark:text-slate-400">
                    <span className="font-semibold">Cách dùng nhanh:</span>{" "}
                    {route.usage}
                  </p>
                  {route.note && (
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      Ghi chú: {route.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          3. Cách thêm router mới
        </h2>
        <ol className="list-decimal list-inside text-sm md:text-base text-slate-700 dark:text-slate-300 space-y-1">
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

      <section className="space-y-3">
        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          4. API backend quan trọng (upload demo)
        </h2>
        <p className="text-sm md:text-base text-slate-700 dark:text-slate-300">
          Backend hiện có router upload chính phục vụ tính năng{" "}
          <code className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
            Build Demo
          </code>
          . Base URL (theo config server nội bộ):
          <code className="ml-1 px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
            /api/upload
          </code>
          .
        </p>
        <ul className="list-disc list-inside text-sm md:text-base text-slate-700 dark:text-slate-300 space-y-1">
          <li>
            <span className="font-semibold">GET /api/upload</span>: trả về danh
            sách file HTML/JS đã upload sẵn để dùng trong pipeline build demo.
          </li>
          <li>
            <span className="font-semibold">
              GET /api/upload?name=&lt;file&gt;
            </span>
            : đọc nội dung một file cụ thể và tự động replace đường dẫn ảnh
            thành base64 phục vụ việc preview/render.
          </li>
          <li>
            <span className="font-semibold">POST /api/upload</span>: nhận body
            gồm <code className="text-xs">name</code>,{" "}
            <code className="text-xs">content</code> (HTML/JS) và optional
            mảng <code className="text-xs">images[]</code> (base64) để lưu
            file & asset lên thư mục <code className="text-xs">uploads</code>{" "}
            trên server.
          </li>
          <li>
            <span className="font-semibold">DELETE /api/upload</span>: xóa toàn
            bộ file trong thư mục <code className="text-xs">uploads</code>;
            thường dùng khi cần dọn sạch môi trường test/demo.
          </li>
        </ul>
      </section>
    </div>
  );
};

export default DocumentPage;

