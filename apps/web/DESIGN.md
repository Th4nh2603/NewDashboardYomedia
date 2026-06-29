---
name: NewDashboardYomedia Web
description: Internal YoMedia operations studio for creative, demo, document, AI, and admin workflows.
colors:
  bg-main: "#141b2d"
  bg-deep: "#0f172a"
  bg-panel: "#1f2a40"
  bg-panel-soft: "#1a2336"
  bg-panel-ink: "#151d2f"
  accent-teal: "#4cceac"
  accent-teal-deep: "#45b89c"
  border-muted: "#3d465d"
  text-primary: "#e0e0e0"
  text-strong: "#ffffff"
  text-secondary: "#a3a3a3"
  text-muted-blue: "#94a3b8"
  light-bg: "#f1f5f9"
  light-ink: "#0f172a"
  danger: "#ef4444"
  warning: "#f59e0b"
  info-indigo: "#4f46e5"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "3rem"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 900
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: "ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: "normal"
  body:
    fontFamily: "ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.625
    letterSpacing: "normal"
  label:
    fontFamily: "ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "0.12em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
  panel: "24px"
  feature: "32px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  shell: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent-teal}"
    textColor: "{colors.bg-main}"
    rounded: "{rounded.xl}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.accent-teal-deep}"
    textColor: "{colors.bg-main}"
  button-secondary:
    backgroundColor: "{colors.bg-panel}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: "8px 16px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  input-search:
    backgroundColor: "{colors.bg-panel}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  nav-active:
    backgroundColor: "{colors.accent-teal}"
    textColor: "{colors.accent-teal}"
    rounded: "{rounded.xl}"
    padding: "12px 16px"
  card-panel:
    backgroundColor: "{colors.bg-panel-soft}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.panel}"
    padding: "24px"
---

# Design System: NewDashboardYomedia Web

## 1. Overview

**Creative North Star: "Operations Studio"**

NewDashboardYomedia is a dark-first internal product system for YoMedia teams who manage creative, demo, document, AI, and admin work throughout the day. The visual language should feel like a focused operations studio: composed, fast, and practical, with enough creative polish to match the ad-creative domain without turning the interface into a marketing surface.

The current system uses a slate-blue workspace, a restrained teal operational accent, system sans typography, rounded product containers, light tonal borders, and motion/react feedback. Future design work should preserve this identity while tightening consistency: the product should not become a generic SaaS admin template, a flashy AI toy, a chatbot-first playground, a dense enterprise back-office system, an overly colorful marketing website, or a complicated dashboard overloaded with widgets.

**Key Characteristics:**
- Dark-first slate workspace with a light theme fallback.
- Teal accent for primary actions, active navigation, focus, status, and meaningful confirmation.
- Dense but readable product UI for daily internal work.
- Rounded, bordered panels with tonal layering rather than heavy decorative shadows.
- Motion used for state, hierarchy, and feedback, not page-load choreography.

## 2. Colors

The palette is a restrained product palette: deep slate surfaces carry the workspace, teal marks action and state, and secondary colors only appear for semantic status or specific workflow categories.

### Primary
- **Studio Teal**: Primary action, active navigation, focus, selected states, online status, and the NovaAi wordmark accent. It should stay rare enough to remain useful as a signal.
- **Teal Deep**: Hover or gradient companion for Studio Teal when an element needs extra affordance, such as the compact logo tile.

### Secondary
- **Command Indigo**: Used sparingly for AI/chat or capability accents where the current code already uses indigo. Do not let it compete with Studio Teal for primary action meaning.
- **System Amber**: Warning, offline, pending, and caution states.
- **System Red**: Destructive actions, logout emphasis, and error states.

