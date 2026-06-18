import type { ReactNode } from "react";
import { TrpcProvider } from "@/api/trpc/react";
import { AppErrorBoundary } from "@/components/common/AppErrorBoundary";
import { AuthProvider } from "@/stores/AuthContext";
import { ErrorProvider } from "@/stores/ErrorContext";
import { LanguageProvider } from "@/stores/LanguageContext";
import { ThemeProvider } from "@/stores/ThemeContext";
import { ClerkApiAuthBridge } from "@/app/ClerkApiAuthBridge";

type AppProvidersProps = {
  children: ReactNode;
};

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <TrpcProvider>
          <ClerkApiAuthBridge />
          <AuthProvider>
            <ErrorProvider>
              <AppErrorBoundary>{children}</AppErrorBoundary>
            </ErrorProvider>
          </AuthProvider>
        </TrpcProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
