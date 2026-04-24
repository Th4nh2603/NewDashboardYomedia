import { dark } from "@clerk/themes";

export const clerkAppearance = {
  baseTheme: dark, // Chuyển nền tảng sang Dark Mode
  variables: {
    colorPrimary: "#3b82f6", // Màu xanh của nút Continue
    colorBackground: "#1f2937", // Màu nền card (gray-800)
    colorText: "#ffffff",
    borderRadius: "0.75rem",
  },
  elements: {
    card: "shadow-2xl border border-gray-700 bg-[#1f2937]",
    headerTitle: "text-2xl font-bold",
    headerSubtitle: "text-gray-400",
    socialButtonsBlockButton:
      "bg-transparent border-gray-600 hover:bg-gray-700 text-white",
    formFieldInput:
      "bg-gray-900 border-gray-600 text-white focus:ring-blue-500",
    footer: "hidden", // Ẩn phần footer "Secured by Clerk" nếu muốn tinh gọn
    formButtonPrimary: "bg-blue-600 hover:bg-blue-700 transition-all",
  },
};
