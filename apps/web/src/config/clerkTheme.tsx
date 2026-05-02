import { dark } from "@clerk/themes";

export const clerkAppearance = {
  baseTheme: dark, // Clerk base: dark theme
  variables: {
    colorPrimary: "#3b82f6", // Primary / Continue button
    colorBackground: "#1f2937", // Card background (gray-800)
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
    footer: "hidden", // Hide Clerk footer chrome if desired
    formButtonPrimary: "bg-blue-600 hover:bg-blue-700 transition-all",
  },
};
