import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import DashboardLayout from "@/layouts/DashboardLayout";
import PrivateRoute from "@/app/PrivateRoute";
import RoleRoute from "@/app/RoleRoute";
import AIGmail from "@/pages/AIGmail";
import AdminUsers from "@/pages/AdminUsers";
import Bar from "@/pages/Bar";
import BuildDemo from "@/pages/BuildDemo";
import Chat from "@/pages/Chat";
import Cinema from "@/pages/Cinema";
import CreativeDemosEditor from "@/pages/CreativeDemosEditor";
import CreativeShowcase from "@/pages/CreativeShowcase";
import Dashboard from "@/pages/Dashboard";
import Documentation from "@/pages/Documentation";
import History from "@/pages/History";
import ImageGenerator from "@/pages/ImageGenerator";
import Live from "@/pages/Live";
import LoginPage from "@/pages/LoginPage";
import ManageDemo from "@/pages/ManageDemo";
import ManageSftp from "@/pages/ManageSftp";
import SmtpMail from "@/pages/SmtpMail";
import TestData from "@/pages/TestData";
import ToolTest from "@/pages/ToolTest";
import Upload from "@/pages/Upload";
import Vision from "@/pages/Vision";

export function AppRouter() {
  return (
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
                  <Route path="/image-generator" element={<ImageGenerator />} />
                  <Route
                    path="/creative-showcase"
                    element={<Navigate to="/creative" replace />}
                  />
                  <Route path="/creative" element={<CreativeShowcase />} />
                  <Route path="/document" element={<Documentation />} />
                  <Route path="/documentation" element={<Documentation />} />
                  <Route path="/manage-demo" element={<ManageDemo />} />
                  <Route
                    path="/manage-sftp"
                    element={
                      <RoleRoute allow={["admin"]}>
                        <ManageSftp />
                      </RoleRoute>
                    }
                  />
                  <Route path="/build-demo" element={<BuildDemo />} />
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
  );
}