### Neutral
- **Main Slate**: Default dark application background.
- **Deep Slate**: Sidebar shell, overlays, and the deepest app structure.
- **Panel Slate**: Inputs, popovers, inactive controls, and dense interior surfaces.
- **Soft Panel Slate**: Dashboard cards and broader framed regions.
- **Muted Border Slate**: Dividers, table rules, scroll thumbs, and low-emphasis strokes.
- **Primary Text**: Default dark-theme body text.
- **Secondary Text**: Placeholder text, secondary copy, and helper labels.
- **Light Canvas**: Light-theme body background when users toggle out of dark mode.

### Named Rules

**The Signal Scarcity Rule.** Studio Teal is a signal, not decoration. Use it for action, selection, focus, and operational status; avoid spraying it across inactive cards.

**The Slate Layer Rule.** Depth starts with tonal slate layers and borders. Reach for shadows only when a surface floats above the app or needs hover feedback.

## 3. Typography

**Display Font:** ui-sans-serif/system stack with Segoe UI, Roboto, Helvetica Neue, Arial fallback
**Body Font:** ui-sans-serif/system stack with Segoe UI, Roboto, Helvetica Neue, Arial fallback
**Label/Mono Font:** system sans for labels; font-mono appears only for paths, code, IDs, and technical values

**Character:** The type system is familiar, product-native, and operational. It favors bold compact labels, strong page headings, and readable body copy over expressive display typography.

### Hierarchy

- **Display** (900, 48px, 1.1 line-height): Dashboard-scale headings and primary route introductions only. Keep letter spacing at or above -0.025em.
- **Headline** (900, 30px, 1.15 line-height): Major page regions, tool headers, and prominent workflow titles.
- **Title** (700, 18px, 1.35 line-height): Card titles, modal titles, tool names, and section headers.
- **Body** (400-500, 14px, 1.625 line-height): Operational instructions, chat content, table text, form copy, and helper paragraphs. Keep longer prose to 65-75ch where possible.
- **Label** (800-900, 10px, uppercase, 0.12em-0.30em letter spacing): Navigation section headers, badges, table headers, and compact status labels.

### Named Rules

**The Product Sans Rule.** Do not introduce display fonts for labels, buttons, data, tables, or admin controls. One tuned system sans family is the product default.

**The Label Restraint Rule.** Uppercase tracked labels are useful in dense admin UI, but they must mark structure or status. Do not add tiny uppercase eyebrow text above every content block.

## 4. Elevation

The system uses a hybrid of tonal layering, borders, and selective shadows. Most surfaces are flat at rest: depth comes from slate layer changes, semi-transparent borders, sticky headers, and subtle backdrop blur. Strong shadows are reserved for app shell separation, modals, dropdowns, and hover-lifted dashboard cards.

### Shadow Vocabulary

- **Sidebar Rail** (`20px 0 50px rgba(0,0,0,0.3)`): Separates fixed navigation from the work surface in dark mode.
- **Dashboard Ambient Card** (`0 24px 80px -24px rgba(0,0,0,0.55)`): Large dashboard containers and important panels in dark mode.
- **Light Card Lift** (`0 24px 60px -24px rgba(15,23,42,0.12)`): Light-mode card lift without making the product feel like a marketing card grid.
- **Modal Lift** (`0 28px 80px rgba(0,0,0,0.55)`): Popups, blocking dialogs, and critical overlays.
- **Teal Glow** (`0 0 15px rgba(76,206,172,0.5)`): Active navigation indicator and rare selected-state emphasis only.

### Named Rules

**The Tonal-First Rule.** Use background layer, border, and state color before adding a shadow. If every card floats, no card is important.

**The No Ghost-Card Rule.** Do not pair a decorative 1px border with a broad soft shadow on ordinary controls. For product surfaces, choose a quiet border or a purposeful lift.

## 5. Components

### Buttons

