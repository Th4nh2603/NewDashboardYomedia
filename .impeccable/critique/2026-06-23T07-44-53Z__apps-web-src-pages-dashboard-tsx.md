---
target: apps/web/src/pages/Dashboard.tsx
total_score: 19
p0_count: 0
p1_count: 2
timestamp: 2026-06-23T07-44-53Z
slug: apps-web-src-pages-dashboard-tsx
---
**Design Health Score**

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Sidebar shows API status, but dashboard metrics are static and lack source, freshness, loading, or error states. |
| 2 | Match System / Real World | 2 | The page still speaks in creative-AI launcher language instead of YoMedia work language: demos, brands, files, docs, approvals, delivery, and system health. |
| 3 | User Control and Freedom | 2 | Quick links help, but top-bar notification/profile/search affordances do not expose clear user-controlled flows from this page. |
| 4 | Consistency and Standards | 2 | The shell is coherent, but the dashboard still uses equal card grids, multi-color accent bars, and broad panel shadows that compete with the documented signal-scarcity rule. |
| 5 | Error Prevention | 1 | The dashboard does not prevent misinterpretation of unavailable, stale, permission-hidden, or failed operational data. |
| 6 | Recognition Rather Than Recall | 3 | Main destinations are visible, but AI/image/vision/chat labels overlap and force users to infer which route serves which job. |
| 7 | Flexibility and Efficiency | 2 | It works as a launcher but lacks recent work, pinned brands, in-progress demos, failed uploads, or role-aware shortcuts. |
| 8 | Aesthetic and Minimalist Design | 2 | Clean base, but hero + static metrics + six large cards still feels presentation-heavy for a daily operations tool. |
| 9 | Error Recovery | 1 | No dashboard-level empty, retry, unavailable, or stale-data recovery states are visible. |
| 10 | Help and Documentation | 2 | Documentation is linked, but there is no contextual guidance around what changed, what needs attention, or how to proceed. |
| **Total** | | **19/40** | **Poor: credible shell, weak dashboard product fit** |

**Anti-Patterns Verdict**

**LLM assessment**: The current dashboard does not scream "AI generated" visually after the recent quieting pass. The darker issue is product slop: it looks like a polished launcher mockup rather than a real YoMedia operations surface. The main tells are static optimistic metrics, AI-first hero framing, generic "Creative shortcuts," equal-weight cards, and copy that explains UI behavior instead of operational value.

**Deterministic scan**: The bundled detector returned `[]` for `apps/web/src/pages/Dashboard.tsx`, `apps/web/src/layouts/DashboardLayout.tsx`, `apps/web/src/components/layout/Sidebar.tsx`, and `apps/web/src/index.css`. No gradient-text, obvious color slop, or hard banned pattern was reported. This means the previous technical anti-patterns were fixed, but the detector cannot judge whether static dashboard content matches real internal operations.

**Visual overlays**: No reliable user-visible overlay is available. Browser inspection reached the authenticated Clerk login screen rather than the protected dashboard route, so live overlay injection on the actual dashboard was skipped.

**Overall Impression**

The shell now feels much closer to a composed internal operations studio. The dashboard itself still answers "where can I go?" more than "what needs work right now?" For YoMedia internal users, that is the biggest gap: the page creates arrival, not momentum.

**What's Working**

- The slate/teal shell has a recognizable internal-tool identity and no longer reads as a flashy AI playground.
- Sidebar grouping is understandable and role-aware, which gives the product a strong navigation foundation.
- The dashboard is not overloaded; there is enough restraint to turn it into a useful command surface without a full redesign.

**Priority Issues**

**[P1] Static "fake-real" metrics weaken trust**

**Why it matters**: Values like `12`, `248`, `94%`, and `Gemini · Veo` look operational but do not show source, timestamp, ownership, or click-through. Internal teams will trust the dashboard less if numbers appear authoritative but cannot be verified.

**Fix**: Connect the metrics to real data with labels like "updated 3 min ago" and links to the relevant queue, or replace them with honest setup/placeholder states until data exists.

**Suggested command**: `$impeccable harden`

**[P1] The dashboard is still AI-centered instead of operations-centered**

**Why it matters**: Product context says AI/RAG supports workflows, but the dashboard headline and primary CTA make AI Chat the starting point. That undermines demo, file, brand, document, and admin work as the primary internal jobs.

**Fix**: Reframe the hero around operational work: demo readiness, files needing upload, docs indexed, failed integrations, pending admin work, or recently touched brands. Make AI one workflow assistant among others.

**Suggested command**: `$impeccable clarify`

**[P2] Equal-weight quick cards flatten the information architecture**

**Why it matters**: AI Chat, Image generation, Vision AI, Build Demo, Creative, and Documentation all receive similar treatment. Daily workflows and occasional tools look equally important.

**Fix**: Group cards by job: "Continue work," "Create or update demos," "Find documents/assets," and "Admin/system." Make the highest-frequency role-specific actions larger or earlier.

**Suggested command**: `$impeccable layout`

**[P2] Localization/encoding damage is visible product debt**

**Why it matters**: Mojibake in Vietnamese strings and symbols makes the product look less trustworthy, especially for an internal team likely switching between English and Vietnamese contexts.

**Fix**: Normalize source encoding to UTF-8, replace corrupted strings in `LanguageContext.tsx`, and avoid corrupted text glyphs in UI arrows/status copy.

**Suggested command**: `$impeccable harden`

**[P3] Accessibility states still need a polish pass**

**Why it matters**: Recent work added accessible names and reduced motion, but dashboard links and card controls still rely on hover/color emphasis. Keyboard users need equally clear focus and selected states.

**Fix**: Add consistent focus-visible rings to dashboard cards, CTAs, and shell icon buttons; avoid hover-only cues in quick cards.

**Suggested command**: `$impeccable audit`

**Persona Red Flags**

**Alex (Power User / creative ops lead)**: Alex lands on the dashboard and sees static metrics and generic launch cards, but no "needs review," "recent demos," "blocked assets," "client-ready links," or active campaign queue. The dashboard does not answer what to do first.

**Sam (Accessibility-dependent user)**: Sam now gets better labels in the shell, but the dashboard card links still rely on hover lift, color bars, and subtle visual changes. Focus behavior is not explicit enough for fast keyboard scanning.

**Casey (Distracted mobile user)**: Casey can open the mobile navigation, but the homepage still starts with a large hero and metrics before concrete operational next steps. The primary CTA is high on the screen and AI-first, not necessarily the most likely interrupted mobile workflow.

**YoMedia technical operator**: API status appears only in the sidebar footer. The dashboard does not surface failed uploads, SFTP/SMTP issues, RAG indexing state, platform scraping/tool status, or other system work that would actually demand attention.

**Minor Observations**

- The notification bell has a dot but no visible count, popover, empty state, or route.
- The global search looks important but does not show result behavior from the inspected source.
- "NovaAi" as the shell mark may reinforce the old AI-tool framing unless that is intentional internal branding.
- "hover to lift the card" in dashboard copy is UI-instruction copy and should be removed.
- Colored top bars on every quick card are quieter than before, but still decorative rather than stateful.

**Questions to Consider**

- What should a YoMedia operator know within 5 seconds that they cannot know from the sidebar alone?
- Is the dashboard's job to launch tools, or to show the state of work?
- If AI is support, why is "Start with AI Chat" the primary CTA?
- Which three operational events should create urgency here: stalled demos, missing assets, client deadlines, failed integrations, unanswered docs/RAG gaps?
- Should the product headline say "creative AI," or should it speak in YoMedia's actual work language: demos, brands, files, approvals, and delivery?
