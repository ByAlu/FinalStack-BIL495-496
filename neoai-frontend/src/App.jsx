import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { AdminPanelPage } from "./pages/AdminPanelPage";
import { AiModuleSelectionPage } from "./pages/AiModuleSelectionPage";
import { AiResultsPage } from "./pages/AiResultsPage";
import { DataPreprocessingPage } from "./pages/DataPreprocessingPage";
import { DataSelectionPage } from "./pages/DataSelectionPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { PatientQueryWorkflowPage } from "./pages/PatientQueryWorkflowPage";
import { ProfilePage } from "./pages/ProfilePage";
import { ReportingPage } from "./pages/ReportingPage";
import { LogsPage } from "./pages/LogsPage";

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="query" element={<PatientQueryWorkflowPage />} />
          <Route path="selection/:patientId/:examinationId" element={<DataSelectionPage />} />
          <Route path="preprocessing/:patientId/:examinationId" element={<DataPreprocessingPage />} />
          <Route path="ai-module/:patientId/:examinationId" element={<AiModuleSelectionPage />} />
          <Route path="results/:reportId" element={<AiResultsPage />} />
          <Route path="report/:reportId" element={<ReportingPage />} />
          <Route
            path="admin"
            element={
              <ProtectedRoute requiredRole="ADMIN">
                <AdminPanelPage />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export default App;
