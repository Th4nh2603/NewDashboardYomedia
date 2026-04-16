import React from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { ErrorProvider } from "./contexts/ErrorContext";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
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
import Login from "./pages/Login";
import BuildDemo from "./pages/BuildDemo";
import ManageDemo from "./pages/ManageDemo";
import ManageSftp from "./pages/ManageSftp";
import Upload from "./pages/Upload";
import Bar from "./pages/Bar";
import AIGmail from "./pages/AIGmail";
import Documentation from "./pages/Documentation";
import TestData from "./pages/TestData";

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorProvider>
          <AppErrorBoundary>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
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
                          element={<CreativeShowcase />}
                        />
                        <Route path="/document" element={<Documentation />} />
                        <Route
                          path="/documentation"
                          element={<Documentation />}
                        />
                        <Route path="/manage-demo" element={<ManageDemo />} />
                        <Route
                          path="/manage-sftp"
                          element={
                            <RoleRoute allow={["admin"]}>
                              <ManageSftp />
                            </RoleRoute>
                          }
                        />
                        <Route
                          path="/build-demo"
                          element={
                            <RoleRoute allow={["admin", "design"]}>
                              <BuildDemo />
                            </RoleRoute>
                          }
                        />
                        <Route
                          path="/upload"
                          element={
                            <RoleRoute allow={["admin", "design"]}>
                              <Upload />
                            </RoleRoute>
                          }
                        />
                        <Route
                          path="/test-data"
                          element={
                            <RoleRoute deny={["guest"]}>
                              <TestData />
                            </RoleRoute>
                          }
                        />
                        <Route path="/bar" element={<Bar />} />
                        <Route path="/cinema" element={<Cinema />} />
                        <Route path="/live" element={<Live />} />
                        <Route path="/history" element={<History />} />
                        <Route path="/ai-gmail" element={<AIGmail />} />
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
    </ThemeProvider>
  );
};

export default App;
