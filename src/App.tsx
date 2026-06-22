import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import ProjectList from '@/pages/projects/ProjectList';
import VersionList from '@/pages/price-versions/VersionList';
import VersionDetail from '@/pages/price-versions/VersionDetail';
import BranchDiff from '@/pages/BranchDiff';
import ApprovalList from '@/pages/approvals/ApprovalList';
import ApprovalDetail from '@/pages/approvals/ApprovalDetail';
import ChangeLogs from '@/pages/ChangeLogs';
import PricePreview from '@/pages/PricePreview';
import AppLayout from '@/components/layout/AppLayout';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import type { UserRole } from '@/types';

const roleAll: UserRole[] = ['hq-admin', 'finance', 'store-manager'];
const roleHQ: UserRole[] = ['hq-admin'];
const roleHQFinance: UserRole[] = ['hq-admin', 'finance'];

export default function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1B2A4A',
          colorInfo: '#1B2A4A',
          colorSuccess: '#12B76A',
          colorWarning: '#F79009',
          colorError: '#E5484D',
          borderRadius: 8,
          fontFamily: "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif",
        },
      }}
    >
      <AntdApp>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route element={<AppLayout />}>
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute allowedRoles={roleAll}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects"
                element={
                  <ProtectedRoute allowedRoles={roleHQ}>
                    <ProjectList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/projects/new"
                element={
                  <ProtectedRoute allowedRoles={roleHQ}>
                    <Navigate to="/projects" replace />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/price-versions"
                element={
                  <ProtectedRoute allowedRoles={roleHQ}>
                    <VersionList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/price-versions/:id"
                element={
                  <ProtectedRoute allowedRoles={roleHQ}>
                    <VersionDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/versions"
                element={
                  <ProtectedRoute allowedRoles={roleHQ}>
                    <VersionList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/versions/new"
                element={
                  <ProtectedRoute allowedRoles={roleHQ}>
                    <VersionList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/branches"
                element={
                  <ProtectedRoute allowedRoles={roleHQ}>
                    <BranchDiff />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/approvals"
                element={
                  <ProtectedRoute allowedRoles={roleHQFinance}>
                    <ApprovalList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/approvals/:id"
                element={
                  <ProtectedRoute allowedRoles={roleHQFinance}>
                    <ApprovalDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/changelogs"
                element={
                  <ProtectedRoute allowedRoles={roleHQFinance}>
                    <ChangeLogs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/preview"
                element={
                  <ProtectedRoute allowedRoles={roleAll}>
                    <PricePreview />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </AntdApp>
    </ConfigProvider>
  );
}