- **Shape:** Compact buttons use gently curved corners (8px-12px); primary and medium buttons use stronger product rounding (16px).
- **Primary:** Studio Teal fill or teal-tinted fill with dark ink, used for committed actions such as create, upload, send, save, or continue.
- **Hover / Focus:** Hover may brighten the teal or increase tonal fill. Focus must use a visible teal border or ring, not color alone.
- **Secondary / Ghost / Tertiary:** Secondary buttons use `bg-white/5` or panel slate with primary text. Ghost buttons are transparent and should be reserved for low-risk utility actions.

### Chips

- **Style:** Chips use pill or compact rounded shapes, small bold labels, and semantic fills such as teal, amber, rose, indigo, cyan, or slate.
- **State:** Selected chips need both color and border changes. Disabled chips reduce opacity but must keep readable text.

### Cards / Containers

- **Corner Style:** Standard product panels should stay near 16px-24px. Reserve 32px only for major framed dashboard sections or legacy surfaces that already use that language.
- **Background:** Dark panels use Main Slate, Panel Slate, or Soft Panel Slate. Light panels use white or slate-50 on Light Canvas.
- **Shadow Strategy:** Use tonal layering first. Add large shadows only for major panels, sticky shell separation, dropdowns, and modal overlays.
- **Border:** Dark panels use white at 5-10% opacity or Muted Border Slate. Light panels use slate-200 variants.
- **Internal Padding:** Dense controls use 8px-16px; cards use 20px-24px; route shells use 24px-40px.

### Inputs / Fields

- **Style:** Inputs sit on Panel Slate or white/light slate, with 12px-16px rounding, compact padding, and a border that is visible in both themes.
- **Focus:** Focus shifts border or ring to Studio Teal at low opacity. Search icons and inline affordances may also change to teal.
- **Error / Disabled:** Error states use rose/red text and border. Disabled states use opacity plus cursor treatment, not opacity alone when the control remains readable.

### Navigation

The navigation system uses a fixed left rail, a sticky top bar, Heroicons outline icons, section grouping, active state teal, and collapsible rail behavior. Active navigation combines teal text, teal-tinted background, an indicator, and icon emphasis. Section labels are uppercase and low-emphasis; individual items are medium-weight, 14px, and rounded.

### Data Tables

Tables use compact rows, uppercase teal or muted headers, slate dividers, and hover row backgrounds. They should support horizontal overflow without breaking the app shell. Empty and loading rows must explain the state, not leave an empty frame.

### Popups / Dialogs

Dialogs use a dark overlay, a bordered rounded panel, and motion/react entrance with opacity, scale, and y-offset. Use dialogs for confirmation, blocking errors, or required input; do not default to a modal when inline editing or progressive disclosure would keep the user in flow.

## 6. Do's and Don'ts

### Do:

- **Do** preserve the product-register feel: a clean internal creative operations dashboard for daily YoMedia work.
- **Do** use Studio Teal for primary actions, active navigation, focus, selected states, and meaningful status.
- **Do** keep AI/RAG surfaces practical and workflow-supportive rather than chatbot-first.
- **Do** support both dark and light theme behavior when changing shared components.
- **Do** keep table, file, document, brand, user, and admin workflows dense enough for operators while maintaining readable spacing.
- **Do** include loading, empty, error, disabled, hover, focus, and active states for interactive components.
- **Do** use system sans typography for product UI and font-mono only for paths, code, IDs, and technical values.

### Don't:

- **Don't** make the interface feel like a generic SaaS admin template.
- **Don't** make it feel like a flashy AI toy or chatbot-first playground.
- **Don't** make it feel like a dense enterprise back-office system.
- **Don't** turn the product into an overly colorful marketing website.
- **Don't** overload the dashboard with too many widgets.
- **Don't** use gradient text; the current dashboard accent headline should be treated as legacy, not a pattern to repeat.
- **Don't** use colored side-stripe borders greater than 1px as card accents.
- **Don't** use decorative glassmorphism as the default surface treatment.
- **Don't** invent custom affordances for standard controls when native buttons, inputs, select menus, tabs, or tables are clearer.
