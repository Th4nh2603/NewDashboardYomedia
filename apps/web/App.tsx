
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ErrorProvider } from './contexts/ErrorContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import DashboardLayout from './components/DashboardLayout';
import PrivateRoute from './components/PrivateRoute';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import Vision from './pages/Vision';
import Cinema from './pages/Cinema';
import Live from './pages/Live';
import History from './pages/History';
import ImageGenerator from './pages/ImageGenerator';
import Login from './pages/Login';
import BuildDemo from './pages/BuildDemo';
import ManageDemo from './pages/ManageDemo';
import Bar from './pages/Bar';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ErrorProvider>
          <HashRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/*" element={
                <PrivateRoute>
                  <DashboardLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/chat" element={<Chat />} />
                      <Route path="/vision" element={<Vision />} />
                      <Route path="/image-generator" element={<ImageGenerator />} />
                      <Route path="/manage-demo" element={<ManageDemo />} />
                      <Route path="/build-demo" element={<BuildDemo />} />
                      <Route path="/bar" element={<Bar />} />
                      <Route path="/cinema" element={<Cinema />} />
                      <Route path="/live" element={<Live />} />
                      <Route path="/history" element={<History />} />
                    </Routes>
                  </DashboardLayout>
                </PrivateRoute>
              } />
            </Routes>
          </HashRouter>
        </ErrorProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
