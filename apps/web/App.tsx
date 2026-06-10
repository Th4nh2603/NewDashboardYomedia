import React from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorProvider } from "./contexts/ErrorContext";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import DashboardLayout from "./components/DashboardLayout";
import PrivateRoute from "./components/PrivateRoute";
import RoleRoute from "./components/RoleRoute";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Vision from "./pages/Vision";
import Cinema from "./pages/Cinema";
import Live from "./pages/Live";
import History from "./pages/History";
import CreativeShowcase from "./pages/CreativeShowcase";
import ImageGenerator from "./pages/ImageGenerator";
import LoginPage from "./pages/LoginPage";
import ManageDemo from "./pages/ManageDemo";
import ManageSftp from "./pages/ManageSftp";
import Upload from "./pages/Upload";
import Bar from "./pages/Bar";
import AIGmail from "./pages/AIGmail";
import SmtpMail from "./pages/SmtpMail";
import Documentation from "./pages/Documentation";
import TestData from "./pages/TestData";
import CreativeDemosEditor from "./pages/CreativeDemosEditor";
import AdminUsers from "./pages/AdminUsers";
import ToolTest from "./pages/ToolTest";
import PlatformBanner from "./pages/platform/PlatformBanner";
import PlatformFlight from "./pages/platform/PlatformFlight";
import PlatformPlacement from "./pages/platform/PlatformPlacement";
import PlatformReport from "./pages/platform/PlatformReport";
import PlatformCampaign from "./pages/platform/PlatformCampaign";
import { ClerkApiAuthBridge } from "./components/ClerkApiAuthBridge";
import { TrpcProvider } from "./lib/trpc/react";

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <TrpcProvider>
        <ClerkApiAuthBridge />
        <AuthProvider>
          <ErrorProvider>
            <AppErrorBoundary>
              <HashRouter>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route
                    path="/*"
                    element={
                      <PrivateRoute>
                        <DashboardLayout>
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/chat" element={<Chat />} />
                            <Route path="/vision" element={<Vision />} />
                            <Route
                              path="/image-generator"
                              element={<ImageGenerator />}
                            />
                            <Route
                              path="/creative-showcase"
                              element={<Navigate to="/creative" replace />}
                            />
                            <Route path="/creative" element={<CreativeShowcase />} />
                            <Route
                              path="/document"
                              element={<Documentation />}
                            />
                            <Route
                              path="/documentation"
                              element={<Documentation />}
                            />
                            <Route
                              path="/manage-demo"
                              element={<ManageDemo />}
                            />
                            <Route
                              path="/manage-sftp"
                              element={
                                <RoleRoute allow={["admin", "manager", "media", "design"]}>
                                  <ManageSftp />
                                </RoleRoute>
                              }
                            />
                            <Route
                              path="/build-demo"
                              element={<Navigate to="/chat" replace />}
                            />
                            {/* upload: no RoleRoute allow-list; PrivateRoute uses user.allowedRoutes (see role-permissions.json). */}
                            <Route
                              path="/tool/test"
                              element={
                                <RoleRoute allow={["admin"]}>
                                  <ToolTest />
                                </RoleRoute>
                              }
                            />
                            <Route path="/upload" element={<Upload />} />
                            <Route
                              path="/test-data"
                              element={
                                <RoleRoute deny={["guest"]}>
                                  <TestData />
                                </RoleRoute>
                              }
                            />
                            <Route
                              path="/platform/banner"
                              element={
                                <RoleRoute deny={["guest"]}>
                                  <PlatformBanner />
                                </RoleRoute>
                              }
                            />
                            <Route
                              path="/platform/flight"
                              element={
                                <RoleRoute deny={["guest"]}>
                                  <PlatformFlight />
                                </RoleRoute>
                              }
                            />
                            <Route
                              path="/platform/placement"
                              element={
                                <RoleRoute deny={["guest"]}>
                                  <PlatformPlacement />
                                </RoleRoute>
                              }
                            />
                            <Route
                              path="/platform/report"
                              element={
                                <RoleRoute deny={["guest"]}>
                                  <PlatformReport />
                                </RoleRoute>
                              }
                            />
                            <Route
                              path="/platform/campaign"
                              element={
                                <RoleRoute deny={["guest"]}>
                                  <PlatformCampaign />
                                </RoleRoute>
                              }
                            />
                            <Route
                              path="/creative-demos-edit"
                              element={
                                <RoleRoute allow={["admin"]}>
                                  <CreativeDemosEditor />
                                </RoleRoute>
                              }
                            />
                            <Route path="/bar" element={<Bar />} />
                            <Route path="/cinema" element={<Cinema />} />
                            <Route path="/live" element={<Live />} />
                            <Route path="/history" element={<History />} />
                            <Route path="/ai-gmail" element={<AIGmail />} />
                            <Route
                              path="/smtp-mail"
                              element={
                                <RoleRoute deny={["guest"]}>
                                  <SmtpMail />
                                </RoleRoute>
                              }
                            />
                            <Route
                              path="/admin/users"
                              element={
                                <RoleRoute allow={["admin"]}>
                                  <AdminUsers />
                                </RoleRoute>
                              }
                            />
                          </Routes>
                        </DashboardLayout>
                      </PrivateRoute>
                    }
                  />
                </Routes>
              </HashRouter>
            </AppErrorBoundary>
          </ErrorProvider>
        </AuthProvider>
        </TrpcProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
};

export default App;
