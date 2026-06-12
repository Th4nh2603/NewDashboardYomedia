import { dark } from "@clerk/themes";

// Định nghĩa bảng màu nhất quán để dễ quản lý
const COLORS = {
  primary: "#3b82f6", // Blue 500
  primaryHover: "#2563eb", // Blue 600
  bgCard: "#1f2a40", // Custom dark gray
  bgInput: "#111827", // Gray 900
  border: "#374151", // Gray 700
  textMuted: "#9ca3af", // Gray 400
};

export const clerkAppearance = {
  baseTheme: dark,

  variables: {
    colorPrimary: COLORS.primary,
    colorBackground: COLORS.bgCard,
    colorText: "#ffffff",
    colorTextSecondary: COLORS.textMuted,
    borderRadius: "0.75rem",
  },

  elements: {
    // Card & Header
    card: `shadow-2xl border border-[${COLORS.border}] bg-[${COLORS.bgCard}]`,
    headerTitle: "text-2xl font-bold text-white tracking-tight",
    headerSubtitle: "text-gray-400 mt-1",

    // Form fields & Inputs
    formFieldInput: `bg-[${COLORS.bgInput}] border-gray-600 text-white focus:ring-2 focus:ring-blue-500 transition-all`,
    formButtonPrimary: `bg-[${COLORS.primary}] hover:bg-[${COLORS.primaryHover}] text-white font-medium transition-all duration-200 configurations`,

    // Social Buttons
    socialButtonsBlockButton:
      "bg-transparent border-gray-600 hover:bg-gray-700/50 text-white transition-colors",
    socialButtonsBlockButtonText: "font-normal",

    // Footer (Ẩn dòng chữ "Powered by Clerk")
    footer: "hidden",
  },
};
