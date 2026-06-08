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
      "Clerk sign-in; verifies role and creates a session before entering the dashboard.",
    usage:
      "Use when starting a session or after the token expires. Without sign-in, dashboard routes are blocked by PrivateRoute.",
    note: "Only public route; not listed in the Sidebar.",
  },
  {
    path: "/",
    name: "Dashboard",
    group: "Core",
    description:
      "Main overview with intros and shortcuts to core AI features.",
    usage:
      "Use to jump into primary modules during demos or to get a high-level overview before drilling down.",
  },
  {
    path: "/chat",
    name: "AI Chat",
    group: "AI Intelligence",
    description:
      "Chat UI for Q&A, brainstorming, copywriting, and lightweight coding help.",
    usage:
      "Enter prompts in Vietnamese or English — proposals, campaign ideas, TVC scripts, emails, etc. For flexible, real-time AI interaction.",
  },
  {
    path: "/vision",
    name: "Vision AI",
    group: "AI Intelligence",
    description:
      "Image understanding and generation from text or uploaded images.",
    usage:
      "When you need layout/text/object understanding in images or extra variants from a base asset for creative proposals.",
  },
  {
    path: "/image-generator",
    name: "Image Generator",
    group: "AI Intelligence",
    description:
      "Generate campaign visuals: banners, hero images, key visuals.",
    usage:
      "Describe brand, mood, colors, audience, and placement; generate 2–4 options to pick from. Good for fast idea reviews in meetings.",
  },
  {
    path: "/cinema",
    name: "Cinema AI",
    group: "AI Intelligence",
    description:
      "Cinematic-style video generation for TVC-style or motion demos.",
    usage:
      "Short script plus scene notes for an AI video preview. Pitch TVC concepts, motion banners, or intro clips.",
  },
  {
    path: "/live",
    name: "Live Stream",
    group: "AI Intelligence",
    description:
      "Real-time voice conversation with AI, similar to live consultation.",
    usage:
      "Use the mic for live Q&A demos, workshops, or internal events.",
  },
  {
    path: "/ai-gmail",
    name: "AI Gmail",
    group: "AI Intelligence",
    description:
      "Email helper: read/summarize, triage, and suggest quick replies.",
    usage:
      "High-volume inbox work or fast replies with campaign context.",
  },
  {
    path: "/smtp-mail",
    name: "SMTP",
    group: "Administration",
    description:
      "Test SMTP connectivity and send mail through the server API (admin only for send).",
    usage:
      "Verify relay with server env or custom host; compose a message when your role is admin.",
  },
  {
    path: "/creative",
    name: "Creative",
    group: "Data Management",
    description:
      "Library of ready-made demos and creatives for reference and client meetings.",
    usage:
      "Pick relevant demos by vertical/format before meetings; open entries for case studies during live demos.",
  },
  {
    path: "/manage-demo",
    name: "Manage Demo",
    group: "Data Management",
    description:
      "CRUD for demos: brands, status, categories.",
    usage:
      "Internal housekeeping — naming, tags, hide outdated demos, keep the library tidy.",
  },
  {
    path: "/documentation",
    name: "Documentation",
    group: "Data Management",
    description:
      "Module user guide for onboarding and internal training.",
    usage:
      "Quick reference when you need each module explained at a glance.",
  },
  {
    path: "/bar",
    name: "Performance (Bar)",
    group: "Analytics",
    description:
      "Bar charts for metrics like views and CTR across dimensions.",
    usage:
      "Tell a data story — time range, campaign type, audiences — then explain media performance for clients or leadership.",
  },
  {
    path: "/history",
    name: "History",
    group: "Core",
    description:
      "Recent interactions — prompts, requests, jobs.",
    usage:
      "Audit what ran earlier or trace issues mid-demo.",
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
          This page lists every router (path) in the NovaAi dashboard, what it
          does, and brief usage notes for internal teams.
        </p>
      </header>

      <section className="space-y-4 rounded-3xl border border-white/5 bg-[#141b2d]/40 p-6 shadow-xl">
        <h2 className="text-xl font-black text-white tracking-tight">
          1. How to navigate routes
        </h2>
        <ul className="list-disc list-inside text-sm md:text-base text-[#cbd5e1] space-y-2 leading-relaxed">
          <li>
            <span className="font-semibold">Via Sidebar</span>: each item maps
            1–1 to a route (for example &quot;AI Chat&quot; →{" "}
            <code className="ml-1 px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              /chat
            </code>
            ).
          </li>
          <li>
            <span className="font-semibold">Direct URL</span>: the app uses{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              HashRouter
            </code>
            , so open paths like{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              #/chat
            </code>
            ,{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              #/manage-demo
            </code>{" "}
            in the URL bar.
          </li>
          <li>
            <span className="font-semibold">Security</span>: routes inside the
            main layout sit behind{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              PrivateRoute
            </code>
            — you must be signed in.
          </li>
          <li>
            <span className="font-semibold">Role-based UI</span>: some menu
            items hide per role (for example{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              /upload
            </code>{" "}
            may be hidden for{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              manager
            </code>
            ), but the route still exists in code.
          </li>
        </ul>
      </section>

      <section className="space-y-4 rounded-3xl border border-white/5 bg-[#141b2d]/40 p-6 shadow-xl">
        <h2 className="text-xl font-black text-white tracking-tight">
          2. Route list & descriptions
        </h2>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220]/80 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
          <div className="grid grid-cols-12 px-4 py-3 text-[11px] md:text-xs font-black uppercase tracking-wide text-[#94a3b8] bg-[#0f172a]/90 border-b border-white/5">
            <div className="col-span-3 md:col-span-2">Router</div>
            <div className="hidden md:block md:col-span-2">Group</div>
            <div className="col-span-9 md:col-span-8">Description</div>
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
                    <span className="font-semibold text-[#cbd5e1]">
                      Quick tip:
                    </span>{" "}
                    {route.usage}
                  </p>
                  {route.note && (
                    <p className="mt-1 text-[11px] text-[#fda4af]">
                      Note: {route.note}
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
          3. Adding a new route
        </h2>
        <ol className="list-decimal list-inside text-sm md:text-base text-[#cbd5e1] space-y-2 leading-relaxed">
          <li>
            Create a page component under{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              apps/web/pages
            </code>{" "}
            (example: <code className="text-xs">NewFeature.tsx</code>).
          </li>
          <li>
            Import it in{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              App.tsx
            </code>{" "}
            and add{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              {"<Route path=\"/new-feature\" element={<NewFeature />} />"}
            </code>{" "}
            inside the <code className="text-xs">{"<Routes>"}</code> block of{" "}
            <code className="text-xs">DashboardLayout</code>.
          </li>
          <li>
            Wire navigation in{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-900/5 dark:bg-slate-100/5 text-xs">
              components/Sidebar.tsx
            </code>{" "}
            if users should discover it from the menu.
          </li>
        </ol>
      </section>

      <section className="space-y-3 rounded-3xl border border-white/5 bg-[#141b2d]/40 p-6 shadow-xl">
        <h2 className="text-xl font-black text-white tracking-tight">
          4. Key backend APIs
        </h2>
        <ul className="list-disc list-inside text-sm md:text-base text-[#cbd5e1] space-y-2 leading-relaxed">
          <li>
            <span className="font-semibold">RAG Chat</span>{" "}
            <code className="text-xs">POST /api/rag/query</code>: accepts{" "}
            <code className="text-xs">question</code>, returns{" "}
            <code className="text-xs">answer + sources</code>. Powers{" "}
            <code className="text-xs">/chat</code>.
          </li>
          <li>
            <span className="font-semibold">Creative Demos</span>{" "}
            <code className="text-xs">GET /api/creative-demos</code>: demo list
            from the server (active status filter); used by{" "}
            <code className="text-xs">/creative</code> and format
            matching.
          </li>
          <li>
            <span className="font-semibold">SFTP Connect</span>{" "}
            <code className="text-xs">GET /api/sftp/connect</code>: connectivity
            test; used from <code className="text-xs">/manage-demo</code>.
          </li>
          <li>
            <span className="font-semibold">SFTP List</span>{" "}
            <code className="text-xs">GET /api/sftp/list?path=...</code>: list
            files/folders under an SFTP path.
          </li>
          <li>
            <span className="font-semibold">SFTP Read/Write</span>{" "}
            <code className="text-xs">GET /api/sftp/read</code>,{" "}
            <code className="text-xs">POST /api/sftp/write</code>: read/edit
            text files on SFTP.
          </li>
          <li>
            <span className="font-semibold">SFTP Exists</span>{" "}
            <code className="text-xs">GET /api/sftp/exists?path=...</code>: check
            whether a path exists (used by Chat for quick path checks).
          </li>
          <li>
            <span className="font-semibold">SFTP Download Directory</span>{" "}
            <code className="text-xs">
              GET /api/sftp/download-directory?path=...
            </code>
            : ZIP an entire folder (Showcase Download button).
          </li>
          <li>
            <span className="font-semibold">GET /api/upload</span>: (removed /
            unused)
          </li>
          <li>
            <span className="font-semibold">
              GET /api/upload?name=&lt;file&gt;
            </span>
            : (removed / unused)
          </li>
          <li>
            <span className="font-semibold">POST /api/upload</span>: accepted{" "}
            <code className="text-xs">name</code>,{" "}
            <code className="text-xs">content</code> (HTML/JS), optional{" "}
            <code className="text-xs">images[]</code> base64 payloads into the
            server <code className="text-xs">uploads</code> folder. (removed /
            unused)
          </li>
          <li>
            <span className="font-semibold">DELETE /api/upload</span>: (removed
            / unused)
          </li>
        </ul>
      </section>

      <section className="space-y-3 rounded-3xl border border-white/5 bg-[#141b2d]/40 p-6 shadow-xl">
        <h2 className="text-xl font-black text-white tracking-tight">
          5. Checklist for new features
        </h2>
        <ol className="list-decimal list-inside text-sm md:text-base text-[#cbd5e1] space-y-2 leading-relaxed">
          <li>Add the route in App.tsx (and Sidebar when needed).</li>
          <li>
            Document path, intent, and a one-line usage blurb on this page.
          </li>
          <li>Verify which roles can see or invoke the feature.</li>
          <li>
            Note related APIs (HTTP method + endpoint + primary inputs /
            outputs).
          </li>
          <li>Run an end-to-end smoke test before merge/push.</li>
        </ol>
      </section>
    </div>
  );
};

export default DocumentPage;
